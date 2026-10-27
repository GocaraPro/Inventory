import { test } from 'node:test';
import assert from 'node:assert/strict';
import { totals, selectPrice, isStale } from '../src/lib/valuation';
import { demoHoldings } from '../src/lib/demo';
import { holdingInput } from '../src/lib/validation';
test('unpriced items are excluded from gain, but their cost and units remain visible',()=>{
  const items=[{...demoHoldings[0],quantity:2,purchasePrice:100,currentPrice:150},{...demoHoldings[1],quantity:3,purchasePrice:50,currentPrice:null}];
  const t=totals(items);assert.equal(t.cost,350);assert.equal(t.value,300);assert.equal(t.gain,100);assert.equal(t.gainPercent,50);assert.equal(t.unpriced,3);assert.equal(t.units,5);
});
test('graded valuation never silently falls back to raw card prices',()=>{
  assert.equal(selectPrice('graded','standard',null,100,200),null);
  assert.equal(selectPrice('graded','holo',0,100,200),0);
  assert.equal(selectPrice('card','holo',null,100,null),null);
  assert.equal(selectPrice('sealed','standard',null,100,200),100);
});
test('zero purchase price has no misleading infinite return',()=>{
  assert.equal(totals([{...demoHoldings[0],purchasePrice:0}]).gainPercent,null);
  assert.equal(totals([]).value,0);
});
test('prices expire after 48 hours; absent dates are stale',()=>{
  const now=Date.parse('2026-10-27T12:00:00Z');
  assert.equal(isStale('2026-10-27T02:00:00Z',now),false);
  assert.equal(isStale('2026-10-24T02:00:00Z',now),true);
  assert.equal(isStale(null,now),true);
});
test('holding validation rejects invalid purchases and missing grading details',()=>{
  assert.equal(holdingInput.safeParse({...demoHoldings[0],quantity:-1}).success,false);
  assert.equal(holdingInput.safeParse({...demoHoldings[0],purchasePrice:-1}).success,false);
  assert.equal(holdingInput.safeParse({...demoHoldings[0],purchaseDate:'2099-01-01'}).success,false);
  assert.equal(holdingInput.safeParse({...demoHoldings[0],kind:'graded',gradingCompany:null,grade:null}).success,false);
  assert.equal(holdingInput.safeParse({...demoHoldings[0],finish:'holo'}).success,false);
  assert.equal(holdingInput.safeParse(demoHoldings[3]).success,true);
});
