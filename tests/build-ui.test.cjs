const test = require('node:test');
const assert = require('node:assert/strict');
const Arsenal = require('../static/build-ui.js');
const render = require('../static/arsenal-view.js');
const catalog = require('../static/build-catalog.json');
const {I,LS,LEGACY,LSF,DSK} = require('../static/arsenal-data.js');

function fixture(entries=[]) {
  const storage = new Map(entries);
  global.localStorage = {getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)};
  global.location = {hash:''};
  const app = new Arsenal(); app.note = message => {app.state.notice=message;};
  app.connectCatalog(catalog); app.restoreStorage();
  return {app,storage};
}
const legacy = {id:'old-1',name:'Minha lança',mode:'pve',notes:'Plano pessoal intacto',slots:{weapon:'T4_MAIN_SPEAR',offhand:'T4_OFF_TORCH',body:'T4_ARMOR_LEATHER_SET1',feet:'T4_SHOES_LEATHER_SET1'}};

test('migration preserves equipment, names, context, notes and original storage',()=>{
  const original=JSON.stringify([legacy]),{app,storage}=fixture([[LEGACY,original]]);
  const b=app.state.saved[0];
  assert.equal(b.id,'legacy-old-1'); assert.equal(b.act,'pve'); assert.equal(b.notes,legacy.notes);
  assert.equal(I[b.p.armor].base,'ARMOR_LEATHER_SET1'); assert.equal(I[b.p.off].base,'OFF_TORCH');
  assert.equal(app.iname(b.p.weapon,b),'Lança do Adepto'); assert.equal(storage.get(LEGACY),original);
  app.pickRow({...b,src:'mine'}); app.save(app.sel(),app.cur(app.sel()));
  assert.equal(app.state.saved.length,2); assert.notEqual(app.sel().id,b.id);
  const again=fixture([...storage]); assert.equal(again.app.state.saved.length,2);
});
test('saving and reloading preserves equipment, skills and personal plan',()=>{
  const {app,storage}=fixture();
  app.edit(c=>{c.tier=8;c.ench=2;c.qual=4;c.sk.Q=1;});
  app.state.saveName='Lança personalizada';app.state.notesD.b1='Testar o combo';app.save(app.sel(),app.cur(app.sel()));
  const b=app.state.saved[0]; assert.equal(b.tier,8);assert.equal(b.sk.Q,1);
  const restored=fixture([...storage]).app.state.saved[0];
  assert.equal(restored.title,'Lança personalizada');assert.equal(restored.notes,'Testar o combo');assert.equal(restored.ench,2);assert.equal(restored.qual,4);
});
test('two-handed weapons remove and reject offhands and wrong-slot drops',()=>{
  const {app}=fixture();app.equip('weapon','XBOW');app.equip('off','OTO');
  assert.equal(app.cur(app.sel()).p.off,null);assert.match(app.state.notice,/duas mãos/);
  app.equip('head','SPEAR');assert.equal(app.cur(app.sel()).p.head,'HL3');
});
test('family and material changes reset only affected skill selections',()=>{
  const {app}=fixture();app.edit(c=>{for(const k of Object.keys(DSK))c.sk[k]=1;});
  app.equip('weapon','AXE');let sk=app.cur(app.sel()).sk;
  assert.deepEqual([sk.Q,sk.W,sk.E,sk.P],[0,0,0,0]);assert.equal(sk.hA,1);
  app.equip('head','HP1');sk=app.cur(app.sel()).sk;assert.equal(sk.hA,0);assert.equal(sk.hP,0);assert.equal(sk.aA,1);
});
test('selection preserves per-build drafts and restore clears draft notes',()=>{
  const {app}=fixture();app.equip('head','HP1');app.state.notesD.b1='rascunho';
  app.pickRow(app.all().find(b=>b.id==='b2'));app.equip('head','HC1');app.pickRow(app.all().find(b=>b.id==='b1'));
  assert.equal(app.cur(app.sel()).p.head,'HP1');assert.equal(app.state.notesD.b1,'rascunho');
  app.renderVals().restore();assert.equal(app.cur(app.sel()).p.head,'HL3');assert.equal(app.dirty(app.sel()),false);
});
test('combined filters and search use the edited composition',()=>{
  const {app}=fixture();app.equip('weapon','AXE');app.edit(c=>{c.tier=8;c.qual=5;});
  app.setF({q:'Machado de Guerra do Ancião',tier:'8',qual:'5',act:'1v1',fam:'Machados'});
  assert.deepEqual(app.renderVals().rows.map(r=>r.id),['b1']);app.setF({armor:'plate'});assert.equal(app.renderVals().rows.length,0);
  app.renderVals().clearFilters();assert.equal(app.cur(app.sel()).tier,8);
});
test('missing statistics never produce real rankings or a default radar',()=>{
  const {app}=fixture();
  for(const sort of ['played','winrate','pop','cost']){
    app.setF({sort});const v=app.renderVals();assert.match(v.sortNote,/sem ranking/);assert.equal(v.showRadar,false);
    assert.equal(v.usageRows.find(x=>x.k==='Amostra').v,'Dados ainda indisponíveis');
    assert.deepEqual(v.rows.map(r=>r.title),v.rows.map(r=>r.title).sort((a,b)=>a.localeCompare(b,'pt-BR')));
  }
});
test('comparison requires same activity and clears incompatible selections',()=>{
  const {app}=fixture();app.state.compareMode=true;app.pickRow(app.all().find(b=>b.id==='b2'));
  assert.match(app.state.compareWarn,/Comparação bloqueada/);assert.equal(app.state.compareId,null);
  app.state.compareMode=true;app.pickRow(app.all().find(b=>b.id==='b5'));
  assert.equal(app.state.compareId,'b5');assert.equal(app.renderVals().hasB,true);assert.equal(app.state.radar,true);
  app.pickRow(app.all().find(b=>b.id==='b2'));assert.equal(app.renderVals().hasB,false);
});
test('corrupt storage is preserved and cannot be silently overwritten',()=>{
  for(const key of [LS,LEGACY]){
    const {app,storage}=fixture([[key,'broken']]);app.save(app.sel(),app.cur(app.sel()));
    assert.equal(storage.get(key),'broken');assert.equal(app.storageOkay,false);assert.match(app.state.notice,/bloqueada/);
  }
});
test('quota failure preserves composition and unsaved plan',()=>{
  const {app}=fixture();app.edit(c=>{c.tier=8;});app.state.notesD.b1='Não perder';
  global.localStorage.setItem=()=>{throw Error('QuotaExceededError');};app.save(app.sel(),app.cur(app.sel()));
  assert.equal(app.state.saved.length,0);assert.equal(app.cur(app.sel()).tier,8);assert.equal(app.state.notesD.b1,'Não perder');
});
test('JSON import merges records and rejects incompatible slots atomically',async()=>{
  const {app,storage}=fixture();const importRows=raw=>app.importBuilds({target:{files:[{size:100,text:async()=>JSON.stringify(raw)}],value:'file'}});
  await importRows([legacy]);assert.equal(app.state.saved.length,1);await importRows([legacy]);assert.equal(app.state.saved.length,1);
  const before=storage.get(LS);await importRows([{...legacy,id:'bad',slots:{weapon:'T4_OFF_TORCH'}}]);assert.equal(storage.get(LS),before);
  await importRows([{...app.state.saved[0],id:'new',p:{weapon:'__proto__'}}]);assert.equal(storage.get(LS),before);
});
test('untrusted filters, text and creator URLs are handled safely',()=>{
  const {app}=fixture([[LSF,JSON.stringify({act:'__proto__',q:3,server:'unknown',tier:'99'})]]);
  assert.equal(app.state.f.act,'all');assert.equal(app.state.f.q,'');
  assert.equal(app.safeCreatorUrl('https://youtube.com@evil.example/'),false);assert.equal(app.safeCreatorUrl('javascript:alert(1)'),false);assert.equal(app.safeCreatorUrl('https://www.youtube.com/@nordake'),true);
  const v=app.renderVals();v.cur.title='<img src=x onerror=alert(1)>';v.saveName='" autofocus onfocus="alert(1)';
  const html=render(v,()=>0);assert.ok(html.includes('&lt;img'));assert.ok(html.includes('&quot; autofocus'));assert.doesNotMatch(html,/<img src=x/);assert.doesNotMatch(html,/<sc-|<x-dc|support\.js/);
});
test('all catalog items remain available and item details render for all families',()=>{
  const {app}=fixture();
  for(const item of catalog){
    const key=Object.keys(I).find(k=>I[k].base===item.id.slice(3));assert.ok(key,item.id);app.state.detail={slot:I[key].slot,key};
    const dt=app.renderVals().dt;assert.ok(dt.name);assert.match(dt.rows.find(r=>r.k==='Poder de item').v,/Indisponível/);
  }
});
test('selection links restore validated filters and a personal build',()=>{
  const {app,storage}=fixture();app.save(app.sel(),app.cur(app.sel()));const id=app.sel().id;
  global.location.hash='#sel='+encodeURIComponent(JSON.stringify({f:{act:'1v1',server:'Europe',sort:'author'},id}));
  const second=new Arsenal();second.connectCatalog(catalog);second.restoreStorage();
  assert.equal(second.state.selId,id);assert.equal(second.state.listTab,'mine');assert.equal(second.state.f.server,'Europe');
  assert.equal(storage.get(LEGACY),undefined);
});
test('personal and duplicate saves have distinct IDs and cannot shadow catalog rows',()=>{
  const {app}=fixture();app.save(app.sel(),app.cur(app.sel()));const first=app.sel();
  app.save(first,app.cur(first),true);assert.equal(app.state.saved.length,2);
  assert.notEqual(app.state.saved[0].id,app.state.saved[1].id);assert.match(app.sel().title,/^Cópia de /);
  assert.throws(()=>app.validate({...app.state.saved[0],id:'b1'}));
  assert.throws(()=>app.validate({...app.state.saved[0],id:'constructor'}));
});
