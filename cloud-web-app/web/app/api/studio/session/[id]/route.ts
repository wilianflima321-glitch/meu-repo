import { NextRequest } from 'next/server'
import { studioNotImplemented } from '@/app/api/studio/_lib/studio-gate'

export async function GET(request: NextRequest) {
  return studioNotImplemented({
    request,
    endpoint: 'GET /api/studio/session/[id]',
    capability: 'STUDIO_SESSION_STATE',
    milestone: 'P1',
  })
}
