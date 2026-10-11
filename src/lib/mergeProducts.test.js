/**
 * Simple unit tests for mergeProducts function
 * Tests: merge by ID, missing products, preserves Phase 1, adds isEnriched flag
 */

import { describe, it, expect } from 'vitest';
import { mergeProducts } from './mergeProducts';

describe('mergeProducts', () => {
  // Test 1: Basic merge - Phase 2 overwrites Phase 1, adds isEnriched
  it('merges Phase 2 data into Phase 1 by ID', () => {
    const phase1 = [
      { id: 1, title: 'Product 1', price: 10, thumbnail: 'img1.jpg' },
      { id: 2, title: 'Product 2', price: 20, thumbnail: 'img2.jpg' },
    ];
    
    const phase2 = [
      { id: 1, title: 'Product 1', price: 10, description: 'Full desc 1', rating: 4.5, stock: 100, brand: 'Brand A', category: 'Cat 1', images: ['img1.jpg', 'img1b.jpg'], thumbnail: 'img1.jpg' },
      { id: 2, title: 'Product 2', price: 20, description: 'Full desc 2', rating: 3.5, stock: 50, brand: 'Brand B', category: 'Cat 2', images: ['img2.jpg'], thumbnail: 'img2.jpg' },
    ];
    
    const result = mergeProducts(phase1, phase2);
    
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 1,
      title: 'Product 1',
      price: 10,
      thumbnail: 'img1.jpg',
      description: 'Full desc 1',
      rating: 4.5,
      stock: 100,
      brand: 'Brand A',
      category: 'Cat 1',
      images: ['img1.jpg', 'img1b.jpg'],
      isEnriched: true,
    });
    expect(result[1].isEnriched).toBe(true);
  });

  // Test 2: Phase 2 missing a product - keeps Phase 1, isEnriched: false
  it('keeps Phase 1 product when Phase 2 missing it, marks isEnriched false', () => {
    const phase1 = [
      { id: 1, title: 'Product 1', price: 10, thumbnail: 'img1.jpg' },
      { id: 2, title: 'Product 2', price: 20, thumbnail: 'img2.jpg' },
    ];
    
    const phase2 = [
      { id: 1, title: 'Product 1', price: 10, description: 'Full desc 1', rating: 4.5, stock: 100, brand: 'Brand A', category: 'Cat 1', images: ['img1.jpg'], thumbnail: 'img1.jpg' },
      // Product 2 missing from Phase 2
    ];
    
    const result = mergeProducts(phase1, phase2);
    
    expect(result).toHaveLength(2);
    expect(result[0].isEnriched).toBe(true);
    expect(result[1]).toEqual({
      id: 2,
      title: 'Product 2',
      price: 20,
      thumbnail: 'img2.jpg',
      isEnriched: false,
    });
  });

  // Test 3: Empty Phase 2 - all products marked not enriched
  it('marks all not enriched when Phase 2 is empty', () => {
    const phase1 = [
      { id: 1, title: 'Product 1', price: 10, thumbnail: 'img1.jpg' },
    ];
    
    const phase2 = [];
    
    const result = mergeProducts(phase1, phase2);
    
    expect(result[0].isEnriched).toBe(false);
    expect(result[0].title).toBe('Product 1');
  });

  // Test 4: Empty Phase 1 - returns empty array
  it('returns empty array when Phase 1 is empty', () => {
    const result = mergeProducts([], [{ id: 1, title: 'Test' }]);
    expect(result).toEqual([]);
  });

  // Test 5: No duplicates - each Phase 1 product appears once
  it('does not duplicate products (Map keeps last value for duplicate keys)', () => {
    const phase1 = [
      { id: 1, title: 'Product 1', price: 10, thumbnail: 'img1.jpg' },
    ];
    
    const phase2 = [
      { id: 1, title: 'Product 1', price: 10, description: 'Desc', rating: 4, stock: 10, brand: 'B', category: 'C', images: [], thumbnail: 'img1.jpg' },
      { id: 1, title: 'Duplicate', price: 99, description: 'Dup', rating: 1, stock: 1, brand: 'X', category: 'Y', images: [], thumbnail: 'dup.jpg' },
    ];
    
    const result = mergeProducts(phase1, phase2);
    
    expect(result).toHaveLength(1); // Only one product in result
    // Map keeps LAST value for duplicate keys, so 'Duplicate' wins
    expect(result[0].title).toBe('Duplicate');
  });

  // Test 6: Preserves Phase 1 fields when Phase 2 missing them
  it('preserves Phase 1 fields not in Phase 2', () => {
    const phase1 = [
      { id: 1, title: 'Product 1', price: 10, thumbnail: 'img1.jpg', customField: 'keep-me' },
    ];
    
    const phase2 = [
      { id: 1, title: 'Product 1', price: 10, description: 'Desc', rating: 4, stock: 10, brand: 'B', category: 'C', images: [], thumbnail: 'img1.jpg' },
    ];
    
    const result = mergeProducts(phase1, phase2);
    
    expect(result[0].customField).toBe('keep-me'); // Preserved from Phase 1
    expect(result[0].description).toBe('Desc'); // Added from Phase 2
  });

  // Test 7: Order preserved from Phase 1
  it('preserves order from Phase 1', () => {
    const phase1 = [
      { id: 3, title: 'Third', price: 30, thumbnail: 'img3.jpg' },
      { id: 1, title: 'First', price: 10, thumbnail: 'img1.jpg' },
      { id: 2, title: 'Second', price: 20, thumbnail: 'img2.jpg' },
    ];
    
    const phase2 = [
      { id: 1, title: 'First', price: 10, description: 'D1', rating: 1, stock: 1, brand: 'B', category: 'C', images: [], thumbnail: 'img1.jpg' },
      { id: 2, title: 'Second', price: 20, description: 'D2', rating: 2, stock: 2, brand: 'B', category: 'C', images: [], thumbnail: 'img2.jpg' },
      { id: 3, title: 'Third', price: 30, description: 'D3', rating: 3, stock: 3, brand: 'B', category: 'C', images: [], thumbnail: 'img3.jpg' },
    ];
    
    const result = mergeProducts(phase1, phase2);
    
    expect(result.map(p => p.id)).toEqual([3, 1, 2]); // Same order as Phase 1
  });
});