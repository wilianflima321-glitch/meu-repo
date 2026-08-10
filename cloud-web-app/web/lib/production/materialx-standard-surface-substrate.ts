/**
 * S1 / R17 — MaterialX `standard_surface` substrate (web cook path).
 *
 * Parses ASWF-style `.mtlx` ASCII for `standard_surface` inputs into PBR floats.
 * Product MaterialX / LookDev AAA claims stay fail-closed until S1 + S7 cook accept.
 * Mirrors kernel `materialx_bridge` honesty without shipping C++ MaterialX runtime.
 */

import { createHash } from 'node:crypto'

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('materialx-standard-surface-substrate')

/** Full MaterialX document + LookDev product — HELD. */
export const MATERIALX_PRODUCT_READY = false as const
export const MATERIALX_LOOKDEV_AAA_READY = false as const
export const MATERIALX_MARKETING_ALLOWED = false as const

export type MaterialXParseRejectCode =
  | 'empty_payload'
  | 'invalid_xml'
  | 'missing_standard_surface'
  | 'product_claim_held'
  | 'marketing_leak'

export type MaterialXParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: MaterialXParseRejectCode; message: string }

export type StandardSurfacePbr = {
  baseColor: [number, number, number]
  specularRoughness: number
  metalness: number
  inputCount: number
}

export type MaterialXSubstrateReceipt = {
  version: 1
  standardSurfaceParsed: true
  pbr: StandardSurfacePbr
  fingerprint: string
  materialXProductReady: false
  materialXLookdevAaaReady: false
  marketingAllowed: false
  shipStatus: 'PARTIAL'
}

function fingerprint(parts: string[]): string {
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16)
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}

function parseColor3(value: string): [number, number, number] | null {
  const parts = value.split(',').map((p) => p.trim())
  if (parts.length < 3) return null
  const r = Number(parts[0])
  const g = Number(parts[1])
  const b = Number(parts[2])
  if (![r, g, b].every(Number.isFinite)) return null
  return [clamp01(r), clamp01(g), clamp01(b)]
}

/**
 * Minimal MaterialX XML walk — finds `<standard_surface>` + `<input name value>`.
 * Not a full MaterialX graph evaluator (nodegraph / textures HELD).
 */
export function parseMaterialXStandardSurface(payload: string): MaterialXParseResult<StandardSurfacePbr> {
  const text = typeof payload === 'string' ? payload.trim() : ''
  if (!text) {
    return { ok: false, code: 'empty_payload', message: 'MaterialX payload empty' }
  }
  if (!text.includes('<') || !text.includes('>')) {
    return { ok: false, code: 'invalid_xml', message: 'MaterialX payload is not XML' }
  }

  const surfaceMatch = /<standard_surface\b[^>]*>([\s\S]*?)<\/standard_surface>/i.exec(text)
  if (!surfaceMatch) {
    return {
      ok: false,
      code: 'missing_standard_surface',
      message: 'No <standard_surface> node in MaterialX payload',
    }
  }

  const body = surfaceMatch[1] ?? ''
  const inputRe = /<input\b([^>]*)\/?>/gi
  let baseColor: [number, number, number] = [0.8, 0.8, 0.8]
  let specularRoughness = 0.5
  let metalness = 0
  let inputCount = 0
  let m: RegExpExecArray | null
  while ((m = inputRe.exec(body)) !== null) {
    const attrs = m[1] ?? ''
    const name = /\bname\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1]
    const value = /\bvalue\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1]
    if (!name || value === undefined) continue
    inputCount += 1
    if (name === 'base_color') {
      const color = parseColor3(value)
      if (color) baseColor = color
    } else if (name === 'specular_roughness') {
      const n = Number(value)
      if (Number.isFinite(n)) specularRoughness = clamp01(n)
    } else if (name === 'metalness' || name === 'metallic') {
      const n = Number(value)
      if (Number.isFinite(n)) metalness = clamp01(n)
    }
  }

  if (inputCount < 1) {
    return {
      ok: false,
      code: 'missing_standard_surface',
      message: 'standard_surface present but no <input> parameters',
    }
  }

  return {
    ok: true,
    value: { baseColor, specularRoughness, metalness, inputCount },
  }
}

export function sealMaterialXSubstrateReceipt(payload: string): MaterialXParseResult<MaterialXSubstrateReceipt> {
  if (MATERIALX_PRODUCT_READY || MATERIALX_LOOKDEV_AAA_READY || MATERIALX_MARKETING_ALLOWED) {
    return {
      ok: false,
      code: 'marketing_leak',
      message: 'MaterialX product/marketing flags must remain false',
    }
  }

  const parsed = parseMaterialXStandardSurface(payload)
  if (!parsed.ok) return parsed

  const pbr = parsed.value
  const fp = fingerprint([
    'materialx-ss-v1',
    pbr.baseColor.join(','),
    String(pbr.specularRoughness),
    String(pbr.metalness),
    String(pbr.inputCount),
  ])

  log.info('materialx_standard_surface_sealed', {
    fingerprint: fp,
    inputCount: pbr.inputCount,
    materialXProductReady: false,
  })

  return {
    ok: true,
    value: {
      version: 1,
      standardSurfaceParsed: true,
      pbr,
      fingerprint: fp,
      materialXProductReady: false,
      materialXLookdevAaaReady: false,
      marketingAllowed: false,
      shipStatus: 'PARTIAL',
    },
  }
}

/**
 * Publish refuse — product MaterialX claim without a sealed standard_surface parse.
 */
export function refusePackWithoutMaterialXEvidence(input: {
  claimMaterialXProductReady?: boolean
  materialXPayloads?: string[]
}):
  | { ok: true; receipts: MaterialXSubstrateReceipt[]; materialXProductReady: false }
  | { ok: false; code: MaterialXParseRejectCode; message: string } {
  if (input.claimMaterialXProductReady === true) {
    return {
      ok: false,
      code: 'product_claim_held',
      message: 'MaterialX product ready claim refused — S1/S7 LookDev bridge HELD',
    }
  }

  const payloads = input.materialXPayloads ?? []
  const receipts: MaterialXSubstrateReceipt[] = []
  for (const payload of payloads) {
    const sealed = sealMaterialXSubstrateReceipt(payload)
    if (!sealed.ok) {
      return { ok: false, code: sealed.code, message: sealed.message }
    }
    receipts.push(sealed.value)
  }

  return { ok: true, receipts, materialXProductReady: false }
}
