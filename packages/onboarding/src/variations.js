export const VARIATIONS = [
  { id: 'standard', title: 'Try, then subscribe', label: 'Original · LG / Samsung', fireTV: false, subscribed: false },
  { id: 'firetv-subscribed', title: 'Subscribe, then play', label: 'Fire TV · Subscribed', fireTV: true, subscribed: true },
  { id: 'firetv-skipped', title: 'Skip, then try', label: 'Fire TV · Paywall skipped', fireTV: true, subscribed: false },
];

export const OUTRO_PHASE = 11;
export const PAYWALL_PHASE = 12;
export const variationFor = id => VARIATIONS.find(flow => flow.id === id) || VARIATIONS[0];
export const endingPhase = member => member ? OUTRO_PHASE : 8;

export function variationUrl(id, { scene, search = location.search } = {}) {
  const params = new URLSearchParams(search);
  ['scene', 'phone', 'mobile', 'flow'].forEach(key => params.delete(key));
  params.set('flow', variationFor(id).id);
  if (scene !== undefined) params.set('scene', scene);
  return `play.html?${params}`;
}
