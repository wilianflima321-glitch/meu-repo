/**
 * Landscape paint — splatmap (weight-map) disk authority.
 * Pure math lives in terrain-splatmap-math (client-safe).
 * Zero-MVP: durable layer weights under .aethel/terrain/{id}/ — no mock splat as shipped.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { createComponentLogger } from '@/lib/observability/logger'
import { resolveScopedWorkspacePath } from '@/lib/server/workspace-scope'
import {
  applySplatStroke,
  createFlatSplatmap,
  splatmapHonestyReport,
  type SplatmapDocument,
  type SplatmapMeta,
  type TerrainSplatStroke,
} from '@/lib/production/terrain-splatmap-math'

export {
  applySplatStroke,
  createFlatSplatmap,
  splatmapHonestyReport,
  encodeWeightsBase64,
  decodeWeightsBase64,
} from '@/lib/production/terrain-splatmap-math'
export type {
  SplatmapDocument,
  SplatmapMeta,
  SplatLayerMeta,
  TerrainSplatStroke,
} from '@/lib/production/terrain-splatmap-math'

const log = createComponentLogger('terrain-splatmap-authority')

const TERRAIN_DIR = '.aethel/terrain'
const META_FILE = 'splatmap.json'
const BIN_FILE = 'splatmap.f32'

function terrainDir(userId: string, projectId: string, terrainId: string): { absDir: string; root: string } {
  const { root } = resolveScopedWorkspacePath({
    userId,
    projectId,
    requestedPath: '/',
  })
  const absDir = path.join(root, TERRAIN_DIR, terrainId)
  return { absDir, root }
}

export async function saveSplatmapToWorkspace(input: {
  userId: string
  projectId: string
  terrainId: string
  document: SplatmapDocument
}): Promise<{ metaPath: string; binPath: string; bytes: number }> {
  const { absDir } = terrainDir(input.userId, input.projectId, input.terrainId)
  await fs.mkdir(absDir, { recursive: true })
  const metaPath = path.join(absDir, META_FILE)
  const binPath = path.join(absDir, BIN_FILE)
  const expected = input.document.meta.resolution * input.document.meta.resolution * input.document.meta.layerCount
  if (input.document.weights.length !== expected) {
    throw new Error('SPLATMAP_SIZE_MISMATCH: expected ' + expected + ' samples')
  }
  await fs.writeFile(metaPath, JSON.stringify(input.document.meta, null, 2), 'utf8')
  await fs.writeFile(binPath, Buffer.from(input.document.weights.buffer, input.document.weights.byteOffset, input.document.weights.byteLength))
  log.info('splatmap_saved', {
    terrainId: input.terrainId,
    resolution: input.document.meta.resolution,
    layers: input.document.meta.layerCount,
    strokes: input.document.meta.strokeCount,
  })
  return { metaPath, binPath, bytes: input.document.weights.byteLength }
}

export async function loadSplatmapFromWorkspace(input: {
  userId: string
  projectId: string
  terrainId: string
}): Promise<SplatmapDocument | null> {
  const { absDir } = terrainDir(input.userId, input.projectId, input.terrainId)
  const metaPath = path.join(absDir, META_FILE)
  const binPath = path.join(absDir, BIN_FILE)
  try {
    const metaRaw = await fs.readFile(metaPath, 'utf8')
    const meta = JSON.parse(metaRaw) as SplatmapMeta
    const buf = await fs.readFile(binPath)
    const weights = new Float32Array(
      buf.buffer,
      buf.byteOffset,
      Math.floor(buf.byteLength / 4),
    )
    const expected = meta.resolution * meta.resolution * meta.layerCount
    if (weights.length !== expected) {
      throw new Error('SPLATMAP_CORRUPT')
    }
    return { meta, weights }
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') return null
    throw err
  }
}

/**
 * Ensure splatmap exists, apply paint strokes, persist.
 */
export async function applyAndPersistSplatStrokes(input: {
  userId: string
  projectId: string
  terrainId: string
  strokes: TerrainSplatStroke[]
  createIfMissing?: boolean
  resolution?: number
  layers?: SplatmapMeta['layers']
}): Promise<SplatmapDocument> {
  let doc = await loadSplatmapFromWorkspace(input)
  if (!doc) {
    if (input.createIfMissing === false) {
      throw new Error('SPLATMAP_NOT_FOUND')
    }
    doc = createFlatSplatmap({ resolution: input.resolution, layers: input.layers })
  }
  for (const stroke of input.strokes) {
    applySplatStroke(doc, stroke)
  }
  await saveSplatmapToWorkspace({
    userId: input.userId,
    projectId: input.projectId,
    terrainId: input.terrainId,
    document: doc,
  })
  return doc
}
