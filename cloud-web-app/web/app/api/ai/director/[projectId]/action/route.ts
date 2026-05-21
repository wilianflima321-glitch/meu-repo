import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { prisma } from '@/lib/db'
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { createComponentLogger } from '@/lib/observability/logger'
import { handleDirectorAction } from '@/lib/server/ai-director/actions'
import {
  AI_DIRECTOR_ACTION_RATE_LIMIT,
  enforceAiCoreRateLimit,
} from '@/lib/server/ai-core-rate-limit'
import type { DirectorActionPayload } from '@/lib/server/ai-director/types'

const routeLogger = createComponentLogger('api/ai/director/[projectId]/action/route')

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = requireAuth(req)
    const rateLimited = enforceAiCoreRateLimit({
      req,
      capability: 'ai.director.action',
      route: '/api/ai/director/[projectId]/action',
      config: AI_DIRECTOR_ACTION_RATE_LIMIT,
    })
    if (rateLimited) return rateLimited

    const { projectId } = await params
    const body = (await req.json()) as DirectorActionPayload

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.userId },
      select: { id: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const response = await handleDirectorAction({ userId: user.userId, projectId, payload: body })
    if ('error' in response) {
      return NextResponse.json(response, { status: 400 })
    }
    return NextResponse.json(response)
  } catch (error) {
    routeLogger.error('Director action error', error)
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
