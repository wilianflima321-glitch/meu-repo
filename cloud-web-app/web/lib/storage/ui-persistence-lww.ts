/**
 * CW4 — Last-writer-wins helpers for UI persistence spine.
 * Pure compare/merge (unit-testable). Used under Web Locks + pending-delta drain.
 * No import from ui-persistence-spine (avoids circular deps).
 */

export type UiPersistenceEntryMeta = {
  /** Wall-clock ISO timestamp of the write intent. */
  updatedAt: string
  /** Monotonic per-tab sequence (tie-break when timestamps collide). */
  writeSeq: number
  /** Stable tab/session id (final tie-break). */
  tabId: string
}

export type UiPersistenceVersionedWrite = {
  data: unknown
  meta: UiPersistenceEntryMeta
}

export type UiPersistenceLwwBagSlice = {
  entries: Partial<Record<string, unknown>>
  entryMeta: Partial<Record<string, UiPersistenceEntryMeta>>
}

const TAB_ID_STORAGE_KEY = 'aethel.ui.persistence.tabId.v1'

let _tabId: string | null = null
let _writeSeq = 0

function randomTabId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch {
    // fall through
  }
  return `tab_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

/** Stable per-tab id (sessionStorage when available). */
export function getUiPersistenceTabId(): string {
  if (_tabId) return _tabId
  if (typeof window !== 'undefined') {
    try {
      const existing = window.sessionStorage.getItem(TAB_ID_STORAGE_KEY)
      if (existing && existing.length > 0) {
        _tabId = existing
        return existing
      }
      const created = randomTabId()
      window.sessionStorage.setItem(TAB_ID_STORAGE_KEY, created)
      _tabId = created
      return created
    } catch {
      // private mode / blocked sessionStorage
    }
  }
  _tabId = randomTabId()
  return _tabId
}

export function nextUiPersistenceWriteMeta(
  at: string = new Date().toISOString(),
): UiPersistenceEntryMeta {
  _writeSeq += 1
  return {
    updatedAt: at,
    writeSeq: _writeSeq,
    tabId: getUiPersistenceTabId(),
  }
}

/**
 * Compare two metas: returns >0 if `a` wins, <0 if `b` wins, 0 if identical.
 * Order: updatedAt (ISO parse) → writeSeq → tabId (lexicographic).
 */
export function compareUiPersistenceEntryMeta(
  a: UiPersistenceEntryMeta,
  b: UiPersistenceEntryMeta,
): number {
  const aTs = Date.parse(a.updatedAt)
  const bTs = Date.parse(b.updatedAt)
  const aOk = Number.isFinite(aTs)
  const bOk = Number.isFinite(bTs)
  if (aOk && bOk && aTs !== bTs) return aTs > bTs ? 1 : -1
  if (aOk && !bOk) return 1
  if (!aOk && bOk) return -1
  if (a.writeSeq !== b.writeSeq) return a.writeSeq > b.writeSeq ? 1 : -1
  if (a.tabId === b.tabId) return 0
  return a.tabId > b.tabId ? 1 : -1
}

/** True when `incoming` should replace `existing` (or existing is absent). */
export function uiPersistenceWriteWins(
  incoming: UiPersistenceEntryMeta,
  existing: UiPersistenceEntryMeta | undefined | null,
): boolean {
  if (!existing) return true
  return compareUiPersistenceEntryMeta(incoming, existing) >= 0
}

export function isUiPersistenceEntryMeta(value: unknown): value is UiPersistenceEntryMeta {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<UiPersistenceEntryMeta>
  return (
    typeof candidate.updatedAt === 'string' &&
    typeof candidate.writeSeq === 'number' &&
    Number.isFinite(candidate.writeSeq) &&
    typeof candidate.tabId === 'string' &&
    candidate.tabId.length > 0
  )
}

/**
 * Apply versioned writes onto a bag slice with per-namespace LWW.
 * Returns which namespaces were applied (won).
 */
export function applyLwwWrites(
  bag: UiPersistenceLwwBagSlice,
  writes: Partial<Record<string, UiPersistenceVersionedWrite>>,
): string[] {
  const applied: string[] = []
  for (const [key, write] of Object.entries(writes)) {
    if (!write) continue
    const existingMeta = bag.entryMeta[key]
    if (!uiPersistenceWriteWins(write.meta, existingMeta)) continue
    bag.entries[key] = write.data
    bag.entryMeta[key] = write.meta
    applied.push(key)
  }
  return applied
}

/** Merge two versioned write maps with LWW (for pending-delta upsert). */
export function mergeVersionedWriteMaps(
  base: Partial<Record<string, UiPersistenceVersionedWrite>>,
  incoming: Partial<Record<string, UiPersistenceVersionedWrite>>,
): Partial<Record<string, UiPersistenceVersionedWrite>> {
  const next: Partial<Record<string, UiPersistenceVersionedWrite>> = { ...base }
  for (const [key, write] of Object.entries(incoming)) {
    if (!write) continue
    const existing = next[key]
    if (!existing || uiPersistenceWriteWins(write.meta, existing.meta)) {
      next[key] = write
    }
  }
  return next
}

/** Test-only reset of tab/seq caches. */
export function __resetUiPersistenceLwwForTests(): void {
  _tabId = null
  _writeSeq = 0
}
