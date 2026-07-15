import { DbProjectFileStore } from './db-store'
import { DiskProjectFileStore } from './disk-store'
import type { ProjectFileBackendKind, ProjectFileStore } from './types'

export * from './types'
export { DbProjectFileStore } from './db-store'
export { DiskProjectFileStore } from './disk-store'

/**
 * Detects ephemeral-disk serverless runtimes where the DB backend must be the
 * source of truth (on-disk workspaces do not survive between invocations).
 */
export function isServerlessRuntime(): boolean {
  return Boolean(
    process.env.VERCEL ||
      process.env.NETLIFY ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.FUNCTIONS_WORKER_RUNTIME
  )
}

export function selectProjectFileBackend(): ProjectFileBackendKind {
  const override = String(process.env.AETHEL_FILE_STORE || '')
    .trim()
    .toLowerCase()
  if (override === 'disk' || override === 'db') return override
  return isServerlessRuntime() ? 'db' : 'disk'
}

let diskInstance: DiskProjectFileStore | null = null
let dbInstance: DbProjectFileStore | null = null

/**
 * Returns the canonical project file store for the current runtime (or an
 * explicit backend when provided). Both the agent tool registry and the apply
 * pipeline route through this so there is a single logical source of truth.
 */
export function getProjectFileStore(backend?: ProjectFileBackendKind): ProjectFileStore {
  const chosen = backend ?? selectProjectFileBackend()
  if (chosen === 'db') {
    dbInstance ??= new DbProjectFileStore()
    return dbInstance
  }
  diskInstance ??= new DiskProjectFileStore()
  return diskInstance
}
