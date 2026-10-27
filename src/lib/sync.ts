import { db } from "./db";
import { fetchCatalog } from "./cardmarket";
export async function syncCardmarket() {
  const sql = db();
  try {
    const products = await fetchCatalog();
    const sourceDate = products[0].priceDate!;
    // Stage each batch inside one transaction: a failed import cannot expose partial prices.
    const statements = [];
    for (let i=0;i<products.length;i+=2000) {
      const json = JSON.stringify(products.slice(i,i+2000));
      statements.push(sql`INSERT INTO catalog(id,name,category,kind,expansion_id,trend,holo_trend,price_date)
        SELECT x.id,x.name,x.category,x.kind,x."expansionId",x.trend,x."holoTrend",x."priceDate"::timestamptz
        FROM jsonb_to_recordset(${json}::jsonb) AS x(id integer,name text,category text,kind text,"expansionId" integer,trend numeric,"holoTrend" numeric,"priceDate" text)
        ON CONFLICT(id) DO UPDATE SET name=excluded.name,category=excluded.category,kind=excluded.kind,expansion_id=excluded.expansion_id,
        trend=excluded.trend,holo_trend=excluded.holo_trend,price_date=excluded.price_date,updated_at=now()
        WHERE catalog.price_date IS NULL OR catalog.price_date <= excluded.price_date`);
    }
    statements.push(sql`INSERT INTO sync_state(id,last_success,source_date,error) VALUES(1,now(),${sourceDate},NULL)
      ON CONFLICT(id) DO UPDATE SET last_success=now(),source_date=GREATEST(sync_state.source_date,excluded.source_date),error=NULL`);
    statements.push(sql`INSERT INTO snapshots(date,value,cost,unpriced,source_date)
      SELECT (now() AT TIME ZONE 'Europe/Berlin')::date,
        COALESCE(sum(COALESCE(v.price,0)*v.quantity),0),COALESCE(sum(v.purchase_price*v.quantity),0),
        COALESCE(sum(CASE WHEN v.price IS NULL THEN v.quantity ELSE 0 END),0),${sourceDate}::timestamptz
      FROM (SELECT h.quantity,h.purchase_price,CASE WHEN h.kind='graded' THEN h.manual_price WHEN h.finish='holo' THEN c.holo_trend ELSE c.trend END AS price
        FROM holdings h JOIN catalog c ON c.id=h.product_id) v
      ON CONFLICT(date) DO UPDATE SET value=excluded.value,cost=excluded.cost,unpriced=excluded.unpriced,source_date=excluded.source_date`);
    // PostgreSQL transaction-scoped lock serializes concurrent scheduled imports.
    await sql.transaction([sql`SELECT pg_advisory_xact_lock(738201)`,...statements]);
    return { products: products.length, sourceDate };
  } catch (error) {
    await sql`INSERT INTO sync_state(id,error) VALUES(1,'Price update failed. Previous data has been retained.') ON CONFLICT(id) DO UPDATE SET error=excluded.error`;
    throw error;
  }
}
