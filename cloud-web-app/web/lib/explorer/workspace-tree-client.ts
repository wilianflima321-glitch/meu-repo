/**
 * Focus 1B — single UI client for explorer tree authority.
 * Studio Local (Tauri): real host disk via `fs_tree` + `fs_watch`.
 * Web IDE: workspace disk via GET /api/workspace/tree-authority.
 * Fail-closed if authority is mock or missing.
 */

import { getAuthHeaders } from '@/lib/ai/change-feedback-client'
import {
  detectHostDiskBridgeAvailable,
  fetchHostDiskTreeAuthority,
  type HostDiskTreeResponse,
} from '@/lib/explorer/host-disk-tree-client'

export type WorkspaceTreeAuthorityNode = {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: WorkspaceTreeAuthorityNode[]
  size?: number
  modified?: string
}

export type TreeAuthorityKind = 'disk' | 'host-disk'

export type WorkspaceTreeAuthorityResponse = {
  authority: TreeAuthorityKind
  mock: false
  projectId: string
  tree: WorkspaceTreeAuthorityNode[]
  /** Present when authority === 'host-disk' */
  projectRoot?: string
  watchActive?: boolean
  source?: 'tauri-fs-tree' | 'workspace-tree-authority'
}

function resolveProjectId(explicit?: string): string {
  if (explicit?.trim()) return explicit.trim()
  if (typeof window === 'undefined') return 'default'
  const params = new URLSearchParams(window.location.search)
  const fromQuery = params.get('projectId')
  if (fromQuery?.trim()) return fromQuery.trim()
  const fromStorage = window.localStorage.getItem('aethel.workbench.lastProjectId')
  if (fromStorage?.trim()) return fromStorage.trim()
  return 'default'
}

/**
 * Load real workspace tree (GET /api/workspace/tree-authority?mode=tree).
 * Throws on non-disk / mock / HTTP errors — no silent fallback to /api/files/tree.
 */
export async function fetchWorkspaceTreeAuthority(input?: {
  projectId?: string
  depth?: number
}): Promise<WorkspaceTreeAuthorityResponse> {
  const projectId = resolveProjectId(input?.projectId)
  const depth = Math.max(1, Math.min(12, input?.depth ?? 6))
  const url = `/api/workspace/tree-authority?mode=tree&depth=${depth}`
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
      'x-project-id': projectId,
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Workspace tree authority failed (${res.status})`)
  }

  const data = (await res.json()) as {
    authority?: string
    mock?: boolean
    projectId?: string
    tree?: WorkspaceTreeAuthorityNode[]
    children?: WorkspaceTreeAuthorityNode[]
  }

  if (data.authority !== 'disk' || data.mock === true) {
    throw new Error('Workspace tree authority rejected — expected disk truth (mock forbidden)')
  }

  const tree = Array.isArray(data.tree)
    ? data.tree
    : Array.isArray(data.children)
      ? data.children
      : null

  if (!tree) {
    throw new Error('Workspace tree authority returned no tree')
  }

  return {
    authority: 'disk',
    mock: false,
    projectId: typeof data.projectId === 'string' ? data.projectId : projectId,
    tree,
    source: 'workspace-tree-authority',
  }
}

/**
 * Founder Focus 1B router — prefer host disk when Tauri bridge is present.
 */
export async function fetchExplorerTreeAuthority(input?: {
  projectId?: string
  projectRoot?: string
  depth?: number
  preferHostDisk?: boolean
}): Promise<WorkspaceTreeAuthorityResponse> {
  const preferHost = input?.preferHostDisk !== false && detectHostDiskBridgeAvailable()

  if (preferHost) {
    const host: HostDiskTreeResponse = await fetchHostDiskTreeAuthority({
      projectRoot: input?.projectRoot,
      depth: input?.depth,
      startWatch: true,
    })
    return {
      authority: 'host-disk',
      mock: false,
      projectId: resolveProjectId(input?.projectId),
      tree: host.tree,
      projectRoot: host.projectRoot,
      watchActive: host.watchActive,
      source: 'tauri-fs-tree',
    }
  }

  return fetchWorkspaceTreeAuthority(input)
}

export { subscribeHostDiskFsEvents, detectHostDiskBridgeAvailable, openHostProjectFolder } from '@/lib/explorer/host-disk-tree-client'
