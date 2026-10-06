const {test} = require('node:test');
const assert = require('node:assert/strict');
const {Tracker, identity, loadFavorites} = require('../static/opportunity-model.js');
const now = 1800000000000;
const item = (changes = {}) => ({item_id:'T4_BAG', item_name:'Bolsa', quality:1,
  city_price:1000, bm_price:1500, profit:380, sourceObserved:now, bmObserved:now,
  city_price_source:'api', bm_price_source:'api', ...changes});

test('loss stays in recent history with actual price change reason', () => {
  const tracker = new Tracker();
  tracker.update([item()], now, 60, true);
  tracker.update([item({bm_price:900, profit:-172})], now+1000, 60, true);
  const entry = tracker.recent.get(identity(item()));
  assert.match(entry.reason, /oferta BM caiu/);
  assert.equal(entry.item.profit, -172);
  tracker.update([item({bm_price:900, profit:-172})], now+2000, 60, true);
  assert.equal(tracker.recent.get(identity(item())).reason, entry.reason);
  assert.equal(tracker.recent.get(identity(item())).leftAt, now+1000);
});

test('unexplained absence never claims the item was sold', () => {
  const tracker = new Tracker();
  tracker.update([item()], now, 60, true);
  tracker.update([], now+1000, 60, true);
  assert.equal(tracker.items.length, 0);
  assert.match(tracker.recent.get(identity(item())).reason, /Venda não confirmada/);
  tracker.update([], now+2000, 60, true);
  assert.equal(tracker.recent.get(identity(item())).leftAt, now+1000);
});

test('returning profitable item leaves recent history', () => {
  const tracker = new Tracker();
  tracker.update([item()], now, 60, true);
  tracker.update([], now+1000, 60, true);
  tracker.update([item()], now+2000, 60, true);
  assert.equal(tracker.recent.size, 0);
  assert.equal(tracker.items.length, 1);
});

test('time passing moves stale data to history without refreshing observation time', () => {
  const tracker = new Tracker();
  tracker.update([item()], now, 1, true);
  tracker.expire(now+60001, 1, true);
  assert.equal(tracker.items.length, 0);
  const entry = tracker.recent.get(identity(item()));
  assert.match(entry.reason, /compra e BM acima da idade/);
  assert.equal(entry.item.sourceObserved, now);
});

test('live window expires even with a longer age setting', () => {
  const tracker = new Tracker();
  tracker.update([item({bm_price_source:'live'})], now, 60, true);
  tracker.expire(now+600000, 60, true);
  assert.equal(tracker.items.length, 0);
  assert.match(tracker.recent.get(identity(item())).reason, /janela de 10 minutos/);
});

test('history is bounded and removed after an hour', () => {
  const tracker = new Tracker();
  const many = Array.from({length:250}, (_, index) => item({item_id:`T4_TEST_${index}`}));
  tracker.update(many, now, 60, true);
  tracker.update([], now+1000, 60, true);
  assert.equal(tracker.recent.size, 200);
  tracker.expire(now+3601000, 60, true);
  assert.equal(tracker.recent.size, 0);
});

test('new scope has no old prices or false departures', () => {
  let tracker = new Tracker();
  tracker.update([item()], now, 60, true);
  tracker = new Tracker();
  tracker.update([], now, 60, true);
  assert.equal(tracker.items.length, 0);
  assert.equal(tracker.recent.size, 0);
});

test('favorites round-trip with original observation dates and separate qualities', () => {
  const favorites = loadFavorites(JSON.parse(JSON.stringify([item(), item({quality:2})])));
  assert.equal(favorites.size, 2);
  assert.equal(favorites.get('T4_BAG:1').sourceObserved, now);
  assert.throws(() => loadFavorites([{...item(), quality:8}]));
  assert.throws(() => loadFavorites([{...item(), city_price:null}]));
  assert.throws(() => loadFavorites({}));
});


test('same item in different cities keeps independent history and favorites', () => {
  const tracker = new Tracker();
  const a = item({source_city:'Lymhurst'}), b = item({source_city:'Martlock'});
  tracker.update([a,b], now, 60, true);
  assert.equal(tracker.items.length, 2);
  tracker.update([b], now+1000, 60, true);
  assert.equal(tracker.recent.has(identity(a)), true);
  assert.equal(tracker.recent.has(identity(b)), false);
  assert.equal(loadFavorites([a,b]).size, 2);
});
