/**
 * Focus 1B (Founder) — Studio Local host-disk tree authority.
 * Lists REAL OS paths via Tauri `fs_tree` + refreshes on `fs_event` from `fs_watch`.
 * Zero-MVP: no mock tree; outside Tauri this module must not pretend to be host disk.
 */

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('host-disk-tree-client')

export const HOST_PROJECT_ROOT_STORAGE_KEY = 'aethel.studio.hostProjectRoot'

export type HostDiskTreeAuthority = 'host-disk'

/** Same shape as workspace tree nodes — kept local to avoid circular imports. */
export type HostMappedTreeNode = {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: HostMappedTreeNode[]
  size?: number
  modified?: string
}

export type HostDiskTreeResponse = {
  authority: HostDiskTreeAuthority
  source: 'tauri-fs-tree'
  mock: false
  projectRoot: string
  watchActive: boolean
  tree: HostMappedTreeNode[]
}

export type HostDiskTreeNodeRust = {
  name: string
  path: string
  type: string
  children?: HostDiskTreeNodeRust[]
}

function isTauriRuntime(): boolean {
  if (typeof window === 'undefined') return false
  return '__TAURI_INTERNALS__' in window || '__TAURI__' in window
}

export function detectHostDiskBridgeAvailable(): boolean {
  return isTauriRuntime()
}

function normalizeEntryType(raw: string): 'file' | 'directory' {
  const t = raw.toLowerCase()
  if (t === 'directory' || t === 'folder' || t === 'dir') return 'directory'
  return 'file'
}

/** Map Rust `FileTreeNode` → explorer workspace node shape. */
export function mapHostDiskTreeNodes(nodes: HostDiskTreeNodeRust[]): HostMappedTreeNode[] {
  return nodes.map((node) => {
    const type = normalizeEntryType(node.type)
    const children =
      type === 'directory' && Array.isArray(node.children)
        ? mapHostDiskTreeNodes(node.children)
        : undefined
    return {
      name: node.name,
      path: node.path,
      type,
      children,
    }
  })
}

/** Dynamic import that Vite/vitest cannot statically resolve (desktop-only deps). */
async function importDesktopModule<T>(relativeApi: 'core' | 'event'): Promise<T> {
  const specifier = ['@tauri-apps', 'api', relativeApi].join('/')
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
  const dynamicImport = new Function('s', 'return import(s)') as (s: string) => Promise<T>
  return dynamicImport(specifier)
}

async function tauriInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const core = await importDesktopModule<{
    invoke: (cmd: string, args?: Record<string, unknown>) => Promise<T>
  }>('core')
  return core.invoke(command, args)
}

function readStoredHostRoot(): string | null {
  if (typeof window === 'undefined') return null
  const fromQuery = new URLSearchParams(window.location.search).get('hostRoot')
  if (fromQuery?.trim()) return fromQuery.trim()
  const stored = window.localStorage.getItem(HOST_PROJECT_ROOT_STORAGE_KEY)
  return stored?.trim() || null
}

export function persistHostProjectRoot(absolutePath: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(HOST_PROJECT_ROOT_STORAGE_KEY, absolutePath)
}

/**
 * Resolve which absolute directory FileExplorer should list.
 * Prefer Rust ProjectRootState → stored/query hostRoot → set_project_root → cwd `.`.
 */
