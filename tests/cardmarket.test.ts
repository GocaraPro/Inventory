import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeCatalog, normalizeDate } from '../src/lib/cardmarket';
const singles={version:1,createdAt:'2026-10-26',products:[{idProduct:1,name:'Charizard',categoryName:'Pokémon Single',idExpansion:1}]};
const sealed={...singles,products:[{idProduct:2,name:'151 ETB',categoryName:'Pokémon Elite Trainer Box',idExpansion:2}]};
test('joins prices by product id, preserves missing prices, and normalizes timezone',()=>{
  const result=mergeCatalog(singles,sealed,{version:1,createdAt:'2026-10-27T02:45:41+0100',priceGuides:[{idProduct:1,trend:12,'trend-holo':null}]});
  assert.equal(result[0].trend,12);assert.equal(result[0].holoTrend,null);assert.equal(result[1].trend,null);assert.equal(result[1].kind,'sealed');
  assert.equal(result[0].priceDate,'2026-10-27T01:45:41.000Z');
});
test('unsupported versions and empty feeds cannot overwrite the last good import',()=>{
  assert.throws(()=>mergeCatalog({...singles,version:2},sealed,{}));
  assert.throws(()=>mergeCatalog(singles,sealed,{version:1,createdAt:'2026-10-27',priceGuides:[]}));
  assert.throws(()=>normalizeDate('broken'));
});
