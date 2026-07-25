/**
 * Pure foliage brush placement math — used by FoliagePainterRuntime paint strokes.
 * Falloff must affect placement probability; radius/density alone are not enough.
 */

export type BrushStrokeSample = {
  offsetX: number
  offsetZ: number
  accepted: boolean
}

/**
 * Sample one candidate instance offset inside the brush disk.
 * Higher falloff rejects more samples near the edge (UE-style soft brush).
 */
export function sampleBrushStrokeOffset(input: {
  radius: number
  falloff: number
  random?: () => number
}): BrushStrokeSample {
  const random = input.random ?? Math.random
  const radius = Math.max(0, input.radius)
  const falloff = Math.min(1, Math.max(0, input.falloff))
  const angle = random() * Math.PI * 2
  const dist = Math.sqrt(random()) * radius
  const edgeT = radius <= 0 ? 0 : dist / radius
  // Soft reject: at falloff=0 keep all; at falloff=1 keep ~center-weighted only.
  const keepChance = 1 - edgeT * falloff
  return {
    offsetX: Math.cos(angle) * dist,
    offsetZ: Math.sin(angle) * dist,
    accepted: random() <= keepChance,
  }
}

export function instancesPerStroke(density: number): number {
  return Math.max(0, Math.floor(Math.min(1, Math.max(0, density)) * 10))
}
