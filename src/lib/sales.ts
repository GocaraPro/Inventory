import {z} from 'zod';
import {db} from './db';
export const saleInput=z.object({
  id:z.uuid(),holdingId:z.uuid(),quantity:z.number().int().min(1).max(100000),
  salePrice:z.number().finite().min(0).max(10000000).multipleOf(0.01),
  fees:z.number().finite().min(0).max(10000000).multipleOf(0.01),
  saleDate:z.iso.date().refine(value=>value<=new Date().toISOString().slice(0,10),'Sale date cannot be in the future.'),
  notes:z.string().max(2000).default('')
});
export type SaleInput=z.infer<typeof saleInput>;
export const saleEditInput=saleInput.pick({salePrice:true,fees:true,saleDate:true,notes:true}).extend({id:z.uuid(),revision:z.number().int().nonnegative()});
export const saleReturnInput=z.object({id:z.uuid(),revision:z.number().int().nonnegative()});
export async function editSale(v:z.infer<typeof saleEditInput>,sql=db()) {
  const results=await sql.transaction([
    sql`SELECT pg_advisory_xact_lock(738203)`,
    sql`UPDATE sales SET sale_price=${v.salePrice},fees=${v.fees},sale_date=${v.saleDate}::date,notes=${v.notes},revision=revision+1
      WHERE id=${v.id} AND revision=${v.revision} AND reversed_at IS NULL
      AND (product->>'purchase_date')::date<=${v.saleDate}::date RETURNING id`
  ]);
  return results[1].length>0;
}
export async function returnSale(v:z.infer<typeof saleReturnInput>,sql=db()) {
  // Restore a separate purchase lot: the remaining original lot may have been edited.
  // The ledger marker and stock insertion commit together, making retries harmless.
  const results=await sql.transaction([
    sql`SELECT pg_advisory_xact_lock(738203)`,
    sql`WITH reversed AS (
      UPDATE sales SET reversed_at=now(),revision=revision+1
      WHERE id=${v.id} AND revision=${v.revision} AND reversed_at IS NULL RETURNING *
    ) INSERT INTO holdings SELECT restored.* FROM reversed s
      CROSS JOIN LATERAL jsonb_populate_record(NULL::holdings,
        s.product || jsonb_build_object('id',gen_random_uuid(),'product_id',s.product_id,'quantity',s.quantity,'purchase_price',s.purchase_price)) restored
      RETURNING id`,
    sql`SELECT reversed_at FROM sales WHERE id=${v.id}`
  ]);
  return results[2][0]?.reversed_at!=null;
}
export async function recordSale(v:SaleInput,sql=db()) {
  // Lock and ledger insert share a transaction. Repeated submission IDs cannot
  // deduct stock twice; the original purchase is retained in the sale snapshot.
  const results=await sql.transaction([
    sql`SELECT pg_advisory_xact_lock(738203)`,
    sql`WITH available AS MATERIALIZED (
      SELECT h.*,c.name,c.category,c.expansion_id FROM holdings h JOIN catalog c ON c.id=h.product_id
      WHERE h.id=${v.holdingId} AND h.quantity>=${v.quantity} AND h.purchase_date<=${v.saleDate}::date
      AND NOT EXISTS(SELECT 1 FROM sales WHERE id=${v.id}) FOR UPDATE OF h
    ), reduced AS (
      UPDATE holdings h SET quantity=h.quantity-${v.quantity} FROM available a
      WHERE h.id=a.id AND a.quantity>${v.quantity} RETURNING h.id
    ), removed AS (
      DELETE FROM holdings h USING available a WHERE h.id=a.id AND a.quantity=${v.quantity} RETURNING h.id
    ) INSERT INTO sales(id,holding_id,product_id,product,quantity,purchase_price,sale_price,fees,sale_date,notes)
      SELECT ${v.id},a.id,a.product_id,to_jsonb(a),${v.quantity},a.purchase_price,${v.salePrice},${v.fees},${v.saleDate}::date,${v.notes}
      FROM available a WHERE EXISTS(SELECT 1 FROM reduced) OR EXISTS(SELECT 1 FROM removed) RETURNING id`,
    sql`SELECT id,holding_id,quantity,sale_price,fees,sale_date,notes FROM sales WHERE id=${v.id}`
  ]);
  const row=results[2][0];
  if(!row)return false;
  // Reject reuse of an idempotency key for a different sale.
  const date=row.sale_date instanceof Date?row.sale_date.toISOString().slice(0,10):String(row.sale_date).slice(0,10);
  return row.holding_id===v.holdingId&&row.quantity===v.quantity&&Number(row.sale_price)===v.salePrice&&Number(row.fees)===v.fees&&date===v.saleDate&&row.notes===v.notes;
}
