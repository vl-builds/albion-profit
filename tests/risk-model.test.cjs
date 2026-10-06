const {test} = require('node:test');
const assert = require('node:assert/strict');
const {evaluate} = require('../static/risk-model.js');
const now = 1800000000000;
const item = {city_price:10997, bm_price:17696, sourceObserved:now, bmObserved:now};
test('both item-specific observations must be at most two minutes old', () => {
  assert.equal(evaluate(item, false, 10, now+120000).eligible, true);
  assert.equal(evaluate(item, false, 10, now+120001).recent, false);
  assert.equal(evaluate({...item, bmObserved:now-3600000}, false, 10, now).eligible, false);
  assert.equal(evaluate({...item, sourceObserved:NaN}, false, 10, now).recent, false);
  assert.equal(evaluate({...item, sourceObserved:now+1}, false, 10, now).recent, false);
});
test('break-even and stress use net sale proceeds, with premium and actual purchase', () => {
  const risk = evaluate(item, false, 10, now);
  assert.equal(risk.breakEven, 11954);
  assert.ok(Math.abs(risk.stressedProfit - 3655.288) < 0.001);
  assert.ok(risk.dropRoom > 32 && risk.dropRoom < 33);
  assert.equal(evaluate({...item, confirmedCost:12000}, true, 10, now).breakEven, 12500);
});
test('fresh but unprofitable after the simulated fall is not highlighted', () => {
  const risk = evaluate({...item, bm_price:12500}, false, 10, now);
  assert.equal(risk.recent, true);
  assert.equal(risk.eligible, false);
  assert.ok(risk.stressedProfit < 0);
  assert.equal(evaluate({...item, bm_price:9480}, false, 10, now).eligible, false);
  assert.equal(evaluate(item, false, NaN, now).eligible, false);
});
