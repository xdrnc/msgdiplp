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
    totalItems,
    goToPage,
    nextPage,
    prevPage,
    refresh,
    enrichmentProgress,
    totalProducts,
  } = useProgressiveProducts(1, delayConfig);

  // Retry handler - reloads current page
  const handleRetry = useCallback(() => {
    // Use refresh() which directly calls loadPage() without depending on state change
    // goToPage(currentPage) would bail out because React skips identical state values
    refresh();
  }, [refresh]);
  
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
        <div className="app__header-left">
          <img src="/alextest.jpg" alt="Logo" className="app__logo" />
          <h1 style={{ color: '#fceefc' }}>Product Listing</h1>
        </div>
        <a href="https://github.com/xdrnc/msgdiplp" target="_blank" rel="noopener noreferrer" style={{ color: '#faf56b' }}>Alexander (github: xdrnc)</a>
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
            totalItems={totalItems}
            currentPage={currentPage}
            totalPages={totalPages}
          />
        </div>
        
        <aside className="app__sidebar">
          <DelayControls
            delayConfig={delayConfig}
            onDelayConfigChange={handleDelayConfigChange}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
            disabled={false}
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
