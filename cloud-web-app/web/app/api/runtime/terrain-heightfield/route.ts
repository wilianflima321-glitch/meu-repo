import { NextRequest, NextResponse } from 'next/server'

import { requireAuth } from '@/lib/auth-server'

import {

  applyAndPersistTerrainStrokes,

  createFlatHeightfield,

  heightfieldHonestyReport,

  loadHeightfieldFromWorkspace,

  saveHeightfieldToWorkspace,

  type HeightfieldDocument,

  type HeightfieldMeta,

  type TerrainBrushStroke,

} from '@/lib/production/terrain-heightfield-authority'

import {

  decodeHeightsBase64,

  encodeHeightsBase64,

} from '@/lib/production/terrain-heightfield-math'

import { createComponentLogger } from '@/lib/observability/logger'



const log = createComponentLogger('api/runtime/terrain-heightfield/route')



export const dynamic = 'force-dynamic'



function unauthorized() {

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

}



function packHeights(doc: HeightfieldDocument, includeHeights: boolean) {

  if (!includeHeights) return {}

  return {

    heightsBase64: encodeHeightsBase64(doc.heights),

    heightsEncoding: 'float32-le-base64' as const,

  }

}



/** GET ?projectId=&terrainId= — load persisted heightfield meta + honesty */

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



  const doc = await loadHeightfieldFromWorkspace({

    userId: user.userId,

    projectId,

    terrainId,

  })

  const honesty = heightfieldHonestyReport(doc)



  const includeHeights = req.nextUrl.searchParams.get('includeHeights') === '1'

  let heightsBase64: string | undefined

  if (includeHeights && doc) {

    heightsBase64 = encodeHeightsBase64(doc.heights)

  }



  return NextResponse.json({

    mock: false,

    focus: '2B',

    onda: includeHeights ? 'A.1' : undefined,

    terrainId,

    meta: doc?.meta ?? null,

    sampleCount: doc?.heights.length ?? 0,

    honesty,

    ...(includeHeights

      ? {

          heightsBase64: heightsBase64 ?? null,

          heightsEncoding: 'float32-le-base64',

        }

      : {}),

  })

}



/**

 * POST — create, sculpt + persist, or full replace.

 * Body: { projectId, terrainId?, strokes?, create?, resolution?, replace?, meta?, heightsBase64?, includeHeights? }

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

  const strokes = Array.isArray(body.strokes) ? (body.strokes as TerrainBrushStroke[]) : []

  const resolution = typeof body.resolution === 'number' ? body.resolution : undefined

  const includeHeights = body.includeHeights === true



  try {

    // Full document replace (Landscape generate / import → durable)

    if (body.replace === true && typeof body.heightsBase64 === 'string') {

      const metaIn = body.meta as HeightfieldMeta | undefined

      const res =

        metaIn?.resolution ??

        resolution ??

        (typeof body.resolution === 'number' ? body.resolution : 129)

      const heights = decodeHeightsBase64(body.heightsBase64, res * res)

      const doc: HeightfieldDocument = {

        meta: {

          resolution: res,

          widthMeters: metaIn?.widthMeters ?? 256,

          depthMeters: metaIn?.depthMeters ?? 256,

          maxHeight: metaIn?.maxHeight ?? 64,

          version: 1,

          updatedAt: new Date().toISOString(),

          strokeCount: typeof metaIn?.strokeCount === 'number' ? metaIn.strokeCount : 0,

        },

        heights,

      }

      await saveHeightfieldToWorkspace({

        userId: user.userId,

        projectId,

        terrainId,

        document: doc,

      })

      return NextResponse.json({

        mock: false,

        focus: '2B',

        onda: 'A.1',

        terrainId,

        meta: doc.meta,

        honesty: heightfieldHonestyReport(doc),

        ...packHeights(doc, includeHeights),

      })

    }



    if (strokes.length === 0 && body.create === true) {

      const doc = createFlatHeightfield({ resolution })

      await saveHeightfieldToWorkspace({

        userId: user.userId,

        projectId,

        terrainId,

        document: doc,

      })

      return NextResponse.json({

        mock: false,

        focus: '2B',

        terrainId,

        meta: doc.meta,

        honesty: heightfieldHonestyReport(doc),

        ...packHeights(doc, includeHeights),

      })

    }



    const doc = await applyAndPersistTerrainStrokes({

      userId: user.userId,

      projectId,

      terrainId,

      strokes,

      resolution,

      createIfMissing: body.create !== false,

    })



    log.info('terrain_strokes_persisted', {

      terrainId,

      strokes: strokes.length,

      strokeCount: doc.meta.strokeCount,

    })



    return NextResponse.json({

      mock: false,

      focus: '2B',

      onda: 'A.1',

      terrainId,

      meta: doc.meta,

      honesty: heightfieldHonestyReport(doc),

      ...packHeights(doc, includeHeights),

    })

  } catch (err) {

    const message = err instanceof Error ? err.message : 'TERRAIN_FAILED'

    log.error('terrain_heightfield_failed', err instanceof Error ? err : new Error(message))

    return NextResponse.json({ error: message, mock: false }, { status: 500 })

  }

}


