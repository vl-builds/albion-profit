const {test}=require('node:test');
const assert=require('node:assert/strict');
const m=require('../static/island-model.js');
const row={id:'a',server:'Americas',plot:'Canteiro 1',plants:9,planted:1000,ready:2000,watered:true,harvested:false,yield:null,seeds:null,cost:100,revenue:200};
test('readiness boundary and harvested state',()=>{assert.equal(m.state(row,1999),'growing');assert.equal(m.state(row,2000),'ready');assert.equal(m.state({...row,harvested:true},3000),'harvested');});
test('reject corrupt stores and duplicate identities',()=>{assert.throws(()=>m.parse('{}'));assert.throws(()=>m.parse(JSON.stringify([row,row])));assert.throws(()=>m.parse(JSON.stringify([{...row,ready:999}])));assert.throws(()=>m.parse(JSON.stringify([{...row,plants:1.5}])));assert.deepEqual(m.parse(null),[]);assert.deepEqual(m.parse(JSON.stringify([row])),[row]);});
test('balance excludes unsold, incomplete and growing cycles',()=>{assert.equal(m.balance([row,{...row,harvested:true},{...row,harvested:true,revenue:null}]),100);});
