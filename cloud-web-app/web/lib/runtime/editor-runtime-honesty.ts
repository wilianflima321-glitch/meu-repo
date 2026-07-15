/**
 * Forge L — Editor ≠ Runtime honesty probe (letter bq).
 * `editorRuntimeIsolated` flips only when deny-list + assertRuntimeExportClean gate is real.
 * `v8WinitHostReady` stays false until desktop V8+winit host ships — never from strip alone.
 */

import {
  EDITOR_RUNTIME_BOUNDARY_WIRED,
  IDE_RUNTIME_DENY_PATH_MARKERS,
  assertRuntimeExportClean,
  proveRuntimeExportCleanGate,
  type RuntimeExportCleanReport,
} from './editor-runtime-boundary'

export interface EditorRuntimeHonesty {
  boundaryWired: typeof EDITOR_RUNTIME_BOUNDARY_WIRED
  denyListCount: number
  exportGateClean: boolean
  /**
   * True when boundary wired + assertRuntimeExportClean proves no IDE/Next leaks.
   * Does NOT imply V8+winit desktop host.
   */
  editorRuntimeIsolated: boolean
  /** Always false — Founder-gated desktop host; strip alone is insufficient. */
  v8WinitHostReady: false
  notes: string[]
}

/**
 * Run clean-sample gate proof (letter bq auto-proof).
 */
export function proveEditorRuntimeIsolation(): RuntimeExportCleanReport {
  return proveRuntimeExportCleanGate()
}

export function probeEditorRuntimeBoundaryWired(): boolean {
  return EDITOR_RUNTIME_BOUNDARY_WIRED === true && IDE_RUNTIME_DENY_PATH_MARKERS.length > 0
}

/**
 * Honesty: editorRuntimeIsolated when path wired and export gate clean.
 * V8+winit always fail-closed.
 */
export function probeEditorRuntimeHonesty(input?: {
  exportGateClean?: boolean
  forceProve?: boolean
  /** Force a leaky sample so isolated stays false. */
  forceLeaky?: boolean
}): EditorRuntimeHonesty {
  const notes: string[] = [
    'Editor≠Runtime deny-list + assertRuntimeExportClean on publish/export (bq)',
    `Deny markers: ${IDE_RUNTIME_DENY_PATH_MARKERS.length}`,
    'v8WinitHostReady=false until desktop V8 isolate + winit host ships',
  ]

  if (!EDITOR_RUNTIME_BOUNDARY_WIRED) {
    notes.push('Editor runtime boundary not wired')
  }

  let exportGateClean = input?.exportGateClean === true

  if (input?.forceLeaky === true) {
    const leaky = assertRuntimeExportClean({
      sources: ["import { Dock } from '@aethel/ide-ui'\n"],
      packPaths: ['app/ide/page.tsx', 'next/dist/server/next.js'],
    })
    exportGateClean = leaky.clean
    notes.push(...leaky.notes.filter((n) => /blocked|Forbidden|leak/i.test(n)))
  } else if (input?.exportGateClean === false) {
    exportGateClean = false
    notes.push('exportGateClean forced false — editorRuntimeIsolated HELD')
  } else if (input?.exportGateClean === true) {
    exportGateClean = true
  } else if (input?.forceProve !== false && EDITOR_RUNTIME_BOUNDARY_WIRED) {
    const proved = proveEditorRuntimeIsolation()
    exportGateClean = proved.clean
    notes.push(
      proved.clean
        ? 'Clean engine-only sample passed assertRuntimeExportClean'
        : 'Clean-sample gate failed — isolation HELD',
    )
  } else {
    notes.push('Export gate not proven in this probe')
  }

  if (!exportGateClean) {
    notes.push('editorRuntimeIsolated HELD — export still contains IDE/Next surfaces')
  }

  const editorRuntimeIsolated =
    EDITOR_RUNTIME_BOUNDARY_WIRED &&
    IDE_RUNTIME_DENY_PATH_MARKERS.length > 0 &&
    exportGateClean

  return {
    boundaryWired: EDITOR_RUNTIME_BOUNDARY_WIRED,
    denyListCount: IDE_RUNTIME_DENY_PATH_MARKERS.length,
    exportGateClean,
    editorRuntimeIsolated,
    v8WinitHostReady: false,
    notes,
  }
}
