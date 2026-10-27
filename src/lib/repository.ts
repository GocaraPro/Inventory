import { db } from "./db";
import type { Holding, Product, Snapshot, SyncInfo } from "./types";
import { selectPrice } from "./valuation";
const dateOnly=(value:unknown)=>value instanceof Date?value.toISOString().slice(0,10):String(value).slice(0,10);
export async function getHoldings(): Promise<Holding[]> {
  const rows = await db()`SELECT h.*,c.name,c.category,c.expansion_id,c.trend,c.holo_trend,c.price_date FROM holdings h JOIN catalog c ON c.id=h.product_id ORDER BY h.created_at DESC`;
  return rows.map(r => {
    const manual = r.manual_price === null ? null : Number(r.manual_price);
    return { id: r.id, productId: r.product_id, name: r.name, category: r.category, expansionId: r.expansion_id,
      kind: r.kind, finish: r.finish, condition: r.condition, quantity: r.quantity,
      purchasePrice: Number(r.purchase_price), purchaseDate: dateOnly(r.purchase_date), notes: r.notes,
      gradingCompany: r.grading_company, grade: r.grade, certificate: r.certificate, manualPrice: manual,
      currentPrice: selectPrice(r.kind,r.finish,manual,r.trend === null ? null : Number(r.trend),r.holo_trend === null ? null : Number(r.holo_trend)),
      priceDate: r.kind === "graded" ? r.manual_price_date : r.price_date };
  });
}
export async function searchProducts(query: string, kind: string): Promise<Product[]> {
  const term = `%${query.replace(/[\\%_]/g,"\\$&")}%`;
  const rows = await db()`SELECT * FROM catalog WHERE name ILIKE ${term} AND (${kind}='all' OR kind=${kind}) ORDER BY name,id LIMIT 40`;
  return rows.map(r => ({ id:r.id,name:r.name,category:r.category,kind:r.kind,expansionId:r.expansion_id,
    trend:r.trend === null ? null : Number(r.trend),holoTrend:r.holo_trend === null ? null : Number(r.holo_trend),priceDate:r.price_date }));
}
export async function getSnapshots(): Promise<Snapshot[]> {
  const rows = await db()`SELECT * FROM snapshots ORDER BY date`;
  return rows.map(r=>({date:dateOnly(r.date),value:Number(r.value),cost:Number(r.cost),unpriced:r.unpriced}));
}
export async function getSyncInfo(): Promise<SyncInfo> {
  const [r] = await db()`SELECT * FROM sync_state WHERE id=1`;
  return {lastSuccess:r?.last_success ?? null,sourceDate:r?.source_date ?? null,error:r?.error ?? null};
}
