/**
 * J.7 — USD / USDA / USDZ browser viewer honesty matrix.
 * USDZ preview = PARTIAL (Three.js USDZLoader); USDA/USD/USDC = HELD.
 * Never claim OpenUSD/Pixar Hydra; never ship proxy capsule as character.
 */

import { describe, expect, it } from 'vitest'

import {
  USD_BROWSER_FORMAT_SUPPORT,
  USD_BROWSER_VIEWER_SHIP_STATUS,
  USD_INTEGRATOR_HONESTY,
  evaluateUsdzPreviewEligibility,
  evaluateUsdCharacterShipGate,
  resolveUsdBrowserFormatSupport,
  resolveUsdImportViewerStatus,
} from '@/lib/production/usd-integrator'
import {
  buildViewportImportedObject,
  buildViewportImportedObjectsFromFiles,
  getViewportAssetImportFormat,
} from '@/lib/viewport/viewport-asset-import'

describe('J.7 USD browser format support matrix', () => {
  it('aggregates PARTIAL — USDZ preview only, not full OpenUSD stage', () => {
    expect(USD_BROWSER_VIEWER_SHIP_STATUS).toBe('PARTIAL')
    expect(USD_BROWSER_FORMAT_SUPPORT.usdz.shipStatus).toBe('PARTIAL')
    expect(USD_BROWSER_FORMAT_SUPPORT.usdz.browserLoader).toBe('three-usdzloader')
    expect(USD_BROWSER_FORMAT_SUPPORT.usdz.viewerStatus).toBe('live')
    expect(USD_BROWSER_FORMAT_SUPPORT.usda.shipStatus).toBe('HELD')
    expect(USD_BROWSER_FORMAT_SUPPORT.usd.shipStatus).toBe('HELD')
    expect(USD_BROWSER_FORMAT_SUPPORT.usdc.shipStatus).toBe('HELD')
    expect(USD_BROWSER_FORMAT_SUPPORT.usdz.claim).toMatch(/Not OpenUSD/i)
    expect(USD_BROWSER_FORMAT_SUPPORT.usdz.claim).not.toMatch(/\bIMPLEMENTED\b/)
  })

  it('resolves per-format viewer status honestly', () => {
    expect(resolveUsdImportViewerStatus('usdz')).toBe('live')
    expect(resolveUsdImportViewerStatus('usd')).toBe('held')
    expect(resolveUsdImportViewerStatus('usda')).toBe('held')
    expect(resolveUsdImportViewerStatus('glb')).toBe('live')
    expect(resolveUsdBrowserFormatSupport('usdc')?.viewerStatus).toBe('held')
    expect(resolveUsdBrowserFormatSupport('fbx')).toBeNull()
  })

  it('fail-closes USDZ eligibility without ZIP magic — never empty success theater', () => {
    expect(evaluateUsdzPreviewEligibility(new ArrayBuffer(0)).eligible).toBe(false)
    expect(evaluateUsdzPreviewEligibility(new ArrayBuffer(0)).reason).toBe('empty_payload')

    const notZip = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04])
    const denied = evaluateUsdzPreviewEligibility(notZip)
    expect(denied.eligible).toBe(false)
    expect(denied.reason).toBe('not_zip_container')

    const zipMagic = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00])
    const ok = evaluateUsdzPreviewEligibility(zipMagic)
    expect(ok.eligible).toBe(true)
  })

  it('rejects full USD stage / AAA claims even when USDZ preview is live', () => {
    const fullStage = evaluateUsdCharacterShipGate({
      shipKind: 'character',
      format: 'usdz',
      claimFullUsdStage: true,
    })
    expect(fullStage.allowed).toBe(false)
    expect(fullStage.reason).toBe('usd_viewer_held')
    expect(fullStage.message).toBe(USD_INTEGRATOR_HONESTY.noFullUsdStage)

    const aaa = evaluateUsdCharacterShipGate({
      shipKind: 'character',
      format: 'usdz',
      claimShippedAaa: true,
    })
    expect(aaa.allowed).toBe(false)
    expect(aaa.reason).toBe('usd_viewer_held')
  })

  it('keeps proxy capsule forbidden (Law XVI / J.7)', () => {
    const gate = evaluateUsdCharacterShipGate({
      shipKind: 'character',
      geometryProxy: 'capsule',
      format: 'usdz',
    })
    expect(gate.allowed).toBe(false)
    expect(gate.reason).toBe('proxy_capsule_forbidden')
  })

  it('USDA/USD intake stays HELD without meshUrl; USDZ with meshUrl is live preview', () => {
    expect(getViewportAssetImportFormat('set.usda')).toBe('usda')

    const usdHeld = buildViewportImportedObject({
      existingCount: 0,
      importedAt: '2026-08-08T12:00:00.000Z',
      index: 0,
      file: { fileName: 'Arena.usd', sizeBytes: 100 },
    })
    expect(usdHeld?.asset?.viewerStatus).toBe('held')
    expect(usdHeld?.meshUrl).toBeUndefined()
    expect(usdHeld?.asset?.qualityGate).toBe('raw-intake')

    const usdzLive = buildViewportImportedObject({
      existingCount: 0,
      importedAt: '2026-08-08T12:00:00.000Z',
      index: 0,
      file: {
        fileName: 'Prop.usdz',
        sizeBytes: 2048,
        meshUrl: 'blob:usdz-preview',
        hierarchyPreserved: true,
        viewerStatus: 'live',
      },
    })
    expect(usdzLive?.asset?.viewerStatus).toBe('live')
    expect(usdzLive?.meshUrl).toBe('blob:usdz-preview')
    expect(usdzLive?.asset?.qualityGate).toBe('preview-ready')
    expect(usdzLive?.asset?.hierarchyPreserved).toBe(true)
  })

  it('buildViewportImportedObjectsFromFiles wires USDZ object URL and holds USDA', async () => {
    const usdzBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00])
    const usdaText = '#usda 1.0\ndef Xform "Root" {}\n'
    const files = [
      new File([usdzBytes], 'hero.usdz', { type: 'model/vnd.usdz+zip' }),
      new File([usdaText], 'stage.usda', { type: 'model/vnd.usda' }),
    ]

    const objects = await buildViewportImportedObjectsFromFiles({
      existingCount: 0,
      files,
      importedAt: '2026-08-08T12:00:00.000Z',
    })

    expect(objects).toHaveLength(2)
    const usdz = objects.find((o) => o.asset?.format === 'usdz')
    const usda = objects.find((o) => o.asset?.format === 'usda')
    expect(usdz?.meshUrl).toMatch(/^blob:/)
    expect(usdz?.asset?.viewerStatus).toBe('live')
    expect(usda?.meshUrl).toBeUndefined()
    expect(usda?.asset?.viewerStatus).toBe('held')
  })
})
