import type { ProductCheckResult } from '../types/tracker';

export async function checkProductUrl(
  url: string,
  previousPrice?: number | null
): Promise<ProductCheckResult> {
  const response = await fetch('/api/check-product', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      previousPrice: previousPrice ?? null,
    }),
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // Non-JSON response fallback
  }

  if (!response.ok) {
    const errorMessage =
      typeof payload === 'object' &&
      payload !== null &&
      'error' in payload &&
      typeof (payload as { error?: unknown }).error === 'string'
        ? (payload as { error: string }).error
        : `Request failed with status ${response.status}.`;
    throw new Error(errorMessage);
  }

  return payload as ProductCheckResult;
}
