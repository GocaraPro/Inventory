import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {getPsaCard,syncPsa} from '../src/lib/psa-provider';
import {db} from '../src/lib/db';
import {psaSchema} from '../src/lib/psa-schema';
test('provider caches across grades, reserves credits, caps requests and honors 429',async()=>{
  const pg=new PGlite();
  try{
    const oldSchema=(await readFile('db/schema.sql','utf8')).split('ALTER TABLE holdings ADD COLUMN IF NOT EXISTS psa_enabled')[0];
    await pg.exec(oldSchema);
    await pg.exec(`INSERT INTO catalog(id,name,kind,category,expansion_id) VALUES(1,'Card','card','Single',1);
      INSERT INTO holdings(product_id,kind,finish,condition,quantity,purchase_price,purchase_date,grading_company,grade,manual_price) VALUES(1,'graded','standard','NM',1,50,'2026-01-01','PSA','10',75)`);
    for(const statement of psaSchema)await pg.exec(statement);
    for(const statement of psaSchema)await pg.exec(statement);
    assert.equal(Number((await pg.query<{manual_price:string}>('SELECT manual_price FROM holdings')).rows[0].manual_price),75);
    const sync=await readFile('src/lib/sync.ts','utf8');
    const snapshot=sync.match(/sql`(INSERT INTO snapshots[\s\S]*?)`/)![1].replaceAll('${sourceDate}','$1');
    await pg.exec('UPDATE holdings SET psa_enabled=true,psa_price_usd=125');
    await pg.query(snapshot,['2026-10-27T00:00:00Z']);
    assert.equal(Number((await pg.query<{value:string}>('SELECT value FROM snapshots')).rows[0].value),125);
    await pg.exec('UPDATE holdings SET psa_enabled=false');
    await pg.query(snapshot,['2026-10-27T00:00:00Z']);
    assert.equal(Number((await pg.query<{value:string}>('SELECT value FROM snapshots')).rows[0].value),75);
    const sql=(async(strings:TemplateStringsArray,...values:unknown[])=>{
      const query=strings.reduce((text,part,i)=>text+(i?`$${i}`:'')+part,'');
      return (await pg.query(query,values)).rows;
    }) as unknown as ReturnType<typeof db>;
    let requests=0;
    const fetcher:typeof fetch=async(input,options)=>{
      requests++;const url=new URL(String(input));
      assert.equal(url.origin,'https://www.pokemonpricetracker.com');
      assert.equal(url.searchParams.get('limit'),'1');assert.equal(url.searchParams.get('includeEbay'),'true');
      assert.equal(url.searchParams.has('includeHistory'),false);
      assert.equal(new Headers(options?.headers).get('Authorization'),'Bearer fixture-only');
      return Response.json({data:{tcgPlayerId:url.searchParams.get('tcgPlayerId'),name:'Card',setName:'Set',cardNumber:'1'}});
    };
    const deps={sql,fetcher,key:'fixture-only'};
    await getPsaCard(1,deps);await getPsaCard(1,deps);assert.equal(requests,1);
    for(let i=2;i<=45;i++)await getPsaCard(i,deps);
    await assert.rejects(getPsaCard(46,deps),/budget/);assert.equal(requests,45);
    assert.equal((await pg.query<{credits:number}>('SELECT credits FROM psa_budget')).rows[0].credits,90);
    await pg.exec('TRUNCATE psa_budget,psa_requests,psa_cache');
    const limited={...deps,fetcher:(async()=>{requests++;return new Response('',{status:429,headers:{'Retry-After':'60'}});}) as typeof fetch};
    await assert.rejects(getPsaCard(1,limited),/rate limit/);
    await assert.rejects(getPsaCard(2,limited),/paused/);assert.equal(requests,46);
    await pg.exec('TRUNCATE psa_provider_state,psa_requests');
    await assert.rejects(getPsaCard(1,{...deps,fetcher:(async()=>Response.json({data:{tcgPlayerId:'2',name:'Wrong',setName:'Set',cardNumber:'1'}})) as typeof fetch}),/unexpected card/);
    assert.equal((await pg.query('SELECT * FROM psa_cache')).rows.length,0);
    await assert.rejects(getPsaCard(1,deps),/one minute/);
    await pg.exec("UPDATE psa_requests SET attempted_at=now()-interval '61 seconds'");
    const recovered=await getPsaCard(1,{...deps,fetcher:(async()=>Response.json({data:[{tcgPlayerId:'1',name:'Card',setName:'Set',cardNumber:'1'}]})) as typeof fetch});
    assert.equal(recovered.tcgPlayerId,'1');
    await getPsaCard(1,{...deps,fetcher:(async()=>{throw new Error('Cache must prevent a new provider call');}) as typeof fetch});
    const failing={...deps,fetcher:(async()=>new Response('',{status:503})) as typeof fetch};
    for(let attempt=0;attempt<3;attempt++){
      await assert.rejects(getPsaCard(3,failing),/unavailable/);
      await pg.exec("UPDATE psa_requests SET attempted_at=now()-interval '61 seconds'");
    }
    await assert.rejects(getPsaCard(3,failing),/Three provider attempts/);
    await pg.exec('TRUNCATE psa_budget,psa_requests,psa_cache,psa_provider_state');
    await pg.exec("UPDATE holdings SET psa_enabled=true,psa_tcgplayer_id=1,psa_printing='Holofoil',psa_price_usd=75");
    let dailyCalls=0;
    const daily={...deps,fetcher:(async()=>{dailyCalls++;return Response.json({data:{tcgPlayerId:1,name:'Card',setName:'Set',cardNumber:'1',prices:{primaryPrinting:'Holofoil'},ebay:{salesByGrade:{psa10:{count:10,averagePrice:100+dailyCalls,lastSaleDate:'2026-01-01'}}}}});}) as typeof fetch};
    assert.equal((await syncPsa(daily)).updated,1);
    assert.equal((await syncPsa(daily)).updated,1);
    assert.equal(dailyCalls,1,'same-day sync reuses provider cache');
    await pg.exec("UPDATE psa_cache SET fetched_at=now()-interval '1 day'; TRUNCATE psa_requests");
    assert.equal((await syncPsa(daily)).updated,1);
    assert.equal(dailyCalls,2,'next-day sync fetches a new quote');
    const refreshed=(await pg.query<{psa_price_usd:string;psa_checked_at:unknown}>('SELECT * FROM holdings')).rows[0];
    assert.equal(Number(refreshed.psa_price_usd),102);
    assert.ok(refreshed.psa_checked_at);
    await pg.exec("UPDATE psa_cache SET fetched_at=now()-interval '1 day'; TRUNCATE psa_requests");
    assert.equal((await syncPsa({...daily,fetcher:(async()=>new Response('',{status:503})) as typeof fetch})).pending,1);
    assert.equal(Number((await pg.query<{psa_price_usd:string}>('SELECT * FROM holdings')).rows[0].psa_price_usd),102);
  }finally{await pg.close();}
});
