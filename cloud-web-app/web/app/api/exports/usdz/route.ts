/**
 * POST /api/exports/usdz — export scene as USDZ (Universal Scene Description ZIP)
 *
 * BACKLOG §10.4 #30 — real export endpoints (USDZ format)
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  const job = await prisma.renderJob.create({
    data: {
      projectId,
      requestedBy: userId,
      status: 'queued',
      provider: 'internal',
    }
  })
  const jobId = job.id

  return NextResponse.json({
    jobId,
    format: 'usdz',
    status: 'queued',
    projectId,
    sceneIds,
    message: 'USDZ export job queued. Poll /api/render/jobs/{jobId} for progress.',
    _pending: 'lib/integrations/usd not yet wired — job is a receipt stub.',
  }, { status: 202 })
}
