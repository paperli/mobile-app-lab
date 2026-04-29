import Foundation
import AVFoundation
import QuartzCore
import Speech

/// Continuous on-device speech recognition. Streams interim + final
/// transcripts to a callback, restarting itself when SFSpeechRecognitionTask
/// ends (Apple caps each task; we just chain new ones).
final class SpeechRecognitionService: NSObject {
    static let shared = SpeechRecognitionService()

    enum State: String {
        case idle
        case listening
        case denied
        case unavailable
    }

    /// transcript, recognizerConfidence (0..1), isFinal
    var onResult: ((String, Float, Bool) -> Void)?
    var onStateChange: ((State) -> Void)?
    /// Normalized 0..1 volume sampled from the same audio tap as recognition.
    /// Throttled internally so JS doesn't get flooded.
    var onVolume: ((Float) -> Void)?

    private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    private let audioEngine = AVAudioEngine()
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private(set) var state: State = .idle {
        didSet {
            if oldValue != state { onStateChange?(state) }
        }
    }

    /// True once the user wants the mic on. Survives task chaining so that
    /// when one SFSpeechRecognitionTask ends we know whether to start the next.
    private var keepAlive = false

    // Volume throttling state — only emit ~30Hz to keep the JS bridge cheap.
    private var lastVolumeEmit: TimeInterval = 0
    private let volumeMinInterval: TimeInterval = 1.0 / 30.0

    func requestAuthorization(_ completion: @escaping (Bool) -> Void) {
        SFSpeechRecognizer.requestAuthorization { [weak self] auth in
            guard let self = self else { return }
            if auth != .authorized {
                DispatchQueue.main.async {
                    self.state = .denied
                    completion(false)
                }
                return
            }
            AVAudioSession.sharedInstance().requestRecordPermission { granted in
                DispatchQueue.main.async {
                    if !granted { self.state = .denied }
                    completion(granted)
                }
            }
        }
    }

    func start() {
        guard !keepAlive else { return }
        keepAlive = true
        requestAuthorization { [weak self] granted in
            guard let self = self else { return }
            guard granted else { return }
            guard let recognizer = self.recognizer, recognizer.isAvailable else {
                self.state = .unavailable
                return
            }
            self.startTask()
        }
    }

    func stop() {
        keepAlive = false
        teardown()
        state = .idle
    }

    private func startTask() {
        teardown()

        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.record, mode: .measurement, options: .duckOthers)
            try session.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            print("[SpeechRecognition] AVAudioSession error: \(error)")
            state = .unavailable
            return
        }

        let req = SFSpeechAudioBufferRecognitionRequest()
        req.shouldReportPartialResults = true
        // Force on-device when supported — lower latency, no network round-trip.
        if #available(iOS 13.0, *), recognizer?.supportsOnDeviceRecognition == true {
            req.requiresOnDeviceRecognition = true
        }
        request = req

        let inputNode = audioEngine.inputNode
        let format = inputNode.outputFormat(forBus: 0)
        inputNode.removeTap(onBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
            guard let self = self else { return }
            self.request?.append(buffer)
            self.emitVolume(from: buffer)
        }

        audioEngine.prepare()
        do {
            try audioEngine.start()
        } catch {
            print("[SpeechRecognition] audioEngine.start failed: \(error)")
            state = .unavailable
            return
        }

        guard let recognizer = recognizer else { return }
        task = recognizer.recognitionTask(with: req) { [weak self] result, error in
            guard let self = self else { return }
            if let result = result {
                let text = result.bestTranscription.formattedString
                let segments = result.bestTranscription.segments
                let avgConfidence: Float = segments.isEmpty
                    ? 0
                    : segments.map { $0.confidence }.reduce(0, +) / Float(segments.count)
                self.onResult?(text, avgConfidence, result.isFinal)
                if result.isFinal {
                    self.restartIfNeeded()
                }
            }
            if let error = error {
                let nsError = error as NSError
                // 216 / 1110 etc. just mean the task ended; chain a new one.
                if self.keepAlive {
                    print("[SpeechRecognition] task ended (\(nsError.code)), restarting")
                    self.restartIfNeeded()
                }
            }
        }

        state = .listening
    }

    private func restartIfNeeded() {
        // Tear down before restarting so audio session/tap don't double-up.
        teardown()
        guard keepAlive else {
            state = .idle
            return
        }
        // Slight delay to let the audio session settle before re-arming.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { [weak self] in
            guard let self = self, self.keepAlive else { return }
            self.startTask()
        }
    }

    private func emitVolume(from buffer: AVAudioPCMBuffer) {
        guard let onVolume = onVolume else { return }
        let now = CACurrentMediaTime()
        if now - lastVolumeEmit < volumeMinInterval { return }
        lastVolumeEmit = now

        guard let channelData = buffer.floatChannelData else { return }
        let frameLength = Int(buffer.frameLength)
        if frameLength == 0 { return }
        let samples = channelData[0]
        var sum: Float = 0
        for i in 0..<frameLength {
            let v = samples[i]
            sum += v * v
        }
        let rms = sqrtf(sum / Float(frameLength))
        // Speech is quiet; soft amplification + clamp matches the prior
        // useVoiceInput curve so the wave looks the same.
        let amplified = min(1.0, rms * 6.0)
        DispatchQueue.main.async {
            onVolume(amplified)
        }
    }

    private func teardown() {
        if audioEngine.isRunning {
            audioEngine.stop()
            audioEngine.inputNode.removeTap(onBus: 0)
        }
        request?.endAudio()
        request = nil
        task?.cancel()
        task = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }
}
