// Seconds in the existing Riyadh 2 recordings. Word boundaries transcribed
// locally from 02-quiz-intro.mp3 and 04-voice-intro.mp3; do not retime by FPS.
export const ROUND_TIMELINES = {
  jeopardy: {
    duration: 13.282,
    cues: [
      { at: 0, type: 'music', track: 'jeopardy' },
      { at: .64, type: 'value', text: 'Fresh PUZZLES.\nEvery week.', highlight: 'PUZZLES', icon: 'value-puzzles' },
      { at: 4.72, type: 'board' },
      { at: 5.84, type: 'question' },
      { at: 8.7, type: 'answer', index: 0 },
      { at: 9.48, type: 'answer', index: 1 },
      { at: 10.4, type: 'answer', index: 2 },
      { at: 11.18, type: 'answer', index: 3 },
      { at: 11.76, type: 'ready' },
    ],
  },
  wheel: {
    duration: 10.914,
    cues: [
      { at: 3.5, type: 'value', text: 'Use your VOICE\nto answer.', highlight: 'VOICE', icon: 'value-voice' },
      { at: 5.46, type: 'board' },
      { at: 7.3, type: 'ready' },
      { at: 9.26, type: 'scan' }, // “Scan the code to give it a go.”
    ],
  },
};
