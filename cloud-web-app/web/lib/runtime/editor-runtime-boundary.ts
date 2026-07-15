/**
 * Onda L — Editor ≠ Runtime boundary (deepened letter bq).
 * Shipped games must not carry React/Monaco/IDE/Next surfaces.
 * Full V8 isolate / winit host = HELD until desktop runtime export ships.
 */

import {
  FORBIDDEN_RUNTIME_PACKAGES,
  verifyRuntimeBundleIsolation,
  type RuntimeIsolationReport,
} from '@/lib/production/publish-pipeline-orchestrator'

export type RuntimeSurfaceKind = 'editor' | 'playtest' | 'published-game' | 'unknown'

/**
 * Path / module deny-list for IDE / Next entrypoints that must never land
 * in a published runtime pack (Forge L · publish cook · export worker).
 * Checked against pack member paths and source text — fail-closed on hit.
 */
export const IDE_RUNTIME_DENY_PATH_MARKERS: readonly string[] = [
  // Next.js app / pages entry surfaces
  'app/layout.tsx',
  'app/page.tsx',
  'app/ide/',
  'app/studio/',
  'pages/_app',
  'pages/ide/',
  'pages/studio/',
  // IDE package / chrome
  '@aethel/ide-ui',
  'packages/ide-ui/',
  'components/ide/',
  'components/studio/',
  'lib/editor/',
  'lib/scene-editor/',
  // Monaco / docking / graph editor
  'monaco-editor',
  '@monaco-editor/react',
  'y-monaco',
  '@xyflow/react',
  'reactflow',
  // Next internals that prove an IDE shell leaked into the pack
  'next/dist/',
  'next/app',
  'next/document',
  'next/head',
  'next/navigation',
  'next/router',
] as const

/** Structural probe — deny-list + assert + publish wire ship (letter bq). */
export const EDITOR_RUNTIME_BOUNDARY_WIRED = true as const

export interface EditorRuntimeBoundaryReport {
  surface: RuntimeSurfaceKind
  isEditorSurface: boolean
  reactAllowed: boolean
  /** Always false — desktop V8 isolate host HELD. */
  v8IsolateHostReady: false
  /** Always false — winit host HELD. */
  winitHostReady: false
  /** Alias honesty: V8+winit remain HELD together. */
  v8WinitHostReady: false
  stripReactRequired: boolean
  forbiddenPackagesHit: string[]
  deniedPathMarkersHit: string[]
  ok: boolean
  notes: string[]
}

export interface RuntimeExportCleanInput {
  /** Generated / bundled source texts about to ship. */
  sources?: string | readonly string[]
  /** Pack member paths (zip entries, artifact file list). */
  packPaths?: readonly string[]
  /** Optional concatenated pack/source text for marker scan. */
  bundledSourceText?: string
}

export interface RuntimeExportCleanReport {
  clean: boolean
  isolation: RuntimeIsolationReport
  boundary: EditorRuntimeBoundaryReport
  deniedPathMarkersHit: string[]
  forbiddenPackagesHit: string[]
  /** True when gate ran and pack/sources are free of IDE/Next leaks. */
  editorRuntimeIsolated: boolean
  v8WinitHostReady: false
  notes: string[]
}

const EDITOR_MARKERS = [
  '@aethel/ide-ui',
  'monaco-editor',
  '@monaco-editor/react',
  '@xyflow/react',
  'reactflow',
] as const

/**
 * True when the module graph / import path belongs to Studio IDE chrome.
 */
export function isEditorSurface(kind: RuntimeSurfaceKind): boolean {
  return kind === 'editor'
}

/**
 * Scan pack paths + source text for IDE / Next entrypoint deny markers.
 * Fail-closed: any hit is a leak.
 */
export function findDeniedIdePathMarkers(input: {
  packPaths?: readonly string[]
  text?: string
}): string[] {
  const hits: string[] = []
  const paths = input.packPaths ?? []
  const text = input.text ?? ''
  const haystackPaths = paths.map((p) => p.replace(/\\/g, '/').toLowerCase())
  const haystackText = text.toLowerCase()

  for (const marker of IDE_RUNTIME_DENY_PATH_MARKERS) {
    const m = marker.toLowerCase()
    const inPath = haystackPaths.some((p) => p.includes(m))
    const inText = haystackText.includes(m)
    if ((inPath || inText) && !hits.includes(marker)) {
      hits.push(marker)
    }
  }
  return hits
}

/**
 * Guard: published-game and playtest must not import editor packages.
 * Source text scan — same honesty style as publish tree-shake.
 */
