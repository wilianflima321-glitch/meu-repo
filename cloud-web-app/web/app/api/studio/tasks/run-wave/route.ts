import { NextRequest } from 'next/server'
import { studioNotImplemented } from '@/app/api/studio/_lib/studio-gate'

export async function POST(request: NextRequest) {
  return studioNotImplemented({
    request,
    endpoint: 'POST /api/studio/tasks/run-wave',
    capability: 'STUDIO_TASK_RUN_WAVE',
    milestone: 'P1',
  })
}
