/**
 * CW4 — UI persistence spine.
 * Versioned, typed adapter for critical IDE / Studio / session keys.
 * Raw localStorage remains exception-only outside this module
 * (secrets + documented domain allowlist — see ui-persistence-critical-inventory).
 */

import { createComponentLogger } from '@/lib/observability/logger'
import {
  readClientJson,
  removeClientStorageItem,
  writeClientJson,
} from '@/lib/storage/safe-client-storage'
import { notifyUiPersistenceLocalWrite } from '@/lib/storage/ui-persistence-cross-tab'
import {
  applyLwwWrites,
  isUiPersistenceEntryMeta,
  mergeVersionedWriteMaps,
  nextUiPersistenceWriteMeta,
  uiPersistenceWriteWins,
  type UiPersistenceEntryMeta,
  type UiPersistenceVersionedWrite,
  __resetUiPersistenceLwwForTests,
} from '@/lib/storage/ui-persistence-lww'

const log = createComponentLogger('UiPersistenceSpine')

/** Spine schema version for the critical bag. Bump when migrate() must rewrite. */
export const UI_PERSISTENCE_SPINE_VERSION = 1 as const

export const UI_PERSISTENCE_BAG_KEY = 'aethel.ui.persistence.v1'

/** Durable cross-tab pending writes drained under Web Locks (pagehide-safe). */
export const UI_PERSISTENCE_PENDING_DELTA_KEY = 'aethel.ui.persistence.pending.v1'

export const UI_PERSISTENCE_LOCK_NAME = 'aethel.ui.persistence.lock'

/**
 * One-way legacy mirror write window (compat for pre-spine readers).
 * Closed 2026-08-08 with CW4 LWW ship — bag is sole write authority after expire.
 * Bootstrap migrate may still *read* legacy once into the bag.
 */
export const UI_PERSISTENCE_LEGACY_MIRROR_EXPIRES_AT = '2026-08-08T00:00:00.000Z'

/** Test override: `true`/`false` force, `null` = use wall-clock expiry. */
let _legacyMirrorOverrideForTests: boolean | null = null

export function isUiPersistenceLegacyMirrorActive(nowMs: number = Date.now()): boolean {
  if (_legacyMirrorOverrideForTests !== null) return _legacyMirrorOverrideForTests
  const expires = Date.parse(UI_PERSISTENCE_LEGACY_MIRROR_EXPIRES_AT)
  if (!Number.isFinite(expires)) return false
  return nowMs < expires
}

/** Test-only: force legacy mirror on/off; pass null to restore expiry clock. */
export function __setUiPersistenceLegacyMirrorOverrideForTests(active: boolean | null): void {
  _legacyMirrorOverrideForTests = active
}

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
  | 'chrome.commandHistory'
  | 'chrome.searchHistory'
  | 'chrome.notifications'
  | 'settings.user'
  | 'settings.workspace'

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
  /** ThemeContext pre-spine id — migrate into theme.current; never dual-read after migrate. */
  themeContextLegacy: 'aethel-theme',
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
  commandHistory: 'aethel_command_history',
  searchHistory: 'aethel_search_history',
  replaceHistory: 'aethel_replace_history',
  notifications: 'aethel:notifications',
  userSettings: 'user-settings',
  workspaceSettings: 'workspace-settings',
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
  /** Per-namespace LWW metadata (absent for pre-LWW migrated bare entries). */
  entryMeta?: Partial<Record<UiPersistenceNamespace, UiPersistenceEntryMeta>>
}

type UiPersistencePendingDelta = {
  v: 1
  writes: Partial<Record<UiPersistenceNamespace, UiPersistenceVersionedWrite>>
}

function emptyBag(): UiPersistenceBag {
  return {
    v: UI_PERSISTENCE_SPINE_VERSION,
    updatedAt: new Date(0).toISOString(),
    entries: {},
    entryMeta: {},
  }
}

function emptyPendingDelta(): UiPersistencePendingDelta {
  return { v: 1, writes: {} }
}

