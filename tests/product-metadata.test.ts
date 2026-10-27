import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enrich,metadataFor,matchingMetadataIds } from '../src/lib/product-metadata';
import { matchesSearch,productTitle,searchText,safeImageUrl } from '../src/lib/product-display';
test('Charizard 199 is joined to the exact 151 printing',()=>{
  const item=enrich({id:733794,expansionId:5402,name:'Charizard ex [Brave Wing | Explosive Vortex]'});
  assert.equal(item.cardNumber,'199');assert.equal(item.setTotal,165);assert.equal(item.setName,'151');
  assert.equal(productTitle(item),'Charizard ex · 199/165');
  for(const q of ['Charizard 199','Charizard 199 151','151 charizard 199/165','CHARIZARD 0199'])assert.equal(matchesSearch(searchText(item),q),true,q);
  assert.equal(matchesSearch(searchText(item),'Charizard 1990'),false);
  assert.ok(matchingMetadataIds('charizard 199 151').includes(733794));
  assert.equal(item.imageUrl,'https://assets.tcgdex.net/en/sv/sv03.5/199/high.webp');
});
test('enrichment preserves holding identity and user photo',()=>{
  const h=enrich({id:'purchase-1',productId:733794,expansionId:5402,customImageUrl:'https://example.com/photo.jpg'});
  assert.equal(h.id,'purchase-1');assert.equal(h.customImageUrl,'https://example.com/photo.jpg');
  assert.equal(metadataFor(999999999).imageUrl,undefined);
});
test('image URLs reject active content, credentials, and oversized uploads',()=>{
  assert.equal(safeImageUrl('javascript:alert(1)'),null);
  assert.equal(safeImageUrl('data:image/svg+xml;base64,AAAA'),null);
  assert.equal(safeImageUrl('https://user:pass@example.com/a.jpg'),null);
  assert.equal(safeImageUrl('http://example.com/a.jpg'),null);
  assert.equal(safeImageUrl('data:image/png;base64,'+'A'.repeat(600001)),null);
  assert.equal(safeImageUrl('data:image/png;base64,AAAA'),'data:image/png;base64,AAAA');
});
