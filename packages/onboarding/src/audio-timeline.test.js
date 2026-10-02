import test from 'node:test';
import assert from 'node:assert/strict';
import { cueTimeline } from './audio-timeline.js';
import { ROUND_TIMELINES } from './round-timeline.js';
import { Soundtrack } from './soundtrack.js';

test('a stalled recording cannot reveal more answers; seeking forward runs each cue once', () => {
  const visible = [];
  const timeline = cueTimeline(ROUND_TIMELINES.jeopardy.cues.map(cue => ({ ...cue, run: () => visible.push(cue) })));
  timeline.advance(8.8);
  assert.equal(visible.filter(c => c.type === 'answer').length, 1);
  timeline.advance(8.8);
  assert.equal(visible.filter(c => c.type === 'answer').length, 1);
  assert.equal(visible.some(c => c.type === 'ready'), false);
  timeline.advance(12);
  assert.equal(visible.filter(c => c.type === 'answer').length, 4);
  assert.equal(visible.at(-1).type, 'ready');
});

test('Skip and replay cancel the old recording’s remaining visual cues', () => {
  const visible = [];
  const old = cueTimeline([{ at: 1, run: () => visible.push('old') }]);
  old.cancel(); old.advance(30);
  const replay = cueTimeline([{ at: 1, run: () => visible.push('new') }]);
  replay.advance(.9); assert.deepEqual(visible, []);
  replay.advance(1); assert.deepEqual(visible, ['new']);
});

function audioHarness() {
  const sources = [], levels = [];
  const ctx = {
    currentTime: 0, state: 'running', destination: {},
    createBufferSource() {
      const source = { connect() {}, disconnect() {}, start() { this.started = true; }, stop() { this.stopped = true; this.onended?.(); } };
      sources.push(source); return source;
    },
    createGain() { return { connect() {}, disconnect() {}, gain: { value: 0, cancelScheduledValues() {}, setTargetAtTime(value) { levels.push(value); } } }; },
  };
  const requests = [];
  const host = { ctx, enabled: true, speaking: false, buffers: new Map(), prepareAudio: () => new Promise(resolve => requests.push(resolve)) };
  return { host, soundtrack: new Soundtrack(host), sources, levels, requests };
}

test('Jeopardy starts its quiet music with the first spoken frame, before the value reveal', async () => {
  const { host, soundtrack, sources, levels, requests } = audioHarness();
  const visible=[];
  const timeline=cueTimeline(ROUND_TIMELINES.jeopardy.cues.map(cue=>({...cue,run:()=>{
    if(cue.type==='music')soundtrack.bed(cue.track);else visible.push(cue.type);
  }})));
  assert.equal(requests.length,0);
  host.speaking=true;timeline.advance(0);
  requests.shift()({});await Promise.resolve();
  assert.equal(sources[0].started,true);assert.deepEqual(visible,[]);
  const speechLevel=levels.at(-1);assert.ok(speechLevel>0);
  timeline.advance(.1);assert.equal(sources.length,1);
  timeline.advance(.64);assert.deepEqual(visible,['value']);
  host.speaking=false;soundtrack.mix();assert.ok(levels.at(-1)>speechLevel);
});

test('music ducks for the host, mutes during microphone input, and never overlaps on phase changes', async () => {
  const { host, soundtrack, sources, levels, requests } = audioHarness();
  soundtrack.bed('jeopardy'); requests.shift()({}); await Promise.resolve();
  const idle = levels.at(-1);
  host.speaking = true; soundtrack.mix(); assert.ok(levels.at(-1) < idle);
  soundtrack.listening = true; soundtrack.mix(); assert.equal(levels.at(-1), 0);
  soundtrack.bed('wheel'); assert.equal(sources[0].stopped, true);
  soundtrack.bed(false); requests.shift()({}); await Promise.resolve();
  assert.equal(sources.length, 1); assert.equal(soundtrack.music, null);
});

test('muting while a music download completes still allows a later unmute', async () => {
  const { host, soundtrack, requests, sources } = audioHarness();
  soundtrack.bed('wheel'); host.enabled = false; requests.shift()({}); await Promise.resolve();
  assert.equal(sources.length, 0);
  host.enabled = true; soundtrack.bed('wheel'); requests.shift()({}); await Promise.resolve();
  assert.equal(sources.length, 1); assert.equal(sources[0].started, true);
});

test('leaving a celebration cancels an in-flight cheer before it can play on the next scene', async () => {
  const { soundtrack, requests, sources } = audioHarness();
  soundtrack.cue('cheer'); soundtrack.stopEffects(); requests.shift()({}); await Promise.resolve();
  assert.equal(sources.length, 0);
});
