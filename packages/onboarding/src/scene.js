import { animateOwned } from './motion.js';
import { pillSurface } from './ui-surfaces.js';
import { HostOrb } from './host-orb.js';
import { shade,readability,inset,spinner,logoShadow,glow } from './effects.js';
import { textTexture,measureWidth } from './text.js';
import { Stage } from './stage.js';
import { AudioHost } from './audio.js';
import { games,phases } from './catalog.js';
import { openHub } from './hub-link.js';
const C={gold:0xffda0aff,cream:0xffdf72ff,white:0xf3f4f1ff,ink:0x0a0322ff,sky:0xade0ebff,green:0x32d172ff};
const EASE='cubic-bezier(.16,1,.3,1)';
// Puzzle board: sits under the clue while playing, then rises to centre stage
// on the reveal, when the clue and category are gone.
const BOARD_Y=472,BOARD_SOLVED_Y=380;
export class Scene {
 constructor(r,parent,profile){
  this.r=r;this.parent=parent;this.profile=profile;this.phase=-1;this.focus=0;this.selectedGame=0;this.connected=false;this.permission=false;this.member=false;this.correct=true;this.attempts=0;this.phoneStep='pair';this.voice='ready';this.scenario='happy';this.artOnly=false;this.accountMode='signup';this.hubZone=0;this.hubCol=0;this.generation=0;this.narrationSerial=0;this.timers=[];this.ghosts=[];this.buttons=[];this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.onchange=()=>{};this.host=new AudioHost();this.history=[];
  this.world=this.node({parent,w:1920,h:1080,color:C.ink});this.node({parent:this.world,w:1920,h:1080,src:'assets/studio-empty.png'});this.scenery=this.node({parent:this.world,w:1920,h:1080});this.stage=new Stage(this);
  this.bitmap(readability,0,0,1920,972,this.world);this.node({parent:this.world,y:810,w:1920,h:270,colorTop:0x04021300,colorBottom:0x04021322});
  this.ui=this.node({parent,w:1920,h:1080});this.brandHalo=logoShadow?this.bitmap(logoShadow,82.36,50.36,315.28,105.19,parent):null;this.brand=this.node({parent,w:288,h:78,src:'assets/weekend-logo.png',x:96,y:64});this.fx=this.node({parent,w:1920,h:1080});
  this.video=document.getElementById('ident');this.video.onended=()=>this.loading();this.video.onerror=()=>{this.started=false;this.video.style.display='none';this.go(1);};
  this.orb=new HostOrb(this);
  this.metrics={fps:0,worst:0,late:0,contextLost:false};this.frames=[];this.lastFrame=performance.now();this.monitor=()=>{const now=performance.now(),dt=now-this.lastFrame;this.lastFrame=now;if(!document.hidden){this.frames.push(dt);if(this.frames.length>120)this.frames.shift();if(dt>50)this.metrics.late++;this.metrics.worst=Math.max(this.metrics.worst,dt);}this.raf=requestAnimationFrame(this.monitor);};this.raf=requestAnimationFrame(this.monitor);
  r.on('fpsUpdate',(_,d)=>{if(d)this.metrics.fps=d.fps;});r.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.metrics.contextLost=true;this.host.stop();document.getElementById('boot').textContent='The TV renderer paused. Reload to recover.';document.getElementById('boot').hidden=false;});this.go(0,true);
 }
 bitmap(canvas,x,y,w,h,parent=this.ui){return this.node({parent,x,y,w,h,color:0xffffffff,texture:this.r.createTexture('ImageTexture',{src:canvas,premultiplyAlpha:true})});}
 node(p){return this.r.createNode(Object.assign({parent:this.ui,color:p.src?0xffffffff:p.colorTop!==undefined?p.colorTop:0},p));}
 box(x,y,w,h,top,bottom=top,radius=0,border=0,borderColor=0,parent=this.ui,shadow=null){const props={radius,'border-w':border,'border-color':borderColor,'border-gap':.001};if(shadow){props['shadow-projection']=shadow.projection;props['shadow-color']=shadow.color;}return this.node({parent,x,y,w,h,colorTop:top,colorBottom:bottom,shader:this.r.createShader(shadow?'roundedWithBorderAndShadow':'roundedWithBorder',props)});}
 text(text,x,y,size=40,color=C.white,w=1600,align='left',parent=this.ui,font='Repro',line=1.3,tracking=0,shadow=0){const canvas=textTexture(text,size,w,align,font,line,tracking,shadow),pad=canvas.pad||0;return this.node({parent,x:x-pad,y:y-pad,w:canvas.width,h:canvas.height,texture:this.r.createTexture('ImageTexture',{src:canvas,premultiplyAlpha:true}),color});}
 animate(n,props,duration=1100,delay=0,easing=EASE){return animateOwned(n,props,{duration,delay,easing,reduced:this.reduced});}
 later(fn,ms){const id=this.generation;this.timers.push(setTimeout(()=>{if(id===this.generation)fn();},ms));}
 say(line,next){const g=this.generation;this.host.say(line,()=>{
  if(g!==this.generation||next===undefined)return;
  if(typeof next==='function')next();else this.later(()=>this.go(next),650);
 });}
 random(a){return a[Math.floor(Math.random()*a.length)];}
 clearUI(instant=false){this.logo=null;this.logoHalo=null;this.buttons=[];this.ghosts.forEach(n=>n.destroy());this.ghosts=[];const old=this.ui;this.ui=this.node({parent:this.parent,w:1920,h:1080,zIndex:2});if(instant||this.reduced||this.phase===0)old.destroy();else{this.ghosts.push(old);this.animate(old,{alpha:0,scale:1.025,y:-20},700);setTimeout(()=>old.destroy(),750);}this.ui.alpha=this.artOnly?0:1;}
 reveal(delay=180){if(this.artOnly){this.ui.alpha=0;return;}this.ui.alpha=0;this.ui.y=35;this.animate(this.ui,{alpha:1,y:0},1100,delay);this.readyAt=performance.now()+(this.reduced?0:delay+1050);}
 brandFor(p){this.brand.alpha=p===0||this.artOnly?0:1;this.brand.x=78;this.brand.y=42;this.brand.w=205;this.brand.h=56;this.brand.zIndex=4;if(this.brandHalo){const scale=this.brand.w/950;this.brandHalo.x=this.brand.x-90*scale;this.brandHalo.y=this.brand.y-90*scale;this.brandHalo.w=1130*scale;this.brandHalo.h=437*scale;this.brandHalo.alpha=this.brand.alpha;this.brandHalo.zIndex=3;}this.fx.zIndex=5;}
 go(p,instant=false){
  const prior=this.phase,same=prior>=4&&prior<=6&&p>=4&&p<=6;this.generation++;this.timers.forEach(clearTimeout);this.timers=[];this.cancelHold();this.stopCelebration();this.host.stop();this.host.bed(false);this.video.pause();this.video.style.display='none';this.phase=p;this.focus=0;this.voice='ready';this.busy=false;this.readyAt=0;this.micHinted=false;this.stopDots();this.history.push({scene:phases[p],atMs:Math.round(performance.now())});if(this.history.length>100)this.history.shift();
  if(!same)this.clearUI(instant);this.brandFor(p);this.orb.layout(p,instant);const set=p<=1?'empty':p<=3?'jeopardy':p<=7?'wheel':'empty',delay=this.stage.change(set,instant);
  this.animate(this.world,{alpha:p===0?0:p===8||p===9?.45:1},900);
  if(p===0){this.started=false;this.isLoading=false;this.node({w:1920,h:1080,src:'assets/ident-final.jpg'});this.pill('Begin with sound',708.23,853.65,503.54,92.7,()=>this.start(),true,30,'OK / Enter');}
  if(p===1&&prior===0&&!this.reduced){const dissolve=this.node({parent:this.parent,w:1920,h:1080,zIndex:7,src:'assets/ident-final.jpg'});this.animate(dissolve,{alpha:0},1800,0,'ease-in-out');setTimeout(()=>dissolve.destroy(),1850);}
  if(p===2)this.jeopardy();
  if(p===3){this.text(this.correct?'THAT’S THE ONE!':'A GREAT WARM-UP',144,375,28,C.sky,1632,'center',this.ui,'ReproMedium',1.3,3);this.text('Mars.',144,435,170,C.gold,1632,'center',this.ui,'ReproBold',1.1,-6);this.host.cue(this.correct?'cheer':'almost');if(this.correct)this.celebrate();}
  if(p>=4&&p<=6){if(!same)this.wheel();this.pairStatus();}
  if(p===7){this.wheelSolved();this.phoneStep='voice-success';this.host.cue('cheer');this.celebrate();}
  if(p===8){this.plan();this.phoneStep='dpad';}
  if(p===9){this.finishPhone();this.phoneStep='getstarted';if(navigator.vibrate)navigator.vibrate([100,60,100]);document.getElementById('phone').hidden=false;}
  if(p===10){this.membership();this.phoneStep='success';this.host.cue('cheer');this.celebrate();}
  if(p!==0&&!same&&!instant)this.reveal(delay||180);if(this.buttons.length)this.setFocus(this.focus,true);this.onchange();if(p===1&&!instant){const serial=this.narrationSerial;this.later(()=>{if(serial===this.narrationSerial&&!document.hidden)this.narrate();},this.reduced?1250:2250);}else this.narrate();
 }
 narrate(){this.narrationSerial++;const p=this.phase;if(p===1)this.say('Hi friend. Welcome to Weekend. Get comfortable, and let your voice do the playing. A little music, a little trivia, and a few surprises. Ready? Your next great game night starts here.',2);
  if(p===2){this.host.bed(true);this.say('On Weekend, discover puzzles and games, with fresh challenges every week. Now try this one. Which planet is known as the Red Planet? Venus, Mars, Jupiter, or Mercury. What’s your answer?');}
  if(p===3)this.say(this.correct?this.random(['That’s right! Mars. What a start!','You nailed it! Mars is the Red Planet.','Yes! Mars. You’re already on a roll.']):this.random(['Almost there! It’s Mars. That was just our warm-up.','Good try! The answer is Mars. Let’s give you another one.','You’re in the game! That one was Mars. Ready for something different?']),4);
  if(p===4)this.say('Now, let’s make it even more natural. On Weekend, you can use your voice to answer. Black and white, wild all over. Do you know this animal? Scan the code to give it a go.');
  if(p===5)this.say('Your phone is the buzzer and the microphone during the game. Allow microphone access so your answer can reach the TV.');
  if(p===6)this.say('Nice work! When you’re ready, press and hold the mic button on your phone, say your answer, then let go.',()=>this.revealMicHint());
  if(p===7)this.say(this.random(['Zebra! You’ve got it. Now that sounds like a game show answer!','That’s it! Zebra. You’re a natural.','Yes! Zebra. Give yourself a big round of applause!']),8);
  if(p===8)this.say('Great job! Sounds like you’re ready to play. Let’s get your Weekend plan started. One subscription, all our games. Choose Sign In on Your Phone, or take a look around.');
  if(p===9)this.say('Finish on your phone. Your free week is just a few taps away.');
  if(p===10)this.say('Welcome to the club! Your Weekend membership is ready. Let’s find your next game.');
 }
 pill(label,x,y,w,h,action,selected=false,size=30,suffix=''){
  const root=this.node({x,y,w,h}),normal=this.bitmap(pillSurface(w,h,false),-36,-36,w+72,h+72,root),active=this.bitmap(pillSurface(w,h,true,false),-36,-36,w+72,h+72,root);normal.alpha=selected?0:1;active.alpha=selected?1:0;
  const text=this.text(label,suffix?28:0,(h-size*1.2)/2,size,selected?C.ink:C.white,suffix?w-165:w,'center',root,'ReproMedium',1.2),hint=suffix?this.text(suffix,w-180,(h-27)/2,22,selected?0x0a0322a6:0xf3f4f1a6,158,'center',root,'ReproMedium'):null;
  this.buttons.push({n:root,normal,active,t:text,hint,action,type:'pill',x,y,w,h});return root;
 }
 setFocus(i,instant=false){this.focus=Math.max(0,Math.min(i,this.buttons.length-1));this.buttons.forEach((b,j)=>{const active=j===this.focus;if(b.type==='answer'){b.bg.colorTop=active?0xfff09eff:0x253fc7ff;b.bg.colorBottom=active?C.gold:0x15277cff;b.bg.shader.props['border-color']=active?0xfff4d5ff:0x6a84dfff;this.animate(b.glowNode,{alpha:active?1:0},instant?0:220);b.t.color=active?C.ink:0xfff4d5ff;b.badge.color=active?0x0a0322a6:0xfff4d5a6;b.circle.shader.props['border-color']=active?0x0a0322a6:0xfff4d5a6;}else{b.normal.alpha=active?0:1;b.active.alpha=active?1:0;b.t.color=active?C.ink:C.white;if(b.hint)b.hint.color=active?0x0a0322a6:0xf3f4f1a6;}if(b.focused!==active||instant)this.animate(b.n,{scale:active?(b.type==='answer'?1.03:this.phase===0?1:1.03):1},instant?0:220);b.focused=active;});this.onchange();}
 jeopardy(){
  this.box(396,246,1128,511.53,0,0,19,2,0xd8b866aa,this.ui,{color:0x00000077,projection:[0,28,65,0]});
  this.box(398,248,1124,507.53,0,0,17,7,0x04072bff);
  this.box(405,255,1110,493.53,0x101a95f7,0x080d52fa,11,2,0x5d81faff);
  this.node({parent:this.ui,x:451,y:276,w:165,h:48,src:'assets/logos/jeopardy.png'});this.text('SCIENCE',1215,282,28,C.cream,254,'right',this.ui,'Repro',1.32,3);this.node({x:441,y:345,w:1038,h:1,color:0x7894ed55});
  this.text('Which planet is known\nas the Red Planet?',441,364,58,C.white,1038,'center',this.ui,'Korinna',1.16,-1.6);
  ['Venus','Mars','Jupiter','Mercury'].forEach((label,i)=>{const x=441+(i%2)*527,y=524.53+Math.floor(i/2)*104,w=511,h=88,root=this.node({x,y,w,h});const halo=glow(w,h,8,'rgba(255,230,40,.95)',30),glowNode=this.bitmap(halo,-halo.pad,-halo.pad,halo.width,halo.height,root);glowNode.alpha=0;
  const bg=this.box(0,0,w,h,0x253fc7ff,0x15277cff,8,2,0x6a84dfff,root);const circle=this.box(26,23,42,42,0,0,21,2,0xfff4d5a6,root),badge=this.text('ABCD'[i],26,29,22,0xfff4d5a6,42,'center',root,'ReproMedium',1.2),t=this.text(label,96,22,33,0xfff4d5ff,380,'left',root,'ReproMedium',1.3);this.buttons.push({n:root,bg,glowNode,circle,badge,t,type:'answer',action:()=>this.submit(i),x,y,w,h});});this.setFocus(0);
 }
 submit(i){if(this.busy||performance.now()<this.readyAt)return;this.busy=true;this.correct=this.scenario!=='wrong'&&i===1;this.host.stop();this.host.bed(false);this.buttons.forEach((b,j)=>{if(j!==i){this.animate(b.n,{alpha:.3,scale:.97},220);}else{b.bg.colorTop=C.gold;b.bg.colorBottom=C.gold;}});this.later(()=>this.go(3),600);}
 // Pairing and solved states share the same board geometry and stage anchor.
 board(x,y,solved=false){const w=698,h=188,tw=116,th=138,gap=14,pad=31;
  const wrap=this.node({parent:this.ui,x,y,w,h});
  const halo=glow(w+14,h+14,20,'rgba(64,238,168,.95)',40);
  this.bitmap(halo,-7-halo.pad,-7-halo.pad,halo.width,halo.height,wrap);
  this.box(-7,-7,w+14,h+14,0x071f20ff,0x071f20ff,20,0,0,wrap);
  const root=this.box(0,0,w,h,0x113e39ff,0x041d22ff,14,3,0xdfbf74ff,wrap);[...'ZEBRA'].forEach((l,i)=>{const missing=i%2===1,fill=missing?(solved?0xfff4c7ff:0x167c67ff):C.white;const tile=this.box(pad+i*(tw+gap),25,tw,th,fill,missing&&!solved?0x0f6556ff:fill,0,5,0x1a423aff,root);if(missing&&!solved)this.bitmap(inset,4,4,tw-8,th-8,tile);if(!missing||solved){this.node({parent:tile,x:5,y:th-13,w:tw-10,h:8,color:missing?0xddd099ff:0xc4d1c7ff});this.text(l,0,(th-88)/2,88,C.ink,tw,'center',tile,'ReproBold',1);}if(solved&&missing&&!this.reduced){tile.scaleX=.035;this.animate(tile,{scaleX:1},750,200+i*140);}});
  return wrap;
 }
 wheel(){this.archLogo();this.bitmap(shade,424,220,1072,480);this.text('ANIMAL',424,286,32,0xead99fff,1072,'center',this.ui,'Repro',1.32,6,10);this.text('Black and white.\nWild all over.',424,344,49,C.white,1072,'center',this.ui,'SerifBold',1.13,-1);this.board(611,BOARD_Y);this.side=null;}
 pairStatus(){
  if(this.side)this.side.destroy();this.side=null;
  this.stopDots();if(this.bubble)this.bubble.destroy();this.bubble=null;
  // Phase 4 keeps the pairing QR — that's the handoff, not a mic prompt.
  if(this.phase===4){
   this.side=this.node({parent:this.ui,x:1480,y:422.86,w:280,h:357});const p=this.side;
   this.box(0,0,280,357,0x041c25ed,0x041c25ed,24,1,0xe4c77966,p,{color:0x00000055,projection:[0,15,48,0]});
   this.box(18,23,244,244,C.white,C.white,18,0,0,p);
   this.node({parent:p,x:31,y:36,w:218,h:218,src:'assets/pairing-qr.png'});
   this.text(this.phoneStep==='download'?'Continue on your phone':'Scan to answer',15,290,25,C.white,250,'center',p,'ReproMedium',1.25);
   return;
  }
  // From the mic step on, the host speaks for itself. No panel parked on the
  // stage — the prompt sits in a bubble above the orb, where the eye already is.
  if(this.phase!==6)return;
  if(this.voice==='listening')this.bubble=this.orbBubble('Listening',true);
  else if(this.voice==='processing')this.bubble=this.orbBubble('Got it');
  else if(this.micHinted)this.bubble=this.orbBubble('Press and hold the mic button to answer');
 }
 /** Shown once the host has finished asking for it, so it doesn't pre-empt the line. */
 revealMicHint(){if(this.phase!==6||this.voice!=='ready')return;this.micHinted=true;this.pairStatus();this.onchange();}
 /**
  * Speech bubble above the host orb. The orb's node box is 320x320 at y710,
  * but the sphere it draws inside that is far smaller — its top edge is nearer
  * y820 — so the bubble sits low enough to point at the orb without running
  * into the puzzle board above it. Sized to its text, so one call handles both
  * the prompt and the short listening state. `dots` animates an ellipsis.
  */
 orbBubble(label,dots=false){
  const size=30,padX=36,h=76,baseline=(h-size*1.25)/2;
  const textW=Math.ceil(measureWidth(label,size,'ReproMedium')),
        dotW=dots?Math.ceil(measureWidth('.',size,'ReproMedium')):0,
        w=textW+dotW*3+padX*2,x=Math.round(960-w/2),y=795-h;
  const root=this.node({parent:this.ui,x,y,w,h});
  this.box(0,0,w,h,0x1a0f44f2,0x0a0322f2,h/2,2,0xffda0a59,root,{color:0x00000073,projection:[0,12,38,0]});
  // Tail: a square stood on its corner, half-buried in the bubble.
  const tail=this.node({parent:root,x:w/2-11,y:h-13,w:22,h:22,color:0x0a0322f2,pivot:.5});
  tail.rotation=Math.PI/4;
  this.text(label,padX,baseline,size,C.white,textW+6,'left',root,'ReproMedium',1.25);
  if(dots){
   // Typed periods rather than drawn circles, so the ellipsis carries the same
   // weight as the label. The bubble is sized for all three up front, so
   // nothing reflows as they come and go.
   const lamps=[0,1,2].map(i=>this.text('.',padX+textW+i*dotW,baseline,size,C.white,dotW+6,'left',root,'ReproMedium',1.25));
   let step=0;
   const tick=()=>{lamps.forEach((n,i)=>{n.alpha=i<=step?1:0;});step=(step+1)%3;};
   tick();this.dotsTimer=setInterval(tick,340);
  }
  root.alpha=0;this.animate(root,{alpha:1},420);
  return root;
 }
 stopDots(){clearInterval(this.dotsTimer);this.dotsTimer=null;}
 wheelSolved(){
  this.archLogo();
  const board=this.board(611,BOARD_SOLVED_Y,true);
  // Carry it up from the puzzle position so the reveal reads as one move
  // rather than a cut.
  if(!this.reduced){board.y=BOARD_Y;this.animate(board,{y:BOARD_SOLVED_Y},950);}
 }
 /** The Wheel of Fortune logotype, seated on the crown of the stage arch. */
 archLogo(){this.node({parent:this.ui,x:775,y:96,w:370,h:139,src:'assets/logos/wheel-of-fortune.png'});}
 plan(){this.text('WEEKEND PREMIUM',144,262.7,24,C.sky,1632,'left',this.ui,'ReproMedium',1.3,3);this.text('One subscription.',144,313.7,80,C.white,1280,'left',this.ui,'ReproBold',1.06,-1.6);this.text('Every game night.',144,398.5,80,C.gold,1280,'left',this.ui,'ReproBold',1.06,-1.6);const view=this.node({x:144,y:508.3,w:1632,h:261,clipping:true});const rail=this.node({parent:view,x:0,y:20,w:3930,h:207});[0,2,1,3,4,0,2,1,3,4].forEach((id,i)=>this.box(i*393,0,365,207,0xffffffff,0xffffffff,24,2,0xffffff3d,rail));rail.children.forEach((n,i)=>{n.src='assets/hub/'+games[[0,2,1,3,4][i%5]][1]+'.png';});if(!this.reduced)rail.animate({x:-1965},{duration:34000,easing:'linear',loop:true}).start();this.node({parent:view,x:0,y:0,w:82,h:261,colorLeft:0x0a0322cc,colorRight:0x0a032200});this.node({parent:view,x:1550,y:0,w:82,h:261,colorLeft:0x0a032200,colorRight:0x0a0322cc});this.pill('Sign In on Your Phone',144,789.3,380.56,88,()=>this.go(9),true);this.pill('See All Games',550.56,789.3,275,88,()=>this.browse());}
 finishPhone(){this.box(820,283.125,280,280,C.white,C.white,26);this.node({x:837,y:300.125,w:246,h:246,src:'assets/pairing-qr.png'});this.text('Finish on your phone,\nor scan the QR code.',310,603.125,59,C.white,1300,'center',this.ui,'ReproBold',1.12,-1.6);this.pill('Skip for Now',830,775.28,260,81.6,()=>this.browse(),false,28);}
 membership(){this.box(460,267.5,1000,604.984,0x1f1150f5,0x0a0322f8,38,2,0xffda0a66,this.ui,{color:0xffda0a24,projection:[0,0,110,0]});this.box(910,331.5,100,100,C.green,C.green,50);this.text('✓',910,345.5,54,0x071c10ff,100,'center',this.ui,'ReproBold');this.text('PAYMENT SUCCESSFUL · DEMO',524,459.5,24,C.sky,872,'center',this.ui,'ReproMedium',1.3,3);this.text('Welcome to',524,518.5,80,C.white,872,'center',this.ui,'ReproBold',1.12,-1.6);this.text('Weekend.',524,608.1,80,C.gold,872,'center',this.ui,'ReproBold',1.12,-1.6);this.text('Your membership is ready. All 20 games are yours.',524,729.69,32,0xe1deebff,872,'center',this.ui,'Repro',1.4);this.pill('Find Your Next Game',730,800,460,88,()=>this.browse(),true);}

 start(){if(this.started||this.isLoading)return;this.started=true;this.host.unlock();this.video.muted=!this.host.enabled;this.video.currentTime=0;this.video.style.display='block';const p=this.video.play();if(p&&p.catch)p.catch(()=>{this.started=false;this.video.style.display='none';});}
 loading(){if(this.phase!==0||this.isLoading)return;this.isLoading=true;this.video.style.display='none';this.clearUI(true);this.node({w:1920,h:1080,src:'assets/ident-final.jpg'});const ring=this.bitmap(spinner,930,790,52,52);ring.animate({rotation:Math.PI*2},{duration:800,easing:'linear',loop:true}).start();this.later(()=>this.go(1),2000);}
 scan(){this.phoneStep='download';this.pairStatus();this.say('Download the Weekend app on your phone to continue.');this.onchange();}
 openApp(){this.connected=true;this.phoneStep='rationale';this.go(5);}
 micAllowed(){this.connected=true;this.permission=true;this.phoneStep='mic';this.go(6);}
 startHold(){if(this.phase!==6||!this.permission||this.holdAt||this.voice==='processing')return;this.host.stop();this.voice='listening';this.holdAt=performance.now();this.pairStatus();this.holdTimer=setTimeout(()=>this.endHold(),10000);}
 cancelHold(){clearTimeout(this.holdTimer);this.holdAt=0;if(this.voice==='listening'){this.voice='ready';if(this.phase===6){this.pairStatus();this.onchange();}}}
 endHold(){if(!this.holdAt)return;const ms=performance.now()-this.holdAt;clearTimeout(this.holdTimer);this.holdAt=0;this.attempts++;if(ms<650&&this.attempts<3){this.voice='ready';this.pairStatus();this.onchange();this.say('Press and hold the mic button on your phone, and speak your answer.',()=>this.revealMicHint());return;}this.voice='processing';this.pairStatus();this.onchange();this.later(()=>this.go(7),900);}
 buy(){this.member=true;this.go(10);}
 browse(){openHub();}
 move(key){if(this.artOnly||this.busy||performance.now()<this.readyAt)return;if(key==='back'){if(this.phase===9||this.phase===10)this.go(8);else if(this.phase===8){this.phoneStep='pair';this.go(4);}else if(this.phase>=4&&this.phase<=6){this.phoneStep='pair';this.go(4);}else if(this.phase>1)this.go(this.phase-1);return;}
  if(key==='enter'){const b=this.buttons[this.focus];if(b)b.action();return;}let f=this.focus;if(this.phase===2){if(key==='left'&&f%2)f--;if(key==='right'&&f%2===0)f++;if(key==='up'&&f>1)f-=2;if(key==='down'&&f<2)f+=2;}else f=key==='left'||key==='up'?0:1;if(this.buttons.length)this.setFocus(f);
 }
 click(x,y){if(this.artOnly||this.busy||performance.now()<this.readyAt)return;for(let i=0;i<this.buttons.length;i++){const b=this.buttons[i];if(x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h){this.focus=i;b.action();return;}}}
 stopCelebration(){cancelAnimationFrame(this.confettiFrame);this.fx.children.slice().forEach(n=>n.destroy());}
 celebrate(){this.stopCelebration();if(this.reduced)return;const palette=[C.gold,C.gold,0xffe778ff,0xfff5d4ff,0xff79c6ff,0x6bdbedff,0xae91ffff],between=(a,b)=>a+Math.random()*(b-a),particles=[];for(let source=0;source<3;source++){for(let i=0;i<(source===2?44:110);i++){const center=source===2,angle=center?between(0,Math.PI*2):between(-1.35,-.55),speed=center?between(280,680):between(1080,1740),w=between(8,17),h=i%8===0?between(25,40):between(10,22),color=palette[Math.floor(Math.random()*palette.length)];const n=this.node({parent:this.fx,w,h,color,pivot:.5,alpha:0});const glint=this.node({parent:n,w,h:2,color:0xffffff47,alpha:0});particles.push({n,glint,x:center?960:source===0?115:1805,y:center?580:1090,vx:Math.cos(angle)*speed*(source===1?-1:1),vy:Math.sin(angle)*speed,rotation:between(0,Math.PI*2),spin:between(-9,9),flutter:between(7,13),delay:center?0:i<80?between(0,.045):between(.13,.20),age:0,life:between(2.7,3.5)});}}
  let previous=performance.now(),elapsed=0;const render=now=>{if(document.hidden){this.stopCelebration();return;}const dt=Math.min((now-previous)/1000,.04);previous=now;elapsed+=dt;for(const p of particles){if(elapsed<p.delay)continue;p.age+=dt;if(p.age>p.life||p.y>1160){p.n.alpha=0;continue;}p.vx*=Math.exp(-1.65*dt);p.vy+=1030*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.rotation+=p.spin*dt;const f=Math.cos(p.age*p.flutter+p.rotation);p.n.x=p.x+Math.sin(p.age*6+p.rotation)*7;p.n.y=p.y;p.n.rotation=p.rotation;p.n.scaleY=Math.max(.16,Math.abs(f));p.n.alpha=Math.min(1,(p.life-p.age)/.6);p.glint.alpha=f>.65?1:0;}if(elapsed<3.8)this.confettiFrame=requestAnimationFrame(render);else this.stopCelebration();};this.confettiFrame=requestAnimationFrame(render);
 }
 reset(){this.member=false;this.connected=false;this.permission=false;this.attempts=0;this.phoneStep='pair';this.artOnly=false;document.getElementById('caption').style.visibility='visible';const art=document.getElementById('artOnly');if(art)art.textContent='Stage Art Only';this.go(0,true);}
 replayStage(){const delay=this.stage.replay();this.reveal(delay);}
 toggleArt(){this.artOnly=!this.artOnly;this.ui.alpha=this.artOnly?0:1;this.brandFor(this.phase);this.orb.layout(this.phase,true);document.getElementById('caption').style.visibility=this.artOnly?'hidden':'visible';}
 pause(){this.narrationSerial++;this.cancelHold();this.stopCelebration();this.host.stop();this.host.bed(false);this.video.pause();this.orb.settle();this.stage.settle();}
 resume(){if(this.phase===0&&this.started){if(this.video.ended)this.loading();else this.video.play().catch(()=>{});}else this.narrate();}
 dispose(){this.stopDots();this.stage.dispose();this.orb.dispose();this.host.dispose();this.timers.forEach(clearTimeout);this.stopCelebration();cancelAnimationFrame(this.raf);}
}
