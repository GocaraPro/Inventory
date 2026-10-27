import { isOwner } from "@/lib/access";
import { isDemo } from "@/lib/db";
import { readLocalCatalog } from "@/lib/cardmarket";
import { searchProducts } from "@/lib/repository";
export async function GET(req: Request) {
  if (!await isOwner()) return Response.json({error:"Unauthorized"},{status:401});
  const params = new URL(req.url).searchParams, q = (params.get("q") ?? "").trim().slice(0,120), kind = params.get("kind") === "sealed" ? "sealed" : "card";
  if (q.length<2) return Response.json([]);
  try {
    const items = isDemo() ? (await readLocalCatalog()).filter(p=>p.kind===kind && p.name.toLowerCase().includes(q.toLowerCase())).slice(0,40) : await searchProducts(q,kind);
    return Response.json(items,{headers:{"Cache-Control":"private, no-store"}});
  } catch { return Response.json({error:"Catalog unavailable. Download or import the Cardmarket catalog first."},{status:503}); }
}
