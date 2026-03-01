import { NextRequest } from 'next/server'
import { studioNotImplemented } from '@/app/api/studio/_lib/studio-gate'

export async function GET(request: NextRequest) {
  return studioNotImplemented({
    request,
    endpoint: 'GET /api/studio/cost/live',
    capability: 'STUDIO_COST_LIVE',
    milestone: 'P1',
  })
}
