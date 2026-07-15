export type PublicRouteVisibility = 'primary' | 'secondary' | 'compatibility'

export type PublicRouteConsolidation = {
  route: string
  canonicalSurface: string
  visibility: PublicRouteVisibility
  preserveUrl: boolean
  primaryAction: string
  rationale: string
}

export const PUBLIC_ROUTE_CONSOLIDATION: PublicRouteConsolidation[] = [
  {
    route: '/compare',
    canonicalSurface: '/compare',
    visibility: 'primary',
    preserveUrl: true,
    primaryAction: 'Use comparison as the buyer-facing proof page; keep details folded behind evidence links.',
    rationale: 'Comparison earns a primary lane because it answers the market-positioning question directly.',
  },
  {
    route: '/customers',
    canonicalSurface: '/trust',
    visibility: 'compatibility',
    preserveUrl: false,
    primaryAction: 'Fold customer-fit proof into trust until named case studies are real public assets.',
    rationale: 'Customer proof without named logos is procurement context, not a standalone market surface.',
  },
  {
    route: '/contact',
    canonicalSurface: '/help',
    visibility: 'compatibility',
    preserveUrl: false,
    primaryAction: 'Route support needs through help; enterprise requests use contact sales.',
    rationale: 'A generic contact page duplicates help and sales while adding a weak form surface.',
  },
  {
    route: '/roadmap',
    canonicalSurface: '/docs/changelog',
    visibility: 'compatibility',
    preserveUrl: false,
    primaryAction: 'Move public roadmap reading into changelog and docs until roadmap has real release artifacts.',
    rationale: 'A roadmap page with caveats reads like internal audit copy; changelog is clearer public proof.',
  },
  {
    route: '/security-acknowledgments',
    canonicalSurface: '/security-policy',
    visibility: 'compatibility',
    preserveUrl: false,
    primaryAction: 'Fold acknowledgments into the security policy instead of keeping a low-value standalone page.',
    rationale: 'A thin acknowledgments page adds public surface area without improving buyer trust or user action.',
  },
  {
    route: '/contact-sales',
    canonicalSurface: '/pricing',
    visibility: 'secondary',
    preserveUrl: true,
    primaryAction: 'Send enterprise buying conversations from pricing, billing, trust, and procurement flows.',
    rationale: 'Sales contact is an action endpoint, not a standalone top-level product surface.',
  },
]

export function getPublicRouteConsolidation(route: string): PublicRouteConsolidation | undefined {
  return PUBLIC_ROUTE_CONSOLIDATION.find((entry) => entry.route === route)
}

export function isPreservedPublicRoute(route: string): boolean {
  return getPublicRouteConsolidation(route)?.preserveUrl === true
}
