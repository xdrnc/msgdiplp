# Product Listing Page with Progressive Two-Phase Loading

A React application demonstrating progressive data loading: fast first paint with minimal data, then background enrichment with full product details.

## Features

- **Two-Phase Loading**: Phase 1 fetches minimal data (title, price, thumbnail) for instant render. Phase 2 fetches full data in background and merges seamlessly.
- **Race Condition Safe**: Page version keys + AbortController prevent stale responses from overwriting current page.
- **No Layout Shift**: Fixed aspect ratio images and preserved Phase 1 data ensure smooth UX.
- **Independent Error States**: Phase 1 and Phase 2 errors handled separately.
- **Modular Architecture**: Data layer separated from UI components for testability.
- **Component-Scoped CSS**: Each component has its own CSS file for maintainability.
- **Sticky Sidebar**: DelayControls and Pagination stay fixed during scroll.
- **Artificial Delay Demo**: Configurable delays for Phase 1 and Phase 2 to visualize progressive loading behavior.

## Quick Start (live: https://msgdiplp.vercel.app/)

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

## Project Structure

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
│   ├── ProductCard.css     # ProductCard styles
│   ├── ProductList.jsx     # Grid with loading/error states
│   ├── ProductList.css     # ProductList styles
│   ├── Pagination.jsx      # Next/Previous navigation
│   ├── Pagination.css      # Pagination styles
│   ├── DelayControls.jsx   # Artificial delay controls
│   └── DelayControls.css   # DelayControls styles
├── App.jsx                 # Main app integration
├── App.css                 # Global layout styles
└── main.jsx                # Entry point
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
