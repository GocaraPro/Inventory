import type { Holding, Snapshot } from "./types";
// Illustrative examples only. These are never inserted into the production database.
export const demoHoldings: Holding[] = [
  {id:"demo-1",productId:719691,name:"151 Elite Trainer Box",category:"Pokémon Elite Trainer Box",kind:"sealed",quantity:3,purchasePrice:85,currentPrice:125,expansionId:5402},
  {id:"demo-2",productId:784949,name:"Surging Sparks Booster Box",category:"Pokémon Display",kind:"sealed",quantity:4,purchasePrice:140,currentPrice:185,expansionId:5879},
  {id:"demo-3",productId:733794,name:"Charizard ex",category:"Pokémon Single",kind:"card",quantity:1,purchasePrice:120,currentPrice:165,expansionId:5402},
  {id:"demo-4",productId:512650,name:"Pikachu VMAX",category:"Pokémon Single",kind:"graded",quantity:1,purchasePrice:380,currentPrice:450,manualPrice:450,gradingCompany:"PSA",grade:"10",certificate:"Example",expansionId:3358},
  {id:"demo-5",productId:568765,name:"Evolving Skies Booster Box",category:"Pokémon Display",kind:"sealed",quantity:2,purchasePrice:320,currentPrice:780,expansionId:4328},
  {id:"demo-6",productId:566248,name:"Umbreon VMAX",category:"Pokémon Single",kind:"card",quantity:1,purchasePrice:650,currentPrice:920,expansionId:3855}
].map(i=>({finish:"standard",condition:"NM",purchaseDate:"2026-04-12",notes:"Illustrative demo item — not your real inventory.",gradingCompany:null,grade:null,certificate:null,manualPrice:null,priceDate:new Date().toISOString(),...i} as Holding));
export const demoSnapshots: Snapshot[] = Array.from({length:30},(_,i)=>{
  const date=new Date();date.setDate(date.getDate()-29+i);
  return {date:date.toISOString().slice(0,10),value:3200+i*21+(Math.sin(i*1.1)*65)+(i>18?350:0),cost:2605,unpriced:0};
});
