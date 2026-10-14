# Fire TV Pre-roll Upsell

The pre-roll a Fire TV user sees between tapping a Weekend game ad and the
Amazon system paywall. Mocks the three Figma versions on the Multiplatform Hub
board (Section 1, `preroll v1/v2/v3`).

```
Fire TV home (Meme Supreme sponsored hero)
  → OK on Play Now
Weekend ident (same file as the onboarding)
  → ends, or OK to skip
Pre-roll upsell — ad-game tile + "One step away to play Meme Supreme"
  → tile pops in, copy rises in, the CTA arrives unfocused, then takes focus
  → OK on Get Started, or "Get Started in 10" counts down (?auto=on|off)
Fire TV paywall (mock of Amazon's sheet)
  → OK ticks "Authorize recurring charges", focus jumps to Continue
  → OK on Continue with Subscription
Hub9, signed in (?subscribed=true): no free-trial hero
```

Plain DOM + Vite, standalone like the onboarding. Nothing is charged.

## URLs

Everything lives under `/preroll/`, apart from the hub (`/`) and the
onboarding (`/onboarding/`) — in dev as well as on Pages.

| Page | Dev | Pages |
|---|---|---|
| Versions landing page | https://localhost:5176/preroll/ | `/<base>/preroll/` |
| Prototype | https://localhost:5176/preroll/play.html | `/<base>/preroll/play.html` |

The landing page links all three versions with the countdown on (`auto=1`):
each card starts the full flow from the Fire TV ad, with a second link
straight to the pre-roll. The params below go on `play.html`.

## Running it

```bash
npm run dev:preroll   # https://localhost:5176/preroll/
npm run dev:tv        # the hub on :5173, where checkout lands
```

| Param | Effect |
|---|---|
| `?v=1\|2\|3` | Pre-roll version (also on the toolbar) |
| `?bg=pan\|crawl` | Force a background video. Default: v1/v2 pan, v3 crawl |
| `?screen=home\|ident\|preroll\|paywall` | Start on a step |
| `?auto=on\|off` (or `1\|0`) | Get Started counts down and continues by itself, or waits for OK. Default: v1 off, v2/v3 on |
| `?countdown=N` | Countdown length in seconds, 1–60 (default 10). Also on the controls panel |
| `?sound=off` | Start muted |
| `?clean=1` | Hide the review toolbar |
| `?hub=<url>` | Override where checkout lands |

Keys: arrows, Enter = OK, Escape/Backspace = Back. Clicking works too.

The review toolbar mirrors the onboarding's: **Prototype Controls** (or P /
R / remote red) opens a panel with the version, background-video and step
switches, plus a direct link to every variation. Esc closes it.

## Assets

- `assets/video/upsell-pan.mp4`, `upsell-crawl.mp4` are web re-encodes
  (bitrate-capped H.264, faststart) of the masters in
  `weekend/hub-upsell-video/output/` (`upsell-16-games-v6-master-1080p_optimized`,
  `upsell-crawl-custom-1080p`).
- `meme-supreme-tile.jpg` and `weekend-wordmark.svg` were exported from the
  Figma frames. The v1/v2 shadows follow Figma's overlay layers in CSS, made
  denser so they read over the moving wall.
- The tile rim is the "rimming" CodePen (paperli/raMPWJK) in canary and
  clementine.
- `firetv-home-rows.jpg` and `firetv-weekend-appicon.png` are crops of the
  reference captures (`firetv_home.png`, `firetv_paywall.mp4`).
- `tv-*.webp` are the hub's tile exports (the same set as the onboarding's
  landing wall), tilted into the paywall background.
- Figma uses Gilroy for body copy. It isn't in the repo, so Weekend Repro
  Regular stands in.
