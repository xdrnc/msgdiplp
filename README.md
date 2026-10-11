# Product Listing Page with Progressive Two-Phase Loading

A React application demonstrating progressive data loading: fast first paint with minimal data, then background enrichment with full product details.

## Features

- **Two-Phase Loading**: Phase 1 fetches minimal data (title, price, thumbnail) for instant render. Phase 2 fetches full data in background and merges seamlessly.
- **Race Condition Safe**: Page version keys + AbortController prevent stale responses from overwriting current page.
- **No Layout Shift**: Fixed aspect ratio images and preserved Phase 1 data ensure smooth UX.
- **Independent Error States**: Phase 1 and Phase 2 errors handled separately.
- **Modular Architecture**: Data layer separated from UI components for testability.
- **Artificial Delay Demo**: Configurable delays for Phase 1 and Phase 2 to visualize progressive loading behavior.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Artificial Delay Demo

The app includes a demo control panel (sidebar) to simulate network latency and visualize the two-phase loading behavior.

### Controls

| Control | Description |
|---------|-------------|
| **Enable Artificial Delay** | Master toggle - enables/disables all delays |
| **Delay Duration (ms)** | Milliseconds to delay each affected phase (0-10000) |
| **Phase 1 (Initial Load)** | Apply delay to Phase 1 fetch (blocks initial render) |
| **Phase 2 (Enrichment)** | Apply delay to Phase 2 fetch (background enrichment) |
| **Refresh Page** | Reload current page with current delay settings |

### Use Cases

- **Demo Phase 1 delay only**: See skeleton loaders while waiting for initial data
- **Demo Phase 2 delay only**: See enrichment progress bar while products enrich
- **Demo both**: Full progressive loading experience with visible delays
- **Refresh button**: Re-fetch current page without changing page number (useful for testing)

### Implementation

The delay logic lives in `src/lib/delay.js` and is applied in `useProgressiveProducts` hook:

```javascript
// src/lib/delay.js
export function delayWithAbort(ms, signal) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(resolve, ms);
    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        reject(new DOMException('Aborted', 'AbortError'));
      }, { once: true });
    }
  });
}

// In useProgressiveProducts - applied after fetch, before version guard
if (delayConfigRef.current.enabled && delayConfigRef.current.phase1) {
  await delayWithAbort(delayConfigRef.current.duration, controller.signal);
}
```

**Key design decisions:**
- Delay applied **after fetch, before version guard** - simulates network latency without affecting race condition logic
- Uses `delayWithAbort` with the same `AbortSignal` - delays are cancelled when user navigates away
- Config stored in `useRef` - updates don't trigger re-renders, but are read at fetch time
- Default config: 1000ms delay, both phases enabled

## Architecture

### Project Structure

```
src/
├── types/
│   └── product.js          # JSDoc type definitions
├── lib/
│   ├── fetchClient.js      # Reusable fetch wrapper with AbortController
│   ├── fetchClient.test.js # Unit tests for fetch client
│   ├── mergeProducts.js    # Pure merge function (Phase 1 + Phase 2)
│   └── mergeProducts.test.js # Unit tests for merge logic
├── hooks/
│   └── useProgressiveProducts.js # Two-phase orchestration hook
├── components/
│   ├── ProductCard.jsx     # Individual product tile
│   ├── ProductList.jsx     # Grid with loading/error states
│   └── Pagination.jsx      # Next/Previous navigation
├── App.jsx                 # Main app integration
├── App.css                 # Styles
└── main.jsx                # Entry point
```

### Data Flow

```
User Navigation
      │
      ▼
┌─────────────────────────────────────┐
│  useProgressiveProducts Hook        │
│  (Orchestrates everything)          │
└──────────────┬──────────────────────┘
               │
     ┌─────────┴─────────┐
     ▼                   ▼
Phase 1              Phase 2
(fetchClient)        (fetchClient)
     │                   │
     ▼                   ▼
┌─────────────────────────────────────┐
│     mergeProducts (pure)            │
│  Merges by ID, adds isEnriched      │
└──────────────┬──────────────────────┘
               │
               ▼
      setProducts(merged)
               │
               ▼
      ProductList Component
               │
               ▼
      ProductCard Components
```

