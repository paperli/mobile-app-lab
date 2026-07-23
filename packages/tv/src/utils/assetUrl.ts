// Resolve a public-asset path against Vite's configured base URL so assets load
// whether the app is served at the domain root (dev / Render) or under a
// subpath (the GitHub Pages demo at /mobile-app-lab/). The demo builds with a
// relative base ('./'), so root-absolute '/games/...' URLs 404 there — prefix
// them with import.meta.env.BASE_URL instead.
//
// Pass a root-relative path (leading slash optional):
//   assetUrl('/games/hub9/jeopardy/tile.png')
//     dev  (BASE_URL '/')  -> '/games/hub9/jeopardy/tile.png'
//     demo (BASE_URL './') -> './games/hub9/jeopardy/tile.png'
export const assetUrl = (path: string): string =>
  `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
