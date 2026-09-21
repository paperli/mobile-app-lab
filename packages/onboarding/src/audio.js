import envelope from './welcome-envelope.json';
import { takeFor, takeUrl, allTakes } from './vo.js';
export const ARIA_INTRO='Hi friend. Welcome to Weekend. Get comfortable, and let your voice do the playing. A little music, a little trivia, and a few surprises. Ready? Your next great game night starts here.';
// Two speech paths, same as Speaking Orb Lab: a recorded take when we have one
// (see vo.js), device TTS for anything unrecorded or when media playback fails.
export class AudioHost {
 constructor(){this.enabled=true;this.captions=false;this.serial=0;this.current='';this.ctx=null;this.speaking=false;this.events=[];this.activationNodes=[];this.mode='sample';this.voiceName='Riyadh 2 · recorded';this.buffers=new Map();this.pending=new Map();this.take='welcome';this.started=0;this.boundary=0;this.audio=new Audio(takeUrl('welcome'));this.audio.preload='auto';}
 unlock(){try{if(!this.ctx){this.ctx=new(window.AudioContext||window.webkitAudioContext)();this.analyser=this.ctx.createAnalyser();this.analyser.fftSize=512;this.samples=new Uint8Array(512);this.analyser.connect(this.ctx.destination);}const ready=this.ctx.resume();if(ready&&ready.catch)ready.catch(()=>{});this.prepareTake('welcome').catch(()=>{});}catch(e){}}
 /** Decoded take, cached. Rejects when Web Audio is unavailable or the fetch fails. */
 prepareTake(file){
  if(this.buffers.has(file))return Promise.resolve(this.buffers.get(file));
  if(!this.ctx)return Promise.reject(new Error('Web Audio unavailable'));
  if(!this.pending.has(file))this.pending.set(file,fetch(takeUrl(file)).then(r=>{if(!r.ok)throw new Error('Take unavailable: '+file);return r.arrayBuffer();}).then(data=>new Promise((resolve,reject)=>this.ctx.decodeAudioData(data,resolve,reject))).then(buffer=>{this.buffers.set(file,buffer);this.pending.delete(file);return buffer;}).catch(error=>{this.pending.delete(file);throw error;}));
  return this.pending.get(file);
 }
 /** Warm the remaining takes once the intro is playing; failures are ignored. */
 preload(){if(!this.ctx)return;allTakes().forEach(file=>{if(file!=='welcome')this.prepareTake(file).catch(()=>{});});}
 state(active){this.speaking=active;}
 stop(){this.stopActivation();this.serial++;clearTimeout(this.watch);clearTimeout(this.startWatch);if(window.speechSynthesis)speechSynthesis.cancel();if(this.source){this.source.onended=null;try{this.source.stop();}catch(e){}this.source.disconnect();this.source=null;}this.audio.onended=null;this.audio.onerror=null;this.audio.pause();this.state(false);document.getElementById('caption').hidden=true;}
 say(text,done){
  this.stop();this.current=text;const id=this.serial;let ended=false,fallbackActive=false;
  const take=takeFor(text);
  this.mode=take?'sample':'device';this.take=take||null;this.voiceName=take?'Riyadh 2 · recorded':'Device TTS';
  const cap=document.getElementById('caption');cap.textContent=text;const caption=()=>{cap.hidden=false;};
  const finish=()=>{if(ended||id!==this.serial)return;ended=true;clearTimeout(this.watch);clearTimeout(this.startWatch);this.state(false);cap.hidden=true;if(done)done();};
  const spoken=Math.max(3,text.split(/\s+/).length/2.4);
  let duration=take==='welcome'?envelope.duration:spoken;
  const fallback=()=>{if(ended||fallbackActive||id!==this.serial)return;fallbackActive=true;this.state(false);caption();clearTimeout(this.watch);clearTimeout(this.startWatch);this.watch=setTimeout(finish,duration*1000);};
  if(this.captions)caption();if(!this.enabled){fallback();return;}
  if(this.mode==='sample'){
   const began=()=>{if(ended||fallbackActive||id!==this.serial)return;clearTimeout(this.startWatch);this.state(true);this.started=performance.now();this.watch=setTimeout(finish,(duration+3)*1000);};
   // Media element fallback: no analyser, so the orb reads the baked envelope
   // for the intro and the synthetic waveform for everything else.
   const mediaFallback=()=>{if(ended||fallbackActive||id!==this.serial)return;this.audio.src=takeUrl(take);this.audio.currentTime=0;this.audio.onended=finish;this.audio.onerror=fallback;const playing=this.audio.play();if(playing&&playing.then)playing.then(began).catch(fallback);else began();};
   this.startWatch=setTimeout(fallback,10000);
   if(this.ctx&&this.ctx.state==='running')this.prepareTake(take).then(buffer=>{if(ended||fallbackActive||id!==this.serial)return;duration=buffer.duration;const source=this.ctx.createBufferSource();source.buffer=buffer;source.connect(this.analyser);source.onended=finish;this.source=source;this.sampleStart=this.ctx.currentTime;source.start();began();}).catch(mediaFallback);else mediaFallback();
   return;
  }
  if(!window.speechSynthesis){fallback();return;}
  const line=new SpeechSynthesisUtterance(text),voices=speechSynthesis.getVoices();
  line.voice=voices.find(v=>v.lang==='en-US'&&/Samantha|Aria|Google US|Microsoft.*English/.test(v.name))||voices.find(v=>v.lang==='en-US')||voices.find(v=>/^en/.test(v.lang))||null;
  line.lang='en-US';line.rate=.94;this.utterance=line;
  line.onstart=()=>{if(ended||fallbackActive||id!==this.serial)return;clearTimeout(this.startWatch);this.started=performance.now();this.boundary=this.started;this.state(true);this.voiceName=line.voice?line.voice.name:'Device TTS';this.watch=setTimeout(finish,(duration+8)*1000);};
  line.onboundary=()=>{if(id===this.serial)this.boundary=performance.now();};line.onend=finish;line.onerror=fallback;
  this.startWatch=setTimeout(()=>{if(id===this.serial&&!this.speaking){speechSynthesis.cancel();fallback();}},7000);speechSynthesis.speak(line);
 }
 sampleEnergy(){
  if(!this.speaking||!this.enabled)return 0;
  if(this.mode==='sample'){
   if(this.source&&this.analyser&&this.ctx.state==='running'){this.analyser.getByteTimeDomainData(this.samples);let sum=0;for(let i=0;i<this.samples.length;i++){const v=(this.samples[i]-128)/128;sum+=v*v;}return Math.min(1.2,Math.sqrt(sum/this.samples.length)*5.2);}
   if(this.take==='welcome'){const time=this.audio.currentTime;return envelope.values[Math.min(envelope.values.length-1,Math.floor(time*envelope.rate))]||0;}
  }
  const now=performance.now(),elapsed=(now-this.started)/1000,wordBoost=Math.exp(-Math.max(0,now-this.boundary)/170);
  return .10+.46*Math.pow(Math.max(0,Math.sin(elapsed*15)+.2*Math.sin(elapsed*23)),2)+wordBoost*.28;
 }
 dispose(){this.stop();this.bed(false);if(this.ctx)this.ctx.close();this.audio.removeAttribute('src');this.audio.load();}
 stopActivation(){this.activationNodes.forEach(v=>{v.o.onended=null;try{v.o.stop();}catch(e){}v.o.disconnect();v.g.disconnect();});this.activationNodes=[];}
 activate(){
  this.stopActivation();this.events.push({kind:'host-activate',at:Date.now(),enabled:this.enabled,context:this.ctx?this.ctx.state:'unavailable'});
  if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;
  const c=this.ctx;
  // Original, softly ascending voice-on cue; no external audio request.
  [[392,784,0,.72,.038],[1174,1174,.16,.72,.018],[1568,1568,.31,.82,.011]].forEach(([from,to,delay,duration,level])=>{
   const o=c.createOscillator(),g=c.createGain(),t=c.currentTime+delay,v={o,g};o.type='sine';o.frequency.setValueAtTime(from,t);o.frequency.exponentialRampToValueAtTime(to,t+.45);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(level,t+.10);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(c.destination);this.activationNodes.push(v);o.onended=()=>{o.disconnect();g.disconnect();this.activationNodes=this.activationNodes.filter(n=>n!==v);};o.start(t);o.stop(t+duration+.02);
  });
 }
 tone(f,start=0,duration=.25,level=.035,type='sine'){if(!this.enabled||!this.ctx)return;const t=this.ctx.currentTime+start,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(level,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(this.ctx.destination);o.start(t);o.stop(t+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();};}
 cue(kind){this.events.push({kind,at:Date.now(),enabled:this.enabled,context:this.ctx?this.ctx.state:'unavailable'});if(kind==='almost'){[392,330].forEach((n,i)=>this.tone(n,i*.16,.45,.035,'triangle'));return;}[523,659,784,1047].forEach((n,i)=>this.tone(n,i*.11,.8,.045,'triangle'));if(!this.enabled||!this.ctx)return;const c=this.ctx;for(let i=0;i<42;i++){const b=c.createBuffer(1,c.sampleRate*.09,c.sampleRate),d=b.getChannelData(0);for(let j=0;j<d.length;j++)d[j]=(Math.random()*2-1)*Math.exp(-j/d.length*6);const s=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter();s.buffer=b;f.type='bandpass';f.frequency.value=1200+Math.random()*1800;g.gain.value=.1;s.connect(f);f.connect(g);g.connect(c.destination);s.start(c.currentTime+i*.042+Math.random()*.04);s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();};}}
 bed(on){clearInterval(this.bedTimer);this.bedTimer=null;if(!on)return;let i=0;const notes=[262,330,392,330,294,349,440,349,330,392,494,392,294,349,392,349];this.bedTimer=setInterval(()=>this.tone(notes[i++%notes.length],0,.45,this.speaking?.003:.012),440);}
}
