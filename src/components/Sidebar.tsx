import {
  ArrowUpRight,
  CheckCircle2,
  LayoutGrid,
  TrendingDown,
  X,
  XCircle,
} from 'lucide-react';
import type { FilterView } from '../types/tracker';
import { SAMPLE_PRODUCT_URLS } from '../utils/formatters';

interface SidebarProps {
  activeView: FilterView;
  onSelectView: (view: FilterView) => void;
  counts: {
    all: number;
    priceDrops: number;
    inStock: number;
    soldOut: number;
  };
  onRunSampleUrl: (url: string) => void;
  isChecking: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  activeView,
  onSelectView,
  counts,
  onRunSampleUrl,
  isChecking,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const navItems: Array<{
    id: FilterView;
    label: string;
    count: number;
    icon: typeof LayoutGrid;
    accentGreen?: boolean;
  }> = [
    { id: 'all', label: 'Overview', count: counts.all, icon: LayoutGrid },
    {
      id: 'price_drops',
      label: 'Price Drops',
      count: counts.priceDrops,
      icon: TrendingDown,
      accentGreen: true,
    },
    { id: 'in_stock', label: 'In Stock', count: counts.inStock, icon: CheckCircle2 },
    { id: 'sold_out', label: 'Sold Out', count: counts.soldOut, icon: XCircle },
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white border-r border-slate-200">
      <div className="flex items-center justify-between h-16 px-5 border-b border-slate-200 shrink-0">
        <span className="font-display text-[15px] font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
          Discount &amp; Stock Tracker
        </span>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto" aria-label="Watchlist views">
        <p className="px-3 pb-2 text-xs font-medium text-slate-500">Views</p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectView(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? item.accentGreen
                        ? 'text-emerald-400'
                        : 'text-white'
                      : item.accentGreen && item.count > 0
                        ? 'text-emerald-600'
                        : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </span>
              <span
                className={`font-mono text-xs tabular-nums ${
                  isActive
                    ? 'text-slate-300'
                    : item.accentGreen && item.count > 0
                      ? 'text-emerald-700 font-semibold'
                      : 'text-slate-400'
                }`}
              >
                {item.count}
              </span>
            </button>
          );
        })}

        <div className="pt-6 mt-6 border-t border-slate-200/80">
          <p className="px-3 pb-2 text-xs font-medium text-slate-500">
            Quick live lookups
          </p>
          <div className="space-y-1">
            {SAMPLE_PRODUCT_URLS.map((sample) => (
              <button
                key={sample.url}
                type="button"
                disabled={isChecking}
                onClick={() => {
                  onRunSampleUrl(sample.url);
                  onCloseMobile();
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-800 truncate group-hover:text-slate-950">
                    {sample.label}
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 shrink-0 group-hover:text-slate-700" />
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                  {sample.retailer}
                </div>
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className="px-5 py-4 border-t border-slate-200 text-xs text-slate-500">
        Powered by live Google Search grounding
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative w-72 max-w-[85vw] h-full z-10 shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
