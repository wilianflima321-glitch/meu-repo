import { NextRequest, NextResponse } from 'next/server'
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/db'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  buildMissionHandoffUrl,
  buildMissionProjectSettings,
  buildMissionWorkspaceName,
  parseMissionIntake,
} from '@/lib/workspace/mission-intake'

const routeLogger = createComponentLogger('api.workspace.create')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const intake = parseMissionIntake((body ?? {}) as Record<string, unknown>)

    if (!intake) {
      return NextResponse.json({ error: 'Mission is required' }, { status: 400 })
    }

    const user = getUserFromRequest(request)
    if (!user) {
      const handoffUrl = buildMissionHandoffUrl(intake)
      return NextResponse.json(
        {
          success: false,
          requiresAuth: true,
          handoffUrl,
          mission: intake.mission,
          source: intake.source,
          template: intake.template,
        },
        { status: 202 }
      )
    }

    const entitlements = await requireEntitlementsForUser(user.userId)

    if (entitlements.plan.limits.projects !== -1) {
      const count = await prisma.project.count({ where: { userId: user.userId } })
      if (count >= entitlements.plan.limits.projects) {
        return NextResponse.json(
          {
            error: 'PROJECT_LIMIT_REACHED',
            message: `Project limit for this plan (${entitlements.plan.limits.projects}) was reached.`,
            plan: entitlements.plan.id,
          },
          { status: 402 }
        )
      }
    }

    const project = await prisma.project.create({
      data: {
        name: buildMissionWorkspaceName(intake.mission),
        description: intake.mission,
        template: intake.template,
        userId: user.userId,
        settings: buildMissionProjectSettings(intake),
      },
    })

    return NextResponse.json(
      {
        success: true,
        workspaceId: project.id,
        projectId: project.id,
        mission: intake.mission,
        template: intake.template,
        source: intake.source,
        createdAt: project.createdAt.toISOString(),
      },
      { status: 201 }
    )
  } catch (error) {
    routeLogger.error('Workspace mission intake failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError('Failed to create workspace')
  }
}
