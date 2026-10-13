/**
 * Reusable fetch client with AbortController support for request cancellation
 * Uses native fetch - no external dependencies
 */

const BASE_URL = 'https://dummyjson.com';

/**
 * Creates a configured fetch client
 * @param {string} baseUrl - Base API URL
 * @returns {Object} Client with get() method and createAbortController()
 */
export function createFetchClient(baseUrl = BASE_URL) {
  /**
   * Performs a GET request with cancellation support
   * @param {string} endpoint - API endpoint (e.g., '/products')
   * @param {Object} [options={}] - Request options
   * @param {AbortSignal} [options.signal] - External abort signal to listen to
   * @param {Object} [options.params] - Query parameters as key-value pairs
   * @param {Object} [options.headers] - Additional headers
   * @returns {Promise<Object>} Parsed JSON response
   */
  async function get(endpoint, options = {}) {
    const { signal, params, headers, ...fetchOptions } = options;
    
    // Build URL with query parameters using URLSearchParams (handles encoding)
    const url = new URL(`${baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    // Create our own AbortController for internal cancellation
    const controller = new AbortController();
    const internalSignal = controller.signal;
    
    // If caller provided an external signal, link it to our controller
    // This allows: caller aborts → our request aborts
    // Store handler reference so we can remove it later (same function object)
    const abortHandler = () => controller.abort();
    
    if (signal) {
      // If already aborted, abort immediately
      if (signal.aborted) {
        controller.abort();
      } else {
        // Listen for external abort
        signal.addEventListener('abort', abortHandler, { once: true });
      }
    }
    
    try {
      const response = await fetch(url.toString(), {
        ...fetchOptions,
        signal: internalSignal,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      });
      
      // Handle HTTP errors (4xx, 5xx)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Parse JSON
      return await response.json();
      
    } catch (error) {
      // AbortError is expected when cancelled - don't treat as failure
      if (error.name === 'AbortError' || error.name === 'CancellationError') {
        // Throw a plain object (not Error) so callers can easily check
        throw { name: 'AbortError', message: 'Request cancelled' };
      }
      // Re-throw other errors (network, HTTP, JSON parse)
      throw error;
      
    } finally {
      // Clean up event listener to prevent memory leaks
      // Use the SAME function reference that was added
      if (signal) {
        signal.removeEventListener('abort', abortHandler);
      }
    }
  }
  
  return {
    get,
    /**
     * Creates a new AbortController for manual cancellation
     * @returns {AbortController}
     */
    createAbortController() {
      return new AbortController();
    },
  };
}

/**
 * Default client instance for simple use cases
 * @type {ReturnType<createFetchClient>}
 */
export const fetchClient = createFetchClient();

/**
 * Convenience function for one-off requests without creating a client
 * @param {string} endpoint
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export async function fetchWithAbort(endpoint, options = {}) {
  return fetchClient.get(endpoint, options);
}