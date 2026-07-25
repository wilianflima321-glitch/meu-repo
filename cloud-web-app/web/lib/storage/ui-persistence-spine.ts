/**
 * CW4 — UI persistence spine.
 * Versioned, typed adapter for critical IDE / Studio / session keys.
 * Raw localStorage remains exception-only outside this module.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import { AethelStorageAdapter } from '@/lib/storage/aethel-storage-adapter'
import {
  readClientJson,
  removeClientStorageItem,
  writeClientJson,
} from '@/lib/storage/safe-client-storage'
import { notifyUiPersistenceLocalWrite } from '@/lib/storage/ui-persistence-cross-tab'

const log = createComponentLogger('UiPersistenceSpine')

/** Spine schema version for the critical bag. Bump when migrate() must rewrite. */
export const UI_PERSISTENCE_SPINE_VERSION = 1 as const

export const UI_PERSISTENCE_BAG_KEY = 'aethel.ui.persistence.v1'

export type UiPersistenceNamespace =
  | 'ide.dock'
  | 'ide.session'
  | 'ide.workbench.panelState'
  | 'ide.workbench.bottomPanel'
  | 'ide.workbench.previewEnabled'
  | 'studio.session'
  | 'studio.workbench'
  | 'workspace.profile'
  | 'theme.current'
  | 'theme.icon'
  | 'dashboard.sessionHistory'
  | 'dashboard.settings'
  | 'dashboard.activeTab'
  | 'dashboard.chatHistory'
  | 'dashboard.firstValueDismissed'
  | 'agents.opsMemory'
  | 'agents.opsPrefs'
  | 'viewport.dock'
  | 'viewport.fidelity'
  | 'workbench.lastProjectId'
  | 'workbench.preview.runtimeUrl'
  | 'workbench.preview.sandboxId'

/** Legacy flat keys that migrate into the versioned bag. */
export const UI_PERSISTENCE_LEGACY_KEYS = {
  ideDock: 'aethel.ide.dock.v1',
  ideSession: 'aethel.ide.session.v1',
  workbenchPanelState: 'aethel.workbench.panelState',
  workbenchBottomPanel: 'aethel.workbench.bottomPanelMode',
  workbenchPreviewEnabled: 'aethel.workbench.preview.enabled',
  studioSession: 'aethel:last-studio-session-id',
  workbenchPrefix: 'aethel-workbench-layout:',
  workspaceProfile: 'aethel.workspace.profile',
  themeCurrent: 'current-theme',
  themeIcon: 'current-icon-theme',
  dashboardSessionHistory: 'aethel-dashboard::session-history',
  dashboardSettings: 'aethel-dashboard::settings',
  dashboardActiveTab: 'aethel-dashboard::active-tab',
  dashboardChatHistory: 'aethel-dashboard::chat-history',
  agentsOpsMemoryPrefix: 'aethel.ai.ops.memory.',
  agentsOpsPrefs: 'aethel.ai.ops.prefs.v1',
  agentsCalmMode: 'aethel-chat-calm',
  viewportDockPrefix: 'aethel.viewport.dock.',
  viewportFidelity: 'aethel.viewport.fidelity',
  workbenchLastProjectId: 'aethel.workbench.lastProjectId',
  dashboardFirstValueDismissed: 'aethel.dashboard.first-value.dismissed',
  workbenchPreviewRuntimeUrl: 'aethel.workbench.preview.runtimeUrl',
  workbenchPreviewSandboxId: 'aethel.workbench.preview.sandboxId',
} as const

/** Viewport dock modes mirrored into `viewport.dock` (no secrets). */
export const UI_PERSISTENCE_VIEWPORT_DOCK_MODES = ['viewport', 'canvas', 'runtime'] as const

export type UiPersistenceEnvelope<T> = {
  v: typeof UI_PERSISTENCE_SPINE_VERSION
  updatedAt: string
  data: T
}

export type UiPersistenceBag = {
  v: typeof UI_PERSISTENCE_SPINE_VERSION
  updatedAt: string
  entries: Partial<Record<UiPersistenceNamespace, unknown>>
}

function emptyBag(): UiPersistenceBag {
  return {
    v: UI_PERSISTENCE_SPINE_VERSION,
    updatedAt: new Date(0).toISOString(),
    entries: {},
  }
}

