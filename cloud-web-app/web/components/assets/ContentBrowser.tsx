/**
 * Content Browser Component - Navegador de Assets
 * 
 * Interface profissional para gerenciar e visualizar assets do projeto.
 * Suporta drag-and-drop para o viewport 3D.
 */

'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import NextImage from 'next/image';
import {
  Folder,
  FolderOpen,
  File,
  Image,
  Box,
  Music,
  Video,
  FileCode,
  Settings,
  Search,
  Grid,
  List,
  ChevronRight,
  ChevronDown,
  Upload,
  Plus,
  MoreHorizontal,
  Trash2,
  Copy,
  Edit,
  Eye,
  Download,
  Filter,
  SortAsc,
  RefreshCw,
  Star,
  StarOff,
  Package,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';
import AssetPreviewPanel from './AssetPreviewPanel';

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

interface ContentBrowserProps {
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

// ============================================================================
// STYLES
// ============================================================================

const colors = {
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
};

const assetTypeConfig: Record<AssetType, { icon: typeof File; color: string; label: string }> = {
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
};

// ============================================================================
// ASSET ICON
// ============================================================================

const AssetIcon: React.FC<{ type: AssetType; size?: number }> = ({ type, size = 24 }) => {
  const config = assetTypeConfig[type];
  const Icon = config.icon;
  return <Icon size={size} style={{ color: config.color }} />;
};

// ============================================================================
// FOLDER TREE ITEM
// ============================================================================

interface FolderTreeItemProps {
  folder: AssetFolder;
  level: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onToggle: (path: string) => void;
}

const FolderTreeItem: React.FC<FolderTreeItemProps> = ({
  folder,
  level,
  selectedPath,
  onSelect,
  onToggle,
}) => {
  const isSelected = selectedPath === folder.path;
  const hasChildren = folder.children.some(c => 'children' in c);

  return (
    <>
      <div
        onClick={() => {
          onSelect(folder.path);
          onToggle(folder.path);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '6px 8px',
          paddingLeft: `${8 + level * 16}px`,
          background: isSelected ? colors.surfaceActive : 'transparent',
          cursor: 'pointer',
          borderRadius: '4px',
          marginBottom: '2px',
        }}
      >
        {hasChildren ? (
          folder.isExpanded ? (
            <ChevronDown size={14} color={colors.textMuted} />
          ) : (
            <ChevronRight size={14} color={colors.textMuted} />
          )
        ) : (
          <span style={{ width: '14px' }} />
        )}
        {folder.isExpanded ? (
          <FolderOpen size={16} color="#f59e0b" />
        ) : (
          <Folder size={16} color="#f59e0b" />
        )}
        <span
          style={{
            color: isSelected ? colors.text : colors.textMuted,
            fontSize: '13px',
            fontWeight: isSelected ? 500 : 400,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {folder.name}
        </span>
      </div>

      {folder.isExpanded &&
        folder.children
          .filter((c): c is AssetFolder => 'children' in c)
          .map((child) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              level={level + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
    </>
  );
};

// ============================================================================
// ASSET CARD
// ============================================================================

interface AssetCardProps {
  asset: Asset;
  view: 'grid' | 'list';
  isSelected: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent) => void;
  onToggleFavorite: () => void;
}

const AssetCard: React.FC<AssetCardProps> = ({
  asset,
  view,
  isSelected,
  onSelect,
  onDoubleClick,
  onContextMenu,
  onDragStart,
  onToggleFavorite,
}) => {
  const config = assetTypeConfig[asset.type];

  if (view === 'list') {
    return (
      <div
        draggable
        onClick={onSelect}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
        onDragStart={onDragStart}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 12px',
          background: isSelected ? colors.surfaceActive : 'transparent',
          borderRadius: '6px',
          cursor: 'pointer',
          borderLeft: isSelected ? `2px solid ${colors.primary}` : '2px solid transparent',
        }}
      >
        <AssetIcon type={asset.type} size={20} />
        <span style={{ flex: 1, color: colors.text, fontSize: '13px' }}>{asset.name}</span>
        <span style={{ color: colors.textDim, fontSize: '11px' }}>{config.label}</span>
        <span style={{ color: colors.textDim, fontSize: '11px' }}>
          {asset.size ? `${(asset.size / 1024).toFixed(1)} KB` : '-'}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
        >
          {asset.isFavorite ? (
            <Star size={14} fill={colors.warning} color={colors.warning} />
          ) : (
            <StarOff size={14} color={colors.textDim} />
          )}
        </button>
      </div>
    );
  }

  return (
    <div
      draggable
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      onDragStart={onDragStart}
      style={{
        width: '100px',
        padding: '8px',
        background: isSelected ? colors.surfaceActive : colors.surface,
        border: `1px solid ${isSelected ? colors.primary : colors.border}`,
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          width: '100%',
          aspectRatio: '1',
          borderRadius: '6px',
          background: colors.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '8px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {asset.thumbnail ? (
          <NextImage
            src={asset.thumbnail}
            alt={asset.name}
            fill
            unoptimized
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <AssetIcon type={asset.type} size={32} />
        )}

        {/* Favorite badge */}
        {asset.isFavorite && (
          <div
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
            }}
          >
            <Star size={12} fill={colors.warning} color={colors.warning} />
          </div>
        )}
      </div>

      {/* Name */}
      <div
        style={{
          color: colors.text,
          fontSize: '11px',
          fontWeight: 500,
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={asset.name}
      >
        {asset.name}
      </div>

      {/* Type */}
      <div
        style={{
          color: config.color,
          fontSize: '9px',
          textAlign: 'center',
          marginTop: '2px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        {config.label}
      </div>
    </div>
  );
};

// ============================================================================
// CONTEXT MENU
// ============================================================================

interface ContextMenuProps {
  x: number;
  y: number;
  asset: Asset | null;
  onClose: () => void;
  onAction: (action: string) => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, asset, onClose, onAction }) => {
  if (!asset) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 999 }}
        onClick={onClose}
      />
      
      {/* Menu */}
      <div
        style={{
          position: 'fixed',
          left: x,
          top: y,
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: '8px',
          padding: '4px',
          minWidth: '160px',
          zIndex: 1000,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}
      >
        <MenuButton icon={<Eye size={14} />} label="Preview" onClick={() => onAction('preview')} />
        <MenuButton icon={<Edit size={14} />} label="Rename" onClick={() => onAction('rename')} />
        <MenuButton icon={<Copy size={14} />} label="Duplicate" onClick={() => onAction('duplicate')} />
        <div style={{ height: '1px', background: colors.border, margin: '4px 0' }} />
        <MenuButton icon={<Download size={14} />} label="Export" onClick={() => onAction('export')} />
        <div style={{ height: '1px', background: colors.border, margin: '4px 0' }} />
        <MenuButton icon={<Trash2 size={14} />} label="Delete" onClick={() => onAction('delete')} danger />
      </div>
    </>
  );
};

const MenuButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}> = ({ icon, label, onClick, danger }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      width: '100%',
      padding: '8px 12px',
      background: 'transparent',
      border: 'none',
      borderRadius: '4px',
      color: danger ? colors.error : colors.text,
      fontSize: '13px',
      cursor: 'pointer',
      textAlign: 'left',
    }}
  >
    {icon}
    {label}
  </button>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ContentBrowser: React.FC<ContentBrowserProps> = ({
  assets = [],
  onAssetSelect,
  onAssetDragStart,
  onAssetDrop,
  onAssetDelete,
  onAssetRename,
  onAssetExport,
  onAssetDuplicate,
  onUpload,
  onCreateFolder,
  onRefresh,
  searchValue,
  filterTypeValue,
  selectedPathValue,
  onSearchChange,
  onFilterChange,
  onPathChange,
}) => {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState(searchValue ?? '');
  const [selectedPath, setSelectedPath] = useState<string | null>(selectedPathValue ?? '/Content');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; asset: Asset } | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/Content']));
  const [filterType, setFilterType] = useState<AssetType | 'all'>(filterTypeValue ?? 'all');
  const [lowPolyPreview, setLowPolyPreview] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchValue !== undefined) {
      setSearch(searchValue);
    }
  }, [searchValue]);

  useEffect(() => {
    if (filterTypeValue !== undefined) {
      setFilterType(filterTypeValue);
    }
  }, [filterTypeValue]);

  useEffect(() => {
    if (selectedPathValue !== undefined) {
      setSelectedPath(selectedPathValue);
    }
  }, [selectedPathValue]);

  // Organize assets into folder structure
  const folderStructure = useMemo((): AssetFolder => {
    const root: AssetFolder = {
      id: 'root',
      name: 'Content',
      path: '/Content',
      children: assets as (Asset | AssetFolder)[],
      isExpanded: expandedFolders.has('/Content'),
    };
    return root;
  }, [assets, expandedFolders]);

  // Get current folder's assets
  const currentAssets = useMemo(() => {
    const findFolder = (folder: AssetFolder, path: string): AssetFolder | null => {
      if (folder.path === path) return folder;
      for (const child of folder.children) {
        if ('children' in child) {
          const found = findFolder(child, path);
          if (found) return found;
        }
      }
      return null;
    };

    const folder = findFolder(folderStructure, selectedPath || '/Content');
    if (!folder) return [];

    let items = folder.children.filter((c): c is Asset => !('children' in c));

    // Apply search filter
    if (search) {
      items = items.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));
    }

    // Apply type filter
    if (filterType !== 'all') {
      items = items.filter(a => a.type === filterType);
    }

    return items;
  }, [folderStructure, selectedPath, search, filterType]);

  // Handlers
  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, asset: Asset) => {
    const dragData: DragData = { type: 'asset', asset };
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'copy';
    onAssetDragStart?.(asset, dragData);
  }, [onAssetDragStart]);

  const handleContextMenu = useCallback((e: React.MouseEvent, asset: Asset) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, asset });
  }, []);

  const handleContextAction = useCallback((action: string) => {
    if (!contextMenu?.asset) return;
    const { asset } = contextMenu;

    switch (action) {
      case 'delete':
        onAssetDelete?.(asset);
        break;
      case 'rename':
        const newName = prompt('Novo nome:', asset.name);
        if (newName) onAssetRename?.(asset, newName);
        break;
      case 'duplicate':
        onAssetDuplicate?.(asset);
        break;
      case 'preview':
        onAssetSelect?.(asset);
        break;
      case 'export':
        onAssetExport?.(asset);
        break;
    }

    setContextMenu(null);
  }, [contextMenu, onAssetDelete, onAssetDuplicate, onAssetExport, onAssetRename, onAssetSelect]);

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onUpload?.(e.target.files);
    }
  }, [onUpload]);

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        background: colors.bg,
        color: colors.text,
        fontSize: '13px',
      }}
    >
      {/* Sidebar - Folder Tree */}
      <div
        style={{
          width: '200px',
          borderRight: `1px solid ${colors.border}`,
          padding: '8px',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px',
            marginBottom: '8px',
          }}
        >
          <span style={{ fontWeight: 600, color: colors.text }}>Folders</span>
          <button
            onClick={() => onCreateFolder?.(selectedPath || '/Content', 'New Folder')}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: colors.textMuted,
              padding: '4px',
            }}
            title="Nova Pasta"
          >
            <Plus size={14} />
          </button>
        </div>

        <FolderTreeItem
          folder={folderStructure}
          level={0}
          selectedPath={selectedPath}
          onSelect={(path) => {
            setSelectedPath(path);
            onPathChange?.(path);
          }}
          onToggle={toggleFolder}
        />
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          {/* Search */}
          <div style={{ flex: 1, position: 'relative' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: colors.textMuted,
              }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                onSearchChange?.(e.target.value);
              }}
              placeholder="Search assets..."
              style={{
                width: '100%',
                padding: '6px 10px 6px 32px',
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: '6px',
                color: colors.text,
                fontSize: '12px',
                outline: 'none',
              }}
            />
          </div>

          {/* Filter */}
          <select
            value={filterType}
            onChange={(e) => {
              const value = e.target.value as AssetType | 'all';
              setFilterType(value);
              onFilterChange?.(value);
            }}
            style={{
              padding: '6px 24px 6px 8px',
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: '6px',
              color: colors.text,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Types</option>
            <option value="mesh">3D Models</option>
            <option value="texture">Textures</option>
            <option value="material">Materials</option>
            <option value="blueprint">Blueprints</option>
            <option value="audio">Audio</option>
            <option value="prefab">Prefabs</option>
          </select>

          {/* View Toggle */}
          <div style={{ display: 'flex', background: colors.surface, borderRadius: '6px', padding: '2px' }}>
            <button
              onClick={() => setView('grid')}
              style={{
                padding: '4px 8px',
                background: view === 'grid' ? colors.surfaceActive : 'transparent',
                border: 'none',
                borderRadius: '4px',
                color: view === 'grid' ? colors.text : colors.textMuted,
                cursor: 'pointer',
              }}
            >
              <Grid size={14} />
            </button>
            <button
              onClick={() => setView('list')}
              style={{
                padding: '4px 8px',
                background: view === 'list' ? colors.surfaceActive : 'transparent',
                border: 'none',
                borderRadius: '4px',
                color: view === 'list' ? colors.text : colors.textMuted,
                cursor: 'pointer',
              }}
            >
              <List size={14} />
            </button>
          </div>

          {/* Actions */}
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              background: colors.primary,
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <Upload size={14} />
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={handleUpload}
          />

          <button
            onClick={onRefresh}
            style={{
              padding: '6px',
              background: 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: colors.textMuted,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Breadcrumb */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '8px 12px',
            color: colors.textMuted,
            fontSize: '12px',
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          {(selectedPath || '/Content').split('/').filter(Boolean).map((part, i, arr) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight size={12} />}
              <span
                style={{
                  color: i === arr.length - 1 ? colors.text : colors.textMuted,
                  cursor: 'pointer',
                }}
              >
                {part}
              </span>
            </React.Fragment>
          ))}
        </div>

        {/* Assets Grid/List */}
        <div
          style={{
            flex: 1,
            padding: '12px',
            overflowY: 'auto',
          }}
        >
          {currentAssets.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: colors.textMuted,
              }}
            >
              <Package size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
              <p style={{ margin: 0, fontWeight: 500 }}>No assets found</p>
              <p style={{ margin: '8px 0 0', fontSize: '12px' }}>
                Import assets or create new ones to get started.
              </p>
            </div>
          ) : view === 'grid' ? (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              {currentAssets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  view="grid"
                  isSelected={selectedAsset?.id === asset.id}
                  onSelect={() => {
                    setSelectedAsset(asset);
                    onAssetSelect?.(asset);
                  }}
                  onDoubleClick={() => onAssetSelect?.(asset)}
                  onContextMenu={(e) => handleContextMenu(e, asset)}
                  onDragStart={(e) => handleDragStart(e, asset)}
                  onToggleFavorite={() => {}}
                />
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {currentAssets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  view="list"
                  isSelected={selectedAsset?.id === asset.id}
                  onSelect={() => {
                    setSelectedAsset(asset);
                    onAssetSelect?.(asset);
                  }}
                  onDoubleClick={() => onAssetSelect?.(asset)}
                  onContextMenu={(e) => handleContextMenu(e, asset)}
                  onDragStart={(e) => handleDragStart(e, asset)}
                  onToggleFavorite={() => {}}
                />
              ))}
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 12px',
            borderTop: `1px solid ${colors.border}`,
            fontSize: '11px',
            color: colors.textMuted,
          }}
        >
          <span>{currentAssets.length} items</span>
          {selectedAsset && (
            <span>
              Selected: {selectedAsset.name} ({assetTypeConfig[selectedAsset.type].label})
            </span>
          )}
        </div>
      </div>

      {/* Preview Panel */}
      <div
        style={{
          width: '320px',
          borderLeft: `1px solid ${colors.border}`,
          background: colors.surface,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <div style={{ fontWeight: 600, color: colors.text }}>Preview</div>
          <button
            onClick={() => setLowPolyPreview((prev) => !prev)}
            style={{
              padding: '4px 10px',
              borderRadius: '999px',
              border: `1px solid ${colors.border}`,
              background: lowPolyPreview ? colors.surfaceActive : 'transparent',
              color: lowPolyPreview ? colors.text : colors.textMuted,
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            Low-Poly {lowPolyPreview ? 'ON' : 'OFF'}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <AssetPreviewPanel asset={selectedAsset} lowPoly={lowPolyPreview} />
        </div>
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
    </div>
  );
};

export default ContentBrowser;

