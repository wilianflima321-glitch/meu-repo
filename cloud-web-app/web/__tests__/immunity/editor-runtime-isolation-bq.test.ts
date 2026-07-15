/**
 * Letter bq — Editor ≠ Runtime isolation deepen (Zero-MVP honesty).
 * editorRuntimeIsolated flips when assertRuntimeExportClean gate is real;
 * v8WinitHostReady stays false.
 */

import { describe, expect, it } from 'vitest'
import {
  EDITOR_RUNTIME_BOUNDARY_WIRED,
  IDE_RUNTIME_DENY_PATH_MARKERS,
  assertPublishedBundleStripsEditor,
  assertRuntimeExportClean,
  evaluateEditorRuntimeBoundary,
  findDeniedIdePathMarkers,
  isEditorSurface,
  proveRuntimeExportCleanGate,
} from '@/lib/runtime/editor-runtime-boundary'
import {
  probeEditorRuntimeBoundaryWired,
  probeEditorRuntimeHonesty,
  proveEditorRuntimeIsolation,
} from '@/lib/runtime/editor-runtime-honesty'
import {
  evaluateAaaProductionHonesty,
  probeAaaProductionCapability,
} from '@/lib/immunity/aaa-production-capability'
import { FORBIDDEN_RUNTIME_PACKAGES } from '@/lib/production/publish-pipeline-orchestrator'

describe('Editor≠Runtime deny-list (bq)', () => {
  it('exposes non-empty IDE/Next deny markers and is wired', () => {
    expect(EDITOR_RUNTIME_BOUNDARY_WIRED).toBe(true)
    expect(IDE_RUNTIME_DENY_PATH_MARKERS.length).toBeGreaterThan(8)
    expect(IDE_RUNTIME_DENY_PATH_MARKERS).toContain('@aethel/ide-ui')
    expect(IDE_RUNTIME_DENY_PATH_MARKERS.some((m) => /next\//i.test(m))).toBe(true)
    expect(IDE_RUNTIME_DENY_PATH_MARKERS.some((m) => /app\/ide\//i.test(m))).toBe(true)
    expect(FORBIDDEN_RUNTIME_PACKAGES).toContain('@aethel/ide-ui')
  })

  it('findDeniedIdePathMarkers flags Next/IDE pack entrypoints', () => {
    const hits = findDeniedIdePathMarkers({
      packPaths: ['app/ide/page.tsx', 'packages/ide-ui/src/Dock.tsx', 'assets/cooked.aethelpack'],
    })
    expect(hits.some((h) => h.includes('app/ide/'))).toBe(true)
    expect(hits.some((h) => h.includes('packages/ide-ui/'))).toBe(true)

    const clean = findDeniedIdePathMarkers({
      packPaths: [
        'publish-manifest.json',
        'packages/engine/runtime-main.ts',
        'generated/boot.ts',
        'assets/cooked.aethelpack',
      ],
    })
    expect(clean).toEqual([])
  })
})

describe('assertRuntimeExportClean (bq)', () => {
  it('fail-closed on IDE package import', () => {
    const bad = assertRuntimeExportClean({
      sources: ["import { Dock } from '@aethel/ide-ui'\n"],
      packPaths: ['generated/leak.ts'],
    })
    expect(bad.clean).toBe(false)
    expect(bad.editorRuntimeIsolated).toBe(false)
    expect(bad.v8WinitHostReady).toBe(false)
    expect(bad.forbiddenPackagesHit.length).toBeGreaterThan(0)
  })

  it('fail-closed on Next/IDE pack path leak even without import text', () => {
    const bad = assertRuntimeExportClean({
      sources: ["import { tick } from '@aethel/engine/runtime'\n"],
      packPaths: ['app/studio/page.tsx', 'next/dist/server/next.js'],
    })
    expect(bad.clean).toBe(false)
    expect(bad.deniedPathMarkersHit.length).toBeGreaterThan(0)
    expect(bad.v8WinitHostReady).toBe(false)
  })

  it('passes clean engine-only export; V8+winit stays HELD', () => {
    const good = proveRuntimeExportCleanGate()
    expect(good.clean).toBe(true)
    expect(good.editorRuntimeIsolated).toBe(true)
    expect(good.v8WinitHostReady).toBe(false)
    expect(good.deniedPathMarkersHit).toEqual([])
    expect(good.forbiddenPackagesHit).toEqual([])
  })

  it('assertPublishedBundleStripsEditor still flags monaco / ide-ui', () => {
    expect(isEditorSurface('editor')).toBe(true)
    const bad = assertPublishedBundleStripsEditor(
      `import Editor from 'monaco-editor'\nimport { Dock } from '@aethel/ide-ui'\n`,
    )
    expect(bad.ok).toBe(false)
    expect(bad.v8WinitHostReady).toBe(false)
    expect(bad.v8IsolateHostReady).toBe(false)
    expect(bad.winitHostReady).toBe(false)

    const good = evaluateEditorRuntimeBoundary({
      surface: 'published-game',
      bundledSourceText: `import { tick } from '@aethel/engine/runtime'\n`,
      packPaths: ['packages/engine/runtime-main.ts'],
    })
    expect(good.ok).toBe(true)
  })
})

describe('Editor≠Runtime honesty (bq)', () => {
  it('editorRuntimeIsolated true after clean gate; v8WinitHostReady always false', () => {
    expect(probeEditorRuntimeBoundaryWired()).toBe(true)
    const proved = proveEditorRuntimeIsolation()
    expect(proved.clean).toBe(true)

    const honesty = probeEditorRuntimeHonesty()
    expect(honesty.editorRuntimeIsolated).toBe(true)
    expect(honesty.exportGateClean).toBe(true)
    expect(honesty.v8WinitHostReady).toBe(false)

    const forcedOff = probeEditorRuntimeHonesty({ exportGateClean: false })
    expect(forcedOff.editorRuntimeIsolated).toBe(false)
    expect(forcedOff.v8WinitHostReady).toBe(false)

    const leaky = probeEditorRuntimeHonesty({ forceLeaky: true })
    expect(leaky.editorRuntimeIsolated).toBe(false)
    expect(leaky.v8WinitHostReady).toBe(false)
  })

  it('aaa-production aggregate auto-proves editorRuntimeIsolated; V8+winit fail-closed', () => {
    const report = evaluateAaaProductionHonesty()
    expect(report.capability.editorRuntimeIsolated).toBe(true)
    expect(report.capability.editorRuntimeBoundaryReady).toBe(true)
    expect(report.capability.v8WinitHostReady).toBe(false)
    expect(report.capability.marketingAaaProductionAllowed).toBe(false)
    const gap3 = report.gaps.find((g) => g.id === 3)!
    expect(gap3.scaffoldStatus).toBe('CLOSED')
    expect(gap3.shipStatus).toBe('CLOSED')
    expect(gap3.notes.some((n) => /v8WinitHostReady/i.test(n))).toBe(true)

    const held = probeAaaProductionCapability({ editorRuntimeIsolatedProven: false })
    expect(held.editorRuntimeIsolated).toBe(false)
    expect(held.v8WinitHostReady).toBe(false)

    const leakHeld = probeAaaProductionCapability({ publishedBundleStripped: false })
    expect(leakHeld.editorRuntimeIsolated).toBe(false)
    expect(leakHeld.editorRuntimeBoundaryReady).toBe(false)
  })
})
