/**
 * POST /api/exports/mp4 — export render as MP4
 *
 * BACKLOG §10.4 #30 — real export endpoints (MP4 format)
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
    capability: 'EXPORT_MP4',
    route: '/api/exports/mp4',
    config: EXPORT_JOB_RATE_LIMIT,
  })
  if (rateLimited) return rateLimited

  let body: {
    projectId?: string
    sequenceId?: string
    resolution?: '720p' | '1080p' | '4k'
    fps?: 24 | 30 | 60
    codec?: 'h264' | 'h265' | 'av1'
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    projectId,
    sequenceId,
    resolution = '1080p',
    fps = 24,
    codec = 'h264',
  } = body

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  }

  const jobId = await enqueueExportJob({
    format: 'mp4',
    projectId,
    userId,
    quality: resolution,
  })

  return NextResponse.json({
    jobId,
    format: 'mp4',
    status: 'queued',
    projectId,
    sequenceId: sequenceId ?? null,
    resolution,
    fps,
    codec,
    message: 'MP4 export job queued. Poll /api/render/jobs/{jobId} for progress.',
    pollUrl: `/api/render/jobs/${jobId}`,
  }, { status: 202 })
}
