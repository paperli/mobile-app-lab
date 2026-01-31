import SwiftUI
import WebKit

/// SwiftUI wrapper for WKWebView with native bridge support
struct WebViewContainer: UIViewRepresentable {
    let url: URL
    @Binding var isLoading: Bool
    @Binding var loadError: Error?

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()

        // Enable inline media playback (for voice visualization)
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []

        // Add native bridge handler
        let contentController = WKUserContentController()
        contentController.add(context.coordinator, name: NativeBridgeHandler.handlerName)
        contentController.addUserScript(NativeBridgeHandler.createUserScript())
        configuration.userContentController = contentController

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.bounces = false

        // Allow inspection in Safari for debugging
        #if DEBUG
        if #available(iOS 16.4, *) {
            webView.isInspectable = true
        }
        #endif

        // Set a mobile-like user agent to ensure proper rendering
        webView.customUserAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MobileAppLab/1.0"

        // Load the initial URL
        context.coordinator.loadURLIfNeeded(webView: webView, url: url)

        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        // Only load if URL has actually changed (handled by coordinator to prevent duplicate loads)
        context.coordinator.loadURLIfNeeded(webView: webView, url: url)
    }

    // MARK: - Coordinator

    class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        var parent: WebViewContainer
        private let bridgeHandler = NativeBridgeHandler()
        private var loadedURL: URL?
        private var isLoadInProgress = false

        init(_ parent: WebViewContainer) {
            self.parent = parent
        }

        /// Load URL only if it hasn't been loaded yet or if it's a different URL
        /// This prevents the -999 error caused by multiple rapid load() calls
        func loadURLIfNeeded(webView: WKWebView, url: URL) {
            // Skip if we're already loading this URL or have loaded it
            if isLoadInProgress && loadedURL == url {
                return
            }

            // Skip if the webView has already loaded this URL
            if let currentURL = webView.url, currentURL.absoluteString == url.absoluteString {
                return
            }

            // Skip if we've already initiated a load for this URL
            if loadedURL == url {
                return
            }

            // Load the new URL
            loadedURL = url
            isLoadInProgress = true
            let request = URLRequest(url: url)
            webView.load(request)
        }

        // MARK: - WKScriptMessageHandler

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            bridgeHandler.userContentController(userContentController, didReceive: message)
        }

        // MARK: - WKNavigationDelegate

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            DispatchQueue.main.async {
                self.parent.isLoading = true
                self.parent.loadError = nil
            }
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            isLoadInProgress = false
            DispatchQueue.main.async {
                self.parent.isLoading = false
            }
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            isLoadInProgress = false
            DispatchQueue.main.async {
                self.parent.isLoading = false
                self.parent.loadError = error
            }
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            // Only report non-cancelled errors (code -999 is NSURLErrorCancelled)
            let nsError = error as NSError
            if nsError.code == NSURLErrorCancelled {
                // Ignore cancellation errors - these happen when we navigate away or reload
                return
            }

            isLoadInProgress = false
            loadedURL = nil  // Allow retry on actual failures
            DispatchQueue.main.async {
                self.parent.isLoading = false
                self.parent.loadError = error
            }
        }

        // Handle SSL certificate errors for local development
        func webView(_ webView: WKWebView, didReceive challenge: URLAuthenticationChallenge, completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
            #if DEBUG
            // In debug mode, accept self-signed certificates for local development
            if challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
               let serverTrust = challenge.protectionSpace.serverTrust {
                let credential = URLCredential(trust: serverTrust)
                completionHandler(.useCredential, credential)
                return
            }
            #endif

            completionHandler(.performDefaultHandling, nil)
        }
    }
}
