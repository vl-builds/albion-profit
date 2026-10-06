const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('static/design-ui.js','utf8');
function harness() {
  const now = Date.parse('2026-09-20T00:00:00Z');
  const fields = {server:{value:'Americas'},maxAge:{value:'60'},livePrices:{checked:true},
    cargoCity:{value:'all'},family:{value:''},tier:{value:''},enchantment:{value:''},search:{value:''},
    showReferences:{checked:true},profitableOnly:{checked:true},autoRefresh:{checked:true},prioritizeLiquidity:{checked:false}};
  const ctx=vm.createContext({URLSearchParams,CargoModel:require('../static/cargo-model.js'),Date:class extends Date {static now(){return now;}},console,
    $:id=>fields[id],fmt:String,esc:String,liquidityFor:()=>null,passesLiquidity:()=>true,
    identity:item=>`${item.item_id}:${item.quality}:${item.source_city}`,
    riskFor:item=>({recent:[item.sourceObserved,item.bmObserved].every(t=>Number.isFinite(t)&&now-t<=120000&&t<=now)}),
    OpportunityModel:{staleReason:()=>null},cancelPlan:()=>{},saveCargo:()=>{},renderCargo:()=>{},renderTable:()=>{},
    setTimeout:()=>0,clearTimeout:()=>{}});
  vm.runInContext('let cargo=[],currentData=[];\n'+source,ctx);
  vm.runInContext('showNotice=()=>{};',ctx);
  return {ctx,now,fields,run:code=>vm.runInContext(code,ctx)};
}
const item=(now,extra={})=>({item_id:'T5_ARMOR_PLATE_SET1',quality:1,source_city:'Thetford',item_name:'Armadura',city_price:10800,bm_price:17980,sourceObserved:now-30000,bmObserved:now-30000,weight:5.4,...extra});
test('multiselection excludes unchecked tiers and enchantments before observations are used',()=>{
  const {ctx,run,now}=harness(); const normal=item(now);
  assert.equal(ctx.designMatches(normal),true);
  assert.equal(ctx.designMatches({...normal,item_id:'T5_ARMOR_PLATE_SET1@1'}),true);
  run('selectedEnchants.delete(1);');
  assert.equal(ctx.designMatches({...normal,item_id:'T5_ARMOR_PLATE_SET1@1'}),false);
  run('selectedEnchants.add(1); selectedTiers.delete(5);');
  assert.equal(ctx.designMatches(normal),false);
  assert.equal(ctx.designMatches({...normal,item_id:'T4_ARMOR_PLATE_SET1@1'}),true);
});
test('charts wait for distinct observed timestamps and reject duplicate or older snapshots',()=>{
  const {ctx,run,now}=harness(); const first=item(now);
  ctx.recordPriceObservations([first]);ctx.recordPriceObservations([first,{...first,bmObserved:first.bmObserved-1000,bm_price:9000}]);
  assert.match(ctx.sparkline(first,true),/Aguardando novas observações/);
  assert.equal(run('sessionPrices.values().next().value.points.length'),1);
  ctx.recordPriceObservations([{...first,bmObserved:now-10000,bm_price:18100}]);
  assert.match(ctx.sparkline(first,true),/2 observações/);
  assert.equal(ctx.priceFlash(first),'flash-up');
});
test('chart history remains isolated by city and server, and limits memory',()=>{
  const {ctx,run,now,fields}=harness();const first=item(now);
  ctx.recordPriceObservations([first,{...first,source_city:'Lymhurst'}]);
  fields.server.value='Europe';ctx.recordPriceObservations([first]);
  assert.equal(run('sessionPrices.size'),3);
  for(let n=0;n<60;n++)ctx.recordPriceObservations([{...first,bmObserved:now-10000+n*100,bm_price:18000+n}]);
  assert.equal(run('[...sessionPrices.values()].at(-1).points.length'),40);
});
test('adding another unit preserves the saved purchase and BM prices of the existing cargo',()=>{
  const {ctx,run,now}=harness();ctx.input=item(now);
  run('currentData=[input];cargo=[{...input,quantity:4,estimatedCost:10000,confirmedCost:10500,bmPrice:17700}];');
  ctx.addDesignItem('T5_ARMOR_PLATE_SET1:1:Thetford');
  assert.equal(run('cargo[0].quantity'),5);
  assert.equal(run('cargo[0].confirmedCost'),10500);
  assert.equal(run('cargo[0].bmPrice'),17700);
});
test('stale or newly excluded items cannot enter the cargo through cards, alerts or drag and drop',()=>{
  const {ctx,run,now}=harness();ctx.input=item(now,{bmObserved:now-121000});run('currentData=[input];');
  ctx.addDesignItem('T5_ARMOR_PLATE_SET1:1:Thetford');assert.equal(run('cargo.length'),0);
  ctx.input=item(now);run('currentData=[input];selectedTiers.delete(5);');
  ctx.addDesignItem('T5_ARMOR_PLATE_SET1:1:Thetford');assert.equal(run('cargo.length'),0);
});

