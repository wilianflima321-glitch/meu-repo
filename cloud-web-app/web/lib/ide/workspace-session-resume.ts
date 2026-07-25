/**
 * Block 7B.2 — Resume Workspace session (tabs / panels / scroll).
 * Deepens the existing dock persistence key family — does not invent a parallel layout store.
 * Dock layout remains `aethel.ide.dock.v1`; this holds editor tabs + scroll offsets.
 * CW4: reads/writes route through the versioned UI persistence spine.
 */

import {
  getUiPersistence,
  setUiPersistence,
  UI_PERSISTENCE_LEGACY_KEYS,
} from '@/lib/storage/ui-persistence-spine'

export const WORKSPACE_SESSION_STORAGE_KEY = UI_PERSISTENCE_LEGACY_KEYS.ideSession
export const WORKSPACE_DOCK_STORAGE_KEY = UI_PERSISTENCE_LEGACY_KEYS.ideDock

export type WorkspaceSessionSnapshot = {
  version: 1
  openTabPaths: string[]
  activePath: string | null
  editorScrollLine: number
  panelScroll: Record<string, number>
  updatedAt: string
}

export function createEmptyWorkspaceSession(): WorkspaceSessionSnapshot {
  return {
    version: 1,
    openTabPaths: [],
    activePath: null,
    editorScrollLine: 0,
    panelScroll: {},
    updatedAt: new Date(0).toISOString(),
  }
}

export function parseWorkspaceSession(raw: unknown): WorkspaceSessionSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Partial<WorkspaceSessionSnapshot>
  if (value.version !== 1) return null
  if (!Array.isArray(value.openTabPaths)) return null

  const openTabPaths = value.openTabPaths.filter((p): p is string => typeof p === 'string' && p.length > 0)
  const activePath = typeof value.activePath === 'string' ? value.activePath : null
  const editorScrollLine =
    typeof value.editorScrollLine === 'number' && Number.isFinite(value.editorScrollLine)
      ? Math.max(0, Math.floor(value.editorScrollLine))
      : 0
  const panelScroll: Record<string, number> = {}
  if (value.panelScroll && typeof value.panelScroll === 'object') {
    for (const [key, scroll] of Object.entries(value.panelScroll)) {
      if (typeof scroll === 'number' && Number.isFinite(scroll)) {
        panelScroll[key] = Math.max(0, scroll)
      }
    }
  }

  return {
    version: 1,
    openTabPaths,
    activePath,
    editorScrollLine,
    panelScroll,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString(),
  }
}

export function loadWorkspaceSession(): WorkspaceSessionSnapshot | null {
  if (typeof window === 'undefined') return null
  const raw = getUiPersistence<unknown>('ide.session', null)
  return parseWorkspaceSession(raw)
}

export function saveWorkspaceSession(snapshot: Omit<WorkspaceSessionSnapshot, 'version' | 'updatedAt'>): void {
  if (typeof window === 'undefined') return
  const next: WorkspaceSessionSnapshot = {
    version: 1,
    openTabPaths: snapshot.openTabPaths,
    activePath: snapshot.activePath,
    editorScrollLine: snapshot.editorScrollLine,
    panelScroll: snapshot.panelScroll,
    updatedAt: new Date().toISOString(),
  }
  setUiPersistence('ide.session', next)
}

export function hasRestorableWorkspaceSession(): boolean {
  const session = loadWorkspaceSession()
  if (session && (session.openTabPaths.length > 0 || session.activePath)) return true
  if (typeof window === 'undefined') return false
  const dock = getUiPersistence<unknown>('ide.dock', null)
  return dock !== null && dock !== undefined
}

/** Pure merge used when applying a resume snapshot onto current open tabs. */
export function mergeResumeTabs(
  currentPaths: string[],
  snapshot: WorkspaceSessionSnapshot,
): { paths: string[]; activePath: string | null; scrollLine: number } {
  const paths =
    snapshot.openTabPaths.length > 0
      ? Array.from(new Set([...snapshot.openTabPaths, ...currentPaths]))
      : currentPaths
  const activePath =
    snapshot.activePath && paths.includes(snapshot.activePath)
      ? snapshot.activePath
      : paths[0] ?? null
  return {
    paths,
    activePath,
    scrollLine: snapshot.editorScrollLine,
  }
}
