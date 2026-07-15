/**
 * J.4 continuous fs_watch — chokidar debounce → incremental file reindex.
 * Acceptance J-ACC-05: re-index dirty file < 5s p95 (measured in tests).
 */

import path from 'node:path'
import chokidar, { type FSWatcher } from 'chokidar'
import { createComponentLogger } from '@/lib/observability/logger'
import { indexFileIntoVectorStore } from './indexer'

const log = createComponentLogger('vector-index.watcher')

const globalWatch = globalThis as typeof globalThis & {
  __aethelVectorWatchers?: Map<string, FSWatcher>
  __aethelVectorWatcherActive?: Set<string>
}

function watchers(): Map<string, FSWatcher> {
  if (!globalWatch.__aethelVectorWatchers) globalWatch.__aethelVectorWatchers = new Map()
  return globalWatch.__aethelVectorWatchers
}

function activeSet(): Set<string> {
  if (!globalWatch.__aethelVectorWatcherActive) globalWatch.__aethelVectorWatcherActive = new Set()
  return globalWatch.__aethelVectorWatcherActive
}

export function isVectorWatcherActive(projectId: string): boolean {
  return activeSet().has(projectId)
}

export function stopVectorIndexWatcher(projectId: string): void {
  const w = watchers().get(projectId)
  if (w) {
    void w.close()
    watchers().delete(projectId)
  }
  activeSet().delete(projectId)
}

export function startVectorIndexWatcher(input: {
  projectId: string
  rootPath: string
  debounceMs?: number
}): FSWatcher {
  const existing = watchers().get(input.projectId)
  if (existing) return existing

  const debounceMs = input.debounceMs ?? 200
  const pending = new Map<string, NodeJS.Timeout>()

  const watcher = chokidar.watch(input.rootPath, {
    ignoreInitial: true,
    ignored: [
      /(^|[/\\])\../,
      /node_modules/,
      /\.next/,
      /\.aethel/,
      /dist/,
      /build/,
      /coverage/,
    ],
    awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 },
  })

  const schedule = (absPath: string) => {
    const prev = pending.get(absPath)
    if (prev) clearTimeout(prev)
    pending.set(
      absPath,
      setTimeout(() => {
        pending.delete(absPath)
        void indexFileIntoVectorStore({
          projectId: input.projectId,
          rootPath: input.rootPath,
          absoluteFilePath: absPath,
        })
          .then((n) => {
            log.info('vector_watch_reindex', {
              projectId: input.projectId,
              file: path.relative(input.rootPath, absPath),
              chunks: n,
            })
          })
          .catch((error) => {
            log.warn('vector_watch_reindex_failed', { error })
          })
      }, debounceMs),
    )
  }

  watcher.on('add', schedule)
  watcher.on('change', schedule)
  watcher.on('unlink', (absPath) => {
    void indexFileIntoVectorStore({
      projectId: input.projectId,
      rootPath: input.rootPath,
      absoluteFilePath: absPath,
    })
  })

  watchers().set(input.projectId, watcher)
  activeSet().add(input.projectId)
  log.info('vector_watcher_started', { projectId: input.projectId, rootPath: input.rootPath })
  return watcher
}
