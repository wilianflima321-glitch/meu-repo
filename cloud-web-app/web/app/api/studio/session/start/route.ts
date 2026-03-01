import { NextRequest } from 'next/server'
import { studioNotImplemented } from '@/app/api/studio/_lib/studio-gate'

export async function POST(request: NextRequest) {
  return studioNotImplemented({
    request,
    endpoint: 'POST /api/studio/session/start',
    capability: 'STUDIO_SESSION_START',
    milestone: 'P1',
    notes: 'Session orchestration backend is still gated.',
  })
}
