import type { BillingReadiness } from '@/lib/api'

export type Invoice = {
  id: string
  number: string | null
  status: string
  amount: number
  currency: string
  created: number
  pdfUrl: string | null
  hostedUrl: string | null
}

export type Subscription = {
  id: string
  status: string
  currentPeriodEnd: number
  cancelAtPeriodEnd: boolean
  cancelAt: number | null
}

export type PaymentMethod = {
  id: string
  brand?: string
  last4?: string
  expMonth?: number
  expYear?: number
  isDefault: boolean
}

export type BillingData = {
  hasSubscription: boolean
  plan: string
  subscription: Subscription | null
  trial: {
    endsAt: string
    isActive: boolean
    daysRemaining: number
  } | null
  invoices: Invoice[]
  paymentMethods: PaymentMethod[]
  canAccessPortal: boolean
}

export type BillingInvoicesSharedProps = {
  readiness: BillingReadiness | null
  portalLoading: boolean
  onOpenPortal: () => void
}
