/**
 * Engine Asset Pipeline - split runtime modules.
 *
 * Asset loaders, cache, manager, manifest, and importer are split so Studio
 * asset flows can lazy-load heavy browser/Three.js loader code safely.
 */

export type AssetType = 
  | 'texture'
  | 'model'
  | 'audio'
  | 'shader'
  | 'material'
  | 'prefab'
  | 'scene'
  | 'script'
  | 'font'
  | 'animation'
  | 'json'
  | 'binary';

export type AssetStatus = 'pending' | 'loading' | 'loaded' | 'error' | 'unloaded';

export interface AssetMetadata {
  id: string;
  name: string;
  type: AssetType;
  path: string;
  size?: number;
  lastModified?: number;
  checksum?: string;
  tags?: string[];
  dependencies?: string[];
  customData?: Record<string, unknown>;
}

export interface AssetLoadOptions {
  priority?: number;
  cache?: boolean;
  forceReload?: boolean;
  timeout?: number;
  retries?: number;
  onProgress?: (progress: number) => void;
}

export interface Asset<T = unknown> {
  metadata: AssetMetadata;
  status: AssetStatus;
  data: T | null;
  error?: Error;
  loadedAt?: number;
  accessedAt?: number;
  refCount: number;
}

export interface AssetBundle {
  id: string;
  name: string;
  assets: string[];
  size: number;
  compressed?: boolean;
}

export interface TextureData {
  image: HTMLImageElement | ImageBitmap;
  width: number;
  height: number;
  format: string;
  mipmaps?: boolean;
}

export interface ModelData {
  vertices: Float32Array;
  indices: Uint16Array | Uint32Array;
  normals?: Float32Array;
  uvs?: Float32Array;
  tangents?: Float32Array;
  weights?: Float32Array;
  joints?: Uint16Array;
  boundingBox?: { min: number[]; max: number[] };
}

export interface AudioData {
  buffer: AudioBuffer;
  duration: number;
  channels: number;
  sampleRate: number;
}

export interface ShaderData {
  vertexSource: string;
  fragmentSource: string;
  uniforms?: string[];
  attributes?: string[];
}

export interface AssetCacheConfig {
  maxSize: number; // bytes
  maxAge: number; // milliseconds
  cleanupInterval: number; // milliseconds
}

// ============================================================================
// Asset Loaders
// ============================================================================

export interface AssetLoader<T> {
  type: AssetType;
  extensions: string[];
  load(path: string, options?: AssetLoadOptions): Promise<T>;
  unload?(data: T): void;
}
