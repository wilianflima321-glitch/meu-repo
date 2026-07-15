import type { RemotePeer } from '../../web/hooks/useCollaborationAwareness'

// ============= Types =============

export interface FileNode {
  id: string
  name: string
  type: 'file' | 'folder'
  path: string
  children?: FileNode[]
  modified?: boolean
  isNew?: boolean
  extension?: string
}

export interface FileExplorerProps {
  files?: FileNode[]
  collaborationPeers?: RemotePeer[]
  isLoading?: boolean
  error?: string | null
  onFileSelect?: (file: FileNode) => void
  onFileCreate?: (parentPath: string, type: 'file' | 'folder') => void
  onFileDelete?: (file: FileNode) => void
  onFileRename?: (file: FileNode, newName?: string) => void
  onRefresh?: () => void
  workspaceName?: string
  className?: string
}
