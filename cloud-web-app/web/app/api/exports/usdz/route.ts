/**
 * POST /api/exports/usdz — export scene as USDZ (Universal Scene Description ZIP)
 *
 * BACKLOG §10.4 #30 — real export endpoints (USDZ format)
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { enqueueExportJob } from '@aethel/export/enqueue-export-job'
import { requireAuth } from '@/lib/auth-server'
import { enforceRouteRateLimit, EXPORT_JOB_RATE_LIMIT } from '@/lib/server/route-rate-limit'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  let userId: string
  try {
    userId = requireAuth(req).userId
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rateLimited = await enforceRouteRateLimit({
    req,
    capability: 'EXPORT_USDZ',
    route: '/api/exports/usdz',
    config: EXPORT_JOB_RATE_LIMIT,
  })
  if (rateLimited) return rateLimited

  let body: { projectId?: string; sceneIds?: string[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { projectId, sceneIds = [] } = body
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  }

  const jobId = await enqueueExportJob({
    format: 'usdz',
    projectId,
    userId,
    sceneIds,
  })

  return NextResponse.json({
    jobId,
    format: 'usdz',
    status: 'queued',
    projectId,
    sceneIds,
    message: 'USDZ export job queued. Poll /api/render/jobs/{jobId} for progress.',
    pollUrl: `/api/render/jobs/${jobId}`,
  }, { status: 202 })
}
