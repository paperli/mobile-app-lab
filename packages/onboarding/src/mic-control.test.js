import test from 'node:test';
import assert from 'node:assert/strict';
import { mountMicControl } from './mic-control.js';

function harness(reduced = false) {
  const classes = new Set(), attrs = {}, volume = {value:0};
  const counts = {created:0,cleaned:0,submitted:0,cancelled:0,started:0,drawn:0};
  const hold = {disabled:false,classList:{add:value=>classes.add(value)},setAttribute:(name,value)=>attrs[name]=value,setPointerCapture(){}};
  const status = {};
  const scene = {reduced,voice:'ready',host:{unlock(){}},
    startHold(){counts.started++;this.voice='listening';},
    endHold(){counts.submitted++;this.voice='processing';},
    cancelHold(){counts.cancelled++;this.voice='ready';},
  };
  let options;
  const instance = {viewModelByName:()=>({instance:()=>({})}),bindViewModelInstance(){},viewModelInstance:{number:()=>volume},resizeDrawingSurfaceToCanvas(){},drawFrame(){counts.drawn++;},cleanup(){counts.cleaned++;}};
  const control = mountMicControl({hold,canvas:{},status,scene,createRive:config=>{options=config;counts.created++;return instance;}});
  return {hold,status,scene,counts,classes,attrs,volume,control,load:()=>options.onLoad(),fail:()=>options.onLoadError()};
}
const pointer = (id = 1, extra = {}) => ({pointerId:id,button:0,isPrimary:true,preventDefault(){},...extra});
const key = (value, extra = {}) => ({key:value,preventDefault(){},stopPropagation(){},...extra});

test('press, release, retry and status refresh retain one loaded orb',()=>{
  const h=harness();h.load();
  h.hold.onpointerdown(pointer());assert.equal(h.volume.value,65);assert.equal(h.attrs['aria-pressed'],'true');
  h.control.update();h.hold.onpointerup(pointer());
  assert.equal(h.volume.value,0);assert.equal(h.hold.disabled,true);assert.equal(h.counts.submitted,1);
  h.scene.voice='ready';h.control.update();h.hold.onpointerdown(pointer(2));
  assert.equal(h.counts.created,1);assert.equal(h.counts.cleaned,0);assert.ok(h.classes.has('orb-ready'));
});
test('pointer cancellation and lost capture cancel without submitting',()=>{
  const h=harness();h.load();h.hold.onpointerdown(pointer());h.hold.onpointercancel(pointer());h.hold.onlostpointercapture(pointer());
  assert.equal(h.counts.cancelled,1);assert.equal(h.counts.submitted,0);assert.equal(h.volume.value,0);assert.equal(h.attrs['aria-pressed'],'false');
});
test('a second touch or right click cannot steal or submit the held input',()=>{
  const h=harness();h.hold.onpointerdown(pointer(1,{button:2}));assert.equal(h.counts.started,0);
  h.hold.onpointerdown(pointer());h.hold.onpointerdown(pointer(2,{isPrimary:false}));h.hold.onpointerup(pointer(2));
  assert.equal(h.counts.submitted,0);h.hold.onpointerup(pointer());assert.equal(h.counts.submitted,1);
});
test('keyboard repeat and mismatched release do not double submit',()=>{
  const h=harness();h.hold.onkeydown(key(' '));h.hold.onkeydown(key(' ',{repeat:true}));h.hold.onkeyup(key('Enter'));
  assert.equal(h.counts.started,1);assert.equal(h.counts.submitted,0);
  h.hold.onkeyup(key(' '));h.hold.onkeyup(key(' '));assert.equal(h.counts.submitted,1);
});
test('keyboard blur and external cancellation reset the control',()=>{
  const h=harness();h.load();h.hold.onkeydown(key('Enter'));h.hold.onblur();
  assert.equal(h.counts.cancelled,1);assert.equal(h.counts.submitted,0);
  h.hold.onpointerdown(pointer());h.scene.cancelHold();h.control.update();h.hold.onpointerup(pointer());
  assert.equal(h.counts.submitted,0);assert.equal(h.volume.value,0);
});
test('slow load preserves listening input and load failure leaves a usable static control',()=>{
  const h=harness();h.hold.onpointerdown(pointer());h.load();assert.equal(h.volume.value,65);
  const failed=harness();failed.fail();assert.ok(failed.classes.has('orb-unavailable'));
  failed.hold.onpointerdown(pointer());failed.hold.onpointerup(pointer());assert.equal(failed.counts.submitted,1);
});
test('leaving a held screen cancels and ignores late asset callbacks',()=>{
  const h=harness();h.hold.onpointerdown(pointer());h.control.dispose();h.load();h.fail();
  assert.equal(h.counts.cleaned,1);assert.equal(h.counts.cancelled,1);assert.equal(h.counts.submitted,0);assert.equal(h.classes.size,0);
});
test('reduced motion still draws ready and held states',()=>{
  const h=harness(true);h.load();const drawn=h.counts.drawn;h.hold.onpointerdown(pointer());
  assert.ok(h.counts.drawn>drawn);assert.equal(h.volume.value,65);
});
