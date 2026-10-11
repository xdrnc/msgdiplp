/**
 * Delay utility for artificial delay simulation in demo mode.
 * Provides a simple promise-based delay function.
 */

/**
 * Creates a delay promise that resolves after the specified milliseconds.
 * @param {number} ms - Delay duration in milliseconds
 * @returns {Promise<void>} Promise that resolves after the delay
 */
export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a delay promise that can be cancelled via AbortSignal.
 * @param {number} ms - Delay duration in milliseconds
 * @param {AbortSignal} [signal] - Optional AbortSignal for cancellation
 * @returns {Promise<void>} Promise that resolves after the delay or rejects if aborted
 */
export function delayWithAbort(ms, signal) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(resolve, ms);
    
    if (signal) {
      const abortHandler = () => {
        clearTimeout(timeoutId);
        reject(new DOMException('Aborted', 'AbortError'));
      };
      
      if (signal.aborted) {
        abortHandler();
      } else {
        signal.addEventListener('abort', abortHandler, { once: true });
      }
    }
  });
}

/**
 * Default delay configuration for the demo.
 * @type {Object}
 * @property {boolean} enabled - Master toggle for all delays
 * @property {number} duration - Delay duration in milliseconds
 * @property {boolean} phase1 - Enable delay for Phase 1 fetch
 * @property {boolean} phase2 - Enable delay for Phase 2 fetch
 */
export const defaultDelayConfig = {
  enabled: false,
  duration: 1000,
  phase1: true,
  phase2: true,
};

/**
 * Validates and normalizes delay configuration.
 * @param {Object} config - Partial delay configuration
 * @returns {Object} Normalized delay configuration with defaults
 */
export function normalizeDelayConfig(config = {}) {
  return {
    enabled: Boolean(config.enabled),
    duration: Math.max(0, Number(config.duration) || 0),
    phase1: Boolean(config.phase1),
    phase2: Boolean(config.phase2),
  };
}