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
