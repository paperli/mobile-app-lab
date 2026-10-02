import envelope from './welcome-envelope.json';
import { cueTimeline } from './audio-timeline.js';
import { Soundtrack } from './soundtrack.js';
import { takeFor, takeUrl, allTakes } from './vo.js';
export const ARIA_INTRO='Hi friend. Welcome to Weekend. Get comfortable, and let your voice do the playing. A little music, a little trivia, and a few surprises. Ready? Your next great game night starts here.';
// Host speech uses ElevenLabs recordings only. Missing/blocked audio falls
// back to timed captions, never to a different device voice.
export class AudioHost {
 constructor(){this.enabled=true;this.captions=false;this.serial=0;this.current='';this.ctx=null;this.speaking=false;this.events=[];this.activationNodes=[];this.mode='sample';this.voiceName='Riyadh 2 · recorded';this.buffers=new Map();this.pending=new Map();this.take='welcome';this.started=0;this.boundary=0;this.audio=new Audio(takeUrl('welcome'));this.audio.preload='auto';this.soundtrack=new Soundtrack(this);}
 unlock(){try{if(!this.ctx){this.ctx=new(window.AudioContext||window.webkitAudioContext)();this.analyser=this.ctx.createAnalyser();this.analyser.fftSize=512;this.samples=new Uint8Array(512);this.analyser.connect(this.ctx.destination);}const ready=this.ctx.resume();if(ready&&ready.catch)ready.catch(()=>{});this.prepareTake('welcome').catch(()=>{});this.soundtrack.warm();if(this.soundtrack.kind)this.soundtrack.bed(this.soundtrack.kind);}catch(e){}}
 /** Decoded take, cached. Rejects when Web Audio is unavailable or the fetch fails. */
 prepareTake(file){return this.prepareAudio(takeUrl(file));}
 prepareAudio(file){
  if(this.buffers.has(file))return Promise.resolve(this.buffers.get(file));
  if(!this.ctx)return Promise.reject(new Error('Web Audio unavailable'));
  if(!this.pending.has(file))this.pending.set(file,fetch(file).then(r=>{if(!r.ok)throw new Error('Take unavailable: '+file);return r.arrayBuffer();}).then(data=>new Promise((resolve,reject)=>this.ctx.decodeAudioData(data,resolve,reject))).then(buffer=>{this.buffers.set(file,buffer);this.pending.delete(file);return buffer;}).catch(error=>{this.pending.delete(file);throw error;}));
  return this.pending.get(file);
 }
 /** Warm the remaining takes once the intro is playing; failures are ignored. */
 preload(){if(!this.ctx)return;allTakes().forEach(file=>{if(file!=='welcome')this.prepareTake(file).catch(()=>{});});}
 state(active){this.speaking=active;this.soundtrack.mix();}
 setEnabled(enabled){this.enabled=enabled;if(!enabled)this.soundtrack.stopEffects();this.soundtrack.mix();}
 stopTimeline(){clearInterval(this.timelineTimer);this.timeline?.cancel();this.timeline=null;}
 stop(){this.stopTimeline();this.stopActivation();this.serial++;clearTimeout(this.watch);clearTimeout(this.startWatch);if(window.speechSynthesis)speechSynthesis.cancel();if(this.source){this.source.onended=null;try{this.source.stop();}catch(e){}this.source.disconnect();this.source=null;}this.audio.onended=null;this.audio.onerror=null;this.audio.pause();this.state(false);document.getElementById('caption').hidden=true;}
 say(text,done,options={}){
  this.stop();this.current=text;const id=this.serial;let ended=false,fallbackActive=false;
  const take=takeFor(text);
  this.mode='sample';this.take=take||null;this.voiceName=take?'ElevenLabs · Riyadh 2':'ElevenLabs recording unavailable';
  const cap=document.getElementById('caption');cap.textContent=text;const caption=()=>{cap.hidden=false;};
  const finish=()=>{if(ended||id!==this.serial)return;ended=true;this.stopTimeline();clearTimeout(this.watch);clearTimeout(this.startWatch);this.state(false);cap.hidden=true;if(done)done();};
  const spoken=Math.max(3,text.split(/\s+/).length/2.4);
  let duration=options.duration||(take==='welcome'?envelope.duration:spoken);
  const timelineStart=clock=>{this.stopTimeline();this.timeline=cueTimeline(options.cues||[]);const tick=()=>this.timeline?.advance(clock());tick();this.timelineTimer=setInterval(tick,16);};
  const fallback=()=>{if(ended||fallbackActive||id!==this.serial)return;fallbackActive=true;this.state(false);caption();clearTimeout(this.watch);clearTimeout(this.startWatch);const started=performance.now();timelineStart(()=>(performance.now()-started)/1000);this.watch=setTimeout(finish,duration*1000);};
  if(this.captions)caption();if(!this.enabled){fallback();return;}
  if(take){
   const began=()=>{if(ended||fallbackActive||id!==this.serial)return;clearTimeout(this.startWatch);this.state(true);this.started=performance.now();timelineStart(()=>this.source?this.ctx.currentTime-this.sampleStart:this.audio.currentTime);this.watch=setTimeout(finish,(duration+3)*1000);};
   // Media element fallback: no analyser, so the orb reads the baked envelope
   // for the intro and the synthetic waveform for everything else.
   const mediaFallback=()=>{if(ended||fallbackActive||id!==this.serial)return;this.audio.src=takeUrl(take);this.audio.currentTime=0;this.audio.onended=finish;this.audio.onerror=fallback;const playing=this.audio.play();if(playing&&playing.then)playing.then(began).catch(fallback);else began();};
   this.startWatch=setTimeout(fallback,10000);
   if(this.ctx&&this.ctx.state==='running')this.prepareTake(take).then(buffer=>{if(ended||fallbackActive||id!==this.serial)return;duration=buffer.duration;const source=this.ctx.createBufferSource();source.buffer=buffer;source.connect(this.analyser);source.onended=finish;this.source=source;this.sampleStart=this.ctx.currentTime;source.start();began();}).catch(mediaFallback);else mediaFallback();
   return;
  }
  fallback();
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
 dispose(){this.stop();this.soundtrack.dispose();if(this.ctx)this.ctx.close();this.audio.removeAttribute('src');this.audio.load();}
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
 tone(...args){this.soundtrack.tone(...args);}
 cue(kind,index=0){if(this.effectsPaused||document.hidden)return;this.events.push({kind,at:Date.now(),enabled:this.enabled,context:this.ctx?this.ctx.state:'unavailable'});if(this.events.length>100)this.events.shift();this.soundtrack.cue(kind,index);}
 bed(kind){this.soundtrack.bed(kind);}
 stopEffects(){this.soundtrack.stopEffects();}
 listening(active){this.soundtrack.listening=active;this.soundtrack.mix();}
}
