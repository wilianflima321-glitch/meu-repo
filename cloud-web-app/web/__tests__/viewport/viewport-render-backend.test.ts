import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { buildViewportRenderJobContract } from '@/lib/viewport/viewport-render-contract'
import {
  buildDefaultViewportRenderRuntimeRoute,
  buildViewportRenderQueuePayload,
  VIEWPORT_RENDER_QUEUE_JOB_TYPE,
} from '@/lib/viewport/viewport-render-queue'
import {
  coerceViewportRenderBackendRequest,
  renderViewportBackendArtifacts,
  resolveViewportRenderArtifactUrl,
  ViewportRenderArtifactReadError,
} from '@/lib/viewport/viewport-render-backend'

function buildPayload(quality: 'draft' | 'review' | 'final' = 'draft') {
  const contract = buildViewportRenderJobContract({
    id: `render-backend-${quality}`,
    projectId: 'project-render-backend',
    mode: 'film',
    renderMode: quality === 'draft' ? 'draft' : 'cinematic',
    quality,
    requestedAt: '2026-05-11T16:00:00.000Z',
    selectedObjectId: 'shot-camera',
    selectedObjectName: 'Shot Camera',
    timeline: { currentTime: 2, duration: quality === 'final' ? 240 : 14, isPlaying: false },
    scene: {
      objectCount: 44,
      assetCount: 12,
      selectedObjectId: 'shot-camera',
      selectedObjectName: 'Shot Camera',
      assetFormats: ['glb', 'wav', 'png'],
      visualScriptNodes: 6,
      visualScriptEdges: 5,
      vfxNodes: 4,
      vfxConnections: 3,
    },
  })

  return buildViewportRenderQueuePayload({
    contract,
    projectId: 'project-render-backend',
    projectName: 'Backend Preview',
    runtimeRoute: buildDefaultViewportRenderRuntimeRoute(contract),
    requestedBy: 'user-render-backend',
    requestedAt: '2026-05-11T16:01:00.000Z',
  })
}

describe('viewport render backend', () => {
  it('coerces only render viewport backend requests', () => {
    const payload = buildPayload()

    expect(coerceViewportRenderBackendRequest({
      jobType: VIEWPORT_RENDER_QUEUE_JOB_TYPE,
      payload,
    })?.payload.projectId).toBe('project-render-backend')

    expect(coerceViewportRenderBackendRequest({ jobType: 'export:project', payload })).toBeNull()
  })

  it('produces concrete draft preview artifacts that can pass draft playback validation', async () => {
    const artifactRoot = await mkdtemp(path.join(os.tmpdir(), 'aethel-render-backend-'))

    try {
      const result = await renderViewportBackendArtifacts({
        jobType: VIEWPORT_RENDER_QUEUE_JOB_TYPE,
        payload: buildPayload('draft'),
      }, {
        artifactRoot,
        capturedAt: '2026-05-11T16:02:00.000Z',
        jobId: 'draft-job-1',
      })

      expect(result.renderer.producedKinds).toEqual(expect.arrayContaining([
        'manifest',
        'thumbnail',
        'proxy-preview',
        'performance-report',
        'license-report',
        'validation-report',
      ]))
      expect(result.renderer.blockedKinds).toEqual([])
      expect(result.evidence.validation).toEqual({
        playbackOk: true,
        performanceOk: true,
        licenseOk: true,
        continuityOk: true,
      })

      const thumbnail = await readFile(
        path.join(artifactRoot, 'viewport-renders', 'project-render-backend', 'render-backend-draft', 'thumbnail.svg'),
        'utf8',
      )
      expect(thumbnail).toContain('Aethel internal scene preview')

      const performanceReport = JSON.parse(await readFile(
        path.join(artifactRoot, 'viewport-renders', 'project-render-backend', 'render-backend-draft', 'performance-report.json'),
        'utf8',
      ))
      expect(performanceReport.readiness).toMatchObject({
        severity: 'ready',
        shouldHold: false,
        runtimeTarget: 'local-worker',
      })
      expect(performanceReport.readiness.estimatedMemoryMb).toBeGreaterThan(0)
    } finally {
      await rm(artifactRoot, { recursive: true, force: true })
    }
  })

  it('does not pretend review MP4 or final video exists without a media renderer', async () => {
    const artifactRoot = await mkdtemp(path.join(os.tmpdir(), 'aethel-render-backend-'))

    try {
      const result = await renderViewportBackendArtifacts({
        jobType: VIEWPORT_RENDER_QUEUE_JOB_TYPE,
        payload: buildPayload('review'),
      }, {
        artifactRoot,
        capturedAt: '2026-05-11T16:03:00.000Z',
        jobId: 'review-job-1',
      })

      expect(result.renderer.blockedKinds).toEqual(['review-mp4'])
      expect(result.renderer.readiness.severity).not.toBe('held')
      expect(result.evidence.artifacts.some((artifact) => artifact.kind === 'review-mp4')).toBe(false)
      expect(result.evidence.validation.playbackOk).toBe(false)
      expect(result.evidence.notes.join(' ')).toContain('Media outputs still require a real FFmpeg/native/cloud renderer')
    } finally {
      await rm(artifactRoot, { recursive: true, force: true })
    }
  })

  it('resolves artifact URLs without allowing path traversal', () => {
    const resolved = resolveViewportRenderArtifactUrl(
      'aethel-artifact://viewport-render/project-one/render-one/thumbnail.svg',
      '/tmp/aethel-artifacts',
    )

    expect(resolved.filePath).toContain('viewport-renders')
    expect(resolved.contentType).toBe('image/svg+xml; charset=utf-8')
    expect(() => resolveViewportRenderArtifactUrl(
      'aethel-artifact://viewport-render/project-one/render-one/..%2Fsecret.json',
      '/tmp/aethel-artifacts',
    )).toThrow(ViewportRenderArtifactReadError)
  })
})
