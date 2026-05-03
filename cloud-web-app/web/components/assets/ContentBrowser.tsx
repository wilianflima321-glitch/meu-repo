/**
 * Content Browser Component - Navegador de Assets
 *
 * Interface profissional para gerenciar e visualizar assets do projeto.
 * Suporta drag-and-drop para o viewport 3D.
 */

'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Search, Grid, List, ChevronRight, Upload, Plus, RefreshCw, Package } from 'lucide-react';
import AssetPreviewPanel from './AssetPreviewPanel';
import { AssetCard, assetTypeConfig, colors, ContextMenu, FolderTreeItem } from './ContentBrowserParts';
import { openPromptDialog } from '@/lib/ui/non-blocking-dialogs';

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

interface StorageRuntimeState {
  status: 'checking' | 'ready' | 'partial';
  label: string;
  detail: string | null;
}

// ============================================================================
// STYLES
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
  const [storageRuntime, setStorageRuntime] = useState<StorageRuntimeState>({
    status: 'checking',
    label: 'Storage verificando',
    detail: null,
  });

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

  useEffect(() => {
    let cancelled = false;

    const checkStorageRuntime = async () => {
      try {
        const response = await fetch('/api/health/storage', { cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));
        if (cancelled) return;

        const providerLabel = typeof payload?.storage?.type === 'string' ? payload.storage.type : 'Storage';
        const bucket = typeof payload?.storage?.bucket === 'string' ? payload.storage.bucket : null;
        const message = typeof payload?.storage?.message === 'string' ? payload.storage.message : null;

        if (response.ok && payload?.storage?.configured) {
          setStorageRuntime({
            status: 'ready',
            label: `${providerLabel} ativo`,
            detail: bucket ? `bucket ${bucket}` : null,
          });
          return;
        }

        setStorageRuntime({
          status: 'partial',
          label: 'Storage parcial',
          detail: message || 'Configure S3/R2 for persistent uploads.',
        });
      } catch {
        if (cancelled) return;
        setStorageRuntime({
          status: 'partial',
          label: 'Storage indisponivel',
          detail: 'Uploads persistentes exigem bucket S3/R2 acessivel.',
        });
      }
    };

    void checkStorageRuntime();

    return () => {
      cancelled = true;
    };
  }, []);

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

  const handleContextAction = useCallback(async (action: string) => {
    if (!contextMenu?.asset) return;
    const { asset } = contextMenu;

    switch (action) {
      case 'delete':
        onAssetDelete?.(asset);
        break;
      case 'rename':
        const newName = await openPromptDialog({
          title: 'Renomear asset',
          message: 'Novo nome:',
          defaultValue: asset.name,
          confirmText: 'Renomear',
          cancelText: 'Cancel',
        });
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
          <button type="button" aria-label="Criar nova pasta"
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
              placeholder="Buscar assets..."
              aria-label="Buscar assets"
              style={{
                width: '100%',
                padding: '6px 10px 6px 32px',
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: '6px',
                color: colors.text,
                fontSize: '12px',
              }}
            />
          </div>

          {/* Filter */}
          <select
            value={filterType}
            aria-label="Filtrar assets por tipo"
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

          <div
            role="status"
            aria-live="polite"
            style={{
              padding: '6px 10px',
              borderRadius: '999px',
              background:
                storageRuntime.status === 'ready'
                  ? 'color-mix(in_srgb,var(--aethel-success)_16%,transparent)'
                  : 'color-mix(in_srgb,var(--aethel-warning)_16%,transparent)',
              color: storageRuntime.status === 'ready' ? colors.success : colors.warning,
              border: `1px solid ${
                storageRuntime.status === 'ready'
                  ? 'color-mix(in_srgb,var(--aethel-success)_24%,transparent)'
                  : 'color-mix(in_srgb,var(--aethel-warning)_24%,transparent)'
              }`,
              fontSize: '11px',
              whiteSpace: 'nowrap',
            }}
            title={storageRuntime.detail || storageRuntime.label}
          >
            {storageRuntime.label}
            {storageRuntime.detail ? ` - ${storageRuntime.detail}` : ''}
          </div>

          {/* View Toggle */}
          <div style={{ display: 'flex', background: colors.surface, borderRadius: '6px', padding: '2px' }}>
            <button
              type="button"
              aria-label="Visualizacao em grade"
              title="Visualizacao em grade"
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
              type="button"
              aria-label="Visualizacao em lista"
              title="Visualizacao em lista"
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
            type="button"
            aria-label={
              storageRuntime.status === 'ready'
                ? 'Importar arquivos para storage persistente'
                : 'Importacao desabilitada ate o storage ficar pronto'
            }
            onClick={() => fileInputRef.current?.click()}
            disabled={storageRuntime.status !== 'ready'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              background: colors.primary,
              border: 'none',
              borderRadius: '6px',
              color: colors.text,
              fontSize: '12px',
              cursor: storageRuntime.status === 'ready' ? 'pointer' : 'not-allowed',
              opacity: storageRuntime.status === 'ready' ? 1 : 0.56,
            }}
            title={
              storageRuntime.status === 'ready'
                ? (storageRuntime.detail || 'Importar para o bucket configurado')
                : 'Configure persistent storage to unlock imports'
            }
          >
            <Upload size={14} />
            Importar
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={handleUpload}
          />

          <button
            type="button"
            aria-label="Atualizar navegador de assets"
            title="Atualizar navegador de assets"
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
              <p style={{ margin: 0, fontWeight: 500 }}>Nenhum asset encontrado</p>
              <p style={{ margin: '8px 0 0', fontSize: '12px' }}>
                {storageRuntime.status === 'ready'
                  ? 'Importe assets ou crie novos arquivos para comecar.'
                  : 'Configure persistent storage to enable reliable imports.'}
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
          <button type="button" aria-label={lowPolyPreview ? 'Desativar preview simplificado' : 'Ativar preview simplificado'}
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


