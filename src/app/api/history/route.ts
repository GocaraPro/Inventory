import { isOwner } from '@/lib/access';
import { db,isDemo } from '@/lib/db';
import { readLocalCatalog } from '@/lib/cardmarket';
import { metadataFor } from '@/lib/product-metadata';
import { demoPriceHistory,priceChange,rankMovers,type Mover } from '@/lib/market-history';
const dateOnly=(value:unknown)=>value instanceof Date?value.toISOString().slice(0,10):String(value).slice(0,10);
export async function GET(req:Request) {
  if(!await isOwner())return Response.json({error:'Unauthorized'},{status:401});
  const params=new URL(req.url).searchParams,rawId=params.get('id'),id=Number(rawId),finish=params.get('finish')==='holo'?1:0;
  if(rawId!==null&&(!Number.isSafeInteger(id)||id<=0))return Response.json({error:'Invalid product ID'},{status:400});
  const json=(body:unknown)=>Response.json(body,{headers:{'Cache-Control':'private, no-store'}});
  try {
    if(isDemo()) {
      const catalog=await readLocalCatalog();
      if(rawId!==null){
        const product=catalog.find(p=>p.id===id);
        if(!product)return Response.json({error:'Product not found'},{status:404});
        return json({points:demoPriceHistory(product,finish?'holo':'standard'),demo:true});
      }
      const list:Mover[]=catalog.filter(p=>p.kind==='card'&&!!p.imageUrl&&p.trend!==null&&p.trend>=10).slice(0,60).flatMap(p=>{
        const history=demoPriceHistory(p,'standard'),previous=history.at(-2)!.price!,current=history.at(-1)!.price!;
        const change=priceChange(previous,current);
        return change?[{...p,previous,current,...change}]:[];
      });
      const dates=demoPriceHistory(catalog.find(p=>p.trend!==null)!,'standard');
      return json({from:dates.at(-2)?.date,to:dates.at(-1)?.date,...rankMovers(list),demo:true});
    }
    const sql=db();
    if(rawId!==null){
      const rows=await sql`SELECT date,(prices->${String(id)}->>(${finish}::integer))::numeric AS price FROM market_history ORDER BY date`;
      return json({points:rows.map(r=>({date:dateOnly(r.date),price:r.price===null?null:Number(r.price)})),demo:false});
    }
    const dates=await sql`SELECT date FROM market_history ORDER BY date DESC LIMIT 2`;
    if(dates.length<2)return json({from:null,to:dates[0]?dateOnly(dates[0].date):null,gainers:[],losers:[],demo:false});
    const rows=await sql`WITH pair AS (
      SELECT (SELECT prices FROM market_history WHERE date=${dates[0].date}) AS latest,
             (SELECT prices FROM market_history WHERE date=${dates[1].date}) AS previous
    ), changes AS (
      SELECT c.*, (n.value->>0)::numeric AS current,(p.value->>0)::numeric AS previous,
        ((n.value->>0)::numeric-(p.value->>0)::numeric)/NULLIF((p.value->>0)::numeric,0)*100 AS percent
      FROM pair CROSS JOIN LATERAL jsonb_each(pair.latest) n
      JOIN LATERAL jsonb_each(pair.previous) p ON p.key=n.key
      JOIN catalog c ON c.id=n.key::integer
      WHERE (p.value->>0)::numeric>0 AND (n.value->>0)::numeric>=0
    ) (SELECT * FROM changes WHERE percent>0 ORDER BY percent DESC,id LIMIT 5)
      UNION ALL (SELECT * FROM changes WHERE percent<0 ORDER BY percent,id LIMIT 5)`;
    const movers:Mover[]=rows.map(r=>({id:r.id,name:r.name,kind:r.kind,category:r.category,expansionId:r.expansion_id,
      trend:r.trend===null?null:Number(r.trend),holoTrend:r.holo_trend===null?null:Number(r.holo_trend),priceDate:r.price_date,
      ...metadataFor(r.id,r.expansion_id),previous:Number(r.previous),current:Number(r.current),
      change:Number(r.current)-Number(r.previous),percent:Number(r.percent)}));
    return json({from:dateOnly(dates[1].date),to:dateOnly(dates[0].date),...rankMovers(movers),demo:false});
  }catch{return Response.json({error:'Price history is unavailable. Check the database migration and daily import.'},{status:503});}
}
