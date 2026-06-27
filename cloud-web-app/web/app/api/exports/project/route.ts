/**
 * POST /api/exports/project — export full project as ZIP
 *
 * BACKLOG §10.4 #30 — real export endpoints (project ZIP format)
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { enqueueExportJob } from '@/lib/export/enqueue-export-job'
import { requireAuth } from '@/lib/auth-server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  let userId: string
  try {
    userId = requireAuth(req).userId
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    projectId?: string
    includeAssets?: boolean
    includeHistory?: boolean
    format?: 'zip' | 'tar.gz'
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    projectId,
    includeAssets = true,
    includeHistory = false,
    format = 'zip',
  } = body

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  }

  const jobId = await enqueueExportJob({
    format,
    projectId,
    userId,
  })

  return NextResponse.json({
    jobId,
    format,
    status: 'queued',
    projectId,
    includeAssets,
    includeHistory,
    message: `Project ${format} export queued. Poll /api/render/jobs/{jobId} for progress.`,
    pollUrl: `/api/render/jobs/${jobId}`,
  }, { status: 202 })
}
