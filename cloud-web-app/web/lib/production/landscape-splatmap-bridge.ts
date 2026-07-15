/**
 * Landscape paint deepen — LandscapeEditor ↔ durable splatmap authority client bridge.
 * Stroke mapping: landscape-splatmap-stroke.ts (pure). Fetch/persist lives here.
 */

import { getAuthHeaders } from '@/lib/ai/change-feedback-client'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  applySplatStroke,
  createFlatSplatmap,
  decodeWeightsBase64,
  encodeWeightsBase64,
  splatmapHonestyReport,
  type SplatLayerMeta,
  type SplatmapDocument,
  type SplatmapMeta,
  type TerrainSplatStroke,
} from '@/lib/production/terrain-splatmap-math'
import { landscapeBrushToSplatStroke } from '@/lib/production/landscape-splatmap-stroke'

export {
  landscapeBrushToSplatStroke,
  type LandscapePaintBrushLike,
} from '@/lib/production/landscape-splatmap-stroke'

const log = createComponentLogger('landscape-splatmap-bridge')

export const TERRAIN_SPLATMAP_CHANGED_EVENT = 'aethel:terrain-splatmap-changed'

export function notifyTerrainSplatmapChanged(detail?: {
  terrainId?: string
  strokeCount?: number
  source?: string
}): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(TERRAIN_SPLATMAP_CHANGED_EVENT, {
      detail: { terrainId: 'default', source: 'landscape-editor', ...detail },
    }),
  )
}

function authHeaders(projectId: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    'x-project-id': projectId,
  }
}

