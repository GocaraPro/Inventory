import { timingSafeEqual } from "node:crypto";
import { syncCardmarket } from "@/lib/sync";
export const maxDuration = 300;
export async function GET(req:Request) {
  const secret=process.env.CRON_SECRET;
  const supplied=req.headers.get("authorization") ?? "";
  const expected=`Bearer ${secret}`;
  const actualBytes=Buffer.from(supplied),expectedBytes=Buffer.from(expected);
  if (!secret || actualBytes.length!==expectedBytes.length || !timingSafeEqual(actualBytes,expectedBytes)) return Response.json({error:"Unauthorized"},{status:401});
  try {return Response.json(await syncCardmarket());}
  catch {return Response.json({error:"Import failed; previous data retained."},{status:502});}
}
