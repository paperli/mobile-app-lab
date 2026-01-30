/**
 * Utility to detect if running inside the native iOS app
 */

/**
 * Checks if the app is running inside the native iOS shell
 * @returns true if NativeBridge is available
 */
export function isNativeApp(): boolean {
  return typeof window !== 'undefined' && !!window.NativeBridge?.isNativeApp?.();
}

/**
 * Waits for the native bridge to be ready
 * The bridge fires a 'NativeBridgeReady' event when initialized
 * @param timeout - Maximum time to wait in milliseconds (default: 1000)
 * @returns Promise that resolves to true if bridge is ready, false if timeout
 */
export function waitForNativeBridge(timeout = 1000): Promise<boolean> {
  return new Promise((resolve) => {
    // Already available
    if (isNativeApp()) {
      resolve(true);
      return;
    }

    // Wait for the ready event
    const handler = () => {
      window.removeEventListener('NativeBridgeReady', handler);
      resolve(true);
    };

    window.addEventListener('NativeBridgeReady', handler);

    // Timeout fallback
    setTimeout(() => {
      window.removeEventListener('NativeBridgeReady', handler);
      resolve(isNativeApp());
    }, timeout);
  });
}
