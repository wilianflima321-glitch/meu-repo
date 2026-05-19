export type Promotion = {
  id: string
  name: string
  code: string | null
  discount: number | null
  type: 'percentage' | 'fixed' | 'other'
  active: boolean
  timesRedeemed: number | null
  expiresAt: string | null
}

export type PromotionFormState = {
  name: string
  code: string
  type: 'percentage' | 'fixed'
  discount: string
  maxRedemptions: string
  expiresAt: string
  currency: string
}

export type PromotionStatusFilter = 'all' | 'active' | 'inactive'
