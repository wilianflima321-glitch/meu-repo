import { ADMIN_CONSOLIDATED_SECTIONS } from '@/lib/admin/admin-consolidation'

export type ProductSurfaceId =
  | 'home'
  | 'workspace'
  | 'ide'
  | 'canvas'
  | 'research'
  | 'evidence'

export type ProductSurfaceAudience = 'public' | 'authenticated' | 'operator'

export type ProductSurfaceState =
  | 'available'
  | 'held'
  | 'blocked'
  | 'needs-review'
  | 'provider_unavailable'
  | 'human_review_required'

export type CanonicalStudioGroup = 'world' | 'character' | 'fx' | 'film' | 'logic'

export type ProductSurfaceDefinition = {
  id: ProductSurfaceId
  label: string
  href: string
  audience: ProductSurfaceAudience
  state: ProductSurfaceState
  primaryAction: string
  evidence: string
  detailPolicy: 'details' | 'drawer' | 'command-palette'
  canonicalRoutes: readonly string[]
  hiddenLegacyRoutes: readonly string[]
  heavyRuntimePolicy: 'forbidden' | 'dynamic-only' | 'allowed'
}

export const PRODUCT_SURFACE_REGISTRY: readonly ProductSurfaceDefinition[] = [
  {
    id: 'home',
    label: 'Home',
    href: '/',
    audience: 'public',
    state: 'available',
    primaryAction: 'Start a mission',
    evidence: 'Public proof, pricing, trust, and product fit stay one click away.',
    detailPolicy: 'details',
    canonicalRoutes: ['/', '/pricing', '/marketplace', '/download', '/compare', '/help', '/contact-sales'],
    hiddenLegacyRoutes: ['/contact', '/customers', '/roadmap', '/security-acknowledgments'],
    heavyRuntimePolicy: 'forbidden',
  },
  {
    id: 'workspace',
    label: 'Workspace',
    href: '/dashboard',
    audience: 'authenticated',
    state: 'available',
    primaryAction: 'Open the active mission',
    evidence: 'Overview, Projects, and Activity are the only primary dashboard paths.',
    detailPolicy: 'drawer',
    canonicalRoutes: ['/dashboard'],
    hiddenLegacyRoutes: ['/chat', '/project-settings'],
    heavyRuntimePolicy: 'forbidden',
  },
  {
    id: 'ide',
    label: 'IDE',
    href: '/ide',
    audience: 'authenticated',
    state: 'available',
    primaryAction: 'Edit with agents',
    evidence: 'Editor, preview, agents, terminal, and problems are isolated regions.',
    detailPolicy: 'command-palette',
    canonicalRoutes: ['/ide'],
    hiddenLegacyRoutes: ['/ai-command', '/editor-hub', '/explorer', '/git', '/search', '/terminal', '/testing'],
    heavyRuntimePolicy: 'dynamic-only',
  },
  {
    id: 'canvas',
    label: 'Canvas / Viewport',
    href: '/studio',
    audience: 'authenticated',
    state: 'needs-review',
    primaryAction: 'Review the scene',
    evidence: 'Studio is compressed into five groups and preview routes through the canonical surface.',
    detailPolicy: 'drawer',
    canonicalRoutes: ['/studio', '/nexus'],
    hiddenLegacyRoutes: ['/preview', '/live-preview', '/vr-preview'],
    heavyRuntimePolicy: 'dynamic-only',
  },
  {
    id: 'research',
    label: 'Research',
    href: '/nexus?mode=research',
    audience: 'authenticated',
    state: 'needs-review',
    primaryAction: 'Run with receipts',
    evidence: 'Plans, sources, browser replay, artifacts, confidence, and cost must be visible.',
    detailPolicy: 'drawer',
    canonicalRoutes: ['/nexus'],
    hiddenLegacyRoutes: [],
    heavyRuntimePolicy: 'dynamic-only',
  },
  {
    id: 'evidence',
    label: 'Evidence',
    href: '/evidence',
    audience: 'operator',
    state: 'available',
    primaryAction: 'Audit the run',
    evidence: 'Receipts, screenshots, costs, runtime state, and approvals stay close to release.',
    detailPolicy: 'details',
    canonicalRoutes: ['/evidence', '/honest-status', '/trust', '/security', '/security-policy', '/compliance', '/reliability', '/status'],
    hiddenLegacyRoutes: [],
    heavyRuntimePolicy: 'forbidden',
  },
] as const

export const PRODUCT_SURFACE_IDS = PRODUCT_SURFACE_REGISTRY.map((surface) => surface.id)
export const PUBLIC_PRODUCT_SURFACES = PRODUCT_SURFACE_REGISTRY.filter((surface) => surface.audience === 'public')
export const AUTHENTICATED_PRODUCT_SURFACES = PRODUCT_SURFACE_REGISTRY.filter((surface) => surface.audience !== 'public')

export const V28_NAVIGATION_RATCHETS = {
  publicSurfaces: 6,
  visibleDashboardTabs: 3,
  visibleAdminAreas: ADMIN_CONSOLIDATED_SECTIONS.length,
  visibleStudioGroups: 5,
  maxAdminPhysicalRoutes: 23,
  maxStudioPhysicalRoutes: 7,
  forbiddenPublicFirstFoldCopy: [
    'readiness',
    'cockpit',
    'capabilityStatus',
    'Cloud held',
    'missionLedger',
  ],
} as const

export const CANONICAL_STUDIO_GROUPS: readonly CanonicalStudioGroup[] = ['world', 'character', 'fx', 'film', 'logic']

export function resolveProductSurfaceForPath(pathname: string): ProductSurfaceDefinition | undefined {
  const normalized = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname
  return PRODUCT_SURFACE_REGISTRY.find((surface) =>
    surface.canonicalRoutes.some((route) => normalized === route || normalized.startsWith(`${route}/`)) ||
    surface.hiddenLegacyRoutes.some((route) => normalized === route || normalized.startsWith(`${route}/`)),
  )
}
