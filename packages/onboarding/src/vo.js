// Recorded host lines (ElevenLabs · Riyadh 2, mono MP3 @ 96k).
//
// Keyed by the exact utterance so scene.js keeps passing plain strings and
// nothing else has to learn about audio ids. Any line missing from this table
// — or any file that fails to load — falls through to device TTS, so the flow
// still narrates on a TV whose browser blocks media autoplay.
const TAKES = [
 ["Hi friend. Welcome to Weekend. Get comfortable, and let your voice do the playing. A little music, a little trivia, and a few surprises. Ready? Your next great game night starts here.",
  'welcome'],
 ["On Weekend, discover puzzles and games, with fresh challenges every week. Now try this one. Which planet is known as the Red Planet? Venus, Mars, Jupiter, or Mercury. What’s your answer?",
  '02-quiz-intro'],
 ["That’s right! Mars. What a start!",
  '03-correct-a'],
 ["You nailed it! Mars is the Red Planet.",
  '03-correct-b'],
 ["Yes! Mars. You’re already on a roll.",
  '03-correct-c'],
 ["Almost there! It’s Mars. That was just our warm-up.",
  '03-incorrect-a'],
 ["Good try! The answer is Mars. Let’s give you another one.",
  '03-incorrect-b'],
 ["You’re in the game! That one was Mars. Ready for something different?",
  '03-incorrect-c'],
 ["Now, let’s make it even more natural. On Weekend, you can use your voice to answer. Black and white, wild all over. Do you know this animal? Scan the code to give it a go.",
  '04-voice-intro'],
 ["Your phone is the buzzer and the microphone during the game. Allow microphone access so your answer can reach the TV.",
  '05-mic-permission'],
 ["Nice work! When you’re ready, press and hold the mic button on your phone, say your answer, then let go.",
  '06-hold-to-speak'],
 ["Zebra! You’ve got it. Now that sounds like a game show answer!",
  '07-zebra-a'],
 ["That’s it! Zebra. You’re a natural.",
  '07-zebra-b'],
 ["Yes! Zebra. Give yourself a big round of applause!",
  '07-zebra-c'],
 ["Great job! Sounds like you’re ready to play. Let’s get your Weekend plan started. One subscription, all our games. Choose Sign In on Your Phone, or take a look around.",
  '08-plan'],
 ["Finish on your phone. Your free week is just a few taps away.",
  '09-finish-on-phone'],
 ["Welcome to the club! Your Weekend membership is ready. Let’s find your next game.",
  '10-welcome-to-club'],
 ["Download the Weekend app on your phone to continue.",
  'x-download-app'],
 ["Press and hold the mic button on your phone, and speak your answer.",
  'x-hold-retry'],
 ["No problem. You can turn on the microphone in Settings, or skip and explore.",
  'x-mic-denied'],
]

/** Absolute-free asset path, so the build works under any Pages sub-path. */
export const takeUrl = (name) => 'assets/host/' + name + '.mp3'

const index = new Map(TAKES.map(([text, file]) => [text, file]))

/** The recorded take for an utterance, or undefined when there isn't one. */
export const takeFor = (text) => index.get(text)

/** Every recorded take, for preloading. */
export const allTakes = () => TAKES.map(([, file]) => file)
