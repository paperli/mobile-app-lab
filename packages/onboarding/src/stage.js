import { STAGE_SPRITES } from './sprites.js';
import { stageSpecs } from './stage-specs.js';
export class Stage {
 constructor(scene){this.scene=scene;this.kind='empty';this.nodes=[];this.timers=[];this.retired=[];this.epoch=0;}
 from(spec){const v={x:0,y:0,scale:1};const x=/translateX\((-?[\d.]+)px\)/.exec(spec.from),y=/translateY\((-?[\d.]+)px\)/.exec(spec.from),s=/scale\(([\d.]+)\)/.exec(spec.from);if(x)v.x=+x[1];if(y)v.y=+y[1];if(s)v.scale=+s[1];return v;}
 cancel(){this.epoch++;this.timers.forEach(clearTimeout);this.timers=[];this.retired.forEach(n=>n.destroy());this.retired=[];}
 change(kind,immediate=false,force=false){
  if(this.kind===kind&&!force)return 0;this.cancel();const s=this.scene,prior=this.kind,epoch=this.epoch;this.kind=kind;
  const reduced=s.reduced||immediate,lead=prior!=='empty'&&kind!=='empty'&&!reduced?1000:0;
  const old=this.nodes;this.nodes=[];
  old.forEach(({node,spec,x,y})=>{if(reduced){node.destroy();return;}this.retired.push(node);const f=this.from(spec),delay=spec.id==='crown'||spec.id.indexOf('palm')>=0?0:spec.id.indexOf('column')>=0?100:240;s.animate(node,{alpha:0,x:x+f.x,y:y+f.y,scale:f.scale},900,delay,'cubic-bezier(.18,.8,.2,1)');});
  if(old.length)this.timers.push(setTimeout(()=>{old.forEach(p=>p.node.destroy());this.retired=[];},reduced?0:1200));
  if(kind==='empty')return 0;
  const specs=[{id:'shell',from:'translateY(0)',delay:0,duration:1400},...stageSpecs[kind].parts];
  specs.forEach(spec=>{const d=STAGE_SPRITES[kind][spec.id],x=d.x*1.25,y=d.y*1.25,f=this.from(spec);
   const create=()=>{if(epoch!==this.epoch)return;const node=s.node({parent:s.scenery,x:reduced?x:x+f.x,y:reduced?y:y+f.y,w:d.width*1.25,h:d.height*1.25,src:d.src,alpha:reduced?1:.001,scale:reduced?1:f.scale});this.nodes.push({node,spec,x,y});s.animate(node,{x,y,alpha:1,scale:1},reduced?0:spec.duration,0,'cubic-bezier(.18,.8,.2,1)');};
   this.timers.push(setTimeout(create,reduced?0:lead+spec.delay));
  });
  return reduced?0:lead+(kind==='wheel'?2750:2100);
 }
 settle(){this.change(this.kind,true,true);}
 replay(){const kind=this.kind;this.change('empty',true);return this.change(kind);}
 dispose(){this.cancel();this.nodes.forEach(p=>p.node.destroy());this.nodes=[];}
}
