/**
 * Main App component - Product Listing Page with Progressive Two-Phase Loading
 * Integrates: useProgressiveProducts hook, ProductList, Pagination, DelayControls
 */

import { useCallback, useState } from 'react';
import { useProgressiveProducts } from './hooks/useProgressiveProducts';
import { ProductList } from './components/ProductList';
import { Pagination } from './components/Pagination';
import { DelayControls } from './components/DelayControls';
import './App.css';

function App() {
  // Delay configuration state for demo controls
  const [delayConfig, setDelayConfig] = useState({
    enabled: false,
    duration: 1000,
    phase1: true,
    phase2: true,
  });
  
  // Track when a manual refresh is in progress (separate from normal loading)
  const [isRefreshing, setIsRefreshing] = useState(false);
  
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
    refresh,
    enrichmentProgress,
    totalProducts,
  } = useProgressiveProducts(1, delayConfig);

  // Retry handler - reloads current page
  const handleRetry = useCallback(() => {
    // Trigger reload by going to same page (hook handles cancellation)
    goToPage(currentPage);
  }, [currentPage, goToPage]);
  
  // Refresh handler for delay controls
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    refresh();
    // Reset after a short delay to allow UI to update
    setTimeout(() => setIsRefreshing(false), 500);
  }, [refresh]);
  
  // Delay config change handler
  const handleDelayConfigChange = useCallback((newConfig) => {
    setDelayConfig(newConfig);
  }, []);

  const isLoading = isLoadingPhase1 || isLoadingPhase2;

  return (
    <div className="app">
      <header className="app__header">
        <h1>Product Listing</h1>
        <a href="https://github.com/xdrnc/msgdiplp">Alexander (github: xdrnc)</a>
      </header>

      <main className="app__main">
        <div className="app__content">
          <ProductList
            products={products}
            isLoadingPhase1={isLoadingPhase1}
            isLoadingPhase2={isLoadingPhase2}
            errorPhase1={errorPhase1}
            errorPhase2={errorPhase2}
            onRetry={handleRetry}
            enrichmentProgress={enrichmentProgress}
            totalProducts={totalProducts}
            currentPage={currentPage}
            totalPages={totalPages}
          />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
            disabled={false}
          />
        </div>
        
        <aside className="app__sidebar">
          <DelayControls
            delayConfig={delayConfig}
            onDelayConfigChange={handleDelayConfigChange}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
          />
        </aside>
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
