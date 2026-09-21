# Weekend TV Onboarding

The guided first-run flow — host intro, warm-up question, phone pairing, mic
setup, plan and checkout — built on **Lightning 3 + Blits** rather than React,
because it has to run acceptably on TV hardware.

It is a **standalone prototype**. It does not import the hub and the hub does
not import it; they are two bundles that link to each other.

## Running it

```bash
npm run dev:onboarding      # http://localhost:5175
npm run dev:tv              # the hub, on :5173 — needed for the handoff
```

Useful query params:

| Param | Effect |
|---|---|
| `?scene=N` | Jump to a phase (0–10, see `src/catalog.js`) |
| `?quality=1080` | Render at 1080p instead of the 720p default |
| `?renderer=canvas` | Force the Canvas fallback instead of WebGL |
| `?clean=1` | Hide the review toolbar |
| `?hub=<url>` | Override where the hub handoff goes |

## How it connects to the hub

The flow ends at phase 10 (Membership). The old phases 11–12 — a second copy
of the game hub — were removed: the hub prototype in `packages/tv` is the only
one. Three routes lead out, all through `src/hub-link.js`:

- **"Find Your Next Game"** on the final screen
- **"See All Games" / "Skip for Now"** earlier in the flow
- **"Game Hub →"** in the review toolbar

And back the other way: hub9 carries a **Welcome to Weekend** tile
(`packages/tv/src/prototype/hub9/onboarding.ts`) that navigates here, so the
flow stays replayable after setup.

On Pages both ship in one artifact — the hub at `/<base>/`, this at
`/<base>/onboarding/` — so relative paths resolve without either app knowing
the base. `npm run build:pages` from the repo root builds both in order.

## The TV frame

The stage is presented in the same TV bezel as the hub, from the shared
`@weekend/ui/device/tvFrame` — one source of truth for the geometry, the
sub-native rule and the chrome, so the two prototypes can't drift.

The rule: the bezel appears only when the viewport is smaller than 1920×1080.
At native or above the stage runs full-bleed. When the bezel is showing, the
review toolbar drops **below** the TV rather than sitting over the picture, and
its height is reserved before the stage is scaled (`fitStage`'s `reserve`).
`src/tv-frame.css` owns that layout; the bezel's looks are applied in `main.js`
from the shared tokens.

## Host voice

Every scripted line is a recorded ElevenLabs take (voice **Riyadh 2**), mono
MP3 in `public/assets/host/`, mapped from the utterance in `src/vo.js`. A line
with no take, or a take that fails to play, falls back to device TTS — so the
flow still narrates where media autoplay is blocked.

`src/welcome-envelope.json` is a 60 Hz RMS envelope of the intro, used to drive
the orb when Web Audio is unavailable and the analyser can't be read. **If you
replace `welcome.mp3`, regenerate it** or the mouth movement will drift.

## The orb

`src/orb-shader.js` tracks [Speaking Orb Lab][lab], with two deliberate
departures so it can sit on the TV stage: the background is black rather than
the lab's `#080a0e`, and the fragment returns a computed alpha instead of `1.0`.
Voice response (1.4×) and glow (40%) live in `src/host-orb.js`.

[lab]: https://speaking-orb-lab.weekend.chatgpt.site

## Provenance

The sources here were recovered from the `weekend-button-focus` build's source
maps (`sourcesContent`), which carried the original `src/*.js` intact. Two
things did not survive and were reconstructed:

- **`src/style.css`** is the *built* stylesheet — the concatenation of what
  were once `style.css` plus `reference/{tv,arcade-foundation,weekend-brand,
  finale,checkout,studio}.css`. It is minified and not split back out.
- **`blits-renderer`** was a build alias in the original project; `vite.config.js`
  re-aliases it to Blits' `src/launch.js`, which exports the live renderer.

`src/phone-bridge.css` is new — it adapts that recovered stylesheet to the
shared phone modal, and `src/fonts.css` declares faces the recovered stylesheet
doesn't (currently ITC Korinna Std Bold, the Jeopardy! clue face). A face has to
be declared **both** in CSS and in the `faces` map in `src/text.js` — the latter
is what `prepareFonts()` waits on and what the canvas rasteriser asks for, so
adding one without the other silently falls back to Weekend Repro.
