// A persistent host, outside the replaceable puzzle UI. One shader quad;
// a transparent parent adds gentle drift without fighting its travel animation.

// Speaking Orb Lab's two exposed controls, tuned for the TV stage.
// RESPONSE multiplies sampled speech energy before smoothing (the lab's
// "Voice response" slider, 0–2×); GLOW is its "Glow" slider (0–1).
const RESPONSE = 1.4
const GLOW = 0.4
// The awaken flourish still blooms on top of GLOW, by the same amount it always
// did, so the reveal keeps its character at the lower resting glow.
const BLOOM_GLOW = 0.8
const BLOOM_ENERGY = 0.22
const FLOOR = {x:800,y:710,w:320,h:320};
const VALUE = {x:390,y:295,w:400,h:400};
const EASE = 'cubic-bezier(.42,0,.22,1)';

export class HostOrb {
 constructor(scene){
  this.scene=scene;this.time=0;this.energy=0;this.last=0;this.visible=false;this.target=null;this.revealSerial=0;this.revealStarted=0;this.motionTime=0;this.paused=false;this.pose='hidden';this.cheerStarted=0;
  this.root=scene.node({parent:scene.parent,w:1920,h:1080,zIndex:3});
  this.node=scene.node({parent:this.root,x:510,y:65,w:900,h:900,color:0xffffffff,alpha:0,shader:scene.r.createShader('speakingHost',{time:0,energy:0,glow:GLOW,canary:1,mint:0})});
  this.tick=this.tick.bind(this);this.frame=requestAnimationFrame(this.tick);
 }
 layout(phase,instant=false){
  this.phase=phase;this.paused=false;this.cheerStarted=0;
  const visible=phase>=1&&phase<=10&&!this.scene.artOnly;
  const qr=phase===8||phase===9||(phase===4&&this.scene.scanPrompted);
  const value=phase===2&&!this.scene.roundBoardShown;
  const position=qr?this.qrPosition():value?VALUE:phase===1?{x:510,y:65,w:900,h:900}:phase===3?{x:280,y:350,w:400,h:400}:phase===7?{x:1240,y:350,w:400,h:400}:phase<=7?FLOOR:{x:1530,y:710,w:280,h:280};
  this.pose=qr?'QR code':value?'value proposition':phase===1?'welcome':phase===3||phase===7?'celebration':'puzzle';
  this.rest={...position};
  const key=[position.x,position.y,position.w,visible].join(':');if(key===this.target)return;this.target=key;
  if(this.motion)this.motion.stop();this.revealSerial++;this.revealStarted=0;
  // Keep the same orb alive while the studio and boards change around it.
  if(phase===1&&visible&&!instant){this.awaken(position);}
  else if(!this.visible&&visible){Object.assign(this.node,position);this.motion=this.scene.animate(this.node,{alpha:1},instant?0:1000);}
  else this.motion=this.scene.animate(this.node,{...position,alpha:visible?1:0},instant?0:phase===2?1300:1100,0,EASE);
  this.visible=visible;
 }
 travel(pose,position,duration=850){
  this.pose=pose;this.rest={...position};this.target=null;
  this.revealSerial++;this.revealStarted=0;
  if(this.motion)this.motion.stop();
  this.motion=this.scene.animate(this.node,position,duration,0,EASE);
 }
 qrPosition(){
  // Between the puzzle board and pairing panel, level with the QR's center.
  if(this.phase===4)return {x:1240,y:418,w:300,h:300};
  // Sit immediately left of the large QR, aligned with its center. Leave
  // room for the entire halo; the paired layout uses the space below its QR.
  if(this.phase===8)return this.scene.connected?{x:99,y:800,w:280,h:280}:{x:1050,y:292,w:300,h:300};
  if(this.phase===9)return {x:1110,y:273,w:300,h:300};
  return null;
 }
 focusQr(){
  const position=this.qrPosition();
  if(!position||!this.visible||this.paused)return;
  if(this.pose==='QR code'&&this.rest.x===position.x&&this.rest.y===position.y)return;
  this.travel('QR code',position,1150);
 }
 // These moves use the same audio clock as the words and puzzle reveals.
 cue(type,index=0){
  if(!this.visible||this.paused||![2,4].includes(this.phase))return;
  // Jeopardy is already travelling here from the welcome. Let that single
  // journey finish rather than restarting it when the value text appears.
  if(type==='value'){if(this.pose!=='value proposition')this.travel('value proposition',VALUE,800);}
  // Drop below the board first, then accompany the reveal along the floor.
  else if(type==='board')this.travel('board reveal',{...FLOOR,x:430},900);
  else if(type==='question')this.travel('question',{...FLOOR,x:620},1000);
  else if(type==='answer')this.travel('answer options',{...FLOOR,x:680+index*55},650);
  else if(type==='ready'&&this.phase===2)this.travel('puzzle',FLOOR,800);
  else if(type==='scan'&&this.phase===4)this.focusQr();
 }
 cheer(){if(!this.scene.reduced)this.cheerStarted=performance.now();}
 awaken(position){
  const serial=this.revealSerial,scene=this.scene;
  if(scene.reduced){Object.assign(this.node,position,{alpha:1});scene.host.activate();return;}
  // A tiny light gathers, blooms gently past full size, then takes a breath.
  Object.assign(this.node,{x:900,y:455,w:120,h:120,alpha:0});
  scene.later(()=>{if(serial!==this.revealSerial)return;this.revealStarted=performance.now();scene.host.activate();this.motion=scene.animate(this.node,{x:468,y:23,w:984,h:984,alpha:1},1050,0,'cubic-bezier(.22,.75,.24,1)');},600);
  scene.later(()=>{if(serial!==this.revealSerial)return;this.motion=scene.animate(this.node,position,550,0,'ease-in-out');},1650);
 }
 settle(){this.paused=true;this.revealSerial++;this.revealStarted=0;this.cheerStarted=0;if(this.motion)this.motion.stop();if(this.visible&&this.rest)Object.assign(this.node,this.rest,{alpha:1});this.root.x=0;this.root.y=0;}
 resume(){this.paused=false;this.last=performance.now();}
 tick(now){
  this.frame=requestAnimationFrame(this.tick);const interval=this.scene.profile==='720'?1000/30:1000/60;
  if(now-this.last<interval-1)return;const dt=Math.min((now-this.last)/1000,.1);this.last=now;
  if(document.hidden||!this.visible||this.paused)return;
  const speaking=this.scene.host.speaking,target=this.scene.host.sampleEnergy()*RESPONSE;
  this.energy+=(target-this.energy)*(1-Math.exp(-dt/(target>this.energy?.055:.17)));
  if(!this.scene.reduced||speaking)this.time+=dt*(speaking?1.2:1);
  if(this.scene.reduced){this.root.x=0;this.root.y=0;}
  else{
   this.motionTime+=dt;
   const t=this.motionTime,quiet=this.phase===6,amplitude=quiet?3:this.phase===1?18:this.pose==='value proposition'?12:8;
   const cheerAge=this.cheerStarted?(now-this.cheerStarted)/1800:1;
   const hop=cheerAge<1?Math.pow(Math.sin(cheerAge*Math.PI*2),2)*(1-cheerAge)*34:0;
   if(this.pose==='QR code'){
    const nudge=(1-Math.cos(t*1.7))*6;
    const beside=this.phase===4||this.phase===9||(this.phase===8&&!this.scene.connected);
    this.root.x=beside?(this.phase===9?-nudge:nudge):Math.sin(t*.78)*2;
    this.root.y=beside?Math.sin(t*.78)*2:-nudge;
   }else{
    this.root.x=Math.sin(t*.78)*amplitude+Math.sin(t*1.31)*amplitude*.25;
    this.root.y=Math.sin(t*1.14)*(quiet?3:10)-hop;
   }
  }
  const age=this.revealStarted?(now-this.revealStarted)/1600:1;const bloom=age<1?Math.sin(Math.PI*age):0;
  this.node.shader.props.time=this.time;this.node.shader.props.energy=this.energy+bloom*BLOOM_ENERGY;this.node.shader.props.glow=GLOW+bloom*BLOOM_GLOW;
 }
 dispose(){this.revealSerial++;cancelAnimationFrame(this.frame);if(this.motion)this.motion.stop();this.root.destroy();}
}
