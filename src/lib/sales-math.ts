export function saleTotals(quantity:number,purchasePrice:number,salePrice:number,fees:number){
  const gross=Math.round(salePrice*100)*quantity,cost=Math.round(purchasePrice*100)*quantity,charges=Math.round(fees*100);
  return {gross:gross/100,cost:cost/100,net:(gross-charges)/100,profit:(gross-cost-charges)/100};
}