function isEnvelope(value: unknown): value is UiPersistenceEnvelope<unknown> {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<UiPersistenceEnvelope<unknown>>
  return candidate.v === UI_PERSISTENCE_SPINE_VERSION && 'data' in candidate
}

function normalizeEntryMeta(
  raw: unknown,
): Partial<Record<UiPersistenceNamespace, UiPersistenceEntryMeta>> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Partial<Record<UiPersistenceNamespace, UiPersistenceEntryMeta>> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (isUiPersistenceEntryMeta(value)) {
      out[key as UiPersistenceNamespace] = value
    }
  }
  return out
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
    entryMeta: normalizeEntryMeta(raw.entryMeta),
  }
}

function readPendingDelta(): UiPersistencePendingDelta {
  const raw = readClientJson<Partial<UiPersistencePendingDelta> | null>(
    UI_PERSISTENCE_PENDING_DELTA_KEY,
    null,
  )
  if (!raw || raw.v !== 1 || !raw.writes || typeof raw.writes !== 'object') {
    return emptyPendingDelta()
  }
  const writes: UiPersistencePendingDelta['writes'] = {}
  for (const [key, value] of Object.entries(raw.writes)) {
    if (!value || typeof value !== 'object') continue
    const candidate = value as Partial<UiPersistenceVersionedWrite>
    if (!isUiPersistenceEntryMeta(candidate.meta) || !('data' in candidate)) continue
    writes[key as UiPersistenceNamespace] = {
      data: candidate.data,
      meta: candidate.meta,
    }
  }
  return { v: 1, writes }
}

function writePendingDelta(delta: UiPersistencePendingDelta): boolean {
  if (Object.keys(delta.writes).length === 0) {
    removeClientStorageItem(UI_PERSISTENCE_PENDING_DELTA_KEY)
    return true
  }
  return writeClientJson(UI_PERSISTENCE_PENDING_DELTA_KEY, delta)
}

function upsertPendingDelta(
  writes: Partial<Record<UiPersistenceNamespace, UiPersistenceVersionedWrite>>,
): void {
  const current = readPendingDelta()
  const merged = mergeVersionedWriteMaps(current.writes, writes)
  writePendingDelta({ v: 1, writes: merged as UiPersistencePendingDelta['writes'] })
}

function clearPendingDeltaKeys(keys: string[]): void {
  if (keys.length === 0) return
  const current = readPendingDelta()
  let changed = false
  for (const key of keys) {
    if (current.writes[key as UiPersistenceNamespace] !== undefined) {
      delete current.writes[key as UiPersistenceNamespace]
      changed = true
    }
  }
  if (changed) writePendingDelta(current)
}

/** In-memory queue (versioned) — read-through for get before async lock flush. */
let _writeQueue: Partial<Record<UiPersistenceNamespace, UiPersistenceVersionedWrite>> = {}
let _writeLockActive = false

function collectPendingWrites(): Partial<
  Record<UiPersistenceNamespace, UiPersistenceVersionedWrite>
> {
  const durable = readPendingDelta().writes
  return mergeVersionedWriteMaps(durable, _writeQueue) as Partial<
    Record<UiPersistenceNamespace, UiPersistenceVersionedWrite>
  >
}

/**
 * Merge in-memory + durable pending into bag with per-namespace LWW, then persist.
 * Called under Web Locks when available; sync path is best-effort LWW (no exclusive lock).
 */
function commitPendingToBag(): boolean {
  const pending = collectPendingWrites()
  _writeQueue = {}

  const bag = readBag()
  const slice = {
    entries: { ...bag.entries } as Partial<Record<string, unknown>>,
    entryMeta: { ...(bag.entryMeta ?? {}) } as Partial<Record<string, UiPersistenceEntryMeta>>,
  }
  const applied = applyLwwWrites(slice, pending)

  const next: UiPersistenceBag = {
    v: UI_PERSISTENCE_SPINE_VERSION,
    updatedAt: new Date().toISOString(),
    entries: slice.entries as UiPersistenceBag['entries'],
    entryMeta: slice.entryMeta as UiPersistenceBag['entryMeta'],
  }

  const ok = writeClientJson(UI_PERSISTENCE_BAG_KEY, next)
  if (!ok) {
    log.warn('ui_persistence_bag_write_failed', { key: UI_PERSISTENCE_BAG_KEY })
    // Re-queue memory so pagehide / next flush can retry.
    _writeQueue = mergeVersionedWriteMaps(_writeQueue, pending) as typeof _writeQueue
    return false
  }

  clearPendingDeltaKeys(applied)
  // Stale pending that lost LWW should also be dropped so they do not resurrect.
  const lost = Object.keys(pending).filter((k) => !applied.includes(k))
  clearPendingDeltaKeys(lost)
  notifyUiPersistenceLocalWrite()
  return true
}

