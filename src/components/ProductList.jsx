/**
 * ProductList - Grid container for product cards
 * Handles loading states, error states, and empty states
 * Shows ProductCard skeletons during Phase 1, enrichment progress during Phase 2
 */

import { ProductCard } from './ProductCard';

const PRODUCTS_PER_PAGE = 16;

export function ProductList({ 
  products, 
  isLoadingPhase1, 
  isLoadingPhase2, 
  errorPhase1, 
  errorPhase2,
  onRetry,
  enrichmentProgress,
  totalProducts,
  currentPage = 1,
  totalPages = 1
}) {
  // Calculate skeleton count based on known data
  const getSkeletonCount = () => {
    // If we have total from previous loads, calculate exact count for current page
    if (totalProducts > 0 && totalPages > 0) {
      const isLastPage = currentPage === totalPages;
      if (isLastPage) {
        const remainder = totalProducts % PRODUCTS_PER_PAGE;
        return remainder > 0 ? remainder : PRODUCTS_PER_PAGE;
      }
    }
    // Default to max per page (first load or unknown total)
    return PRODUCTS_PER_PAGE;
  };

  // Show ProductCard skeletons during Phase 1
  if (isLoadingPhase1 && products.length === 0) {
    const skeletonCount = getSkeletonCount();
    return (
      <div className="product-list" role="status" aria-label="Loading products">
        <div className="product-list__grid">
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <ProductCard key={`skeleton-${i}`} product={{}} isSkeleton={true} />
          ))}
        </div>
      </div>
    );
  }

  // Show error if Phase 1 failed and no products
  if (errorPhase1 && products.length === 0) {
    return (
      <div className="product-list product-list--error" role="alert">
        <div className="error-message">
          <p>⚠️ Failed to load products</p>
          <p className="error-message__detail">{errorPhase1}</p>
          <button onClick={onRetry} className="btn btn--primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="product-list">
      {/* Enrichment progress indicator */}
      {(isLoadingPhase2 || enrichmentProgress > 0) && (
        <div className="product-list__enrichment-progress" role="status" aria-live="polite">
          <div className="enrichment-bar">
            <div 
              className="enrichment-bar__fill" 
              style={{ width: totalProducts > 0 ? `${(enrichmentProgress / totalProducts) * 100}%` : '0%' }}
            ></div>
          </div>
          <span className="enrichment-text">
            {isLoadingPhase2 
              ? `Loading details... ${enrichmentProgress}/${totalProducts} complete`
              : `All ${totalProducts} products enriched`
            }
          </span>
        </div>
      )}

      {/* Phase 2 error (non-blocking - products still visible) */}
      {errorPhase2 && !isLoadingPhase2 && (
        <div className="product-list__phase2-error" role="alert">
          <span>⚠️ Some details failed to load: {errorPhase2}</span>
          <button onClick={onRetry} className="btn btn--secondary btn--small">
            Retry Details
          </button>
        </div>
      )}

      {/* Product grid */}
      <div className="product-list__grid" role="list" aria-label="Products">
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
        
        {/* Empty state */}
        {products.length === 0 && !isLoadingPhase1 && !errorPhase1 && (
          <div className="product-list__empty" role="status">
            <p>No products found</p>
          </div>
        )}
      </div>
    </div>
  );
}