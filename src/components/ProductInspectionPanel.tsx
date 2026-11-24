import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Globe,
  HelpCircle,
  RefreshCw,
  Tag,
  TrendingDown,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import type { StockStatus, TrackedProduct } from '../types/tracker';
import {
  STOCK_STATUS_META,
  formatFullTimestamp,
  formatPrice,
  formatRelativeTime,
} from '../utils/formatters';

interface ProductInspectionPanelProps {
  product: TrackedProduct | null;
  isCheckingNew: boolean;
  checkingUrl: string | null;
  recheckingId: string | null;
  onRecheck: (product: TrackedProduct) => void;
}

function StockIcon({ status, className }: { status: StockStatus; className?: string }) {
  switch (status) {
    case 'in_stock':
      return <CheckCircle2 className={className} />;
    case 'low_stock':
      return <AlertTriangle className={className} />;
    case 'pre_order':
      return <Clock className={className} />;
    case 'sold_out':
      return <XCircle className={className} />;
    default:
      return <HelpCircle className={className} />;
  }
}

export function ProductInspectionPanel({
  product,
  isCheckingNew,
  checkingUrl,
  recheckingId,
  onRecheck,
}: ProductInspectionPanelProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (isCheckingNew) {
    return (
      <section
        aria-label="Checking product status"
        aria-busy="true"
        className="bg-white border border-slate-200 rounded-xl p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div className="space-y-2.5 flex-1">
            <div className="text-xs font-medium text-slate-500">
              Searching live pricing and stock via Google Search grounding…
            </div>
            <div className="h-6 w-2/3 max-w-md bg-slate-200/80 rounded animate-pulse" />
            <div className="text-xs font-mono text-slate-400 truncate max-w-xl">
              {checkingUrl}
            </div>
          </div>
          <div className="h-9 w-28 bg-slate-100 rounded-lg animate-pulse shrink-0" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 border-b border-slate-200">
          <div className="space-y-3">
            <div className="h-3.5 w-24 bg-slate-100 rounded animate-pulse" />
            <div className="h-9 w-40 bg-slate-200/80 rounded animate-pulse" />
            <div className="h-4 w-56 bg-slate-100 rounded animate-pulse" />
          </div>
          <div className="space-y-3">
            <div className="h-3.5 w-24 bg-slate-100 rounded animate-pulse" />
            <div className="h-9 w-36 bg-slate-200/80 rounded animate-pulse" />
            <div className="h-4 w-64 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>

        <div className="pt-5 space-y-2">
          <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-slate-100 rounded animate-pulse" />
        </div>
      </section>
    );
  }

  if (!product) {
    return null;
  }

  const stockMeta = STOCK_STATUS_META[product.stockStatus];
  const isRecheckingThis = recheckingId === product.id;

  const handleCopyPromo = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // Clipboard unavailable
    }
  };

  return (
    <section
      aria-label="Selected product status result"
      className="bg-white border border-slate-200 rounded-xl overflow-hidden"
    >
      {/* Header Row */}
      <div className="p-6 pb-5 border-b border-slate-200 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span className="font-medium text-slate-700">{product.retailer}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{product.domain}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              Checked {formatRelativeTime(product.checkedAt)} ({formatFullTimestamp(product.checkedAt)})
            </span>
          </div>
          <h2 className="mt-1.5 font-display text-xl font-semibold text-slate-900 tracking-tight text-balance">
            {product.productName}
          </h2>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            disabled={isRecheckingThis}
            onClick={() => onRecheck(product)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRecheckingThis ? 'animate-spin' : ''}`} />
            <span>{isRecheckingThis ? 'Checking…' : 'Re-check'}</span>
          </button>
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <span>Open Listing</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Primary Price & Stock Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 border-b border-slate-200">
        {/* Price & Price Drop Column */}
        <div className={`p-6 ${product.isPriceDrop ? 'bg-emerald-50/60' : 'bg-white'}`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-600">Current Price</span>
            {product.isPriceDrop && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                <TrendingDown className="w-4 h-4 text-emerald-600" />
                <span>Price Drop</span>
              </span>
            )}
          </div>

          <div className="mt-2.5 flex flex-wrap items-baseline gap-3">
            <span
              className={`font-mono text-3xl font-semibold tracking-tight tabular-nums ${
                product.isPriceDrop ? 'text-emerald-800' : 'text-slate-900'
              }`}
            >
              {formatPrice(product.currentPrice, product.currencySymbol)}
            </span>

            {product.originalPrice !== null && (
              <span className="font-mono text-base text-slate-500 line-through tabular-nums">
                {formatPrice(product.originalPrice, product.currencySymbol)}
              </span>
            )}

            {product.isPriceDrop &&
              (product.discountAmount !== null || product.discountPercent !== null) && (
                <span className="font-mono text-sm font-semibold text-emerald-700 tabular-nums">
                  {product.discountAmount !== null &&
                    `Save ${formatPrice(product.discountAmount, product.currencySymbol)}`}
                  {product.discountAmount !== null && product.discountPercent !== null && ' '}
                  {product.discountPercent !== null && `(-${product.discountPercent}%)`}
                </span>
              )}
          </div>

          {product.isPriceDrop && product.priceDropReason && (
            <p className="mt-2.5 text-sm font-medium text-emerald-800">
              {product.priceDropReason}
            </p>
          )}

          {!product.isPriceDrop && (
            <p className="mt-2.5 text-sm text-slate-500">
              {product.currentPrice !== null
                ? 'No active markdown or price drop detected.'
                : 'Exact numeric price could not be verified from search snippets.'}
            </p>
          )}

          {product.priceDeltaFromLastCheck !== null && product.priceDeltaFromLastCheck !== 0 && (
            <div
              className={`mt-3 flex items-center gap-1.5 text-xs font-medium font-mono tabular-nums ${
                product.priceDeltaFromLastCheck < 0 ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              {product.priceDeltaFromLastCheck < 0 ? (
                <TrendingDown className="w-3.5 h-3.5" />
              ) : (
                <TrendingUp className="w-3.5 h-3.5" />
              )}
              <span>
                {product.priceDeltaFromLastCheck < 0
                  ? `Dropped ${formatPrice(
                      Math.abs(product.priceDeltaFromLastCheck),
                      product.currencySymbol
                    )} since your previous check`
                  : `Increased ${formatPrice(
                      product.priceDeltaFromLastCheck,
                      product.currencySymbol
                    )} since your previous check`}
              </span>
            </div>
          )}

          {product.promoCode && (
            <div className="mt-3.5 pt-3 border-t border-emerald-200/70 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-700">
                <Tag className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>Promo code:</span>
                <span className="font-mono font-semibold text-slate-900">
                  {product.promoCode}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopyPromo(product.promoCode!)}
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800 hover:text-emerald-950 transition-colors whitespace-nowrap shrink-0"
              >
                {copiedCode === product.promoCode ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy code</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Stock Status Column */}
        <div className={`p-6 ${stockMeta.surfaceClass}`}>
          <div className="text-xs font-medium text-slate-600">Availability</div>

          <div className={`mt-2.5 flex items-center gap-2.5 ${stockMeta.textClass}`}>
            <StockIcon status={product.stockStatus} className="w-6 h-6 shrink-0" />
            <span className="font-display text-2xl font-semibold tracking-tight">
              {stockMeta.label}
            </span>
          </div>

          <p className="mt-2.5 text-sm text-slate-700 leading-relaxed">
            {product.stockDetails}
          </p>

          {product.discountDetails && (
            <p className="mt-3 pt-3 border-t border-slate-200/80 text-xs text-slate-600 leading-relaxed">
              <span className="font-medium text-slate-800">Offer notes: </span>
              {product.discountDetails}
            </p>
          )}
        </div>
      </div>

      {/* Summary & Grounding Sources */}
      <div className="p-6 space-y-5">
        <div>
          <h3 className="text-xs font-medium text-slate-500">Live Lookup Summary</h3>
          <p className="mt-1.5 text-sm text-slate-700 leading-relaxed max-w-3xl">
            {product.summary}
          </p>
        </div>

        {/* Price History when re-checked */}
        {product.history.length > 1 && (
          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-xs font-medium text-slate-500 mb-2.5">
              Check History ({product.history.length} checks)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-1.5 text-left font-medium">Checked</th>
                    <th className="py-1.5 text-left font-medium">Availability</th>
                    <th className="py-1.5 text-right font-medium">Recorded Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {product.history.slice(0, 6).map((entry, idx) => {
                    const prev = product.history[idx + 1];
                    const dropped =
                      prev?.price !== null &&
                      prev?.price !== undefined &&
                      entry.price !== null &&
                      entry.price < prev.price;
                    return (
                      <tr key={`${entry.checkedAt}-${idx}`}>
                        <td className="py-2 text-slate-600 font-mono tabular-nums">
                          {formatFullTimestamp(entry.checkedAt)}
                        </td>
                        <td
                          className={`py-2 font-medium ${STOCK_STATUS_META[entry.stockStatus].textClass}`}
                        >
                          {STOCK_STATUS_META[entry.stockStatus].label}
                        </td>
                        <td
                          className={`py-2 text-right font-mono tabular-nums font-medium ${
                            dropped ? 'text-emerald-700' : 'text-slate-900'
                          }`}
                        >
                          {formatPrice(entry.price, product.currencySymbol)}
                          {dropped && ' (Drop)'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Google Search Grounding Citations */}
        <div className="pt-4 border-t border-slate-200">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-2.5">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span>Verified Google Search Sources</span>
          </div>

          {product.sources.length > 0 ? (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {product.sources.slice(0, 6).map((source) => (
                <li key={source.uri} className="min-w-0">
                  <a
                    href={source.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-800 truncate group-hover:text-slate-950">
                        {source.title}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 truncate">
                        {source.domain}
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0 group-hover:text-slate-700" />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">
              Grounded with Google Search for {product.domain}.
            </p>
          )}

          {product.searchQueries.length > 0 && (
            <div className="mt-3 text-xs text-slate-500">
              <span className="font-medium text-slate-600">Search queries: </span>
              {product.searchQueries.map((q, idx) => (
                <span key={q}>
                  {idx > 0 && <span aria-hidden="true"> · </span>}
                  <span>&ldquo;{q}&rdquo;</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
