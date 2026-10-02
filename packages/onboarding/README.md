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
- `?scene=8`: phones go directly to **Game night, every night.** with Google,
  Apple and email signup choices, then the existing Premium paywall (monthly/yearly), a simulated App Store
  confirmation, success, and the hub D-pad. The TV shows a larger QR when
  unpaired and a smaller QR plus a connected status once a phone joins.
- Jeopardy’s single **Fresh PUZZLES. Every week.** message follows
  the recorded host. Both rounds use two-line copy inside the stage frame,
  with a gold calendar/puzzle icon or microphone above it.
  The question reveals in the board's center, then moves up as the first answer
  pops in. Each answer scales up as its name is spoken. Focus appears after the final pop. Wheel’s
  **Use your VOICE to answer.** follows the voice, then the tiles flip with clicks.
  Both rounds use game music that ducks under speech and mutes during mic input;
  correct answers use a recorded crowd cheer. Replay restarts speech and visuals
  together. Sound-off and reduced-motion modes preserve the recorded pacing.
- Every TV step after the intro has a bottom-right **Skip** (called **See All Games**
  on the upsell). It starts unfocused;
  Right/Down reaches it, including from the right/bottom edge of the answer
  grid. Skipping a game shows Mars/Zebra before continuing to the next step.
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

The camera, download, permissions, account, payment, and voice input are
simulations. No app installs, charges, account creation, or audio capture occur.
Mock email/password fields are discarded on submit and never sent to the server.

## Public preview and real phones

```bash
npm run build:pages
npm run serve:public --workspace=@mobile-app-lab/onboarding
# In a second terminal:
ngrok http http://127.0.0.1:4180 --inspect=false
```

Open the HTTPS tunnel URL at `/onboarding/?clean=1` on the TV/computer. Scan its
QR with a phone on **any network**. The preview server relays controller actions
and onboarding state in memory; each TV gets its own random room. Keep the TV
page open. Rooms expire five minutes after the host disconnects. The relay serves
only the built artifact, and its port binds to loopback.

`/onboarding/?scene=8&mobile=1` is a full-screen, independent mobile signup preview.
`/onboarding/?scene=8` starts the full rehearsal at the upsell. With a real phone
connected, the desktop phone simulator hides automatically. `?clean=1` also hides
it, keeping the QR unobstructed. In a static-only deployment without the relay,
the illustrative QR and desktop simulator remain available.

The public tunnel requires this Mac to stay awake and both processes to stay
running. Run them in persistent terminals or detached processes, since a coding
session's foreground jobs may end with that session. It does not publish or
change either upstream product repository. If the ngrok URL already serves the
separate landing preview, set `LANDING_PREVIEW_URL=http://127.0.0.1:5173` on the
preview server to forward `/web-checkout/` to that existing service.

### Design references

- Signup landing: the supplied phone screenshot — game-art wall, Weekend wordmark,
  “Game night, every night.” and Google / Apple / email choices. Email opens the
  existing account form; social buttons simulate sign-in without calling OAuth.
- Trial, App Store sheet and success: the user's
  [Weekend mobile prototype](https://weekend-entertainment.vercel.app/#mobile?theme=dark&paywall=trial),
  inspected October 1, 2026. Reuses its trial timeline, $0 today / $14.99 monthly
  offer, game artwork, app icon and success mark. The date is calculated seven
  days from today. Prices are reference-prototype values; no purchase occurs.
- Email form and legal destinations: `Volley-Inc/weekend-games-ios` at `1e5b4f3`,
  `Screens/EmailAuthView.swift` and `App/LegalLinks.swift`.
- TV hero and artwork: the **local** hub repo's
  `apps/web-checkout/src/screens/LandingScreen.tsx`, its stylesheet, and
  `src/assets/landing-wall/`. The prototype does not modify or publish that repo.

### Verification

```bash
npm test --workspace=@mobile-app-lab/onboarding
npx playwright install chromium
# Start serve:public first, after build:pages.
npm run test:e2e --workspace=@mobile-app-lab/onboarding
# Optional: run against an HTTPS preview.
PREVIEW_URL=https://your-preview-host npm run test:e2e --workspace=@mobile-app-lab/onboarding
```

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

`src/orb-shader.js` uses **A · Honey & Champagne** from [Speaking Orb Lab][lab]
(published version 8), including its glossy reflections and inward rim feather.
The TV adaptation replaces the flat background with premultiplied transparency
and fades the quad's edges at full speech expansion. Voice response (1.4×) and
glow (40%) live in `src/host-orb.js`.

The opening brings up the empty studio over 3.2 seconds. The orb enters on its
original cue, and the host starts speaking at 2.25 seconds while the stage is
still revealing. Jeopardy's orb travels directly from the
welcome to the side of its value text. The Wheel move follows its recorded
voice cue. The orb drops below the board for the reveal, and moves along the
floor as Jeopardy options
appear. Answer reveals lift it to the left of the Jeopardy result and the right
of the Wheel result; a gentle drift and
celebration hop keep it active between cues. Movement becomes minimal during
microphone input, and reduced motion removes travel animation and drift.
On Wheel, it moves immediately left of the pairing QR on “Scan” at 9.26 seconds
in the host recording, then nudges toward the code. On the large-QR upsell, the orb sits
immediately left of the code at the same height; the paired layout keeps it
below its smaller left-hand QR. It sits beside the centered finish-on-phone QR.
The transparent Lightning canvas stays above the full-height HTML upsell, so
the halo never meets an HTML panel edge. The outgoing studio fades away to
reveal that backdrop. Game art is warmed during the intro, and QR/connection
updates preserve the existing upsell instead of removing and rebuilding it.
One persistent shader node survives scene changes; pause and replay cancel
pending motion. The rehearsal diagnostics show its current pose and position.

Value proposition artwork uses direction 02 (Playful 3D) from the icon study
for both `public/assets/icons/value-puzzles.png` and `value-voice.png`.
Original artwork and prompts are
preserved in the repository's `output/icon-directions/` folder.
The words “PUZZLES” and “VOICE” are uppercase in Repro Bold and use a left-to-right
Canary (`#FFDA0A`) → Clementine (`#FB7928`) gradient; the rest is white Repro Medium.

[lab]: https://speaking-orb-lab.weekend.chatgpt.site/?tint=honey

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
