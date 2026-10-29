import { db } from './db';
import { providerCard,psaQuote,PsaError,psaErrorMessage,type ProviderCard } from './psa';
import {ensurePsaSchema} from './psa-schema';
export async function preparePsa(v:{psaEnabled:boolean;psaTcgplayerId?:number|null;psaPrinting?:string|null;kind:string;gradingCompany?:string|null;grade?:string|null}){
  if(!v.psaEnabled)return null;
  if(v.kind!=='graded'||v.gradingCompany?.toUpperCase()!=='PSA'||!v.psaTcgplayerId||!v.psaPrinting||!v.grade)throw new PsaError('Select a PSA card, product ID and exact printing.');
  const quote=psaQuote(await getPsaCard(v.psaTcgplayerId),v.grade,v.psaPrinting);
  if(!quote)throw new PsaError('No dated sales median is available for this PSA grade and printing. Use manual pricing for now.');
  return quote;
}
export async function getPsaCard(id:number,deps:{sql?:ReturnType<typeof db>;fetcher?:typeof fetch;key?:string}={}):Promise<ProviderCard>{
  const key=deps.key??process.env.POKEMON_PRICE_TRACKER_API_KEY;
  if(!key)throw new PsaError('PokemonPriceTracker API key is not configured.');
  if(!deps.sql)await ensurePsaSchema();
  const sql=deps.sql??db();
  const [cached]=await sql`SELECT data FROM psa_cache WHERE tcgplayer_id=${id} AND fetched_at >= date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'`;
  if(cached)return providerCard.parse(cached.data);
  const [blocked]=await sql`SELECT id FROM psa_provider_state WHERE id=1 AND blocked_until>now()`;
  if(blocked)throw new PsaError('Provider requests are paused after a rate limit or authentication error. Cached prices remain available.');
  // Successful lookups are reusable without a holding. A failed/in-flight request
  // gets a short lease, rather than blocking the card for the whole day.
  const [claim]=await sql`INSERT INTO psa_requests(tcgplayer_id,date,attempted_at,attempts) VALUES(${id},(now() AT TIME ZONE 'UTC')::date,now(),1)
    ON CONFLICT(tcgplayer_id,date) DO UPDATE SET attempted_at=now(),attempts=psa_requests.attempts+1
    WHERE psa_requests.attempted_at < now()-interval '60 seconds' AND psa_requests.attempts<3 RETURNING tcgplayer_id`;
  if(!claim){
    // The winning request may have filled the cache between our first read and claim.
    const [ready]=await sql`SELECT data FROM psa_cache WHERE tcgplayer_id=${id} AND fetched_at >= date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'`;
    if(ready)return providerCard.parse(ready.data);
    const [state]=await sql`SELECT attempts FROM psa_requests WHERE tcgplayer_id=${id} AND date=(now() AT TIME ZONE 'UTC')::date`;
    throw new PsaError(state?.attempts>=3?'Three provider attempts failed today for this card. Try after the daily reset.':'This card is being fetched or a recent attempt failed. Please retry in one minute.');
  }
  const [budget]=await sql`INSERT INTO psa_budget(date,credits) VALUES((now() AT TIME ZONE 'UTC')::date,2)
    ON CONFLICT(date) DO UPDATE SET credits=psa_budget.credits+2 WHERE psa_budget.credits<=88 RETURNING credits`;
  if(!budget)throw new PsaError('Daily PSA lookup budget reached. Previous prices are retained.');
  const url=new URL('https://www.pokemonpricetracker.com/api/v2/cards');
  url.search=new URLSearchParams({tcgPlayerId:String(id),limit:'1',language:'english',includeEbay:'true'}).toString();
  const response=await (deps.fetcher??fetch)(url,{headers:{Authorization:`Bearer ${key}`},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
  if(response.status===429||response.status===401){
    const retry=response.headers.get('Retry-After');
    const seconds=retry&&Number.isFinite(Number(retry))?Math.max(60,Math.min(86400,Number(retry))):86400;
    await sql`INSERT INTO psa_provider_state(id,blocked_until) VALUES(1,now()+${seconds}*interval '1 second') ON CONFLICT(id) DO UPDATE SET blocked_until=GREATEST(psa_provider_state.blocked_until,excluded.blocked_until)`;
  }
  if(!response.ok)throw new PsaError(response.status===429?'Provider rate limit reached; retry after the next daily reset.':response.status===401?'Provider rejected the API key.':'PSA provider is unavailable. Previous prices are retained.');
  const remaining=response.headers.get('X-RateLimit-Daily-Remaining');
  if(remaining!==null&&Number(remaining)<2)await sql`INSERT INTO psa_provider_state(id,blocked_until) VALUES(1,(date_trunc('day',now() AT TIME ZONE 'UTC')+interval '1 day') AT TIME ZONE 'UTC') ON CONFLICT(id) DO UPDATE SET blocked_until=GREATEST(psa_provider_state.blocked_until,excluded.blocked_until)`;
  const body=await response.json();
  const parsed=providerCard.safeParse(Array.isArray(body.data)&&body.data.length===1?body.data[0]:body.data);
  if(!parsed.success||parsed.data.tcgPlayerId!==String(id))throw new PsaError('Provider returned an unexpected card. No price was applied.');
  // Store only the validated fields; no raw listings, account data or credentials.
  await sql`INSERT INTO psa_cache(tcgplayer_id,data,fetched_at) VALUES(${id},${JSON.stringify(parsed.data)}::jsonb,now())
    ON CONFLICT(tcgplayer_id) DO UPDATE SET data=excluded.data,fetched_at=excluded.fetched_at`;
  return parsed.data;
}
export async function syncPsa(deps:{sql?:ReturnType<typeof db>;fetcher?:typeof fetch;key?:string}={}){
  if(!deps.sql)await ensurePsaSchema();
  const sql=deps.sql??db();
  const items=await sql`SELECT id,psa_tcgplayer_id,psa_printing,grade FROM holdings WHERE kind='graded' AND upper(grading_company)='PSA' AND psa_enabled ORDER BY psa_checked_at NULLS FIRST,id`;
  let updated=0;
  const cards=new Map<number,ProviderCard|Error>();
  const started=Date.now();
  for(const item of items){
    if(Date.now()-started>120000)break;
    try{
      const id=Number(item.psa_tcgplayer_id);
      if(!id)throw new PsaError('Link a TCGplayer card before enabling automatic PSA pricing.');
      if(!cards.has(id)){try{cards.set(id,await getPsaCard(id,{...deps,sql}));}catch(e){cards.set(id,e instanceof Error?e:new PsaError('PSA lookup failed.'));}}
      const card=cards.get(id)!;if(card instanceof Error)throw card;
      const quote=psaQuote(card,item.grade,item.psa_printing);
      if(!quote)throw new PsaError('No dated PSA sales median for this grade and printing. Previous price retained.');
      await sql`UPDATE holdings SET psa_price_usd=${quote.usd},psa_price_date=${quote.date},psa_checked_at=now(),psa_error=NULL WHERE id=${item.id} AND psa_enabled AND psa_tcgplayer_id=${id} AND psa_printing=${item.psa_printing} AND grade=${item.grade}`;
      updated++;
    }catch(e){await sql`UPDATE holdings SET psa_error=${psaErrorMessage(e)} WHERE id=${item.id}`;}
  }
  return {updated,total:items.length,pending:items.length-updated,...(updated<items.length?{error:'Some PSA prices could not be refreshed. Previous prices retained; see each item for details.'}:{})};
}
