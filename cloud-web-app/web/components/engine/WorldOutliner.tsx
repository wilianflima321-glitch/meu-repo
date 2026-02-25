/**
 * World Outliner
 * Scene hierarchy browser inspired by professional game editors.
 */

'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'

import {
  OutlinerContextMenu,
  OutlinerFilterBar,
  TreeItem,
} from './WorldOutliner.panels'
import {
  createDefaultSceneObjects,
  type OutlinerFilter,
  type SceneObject,
  type SceneObjectType,
} from './WorldOutliner.types'

export type { OutlinerFilter, SceneObject, SceneObjectType } from './WorldOutliner.types'

export interface WorldOutlinerProps {
  objects?: SceneObject[]
  onSelectionChange?: (selected: SceneObject[]) => void
  onObjectChange?: (object: SceneObject) => void
  onCreateObject?: (type: SceneObjectType, parent?: SceneObject) => void
  onDeleteObject?: (object: SceneObject) => void
  onFocusObject?: (object: SceneObject) => void
  onReparentObject?: (object: SceneObject, newParent: SceneObject | null) => void
}

export default function WorldOutliner({
  objects: initialObjects,
  onSelectionChange,
  onObjectChange,
  onCreateObject,
  onDeleteObject,
  onFocusObject,
  onReparentObject,
}: WorldOutlinerProps) {
  const [objects, setObjects] = useState<SceneObject[]>(() => initialObjects || createDefaultSceneObjects())
  const [filter, setFilter] = useState<OutlinerFilter>({})
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(['3', '4', '5', '7']))
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(['4']))
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; object: SceneObject | null } | null>(null)

  const flattenedObjects = useMemo(() => {
    const result: { object: SceneObject; level: number }[] = []

    const traverse = (items: SceneObject[], level: number) => {
      for (const item of items) {
        if (filter.search && !item.name.toLowerCase().includes(filter.search.toLowerCase())) {
          continue
        }
        if (filter.types?.length && !filter.types.includes(item.type)) {
          continue
        }
        if (!filter.showHidden && !item.visible) {
          continue
        }

        result.push({ object: item, level })

        if (expandedIds.has(item.id) && item.children.length > 0) {
          traverse(item.children, level + 1)
        }
      }
    }

    traverse(objects, 0)
    return result
  }, [objects, filter, expandedIds])

  const findObjectById = useCallback(
    (id: string, items: SceneObject[] = objects): SceneObject | null => {
      for (const item of items) {
        if (item.id === id) return item
        if (item.children.length > 0) {
          const found = findObjectById(id, item.children)
          if (found) return found
        }
      }
      return null
    },
    [objects],
  )

  const updateObject = useCallback(
    (id: string, updates: Partial<SceneObject>) => {
      setObjects((prevObjects) => {
        const updateInTree = (items: SceneObject[]): SceneObject[] =>
          items.map((item) => {
            if (item.id === id) {
              const updated = { ...item, ...updates }
              onObjectChange?.(updated)
              return updated
            }
            if (item.children.length > 0) {
              return { ...item, children: updateInTree(item.children) }
            }
            return item
          })

        return updateInTree(prevObjects)
      })
    },
    [onObjectChange],
  )

  const handleSelect = useCallback((object: SceneObject, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (next.has(object.id)) {
          next.delete(object.id)
        } else {
          next.add(object.id)
        }
        return next
      })
      return
    }

    setSelectedIds(new Set([object.id]))
  }, [])

  useEffect(() => {
    const selected = Array.from(selectedIds)
      .map((id) => findObjectById(id))
      .filter(Boolean) as SceneObject[]

    onSelectionChange?.(selected)
  }, [selectedIds, findObjectById, onSelectionChange])

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleToggleVisibility = useCallback(
    (id: string) => {
      const object = findObjectById(id)
      if (object) {
        updateObject(id, { visible: !object.visible })
      }
    },
    [findObjectById, updateObject],
  )

  const handleToggleLock = useCallback(
    (id: string) => {
      const object = findObjectById(id)
      if (object) {
        updateObject(id, { locked: !object.locked })
      }
    },
    [findObjectById, updateObject],
  )

  const handleRename = useCallback((id: string, name: string) => {
    updateObject(id, { name })
  }, [updateObject])

  const handleDragStart = useCallback((event: React.DragEvent, id: string) => {
    setDraggedId(id)
    event.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback(
    (event: React.DragEvent, id: string) => {
      event.preventDefault()
      if (draggedId && draggedId !== id) {
        setDragOverId(id)
      }
    },
    [draggedId],
  )

  const handleDrop = useCallback(
    (event: React.DragEvent, targetId: string) => {
      event.preventDefault()

      if (draggedId && draggedId !== targetId) {
        const draggedObject = findObjectById(draggedId)
        const targetObject = findObjectById(targetId)

        if (draggedObject && targetObject) {
          onReparentObject?.(draggedObject, targetObject)
        }
      }

      setDraggedId(null)
      setDragOverId(null)
    },
    [draggedId, findObjectById, onReparentObject],
  )

  const handleContextMenu = useCallback((event: React.MouseEvent, object: SceneObject | null) => {
    event.preventDefault()
    setContextMenu({ x: event.clientX, y: event.clientY, object })
  }, [])

  const handleContextAction = useCallback(
    (action: string) => {
      const object = contextMenu?.object

      switch (action) {
        case 'focus':
          if (object) onFocusObject?.(object)
          return

        case 'rename':
          return

        case 'duplicate':
          if (object) {
            const duplicate: SceneObject = {
              ...object,
              id: Date.now().toString(),
              name: `${object.name}_copy`,
              selected: false,
              children: [],
            }
            setObjects((prev) => [...prev, duplicate])
          }
          return

        case 'visibility':
          if (object) handleToggleVisibility(object.id)
          return

        case 'lock':
          if (object) handleToggleLock(object.id)
          return

        case 'delete':
          if (object) {
            onDeleteObject?.(object)
            setObjects((prev) => {
              const removeFromTree = (items: SceneObject[]): SceneObject[] => {
                const result: SceneObject[] = []
                for (const item of items) {
                  if (item.id === object.id) {
                    continue
                  }
                  result.push({
                    ...item,
                    children: item.children.length > 0 ? removeFromTree(item.children) : item.children,
                  })
                }
                return result
              }
              return removeFromTree(prev)
            })
          }
          return

        case 'create_empty':
          onCreateObject?.('empty')
          return

        case 'create_cube':
        case 'create_sphere':
        case 'create_plane':
          onCreateObject?.('mesh')
          return

        case 'create_light':
          onCreateObject?.('light')
          return

        case 'create_camera':
          onCreateObject?.('camera')
          return

        case 'create_audio':
          onCreateObject?.('audio')
          return

        case 'create_particle':
          onCreateObject?.('particle')
          return

        case 'create_trigger':
          onCreateObject?.('trigger')
          return

        default:
          return
      }
    },
    [contextMenu, handleToggleVisibility, handleToggleLock, onFocusObject, onDeleteObject, onCreateObject],
  )

  const handleCollapseAll = useCallback(() => {
    setExpandedIds(new Set())
  }, [])

  const handleExpandAll = useCallback(() => {
    const allIds = new Set<string>()

    const collectIds = (items: SceneObject[]) => {
      for (const item of items) {
        if (item.children.length > 0) {
          allIds.add(item.id)
          collectIds(item.children)
        }
      }
    }

    collectIds(objects)
    setExpandedIds(allIds)
  }, [objects])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#0d1117',
        color: '#fff',
      }}
      onContextMenu={(event) => handleContextMenu(event, null)}
    >
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid #333',
          fontWeight: 'bold',
          fontSize: '13px',
          color: '#fff',
          background: '#1a1a2e',
        }}
      >
        World Outliner
      </div>

      <OutlinerFilterBar
        filter={filter}
        onFilterChange={setFilter}
        onCollapseAll={handleCollapseAll}
        onExpandAll={handleExpandAll}
      />

      <div style={{ flex: 1, overflow: 'auto' }}>
        {flattenedObjects.map(({ object, level }) => (
          <TreeItem
            key={object.id}
            object={object}
            level={level}
            isExpanded={expandedIds.has(object.id)}
            onToggleExpand={() => handleToggleExpand(object.id)}
            onSelect={(event) => handleSelect(object, event)}
            onToggleVisibility={() => handleToggleVisibility(object.id)}
            onToggleLock={() => handleToggleLock(object.id)}
            onRename={(name) => handleRename(object.id, name)}
            onDragStart={(event) => handleDragStart(event, object.id)}
            onDragOver={(event) => handleDragOver(event, object.id)}
            onDrop={(event) => handleDrop(event, object.id)}
            onContextMenu={(event) => handleContextMenu(event, object)}
            isDragOver={dragOverId === object.id}
            selectedIds={selectedIds}
          />
        ))}

        {flattenedObjects.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', color: '#555' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>0</div>
            <div>No objects in scene</div>
          </div>
        )}
      </div>

      <div
        style={{
          padding: '4px 12px',
          borderTop: '1px solid #333',
          fontSize: '11px',
          color: '#666',
          background: '#1a1a2e',
        }}
      >
        {flattenedObjects.length} objects · {selectedIds.size} selected
      </div>

      {contextMenu && (
        <OutlinerContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          object={contextMenu.object}
          onClose={() => setContextMenu(null)}
          onAction={handleContextAction}
        />
      )}
    </div>
  )
}
