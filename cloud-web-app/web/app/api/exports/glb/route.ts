/**
 * POST /api/exports/glb — export scene as GLB (GLTF Binary)
 *
 * BACKLOG §10.4 #30 — real export endpoints (GLB format)
 *
 * Phase A: creates export job receipt and returns a jobId for polling.
 * Actual conversion is handled async by the render-farm queue.
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

  let body: { projectId?: string; sceneIds?: string[]; quality?: 'draft' | 'production' }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { projectId, sceneIds = [], quality = 'draft' } = body
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  }

  const jobId = await enqueueExportJob({
    format: 'glb',
    projectId,
    userId,
    quality,
    sceneIds,
  })

  // GLB conversion will be processed by export-format-worker
  return NextResponse.json({
    jobId,
    format: 'glb',
    status: 'queued',
    projectId,
    sceneIds,
    quality,
    message: 'GLB export job queued. Poll /api/render/jobs/{jobId} for progress.',
    pollUrl: `/api/render/jobs/${jobId}`,
  }, { status: 202 })
}