async function flushWriteQueue() {
  if (typeof navigator === 'undefined' || !navigator.locks) {
    flushWriteQueueSync()
    return
  }

  if (_writeLockActive) return
  _writeLockActive = true

  try {
    await navigator.locks.request(UI_PERSISTENCE_LOCK_NAME, async () => {
      commitPendingToBag()
    })
  } catch (error) {
    log.warn('ui_persistence_lock_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    flushWriteQueueSync()
  } finally {
    _writeLockActive = false
    if (Object.keys(_writeQueue).length > 0 || Object.keys(readPendingDelta().writes).length > 0) {
      void flushWriteQueue()
    }
  }
}

function flushWriteQueueSync() {
  commitPendingToBag()
}

// Safety net for CW4-002: `flushWriteQueue()` above defers the canonical
// bag write behind `navigator.locks.request`, a microtask/macrotask hop. If
// the tab is closed/navigated/backgrounded before that callback runs, the
// in-memory queue would be lost — durable pending-delta + sync flush close
// that window. Legacy mirror (when active) remains one-way — never read back into bag.
if (typeof window !== 'undefined') {
  const flushPendingSync = () => {
    if (
      Object.keys(_writeQueue).length > 0 ||
      Object.keys(readPendingDelta().writes).length > 0
    ) {
      flushWriteQueueSync()
    }
  }
  window.addEventListener('pagehide', flushPendingSync)
  window.addEventListener('beforeunload', flushPendingSync)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPendingSync()
  })
}

