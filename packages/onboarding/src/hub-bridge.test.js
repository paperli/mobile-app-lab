import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.location = {
  protocol: 'http:', hostname: 'localhost', origin: 'http://localhost:5175',
  href: 'http://localhost:5175/',
  search: '?hub=http%3A%2F%2Flocalhost%3A5173%2F%3Fview%3Dhub9',
};
const { setupHubBridge } = await import('./hub-bridge.js');

function harness() {
  const messages = [];
  const frame = { hidden:false, src:'', style:{}, contentWindow:{postMessage:(...args)=>messages.push(args)}, removeAttribute(){this.src='';} };
  let receive;
  globalThis.document = {createElement:()=>frame,getElementById:()=>({appendChild(){}})};
  globalThis.window = {addEventListener:(_,listener)=>{receive=listener;}};
  const phases = [];
  const spoken = [];
  let stops = 0;
  const scene = {connected:false,member:false,permission:false,host:{say:line=>spoken.push(line),stop:()=>stops++},pause(){},onchange(){},go:phase=>phases.push(phase)};
  setupHubBridge(scene);
  const emit = (type, extra={}) => receive({source:frame.contentWindow,origin:'http://localhost:5173',data:{type},...extra});
  return {scene,frame,messages,phases,emit,spoken,get stops(){return stops;}};
}

test('checkout completion waits for hub readiness and opens success once',()=>{
  const h=harness();h.scene.showHub(true);
  assert.equal(h.frame.hidden,false);assert.equal(h.messages.length,0);
  h.emit('weekend:hub-ready');h.emit('weekend:hub-ready');
  assert.equal(h.messages.length,1);assert.equal(h.messages[0][0].command,'success');
  assert.equal(h.messages[0][1],'http://localhost:5173');
  assert.deepEqual(h.messages[0][0].value,{overUpsell:true});
  assert.equal(h.frame.style.opacity,'0');
  h.emit('weekend:success-visible');
  assert.equal(h.frame.style.opacity,'1');
  assert.equal(h.frame.style.pointerEvents,'auto');
});
test('Back-first browsing preserves checkout and later delivers success',()=>{
  const h=harness();h.scene.phoneStep='pay';h.scene.showHub();h.emit('weekend:hub-ready');
  assert.equal(h.scene.phoneStep,'pay');assert.equal(h.messages.length,0);
  h.scene.showHub(true);assert.equal(h.messages[0][0].command,'success');
  assert.deepEqual(h.messages[0][0].value,{overUpsell:false});
  assert.equal(h.frame.style.opacity,'1');
});
test('preloaded hub still waits for success to mount over the upsell',()=>{
  const h=harness();h.scene.showHub();h.emit('weekend:hub-ready');h.scene.hideHub();
  h.scene.showHub(true);
  assert.equal(h.frame.style.opacity,'0');
  assert.deepEqual(h.messages[0][0].value,{overUpsell:true});
  h.emit('weekend:success-visible',{origin:'https://unrelated.example'});
  assert.equal(h.frame.style.opacity,'0');
  h.scene.hideHub();h.emit('weekend:success-visible');
  assert.equal(h.frame.hidden,true);
});
test('messages from unrelated windows or origins cannot drive the rehearsal',()=>{
  const h=harness();h.scene.showHub();
  h.emit('weekend:hub-ready',{origin:'https://unrelated.example'});
  h.emit('weekend:hub-ready',{source:{}});
  h.scene.hubNavigate('enter');assert.equal(h.messages.length,0);
  h.emit('weekend:play-puzzle',{origin:'https://unrelated.example'});
  assert.deepEqual(h.phases,[]);
});
test('connected phone focuses the sample and carries mic permission into game entry',()=>{
  const h=harness();h.scene.connected=true;h.scene.showHub();h.emit('weekend:hub-ready');
  assert.equal(h.messages[0][0].command,'sample');
  h.scene.hubNavigate('right');assert.equal(h.messages[1][0].value,'right');
  h.emit('weekend:play-puzzle');assert.deepEqual(h.phases,[5]);assert.equal(h.frame.hidden,true);
  h.scene.permission=true;h.emit('weekend:play-puzzle');assert.deepEqual(h.phases,[5,6]);
});
test('restart clears queued success and loads a fresh hub',()=>{
  const h=harness();h.scene.showHub(true);h.scene.resetHub();
  assert.equal(h.frame.src,'');assert.equal(h.scene.hubVisible,false);
  h.scene.showHub();h.emit('weekend:hub-ready');assert.equal(h.messages.length,0);
});
test('success prompt waits for visible modal, speaks once, and stops on dismissal',()=>{
  const h=harness();h.scene.showHub(true);h.emit('weekend:hub-ready');
  assert.equal(h.spoken.length,0);
  h.emit('weekend:success-visible');h.emit('weekend:success-visible');
  assert.equal(h.spoken.length,1);assert.match(h.spoken[0],/Press OK on your phone/);
  h.emit('weekend:success-dismissed');assert.equal(h.stops,1);
  h.scene.replayHubPrompt();assert.equal(h.spoken.length,1);
});
test('late or untrusted acknowledgements do not narrate after leaving success',()=>{
  const h=harness();h.scene.showHub(true);
  h.emit('weekend:success-visible',{origin:'https://unrelated.example'});
  h.scene.hideHub();h.emit('weekend:success-visible');
  assert.equal(h.spoken.length,0);
});
