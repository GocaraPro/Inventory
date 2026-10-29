import { db } from "./db";
import { fetchCatalog } from "./cardmarket";
import {syncPsa} from './psa-provider';
export async function syncCardmarket() {
  const sql = db();
  // Run independently: a Cardmarket outage must not freeze graded prices.
  const psa=await syncPsa().catch(()=>({updated:0,error:'PSA update failed; previous prices retained.'}));
  try {
    const products = await fetchCatalog();
    const sourceDate = products[0].priceDate!;
    // PSA failures must not prevent the independent Cardmarket import.
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
    // Store compact pairs for the entire catalog, keyed by the source day (not execution day).
    // A retry updates the same day; a stale feed cannot create a false new observation.
    statements.push(sql`INSERT INTO market_history(date,source_date,prices)
      SELECT (${sourceDate}::timestamptz AT TIME ZONE 'Europe/Berlin')::date,${sourceDate}::timestamptz,
        jsonb_object_agg(id::text,jsonb_build_array(trend,holo_trend)) FROM catalog
      WHERE price_date=${sourceDate}::timestamptz
        AND ${sourceDate}::timestamptz >= (SELECT max(price_date) FROM catalog)
      HAVING count(*)>0
      ON CONFLICT(date) DO UPDATE SET source_date=excluded.source_date,prices=excluded.prices
      WHERE market_history.source_date<=excluded.source_date`);
    statements.push(sql`DELETE FROM market_history WHERE date <
      (SELECT max(date)-89 FROM market_history)`);
    statements.push(sql`INSERT INTO snapshots(date,value,cost,unpriced,source_date)
      SELECT (now() AT TIME ZONE 'Europe/Berlin')::date,
        COALESCE(sum(COALESCE(v.price,0)*v.quantity),0),COALESCE(sum(v.purchase_price*v.quantity),0),
        COALESCE(sum(CASE WHEN v.price IS NULL THEN v.quantity ELSE 0 END),0),${sourceDate}::timestamptz
      FROM (SELECT h.quantity,h.purchase_price,CASE WHEN h.kind='graded' THEN CASE WHEN h.psa_enabled THEN h.psa_price_usd ELSE h.manual_price END WHEN h.finish='holo' THEN c.holo_trend ELSE c.trend END AS price
        FROM holdings h JOIN catalog c ON c.id=h.product_id) v
      ON CONFLICT(date) DO UPDATE SET value=excluded.value,cost=excluded.cost,unpriced=excluded.unpriced,source_date=excluded.source_date`);
    // PostgreSQL transaction-scoped lock serializes concurrent scheduled imports.
    await sql.transaction([sql`SELECT pg_advisory_xact_lock(738201)`,...statements]);
    return { products: products.length, sourceDate,psa };
  } catch (error) {
    await sql`INSERT INTO sync_state(id,error) VALUES(1,'Price update failed. Previous data has been retained.') ON CONFLICT(id) DO UPDATE SET error=excluded.error`;
    throw error;
  }
}