function isEnvelope(value: unknown): value is UiPersistenceEnvelope<unknown> {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<UiPersistenceEnvelope<unknown>>
  return candidate.v === UI_PERSISTENCE_SPINE_VERSION && 'data' in candidate
}

function readBag(): UiPersistenceBag {
  const raw = readClientJson<Partial<UiPersistenceBag> | null>(UI_PERSISTENCE_BAG_KEY, null)
  if (!raw || typeof raw !== 'object') return emptyBag()
  if (raw.v !== UI_PERSISTENCE_SPINE_VERSION) {
    // Future: run named migrators. Fail-closed to empty typed bag.
    log.warn('ui_persistence_bag_version_mismatch', { found: raw.v })
    return emptyBag()
  }
  return {
    v: UI_PERSISTENCE_SPINE_VERSION,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date(0).toISOString(),
    entries: raw.entries && typeof raw.entries === 'object' ? { ...raw.entries } : {},
  }
}

function writeBag(bag: UiPersistenceBag): boolean {
  const next: UiPersistenceBag = {
    ...bag,
    v: UI_PERSISTENCE_SPINE_VERSION,
    updatedAt: new Date().toISOString(),
  }
  const ok = writeClientJson(UI_PERSISTENCE_BAG_KEY, next)
  if (!ok) {
    log.warn('ui_persistence_bag_write_failed', { key: UI_PERSISTENCE_BAG_KEY })
  } else {
    notifyUiPersistenceLocalWrite()
  }
  return ok
}

