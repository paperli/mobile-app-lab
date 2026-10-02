# Onboarding game audio

Game audio from the existing local Weekend repositories and the supplied Jeopardy track.

- `jeopardy-countdown.mp3`: the supplied [final_jeopardy_countdown_SFX.wav](https://1drv.ms/u/c/623fa9e7bdcdd322/IQAi082956k_IIBiEPgEAAAAAfr_i9uLXKNdJK-zJaFtLg0), converted to stereo 44.1 kHz / 192 kbps MP3 with a fixed -9.49 dB gain. The final MP3 measures -24.24 LUFS integrated, matching the previous track. Its full 30.54-second arrangement and dynamics are retained. The host's opening line starts the music at .40 gain; it rises to the unchanged .72 gain when speech ends. The slightly stronger speech mix makes its soft opening audible at a similar background level to Wheel.
- `jeopardy-theme.mp3`: the previous loop from `volley/tv/projects/jeopardy/roku/jeopardy-oak/assets/sfx/intro_music_loop_processed.mp3`, retained as the loudness reference; no longer played.
- `wheel-theme.mp3`: `wheel-of-fortune/packages/art-assets/audio/music/MU_WoF_ClassicMode_Gameplay_Loop.mp3` (full authored loop; mono, 24 kHz, 80 kbps to reduce TV decoding memory).
- `crowd-cheer.mp3`: `wheel-of-fortune/packages/art-assets/audio/sfx/SFX_WoF_Crowd_Cheer_OneShot.mp3`.
- `wheel-tile.mp3`: `wheel-of-fortune/packages/art-assets/audio/sfx/SFX_WoF_Tile_Toggle_OneShot_01.mp3`.

`src/soundtrack.js` controls levels, speech ducking, microphone muting and cancellation. Jeopardy’s short pop effects are synthesized. The applause effect is a real crowd recording.

`src/round-timeline.js` contains word boundaries transcribed locally with Whisper base.en from the unchanged host MP3s. Visual cues use the actual playback clock (Web Audio or media element), with the same durations for muted/caption-only rehearsals. Reduced motion removes scaling and flipping without rushing the host.
