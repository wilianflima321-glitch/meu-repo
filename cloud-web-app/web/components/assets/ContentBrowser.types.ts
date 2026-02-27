import { Box, File, Folder, Image, Layers, Music, Package, Sparkles, Video, Zap } from 'lucide-react'

export type AssetType =
  | 'mesh'
  | 'texture'
  | 'material'
  | 'audio'
  | 'video'
  | 'blueprint'
  | 'animation'
  | 'prefab'
  | 'level'
  | 'folder'
  | 'other'

export interface Asset {
  id: string
  name: string
  type: AssetType
  path: string
  extension?: string
  size?: number
  thumbnail?: string
  metadata?: {
    width?: number
    height?: number
    duration?: number
    vertices?: number
    triangles?: number
  }
  isFavorite?: boolean
  createdAt?: string
  modifiedAt?: string
}

export interface AssetFolder {
  id: string
  name: string
  path: string
  children: (Asset | AssetFolder)[]
  isExpanded?: boolean
}

export interface DragData {
  type: 'asset'
  asset: Asset
}

export interface ContentBrowserProps {
  assets?: (Asset | AssetFolder)[]
  onAssetSelect?: (asset: Asset) => void
  onAssetDragStart?: (asset: Asset, data: DragData) => void
  onAssetDrop?: (asset: Asset, targetPath: string) => void
  onAssetDelete?: (asset: Asset) => void
  onAssetRename?: (asset: Asset, newName: string) => void
  onAssetExport?: (asset: Asset) => void
  onAssetDuplicate?: (asset: Asset) => void
  onUpload?: (files: FileList) => void
  onCreateFolder?: (path: string, name: string) => void
  onRefresh?: () => void
  searchValue?: string
  filterTypeValue?: AssetType | 'all'
  selectedPathValue?: string | null
  onSearchChange?: (value: string) => void
  onFilterChange?: (value: AssetType | 'all') => void
  onPathChange?: (value: string | null) => void
}

export const colors = {
  bg: '#0f0f14',
  surface: '#16161d',
  surfaceHover: '#1e1e28',
  surfaceActive: '#26263a',
  border: '#2a2a3a',
  borderFocus: '#4f46e5',
  text: '#e4e4eb',
  textMuted: '#8b8b9e',
  textDim: '#5a5a6e',
  primary: '#6366f1',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  accent: '#8b5cf6',
}

export const assetTypeConfig: Record<AssetType, { icon: typeof File; color: string; label: string }> = {
  mesh: { icon: Box, color: '#22c55e', label: '3D Model' },
  texture: { icon: Image, color: '#f59e0b', label: 'Texture' },
  material: { icon: Sparkles, color: '#ec4899', label: 'Material' },
  audio: { icon: Music, color: '#06b6d4', label: 'Audio' },
  video: { icon: Video, color: '#8b5cf6', label: 'Video' },
  blueprint: { icon: Zap, color: '#6366f1', label: 'Blueprint' },
  animation: { icon: Layers, color: '#f97316', label: 'Animation' },
  prefab: { icon: Package, color: '#14b8a6', label: 'Prefab' },
  level: { icon: Layers, color: '#a855f7', label: 'Level' },
  folder: { icon: Folder, color: '#f59e0b', label: 'Folder' },
  other: { icon: File, color: '#8b8b9e', label: 'File' },
}
