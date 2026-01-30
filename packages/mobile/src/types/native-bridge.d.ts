/**
 * TypeScript declarations for the native iOS bridge
 * The NativeBridge object is injected by the iOS app via WKWebView
 */

declare global {
  interface Window {
    /**
     * Native bridge object injected by iOS app
     * Only available when running inside the iOS shell app
     */
    NativeBridge?: {
      /**
       * Returns true if running inside the native iOS app
       */
      isNativeApp: () => boolean;

      /**
       * Triggers native haptic feedback
       * @param type - The type of haptic feedback to trigger
       */
      triggerHaptic: (
        type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'navigation'
      ) => void;

      // Future: Voice recognition methods
      // startVoiceRecognition: () => Promise<string>;
      // stopVoiceRecognition: () => void;
    };

    /**
     * WebKit message handlers (for posting messages to native)
     */
    webkit?: {
      messageHandlers?: {
        NativeBridge?: {
          postMessage: (message: unknown) => void;
        };
      };
    };
  }
}

export {};
