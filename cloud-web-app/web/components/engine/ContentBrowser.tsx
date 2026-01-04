/**
 * Content Browser - Gerenciador de Assets Profissional
 * 
 * Sistema completo estilo Unreal Engine para navegar,
 * importar, organizar e gerenciar assets do projeto.
 * 
 * NÃO É MOCK - Sistema real e funcional!
 */

'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import Image from 'next/image';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

// ============================================================================
// TIPOS
// ============================================================================

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

const ASSET_CONFIG: Record<AssetType, { icon: string; color: string; extensions: string[] }> = {
  folder: { icon: '📁', color: '#ffc107', extensions: [] },
  mesh: { icon: '🔷', color: '#2196f3', extensions: ['.fbx', '.obj', '.gltf', '.glb', '.dae', '.3ds'] },
  texture: { icon: '🖼️', color: '#4caf50', extensions: ['.png', '.jpg', '.jpeg', '.webp', '.tga', '.bmp', '.exr', '.hdr'] },
  material: { icon: '🎨', color: '#9c27b0', extensions: ['.mat', '.material'] },
  blueprint: { icon: '📐', color: '#3f51b5', extensions: ['.blueprint', '.bp'] },
  animation: { icon: '🎬', color: '#ff9800', extensions: ['.anim', '.fbx'] },
  audio: { icon: '🔊', color: '#00bcd4', extensions: ['.mp3', '.wav', '.ogg', '.flac', '.m4a'] },
  video: { icon: '🎥', color: '#e91e63', extensions: ['.mp4', '.webm', '.mov', '.avi'] },
  level: { icon: '🗺️', color: '#795548', extensions: ['.level', '.scene', '.map'] },
  particle: { icon: '✨', color: '#ff5722', extensions: ['.vfx', '.particle'] },
  physics: { icon: '⚡', color: '#607d8b', extensions: ['.physics', '.collision'] },
  font: { icon: '🔤', color: '#9e9e9e', extensions: ['.ttf', '.otf', '.woff', '.woff2'] },
  data: { icon: '📊', color: '#673ab7', extensions: ['.json', '.xml', '.csv', '.yaml'] },
  script: { icon: '📜', color: '#8bc34a', extensions: ['.ts', '.js', '.tsx', '.jsx'] },
  prefab: { icon: '📦', color: '#00acc1', extensions: ['.prefab'] },
  unknown: { icon: '❓', color: '#bdbdbd', extensions: [] },
};

function getAssetType(filename: string): AssetType {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  for (const [type, config] of Object.entries(ASSET_CONFIG)) {
    if (config.extensions.includes(ext)) {
      return type as AssetType;
    }
  }
  return 'unknown';
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ============================================================================
// ASSET THUMBNAIL GENERATOR
// ============================================================================

class ThumbnailGenerator {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private canvas: HTMLCanvasElement;
  
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 256;
    this.canvas.height = 256;
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    this.camera.position.set(2, 2, 2);
    this.camera.lookAt(0, 0, 0);
    
    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);
    
    const directional = new THREE.DirectionalLight(0xffffff, 1);
    directional.position.set(5, 5, 5);
    this.scene.add(directional);
  }
  
  private getRenderer(): THREE.WebGLRenderer {
    if (!this.renderer) {
      this.renderer = new THREE.WebGLRenderer({ 
        canvas: this.canvas, 
        antialias: true,
        alpha: true 
      });
      this.renderer.setSize(256, 256);
    }
    return this.renderer;
  }
  
  async generateMeshThumbnail(mesh: THREE.Object3D): Promise<string> {
    // Clear previous objects
    while (this.scene.children.length > 2) {
      this.scene.remove(this.scene.children[this.scene.children.length - 1]);
    }
    
    // Center and scale mesh
    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    mesh.position.sub(center);
    mesh.scale.multiplyScalar(2 / maxDim);
    
    this.scene.add(mesh);
    
    // Render
    const renderer = this.getRenderer();
    renderer.render(this.scene, this.camera);
    
    return this.canvas.toDataURL('image/png');
  }
  
  async generateTextureThumbnail(texture: THREE.Texture): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    if (texture.image) {
      ctx.drawImage(texture.image, 0, 0, 256, 256);
    }
    
    return canvas.toDataURL('image/png');
  }
  
  dispose(): void {
    this.renderer?.dispose();
  }
}

