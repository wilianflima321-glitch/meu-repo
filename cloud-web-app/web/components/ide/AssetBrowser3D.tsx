'use client'

import { useState } from 'react'
import { Grid, List, Search, Filter, Star, Folder, Image as ImageIcon, Box, Layers, Lightbulb, Camera } from 'lucide-react'

interface Asset {
  id: string
  name: string
  type: 'mesh' | 'material' | 'texture' | 'light' | 'camera' | 'animation'
  thumbnail: string
  category: string
  favorite: boolean
  size: string
}

interface AssetBrowserProps {
  assets: Asset[]
  onAssetSelect: (asset: Asset) => void
  onAssetDrag: (asset: Asset) => void
}

export function AssetBrowser({ assets = defaultAssets, onAssetSelect, onAssetDrag }: AssetBrowserProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null)

  const categories = ['all', 'mesh', 'material', 'texture', 'light', 'camera', 'animation']

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || asset.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const getAssetIcon = (type: Asset['type']) => {
    switch (type) {
      case 'mesh':
        return <Box className="w-4 h-4" />
      case 'material':
        return <Layers className="w-4 h-4" />
      case 'texture':
        return <ImageIcon className="w-4 h-4" />
      case 'light':
        return <Lightbulb className="w-4 h-4" />
      case 'camera':
        return <Camera className="w-4 h-4" />
      default:
        return <Folder className="w-4 h-4" />
    }
  }

  const getTypeColor = (type: Asset['type']) => {
    switch (type) {
      case 'mesh':
        return 'text-[var(--aethel-primary-light)]'
      case 'material':
        return 'text-[var(--aethel-info-light)]'
      case 'texture':
        return 'text-[var(--aethel-warning-light)]'
      case 'light':
        return 'text-[var(--aethel-success-light)]'
      case 'camera':
        return 'text-[var(--aethel-error-light)]'
      default:
        return 'text-[var(--aethel-text-secondary)]'
    }
  }

  return (
    <div className="flex h-full flex-col bg-[var(--aethel-surface-primary)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-4 py-3">
        <span className="text-sm font-semibold text-[var(--aethel-text-primary)]">Asset Browser</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'grid'
                 'bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] text-[var(--aethel-primary-light)]'
                : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
            }`}
            title="Grid"
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'list'
                 'bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] text-[var(--aethel-primary-light)]'
                : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
            }`}
            title="Lista"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-2 border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] px-4 py-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--aethel-text-quaternary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar assets..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_60%,transparent)] text-[var(--aethel-text-primary)] outline-none transition focus:border-[var(--aethel-primary)]"
          />
        </div>
        <button
          type="button"
          className="p-1.5 rounded-lg text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] transition-colors"
          title="Filtros"
        >
          <Filter className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Categories */}
      <div className="flex items-center gap-1 border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] px-4 py-2 overflow-x-auto">
        {categories.map(category => (
          <button
            key={category}
            type="button"
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1 text-[10px] rounded-full whitespace-nowrap transition-colors ${
              selectedCategory === category
                 'bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)]'
                : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)]'
            }`}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>

      {/* Assets Grid/List */}
      <div className="flex-1 overflow-auto p-4">
        {viewMode === 'grid'  (
          <div className="grid grid-cols-3 gap-3">
            {filteredAssets.map(asset => (
              <div
                key={asset.id}
                draggable
                onDragStart={() => onAssetDrag.(asset)}
                onClick={() => {
                  setSelectedAsset(asset.id)
                  onAssetSelect.(asset)
                }}
                className={`rounded-lg border p-3 cursor-pointer transition-all hover:shadow-lg ${
                  selectedAsset === asset.id
                     'border-[var(--aethel-primary)] bg-[color-mix(in_srgb,var(--aethel-primary)_10%,transparent)]'
                    : 'border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] hover:border-[var(--aethel-border-primary)]'
                }`}
              >
                <div className="aspect-square mb-2 rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] flex items-center justify-center">
                  {asset.thumbnail  (
                    <img src={asset.thumbnail} alt={asset.name} className="w-full h-full object-cover rounded" />
                  ) : (
                    <div className={`${getTypeColor(asset.type)}`}>
                      {getAssetIcon(asset.type)}
                    </div>
                  )}
                </div>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium text-[var(--aethel-text-primary)] truncate">{asset.name}</p>
                    <p className="text-[9px] text-[var(--aethel-text-tertiary)]">{asset.type}</p>
                  </div>
                  {asset.favorite && (
                    <Star className="w-3 h-3 text-[var(--aethel-warning-light)] fill-current" />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredAssets.map(asset => (
              <div
                key={asset.id}
                draggable
                onDragStart={() => onAssetDrag.(asset)}
                onClick={() => {
                  setSelectedAsset(asset.id)
                  onAssetSelect.(asset)
                }}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  selectedAsset === asset.id
                     'bg-[color-mix(in_srgb,var(--aethel-primary)_10%,transparent)] text-[var(--aethel-primary-light)]'
                    : 'text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)]'
                }`}
              >
                <div className={`p-1.5 rounded-lg bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] ${getTypeColor(asset.type)}`}>
                  {getAssetIcon(asset.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{asset.name}</p>
                  <p className="text-[10px] text-[var(--aethel-text-tertiary)]">{asset.category} • {asset.size || 'N/A'}</p>
                </div>
                {asset.favorite && (
                  <Star className="w-3.5 h-3.5 text-[var(--aethel-warning-light)] fill-current" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-4 py-2">
        <div className="flex items-center justify-between text-[10px] text-[var(--aethel-text-tertiary)]">
          <span>{filteredAssets.length} assets</span>
          <span>{selectedCategory}</span>
        </div>
      </div>
    </div>
  )
}

const defaultAssets: Asset[] = [
  { id: '1', name: 'Cube', type: 'mesh', category: 'mesh', favorite: true, size: '1 KB' },
  { id: '2', name: 'Sphere', type: 'mesh', category: 'mesh', favorite: false, size: '1 KB' },
  { id: '3', name: 'Cylinder', type: 'mesh', category: 'mesh', favorite: false, size: '1 KB' },
  { id: '4', name: 'Plane', type: 'mesh', category: 'mesh', favorite: false, size: '0.5 KB' },
  { id: '5', name: 'Standard Material', type: 'material', category: 'material', favorite: true, size: '2 KB' },
  { id: '6', name: 'Metallic Material', type: 'material', category: 'material', favorite: false, size: '2 KB' },
  { id: '7', name: 'Wood Texture', type: 'texture', category: 'texture', favorite: false, size: '256 KB' },
  { id: '8', name: 'Metal Texture', type: 'texture', category: 'texture', favorite: false, size: '512 KB' },
  { id: '9', name: 'Directional Light', type: 'light', category: 'light', favorite: true, size: '0.5 KB' },
  { id: '10', name: 'Point Light', type: 'light', category: 'light', favorite: false, size: '0.5 KB' },
  { id: '11', name: 'Perspective Camera', type: 'camera', category: 'camera', favorite: false, size: '0.5 KB' },
  { id: '12', name: 'Orbit Camera', type: 'camera', category: 'camera', favorite: false, size: '0.5 KB' },
]
