import test from 'node:test';
import assert from 'node:assert/strict';
import { HostOrb } from './host-orb.js';

function harness(t,reduced=false){
 const saved={raf:globalThis.requestAnimationFrame,cancel:globalThis.cancelAnimationFrame,document:globalThis.document};
 globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};globalThis.document={hidden:false};
 const pending=[],moves=[];let activations=0;
 const scene={parent:{},profile:'720',phase:1,reduced,artOnly:false,
  r:{createShader:(_name,props)=>({props})},
  node:props=>({...props,x:props.x||0,y:props.y||0,destroy(){this.destroyed=true;}}),
  animate(node,props,duration){const move={stopped:false,stop(){this.stopped=true;}};moves.push(move);if(reduced||duration===0)Object.assign(node,props);return move;},
  later:fn=>pending.push(fn),host:{speaking:true,sampleEnergy:()=>.4,activate(){activations++;}}};
 const orb=new HostOrb(scene);t.after(()=>{orb.dispose();globalThis.requestAnimationFrame=saved.raf;globalThis.cancelAnimationFrame=saved.cancel;globalThis.document=saved.document;});
 return {scene,orb,pending,moves,activations:()=>activations};
}

test('skipping or replaying during the welcome cancels its delayed bloom and preserves one orb',t=>{
 const h=harness(t),node=h.orb.node;
 h.orb.layout(1);h.orb.layout(2);h.orb.cue('value');
 const valueTravel=h.moves.at(-1);
 h.orb.layout(3);h.pending.forEach(run=>run());
 assert.equal(valueTravel.stopped,true);
 assert.equal(h.activations(),0);
 assert.equal(h.orb.pose,'celebration');
 assert.equal(h.orb.node,node);
});

test('a paused or reduced-motion host stays still while recorded speech remains reactive',t=>{
 const {scene,orb}=harness(t,true);
 orb.layout(2,true);orb.cue('value');
 const valueCenter=orb.node.y+orb.node.h/2;
 orb.cue('board');
 assert.ok(orb.node.y+orb.node.h/2>valueCenter+250);
 orb.tick(1000);assert.equal(orb.root.x,0);assert.equal(orb.root.y,0);assert.ok(orb.energy>0);
 scene.reduced=false;orb.tick(1100);assert.notEqual(orb.root.x,0);
 orb.settle();orb.tick(1200);assert.equal(orb.root.x,0);assert.equal(orb.root.y,0);
 orb.resume();orb.tick(performance.now()+100);assert.notEqual(orb.root.x,0);
});
