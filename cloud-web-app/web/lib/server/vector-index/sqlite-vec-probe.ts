/**
 * J.4 — native sqlite-vec probe + certified load helper.
 * Claims available only after in-process loadExtension + vec_version + vec0 KNN soak.
 */

import { createRequire } from 'node:module'
import path from 'node:path'
// @ts-ignore -- Node 22+ built-in node:sqlite module
import { DatabaseSync } from 'node:sqlite'
import { createComponentLogger } from '@/lib/observability/logger'
import { VECTOR_EMBED_DIM } from './embed-provider'

const log = createComponentLogger('vector-index.sqlite-vec-probe')

export type SqliteVecProbeStatus = 'available' | 'held'

export interface SqliteVecProbeResult {
  status: SqliteVecProbeStatus
  loaded: boolean
  /** True only when loadExtension + vec0 soak proven in this process */
  sqliteVecExtension: boolean
  reason: string
  vecVersion?: string
  packageVersion?: string
  sqliteVersion?: string
}

type SqliteVecModule = {
  load: (db: { loadExtension: (file: string, entrypoint?: string) => void }) => void
  getLoadablePath?: () => string
}

type DatabaseSyncLike = {
  loadExtension: (file: string, entrypoint?: string) => void
  exec: (sql: string) => void
  prepare: (sql: string) => {
    get: (...params: unknown[]) => unknown
    run: (...params: unknown[]) => unknown
    all: (...params: unknown[]) => unknown[]
  }
}

let cached: SqliteVecProbeResult | null = null
let sqliteVecMod: SqliteVecModule | null = null

function resolveSqliteVecModule():
  | { ok: true; mod: SqliteVecModule; packageVersion: string }
  | { ok: false; reason: string } {
  try {
    const req = createRequire(path.join(process.cwd(), 'package.json'))
    const resolved = req.resolve('sqlite-vec')
    const mod = req(resolved) as SqliteVecModule
    let packageVersion = 'unknown'
    try {
      const pkgPath = req.resolve('sqlite-vec/package.json')
      packageVersion = String((req(pkgPath) as { version?: string }).version ?? 'unknown')
    } catch {
      // optional
    }
    if (typeof mod?.load !== 'function') {
      return { ok: false, reason: 'sqlite-vec module missing load() — JS cosine fallback (HELD)' }
    }
    return { ok: true, mod, packageVersion }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return {
      ok: false,
      reason: `sqlite-vec package not resolvable (${msg}) — JS cosine fallback (HELD)`,
    }
  }
}

function floatsToUint8(values: number[]): Uint8Array {
  const f = new Float32Array(values)
  return new Uint8Array(f.buffer, f.byteOffset, f.byteLength)
}

/**
 * Load sqlite-vec onto an already-opened DatabaseSync (allowExtension required).
 * Returns false without throwing when unavailable.
 */
export function loadSqliteVecOntoDb(db: DatabaseSyncLike): boolean {
  const probe = probeSqliteVecExtension()
  if (!probe.sqliteVecExtension || !sqliteVecMod) return false
  try {
    sqliteVecMod.load(db)
    const row = db.prepare('select vec_version() as v').get() as { v?: string } | undefined
    return Boolean(row?.v)
  } catch (error) {
    log.warn('sqlite_vec_load_onto_db_failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}

/**
 * Probe once per process. Optional package — missing/ABI fail = HELD, not crash.
 */
export function probeSqliteVecExtension(): SqliteVecProbeResult {
  if (cached) return cached

  const resolved = resolveSqliteVecModule()
  if (!resolved.ok) {
    cached = {
      status: 'held',
      loaded: false,
      sqliteVecExtension: false,
      reason: resolved.reason,
    }
    return cached
  }

  sqliteVecMod = resolved.mod

  try {
    const db = new DatabaseSync(':memory:', { allowExtension: true }) as unknown as DatabaseSyncLike
    resolved.mod.load(db)

    const sqliteVersion = String(
      (db.prepare('select sqlite_version() as v').get() as { v?: string } | undefined)?.v ?? '',
    )
    const vecVersion = String(
      (db.prepare('select vec_version() as v').get() as { v?: string } | undefined)?.v ?? '',
    )
    if (!vecVersion) {
      cached = {
        status: 'held',
        loaded: false,
        sqliteVecExtension: false,
        packageVersion: resolved.packageVersion,
        sqliteVersion,
        reason:
          'sqlite-vec loadExtension succeeded but vec_version() missing (ABI mismatch) — JS cosine fallback (HELD)',
      }
      return cached
    }

    // Certified soak: vec0 + cosine metric + KNN match
    db.exec(
      `create virtual table vec_soak using vec0(
        chunk_id text primary key,
        embedding float[${VECTOR_EMBED_DIM}] distance_metric=cosine
      )`,
    )
    const a = new Array<number>(VECTOR_EMBED_DIM).fill(0)
    a[0] = 1
    const b = new Array<number>(VECTOR_EMBED_DIM).fill(0)
    b[0] = 0.9
    b[1] = 0.1
    db.prepare('insert into vec_soak(chunk_id, embedding) values (?, ?)').run(
      'soak-a',
      floatsToUint8(a),
    )
    db.prepare('insert into vec_soak(chunk_id, embedding) values (?, ?)').run(
      'soak-b',
      floatsToUint8(b),
    )
    const hits = db
      .prepare('select chunk_id, distance from vec_soak where embedding match ? and k = 2')
      .all(floatsToUint8(a)) as Array<{ chunk_id: string; distance: number }>

    if (!hits.length || hits[0]?.chunk_id !== 'soak-a') {
      cached = {
        status: 'held',
        loaded: false,
        sqliteVecExtension: false,
        packageVersion: resolved.packageVersion,
        sqliteVersion,
        vecVersion,
        reason: 'sqlite-vec vec0 KNN soak failed ranking — JS cosine fallback (HELD)',
      }
      return cached
    }

    cached = {
      status: 'available',
      loaded: true,
      sqliteVecExtension: true,
      packageVersion: resolved.packageVersion,
      sqliteVersion,
      vecVersion,
      reason: `sqlite-vec ${resolved.packageVersion} vec_version=${vecVersion} sqlite=${sqliteVersion} vec0 cosine KNN soak OK`,
    }
    log.info('sqlite_vec_probe_available', {
      packageVersion: resolved.packageVersion,
      vecVersion,
      sqliteVersion,
    })
    return cached
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    cached = {
      status: 'held',
      loaded: false,
      sqliteVecExtension: false,
      packageVersion: resolved.packageVersion,
      reason: `sqlite-vec loadExtension/vec0 soak failed (${msg}) — JS cosine fallback (HELD)`,
    }
    log.warn('sqlite_vec_probe_held', { reason: cached.reason })
    return cached
  }
}

/** Test helper */
export function __resetSqliteVecProbeForTests(): void {
  cached = null
  sqliteVecMod = null
}

/**
 * Force probe result in tests (e.g. simulate held).
 */
export function __setSqliteVecProbeForTests(result: SqliteVecProbeResult | null): void {
  cached = result
  if (!result?.sqliteVecExtension) sqliteVecMod = null
}