test('mixed-tier suggestions use only selected groups and carry forward precise remaining limits',async()=>{
  const {ctx,run}=harness();run('selectedTiers.clear();selectedTiers.add(4);selectedTiers.add(5);');
  const queries=[];
  ctx.fetch=async url=>{const query=new URL(url,'http://fixture').searchParams;queries.push(query);
    return {ok:true,json:async()=>({status:'ok',items:[{quantity:1,unit_cost:queries.length===1?400:500,unit_weight:queries.length===1?1.234:.7,bm_unit_price:1000}]})};};
  const result=await ctx.fetchDesignCargoPlan(new URLSearchParams({budget:'1000',available_weight:'2.001',premium:'false',city:'Thetford',recent_only:'true',stress_drop_pct:'10'}));
  assert.equal(result.items.length,2);
  assert.deepEqual(queries.map(q=>q.get('tier')),['4','5']);
  assert.deepEqual(queries.map(q=>q.get('enchantment')),[null,null]);
  assert.equal(queries[1].get('budget'),'600');assert.equal(queries[1].get('available_weight'),'0.767');
  assert.equal(queries[1].get('recent_only'),'true');assert.equal(queries[1].get('stress_drop_pct'),'10');
});
test('all-tier selection retains one optimizer call and stops when the budget is spent',async()=>{
  const {ctx,run}=harness();let calls=0;
  ctx.fetch=async url=>{calls++;assert.equal(new URL(url,'http://fixture').searchParams.has('tier'),false);
    return {ok:true,json:async()=>({status:'ok',items:[{quantity:1,unit_cost:1000,unit_weight:1,bm_unit_price:1400}]})};};
  await ctx.fetchDesignCargoPlan(new URLSearchParams({budget:'1000',available_weight:'10'}));assert.equal(calls,1);
  run('selectedTiers.clear();selectedTiers.add(4);selectedTiers.add(5);');calls=0;
  ctx.fetch=async()=>{calls++;return {ok:true,json:async()=>({status:'ok',items:[{quantity:1,unit_cost:1000,unit_weight:1,bm_unit_price:1400}]})};};
  await ctx.fetchDesignCargoPlan(new URLSearchParams({budget:'1000',available_weight:'10'}));assert.equal(calls,1);
});
test('a failed group rejects the suggestion instead of returning a misleading partial plan',async()=>{
  const {ctx,run}=harness();run('selectedTiers.clear();selectedTiers.add(4);selectedTiers.add(5);');let calls=0;
  ctx.fetch=async()=>{calls++;return calls===2?{ok:false}:{ok:true,json:async()=>({status:'ok',items:[{quantity:1,unit_cost:100,unit_weight:1,bm_unit_price:200}]})};};
  await assert.rejects(ctx.fetchDesignCargoPlan(new URLSearchParams({budget:'1000',available_weight:'10'})),/Cargo plan unavailable/);
});

