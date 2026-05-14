import { describe, expect, it } from 'vitest'

import {
  buildRuntimeRendererRequestEnvelope,
  coerceRuntimeRendererEvidenceEnvelope,
} from '@/lib/runtime/runtime-renderer-adapter'
import { buildViewportRenderJobContract } from '@/lib/viewport/viewport-render-contract'
import {
  buildDefaultViewportRenderRuntimeRoute,
  buildViewportRenderQueuePayload,
} from '@/lib/viewport/viewport-render-queue'

function payload() {
  const contract = buildViewportRenderJobContract({
    id: 'renderer-adapter-review',
    projectId: 'project-renderer-adapter',
    mode: 'film',
    renderMode: 'cinematic',
    quality: 'review',
    requestedAt: '2026-05-14T12:00:00.000Z',
    timeline: { currentTime: 0, duration: 12, isPlaying: false },
    scene: {
      objectCount: 12,
      assetCount: 4,
      selectedObjectId: null,
      selectedObjectName: null,
      assetFormats: ['glb'],
      visualScriptNodes: 2,
      visualScriptEdges: 1,
      vfxNodes: 1,
      vfxConnections: 1,
    },
  })

  return buildViewportRenderQueuePayload({
    contract,
    projectId: 'project-renderer-adapter',
    runtimeRoute: buildDefaultViewportRenderRuntimeRoute(contract),
    requestedBy: 'user-renderer-adapter',
    requestedAt: '2026-05-14T12:01:00.000Z',
  })
}

function validEnvelope() {
  const renderPayload = payload()
  return {
    renderPayload,
    envelope: {
      runtimeEngine: {
        schemaVersion: 1,
        backendId: 'cloud-renderer-a',
        backendKind: 'cloud-renderer',
        target: 'cloud-sandbox',
        contractId: renderPayload.metadata.renderContract.id,
        projectId: renderPayload.projectId,
        jobId: 'job-renderer-adapter',
        finishedAt: '2026-05-14T12:02:00.000Z',
        performanceReport: {
          renderTimeMs: 2_400,
          frameCount: 360,
          averageFps: 30,
          peakMemoryMb: 512,
          peakVramMb: 1024,
          toolchainDigests: { ffmpeg: 'sha256-ffmpeg' },
        },
        validationReport: {
          playbackOk: true,
          performanceOk: true,
          licenseOk: true,
          continuityOk: true,
          artifactOwnershipChecked: true,
        },
        evidence: {
          contractId: renderPayload.metadata.renderContract.id,
          projectId: renderPayload.projectId,
          jobId: 'job-renderer-adapter',
          quality: 'review',
          runtimeTarget: 'cloud-sandbox',
          capturedAt: '2026-05-14T12:02:00.000Z',
          artifacts: [
            { kind: 'review-mp4', url: 'https://renderer.example/review.mp4' },
            { kind: 'performance-report', url: 'https://renderer.example/performance.json' },
            { kind: 'validation-report', url: 'https://renderer.example/validation.json' },
          ],
          validation: {
            playbackOk: true,
            performanceOk: true,
            licenseOk: true,
            continuityOk: true,
          },
          notes: ['review evidence produced'],
        },
      },
    },
  }
}

describe('runtime renderer adapter', () => {
  it('builds strict renderer requests that forbid browser-main render execution', () => {
    const renderPayload = payload()
    const request = buildRuntimeRendererRequestEnvelope(renderPayload)

    expect(request).toMatchObject({
      schemaVersion: 1,
      jobType: 'render:viewport',
      idempotencyKey: 'project-renderer-adapter:renderer-adapter-review:2026-05-14T12:01:00.000Z',
      runtimeEngine: {
        contract: 'hybrid-wgpu-v1',
        acceptedTargets: ['local-native', 'cloud-sandbox'],
        browserRole: 'preview-only',
        neverMainThread: true,
      },
      evidencePolicy: {
        requirePerformanceReportArtifact: true,
        requireValidationReportArtifact: true,
        neverAutoRelease: true,
      },
    })
  })

  it('accepts schema-v1 renderer evidence with performance and validation reports', () => {
    const { renderPayload, envelope } = validEnvelope()
    const result = coerceRuntimeRendererEvidenceEnvelope(envelope, renderPayload)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.envelope.backendKind).toBe('cloud-renderer')
      expect(result.evidence.artifacts.map((artifact) => artifact.kind)).toContain('performance-report')
    }
  })

  it('rejects legacy renderer evidence without runtime-engine schema', () => {
    const renderPayload = payload()
    const result = coerceRuntimeRendererEvidenceEnvelope({
      evidence: {
        contractId: renderPayload.metadata.renderContract.id,
        artifacts: [{ kind: 'review-mp4', url: 'https://renderer.example/review.mp4' }],
      },
    }, renderPayload)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.blockers.join(' ')).toContain('schemaVersion 1')
    }
  })

  it('rejects evidence that omits performance-report artifacts', () => {
    const { renderPayload, envelope } = validEnvelope()
    const artifacts = envelope.runtimeEngine.evidence.artifacts.filter((artifact) => artifact.kind !== 'performance-report')

    const result = coerceRuntimeRendererEvidenceEnvelope({
      runtimeEngine: {
        ...envelope.runtimeEngine,
        evidence: {
          ...envelope.runtimeEngine.evidence,
          artifacts,
        },
      },
    }, renderPayload)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.blockers.join(' ')).toContain('performance-report')
    }
  })
})
