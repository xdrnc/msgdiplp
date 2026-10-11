/**
 * useProgressiveProducts - Custom hook for two-phase progressive product loading
 *
 * Phase 1: Fast fetch (title, price, thumbnail) - blocks initial render
 * Phase 2: Background enrichment (full data) - non-blocking, merges by ID
 *
 * Race condition handling:
 * - pageVersion: increments on each navigation, guards stale responses
 * - AbortController: cancels superseded in-flight requests
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchClient } from '../lib/fetchClient';
import { mergeProducts } from '../lib/mergeProducts';

const PRODUCTS_PER_PAGE = 16;

/**
 * Custom hook for progressive product loading
 * @param {number} initialPage - Starting page (1-based)
 * @returns {Object} State and navigation functions
 */
export function useProgressiveProducts(initialPage = 1) {
  // ============ STATE (triggers re-render when changed) ============
  const [products, setProducts] = useState([]);
  const [isLoadingPhase1, setIsLoadingPhase1] = useState(true);
  const [isLoadingPhase2, setIsLoadingPhase2] = useState(false);
  const [errorPhase1, setErrorPhase1] = useState(null);
  const [errorPhase2, setErrorPhase2] = useState(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  
  // ============ REFS (mutable, NO re-render when changed) ============
  // pageVersion: increments on each navigation, used to discard stale responses
  const pageVersionRef = useRef(0);
  // abortControllerRef: current in-flight Phase 1 request controller
  const abortControllerRef = useRef(null);
  // phase2AbortControllerRef: separate controller for Phase 2
  const phase2AbortControllerRef = useRef(null);
  
  // ============ HELPER: Cancel current in-flight requests ============
  const cancelCurrentRequests = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (phase2AbortControllerRef.current) {
      phase2AbortControllerRef.current.abort();
      phase2AbortControllerRef.current = null;
    }
  }, []);
  
  // ============ CORE: Load a specific page (both phases) ============
  const loadPage = useCallback(async (page) => {
    // 1. Increment version - this invalidates ALL previous in-flight requests
    const myVersion = ++pageVersionRef.current;
    
    // 2. Cancel any in-flight requests from previous navigation
    cancelCurrentRequests();
    
    // 3. Create new AbortController for this page's requests
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    // 4. Reset Phase 1 state, preserve products until new data arrives (prevents flicker)
    setIsLoadingPhase1(true);
    setErrorPhase1(null);
    // Note: we DON'T clear products here - keeps previous page visible briefly
    
    // 5. Reset Phase 2 state
    setIsLoadingPhase2(false);
    setErrorPhase2(null);
    
    try {
      // ============ PHASE 1: Fast fetch (minimal fields) ============
      const phase1Data = await fetchClient.get('/products', {
        signal: controller.signal,
        params: {
          limit: PRODUCTS_PER_PAGE,
          skip: (page - 1) * PRODUCTS_PER_PAGE,
          select: 'title,price,thumbnail',  // Only these 3 fields!
        },
      });
      
      // 6. GUARD: Check if this response is still relevant (user hasn't navigated away)
      if (myVersion !== pageVersionRef.current) {
        console.log('[Phase 1] Stale response discarded', { myVersion, current: pageVersionRef.current });
        return; // User navigated away - discard this response
      }
      
      // 7. Update state with Phase 1 data
      const phase1Products = phase1Data.products || [];
      setProducts(phase1Products);
      setTotalPages(Math.ceil((phase1Data.total || 0) / PRODUCTS_PER_PAGE));
      setIsLoadingPhase1(false);
      
      // 8. Start Phase 2 enrichment (non-blocking, background)
      startPhase2Enrichment(page, myVersion, phase1Products);
      
    } catch (error) {
      // 9. GUARD: Check version before setting error
      if (myVersion !== pageVersionRef.current) return;
      
      if (error.name === 'AbortError') {
        console.log('[Phase 1] Request cancelled');
        return; // Expected cancellation, not an error
      }
      
      console.error('[Phase 1] Error:', error);
      setErrorPhase1(error.message || 'Failed to load products');
      setIsLoadingPhase1(false);
    }
  }, [cancelCurrentRequests]);
  
  // ============ PHASE 2: Background Enrichment ============
  const startPhase2Enrichment = useCallback(async (page, version, phase1Products) => {
    // Create separate controller for Phase 2 (can be cancelled independently)
    const controller = new AbortController();
    phase2AbortControllerRef.current = controller;
    
    // Phase 2 doesn't block UI - just set loading indicator
    setIsLoadingPhase2(true);
    setErrorPhase2(null);
    
    try {
      const phase2Data = await fetchClient.get('/products', {
        signal: controller.signal,
        params: {
          limit: PRODUCTS_PER_PAGE,
          skip: (page - 1) * PRODUCTS_PER_PAGE,
          // No select = get ALL fields (description, rating, stock, brand, category, images[])
        },
      });
      
      // GUARD: Check version BEFORE merging (user may have navigated away)
      if (version !== pageVersionRef.current) {
        console.log('[Phase 2] Stale response discarded', { version, current: pageVersionRef.current });
        return;
      }
      
      const phase2Products = phase2Data.products || [];
      
      // MERGE: Combine Phase 1 + Phase 2 by ID
      const merged = mergeProducts(phase1Products, phase2Products);
      
      // GUARD: Check version AGAIN after merge (async gap between fetch and setState)
      if (version !== pageVersionRef.current) {
        console.log('[Phase 2] Stale after merge, discarded');
        return;
      }
      
      setProducts(merged);
      setIsLoadingPhase2(false);
      
    } catch (error) {
      // GUARD: Check version
      if (version !== pageVersionRef.current) return;
      
      if (error.name === 'AbortError') {
        console.log('[Phase 2] Request cancelled');
        return;
      }
      
      console.error('[Phase 2] Error:', error);
      setErrorPhase2(error.message || 'Failed to load product details');
      setIsLoadingPhase2(false);
    }
  }, []);
  
  // ============ NAVIGATION FUNCTIONS ============
  const goToPage = useCallback((page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  }, [totalPages]);
  
  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);
  
  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);
  
  // ============ EFFECT: Load page when currentPage changes ============
  useEffect(() => {
    loadPage(currentPage);
    
    // Cleanup on unmount or page change
    return () => {
      cancelCurrentRequests();
    };
  }, [currentPage, loadPage, cancelCurrentRequests]);
  
  // ============ RETURN PUBLIC API ============
  return {
    // Data
    products,
    // Loading states (independent!)
    isLoadingPhase1,
    isLoadingPhase2,
    // Error states (independent!)
    errorPhase1,
    errorPhase2,
    // Pagination
    currentPage,
    totalPages,
    // Navigation
    goToPage,
    nextPage,
    prevPage,
    // Computed helpers for UI
    isLoading: isLoadingPhase1 || isLoadingPhase2,
    hasError: errorPhase1 || errorPhase2,
    enrichmentProgress: products.filter(p => p.isEnriched).length,
    totalProducts: products.length,
  };
}