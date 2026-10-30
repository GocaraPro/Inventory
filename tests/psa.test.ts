import test from 'node:test';
import assert from 'node:assert/strict';
import {providerCard,psaQuote,psaPrintings} from '../src/lib/psa';
import {holdingInput} from '../src/lib/validation';
const card=providerCard.parse({tcgPlayerId:'123',name:'Charizard',setName:'Base Set',cardNumber:'4',prices:{primaryPrinting:'1st Edition Holofoil'},ebay:{salesByGrade:{psa10:{count:3,medianPrice:999,averagePrice:123.45,lastSaleDate:'2026-10-25T12:00:00Z'},psa9:{count:2,averagePrice:80,lastSaleDate:'2026-10-24T12:00:00Z'}},salesByPrinting:{'Unlimited Holofoil':{salesByGrade:{psa10:{count:2,averagePrice:60,lastSaleDate:'2026-10-26T12:00:00Z'}}}}}});
test('PSA keeps USD numeric value as EUR and selects exact grade and printing',()=>{
  assert.deepEqual(psaQuote(card,'10','1st Edition Holofoil'),{usd:123.45,eur:123.45,date:'2026-10-25T12:00:00.000Z',sales:3});
  assert.equal(psaQuote(card,'9','1st Edition Holofoil')?.eur,80);
  assert.equal(psaQuote(card,'10','Unlimited Holofoil')?.eur,60);
  assert.deepEqual(psaPrintings(card),['1st Edition Holofoil','Unlimited Holofoil']);
});
test('PSA never falls back to another printing, grade, raw price or undated sale',()=>{
  assert.equal(psaQuote(card,'8','1st Edition Holofoil'),null);
  assert.equal(psaQuote(card,'10','Reverse Holofoil'),null);
  assert.equal(psaQuote(card,'10',''),null);
  assert.equal(psaQuote(card,'10 OC','1st Edition Holofoil'),null);
  const medianOnly=providerCard.parse({...card,ebay:{salesByGrade:{psa10:{count:10,medianPrice:1450,lastSaleDate:'2026-10-25'}}}});
  assert.equal(psaQuote(medianOnly,'10','1st Edition Holofoil'),null);
  const undated=structuredClone(card);delete undated.ebay!.salesByGrade!.psa10.lastSaleDate;
  assert.equal(psaQuote(undated,'10','1st Edition Holofoil'),null);
  assert.equal(psaQuote(providerCard.parse({tcgPlayerId:'1',name:'Card',setName:'Set',cardNumber:'1',prices:{primaryPrinting:'Normal',market:500}}),'10','Normal'),null);
});
test('provider schema rejects invalid prices and strips unrelated fields',()=>{
  assert.equal(providerCard.safeParse({...card,ebay:{salesByGrade:{psa10:{averagePrice:-1}}}}).success,false);
  assert.equal('secret' in providerCard.parse({...card,secret:'should-not-store'}),false);
});
test('automatic PSA requires explicit provider link and PSA grader',()=>{
  const base={productId:1,kind:'graded',finish:'standard',condition:'NM',quantity:1,purchasePrice:10,purchaseDate:'2026-01-01',gradingCompany:'PSA',grade:'10',certificate:null,manualPrice:null,psaEnabled:true};
  assert.equal(holdingInput.safeParse(base).success,false);
  assert.equal(holdingInput.safeParse({...base,psaTcgplayerId:123,psaPrinting:'Holofoil'}).success,true);
  assert.equal(holdingInput.safeParse({...base,psaTcgplayerId:123,psaPrinting:'Holofoil',gradingCompany:'BGS'}).success,false);
});
