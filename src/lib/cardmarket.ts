import { z } from "zod";
import type { Product } from "./types";
const price = z.number().nonnegative().finite().nullable().optional();
export const catalogFile = z.object({ version: z.literal(1), createdAt: z.string(), products: z.array(z.object({
  idProduct: z.number().int().positive(), name: z.string(), categoryName: z.string(), idExpansion: z.number().int()
})) });
export const priceFile = z.object({ version: z.literal(1), createdAt: z.string(), priceGuides: z.array(z.object({
  idProduct: z.number().int().positive(), trend: price, "trend-holo": price
})) });
export const sources = {
  singles: "https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_6.json",
  sealed: "https://downloads.s3.cardmarket.com/productCatalog/productList/products_nonsingles_6.json",
  prices: "https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_6.json"
};
export function normalizeDate(value: string) {
  const parsed = new Date(value.replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));
  if (!Number.isFinite(parsed.getTime())) throw new Error("Invalid Cardmarket source date");
  return parsed.toISOString();
}
export function mergeCatalog(singleData: unknown, sealedData: unknown, priceData: unknown): Product[] {
  const singles = catalogFile.parse(singleData), sealed = catalogFile.parse(sealedData), prices = priceFile.parse(priceData);
  if (!singles.products.length || !sealed.products.length || !prices.priceGuides.length) throw new Error("Cardmarket returned an empty file");
  const date = normalizeDate(prices.createdAt);
  const byId = new Map(prices.priceGuides.map(p => [p.idProduct, p]));
  return [ ...singles.products.map(p => ({ ...p, kind: "card" as const })), ...sealed.products.map(p => ({ ...p, kind: "sealed" as const })) ].map(p => ({
    id: p.idProduct, name: p.name, category: p.categoryName, expansionId: p.idExpansion, kind: p.kind,
    trend: byId.get(p.idProduct)?.trend ?? null, holoTrend: byId.get(p.idProduct)?.["trend-holo"] ?? null,
    priceDate: date
  }));
}
export async function fetchCatalog() {
  const files = await Promise.all(Object.values(sources).map(async url => {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(60000) });
    if (!res.ok) throw new Error(`Cardmarket download failed (${res.status})`);
    return res.json();
  }));
  return mergeCatalog(...files as [unknown, unknown, unknown]);
}
let localCatalog: Product[] | null = null;
export async function readLocalCatalog() {
  if (localCatalog) return localCatalog;
  const { readFile } = await import("node:fs/promises");
  const files = await Promise.all(["singles", "sealed", "prices"].map(async name => JSON.parse(await readFile(`${process.cwd()}/.cache/${name}.json`, "utf8"))));
  localCatalog = mergeCatalog(...files as [unknown, unknown, unknown]);
  return localCatalog;
}
