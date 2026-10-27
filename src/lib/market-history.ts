import type { Product } from './types';
export type PricePoint = { date:string; price:number|null };
export type Mover = Product & { previous:number; current:number; change:number; percent:number };
export type MoverRanking = { gainers:Mover[]; losers:Mover[] };
export type Movers = { from:string|null; to:string|null; cards:MoverRanking; sealed:MoverRanking; demo:boolean };
export function rankByKind(items:Mover[]) {
  return {cards:rankMovers(items.filter(p=>p.kind==='card')),sealed:rankMovers(items.filter(p=>p.kind==='sealed'))};
}
export function priceChange(previous:number|null,current:number|null) {
  if(previous===null||current===null||previous<=0||current<0||!Number.isFinite(previous)||!Number.isFinite(current))return null;
  return {change:current-previous,percent:(current-previous)/previous*100};
}
export function rankMovers(items:Mover[]) {
  return {
    gainers:items.filter(p=>p.change>0).sort((a,b)=>b.percent-a.percent||a.id-b.id).slice(0,5),
    losers:items.filter(p=>p.change<0).sort((a,b)=>a.percent-b.percent||a.id-b.id).slice(0,5),
  };
}
// Explicitly synthetic preview data. Never called in database mode.
export function demoPriceHistory(product:Product,finish:string):PricePoint[] {
  const current=finish==='holo'?product.holoTrend:product.trend;
  if(current===null)return [];
  const direction=product.id%2===0?1:-1;
  return Array.from({length:90},(_,i)=>{
    const date=new Date();date.setUTCDate(date.getUTCDate()-89+i);
    const factor=1+direction*(89-i)/350+Math.sin((i+product.id%11)/5)*.025;
    return {date:date.toISOString().slice(0,10),price:Number((current*(i===89?1:factor)).toFixed(2))};
  });
}
