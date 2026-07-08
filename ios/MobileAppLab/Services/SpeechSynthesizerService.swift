import AVFoundation

/// Wraps AVSpeechSynthesizer with utterance ids so the JS side can pair a
/// `done` callback to the prompt it kicked off.
final class SpeechSynthesizerService: NSObject, AVSpeechSynthesizerDelegate {
    static let shared = SpeechSynthesizerService()

    /// Called when a given utterance finishes (or is cancelled).
    var onDone: ((String) -> Void)?

    private let synth = AVSpeechSynthesizer()
    private var idsByUtterance: [ObjectIdentifier: String] = [:]

    override init() {
        super.init()
        synth.delegate = self
    }

    func speak(_ text: String, utteranceId: String) {
        // We duck the recognizer's audio session momentarily for playback so
        // the user actually hears the prompt over the open mic.
        configurePlaybackSession()

        let utterance = AVSpeechUtterance(string: text)
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate
        utterance.pitchMultiplier = 1.0
        utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
        idsByUtterance[ObjectIdentifier(utterance)] = utteranceId
        synth.speak(utterance)
    }

    func cancel() {
        synth.stopSpeaking(at: .immediate)
    }

    private func configurePlaybackSession() {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
            try session.setActive(true, options: [])
        } catch {
            print("[SpeechSynth] session error: \(error)")
        }
    }

    // MARK: - AVSpeechSynthesizerDelegate

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        emitDone(for: utterance)
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        emitDone(for: utterance)
    }

    private func emitDone(for utterance: AVSpeechUtterance) {
        let key = ObjectIdentifier(utterance)
        if let id = idsByUtterance.removeValue(forKey: key) {
            onDone?(id)
        }
    }
}
