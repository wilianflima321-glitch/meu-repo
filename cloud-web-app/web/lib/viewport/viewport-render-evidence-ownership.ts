import type { ViewportRenderOutputEvidence } from '@/lib/production/render-output-evidence'
import { isViewportRenderArtifactUrl } from '@/lib/viewport/viewport-render-artifact-access'
import {
  resolveViewportRenderArtifactUrl,
  ViewportRenderArtifactReadError,
} from '@/lib/viewport/viewport-render-backend'

export type ViewportRenderEvidenceArtifactOwnershipErrorCode =
  | 'ARTIFACT_PROJECT_MISMATCH'
  | 'INVALID_ARTIFACT_URL'
  | 'ARTIFACT_NOT_FOUND'

export interface ViewportRenderEvidenceArtifactOwnershipError {
  ok: false
  code: ViewportRenderEvidenceArtifactOwnershipErrorCode
  message: string
  status: 400 | 403 | 404
  artifactUrl: string
  expectedProjectId: string
  artifactProjectId?: string
  artifactKind?: string
  contractId?: string
}

export type ViewportRenderEvidenceArtifactOwnershipResult =
  | { ok: true }
  | ViewportRenderEvidenceArtifactOwnershipError

export function validateViewportRenderEvidenceArtifactOwnership(input: {
  evidence: ViewportRenderOutputEvidence
  projectId: string
}): ViewportRenderEvidenceArtifactOwnershipResult {
  for (const artifact of input.evidence.artifacts) {
    if (!isViewportRenderArtifactUrl(artifact.url)) continue

    try {
      const resolved = resolveViewportRenderArtifactUrl(artifact.url)
      if (resolved.projectId !== input.projectId) {
        return {
          ok: false,
          code: 'ARTIFACT_PROJECT_MISMATCH',
          message: 'Render artifact does not belong to this project',
          status: 403,
          artifactUrl: artifact.url,
          expectedProjectId: input.projectId,
          artifactProjectId: resolved.projectId,
          artifactKind: artifact.kind,
          contractId: resolved.contractId,
        }
      }
    } catch (error) {
      if (error instanceof ViewportRenderArtifactReadError) {
        return {
          ok: false,
          code: error.code,
          message: error.message,
          status: error.status,
          artifactUrl: artifact.url,
          expectedProjectId: input.projectId,
          artifactKind: artifact.kind,
        }
      }
      throw error
    }
  }

  return { ok: true }
}
