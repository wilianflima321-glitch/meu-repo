/**
 * Letter bw — Deterministic TS mirror of the kernel Asset Quality Gate verdict.
 *
 * This module is the CANONICAL web mirror of `asset_quality_gate.rs`: it owns the
 * tier budget tables (moved here so the declarative consult in
 * `kernel-asset-quality-gate-honesty.ts` can depend on this module without a cycle)
 * and reproduces `evaluate_asset_quality()` + `reference_manifest()` +
 * `AssetQualityVerdict` — the SAME 9-blocker verdict the kernel would produce, with
 * the honest caveat that `kernel-asset-quality-gate-honesty.ts` keeps `ready=false`
 * until desktop IPC evidence is wired.
 *
 * The topology portion delegates to `@/lib/mesh-quality/topology-grader` (the pure,
 * bit-exact mirror of `AssetTopologyQuality::grade()`), so the web critic and the
 * kernel can never disagree on the same mesh. The kernel test
 * `topology_grader_weights_match_the_ts_mirror` guards the Rust side against drift.
 */

import {
  gradeAssetTopology,
  perfectTopologyMetrics,
  TOPOLOGY_GRADE_FLOOR,
  type AssetTopologyMetricsInput,
  type TopologyQualitySample,
} from '@/lib/mesh-quality/topology-grader'
import type { GameAssetQualityTier } from './game-asset-quality-pipeline'

export const ASSET_QUALITY_GATE_VERDICT_MIRROR_WIRED = true as const

/** Letter bw — hard cap de VRAM de textura exposto ao criativo (Law XVI / J.1). */
export const ASSET_QUALITY_GATE_VRAM_HARD_CAP_BYTES = 64 * 1024 * 1024

/** Tier catalog — mirror EXATO do kernel `AssetQualityTier` (asset_quality_gate.rs). */
export type KernelAssetQualityTierCatalog = {
  tag: GameAssetQualityTier
  maxPreviewTriangles: number
  maxHeroTriangles: number
  minTextureDim: number
  maxTextureDim: number
  usesKtx2Basis: boolean
  requiredLodLevels: number
  requiresCollisionProxy: boolean
  requiresNavmeshProxy: boolean
  minTexelsPerMeter: number
  minTopologyGrade: number
}

export const KERNEL_ASSET_QUALITY_TIER_CATALOG: readonly KernelAssetQualityTierCatalog[] = [
  {
    tag: 'ai-draft',
    maxPreviewTriangles: 10_000,
    maxHeroTriangles: 25_000,
    minTextureDim: 1024,
    maxTextureDim: 2048,
    usesKtx2Basis: false,
    requiredLodLevels: 1,
    requiresCollisionProxy: false,
    requiresNavmeshProxy: false,
    minTexelsPerMeter: 64,
    minTopologyGrade: 60,
  },
  {
    tag: 'curated-marketplace',
    maxPreviewTriangles: 250_000,
    maxHeroTriangles: 750_000,
    minTextureDim: 2048,
    maxTextureDim: 4096,
    usesKtx2Basis: false,
    requiredLodLevels: 2,
    requiresCollisionProxy: true,
    requiresNavmeshProxy: false,
    minTexelsPerMeter: 256,
    minTopologyGrade: 80,
  },
  {
    tag: 'studio-local-optimized',
    maxPreviewTriangles: 500_000,
    maxHeroTriangles: 2_000_000,
    minTextureDim: 4096,
    maxTextureDim: 8192,
    usesKtx2Basis: true,
    requiredLodLevels: 4,
    requiresCollisionProxy: true,
    requiresNavmeshProxy: true,
    minTexelsPerMeter: 512,
    minTopologyGrade: 90,
  },
  {
    tag: 'cloud-render-grade',
    maxPreviewTriangles: 1_000_000,
    maxHeroTriangles: 10_000_000,
    minTextureDim: 8192,
    maxTextureDim: 8192,
    usesKtx2Basis: true,
    requiredLodLevels: 4,
    requiresCollisionProxy: true,
    requiresNavmeshProxy: true,
    minTexelsPerMeter: 1024,
    minTopologyGrade: 95,
  },
]

