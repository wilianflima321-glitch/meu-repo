/**
 * WebIDEBackend ISceneService.setColor — live viewport store mutator.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { WebIDEBackend } from '@/lib/ide/WebIDEBackend'
import { useViewportStore } from '@/lib/viewport/useViewportStore'
import { viewportSeedObjects } from '@/components/viewport/viewport-model'
import type { ViewportAssetImportMetadata } from '@/lib/viewport/viewport-asset-import'

describe('WebSceneService.setColor', () => {
  beforeEach(() => {
    useViewportStore.setState({
      objects: viewportSeedObjects.map((o) => ({ ...o })),
      selectedIds: [viewportSeedObjects[0]!.id],
    })
  })

  it('updates store color for a primitive mesh (R3F paints object.color)', () => {
    const backend = new WebIDEBackend('draft', 'proj-color')
    const id = 'airlock-shell'
    const result = backend.scene.setColor(id, '#ff00aa')
    expect(result).toEqual({ ok: true })
    const live = useViewportStore.getState().objects.find((o) => o.id === id)
    expect(live?.color).toBe('#ff00aa')
    expect(backend.scene.getNodes().find((n) => n.id === id)?.color).toBe('#ff00aa')
  })

  it('fail-closed for missing node and invalid color', () => {
    const backend = new WebIDEBackend('draft', 'proj-color')
    expect(backend.scene.setColor('no-such-node', '#ffffff')).toEqual({
      ok: false,
      reason: 'missing_node',
    })
    expect(backend.scene.setColor('airlock-shell', 'not-a-color')).toEqual({
      ok: false,
      reason: 'invalid_color',
    })
  })

  it('fail-closed when node has no live color channel (imported meshUrl)', () => {
    const asset: ViewportAssetImportMetadata = {
      fileName: 'a.glb',
      format: 'glb',
      sizeBytes: 1024,
      source: 'drag-drop',
      importedAt: new Date().toISOString(),
      licenseStatus: 'needs-review',
      qualityGate: 'raw-intake',
      evidenceRef: 'test',
      viewerStatus: 'live',
    }
    useViewportStore.setState({
      objects: [
        {
          id: 'imported',
          name: 'Imported',
          type: 'mesh',
          color: '#112233',
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          meshUrl: 'https://cdn.example/a.glb',
          asset,
        },
      ],
      selectedIds: ['imported'],
    })
    const backend = new WebIDEBackend('draft', 'proj-color')
    const result = backend.scene.setColor('imported', '#abcdef')
    expect(result).toEqual({ ok: false, reason: 'no_color_support' })
    expect(useViewportStore.getState().objects[0]!.color).toBe('#112233')
  })
})