function readLegacyRaw(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function parseLegacyJson(raw: string | null): unknown {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

/**
 * One-shot migrate of highest-traffic IDE/Studio/session keys into the bag.
 * Idempotent: skips namespaces already present. Leaves legacy keys readable
 * until a later prune wave (do not delete user data aggressively).
 */
export function migrateUiPersistenceSpine(): UiPersistenceBag {
  const bag = readBag()
  let changed = false

  const ensure = (ns: UiPersistenceNamespace, value: unknown) => {
    if (bag.entries[ns] !== undefined || value === null || value === undefined) return
    bag.entries[ns] = value
    changed = true
  }

  ensure('ide.dock', parseLegacyJson(readLegacyRaw(UI_PERSISTENCE_LEGACY_KEYS.ideDock)))
  ensure('ide.session', parseLegacyJson(readLegacyRaw(UI_PERSISTENCE_LEGACY_KEYS.ideSession)))
  ensure(
    'ide.workbench.panelState',
    parseLegacyJson(readLegacyRaw(UI_PERSISTENCE_LEGACY_KEYS.workbenchPanelState)),
  )
  ensure(
    'ide.workbench.bottomPanel',
    readLegacyRaw(UI_PERSISTENCE_LEGACY_KEYS.workbenchBottomPanel),
  )
  ensure(
    'ide.workbench.previewEnabled',
    readLegacyRaw(UI_PERSISTENCE_LEGACY_KEYS.workbenchPreviewEnabled),
  )

  const studioSession = readLegacyRaw(UI_PERSISTENCE_LEGACY_KEYS.studioSession)
  ensure('studio.session', studioSession)

  const profile = readLegacyRaw(UI_PERSISTENCE_LEGACY_KEYS.workspaceProfile)
  ensure('workspace.profile', profile)

  // Theme ids only (no BYOK / auth secrets).
  ensure('theme.current', readLegacyRaw(UI_PERSISTENCE_LEGACY_KEYS.themeCurrent))
  ensure('theme.icon', readLegacyRaw(UI_PERSISTENCE_LEGACY_KEYS.themeIcon))

  ensure(
    'agents.opsPrefs',
    parseLegacyJson(readLegacyRaw(UI_PERSISTENCE_LEGACY_KEYS.agentsOpsPrefs)) ??
      (() => {
        const calm = readLegacyRaw(UI_PERSISTENCE_LEGACY_KEYS.agentsCalmMode)
        return calm === null ? null : { calmMode: calm !== 'false' }
      })(),
  )

  ensure(
    'dashboard.sessionHistory',
    parseLegacyJson(readLegacyRaw(UI_PERSISTENCE_LEGACY_KEYS.dashboardSessionHistory)),
  )
  ensure(
    'dashboard.settings',
    parseLegacyJson(readLegacyRaw(UI_PERSISTENCE_LEGACY_KEYS.dashboardSettings)),
  )
  ensure(
    'dashboard.activeTab',
    readLegacyRaw(UI_PERSISTENCE_LEGACY_KEYS.dashboardActiveTab),
  )
  ensure(
    'dashboard.chatHistory',
    parseLegacyJson(readLegacyRaw(UI_PERSISTENCE_LEGACY_KEYS.dashboardChatHistory)),
  )
  ensure(
    'dashboard.firstValueDismissed',
    readLegacyRaw(UI_PERSISTENCE_LEGACY_KEYS.dashboardFirstValueDismissed),
  )

  // Theme-adjacent session prefs only — never BYOK / tokens / aethel-token.
  ensure('viewport.fidelity', readLegacyRaw(UI_PERSISTENCE_LEGACY_KEYS.viewportFidelity))
  ensure(
    'workbench.lastProjectId',
    readLegacyRaw(UI_PERSISTENCE_LEGACY_KEYS.workbenchLastProjectId),
  )
  ensure(
    'workbench.preview.runtimeUrl',
    readLegacyRaw(UI_PERSISTENCE_LEGACY_KEYS.workbenchPreviewRuntimeUrl),
  )
  ensure(
    'workbench.preview.sandboxId',
    readLegacyRaw(UI_PERSISTENCE_LEGACY_KEYS.workbenchPreviewSandboxId),
  )

  if (bag.entries['viewport.dock'] === undefined && typeof window !== 'undefined') {
    const docks: Record<string, unknown> = {}
    for (const mode of UI_PERSISTENCE_VIEWPORT_DOCK_MODES) {
      const legacyKey = `${UI_PERSISTENCE_LEGACY_KEYS.viewportDockPrefix}${mode}.v1`
      const parsed = parseLegacyJson(readLegacyRaw(legacyKey))
      if (parsed !== null) docks[mode] = parsed
    }
    if (Object.keys(docks).length > 0) {
      bag.entries['viewport.dock'] = docks
      changed = true
    }
  }

  // Workbench layouts: fold known mode keys into one map.
  if (bag.entries['studio.workbench'] === undefined && typeof window !== 'undefined') {
    const modes = ['world', 'character', 'fx', 'film', 'logic'] as const
    const layouts: Record<string, unknown> = {}
    for (const mode of modes) {
      const legacyKey = `${UI_PERSISTENCE_LEGACY_KEYS.workbenchPrefix}${mode}`
      const parsed = parseLegacyJson(readLegacyRaw(legacyKey))
      if (parsed !== null) layouts[mode] = parsed
    }
    if (Object.keys(layouts).length > 0) {
      bag.entries['studio.workbench'] = layouts
      changed = true
    }
  }

  if (changed) {
    writeBag(bag)
    log.info('ui_persistence_migrated', {
      namespaces: Object.keys(bag.entries),
    })
  }

  return bag
}

/**
 * CW4 (closed): `ide.dock` + `viewport.dock` used to need a read-time
 * re-sync from their raw legacy keys because `WorkspaceProvider` could
 * mount and write directly to `localStorage` *before* the spine adapter
 * was registered on some routes (viewport-only shells never imported the
 * IDE shell module that carried the registration side effect). The spine
 * bag would then silently go stale one write later — a real dual-write
 * hazard, not just duplicated data.
 *
 * Fixed at the root: `docking/WorkspaceProvider.tsx` — the single call
 * site for `createWorkspaceStore` — now registers the spine adapter at
 * module scope, so no `WorkspaceStore` can ever be created before the
 * adapter exists, on any route. `ide.dock`/`viewport.dock` writes go
 * through `setIdeDockLayout`/`setViewportDockLayoutForMode` exclusively;
 * the raw legacy key is written *by* `mirrorLegacy` below as a one-way,
 * same-call compat mirror (one release), never read back into the bag
 * after the initial one-shot `migrateUiPersistenceSpine()` bootstrap.
 * Do not reintroduce a read-time legacy resync — that recreates the race.
 */
function ensureMigrated(): UiPersistenceBag {
  // Always run — migrate is idempotent and must pick up legacy keys written
  // after an earlier empty migrate (e.g. tests / late session resume writes).
  return migrateUiPersistenceSpine()
}

/** @deprecated no-op kept for test imports during CW4 rollout */
export function __resetUiPersistenceMigrateGateForTests(): void {
  // intentionally empty
}

export function getUiPersistence<T>(
  namespace: UiPersistenceNamespace,
  fallback: T,
  validate?: (value: unknown) => value is T,
): T {
  try {
    const bag = ensureMigrated()
    const value = bag.entries[namespace]
    if (value === undefined || value === null) return fallback
    if (validate) {
      return validate(value) ? value : fallback
    }
    return value as T
  } catch (error) {
    log.warn('ui_persistence_get_failed', {
      namespace,
      error: error instanceof Error ? error.message : 'unknown',
    })
    return fallback
  }
}

export function setUiPersistence<T>(namespace: UiPersistenceNamespace, value: T): boolean {
  try {
    const bag = ensureMigrated()
    bag.entries[namespace] = value as unknown
    const ok = writeBag(bag)
    // Mirror to legacy key for consumers not yet on spine (compat window).
    mirrorLegacy(namespace, value)
    return ok
  } catch (error) {
    log.warn('ui_persistence_set_failed', {
      namespace,
      error: error instanceof Error ? error.message : 'unknown',
    })
    return false
  }
}

export function removeUiPersistence(namespace: UiPersistenceNamespace): void {
  try {
    const bag = ensureMigrated()
    delete bag.entries[namespace]
    writeBag(bag)
    removeLegacy(namespace)
  } catch (error) {
    log.warn('ui_persistence_remove_failed', {
      namespace,
      error: error instanceof Error ? error.message : 'unknown',
    })
  }
}

function mirrorLegacy(namespace: UiPersistenceNamespace, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    switch (namespace) {
      case 'ide.dock':
        window.localStorage.setItem(UI_PERSISTENCE_LEGACY_KEYS.ideDock, JSON.stringify(value))
        break
      case 'ide.session':
        window.localStorage.setItem(UI_PERSISTENCE_LEGACY_KEYS.ideSession, JSON.stringify(value))
        break
      case 'ide.workbench.panelState':
        window.localStorage.setItem(
          UI_PERSISTENCE_LEGACY_KEYS.workbenchPanelState,
          JSON.stringify(value),
        )
        break
      case 'ide.workbench.bottomPanel':
        if (typeof value === 'string') {
          window.localStorage.setItem(UI_PERSISTENCE_LEGACY_KEYS.workbenchBottomPanel, value)
        }
        break
      case 'ide.workbench.previewEnabled':
        if (typeof value === 'string') {
          window.localStorage.setItem(UI_PERSISTENCE_LEGACY_KEYS.workbenchPreviewEnabled, value)
        }
        break
      case 'studio.session':
        if (typeof value === 'string') {
          window.localStorage.setItem(UI_PERSISTENCE_LEGACY_KEYS.studioSession, value)
        }
        break
      case 'workspace.profile':
        if (typeof value === 'string') {
          window.localStorage.setItem(UI_PERSISTENCE_LEGACY_KEYS.workspaceProfile, value)
        }
        break
      case 'theme.current':
        if (typeof value === 'string') {
          window.localStorage.setItem(UI_PERSISTENCE_LEGACY_KEYS.themeCurrent, value)
        }
        break
      case 'theme.icon':
        if (typeof value === 'string') {
          window.localStorage.setItem(UI_PERSISTENCE_LEGACY_KEYS.themeIcon, value)
        }
        break
      case 'agents.opsPrefs':
        window.localStorage.setItem(
          UI_PERSISTENCE_LEGACY_KEYS.agentsOpsPrefs,
          JSON.stringify(value),
        )
        if (value && typeof value === 'object' && 'calmMode' in (value as object)) {
          const calm = Boolean((value as { calmMode?: boolean }).calmMode)
          window.localStorage.setItem(UI_PERSISTENCE_LEGACY_KEYS.agentsCalmMode, String(calm))
        }
        break
      case 'dashboard.sessionHistory':
        window.localStorage.setItem(
          UI_PERSISTENCE_LEGACY_KEYS.dashboardSessionHistory,
          JSON.stringify(value),
        )
        break
      case 'dashboard.settings':
        window.localStorage.setItem(
          UI_PERSISTENCE_LEGACY_KEYS.dashboardSettings,
          JSON.stringify(value),
        )
        break
      case 'dashboard.activeTab':
        if (typeof value === 'string') {
          window.localStorage.setItem(UI_PERSISTENCE_LEGACY_KEYS.dashboardActiveTab, value)
        }
        break
      case 'dashboard.chatHistory':
        window.localStorage.setItem(
          UI_PERSISTENCE_LEGACY_KEYS.dashboardChatHistory,
          JSON.stringify(value),
        )
        break
      case 'dashboard.firstValueDismissed':
        if (typeof value === 'string') {
          window.localStorage.setItem(UI_PERSISTENCE_LEGACY_KEYS.dashboardFirstValueDismissed, value)
        }
        break
      case 'viewport.fidelity':
        if (typeof value === 'string') {
          window.localStorage.setItem(UI_PERSISTENCE_LEGACY_KEYS.viewportFidelity, value)
        }
        break
      case 'workbench.lastProjectId':
        if (typeof value === 'string') {
          window.localStorage.setItem(UI_PERSISTENCE_LEGACY_KEYS.workbenchLastProjectId, value)
        }
        break
      case 'workbench.preview.runtimeUrl':
        if (typeof value === 'string') {
          window.localStorage.setItem(UI_PERSISTENCE_LEGACY_KEYS.workbenchPreviewRuntimeUrl, value)
        }
        break
      case 'workbench.preview.sandboxId':
        if (typeof value === 'string') {
          window.localStorage.setItem(UI_PERSISTENCE_LEGACY_KEYS.workbenchPreviewSandboxId, value)
        }
        break
      case 'viewport.dock':
        if (value && typeof value === 'object') {
          for (const [mode, layout] of Object.entries(value as Record<string, unknown>)) {
            window.localStorage.setItem(
              `${UI_PERSISTENCE_LEGACY_KEYS.viewportDockPrefix}${mode}.v1`,
              JSON.stringify(layout),
            )
          }
        }
        break
      case 'studio.workbench':
        if (value && typeof value === 'object') {
          for (const [mode, layout] of Object.entries(value as Record<string, unknown>)) {
            window.localStorage.setItem(
              `${UI_PERSISTENCE_LEGACY_KEYS.workbenchPrefix}${mode}`,
              JSON.stringify(layout),
            )
          }
        }
        break
      case 'agents.opsMemory':
        // Project-scoped; callers mirror via setAgentsOpsMemory.
        break
      default:
        break
    }
  } catch {
    // Mirror is best-effort; bag write is source of truth.
  }
}

function removeLegacy(namespace: UiPersistenceNamespace): void {
  switch (namespace) {
    case 'ide.dock':
      removeClientStorageItem(UI_PERSISTENCE_LEGACY_KEYS.ideDock)
      break
    case 'ide.session':
      removeClientStorageItem(UI_PERSISTENCE_LEGACY_KEYS.ideSession)
      break
    case 'ide.workbench.panelState':
      removeClientStorageItem(UI_PERSISTENCE_LEGACY_KEYS.workbenchPanelState)
      break
    case 'ide.workbench.bottomPanel':
      removeClientStorageItem(UI_PERSISTENCE_LEGACY_KEYS.workbenchBottomPanel)
      break
    case 'ide.workbench.previewEnabled':
      removeClientStorageItem(UI_PERSISTENCE_LEGACY_KEYS.workbenchPreviewEnabled)
      break
    case 'studio.session':
      removeClientStorageItem(UI_PERSISTENCE_LEGACY_KEYS.studioSession)
      break
    case 'workspace.profile':
      removeClientStorageItem(UI_PERSISTENCE_LEGACY_KEYS.workspaceProfile)
      break
    case 'theme.current':
      removeClientStorageItem(UI_PERSISTENCE_LEGACY_KEYS.themeCurrent)
      break
    case 'theme.icon':
      removeClientStorageItem(UI_PERSISTENCE_LEGACY_KEYS.themeIcon)
      break
    case 'agents.opsPrefs':
      removeClientStorageItem(UI_PERSISTENCE_LEGACY_KEYS.agentsOpsPrefs)
      removeClientStorageItem(UI_PERSISTENCE_LEGACY_KEYS.agentsCalmMode)
      break
    case 'dashboard.sessionHistory':
      removeClientStorageItem(UI_PERSISTENCE_LEGACY_KEYS.dashboardSessionHistory)
      break
    case 'dashboard.settings':
      removeClientStorageItem(UI_PERSISTENCE_LEGACY_KEYS.dashboardSettings)
      break
    case 'dashboard.activeTab':
      removeClientStorageItem(UI_PERSISTENCE_LEGACY_KEYS.dashboardActiveTab)
      break
    case 'dashboard.chatHistory':
      removeClientStorageItem(UI_PERSISTENCE_LEGACY_KEYS.dashboardChatHistory)
      break
    case 'dashboard.firstValueDismissed':
      removeClientStorageItem(UI_PERSISTENCE_LEGACY_KEYS.dashboardFirstValueDismissed)
      break
    case 'viewport.fidelity':
      removeClientStorageItem(UI_PERSISTENCE_LEGACY_KEYS.viewportFidelity)
      break
    case 'workbench.lastProjectId':
      removeClientStorageItem(UI_PERSISTENCE_LEGACY_KEYS.workbenchLastProjectId)
      break
    case 'workbench.preview.runtimeUrl':
      removeClientStorageItem(UI_PERSISTENCE_LEGACY_KEYS.workbenchPreviewRuntimeUrl)
      break
    case 'workbench.preview.sandboxId':
      removeClientStorageItem(UI_PERSISTENCE_LEGACY_KEYS.workbenchPreviewSandboxId)
      break
    default:
      break
  }
}

// --- Typed helpers for high-traffic surfaces ---------------------------------

export function getWorkbenchLayout<T extends object>(mode: string, fallback: T): T {
  const bag = getUiPersistence<Record<string, unknown>>('studio.workbench', {})
  const key = mode.toLowerCase()
  const value = bag[key]
  if (!value || typeof value !== 'object') return fallback
  return { ...fallback, ...(value as Partial<T>) }
}

export function setWorkbenchLayout(mode: string, layout: object): boolean {
  const bag = { ...getUiPersistence<Record<string, unknown>>('studio.workbench', {}) }
  bag[mode.toLowerCase()] = layout
  return setUiPersistence('studio.workbench', bag)
}

export function getStudioSessionId(): string | null {
  const value = getUiPersistence<string | null>('studio.session', null, (v): v is string => typeof v === 'string')
  return value && value.length > 0 ? value : null
}

export function setStudioSessionId(sessionId: string): boolean {
  return setUiPersistence('studio.session', sessionId)
}

export function clearStudioSessionId(): void {
  removeUiPersistence('studio.session')
}

export function getAgentsOpsMemoryKey(projectId?: string): string {
  return `${UI_PERSISTENCE_LEGACY_KEYS.agentsOpsMemoryPrefix}${projectId || 'default'}`
}

export function getAgentsOpsMemory<T>(projectId: string | undefined, fallback: T): T {
  const map = getUiPersistence<Record<string, unknown>>('agents.opsMemory', {})
  const key = projectId || 'default'
  const value = map[key]
  if (value === undefined) {
    // Compat: pull legacy flat key once.
    const legacy = parseLegacyJson(readLegacyRaw(getAgentsOpsMemoryKey(projectId)))
    if (legacy !== null) {
      map[key] = legacy
      setUiPersistence('agents.opsMemory', map)
      return legacy as T
    }
    return fallback
  }
  return value as T
}

export function setAgentsOpsMemory(projectId: string | undefined, value: unknown): boolean {
  const map = { ...getUiPersistence<Record<string, unknown>>('agents.opsMemory', {}) }
  const key = projectId || 'default'
  map[key] = value
  const ok = setUiPersistence('agents.opsMemory', map)
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(getAgentsOpsMemoryKey(projectId), JSON.stringify(value))
    } catch {
      // ignore
    }
  }
  return ok
}

