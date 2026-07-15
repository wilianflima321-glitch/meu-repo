import { vi } from 'vitest'

import {
  buildViewportAssetImportPersistenceRequest,
  canPersistViewportAssetImport,
  persistViewportAssetImportBatch,
} from '@/lib/viewport/viewport-asset-import-persistence'
import { buildViewportAssetImportBatch, buildViewportImportedObjects } from '@/lib/viewport/viewport-asset-import'

function buildBatch() {
  return buildViewportAssetImportBatch(
    buildViewportImportedObjects({
      existingCount: 0,
      importedAt: '2026-05-11T12:00:00.000Z',
      files: [{ fileName: 'Arena.glb', sizeBytes: 1024 }],
    }),
    { id: 'batch-arena', importedAt: '2026-05-11T12:00:00.000Z' },
  )
}

describe('viewport asset import persistence client', () => {
  it('builds an authenticated request to durable production state', () => {
    const request = buildViewportAssetImportPersistenceRequest('project-1', buildBatch(), 'token-1')
    expect(request.url).toBe('/api/projects/project-1/production-state/asset-import')
    expect(request.init.method).toBe('POST')
    expect(request.init.headers).toMatchObject({
      Authorization: 'Bearer token-1',
      'Content-Type': 'application/json',
    })
    expect(JSON.parse(String(request.init.body))).toMatchObject({
      batch: {
        projectId: 'project-1',
        id: 'batch-arena',
        evidenceRefs: expect.arrayContaining(['viewport:asset-import:batch-arena']),
      },
    })
  })

  it('skips local projects instead of pretending persistence succeeded', async () => {
    expect(canPersistViewportAssetImport('local-project')).toBe(false)
    const result = await persistViewportAssetImportBatch({
      projectId: 'local-project',
      batch: buildBatch(),
      fetcher: vi.fn(),
    })
    expect(result.ok).toBe(false)
    expect(result.status).toBe(0)
  })
})
