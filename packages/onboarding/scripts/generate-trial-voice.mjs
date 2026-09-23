// Offline asset generation: credentials never enter the browser bundle.
import { writeFile } from 'node:fs/promises';

const key = process.env.ELEVENLABS_API_KEY;
const voice = process.env.ELEVENLABS_VOICE_ID;
if (!key || !voice) throw new Error('Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID (Riyadh 2).');
const text = 'Sign up on your phone to start your free trial. One subscription, every game night. Or press Back to see all games.';
const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`, {
  method: 'POST',
  headers: {'xi-api-key':key,'Content-Type':'application/json'},
  body: JSON.stringify({text,model_id:'eleven_multilingual_v2',voice_settings:{stability:0.5,similarity_boost:0.75,use_speaker_boost:true}}),
});
if (!response.ok) {
  const error = await response.json().catch(()=>({}));
  throw new Error(`ElevenLabs ${response.status}: ${error.detail?.status || error.detail?.code || 'generation failed'}`);
}
if (!response.headers.get('content-type')?.includes('audio')) throw new Error('Expected audio from ElevenLabs.');
const audio = new Uint8Array(await response.arrayBuffer());
if(audio.length<1000)throw new Error('Generated audio was unexpectedly empty.');
await writeFile(new URL('../public/assets/host/08-start-trial.mp3',import.meta.url),audio);
console.log('Saved ElevenLabs trial prompt (08-start-trial.mp3).');
