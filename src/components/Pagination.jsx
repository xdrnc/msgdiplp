/**
 * Pagination - Simple Next/Previous navigation with page display
 * Disabled during loading to prevent race conditions
 */

export function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  disabled = false 
}) {
  // Don't show pagination if only one page
  if (totalPages <= 1) return null;

  const goToPrev = () => onPageChange(currentPage - 1);
  const goToNext = () => onPageChange(currentPage + 1);

  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  return (
    <nav className="pagination" aria-label="Product pages">
      <button
        className="pagination__btn pagination__btn--prev"
        onClick={goToPrev}
        disabled={disabled || isFirstPage}
        aria-label="Previous page"
        aria-disabled={disabled || isFirstPage}
      >
        ← Previous
      </button>

      <span className="pagination__page-info" aria-live="polite">
        Page {currentPage} of {totalPages}
      </span>

      <button
        className="pagination__btn pagination__btn--next"
        onClick={goToNext}
        disabled={disabled || isLastPage}
        aria-label="Next page"
        aria-disabled={disabled || isLastPage}
      >
        Next →
      </button>
    </nav>
  );
}