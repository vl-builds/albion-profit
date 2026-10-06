const {test} = require('node:test');
const assert = require('node:assert/strict');
const {evaluate, key} = require('../static/cargo-model.js');
const item = {quantity:2, estimatedCost:1000, confirmedCost:null, bmPrice:1500, weight:3.4};

test('confirmed purchase replaces estimate in totals and price-drop simulations', () => {
  const result = evaluate([{...item, confirmedCost:1200}], false, 100000, 50);
  assert.equal(result.capital, 2400);
  assert.equal(result.weight, 6.8);
  assert.equal(result.unconfirmed, 0);
  assert.equal(result.rows[0].breakEven, 1305);
  assert.deepEqual(result.scenarios.map(s => s.profit), [360, 222, 84, -192]);
});
test('clearing confirmation restores estimate and premium changes break-even', () => {
  const normal = evaluate([item], false, 100000, 50);
  const premium = evaluate([item], true, 100000, 50);
  assert.equal(normal.unconfirmed, 1);
  assert.equal(normal.capital, 2000);
  assert.equal(normal.rows[0].breakEven, 1087);
  assert.equal(premium.rows[0].breakEven, 1042);
  assert.equal(premium.scenarios[0].profit, 880);
});
test('edited quantity can exceed constraints and losses stay visible', () => {
  const result = evaluate([{...item, quantity:100, confirmedCost:2000}], false, 100000, 50);
  assert.equal(result.overBudget, true);
  assert.equal(result.overWeight, true);
  assert.equal(result.scenarios[0].profit, -62000);
});
test('unknown weight is never represented as a complete total', () => {
  assert.equal(evaluate([{...item, weight:null}], false, 100000, 50).unknownWeight, true);
});
test('empty cargo clears financial totals', () => {
  const result = evaluate([], false, 100000, 50);
  assert.equal(result.capital, 0);
  assert.equal(result.roi, 0);
  assert.ok(result.scenarios.every(s => s.profit === 0));
});
test('server and city drafts use distinct storage keys', () => {
  assert.notEqual(key('Americas', 'Lymhurst'), key('Europe', 'Lymhurst'));
  assert.notEqual(key('Americas', 'Lymhurst'), key('Americas', 'Martlock'));
});
