import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { prisma } from '@/lib/db'
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { createComponentLogger } from '@/lib/observability/logger'
import { getDirectorSessionPayload } from '@/lib/server/ai-director/service'

const routeLogger = createComponentLogger('api/ai/director/[projectId]/route')

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = requireAuth(req)
    const { projectId } = await params

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.userId },
      select: { name: true, template: true, description: true, settings: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const payload = await getDirectorSessionPayload({ projectId, project })

    return NextResponse.json(payload, {
      headers: {
        'x-aethel-capability-status': payload.capabilityStatus,
        'x-aethel-analysis-mode': payload.analysisMode,
        'x-aethel-cache-status': payload.cacheStatus,
        ...(payload.provider ? { 'x-aethel-provider': payload.provider } : {}),
      },
    })
  } catch (error) {
    routeLogger.error('Director API error', error)
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