function writeBag(bag: UiPersistenceBag): boolean {
  // Sync fallback (migrate / remove — not the multi-tab write path)
  const next: UiPersistenceBag = {
    ...bag,
    v: UI_PERSISTENCE_SPINE_VERSION,
    updatedAt: new Date().toISOString(),
    entryMeta: bag.entryMeta ?? {},
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

  // Theme ids only (no BYOK / auth secrets). Prefer current-theme, else ThemeContext legacy.
  ensure(
    'theme.current',
    readLegacyRaw(UI_PERSISTENCE_LEGACY_KEYS.themeCurrent) ??
      readLegacyRaw(UI_PERSISTENCE_LEGACY_KEYS.themeContextLegacy),
  )
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

  // Non-secret chrome formerly dual-sourced via raw localStorage.
  ensure(
    'chrome.commandHistory',
    parseLegacyJson(readLegacyRaw(UI_PERSISTENCE_LEGACY_KEYS.commandHistory)),
  )
  if (bag.entries['chrome.searchHistory'] === undefined) {
    const search = parseLegacyJson(readLegacyRaw(UI_PERSISTENCE_LEGACY_KEYS.searchHistory))
    const replace = parseLegacyJson(readLegacyRaw(UI_PERSISTENCE_LEGACY_KEYS.replaceHistory))
    if (search !== null || replace !== null) {
      bag.entries['chrome.searchHistory'] = {
        search: Array.isArray(search) ? search : [],
        replace: Array.isArray(replace) ? replace : [],
      }
      changed = true
    }
  }
  ensure(
    'chrome.notifications',
    parseLegacyJson(readLegacyRaw(UI_PERSISTENCE_LEGACY_KEYS.notifications)),
  )
  ensure('settings.user', parseLegacyJson(readLegacyRaw(UI_PERSISTENCE_LEGACY_KEYS.userSettings)))
  ensure(
    'settings.workspace',
    parseLegacyJson(readLegacyRaw(UI_PERSISTENCE_LEGACY_KEYS.workspaceSettings)),
  )

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
 * the raw legacy key *was* written by `mirrorLegacy` as a one-way compat
 * mirror; that write window expired (`UI_PERSISTENCE_LEGACY_MIRROR_EXPIRES_AT`).
 * Never read legacy back into the bag after the initial one-shot
 * `migrateUiPersistenceSpine()` bootstrap — that recreates dual-source races.
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

/** Test-only: clear in-memory queue + LWW tab/seq + durable pending delta. */
export function __resetUiPersistenceWriteStateForTests(): void {
  _writeQueue = {}
  _writeLockActive = false
  removeClientStorageItem(UI_PERSISTENCE_PENDING_DELTA_KEY)
  __resetUiPersistenceLwwForTests()
}

/**
 * Resolve the effective value for a namespace via LWW across memory pending,
 * durable pending-delta, and bag entryMeta (stale pending cannot shadow bag).
 */
function resolveNamespaceValue(namespace: UiPersistenceNamespace): unknown {
  const bag = ensureMigrated()
  const candidates: UiPersistenceVersionedWrite[] = []
  const memory = _writeQueue[namespace]
  if (memory) candidates.push(memory)
  const durable = readPendingDelta().writes[namespace]
  if (durable) candidates.push(durable)

  const bagValue = bag.entries[namespace]
  const bagMeta = bag.entryMeta?.[namespace]
  if (bagValue !== undefined && bagMeta) {
    candidates.push({ data: bagValue, meta: bagMeta })
  }

  if (candidates.length === 0) return bagValue

  let winner = candidates[0]!
  for (let i = 1; i < candidates.length; i++) {
    const next = candidates[i]!
    if (uiPersistenceWriteWins(next.meta, winner.meta)) winner = next
  }
  return winner.data
}

export function getUiPersistence<T>(
  namespace: UiPersistenceNamespace,
  fallback: T,
  validate?: (value: unknown) => value is T,
): T {
  try {
    ensureMigrated()
    const value = resolveNamespaceValue(namespace)
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
    const write: UiPersistenceVersionedWrite = {
      data: value as unknown,
      meta: nextUiPersistenceWriteMeta(),
    }
    // 1. Durable pending + memory queue (survive pagehide before lock hop)
    _writeQueue[namespace] = write
    upsertPendingDelta({ [namespace]: write })
    // 2. Async exclusive RMW under Web Locks (multi-tab LWW) when available
    void flushWriteQueue()
    // 3. One-way legacy mirror only while compat window is open (never read back)
    if (isUiPersistenceLegacyMirrorActive()) {
      mirrorLegacy(namespace, value)
    }
    return true
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
    delete _writeQueue[namespace]
    clearPendingDeltaKeys([namespace])
    const bag = ensureMigrated()
    delete bag.entries[namespace]
    if (bag.entryMeta) delete bag.entryMeta[namespace]
    writeBag(bag)
    removeLegacy(namespace)
  } catch (error) {
    log.warn('ui_persistence_remove_failed', {
      namespace,
      error: error instanceof Error ? error.message : 'unknown',
    })
  }
}

/** Expose sync flush for tests / pagehide simulation. */
export function __flushUiPersistenceForTests(): void {
  flushWriteQueueSync()
}

function mirrorLegacy(namespace: UiPersistenceNamespace, value: unknown): void {
  if (typeof window === 'undefined') return
  if (!isUiPersistenceLegacyMirrorActive()) return
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
      case 'chrome.commandHistory':
        window.localStorage.setItem(
          UI_PERSISTENCE_LEGACY_KEYS.commandHistory,
          JSON.stringify(value),
        )
        break
      case 'chrome.searchHistory':
        if (value && typeof value === 'object') {
          const hist = value as { search?: unknown; replace?: unknown }
          if (Array.isArray(hist.search)) {
            window.localStorage.setItem(
              UI_PERSISTENCE_LEGACY_KEYS.searchHistory,
              JSON.stringify(hist.search),
            )
          }
          if (Array.isArray(hist.replace)) {
            window.localStorage.setItem(
              UI_PERSISTENCE_LEGACY_KEYS.replaceHistory,
              JSON.stringify(hist.replace),
            )
          }
        }
        break
      case 'chrome.notifications':
        window.localStorage.setItem(
          UI_PERSISTENCE_LEGACY_KEYS.notifications,
          JSON.stringify(value),
        )
        break
      case 'settings.user':
        window.localStorage.setItem(UI_PERSISTENCE_LEGACY_KEYS.userSettings, JSON.stringify(value))
        break
      case 'settings.workspace':
        window.localStorage.setItem(
          UI_PERSISTENCE_LEGACY_KEYS.workspaceSettings,
          JSON.stringify(value),
        )
        break
      case 'agents.opsMemory':
        // Project-scoped; callers mirror via setAgentsOpsMemory when window open.
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
    case 'chrome.commandHistory':
      removeClientStorageItem(UI_PERSISTENCE_LEGACY_KEYS.commandHistory)
      break
    case 'chrome.searchHistory':
      removeClientStorageItem(UI_PERSISTENCE_LEGACY_KEYS.searchHistory)
      removeClientStorageItem(UI_PERSISTENCE_LEGACY_KEYS.replaceHistory)
      break
    case 'chrome.notifications':
      removeClientStorageItem(UI_PERSISTENCE_LEGACY_KEYS.notifications)
      break
    case 'settings.user':
      removeClientStorageItem(UI_PERSISTENCE_LEGACY_KEYS.userSettings)
      break
    case 'settings.workspace':
      removeClientStorageItem(UI_PERSISTENCE_LEGACY_KEYS.workspaceSettings)
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
  // One-way legacy flat key only while compat mirror window is open.
  if (ok && typeof window !== 'undefined' && isUiPersistenceLegacyMirrorActive()) {
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

export type ChromeSearchHistoryBag = {
  search: string[]
  replace: string[]
}

export function getChromeCommandHistory<T>(fallback: T[]): T[] {
  const value = getUiPersistence<unknown>('chrome.commandHistory', fallback)
  return Array.isArray(value) ? (value as T[]) : fallback
}

export function setChromeCommandHistory(entries: unknown[]): boolean {
  return setUiPersistence('chrome.commandHistory', entries)
}

export function clearChromeCommandHistory(): void {
  removeUiPersistence('chrome.commandHistory')
}

export function getChromeSearchHistory(): ChromeSearchHistoryBag {
  return getUiPersistence<ChromeSearchHistoryBag>(
    'chrome.searchHistory',
    { search: [], replace: [] },
    (v): v is ChromeSearchHistoryBag =>
      !!v &&
      typeof v === 'object' &&
      Array.isArray((v as ChromeSearchHistoryBag).search) &&
      Array.isArray((v as ChromeSearchHistoryBag).replace),
  )
}

export function setChromeSearchHistory(bag: ChromeSearchHistoryBag): boolean {
  return setUiPersistence('chrome.searchHistory', {
    search: [...bag.search],
    replace: [...bag.replace],
  })
}

export function getChromeNotifications<T>(fallback: T[]): T[] {
  const value = getUiPersistence<unknown>('chrome.notifications', fallback)
  return Array.isArray(value) ? (value as T[]) : fallback
}

export function setChromeNotifications(notifications: unknown[]): boolean {
  return setUiPersistence('chrome.notifications', notifications)
}

export function getUserSettingsBag<T extends object>(fallback: T): T {
  const value = getUiPersistence<unknown>('settings.user', fallback)
  return value && typeof value === 'object' ? ({ ...fallback, ...(value as object) } as T) : fallback
}

export function setUserSettingsBag(settings: object): boolean {
  return setUiPersistence('settings.user', settings)
}

export function getWorkspaceSettingsBag<T extends object>(fallback: T): T {
  const value = getUiPersistence<unknown>('settings.workspace', fallback)
  return value && typeof value === 'object' ? ({ ...fallback, ...(value as object) } as T) : fallback
}

export function setWorkspaceSettingsBag(settings: object): boolean {
  return setUiPersistence('settings.workspace', settings)
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