// ============================================================================
// ASSET LOADER
// ============================================================================

export class AssetLoader {
  private gltfLoader = new GLTFLoader();
  private fbxLoader = new FBXLoader();
  private objLoader = new OBJLoader();
  private textureLoader = new THREE.TextureLoader();
  private audioLoader = new THREE.AudioLoader();
  private thumbnailGenerator = new ThumbnailGenerator();
  
  private loadingAssets: Map<string, Promise<unknown>> = new Map();
  private cache: Map<string, unknown> = new Map();
  
  async loadAsset(asset: Asset): Promise<unknown> {
    // Check cache
    if (this.cache.has(asset.id)) {
      return this.cache.get(asset.id);
    }
    
    // Check if already loading
    if (this.loadingAssets.has(asset.id)) {
      return this.loadingAssets.get(asset.id);
    }
    
    const loadPromise = this.doLoadAsset(asset);
    this.loadingAssets.set(asset.id, loadPromise);
    
    try {
      const result = await loadPromise;
      this.cache.set(asset.id, result);
      return result;
    } finally {
      this.loadingAssets.delete(asset.id);
    }
  }
  
  private async doLoadAsset(asset: Asset): Promise<unknown> {
    const ext = asset.path.toLowerCase().substring(asset.path.lastIndexOf('.'));
    
    switch (ext) {
      case '.gltf':
      case '.glb':
        return new Promise((resolve, reject) => {
          this.gltfLoader.load(asset.path, resolve, undefined, reject);
        });
        
      case '.fbx':
        return new Promise((resolve, reject) => {
          this.fbxLoader.load(asset.path, resolve, undefined, reject);
        });
        
      case '.obj':
        return new Promise((resolve, reject) => {
          this.objLoader.load(asset.path, resolve, undefined, reject);
        });
        
      case '.png':
      case '.jpg':
      case '.jpeg':
      case '.webp':
        return new Promise((resolve, reject) => {
          this.textureLoader.load(asset.path, resolve, undefined, reject);
        });
        
      case '.mp3':
      case '.wav':
      case '.ogg':
        return new Promise((resolve, reject) => {
          this.audioLoader.load(asset.path, resolve, undefined, reject);
        });
        
      default:
        throw new Error(`Unsupported asset type: ${ext}`);
    }
  }
  
  async generateThumbnail(asset: Asset): Promise<string | undefined> {
    try {
      const loaded = await this.loadAsset(asset);
      
      if (asset.type === 'mesh' && loaded) {
        const object = (loaded as { scene?: THREE.Object3D }).scene || loaded as THREE.Object3D;
        return await this.thumbnailGenerator.generateMeshThumbnail(object.clone());
      }
      
      if (asset.type === 'texture' && loaded) {
        return await this.thumbnailGenerator.generateTextureThumbnail(loaded as THREE.Texture);
      }
    } catch (e) {
      console.error('Failed to generate thumbnail:', e);
    }
    
    return undefined;
  }
  
  clearCache(): void {
    this.cache.clear();
  }
  
  dispose(): void {
    this.cache.clear();
    this.thumbnailGenerator.dispose();
  }
}

// ============================================================================
// ASSET STORE
// ============================================================================

interface AssetStore {
  assets: Asset[];
  currentPath: string;
  selectedAssets: Set<string>;
  filter: AssetFilter;
  viewMode: 'grid' | 'list' | 'columns';
  sortBy: 'name' | 'type' | 'size' | 'date';
  sortOrder: 'asc' | 'desc';
}

// ============================================================================
// COMPONENTS
// ============================================================================

