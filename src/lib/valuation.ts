import type { Holding } from "./types";
export function totals(items: Holding[]) {
  const cost = items.reduce((s, i) => s + i.purchasePrice * i.quantity, 0);
  const priced = items.filter(i => i.currentPrice !== null);
  const value = priced.reduce((s, i) => s + i.currentPrice! * i.quantity, 0);
  const pricedCost = priced.reduce((s, i) => s + i.purchasePrice * i.quantity, 0);
  return { cost, value, gain: value - pricedCost,
    gainPercent: pricedCost > 0 ? (value - pricedCost) / pricedCost * 100 : null,
    units: items.reduce((s, i) => s + i.quantity, 0),
    products: new Set(items.map(i => `${i.productId}-${i.kind}-${i.finish}-${i.gradingCompany}-${i.grade}`)).size,
    unpriced: items.filter(i => i.currentPrice === null).reduce((s, i) => s + i.quantity, 0)
  };
}
export function selectPrice(kind: string, finish: string, manual: number | null, trend: number | null, holo: number | null) {
  if (kind === "graded") return manual;
  return finish === "holo" ? holo : trend;
}
export function isStale(date: string | null, now = Date.now()) {
  return !date || now - new Date(date).getTime() > 48 * 60 * 60 * 1000;
}
export const money = (value: number) => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(value);
