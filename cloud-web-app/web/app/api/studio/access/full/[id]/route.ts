import { NextRequest } from 'next/server'
import { studioNotImplemented } from '@/app/api/studio/_lib/studio-gate'

export async function DELETE(request: NextRequest) {
  return studioNotImplemented({
    request,
    endpoint: 'DELETE /api/studio/access/full/[id]',
    capability: 'STUDIO_FULL_ACCESS_REVOKE',
    milestone: 'P1',
  })
}
