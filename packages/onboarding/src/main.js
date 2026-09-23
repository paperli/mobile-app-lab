import 'core-js/stable';
import { prepareEffects } from './effects.js';
import { prepareFonts } from './text.js';
import { OrbShader, CanvasOrbShader } from './orb-shader.js';
import Blits from '@lightningjs/blits';
import { renderer } from 'blits-renderer';
import { Scene } from './scene.js';
import { setupPhone } from './phone.js';
import { setupHubBridge } from './hub-bridge.js';
import { createPhoneModal,fitStage,STAGE_W,STAGE_H,FRAME_BEZEL,FRAME_CHIN,TV_FRAME_CHROME } from '@weekend/ui/device';
import { hubUrl } from './hub-link.js';
import { phases } from './catalog.js';
import '@weekend/ui/device/phone-modal.css';
import './fonts.css';
import './style.css';
import './phone-bridge.css';
import './journey.css';
import './tv-frame.css';

const query=new URLSearchParams(location.search),profile=query.get('quality')==='1080'?'1080':'720';
let scene;
const tv=document.getElementById('tv'),controls=document.getElementById('controls');
const stage=document.getElementById('tvStage'),tvFrame=document.getElementById('tvFrame'),
      led=document.getElementById('tvLed'),tools=document.getElementById('tools');
// The phone simulator is the shared draggable modal; it creates its own
// element (keeping the id `phone`, which style.css still targets).
const phoneModal=createPhoneModal({id:'phone',title:'Phone simulator',width:300,onClose:()=>scene?.cancelHold()});
// Review toolbar hides before the first fit, so its band isn't reserved.
if(query.has('clean'))document.body.classList.add('clean');

const CONTROL_GAP=14;
function fit(){
 // Whether we frame depends only on viewport size, so settle that first — the
 // control bar only drops below the TV once `framed` is on, and its height has
 // to come off the stage before scaling.
 const framed=fitStage(innerWidth,innerHeight,true).framed;
 document.body.classList.toggle('framed',framed);
 const band=framed&&!document.body.classList.contains('clean')
  ? tools.getBoundingClientRect().height+CONTROL_GAP : 0;
 const {scale}=fitStage(innerWidth,innerHeight,true,{h:band});
 const w=Math.round(STAGE_W*scale),h=Math.round(STAGE_H*scale);
 tv.style.width=w+'px';tv.style.height=h+'px';
 stage.style.background=framed?TV_FRAME_CHROME.pageBackground:'#000';
 if(framed){
  Object.assign(tvFrame.style,{
   width:w+FRAME_BEZEL*2+'px',
   height:h+FRAME_BEZEL*2+FRAME_CHIN+'px',
   padding:FRAME_BEZEL+'px '+FRAME_BEZEL+'px '+(FRAME_BEZEL+FRAME_CHIN)+'px',
   borderRadius:TV_FRAME_CHROME.radius+'px',
   background:TV_FRAME_CHROME.background,
   border:TV_FRAME_CHROME.border,
   boxShadow:TV_FRAME_CHROME.shadow,
  });
  tv.style.borderRadius=TV_FRAME_CHROME.screenRadius+'px';
  tv.style.boxShadow=TV_FRAME_CHROME.screenShadow;
  Object.assign(led.style,{
   bottom:(FRAME_BEZEL+FRAME_CHIN)/2-3+'px',
   width:TV_FRAME_CHROME.ledSize+'px',height:TV_FRAME_CHROME.ledSize+'px',
   background:TV_FRAME_CHROME.ledBackground,boxShadow:TV_FRAME_CHROME.ledShadow,
  });
 }else{
  tvFrame.removeAttribute('style');
  tv.style.borderRadius='';tv.style.boxShadow='';
 }
 const c=document.getElementById('caption');
 c.style.left=190*scale+'px';c.style.right=190*scale+'px';c.style.bottom=77*scale+'px';
 c.style.fontSize=25*scale+'px';c.style.padding=18*scale+'px '+30*scale+'px';
}
fit();
// The toolbar's height isn't final until it has laid out once.
requestAnimationFrame(fit);
window.addEventListener('resize',fit);
function toggleControls(){controls.hidden=!controls.hidden;if(document.activeElement)document.activeElement.blur();if(!controls.hidden&&controls.querySelector('button'))controls.querySelector('button').focus();}
function togglePhone(){phoneModal.toggle();if(document.activeElement)document.activeElement.blur();if(phoneModal.isOpen){const first=phoneModal.screen.querySelector('button');(first||phoneModal.el.querySelector('.wk-phone__bar')).focus();}}
document.getElementById('hubLink').href=hubUrl();
document.getElementById('controlsToggle').onclick=toggleControls;
document.getElementById('phoneToggle').onclick=togglePhone;
function route(key){if(!scene)return;if(key==='tools'){toggleControls();return;}if(key==='phone'){togglePhone();return;}scene.host.unlock();scene.move(key);}
const App=Blits.Application({
 template:`<Element w="1920" h="1080"><Element ref="World" w="1920" h="1080" /></Element>`,
 hooks:{async ready(){
  await Promise.all([prepareFonts(),prepareEffects()]);
  scene=new Scene(renderer,this.$select('World').node,profile);window.weekendLab={getState:()=>({phase:scene.phase,phaseName:phases[scene.phase],focus:scene.focus,connected:scene.connected,member:scene.member,attempts:scene.attempts}),renderer:'Lightning 3 + Blits',quality:profile};
  setupHubBridge(scene);
  const renderPhone=setupPhone(scene,phoneModal);scene.onchange=renderPhone;renderPhone();setupControls();
  document.getElementById('boot').hidden=true;
  renderer.canvas.addEventListener('click',e=>{const r=tv.getBoundingClientRect();scene.host.unlock();scene.click((e.clientX-r.left)/r.width*1920,(e.clientY-r.top)/r.height*1080);});
  if(query.get('scene')){const p=Number(query.get('scene'));if(p>=0&&p<phases.length)scene.go(p);}
  this.$focus();
 },destroy(){if(scene)scene.dispose();}},
 input:{intercept(e){const t=e.target;if(t&&t.closest&&t.closest('#phone,#controls'))return false;return e;},up(){route('up');},down(){route('down');},left(){route('left');},right(){route('right');},enter(){route('enter');},back(){route('back');},tools(){route('tools');},phone(){route('phone');}}
});

