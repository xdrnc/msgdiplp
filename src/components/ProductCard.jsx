/**
 * ProductCard - Individual product tile component
 * Displays product info with progressive enrichment indicator
 * No layout shift between Phase 1 and Phase 2 (fixed image aspect ratio)
 * Supports skeleton state for Phase 1 loading
 */

export function ProductCard({ product, isSkeleton = false }) {
  // Skeleton rendering - matches exact layout of final card
  if (isSkeleton) {
    return (
      <article className="product-card product-card--skeleton" data-enriched={false}>
        {/* Image container with fixed aspect ratio - prevents layout shift */}
        <div className="product-card__image-wrapper">
          <div className="skeleton skeleton--image"></div>
          {/* Enrichment indicator on skeleton */}
          <span className="product-card__badge product-card__badge--loading" title="Loading details...">
            ⟳ Loading
          </span>
        </div>

        <div className="product-card__content">
          <div className="skeleton skeleton--text skeleton--title"></div>
          <div className="skeleton skeleton--text skeleton--price"></div>

          {/* Skeleton details section - matches Phase 2 layout */}
          <div className="product-card__details product-card__details--skeleton">
            <div className="skeleton skeleton--text" style={{ width: '60%' }}></div>
            <div className="skeleton skeleton--text" style={{ width: '40%' }}></div>
            <div className="skeleton skeleton--text" style={{ width: '50%' }}></div>
            <div className="skeleton skeleton--text" style={{ width: '80%' }}></div>
          </div>
        </div>
      </article>
    );
  }

  const { 
    id, 
    title, 
    price, 
    thumbnail, 
    description, 
    rating, 
    stock, 
    brand, 
    category, 
    isEnriched 
  } = product;

  return (
    <article className="product-card" data-enriched={isEnriched}>
      {/* Image container with fixed aspect ratio - prevents layout shift */}
      <div className="product-card__image-wrapper">
        <img 
          src={thumbnail} 
          alt={title} 
          className="product-card__image"
          loading="lazy"
        />
        {/* Enrichment badge - shows when Phase 2 data arrived */}
        {isEnriched && (
          <span className="product-card__badge product-card__badge--enriched" title="Details loaded">
            ✓ Enriched
          </span>
        )}
        {!isEnriched && (
          <span className="product-card__badge product-card__badge--loading" title="Loading details...">
            ⟳ Loading
          </span>
        )}
      </div>

      <div className="product-card__content">
        <h3 className="product-card__title">{title}</h3>
        <p className="product-card__price">${price}</p>

        {/* Phase 2 fields - only render when enriched */}
        {isEnriched && (
          <div className="product-card__details">
            {rating !== undefined && (
              <div className="product-card__detail">
                <span className="product-card__detail-label">Rating:</span>
                <span className="product-card__detail-value">
                  {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))} {rating}/5
                </span>
              </div>
            )}
            {stock !== undefined && (
              <div className="product-card__detail">
                <span className="product-card__detail-label">Stock:</span>
                <span className="product-card__detail-value">{stock} left</span>
              </div>
            )}
            {brand && (
              <div className="product-card__detail">
                <span className="product-card__detail-label">Brand:</span>
                <span className="product-card__detail-value">{brand}</span>
              </div>
            )}
            {category && (
              <div className="product-card__detail">
                <span className="product-card__detail-label">Category:</span>
                <span className="product-card__detail-value">{category}</span>
              </div>
            )}
            {description && (
              <p className="product-card__description">{description}</p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}