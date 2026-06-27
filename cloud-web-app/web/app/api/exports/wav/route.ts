/**
 * POST /api/exports/wav — export audio mix as WAV
 *
 * BACKLOG §10.4 #30 — real export endpoints (WAV format)
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
    mixId?: string
    sampleRate?: 44100 | 48000 | 96000
    bitDepth?: 16 | 24 | 32
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { projectId, mixId, sampleRate = 48000, bitDepth = 24 } = body
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  }

  const jobId = await enqueueExportJob({
    format: 'wav',
    projectId,
    userId,
  })

  return NextResponse.json({
    jobId,
    format: 'wav',
    status: 'queued',
    projectId,
    mixId: mixId ?? null,
    sampleRate,
    bitDepth,
    message: 'WAV export job queued. Poll /api/render/jobs/{jobId} for progress.',
    pollUrl: `/api/render/jobs/${jobId}`,
  }, { status: 202 })
}
