const {test} = require('node:test');
const assert = require('node:assert/strict');
const {validate,summary,analytics} = require('../static/trade-model.js');
const boughtAt = Date.now()-86400000;
const base = {id:'test',server:'Americas',city:'Thetford',item:'Armadura T5.0 Normal',quantity:4,
  purchase:44000,fees:1798,mode:'order',boughtAt,listedAt:boughtAt+3600000,
  soldAt:boughtAt+7200000,received:66166};
test('uses actual net receipts without deducting sales tax twice',()=>{
  const trade = validate(base);
  assert.equal(trade.profit,20368);
  assert.equal(trade.elapsedHours,2); assert.equal(trade.orderHours,1);
  assert.equal(validate({...base,fees:3295}).profit,18871);
});
test('pending lots never count as realized profit',()=>{
  const pending = {...base,id:'pending',soldAt:null,received:null};
  assert.equal(validate(pending).profit,null);
  const result = summary([pending,base]);
  assert.equal(result.profit,20368); assert.equal(result.pending,1); assert.equal(result.sold,1);
});
test('invalid chronology and unpaired sale fields are rejected',()=>{
  for(const change of [{soldAt:boughtAt-1},{listedAt:boughtAt-1},{soldAt:Date.now()+86400000},
    {soldAt:null},{received:null},{purchase:NaN},{quantity:0},{fees:-1}])
    assert.throws(()=>validate({...base,...change}));
});
test('archived trades are excluded and median wait uses only timed orders',()=>{
  const rows = [base,{...base,id:'other',soldAt:boughtAt+10800000},
    {...base,id:'instant',mode:'instant'}, {...base,id:'archived',archived:true}];
  const result = summary(rows);
  assert.equal(result.sold,3); assert.equal(result.timedOrders,2);
  assert.equal(result.medianOrderHours,1.5);
  assert.equal(summary([{...base,listedAt:null}]).medianOrderHours,null);
});

test('analytics separates servers, archives and pending capital from settled results',()=>{
  const pending={...base,id:'pending',soldAt:null,received:null};
  const a=analytics([base,pending,{...base,id:'eu',server:'Europe'},{...base,id:'archive',archived:true}]);
  assert.equal(a.sold,1);assert.equal(a.pending,1);assert.equal(a.pendingCapital,45798);
  assert.equal(a.profit,20368);assert.equal(a.received,66166);assert.equal(a.fees,1798);
  assert.equal(a.roi,20368/44000*100);assert.equal(a.winRate,100);
});

test('daily equity is chronological, aggregates same-day sales and includes losses',()=>{
  const now=Date.now(),day=86400000;
  const row=(id,soldAt,received,item='Item T4.0 Normal')=>({...base,id,item,boughtAt:now-10*day,listedAt:null,soldAt,received,purchase:100,fees:10});
  const a=analytics([row('loss',now-day,0),row('win2',now-3*day+1000,150),row('win1',now-3*day,200)]);
  assert.deepEqual(a.series.map(p=>[p.profit,p.cumulative,p.lots]),[[130,130,2],[-110,20,1]]);
  assert.equal(a.ranking.length,1);assert.equal(a.ranking[0].profit,20);
  assert.equal(a.ranking[0].quantity,12);assert.equal(a.losses,1);assert.equal(a.wins,2);
});

test('periods use sale dates and weighted ROI, with all open capital retained',()=>{
  const now=Date.now(),day=86400000;
  const older={...base,id:'older',boughtAt:now-40*day,listedAt:null,soldAt:now-35*day};
  const small={...base,id:'small',purchase:100,fees:0,received:200};
  const a=analytics([older,base,small,{...older,id:'pending',soldAt:null,received:null}],{days:7,now});
  assert.equal(a.sold,2);assert.equal(a.pending,1);
  assert.equal(a.roi,(20368+100)/(44000+100)*100);
  assert.equal(a.series.at(-1).cumulative,a.profit);
  const empty=analytics([older],{days:7,now});
  assert.equal(empty.roi,null);assert.equal(empty.winRate,null);assert.deepEqual(empty.series,[]);
});

test('ranking groups identical descriptions but keeps qualities distinct and excludes archived data',()=>{
  const a=analytics([base,{...base,id:'same',item:' armadura t5.0 normal '},
    {...base,id:'good',item:'Armadura T5.0 Bom',received:100000}]);
  assert.equal(a.ranking.length,2);assert.equal(a.ranking[0].item,'Armadura T5.0 Bom');
  assert.equal(a.ranking[1].lots,2);assert.equal(a.ranking[1].profit,40736);
});

test('estimated costs remain labeled and unknown purchase dates do not invent holding times',()=>{
  const row=validate({...base,boughtAt:null,listedAt:null,estimatedCosts:true});
  assert.equal(row.profit,20368);assert.equal(row.elapsedHours,null);assert.equal(row.orderHours,null);
  assert.equal(analytics([row]).estimated,1);
  assert.equal(analytics([{...row,estimatedCosts:false}]).estimated,0);
  assert.throws(()=>validate({...row,estimatedCosts:'true'}));
});

test('initial import is idempotent, preserves edits and archives, and rejects malformed batches atomically',()=>{
  const {mergeImported}=require('../static/trade-model.js');
  const edited={...base,purchase:43000,archived:true};
  assert.deepEqual(mergeImported([edited],[base]),[edited]);
  assert.equal(mergeImported([base],[{...base,id:'different-id'}]).length,1);
  const merged=mergeImported([],[base]);
  assert.equal(mergeImported(merged,[base]).length,1);
  assert.throws(()=>mergeImported([base],[{...base,id:'new',purchase:-1}]));
  assert.equal(base.purchase,44000);
});

test('transport losses realize the full cargo cost as a loss without pretending a sale occurred',()=>{
  const lost=validate({...base,id:'lost',outcome:'lost',received:0,fees:0,purchase:203000});
  assert.equal(lost.profit,-203000);assert.equal(lost.received,0);assert.equal(lost.orderHours,null);
  const a=analytics([lost]);
  assert.equal(a.sold,0);assert.equal(a.lost,1);assert.equal(a.closed,1);
  assert.equal(a.profit,-203000);assert.equal(a.winRate,0);assert.equal(a.series[0].cumulative,-203000);
  assert.throws(()=>validate({...lost,received:1}));
});
