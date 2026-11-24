import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Menu, RefreshCw } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { UrlCheckBar } from './components/UrlCheckBar';
import { SummaryMetrics } from './components/SummaryMetrics';
import { ProductInspectionPanel } from './components/ProductInspectionPanel';
import { TrackedProductsTable } from './components/TrackedProductsTable';
import { checkProductUrl } from './services/productTrackerApi';
import type { FilterView, SortOption, TrackedProduct } from './types/tracker';
import { exportTrackedProductsCsv } from './utils/formatters';

const STORAGE_KEY = 'discount_stock_tracker_items_v1';

const VIEW_TITLES: Record<FilterView, string> = {
  all: 'Overview',
  price_drops: 'Price Drops',
  in_stock: 'In Stock',
  sold_out: 'Sold Out',
};

function loadSavedProducts(): TrackedProduct[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TrackedProduct[]) : [];
  } catch {
    return [];
  }
}

function normalizeUrlForKey(raw: string): string {
  try {
    const u = new URL(/^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`);
    return `${u.hostname.replace(/^www\./i, '').toLowerCase()}${u.pathname.replace(/\/+$/, '')}${u.search}`;
  } catch {
    return raw.trim().toLowerCase();
  }
}

export default function App() {
  const [items, setItems] = useState<TrackedProduct[]>(() => loadSavedProducts());
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const saved = loadSavedProducts();
    return saved[0]?.id ?? null;
  });

  const [urlInput, setUrlInput] = useState('');
  const [isCheckingNew, setIsCheckingNew] = useState(false);
  const [checkingUrl, setCheckingUrl] = useState<string | null>(null);
  const [recheckingId, setRecheckingId] = useState<string | null>(null);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [activeView, setActiveView] = useState<FilterView>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const urlInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore storage quota errors
    }
  }, [items]);

  const counts = useMemo(
    () => ({
      all: items.length,
      priceDrops: items.filter((i) => i.isPriceDrop).length,
      inStock: items.filter(
        (i) => i.stockStatus === 'in_stock' || i.stockStatus === 'low_stock'
      ).length,
      soldOut: items.filter((i) => i.stockStatus === 'sold_out').length,
    }),
    [items]
  );

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = items.filter((item) => {
      if (activeView === 'price_drops' && !item.isPriceDrop) return false;
      if (
        activeView === 'in_stock' &&
        item.stockStatus !== 'in_stock' &&
        item.stockStatus !== 'low_stock'
      ) {
        return false;
      }
      if (activeView === 'sold_out' && item.stockStatus !== 'sold_out') {
        return false;
      }
      if (q) {
        const haystack =
          `${item.productName} ${item.retailer} ${item.domain} ${item.url} ${item.summary}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'biggest_drop') {
        const aDrop = a.discountPercent ?? (a.isPriceDrop ? 1 : -1);
        const bDrop = b.discountPercent ?? (b.isPriceDrop ? 1 : -1);
        if (bDrop !== aDrop) return bDrop - aDrop;
        return (b.discountAmount ?? 0) - (a.discountAmount ?? 0);
      }
      if (sortBy === 'lowest_price') {
        const aPrice = a.currentPrice ?? Number.MAX_SAFE_INTEGER;
        const bPrice = b.currentPrice ?? Number.MAX_SAFE_INTEGER;
        return aPrice - bPrice;
      }
      return new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime();
    });
  }, [items, activeView, searchQuery, sortBy]);

  const selectedProduct = useMemo(() => {
    if (!selectedId) return items[0] ?? null;
    return items.find((i) => i.id === selectedId) ?? items[0] ?? null;
  }, [items, selectedId]);

  const upsertCheckResult = (
    rawUrl: string,
    result: Awaited<ReturnType<typeof checkProductUrl>>,
    existingMatch?: TrackedProduct
  ): TrackedProduct => {
    const normalizedKey = normalizeUrlForKey(result.url || rawUrl);
    const prev =
      existingMatch ?? items.find((item) => normalizeUrlForKey(item.url) === normalizedKey);

    const previousCheckPrice = prev?.currentPrice ?? null;
    const priceDeltaFromLastCheck =
      previousCheckPrice !== null && result.currentPrice !== null
        ? Math.round((result.currentPrice - previousCheckPrice) * 100) / 100
        : null;

    const newHistoryEntry = {
      checkedAt: result.checkedAt,
      price: result.currentPrice,
      currency: result.currency,
      stockStatus: result.stockStatus,
    };

    const updated: TrackedProduct = {
      ...result,
      id: prev?.id ?? crypto.randomUUID(),
      previousCheckPrice,
      priceDeltaFromLastCheck,
      history: [newHistoryEntry, ...(prev?.history ?? [])].slice(0, 20),
    };

    setItems((current) => {
      const withoutOld = current.filter((item) => item.id !== updated.id);
      return [updated, ...withoutOld];
    });
    setSelectedId(updated.id);
    return updated;
  };

  const handleCheckNewUrl = async (rawUrl: string) => {
    const trimmed = rawUrl.trim();
    if (!trimmed) return;

    setErrorMessage(null);
    setIsCheckingNew(true);
    setCheckingUrl(trimmed);

    const normalizedKey = normalizeUrlForKey(trimmed);
    const existing = items.find((i) => normalizeUrlForKey(i.url) === normalizedKey);

    try {
      const result = await checkProductUrl(trimmed, existing?.currentPrice ?? null);
      upsertCheckResult(trimmed, result, existing);
      setUrlInput('');
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to check product status.'
      );
    } finally {
      setIsCheckingNew(false);
      setCheckingUrl(null);
    }
  };

  const handleRecheckProduct = async (product: TrackedProduct) => {
    if (recheckingId || isCheckingNew) return;
    setErrorMessage(null);
    setRecheckingId(product.id);
    try {
      const result = await checkProductUrl(product.url, product.currentPrice);
      upsertCheckResult(product.url, result, product);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : `Failed to refresh ${product.productName}.`
      );
    } finally {
      setRecheckingId(null);
    }
  };

  const handleRefreshAll = async () => {
    if (items.length === 0 || isRefreshingAll || isCheckingNew) return;
    setErrorMessage(null);
    setIsRefreshingAll(true);
    const snapshot = [...items];
    try {
      for (const product of snapshot) {
        setRecheckingId(product.id);
        const result = await checkProductUrl(product.url, product.currentPrice);
        upsertCheckResult(product.url, result, product);
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Stopped refreshing after an API error.'
      );
    } finally {
      setRecheckingId(null);
      setIsRefreshingAll(false);
    }
  };

  const handleDeleteProduct = (id: string) => {
    setItems((current) => {
      const next = current.filter((item) => item.id !== id);
      if (selectedId === id) {
        setSelectedId(next[0]?.id ?? null);
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <Sidebar
        activeView={activeView}
        onSelectView={setActiveView}
        counts={counts}
        onRunSampleUrl={(sampleUrl) => {
          setUrlInput(sampleUrl);
          void handleCheckNewUrl(sampleUrl);
        }}
        isChecking={isCheckingNew || isRefreshingAll}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract: Breadcrumb on left, up to 2 actions on right */}
        <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-500 whitespace-nowrap shrink-0 hidden sm:inline">
                Dashboard
              </span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="font-medium text-slate-900 truncate">
                {VIEW_TITLES[activeView]}
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {items.length > 0 && (
              <>
                <button
                  type="button"
                  disabled={isRefreshingAll || isCheckingNew}
                  onClick={() => void handleRefreshAll()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isRefreshingAll ? 'animate-spin' : ''}`}
                  />
                  <span className="hidden sm:inline">
                    {isRefreshingAll ? 'Refreshing…' : 'Refresh All'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => exportTrackedProductsCsv(items)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>
              </>
            )}
          </div>
        </header>

        {/* Main Workspace Viewport */}
        <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          <UrlCheckBar
            urlInput={urlInput}
            onUrlInputChange={setUrlInput}
            onSubmitUrl={(url) => void handleCheckNewUrl(url)}
            isChecking={isCheckingNew}
            errorMessage={errorMessage}
            onDismissError={() => setErrorMessage(null)}
            inputRef={urlInputRef}
          />

          <SummaryMetrics items={items} />

          <ProductInspectionPanel
            product={selectedProduct}
            isCheckingNew={isCheckingNew}
            checkingUrl={checkingUrl}
            recheckingId={recheckingId}
            onRecheck={(product) => void handleRecheckProduct(product)}
          />

          <TrackedProductsTable
            items={filteredItems}
            totalCount={items.length}
            selectedId={selectedProduct?.id ?? null}
            onSelect={(id) => setSelectedId(id)}
            activeView={activeView}
            onSelectView={setActiveView}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            sortBy={sortBy}
            onSortChange={setSortBy}
            recheckingId={recheckingId}
            onRecheck={(item) => void handleRecheckProduct(item)}
            onDelete={handleDeleteProduct}
            onFocusUrlInput={() => urlInputRef.current?.focus()}
          />
        </main>
      </div>
    </div>
  );
}
