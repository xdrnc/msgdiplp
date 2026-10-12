/**
 * ProductCard - Individual product tile component
 * Displays product info with progressive enrichment indicator
 * No layout shift between Phase 1 and Phase 2 (fixed image aspect ratio)
 * Supports skeleton state for Phase 1 loading and Phase 2 placeholders
 */

// Reusable skeleton detail lines - used by both Phase 1 and Phase 2 skeletons
const SKELETON_DETAIL_WIDTHS = ['60%', '40%', '50%', '80%'];

function SkeletonDetails() {
  return (
    <div className="product-card__details product-card__details--skeleton">
      {SKELETON_DETAIL_WIDTHS.map((width, i) => (
        <div key={i} className="skeleton skeleton--text" style={{ width }}></div>
      ))}
    </div>
  );
}

function SkeletonDetailItems() {
  return (
    <>
      {SKELETON_DETAIL_WIDTHS.map((width, i) => (
        <div key={i} className="product-card__detail product-card__detail--skeleton">
          <span className="skeleton skeleton--text" style={{ width }}></span>
        </div>
      ))}
    </>
  );
}

export function ProductCard({ product, isSkeleton = false }) {
  // Skeleton rendering - matches exact layout of final card (Phase 1 loading)
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

          {/* Skeleton details section - uses shared component */}
          <SkeletonDetails />
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

        {/* Phase 2 fields - render skeleton placeholders when not enriched, real data when enriched */}
        <div className="product-card__details">
          {isEnriched ? (
            // Enriched: show real data - always render 4 detail slots for consistent height
            <>
              <div className="product-card__detail">
                <span className="product-card__detail-label">Rating:</span>
                <span className="product-card__detail-value">
                  {rating !== undefined
                    ? `${'★'.repeat(Math.round(rating))}${'☆'.repeat(5 - Math.round(rating))} ${rating}/5`
                    : '—'}
                </span>
              </div>
              <div className="product-card__detail">
                <span className="product-card__detail-label">Stock:</span>
                <span className="product-card__detail-value">
                  {stock !== undefined ? `${stock} left` : '—'}
                </span>
              </div>
              <div className="product-card__detail">
                <span className="product-card__detail-label">Brand:</span>
                <span className="product-card__detail-value">
                  {brand || '—'}
                </span>
              </div>
              <div className="product-card__detail">
                <span className="product-card__detail-label">Category:</span>
                <span className="product-card__detail-value">
                  {category || '—'}
                </span>
              </div>
              {description && (
                <p className="product-card__description">{description}</p>
              )}
            </>
          ) : (
            // Not enriched yet: show skeleton placeholders for Phase 2 fields
            // Description skeleton removed to match Phase 1 skeleton height
            // Uses shared SkeletonDetailItems component for consistency
            <SkeletonDetailItems />
          )}
        </div>
      </div>
    </article>
  );
}