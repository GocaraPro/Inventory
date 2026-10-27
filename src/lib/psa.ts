import { z } from 'zod';
export class PsaError extends Error {}
export function psaErrorMessage(error:unknown){return error instanceof PsaError?error.message:'PSA update failed. Check the server configuration; previous prices are retained.';}
const gradeData=z.object({count:z.number().int().nonnegative().optional(),medianPrice:z.number().finite().nonnegative().nullable().optional(),lastSaleDate:z.string().nullable().optional(),lastMarketUpdate:z.string().optional()});
const pool=z.object({salesByGrade:z.record(z.string(),gradeData).optional()});
export const providerCard=z.object({
  tcgPlayerId:z.union([z.string(),z.number()]).transform(String),name:z.string(),setName:z.string(),cardNumber:z.string(),
  prices:z.object({primaryPrinting:z.string().optional()}).optional(),printingsAvailable:z.array(z.string()).optional(),
  ebay:pool.extend({updatedAt:z.string().optional(),salesByPrinting:z.record(z.string(),pool).optional()}).optional()
});
export type ProviderCard=z.infer<typeof providerCard>;
export function psaQuote(card:ProviderCard,grade:string,printing:string){
  if(!/^(?:[1-9](?:\.5)?|10)$/.test(grade))return null;
  const primary=card.prices?.primaryPrinting;
  // Never infer edition/printing or fall back to the primary pool.
  if(!printing||!primary)return null;
  const sales=printing===primary?card.ebay?.salesByGrade:card.ebay?.salesByPrinting?.[printing]?.salesByGrade;
  const value=sales?.[`psa${grade.replace('.','_')}`];
  if(!value||!value.count||!value.medianPrice)return null;
  const date=value.lastSaleDate;
  if(!date||!Number.isFinite(Date.parse(date)))return null;
  return {usd:value.medianPrice,eur:value.medianPrice,date:new Date(date).toISOString(),sales:value.count};
}
export function psaPrintings(card:ProviderCard){
  return [...new Set([card.prices?.primaryPrinting,...Object.keys(card.ebay?.salesByPrinting??{})].filter((v):v is string=>!!v))];
}
