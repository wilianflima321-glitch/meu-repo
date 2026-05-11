import { describe, expect, it } from 'vitest'

import {
  buildViewportRenderArtifactAccessUrl,
  isViewportRenderArtifactUrl,
  withViewportRenderArtifactAccess,
} from '@/lib/viewport/viewport-render-artifact-access'

describe('viewport render artifact access helpers', () => {
  it('builds project-authenticated access URLs for internal render artifacts', () => {
    const artifactUrl = 'aethel-artifact://viewport-render/project-1/render-1/thumbnail.svg'
    const accessUrl = buildViewportRenderArtifactAccessUrl({
      projectId: 'project-1',
      artifactUrl,
    })

    expect(isViewportRenderArtifactUrl(artifactUrl)).toBe(true)
    expect(accessUrl).toBe(
      '/api/projects/project-1/production-state/render-job/artifact?artifactUrl=aethel-artifact%3A%2F%2Fviewport-render%2Fproject-1%2Frender-1%2Fthumbnail.svg',
    )
  })

  it('keeps external media URLs direct while proxying internal artifacts', () => {
    expect(withViewportRenderArtifactAccess({
      kind: 'thumbnail',
      url: 'aethel-artifact://viewport-render/project-1/render-1/thumbnail.svg',
    }, 'project-1')).toMatchObject({
      accessMode: 'project-authenticated-proxy',
    })

    expect(withViewportRenderArtifactAccess({
      kind: 'final-video',
      url: 'https://cdn.example.test/final.mp4',
    }, 'project-1')).toMatchObject({
      accessUrl: 'https://cdn.example.test/final.mp4',
      accessMode: 'direct-url',
    })
  })
})