export type AgentsOpsPrefs = {
  calmMode?: boolean
  showAdvancedControls?: boolean
  lastOpsTab?: string
}

export function getAgentsOpsPrefs(): AgentsOpsPrefs {
  return getUiPersistence<AgentsOpsPrefs>('agents.opsPrefs', {}, (v): v is AgentsOpsPrefs => {
    return Boolean(v) && typeof v === 'object'
  })
}

export function setAgentsOpsPrefs(prefs: AgentsOpsPrefs): boolean {
  return setUiPersistence('agents.opsPrefs', { ...getAgentsOpsPrefs(), ...prefs })
}

export function getThemePreferenceId(): string | null {
  const value = getUiPersistence<string | null>(
    'theme.current',
    null,
    (v): v is string => typeof v === 'string',
  )
  return value && value.length > 0 ? value : null
}

export function setThemePreferenceId(themeId: string): boolean {
  return setUiPersistence('theme.current', themeId)
}

export function getIconThemePreferenceId(): string | null {
  const value = getUiPersistence<string | null>(
    'theme.icon',
    null,
    (v): v is string => typeof v === 'string',
  )
  return value && value.length > 0 ? value : null
}

export function setIconThemePreferenceId(iconThemeId: string): boolean {
  return setUiPersistence('theme.icon', iconThemeId)
}

