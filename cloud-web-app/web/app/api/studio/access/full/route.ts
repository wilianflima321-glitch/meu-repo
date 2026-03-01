import { NextRequest } from 'next/server'
import { studioNotImplemented } from '@/app/api/studio/_lib/studio-gate'

export async function POST(request: NextRequest) {
  return studioNotImplemented({
    request,
    endpoint: 'POST /api/studio/access/full',
    capability: 'STUDIO_FULL_ACCESS_GRANT',
    milestone: 'P1',
    notes: 'Full access grants are feature-gated until audited controls are complete.',
  })
}
