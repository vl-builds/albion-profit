const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const model=require('../static/island-model.js');
function setup(initial=[]){
 const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,{value:'',hidden:false,checked:false,dataset:{},textContent:'',innerHTML:'',listeners:{},addEventListener(name,fn){this.listeners[name]=fn;},focus(){},insertAdjacentHTML(){},reset(){for(const [id,n]of nodes)if(id.startsWith('island')){n.value='';n.checked=false;}}});return nodes.get(id);};
 get('server').value='Americas';let stored=JSON.stringify(initial);
 const context={document:{getElementById:get,querySelectorAll:()=>[],addEventListener(){},createElement:()=>({click(){}})},window:{addEventListener(){}},localStorage:{getItem:()=>stored,setItem:(_,v)=>stored=v},IslandModel:model,AlertSound:{Notifier:class{}},Date,Math,Number,Set,JSON,crypto:{randomUUID:()=> 'new-id'},fmt:String,esc:String,setInterval(){},setTimeout(){}};
 vm.runInNewContext(fs.readFileSync('static/island-ui.js','utf8'),context);
 return {get,rows:()=>JSON.parse(stored),click:(id)=>get(id).listeners.click(),submit:()=>get('islandForm').listeners.submit({preventDefault(){}}),action:(data)=>get('islandHistory').listeners.click({target:{closest:()=>({dataset:data,hasAttribute:()=>false})}})};
}
test('quick planting saves remaining duration, empty duration never saves',()=>{
 const a=setup();a.click('islandNew');a.get('islandPlants').value='9';a.submit();assert.equal(a.rows().length,0);
 a.get('islandHours').value='2';a.get('islandMinutes').value='30';a.submit();assert.equal(a.rows().length,1);assert.equal(a.rows()[0].ready-a.rows()[0].planted,9000000);assert.equal(a.get('islandEditor').hidden,true);
});
test('saved cycles edit without resetting countdown and replant starts fresh',()=>{
 const r={id:'old',server:'Americas',plot:'Horta',plants:9,planted:Date.now()-3600000,ready:Date.now()+3600000,watered:true,harvested:false,yield:null,seeds:null,cost:50,revenue:null};
 const a=setup([r]);a.action({islandEdit:'old'});assert.equal(a.get('islandExact').checked,true);a.get('islandPlants').value='8';a.submit();assert.equal(a.rows()[0].plants,8);assert.ok(Math.abs(a.rows()[0].ready-r.ready)<60000);assert.equal(a.rows()[0].cost,50);
 const b=setup([{...r,harvested:true,ready:Date.now()-1}]);b.action({islandReplant:'old'});assert.equal(b.get('islandPlot').value,'Horta');assert.equal(b.get('islandExact').checked,false);b.get('islandHours').value='1';b.submit();assert.equal(b.rows().length,2);assert.equal(b.rows()[1].cost,null);assert.equal(b.rows()[1].harvested,false);
});
test('harvest blocks early action, records ready cycles and can undo',()=>{
 const r={id:'old',server:'Americas',plot:'Horta',plants:9,planted:Date.now()-3600000,ready:Date.now()+3600000,watered:false,harvested:false,yield:null,seeds:null,cost:null,revenue:null};
 const a=setup([r]);a.action({islandHarvest:'old'});assert.equal(a.rows()[0].harvested,false);
 const b=setup([{...r,ready:Date.now()-1}]);b.action({islandHarvest:'old'});assert.equal(b.rows()[0].harvested,true);b.action({islandHarvest:'old'});assert.equal(b.rows()[0].harvested,false);
});