export async function fetchLandscapeSplatmap(input: {
  projectId: string
  terrainId?: string
}): Promise<SplatmapDocument | null> {
  const terrainId = input.terrainId ?? 'default'
  const qs = new URLSearchParams({
    projectId: input.projectId,
    terrainId,
    includeWeights: '1',
  })
  const res = await fetch(`/api/runtime/terrain-splatmap?${qs.toString()}`, {
    headers: authHeaders(input.projectId),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`splatmap load ${res.status}`)
  const data = (await res.json()) as {
    mock?: boolean
    meta?: SplatmapMeta | null
    weightsBase64?: string | null
  }
  if (data.mock === true) throw new Error('Splatmap API returned mock — forbidden')
  if (!data.meta) return null
  if (!data.weightsBase64) {
    throw new Error('Splatmap API omitted weights — Landscape paint deepen requires includeWeights')
  }
  const expected = data.meta.resolution * data.meta.resolution * data.meta.layerCount
  const weights = decodeWeightsBase64(data.weightsBase64, expected)
  return { meta: data.meta, weights }
}

export async function ensureLandscapeSplatmap(input: {
  projectId: string
  terrainId?: string
  resolution?: number
  layers?: SplatLayerMeta[]
}): Promise<SplatmapDocument> {
  const existing = await fetchLandscapeSplatmap(input)
  if (existing) return existing
  const terrainId = input.terrainId ?? 'default'
  const doc = createFlatSplatmap({
    resolution: input.resolution,
    layers: input.layers,
  })
  const res = await fetch('/api/runtime/terrain-splatmap', {
    method: 'POST',
    headers: authHeaders(input.projectId),
    body: JSON.stringify({
      projectId: input.projectId,
      terrainId,
      create: true,
      resolution: doc.meta.resolution,
      replace: true,
      meta: doc.meta,
      weightsBase64: encodeWeightsBase64(doc.weights),
    }),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error || `splatmap create ${res.status}`)
  }
  const created = (await res.json()) as { mock?: boolean }
  if (created.mock === true) throw new Error('Create returned mock — forbidden')
  notifyTerrainSplatmapChanged({ terrainId, strokeCount: 0, source: 'landscape-splat-ensure' })
  return doc
}

export async function persistLandscapeSplatStroke(input: {
  projectId: string
  terrainId?: string
  stroke: TerrainSplatStroke
  localDoc?: SplatmapDocument
}): Promise<SplatmapDocument> {
  const terrainId = input.terrainId ?? 'default'
  let optimistic = input.localDoc
  if (optimistic) {
    optimistic = {
      meta: {
        ...optimistic.meta,
        layers: optimistic.meta.layers.map((l) => ({ ...l })),
      },
      weights: new Float32Array(optimistic.weights),
    }
    applySplatStroke(optimistic, input.stroke)
  }

  const res = await fetch('/api/runtime/terrain-splatmap', {
    method: 'POST',
    headers: authHeaders(input.projectId),
    body: JSON.stringify({
      projectId: input.projectId,
      terrainId,
      strokes: [input.stroke],
      includeWeights: true,
    }),
  })
  const data = (await res.json().catch(() => ({}))) as {
    mock?: boolean
    meta?: SplatmapMeta
    weightsBase64?: string | null
    error?: string
    message?: string
  }
  if (!res.ok) {
    throw new Error(data.message || data.error || `splat stroke ${res.status}`)
  }
  if (data.mock === true) throw new Error('Persist returned mock — forbidden')

  let doc: SplatmapDocument
  if (data.meta && data.weightsBase64) {
    const expected = data.meta.resolution * data.meta.resolution * data.meta.layerCount
    doc = {
      meta: data.meta,
      weights: decodeWeightsBase64(data.weightsBase64, expected),
    }
  } else if (optimistic) {
    doc = optimistic
    if (data.meta) doc.meta = data.meta
  } else {
    const reloaded = await fetchLandscapeSplatmap({ projectId: input.projectId, terrainId })
    if (!reloaded) throw new Error('Stroke persisted but splatmap missing on reload')
    doc = reloaded
  }

  notifyTerrainSplatmapChanged({
    terrainId,
    strokeCount: doc.meta.strokeCount,
    source: 'landscape-paint',
  })
  log.info('landscape_splat_stroke_persisted', { terrainId, strokeCount: doc.meta.strokeCount })
  return doc
}

export async function replaceLandscapeSplatmap(input: {
  projectId: string
  terrainId?: string
  document: SplatmapDocument
}): Promise<SplatmapDocument> {
  const terrainId = input.terrainId ?? 'default'
  const doc = input.document
  const res = await fetch('/api/runtime/terrain-splatmap', {
    method: 'POST',
    headers: authHeaders(input.projectId),
    body: JSON.stringify({
      projectId: input.projectId,
      terrainId,
      replace: true,
      meta: doc.meta,
      weightsBase64: encodeWeightsBase64(doc.weights),
      includeWeights: true,
    }),
  })
  const data = (await res.json().catch(() => ({}))) as {
    mock?: boolean
    meta?: SplatmapMeta
    weightsBase64?: string | null
    error?: string
    message?: string
  }
  if (!res.ok) {
    throw new Error(data.message || data.error || `splat replace ${res.status}`)
  }
  if (data.mock === true) throw new Error('Replace returned mock — forbidden')

  const next: SplatmapDocument =
    data.meta && data.weightsBase64
      ? {
          meta: data.meta,
          weights: decodeWeightsBase64(
            data.weightsBase64,
            data.meta.resolution * data.meta.resolution * data.meta.layerCount,
          ),
        }
      : doc

  notifyTerrainSplatmapChanged({
    terrainId,
    strokeCount: next.meta.strokeCount,
    source: 'landscape-splat-replace',
  })
  return next
}

export function landscapeSplatAuthorityStatus(doc: SplatmapDocument | null): {
  honesty: ReturnType<typeof splatmapHonestyReport>
  label: string
} {
  const honesty = splatmapHonestyReport(doc)
  return {
    honesty,
    label:
      honesty.status === 'live'
        ? `Splat authority · ${honesty.strokeCount} paint strokes`
        : honesty.status === 'empty'
          ? 'Splat substrate · awaiting paint'
          : 'No durable splatmap',
  }
}
