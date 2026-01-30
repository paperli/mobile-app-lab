import WebKit

/// Handles JavaScript messages from the web view
class NativeBridgeHandler: NSObject, WKScriptMessageHandler {
    static let handlerName = "NativeBridge"

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any],
              let method = body["method"] as? String else {
            print("NativeBridge: Invalid message format")
            return
        }

        switch method {
        case "triggerHaptic":
            handleTriggerHaptic(body)

        case "isNativeApp":
            // This is handled synchronously via injected JS
            break

        default:
            print("NativeBridge: Unknown method '\(method)'")
        }
    }

    // MARK: - Method Handlers

    private func handleTriggerHaptic(_ body: [String: Any]) {
        guard let typeString = body["type"] as? String,
              let type = HapticType(from: typeString) else {
            print("NativeBridge: Invalid haptic type")
            return
        }

        DispatchQueue.main.async {
            HapticService.shared.trigger(type)
        }
    }
}

// MARK: - JavaScript Bridge Injection

extension NativeBridgeHandler {
    /// JavaScript code to inject into the web view
    static var bridgeScript: String {
        """
        (function() {
            // Prevent re-injection
            if (window.NativeBridge) return;

            window.NativeBridge = {
                // Indicates we're running in the native app
                isNativeApp: function() {
                    return true;
                },

                // Triggers native haptic feedback
                triggerHaptic: function(type) {
                    window.webkit.messageHandlers.NativeBridge.postMessage({
                        method: 'triggerHaptic',
                        type: type
                    });
                }
            };

            // Dispatch event to notify web app that bridge is ready
            window.dispatchEvent(new CustomEvent('NativeBridgeReady'));

            console.log('NativeBridge initialized');
        })();
        """
    }

    /// Creates a WKUserScript for bridge injection
    static func createUserScript() -> WKUserScript {
        WKUserScript(
            source: bridgeScript,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
    }
}
