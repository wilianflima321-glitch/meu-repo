import { NextRequest } from 'next/server'
import { studioNotImplemented } from '@/app/api/studio/_lib/studio-gate'

export async function POST(request: NextRequest) {
  return studioNotImplemented({
    request,
    endpoint: 'POST /api/studio/session/[id]/stop',
    capability: 'STUDIO_SESSION_STOP',
    milestone: 'P1',
  })
}
