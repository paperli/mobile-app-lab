import Foundation

enum AppConfig {
    // MARK: - Environment Detection

    static var isProduction: Bool {
        #if DEBUG
        return false
        #else
        return true
        #endif
    }

    // MARK: - Server URLs

    /// The base URL for the mobile web app
    static var mobileWebURL: URL {
        if isProduction {
            // Production URL (Render.com deployment)
            return URL(string: "https://mobile-lab-mobile.onrender.com")!
        } else {
            // Development URL - uses local network IP
            // Update this when your network IP changes
            return URL(string: developmentBaseURL)!
        }
    }

    /// Development base URL - configured via environment or defaults
    private static var developmentBaseURL: String {
        // Check for environment variable first
        if let envURL = ProcessInfo.processInfo.environment["MOBILE_WEB_URL"] {
            return envURL
        }

        #if targetEnvironment(simulator)
        // Simulator can use localhost
        return "https://localhost:5174"
        #else
        // Physical device needs the Mac's network IP
        // Update this IP when your network changes (run ./setup-https.sh)
        return "https://192.168.50.72:5174"
        #endif
    }

    // MARK: - URL Construction

    /// Constructs the controller URL with room code and native flag
    static func controllerURL(roomCode: String) -> URL {
        var components = URLComponents(url: mobileWebURL, resolvingAgainstBaseURL: false)!
        components.queryItems = [
            URLQueryItem(name: "code", value: roomCode),
            URLQueryItem(name: "native", value: "1")
        ]
        return components.url!
    }

    // MARK: - URL Scheme

    static let urlScheme = "mobileapplab"

    /// Parses a deep link URL to extract the room code
    static func parseDeepLink(_ url: URL) -> String? {
        // Handle custom URL scheme: mobileapplab://pair?code=123456
        if url.scheme == urlScheme {
            let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
            return components?.queryItems?.first(where: { $0.name == "code" })?.value
        }

        // Handle universal links or scanned URLs: https://domain?code=123456
        if url.scheme == "https" || url.scheme == "http" {
            let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
            return components?.queryItems?.first(where: { $0.name == "code" })?.value
        }

        return nil
    }
}
