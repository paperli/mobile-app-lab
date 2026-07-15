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

    /// Development base URL — resolution order:
    ///   1. A URL the user set in-app (or one remembered from a scanned QR),
    ///   2. the MOBILE_WEB_URL environment variable,
    ///   3. the compiled-in default.
    /// This means a changing network IP no longer requires an app rebuild — the
    /// user sets it once in Settings (or just scans a QR, which remembers the host).
    private static var developmentBaseURL: String {
        if let saved = savedServerBaseURL, !saved.isEmpty {
            return saved
        }
        if let envURL = ProcessInfo.processInfo.environment["MOBILE_WEB_URL"] {
            return envURL
        }
        return defaultDevBaseURL
    }

    /// Compiled-in fallback (used until the user sets a server or scans a QR).
    private static var defaultDevBaseURL: String {
        #if targetEnvironment(simulator)
        return "https://localhost:5174"
        #else
        // Physical-device default; overridden by the in-app Server setting.
        return "https://192.168.50.71:5174"
        #endif
    }

    // MARK: - Runtime server configuration (no rebuild needed on IP change)

    private static let serverURLKey = "dev_server_base_url"

    /// The user-set / last-scanned dev server base URL, if any.
    static var savedServerBaseURL: String? {
        UserDefaults.standard.string(forKey: serverURLKey)
    }

    /// The base URL currently used for manual code entry / deep links (for display).
    static var currentDevServerBaseURL: String {
        savedServerBaseURL ?? defaultDevBaseURL
    }

    /// Persist a user-typed server (host, host:port, or full URL). Empty clears it.
    static func saveServerBaseURL(_ raw: String) {
        let normalized = normalizeBaseURL(raw)
        if normalized.isEmpty {
            UserDefaults.standard.removeObject(forKey: serverURLKey)
        } else {
            UserDefaults.standard.set(normalized, forKey: serverURLKey)
        }
    }

    /// Remember the scheme/host/port from a scanned QR so later manual entry works
    /// on the same network without any typing.
    static func rememberHost(from sourceURL: URL) {
        guard let scheme = sourceURL.scheme, let host = sourceURL.host else { return }
        let port = sourceURL.port ?? 5174
        UserDefaults.standard.set("\(scheme)://\(host):\(port)", forKey: serverURLKey)
    }

    /// Normalize free-form input into "https://host:port". Defaults scheme=https,
    /// port=5174. Returns "" if it can't be parsed.
    static func normalizeBaseURL(_ raw: String) -> String {
        var s = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if s.isEmpty { return "" }
        if !s.contains("://") { s = "https://" + s }
        guard var comps = URLComponents(string: s) else { return "" }
        if comps.scheme == nil { comps.scheme = "https" }
        if comps.port == nil { comps.port = 5174 }
        comps.path = ""
        comps.query = nil
        return comps.url?.absoluteString ?? ""
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

    /// Constructs the controller URL from a scanned QR code URL
    /// Uses the scanned URL's scheme/host/port instead of the hardcoded IP, and
    /// remembers that host so manual code entry works afterwards on this network.
    static func controllerURL(from sourceURL: URL, roomCode: String) -> URL {
        rememberHost(from: sourceURL)
        var components = URLComponents(url: sourceURL, resolvingAgainstBaseURL: false)!
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
