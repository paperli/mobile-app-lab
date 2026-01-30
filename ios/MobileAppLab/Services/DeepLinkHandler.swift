import Foundation
import Combine

/// Handles deep links and URL scheme navigation
class DeepLinkHandler: ObservableObject {
    /// The room code extracted from a deep link, if any
    @Published var pendingRoomCode: String?

    /// Whether a deep link was received and is ready to process
    @Published var hasDeepLink: Bool = false

    /// Handles an incoming URL
    func handle(url: URL) {
        if let code = AppConfig.parseDeepLink(url) {
            pendingRoomCode = code
            hasDeepLink = true
        }
    }

    /// Clears the pending deep link after it's been processed
    func clearDeepLink() {
        pendingRoomCode = nil
        hasDeepLink = false
    }
}
