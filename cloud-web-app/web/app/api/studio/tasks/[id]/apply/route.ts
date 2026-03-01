import { NextRequest } from 'next/server'
import { studioNotImplemented } from '@/app/api/studio/_lib/studio-gate'

export async function POST(request: NextRequest) {
  return studioNotImplemented({
    request,
    endpoint: 'POST /api/studio/tasks/[id]/apply',
    capability: 'STUDIO_TASK_APPLY',
    milestone: 'P1',
  })
}
