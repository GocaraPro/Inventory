import {psaErrorMessage} from '@/lib/psa';
import { isOwner, sameOrigin } from "@/lib/access";
import { db, isDemo } from "@/lib/db";
import { holdingInput } from "@/lib/validation";
import { preparePsa } from '@/lib/psa-provider';
import {ensurePsaSchema} from '@/lib/psa-schema';
export async function POST(req: Request) {
  if (!await isOwner()) return Response.json({error:"Unauthorized"},{status:401});
  if (!sameOrigin(req)) return Response.json({error:"Invalid origin"},{status:403});
  if (isDemo()) return Response.json({error:"Demo changes are stored in this browser."},{status:400});
  const parsed = holdingInput.safeParse(await req.json().catch(()=>null));
  if (!parsed.success) return Response.json({error:parsed.error.issues[0].message},{status:400});
  const v = parsed.data;
  await ensurePsaSchema();
  const [product] = await db()`SELECT kind FROM catalog WHERE id=${v.productId}`;
  if (!product || (v.kind === "sealed" ? product.kind !== "sealed" : product.kind !== "card")) return Response.json({error:"Choose a matching catalog product."},{status:400});
  let quote;
  try{quote=await preparePsa(v);}catch(e){return Response.json({error:psaErrorMessage(e)},{status:400});}
  const [row] = await db()`INSERT INTO holdings(product_id,kind,finish,condition,quantity,purchase_price,purchase_date,notes,grading_company,grade,certificate,manual_price,manual_price_date,custom_image_url,psa_enabled,psa_tcgplayer_id,psa_printing,psa_price_usd,psa_price_date)
    VALUES(${v.productId},${v.kind},${v.finish},${v.condition},${v.quantity},${v.purchasePrice},${v.purchaseDate},${v.notes},${v.kind==='graded'?v.gradingCompany:null},${v.kind==='graded'?v.grade:null},${v.kind==='graded'?v.certificate:null},${v.kind==='graded'?v.manualPrice:null},${v.kind==='graded'&&v.manualPrice!==null?new Date().toISOString():null},${v.customImageUrl??null},${v.psaEnabled},${v.psaTcgplayerId??null},${v.psaPrinting??null},${quote?.usd??null},${quote?.date??null}) RETURNING id`;
  return Response.json(row,{status:201});
}
