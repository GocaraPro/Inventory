// Read-only diagnostics for the two reported market estimates. No holdings,
// owner data, tokens or API keys are read or logged, and no API credits are used.
import {neon} from '@neondatabase/serverless';
const sql=neon(process.env.DATABASE_URL?.trim()||process.env.inventory_DATABASE_URL?.trim());
const rows=await sql`SELECT tcgplayer_id,data,fetched_at FROM psa_cache WHERE tcgplayer_id IN (517045,451834)`;
for(const row of rows){
  const c=row.data;
  console.log('PSA source audit',JSON.stringify({id:row.tcgplayer_id,name:c.name,set:c.setName,number:c.cardNumber,fetchedAt:row.fetched_at,primary:c.prices?.primaryPrinting,psa10:c.ebay?.salesByGrade?.psa10,printings:Object.fromEntries(Object.entries(c.ebay?.salesByPrinting??{}).map(([name,pool])=>[name,pool.salesByGrade?.psa10]))}));
}