test('scanner restores only the server and clears restrictive saved and browser-restored filters',()=>{
  const {ctx,fields}=harness();let stored=null;
  fields.cargoCity={value:'Thetford'};fields.showReferences={checked:false};fields.server.value='Europe';
  ctx.localStorage={getItem:()=>stored,setItem:(_,value)=>{stored=value;}};
  ctx.saveScannerView();fields.cargoCity.value='all';fields.showReferences.checked=true;fields.server.value='Americas';
  stored=JSON.stringify({...JSON.parse(stored),city:'Thetford',references:false});
  for(const id of ['family','tier','enchantment','search']) fields[id].value='restricted';
  fields.profitableOnly.checked=false;fields.autoRefresh.checked=false;
  ctx.restoreScannerView();
  assert.equal(fields.cargoCity.value,'all');assert.equal(fields.server.value,'Europe');assert.equal(fields.showReferences.checked,true);
  for(const id of ['family','tier','enchantment','search']) assert.equal(fields[id].value,'');
  assert.equal(fields.maxAge.value,'1440');assert.equal(fields.profitableOnly.checked,true);assert.equal(fields.autoRefresh.checked,true);
  for(const tier of [4,5,6,7,8]) for(const enchant of [0,1,2,3,4]) for(const quality of [1,2,3,4,5])
    assert.equal(ctx.designMatches({item_id:`T${tier}_MAIN_SWORD@${enchant}`,quality}),true);
});
test('invalid saved preferences cannot hide the default results or break the scanner',()=>{
  const {ctx,fields}=harness();fields.cargoCity={value:'all'};fields.showReferences={checked:true};
  ctx.localStorage={getItem:()=>'{broken'};assert.doesNotThrow(()=>ctx.restoreScannerView());
  ctx.localStorage={getItem:()=>JSON.stringify({city:'unknown',server:'unknown',references:'false'})};ctx.restoreScannerView();
  assert.equal(fields.cargoCity.value,'all');assert.equal(fields.server.value,'Americas');assert.equal(fields.showReferences.checked,true);
});
test('empty results explain whether age, profit, search or a pending request is responsible',()=>{
  const {ctx,fields,run,now}=harness();
  Object.assign(fields,{refresh:{disabled:false},status:{classList:{contains:()=>false}},search:{value:''},profitableOnly:{checked:true},showReferences:{checked:false}});
  ctx.cityName=city=>city;ctx.input=item(now,{bmObserved:now-600000,profit:500});run('currentData=[input];');
  assert.match(ctx.scannerEmptyHtml(),/data-scan-action="references"/);
  fields.showReferences.checked=true;run('currentData[0].profit=-10;');
  assert.match(ctx.scannerEmptyHtml(),/data-scan-action="losses"/);
  fields.search.value='missing item';assert.match(ctx.scannerEmptyHtml(),/data-scan-action="search"/);
  fields.refresh.disabled=true;assert.match(ctx.scannerEmptyHtml(),/Consultando os mercados/);
  fields.refresh.disabled=false;fields.search.value='';run('currentData=[];');assert.match(ctx.scannerEmptyHtml(),/Nenhum par de preços/);
});

