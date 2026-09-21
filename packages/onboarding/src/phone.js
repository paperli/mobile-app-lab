import { templates } from './reference-phone.js';
const mic='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></svg>';
export function setupPhone(s,modal){
 // `modal` is the shared draggable phone shell (@weekend/ui/device). It owns
 // the window and the device outline; we only fill its screen.
 const dock=modal.el,screen=modal.screen;
 const b=(label,action,alt=false)=>`<button class="phone-button ${alt?'alt':''}" data-action="${action}">${label}</button>`;
 const chrome=content=>`<button class="phone-skip top-right" data-action="skip-mic">Skip</button><p class="phone-logo"><img src="assets/weekend-logo.png" alt="Weekend"></p>${content}`;
 function render(){
  let body='',finale=s.phase>=8;const t=templates(s.phase===8?7:8);t.option=s.focus;t.cursor=s.selectedGame;t.subscribed=s.member;t.checkout=({getstarted:'landing',signup:'account',signin:'account',offer:'offer',pay:'applepay'})[s.phoneStep]||'landing';t.accountMode=s.accountMode;
  if(s.phase<4){screen.className='wk-phone__screen phone-screen';screen.innerHTML='<p id="phoneIdle">The phone joins after the remote sample.</p>';return;}
  if(s.phase===4)body=chrome(s.phoneStep==='download'?'<p class="state-pill">APP HANDOFF · DEMO</p><h3 class="phone-title">Bring game night<br>to life.</h3><p class="phone-copy">Download Weekend, then return to your TV session.</p>'+b('Download & Open · Demo','launch-app'):'<p class="state-pill">PAIRING SIMULATION</p><h3 class="phone-title">Your phone.<br>Your buzzer.</h3><p class="phone-copy">Use this simulator to rehearse the QR handoff.</p>'+b('Simulate QR Scan','scan'));
  if(s.phase===5){let content='';if(s.phoneStep==='permission')content='<div class="permission-sheet" role="dialog" aria-modal="true" aria-labelledby="permissionTitle"><span class="simulation-tag">SYSTEM DIALOG · SIMULATION</span><h3 id="permissionTitle">“Weekend” Would Like to Access the Microphone</h3><p>Answer games using your voice.</p>'+b('Allow Microphone','grant')+b('Don’t Allow','deny',true)+'</div>';
   else if(s.phoneStep==='denied')content='<div class="phone-mic-icon">'+mic+'</div><h3 class="phone-title">Your mic is off.</h3><p class="phone-copy">Enable Microphone for Weekend in your phone’s Settings.</p>'+b('Go to Settings','settings');
   else if(s.phoneStep==='settings')content='<p class="state-pill">SETTINGS · SIMULATION</p><h3 class="phone-title">Weekend</h3><div class="settings-row">Microphone <button data-action="grant" aria-label="Enable microphone">Off → On</button></div><p class="phone-copy">This is a preview of your phone’s Settings.</p>';
   else content='<div class="phone-mic-icon">'+mic+'</div><h3 class="phone-title">Your voice.<br>In the game.</h3><p class="phone-copy">Your phone is your buzzer and microphone. Allow mic access to answer out loud.</p>'+b('Continue','request-mic');body=chrome(content);}
  if(s.phase===6)body=chrome(`<p class="state-pill" id="micStatus">${s.voice==='processing'?'ANSWER SENT':s.voice==='listening'?'LISTENING':'READY WHEN YOU ARE'}</p><button class="mic ${s.voice==='listening'?'listening':''}" id="holdMic" aria-label="Press and hold to answer" aria-pressed="${s.voice==='listening'}" ${s.voice==='processing'?'disabled':''}>${mic}</button><h3 class="phone-title">Hold. Speak. Release.</h3><p class="phone-copy" id="micHelp">${s.attempts&&s.voice==='ready'?'Hold a little longer, then release.':'Keep your eyes on the TV.'}</p><p class="mic-demo">Hold-to-talk simulation · no audio captured</p>`);
  if(s.phase===7)body=chrome('<div class="phone-success-check">✓</div><h3 class="phone-title">You’re a natural.</h3><p class="phone-copy">Your next game night is waiting.</p>');
  if(s.phase===8)body=t.controllerPhone();
  if(s.phase===9)body=t.claimPhone();
  if(s.phase===10)body=t.successPhone();
  body=body.replaceAll('assets/weekend-3d-yellow.svg','assets/weekend-logo.png');
  screen.className='wk-phone__screen phone-screen'+(finale?' finale-phone':'');screen.innerHTML=body;
  const m=screen.querySelector('#holdMic');if(m){const press=e=>{e.preventDefault();s.startHold();m.classList.add('listening');m.setAttribute('aria-pressed','true');screen.querySelector('#micStatus').textContent='LISTENING';screen.querySelector('#micHelp').textContent='Release to send your answer.';};const release=e=>{e.preventDefault();s.endHold();};if(window.PointerEvent){m.onpointerdown=e=>{press(e);m.setPointerCapture(e.pointerId);};m.onpointerup=release;m.onpointercancel=()=>s.cancelHold();}else{m.ontouchstart=press;m.ontouchend=release;m.onmousedown=press;m.onmouseup=release;}m.onkeydown=e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat)press(e);};m.onkeyup=e=>{if(e.key===' '||e.key==='Enter')release(e);};}
 }
 dock.addEventListener('click',e=>{const el=e.target.closest('button');if(!el)return;const a=el.dataset.action;if(!a)return;s.host.unlock();
  if(a==='pad'){s.move(el.dataset.dir==='select'?'enter':el.dataset.dir);return;}
  if(a==='remote-back'){s.move('back');return;}if(a==='scan')s.scan();else if(a==='launch-app')s.openApp();else if(a==='request-mic'){s.phoneStep=s.scenario==='denied'?'denied':'permission';render();}else if(a==='grant')s.micAllowed();else if(a==='deny'){s.phoneStep='denied';render();s.say('No problem. You can turn on the microphone in Settings, or skip and explore.');}else if(a==='settings'){s.phoneStep='settings';render();}else if(a==='skip-mic'){s.cancelHold();s.go(8);}else if(a==='begin-signup'){s.accountMode='signup';s.phoneStep='signup';render();}else if(a==='switch-account'){s.accountMode=s.accountMode==='signup'?'signin':'signup';render();}else if(a==='account-complete'||a==='back-to-offer'){s.phoneStep='offer';render();}else if(a==='open-apple-pay'){s.phoneStep='pay';render();}else if(a==='confirm-payment')s.buy();else if(['skip-trial','more-games','browse-after-success'].includes(a))s.browse();
 });
 dock.addEventListener('keydown',e=>{if(!e.target.closest('[data-action="pad"]'))return;const k={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',Enter:'enter',Escape:'back',Backspace:'back'}[e.key];if(k){e.preventDefault();e.stopPropagation();s.move(k);}});
 return render;
}
