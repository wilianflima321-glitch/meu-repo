'use client'

import React, { useEffect, useRef, useState } from 'react'

import {
  OBJECT_TYPE_CONFIG,
  type OutlinerFilter,
  type SceneObject,
  type SceneObjectType,
} from './WorldOutliner.types'

interface TreeItemProps {
  object: SceneObject
  level: number
  isExpanded: boolean
  onToggleExpand: () => void
  onSelect: (e: React.MouseEvent) => void
  onToggleVisibility: () => void
  onToggleLock: () => void
  onRename: (name: string) => void
  onDragStart: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onContextMenu: (e: React.MouseEvent) => void
  isDragOver: boolean
  selectedIds: Set<string>
}

export function TreeItem({
  object,
  level,
  isExpanded,
  onToggleExpand,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onRename,
  onDragStart,
  onDragOver,
  onDrop,
  onContextMenu,
  isDragOver,
  selectedIds,
}: TreeItemProps) {
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(object.name)
  const inputRef = useRef<HTMLInputElement>(null)

  const config = OBJECT_TYPE_CONFIG[object.type]
  const isSelected = selectedIds.has(object.id)
  const hasChildren = object.children.length > 0

  useEffect(() => {
    if (!isRenaming || !inputRef.current) return
    inputRef.current.focus()
    inputRef.current.select()
  }, [isRenaming])

  const handleRenameSubmit = () => {
    if (renameValue.trim() && renameValue !== object.name) {
      onRename(renameValue.trim())
    }
    setIsRenaming(false)
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (isRenaming) return
    e.stopPropagation()
    setIsRenaming(true)
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onContextMenu={onContextMenu}
      style={{ borderLeft: isDragOver ? '2px solid #3f51b5' : '2px solid transparent' }}
    >
      <div
        onClick={onSelect}
        onDoubleClick={handleDoubleClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '26px',
          paddingLeft: `${8 + level * 18}px`,
          paddingRight: '8px',
          background: isSelected ? '#3f51b533' : isDragOver ? '#3f51b522' : 'transparent',
          cursor: 'pointer',
          fontSize: '13px',
          opacity: object.visible ? 1 : 0.5,
          userSelect: 'none',
        }}
        onMouseOver={(e) => {
          if (!isSelected) e.currentTarget.style.background = '#ffffff08'
        }}
        onMouseOut={(e) => {
          if (!isSelected) e.currentTarget.style.background = 'transparent'
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpand()
          }}
          style={{
            width: '16px',
            height: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: 'none',
            color: '#666',
            cursor: hasChildren ? 'pointer' : 'default',
            fontSize: '10px',
            visibility: hasChildren ? 'visible' : 'hidden',
          }}
        >
          {isExpanded ? 'v' : '>'}
        </button>

        <span style={{ marginRight: '6px', fontSize: '14px', color: config.color }}>{config.icon}</span>

        {isRenaming ? (
          <input
            ref={inputRef}
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSubmit()
              if (e.key === 'Escape') {
                setRenameValue(object.name)
                setIsRenaming(false)
              }
            }}
            onClick={(e) => e.stopPropagation()}
            style={{
              flex: 1,
              background: '#0f0f23',
              border: '1px solid #3f51b5',
              borderRadius: '3px',
              color: '#fff',
              fontSize: '13px',
              padding: '1px 6px',
              outline: 'none',
            }}
          />
        ) : (
          <span
            style={{
              flex: 1,
              color: isSelected ? '#fff' : '#ccc',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {object.name}
          </span>
        )}

        {object.components && object.components.length > 0 && (
          <span
            style={{
              padding: '1px 4px',
              background: '#333',
              borderRadius: '3px',
              fontSize: '10px',
              color: '#888',
              marginRight: '6px',
            }}
          >
            {object.components.length}
          </span>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleVisibility()
          }}
          style={{
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: 'none',
            color: object.visible ? '#4caf50' : '#666',
            cursor: 'pointer',
            fontSize: '12px',
          }}
          title={object.visible ? 'Hide' : 'Show'}
        >
          {object.visible ? 'V' : 'H'}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleLock()
          }}
          style={{
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: 'none',
            color: object.locked ? '#ffc107' : '#666',
            cursor: 'pointer',
            fontSize: '12px',
          }}
          title={object.locked ? 'Unlock' : 'Lock'}
        >
          {object.locked ? 'L' : 'U'}
        </button>
      </div>
    </div>
  )
}

interface OutlinerContextMenuProps {
  x: number
  y: number
  object: SceneObject | null
  onClose: () => void
  onAction: (action: string) => void
}

