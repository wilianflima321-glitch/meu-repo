import { NextRequest, NextResponse } from 'next/server'

import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { requireAuth } from '@/lib/auth-server'
import { listBrowserOperatorRuns } from '@/lib/server/browser-operator-recorder'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    requireAuth(request)
    const url = new URL(request.url)
    const projectId = url.searchParams.get('projectId')?.trim() || undefined
    const limitParam = Number(url.searchParams.get('limit') ?? 8)
    const runs = listBrowserOperatorRuns({
      projectId,
      limit: Number.isFinite(limitParam) ? limitParam : 8,
    })

    return NextResponse.json({
      runs: runs.map((run) => ({
        runId: run.runId,
        projectId: run.projectId,
        mission: run.mission,
        status: run.status,
        updatedAt: run.updatedAt,
        currentStep: run.currentStep,
        stepCount: run.steps.length,
        timelineHash: run.timelineHash,
      })),
    })
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError('Failed to list browser operator replays')
  }
}