/**
 * Typed IDE dock layout helpers — WorkspaceProvider dual-writes via
 * `registerWorkspaceLayoutPersistence` so bag + legacy stay in sync.
 */
export function getIdeDockLayout<T>(fallback: T): T {
  return getUiPersistence<T>('ide.dock', fallback)
}

export function setIdeDockLayout(layout: unknown): boolean {
  return setUiPersistence('ide.dock', layout)
}

/** Parse `aethel.viewport.dock.<mode>.v1` → mode, or null. */
export function parseViewportDockStorageMode(storageKey: string): string | null {
  const prefix = UI_PERSISTENCE_LEGACY_KEYS.viewportDockPrefix
  if (!storageKey.startsWith(prefix) || !storageKey.endsWith('.v1')) return null
  const mode = storageKey.slice(prefix.length, -'.v1'.length)
  if (
    !(UI_PERSISTENCE_VIEWPORT_DOCK_MODES as readonly string[]).includes(mode)
  ) {
    return null
  }
  return mode
}

export function getViewportDockLayoutForMode<T>(mode: string, fallback: T): T {
  const docks = getUiPersistence<Record<string, unknown>>(
    'viewport.dock',
    {},
    (v): v is Record<string, unknown> => !!v && typeof v === 'object',
  )
  if (docks && Object.prototype.hasOwnProperty.call(docks, mode)) {
    return docks[mode] as T
  }
  return fallback
}