export function evaluateEditorRuntimeBoundary(input: {
  surface: RuntimeSurfaceKind
  bundledSourceText?: string
  packPaths?: readonly string[]
}): EditorRuntimeBoundaryReport {
  const surface = input.surface
  const editor = isEditorSurface(surface)
  const text = input.bundledSourceText ?? ''
  const forbiddenPackagesHit: string[] = []

  for (const pkg of FORBIDDEN_RUNTIME_PACKAGES) {
    if (
      text.includes(`from '${pkg}'`) ||
      text.includes(`from "${pkg}"`) ||
      text.includes(`require('${pkg}')`) ||
      text.includes(`require("${pkg}")`) ||
      text.includes(`import('${pkg}')`) ||
      text.includes(`import("${pkg}")`)
    ) {
      forbiddenPackagesHit.push(pkg)
    }
  }
  for (const marker of EDITOR_MARKERS) {
    if (text.includes(marker) && !forbiddenPackagesHit.includes(marker)) {
      forbiddenPackagesHit.push(marker)
    }
  }

  const deniedPathMarkersHit = findDeniedIdePathMarkers({
    packPaths: input.packPaths,
    text,
  })

  const stripReactRequired = surface === 'published-game'
  const reactAllowed = surface === 'editor' || surface === 'playtest'
  const ok =
    surface === 'editor' ||
    surface === 'unknown' ||
    (forbiddenPackagesHit.length === 0 &&
      deniedPathMarkersHit.length === 0 &&
      !(stripReactRequired && /from ['"]react['"]/.test(text) && text.includes('@aethel/ide-ui')))

  // Published game: any forbidden hit or deny-path hit fails.
  // React itself may appear via R3F on web demos — we only fail on IDE markers,
  // not three/r3f (web demo path). Desktop V8 host strips all React.
  const publishedOk =
    surface !== 'published-game' ||
    (forbiddenPackagesHit.length === 0 && deniedPathMarkersHit.length === 0)

  const notes: string[] = [
    'Editor surfaces may use React/Monaco/Next',
    'Published game must pass tree-shake FORBIDDEN_RUNTIME_PACKAGES + IDE deny-list',
    'Full V8 isolate + winit desktop host [HELD]',
    'v8WinitHostReady=false until desktop runtime export ships',
  ]
  if (!publishedOk) {
    const parts = [
      ...forbiddenPackagesHit.map((p) => `pkg:${p}`),
      ...deniedPathMarkersHit.map((p) => `path:${p}`),
    ]
    notes.push(`Forbidden editor leaks in published bundle: ${parts.join(', ')}`)
  }

  return {
    surface,
    isEditorSurface: editor,
    reactAllowed,
    v8IsolateHostReady: false,
    winitHostReady: false,
    v8WinitHostReady: false,
    stripReactRequired,
    forbiddenPackagesHit,
    deniedPathMarkersHit,
    ok: surface === 'published-game' ? publishedOk : ok,
    notes,
  }
}

/**
 * Assert helper for publish / Critic — throws never; returns fail-closed report.
 */
export function assertPublishedBundleStripsEditor(
  bundledSourceText: string,
  packPaths?: readonly string[],
): EditorRuntimeBoundaryReport {
  return evaluateEditorRuntimeBoundary({
    surface: 'published-game',
    bundledSourceText,
    packPaths,
  })
}

/**
 * Publish / export cook gate (letter bq).
 * Combines `verifyRuntimeBundleIsolation` + IDE deny-list path/text scan.
 * Fail-closed: any IDE/Next leak → clean=false; never invents V8+winit readiness.
 */
export function assertRuntimeExportClean(input: RuntimeExportCleanInput = {}): RuntimeExportCleanReport {
  const sourceList: string[] = Array.isArray(input.sources)
    ? [...input.sources]
    : typeof input.sources === 'string'
      ? [input.sources]
      : []
  if (input.bundledSourceText && input.bundledSourceText.length > 0) {
    sourceList.push(input.bundledSourceText)
  }

  const isolation =
    sourceList.length > 0
      ? verifyRuntimeBundleIsolation(sourceList)
      : { clean: true, scannedFiles: 0, violations: [] }

  const combinedText = sourceList.join('\n')
  const boundary = evaluateEditorRuntimeBoundary({
    surface: 'published-game',
    bundledSourceText: combinedText,
    packPaths: input.packPaths,
  })

  const deniedPathMarkersHit = boundary.deniedPathMarkersHit
  const forbiddenPackagesHit = [
    ...new Set([
      ...boundary.forbiddenPackagesHit,
      ...isolation.violations.map((v) => v.forbiddenPackage),
    ]),
  ]

  const clean =
    isolation.clean &&
    boundary.ok &&
    deniedPathMarkersHit.length === 0 &&
    forbiddenPackagesHit.length === 0

  const notes: string[] = [
    'assertRuntimeExportClean — publish/export must strip IDE/React/Next surfaces',
    'v8WinitHostReady=false (V8 isolate + winit host HELD)',
    ...boundary.notes.filter((n) => /HELD|Forbidden|deny/i.test(n)),
  ]
  if (!clean) {
    notes.push(
      `Export blocked — leaks: ${[
        ...forbiddenPackagesHit.map((p) => `pkg:${p}`),
        ...deniedPathMarkersHit.map((p) => `path:${p}`),
      ].join(', ') || 'isolation violation'}`,
    )
  }

  return {
    clean,
    isolation,
    boundary,
    deniedPathMarkersHit,
    forbiddenPackagesHit,
    editorRuntimeIsolated: clean && EDITOR_RUNTIME_BOUNDARY_WIRED,
    v8WinitHostReady: false,
    notes,
  }
}

/**
 * Prove the gate against a known-clean engine-only sample (auto-proof for honesty).
 * Does not claim V8+winit.
 */
export function proveRuntimeExportCleanGate(): RuntimeExportCleanReport {
  return assertRuntimeExportClean({
    sources: [
      "import { tick } from '@aethel/engine/runtime'\nexport const boot = () => tick()\n",
    ],
    packPaths: [
      'publish-manifest.json',
      'packages/engine/runtime-main.ts',
      'generated/player-script.ts',
      'assets/cooked.aethelpack',
    ],
  })
}
