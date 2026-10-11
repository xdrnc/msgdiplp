/**
 * Main App component - Product Listing Page with Progressive Two-Phase Loading
 * Integrates: useProgressiveProducts hook, ProductList, Pagination
 */

import { useCallback } from 'react';
import { useProgressiveProducts } from './hooks/useProgressiveProducts';
import { ProductList } from './components/ProductList';
import { Pagination } from './components/Pagination';
import './App.css';

function App() {
  const {
    products,
    isLoadingPhase1,
    isLoadingPhase2,
    errorPhase1,
    errorPhase2,
    currentPage,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
    enrichmentProgress,
    totalProducts,
  } = useProgressiveProducts(1);

  // Retry handler - reloads current page
  const handleRetry = useCallback(() => {
    // Trigger reload by going to same page (hook handles cancellation)
    goToPage(currentPage);
  }, [currentPage, goToPage]);

  return (
    <div className="app">
      <header className="app__header">
        <h1>Product Listing</h1>
        <p className="app__subtitle">Progressive loading: fast first paint, then enrichment</p>
      </header>

      <main className="app__main">
        <ProductList
          products={products}
          isLoadingPhase1={isLoadingPhase1}
          isLoadingPhase2={isLoadingPhase2}
          errorPhase1={errorPhase1}
          errorPhase2={errorPhase2}
          onRetry={handleRetry}
          enrichmentProgress={enrichmentProgress}
          totalProducts={totalProducts}
        />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
          disabled={isLoadingPhase1}
        />
      </main>

      <footer className="app__footer">
        <p>
          {isLoadingPhase1 && '🔄 Loading products...'}
          {!isLoadingPhase1 && isLoadingPhase2 && '✨ Enriching product details...'}
          {!isLoadingPhase1 && !isLoadingPhase2 && errorPhase1 && '❌ Failed to load'}
          {!isLoadingPhase1 && !isLoadingPhase2 && !errorPhase1 && `✅ ${products.length} products loaded`}
        </p>
      </footer>
    </div>
  );
}

export default App;
