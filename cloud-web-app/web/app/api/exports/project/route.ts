/**
 * POST /api/exports/project — export full project as ZIP
 *
 * BACKLOG §10.4 #30 — real export endpoints (project ZIP format)
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  const jobId = `export:project:${Date.now().toString(36)}`

  return NextResponse.json({
    jobId,
    format,
    status: 'queued',
    projectId,
    includeAssets,
    includeHistory,
    message: `Project ${format} export queued. Poll /api/render/jobs/{jobId} for progress.`,
    _pending: 'lib/export/formats/project-zip not yet wired — job is a receipt stub.',
  }, { status: 202 })
}
