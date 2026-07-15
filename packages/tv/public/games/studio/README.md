# Studio placeholder art

Drop real images here (same filenames) to replace the dashed placeholder boxes
in the Studio create flow. Paths are referenced from `STUDIO_ART` in
`packages/tv/src/components/studio/StudioArt.tsx`.

| File | Where it shows | Suggested framing |
|------|----------------|-------------------|
| `character-mic.png` | Connect screen | Big character holding a mic, center-left of the QR |
| `game-master-prompt.png` | Prompt screen | Game master asking "what game idea do you have?" |
| `game-master-thinking.png` | Generating screen | Game master with a "thinking…" expression |
| `game-master-idle.png` | Jeopardy preview overlay | Small corner game master, neutral (gently floats) |
| `game-master-listening.png` | Jeopardy preview overlay | Same, listening gesture (shown while the mic is held) |
| `jeopardy-podium.png` | Jeopardy preview | The game board / podium filling the top of the screen |

Until a file exists, the UI renders a labeled dashed box so layout stays intact.
Transparent PNGs recommended for the character / game-master art.
