import { isOwner } from "@/lib/access";
import { isDemo } from "@/lib/db";
import { readLocalCatalog } from "@/lib/cardmarket";
import { searchProducts } from "@/lib/repository";
import { matchesSearch,searchText } from "@/lib/product-display";
import { metadataFor } from "@/lib/product-metadata";
export async function GET(req: Request) {
  if (!await isOwner()) return Response.json({error:"Unauthorized"},{status:401});
  const params = new URL(req.url).searchParams, q = (params.get("q") ?? "").trim().slice(0,120), kind = params.get("kind") === "sealed" ? "sealed" : "card";
  if(params.has('ids')){
    const ids=(params.get('ids')??'').split(',').slice(0,500).map(Number).filter(id=>Number.isInteger(id)&&id>0);
    return Response.json(ids.map(productId=>({productId,...metadataFor(productId)})),{headers:{'Cache-Control':'private, no-store'}});
  }
  if (q.length<2) return Response.json([]);
  try {
    const items = isDemo() ? (await readLocalCatalog()).filter(p=>p.kind===kind && matchesSearch(searchText(p),q)).sort((a,b)=>Number(!!b.cardNumber)-Number(!!a.cardNumber)||a.name.localeCompare(b.name)).slice(0,40) : await searchProducts(q,kind);
    return Response.json(items,{headers:{"Cache-Control":"private, no-store"}});
  } catch { return Response.json({error:"Catalog unavailable. Download or import the Cardmarket catalog first."},{status:503}); }
}
