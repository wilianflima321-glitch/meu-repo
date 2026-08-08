/**
 * J.4 — native sqlite-vec probe (honest HELD when binding unavailable).
 * Never claim ANN / vec0 without a successful load.
 */

import fs from 'node:fs'
import path from 'node:path'

export type SqliteVecProbeStatus = 'available' | 'held'

export interface SqliteVecProbeResult {
  status: SqliteVecProbeStatus
  loaded: boolean
  /** Always false until loadExtension + vec0 proven in this process */
  sqliteVecExtension: boolean
  reason: string
}

let cached: SqliteVecProbeResult | null = null

function packageJsonPresent(): boolean {
  try {
    const candidate = path.join(process.cwd(), 'node_modules', 'sqlite-vec', 'package.json')
    return fs.existsSync(candidate)
  } catch {
    return false
  }
}

/**
 * Probe once per process. sqlite-vec is optional — missing package = HELD, not error.
 */
export function probeSqliteVecExtension(): SqliteVecProbeResult {
  if (cached) return cached

  if (!packageJsonPresent()) {
    cached = {
      status: 'held',
      loaded: false,
      sqliteVecExtension: false,
      reason: 'sqlite-vec package not installed — JS cosine fallback (PARTIAL)',
    }
    return cached
  }

  // Package present but node:sqlite loadExtension + vec0 soak not proven here → still HELD.
  cached = {
    status: 'held',
    loaded: false,
    sqliteVecExtension: false,
    reason:
      'sqlite-vec package present but native loadExtension/vec0 soak not certified — JS cosine fallback (PARTIAL)',
  }
  return cached
}

/** Test helper */
export function __resetSqliteVecProbeForTests(): void {
  cached = null
}

/**
 * Force probe result in tests (e.g. simulate held).
 */
export function __setSqliteVecProbeForTests(result: SqliteVecProbeResult | null): void {
  cached = result
}
