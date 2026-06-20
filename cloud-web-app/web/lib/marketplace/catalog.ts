/**
 * Canonical marketplace catalog ("Catálogo Vivo").
 *
 * Single source of truth for the extensions surfaced by the public marketplace
 * and the install/uninstall contract. Consolidates what used to be fragmented
 * across three incompatible backends (DEBT-MKT-FRAG-001):
 *   1. static curated list (`marketplace-page.data.ts`)
 *   2. hardcoded built-ins (duplicated across 3 API routes)
 *   3. Prisma `MarketplaceItem` (creator/published items)
 *
 * Keys are stable slugs. Install state is persisted in Prisma
 * `InstalledExtension` keyed by this same id, so the catalog is "live"
 * (real, per-user install state) without requiring a schema migration.
 */
import {
  CURATED_EXTENSIONS,
  type Extension,
} from '@/app/marketplace/marketplace-page.data'

export type { Extension } from '@/app/marketplace/marketplace-page.data'

/**
 * Engine built-in extensions. Always present, cannot be uninstalled.
 * Single source of truth — the install/uninstall/extensions routes import this
 * instead of re-declaring their own copies.
 */
export const BUILTIN_EXTENSION_IDS = [
  'aethel.blueprint-editor',
  'aethel.niagara-vfx',
  'aethel.ai-assistant',
  'aethel.landscape-editor',
  'aethel.physics-engine',
  'aethel.multiplayer',
] as const

type BuiltinSeed = {
  id: string
  name: string
  displayName: string
  description: string
  categories: string[]
  tags: string[]
}

const BUILTIN_SEEDS: BuiltinSeed[] = [
  {
    id: 'aethel.blueprint-editor',
    name: 'blueprint-editor',
    displayName: 'Blueprint Editor',
    description: 'Visual node graph editing bundled with the engine.',
    categories: ['productivity'],
    tags: ['visual-scripting', 'blueprint'],
  },
  {
    id: 'aethel.niagara-vfx',
    name: 'niagara-vfx',
    displayName: 'Niagara VFX',
    description: 'Particle and visual-effects authoring bundled with the engine.',
    categories: ['productivity'],
    tags: ['vfx', 'particles'],
  },
  {
    id: 'aethel.ai-assistant',
    name: 'ai-assistant',
    displayName: 'AI Assistant',
    description: 'In-editor AI assistance bundled with the engine.',
    categories: ['ai-tools', 'productivity'],
    tags: ['ai', 'assistant'],
  },
  {
    id: 'aethel.landscape-editor',
    name: 'landscape-editor',
    displayName: 'Landscape Editor',
    description: 'Terrain and landscape sculpting bundled with the engine.',
    categories: ['productivity'],
    tags: ['terrain', 'landscape'],
  },
  {
    id: 'aethel.physics-engine',
    name: 'physics-engine',
    displayName: 'Physics Engine',
    description: 'Rigidbody and collision simulation bundled with the engine.',
    categories: ['productivity'],
    tags: ['physics', 'simulation'],
  },
  {
    id: 'aethel.multiplayer',
    name: 'multiplayer',
    displayName: 'Multiplayer',
    description: 'Networking and lobby primitives bundled with the engine.',
    categories: ['productivity'],
    tags: ['networking', 'multiplayer'],
  },
]

export const BUILTIN_EXTENSIONS: Extension[] = BUILTIN_SEEDS.map((seed) => ({
  id: seed.id,
  name: seed.name,
  displayName: seed.displayName,
  description: seed.description,
  version: 'bundled',
  publisher: 'Aethel Engine',
  evidenceLabel: 'Aethel built-in',
  categories: seed.categories,
  tags: ['built-in', ...seed.tags],
  license: 'aethel-engine',
  installed: true,
  verified: true,
  riskLevel: 'low',
  permissions: ['Bundled with the engine runtime'],
  provenance: 'Shipped and maintained by the Aethel Engine team.',
  rollbackPlan: 'Built-in modules cannot be removed; disable per-project instead.',
  reviewStatus: 'verified',
}))

/**
 * Canonical catalog = built-ins first, then curated packages.
 * `installed` here is the catalog default; the live per-user state is merged
 * at request time from `InstalledExtension`.
 */
export const CANONICAL_EXTENSIONS: Extension[] = [
  ...BUILTIN_EXTENSIONS,
  ...CURATED_EXTENSIONS,
]

const CANONICAL_BY_ID = new Map<string, Extension>(
  CANONICAL_EXTENSIONS.map((extension) => [extension.id, extension]),
)

const BUILTIN_ID_SET = new Set<string>(BUILTIN_EXTENSION_IDS)

export function isBuiltinExtension(id: string): boolean {
  return BUILTIN_ID_SET.has(id)
}

export function getCatalogExtension(id: string): Extension | undefined {
  return CANONICAL_BY_ID.get(id)
}

export function isKnownCatalogExtension(id: string): boolean {
  return CANONICAL_BY_ID.has(id)
}
