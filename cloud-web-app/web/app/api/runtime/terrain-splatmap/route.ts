import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import {
  applyAndPersistSplatStrokes,
  createFlatSplatmap,
  loadSplatmapFromWorkspace,
  saveSplatmapToWorkspace,
  splatmapHonestyReport,
  type SplatmapDocument,
  type SplatmapMeta,
  type TerrainSplatStroke,
} from '@/lib/production/terrain-splatmap-authority'
import {
  decodeWeightsBase64,
  encodeWeightsBase64,
} from '@/lib/production/terrain-splatmap-math'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/runtime/terrain-splatmap/route')

export const dynamic = 'force-dynamic'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function packWeights(doc: SplatmapDocument, includeWeights: boolean) {
  if (!includeWeights) return {}
  return {
    weightsBase64: encodeWeightsBase64(doc.weights),
    weightsEncoding: 'float32-le-base64' as const,
  }
}

/** GET ?projectId=&terrainId=&includeWeights=1 — load persisted splatmap meta + honesty */
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

  const doc = await loadSplatmapFromWorkspace({
    userId: user.userId,
    projectId,
    terrainId,
  })
  const honesty = splatmapHonestyReport(doc)

  const includeWeights = req.nextUrl.searchParams.get('includeWeights') === '1'
  let weightsBase64: string | undefined
  if (includeWeights && doc) {
    weightsBase64 = encodeWeightsBase64(doc.weights)
  }

  return NextResponse.json({
    mock: false,
    focus: '2B',
    onda: includeWeights ? 'A.1' : undefined,
    letter: 'be',
    terrainId,
    meta: doc?.meta ?? null,
    sampleCount: doc?.weights.length ?? 0,
    honesty,
    ...(includeWeights
      ? {
          weightsBase64: weightsBase64 ?? null,
          weightsEncoding: 'float32-le-base64',
        }
      : {}),
  })
}

/**
 * POST — create, paint + persist, or full replace.
 * Body: { projectId, terrainId?, strokes?, create?, resolution?, replace?, meta?, weightsBase64?, includeWeights?, layers? }
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
  const strokes = Array.isArray(body.strokes) ? (body.strokes as TerrainSplatStroke[]) : []
  const resolution = typeof body.resolution === 'number' ? body.resolution : undefined
  const includeWeights = body.includeWeights === true

  try {
    if (body.replace === true && typeof body.weightsBase64 === 'string') {
      const metaIn = body.meta as SplatmapMeta | undefined
      const res =
        metaIn?.resolution ??
        resolution ??
        (typeof body.resolution === 'number' ? body.resolution : 129)
      const layerCount = metaIn?.layerCount ?? metaIn?.layers?.length ?? 3
      const weights = decodeWeightsBase64(body.weightsBase64, res * res * layerCount)
      const doc: SplatmapDocument = {
        meta: {
          resolution: res,
          layerCount,
          layers: metaIn?.layers ?? createFlatSplatmap({ resolution: res }).meta.layers,
          version: 1,
          updatedAt: new Date().toISOString(),
          strokeCount: typeof metaIn?.strokeCount === 'number' ? metaIn.strokeCount : 0,
        },
        weights,
      }
      await saveSplatmapToWorkspace({
        userId: user.userId,
        projectId,
        terrainId,
        document: doc,
      })
      return NextResponse.json({
        mock: false,
        focus: '2B',
        onda: 'A.1',
        letter: 'be',
        terrainId,
        meta: doc.meta,
        honesty: splatmapHonestyReport(doc),
        ...packWeights(doc, includeWeights),
      })
    }

    if (strokes.length === 0 && body.create === true) {
      const layers = Array.isArray(body.layers)
        ? (body.layers as SplatmapMeta['layers'])
        : undefined
      const doc = createFlatSplatmap({ resolution, layers })
      await saveSplatmapToWorkspace({
        userId: user.userId,
        projectId,
        terrainId,
        document: doc,
      })
      return NextResponse.json({
        mock: false,
        focus: '2B',
        letter: 'be',
        terrainId,
        meta: doc.meta,
        honesty: splatmapHonestyReport(doc),
        ...packWeights(doc, includeWeights),
      })
    }

    const layers = Array.isArray(body.layers)
      ? (body.layers as SplatmapMeta['layers'])
      : undefined

    const doc = await applyAndPersistSplatStrokes({
      userId: user.userId,
      projectId,
      terrainId,
      strokes,
      resolution,
      layers,
      createIfMissing: body.create !== false,
    })

    log.info('terrain_splat_strokes_persisted', {
      terrainId,
      strokes: strokes.length,
      strokeCount: doc.meta.strokeCount,
    })

    return NextResponse.json({
      mock: false,
      focus: '2B',
      onda: 'A.1',
      letter: 'be',
      terrainId,
      meta: doc.meta,
      honesty: splatmapHonestyReport(doc),
      ...packWeights(doc, includeWeights),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'SPLATMAP_FAILED'
    log.error('terrain_splatmap_failed', err instanceof Error ? err : new Error(message))
    return NextResponse.json({ error: message, mock: false }, { status: 500 })
  }
}
