/**
 * Landscape foliage — disk authority under .aethel/terrain/{id}/foliage.json.
 * Pure math lives in terrain-foliage-math (client-safe).
 * Zero-MVP: durable instance list — no fake forest as shipped surface.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { createComponentLogger } from '@/lib/observability/logger'
import { resolveScopedWorkspacePath } from '@/lib/server/workspace-scope'
import {
  applyFoliageStroke,
  createEmptyFoliage,
  foliageHonestyReport,
  type FoliageDocument,
  type FoliageDocumentMeta,
  type FoliageHeightSample,
  type TerrainFoliageStroke,
} from '@/lib/production/terrain-foliage-math'
import { loadHeightfieldFromWorkspace } from '@/lib/production/terrain-heightfield-authority'

export {
  applyFoliageStroke,
  createEmptyFoliage,
  foliageHonestyReport,
  defaultFoliageTypes,
  encodeFoliageInstancesJson,
  decodeFoliageInstancesJson,
} from '@/lib/production/terrain-foliage-math'
export type {
  FoliageDocument,
  FoliageDocumentMeta,
  FoliageInstanceRecord,
  FoliageTypeMeta,
  TerrainFoliageStroke,
} from '@/lib/production/terrain-foliage-math'

const log = createComponentLogger('terrain-foliage-authority')

const TERRAIN_DIR = '.aethel/terrain'
const META_FILE = 'foliage.json'

function terrainDir(userId: string, projectId: string, terrainId: string): { absDir: string; root: string } {
  const { root } = resolveScopedWorkspacePath({
    userId,
    projectId,
    requestedPath: '/',
  })
  const absDir = path.join(root, TERRAIN_DIR, terrainId)
  return { absDir, root }
}

export async function saveFoliageToWorkspace(input: {
  userId: string
  projectId: string
  terrainId: string
  document: FoliageDocument
}): Promise<{ metaPath: string; bytes: number }> {
  const { absDir } = terrainDir(input.userId, input.projectId, input.terrainId)
  await fs.mkdir(absDir, { recursive: true })
  const metaPath = path.join(absDir, META_FILE)
  const payload = {
    meta: input.document.meta,
    instances: input.document.instances,
  }
  const raw = JSON.stringify(payload, null, 2)
  await fs.writeFile(metaPath, raw, 'utf8')
  log.info('foliage_saved', {
    terrainId: input.terrainId,
    strokes: input.document.meta.strokeCount,
    instances: input.document.instances.length,
  })
  return { metaPath, bytes: Buffer.byteLength(raw, 'utf8') }
}

export async function loadFoliageFromWorkspace(input: {
  userId: string
  projectId: string
  terrainId: string
}): Promise<FoliageDocument | null> {
  const { absDir } = terrainDir(input.userId, input.projectId, input.terrainId)
  const metaPath = path.join(absDir, META_FILE)
  try {
    const raw = await fs.readFile(metaPath, 'utf8')
    const parsed = JSON.parse(raw) as {
      meta?: FoliageDocumentMeta
      instances?: FoliageDocument['instances']
    }
    if (!parsed.meta || !Array.isArray(parsed.instances)) {
      throw new Error('FOLIAGE_CORRUPT')
    }
    return {
      meta: {
        version: 1,
        updatedAt: parsed.meta.updatedAt ?? new Date().toISOString(),
        strokeCount: typeof parsed.meta.strokeCount === 'number' ? parsed.meta.strokeCount : 0,
        types: Array.isArray(parsed.meta.types) ? parsed.meta.types : createEmptyFoliage().meta.types,
      },
      instances: parsed.instances,
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') return null
    throw err
  }
}

async function heightSampleForTerrain(input: {
  userId: string
  projectId: string
  terrainId: string
}): Promise<FoliageHeightSample | undefined> {
  try {
    const hf = await loadHeightfieldFromWorkspace(input)
    if (!hf) return undefined
    return {
      resolution: hf.meta.resolution,
      widthMeters: hf.meta.widthMeters,
      depthMeters: hf.meta.depthMeters,
      maxHeight: hf.meta.maxHeight,
      heights: hf.heights,
    }
  } catch {
    return undefined
  }
}

/**
 * Ensure foliage exists, apply placement strokes, persist.
 */
export async function applyAndPersistFoliageStrokes(input: {
  userId: string
  projectId: string
  terrainId: string
  strokes: TerrainFoliageStroke[]
  createIfMissing?: boolean
  types?: FoliageDocumentMeta['types']
}): Promise<FoliageDocument> {
  let doc = await loadFoliageFromWorkspace(input)
  if (!doc) {
    if (input.createIfMissing === false) {
      throw new Error('FOLIAGE_NOT_FOUND')
    }
    doc = createEmptyFoliage({ types: input.types })
  }
  const heightSample = await heightSampleForTerrain(input)
  for (const stroke of input.strokes) {
    applyFoliageStroke(doc, stroke, heightSample)
  }
  await saveFoliageToWorkspace({
    userId: input.userId,
    projectId: input.projectId,
    terrainId: input.terrainId,
    document: doc,
  })
  return doc
}