/** VRAM de uma textura: KTX2/Basis = 0.5 B/texel (BC7), legado = 4 B/texel (RGBA8). */
export function assetTextureVramBytes(tier: GameAssetQualityTier, width: number, height: number): number {
  const entry = KERNEL_ASSET_QUALITY_TIER_CATALOG.find((candidate) => candidate.tag === tier)
  const pixels = width * height
  if (entry?.usesKtx2Basis) {
    return Math.floor(pixels / 2)
  }
  return pixels * 4
}

/** Manifesto de asset — o que o gerador/loader reporta para o gate julgar. */
export interface AssetQualityManifestInput {
  tier: GameAssetQualityTier
  previewTriangles: number
  heroTriangles: number
  textureWidth: number
  textureHeight: number
  lodLevelsPresent: number
  hasCollisionProxy: boolean
  hasNavmeshProxy: boolean
  texelsPerMeter: number
  /** Marcador não-zero de proveniência (hash). Não é usado em aritmética. */
  provenanceHash: number
  topology: AssetTopologyMetricsInput
}

/** Veredito determinístico de aceitação do asset — kernel `AssetQualityVerdict`. */
export interface AssetQualityVerdictMirror {
  /** `true` somente quando TODOS os gates passam. */
  ready: boolean
  tier: GameAssetQualityTier
  triangleBudgetOk: boolean
  textureDimOk: boolean
  textureVramOk: boolean
  lodManifestOk: boolean
  collisionProxyOk: boolean
  navmeshProxyOk: boolean
  texelDensityOk: boolean
  provenanceOk: boolean
  topologyOk: boolean
  topologyGrade: number
  minTopologyGrade: number
  previewTriangles: number
  heroTriangles: number
  maxPreviewTriangles: number
  maxHeroTriangles: number
  textureWidth: number
  textureHeight: number
  textureVramBytes: number
  maxTextureVramBytes: number
  lodLevelsPresent: number
  requiredLodLevels: number
  texelsPerMeter: number
  minTexelsPerMeter: number
  blockerCount: number
}

/** Veredito fail-closed — usado quando não há manifesto para julgar (kernel `fail_closed()`). */
export function failClosedAssetQualityVerdict(): AssetQualityVerdictMirror {
  return {
    ready: false,
    tier: 'ai-draft',
    triangleBudgetOk: false,
    textureDimOk: false,
    textureVramOk: false,
    lodManifestOk: false,
    collisionProxyOk: false,
    navmeshProxyOk: false,
    texelDensityOk: false,
    provenanceOk: false,
    topologyOk: false,
    topologyGrade: 0,
    minTopologyGrade: 0,
    previewTriangles: 0,
    heroTriangles: 0,
    maxPreviewTriangles: 0,
    maxHeroTriangles: 0,
    textureWidth: 0,
    textureHeight: 0,
    textureVramBytes: 0,
    maxTextureVramBytes: 0,
    lodLevelsPresent: 0,
    requiredLodLevels: 0,
    texelsPerMeter: 0,
    minTexelsPerMeter: 0,
    blockerCount: 9,
  }
}

/** Manifesto de referência — o mínimo viável que DEVE passar em cada tier. */
export function referenceAssetQualityManifest(tier: GameAssetQualityTier): AssetQualityManifestInput {
  const entry: KernelAssetQualityTierCatalog =
    KERNEL_ASSET_QUALITY_TIER_CATALOG.find((candidate) => candidate.tag === tier) ??
    KERNEL_ASSET_QUALITY_TIER_CATALOG[0]
  const preview = Math.floor(entry.maxPreviewTriangles / 2)
  const hero = Math.floor(entry.maxHeroTriangles / 4)
  return {
    tier,
    previewTriangles: preview,
    heroTriangles: hero,
    textureWidth: entry.minTextureDim,
    textureHeight: entry.minTextureDim,
    lodLevelsPresent: entry.requiredLodLevels,
    hasCollisionProxy: entry.requiresCollisionProxy,
    hasNavmeshProxy: entry.requiresNavmeshProxy,
    texelsPerMeter: entry.minTexelsPerMeter * 2,
    provenanceHash: 0x62775f617373,
    topology: perfectTopologyMetrics(preview, hero),
  }
}

/**
 * Avalia um manifesto contra o tier — veredito determinístico (kernel
 * `evaluate_asset_quality()`), com os 9 blockers idênticos.
 */
