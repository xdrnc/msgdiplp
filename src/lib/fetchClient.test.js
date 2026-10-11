/**
 * Simple unit tests for fetchClient
 * Covers: successful fetch, cancellation (AbortController), HTTP errors
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFetchClient, fetchClient } from './fetchClient';

// Save original fetch to restore later
const originalFetch = global.fetch;

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe('fetchClient', () => {
  // Test 1: Successful fetch returns parsed JSON
  it('fetches data and returns parsed JSON', async () => {
    // Arrange: mock successful response
    const mockData = { products: [{ id: 1, title: 'Test Product' }], total: 1 };
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });
    
    const client = createFetchClient('https://api.test');
    
    // Act: call the client
    const result = await client.get('/products');
    
    // Assert: check result and that fetch was called correctly
    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.test/products',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  // Test 2: Query parameters are properly encoded in URL
  it('builds URL with query parameters', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ products: [] }),
    });
    
    const client = createFetchClient('https://api.test');
    await client.get('/products', { params: { limit: 16, skip: 0, select: 'title,price' } });
    
    // Check URL has encoded params (comma becomes %2C)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.test/products?limit=16&skip=0&select=title%2Cprice',
      expect.any(Object)
    );
  });

  // Test 3: HTTP errors (4xx, 5xx) throw an error
  it('throws on HTTP error like 404 or 500', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });
    
    const client = createFetchClient();
    
    await expect(client.get('/products/999')).rejects.toThrow('HTTP 404: Not Found');
  });

  // Test 4: Network errors throw
  it('throws on network failure', async () => {
    global.fetch.mockRejectedValue(new Error('Failed to fetch'));
    
    const client = createFetchClient();
    
    await expect(client.get('/products')).rejects.toThrow('Failed to fetch');
  });

  // Test 5: AbortController cancels in-flight request
  it('cancels request when AbortController.abort() is called', async () => {
    // Simulate fetch throwing AbortError when cancelled
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    global.fetch.mockRejectedValue(abortError);
    
    const client = createFetchClient();
    const controller = client.createAbortController();
    
    // Start request
    const promise = client.get('/products', { signal: controller.signal });
    
    // Cancel it
    controller.abort();
    
    // Should reject with our AbortError object (not a real Error)
    await expect(promise).rejects.toMatchObject({ 
      name: 'AbortError', 
      message: 'Request cancelled' 
    });
  });

  // Test 6: External AbortSignal also cancels the request
  it('cancels when external AbortSignal aborts', async () => {
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    global.fetch.mockRejectedValue(abortError);
    
    const client = createFetchClient();
    const externalController = new AbortController();
    
    const promise = client.get('/products', { signal: externalController.signal });
    externalController.abort(); // External code cancels
    
    await expect(promise).rejects.toMatchObject({ 
      name: 'AbortError', 
      message: 'Request cancelled' 
    });
  });

  // Test 7: Default fetchClient instance uses dummyjson.com
  it('default fetchClient uses dummyjson.com base URL', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ products: [] }),
    });
    
    await fetchClient.get('/products', { params: { limit: 1 } });
    
    expect(global.fetch).toHaveBeenCalledWith(
      'https://dummyjson.com/products?limit=1',
      expect.any(Object)
    );
  });
});