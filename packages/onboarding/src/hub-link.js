// Resolve the separately built hub for the embedded rehearsal and toolbar link.
// The hub is React; onboarding is Lightning + Blits. The origin-checked
// postMessage bridge keeps their code and state ownership separate.
//
// On Pages the two deploy together as /<base>/ (hub) and /<base>/onboarding/
// (this), so '../' resolves correctly under any repo name without being told
// what the base is. In dev they are separate Vite servers, hence the split.
// Either way ?hub=<url> overrides it.
const DEPLOYED_HUB = '../?view=hub9&detail=immersive'
const DEV_HUB = location.protocol + '//' + location.hostname + ':5173/pages/index.html?view=hub9&detail=immersive'

/** Where "see all games" goes. */
export function hubUrl() {
  const override = new URLSearchParams(location.search).get('hub')
  if (override) return override
  return import.meta.env.DEV ? DEV_HUB : DEPLOYED_HUB
}

/** Leave the onboarding for the hub. */
export function openHub() {
  location.href = hubUrl()
}
