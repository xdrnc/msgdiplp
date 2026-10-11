/**
 * Pure merge function - merges Phase 2 (full) data into Phase 1 (minimal) data by product ID
 * No React dependencies - easily testable and reusable
 * 
 * @param {Array} phase1Products - Products from Phase 1 (minimal fields: id, title, price, thumbnail)
 * @param {Array} phase2Products - Products from Phase 2 (full fields: description, rating, stock, etc.)
 * @returns {Array} Merged products with isEnriched flag
 */
export function mergeProducts(phase1Products, phase2Products) {
  // Create Map for O(1) lookup by ID - much faster than find() in loop
  const phase2Map = new Map(phase2Products.map(p => [p.id, p]));
  
  return phase1Products.map(p1 => {
    const p2 = phase2Map.get(p1.id);
    if (!p2) {
      // Phase 2 missing this product - keep Phase 1, mark not enriched
      return { ...p1, isEnriched: false };
    }
    // Merge: Phase 2 overwrites Phase 1, add enrichment flag
    return { ...p1, ...p2, isEnriched: true };
  });
}