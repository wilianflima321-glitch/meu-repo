import type { RemotePeer } from '@/hooks/useCollaborationAwareness'
import type { FileNode } from './FileExplorerPro.types'

// ============= Workspace Tree =============

export type WorkspaceTreeNode = {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: WorkspaceTreeNode[]
}

export function mapWorkspaceNode(node: WorkspaceTreeNode): FileNode {
  const extension = node.type === 'file' ? node.name.split('.').pop()?.toLowerCase() : undefined
  return {
    id: node.path,
    name: node.name,
    type: node.type === 'directory' ? 'folder' : 'file',
    path: node.path,
    extension,
    children: node.children?.map(mapWorkspaceNode),
  }
}

export type ExplorerPresenceSummary = {
  peers: RemotePeer[]
  label: string
}

export function normalizeExplorerPath(path: string): string {
  if (!path) return '/'
  return path.startsWith('/') ? path : `/${path}`
}

export function describePresence(peers: RemotePeer[], nodeName: string): string {
  if (peers.length === 0) return ''
  const peerNames = peers.map((peer) => peer.name)
  const leading =
    peerNames.length === 1
      ? `${peerNames[0]} is active in ${nodeName}`
      : `${peerNames.length} collaborators are active in ${nodeName}`
  return `${leading}: ${peerNames.join(', ')}`
}

const WORKBENCH_PROJECT_STORAGE_KEY = 'aethel.workbench.lastProjectId'

export function resolveProjectIdFromClient(): string {
  if (typeof window === 'undefined') return 'default'
  const params = new URLSearchParams(window.location.search)
  const fromQuery = params.get('projectId')
  if (fromQuery && fromQuery.trim()) return fromQuery.trim()
  const fromStorage = localStorage.getItem(WORKBENCH_PROJECT_STORAGE_KEY)
  if (fromStorage && fromStorage.trim()) return fromStorage.trim()
  return 'default'
}
