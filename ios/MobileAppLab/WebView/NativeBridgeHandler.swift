import WebKit

/// Handles JavaScript messages from the web view
class NativeBridgeHandler: NSObject, WKScriptMessageHandler {
    static let handlerName = "NativeBridge"

    /// Set by the WebViewContainer coordinator after the WKWebView is built so
    /// outbound events (transcripts, TTS done, etc.) have a target.
    weak var webView: WKWebView?

    private var voiceWired = false

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

        case "dismissController":
            DispatchQueue.main.async {
                NotificationCenter.default.post(name: .dismissController, object: nil)
            }

        case "startSpeechRecognition":
            DispatchQueue.main.async {
                self.wireVoiceServicesIfNeeded()
                SpeechRecognitionService.shared.start()
            }

        case "stopSpeechRecognition":
            DispatchQueue.main.async {
                SpeechRecognitionService.shared.stop()
            }

        case "speak":
            guard let text = body["text"] as? String,
                  let utteranceId = body["utteranceId"] as? String else {
                print("NativeBridge: speak missing text/utteranceId")
                return
            }
            DispatchQueue.main.async {
                self.wireVoiceServicesIfNeeded()
                SpeechSynthesizerService.shared.speak(text, utteranceId: utteranceId)
            }

        case "cancelSpeak":
            DispatchQueue.main.async {
                SpeechSynthesizerService.shared.cancel()
            }

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

    // MARK: - Voice service wiring

    private func wireVoiceServicesIfNeeded() {
        guard !voiceWired else { return }
        voiceWired = true

        SpeechRecognitionService.shared.onResult = { [weak self] transcript, confidence, isFinal in
            self?.dispatch(event: "voiceTranscript", payload: [
                "transcript": transcript,
                "confidence": confidence,
                "isFinal": isFinal,
            ])
        }
        SpeechRecognitionService.shared.onStateChange = { [weak self] state in
            self?.dispatch(event: "voiceState", payload: ["state": state.rawValue])
        }
        SpeechRecognitionService.shared.onVolume = { [weak self] volume in
            self?.dispatch(event: "voiceVolume", payload: ["volume": volume])
        }
        SpeechSynthesizerService.shared.onDone = { [weak self] utteranceId in
            self?.dispatch(event: "speakDone", payload: ["utteranceId": utteranceId])
        }
    }

    // MARK: - Outbound dispatch (Native → JS)

    private func dispatch(event: String, payload: [String: Any]) {
        guard let webView = webView else { return }
        let json: String
        do {
            let data = try JSONSerialization.data(withJSONObject: payload, options: [])
            json = String(data: data, encoding: .utf8) ?? "{}"
        } catch {
            print("NativeBridge: dispatch JSON error \(error)")
            return
        }
        let js = "window.__NativeBridgeDispatch && window.__NativeBridgeDispatch(\(jsString(event)), \(json));"
        DispatchQueue.main.async {
            webView.evaluateJavaScript(js, completionHandler: nil)
        }
    }

    private func jsString(_ s: String) -> String {
        let escaped = s
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "\"", with: "\\\"")
        return "\"\(escaped)\""
    }
}

// MARK: - Notification Names

extension Notification.Name {
    static let dismissController = Notification.Name("dismissController")
}

// MARK: - JavaScript Bridge Injection

extension NativeBridgeHandler {
    /// JavaScript code to inject into the web view
    static var bridgeScript: String {
        """
        (function() {
            // Prevent re-injection
            if (window.NativeBridge) return;

            var listeners = {}; // event name -> Set of callbacks

            window.__NativeBridgeDispatch = function(event, payload) {
                var set = listeners[event];
                if (!set) return;
                set.forEach(function(cb) {
                    try { cb(payload); } catch (e) { console.error('NativeBridge listener error', e); }
                });
            };

            window.NativeBridge = {
                isNativeApp: function() { return true; },

                triggerHaptic: function(type) {
                    window.webkit.messageHandlers.NativeBridge.postMessage({
                        method: 'triggerHaptic',
                        type: type
                    });
                },

                dismissController: function() {
                    window.webkit.messageHandlers.NativeBridge.postMessage({
                        method: 'dismissController'
                    });
                },

                // --- Voice ---

                startSpeechRecognition: function() {
                    window.webkit.messageHandlers.NativeBridge.postMessage({
                        method: 'startSpeechRecognition'
                    });
                },

                stopSpeechRecognition: function() {
                    window.webkit.messageHandlers.NativeBridge.postMessage({
                        method: 'stopSpeechRecognition'
                    });
                },

                speak: function(text, utteranceId) {
                    window.webkit.messageHandlers.NativeBridge.postMessage({
                        method: 'speak',
                        text: text,
                        utteranceId: utteranceId
                    });
                },

                cancelSpeak: function() {
                    window.webkit.messageHandlers.NativeBridge.postMessage({
                        method: 'cancelSpeak'
                    });
                },

                addEventListener: function(event, callback) {
                    if (!listeners[event]) listeners[event] = new Set();
                    listeners[event].add(callback);
                    return function() {
                        if (listeners[event]) listeners[event].delete(callback);
                    };
                },
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
