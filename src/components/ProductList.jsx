/**
 * ProductList - Grid container for product cards
 * Handles loading states, error states, and empty states
 * Shows skeleton loaders during Phase 1, enrichment progress during Phase 2
 */

import { ProductCard } from './ProductCard';

export function ProductList({ 
  products, 
  isLoadingPhase1, 
  isLoadingPhase2, 
  errorPhase1, 
  errorPhase2,
  onRetry,
  enrichmentProgress,
  totalProducts
}) {
  // Show skeleton loaders during Phase 1
  if (isLoadingPhase1 && products.length === 0) {
    return (
      <div className="product-list" role="status" aria-label="Loading products">
        <div className="product-list__skeletons">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="product-card product-card--skeleton">
              <div className="product-card__image-wrapper">
                <div className="skeleton skeleton--image"></div>
              </div>
              <div className="product-card__content">
                <div className="skeleton skeleton--text skeleton--title"></div>
                <div className="skeleton skeleton--text skeleton--price"></div>
              </div>
            </div>
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