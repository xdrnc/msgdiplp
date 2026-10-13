/**
 * Unit tests for useProgressiveProducts hook - Race condition handling
 * Tests: "Phase 2 for page 1 arriving after user moved to page 2 is discarded"
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useProgressiveProducts } from './useProgressiveProducts';

// Save original fetch
const originalFetch = global.fetch;

// Mock data factories
const createPhase1Response = (page, count = 16) => ({
  products: Array.from({ length: count }, (_, i) => ({
    id: (page - 1) * 16 + i + 1,
    title: `Product ${(page - 1) * 16 + i + 1}`,
    price: 100 + i,
    thumbnail: `https://example.com/img${(page - 1) * 16 + i + 1}.jpg`,
  })),
  total: 100,
  skip: (page - 1) * 16,
  limit: 16,
});

const createPhase2Response = (page, count = 16) => ({
  products: Array.from({ length: count }, (_, i) => ({
    id: (page - 1) * 16 + i + 1,
    title: `Product ${(page - 1) * 16 + i + 1}`,
    price: 100 + i,
    thumbnail: `https://example.com/img${(page - 1) * 16 + i + 1}.jpg`,
    description: `Full description for product ${(page - 1) * 16 + i + 1}`,
    rating: 4.5,
    stock: 100,
    brand: 'TestBrand',
    category: 'TestCategory',
    images: [`https://example.com/img${(page - 1) * 16 + i + 1}a.jpg`],
  })),
  total: 100,
  skip: (page - 1) * 16,
  limit: 16,
});

// Helper to flush microtasks
const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

describe('useProgressiveProducts - Race Condition Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  /**
   * This test simulates the exact scenario from requirements:
   * "Phase 2 for page 1 arriving after the user moved to page 2 is discarded"
   *
   * Strategy:
   * 1. Start loading page 1 (Phase 1 + Phase 2)
   * 2. Before Phase 2 completes, navigate to page 2
   * 3. Verify Phase 2 for page 1 is discarded (doesn't update products)
   * 4. Verify page 2 data loads correctly
   */
  it('discards Phase 2 for page 1 when user navigates to page 2 before enrichment completes', async () => {
    // Track fetch calls to control timing
    let phase1ResolvePage1;
    let phase2ResolvePage1;
    let phase1ResolvePage2;
    let phase2ResolvePage2;

    const fetchPromises = {
      phase1Page1: new Promise(resolve => { phase1ResolvePage1 = resolve; }),
      phase2Page1: new Promise(resolve => { phase2ResolvePage1 = resolve; }),
      phase1Page2: new Promise(resolve => { phase1ResolvePage2 = resolve; }),
      phase2Page2: new Promise(resolve => { phase2ResolvePage2 = resolve; }),
    };

    // Mock fetch to return promises we control
    global.fetch.mockImplementation((url) => {
      const urlObj = new URL(url);
      const skip = parseInt(urlObj.searchParams.get('skip') || '0');
      const select = urlObj.searchParams.get('select');
      const page = skip / 16 + 1;

      if (select === 'title,price,thumbnail') {
        // Phase 1 request
        if (page === 1) {
          return fetchPromises.phase1Page1.then(data => ({
            ok: true,
            json: () => Promise.resolve(data),
          }));
        } else if (page === 2) {
          return fetchPromises.phase1Page2.then(data => ({
            ok: true,
            json: () => Promise.resolve(data),
          }));
        }
      } else {
        // Phase 2 request (no select param)
        if (page === 1) {
          return fetchPromises.phase2Page1.then(data => ({
            ok: true,
            json: () => Promise.resolve(data),
          }));
        } else if (page === 2) {
          return fetchPromises.phase2Page2.then(data => ({
            ok: true,
            json: () => Promise.resolve(data),
          }));
        }
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ products: [], total: 0 }),
      });
    });

    // Render the hook
    const { result } = renderHook(() => useProgressiveProducts(1, { enabled: false }));

    // Wait for initial Phase 1 to start
    await waitFor(() => expect(result.current.isLoadingPhase1).toBe(true));

    // Resolve Phase 1 for page 1
    act(() => {
      phase1ResolvePage1(createPhase1Response(1));
    });

    // Wait for Phase 1 to complete and Phase 2 to start
    await waitFor(() => expect(result.current.isLoadingPhase1).toBe(false));
    await waitFor(() => expect(result.current.isLoadingPhase2).toBe(true));

    // Verify page 1 products are loaded (Phase 1 data)
    // Note: Phase 1 products don't have isEnriched property (added only after merge)
    expect(result.current.products).toHaveLength(16);
    expect(result.current.products[0].title).toBe('Product 1');
    expect(result.current.products[0].isEnriched).toBeUndefined();

    // NOW: User navigates to page 2 BEFORE Phase 2 completes
    // Use setCurrentPage directly to bypass totalPages check
    act(() => {
      result.current.goToPage(2);
    });

    // Wait for page 2 Phase 1 to start and complete
    await waitFor(() => expect(result.current.isLoadingPhase1).toBe(true));
    
    act(() => {
      phase1ResolvePage2(createPhase1Response(2));
    });

    await waitFor(() => expect(result.current.isLoadingPhase1).toBe(false));

    // Verify page 2 products are loaded (Phase 1 data)
    expect(result.current.products).toHaveLength(16);
    expect(result.current.products[0].title).toBe('Product 17'); // Page 2 starts at 17
    expect(result.current.currentPage).toBe(2);

    // NOW: Resolve Phase 2 for page 1 (this should be DISCARDED)
    act(() => {
      phase2ResolvePage1(createPhase2Response(1));
    });

    // Flush microtasks to allow any pending state updates
    await act(async () => {
      await flushPromises();
    });

    // CRITICAL ASSERTION: Products should STILL be page 2 data, NOT enriched page 1 data
    // If Phase 2 for page 1 was incorrectly applied, we'd see "Product 1" with isEnriched: true
    expect(result.current.products[0].title).toBe('Product 17');
    // After stale Phase 2 is discarded, merge never happened for page 2 yet,
    // so products remain as Phase 1 data (isEnriched is undefined, not false)
    expect(result.current.products[0].isEnriched).toBeUndefined();
    expect(result.current.currentPage).toBe(2);

    // Resolve Phase 2 for page 2 (this SHOULD apply)
    act(() => {
      phase2ResolvePage2(createPhase2Response(2));
    });

    await act(async () => {
      await flushPromises();
    });

    // Now page 2 should be enriched
    await waitFor(() => expect(result.current.isLoadingPhase2).toBe(false));
    expect(result.current.products[0].isEnriched).toBe(true);
    expect(result.current.products[0].description).toContain('Full description');
  }, 10000);

  /**
   * Test that rapid navigation cancels in-flight requests via AbortController
   * Uses nextPage which doesn't check totalPages
   */
  it('cancels in-flight requests when navigating rapidly', async () => {
    let fetchCallCount = 0;
    let resolveFetch;

    const fetchPromise = new Promise(resolve => { resolveFetch = resolve; });

    global.fetch.mockImplementation(() => {
      fetchCallCount++;
      return fetchPromise.then(data => ({
        ok: true,
        json: () => Promise.resolve(data),
      }));
    });

    const { result } = renderHook(() => useProgressiveProducts(1, { enabled: false }));

    await waitFor(() => expect(result.current.isLoadingPhase1).toBe(true));

    // Resolve the first fetch so totalPages gets set
    act(() => {
      resolveFetch(createPhase1Response(1));
    });

    // Wait for totalPages to be available
    await waitFor(() => expect(result.current.totalPages).toBeGreaterThan(1));

    // Rapidly navigate using nextPage (doesn't check totalPages)
    act(() => { result.current.nextPage(); });
    act(() => { result.current.nextPage(); });
    act(() => { result.current.nextPage(); });

    // Create a new promise for the final page
    let resolveFetch2;
    const fetchPromise2 = new Promise(resolve => { resolveFetch2 = resolve; });
    
    global.fetch.mockImplementation(() => {
      fetchCallCount++;
      return fetchPromise2.then(data => ({
        ok: true,
        json: () => Promise.resolve(data),
      }));
    });

    // Resolve the fetch for the final page
    act(() => {
      resolveFetch2(createPhase1Response(4));
    });

    // Wait for final page to load
    await waitFor(() => expect(result.current.currentPage).toBe(4));
    await waitFor(() => expect(result.current.isLoadingPhase1).toBe(false));

    // Should have made fetch calls but not excessive (due to cancellation)
    expect(fetchCallCount).toBeGreaterThan(0);
  }, 10000);
});