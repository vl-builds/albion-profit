const test = require('node:test');
const assert = require('node:assert/strict');
const sort = require('../static/table-sort.js');
const rules = [{key:'margin_pct',desc:true},{key:'profit',desc:true}];
const rows = [
  {id:'highest-roi',margin_pct:90,profit:100},
  {id:'balanced',margin_pct:80,profit:400},
  {id:'middle',margin_pct:70,profit:300},
  {id:'highest-profit',margin_pct:60,profit:500},
  {id:'low',margin_pct:50,profit:200}
];
test('combined ranking rewards both metrics without requiring equal ROI', () => {
  assert.equal(sort.rank(rows,rules)[0].id,'balanced');
  assert.equal(sort.rank(rows,[rules[0]])[0].id,'highest-roi');
  assert.equal(sort.rank(rows,[])[0].id,'highest-profit');
  assert.deepEqual(sort.rank(rows,rules),sort.rank(rows,[...rules].reverse()));
  assert.equal(rows[0].id,'highest-roi');
});
test('units and extreme magnitudes do not dominate rank', () => {
  const scaled=rows.map(row=>({...row,profit:row.profit*1000000}));
  assert.deepEqual(sort.rank(scaled,rules).map(row=>row.id),sort.rank(rows,rules).map(row=>row.id));
});
test('missing data stay last and equal values receive equal rank', () => {
  const data=[{id:1,margin_pct:20,profit:10},{id:2,margin_pct:20,profit:10},{id:3,margin_pct:999,profit:null}];
  assert.deepEqual(sort.rank(data,rules).map(row=>row.id),[1,2,3]);
  assert.deepEqual(sort.rank([],rules),[]);
  assert.equal(sort.rank([data[0]],rules)[0],data[0]);
  const ascending=rules.map(rule=>({...rule,desc:false}));
  assert.equal(sort.rank(data,ascending).at(-1).id,3);
});
test('directions cycle independently and removing restores the remaining criterion', () => {
  let selected=sort.toggle([], 'margin_pct');
  selected=sort.toggle(selected,'profit');
  assert.deepEqual(selected,rules);
  selected=sort.toggle(selected,'profit');
  assert.equal(sort.rank(rows,selected)[0].id,'highest-roi');
  selected=sort.toggle(selected,'profit');
  assert.deepEqual(selected,[rules[0]]);
});
test('text columns sort independently and numeric selection leaves text mode', () => {
  const selected=sort.toggle(rules,'item_name');
  assert.deepEqual(selected,[{key:'item_name',desc:true}]);
  assert.deepEqual(sort.toggle(selected,'profit'),[rules[1]]);
});
