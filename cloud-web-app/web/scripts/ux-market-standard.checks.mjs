// Executable UX market checks for qa:ux-market-standard.
// Aggregates focused check packs so no single QA file becomes a product monolith.
import { PRODUCT_UX_CHECKS } from './ux-market-standard.product-checks.mjs'
import { PUBLIC_UX_CHECKS } from './ux-market-standard.public-checks.mjs'

export const CHECKS = [...PUBLIC_UX_CHECKS, ...PRODUCT_UX_CHECKS]
