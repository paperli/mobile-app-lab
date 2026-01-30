import UIKit
import CoreHaptics

/// Provides haptic feedback using UIFeedbackGenerator and Core Haptics
class HapticService {
    static let shared = HapticService()

    private var engine: CHHapticEngine?
    private var supportsHaptics: Bool = false

    // UIFeedback generators (pre-warmed for responsiveness)
    private let lightGenerator = UIImpactFeedbackGenerator(style: .light)
    private let mediumGenerator = UIImpactFeedbackGenerator(style: .medium)
    private let heavyGenerator = UIImpactFeedbackGenerator(style: .heavy)
    private let notificationGenerator = UINotificationFeedbackGenerator()
    private let selectionGenerator = UISelectionFeedbackGenerator()

    private init() {
        setupEngine()
        prepareGenerators()
    }

    // MARK: - Setup

    private func setupEngine() {
        guard CHHapticEngine.capabilitiesForHardware().supportsHaptics else {
            supportsHaptics = false
            return
        }

        supportsHaptics = true

        do {
            engine = try CHHapticEngine()
            engine?.playsHapticsOnly = true

            // Handle engine reset
            engine?.resetHandler = { [weak self] in
                do {
                    try self?.engine?.start()
                } catch {
                    print("Failed to restart haptic engine: \(error)")
                }
            }

            // Handle engine stopped
            engine?.stoppedHandler = { reason in
                print("Haptic engine stopped: \(reason)")
            }

            try engine?.start()
        } catch {
            print("Failed to create haptic engine: \(error)")
            supportsHaptics = false
        }
    }

    private func prepareGenerators() {
        lightGenerator.prepare()
        mediumGenerator.prepare()
        heavyGenerator.prepare()
        notificationGenerator.prepare()
        selectionGenerator.prepare()
    }

    // MARK: - Public API

    /// Triggers haptic feedback based on the type
    func trigger(_ type: HapticType) {
        switch type {
        case .light:
            lightGenerator.impactOccurred()
            lightGenerator.prepare()

        case .medium:
            mediumGenerator.impactOccurred()
            mediumGenerator.prepare()

        case .heavy:
            heavyGenerator.impactOccurred()
            heavyGenerator.prepare()

        case .success:
            notificationGenerator.notificationOccurred(.success)
            notificationGenerator.prepare()

        case .error:
            notificationGenerator.notificationOccurred(.error)
            notificationGenerator.prepare()

        case .navigation:
            selectionGenerator.selectionChanged()
            selectionGenerator.prepare()
        }
    }

    /// Triggers a custom haptic pattern (for future use)
    func triggerCustomPattern(intensity: Float, sharpness: Float, duration: TimeInterval = 0.1) {
        guard supportsHaptics, let engine = engine else {
            // Fallback to basic haptic
            mediumGenerator.impactOccurred()
            return
        }

        do {
            let event = CHHapticEvent(
                eventType: .hapticContinuous,
                parameters: [
                    CHHapticEventParameter(parameterID: .hapticIntensity, value: intensity),
                    CHHapticEventParameter(parameterID: .hapticSharpness, value: sharpness)
                ],
                relativeTime: 0,
                duration: duration
            )

            let pattern = try CHHapticPattern(events: [event], parameters: [])
            let player = try engine.makePlayer(with: pattern)
            try player.start(atTime: CHHapticTimeImmediate)
        } catch {
            print("Failed to play custom haptic: \(error)")
        }
    }
}

// MARK: - Haptic Types

enum HapticType: String {
    case light
    case medium
    case heavy
    case success
    case error
    case navigation

    init?(from string: String) {
        self.init(rawValue: string.lowercased())
    }
}
