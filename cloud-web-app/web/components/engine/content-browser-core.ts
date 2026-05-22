export type AssetType = 
  | 'folder'
  | 'mesh'
  | 'texture'
  | 'material'
  | 'blueprint'
  | 'animation'
  | 'audio'
  | 'video'
  | 'level'
  | 'particle'
  | 'physics'
  | 'font'
  | 'data'
  | 'script'
  | 'prefab'
  | 'unknown';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  path: string;
  size: number;
  createdAt: Date;
  modifiedAt: Date;
  thumbnail?: string;
  metadata?: Record<string, unknown>;
  children?: Asset[];
  isLoaded?: boolean;
  tags?: string[];
  starred?: boolean;
}

export interface AssetFilter {
  type?: AssetType[];
  search?: string;
  tags?: string[];
  starred?: boolean;
  dateRange?: { start: Date; end: Date };
}

export interface ImportOptions {
  generateMipmaps?: boolean;
  compressTextures?: boolean;
  importNormals?: boolean;
  importAnimations?: boolean;
  scale?: number;
  flipY?: boolean;
}

// ============================================================================
// ASSET TYPE ICONS & COLORS
// ============================================================================

export const ASSET_CONFIG: Record<AssetType, { icon: string; color: string; extensions: string[] }> = {
  folder: { icon: '📁', color: 'var(--aethel-warning)', extensions: [] },
  mesh: { icon: '🔷', color: 'var(--aethel-primary)', extensions: ['.fbx', '.obj', '.gltf', '.glb', '.dae', '.3ds'] },
  texture: { icon: '🖼️', color: 'var(--aethel-success)', extensions: ['.png', '.jpg', '.jpeg', '.webp', '.tga', '.bmp', '.exr', '.hdr'] },
  material: { icon: '🎨', color: 'var(--aethel-accent)', extensions: ['.mat', '.material'] },
  blueprint: { icon: '📐', color: 'var(--aethel-primary)', extensions: ['.blueprint', '.bp'] },
  animation: { icon: '🎬', color: 'var(--aethel-warning)', extensions: ['.anim', '.fbx'] },
  audio: { icon: '🔊', color: 'var(--aethel-info)', extensions: ['.mp3', '.wav', '.ogg', '.flac', '.m4a'] },
  video: { icon: '🎥', color: 'var(--aethel-secondary)', extensions: ['.mp4', '.webm', '.mov', '.avi'] },
  level: { icon: '🗺️', color: 'var(--aethel-text-quaternary)', extensions: ['.level', '.scene', '.map'] },
  particle: { icon: '✨', color: 'var(--aethel-warning)', extensions: ['.vfx', '.particle'] },
  physics: { icon: '⚡', color: 'var(--aethel-text-tertiary)', extensions: ['.physics', '.collision'] },
  font: { icon: '🔤', color: 'var(--aethel-text-tertiary)', extensions: ['.ttf', '.otf', '.woff', '.woff2'] },
  data: { icon: '📊', color: 'var(--aethel-primary)', extensions: ['.json', '.xml', '.csv', '.yaml'] },
  script: { icon: '📜', color: 'var(--aethel-success)', extensions: ['.ts', '.js', '.tsx', '.jsx'] },
  prefab: { icon: '📦', color: 'var(--aethel-info)', extensions: ['.prefab'] },
  unknown: { icon: '❓', color: 'var(--aethel-text-tertiary)', extensions: [] },
};

export function getAssetType(filename: string): AssetType {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  for (const [type, config] of Object.entries(ASSET_CONFIG)) {
    if (config.extensions.includes(ext)) {
      return type as AssetType;
    }
  }
  return 'unknown';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
