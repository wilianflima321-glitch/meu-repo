import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import {
  applyAndPersistFoliageStrokes,
  createEmptyFoliage,
  loadFoliageFromWorkspace,
  saveFoliageToWorkspace,
  foliageHonestyReport,
  type FoliageDocument,
  type FoliageDocumentMeta,
  type TerrainFoliageStroke,
} from '@/lib/production/terrain-foliage-authority'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/runtime/terrain-foliage/route')

export const dynamic = 'force-dynamic'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function packInstances(doc: FoliageDocument, includeInstances: boolean) {
  if (!includeInstances) return {}
  return {
    instances: doc.instances,
  }
}

/** GET ?projectId=&terrainId=&includeInstances=1 — load persisted foliage meta + honesty */
export async function GET(req: NextRequest) {
  let user
  try {
    user = requireAuth(req)
  } catch {
    return unauthorized()
  }

  const projectId = req.nextUrl.searchParams.get('projectId')
  const terrainId = req.nextUrl.searchParams.get('terrainId') || 'default'
  if (!projectId) {
    return NextResponse.json({ error: 'MISSING_PROJECT_ID' }, { status: 400 })
  }

  const doc = await loadFoliageFromWorkspace({
    userId: user.userId,
    projectId,
    terrainId,
  })
  const honesty = foliageHonestyReport(doc)

  const includeInstances = req.nextUrl.searchParams.get('includeInstances') === '1'

  return NextResponse.json({
    mock: false,
    focus: '2B',
    onda: includeInstances ? 'A.1' : undefined,
    letter: 'bf',
    terrainId,
    meta: doc?.meta ?? null,
    instanceCount: doc?.instances.length ?? 0,
    honesty,
    ...(includeInstances
      ? {
          instances: doc?.instances ?? null,
        }
      : {}),
  })
}

/**
 * POST — create, place/erase + persist, or full replace.
 * Body: { projectId, terrainId?, strokes?, create?, replace?, meta?, instances?, includeInstances?, types? }
 */
export async function POST(req: NextRequest) {
  let user
  try {
    user = requireAuth(req)
  } catch {
    return unauthorized()
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || typeof body.projectId !== 'string') {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 })
  }

  const projectId = body.projectId
  const terrainId = typeof body.terrainId === 'string' ? body.terrainId : 'default'
  const strokes = Array.isArray(body.strokes) ? (body.strokes as TerrainFoliageStroke[]) : []
  const includeInstances = body.includeInstances === true

  try {
    if (body.replace === true && Array.isArray(body.instances)) {
      const metaIn = body.meta as FoliageDocumentMeta | undefined
      const empty = createEmptyFoliage({
        types: metaIn?.types,
      })
      const doc: FoliageDocument = {
        meta: {
          version: 1,
          updatedAt: new Date().toISOString(),
          strokeCount: typeof metaIn?.strokeCount === 'number' ? metaIn.strokeCount : 0,
          types: metaIn?.types ?? empty.meta.types,
        },
        instances: body.instances as FoliageDocument['instances'],
      }
      await saveFoliageToWorkspace({
        userId: user.userId,
        projectId,
        terrainId,
        document: doc,
      })
      return NextResponse.json({
        mock: false,
        focus: '2B',
        onda: 'A.1',
        letter: 'bf',
        terrainId,
        meta: doc.meta,
        honesty: foliageHonestyReport(doc),
        ...packInstances(doc, includeInstances),
      })
    }

    if (strokes.length === 0 && body.create === true) {
      const types = Array.isArray(body.types)
        ? (body.types as FoliageDocumentMeta['types'])
        : undefined
      const doc = createEmptyFoliage({ types })
      await saveFoliageToWorkspace({
        userId: user.userId,
        projectId,
        terrainId,
        document: doc,
      })
      return NextResponse.json({
        mock: false,
        focus: '2B',
        letter: 'bf',
        terrainId,
        meta: doc.meta,
        honesty: foliageHonestyReport(doc),
        ...packInstances(doc, includeInstances),
      })
    }

    const types = Array.isArray(body.types)
      ? (body.types as FoliageDocumentMeta['types'])
      : undefined

    const doc = await applyAndPersistFoliageStrokes({
      userId: user.userId,
      projectId,
      terrainId,
      strokes,
      types,
      createIfMissing: body.create !== false,
    })

    log.info('terrain_foliage_strokes_persisted', {
      terrainId,
      strokes: strokes.length,
      strokeCount: doc.meta.strokeCount,
      instances: doc.instances.length,
    })

    return NextResponse.json({
      mock: false,
      focus: '2B',
      onda: 'A.1',
      letter: 'bf',
      terrainId,
      meta: doc.meta,
      honesty: foliageHonestyReport(doc),
      ...packInstances(doc, includeInstances),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'FOLIAGE_FAILED'
    log.error('terrain_foliage_failed', err instanceof Error ? err : new Error(message))
    return NextResponse.json({ error: message, mock: false }, { status: 500 })
  }
}