export async function resolveHostProjectRoot(explicit?: string): Promise<{
  projectRoot: string
  via: 'explicit' | 'tauri-state' | 'storage' | 'cwd-fallback'
}> {
  if (!isTauriRuntime()) {
    throw new Error('Host disk tree requires Studio Local (Tauri) bridge')
  }

  if (explicit?.trim()) {
    const resolved = await tauriInvoke<string>('set_project_root', { path: explicit.trim() })
    persistHostProjectRoot(resolved)
    return { projectRoot: resolved, via: 'explicit' }
  }

  const fromState = await tauriInvoke<string | null>('get_project_root')
  if (fromState?.trim()) {
    persistHostProjectRoot(fromState)
    return { projectRoot: fromState, via: 'tauri-state' }
  }

  const stored = readStoredHostRoot()
  if (stored) {
    const resolved = await tauriInvoke<string>('set_project_root', { path: stored })
    persistHostProjectRoot(resolved)
    return { projectRoot: resolved, via: 'storage' }
  }

  // Last resort: list process CWD (honest fallback — still real host disk, not mock).
  try {
    const resolved = await tauriInvoke<string>('set_project_root', { path: '.' })
    persistHostProjectRoot(resolved)
    log.warn('host_disk_cwd_fallback', {
      note: 'No set_project_root / hostRoot yet — listing process CWD until a project folder is opened',
      projectRoot: resolved,
    })
    return { projectRoot: resolved, via: 'cwd-fallback' }
  } catch (err) {
    log.warn('host_disk_cwd_set_failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return { projectRoot: '.', via: 'cwd-fallback' }
  }
}

export async function fetchHostDiskTreeAuthority(input?: {
  projectRoot?: string
  depth?: number
  startWatch?: boolean
}): Promise<HostDiskTreeResponse> {
  if (!isTauriRuntime()) {
    throw new Error('Host disk authority unavailable outside Tauri — use workspace tree-authority')
  }

  const depth = Math.max(1, Math.min(12, input?.depth ?? 6))
  const { projectRoot } = await resolveHostProjectRoot(input?.projectRoot)
  const pathForTree = projectRoot === '.' ? '.' : projectRoot

  const raw = await tauriInvoke<HostDiskTreeNodeRust[]>('fs_tree', {
    path: pathForTree,
    maxDepth: depth,
  })

  if (!Array.isArray(raw)) {
    throw new Error('fs_tree returned non-array — host disk authority rejected')
  }

  let watchActive = false
  if (input?.startWatch !== false) {
    try {
      const status = await tauriInvoke<{ state?: string }>('fs_watch', { path: pathForTree })
      watchActive = status?.state === 'watching'
    } catch (err) {
      log.warn('fs_watch_start_failed', {
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return {
    authority: 'host-disk',
    source: 'tauri-fs-tree',
    mock: false,
    projectRoot: pathForTree,
    watchActive,
    tree: mapHostDiskTreeNodes(raw),
  }
}

export type HostFsEventUnlisten = () => void

/**
 * Open / switch the Studio Local project root on real host disk.
 * Prefer native folder picker (`pick_project_directory`); fall back to an
 * absolute-path prompt so Focus 1B never silently invents a mock tree.
 */
export async function openHostProjectFolder(explicitPath?: string): Promise<{
  projectRoot: string
  via: 'explicit' | 'native-picker' | 'prompt'
}> {
  if (!isTauriRuntime()) {
    throw new Error('Open host folder requires Studio Local (Tauri)')
  }

  if (explicitPath?.trim()) {
    const { projectRoot } = await resolveHostProjectRoot(explicitPath.trim())
    return { projectRoot, via: 'explicit' }
  }

  try {
    const picked = await tauriInvoke<string | null>('pick_project_directory')
    if (picked?.trim()) {
      const { projectRoot } = await resolveHostProjectRoot(picked.trim())
      return { projectRoot, via: 'native-picker' }
    }
  } catch (err) {
    log.warn('pick_project_directory_unavailable', {
      error: err instanceof Error ? err.message : String(err),
      note: 'Falling back to absolute-path prompt',
    })
  }

  if (typeof window === 'undefined') {
    throw new Error('Cannot prompt for host folder outside browser')
  }
  const typed = window.prompt(
    'Enter absolute host project folder path (Windows example: E:\\Games\\MyProject)',
    readStoredHostRoot() ?? '',
  )
  if (!typed?.trim()) {
    throw new Error('Host folder open cancelled')
  }
  const { projectRoot } = await resolveHostProjectRoot(typed.trim())
  return { projectRoot, via: 'prompt' }
}

/**
 * Subscribe to Rust `fs_event` (notify → UI). Debounce so Windows Explorer
 * folder creates appear in Aethel without thrashing full-tree reloads.
 */
export async function subscribeHostDiskFsEvents(
  onPaths: (paths: string[]) => void,
  options?: { debounceMs?: number },
): Promise<HostFsEventUnlisten> {
  if (!isTauriRuntime()) {
    return () => undefined
  }

  const debounceMs = Math.max(50, options?.debounceMs ?? 120)
  let timer: ReturnType<typeof setTimeout> | null = null
  let pending: string[] = []

  const eventApi = await importDesktopModule<{
    listen: <T>(
      event: string,
      handler: (event: { payload: T }) => void,
    ) => Promise<() => void>
  }>('event')

  const unlisten = await eventApi.listen<string[]>('fs_event', (event) => {
    const paths = Array.isArray(event.payload) ? event.payload : []
    pending = pending.concat(paths)
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      const batch = pending
      pending = []
      timer = null
      onPaths(batch)
    }, debounceMs)
  })

  return () => {
    if (timer) clearTimeout(timer)
    unlisten()
  }
}
