/**
 * Focus 2B — Terrain heightfield authority (disk I/O).
 * Pure math lives in terrain-heightfield-math (client-safe).
 * Real Float32 heightfield + brush strokes that persist to workspace disk.
 * Zero-MVP: no mock heightmap-as-shipped; edits are durable bytes.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { createComponentLogger } from '@/lib/observability/logger'
import { resolveScopedWorkspacePath } from '@/lib/server/workspace-scope'
import {
  applyBrushStroke,
  createFlatHeightfield,
  heightfieldHonestyReport,
  type HeightfieldDocument,
  type HeightfieldMeta,
  type TerrainBrushStroke,
} from '@/lib/production/terrain-heightfield-math'

export {
  applyBrushStroke,
  createFlatHeightfield,
  heightfieldHonestyReport,
  encodeHeightsBase64,
  decodeHeightsBase64,
} from '@/lib/production/terrain-heightfield-math'
export type { HeightfieldDocument, HeightfieldMeta, TerrainBrushStroke } from '@/lib/production/terrain-heightfield-math'

const log = createComponentLogger('terrain-heightfield-authority')

const TERRAIN_DIR = '.aethel/terrain'
const META_FILE = 'heightfield.json'
const BIN_FILE = 'heightfield.f32'

function terrainDir(userId: string, projectId: string, terrainId: string): { absDir: string; root: string } {
  const { root } = resolveScopedWorkspacePath({
    userId,
    projectId,
    requestedPath: '/',
  })
  const absDir = path.join(root, TERRAIN_DIR, terrainId)
  return { absDir, root }
}

export async function saveHeightfieldToWorkspace(input: {
  userId: string
  projectId: string
  terrainId: string
  document: HeightfieldDocument
}): Promise<{ metaPath: string; binPath: string; bytes: number }> {
  const { absDir } = terrainDir(input.userId, input.projectId, input.terrainId)
  await fs.mkdir(absDir, { recursive: true })
  const metaPath = path.join(absDir, META_FILE)
  const binPath = path.join(absDir, BIN_FILE)
  const expected = input.document.meta.resolution * input.document.meta.resolution
  if (input.document.heights.length !== expected) {
    throw new Error('HEIGHTFIELD_SIZE_MISMATCH: expected ' + expected + ' samples')
  }
  await fs.writeFile(metaPath, JSON.stringify(input.document.meta, null, 2), 'utf8')
  await fs.writeFile(binPath, Buffer.from(input.document.heights.buffer))
  log.info('heightfield_saved', {
    terrainId: input.terrainId,
    resolution: input.document.meta.resolution,
    strokes: input.document.meta.strokeCount,
  })
  return { metaPath, binPath, bytes: input.document.heights.byteLength }
}

export async function loadHeightfieldFromWorkspace(input: {
  userId: string
  projectId: string
  terrainId: string
}): Promise<HeightfieldDocument | null> {
  const { absDir } = terrainDir(input.userId, input.projectId, input.terrainId)
  const metaPath = path.join(absDir, META_FILE)
  const binPath = path.join(absDir, BIN_FILE)
  try {
    const metaRaw = await fs.readFile(metaPath, 'utf8')
    const meta = JSON.parse(metaRaw) as HeightfieldMeta
    const buf = await fs.readFile(binPath)
    const heights = new Float32Array(
      buf.buffer,
      buf.byteOffset,
      Math.floor(buf.byteLength / 4),
    )
    if (heights.length !== meta.resolution * meta.resolution) {
      throw new Error('HEIGHTFIELD_CORRUPT')
    }
    return { meta, heights }
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') return null
    throw err
  }
}

/**
 * Ensure terrain exists, apply strokes, persist — Focus 2B acceptance path.
 */
export async function applyAndPersistTerrainStrokes(input: {
  userId: string
  projectId: string
  terrainId: string
  strokes: TerrainBrushStroke[]
  createIfMissing?: boolean
  resolution?: number
}): Promise<HeightfieldDocument> {
  let doc = await loadHeightfieldFromWorkspace(input)
  if (!doc) {
    if (input.createIfMissing === false) {
      throw new Error('TERRAIN_NOT_FOUND')
    }
    doc = createFlatHeightfield({ resolution: input.resolution })
  }
  for (const stroke of input.strokes) {
    applyBrushStroke(doc, stroke)
  }
  await saveHeightfieldToWorkspace({
    userId: input.userId,
    projectId: input.projectId,
    terrainId: input.terrainId,
    document: doc,
  })
  return doc
}
