import type {
  ViewportRenderOutputArtifact,
  ViewportRenderOutputEvidence,
} from '@/lib/production/render-output-evidence'

export interface ViewportRenderOutputArtifactWithAccess extends ViewportRenderOutputArtifact {
  accessUrl: string
  accessMode: 'project-authenticated-proxy' | 'direct-url'
}

export interface ViewportRenderOutputEvidenceWithAccess extends Omit<ViewportRenderOutputEvidence, 'artifacts'> {
  artifacts: ViewportRenderOutputArtifactWithAccess[]
}

export function isViewportRenderArtifactUrl(value: string): boolean {
  return value.startsWith('aethel-artifact://viewport-render/')
}

export function buildViewportRenderArtifactAccessUrl(input: {
  projectId: string
  artifactUrl: string
}): string {
  const projectId = encodeURIComponent(input.projectId)
  const artifactUrl = encodeURIComponent(input.artifactUrl)
  return `/api/projects/${projectId}/production-state/render-job/artifact?artifactUrl=${artifactUrl}`
}

export function withViewportRenderArtifactAccess(
  artifact: ViewportRenderOutputArtifact,
  projectId: string,
): ViewportRenderOutputArtifactWithAccess {
  if (!isViewportRenderArtifactUrl(artifact.url)) {
    return {
      ...artifact,
      accessUrl: artifact.url,
      accessMode: 'direct-url',
    }
  }

  return {
    ...artifact,
    accessUrl: buildViewportRenderArtifactAccessUrl({
      projectId,
      artifactUrl: artifact.url,
    }),
    accessMode: 'project-authenticated-proxy',
  }
}

export function withViewportRenderEvidenceArtifactAccess(
  evidence: ViewportRenderOutputEvidence,
  projectId = evidence.projectId ?? '',
): ViewportRenderOutputEvidenceWithAccess {
  return {
    ...evidence,
    artifacts: evidence.artifacts.map((artifact) => withViewportRenderArtifactAccess(artifact, projectId)),
  }
}
