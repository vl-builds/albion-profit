const {test}=require('node:test');
const assert=require('node:assert/strict');
const M=require('../static/order-model.js');
const T=require('../static/trade-model.js');
const p={id:'p',server:'Americas',item:'Botas 6.2 Bom',city:'Thetford',notes:'',quantity:2,buy:70000,target:110000,tax:8,setup:2.5,extra:1000};
test('order includes initial fee and expenses in profit and capital ROI',()=>{
 const r=M.calculate(p);assert.equal(r.purchase,140000);assert.equal(r.listing,5500);assert.equal(r.salesTax,17600);assert.equal(r.capital,146500);assert.equal(r.profit,55900);assert.equal(r.roi,55900/146500*100);assert.equal(r.breakEven,78771);
 assert.ok(Math.abs(r.stressProfit-35660)<1e-8);
});
test('rejects invalid costs, quantities, dates and tax totals',()=>{
 for(const change of [{quantity:1.5},{target:0},{buy:NaN},{extra:-1},{tax:99,setup:2.5},{observedAt:Date.now()+86400000},{days:1.5}]) assert.throws(()=>M.validate({...p,...change}));
 assert.doesNotThrow(()=>M.validate(p));
});
test('pending target remains separate from realized profit and paid capital',()=>{
 const t={id:'t',server:'Americas',item:p.item,city:p.city,quantity:2,purchase:140000,fees:5500,futureFees:1000,mode:'order',outcome:'pending',targetPrice:110000,expectedTax:8};
 const pending=T.validate(t);assert.equal(pending.profit,null);assert.ok(Math.abs(pending.potentialProfit-55900)<1e-8);
 assert.equal(T.summary([pending]).profit,0);assert.equal(T.analytics([pending]).pendingCapital,145500);
 const sold=T.validate({...t,outcome:'sold',soldAt:Date.now(),received:202400,fees:6500,futureFees:0});
 assert.equal(sold.profit,55900);assert.equal(sold.potentialProfit,null);
 const legacy=T.validate({...t,targetPrice:undefined,expectedTax:undefined,futureFees:undefined});assert.equal(legacy.potentialProfit,null);
 assert.throws(()=>T.validate({...t,expectedTax:100}));
});
const vm=require('node:vm');
const fs=require('node:fs');
function orderHarness(raw='[]') {
 const fields={}, saved={};
 const names={Item:'Botas 6.2 Bom',City:'Thetford',Quantity:'2',Buy:'70000',Target:'110000',Tax:'8',Setup:'2.5',Extra:'1000',Average:'',Volume:'',Days:'',ObservedAt:'',Notes:''};
 for(const [k,v] of Object.entries(names))fields['order'+k]={value:v};
 const get=id=>fields[id]||(fields[id]={value:'',addEventListener(n,f){this[n]=f;},reset(){},focus(){}});
 get('tradeServer').value='Americas';get('premium').checked=false;
 const ctx={OrderModel:M,$:get,crypto:{randomUUID:()=> 'draft'},localStorage:{getItem:()=>raw,setItem:(k,v)=>saved[k]=v},fmt:String,esc:String,status(){},resetTradeForm(){get('tradePurchase').value='';},localDateInput:()=>'',console};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(require.resolve('../static/order-ui.js'),'utf8'),ctx);ctx.initializeOrders();
 return {ctx,get,saved};
}
test('plan saves separately, round-trips and only prepares an unsaved purchase form',()=>{
 const h=orderHarness();h.get('orderForm').submit({preventDefault(){}});
 const raw=h.saved['albion-order-plans-v1'];assert.equal(JSON.parse(raw)[0].target,110000);
 const restored=orderHarness(raw);assert.match(restored.get('orderPlans').innerHTML,/Botas/);
 restored.get('orderPlans').click({target:{closest:s=>s==='[data-order-trade]'?{dataset:{orderTrade:'draft'}}:null}});
 assert.equal(restored.get('tradePurchase').value,'');assert.equal(restored.get('tradeFutureFees').value,'6500.00');assert.equal(restored.get('tradeMode').value,'order');assert.equal(restored.saved['albion-trades-v1'],undefined);
 restored.get('tradeServer').value='Europe';restored.get('tradeServer').change();assert.doesNotMatch(restored.get('orderPlans').innerHTML,/Botas/);
});
test('corrupt saved plans cannot be overwritten',()=>{
 const h=orderHarness('{broken');h.get('orderForm').submit({preventDefault(){}});assert.deepEqual(h.saved,{});
});
