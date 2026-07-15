/**
 * Law II / Onda F.2 — TelemetrySpool (durable store-and-forward).
 * IndexedDB on browser; in-memory ring for Node/tests.
 * Never silently drop playtime / LiveOps events on offline flush failure.
 */

export const SESSION_PLAYTIME_EVENT = 'session_playtime_seconds' as const

export type TelemetrySpoolEventName =
  | typeof SESSION_PLAYTIME_EVENT
  | 'session_start'
  | 'session_end'
  | string

export interface TelemetrySpoolRecord {
  id: string
  event: TelemetrySpoolEventName
  gameId: string | null
  sessionId: string
  ts: string
  payload: Record<string, unknown>
  synced: boolean
}

export interface TelemetrySpoolStats {
  total: number
  unsynced: number
  durable: boolean
  backend: 'indexeddb' | 'memory'
}

const DB_NAME = 'aethel-telemetry-spool-v1'
const STORE = 'events'
const MAX_RECORDS = 5000

type MemoryBucket = Map<string, TelemetrySpoolRecord>

const memoryBuckets = new Map<string, MemoryBucket>()

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `spool_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function memoryBucket(ns: string): MemoryBucket {
  let bucket = memoryBuckets.get(ns)
  if (!bucket) {
    bucket = new Map()
    memoryBuckets.set(ns, bucket)
  }
  return bucket
}

function isBrowserIndexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined'
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: 'id' })
        os.createIndex('synced', 'synced', { unique: false })
        os.createIndex('ts', 'ts', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('INDEXEDDB_OPEN_FAILED'))
  })
}

function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('INDEXEDDB_REQUEST_FAILED'))
  })
}

async function enforceRingLimit(db: IDBDatabase): Promise<void> {
  const tx = db.transaction(STORE, 'readonly')
  const all = (await idbRequest(tx.objectStore(STORE).getAll())) as TelemetrySpoolRecord[]
  if (all.length <= MAX_RECORDS) return
  const sorted = [...all].sort((a, b) => a.ts.localeCompare(b.ts))
  const drop = sorted.slice(0, all.length - MAX_RECORDS)
  const wtx = db.transaction(STORE, 'readwrite')
  const store = wtx.objectStore(STORE)
  for (const row of drop) {
    store.delete(row.id)
  }
  await new Promise<void>((resolve, reject) => {
    wtx.oncomplete = () => resolve()
    wtx.onerror = () => reject(wtx.error ?? new Error('INDEXEDDB_TRIM_FAILED'))
  })
}

export class TelemetrySpool {
  private readonly namespace: string
  private readonly preferIndexedDb: boolean

  constructor(options: { namespace?: string; preferIndexedDb?: boolean } = {}) {
    this.namespace = options.namespace ?? 'default'
    this.preferIndexedDb = options.preferIndexedDb !== false
  }

  private useIndexedDb(): boolean {
    return this.preferIndexedDb && isBrowserIndexedDbAvailable()
  }

  async enqueue(input: {
    event: TelemetrySpoolEventName
    sessionId: string
    gameId?: string | null
    payload?: Record<string, unknown>
    ts?: string
  }): Promise<TelemetrySpoolRecord> {
    const record: TelemetrySpoolRecord = {
      id: makeId(),
      event: input.event,
      gameId: input.gameId ?? null,
      sessionId: input.sessionId,
      ts: input.ts ?? new Date().toISOString(),
      payload: input.payload ?? {},
      synced: false,
    }

    if (this.useIndexedDb()) {
      const db = await openDb()
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(record)
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error ?? new Error('INDEXEDDB_PUT_FAILED'))
      })
      await enforceRingLimit(db)
      db.close()
      return record
    }

    const bucket = memoryBucket(this.namespace)
    bucket.set(record.id, record)
    if (bucket.size > MAX_RECORDS) {
      const oldest = [...bucket.values()].sort((a, b) => a.ts.localeCompare(b.ts))
      for (let i = 0; i < oldest.length - MAX_RECORDS; i++) {
        bucket.delete(oldest[i].id)
      }
    }
    return record
  }

  async peekUnsynced(limit = 100): Promise<TelemetrySpoolRecord[]> {
    const capped = Math.max(1, Math.min(limit, 500))
    if (this.useIndexedDb()) {
      const db = await openDb()
      const tx = db.transaction(STORE, 'readonly')
      const all = (await idbRequest(tx.objectStore(STORE).getAll())) as TelemetrySpoolRecord[]
      db.close()
      return all
        .filter((r) => !r.synced)
        .sort((a, b) => a.ts.localeCompare(b.ts))
        .slice(0, capped)
    }
    return [...memoryBucket(this.namespace).values()]
      .filter((r) => !r.synced)
      .sort((a, b) => a.ts.localeCompare(b.ts))
      .slice(0, capped)
  }

  async markSynced(ids: string[]): Promise<number> {
    if (!ids.length) return 0
    const idSet = new Set(ids)
    if (this.useIndexedDb()) {
      const db = await openDb()
      const tx = db.transaction(STORE, 'readwrite')
      const store = tx.objectStore(STORE)
      let marked = 0
      for (const id of idSet) {
        const existing = (await idbRequest(store.get(id))) as TelemetrySpoolRecord | undefined
        if (!existing) continue
        existing.synced = true
        store.put(existing)
        marked++
      }
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error ?? new Error('INDEXEDDB_MARK_FAILED'))
      })
      db.close()
      return marked
    }
    const bucket = memoryBucket(this.namespace)
    let marked = 0
    for (const id of idSet) {
      const row = bucket.get(id)
      if (!row) continue
      row.synced = true
      marked++
    }
    return marked
  }

  async stats(): Promise<TelemetrySpoolStats> {
    if (this.useIndexedDb()) {
      const db = await openDb()
      const tx = db.transaction(STORE, 'readonly')
      const all = (await idbRequest(tx.objectStore(STORE).getAll())) as TelemetrySpoolRecord[]
      db.close()
      return {
        total: all.length,
        unsynced: all.filter((r) => !r.synced).length,
        durable: true,
        backend: 'indexeddb',
      }
    }
    const all = [...memoryBucket(this.namespace).values()]
    return {
      total: all.length,
      unsynced: all.filter((r) => !r.synced).length,
      durable: false,
      backend: 'memory',
    }
  }

  /** Test helper — wipe namespace / memory bucket. */
  async clearAll(): Promise<void> {
    if (this.useIndexedDb()) {
      const db = await openDb()
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).clear()
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error ?? new Error('INDEXEDDB_CLEAR_FAILED'))
      })
      db.close()
      return
    }
    memoryBuckets.delete(this.namespace)
  }
}

/** Shared browser spool — IndexedDB when available. */
export function getDefaultTelemetrySpool(): TelemetrySpool {
  return new TelemetrySpool({ namespace: 'player', preferIndexedDb: true })
}

/** Node/vitest spool — durable=false memory, still fail-closed on drop within process. */
export function createMemoryTelemetrySpool(namespace = 'test'): TelemetrySpool {
  return new TelemetrySpool({ namespace, preferIndexedDb: false })
}
