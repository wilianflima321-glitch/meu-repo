/**
 * Monetization Injection client — Cook & Build Pipeline Stage 5.
 *
 * `runtime-main.ts` calls `initRuntimeBilling()` only when the project was
 * published with a Stripe publishable key attached (see `monetization` in
 * `PublishPipelineRequest`, `publish-pipeline-orchestrator.ts`). Free/no-IAP
 * exports never import Stripe.js at all.
 *
 * Real today: the client bootstrap, the SKU purchase contract, and lazy
 * loading of Stripe.js only on first purchase attempt (so it never blocks
 * first paint). Architecturally stubbed, by explicit Cook & Build Pipeline
 * scope ("não precisa construir o servidor inteiro do zero hoje"): the
 * `/api/runtime-billing/checkout` + webhook endpoints that would create a
 * real Checkout Session and validate entitlements against Redis (Cost
 * Guard) — see `cloud-web-app/web/app/api/billing/webhook/route.ts` for the
 * pattern this should mirror once built.
 */

export interface RuntimeBillingConfig {
  /** Stripe publishable key (pk_live_/pk_test_) supplied at Publish time — never the secret key. */
  stripePublishableKey: string
  /** Base URL of the Aethel runtime-billing backend that will own Checkout Sessions + entitlement validation. */
  checkoutEndpoint?: string
}

export type PurchaseOutcome =
  | { status: 'redirecting' }
  | { status: 'error'; reason: string }

let stripeJsLoadPromise: Promise<unknown> | null = null

async function loadStripeJs(publishableKey: string): Promise<unknown> {
  if (!stripeJsLoadPromise) {
    stripeJsLoadPromise = (async () => {
      if (typeof window === 'undefined') throw new Error('Stripe.js can only load in a browser runtime.')
      const globalWindow = window as unknown as { Stripe?: (key: string) => unknown }
      if (!globalWindow.Stripe) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://js.stripe.com/v3/'
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('Failed to load Stripe.js'))
          document.head.appendChild(script)
        })
      }
      return (window as unknown as { Stripe: (key: string) => unknown }).Stripe(publishableKey)
    })()
  }
  return stripeJsLoadPromise
}

export class RuntimeBillingClient {
  constructor(private readonly config: RuntimeBillingConfig) {}

  /**
   * Kicks off a cosmetic/DLC purchase for `skuId`. Real flow (once the
   * server side lands): POST to `checkoutEndpoint` → receive a Checkout
   * Session id → `stripe.redirectToCheckout({ sessionId })`. Until that
   * endpoint exists this fails closed with a clear `error` outcome instead
   * of pretending to charge the player.
   */
  async purchaseSku(skuId: string): Promise<PurchaseOutcome> {
    if (!this.config.checkoutEndpoint) {
      return { status: 'error', reason: 'No runtime-billing checkout endpoint configured for this build.' }
    }
    try {
      await loadStripeJs(this.config.stripePublishableKey)
      const response = await fetch(this.config.checkoutEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skuId }),
      })
      if (!response.ok) {
        return { status: 'error', reason: `Checkout session request failed (${response.status}).` }
      }
      const { url } = (await response.json()) as { url?: string }
      if (!url) return { status: 'error', reason: 'Checkout backend did not return a redirect URL.' }
      window.location.assign(url)
      return { status: 'redirecting' }
    } catch (error) {
      return { status: 'error', reason: error instanceof Error ? error.message : 'Unknown billing error.' }
    }
  }
}

export function initRuntimeBilling(config: RuntimeBillingConfig): RuntimeBillingClient {
  return new RuntimeBillingClient(config)
}