// Keep DOM form input out of the TV focus graph. TV and PC events otherwise
// use the same Blits input path, including Samsung/webOS/Android Back codes.
document.addEventListener('keydown',e=>{const t=e.target,panel=t.closest?t.closest('#phone,#controls'):null;if(!panel&&[8,13,27,37,38,39,40,461,10009].indexOf(e.keyCode)>=0)e.preventDefault();if(panel){if([8,27,461,10009,403,82].indexOf(e.keyCode)>=0&&t.tagName!=='INPUT'){e.preventDefault();panel.hidden=true;t.blur();return;}if([37,38,39,40].indexOf(e.keyCode)>=0&&t.tagName!=='SELECT'&&t.tagName!=='INPUT'){e.preventDefault();const all=Array.from(panel.querySelectorAll('button,input,select')),i=all.indexOf(t),step=e.keyCode===37||e.keyCode===38?-1:1;all[(i+step+all.length)%all.length].focus();}}});
try{
 Blits.Launch(App,document.getElementById('app'),{
  w:1920,h:1080,renderQuality:profile==='720'?2/3:1,pixelRatio:1,screenResolution:'fhd',
  renderMode:query.get('renderer')==='canvas'?'canvas':'webgl',maxFPS:60,webWorkersLimit:0,
  textureProcessingTimeLimit:3,gpuMemory:{max:96,target:.65,baseline:12,cleanupInterval:1500,strict:false},
  shaders:[{name:'speakingHost',type:query.get('renderer')==='canvas'?CanvasOrbShader:OrbShader}],
  fonts:[{family:'Repro',type:'web',file:'assets/fonts/WeekendRepro-Regular.woff2'},{family:'ReproMedium',type:'web',file:'assets/fonts/WeekendRepro-Medium.woff2'},{family:'ReproBold',type:'web',file:'assets/fonts/WeekendRepro-Bold.woff2'},{family:'Serif',type:'web',file:'assets/fonts/GT-Super-Text-Book.woff2'}],defaultFont:'Repro',
  keymap:{8:'back',27:'back',461:'back',10009:'back',4:'back',80:'tools',82:'tools',77:'phone',403:'tools',404:'phone'},inputThrottle:110,
  advanced:{createImageBitmapSupport:'auto',forceWebGL2:false},debugLevel:0,
 });
}catch(e){const boot=document.getElementById('boot');boot.textContent='WebGL could not start in this browser.';const b=document.createElement('button');b.textContent='Try Canvas fallback';b.onclick=()=>{query.set('renderer','canvas');location.search=query.toString();};boot.appendChild(b);b.focus();console.error(e);}

