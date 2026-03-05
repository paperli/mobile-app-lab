import WebKit

/// Holds a reference to the WKWebView so it can be reloaded externally
class WebViewStore: ObservableObject {
    var webView: WKWebView?

    func reload() {
        webView?.reload()
    }
}
