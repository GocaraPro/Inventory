import {isOwner,sameOrigin} from '@/lib/access';
import {isDemo} from '@/lib/db';
import {recordSale,saleInput,editSale,returnSale,saleEditInput,saleReturnInput} from '@/lib/sales';
async function changeSale(req:Request,restore:boolean){
  try{
    if(!await isOwner())return Response.json({error:'Unauthorized'},{status:401});
    if(!sameOrigin(req))return Response.json({error:'Invalid origin'},{status:403});
    if(isDemo())return Response.json({error:'Connect your private inventory first.'},{status:400});
    const body=await req.json().catch(()=>null);
    let ok=false;
    if(restore){const parsed=saleReturnInput.safeParse(body);if(!parsed.success)return Response.json({error:'Invalid sale.'},{status:400});ok=await returnSale(parsed.data);}
    else {const parsed=saleEditInput.safeParse(body);if(!parsed.success)return Response.json({error:parsed.error.issues[0].message},{status:400});ok=await editSale(parsed.data);}
    return ok?Response.json({ok:true}):Response.json({error:'This sale changed, or the date is before purchase. Close this window, refresh and try again.'},{status:409});
  }catch{return Response.json({error:'Could not update sale. Refresh to check its status before retrying.'},{status:503});}
}
export async function PATCH(req:Request){return changeSale(req,false);}
export async function DELETE(req:Request){return changeSale(req,true);}
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
