import { NextRequest } from 'next/server'
import { studioNotImplemented } from '@/app/api/studio/_lib/studio-gate'

export async function POST(request: NextRequest) {
  return studioNotImplemented({
    request,
    endpoint: 'POST /api/studio/tasks/plan',
    capability: 'STUDIO_TASK_PLAN',
    milestone: 'P1',
    notes: 'Planner/Coder/Reviewer orchestration is not fully released.',
  })
}
