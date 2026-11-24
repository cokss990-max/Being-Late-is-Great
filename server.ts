import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import type { GroundingSource, ProductCheckResult, StockStatus } from './src/types/tracker.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'CA$',
  AUD: 'A$',
  JPY: '¥',
  INR: '₹',
  CHF: 'CHF ',
  SEK: 'kr ',
  NZD: 'NZ$',
};

function normalizeInputUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 2048) return null;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function getHostnameLabel(uri: string): string {
  try {
    return new URL(uri).hostname.replace(/^www\./i, '');
  } catch {
    return uri;
  }
}

function toFiniteNumber(val: unknown): number | null {
  if (typeof val === 'number' && Number.isFinite(val) && val >= 0) {
    return Math.round(val * 100) / 100;
  }
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.]/g, '');
    if (!cleaned) return null;
    const parsed = Number.parseFloat(cleaned);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.round(parsed * 100) / 100;
    }
  }
  return null;
}

function normalizeStockStatus(raw: unknown): StockStatus {
  if (typeof raw !== 'string') return 'unknown';
  const normalized = raw.toLowerCase().trim().replace(/[\s-]+/g, '_');
  if (
    normalized === 'in_stock' ||
    normalized === 'available' ||
    normalized === 'instock'
  ) {
    return 'in_stock';
  }
  if (
    normalized === 'low_stock' ||
    normalized === 'limited' ||
    normalized === 'limited_stock' ||
    normalized === 'few_left'
  ) {
    return 'low_stock';
  }
  if (
    normalized === 'pre_order' ||
    normalized === 'preorder' ||
    normalized === 'backorder' ||
    normalized === 'coming_soon'
  ) {
    return 'pre_order';
  }
  if (
    normalized === 'sold_out' ||
    normalized === 'out_of_stock' ||
    normalized === 'unavailable' ||
    normalized === 'discontinued'
  ) {
    return 'sold_out';
  }
  return 'unknown';
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();

  // Try direct parse first
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Continue to fenced/bracket extraction
  }

  // Try markdown JSON fence
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) {
    try {
      const parsed = JSON.parse(fenceMatch[1].trim());
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Continue
    }
  }

  // Try first balanced JSON object
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      const parsed = JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }

  return null;
}

async function generateWithRetry(
  urlString: string,
  domain: string,
  previousPrice: number | null
) {
  const systemInstruction = [
    'You are a precision e-commerce price and inventory analyst.',
    'Always use Google Search to look up the current live listing, price, active discounts/sales, and stock availability for the user-provided product URL.',
    'Extract factual, up-to-date information from search results. Do not invent prices or discounts if they cannot be found in search results.',
    'Return ONLY a single valid JSON object (no surrounding markdown prose) with these exact keys:',
    '{',
    '  "productName": string (concise official product title),',
    '  "retailer": string (store or brand name),',
    '  "currency": string (3-letter ISO currency code such as "USD", "EUR", "GBP"),',
    '  "currentPrice": number | null (numeric current selling price, e.g. 249.99, or null if not found),',
    '  "originalPrice": number | null (numeric regular/MSRP/list price if higher than currentPrice or on sale, otherwise null),',
    '  "discountPercent": number | null (percentage off if discounted, e.g. 20 for 20% off, or null),',
    '  "isPriceDrop": boolean (true if the item is currently on sale, discounted below MSRP/list price, or dropped below the previously recorded price),',
    '  "priceDropReason": string | null (short explanation of the discount or drop, e.g. "20% off MSRP ($70 savings)" or "Seasonal sale"),',
    '  "discountDetails": string | null (any active sale details, coupon terms, bundle offers, or historical price context),',
    '  "promoCode": string | null (coupon/promo code if mentioned, else null),',
    '  "stockStatus": "in_stock" | "low_stock" | "pre_order" | "sold_out" | "unknown",',
    '  "stockDetails": string (clear short availability note, e.g. "In stock and ready to ship" or "Sold out online at retailer"),',
    '  "summary": string (1-2 concise sentences summarizing pricing, discount status, and availability)',
    '}',
  ].join('\n');

  const previousNote =
    previousPrice !== null
      ? `\nPreviously recorded price from an earlier check: ${previousPrice}. Note if the current price is lower than this previous price.`
      : '';

  const userPrompt = `Use Google Search to check the current live price, any active discounts or price drops, and whether this product is in stock or sold out:

Product URL: ${urlString}
Retailer domain: ${domain}${previousNote}

Search specifically for this exact product page and product name to verify its latest price, list price/discount, and current stock status. Respond with ONLY the JSON object.`;

  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: userPrompt,
        config: {
          systemInstruction,
          tools: [{ googleSearch: {} }],
        },
      });
      return response;
    } catch (err: unknown) {
      lastError = err;
      const status =
        typeof err === 'object' && err !== null && 'status' in err
          ? Number((err as { status?: unknown }).status)
          : undefined;
      const isRetryable = status === 429 || status === 500 || status === 503 || status === 504;
      if (!isRetryable || attempt === maxAttempts) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 600 * Math.pow(2, attempt - 1)));
    }
  }

  throw lastError;
}

