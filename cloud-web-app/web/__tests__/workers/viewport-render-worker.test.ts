import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { buildViewportRenderJobContract } from '@/lib/viewport/viewport-render-contract'
import {
  buildDefaultViewportRenderRuntimeRoute,
  buildViewportRenderQueuePayload,
} from '@/lib/viewport/viewport-render-queue'
import {
  executeViewportRenderQueuePayload,
  processViewportRenderQueueJob,
} from '@/lib/workers/viewport-render-worker'

function buildPayload() {
  const contract = buildViewportRenderJobContract({
    id: 'render-worker-review',
    projectId: 'project-render-worker',
    mode: 'film',
    renderMode: 'cinematic',
    quality: 'review',
    requestedAt: '2026-05-11T15:00:00.000Z',
    selectedObjectId: 'camera-main',
    selectedObjectName: 'Main Camera',
    timeline: { currentTime: 4, duration: 18, isPlaying: false },
    scene: {
      objectCount: 38,
      assetCount: 9,
      selectedObjectId: 'camera-main',
      selectedObjectName: 'Main Camera',
      assetFormats: ['glb', 'wav', 'png'],
      visualScriptNodes: 4,
      visualScriptEdges: 3,
      vfxNodes: 5,
      vfxConnections: 4,
    },
  })

  return buildViewportRenderQueuePayload({
    contract,
    projectId: 'project-render-worker',
    projectName: 'Render Worker Film',
    runtimeRoute: buildDefaultViewportRenderRuntimeRoute(contract),
    requestedBy: 'user-render-worker',
    requestedAt: '2026-05-11T15:01:00.000Z',
  })
}