## Two-Phase Orchestration

### Phase 1 - Fast First Paint
```javascript
// Request: Minimal fields only
GET /products?limit=16&skip=0&select=title,price,thumbnail

// Response: ~3 fields per product
{ id, title, price, thumbnail }

// Blocks initial render - user sees grid immediately
```

### Phase 2 - Background Enrichment
```javascript
// Request: All fields (no select parameter)
GET /products?limit=16&skip=0

// Response: Full product objects
{ id, title, price, description, rating, stock, brand, category, images[], thumbnail }

// Non-blocking - merges into existing tiles by ID
// Adds isEnriched: true flag for UI indicator
```

### Merge Logic (Pure Function)

```javascript
// src/lib/mergeProducts.js
function mergeProducts(phase1Products, phase2Products) {
  const phase2Map = new Map(phase2Products.map(p => [p.id, p]));
  
  return phase1Products.map(p1 => {
    const p2 = phase2Map.get(p1.id);
    if (!p2) return { ...p1, isEnriched: false };
    return { ...p1, ...p2, isEnriched: true };
  });
}
```

**Properties:**
- ✅ Merges by ID (not array index)
- ✅ No duplicates
- ✅ Preserves Phase 1 data if Phase 2 missing product
- ✅ Adds `isEnriched` flag for UI
- ✅ Pure function - easily testable

## Race Condition Handling

### The Problem
User clicks: Page 1 → Page 2 → Page 3 (quickly)

Without protection:
- Page 1 Phase 2 returns → **overwrites Page 3 with Page 1 data!** ❌

### The Solution: Dual Protection Layer

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1: AbortController (Network Level)                   │
│  Cancels superseded in-flight requests                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 2: Page Version/Key (Application Level)              │
│  Guards responses at processing time                        │
└─────────────────────────────────────────────────────────────┘
```

### Implementation

```javascript
// In useProgressiveProducts hook
const pageVersionRef = useRef(0);

const loadPage = async (page) => {
  // 1. Increment version - invalidates ALL previous requests
  const myVersion = ++pageVersionRef.current;
  
  // 2. Cancel in-flight requests
  cancelCurrentRequests();
  
  // 3. Create new AbortController for this page
  const controller = new AbortController();
  
  // 4. Phase 1 fetch
  const phase1Data = await fetchClient.get('/products', {
    signal: controller.signal,
    params: { limit: 16, skip: (page-1)*16, select: 'title,price,thumbnail' }
  });
  
  // 5. GUARD: Discard if stale
  if (myVersion !== pageVersionRef.current) return;
  
  // 6. Apply Phase 1, start Phase 2 with same version
  setProducts(phase1Products);
  startPhase2Enrichment(page, myVersion, phase1Products);
};

const startPhase2Enrichment = async (page, version, phase1Products) => {
  // Separate controller for Phase 2
  const controller = new AbortController();
  
  const phase2Data = await fetchClient.get('/products', {
    signal: controller.signal,
    params: { limit: 16, skip: (page-1)*16 }
  });
  
  // GUARD: Check version BEFORE merge
  if (version !== pageVersionRef.current) return;
  
  const merged = mergeProducts(phase1Products, phase2Data.products);
  
  // GUARD: Check version AGAIN after merge (async gap)
  if (version !== pageVersionRef.current) return;
  
  setProducts(merged);
};
```

### Timeline Example

```
User: Page 1 → Page 2 → Page 3 (rapid clicks)

pageVersionRef:  0 → 1 → 2 → 3

Page 1 Phase 1 starts    │ version=1
Page 2 Phase 1 starts    │ version=2 (cancels Page 1)
Page 3 Phase 1 starts    │ version=3 (cancels Page 2)

Page 1 Phase 1 responds  │ checks: 1 !== 3 → DISCARD
Page 2 Phase 1 responds  │ checks: 2 !== 3 → DISCARD
Page 3 Phase 1 responds  │ checks: 3 === 3 → APPLY ✓

