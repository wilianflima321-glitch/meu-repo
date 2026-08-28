/**
 * Studio Local dock layout persistence — mirrors web Block 7A spine key
 * pattern (`aethel.ide.dock.v1`) with a desktop-scoped bag so WebView
 * localStorage survives relaunch without importing Next/web spine modules.
 *
 * Fail-closed: corrupt JSON → defaults. No mock panel inventory.
 */

export const STUDIO_LOCAL_DOCK_STORAGE_KEY = 'aethel.studio-local.dock.v1'

export type StudioLocalDockLayout = {
  version: 1
  /** Left World Outliner column width (px). */
  outlinerWidthPx: number
  /** Right tools column width (px). */
  toolsWidthPx: number
  /** Bottom terminal/honesty strip height (px). */
  bottomHeightPx: number
  /** Center Monaco editor flex share (0.25–0.75 of center column). */
  monacoFlex: number
  outlinerCollapsed: boolean
  toolsCollapsed: boolean
  bottomCollapsed: boolean
  /** Active right-rail tab id. */
  activeToolsTab: 'assets' | 'cooker' | 'hardware' | 'lsp' | 'handoff'
  /** Active bottom tab id. */
  activeBottomTab: 'terminal' | 'jobs' | 'honesty'
}

export const DEFAULT_STUDIO_LOCAL_DOCK: StudioLocalDockLayout = {
  version: 1,
  outlinerWidthPx: 260,
  toolsWidthPx: 300,
  bottomHeightPx: 220,
  monacoFlex: 0.42,
  outlinerCollapsed: false,
  toolsCollapsed: false,
  bottomCollapsed: false,
  activeToolsTab: 'assets',
  activeBottomTab: 'terminal',
}

const MIN_OUTLINER = 180
const MAX_OUTLINER = 420
const MIN_TOOLS = 220
const MAX_TOOLS = 480
const MIN_BOTTOM = 120
const MAX_BOTTOM = 420

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function sanitizeStudioLocalDockLayout(raw: unknown): StudioLocalDockLayout {
  if (!isObject(raw)) return { ...DEFAULT_STUDIO_LOCAL_DOCK }
  const toolsTab = raw.activeToolsTab
  const bottomTab = raw.activeBottomTab
  return {
    version: 1,
    outlinerWidthPx: clamp(
      typeof raw.outlinerWidthPx === 'number' ? raw.outlinerWidthPx : DEFAULT_STUDIO_LOCAL_DOCK.outlinerWidthPx,
      MIN_OUTLINER,
      MAX_OUTLINER,
    ),
    toolsWidthPx: clamp(
      typeof raw.toolsWidthPx === 'number' ? raw.toolsWidthPx : DEFAULT_STUDIO_LOCAL_DOCK.toolsWidthPx,
      MIN_TOOLS,
      MAX_TOOLS,
    ),
    bottomHeightPx: clamp(
      typeof raw.bottomHeightPx === 'number' ? raw.bottomHeightPx : DEFAULT_STUDIO_LOCAL_DOCK.bottomHeightPx,
      MIN_BOTTOM,
      MAX_BOTTOM,
    ),
    monacoFlex: clamp(
      typeof raw.monacoFlex === 'number' ? raw.monacoFlex : DEFAULT_STUDIO_LOCAL_DOCK.monacoFlex,
      0.25,
      0.75,
    ),
    outlinerCollapsed: Boolean(raw.outlinerCollapsed),
    toolsCollapsed: Boolean(raw.toolsCollapsed),
    bottomCollapsed: Boolean(raw.bottomCollapsed),
    activeToolsTab:
      toolsTab === 'assets' ||
      toolsTab === 'cooker' ||
      toolsTab === 'hardware' ||
      toolsTab === 'lsp' ||
      toolsTab === 'handoff'
        ? toolsTab
        : DEFAULT_STUDIO_LOCAL_DOCK.activeToolsTab,
    activeBottomTab:
      bottomTab === 'terminal' || bottomTab === 'jobs' || bottomTab === 'honesty'
        ? bottomTab
        : DEFAULT_STUDIO_LOCAL_DOCK.activeBottomTab,
  }
}

export function loadStudioLocalDockLayout(): StudioLocalDockLayout {
  if (typeof window === 'undefined') return { ...DEFAULT_STUDIO_LOCAL_DOCK }
  try {
    const raw = window.localStorage.getItem(STUDIO_LOCAL_DOCK_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_STUDIO_LOCAL_DOCK }
    return sanitizeStudioLocalDockLayout(JSON.parse(raw) as unknown)
  } catch {
    return { ...DEFAULT_STUDIO_LOCAL_DOCK }
  }
}

export function saveStudioLocalDockLayout(layout: StudioLocalDockLayout): boolean {
  if (typeof window === 'undefined') return false
  try {
    const next = sanitizeStudioLocalDockLayout(layout)
    window.localStorage.setItem(STUDIO_LOCAL_DOCK_STORAGE_KEY, JSON.stringify(next))
    return true
  } catch {
    return false
  }
}
