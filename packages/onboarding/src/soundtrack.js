const ASSETS = {
  jeopardy: 'jeopardy-countdown', wheel: 'wheel-theme',
  cheer: 'crowd-cheer', 'tile-flip': 'wheel-tile',
};

// The replacement Jeopardy master matches the original's -24.24 LUFS.
// Its softer opening needs a little more presence under the host, like Wheel.
const LEVELS = { jeopardy: { idle: .72, speech: .40 }, wheel: { idle: .48, speech: .18 } };
export class Soundtrack {
  constructor(host) { this.host = host; this.kind = null; this.serial = 0; this.effectSerial = 0; this.effects = new Set(); }
  prepare(kind) { return this.host.prepareAudio('assets/audio/' + ASSETS[kind] + '.mp3'); }
  warm() { Object.keys(ASSETS).forEach(kind => this.prepare(kind).catch(() => {})); }
  mix() {
    if (!this.music) return;
    const { ctx, enabled, speaking } = this.host;
    const level = !enabled || this.listening ? 0 : LEVELS[this.kind][speaking ? 'speech' : 'idle'];
    this.music.gain.gain.cancelScheduledValues(ctx.currentTime);
    this.music.gain.gain.setTargetAtTime(level, ctx.currentTime, speaking || this.listening ? .08 : .35);
  }
  bed(kind) {
    if (kind === this.kind && (this.music || this.loading)) { this.mix(); return; }
    const id = ++this.serial;
    this.kind = kind || null; this.loading = false;
    if (this.music) {
      const { source, gain } = this.music, now = this.host.ctx.currentTime;
      gain.gain.cancelScheduledValues(now); gain.gain.setTargetAtTime(0, now, .08);
      source.stop(now + .4); this.music = null;
    }
    if (!kind || !this.host.enabled || !this.host.ctx) return;
    this.loading = true;
    this.prepare(kind).then(buffer => {
      if (id !== this.serial) return;
      if (!this.host.enabled) { this.loading = false; return; }
      const ctx = this.host.ctx, source = ctx.createBufferSource(), gain = ctx.createGain();
      source.buffer = buffer; source.loop = true; gain.gain.value = 0;
      source.connect(gain); gain.connect(ctx.destination);
      source.onended = () => { source.disconnect(); gain.disconnect(); };
      this.music = { source, gain }; this.loading = false; source.start(); this.mix();
    }).catch(() => { if (id === this.serial) this.loading = false; });
  }
  track(source, gain) {
    const effect = { source, gain }; this.effects.add(effect);
    source.connect(gain); gain.connect(this.host.ctx.destination);
    source.onended = () => { source.disconnect(); gain.disconnect(); this.effects.delete(effect); };
    return effect;
  }
  stopEffects() {
    this.effectSerial++;
    for (const { source } of this.effects) { try { source.stop(); } catch {} }
  }
  sample(kind) {
    const id = this.effectSerial;
    // Short tile cues must land on the flip, never arrive late after a fetch.
    const cached = this.host.buffers.get('assets/audio/' + ASSETS[kind] + '.mp3');
    const play = buffer => {
      if (id !== this.effectSerial || !this.host.enabled || this.host.ctx?.state !== 'running') return;
      const ctx = this.host.ctx, source = ctx.createBufferSource(), gain = ctx.createGain();
      source.buffer = buffer; gain.gain.value = kind === 'cheer' ? .85 : .72;
      this.track(source, gain); source.start();
    };
    if (cached) play(cached);
    else if (kind === 'cheer') this.prepare(kind).then(play).catch(() => {});
    else { this.tone(1500, 0, .055, .025, 'triangle', 480); this.prepare(kind).catch(() => {}); }
  }
  tone(frequency, delay = 0, duration = .25, level = .035, type = 'sine', endFrequency = frequency) {
    const ctx = this.host.ctx;
    if (!this.host.enabled || ctx?.state !== 'running') return;
    const at = ctx.currentTime + delay, source = ctx.createOscillator(), gain = ctx.createGain();
    source.type = type; source.frequency.setValueAtTime(frequency, at);
    source.frequency.exponentialRampToValueAtTime(endFrequency, at + duration);
    gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(level, at + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    this.track(source, gain); source.start(at); source.stop(at + duration + .02);
  }
  cue(kind, index = 0) {
    if (!this.host.enabled || !this.host.ctx) return;
    if (kind === 'cheer' || kind === 'tile-flip') { this.sample(kind); return; }
    if (kind === 'almost') { [392, 330].forEach((n, i) => this.tone(n, i * .16, .45, .035, 'triangle')); return; }
    if (kind === 'question-pop' || kind === 'answer-pop') {
      const pitch = kind === 'question-pop' ? 410 : 540 + index * 70;
      this.tone(pitch, 0, .14, .085, 'sine', pitch * .42);
      this.tone(pitch * 1.6, .008, .07, .018, 'triangle', pitch * .8);
    }
  }
  dispose() { this.stopEffects(); this.bed(false); }
}
