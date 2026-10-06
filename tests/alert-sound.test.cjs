const test=require('node:test');
const assert=require('node:assert/strict');
const {Notifier}=require('../static/alert-sound.js');
function setup(state='running') {
  const nodes=[],gains=[];let now=1000;
  const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
  const context={state,currentTime:1,destination:{},resume:async()=>{},
    createGain(){const g={gain:param(),connect(){},disconnect(){}};gains.push(g);return g;},
    createOscillator(){const n={frequency:param(),starts:[],stops:[],connect(){},disconnect(){},start(t){this.starts.push(t);},stop(t){this.stops.push(t);}};nodes.push(n);return n;}};
  return {context,nodes,gains,sound:new Notifier(()=>context,()=>now),tick:v=>now=v};
}
test('sound requires explicit activation and schedules three notes',async()=>{
  const {sound,nodes}=setup();assert.equal(sound.play(),false);
  assert.equal(await sound.enable(),true);assert.equal(sound.play(),true);
  assert.equal(nodes.length,3);assert.equal(nodes[0].starts[0],1);assert.equal(nodes[2].starts[0],1.48);
});
test('bursts are throttled without letting tests consume the notification cooldown',async()=>{
  const {sound,nodes,tick}=setup();await sound.enable();sound.play(true);
  assert.equal(sound.play(),true);assert.equal(sound.play(),false);assert.equal(nodes.length,6);
  tick(11000);assert.equal(sound.play(),true);
});
test('volume applies to the master and mute stops pending notes',async()=>{
  const {sound,nodes,gains}=setup();sound.setVolume(.8);await sound.enable();sound.play();
  assert.equal(gains[0].gain.value,.12);sound.setVolume(0);assert.equal(sound.play(true),false);
  sound.disable();assert.equal(sound.enabled,false);assert.equal(sound.nodes.size,0);
  assert.ok(nodes.every(n=>n.stops.length===2));assert.equal(sound.play(),false);
});
test('suspended context does not claim enabled and later suspension cannot play',async()=>{
  const {sound,context}=setup('suspended');assert.equal(await sound.enable(),false);
  context.state='running';await sound.enable();context.state='suspended';assert.equal(sound.play(),false);
});
test('muting during audio activation cancels the pending enable',async()=>{
  const {sound,context}=setup();let complete;
  context.resume=()=>new Promise(resolve=>complete=resolve);
  const pending=sound.enable();sound.disable();complete();assert.equal(await pending,false);
  assert.equal(sound.enabled,false);
});