describe('viewport render worker', () => {
  it('does not fake media output when no renderer backend is configured', async () => {
    const artifactRoot = await mkdtemp(path.join(os.tmpdir(), 'aethel-render-worker-'))

    try {
      const result = await executeViewportRenderQueuePayload(buildPayload(), {
        artifactRoot,
        persistEvidence: false,
      }, 'job-render-1')

      expect(result.status).toBe('blocked')
      expect(result.renderer).toBe('manifest-only')
      expect(result.blockers).toContain('AETHEL_RENDER_BACKEND_ENDPOINT is not configured.')
      expect(result.evidence?.validation).toMatchObject({
        playbackOk: false,
        performanceOk: false,
        licenseOk: true,
        continuityOk: true,
      })
      expect(result.evidence?.artifacts.map((artifact) => artifact.kind)).toEqual([
        'manifest',
        'validation-report',
      ])

      const manifest = await readFile(
        path.join(artifactRoot, 'viewport-renders', 'project-render-worker', 'render-worker-review', 'manifest.json'),
        'utf8',
      )
      expect(manifest).toContain('Media rendering remains blocked until a real renderer backend produces playback evidence')
    } finally {
      await rm(artifactRoot, { recursive: true, force: true })
    }
  })

  it('accepts real renderer backend evidence without auto-release', async () => {
    const payload = buildPayload()
    const fetcher = async (_url: string, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body))).toMatchObject({
        schemaVersion: 1,
        runtimeEngine: {
          contract: 'hybrid-wgpu-v1',
          browserRole: 'preview-only',
          neverMainThread: true,
        },
        evidencePolicy: {
          requirePerformanceReportArtifact: true,
          requireValidationReportArtifact: true,
          neverAutoRelease: true,
        },
      })

      return new Response(JSON.stringify({
        runtimeEngine: {
          schemaVersion: 1,
          backendId: 'cloud-renderer-test',
          backendKind: 'cloud-renderer',
          target: 'cloud-sandbox',
          contractId: payload.metadata.renderContract.id,
          projectId: payload.projectId,
          jobId: 'job-render-2',
          finishedAt: '2026-05-11T15:05:00.000Z',
          performanceReport: {
            renderTimeMs: 4_200,
            frameCount: 540,
            averageFps: 30,
            peakMemoryMb: 768,
            peakVramMb: 1024,
            toolchainDigests: { ffmpeg: 'sha256-ffmpeg' },
          },
          validationReport: {
            playbackOk: true,
            performanceOk: true,
            licenseOk: true,
            continuityOk: true,
            artifactOwnershipChecked: true,
            shaderCompileOk: true,
            assetBudgetOk: true,
          },
          evidence: {
            contractId: payload.metadata.renderContract.id,
            projectId: payload.projectId,
            jobId: 'job-render-2',
            quality: 'review',
            runtimeTarget: 'cloud-sandbox',
            capturedAt: '2026-05-11T15:05:00.000Z',
            artifacts: [
              {
                kind: 'review-mp4',
                url: 'https://renders.example.test/project-render-worker/review.mp4',
                sizeBytes: 1024,
                durationSeconds: 18,
                checksum: 'sha256-review',
              },
              {
                kind: 'performance-report',
                url: 'https://renders.example.test/project-render-worker/performance.json',
                sizeBytes: 512,
                checksum: 'sha256-performance',
              },
              {
                kind: 'validation-report',
                url: 'https://renders.example.test/project-render-worker/validation.json',
                sizeBytes: 512,
                checksum: 'sha256-validation',
              },
            ],
            validation: {
              playbackOk: true,
              performanceOk: true,
              licenseOk: true,
              continuityOk: true,
            },
            notes: ['Renderer produced review evidence; human approval remains required.'],
          },
        },
      }))
    }

    const result = await executeViewportRenderQueuePayload(payload, {
      fetcher,
      rendererEndpoint: 'https://renderer.example.test',
      persistEvidence: false,
    }, 'job-render-2')

    expect(result.status).toBe('completed')
    expect(result.renderer).toBe('external-backend')
    expect(result.evidence?.artifacts[0]?.kind).toBe('review-mp4')
    expect(result.notes.join(' ')).toContain('Human release approval is still required')
  })

  it('blocks renderer backend evidence that references another project internal artifact', async () => {
    const payload = buildPayload()
    const fetcher = async () => new Response(JSON.stringify({
      runtimeEngine: {
        schemaVersion: 1,
        backendId: 'cloud-renderer-test',
        backendKind: 'cloud-renderer',
        target: 'cloud-sandbox',
        contractId: payload.metadata.renderContract.id,
        projectId: payload.projectId,
        jobId: 'job-render-cross-project',
        finishedAt: '2026-05-11T15:06:00.000Z',
        performanceReport: {
          renderTimeMs: 4_200,
          frameCount: 540,
          averageFps: 30,
          peakMemoryMb: 768,
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
          contractId: payload.metadata.renderContract.id,
          projectId: payload.projectId,
          jobId: 'job-render-cross-project',
          quality: 'review',
          runtimeTarget: 'cloud-sandbox',
          capturedAt: '2026-05-11T15:06:00.000Z',
          artifacts: [
            {
              kind: 'performance-report',
              url: 'https://renders.example.test/project-render-worker/performance.json',
            },
            {
              kind: 'validation-report',
              url: 'aethel-artifact://viewport-render/other-project/render-worker-review/validation-report.json',
            },
          ],
          validation: {
            playbackOk: true,
            performanceOk: true,
            licenseOk: true,
            continuityOk: true,
          },
          notes: ['Renderer attempted to return an internal artifact from another project.'],
        },
      },
    }))

    const result = await executeViewportRenderQueuePayload(payload, {
      fetcher,
      rendererEndpoint: 'https://renderer.example.test',
      persistEvidence: false,
    }, 'job-render-cross-project')

    expect(result.status).toBe('blocked')
    expect(result.renderer).toBe('external-backend')
    expect(result.evidence).toBeUndefined()
    expect(result.blockers.join(' ')).toContain('does not belong to this project')
  })

  it('skips unrelated export jobs and keeps the export queue shared safely', async () => {
    const result = await processViewportRenderQueueJob({
      id: 'export-job-1',
      name: 'export:project',
      data: { projectId: 'project-1' },
    }, { persistEvidence: false })

    expect(result).toMatchObject({
      status: 'skipped',
      jobId: 'export-job-1',
      renderer: 'none',
    })
  })
})
