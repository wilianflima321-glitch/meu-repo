import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/db'
import { createComponentLogger } from '@/lib/observability/logger';
import {
  buildDefaultAgenticProductionState,
  buildProductionReadinessSummary,
  readAgenticProductionStateFromSettings,
  writeAgenticProductionStateToSettings,
  type AgenticProductionState,
  type ProductionReadinessSummary,
} from '@/lib/production/agentic-production-state'
import {
  mergeViewportRenderOutputEvidenceIntoProductionState,
  type ViewportRenderOutputEvidence,
} from '@/lib/production/render-output-evidence'
import { validateViewportRenderEvidenceArtifactOwnership } from '@/lib/viewport/viewport-render-evidence-ownership'

const logger = createComponentLogger('production.render-output-evidence-persistence')

export interface ViewportRenderEvidencePersistenceResult {
  persisted: boolean
  reason?: 'PROJECT_NOT_FOUND' | 'ARTIFACT_PROJECT_MISMATCH' | 'INVALID_ARTIFACT_URL' | 'ARTIFACT_NOT_FOUND'
  message?: string
  state?: AgenticProductionState
  readiness?: ProductionReadinessSummary
}

export async function persistViewportRenderOutputEvidenceForProject(input: {
  projectId: string
  evidence: ViewportRenderOutputEvidence
}): Promise<ViewportRenderEvidencePersistenceResult> {
  const artifactOwnership = validateViewportRenderEvidenceArtifactOwnership({
    evidence: input.evidence,
    projectId: input.projectId,
  })
  if (!artifactOwnership.ok) {
    logger.warn('render_output_evidence.persistence_artifact_ownership_rejected', {
      code: artifactOwnership.code,
      projectId: artifactOwnership.expectedProjectId,
      artifactProjectId: artifactOwnership.artifactProjectId,
      contractId: artifactOwnership.contractId,
      artifactKind: artifactOwnership.artifactKind,
    })
    return {
      persisted: false,
      reason: artifactOwnership.code,
      message: artifactOwnership.message,
    }
  }

  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    select: {
      id: true,
      name: true,
      template: true,
      settings: true,
    },
  })

  if (!project) {
    logger.warn('render_output_evidence.project_missing', {
      projectId: input.projectId,
      contractId: input.evidence.contractId,
    })
    return { persisted: false, reason: 'PROJECT_NOT_FOUND' }
  }

  const currentState =
    readAgenticProductionStateFromSettings(project.settings) ??
    buildDefaultAgenticProductionState({
      projectName: project.name,
      projectType: project.template,
    })

  const state = mergeViewportRenderOutputEvidenceIntoProductionState(currentState, {
    ...input.evidence,
    projectId: project.id,
  })
  const settings = writeAgenticProductionStateToSettings(project.settings, state)
  const readiness = buildProductionReadinessSummary(state)

  await prisma.project.update({
    where: { id: project.id },
    data: { settings: settings as Prisma.InputJsonValue },
  })

  logger.info('render_output_evidence.persisted_by_worker', {
    projectId: project.id,
    contractId: input.evidence.contractId,
    quality: input.evidence.quality,
    artifactCount: input.evidence.artifacts.length,
    playbackOk: input.evidence.validation.playbackOk,
    performanceOk: input.evidence.validation.performanceOk,
    licenseOk: input.evidence.validation.licenseOk,
    continuityOk: input.evidence.validation.continuityOk,
  })

  return {
    persisted: true,
    state,
    readiness,
  }
}
