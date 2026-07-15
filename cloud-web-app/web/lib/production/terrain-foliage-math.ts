/**
 * Landscape foliage brush — pure placement math (no fs / Node).
 * Shared by server authority + LandscapeEditor client so strokes match disk.
 * Zero-MVP: durable instance list; empty-honest when none; no fake forests.
 */

export type FoliageCategory = 'tree' | 'bush' | 'grass' | 'flower' | 'rock'

export interface FoliageTypeMeta {
  id: string
  name: string
  category: FoliageCategory
  color: string
  minScale: number
  maxScale: number
}

export interface FoliageDocumentMeta {
  version: 1
  updatedAt: string
  strokeCount: number
  types: FoliageTypeMeta[]
}

export interface FoliageInstanceRecord {
  id: string
  typeId: string
  x: number
  y: number
  z: number
  rotY: number
  scale: number
}

export interface FoliageDocument {
  meta: FoliageDocumentMeta
  instances: FoliageInstanceRecord[]
}

export interface TerrainFoliageStroke {
  /** Normalized UV 0..1 */
  u: number
  v: number
  /** Brush radius in UV space (0..1) */
  radius: number
  /** Density / erase strength 0..1 */
  strength: number
  falloff?: number
  typeId: string
  operation: 'paint' | 'erase'
  widthMeters: number
  depthMeters: number
}

