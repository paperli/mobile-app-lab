# Weekend TV Onboarding

The guided first-run flow — host intro, warm-up question, phone pairing, mic
setup, plan and checkout — built on **Lightning 3 + Blits** rather than React,
because it has to run acceptably on TV hardware.

It is a **standalone prototype**. It embeds the separately built hub during
the rehearsal, keeping phone signup and controller state alive across the handoff.

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

## Rehearsing the new flow

- `?scene=4`: camera → detected QR → download page / App Clip sheet → App Store
  → Get → downloading → Open → connecting → microphone permission → zebra
  puzzle mic controller. The TV stays on the zebra puzzle throughout. App Clip
  Open uses the same transition; a phone with mic permission goes straight to
  the mic controller. There is no hub visit or game selection in this handoff.
- `?scene=8`: the TV shows the QR below the carousel, `pair.weekend.com`, code
  `WKND42`, and the Back hint. Get Started on the phone opens mock signup,
  the trial offer, and mock Apple Pay. Confirmation first shows the success
  modal over this same upsell. After its entrance, the upsell clears behind
  it to reveal the hub; the modal remains until Browse Games / OK / Back.
  The Riyadh 2 host invites the user to press OK on their phone. Dismissing
  success stops that prompt; duplicate hub-ready events do not repeat it.
- Press Escape with TV focus to browse the hub while phone checkout remains
  at its current step. Confirming payment opens the hub's existing **Welcome
  to Premium** modal. The phone becomes a D-pad; OK dismisses the modal.
- During the voice puzzle, hold the orb and release to submit the mock answer.
  Brief taps always retry; they never auto-solve after repeated attempts.
  Mic and D-pad screens contain controls, not instructional copy: interaction
  reminders and retry feedback stay on TV. Screen-reader status is retained.
  The mic keeps one Rive instance across ready/listening/retry/submitting
  states, with a matching blue static fallback for loading or failure. Closing
  the phone, losing capture, or cancelling a gesture never submits an answer.
  Back opens the TV game menu and switches the phone to D-pad; choose Resume
  or Exit to games. Settings supports confirmed disconnect. Restart resets the
  phone and embedded hub.

The camera, download, permissions, account, payment, connection, and voice input
are simulations. No app installs, charges, account creation, or audio capture
occur. The QR encodes `https://pair.weekend.com?code=WKND42`; it is illustrative,
not a live server room. Use the phone simulator to rehearse the complete flow.

Mobile visuals adapt `Volley-Inc/arcade-mobile-controller` at `dc484bb`:
the DPad proportions, surfaces and gold select disc; Back–Weekend–Settings
TopBar; and the original `uikit.riv` orb and Weekend mark artwork. The kit
requires React 19; this Lightning/DOM prototype adapts its CSS and uses the
Canvas Rive runtime directly instead of introducing another React version.
The Rive WASM is bundled locally. Assets retain their upstream ownership.

The completed Pick Up & Play Navigation Contract (Draft 3, 2026-09-04), supplied
as a webarchive, distinguishes joining the current game's controller from
exiting to the hub with pairing intact (§3, §16). In this onboarding, app launch
joins the existing zebra puzzle. The hub D-pad follows checkout completion,
explicit browsing, or game exit; it is not an intermediate app-launch screen.

Run `npm test --workspace=@mobile-app-lab/onboarding` for the hub bridge tests.
For a certificate-independent local preview, build with `npm run build:pages`
and serve `packages/tv/dist-demo` with a static HTTP server; open `/onboarding/`.

## How it connects to the hub

The hub prototype in `packages/tv` is the only hub. `src/hub-bridge.js` embeds
it with an explicit parent origin, validates the source and origin of messages,
and relays navigation, trial completion, and sample-game entry. A readiness
handshake handles checkout finishing before the hub has loaded. Phase 10
is a shortcut to the same hub success modal. `src/hub-link.js` resolves URLs:

- **Back / Escape** on the trial upsell
- **Mock checkout completion** or explicit game exit
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

Host prompts use recorded ElevenLabs takes (voice **Riyadh 2**), mono
MP3 in `public/assets/host/`, mapped from the utterance in `src/vo.js`. A line
with no take, or a take that fails to play, falls back to timed captions.
Device TTS is disabled. The trial page currently reuses the existing ElevenLabs
line “Finish on your phone. Your free week is just a few taps away.”

The pairing-success take is `10-pairing-success.mp3`, generated with Riyadh 2
(`0zntkpRCt5aZacqhF4ap`). To regenerate it with the exact mapped copy, set
`ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID`, then run
`node packages/onboarding/scripts/generate-success-voice.mjs`.

To record the exact new trial wording, set `ELEVENLABS_API_KEY` and
`ELEVENLABS_VOICE_ID` (Riyadh 2), then run
`node packages/onboarding/scripts/generate-trial-voice.mjs`. It writes
`08-start-trial.mp3`; add the exact script text to `src/vo.js` and use it in
`Scene.narrate()`. Voice lookup is currently blocked because the available key
lacks `voices_read`; credentials must stay out of the browser bundle.

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
