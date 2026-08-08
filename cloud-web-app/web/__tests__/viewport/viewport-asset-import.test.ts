import {
  buildViewportAssetEvidenceRef,
  buildViewportAssetImportBatch,
  buildViewportImportedObjects,
  coerceViewportAssetImportBatch,
  formatViewportAssetSize,
  getViewportAssetImportFormat,
} from '@/lib/viewport/viewport-asset-import'

describe('viewport asset import intake', () => {
  it('recognizes professional game and film asset formats without accepting arbitrary files', () => {
    expect(getViewportAssetImportFormat('hero.glb')).toBe('glb')
    expect(getViewportAssetImportFormat('cinematic_camera.FBX')).toBe('fbx')
    expect(getViewportAssetImportFormat('environment.usdz')).toBe('usdz')
    expect(getViewportAssetImportFormat('stage.usda')).toBe('usda')
    expect(getViewportAssetImportFormat('notes.txt')).toBeNull()
  })

  it('creates scene graph objects with provenance and license review metadata', () => {
    const objects = buildViewportImportedObjects({
      existingCount: 3,
      importedAt: '2026-05-11T10:00:00.000Z',
      files: [
        { fileName: 'Boss Arena.glb', sizeBytes: 6_291_456 },
        { fileName: 'dialogue-blocking.fbx', sizeBytes: 2_097_152 },
        { fileName: 'ignore.md', sizeBytes: 128 },
      ],
    })

    expect(objects).toHaveLength(2)
    expect(objects[0]).toMatchObject({
      name: 'Boss Arena',
      type: 'mesh',
      geometry: 'box',
      asset: {
        fileName: 'Boss Arena.glb',
        format: 'glb',
        licenseStatus: 'needs-review',
        qualityGate: 'raw-intake',
        evidenceRef: 'asset-import:boss-arena.glb:2026-05-11T10:00:00.000Z',
      },
    })
    expect(objects[1].asset?.format).toBe('fbx')
    expect(objects.map((object) => object.id)).toEqual([
      'asset-2026-05-11T10:00:00.000Z-0-boss-arena',
      'asset-2026-05-11T10:00:00.000Z-1-dialogue-blocking',
    ])
  })

  it('formats large asset sizes for compact viewport evidence', () => {
    expect(formatViewportAssetSize(512)).toBe('512 B')
    expect(formatViewportAssetSize(1536)).toBe('1.5 KB')
    expect(formatViewportAssetSize(6_291_456)).toBe('6.0 MB')
    expect(buildViewportAssetEvidenceRef('My Hero Asset!.glb', 't')).toBe('asset-import:my-hero-asset-.glb:t')
  })

  it('builds and coerces durable asset import batches for the Asset Graph', () => {
    const objects = buildViewportImportedObjects({
      existingCount: 0,
      importedAt: '2026-05-11T10:00:00.000Z',
      files: [{ fileName: 'Arena.usd', sizeBytes: 8192 }],
    })
    const batch = buildViewportAssetImportBatch(objects, {
      id: 'batch-1',
      projectId: 'project-1',
      importedAt: '2026-05-11T10:00:00.000Z',
    })

    expect(batch).toMatchObject({
      id: 'batch-1',
      projectId: 'project-1',
      source: 'viewport-drop',
      assets: [
        expect.objectContaining({
          objectName: 'Arena',
          metadata: expect.objectContaining({ format: 'usd' }),
        }),
      ],
    })
    expect(batch.evidenceRefs).toEqual([
      'viewport:asset-import:batch-1',
      'asset-import:arena.usd:2026-05-11T10:00:00.000Z',
    ])
    expect(coerceViewportAssetImportBatch({ batch })?.assets[0]?.metadata.fileName).toBe('Arena.usd')
    expect(coerceViewportAssetImportBatch({ batch: { assets: [] } })).toBeNull()
  })
})
