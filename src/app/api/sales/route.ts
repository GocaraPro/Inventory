import {isOwner,sameOrigin} from '@/lib/access';
import {isDemo} from '@/lib/db';
import {recordSale,saleInput} from '@/lib/sales';
export async function POST(req:Request){
  if(!await isOwner())return Response.json({error:'Unauthorized'},{status:401});
  if(!sameOrigin(req))return Response.json({error:'Invalid origin'},{status:403});
  if(isDemo())return Response.json({error:'Sales are available in your connected private inventory.'},{status:400});
  const parsed=saleInput.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:parsed.error.issues[0].message},{status:400});
  try{
    if(!await recordSale(parsed.data))return Response.json({error:'Sale not recorded. Check available quantity and ensure the sale date is on or after the purchase date. Refresh before trying again.'},{status:409});
    return Response.json({ok:true});
  }catch{return Response.json({error:'Could not record sale. You can safely retry this submission.'},{status:503});}
}
