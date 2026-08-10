/**
 * J.7 deepen — USDA ASCII hierarchy wireframe honesty (not OpenUSD/Hydra).
 *
 * Parses standalone USDA / ASCII `.usd` for `def Xform` / `def Mesh` prims and
 * optional `extent` so the viewport can draw bounding-box wireframes with real
 * prim counts — never a solid mesh or capsule theater.
 *
 * Ship honesty:
 * - Full USDA/USD/USDC browser stage remains HELD
 * - This path is hierarchy_wireframe_only (placeholder deepen)
 * - Binary USDC crate magic → fail-closed (no invent)
 */

import { isUsdcCrateBytes } from '@/lib/production/usd-stage-intake'

export const USDA_HIERARCHY_PREVIEW_KIND = 'hierarchy_wireframe_only' as const

export type UsdaHierarchyPrimKind = 'Xform' | 'Mesh' | 'Other'

export type UsdaHierarchyBox = {
  path: string
  kind: UsdaHierarchyPrimKind
  center: [number, number, number]
  size: [number, number, number]
}

export type UsdaHierarchyPreview = {
  ok: boolean
  kind: typeof USDA_HIERARCHY_PREVIEW_KIND
  reason?: 'empty' | 'crate_binary' | 'no_prims' | 'not_ascii'
  primCount: number
  meshCount: number
  xformCount: number
  maxDepth: number
  boxes: UsdaHierarchyBox[]
  /** Short EN tooltip for viewport / inspector. */
  summary: string
}

const DEF_RE = /def\s+(\w+)\s+"([^"]+)"/g
const EXTENT_RE =
  /float3\[\]\s+extent\s*=\s*\[\s*\(\s*([-\d.eE+]+)\s*,\s*([-\d.eE+]+)\s*,\s*([-\d.eE+]+)\s*\)\s*,\s*\(\s*([-\d.eE+]+)\s*,\s*([-\d.eE+]+)\s*,\s*([-\d.eE+]+)\s*\)\s*\]/g

function looksMostlyAscii(text: string): boolean {
  if (!text.trim()) return false
  let bad = 0
  const n = Math.min(text.length, 4096)
  for (let i = 0; i < n; i++) {
    if (text.charCodeAt(i) === 0) bad += 4
  }
  return bad / n < 0.02
}

function braceDepthAt(text: string, index: number): number {
  let depth = 0
  for (let i = 0; i < index && i < text.length; i++) {
    const ch = text[i]
    if (ch === '{') depth += 1
    else if (ch === '}') depth = Math.max(0, depth - 1)
  }
  return depth
}

function boxFromExtent(
  path: string,
  kind: UsdaHierarchyPrimKind,
  min: [number, number, number],
  max: [number, number, number],
): UsdaHierarchyBox {
  const size: [number, number, number] = [
    Math.max(0.05, max[0] - min[0]),
    Math.max(0.05, max[1] - min[1]),
    Math.max(0.05, max[2] - min[2]),
  ]
  const center: [number, number, number] = [
    (min[0] + max[0]) / 2,
    (min[1] + max[1]) / 2,
    (min[2] + max[2]) / 2,
  ]
  return { path, kind, center, size }
}

function defaultBox(path: string, kind: UsdaHierarchyPrimKind, index: number): UsdaHierarchyBox {
  const offset = index * 0.35
  return {
    path,
    kind,
    center: [offset, 0.5, 0],
    size: kind === 'Mesh' ? [1.2, 1, 1] : [0.6, 0.6, 0.6],
  }
}

/**
 * Parse USDA ASCII into hierarchy wireframe preview metadata.
 * Accepts string or bytes; binary crate → fail-closed.
 */
