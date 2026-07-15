import { NextRequest, NextResponse } from 'next/server'

import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { requireAuth } from '@/lib/auth-server'
import { prisma } from '@/lib/db'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  buildDefaultAgenticProductionState,
  readAgenticProductionStateFromSettings,
} from '@/lib/production/agentic-production-state'
import { buildEvidenceRefCoverageReport } from '@/lib/production/evidence-ref-coverage'

const logger = createComponentLogger('api.projects.production-state.evidence-coverage')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: {
    id: string
  }
}

async function loadProjectForEvidenceCoverage(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [{ userId }, { members: { some: { userId } } }],
    },
    select: {
      id: true,
      name: true,
      template: true,
      settings: true,
    },
  })
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const project = await loadProjectForEvidenceCoverage(params.id, user.userId)
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const state =
      readAgenticProductionStateFromSettings(project.settings) ??
      buildDefaultAgenticProductionState({ projectName: project.name, projectType: project.template })
    const coverage = buildEvidenceRefCoverageReport({ state, settings: project.settings })

    return NextResponse.json({
      coverage,
      capability: coverage.capability,
      capabilityStatus: coverage.capabilityStatus,
    })
  } catch (error) {
    logger.error('evidence_coverage.get_failed', error)

    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
