import test from 'node:test';
import assert from 'node:assert/strict';
import { nextFocus,skipDestination } from './onboarding-flow.js';
import { applyPhoneCommand,phoneState } from './remote-contract.js';
const buttons=[{isSkip:true},...Array.from({length:4},()=>({type:'answer'}))];
test('intro is unskippable, games go through their answer reveal, upsell exits to hub',()=>{
  assert.deepEqual(Array.from({length:11},(_,i)=>skipDestination(i)),[null,null,3,4,7,7,7,8,'hub','hub','hub']);
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
