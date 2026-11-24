import type { StockStatus, TrackedProduct } from '../types/tracker';

export function formatPrice(amount: number | null, symbol: string): string {
  if (amount === null || !Number.isFinite(amount)) {
    return 'Price unavailable';
  }
  return `${symbol}${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatRelativeTime(isoDate: string): string {
  const timestamp = new Date(isoDate).getTime();
  if (Number.isNaN(timestamp)) return 'Just now';

  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSeconds < 45) return 'Just now';
  if (diffSeconds < 3600) {
    const mins = Math.floor(diffSeconds / 60);
    return `${mins}m ago`;
  }
  if (diffSeconds < 86400) {
    const hrs = Math.floor(diffSeconds / 3600);
    return `${hrs}h ago`;
  }
  const days = Math.floor(diffSeconds / 86400);
  return `${days}d ago`;
}

export function formatFullTimestamp(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export interface StockDisplayMeta {
  label: string;
  shortLabel: string;
  textClass: string;
  surfaceClass: string;
  borderClass: string;
}

export const STOCK_STATUS_META: Record<StockStatus, StockDisplayMeta> = {
  in_stock: {
    label: 'In Stock',
    shortLabel: 'In Stock',
    textClass: 'text-emerald-700',
    surfaceClass: 'bg-emerald-50/70',
    borderClass: 'border-emerald-200',
  },
  low_stock: {
    label: 'Low Stock',
    shortLabel: 'Low Stock',
    textClass: 'text-amber-700',
    surfaceClass: 'bg-amber-50/70',
    borderClass: 'border-amber-200',
  },
  pre_order: {
    label: 'Pre-Order',
    shortLabel: 'Pre-Order',
    textClass: 'text-sky-700',
    surfaceClass: 'bg-sky-50/70',
    borderClass: 'border-sky-200',
  },
  sold_out: {
    label: 'Sold Out',
    shortLabel: 'Sold Out',
    textClass: 'text-red-700',
    surfaceClass: 'bg-red-50/70',
    borderClass: 'border-red-200',
  },
  unknown: {
    label: 'Unverified',
    shortLabel: 'Unverified',
    textClass: 'text-slate-600',
    surfaceClass: 'bg-slate-100/70',
    borderClass: 'border-slate-200',
  },
};

export interface SampleProductLink {
  label: string;
  retailer: string;
  url: string;
}

export const SAMPLE_PRODUCT_URLS: SampleProductLink[] = [
  {
    label: 'Sony WH-1000XM5 Headphones',
    retailer: 'bestbuy.com',
    url: 'https://www.bestbuy.com/site/sony-wh1000xm5-wireless-noise-canceling-over-the-ear-headphones-black/6505727.p',
  },
  {
    label: 'Apple AirPods Pro 2',
    retailer: 'apple.com',
    url: 'https://www.apple.com/shop/product/MTJV3LL/A/airpods-pro',
  },
  {
    label: 'Kindle Paperwhite Signature',
    retailer: 'amazon.com',
    url: 'https://www.amazon.com/dp/B0CFPWLGF2',
  },
];

function escapeCsvCell(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportTrackedProductsCsv(items: TrackedProduct[]): void {
  const headers = [
    'Product Name',
    'Retailer',
    'URL',
    'Currency',
    'Current Price',
    'Original Price',
    'Discount Amount',
    'Discount Percent',
    'Price Drop',
    'Stock Status',
    'Stock Details',
    'Promo Code',
    'Checked At',
  ];

  const rows = items.map((item) => [
    item.productName,
    item.retailer,
    item.url,
    item.currency,
    item.currentPrice ?? '',
    item.originalPrice ?? '',
    item.discountAmount ?? '',
    item.discountPercent !== null ? `${item.discountPercent}%` : '',
    item.isPriceDrop ? 'Yes' : 'No',
    STOCK_STATUS_META[item.stockStatus].label,
    item.stockDetails,
    item.promoCode ?? '',
    item.checkedAt,
  ]);

  const csvContent = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) => r.map(escapeCsvCell).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = `discount-stock-tracker-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}