export function parseUsdaHierarchyPreview(
  source: string | ArrayBuffer | Uint8Array,
): UsdaHierarchyPreview {
  const held = (reason: NonNullable<UsdaHierarchyPreview['reason']>): UsdaHierarchyPreview => ({
    ok: false,
    kind: USDA_HIERARCHY_PREVIEW_KIND,
    reason,
    primCount: 0,
    meshCount: 0,
    xformCount: 0,
    maxDepth: 0,
    boxes: [],
    summary: `USDA hierarchy HELD (${reason}) — not OpenUSD stage`,
  })

  let text: string
  if (typeof source === 'string') {
    text = source
  } else {
    const bytes = source instanceof Uint8Array ? source : new Uint8Array(source)
    if (bytes.byteLength === 0) return held('empty')
    if (isUsdcCrateBytes(bytes)) return held('crate_binary')
    text = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
  }

  if (!text.trim()) return held('empty')
  if (!looksMostlyAscii(text)) return held('not_ascii')

  type Prim = {
    kind: UsdaHierarchyPrimKind
    name: string
    index: number
    depth: number
    path: string
  }

  const prims: Prim[] = []
  const stack: string[] = []
  let meshCount = 0
  let xformCount = 0
  let maxDepth = 0

  DEF_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = DEF_RE.exec(text)) !== null) {
    const typeName = match[1]!
    const name = match[2]!
    const index = match.index
    const depth = braceDepthAt(text, index)
    while (stack.length > depth) stack.pop()

    const kind: UsdaHierarchyPrimKind =
      typeName === 'Xform' ? 'Xform' : typeName === 'Mesh' ? 'Mesh' : 'Other'
    const path = '/' + [...stack, name].join('/')
    prims.push({ kind, name, index, depth, path })
    if (kind === 'Mesh') meshCount += 1
    if (kind === 'Xform') xformCount += 1
    maxDepth = Math.max(maxDepth, path.split('/').filter(Boolean).length)

    // Parent names for nested children = current stack + this name once `{` opens.
    // Approximate: push name; next defs at greater depth see it.
    stack.push(name)
  }

  if (prims.length === 0) return held('no_prims')

  const boxes: UsdaHierarchyBox[] = []
  for (let i = 0; i < prims.length; i++) {
    const prim = prims[i]!
    if (prim.kind !== 'Mesh' && prim.kind !== 'Xform') continue
    const end = i + 1 < prims.length ? prims[i + 1]!.index : text.length
    const block = text.slice(prim.index, end)
    EXTENT_RE.lastIndex = 0
    const extent = EXTENT_RE.exec(block)
    if (extent) {
      const min: [number, number, number] = [Number(extent[1]), Number(extent[2]), Number(extent[3])]
      const max: [number, number, number] = [Number(extent[4]), Number(extent[5]), Number(extent[6])]
      if (min.every(Number.isFinite) && max.every(Number.isFinite)) {
        boxes.push(boxFromExtent(prim.path, prim.kind, min, max))
        continue
      }
    }
    boxes.push(defaultBox(prim.path, prim.kind, boxes.length))
  }

  return {
    ok: true,
    kind: USDA_HIERARCHY_PREVIEW_KIND,
    primCount: prims.length,
    meshCount,
    xformCount,
    maxDepth,
    boxes: boxes.slice(0, 32),
    summary: `USDA hierarchy wireframe: ${prims.length} prims (${meshCount} Mesh, ${xformCount} Xform), depth ${maxDepth} — not OpenUSD stage`,
  }
}

/** Compact serializable metadata for ViewportAssetImportMetadata. */
export type UsdaHierarchyPreviewMeta = {
  kind: typeof USDA_HIERARCHY_PREVIEW_KIND
  primCount: number
  meshCount: number
  xformCount: number
  maxDepth: number
  boxes: UsdaHierarchyBox[]
  summary: string
}

export function toUsdaHierarchyPreviewMeta(
  preview: UsdaHierarchyPreview,
): UsdaHierarchyPreviewMeta | undefined {
  if (!preview.ok) return undefined
  return {
    kind: preview.kind,
    primCount: preview.primCount,
    meshCount: preview.meshCount,
    xformCount: preview.xformCount,
    maxDepth: preview.maxDepth,
    boxes: preview.boxes,
    summary: preview.summary,
  }
}