function buildErrorPayload(err: unknown): { status: number; message: string } {
  const rawMessage = err instanceof Error ? err.message : String(err);
  const status =
    typeof err === 'object' && err !== null && 'status' in err
      ? Number((err as { status?: unknown }).status)
      : 500;

  if (
    status === 403 ||
    rawMessage.includes('PERMISSION_DENIED') ||
    rawMessage.includes('API_KEY_INVALID') ||
    rawMessage.includes('API key not valid')
  ) {
    return {
      status: 403,
      message:
        'Gemini API access was denied or the API key is invalid. Please verify your API key in the Settings > Secrets panel.',
    };
  }

  if (status === 429 || rawMessage.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message:
        'Rate limit or quota reached for the Gemini API. Please wait a moment and try again, or check your billing quota in Settings > Secrets.',
    };
  }

  if (status === 404 || rawMessage.includes('NOT_FOUND')) {
    return {
      status: 502,
      message:
        'The configured Gemini model could not be reached. Please try again shortly.',
    };
  }

  return {
    status: status >= 400 && status < 600 ? status : 500,
    message: rawMessage || 'Unable to check product status right now. Please try again.',
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.post('/api/check-product', async (req: Request, res: Response) => {
    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({
        error:
          'GEMINI_API_KEY is not configured on the server. Please add it in the Settings > Secrets panel.',
      });
      return;
    }

    const body = req.body as { url?: unknown; previousPrice?: unknown };
    if (typeof body?.url !== 'string') {
      res.status(400).json({ error: 'Please provide a valid product URL.' });
      return;
    }

    const parsedUrl = normalizeInputUrl(body.url);
    if (!parsedUrl) {
      res.status(400).json({
        error:
          'Invalid URL format. Enter a full product link such as https://store.example.com/product.',
      });
      return;
    }

    const previousPrice = toFiniteNumber(body.previousPrice);
    const domain = parsedUrl.hostname.replace(/^www\./i, '');

    try {
      const response = await generateWithRetry(parsedUrl.toString(), domain, previousPrice);
      const text = response.text ?? '';
      const parsed = extractJsonObject(text);

      // Extract verified Google Search grounding metadata
      const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
      const rawChunks = groundingMetadata?.groundingChunks ?? [];
      const seenUris = new Set<string>();
      const sources: GroundingSource[] = [];

      for (const chunk of rawChunks) {
        const uri = chunk?.web?.uri;
        if (typeof uri === 'string' && uri.startsWith('http') && !seenUris.has(uri)) {
          seenUris.add(uri);
          sources.push({
            title:
              typeof chunk?.web?.title === 'string' && chunk.web.title.trim()
                ? chunk.web.title.trim()
                : getHostnameLabel(uri),
            uri,
            domain: getHostnameLabel(uri),
          });
        }
      }

      const searchQueries: string[] = Array.isArray(groundingMetadata?.webSearchQueries)
        ? groundingMetadata.webSearchQueries.filter(
            (q): q is string => typeof q === 'string' && q.trim().length > 0
          )
        : [];

      if (!parsed) {
        res.status(502).json({
          error:
            'Could not extract structured price and stock details from search results for this link. Try a more specific product URL.',
        });
        return;
      }

      const currencyRaw =
        typeof parsed.currency === 'string' && parsed.currency.trim()
          ? parsed.currency.trim().toUpperCase().slice(0, 3)
          : 'USD';
      const currencySymbol = CURRENCY_SYMBOLS[currencyRaw] ?? `${currencyRaw} `;

      const currentPrice = toFiniteNumber(parsed.currentPrice);
      let originalPrice = toFiniteNumber(parsed.originalPrice);

      // Ensure originalPrice is only retained if strictly higher than currentPrice
      if (currentPrice !== null && originalPrice !== null && originalPrice <= currentPrice) {
        originalPrice = null;
      }

      let discountAmount: number | null = null;
      let discountPercent = toFiniteNumber(parsed.discountPercent);

      if (currentPrice !== null && originalPrice !== null && originalPrice > currentPrice) {
        discountAmount = Math.round((originalPrice - currentPrice) * 100) / 100;
        if (discountPercent === null || discountPercent <= 0) {
          discountPercent = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
        }
      } else if (discountPercent !== null && discountPercent <= 0) {
        discountPercent = null;
      }

      const droppedFromPrevious =
        previousPrice !== null && currentPrice !== null && currentPrice < previousPrice;

      const isPriceDrop = Boolean(
        parsed.isPriceDrop === true ||
          (discountAmount !== null && discountAmount > 0) ||
          (discountPercent !== null && discountPercent > 0) ||
          droppedFromPrevious
      );

      let priceDropReason =
        typeof parsed.priceDropReason === 'string' && parsed.priceDropReason.trim()
          ? parsed.priceDropReason.trim()
          : null;

      if (isPriceDrop && !priceDropReason) {
        if (discountAmount !== null && discountPercent !== null) {
          priceDropReason = `${discountPercent}% off (${currencySymbol}${discountAmount.toFixed(2)} savings)`;
        } else if (droppedFromPrevious && previousPrice !== null && currentPrice !== null) {
          const dropDiff = Math.round((previousPrice - currentPrice) * 100) / 100;
          priceDropReason = `Dropped ${currencySymbol}${dropDiff.toFixed(2)} since last check`;
        } else if (discountPercent !== null) {
          priceDropReason = `${discountPercent}% discount active`;
        } else {
          priceDropReason = 'Active price drop detected';
        }
      }

      const stockStatus = normalizeStockStatus(parsed.stockStatus);
      const stockDetails =
        typeof parsed.stockDetails === 'string' && parsed.stockDetails.trim()
          ? parsed.stockDetails.trim()
          : stockStatus === 'in_stock'
            ? 'Available to purchase online'
            : stockStatus === 'sold_out'
              ? 'Currently sold out or unavailable'
              : stockStatus === 'low_stock'
                ? 'Limited quantities remaining'
                : stockStatus === 'pre_order'
                  ? 'Available for pre-order or backorder'
                  : 'Stock availability could not be verified from search results';

      const productName =
        typeof parsed.productName === 'string' && parsed.productName.trim()
          ? parsed.productName.trim()
          : `Product on ${domain}`;

      const retailer =
        typeof parsed.retailer === 'string' && parsed.retailer.trim()
          ? parsed.retailer.trim()
          : domain;

      const discountDetails =
        typeof parsed.discountDetails === 'string' && parsed.discountDetails.trim()
          ? parsed.discountDetails.trim()
          : null;

      const promoCode =
        typeof parsed.promoCode === 'string' && parsed.promoCode.trim()
          ? parsed.promoCode.trim()
          : null;

      const summary =
        typeof parsed.summary === 'string' && parsed.summary.trim()
          ? parsed.summary.trim()
          : `${productName} at ${retailer}.`;

      const result: ProductCheckResult = {
        url: parsedUrl.toString(),
        domain,
        productName,
        retailer,
        currency: currencyRaw,
        currencySymbol,
        currentPrice,
        originalPrice,
        discountAmount,
        discountPercent,
        isPriceDrop,
        priceDropReason,
        discountDetails,
        promoCode,
        stockStatus,
        stockDetails,
        summary,
        checkedAt: new Date().toISOString(),
        sources,
        searchQueries,
      };

      res.json(result);
    } catch (err: unknown) {
      const { status, message } = buildErrorPayload(err);
      res.status(status).json({ error: message });
    }
  });

  if (!IS_PRODUCTION) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Discount & Stock Tracker listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
