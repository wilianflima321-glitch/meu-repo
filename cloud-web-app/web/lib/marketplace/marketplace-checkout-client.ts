/**
 * Client helper — start marketplace Stripe Checkout for a paid listing.
 */

export type MarketplaceCheckoutResult =
  | { ok: true; checkoutUrl: string }
  | { ok: false; status: number; error: string; message: string; held?: boolean }

export async function startMarketplaceCheckout(itemId: string): Promise<MarketplaceCheckoutResult> {
  const response = await fetch('/api/marketplace/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ itemId }),
  })

  const data = (await response.json().catch(() => ({}))) as {
    checkoutUrl?: string
    url?: string
    error?: string
    message?: string
    capabilityStatus?: string
  }

  if (response.ok) {
    const checkoutUrl = data.checkoutUrl || data.url
    if (checkoutUrl) return { ok: true, checkoutUrl }
    return {
      ok: false,
      status: response.status,
      error: 'CHECKOUT_URL_MISSING',
      message: 'Checkout session created but no redirect URL was returned.',
    }
  }

  return {
    ok: false,
    status: response.status,
    error: data.error || 'CHECKOUT_FAILED',
    message: data.message || 'Could not start checkout.',
    held: response.status === 503 || data.capabilityStatus === 'HELD',
  }
}
