# Fire TV Pre-roll Upsell

The pre-roll a Fire TV user sees between tapping a Weekend game ad and the
Amazon system paywall. Mocks the three Figma versions on the Multiplatform Hub
board (Section 1, `preroll v1/v2/v3`), plus two hub-before-paywall variations.

```
Fire TV home (Meme Supreme sponsored hero)
  → OK on Play Now
Fire TV app page (mocked from firetv_see_ads_hero.mp4 at 02:31)
  → Get turns into Downloading… by itself after 1.2s (or OK), with a
    spinner around the download icon; the download takes 2s
App launch: 1s of Weekend Midnight Blue (#0A0322), then a hard cut to
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

**Ident study** (`?v=ident3`, `?v=ident4`, `?v=ident6`, `?v=ident7`) swaps the
Weekend ident for the tiles idents from `weekend/brand/renders/ident_tiles_study/`
(V3 Tiles Reveal, V4 Tiles Slide, V6 Top 10, V7 Top 10 with new art, 1080p) and
skips the upsell: ad → study ident → canary spinner on the ident's final frame
(`loadingDelay`, default 2s) → Fire TV paywall → subscribed hub. V3, V6 and V7 are
listed first on the landing page; V4 is reachable by URL and the review panel only.

V4 and V5 replace the pre-roll upsell with a brief look at the **real Hub9
prototype**: ad → ident → simulated loading → hub preview → the same Fire TV
paywall → subscribed hub. V4 shows the trial hero; V5 starts on the first
editorial hero without the trial promotion. Both previews remain signed out.
The hero stays on its opening slide, and input stays with the pre-roll while
the timed preview is showing.

After the ident, its final frame stays on screen with the onboarding's **52px
canary spinner** below the Weekend logo. This loading pause defaults to **2
seconds**, matching onboarding. Set `loadingDelay=N` or use **Prototype Controls
→ Simulated hub loading** to adjust it from 1–60 seconds. If the hub takes longer
to load, the ident and spinner remain until it is ready; a failed load offers a
retry on this same screen.

The hub preview defaults to **3 seconds**. Set `hubDelay=3` / `4` / `5` in the
URL, or use **Prototype Controls → Hub preview before paywall**, including a
custom duration from 1–60 seconds. The timer starts after the hub's fonts and
artwork load; opening the controls or hiding the tab pauses it, and closing the
controls / returning to the tab restarts the full duration. Restart, Back and
step changes cancel the previous timer.

Plain DOM + Vite, standalone like the onboarding. Nothing is charged.

The Amazon subscription sheet's markup and styling live in
`@weekend/ui/fire-tv-paywall`, shared with the onboarding Fire TV variations.
Pre-roll keeps its existing subscription-to-hub handoff; onboarding adds a Skip
action and continues into its selected first-run experience.

## URLs

Everything lives under `/preroll/`, apart from the hub (`/`) and the
onboarding (`/onboarding/`) — in dev as well as on Pages.

| Page | Dev | Pages |
|---|---|---|
| Versions landing page | https://localhost:5176/preroll/ | `/<base>/preroll/` |
| Prototype | https://localhost:5176/preroll/play.html | `/<base>/preroll/play.html` |

The landing page links V1–V3 with the countdown on (`auto=1`) and V4–V5 with a
2-second loading pause followed by a 3-second hub preview. Each card starts the
full flow from the Fire TV ad, with a second link straight to the pre-roll or hub
preview. The params below go on `play.html`.

- With trial hero: `play.html?v=4&hubDelay=3`
- Without trial hero: `play.html?v=5&hubDelay=3`

## Running it

```bash
npm run dev:preroll   # https://localhost:5176/preroll/
npm run dev:tv        # required for V4/V5 previews and the hub after checkout
```

| Param | Effect |
|---|---|
| `?v=1\|2\|3\|4\|5\|ident3\|ident4\|ident6\|ident7` | V1–V3: upsell; V4: hub with trial hero; V5: hub without trial hero; ident3/ident4/ident6/ident7: study ident, loader, paywall |
| `?bg=pan\|crawl` | Force a background video. Default: v1/v2 pan, v3 crawl |
| `?screen=home\|store\|launch\|ident\|preroll\|loading\|hub\|paywall` | Start on a step (`loading` / `hub` for V4/V5) |
| `?auto=on\|off` (or `1\|0`) | Get Started counts down and continues by itself, or waits for OK. Default: v1 off, v2/v3 on |
| `?countdown=N` | Countdown length in seconds, 1–60 (default 10). Also on the controls panel |
| `?hubDelay=N` | Hub preview duration in seconds, 1–60 (default 3), for V4/V5 |
| `?loadingDelay=N` | Simulated loading on the ident's final frame, in seconds, 1–60 (default 2), for V4/V5 and the ident study |
| `?sound=off` | Start muted |
| `?clean=1` | Hide the review toolbar |
| `?hub=<url>` | Override the hub URL used for checkout and V4/V5 previews |

Keys: arrows, Enter = OK, Escape/Backspace = Back. Clicking works too.

The review toolbar mirrors the onboarding's: **Prototype Controls** (or P /
R / remote red) opens a panel with the version, background-video and step
switches, loading and hub preview timing, plus a direct link to every variation.
Both timers pause while the controls are open or the tab is hidden, then restart
their full duration when the controls close or the tab becomes visible. Esc
closes the panel.

The preview embeds the TV demo with `prerollOrigin` and `trialHero=on|off`.
Its readiness message is checked against both the iframe window and its origin.
Dev uses the hub on port 5173; Pages resolves the hub at `../` within the same
deployment, including under a repository subpath. If loading fails, the preview
offers a retry instead of consuming the delay on a blank frame.

## Assets

- `store-tile-wall.jpg` is `tile-wall-5col-t0.00s.png` from
  `weekend/hub-upsell-video/output/tile-wall-5col-v3-stills/`, tilted and dimmed
  behind the app page as on device.

- `ident-v3-tiles-reveal.mp4`, `ident-v4-tiles-slide.mp4` are copies of
  `Ident_V3_TilesReveal_1080p.mp4` / `Ident_V4_TilesSlide_1080p.mp4`;
  `ident-v3-final.jpg` / `ident-v4-final.jpg` are their last frames for the loader.
- `ident-v6-top10.mp4` is a copy of `Ident_V6_TilesTop10_1080p.mp4` (the top 10
  games by 30-day hub clicks pop up and fade out); `ident-v6-final.jpg` is its last frame.
- `ident-v7-top10-new-art.mp4` is a copy of `Ident_V7_TilesTop10NewArt_1080p.mp4` (V6
  with new art for Sketchy AF, Spot On, Guess the Emoji, Bingo, Weekend Pool and Meme
  Supreme); `ident-v7-final.jpg` is its last frame.

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
