import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  HelpCircle,
  Link2,
  RefreshCw,
  Search,
  Trash2,
  TrendingDown,
  XCircle,
} from 'lucide-react';
import type { FilterView, SortOption, StockStatus, TrackedProduct } from '../types/tracker';
import {
  STOCK_STATUS_META,
  formatPrice,
  formatRelativeTime,
} from '../utils/formatters';

interface TrackedProductsTableProps {
  items: TrackedProduct[];
  totalCount: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  activeView: FilterView;
  onSelectView: (view: FilterView) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  recheckingId: string | null;
  onRecheck: (item: TrackedProduct) => void;
  onDelete: (id: string) => void;
  onFocusUrlInput: () => void;
}

function RowStockIcon({ status }: { status: StockStatus }) {
  switch (status) {
    case 'in_stock':
      return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
    case 'low_stock':
      return <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />;
    case 'pre_order':
      return <Clock className="w-4 h-4 text-sky-600 shrink-0" />;
    case 'sold_out':
      return <XCircle className="w-4 h-4 text-red-600 shrink-0" />;
    default:
      return <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />;
  }
}

export function TrackedProductsTable({
  items,
  totalCount,
  selectedId,
  onSelect,
  activeView,
  onSelectView,
  searchQuery,
  onSearchQueryChange,
  sortBy,
  onSortChange,
  recheckingId,
  onRecheck,
  onDelete,
  onFocusUrlInput,
}: TrackedProductsTableProps) {
  const filterTabs: Array<{ id: FilterView; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'price_drops', label: 'Price Drops' },
    { id: 'in_stock', label: 'In Stock' },
    { id: 'sold_out', label: 'Sold Out' },
  ];

  return (
    <section
      aria-label="Tracked products list"
      className="bg-white border border-slate-200 rounded-xl overflow-hidden"
    >
      {/* Toolbar */}
      <div className="p-4 sm:px-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start overflow-x-auto max-w-full">
          {filterTabs.map((tab) => {
            const active = activeView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectView(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 sm:w-56">
            <Search
              className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Filter tracked items…"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="w-full h-9 pl-8.5 pr-3 text-xs text-slate-900 placeholder:text-slate-400 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
            />
          </div>

          <div className="relative shrink-0">
            <ArrowUpDown
              className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <select
              aria-label="Sort tracked products"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="h-9 pl-8 pr-7 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 transition-colors cursor-pointer"
            >
              <option value="recent">Most Recent</option>
              <option value="biggest_drop">Biggest Drop</option>
              <option value="lowest_price">Lowest Price</option>
            </select>
          </div>
        </div>
      </div>

      {/* Empty State: No Items Ever Checked */}
      {totalCount === 0 ? (
        <div className="px-6 py-14 text-center max-w-md mx-auto">
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-3.5">
            <Link2 className="w-5 h-5" />
          </div>
          <h3 className="font-display text-base font-semibold text-slate-900">
            No products tracked yet
          </h3>
          <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
            Paste a product URL above and click Check Status. Verified prices, green price drop alerts, and live stock statuses will appear here.
          </p>
          <button
            type="button"
            onClick={onFocusUrlInput}
            className="mt-5 inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            Paste First Product URL
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm font-medium text-slate-800">
            No tracked products match the current filter.
          </p>
          <button
            type="button"
            onClick={() => {
              onSelectView('all');
              onSearchQueryChange('');
            }}
            className="mt-3 text-xs font-medium text-slate-700 underline underline-offset-4 hover:text-slate-950"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="py-3 pl-6 pr-4">Product</th>
                <th className="py-3 px-4 whitespace-nowrap">Stock Status</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Current Price</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Price Drop / Discount</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Checked</th>
                <th className="py-3 pl-4 pr-6 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 text-sm">
              {items.map((item) => {
                const isSelected = item.id === selectedId;
                const stockMeta = STOCK_STATUS_META[item.stockStatus];
                const isRechecking = recheckingId === item.id;

                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelect(item.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-slate-100/80'
                        : item.isPriceDrop
                          ? 'bg-emerald-50/25 hover:bg-emerald-50/60'
                          : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3.5 pl-6 pr-4 max-w-[320px]">
                      <div className="font-medium text-slate-900 truncate">
                        {item.productName}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 truncate">
                        <span>{item.retailer}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono truncate">{item.domain}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className={`inline-flex items-center gap-2 text-xs font-semibold ${stockMeta.textClass}`}>
                        <RowStockIcon status={item.stockStatus} />
                        <span>{stockMeta.label}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div
                        className={`font-mono text-sm font-semibold tabular-nums ${
                          item.isPriceDrop ? 'text-emerald-700' : 'text-slate-900'
                        }`}
                      >
                        {formatPrice(item.currentPrice, item.currencySymbol)}
                      </div>
                      {item.originalPrice !== null && (
                        <div className="font-mono text-xs text-slate-400 line-through tabular-nums">
                          {formatPrice(item.originalPrice, item.currencySymbol)}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {item.isPriceDrop ? (
                        <div className="inline-flex flex-col items-end">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 font-mono tabular-nums">
                            <TrendingDown className="w-3.5 h-3.5" />
                            <span>
                              {item.discountAmount !== null
                                ? `-${formatPrice(item.discountAmount, item.currencySymbol)}`
                                : item.discountPercent !== null
                                  ? `-${item.discountPercent}%`
                                  : 'Price drop'}
                            </span>
                          </span>
                          {item.discountPercent !== null && item.discountAmount !== null && (
                            <span className="text-[11px] font-mono text-emerald-600 tabular-nums">
                              {item.discountPercent}% off
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Standard price</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono text-xs text-slate-500 tabular-nums">
                      {formatRelativeTime(item.checkedAt)}
                    </td>

                    <td
                      className="py-3.5 pl-4 pr-6 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          disabled={isRechecking}
                          onClick={() => onRecheck(item)}
                          title="Re-check product status"
                          aria-label={`Re-check ${item.productName}`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors disabled:opacity-50"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${isRechecking ? 'animate-spin' : ''}`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(item.id)}
                          title="Remove from watchlist"
                          aria-label={`Remove ${item.productName}`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 hover:text-red-700 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
