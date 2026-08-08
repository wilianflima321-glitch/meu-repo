/**
 * J.7 deepen — USDA ASCII hierarchy wireframe honesty (not OpenUSD stage).
 */

import { describe, expect, it } from 'vitest'
import {
  parseUsdaHierarchyPreview,
  toUsdaHierarchyPreviewMeta,
  USDA_HIERARCHY_PREVIEW_KIND,
} from '@/lib/viewport/usda-preview-hierarchy'
import { buildViewportImportedObjectsFromFiles } from '@/lib/viewport/viewport-asset-import'
import { USD_BROWSER_FORMAT_SUPPORT } from '@/lib/production/usd-integrator'

const SAMPLE_USDA = `#usda 1.0
def Xform "Root" {
  def Mesh "Body" {
    float3[] extent = [(-1, -0.5, -1), (1, 0.5, 1)]
  }
  def Xform "Prop" {
    def Mesh "Lid" {
    }
  }
}
`

describe('usda-preview-hierarchy', () => {
  it('parses nested Xform/Mesh + extent into wireframe boxes', () => {
    const preview = parseUsdaHierarchyPreview(SAMPLE_USDA)
    expect(preview.ok).toBe(true)
    expect(preview.kind).toBe(USDA_HIERARCHY_PREVIEW_KIND)
    expect(preview.primCount).toBeGreaterThanOrEqual(3)
    expect(preview.meshCount).toBe(2)
    expect(preview.xformCount).toBeGreaterThanOrEqual(2)
    expect(preview.maxDepth).toBeGreaterThanOrEqual(2)
    expect(preview.boxes.length).toBeGreaterThanOrEqual(2)
    const body = preview.boxes.find((b) => b.path.includes('Body'))
    expect(body?.size[0]).toBeCloseTo(2, 5)
    expect(preview.summary).toMatch(/not OpenUSD/i)
    expect(toUsdaHierarchyPreviewMeta(preview)?.primCount).toBe(preview.primCount)
  })

  it('fail-closes empty, crate magic, and no-prims', () => {
    expect(parseUsdaHierarchyPreview('').reason).toBe('empty')
    const crate = new Uint8Array([0x50, 0x58, 0x52, 0x2d, 0x55, 0x53, 0x44, 0x43, 0x00])
    expect(parseUsdaHierarchyPreview(crate).reason).toBe('crate_binary')
    expect(parseUsdaHierarchyPreview('#usda 1.0\n').reason).toBe('no_prims')
  })

  it('keeps USDA shipStatus HELD — hierarchy deepen is not OpenUSD theater', () => {
    expect(USD_BROWSER_FORMAT_SUPPORT.usda.shipStatus).toBe('HELD')
    expect(USD_BROWSER_FORMAT_SUPPORT.usda.claim).toMatch(/hierarchy wireframe/i)
    expect(USD_BROWSER_FORMAT_SUPPORT.usda.claim).toMatch(/not OpenUSD/i)
  })

  it('file drop attaches usdaHierarchy metadata without meshUrl', async () => {
    const bytes = new TextEncoder().encode(SAMPLE_USDA)
    // Vitest File polyfill may lack .text() — provide a Blob-backed shim.
    const file = {
      name: 'Arena.usda',
      size: bytes.byteLength,
      type: 'model/vnd.usda',
      arrayBuffer: async () =>
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      text: async () => SAMPLE_USDA,
    } as unknown as File

    const objects = await buildViewportImportedObjectsFromFiles({
      existingCount: 0,
      files: [file],
      importedAt: '2026-08-08T17:00:00.000Z',
    })
    expect(objects).toHaveLength(1)
    expect(objects[0]?.meshUrl).toBeUndefined()
    expect(objects[0]?.asset?.viewerStatus).toBe('held')
    expect(objects[0]?.asset?.usdaHierarchy?.kind).toBe(USDA_HIERARCHY_PREVIEW_KIND)
    expect(objects[0]?.asset?.usdaHierarchy?.meshCount).toBe(2)
    expect(objects[0]?.asset?.hierarchyPreserved).toBe(true)
  })

  it('buildViewportImportedObject accepts usdaHierarchy meta without meshUrl', async () => {
    const preview = parseUsdaHierarchyPreview(SAMPLE_USDA)
    const meta = toUsdaHierarchyPreviewMeta(preview)!
    const { buildViewportImportedObject } = await import('@/lib/viewport/viewport-asset-import')
    const object = buildViewportImportedObject({
      existingCount: 0,
      importedAt: '2026-08-08T17:00:00.000Z',
      index: 0,
      file: {
        fileName: 'Prop.usda',
        sizeBytes: SAMPLE_USDA.length,
        viewerStatus: 'held',
        hierarchyPreserved: true,
        meshCount: meta.meshCount,
        usdaHierarchy: meta,
      },
    })
    expect(object?.meshUrl).toBeUndefined()
    expect(object?.asset?.usdaHierarchy?.kind).toBe(USDA_HIERARCHY_PREVIEW_KIND)
    expect(object?.asset?.usdaHierarchy?.boxes.length).toBeGreaterThan(0)
  })
})
