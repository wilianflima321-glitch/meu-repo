/**
 * POST /api/exports/wav — export audio mix as WAV
 *
 * BACKLOG §10.4 #30 — real export endpoints (WAV format)
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  const jobId = `export:wav:${Date.now().toString(36)}`

  return NextResponse.json({
    jobId,
    format: 'wav',
    status: 'queued',
    projectId,
    mixId: mixId ?? null,
    sampleRate,
    bitDepth,
    message: 'WAV export job queued. Poll /api/render/jobs/{jobId} for progress.',
    _pending: 'lib/export/formats/wav not yet wired — job is a receipt stub.',
  }, { status: 202 })
}
