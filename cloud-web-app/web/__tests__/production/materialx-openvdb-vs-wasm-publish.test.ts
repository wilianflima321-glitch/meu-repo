/**
 * R17 — MaterialX standard_surface + OpenVDB header + VS→WASM publish refuse.
 */

import { describe, expect, it } from 'vitest'

import {
  MATERIALX_PRODUCT_READY,
  parseMaterialXStandardSurface,
  refusePackWithoutMaterialXEvidence,
  sealMaterialXSubstrateReceipt,
} from '@/lib/production/materialx-standard-surface-substrate'
import {
  OPENVDB_PRODUCT_READY,
  buildOpenVdbHeaderFixture,
  parseOpenVdbHeader,
  refusePackWithoutOpenVdbEvidence,
  sealOpenVdbHeaderReceipt,
} from '@/lib/production/openvdb-header-substrate'
import {
  VS_WASM_BYTECODE_SHIP_READY,
  refusePackWithoutVsWasmBytecodeEvidence,
  sealVisualScriptBytecodeShipReceipt,
  transpileProjectScripts,
} from '@/lib/production/visual-script-transpile-stage'
import {
  MATERIALX_PRODUCT_READY as orchMaterialX,
  OPENVDB_PRODUCT_READY as orchOpenVdb,
  VS_WASM_BYTECODE_SHIP_READY as orchVsWasm,
  refusePackWithoutMaterialXEvidence as orchRefuseMtlx,
  refusePackWithoutOpenVdbEvidence as orchRefuseVdb,
} from '@/lib/production/publish-pipeline-orchestrator'

const SAMPLE_MTLX = `<?xml version="1.0"?>
<materialx version="1.38">
  <standard_surface name="Default">
    <input name="base_color" type="color3" value="0.2, 0.4, 0.8" />
    <input name="specular_roughness" type="float" value="0.35" />
    <input name="metalness" type="float" value="0.1" />
  </standard_surface>
</materialx>`

describe('MaterialX standard_surface substrate', () => {
  it('parses standard_surface into PBR floats', () => {
    const parsed = parseMaterialXStandardSurface(SAMPLE_MTLX)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.value.baseColor).toEqual([0.2, 0.4, 0.8])
    expect(parsed.value.specularRoughness).toBe(0.35)
    expect(parsed.value.metalness).toBe(0.1)
    expect(parsed.value.inputCount).toBe(3)
  })

  it('refuses missing standard_surface and empty payload', () => {
    expect(parseMaterialXStandardSurface('<materialx></materialx>').ok).toBe(false)
    expect(parseMaterialXStandardSurface('').ok).toBe(false)
  })

  it('seals PARTIAL receipt with product flags false', () => {
    const sealed = sealMaterialXSubstrateReceipt(SAMPLE_MTLX)
    expect(sealed.ok).toBe(true)
    if (!sealed.ok) return
    expect(sealed.value.materialXProductReady).toBe(false)
    expect(sealed.value.shipStatus).toBe('PARTIAL')
    expect(sealed.value.fingerprint).toHaveLength(16)
    expect(MATERIALX_PRODUCT_READY).toBe(false)
  })

  it('refusePackWithoutMaterialXEvidence blocks product claims', () => {
    const blocked = refusePackWithoutMaterialXEvidence({ claimMaterialXProductReady: true })
    expect(blocked.ok).toBe(false)
    const ok = refusePackWithoutMaterialXEvidence({
      materialXPayloads: [SAMPLE_MTLX],
    })
    expect(ok.ok).toBe(true)
    if (!ok.ok) return
    expect(ok.materialXProductReady).toBe(false)
    expect(ok.receipts).toHaveLength(1)
  })
})

describe('OpenVDB header substrate', () => {
  it('parses VDB magic + version and seals header-only fixture', () => {
    const fixture = buildOpenVdbHeaderFixture(224)
    const parsed = parseOpenVdbHeader(fixture)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.value.fileVersion).toBe(224)
    expect(parsed.value.sparseLeafIngestHeld).toBe(true)

    const sealed = sealOpenVdbHeaderReceipt(fixture)
    expect(sealed.ok).toBe(true)
    if (!sealed.ok) return
    expect(sealed.value.openVdbProductReady).toBe(false)
    expect(OPENVDB_PRODUCT_READY).toBe(false)
  })

  it('refuses invalid magic and product claims', () => {
    expect(parseOpenVdbHeader(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])).ok).toBe(false)
    expect(refusePackWithoutOpenVdbEvidence({ claimOpenVdbProductReady: true }).ok).toBe(false)
    const ok = refusePackWithoutOpenVdbEvidence({
      volumeVdbPayloads: [buildOpenVdbHeaderFixture()],
    })
    expect(ok.ok).toBe(true)
    if (!ok.ok) return
    expect(ok.openVdbProductReady).toBe(false)
  })

  it('refuses sparse-leaf body seal while still parsing magic', () => {
    const body = new Uint8Array(32)
    body.set(buildOpenVdbHeaderFixture(100))
    const parsed = parseOpenVdbHeader(body)
    expect(parsed.ok).toBe(true)
    expect(sealOpenVdbHeaderReceipt(body).ok).toBe(false)
  })
})

describe('VS→WASM bytecode ship receipt', () => {
  it('seals transpile fingerprint with wasmBytecodeShipReady false', () => {
    const result = transpileProjectScripts([])
    const receipt = sealVisualScriptBytecodeShipReceipt(result)
    expect(receipt.wasmBytecodeShipReady).toBe(false)
    expect(receipt.vsToTsTranspileReady).toBe(false)
    expect(VS_WASM_BYTECODE_SHIP_READY).toBe(false)

    const gate = refusePackWithoutVsWasmBytecodeEvidence({
      claimWasmBytecodeShipReady: true,
    })
    expect(gate.ok).toBe(false)

    const ok = refusePackWithoutVsWasmBytecodeEvidence({ transpile: result })
    expect(ok.ok).toBe(true)
    if (!ok.ok) return
    expect(ok.wasmBytecodeShipReady).toBe(false)
  })
})

describe('orchestrator re-exports R17 substrate gates', () => {
  it('keeps product flags false and refuse helpers wired', () => {
    expect(orchMaterialX).toBe(false)
    expect(orchOpenVdb).toBe(false)
    expect(orchVsWasm).toBe(false)
    expect(orchRefuseMtlx({ claimMaterialXProductReady: true }).ok).toBe(false)
    expect(orchRefuseVdb({ claimOpenVdbProductReady: true }).ok).toBe(false)
  })
})