export function setViewportDockLayoutForMode(mode: string, layout: unknown): boolean {
  const docks = {
    ...getUiPersistence<Record<string, unknown>>(
      'viewport.dock',
      {},
      (v): v is Record<string, unknown> => !!v && typeof v === 'object',
    ),
  }
  docks[mode] = layout
  return setUiPersistence('viewport.dock', docks)
}

export function getWorkbenchLastProjectId(): string | null {
  const value = getUiPersistence<string | null>(
    'workbench.lastProjectId',
    null,
    (v): v is string => typeof v === 'string',
  )
  return value && value.trim().length > 0 ? value.trim() : null
}

export function setWorkbenchLastProjectId(projectId: string): boolean {
  return setUiPersistence('workbench.lastProjectId', projectId)
}

export function getViewportFidelityPreference(): string | null {
  const value = getUiPersistence<string | null>(
    'viewport.fidelity',
    null,
    (v): v is string => typeof v === 'string',
  )
  return value && value.length > 0 ? value : null
}

export function setViewportFidelityPreference(level: string): boolean {
  return setUiPersistence('viewport.fidelity', level)
}

export function getWorkbenchPreviewRuntimeUrl(): string | null {
  const value = getUiPersistence<string | null>(
    'workbench.preview.runtimeUrl',
    null,
    (v): v is string => typeof v === 'string',
  )
  return value && value.trim().length > 0 ? value.trim() : null
}

