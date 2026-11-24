import { useRef } from 'react';
import type { FormEvent, RefObject } from 'react';
import { AlertCircle, Link2, Loader2, Search, X } from 'lucide-react';
import { SAMPLE_PRODUCT_URLS } from '../utils/formatters';

interface UrlCheckBarProps {
  urlInput: string;
  onUrlInputChange: (value: string) => void;
  onSubmitUrl: (url: string) => void;
  isChecking: boolean;
  errorMessage: string | null;
  onDismissError: () => void;
  inputRef?: RefObject<HTMLInputElement | null>;
}

export function UrlCheckBar({
  urlInput,
  onUrlInputChange,
  onSubmitUrl,
  isChecking,
  errorMessage,
  onDismissError,
  inputRef,
}: UrlCheckBarProps) {
  const internalRef = useRef<HTMLInputElement | null>(null);
  const resolvedRef = inputRef ?? internalRef;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed || isChecking) return;
    onSubmitUrl(trimmed);
  };

  return (
    <section
      aria-label="Product URL checker"
      className="bg-white border border-slate-200 rounded-xl p-6"
    >
      <div className="flex flex-col gap-1.5 mb-5">
        <h1 className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 text-balance">
          Check live price, discounts, and stock status
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl">
          Paste any retail product link to look up current pricing, active discounts or price drops, and real-time availability via Google Search grounding.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <label htmlFor="product-url-input" className="sr-only">
            Product URL
          </label>
          <Link2
            className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            ref={resolvedRef}
            id="product-url-input"
            type="text"
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            placeholder="https://www.retailer.com/product/example-item"
            value={urlInput}
            onChange={(e) => onUrlInputChange(e.target.value)}
            disabled={isChecking}
            className="w-full min-h-[44px] pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-colors disabled:opacity-60"
          />
          {urlInput && !isChecking && (
            <button
              type="button"
              onClick={() => {
                onUrlInputChange('');
                resolvedRef.current?.focus();
              }}
              aria-label="Clear URL input"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={isChecking || !urlInput.trim()}
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
        >
          {isChecking ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Checking Status…</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>Check Status</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500">
        <span>Try an example:</span>
        {SAMPLE_PRODUCT_URLS.map((sample, idx) => (
          <span key={sample.url} className="inline-flex items-center gap-3">
            {idx > 0 && (
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
            )}
            <button
              type="button"
              disabled={isChecking}
              onClick={() => {
                onUrlInputChange(sample.url);
                onSubmitUrl(sample.url);
              }}
              className="text-slate-700 hover:text-slate-950 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900 transition-colors disabled:opacity-50"
            >
              {sample.label}
            </button>
          </span>
        ))}
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="mt-4 flex items-start justify-between gap-3 p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={onDismissError}
            aria-label="Dismiss error"
            className="text-red-600 hover:text-red-900 p-0.5 rounded transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </section>
  );
}
