'use client'

import React from 'react'
import NextImage from 'next/image'
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Edit,
  Eye,
  Folder,
  FolderOpen,
  Star,
  StarOff,
  Trash2,
} from 'lucide-react'

import {
  assetTypeConfig,
  colors,
  type Asset,
  type AssetFolder,
  type AssetType,
} from './ContentBrowser.types'

export const AssetIcon: React.FC<{ type: AssetType; size?: number }> = ({ type, size = 24 }) => {
  const config = assetTypeConfig[type]
  const Icon = config.icon
  return <Icon size={size} style={{ color: config.color }} />
}

interface FolderTreeItemProps {
  folder: AssetFolder
  level: number
  selectedPath: string | null
  onSelect: (path: string) => void
  onToggle: (path: string) => void
}

export const FolderTreeItem: React.FC<FolderTreeItemProps> = ({
  folder,
  level,
  selectedPath,
  onSelect,
  onToggle,
}) => {
  const isSelected = selectedPath === folder.path
  const hasChildren = folder.children.some((child) => 'children' in child)

  return (
    <>
      <div
        onClick={() => {
          onSelect(folder.path)
          onToggle(folder.path)
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
          folder.isExpanded ? <ChevronDown size={14} color={colors.textMuted} /> : <ChevronRight size={14} color={colors.textMuted} />
        ) : (
          <span style={{ width: '14px' }} />
        )}
        {folder.isExpanded ? <FolderOpen size={16} color="#f59e0b" /> : <Folder size={16} color="#f59e0b" />}
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
          .filter((child): child is AssetFolder => 'children' in child)
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
  )
}

interface AssetCardProps {
  asset: Asset
  view: 'grid' | 'list'
  isSelected: boolean
  onSelect: () => void
  onDoubleClick: () => void
  onContextMenu: (event: React.MouseEvent) => void
  onDragStart: (event: React.DragEvent) => void
  onToggleFavorite: () => void
}

export const AssetCard: React.FC<AssetCardProps> = ({
  asset,
  view,
  isSelected,
  onSelect,
  onDoubleClick,
  onContextMenu,
  onDragStart,
  onToggleFavorite,
}) => {
  const config = assetTypeConfig[asset.type]

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
          onClick={(event) => {
            event.stopPropagation()
            onToggleFavorite()
          }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
        >
          {asset.isFavorite ? <Star size={14} fill={colors.warning} color={colors.warning} /> : <StarOff size={14} color={colors.textDim} />}
        </button>
      </div>
    )
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
          <NextImage src={asset.thumbnail} alt={asset.name} fill unoptimized style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <AssetIcon type={asset.type} size={32} />
        )}

        {asset.isFavorite && (
          <div style={{ position: 'absolute', top: '4px', right: '4px' }}>
            <Star size={12} fill={colors.warning} color={colors.warning} />
          </div>
        )}
      </div>

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
  )
}

const MenuButton: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }> = ({
  icon,
  label,
  onClick,
  danger,
}) => (
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
)

interface ContextMenuProps {
  x: number
  y: number
  asset: Asset | null
  onClose: () => void
  onAction: (action: string) => void
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, asset, onClose, onAction }) => {
  if (!asset) return null

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={onClose} />

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
  )
}