export function evaluateAssetQualityManifest(m: AssetQualityManifestInput): AssetQualityVerdictMirror {
  const entry: KernelAssetQualityTierCatalog =
    KERNEL_ASSET_QUALITY_TIER_CATALOG.find((candidate) => candidate.tag === m.tier) ??
    KERNEL_ASSET_QUALITY_TIER_CATALOG[0]
  const maxPreview = entry.maxPreviewTriangles
  const maxHero = entry.maxHeroTriangles
  const minDim = entry.minTextureDim
  const maxDim = entry.maxTextureDim
  const requiredLod = entry.requiredLodLevels
  const minTexels = entry.minTexelsPerMeter
  const minTopo = entry.minTopologyGrade

  const triangleBudgetOk =
    m.previewTriangles > 0 && m.heroTriangles > 0 && m.previewTriangles <= maxPreview && m.heroTriangles <= maxHero
  const textureDimOk =
    m.textureWidth >= minDim && m.textureHeight >= minDim && m.textureWidth <= maxDim && m.textureHeight <= maxDim
  const vram = assetTextureVramBytes(m.tier, m.textureWidth, m.textureHeight)
  const textureVramOk = vram <= ASSET_QUALITY_GATE_VRAM_HARD_CAP_BYTES
  const lodManifestOk = m.lodLevelsPresent >= requiredLod
  const collisionProxyOk = !entry.requiresCollisionProxy || m.hasCollisionProxy
  const navmeshProxyOk = !entry.requiresNavmeshProxy || m.hasNavmeshProxy
  const texelDensityOk = Number.isFinite(m.texelsPerMeter) && m.texelsPerMeter >= minTexels
  const provenanceOk = m.provenanceHash !== 0
  const topo: TopologyQualitySample = gradeAssetTopology(m.topology)
  const topologyOk = topo.allFinite && topo.grade >= minTopo

  const blockers = [
    !triangleBudgetOk,
    !textureDimOk,
    !textureVramOk,
    !lodManifestOk,
    !collisionProxyOk,
    !navmeshProxyOk,
    !texelDensityOk,
    !provenanceOk,
    !topologyOk,
  ]
  const blockerCount = blockers.filter(Boolean).length
  const ready = blockerCount === 0

  return {
    ready,
    tier: m.tier,
    triangleBudgetOk,
    textureDimOk,
    textureVramOk,
    lodManifestOk,
    collisionProxyOk,
    navmeshProxyOk,
    texelDensityOk,
    provenanceOk,
    topologyOk,
    topologyGrade: topo.grade,
    minTopologyGrade: minTopo,
    previewTriangles: m.previewTriangles,
    heroTriangles: m.heroTriangles,
    maxPreviewTriangles: maxPreview,
    maxHeroTriangles: maxHero,
    textureWidth: m.textureWidth,
    textureHeight: m.textureHeight,
    textureVramBytes: vram,
    maxTextureVramBytes: ASSET_QUALITY_GATE_VRAM_HARD_CAP_BYTES,
    lodLevelsPresent: m.lodLevelsPresent,
    requiredLodLevels: requiredLod,
    texelsPerMeter: m.texelsPerMeter,
    minTexelsPerMeter: minTexels,
    blockerCount,
  }
}

/** Conveniência: piso topológico mínimo de um tier (catálogo — fonte canônica). */
export function minTopologyGradeForTier(tier: GameAssetQualityTier): number {
  return (
    KERNEL_ASSET_QUALITY_TIER_CATALOG.find((candidate) => candidate.tag === tier)?.minTopologyGrade ??
    TOPOLOGY_GRADE_FLOOR
  )
}

/** Letter bw — acesso canônico ao budget de preview triangles de um tier (catálogo do kernel). */
export function maxPreviewTrianglesForTier(tier: GameAssetQualityTier): number {
  return KERNEL_ASSET_QUALITY_TIER_CATALOG.find((candidate) => candidate.tag === tier)?.maxPreviewTriangles ?? 0
}

/** Letter bw — acesso canônico ao teto de hero triangles de um tier (catálogo do kernel). */
export function maxHeroTrianglesForTier(tier: GameAssetQualityTier): number {
  return KERNEL_ASSET_QUALITY_TIER_CATALOG.find((candidate) => candidate.tag === tier)?.maxHeroTriangles ?? 0
}
