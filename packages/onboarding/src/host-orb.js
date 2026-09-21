// A persistent host, outside the replaceable puzzle UI. One Lightning quad.

// Speaking Orb Lab's two exposed controls, tuned for the TV stage.
// RESPONSE multiplies sampled speech energy before smoothing (the lab's
// "Voice response" slider, 0–2×); GLOW is its "Glow" slider (0–1).
const RESPONSE = 1.4
const GLOW = 0.4
// The awaken flourish still blooms on top of GLOW, by the same amount it always
// did, so the reveal keeps its character at the lower resting glow.
const BLOOM_GLOW = 0.8
const BLOOM_ENERGY = 0.22

export class HostOrb {
 constructor(scene){
  this.scene=scene;this.time=0;this.energy=0;this.last=0;this.visible=false;this.target=null;this.revealSerial=0;this.revealStarted=0;
  this.node=scene.node({parent:scene.parent,x:510,y:65,w:900,h:900,color:0xffffffff,alpha:0,zIndex:1,shader:scene.r.createShader('speakingHost',{time:0,energy:0,glow:GLOW,canary:1})});
  this.tick=this.tick.bind(this);this.frame=requestAnimationFrame(this.tick);
 }
 layout(phase,instant=false){
  const visible=phase>=1&&phase<=10&&!this.scene.artOnly;
  const position=phase===1?{x:510,y:65,w:900,h:900}:phase<=7?{x:800,y:710,w:320,h:320}:phase===10?{x:1530,y:710,w:280,h:280}:{x:1510,y:710,w:280,h:280};
  const key=[position.x,position.y,position.w,visible].join(':');if(key===this.target)return;this.target=key;
  if(this.motion)this.motion.stop();this.revealSerial++;this.revealStarted=0;
  // Keep the same orb alive while the studio and boards change around it.
  if(phase===1&&visible&&!instant){this.awaken(position);}
  else if(!this.visible&&visible){Object.assign(this.node,position);this.motion=this.scene.animate(this.node,{alpha:1},instant?0:1000);}
  else this.motion=this.scene.animate(this.node,Object.assign(position,{alpha:visible?1:0}),instant?0:phase===2?1700:phase===8?1500:1100,phase===8?180:0,phase===8?'cubic-bezier(.22,.61,.36,1)':undefined);
  this.visible=visible;
 }
 awaken(position){
  const serial=this.revealSerial,scene=this.scene;
  if(scene.reduced){Object.assign(this.node,position,{alpha:1});scene.host.activate();return;}
  // A tiny light gathers, blooms gently past full size, then takes a breath.
  Object.assign(this.node,{x:900,y:455,w:120,h:120,alpha:0});
  scene.later(()=>{if(serial!==this.revealSerial)return;this.revealStarted=performance.now();scene.host.activate();this.motion=scene.animate(this.node,{x:468,y:23,w:984,h:984,alpha:1},1050,0,'cubic-bezier(.22,.75,.24,1)');},600);
  scene.later(()=>{if(serial!==this.revealSerial)return;this.motion=scene.animate(this.node,position,550,0,'ease-in-out');},1650);
 }
 settle(){this.revealSerial++;this.revealStarted=0;if(this.motion)this.motion.stop();if(this.scene.phase===1&&this.visible)Object.assign(this.node,{x:510,y:65,w:900,h:900,alpha:1});}
 tick(now){
  this.frame=requestAnimationFrame(this.tick);const interval=this.scene.profile==='720'?1000/30:1000/60;
  if(now-this.last<interval-1)return;const dt=Math.min((now-this.last)/1000,.1);this.last=now;
  if(document.hidden||!this.visible)return;
  const speaking=this.scene.host.speaking,target=this.scene.host.sampleEnergy()*RESPONSE;
  this.energy+=(target-this.energy)*(1-Math.exp(-dt/(target>this.energy?.055:.17)));
  if(!this.scene.reduced||speaking)this.time+=dt*(speaking?1.2:1);
  const age=this.revealStarted?(now-this.revealStarted)/1600:1;const bloom=age<1?Math.sin(Math.PI*age):0;
  this.node.shader.props.time=this.time;this.node.shader.props.energy=this.energy+bloom*BLOOM_ENERGY;this.node.shader.props.glow=GLOW+bloom*BLOOM_GLOW;
 }
 dispose(){this.revealSerial++;cancelAnimationFrame(this.frame);if(this.motion)this.motion.stop();this.node.destroy();}
}
