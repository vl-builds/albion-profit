const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function harness() {
  const now = Date.parse('2026-09-23T12:00:00Z');
  const fields = {server:{value:'Americas'},prioritizeLiquidity:{checked:true}};
  const ctx = vm.createContext({Date:class extends Date {constructor(...args){super(...(args.length?args:[now]));} static now(){return now;}},
    $:id=>fields[id],fmt:String,esc:String});
  vm.runInContext('let cargo=[];\n'+fs.readFileSync('static/liquidity-ui.js','utf8'),ctx);
  return {ctx,fields,now,run:code=>vm.runInContext(code,ctx)};
}
test('unknown, failed, stale and other quality or server history cannot pass',()=>{
  const {ctx,fields,now,run}=harness();
  const item={item_id:'T6_OFF_JESTERCANE_HELL',quality:2};
  assert.equal(ctx.passesLiquidity(item),false);
  ctx.row={...item,liquid:true,loadedAt:now};
  run("liquidityHistory.set('Americas:T6_OFF_JESTERCANE_HELL:2',row)");
  assert.equal(ctx.passesLiquidity(item),true);
  assert.equal(ctx.passesLiquidity({...item,quality:1}),false);
  fields.server.value='Europe';assert.equal(ctx.passesLiquidity(item),false);
  fields.server.value='Americas';ctx.row.loadedAt=now-900001;
  assert.equal(ctx.passesLiquidity(item),false);
  ctx.row.loadedAt=now;ctx.row.liquid=false;ctx.row.error=true;
  assert.equal(ctx.passesLiquidity(item),false);
  fields.prioritizeLiquidity.checked=false;assert.equal(ctx.passesLiquidity(item),true);
});
test('manual cargo warning sums the same quality across purchase cities',()=>{
  const {ctx,now,run}=harness();
  ctx.row={liquid:true,suggested_qty_limit:5,loadedAt:now};
  run("liquidityHistory.set('Americas:T4_BAG:1',row);cargo=[{item_id:'T4_BAG',quality:1,quantity:3},{item_id:'T4_BAG',quality:1,quantity:3},{item_id:'T4_BAG',quality:2,quantity:20}]");
  assert.match(ctx.cargoLiquidityWarning({item_id:'T4_BAG',quality:1}),/total de 6/);
  run('cargo[1].quantity=2');
  assert.equal(ctx.cargoLiquidityWarning({item_id:'T4_BAG',quality:1}),'');
});

test('daily sales distinguishes zero, absent history and missing days',()=>{
  const {ctx,now,run}=harness();
  const item={item_id:'T4_BAG',quality:1};
  assert.match(ctx.dailySalesCell(item),/aguardando/);
  ctx.row={loadedAt:now,units_per_reported_day:0,reported_days:6,daily_sales:[{date:'2026-09-22',item_count:0},{date:'2026-09-21',item_count:null}]};
  run("liquidityHistory.set('Americas:T4_BAG:1',row)");
  assert.match(ctx.dailySalesCell(item),/0 un\.\/dia/);
  assert.match(ctx.dailySalesCell(item),/6\/7/);
  assert.match(ctx.dailySalesDetails(ctx.row),/<td>0<\/td>/);
  assert.match(ctx.dailySalesDetails(ctx.row),/Sem informação/);
});
