export type PaymentStatusFilter = 'all' | 'succeeded' | 'pending' | 'failed'

export type PaymentItem = {
  id: string
  userEmail: string | null
  amount: number
  currency: string
  status: string
  createdAt: string
}

export type PaymentTotals = {
  total: number
  succeeded: number
  pending: number
  failed: number
}

export type GatewayConfig = {
  activeGateway: 'stripe' | 'disabled'
  checkoutEnabled: boolean
  allowLocalIdeRedirect: boolean
  checkoutOrigin: string | null
  updatedBy: string | null
  updatedAt: string | null
}

export type BillingRuntimeSnapshot = {
  status: 'ready' | 'partial' | 'unavailable' | string
  checkoutReady: boolean
  portalReady?: boolean
  webhookReady?: boolean
  provider?: { id: string; label: string; setupEnv: string[]; webhookPath?: string | null }
  stripe?: { publishableKeyConfigured: boolean; configuredPriceCount: number; requiredPriceCount: number; missingEnv: string[] }
}
