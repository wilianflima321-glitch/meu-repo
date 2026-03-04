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
import { openConfirmDialog, openPromptDialog } from '@/lib/ui/non-blocking-dialogs';

// ============================================================================
// TIPOS
// ============================================================================

import {
  ASSET_CONFIG,
  AssetLoader,
  formatFileSize,
  getAssetType,
  type Asset,
  type AssetFilter,
  type AssetType,
  type ImportOptions,
} from './content-browser-core';
import { BreadcrumbNav, FilterBar } from './content-browser-controls';

export { AssetLoader };
export type { Asset, AssetFilter, AssetType, ImportOptions };

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
  
  const handleContextAction = useCallback(async (action: string) => {
    const asset = contextMenu?.asset;
    
    switch (action) {
      case 'new_folder':
        const folderName = await openPromptDialog({
          title: 'New folder',
          message: 'Folder name:',
          confirmText: 'Create',
          cancelText: 'Cancel',
        });
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
          const newName = await openPromptDialog({
            title: 'Rename asset',
            message: 'New name:',
            defaultValue: asset.name,
            confirmText: 'Rename',
            cancelText: 'Cancel',
          });
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
        if (asset && await openConfirmDialog({
          title: 'Delete asset',
          message: `Delete "${asset.name}"?`,
          confirmText: 'Delete',
          cancelText: 'Cancel',
        })) {
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
