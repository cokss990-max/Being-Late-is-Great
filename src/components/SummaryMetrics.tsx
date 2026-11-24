import { TrendingDown } from 'lucide-react';
import type { TrackedProduct } from '../types/tracker';

interface SummaryMetricsProps {
  items: TrackedProduct[];
}

export function SummaryMetrics({ items }: SummaryMetricsProps) {
  const totalCount = items.length;
  const priceDropItems = items.filter((item) => item.isPriceDrop);
  const inStockCount = items.filter(
    (item) => item.stockStatus === 'in_stock' || item.stockStatus === 'low_stock'
  ).length;
  const soldOutCount = items.filter((item) => item.stockStatus === 'sold_out').length;

  // Sum savings across active price drops (grouped by primary currency if uniform, otherwise USD/first symbol)
  const savingsItems = priceDropItems.filter(
    (item) => item.discountAmount !== null && item.discountAmount > 0
  );
  const totalSavings = savingsItems.reduce(
    (acc, item) => acc + (item.discountAmount ?? 0),
    0
  );
  const uniqueCurrencies = new Set(savingsItems.map((i) => i.currency));
  const primarySymbol =
    savingsItems.length > 0 && uniqueCurrencies.size === 1
      ? savingsItems[0].currencySymbol
      : '$';

  const inStockPercent =
    totalCount > 0 ? Math.round((inStockCount / totalCount) * 100) : 0;

  return (
    <section
      aria-label="Tracked inventory summary"
      className="bg-white border border-slate-200 rounded-xl grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200"
    >
      <div className="p-5">
        <div className="text-xs font-medium text-slate-500">Tracked Products</div>
        <div className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
          {totalCount}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {totalCount === 0
            ? 'No links checked yet'
            : `${soldOutCount} sold out`}
        </div>
      </div>

      <div className="p-5 border-l border-slate-200 lg:border-l-0">
        <div className="text-xs font-medium text-slate-500">Active Price Drops</div>
        <div className="mt-2 flex items-baseline gap-2">
          <span
            className={`font-mono text-2xl font-semibold tabular-nums ${
              priceDropItems.length > 0 ? 'text-emerald-700' : 'text-slate-900'
            }`}
          >
            {priceDropItems.length}
          </span>
          {priceDropItems.length > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Discounted</span>
            </span>
          )}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {totalCount > 0
            ? `${Math.round((priceDropItems.length / totalCount) * 100)}% of tracked items`
            : 'Highlighted in green'}
        </div>
      </div>

      <div className="p-5">
        <div className="text-xs font-medium text-slate-500">In Stock</div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {inStockCount}
          </span>
          {totalCount > 0 && (
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              {inStockPercent}%
            </span>
          )}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {totalCount > 0 ? 'Ready to purchase' : 'Availability verified live'}
        </div>
      </div>

      <div className="p-5 border-l border-slate-200 lg:border-l-0">
        <div className="text-xs font-medium text-slate-500">Total Verified Savings</div>
        <div
          className={`mt-2 font-mono text-2xl font-semibold tabular-nums ${
            totalSavings > 0 ? 'text-emerald-700' : 'text-slate-900'
          }`}
        >
          {totalSavings > 0
            ? `${primarySymbol}${totalSavings.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`
            : '—'}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {savingsItems.length > 0
            ? `Across ${savingsItems.length} discounted ${
                savingsItems.length === 1 ? 'item' : 'items'
              }`
            : 'Calculated from list prices'}
        </div>
      </div>
    </section>
  );
}
