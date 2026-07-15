/**
 * Onda A.1 deepen — LandscapeEditor ↔ durable heightfield authority client bridge.
 * Stroke mapping: landscape-heightfield-stroke.ts (pure). Fetch/persist lives here.
 */

import { getAuthHeaders } from '@/lib/ai/change-feedback-client'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  applyBrushStroke,
  createFlatHeightfield,
  decodeHeightsBase64,
  encodeHeightsBase64,
  heightfieldHonestyReport,
  type HeightfieldDocument,
  type HeightfieldMeta,
  type TerrainBrushStroke,
} from '@/lib/production/terrain-heightfield-math'
import {
  landscapeBrushToTerrainStroke,
  worldPointToHeightfieldUv,
} from '@/lib/production/landscape-heightfield-stroke'

export {
  landscapeBrushToTerrainStroke,
  worldPointToHeightfieldUv,
  type LandscapeBrushSettingsLike,
  type LandscapeTerrainExtents,
} from '@/lib/production/landscape-heightfield-stroke'

const log = createComponentLogger('landscape-heightfield-bridge')

export const TERRAIN_HEIGHTFIELD_CHANGED_EVENT = 'aethel:terrain-heightfield-changed'

export function notifyTerrainHeightfieldChanged(detail?: {
  terrainId?: string
  strokeCount?: number
  source?: string
}): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(TERRAIN_HEIGHTFIELD_CHANGED_EVENT, {
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

export async function fetchLandscapeHeightfield(input: {
  projectId: string
  terrainId?: string
}): Promise<HeightfieldDocument | null> {
  const terrainId = input.terrainId ?? 'default'
  const qs = new URLSearchParams({
    projectId: input.projectId,
    terrainId,
    includeHeights: '1',
  })
  const res = await fetch(`/api/runtime/terrain-heightfield?${qs.toString()}`, {
    headers: authHeaders(input.projectId),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`heightfield load ${res.status}`)
  const data = (await res.json()) as {
    mock?: boolean
    meta?: HeightfieldMeta | null
    heightsBase64?: string | null
  }
  if (data.mock === true) throw new Error('Heightfield API returned mock — forbidden')
  if (!data.meta) return null
  if (!data.heightsBase64) {
    throw new Error('Heightfield API omitted heights — Landscape deepen requires includeHeights')
  }
  const heights = decodeHeightsBase64(data.heightsBase64, data.meta.resolution * data.meta.resolution)
  return { meta: data.meta, heights }
}

export async function ensureLandscapeHeightfield(input: {
  projectId: string
  terrainId?: string
  resolution?: number
  widthMeters?: number
  depthMeters?: number
  maxHeight?: number
}): Promise<HeightfieldDocument> {
  const existing = await fetchLandscapeHeightfield(input)
  if (existing) return existing
  const terrainId = input.terrainId ?? 'default'
  const doc = createFlatHeightfield({
    resolution: input.resolution,
    widthMeters: input.widthMeters,
    depthMeters: input.depthMeters,
    maxHeight: input.maxHeight,
  })
  const res = await fetch('/api/runtime/terrain-heightfield', {
    method: 'POST',
    headers: authHeaders(input.projectId),
    body: JSON.stringify({
      projectId: input.projectId,
      terrainId,
      create: true,
      resolution: doc.meta.resolution,
      replace: true,
      meta: doc.meta,
      heightsBase64: encodeHeightsBase64(doc.heights),
    }),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error || `heightfield create ${res.status}`)
  }
  const created = (await res.json()) as { mock?: boolean }
  if (created.mock === true) throw new Error('Create returned mock — forbidden')
  notifyTerrainHeightfieldChanged({ terrainId, strokeCount: 0, source: 'landscape-ensure' })
  return doc
}

export async function persistLandscapeStroke(input: {
  projectId: string
  terrainId?: string
  stroke: TerrainBrushStroke
  localDoc?: HeightfieldDocument
}): Promise<HeightfieldDocument> {
  const terrainId = input.terrainId ?? 'default'
  let optimistic = input.localDoc
  if (optimistic) {
    optimistic = {
      meta: { ...optimistic.meta },
      heights: new Float32Array(optimistic.heights),
    }
    applyBrushStroke(optimistic, input.stroke)
  }

  const res = await fetch('/api/runtime/terrain-heightfield', {
    method: 'POST',
    headers: authHeaders(input.projectId),
    body: JSON.stringify({
      projectId: input.projectId,
      terrainId,
      strokes: [input.stroke],
      includeHeights: true,
    }),
  })
  const data = (await res.json().catch(() => ({}))) as {
    mock?: boolean
    meta?: HeightfieldMeta
    heightsBase64?: string | null
    error?: string
    message?: string
  }
  if (!res.ok) {
    throw new Error(data.message || data.error || `stroke ${res.status}`)
  }
  if (data.mock === true) throw new Error('Persist returned mock — forbidden')

  let doc: HeightfieldDocument
  if (data.meta && data.heightsBase64) {
    doc = {
      meta: data.meta,
      heights: decodeHeightsBase64(data.heightsBase64, data.meta.resolution * data.meta.resolution),
    }
  } else if (optimistic) {
    doc = optimistic
    if (data.meta) doc.meta = data.meta
  } else {
    const reloaded = await fetchLandscapeHeightfield({ projectId: input.projectId, terrainId })
    if (!reloaded) throw new Error('Stroke persisted but heightfield missing on reload')
    doc = reloaded
  }

  notifyTerrainHeightfieldChanged({
    terrainId,
    strokeCount: doc.meta.strokeCount,
    source: 'landscape-brush',
  })
  log.info('landscape_stroke_persisted', { terrainId, strokeCount: doc.meta.strokeCount })
  return doc
}

export async function replaceLandscapeHeightfield(input: {
  projectId: string
  terrainId?: string
  document: HeightfieldDocument
}): Promise<HeightfieldDocument> {
  const terrainId = input.terrainId ?? 'default'
  const doc = input.document
  const res = await fetch('/api/runtime/terrain-heightfield', {
    method: 'POST',
    headers: authHeaders(input.projectId),
    body: JSON.stringify({
      projectId: input.projectId,
      terrainId,
      replace: true,
      meta: doc.meta,
      heightsBase64: encodeHeightsBase64(doc.heights),
      includeHeights: true,
    }),
  })
  const data = (await res.json().catch(() => ({}))) as {
    mock?: boolean
    meta?: HeightfieldMeta
    heightsBase64?: string | null
    error?: string
    message?: string
  }
  if (!res.ok) {
    throw new Error(data.message || data.error || `replace ${res.status}`)
  }
  if (data.mock === true) throw new Error('Replace returned mock — forbidden')

  const next: HeightfieldDocument =
    data.meta && data.heightsBase64
      ? {
          meta: data.meta,
          heights: decodeHeightsBase64(data.heightsBase64, data.meta.resolution * data.meta.resolution),
        }
      : doc

  notifyTerrainHeightfieldChanged({
    terrainId,
    strokeCount: next.meta.strokeCount,
    source: 'landscape-replace',
  })
  return next
}

export function landscapeAuthorityStatus(doc: HeightfieldDocument | null): {
  honesty: ReturnType<typeof heightfieldHonestyReport>
  label: string
} {
  const honesty = heightfieldHonestyReport(doc)
  return {
    honesty,
    label:
      honesty.status === 'live'
        ? `Disk authority · ${honesty.strokeCount} strokes`
        : honesty.status === 'empty'
          ? 'Disk substrate (flat) · awaiting strokes'
          : 'No durable heightfield',
  }
}

