import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The art wall's belts loop by translating exactly one copy of their tiles. That
// distance must not depend on the art having decoded, or on CSS the TV browsers
// (legacy bundle: Chrome 53+) lack: older compositors resolve a percentage
// translate once, when the animation starts, so a belt measured before its art
// loaded (aspect-ratio / flex gap unsupported → 0px tiles) loops over ~9px and
// reads as a column that never moves.
const css = readFileSync(new URL('./upsell.css', import.meta.url), 'utf8');
const rule = selector => {
  const m = css.match(new RegExp(`(?:^|[}\\n])\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`));
  assert.ok(m, `missing rule ${selector}`);
  return m[1];
};
const px = (decl, prop) => { const m = decl.match(new RegExp(`(?:^|;|\\s)${prop}\\s*:\\s*(\\d+(?:\\.\\d+)?)px`)); return m ? Number(m[1]) : null; };
const keyframes = name => { const m = css.match(new RegExp(`@keyframes ${name}\\s*\\{([\\s\\S]*?\\})\\s*\\}`)); assert.ok(m, `missing @keyframes ${name}`); return m[1]; };
const travel = name => [...keyframes(name).matchAll(/translateY\(([^)]*)\)/g)].map(m => m[1].trim());

function renderWall() {
  const node = () => ({ hidden: false, innerHTML: '', textContent: '', src: '' });
  const nodes = {};
  const root = { className: '', style: {}, innerHTML: '', setAttribute() {}, classList: { add() {} }, remove() {},
    querySelector: s => (nodes[s] ||= node()) };
  globalThis.document = { getElementById: () => ({ clientWidth: 1920, appendChild() {} }), createElement: () => root };
  globalThis.ResizeObserver = class { observe() {} disconnect() {} };
  return root;
}

test('every wall column runs a scroll animation with a positive duration', async () => {
  const { renderUpsell } = await import('./upsell.js');
  const root = renderWall();
  renderUpsell({ connected: false, reduced: false });
  const columns = [...root.innerHTML.matchAll(/<div class="upsell-column" style="([^"]*)"><div class="upsell-belt">([\s\S]*?)<\/div><\/div>/g)];
  assert.equal(columns.length, 6);
  for (const [, style, belt] of columns) {
    const duration = Number((style.match(/--duration:(\d+(?:\.\d+)?)s/) || [])[1]);
    assert.ok(duration > 0, `column has no duration: ${style}`);
    assert.equal((belt.match(/<img /g) || []).length, 12, 'each belt carries its six tiles twice');
  }
  const belt = rule('.upsell-belt');
  assert.match(belt, /animation:\s*upsell-up\s+var\(--duration\)\s+linear\s+infinite/);
  assert.match(rule('.upsell-column:nth-child(even) .upsell-belt'), /animation-name:\s*upsell-down/);
});

test('the loop distance is one copy of the tiles in fixed px, independent of image load', () => {
  const img = rule('.upsell-belt img');
  const tile = px(img, 'height'), spacing = px(img, 'margin-bottom');
  assert.ok(tile > 0, 'tiles need a fixed px height (not aspect-ratio / intrinsic size)');
  assert.ok(spacing > 0, 'tile spacing must be a margin, not flex gap (unsupported before Chrome 84)');
  assert.doesNotMatch(img, /aspect-ratio/);
  assert.doesNotMatch(rule('.upsell-belt'), /(^|;|\s)gap\s*:/);
  const loop = `-${6 * (tile + spacing)}px`;
  assert.deepEqual(travel('upsell-up'), ['0', loop]);
  assert.deepEqual(travel('upsell-down'), [loop, '0']);
});

test('the wall fills the TV without `inset` (unsupported before Chrome 87)', () => {
  for (const selector of ['.upsell-wall', '.upsell-scrim']) {
    const r = rule(selector);
    assert.doesNotMatch(r, /inset\s*:/, selector);
    assert.match(r, /top:0;\s*right:0;\s*bottom:0;\s*left:0/, selector);
  }
});

test('the two Jeopardy! tiles never sit side by side in the middle of the screen', async () => {
  const { wallColumns, timing } = await import('./upsell.js');
  const img = rule('.upsell-belt img');
  const tile = px(img, 'height'), pitch = tile + px(img, 'margin-bottom');
  const loop = 6 * pitch;
  // A tile's top edge `t` seconds in: the CSS loop with its negative delay and
  // column offset, folded into one loop's span. Odd columns scroll up.
  const top = (c, t) => {
    const d = timing.duration[c], progress = ((((t - timing.delay[c]) % d) + d) % d) / d;
    const shift = c % 2 === 0 ? -loop * progress : -loop * (1 - progress);
    const y = timing.offset[c] + shift + wallColumns[c].indexOf('jeopardy') * pitch;
    return ((y % loop) + loop) % loop;
  };
  const cols = wallColumns.flatMap((games, i) => (games.includes('jeopardy') ? [i] : []));
  assert.equal(cols.length, 2);
  const [first, second] = cols;
  assert.equal(timing.duration[first], timing.duration[second], 'same speed, or their spacing drifts');
  for (let t = 0; t < timing.duration[first] * 3; t += 0.05) {
    const a = top(first, t), b = top(second, t);
    if (Math.min(Math.abs(a - b), loop - Math.abs(a - b)) >= tile) continue;
    for (const y of [a, b]) {
      const mid = (y + tile / 2) % loop;
      assert.ok(Math.abs(mid - 540) > tile, `side by side at t=${t.toFixed(2)}s, centred at y${Math.round(mid)}`);
    }
  }
});

