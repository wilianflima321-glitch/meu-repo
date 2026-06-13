import { getProjectFileStore, selectProjectFileBackend } from '@/lib/server/project-file-store'

export interface MirrorResult {
  mirrored: boolean
  backend: string
  count: number
}

/**
 * Keeps the canonical project file store in sync after a successful apply.
 *
 * The apply pipeline writes to the on-disk workspace (rollback, QA gate, and
 * dependency analysis are all disk-coupled). On disk-canonical runtimes
 * (persistent server / desktop) that disk IS the source of truth, so this is a
 * no-op. On serverless/db-canonical runtimes the disk is ephemeral, so we mirror
 * the final content into the DB store the live IDE reads from. Best-effort: it
 * never throws and never blocks an apply that already succeeded.
 */
export async function mirrorAppliedChangesToCanonicalStore(params: {
  userId: string
  projectId: string
  changes: Array<{ virtualPath: string; content: string; language?: string }>
}): Promise<MirrorResult> {
  try {
    const backend = selectProjectFileBackend()
    if (backend === 'disk') {
      // The apply pipeline already wrote to the canonical (disk) store.
      return { mirrored: false, backend, count: 0 }
    }

    const store = getProjectFileStore(backend)
    let count = 0
    for (const change of params.changes) {
      await store.write(
        { userId: params.userId, projectId: params.projectId, path: change.virtualPath },
        change.content,
        change.language ? { language: change.language } : undefined
      )
      count += 1
    }
    return { mirrored: true, backend, count }
  } catch {
    return { mirrored: false, backend: 'unknown', count: 0 }
  }
}
