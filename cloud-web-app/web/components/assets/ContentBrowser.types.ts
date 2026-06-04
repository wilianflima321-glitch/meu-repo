// ============================================================================
// TYPES
// ============================================================================

export type AssetType =
  | 'mesh'      // 3D Models (.fbx, .obj, .gltf)
  | 'texture'   // Images (.png, .jpg, .tga)
  | 'material'  // Material definitions
  | 'audio'     // Sound files (.wav, .mp3, .ogg)
  | 'video'     // Video files (.mp4, .webm)
  | 'blueprint' // Visual scripts
  | 'animation' // Animation clips
  | 'prefab'    // Prefab objects
  | 'level'     // Level/Scene files
  | 'folder'    // Folders
  | 'other';    // Other files

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  path: string;
  extension?: string;
  size?: number;
  thumbnail?: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    vertices?: number;
    triangles?: number;
  };
  isFavorite?: boolean;
  createdAt?: string;
  modifiedAt?: string;
}

export interface AssetFolder {
  id: string;
  name: string;
  path: string;
  children: (Asset | AssetFolder)[];
  isExpanded?: boolean;
}

export interface DragData {
  type: 'asset';
  asset: Asset;
}

export interface ContentBrowserProps {
  assets?: (Asset | AssetFolder)[];
  onAssetSelect?: (asset: Asset) => void;
  onAssetDragStart?: (asset: Asset, data: DragData) => void;
  onAssetDrop?: (asset: Asset, targetPath: string) => void;
  onAssetDelete?: (asset: Asset) => void;
  onAssetRename?: (asset: Asset, newName: string) => void;
  onAssetExport?: (asset: Asset) => void;
  onAssetDuplicate?: (asset: Asset) => void;
  onUpload?: (files: FileList) => void;
  onCreateFolder?: (path: string, name: string) => void;
  onRefresh?: () => void;
  searchValue?: string;
  filterTypeValue?: AssetType | 'all';
  selectedPathValue?: string | null;
  onSearchChange?: (value: string) => void;
  onFilterChange?: (value: AssetType | 'all') => void;
  onPathChange?: (value: string | null) => void;
}

export interface StorageRuntimeState {
  status: 'checking' | 'ready' | 'partial';
  label: string;
  detail: string | null;
}

export type ContentBrowserFilterType = AssetType | 'all';
