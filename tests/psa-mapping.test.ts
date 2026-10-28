import test from 'node:test';
import assert from 'node:assert/strict';
import {metadataFor} from '../src/lib/product-metadata';
test('automatic PSA uses the exact linked Charizard 199 printing and leaves unknown cards unmapped',()=>{
  const card=metadataFor(733794);
  assert.equal(card.cardNumber,'199');
  assert.equal(card.setName,'151');
  assert.equal(card.tcgplayerId,517045);
  assert.equal(metadataFor(-1).tcgplayerId,undefined);
});
