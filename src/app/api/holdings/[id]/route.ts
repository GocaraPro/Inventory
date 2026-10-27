import {psaErrorMessage} from '@/lib/psa';
import { isOwner, sameOrigin } from "@/lib/access";
import { db, isDemo } from "@/lib/db";
import { z } from "zod";
import { imageInput,psaFields } from "@/lib/validation";
import { preparePsa } from '@/lib/psa-provider';
import {ensurePsaSchema} from '@/lib/psa-schema';
const change = z.object({ ...psaFields,customImageUrl:imageInput, quantity:z.number().int().min(1).max(100000),purchasePrice:z.number().min(0).max(10000000), notes:z.string().max(2000),manualPrice:z.number().min(0).max(10000000).nullable() });
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
  await ensurePsaSchema();
  const [existing]=await db()`SELECT * FROM holdings WHERE id=${id}`;
  if(!existing)return Response.json({error:'Item not found'},{status:404});
  let quote;
  // Editing notes must remain possible during a provider outage for an unchanged link.
  const unchanged=v.psaEnabled&&existing.psa_enabled&&v.psaTcgplayerId===existing.psa_tcgplayer_id&&v.psaPrinting===existing.psa_printing;
  try{quote=unchanged?{usd:existing.psa_price_usd,date:existing.psa_price_date}:await preparePsa({...v,kind:existing.kind,gradingCompany:existing.grading_company,grade:existing.grade});}catch(e){return Response.json({error:psaErrorMessage(e)},{status:400});}
  const rows=await db()`UPDATE holdings SET quantity=${v.quantity},purchase_price=${v.purchasePrice},notes=${v.notes},custom_image_url=${v.customImageUrl??null},
    psa_enabled=${v.psaEnabled},psa_tcgplayer_id=${v.psaTcgplayerId??null},psa_printing=${v.psaPrinting??null},psa_price_usd=${quote?.usd??null},psa_price_date=${quote?.date??null},psa_error=${unchanged?existing.psa_error:null},
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
