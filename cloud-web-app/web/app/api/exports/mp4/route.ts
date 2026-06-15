/**
 * POST /api/exports/mp4 — export render as MP4
 *
 * BACKLOG §10.4 #30 — real export endpoints (MP4 format)
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  const jobId = `export:mp4:${Date.now().toString(36)}`

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
    _pending: 'lib/render-farm/providers not yet wired — job is a receipt stub.',
  }, { status: 202 })
}
