import { isOwner, sameOrigin } from "@/lib/access";
import { db, isDemo } from "@/lib/db";
import { z } from "zod";
const change = z.object({ quantity:z.number().int().min(1).max(100000),purchasePrice:z.number().min(0).max(10000000), notes:z.string().max(2000),manualPrice:z.number().min(0).max(10000000).nullable() });
async function guard(req:Request,id:string) {
  if (!await isOwner()) return Response.json({error:"Unauthorized"},{status:401});
  if (!sameOrigin(req)) return Response.json({error:"Invalid origin"},{status:403});
  if (isDemo() || !z.uuid().safeParse(id).success) return Response.json({error:"Invalid request"},{status:400});
}
export async function PATCH(req:Request,ctx:{params:Promise<{id:string}>}) {
  const {id}=await ctx.params; const blocked=await guard(req,id);if(blocked)return blocked;
  const parsed=change.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:"Please check the entered values."},{status:400});
  const v=parsed.data;
  const rows=await db()`UPDATE holdings SET quantity=${v.quantity},purchase_price=${v.purchasePrice},notes=${v.notes},
    manual_price=CASE WHEN kind='graded' THEN ${v.manualPrice} ELSE NULL END,
    manual_price_date=CASE WHEN kind='graded' AND manual_price IS DISTINCT FROM ${v.manualPrice}::numeric THEN now() ELSE manual_price_date END
    WHERE id=${id} RETURNING id`;
  return rows.length?Response.json({ok:true}):Response.json({error:"Item not found"},{status:404});
}
export async function DELETE(req:Request,ctx:{params:Promise<{id:string}>}) {
  const {id}=await ctx.params;const blocked=await guard(req,id);if(blocked)return blocked;
  await db()`DELETE FROM holdings WHERE id=${id}`;
  return Response.json({ok:true});
}