Page 3 Phase 2 starts    │ version=3
Page 1 Phase 2 responds  │ checks: 1 !== 3 → DISCARD
Page 2 Phase 2 responds  │ checks: 2 !== 3 → DISCARD
Page 3 Phase 2 responds  │ checks: 3 === 3 → MERGE ✓
```

## State Model

```javascript
// Hook returns:
{
  products: [],           // Merged products with isEnriched flag
  isLoadingPhase1: true,  // Initial load (blocks render)
  isLoadingPhase2: false, // Background enrichment
  errorPhase1: null,      // Phase 1 error (blocks)
  errorPhase2: null,      // Phase 2 error (non-blocking)
  currentPage: 1,
  totalPages: 10,
  goToPage: fn,
  nextPage: fn,
  prevPage: fn,
  enrichmentProgress: 5,  // Count of enriched products
  totalProducts: 16,
}
```

## Tradeoffs & Assumptions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Phase 2 Strategy** | Full page fetch | Fewer requests than per-product; DummyJSON supports it |
| **Caching** | None between pages | Simpler; re-fetches on back navigation |
| **Merge Location** | Client-side | Enables progressive UX; adds complexity |
| **Error Handling** | Independent per phase | Phase 2 failure doesn't hide Phase 1 data |
| **AbortController** | Per-request + external signal | Composable cancellation |
| **Page Version** | Simple counter | Lightweight; no external dependencies |
| **Type System** | JSDoc | No build step; IDE support in VS Code |

## API Reference

### `useProgressiveProducts(initialPage?, delayConfig?)`
Custom hook for progressive loading.

**Parameters:**
- `initialPage` (number, default: 1) - Starting page (1-based)
- `delayConfig` (Object, optional) - Artificial delay configuration for demo
  - `enabled` (boolean, default: false) - Master toggle for all delays
  - `duration` (number, default: 1000) - Delay duration in milliseconds
  - `phase1` (boolean, default: true) - Enable delay for Phase 1
  - `phase2` (boolean, default: true) - Enable delay for Phase 2

**Returns:**
- `products` - Array of merged products
- `isLoadingPhase1` - Boolean
- `isLoadingPhase2` - Boolean
- `errorPhase1` - String | null
- `errorPhase2` - String | null
- `currentPage` - Number
- `totalPages` - Number
- `goToPage(page)` - Navigate to page
- `nextPage()` - Next page
- `prevPage()` - Previous page
- `refresh()` - Reload current page with current delay settings
- `enrichmentProgress` - Number of enriched items
- `totalProducts` - Products on current page

### `createFetchClient(baseUrl?)`
Factory for fetch client with cancellation.

**Returns:**
- `get(endpoint, options)` - GET request
- `createAbortController()` - Create controller

### `mergeProducts(phase1, phase2)`
Pure merge function. Returns merged array with `isEnriched` flags.

### Delay Utilities (`src/lib/delay.js`)

#### `delay(ms)`
Simple delay promise.
```javascript
await delay(1000); // Wait 1 second
```

#### `delayWithAbort(ms, signal)`
Delay promise that respects AbortSignal for cancellation.
```javascript
const controller = new AbortController();
await delayWithAbort(1000, controller.signal);
// If controller.abort() called, rejects with AbortError
```

#### `normalizeDelayConfig(config)`
Validates and normalizes delay configuration with defaults.
```javascript
normalizeDelayConfig({ enabled: true, duration: 500 });
// Returns: { enabled: true, duration: 500, phase1: true, phase2: true }
```

#### `defaultDelayConfig`
Default configuration object:
```javascript
{
  enabled: false,
  duration: 1000,
  phase1: true,
  phase2: true,
}
```

## Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/lib/fetchClient.test.js
npm test -- src/lib/mergeProducts.test.js
```

**Test Coverage:**
- fetchClient: 7 tests (success, params, HTTP errors, network errors, cancellation)
- mergeProducts: 7 tests (merge by ID, missing products, empty arrays, duplicates, field preservation, order)

## License

MIT
