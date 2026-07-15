/**
 * Landscape foliage deepen — LandscapeEditor ↔ durable foliage authority client bridge.
 * Stroke mapping: landscape-foliage-stroke.ts (pure). Fetch/persist lives here.
 */

import { getAuthHeaders } from '@/lib/ai/change-feedback-client'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  applyFoliageStroke,
  createEmptyFoliage,
  foliageHonestyReport,
  type FoliageDocument,
  type FoliageDocumentMeta,
  type FoliageHeightSample,
  type FoliageTypeMeta,
  type TerrainFoliageStroke,
} from '@/lib/production/terrain-foliage-math'
import { landscapeBrushToFoliageStroke } from '@/lib/production/landscape-foliage-stroke'

export {
  landscapeBrushToFoliageStroke,
  type LandscapeFoliageBrushLike,
} from '@/lib/production/landscape-foliage-stroke'

const log = createComponentLogger('landscape-foliage-bridge')

export const TERRAIN_FOLIAGE_CHANGED_EVENT = 'aethel:terrain-foliage-changed'

export function notifyTerrainFoliageChanged(detail?: {
  terrainId?: string
  strokeCount?: number
  instanceCount?: number
  source?: string
}): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(TERRAIN_FOLIAGE_CHANGED_EVENT, {
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

export async function fetchLandscapeFoliage(input: {
  projectId: string
  terrainId?: string
}): Promise<FoliageDocument | null> {
  const terrainId = input.terrainId ?? 'default'
  const qs = new URLSearchParams({
    projectId: input.projectId,
    terrainId,
    includeInstances: '1',
  })
  const res = await fetch(`/api/runtime/terrain-foliage?${qs.toString()}`, {
    headers: authHeaders(input.projectId),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`foliage load ${res.status}`)
  const data = (await res.json()) as {
    mock?: boolean
    meta?: FoliageDocumentMeta | null
    instances?: FoliageDocument['instances'] | null
  }
  if (data.mock === true) throw new Error('Foliage API returned mock — forbidden')
  if (!data.meta) return null
  if (!Array.isArray(data.instances)) {
    throw new Error('Foliage API omitted instances — Landscape foliage deepen requires includeInstances')
  }
  return { meta: data.meta, instances: data.instances }
}

export async function ensureLandscapeFoliage(input: {
  projectId: string
  terrainId?: string
  types?: FoliageTypeMeta[]
}): Promise<FoliageDocument> {
  const existing = await fetchLandscapeFoliage(input)
  if (existing) return existing
  const terrainId = input.terrainId ?? 'default'
  const doc = createEmptyFoliage({ types: input.types })
  const res = await fetch('/api/runtime/terrain-foliage', {
    method: 'POST',
    headers: authHeaders(input.projectId),
    body: JSON.stringify({
      projectId: input.projectId,
      terrainId,
      create: true,
      replace: true,
      meta: doc.meta,
      instances: doc.instances,
    }),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error || `foliage create ${res.status}`)
  }
  const created = (await res.json()) as { mock?: boolean }
  if (created.mock === true) throw new Error('Create returned mock — forbidden')
  notifyTerrainFoliageChanged({ terrainId, strokeCount: 0, instanceCount: 0, source: 'landscape-foliage-ensure' })
  return doc
}

export async function persistLandscapeFoliageStroke(input: {
  projectId: string
  terrainId?: string
  stroke: TerrainFoliageStroke
  localDoc?: FoliageDocument
  heightSample?: FoliageHeightSample
}): Promise<FoliageDocument> {
  const terrainId = input.terrainId ?? 'default'
  let optimistic = input.localDoc
  if (optimistic) {
    optimistic = {
      meta: {
        ...optimistic.meta,
        types: optimistic.meta.types.map((t) => ({ ...t })),
      },
      instances: optimistic.instances.map((i) => ({ ...i })),
    }
    applyFoliageStroke(optimistic, input.stroke, input.heightSample)
  }

  const res = await fetch('/api/runtime/terrain-foliage', {
    method: 'POST',
    headers: authHeaders(input.projectId),
    body: JSON.stringify({
      projectId: input.projectId,
      terrainId,
      strokes: [input.stroke],
      includeInstances: true,
    }),
  })
  const data = (await res.json().catch(() => ({}))) as {
    mock?: boolean
    meta?: FoliageDocumentMeta
    instances?: FoliageDocument['instances'] | null
    error?: string
    message?: string
  }
  if (!res.ok) {
    throw new Error(data.message || data.error || `foliage stroke ${res.status}`)
  }
  if (data.mock === true) throw new Error('Persist returned mock — forbidden')

  let doc: FoliageDocument
  if (data.meta && Array.isArray(data.instances)) {
    doc = { meta: data.meta, instances: data.instances }
  } else if (optimistic) {
    doc = optimistic
    if (data.meta) doc.meta = data.meta
  } else {
    const reloaded = await fetchLandscapeFoliage({ projectId: input.projectId, terrainId })
    if (!reloaded) throw new Error('Stroke persisted but foliage missing on reload')
    doc = reloaded
  }

  notifyTerrainFoliageChanged({
    terrainId,
    strokeCount: doc.meta.strokeCount,
    instanceCount: doc.instances.length,
    source: 'landscape-foliage',
  })
  log.info('landscape_foliage_stroke_persisted', {
    terrainId,
    strokeCount: doc.meta.strokeCount,
    instances: doc.instances.length,
  })
  return doc
}

export function landscapeFoliageAuthorityStatus(doc: FoliageDocument | null): {
  honesty: ReturnType<typeof foliageHonestyReport>
  label: string
} {
  const honesty = foliageHonestyReport(doc)
  return {
    honesty,
    label:
      honesty.status === 'live'
        ? `Foliage authority · ${honesty.instanceCount ?? 0} instances`
        : honesty.status === 'empty'
          ? 'Foliage substrate · empty-honest'
          : 'No durable foliage',
  }
}