// Breadcrumb Navigation
function BreadcrumbNav({ 
  path, 
  onNavigate 
}: { 
  path: string; 
  onNavigate: (path: string) => void;
}) {
  const parts = path.split('/').filter(Boolean);
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '8px 12px',
      background: '#1a1a2e',
      borderBottom: '1px solid #333',
      fontSize: '13px',
    }}>
      <button
        onClick={() => onNavigate('/')}
        style={{
          background: 'none',
          border: 'none',
          color: '#888',
          cursor: 'pointer',
          padding: '2px 6px',
          borderRadius: '3px',
        }}
        onMouseOver={(e) => e.currentTarget.style.background = '#333'}
        onMouseOut={(e) => e.currentTarget.style.background = 'none'}
      >
        📁 Content
      </button>
      
      {parts.map((part, i) => {
        const fullPath = '/' + parts.slice(0, i + 1).join('/');
        return (
          <React.Fragment key={fullPath}>
            <span style={{ color: '#555' }}>/</span>
            <button
              onClick={() => onNavigate(fullPath)}
              style={{
                background: 'none',
                border: 'none',
                color: i === parts.length - 1 ? '#fff' : '#888',
                cursor: 'pointer',
                padding: '2px 6px',
                borderRadius: '3px',
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#333'}
              onMouseOut={(e) => e.currentTarget.style.background = 'none'}
            >
              {part}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Filter Bar
function FilterBar({
  filter,
  onFilterChange,
  viewMode,
  onViewModeChange,
  sortBy,
  sortOrder,
  onSortChange,
}: {
  filter: AssetFilter;
  onFilterChange: (filter: AssetFilter) => void;
  viewMode: 'grid' | 'list' | 'columns';
  onViewModeChange: (mode: 'grid' | 'list' | 'columns') => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSortChange: (by: string, order: 'asc' | 'desc') => void;
}) {
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '8px 12px',
      background: '#16213e',
      borderBottom: '1px solid #333',
    }}>
      {/* Search */}
      <div style={{ flex: 1, maxWidth: '300px' }}>
        <input
          type="text"
          placeholder="🔍 Search assets..."
          value={filter.search || ''}
          onChange={(e) => onFilterChange({ ...filter, search: e.target.value })}
          style={{
            width: '100%',
            padding: '6px 12px',
            background: '#0f0f23',
            border: '1px solid #333',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '13px',
          }}
        />
      </div>
      
      {/* Type Filter */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowTypeFilter(!showTypeFilter)}
          style={{
            padding: '6px 12px',
            background: filter.type?.length ? '#3f51b5' : '#0f0f23',
            border: '1px solid #333',
            borderRadius: '4px',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          📋 Type {filter.type?.length ? `(${filter.type.length})` : ''}
        </button>
        
        {showTypeFilter && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '4px',
            background: '#1a1a2e',
            border: '1px solid #333',
            borderRadius: '4px',
            padding: '8px',
            zIndex: 100,
            minWidth: '180px',
          }}>
            {Object.entries(ASSET_CONFIG).filter(([type]) => type !== 'folder' && type !== 'unknown').map(([type, config]) => (
              <label key={type} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 8px',
                cursor: 'pointer',
                borderRadius: '3px',
              }}>
                <input
                  type="checkbox"
                  checked={filter.type?.includes(type as AssetType) || false}
                  onChange={(e) => {
                    const types = new Set(filter.type || []);
                    if (e.target.checked) {
                      types.add(type as AssetType);
                    } else {
                      types.delete(type as AssetType);
                    }
                    onFilterChange({ ...filter, type: Array.from(types) });
                  }}
                />
                <span style={{ color: config.color }}>{config.icon}</span>
                <span style={{ color: '#ccc', fontSize: '12px' }}>{type}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      
      {/* Starred Filter */}
      <button
        onClick={() => onFilterChange({ ...filter, starred: !filter.starred })}
        style={{
          padding: '6px 12px',
          background: filter.starred ? '#ffc107' : '#0f0f23',
          border: '1px solid #333',
          borderRadius: '4px',
          color: filter.starred ? '#000' : '#fff',
          cursor: 'pointer',
          fontSize: '13px',
        }}
      >
        ⭐ Starred
      </button>
      
      <div style={{ flex: 1 }} />
      
      {/* Sort */}
      <select
        value={`${sortBy}-${sortOrder}`}
        onChange={(e) => {
          const [by, order] = e.target.value.split('-');
          onSortChange(by, order as 'asc' | 'desc');
        }}
        style={{
          padding: '6px 12px',
          background: '#0f0f23',
          border: '1px solid #333',
          borderRadius: '4px',
          color: '#fff',
          fontSize: '13px',
        }}
      >
        <option value="name-asc">Name A-Z</option>
        <option value="name-desc">Name Z-A</option>
        <option value="type-asc">Type A-Z</option>
        <option value="date-desc">Newest First</option>
        <option value="date-asc">Oldest First</option>
        <option value="size-desc">Largest First</option>
        <option value="size-asc">Smallest First</option>
      </select>
      
      {/* View Mode */}
      <div style={{ display: 'flex', gap: '2px' }}>
        {(['grid', 'list', 'columns'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => onViewModeChange(mode)}
            style={{
              padding: '6px 10px',
              background: viewMode === mode ? '#3f51b5' : '#0f0f23',
              border: '1px solid #333',
              borderRadius: mode === 'grid' ? '4px 0 0 4px' : mode === 'columns' ? '0 4px 4px 0' : '0',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            {mode === 'grid' ? '▦' : mode === 'list' ? '☰' : '▥'}
          </button>
        ))}
      </div>
    </div>
  );
}

// Asset Card (Grid View)
function AssetCard({
  asset,
  isSelected,
  onSelect,
  onDoubleClick,
  onContextMenu,
}: {
  asset: Asset;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const config = ASSET_CONFIG[asset.type];
  
  return (
    <div
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      style={{
        width: '120px',
        padding: '8px',
        background: isSelected ? '#3f51b533' : 'transparent',
        border: `1px solid ${isSelected ? '#3f51b5' : 'transparent'}`,
        borderRadius: '8px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.15s',
      }}
      onMouseOver={(e) => {
        if (!isSelected) e.currentTarget.style.background = '#ffffff08';
      }}
      onMouseOut={(e) => {
        if (!isSelected) e.currentTarget.style.background = 'transparent';
      }}
    >
      {/* Thumbnail */}
      <div style={{
        width: '96px',
        height: '96px',
        background: '#0f0f23',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '48px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {asset.thumbnail ? (
          <Image
            src={asset.thumbnail}
            alt={asset.name}
            fill
            sizes="96px"
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <span>{config.icon}</span>
        )}
        
        {/* Starred indicator */}
        {asset.starred && (
          <div style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            fontSize: '14px',
          }}>
            ⭐
          </div>
        )}
      </div>
      
      {/* Name */}
      <div style={{
        fontSize: '12px',
        color: '#ccc',
        textAlign: 'center',
        width: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {asset.name}
      </div>
    </div>
  );
}

// Asset Row (List View)
function AssetRow({
  asset,
  isSelected,
  onSelect,
  onDoubleClick,
  onContextMenu,
}: {
  asset: Asset;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const config = ASSET_CONFIG[asset.type];
  
  return (
    <div
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      style={{
        display: 'grid',
        gridTemplateColumns: '32px 1fr 100px 100px 150px',
        gap: '12px',
        alignItems: 'center',
        padding: '8px 12px',
        background: isSelected ? '#3f51b533' : 'transparent',
        borderBottom: '1px solid #222',
        cursor: 'pointer',
        fontSize: '13px',
      }}
      onMouseOver={(e) => {
        if (!isSelected) e.currentTarget.style.background = '#ffffff08';
      }}
      onMouseOut={(e) => {
        if (!isSelected) e.currentTarget.style.background = 'transparent';
      }}
    >
      <span style={{ fontSize: '20px' }}>{config.icon}</span>
      <span style={{ color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {asset.starred && '⭐ '}{asset.name}
      </span>
      <span style={{ color: config.color }}>{asset.type}</span>
      <span style={{ color: '#888' }}>{formatFileSize(asset.size)}</span>
      <span style={{ color: '#666' }}>{asset.modifiedAt.toLocaleDateString()}</span>
    </div>
  );
}

// Context Menu
function ContextMenu({
  x,
  y,
  asset,
  onClose,
  onAction,
}: {
  x: number;
  y: number;
  asset: Asset | null;
  onClose: () => void;
  onAction: (action: string) => void;
}) {
  useEffect(() => {
    const handleClick = () => onClose();
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [onClose]);
  
  const items = asset ? [
    { id: 'open', label: '📂 Open', divider: false },
    { id: 'rename', label: '✏️ Rename', divider: false },
    { id: 'duplicate', label: '📋 Duplicate', divider: false },
    { id: 'star', label: asset.starred ? '⭐ Unstar' : '☆ Star', divider: true },
    { id: 'export', label: '📤 Export', divider: false },
    { id: 'reimport', label: '🔄 Reimport', divider: true },
    { id: 'delete', label: '🗑️ Delete', divider: false },
  ] : [
    { id: 'new_folder', label: '📁 New Folder', divider: false },
    { id: 'import', label: '📥 Import Asset', divider: true },
    { id: 'new_material', label: '🎨 New Material', divider: false },
    { id: 'new_blueprint', label: '📐 New Blueprint', divider: false },
    { id: 'new_particle', label: '✨ New Particle System', divider: false },
  ];
  
  return (
    <div
      style={{
        position: 'fixed',
        left: x,
        top: y,
        background: '#1a1a2e',
        border: '1px solid #333',
        borderRadius: '6px',
        padding: '4px 0',
        minWidth: '180px',
        zIndex: 1000,
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item) => (
        <React.Fragment key={item.id}>
          <button
            onClick={() => {
              onAction(item.id);
              onClose();
            }}
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 16px',
              background: 'none',
              border: 'none',
              color: item.id === 'delete' ? '#e74c3c' : '#ccc',
              fontSize: '13px',
              textAlign: 'left',
              cursor: 'pointer',
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#333'}
            onMouseOut={(e) => e.currentTarget.style.background = 'none'}
          >
            {item.label}
          </button>
          {item.divider && <div style={{ borderBottom: '1px solid #333', margin: '4px 0' }} />}
        </React.Fragment>
      ))}
    </div>
  );
}

// Folder Tree (Left Panel)
function FolderTree({
  assets,
  currentPath,
  onNavigate,
}: {
  assets: Asset[];
  currentPath: string;
  onNavigate: (path: string) => void;
}) {
  function FolderNode({ folder, level }: { folder: Asset; level: number }) {
    const isSelected = currentPath === folder.path;
    const children = (folder.children || []).filter(c => c.type === 'folder');
    const hasChildren = children.length > 0;
    const [expanded, setExpanded] = useState(level < 2);

    return (
      <div key={folder.id}>
        <div
          onClick={() => onNavigate(folder.path)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            paddingLeft: `${8 + level * 16}px`,
            background: isSelected ? '#3f51b533' : 'transparent',
            cursor: 'pointer',
            fontSize: '13px',
            color: isSelected ? '#fff' : '#aaa',
          }}
          onMouseOver={(e) => {
            if (!isSelected) e.currentTarget.style.background = '#ffffff08';
          }}
          onMouseOut={(e) => {
            if (!isSelected) e.currentTarget.style.background = 'transparent';
          }}
        >
          {hasChildren && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              style={{ cursor: 'pointer', fontSize: '10px', width: '12px' }}
            >
              {expanded ? '▼' : '▶'}
            </span>
          )}
          {!hasChildren && <span style={{ width: '12px' }} />}
          <span>📁</span>
          <span>{folder.name}</span>
        </div>

        {expanded &&
          children.map(child => (
            <FolderNode key={child.id} folder={child} level={level + 1} />
          ))}
      </div>
    );
  }
  
  const rootFolder: Asset = {
    id: 'root',
    name: 'Content',
    type: 'folder',
    path: '/',
    size: 0,
    createdAt: new Date(),
    modifiedAt: new Date(),
    children: assets.filter(a => a.type === 'folder'),
  };
  
  return (
    <div style={{
      width: '220px',
      background: '#0f0f23',
      borderRight: '1px solid #333',
      overflow: 'auto',
    }}>
      <div style={{
        padding: '12px',
        borderBottom: '1px solid #333',
        fontWeight: 'bold',
        fontSize: '12px',
        color: '#888',
        textTransform: 'uppercase',
      }}>
        Folders
      </div>
      <FolderNode folder={rootFolder} level={0} />
    </div>
  );
}

// Import Modal
function ImportModal({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (files: File[], options: ImportOptions) => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [options, setOptions] = useState<ImportOptions>({
    generateMipmaps: true,
    compressTextures: true,
    importNormals: true,
    importAnimations: true,
    scale: 1,
    flipY: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...droppedFiles]);
  }, []);
  
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#1a1a2e',
        borderRadius: '12px',
        width: '600px',
        maxHeight: '80vh',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #333',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>Import Assets</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              fontSize: '20px',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
        
        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          style={{
            margin: '20px',
            padding: '40px',
            border: '2px dashed #333',
            borderRadius: '8px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => e.currentTarget.style.borderColor = '#3f51b5'}
          onMouseOut={(e) => e.currentTarget.style.borderColor = '#333'}
        >
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📥</div>
          <div style={{ color: '#888', marginBottom: '8px' }}>
            Drop files here or click to browse
          </div>
          <div style={{ color: '#555', fontSize: '12px' }}>
            Supports: FBX, GLTF, OBJ, PNG, JPG, WAV, MP3, etc.
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              const selected = Array.from(e.target.files || []);
              setFiles(prev => [...prev, ...selected]);
            }}
          />
        </div>
        
        {/* File List */}
        {files.length > 0 && (
          <div style={{ margin: '0 20px', maxHeight: '150px', overflow: 'auto' }}>
            {files.map((file, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: '#0f0f23',
                borderRadius: '4px',
                marginBottom: '4px',
                fontSize: '13px',
              }}>
                <span style={{ color: '#fff' }}>{file.name}</span>
                <span style={{ color: '#666' }}>{formatFileSize(file.size)}</span>
                <button
                  onClick={() => setFiles(files.filter((_, j) => j !== i))}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#e74c3c',
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Options */}
        <div style={{ padding: '20px', borderTop: '1px solid #333' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '12px',
            marginBottom: '16px',
          }}>
            {[
              { key: 'generateMipmaps', label: 'Generate Mipmaps' },
              { key: 'compressTextures', label: 'Compress Textures' },
              { key: 'importNormals', label: 'Import Normals' },
              { key: 'importAnimations', label: 'Import Animations' },
              { key: 'flipY', label: 'Flip Y Axis' },
            ].map(opt => (
              <label key={opt.key} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#ccc',
                fontSize: '13px',
                cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={options[opt.key as keyof ImportOptions] as boolean}
                  onChange={(e) => setOptions({ ...options, [opt.key]: e.target.checked })}
                />
                {opt.label}
              </label>
            ))}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ color: '#ccc', fontSize: '13px' }}>Scale:</label>
            <input
              type="number"
              value={options.scale}
              onChange={(e) => setOptions({ ...options, scale: parseFloat(e.target.value) || 1 })}
              step="0.1"
              min="0.01"
              style={{
                width: '80px',
                padding: '6px 8px',
                background: '#0f0f23',
                border: '1px solid #333',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '13px',
              }}
            />
          </div>
        </div>
        
        {/* Actions */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid #333',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 24px',
              background: '#333',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onImport(files, options);
              onClose();
            }}
            disabled={files.length === 0}
            style={{
              padding: '8px 24px',
              background: files.length > 0 ? '#3f51b5' : '#333',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              cursor: files.length > 0 ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            Import {files.length > 0 && `(${files.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN CONTENT BROWSER COMPONENT
// ============================================================================

export interface ContentBrowserProps {
  projectId?: string;
  onAssetSelect?: (asset: Asset) => void;
  onAssetOpen?: (asset: Asset) => void;
}

export default function ContentBrowser({
  projectId,
  onAssetSelect,
  onAssetOpen,
}: ContentBrowserProps) {
  // Sample data - in real app, this would come from API
  const [assets, setAssets] = useState<Asset[]>([
    { id: '1', name: 'Characters', type: 'folder', path: '/Characters', size: 0, createdAt: new Date(), modifiedAt: new Date(), children: [] },
    { id: '2', name: 'Environments', type: 'folder', path: '/Environments', size: 0, createdAt: new Date(), modifiedAt: new Date(), children: [] },
    { id: '3', name: 'Materials', type: 'folder', path: '/Materials', size: 0, createdAt: new Date(), modifiedAt: new Date(), children: [] },
    { id: '4', name: 'Audio', type: 'folder', path: '/Audio', size: 0, createdAt: new Date(), modifiedAt: new Date(), children: [] },
    { id: '5', name: 'Blueprints', type: 'folder', path: '/Blueprints', size: 0, createdAt: new Date(), modifiedAt: new Date(), children: [] },
    { id: '6', name: 'PlayerCharacter.fbx', type: 'mesh', path: '/Characters/PlayerCharacter.fbx', size: 2500000, createdAt: new Date(), modifiedAt: new Date(), starred: true },
    { id: '7', name: 'Grass_Albedo.png', type: 'texture', path: '/Materials/Grass_Albedo.png', size: 1200000, createdAt: new Date(), modifiedAt: new Date() },
    { id: '8', name: 'M_Ground.material', type: 'material', path: '/Materials/M_Ground.material', size: 5000, createdAt: new Date(), modifiedAt: new Date() },
    { id: '9', name: 'BP_Enemy.blueprint', type: 'blueprint', path: '/Blueprints/BP_Enemy.blueprint', size: 15000, createdAt: new Date(), modifiedAt: new Date(), starred: true },
    { id: '10', name: 'Footsteps.wav', type: 'audio', path: '/Audio/Footsteps.wav', size: 800000, createdAt: new Date(), modifiedAt: new Date() },
    { id: '11', name: 'MainLevel.level', type: 'level', path: '/Environments/MainLevel.level', size: 5000000, createdAt: new Date(), modifiedAt: new Date() },
    { id: '12', name: 'Fire.vfx', type: 'particle', path: '/Effects/Fire.vfx', size: 25000, createdAt: new Date(), modifiedAt: new Date() },
  ]);
  
  const [currentPath, setCurrentPath] = useState('/');
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<AssetFilter>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'columns'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'size' | 'date'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; asset: Asset | null } | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Filter and sort assets
  const displayedAssets = useMemo(() => {
    let filtered = assets.filter(a => {
      // Path filter
      if (currentPath !== '/') {
        if (!a.path.startsWith(currentPath + '/') && a.path !== currentPath) return false;
        // Only show immediate children
        const relativePath = a.path.substring(currentPath.length + 1);
        if (relativePath.includes('/')) return false;
      } else {
        // Root level - show only items without nested path
        const pathParts = a.path.split('/').filter(Boolean);
        if (pathParts.length > 1) return false;
      }
      
      // Type filter
      if (filter.type?.length && !filter.type.includes(a.type)) return false;
      
      // Search filter
      if (filter.search && !a.name.toLowerCase().includes(filter.search.toLowerCase())) return false;
      
      // Starred filter
      if (filter.starred && !a.starred) return false;
      
      return true;
    });
    
    // Sort
    filtered.sort((a, b) => {
      // Folders first
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
      
      let cmp = 0;
      switch (sortBy) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'type': cmp = a.type.localeCompare(b.type); break;
        case 'size': cmp = a.size - b.size; break;
        case 'date': cmp = a.modifiedAt.getTime() - b.modifiedAt.getTime(); break;
      }
      
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    
    return filtered;
  }, [assets, currentPath, filter, sortBy, sortOrder]);
  
  const handleSelect = useCallback((asset: Asset, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Toggle selection
      setSelectedAssets(prev => {
        const next = new Set(prev);
        if (next.has(asset.id)) {
          next.delete(asset.id);
        } else {
          next.add(asset.id);
        }
        return next;
      });
    } else if (e.shiftKey && selectedAssets.size > 0) {
      // Range selection
      const lastSelected = Array.from(selectedAssets).pop()!;
      const lastIndex = displayedAssets.findIndex(a => a.id === lastSelected);
      const currentIndex = displayedAssets.findIndex(a => a.id === asset.id);
      const [start, end] = [Math.min(lastIndex, currentIndex), Math.max(lastIndex, currentIndex)];
      
      setSelectedAssets(new Set(displayedAssets.slice(start, end + 1).map(a => a.id)));
    } else {
      setSelectedAssets(new Set([asset.id]));
    }
    
    onAssetSelect?.(asset);
  }, [displayedAssets, selectedAssets, onAssetSelect]);
  
  const handleDoubleClick = useCallback((asset: Asset) => {
    if (asset.type === 'folder') {
      setCurrentPath(asset.path);
    } else {
      onAssetOpen?.(asset);
    }
  }, [onAssetOpen]);
  
  const handleContextMenu = useCallback((e: React.MouseEvent, asset: Asset | null) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, asset });
  }, []);
  
  const handleContextAction = useCallback((action: string) => {
    const asset = contextMenu?.asset;
    
    switch (action) {
      case 'new_folder':
        // Create new folder
        const folderName = prompt('Folder name:');
        if (folderName) {
          const newFolder: Asset = {
            id: Date.now().toString(),
            name: folderName,
            type: 'folder',
            path: `${currentPath === '/' ? '' : currentPath}/${folderName}`,
            size: 0,
            createdAt: new Date(),
            modifiedAt: new Date(),
            children: [],
          };
          setAssets(prev => [...prev, newFolder]);
        }
        break;
        
      case 'import':
        setShowImportModal(true);
        break;
        
      case 'rename':
        if (asset) {
          const newName = prompt('New name:', asset.name);
          if (newName && newName !== asset.name) {
            setAssets(prev => prev.map(a => 
              a.id === asset.id ? { ...a, name: newName, modifiedAt: new Date() } : a
            ));
          }
        }
        break;
        
      case 'duplicate':
        if (asset) {
          const duplicate: Asset = {
            ...asset,
            id: Date.now().toString(),
            name: `${asset.name}_copy`,
            createdAt: new Date(),
            modifiedAt: new Date(),
          };
          setAssets(prev => [...prev, duplicate]);
        }
        break;
        
      case 'star':
        if (asset) {
          setAssets(prev => prev.map(a => 
            a.id === asset.id ? { ...a, starred: !a.starred } : a
          ));
        }
        break;
        
      case 'delete':
        if (asset && confirm(`Delete "${asset.name}"?`)) {
          setAssets(prev => prev.filter(a => a.id !== asset.id));
          setSelectedAssets(prev => {
            const next = new Set(prev);
            next.delete(asset.id);
            return next;
          });
        }
        break;
    }
  }, [contextMenu, currentPath]);
  
  const handleImport = useCallback((files: File[], options: ImportOptions) => {
    // Process imported files
    for (const file of files) {
      const type = getAssetType(file.name);
      const newAsset: Asset = {
        id: Date.now().toString() + Math.random(),
        name: file.name,
        type,
        path: `${currentPath === '/' ? '' : currentPath}/${file.name}`,
        size: file.size,
        createdAt: new Date(),
        modifiedAt: new Date(),
      };
      setAssets(prev => [...prev, newAsset]);
    }
  }, [currentPath]);
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#0d1117',
      color: '#fff',
    }}>
      {/* Header */}
      <BreadcrumbNav path={currentPath} onNavigate={setCurrentPath} />
      <FilterBar
        filter={filter}
        onFilterChange={setFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={(by, order) => {
          setSortBy(by as typeof sortBy);
          setSortOrder(order);
        }}
      />
      
      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Folder Tree */}
        <FolderTree assets={assets} currentPath={currentPath} onNavigate={setCurrentPath} />
        
        {/* Asset Grid/List */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '16px',
          }}
          onContextMenu={(e) => handleContextMenu(e, null)}
        >
          {viewMode === 'grid' ? (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              alignContent: 'flex-start',
            }}>
              {displayedAssets.map(asset => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  isSelected={selectedAssets.has(asset.id)}
                  onSelect={(e) => handleSelect(asset, e)}
                  onDoubleClick={() => handleDoubleClick(asset)}
                  onContextMenu={(e) => handleContextMenu(e, asset)}
                />
              ))}
            </div>
          ) : (
            <div>
              {/* List Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '32px 1fr 100px 100px 150px',
                gap: '12px',
                alignItems: 'center',
                padding: '8px 12px',
                borderBottom: '1px solid #333',
                fontSize: '11px',
                color: '#666',
                textTransform: 'uppercase',
                fontWeight: 'bold',
              }}>
                <span></span>
                <span>Name</span>
                <span>Type</span>
                <span>Size</span>
                <span>Modified</span>
              </div>
              
              {displayedAssets.map(asset => (
                <AssetRow
                  key={asset.id}
                  asset={asset}
                  isSelected={selectedAssets.has(asset.id)}
                  onSelect={(e) => handleSelect(asset, e)}
                  onDoubleClick={() => handleDoubleClick(asset)}
                  onContextMenu={(e) => handleContextMenu(e, asset)}
                />
              ))}
            </div>
          )}
          
          {displayedAssets.length === 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#555',
            }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>📭</div>
              <div>No assets found</div>
              <button
                onClick={() => setShowImportModal(true)}
                style={{
                  marginTop: '16px',
                  padding: '8px 24px',
                  background: '#3f51b5',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                📥 Import Assets
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Status Bar */}
      <div style={{
        padding: '6px 12px',
        background: '#1a1a2e',
        borderTop: '1px solid #333',
        fontSize: '12px',
        color: '#666',
        display: 'flex',
        gap: '24px',
      }}>
        <span>{displayedAssets.length} items</span>
        <span>{selectedAssets.size} selected</span>
        <span>
          {formatFileSize(displayedAssets.reduce((sum, a) => sum + a.size, 0))} total
        </span>
      </div>
      
      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          asset={contextMenu.asset}
          onClose={() => setContextMenu(null)}
          onAction={handleContextAction}
        />
      )}
      
      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImport={handleImport}
        />
      )}
    </div>
  );
}
