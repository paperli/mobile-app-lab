/**
 * Haptic feedback utility for mobile devices
 * Uses native iOS haptics via NativeBridge when available,
 * falls back to navigator.vibrate() for web/Android
 */

import { isNativeApp } from './isNativeApp';

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'navigation';

/**
 * Triggers haptic feedback using native bridge or web vibration API
 */
function triggerHaptic(type: HapticType, fallbackPattern: number | number[]): void {
  // Try native bridge first (iOS app)
  if (isNativeApp() && window.NativeBridge?.triggerHaptic) {
    window.NativeBridge.triggerHaptic(type);
    return;
  }

  // Fallback to web vibration API (Android Chrome)
  if ('vibrate' in navigator) {
    navigator.vibrate(fallbackPattern);
  }
}

export const HapticFeedback = {
  /**
   * Light tap feedback (10ms)
   * Use for: button presses, taps, mode switching
   */
  light: () => {
    triggerHaptic('light', 5);
  },

  /**
   * Medium feedback (25ms)
   * Use for: confirmations, successful actions
   */
  medium: () => {
    triggerHaptic('medium', 10);
  },

  /**
   * Heavy feedback
   * Use for: emphasis, important actions
   */
  heavy: () => {
    triggerHaptic('heavy', 20);
  },

  /**
   * Success pattern (short-pause-short)
   * Use for: successful pairing, completing actions
   */
  success: () => {
    triggerHaptic('success', [15, 15, 15]);
  },

  /**
   * Error pattern (long-pause-long)
   * Use for: errors, invalid actions
   */
  error: () => {
    triggerHaptic('error', [25, 15, 25]);
  },

  /**
   * Navigation feedback (15ms)
   * Use for: swipes, directional navigation
   */
  navigation: () => {
    triggerHaptic('navigation', 15);
  },

  /**
   * Cancel all ongoing vibrations
   */
  cancel: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  },
};
