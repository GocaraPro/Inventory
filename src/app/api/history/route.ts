import { isOwner } from '@/lib/access';
import { db,isDemo } from '@/lib/db';
import { readLocalCatalog } from '@/lib/cardmarket';
import { metadataFor } from '@/lib/product-metadata';
import { demoPriceHistory,priceChange,rankByKind,type Mover } from '@/lib/market-history';
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
      const examples=['card','sealed'].flatMap(kind=>catalog.filter(p=>p.kind===kind&&!!p.imageUrl&&p.trend!==null&&p.trend>=10).slice(0,60));
      const list:Mover[]=examples.flatMap(p=>{
        const history=demoPriceHistory(p,'standard'),previous=history.at(-2)!.price!,current=history.at(-1)!.price!;
        const change=priceChange(previous,current);
        return change?[{...p,previous,current,...change}]:[];
      });
      const dates=demoPriceHistory(catalog.find(p=>p.trend!==null)!,'standard');
      return json({from:dates.at(-2)?.date,to:dates.at(-1)?.date,...rankByKind(list),demo:true});
    }
    const sql=db();
    if(rawId!==null){
      const rows=await sql`SELECT date,(prices->${String(id)}->>(${finish}::integer))::numeric AS price FROM market_history ORDER BY date`;
      return json({points:rows.map(r=>({date:dateOnly(r.date),price:r.price===null?null:Number(r.price)})),demo:false});
    }
    const dates=await sql`SELECT date FROM market_history WHERE date >= (SELECT max(date)-7 FROM market_history) ORDER BY date DESC LIMIT 6`;
    if(dates.length<6)return json({from:null,to:dates[0]?dateOnly(dates[0].date):null,...rankByKind([]),demo:false});
    const rows=await sql`WITH observations AS (
      SELECT date,prices,row_number() OVER(ORDER BY date DESC) AS day
      FROM market_history WHERE date>=${dates[5].date} AND date<=${dates[0].date}
    ), samples AS (
      SELECT c.id,o.day,(n.value->>0)::numeric AS price FROM observations o
      CROSS JOIN LATERAL jsonb_each(o.prices) n JOIN catalog c ON c.id=n.key::integer
      WHERE (n.value->>0)::numeric>0
    ), medians AS (
      SELECT id,percentile_cont(0.5) WITHIN GROUP(ORDER BY price) FILTER(WHERE day<=3) AS current,
        percentile_cont(0.5) WITHIN GROUP(ORDER BY price) FILTER(WHERE day>3) AS previous
      FROM samples GROUP BY id HAVING count(*) FILTER(WHERE day<=3)=3 AND count(*) FILTER(WHERE day>3)=3
    ), changes AS (
      SELECT c.*,m.current,m.previous,(m.current-m.previous)/m.previous*100 AS percent
      FROM medians m JOIN catalog c ON c.id=m.id
      WHERE LEAST(m.current,m.previous)>=5 AND abs(m.current-m.previous)>=1
        AND abs((m.current-m.previous)/m.previous*100)<=30
        AND NOT EXISTS(SELECT 1 FROM samples s WHERE s.id=m.id
          AND abs(s.price/CASE WHEN s.day<=3 THEN m.current ELSE m.previous END-1)>0.3)
    ) (SELECT * FROM changes WHERE kind='card' AND percent>0 ORDER BY percent DESC,id LIMIT 5)
      UNION ALL (SELECT * FROM changes WHERE kind='card' AND percent<0 ORDER BY percent,id LIMIT 5)
      UNION ALL (SELECT * FROM changes WHERE kind='sealed' AND percent>0 ORDER BY percent DESC,id LIMIT 5)
      UNION ALL (SELECT * FROM changes WHERE kind='sealed' AND percent<0 ORDER BY percent,id LIMIT 5)`;
    const movers:Mover[]=rows.map(r=>({id:r.id,name:r.name,kind:r.kind,category:r.category,expansionId:r.expansion_id,
      trend:r.trend===null?null:Number(r.trend),holoTrend:r.holo_trend===null?null:Number(r.holo_trend),priceDate:r.price_date,
      ...metadataFor(r.id,r.expansion_id),previous:Number(r.previous),current:Number(r.current),
      change:Number(r.current)-Number(r.previous),percent:Number(r.percent)}));
    return json({from:dateOnly(dates[5].date),to:dateOnly(dates[0].date),...rankByKind(movers),demo:false});
  }catch{return Response.json({error:'Price history is unavailable. Check the database migration and daily import.'},{status:503});}
}
