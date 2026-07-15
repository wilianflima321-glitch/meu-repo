/**
 * Letter bw/bz — Contextual PBR for Radiance material slots.
 * Scene/context-aware roughness/metal/wet — never bake lighting into albedo.
 * Letter bz: optional Delighting path strips clay baked lighting → albedo/N/R/M.
 */

import type { MeshQualityStageReceipt } from '@/lib/mesh-quality/types'
import {
  delightClayTextureToRadiancePbr,
  type ClayTextureBuffer,
  type RadiancePbrChannelMaps,
  DELIGHTING_PBR_WIRED,
} from '@/lib/mesh-quality/delighting-pbr'

export const CONTEXTUAL_PBR_WIRED = true as const

export type RadianceMaterialSlotId =
  | 'baseColor'
  | 'metallic'
  | 'roughness'
  | 'normal'
  | 'ao'
  | 'emissive'
  | 'wetness'
  | 'clearcoat'

export interface RadiancePbrSlotAssignment {
  slot: RadianceMaterialSlotId
  /** Scalar parameter (0–1) or sRGB linear triplet for baseColor — not lit bake. */
  value: number | [number, number, number]
  source: 'scene-context' | 'texture-refine' | 'default' | 'delighting'
}

export interface ScenePbrContext {
  /** Free-text or tags from MultiSurface / scene pack. */
  tags?: string[]
  promptHint?: string
  /** Optional ambient / weather cues. */
  weather?: 'clear' | 'rain' | 'fog' | 'snow'
  biome?: 'dark-fantasy' | 'sci-fi' | 'desert' | 'forest' | 'urban' | 'generic'
}

export interface ContextualPbrResult {
  slots: RadiancePbrSlotAssignment[]
  bakedLightingInAlbedo: false
  /** Letter bz — true when delighting ran and stripped bake from clay. */
  bakedLightingStripped: boolean
  textureRefineRequested: boolean
  /** Radiance-ready channel maps when delighting ran. */
  radianceChannels?: RadiancePbrChannelMaps
  delightingCommercialParityReady: false
  receipt: MeshQualityStageReceipt
}

const BIOME_PRESETS: Record<
  NonNullable<ScenePbrContext['biome']>,
  { metallic: number; roughness: number; base: [number, number, number]; wetness: number }
> = {
  'dark-fantasy': { metallic: 0.15, roughness: 0.55, base: [0.12, 0.1, 0.14], wetness: 0.35 },
  'sci-fi': { metallic: 0.72, roughness: 0.28, base: [0.35, 0.4, 0.45], wetness: 0.05 },
  desert: { metallic: 0.02, roughness: 0.82, base: [0.55, 0.42, 0.28], wetness: 0 },
  forest: { metallic: 0.04, roughness: 0.7, base: [0.18, 0.28, 0.14], wetness: 0.2 },
  urban: { metallic: 0.35, roughness: 0.45, base: [0.3, 0.3, 0.32], wetness: 0.15 },
  generic: { metallic: 0.1, roughness: 0.5, base: [0.4, 0.4, 0.4], wetness: 0 },
}