/** Optional heightfield sample for surface Y (world meters). */
export type FoliageHeightSample = {
  resolution: number
  widthMeters: number
  depthMeters: number
  maxHeight: number
  heights: Float32Array | number[]
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

/** Deterministic 0..1 hash — no Math.random in authority path. */
export function foliageHash01(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

export function defaultFoliageTypes(): FoliageTypeMeta[] {
  return [
    {
      id: 'tree-1',
      name: 'Pine',
      category: 'tree',
      color: 'rgb(34, 139, 34)',
      minScale: 0.85,
      maxScale: 1.25,
    },
    {
      id: 'bush-1',
      name: 'Bush',
      category: 'bush',
      color: 'rgb(46, 125, 50)',
      minScale: 0.7,
      maxScale: 1.1,
    },
    {
      id: 'grass-1',
      name: 'Grass clump',
      category: 'grass',
      color: 'rgb(76, 175, 80)',
      minScale: 0.8,
      maxScale: 1.2,
    },
  ]
}

export function createEmptyFoliage(input?: { types?: FoliageTypeMeta[] }): FoliageDocument {
  return {
    meta: {
      version: 1,
      updatedAt: new Date().toISOString(),
      strokeCount: 0,
      types: (input?.types?.length ? input.types : defaultFoliageTypes()).slice(0, 16),
    },
    instances: [],
  }
}

function sampleHeightWorldY(sample: FoliageHeightSample | undefined, worldX: number, worldZ: number): number {
  if (!sample || sample.resolution < 2) return 0
  const { resolution: res, widthMeters, depthMeters, maxHeight, heights } = sample
  const u = worldX / widthMeters + 0.5
  const v = worldZ / depthMeters + 0.5
  if (u < 0 || u > 1 || v < 0 || v > 1) return 0
  const fx = u * (res - 1)
  const fz = v * (res - 1)
  const x0 = Math.floor(fx)
  const z0 = Math.floor(fz)
  const x1 = Math.min(res - 1, x0 + 1)
  const z1 = Math.min(res - 1, z0 + 1)
  const tx = fx - x0
  const tz = fz - z0
  const h00 = heights[z0 * res + x0] ?? 0
  const h10 = heights[z0 * res + x1] ?? 0
  const h01 = heights[z1 * res + x0] ?? 0
  const h11 = heights[z1 * res + x1] ?? 0
  const h0 = h00 * (1 - tx) + h10 * tx
  const h1 = h01 * (1 - tx) + h11 * tx
  return (h0 * (1 - tz) + h1 * tz) * maxHeight
}

function uvToWorld(u: number, v: number, widthMeters: number, depthMeters: number): { x: number; z: number } {
  return {
    x: (clamp01(u) - 0.5) * widthMeters,
    z: (clamp01(v) - 0.5) * depthMeters,
  }
}

/**
 * Apply a foliage paint/erase stroke in-place.
 * Paint scatters deterministic instances under the brush disk; erase removes by radius.
 */
export function applyFoliageStroke(
  doc: FoliageDocument,
  stroke: TerrainFoliageStroke,
  heightSample?: FoliageHeightSample,
): FoliageDocument {
  const typeId = stroke.typeId || doc.meta.types[0]?.id || 'tree-1'
  if (!doc.meta.types.some((t) => t.id === typeId) && stroke.operation === 'paint') {
    // Keep type meta in sync when client paints an unknown id (use defaults)
    const fallback = defaultFoliageTypes().find((t) => t.id === typeId)
    if (fallback) doc.meta.types.push(fallback)
  }

  const typeMeta = doc.meta.types.find((t) => t.id === typeId) ?? defaultFoliageTypes()[0]!
  const center = uvToWorld(stroke.u, stroke.v, stroke.widthMeters, stroke.depthMeters)
  const radiusWorld = Math.max(0.5, stroke.radius * Math.max(stroke.widthMeters, stroke.depthMeters))
  const strength = clamp01(Math.abs(stroke.strength))

  if (stroke.operation === 'erase') {
    const r2 = radiusWorld * radiusWorld
    doc.instances = doc.instances.filter((inst) => {
      const dx = inst.x - center.x
      const dz = inst.z - center.z
      return dx * dx + dz * dz > r2
    })
  } else {
    // Density: ~strength * area / 4, capped for zero-MVP stroke batches
    const area = Math.PI * radiusWorld * radiusWorld
    const count = Math.max(1, Math.min(48, Math.floor(strength * (area / 12) + 0.5)))
    const seedBase = doc.meta.strokeCount * 9973 + Math.floor(stroke.u * 1e4) * 13 + Math.floor(stroke.v * 1e4) * 17

    for (let i = 0; i < count; i++) {
      const a = foliageHash01(seedBase + i * 3) * Math.PI * 2
      const r = Math.sqrt(foliageHash01(seedBase + i * 3 + 1)) * radiusWorld
      const x = center.x + Math.cos(a) * r
      const z = center.z + Math.sin(a) * r
      const y = sampleHeightWorldY(heightSample, x, z)
      const t = foliageHash01(seedBase + i * 3 + 2)
      const scale = typeMeta.minScale + t * (typeMeta.maxScale - typeMeta.minScale)
      const rotY = foliageHash01(seedBase + i * 7 + 5) * Math.PI * 2
      doc.instances.push({
        id: `f-${doc.meta.strokeCount}-${i}-${Math.floor(x * 100)}-${Math.floor(z * 100)}`,
        typeId,
        x,
        y,
        z,
        rotY,
        scale,
      })
    }
  }

  // Soft cap — keep document honest / finite for MVP
  const MAX_INSTANCES = 4096
  if (doc.instances.length > MAX_INSTANCES) {
    doc.instances = doc.instances.slice(doc.instances.length - MAX_INSTANCES)
  }

  doc.meta.strokeCount += 1
  doc.meta.updatedAt = new Date().toISOString()
  return doc
}

export function foliageHonestyReport(doc: FoliageDocument | null): {
  status: 'live' | 'empty' | 'missing'
  mock: false
  strokeCount?: number
  instanceCount?: number
  claim: string
} {
  if (!doc) {
    return {
      status: 'missing',
      mock: false,
      claim: 'No persisted foliage — foliage brush not live until first save',
    }
  }
  if (doc.meta.strokeCount === 0 && doc.instances.length === 0) {
    return {
      status: 'empty',
      mock: false,
      strokeCount: 0,
      instanceCount: 0,
      claim: 'Foliage substrate exists — empty-honest; awaiting placement strokes',
    }
  }
  return {
    status: 'live',
    mock: false,
    strokeCount: doc.meta.strokeCount,
    instanceCount: doc.instances.length,
    claim: 'Persisted foliage instances with paint history — Landscape foliage live',
  }
}

export function encodeFoliageInstancesJson(instances: FoliageInstanceRecord[]): string {
  return JSON.stringify(instances)
}

export function decodeFoliageInstancesJson(raw: string): FoliageInstanceRecord[] {
  const parsed = JSON.parse(raw) as unknown
  if (!Array.isArray(parsed)) throw new Error('FOLIAGE_DECODE_MISMATCH: expected array')
  return parsed.map((row, i) => {
    const r = row as Partial<FoliageInstanceRecord>
    if (typeof r.x !== 'number' || typeof r.z !== 'number' || typeof r.typeId !== 'string') {
      throw new Error(`FOLIAGE_DECODE_MISMATCH: bad instance at ${i}`)
    }
    return {
      id: typeof r.id === 'string' ? r.id : `f-decoded-${i}`,
      typeId: r.typeId,
      x: r.x,
      y: typeof r.y === 'number' ? r.y : 0,
      z: r.z,
      rotY: typeof r.rotY === 'number' ? r.rotY : 0,
      scale: typeof r.scale === 'number' ? r.scale : 1,
    }
  })
}