export function OutlinerContextMenu({ x, y, object, onClose, onAction }: OutlinerContextMenuProps) {
  useEffect(() => {
    const handleClick = () => onClose()
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [onClose])

  const items = object
    ? [
        { id: 'focus', label: 'Focus', divider: false },
        { id: 'rename', label: 'Rename', divider: false },
        { id: 'duplicate', label: 'Duplicate', divider: true },
        { id: 'visibility', label: object.visible ? 'Hide' : 'Show', divider: false },
        { id: 'lock', label: object.locked ? 'Unlock' : 'Lock', divider: true },
        { id: 'group', label: 'Group', divider: false },
        { id: 'ungroup', label: 'Ungroup', divider: true },
        { id: 'create_prefab', label: 'Create Prefab', divider: false },
        { id: 'create_blueprint', label: 'Create Blueprint', divider: true },
        { id: 'delete', label: 'Delete', divider: false },
      ]
    : [
        { id: 'create_empty', label: 'Create Empty', divider: false },
        { id: 'create_cube', label: 'Create Cube', divider: false },
        { id: 'create_sphere', label: 'Create Sphere', divider: false },
        { id: 'create_plane', label: 'Create Plane', divider: true },
        { id: 'create_light', label: 'Create Light', divider: false },
        { id: 'create_camera', label: 'Create Camera', divider: false },
        { id: 'create_audio', label: 'Create Audio Source', divider: true },
        { id: 'create_particle', label: 'Create Particle System', divider: false },
        { id: 'create_trigger', label: 'Create Trigger', divider: false },
      ]

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
              onAction(item.id)
              onClose()
            }}
            style={{
              display: 'block',
              width: '100%',
              padding: '6px 16px',
              background: 'none',
              border: 'none',
              color: item.id === 'delete' ? '#e74c3c' : '#ccc',
              fontSize: '13px',
              textAlign: 'left',
              cursor: 'pointer',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#333'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'none'
            }}
          >
            {item.label}
          </button>
          {item.divider && <div style={{ borderBottom: '1px solid #333', margin: '4px 0' }} />}
        </React.Fragment>
      ))}
    </div>
  )
}

interface OutlinerFilterBarProps {
  filter: OutlinerFilter
  onFilterChange: (filter: OutlinerFilter) => void
  onCollapseAll: () => void
  onExpandAll: () => void
}

export function OutlinerFilterBar({ filter, onFilterChange, onCollapseAll, onExpandAll }: OutlinerFilterBarProps) {
  const [showTypeFilter, setShowTypeFilter] = useState(false)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px',
        borderBottom: '1px solid #333',
      }}
    >
      <input
        type="text"
        placeholder="Search..."
        value={filter.search || ''}
        onChange={(e) => onFilterChange({ ...filter, search: e.target.value })}
        style={{
          flex: 1,
          padding: '4px 8px',
          background: '#0f0f23',
          border: '1px solid #333',
          borderRadius: '4px',
          color: '#fff',
          fontSize: '12px',
        }}
      />

      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowTypeFilter(!showTypeFilter)}
          style={{
            padding: '4px 8px',
            background: filter.types?.length ? '#3f51b5' : '#0f0f23',
            border: '1px solid #333',
            borderRadius: '4px',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '12px',
          }}
          title="Filter by type"
        >
          T
        </button>

        {showTypeFilter && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '4px',
              background: '#1a1a2e',
              border: '1px solid #333',
              borderRadius: '4px',
              padding: '8px',
              zIndex: 100,
              minWidth: '150px',
            }}
          >
            {Object.entries(OBJECT_TYPE_CONFIG).map(([type, config]) => (
              <label
                key={type}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '2px 4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                <input
                  type="checkbox"
                  checked={filter.types?.includes(type as SceneObjectType) || false}
                  onChange={(e) => {
                    const types = new Set(filter.types || [])
                    if (e.target.checked) {
                      types.add(type as SceneObjectType)
                    } else {
                      types.delete(type as SceneObjectType)
                    }
                    onFilterChange({ ...filter, types: Array.from(types) })
                  }}
                />
                <span style={{ color: config.color }}>{config.icon}</span>
                <span style={{ color: '#ccc' }}>{type}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={onCollapseAll}
        style={{
          padding: '4px 8px',
          background: '#0f0f23',
          border: '1px solid #333',
          borderRadius: '4px',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '12px',
        }}
        title="Collapse All"
      >
        -
      </button>

      <button
        onClick={onExpandAll}
        style={{
          padding: '4px 8px',
          background: '#0f0f23',
          border: '1px solid #333',
          borderRadius: '4px',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '12px',
        }}
        title="Expand All"
      >
        +
      </button>
    </div>
  )
}
