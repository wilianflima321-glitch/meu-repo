import type { Promotion } from './promotions-types'

export function formatDiscount(promotion: Promotion) {
  if (promotion.discount == null) return 'N/A'
  if (promotion.type === 'percentage') return `${promotion.discount}%`
  if (promotion.type === 'fixed') return `US$${promotion.discount.toFixed(2)}`
  return `${promotion.discount}`
}
