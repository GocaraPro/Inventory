import {isOwner,sameOrigin} from '@/lib/access';
import {db,isDemo} from '@/lib/db';
import {syncCardmarket} from '@/lib/sync';
export const maxDuration=300;
export async function POST(request:Request) {
  if (!sameOrigin(request) || !await isOwner() || isDemo()) return Response.json({error:'Unauthorized'},{status:403});
  const rows=await db()`INSERT INTO login_throttle(email,sent_at) VALUES ('catalog-sync',now())
    ON CONFLICT(email) DO UPDATE SET sent_at=now() WHERE login_throttle.sent_at < now()-interval '5 minutes' RETURNING email`;
  if (!rows.length) return Response.json({error:'An import was started recently. Please wait five minutes.'},{status:429});
  try {return Response.json(await syncCardmarket());}
  catch {return Response.json({error:'Import failed. Previous data retained. Please try again later.'},{status:502});}
}
