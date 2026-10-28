import type { ProductMetadata } from "./product-metadata";
export type Kind = "sealed" | "card" | "graded";
export type Product = ProductMetadata & {
  id: number; name: string; category: string; kind: "sealed" | "card";
  expansionId: number; trend: number | null; holoTrend: number | null;
  priceDate: string | null;
};
export type Holding = ProductMetadata & {
  id: string; productId: number; name: string; category: string;
  kind: Kind; finish: "standard" | "holo"; condition: "NM" | "MINT";
  quantity: number; purchasePrice: number; purchaseDate: string; notes: string;
  gradingCompany: string | null; grade: string | null; certificate: string | null;
  manualPrice: number | null; currentPrice: number | null; priceDate: string | null;
  expansionId: number;
  psaEnabled?:boolean; psaTcgplayerId?:number|null; psaPrinting?:string|null;
  psaPriceUsd?:number|null; psaPriceDate?:string|null; psaError?:string|null;
};
export type Snapshot = { date: string; value: number; cost: number; unpriced: number };
export type SyncInfo = { lastSuccess: string | null; sourceDate: string | null; error: string | null };
export type Sale = {id:string;revision:number;product:Holding;quantity:number;purchasePrice:number;salePrice:number;fees:number;saleDate:string;notes:string};
