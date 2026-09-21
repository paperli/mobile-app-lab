// The onboarding hands off to the 9-game hub instead of carrying its own copy.
//
// The hub is the React app in packages/tv; this is Lightning + Blits. They are
// two bundles, two URLs, and neither imports the other — the handoff is a plain
// navigation, so whichever one you are looking at is the only one running.
//
// On Pages the two deploy together as /<base>/ (hub) and /<base>/onboarding/
// (this), so '../' resolves correctly under any repo name without being told
// what the base is. In dev they are separate Vite servers, hence the split.
// Either way ?hub=<url> overrides it.
const DEPLOYED_HUB = '../?view=hub9&detail=immersive'
const DEV_HUB = location.protocol + '//' + location.hostname + ':5173/?view=hub9&detail=immersive'

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
