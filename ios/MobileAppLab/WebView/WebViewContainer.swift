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

        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        // Only load if URL has changed
        if webView.url != url {
            let request = URLRequest(url: url)
            webView.load(request)
        }
    }

    // MARK: - Coordinator

    class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        var parent: WebViewContainer
        private let bridgeHandler = NativeBridgeHandler()

        init(_ parent: WebViewContainer) {
            self.parent = parent
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
            DispatchQueue.main.async {
                self.parent.isLoading = false
            }
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            DispatchQueue.main.async {
                self.parent.isLoading = false
                self.parent.loadError = error
            }
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
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
