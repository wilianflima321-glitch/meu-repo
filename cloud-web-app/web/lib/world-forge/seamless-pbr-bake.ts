/**
 * Letter cc — Seamless / tileable PBR bake helper for terrain splat layers (be).
 *
 * Mathematical edge-match wrap — Substance Designer class claim HELD.
 */

import type { WorldForgeStageReceipt } from '@/lib/world-forge/types'

export const SEAMLESS_PBR_BAKE_WIRED = true as const
/** Substance / commercial material graph parity — HELD. */
export const SUBSTANCE_CLASS_PARITY_HELD = true as const
export const SUBSTANCE_CLASS_PARITY_READY = false as const

export type SeamlessPbrChannel = 'albedo' | 'normal' | 'roughness' | 'ao' | 'height'

export interface SeamlessPbrBakeInput {
  /** Row-major RGBA or single-channel floats 0..1, length = width*height*channels */
  source: Float32Array
  width: number
  height: number
  channels: 1 | 3 | 4
  channelKind: SeamlessPbrChannel
  /** Blend band as fraction of min(width,height) — default 0.125 */
  blendFraction?: number
}

export interface SeamlessPbrBakeResult {
  seamless: Float32Array
  width: number
  height: number
  channels: 1 | 3 | 4
  channelKind: SeamlessPbrChannel
  substanceClassParityReady: false
  receipt: WorldForgeStageReceipt
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

function sample(
  src: Float32Array,
  width: number,
  height: number,
  channels: number,
  x: number,
  y: number,
  c: number,
): number {
  const xi = ((x % width) + width) % width
  const yi = ((y % height) + height) % height
  return src[(yi * width + xi) * channels + c] ?? 0
}

/**
 * Edge-match wrap: blend opposite edges so tiling has no hard seam.
 * Pure math — not a Substance graph.
 */
export function bakeSeamlessPbrTile(input: SeamlessPbrBakeInput): SeamlessPbrBakeResult {
  const { width, height, channels, channelKind } = input
  if (width < 4 || height < 4) {
    return {
      seamless: new Float32Array(input.source),
      width,
      height,
      channels,
      channelKind,
      substanceClassParityReady: false,
      receipt: {
        stage: 'seamless-pbr',
        status: 'rejected',
        evidence: ['too-small'],
        heldReason: 'Seamless bake needs ≥4×4',
      },
    }
  }
  if (input.source.length < width * height * channels) {
    throw new Error('SEAMLESS_PBR_SIZE_MISMATCH')
  }

  const blend = Math.max(
    2,
    Math.floor(Math.min(width, height) * (input.blendFraction ?? 0.125)),
  )
  const out = new Float32Array(width * height * channels)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < channels; c++) {
        let v = sample(input.source, width, height, channels, x, y, c)

        // Horizontal seam blend toward opposite edge
        if (x < blend) {
          const t = x / blend
          const opp = sample(input.source, width, height, channels, width - blend + x, y, c)
          v = v * t + opp * (1 - t)
        } else if (x >= width - blend) {
          const t = (width - 1 - x) / blend
          const opp = sample(input.source, width, height, channels, x - (width - blend), y, c)
          v = v * t + opp * (1 - t)
        }

        // Vertical seam blend
        if (y < blend) {
          const t = y / blend
          const opp = sample(input.source, width, height, channels, x, height - blend + y, c)
          v = v * 0.5 + (v * t + opp * (1 - t)) * 0.5
        } else if (y >= height - blend) {
          const t = (height - 1 - y) / blend
          const opp = sample(input.source, width, height, channels, x, y - (height - blend), c)
          v = v * 0.5 + (v * t + opp * (1 - t)) * 0.5
        }

        // Normal maps: re-normalize XY after blend (Z rebuild)
        if (channelKind === 'normal' && channels >= 3 && c === 2) {
          const i = (y * width + x) * channels
          const nx = out[i]! * 2 - 1
          const ny = out[i + 1]! * 2 - 1
          const len = Math.sqrt(nx * nx + ny * ny + 1e-8)
          out[i] = clamp01(nx / len * 0.5 + 0.5)
          out[i + 1] = clamp01(ny / len * 0.5 + 0.5)
          out[i + 2] = clamp01(1 / len * 0.5 + 0.5)
          continue
        }

        out[(y * width + x) * channels + c] = clamp01(v)
      }
    }
  }

  return {
    seamless: out,
    width,
    height,
    channels,
    channelKind,
    substanceClassParityReady: false,
    receipt: {
      stage: 'seamless-pbr',
      status: 'closed',
      evidence: ['edge-match-wrap', channelKind, `blend=${blend}`],
      heldReason: 'Substance-class material graph HELD — mathematical seamless bake only',
      metrics: { width, height, channels, blend },
    },
  }
}

/** Quick synthetic checker for tests / splat layer preview. */
export function buildSyntheticSplatAlbedo(width: number, height: number): Float32Array {
  const out = new Float32Array(width * height * 3)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3
      const check = ((x >> 3) ^ (y >> 3)) & 1
      out[i] = check ? 0.55 : 0.25
      out[i + 1] = check ? 0.4 : 0.35
      out[i + 2] = check ? 0.2 : 0.15
    }
  }
  return out
}