export function setWorkbenchPreviewRuntimeUrl(runtimeUrl: string | null): boolean {
  if (!runtimeUrl) {
    removeUiPersistence('workbench.preview.runtimeUrl')
    return true
  }
  return setUiPersistence('workbench.preview.runtimeUrl', runtimeUrl)
}

export function getWorkbenchPreviewSandboxId(): string | null {
  const value = getUiPersistence<string | null>(
    'workbench.preview.sandboxId',
    null,
    (v): v is string => typeof v === 'string',
  )
  return value && value.trim().length > 0 ? value.trim() : null
}

export function setWorkbenchPreviewSandboxId(sandboxId: string | null): boolean {
  if (!sandboxId) {
    removeUiPersistence('workbench.preview.sandboxId')
    return true
  }
  return setUiPersistence('workbench.preview.sandboxId', sandboxId)
}

export function wrapEnvelope<T>(data: T): UiPersistenceEnvelope<T> {
  return {
    v: UI_PERSISTENCE_SPINE_VERSION,
    updatedAt: new Date().toISOString(),
    data,
  }
}

export function unwrapEnvelope<T>(
  raw: unknown,
  validate: (data: unknown) => data is T,
): T | null {
  if (!isEnvelope(raw)) return null
  return validate(raw.data) ? raw.data : null
}
