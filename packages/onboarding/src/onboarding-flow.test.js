import test from 'node:test';
import assert from 'node:assert/strict';
import { nextFocus,skipDestination } from './onboarding-flow.js';
import { applyPhoneCommand,phoneState } from './remote-contract.js';
import { variationFor, variationUrl, endingPhase, OUTRO_PHASE } from './variations.js';
const buttons=[{isSkip:true},...Array.from({length:4},()=>({type:'answer'}))];
test('intro is unskippable, games go through their answer reveal, upsell exits to hub',()=>{
  assert.deepEqual(Array.from({length:11},(_,i)=>skipDestination(i)),[null,null,3,4,7,7,7,8,'hub','hub','hub']);
});
test('subscribers still see answer reveals, then finish without an upsell',()=>{
  assert.deepEqual([2,3,4,5,6,7].map(phase=>skipDestination(phase,true)),[3,4,7,7,7,OUTRO_PHASE]);
  assert.equal(endingPhase(true),OUTRO_PHASE);
  assert.equal(endingPhase(false),8);
  assert.equal(variationFor('firetv-skipped').subscribed,false);
  assert.equal(variationFor('unknown').id,'standard');
});
test('variation links preserve review options without carrying a phone session or old scene',()=>{
  const url=variationUrl('firetv-subscribed',{scene:11,search:'?scene=8&phone=123456&mobile=1&clean=1&hub=https%3A%2F%2Fexample.com%2Fhub'});
  const params=new URL(url,'https://example.com/lab/onboarding/').searchParams;
  assert.equal(params.get('flow'),'firetv-subscribed');
  assert.equal(params.get('scene'),'11');
  assert.equal(params.has('phone'),false);assert.equal(params.has('mobile'),false);
  assert.equal(params.get('hub'),'https://example.com/hub');assert.equal(params.get('clean'),'1');
});
test('Skip is reachable before reveal and at the bottom/right of the answer grid',()=>{
  assert.equal(nextFocus(buttons,-1,'right',false),0);
  assert.equal(nextFocus(buttons,0,'up',false),-1);
  assert.equal(nextFocus(buttons,1,'right',true),2);
  assert.equal(nextFocus(buttons,2,'right',true),0);
  assert.equal(nextFocus(buttons,1,'down',true),3);
  assert.equal(nextFocus(buttons,3,'down',true),0);
  assert.equal(nextFocus(buttons,0,'left',true),4);
});
test('phone commands cannot call arbitrary scene methods or grant membership',()=>{
  let bought=0;const scene={phase:8,phoneStep:'signup',member:false,buy(){bought++;},onchange(){},dispose(){throw Error('must not run');}};
  applyPhoneCommand(scene,{method:'dispose'});
  applyPhoneCommand(scene,{method:'syncPhone',value:{member:true,phoneStep:'invalid',checkoutPlan:'yearly'}});
  assert.equal(scene.member,false);assert.equal(scene.phoneStep,'signup');assert.equal(scene.checkoutPlan,undefined);
  applyPhoneCommand(scene,{method:'syncPhone',value:{phoneStep:'email'}});
  assert.equal(scene.phoneStep,'email');
  applyPhoneCommand(scene,{method:'buy'});assert.equal(bought,0);
  scene.phoneStep='pay';applyPhoneCommand(scene,{method:'buy'});assert.equal(bought,1);
});
test('phone snapshot excludes credentials and host internals',()=>{
  const state=phoneState({phase:8,email:'secret',password:'secret',token:'secret',gameMenu:{node:'renderer'}});
  assert.equal('email' in state,false);assert.equal('password' in state,false);assert.equal('token' in state,false);assert.equal(state.gameMenu,true);
});
test('a stale phone checkout action cannot put a subscriber back into signup or payment',()=>{
  let bought=0;
  const scene={phase:11,member:true,phoneStep:'dpad',buy(){bought++;},onchange(){}};
  for(const phoneStep of ['signup','email','offer','pay','success']){
    applyPhoneCommand(scene,{method:'syncPhone',value:{phoneStep}});
    assert.equal(scene.phoneStep,'dpad');
  }
  applyPhoneCommand(scene,{method:'buy'});assert.equal(bought,0);
});