test('round highlights show the best visible estimated profits, one city per item and quality',()=>{
  const {ctx,now}=harness();
  const rows=[item(now,{profit:200}),item(now,{source_city:'Lymhurst',profit:300}),item(now,{item_id:'T4_MAIN_SWORD',profit:100}),item(now,{item_id:'T6_HEAD_CLOTH_SET1',profit:-50}),item(now,{item_id:'T8_ARMOR_PLATE_SET1',profit:500,bmObserved:now-600000})];
  const best=ctx.bestRoundItems(rows);
  assert.deepEqual(Array.from(best,x=>x.profit),[500,300,100]);
  assert.equal(best[1].source_city,'Lymhurst');
});
test('daily history supplies labeled trends with dashed gaps until session observations are available',()=>{
  const {ctx,now}=harness();const first=item(now);
  ctx.liquidityFor=()=>({price_history:[{date:'2026-09-13',avg_price:100,item_count:3},{date:'2026-09-15',avg_price:120,item_count:4}]});
  assert.match(ctx.sparkline(first),/data-trend-source="daily"/);
  assert.match(ctx.sparkline(first),/7d · médias diárias/);
  assert.match(ctx.sparkline(first),/stroke-dasharray="3 3"/);
  ctx.recordPriceObservations([first,{...first,bmObserved:now-10000,bm_price:18000}]);
  assert.match(ctx.sparkline(first),/data-trend-source="session"/);
  assert.doesNotMatch(ctx.sparkline(first),/médias diárias/);
});
test('BM pulses follow actual price direction even when the previous quote is older than the chart window',()=>{
  const {ctx,now}=harness();const first=item(now,{bmObserved:now-2700000});
  ctx.recordPriceObservations([first]);assert.equal(ctx.priceFlash(first),'');
  const up={...first,bmObserved:now-10000,bm_price:18100};ctx.recordPriceObservations([up]);
  assert.match(ctx.bmValue(up),/flash-up/);
  const down={...up,bmObserved:now-5000,bm_price:17000};ctx.recordPriceObservations([down]);
  assert.match(ctx.bmValue(down),/flash-down/);
  ctx.recordPriceObservations([up]);assert.equal(ctx.priceFlash(down),'flash-down');
});
test('active liquidity filter blocks additions and highlights for unknown demand',()=>{
  const {ctx,run,now,fields}=harness();ctx.input=item(now,{profit:10000});
  fields.prioritizeLiquidity.checked=true;ctx.passesLiquidity=()=>false;
  run('currentData=[input]');
  ctx.addDesignItem('T5_ARMOR_PLATE_SET1:1:Thetford');
  assert.equal(run('cargo.length'),0);
  assert.equal(ctx.bestRoundItems([ctx.input]).length,0);
  ctx.passesLiquidity=()=>true;
  ctx.riskFor=()=>({recent:true,eligible:false});
  assert.equal(ctx.bestRoundItems([ctx.input]).length,0);
  ctx.riskFor=()=>({recent:true,eligible:true});
  assert.equal(ctx.bestRoundItems([ctx.input]).length,1);
});

test('researched selection intersects tier filters and rejects artifact items',()=>{
  const {ctx,run,now,fields}=harness();fields.itemProfile={value:'bm_core'};
  ctx.input=item(now,{item_id:'T5_BAG'});
  assert.equal(ctx.designMatches(ctx.input),false);
  run("researchIds=new Set(['T5_BAG','T6_MAIN_SWORD@1'])");
  assert.equal(ctx.designMatches(ctx.input),true);
  assert.equal(ctx.designMatches({...ctx.input,item_id:'T6_OFF_JESTERCANE_HELL'}),false);
  run('selectedTiers.delete(5)');assert.equal(ctx.designMatches(ctx.input),false);
  fields.itemProfile.value='all';
  assert.equal(ctx.designMatches({...ctx.input,item_id:'T6_OFF_JESTERCANE_HELL'}),true);
});

test('expanded and advanced profiles combine with tier and enchantment selections',()=>{
  const {run,fields}=harness();fields.itemProfile={value:'bm_advanced'};
  run("flipProfiles=new Map([['bm_advanced',{ids:new Set(['T8_2H_KNUCKLES_AVALON@4','T7_ARMOR_PLATE_SET2'])}]])");
  assert.equal(run("designMatches({item_id:'T8_2H_KNUCKLES_AVALON@4'})"),true);
  assert.equal(run("designMatches({item_id:'T4_MAIN_SWORD'})"),false);
  run('selectedEnchants.delete(4)');
  assert.equal(run("designMatches({item_id:'T8_2H_KNUCKLES_AVALON@4'})"),false);
  fields.itemProfile.value='bm_expanded';
  assert.equal(run("designMatches({item_id:'T7_ARMOR_PLATE_SET2'})"),false);
});
