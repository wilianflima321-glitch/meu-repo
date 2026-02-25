/**
 * Content Browser Component
 * Professional asset browser with tree, search, filters and preview panel.
 */

'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronRight,
  Grid,
  Package,
  Plus,
  RefreshCw,
  Search,
  Upload,
  List,
} from 'lucide-react'

import AssetPreviewPanel from './AssetPreviewPanel'
import {
  assetTypeConfig,
  colors,
  type Asset,
  type AssetFolder,
  type AssetType,
  type ContentBrowserProps,
  type DragData,
} from './ContentBrowser.types'
import { AssetCard, ContextMenu, FolderTreeItem } from './ContentBrowser.ui'

export type { Asset, AssetFolder, AssetType, ContentBrowserProps, DragData } from './ContentBrowser.types'

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
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [search, setSearch] = useState(searchValue ?? '')
  const [selectedPath, setSelectedPath] = useState<string | null>(selectedPathValue ?? '/Content')
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; asset: Asset } | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/Content']))
  const [filterType, setFilterType] = useState<AssetType | 'all'>(filterTypeValue ?? 'all')
  const [lowPolyPreview, setLowPolyPreview] = useState(true)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchValue !== undefined) {
      setSearch(searchValue)
    }
  }, [searchValue])

  useEffect(() => {
    if (filterTypeValue !== undefined) {
      setFilterType(filterTypeValue)
    }
  }, [filterTypeValue])

  useEffect(() => {
    if (selectedPathValue !== undefined) {
      setSelectedPath(selectedPathValue)
    }
  }, [selectedPathValue])

  const folderStructure = useMemo((): AssetFolder => {
    return {
      id: 'root',
      name: 'Content',
      path: '/Content',
      children: assets as (Asset | AssetFolder)[],
      isExpanded: expandedFolders.has('/Content'),
    }
  }, [assets, expandedFolders])

  const currentAssets = useMemo(() => {
    const findFolder = (folder: AssetFolder, path: string): AssetFolder | null => {
      if (folder.path === path) return folder
      for (const child of folder.children) {
        if ('children' in child) {
          const found = findFolder(child, path)
          if (found) return found
        }
      }
      return null
    }

    const folder = findFolder(folderStructure, selectedPath || '/Content')
    if (!folder) return []

    let items = folder.children.filter((entry): entry is Asset => !('children' in entry))

    if (search) {
      items = items.filter((asset) => asset.name.toLowerCase().includes(search.toLowerCase()))
    }

    if (filterType !== 'all') {
      items = items.filter((asset) => asset.type === filterType)
    }

    return items
  }, [folderStructure, selectedPath, search, filterType])

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  const handleDragStart = useCallback(
    (event: React.DragEvent, asset: Asset) => {
      const dragData: DragData = { type: 'asset', asset }
      event.dataTransfer.setData('application/json', JSON.stringify(dragData))
      event.dataTransfer.effectAllowed = 'copy'
      onAssetDragStart?.(asset, dragData)
    },
    [onAssetDragStart],
  )

  const handleContextMenu = useCallback((event: React.MouseEvent, asset: Asset) => {
    event.preventDefault()
    setContextMenu({ x: event.clientX, y: event.clientY, asset })
  }, [])

  const handleContextAction = useCallback(
    (action: string) => {
      if (!contextMenu?.asset) return
      const { asset } = contextMenu

      switch (action) {
        case 'delete':
          onAssetDelete?.(asset)
          break
        case 'rename': {
          const newName = prompt('New name:', asset.name)
          if (newName) onAssetRename?.(asset, newName)
          break
        }
        case 'duplicate':
          onAssetDuplicate?.(asset)
          break
        case 'preview':
          onAssetSelect?.(asset)
          break
        case 'export':
          onAssetExport?.(asset)
          break
        default:
          break
      }

      setContextMenu(null)
    },
    [contextMenu, onAssetDelete, onAssetDuplicate, onAssetExport, onAssetRename, onAssetSelect],
  )

  const handleUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files) {
        onUpload?.(event.target.files)
      }
    },
    [onUpload],
  )

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
            title="New Folder"
          >
            <Plus size={14} />
          </button>
        </div>

        <FolderTreeItem
          folder={folderStructure}
          level={0}
          selectedPath={selectedPath}
          onSelect={(path) => {
            setSelectedPath(path)
            onPathChange?.(path)
          }}
          onToggle={toggleFolder}
        />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
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
              onChange={(event) => {
                setSearch(event.target.value)
                onSearchChange?.(event.target.value)
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

          <select
            value={filterType}
            onChange={(event) => {
              const value = event.target.value as AssetType | 'all'
              setFilterType(value)
              onFilterChange?.(value)
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
          <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleUpload} />

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
          {(selectedPath || '/Content')
            .split('/')
            .filter(Boolean)
            .map((part, index, all) => (
              <React.Fragment key={index}>
                {index > 0 && <ChevronRight size={12} />}
                <span
                  style={{
                    color: index === all.length - 1 ? colors.text : colors.textMuted,
                    cursor: 'pointer',
                  }}
                >
                  {part}
                </span>
              </React.Fragment>
            ))}
        </div>

        <div style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
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
              <p style={{ margin: '8px 0 0', fontSize: '12px' }}>Import assets or create new ones to get started.</p>
            </div>
          ) : view === 'grid' ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {currentAssets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  view="grid"
                  isSelected={selectedAsset?.id === asset.id}
                  onSelect={() => {
                    setSelectedAsset(asset)
                    onAssetSelect?.(asset)
                  }}
                  onDoubleClick={() => onAssetSelect?.(asset)}
                  onContextMenu={(event) => handleContextMenu(event, asset)}
                  onDragStart={(event) => handleDragStart(event, asset)}
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
                    setSelectedAsset(asset)
                    onAssetSelect?.(asset)
                  }}
                  onDoubleClick={() => onAssetSelect?.(asset)}
                  onContextMenu={(event) => handleContextMenu(event, asset)}
                  onDragStart={(event) => handleDragStart(event, asset)}
                  onToggleFavorite={() => {}}
                />
              ))}
            </div>
          )}
        </div>

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
          {selectedAsset && <span>Selected: {selectedAsset.name} ({assetTypeConfig[selectedAsset.type].label})</span>}
        </div>
      </div>

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
  )
}

export default ContentBrowser
