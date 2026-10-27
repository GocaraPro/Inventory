import {psaErrorMessage} from '@/lib/psa';
import {isOwner,sameOrigin} from '@/lib/access';
import {isDemo} from '@/lib/db';
import {getPsaCard} from '@/lib/psa-provider';
import {psaPrintings,psaQuote} from '@/lib/psa';
import {z} from 'zod';
export async function POST(req:Request){
  if(!await isOwner())return Response.json({error:'Unauthorized'},{status:401});
  if(!sameOrigin(req))return Response.json({error:'Invalid origin'},{status:403});
  if(isDemo())return Response.json({error:'Connect the database and API key to look up real PSA prices.'},{status:400});
  const parsed=z.object({id:z.number().int().positive(),grade:z.string().max(10),printing:z.string().max(100).default('')}).safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:'Enter a valid TCGplayer product ID and PSA grade.'},{status:400});
  try{
    const card=await getPsaCard(parsed.data.id);
    return Response.json({id:card.tcgPlayerId,name:card.name,set:card.setName,number:card.cardNumber,options:psaPrintings(card).map(printing=>({printing,quote:psaQuote(card,parsed.data.grade,printing)}))},{headers:{'Cache-Control':'private, no-store'}});
  }catch(e){return Response.json({error:psaErrorMessage(e)},{status:503});}
}
