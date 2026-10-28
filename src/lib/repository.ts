import { db } from "./db";
import type { Holding, Product, Snapshot, SyncInfo, Sale } from "./types";
import { selectPrice } from "./valuation";
import { metadataFor, matchingMetadataIds } from "./product-metadata";
import { tokens } from "./product-display";
import {ensurePsaSchema} from './psa-schema';
const dateOnly=(value:unknown)=>value instanceof Date?value.toISOString().slice(0,10):String(value).slice(0,10);
export async function getSales():Promise<Sale[]> {
  const rows=await db()`SELECT * FROM sales ORDER BY sale_date DESC,created_at DESC`;
  return rows.map(r=>({id:r.id,quantity:r.quantity,purchasePrice:Number(r.purchase_price),salePrice:Number(r.sale_price),fees:Number(r.fees),saleDate:dateOnly(r.sale_date),notes:r.notes,
    product:{...r.product,id:r.holding_id,productId:r.product_id,expansionId:r.product.expansion_id,gradingCompany:r.product.grading_company,customImageUrl:r.product.custom_image_url,...metadataFor(r.product_id,r.product.expansion_id)}}));
}
export async function getHoldings(): Promise<Holding[]> {
  await ensurePsaSchema();
  const rows = await db()`SELECT h.*,c.name,c.category,c.expansion_id,c.trend,c.holo_trend,c.price_date FROM holdings h JOIN catalog c ON c.id=h.product_id ORDER BY h.created_at DESC`;
  return rows.map(r => {
    const manual = r.manual_price === null ? null : Number(r.manual_price);
    const psaPrice=r.psa_price_usd==null?null:Number(r.psa_price_usd);
    return { id: r.id, productId: r.product_id, name: r.name, category: r.category, expansionId: r.expansion_id,
      kind: r.kind, finish: r.finish, condition: r.condition, quantity: r.quantity,
      purchasePrice: Number(r.purchase_price), purchaseDate: dateOnly(r.purchase_date), notes: r.notes,
      gradingCompany: r.grading_company, grade: r.grade, certificate: r.certificate, manualPrice: manual,
      currentPrice: selectPrice(r.kind,r.finish,r.psa_enabled?psaPrice:manual,r.trend === null ? null : Number(r.trend),r.holo_trend === null ? null : Number(r.holo_trend)),
      psaEnabled:r.psa_enabled,psaTcgplayerId:r.psa_tcgplayer_id,psaPrinting:r.psa_printing,psaPriceUsd:psaPrice,psaPriceDate:r.psa_price_date,psaError:r.psa_error,
      customImageUrl:r.custom_image_url,
      priceDate: r.kind === "graded" ? r.psa_enabled?r.psa_price_date:r.manual_price_date : r.price_date, ...metadataFor(r.product_id,r.expansion_id) };
  });
}
export async function searchProducts(query: string, kind: string): Promise<Product[]> {
  const ids=matchingMetadataIds(query),words=tokens(query);
  const rows = await db()`SELECT * FROM catalog WHERE
    (id IN (SELECT value::integer FROM jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb))
    OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(${JSON.stringify(words)}::jsonb) AS t(word) WHERE lower(name) NOT LIKE '%' || t.word || '%'))
    AND (${kind}='all' OR kind=${kind}) ORDER BY (id IN (SELECT value::integer FROM jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb))) DESC,name,id LIMIT 40`;
  return rows.map(r => ({ id:r.id,name:r.name,category:r.category,kind:r.kind,expansionId:r.expansion_id,
    trend:r.trend === null ? null : Number(r.trend),holoTrend:r.holo_trend === null ? null : Number(r.holo_trend),priceDate:r.price_date,...metadataFor(r.id,r.expansion_id) }));
}
export async function getSnapshots(): Promise<Snapshot[]> {
  const rows = await db()`SELECT * FROM snapshots ORDER BY date`;
  return rows.map(r=>({date:dateOnly(r.date),value:Number(r.value),cost:Number(r.cost),unpriced:r.unpriced}));
}
export async function getSyncInfo(): Promise<SyncInfo> {
  const [r] = await db()`SELECT * FROM sync_state WHERE id=1`;
  return {lastSuccess:r?.last_success ?? null,sourceDate:r?.source_date ?? null,error:r?.error ?? null};
}