function setupControls(){
 controls.innerHTML='<h2>Studio rehearsal</h2><label>Scenario<select id="scenario"><option value="happy">Happy path</option><option value="wrong">Wrong remote answer</option><option value="denied">Microphone denied</option></select></label><div class="rehearsal"><button id="replayHost">Replay Host</button><button id="celebration">Preview Celebration</button><button id="replayStage">Replay Stage Build</button><button id="artOnly">Stage Art Only</button><button id="previous">Previous Scene</button></div><div class="scenes">'+[0,1,2,4,6,8,9,10].map(i=>'<button data-scene="'+i+'">'+phases[i]+'</button>').join('')+'</div><label>Render resolution<select id="quality"><option value="720">720p · older TVs</option><option value="1080">1080p · compare</option></select></label><label>Host voice & sound<input type="checkbox" id="sound" checked></label><label>Captions<input type="checkbox" id="captions"></label><label>Reduced motion<input type="checkbox" id="motion"></label><button id="stress">Loop stage transitions × 5</button> <button id="fullscreen">Fullscreen</button><pre id="stats"></pre><button id="export">Download diagnostics</button> <button id="reset">Restart</button><p>Arrow keys / D-pad · Enter / OK · Esc / Back<br>P / Menu / red: controls · M / green: phone<br>Add ?clean=1 to hide the review toolbar.</p><p>TV UI: Lightning 3 + Blits. Legacy bundle targets Chrome 53+. Compatibility must be verified on hardware. Host voice uses recorded ElevenLabs takes (Riyadh 2) for every scripted prompt, falling back to timed captions if media playback is blocked. Orb motion follows audio for recorded takes and estimated timing for caption-only prompts; music and cheers are synthesized placeholders. Phone pairing, microphone, account and checkout are local simulations.</p><p>QR represents pair.weekend.com with code WKND42. Use the phone simulator for camera, App Clip, download, checkout, hub navigation and the voice puzzle. The hub runs in a separate embedded bundle.</p>';
 document.getElementById('scenario').onchange=e=>{scene.scenario=e.target.value;scene.reset();};document.getElementById('replayHost').onclick=()=>{scene.host.unlock();scene.narrate();};document.getElementById('celebration').onclick=()=>{scene.host.unlock();scene.host.cue('cheer');scene.celebrate();};document.getElementById('replayStage').onclick=()=>{scene.replayStage();controls.hidden=true;};document.getElementById('artOnly').onclick=e=>{scene.toggleArt();e.target.textContent=scene.artOnly?'Show Puzzle UI':'Stage Art Only';};document.getElementById('previous').onclick=()=>scene.move('back');document.getElementById('quality').value=profile;document.getElementById('motion').checked=scene.reduced;
 controls.addEventListener('click',e=>{const b=e.target.closest('[data-scene]');if(!b)return;clearInterval(stressTimer);scene.connected=false;scene.phoneStep='pair';if(Number(b.dataset.scene)===6){scene.connected=true;scene.permission=true;scene.phoneStep='mic';}scene.host.unlock();scene.go(Number(b.dataset.scene));controls.hidden=true;b.blur();});
 document.getElementById('quality').onchange=e=>{query.set('quality',e.target.value);location.search=query.toString();};
 document.getElementById('sound').onchange=e=>{scene.host.enabled=e.target.checked;scene.host.unlock();scene.video.muted=!scene.host.enabled;document.getElementById('soundTop').textContent=scene.host.enabled?'Sound On':'Sound Off';scene.narrate();};
 document.getElementById('captions').onchange=e=>{scene.host.captions=e.target.checked;scene.narrate();};
 document.getElementById('motion').onchange=e=>{scene.reduced=e.target.checked;};
 document.getElementById('fullscreen').onclick=()=>{const active=document.fullscreenElement||document.webkitFullscreenElement,owner=active?document:document.documentElement,f=active?(document.exitFullscreen||document.webkitExitFullscreen):(owner.requestFullscreen||owner.webkitRequestFullscreen);if(f){const result=f.call(owner);if(result&&result.catch)result.catch(()=>{});}};
 document.getElementById('reset').onclick=()=>{clearInterval(stressTimer);scene.reset();};document.getElementById('resetTop').onclick=document.getElementById('reset').onclick;
 document.getElementById('soundTop').onclick=()=>{scene.host.enabled=!scene.host.enabled;scene.host.unlock();scene.video.muted=!scene.host.enabled;document.getElementById('sound').checked=scene.host.enabled;document.getElementById('soundTop').textContent=scene.host.enabled?'Sound On':'Sound Off';scene.narrate();};document.getElementById('fullTop').onclick=document.getElementById('fullscreen').onclick;let stressTimer,stressCount=0;document.getElementById('stress').onclick=()=>{clearInterval(stressTimer);stressCount=0;scene.go(2);stressTimer=setInterval(()=>{stressCount++;if(stressCount>=10){clearInterval(stressTimer);scene.go(4);return;}scene.go(stressCount%2?4:2);},8500);};
 function report(){const f=scene.frames.slice().sort((a,b)=>a-b),p95=f[Math.floor(f.length*.95)]||0,mem=renderer.stage.txMemManager;return {build:'Lightning TV Lab 5 · Reference hub & focus',engine:'Blits 2.9.0 / Lightning renderer 3.3.1',userAgent:navigator.userAgent,quality:profile,canvas:[renderer.canvas.width,renderer.canvas.height],scene:phases[scene.phase],frameP95Ms:+p95.toFixed(1),worstFrameMs:+scene.metrics.worst.toFixed(1),framesOver50ms:scene.metrics.late,contextLost:scene.metrics.contextLost,rendererFps:scene.metrics.fps,textureMemory:mem?mem.getMemoryInfo():null,renderer:query.get('renderer')==='canvas'?'Canvas fallback':'WebGL 1',sceneHistory:scene.history,hostVoice:scene.host.voiceName,hostSpeaking:scene.host.speaking,hostEnergy:Math.round(scene.orb.energy*1000)/1000,audioEvents:scene.host.events,musicActive:!!scene.host.bedTimer,audioContext:scene.host.ctx?scene.host.ctx.state:'not started',timestamp:new Date().toISOString()};}
 setInterval(()=>{const d=report();document.getElementById('stats').textContent='Blits 2.9.0 · Lightning 3.3.1\n'+d.canvas.join(' × ')+' · '+d.scene+'\nFrame p95 '+d.frameP95Ms+'ms · worst '+d.worstFrameMs+'ms\nFrames >50ms '+d.framesOver50ms+'\n'+d.renderer+' · texture '+(d.textureMemory?(d.textureMemory.memUsed/1048576).toFixed(1)+' MiB':'n/a')+'\nContext lost '+d.contextLost+'\n'+d.hostVoice+' · '+(d.hostSpeaking?'speaking':'idle')+' · energy '+d.hostEnergy+'\nLast cue: '+(d.audioEvents.length?d.audioEvents[d.audioEvents.length-1].kind:'none')+' · audio '+d.audioContext+'\n'+navigator.userAgent;},1000);
 document.getElementById('export').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(report(),null,2)],{type:'application/json'}));a.download='weekend-tv-diagnostics.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)scene.pause();else scene.resume();});window.addEventListener('blur',()=>scene.cancelHold());
}
