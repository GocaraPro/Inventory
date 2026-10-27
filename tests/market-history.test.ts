import test from 'node:test';
import assert from 'node:assert/strict';
import {priceChange,rankMovers,demoPriceHistory,type Mover} from '../src/lib/market-history';
import {metadataFor} from '../src/lib/product-metadata';
test('movements exclude missing prices and zero baselines, preserve a real fall to zero',()=>{
  assert.equal(priceChange(null,20),null);
  assert.equal(priceChange(0,20),null);
  assert.equal(priceChange(10,Infinity),null);
  assert.deepEqual(priceChange(10,0),{change:-10,percent:-100});
  assert.deepEqual(priceChange(100,110),{change:10,percent:10});
});
test('rankings return five in each direction by percent, exclude flat prices',()=>{
  const items=Array.from({length:15},(_,id)=>({id,change:id-7,percent:id-7} as Mover));
  const ranked=rankMovers(items);
  assert.deepEqual(ranked.gainers.map(p=>p.id),[14,13,12,11,10]);
  assert.deepEqual(ranked.losers.map(p=>p.id),[0,1,2,3,4]);
});
test('demo uses selected finish and does not invent missing holo data',()=>{
  const p={id:42,trend:100,holoTrend:null} as Mover;
  assert.equal(demoPriceHistory(p,'standard').at(-1)?.price,100);
  assert.equal(demoPriceHistory(p,'standard').length,90);
  assert.deepEqual(demoPriceHistory(p,'holo'),[]);
});
test('sealed images map ordinary boxes independently from variants',()=>{
  assert.equal(metadataFor(719691).imageUrl,'https://tcgplayer-cdn.tcgplayer.com/product/503313_200w.jpg');
  assert.equal(metadataFor(784949).imageUrl,'https://tcgplayer-cdn.tcgplayer.com/product/565606_200w.jpg');
  assert.equal(metadataFor(568765).imageUrl,'https://tcgplayer-cdn.tcgplayer.com/product/242436_200w.jpg');
  assert.notEqual(metadataFor(574435).imageUrl,metadataFor(568765).imageUrl);
});
