// Where the flow lands once the subscription goes through: the prod-matched
// hub (?view=hub). Same resolution rules as the onboarding's hub-link.js. The
// pre-checkout preview below still embeds hub9, which owns the free-trial hero
// and the preroll-ready postMessage handshake.
//
// On Pages the two deploy together as /<base>/ (hub) and /<base>/preroll/
// (this), so '../' resolves under any repo name. In dev they are separate Vite
// servers. Either way ?hub=<url> overrides it.
const HUB_QUERY = '?view=hub&subscribed=true'
const DEPLOYED_HUB = '../' + HUB_QUERY
const DEV_HUB = location.protocol + '//' + location.hostname + ':5173/pages/index.html' + HUB_QUERY

export function hubUrl() {
  const override = new URLSearchParams(location.search).get('hub')
  if (override) return override
  return import.meta.env.DEV ? DEV_HUB : DEPLOYED_HUB
}

/** Preview the same hub before checkout, independently of subscription state. */
export function hubPreviewUrl(showTrialHero) {
  const url = new URL(hubUrl(), location.href)
  url.searchParams.set('view', 'hub9')
  url.searchParams.set('subscribed', 'false')
  url.searchParams.set('prerollOrigin', location.origin)
  url.searchParams.set('trialHero', showTrialHero ? 'on' : 'off')
  return url
}
