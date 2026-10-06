const {test} = require('node:test');
const assert = require('node:assert/strict');
const {Alerts} = require('../static/alert-model.js');
const now = 1800000000000;
const limits = {profit:5000, roi:20, age:5};
const item = (changes = {}) => ({item_id:'T4_BAG', quality:1, profit:5000, city_price:10000, bm_price:20000,
  margin_pct:20, sourceObserved:now, bmObserved:now, ...changes});
test('requires profit, ROI and both fresh prices together, including exact boundaries', () => {
  for (const changes of [{profit:4999}, {margin_pct:19}, {sourceObserved:now-120001},
    {bmObserved:now-120001}, {profit:NaN}, {bmObserved:now+1}])
    assert.equal(new Alerts().detect([item(changes)], 'A', limits, now).length, 0);
  assert.equal(new Alerts().detect([item({bmObserved:now-120000})], 'A', limits, now).length, 1);
});
test('suppresses repeated snapshots and only repeats after cooldown with improved new data', () => {
  const alerts = new Alerts();
  assert.equal(alerts.detect([item()], 'A', limits, now).length, 1);
  assert.equal(alerts.detect([item({profit:6000})], 'A', limits, now+1).length, 0);
  const later = now+900000;
  const fresh = {sourceObserved:later, bmObserved:later};
  assert.equal(alerts.detect([item({...fresh, profit:5999})], 'A', limits, later).length, 0);
  assert.equal(alerts.detect([item({...fresh, profit:6000})], 'A', limits, later).length, 1);
  assert.equal(alerts.detect([item({...fresh, profit:6000})], 'A', limits, later).length, 0);
});
test('separates markets and quality; reports highest profit first', () => {
  const alerts = new Alerts();
  alerts.detect([item()], 'A', limits, now);
  assert.equal(alerts.detect([item()], 'B', limits, now).length, 1);
  assert.equal(alerts.detect([item({quality:2})], 'A', limits, now).length, 1);
  assert.deepEqual(new Alerts().detect([item(), item({quality:2, profit:7000})], 'A', limits, now)
    .map(i => i.profit), [7000,5000]);
});
test('invalid thresholds cannot issue alerts', () => {
  assert.equal(new Alerts().detect([item()], 'A', {...limits, age:0}, now).length, 0);
  assert.equal(new Alerts().detect([item()], 'A', {...limits, profit:NaN}, now).length, 0);
});

test('raising alert age cannot bypass the two-minute rule or simulated loss filter', () => {
  assert.equal(new Alerts().detect([item({bmObserved:now-180000})], 'A', {...limits, age:60}, now).length, 0);
  assert.equal(new Alerts().detect([item({city_price:10000, bm_price:11000})], 'A', limits, now).length, 0);
});


test('same item in different cities triggers independent alerts', () => {
  const alerts = new Alerts();
  const rows = ['Lymhurst','Martlock'].map(source_city => item({source_city}));
  assert.equal(alerts.detect(rows, 'Americas', limits, now).length, 2);
  assert.equal(alerts.detect(rows, 'Americas', limits, now).length, 0);
});

test('liquidity-required alerts reject unknown and insufficient volume before deduplication',()=>{
  const alerts=new Alerts(), strict={...limits,requireLiquidity:true};
  assert.equal(alerts.detect([item()], 'A', strict, now).length,0);
  assert.equal(alerts.detect([item({liquidity:{liquid:false}})], 'A', strict, now).length,0);
  assert.equal(alerts.detect([item({liquidity:{liquid:true}})], 'A', strict, now).length,1);
  assert.equal(alerts.detect([item({liquidity:{liquid:true}})], 'A', strict, now).length,0);
});
