export type StockStatus =
  | 'in_stock'
  | 'low_stock'
  | 'pre_order'
  | 'sold_out'
  | 'unknown';

export interface GroundingSource {
  title: string;
  uri: string;
  domain: string;
}

export interface PriceHistoryPoint {
  checkedAt: string;
  price: number | null;
  currency: string;
  stockStatus: StockStatus;
}

export interface ProductCheckResult {
  url: string;
  domain: string;
  productName: string;
  retailer: string;
  currency: string;
  currencySymbol: string;
  currentPrice: number | null;
  originalPrice: number | null;
  discountAmount: number | null;
  discountPercent: number | null;
  isPriceDrop: boolean;
  priceDropReason: string | null;
  discountDetails: string | null;
  promoCode: string | null;
  stockStatus: StockStatus;
  stockDetails: string;
  summary: string;
  checkedAt: string;
  sources: GroundingSource[];
  searchQueries: string[];
}

export interface TrackedProduct extends ProductCheckResult {
  id: string;
  previousCheckPrice: number | null;
  priceDeltaFromLastCheck: number | null;
  history: PriceHistoryPoint[];
}

export type FilterView = 'all' | 'price_drops' | 'in_stock' | 'sold_out';
export type SortOption = 'recent' | 'biggest_drop' | 'lowest_price';