export function assignContextualPbr(input: {
  context: ScenePbrContext
  /** When true + BYOK path later, mark texture refine for CreativeFusion. */
  requestTextureRefine?: boolean
  /** Optional clay texture — delighting strips baked lighting into Radiance channels. */
  clayTexture?: ClayTextureBuffer
  /** Force delighting even without clayTexture (solid fallback albedo). */
  runDelighting?: boolean
}): ContextualPbrResult {
  const wantDelight =
    DELIGHTING_PBR_WIRED && (input.clayTexture !== undefined || input.runDelighting === true)

  if (wantDelight) {
    const delighted = delightClayTextureToRadiancePbr({
      clayTexture: input.clayTexture,
      context: input.context,
    })
    const biome = resolveBiome(input.context)
    let wetness = BIOME_PRESETS[biome].wetness
    if (input.context.weather === 'rain' || hasTag(input.context, 'rain', 'wet')) {
      wetness = Math.min(1, wetness + 0.45)
    }
    const slots: RadiancePbrSlotAssignment[] = [
      ...delighted.slots.map((s) => ({ ...s, source: 'delighting' as const })),
      { slot: 'wetness', value: wetness, source: 'scene-context' },
      { slot: 'clearcoat', value: wetness > 0.4 ? 0.35 : 0, source: 'scene-context' },
    ]
    const textureRefineRequested = input.requestTextureRefine === true
    return {
      slots,
      bakedLightingInAlbedo: false,
      bakedLightingStripped: true,
      textureRefineRequested,
      radianceChannels: delighted.channels,
      delightingCommercialParityReady: false,
      receipt: {
        stage: 'contextual-pbr',
        status: 'closed',
        evidence: [
          ...delighted.receipt.evidence,
          'contextual-pbr-delighting-bz',
          `biome:${biome}`,
          textureRefineRequested ? 'texture-refine-queued' : 'channels-emitted',
        ],
        metrics: {
          ...(delighted.receipt.metrics ?? {}),
          biome,
          textureRefineRequested,
          bakedLightingStripped: true,
          delightingCommercialParityReady: false,
          hasAlbedo: true,
          hasNormal: true,
          hasRoughness: true,
          hasMetalness: true,
        },
      },
    }
  }

  const biome = resolveBiome(input.context)
  const preset = BIOME_PRESETS[biome]
  let metallic = preset.metallic
  let roughness = preset.roughness
  let wetness = preset.wetness
  const base = [...preset.base] as [number, number, number]

  if (input.context.weather === 'rain' || hasTag(input.context, 'rain', 'wet')) {
    wetness = Math.min(1, wetness + 0.45)
    roughness = Math.max(0.08, roughness - 0.25)
  }
  if (input.context.weather === 'fog' || hasTag(input.context, 'fog')) {
    roughness = Math.min(1, roughness + 0.1)
  }
  if (hasTag(input.context, 'dark-fantasy', 'gothic')) {
    base[0] *= 0.85
    base[1] *= 0.85
    base[2] *= 0.95
    wetness = Math.max(wetness, 0.3)
  }

  const slots: RadiancePbrSlotAssignment[] = [
    { slot: 'baseColor', value: base, source: 'scene-context' },
    { slot: 'metallic', value: metallic, source: 'scene-context' },
    { slot: 'roughness', value: roughness, source: 'scene-context' },
    { slot: 'wetness', value: wetness, source: 'scene-context' },
    { slot: 'ao', value: 1, source: 'default' },
    { slot: 'emissive', value: [0, 0, 0], source: 'default' },
    { slot: 'clearcoat', value: wetness > 0.4 ? 0.35 : 0, source: 'scene-context' },
  ]

  const textureRefineRequested = input.requestTextureRefine === true

  return {
    slots,
    bakedLightingInAlbedo: false,
    bakedLightingStripped: false,
    textureRefineRequested,
    delightingCommercialParityReady: false,
    receipt: {
      stage: 'contextual-pbr',
      status: 'closed',
      evidence: [
        'radiance-material-slots',
        'no-baked-lighting-in-albedo',
        `biome:${biome}`,
        textureRefineRequested ? 'texture-refine-queued' : 'params-only',
      ],
      metrics: { metallic, roughness, wetness, biome, textureRefineRequested },
    },
  }
}

function resolveBiome(ctx: ScenePbrContext): NonNullable<ScenePbrContext['biome']> {
  if (ctx.biome) return ctx.biome
  const blob = `${(ctx.tags ?? []).join(' ')} ${ctx.promptHint ?? ''}`.toLowerCase()
  if (/dark\s*fantasy|gothic|grimdark/.test(blob)) return 'dark-fantasy'
  if (/sci-?fi|cyber|neon/.test(blob)) return 'sci-fi'
  if (/desert|sand|arid/.test(blob)) return 'desert'
  if (/forest|jungle|wood/.test(blob)) return 'forest'
  if (/urban|city|street/.test(blob)) return 'urban'
  return 'generic'
}

function hasTag(ctx: ScenePbrContext, ...needles: string[]): boolean {
  const blob = `${(ctx.tags ?? []).join(' ')} ${ctx.promptHint ?? ''}`.toLowerCase()
  return needles.some((n) => blob.includes(n.toLowerCase()))
}
