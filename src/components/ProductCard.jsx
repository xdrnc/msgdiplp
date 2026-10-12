/**
 * ProductCard - Individual product tile component
 * Displays product info with progressive enrichment indicator
 * ZERO LAYOUT SHIFT: All states (Phase 1 skeleton, Phase 2 skeleton, final card)
 * use IDENTICAL DOM structure and CSS classes - TRUE REUSABILITY
 */

import './ProductCard.css';

// Configuration for skeleton detail widths (shared across all skeleton states)
const SKELETON_DETAIL_WIDTHS = ['60%', '40%', '50%', '80%'];

// Detail labels - shared between skeleton and final card
const DETAIL_LABELS = ['Rating:', 'Stock:', 'Brand:', 'Category:'];

/**
 * Unified ProductCard component - ALL states use this same structure
 * The only difference is the content passed to each slot
 */
function ProductCardUnified({
  // Image slot
  image,
  // Badge slot
  badge,
  // Title slot (always h3 for semantics)
  title,
  // Price slot (always p for semantics)
  price,
  // Details slot - always 4 items for consistent height
  details,
  // Description slot - always present to reserve space
  description,
  // Whether this is a skeleton (affects pointer-events only)
  isSkeleton = false,
  // Whether enriched (for data-enriched attribute)
  isEnriched = false
}) {
  return (
    <article
      className={`product-card ${isSkeleton ? 'product-card--skeleton' : ''}`}
      data-enriched={isEnriched}
    >
      {/* Image container with fixed aspect ratio - prevents layout shift */}
      <div className="product-card__image-wrapper">
        {image}
        {badge}
      </div>

      <div className="product-card__content">
        {/* Title slot now includes the header wrapper */}
        {title}
        {/* Price slot is now null since it's inside the header */}
        {price}
        <div className="product-card__details">
          {details}
        </div>
        {/* Description area - ALWAYS present to reserve space */}
        <div className="product-card__description-area">
          {description}
        </div>
      </div>
    </article>
  );
}

/**
 * Creates a skeleton detail item - uses SAME CSS classes as real detail items
 * The skeleton is just a span INSIDE the same .product-card__detail-label/value elements
 */
function SkeletonDetailItem({ width, index }) {
  return (
    <div className="product-card__detail" key={index}>
      <span className="product-card__detail-label">
        <span className="skeleton-text" style={{ width: '50%' }} />
      </span>
      <span className="product-card__detail-value">
        <span className="skeleton-text" style={{ width }} />
      </span>
    </div>
  );
}

/**
 * Creates a real detail item for enriched state
 * Uses SAME CSS classes as skeleton detail items
 */
function DetailItem({ label, value }) {
  return (
    <div className="product-card__detail">
      <span className="product-card__detail-label">{label}</span>
      <span className="product-card__detail-value">{value}</span>
    </div>
  );
}

/**
 * Builds the details array - always 4 items for consistent height
 * Works for both skeleton and enriched states
 */
function buildDetails({ isEnriched, isSkeleton, rating, stock, brand, category }) {
  if (isSkeleton) {
    // Phase 1 skeleton: all 4 items are skeletons
    return SKELETON_DETAIL_WIDTHS.map((width, i) => (
      <SkeletonDetailItem key={i} width={width} index={i} />
    ));
  }
  
  if (!isEnriched) {
    // Phase 2 skeleton: all 4 items are skeletons (same as Phase 1)
    return SKELETON_DETAIL_WIDTHS.map((width, i) => (
      <SkeletonDetailItem key={i} width={width} index={i} />
    ));
  }
  
  // Enriched: real data with fallbacks, always 4 items
  return DETAIL_LABELS.map((label, i) => {
    let value = '—';
    switch (i) {
      case 0: // Rating
        value = rating !== undefined
          ? `${'★'.repeat(Math.round(rating))}${'☆'.repeat(5 - Math.round(rating))} ${rating}/5`
          : '—';
        break;
      case 1: // Stock
        value = stock !== undefined ? `${stock} left` : '—';
        break;
      case 2: // Brand
        value = brand || '—';
        break;
      case 3: // Category
        value = category || '—';
        break;
    }
    return <DetailItem key={i} label={label} value={value} />;
  });
}

export function ProductCard({ product, isSkeleton = false }) {
  // Phase 1 Skeleton - uses SAME unified structure with SAME CSS classes
  if (isSkeleton) {
    return (
      <ProductCardUnified
        isSkeleton={true}
        isEnriched={false}
        image={<div className="product-card__image skeleton-image" />}
        badge={
          <span className="product-card__badge product-card__badge--loading" title="Loading details...">
            ⟳ Loading
          </span>
        }
        title={
          <div className="product-card__header skeleton-header">
            <h3 className="product-card__title"><span className="skeleton-text skeleton-title" /></h3>
            <p className="product-card__price"><span className="skeleton-text skeleton-price" /></p>
          </div>
        }
        price={null}
        details={buildDetails({ isSkeleton: true })}
        description={
          <div className="product-card__description">
            <span className="skeleton-text skeleton-description" />
          </div>
        }
      />
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

  // Phase 2 Skeleton OR Final Enriched Card - SAME unified structure
  return (
    <ProductCardUnified
      isSkeleton={false}
      isEnriched={isEnriched}
      image={
        <img
          src={thumbnail}
          alt={title}
          className="product-card__image"
          loading="lazy"
        />
      }
      badge={isEnriched ? (
        <span className="product-card__badge product-card__badge--enriched" title="Details loaded">
          ✓ Enriched
        </span>
      ) : (
        <span className="product-card__badge product-card__badge--loading" title="Loading details...">
          ⟳ Loading
        </span>
      )}
      title={
        <div className="product-card__header">
          <h3 className="product-card__title">{title}</h3>
          <p className="product-card__price">${price}</p>
        </div>
      }
      price={null}
      details={buildDetails({ isEnriched, isSkeleton: false, rating, stock, brand, category })}
      description={
        isEnriched && description ? (
          <p className="product-card__description">{description}</p>
        ) : (
          // Reserve space for description even when not enriched or no description
          <div className="product-card__description-placeholder" />
        )
      }
    />
  );
}