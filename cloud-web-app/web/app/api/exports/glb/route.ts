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

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  const jobId = `export:glb:${Date.now().toString(36)}`

  // TODO: enqueue actual GLB conversion via lib/render-farm/ when providers are available
  return NextResponse.json({
    jobId,
    format: 'glb',
    status: 'queued',
    projectId,
    sceneIds,
    quality,
    message: 'GLB export job queued. Poll /api/render/jobs/{jobId} for progress.',
    _pending: 'lib/render-farm/providers not yet wired — job is a receipt stub.',
  }, { status: 202 })
}
