'use client';

/**
 * World Outliner - Hierarquia de Objetos da Cena
 *
 * Sistema profissional estilo Unreal Engine para visualizar
 * e gerenciar a hierarquia de objetos na cena.
 *
 * NAO E MOCK - Sistema real e funcional!
 */
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { EditorScaleReadinessBadge } from '@/components/editor/EditorScaleReadinessBadge';
import { useVirtualWindow } from '@/components/performance/useVirtualWindow';
import { buildEditorScaleReadiness } from '@/lib/editor/editor-scale-readiness';
import { OutlinerContextMenu, OutlinerFilterBar, TreeItem } from './WorldOutlinerParts';

// ============================================================================
// TIPOS
// ============================================================================

export type SceneObjectType =
  | 'empty'
  | 'mesh'
  | 'light'
  | 'camera'
  | 'audio'
  | 'particle'
  | 'trigger'
  | 'volume'
  | 'blueprint'
  | 'prefab'
  | 'landscape'
  | 'foliage'
  | 'spline'
  | 'group';

export interface SceneObject {
  id: string;
  name: string;
  type: SceneObjectType;
  visible: boolean;
  locked: boolean;
  selecionados: boolean;
  children: SceneObject[];
  parentId?: string;
  components?: string[];
  tags?: string[];
  layer?: number;
  threeObject?: THREE.Object3D;
}

export interface OutlinerFilter {
  search?: string;
  types?: SceneObjectType[];
  showHidden?: boolean;
  showBloqueared?: boolean;
  tags?: string[];
}

// ============================================================================
// ICONS E CORES POR TIPO
// ============================================================================

export interface WorldOutlinerProps {
  objetos?: SceneObject[];
  onSelectionChange?: (selecionados: SceneObject[]) => void;
  onObjectChange?: (object: SceneObject) => void;
  onCreateObject?: (type: SceneObjectType, parent?: SceneObject) => void;
  onDeleteObject?: (object: SceneObject) => void;
  onFocarObject?: (object: SceneObject) => void;
  onReparentObject?: (object: SceneObject, newParent: SceneObject | null) => void;
}

const OUTLINER_ROW_HEIGHT = 26;

export default function WorldOutliner({
  objetos: initialObjects,
  onSelectionChange,
  onObjectChange,
  onCreateObject,
  onDeleteObject,
  onFocarObject,
  onReparentObject,
}: WorldOutlinerProps) {
  // Sample data
  const [objetos, setObjects] = useState<SceneObject[]>(initialObjects || [
    {
      id: '1',
      name: 'DirectionalLight',
      type: 'light',
      visible: true,
      locked: false,
      selecionados: false,
      children: [],
    },
    {
      id: '2',
      name: 'MainCamera',
      type: 'camera',
      visible: true,
      locked: true,
      selecionados: false,
      children: [],
    },
    {
      id: '3',
      name: 'Environment',
      type: 'group',
      visible: true,
      locked: false,
      selecionados: false,
      children: [
        {
          id: '3a',
          name: 'Landscape',
          type: 'landscape',
          visible: true,
          locked: false,
          selecionados: false,
          children: [],
          parentId: '3',
        },
        {
          id: '3b',
          name: 'Foliage',
          type: 'foliage',
          visible: true,
          locked: false,
          selecionados: false,
          children: [],
          parentId: '3',
        },
      ],
    },
    {
      id: '4',
      name: 'Player',
      type: 'blueprint',
      visible: true,
      locked: false,
      selecionados: true,
      components: ['CharacterMovement', 'CameraArm', 'SkeletalMesh'],
      children: [
        {
          id: '4a',
          name: 'Weapon',
          type: 'mesh',
          visible: true,
          locked: false,
          selecionados: false,
          children: [],
          parentId: '4',
        },
      ],
    },
    {
      id: '5',
      name: 'Enemies',
      type: 'group',
      visible: true,
      locked: false,
      selecionados: false,
      children: [
        {
          id: '5a',
          name: 'Enemy_01',
          type: 'blueprint',
          visible: true,
          locked: false,
          selecionados: false,
          children: [],
          parentId: '5',
          components: ['AI', 'Health'],
        },
        {
          id: '5b',
          name: 'Enemy_02',
          type: 'blueprint',
          visible: true,
          locked: false,
          selecionados: false,
          children: [],
          parentId: '5',
          components: ['AI', 'Health'],
        },
      ],
    },
    {
      id: '6',
      name: 'AudioManager',
      type: 'audio',
      visible: true,
      locked: false,
      selecionados: false,
      children: [],
    },
    {
      id: '7',
      name: 'ParticleEffects',
      type: 'group',
      visible: true,
      locked: false,
      selecionados: false,
      children: [
        {
          id: '7a',
          name: 'Fire_FX',
          type: 'particle',
          visible: true,
          locked: false,
          selecionados: false,
          children: [],
          parentId: '7',
        },
      ],
    },
  ]);

  const [filter, setFilter] = useState<OutlinerFilter>({});
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['3', '4', '5', '7']));
  const [selecionadosIds, setSelectedIds] = useState<Set<string>>(new Set(['4']));
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; object: SceneObject | null } | null>(null);

  const totalObjectCount = useMemo(() => {
    const countObjects = (items: SceneObject[]): number =>
      items.reduce((total, item) => total + 1 + countObjects(item.children), 0);

    return countObjects(objetos);
  }, [objetos]);

  // Flatten tree for rendering with filter
  const flattenedObjects = useMemo(() => {
    const result: { object: SceneObject; level: number }[] = [];

    const traverse = (items: SceneObject[], level: number) => {
      for (const item of items) {
        // Apply filters
        if (filter.search && !item.name.toLowerCase().includes(filter.search.toLowerCase())) {
          continue;
        }
        if (filter.types?.length && !filter.types.includes(item.type)) {
          continue;
        }
        if (!filter.showHidden && !item.visible) {
          continue;
        }

        result.push({ object: item, level });

        if (expandedIds.has(item.id) && item.children.length > 0) {
          traverse(item.children, level + 1);
        }
      }
    };

    traverse(objetos, 0);
    return result;
  }, [objetos, filter, expandedIds]);

  // Find object by ID in tree
  const findObjectById = useCallback((id: string, items: SceneObject[] = objetos): SceneObject | null => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children.length > 0) {
        const found = findObjectById(id, item.children);
        if (found) return found;
      }
    }
    return null;
  }, [objetos]);

  // Update object in tree
  const updateObject = useCallback((id: string, updates: Partial<SceneObject>) => {
    const updateInTree = (items: SceneObject[]): SceneObject[] => {
      return items.map(item => {
        if (item.id === id) {
          const updated = { ...item, ...updates };
          onObjectChange?.(updated);
          return updated;
        }
        if (item.children.length > 0) {
          return { ...item, children: updateInTree(item.children) };
        }
        return item;
      });
    };

    setObjects(updateInTree(objetos));
  }, [objetos, onObjectChange]);

  // Handlers
  const handleSelect = useCallback((object: SceneObject, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(object.id)) {
          next.delete(object.id);
        } else {
          next.add(object.id);
        }
        return next;
      });
    } else {
      setSelectedIds(new Set([object.id]));
    }
  }, []);

  useEffect(() => {
    const selecionados = Array.from(selecionadosIds)
      .map(id => findObjectById(id))
      .filter(Boolean) as SceneObject[];
    onSelectionChange?.(selecionados);
  }, [selecionadosIds, findObjectById, onSelectionChange]);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleToggleVisibility = useCallback((id: string) => {
    const obj = findObjectById(id);
    if (obj) {
      updateObject(id, { visible: !obj.visible });
    }
  }, [findObjectById, updateObject]);

  const handleToggleBloquear = useCallback((id: string) => {
    const obj = findObjectById(id);
    if (obj) {
      updateObject(id, { locked: !obj.locked });
    }
  }, [findObjectById, updateObject]);

  const handleRenomear = useCallback((id: string, name: string) => {
    updateObject(id, { name });
  }, [updateObject]);

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedId && draggedId !== id) {
      setDragOverId(id);
    }
  }, [draggedId]);

  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();

    if (draggedId && draggedId !== targetId) {
      const draggedObj = findObjectById(draggedId);
      const targetObj = findObjectById(targetId);

      if (draggedObj && targetObj) {
        onReparentObject?.(draggedObj, targetObj);
      }
    }

    setDraggedId(null);
    setDragOverId(null);
  }, [draggedId, findObjectById, onReparentObject]);

  const handleContextMenu = useCallback((e: React.MouseEvent, object: SceneObject | null) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, object });
  }, []);

  const handleContextAction = useCallback((action: string) => {
    const object = contextMenu?.object;

    switch (action) {
      case 'focus':
        if (object) onFocarObject?.(object);
        break;

      case 'rename':
        // Handled by double-click in tree item
        break;

      case 'duplicate':
        if (object) {
          const duplicate: SceneObject = {
            ...object,
            id: Date.now().toString(),
            name: `${object.name}_copy`,
            selecionados: false,
            children: [],
          };
          setObjects(prev => [...prev, duplicate]);
        }
        break;

      case 'visibility':
        if (object) handleToggleVisibility(object.id);
        break;

      case 'lock':
        if (object) handleToggleBloquear(object.id);
        break;

      case 'delete':
        if (object) {
          onDeleteObject?.(object);
          setObjects(prev => {
            const removeFromTree = (items: SceneObject[]): SceneObject[] => {
              return items.filter(item => {
                if (item.id === object.id) return false;
                if (item.children.length > 0) {
                  item.children = removeFromTree(item.children);
                }
                return true;
              });
            };
            return removeFromTree(prev);
          });
        }
        break;

      // Create actions
      case 'create_empty':
        onCreateObject?.('empty');
        break;
      case 'create_cube':
      case 'create_sphere':
      case 'create_plane':
        onCreateObject?.('mesh');
        break;
      case 'create_light':
        onCreateObject?.('light');
        break;
      case 'create_camera':
        onCreateObject?.('camera');
        break;
      case 'create_audio':
        onCreateObject?.('audio');
        break;
      case 'create_particle':
        onCreateObject?.('particle');
        break;
      case 'create_trigger':
        onCreateObject?.('trigger');
        break;
    }
  }, [contextMenu, handleToggleVisibility, handleToggleBloquear, onFocarObject, onDeleteObject, onCreateObject]);

  const handleCollapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  const handleExpandAll = useCallback(() => {
    const allIds = new Set<string>();
    const collectIds = (items: SceneObject[]) => {
      for (const item of items) {
        if (item.children.length > 0) {
          allIds.add(item.id);
          collectIds(item.children);
        }
      }
    };
    collectIds(objetos);
    setExpandedIds(allIds);
  }, [objetos]);

  const {
    containerRef: treeViewportRef,
    onScroll: handleTreeScroll,
    virtualItems: virtualTreeItems,
    totalSize: virtualTreeHeight,
  } = useVirtualWindow({
    itemCount: flattenedObjects.length,
    itemSize: OUTLINER_ROW_HEIGHT,
    overscan: 18,
  });

  const outlinerScaleReadiness = useMemo(
    () => buildEditorScaleReadiness({
      lane: 'world-outliner',
      totalCount: totalObjectCount,
      visibleCount: flattenedObjects.length,
      virtualization: true,
    }),
    [flattenedObjects.length, totalObjectCount],
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--aethel-surface-primary)',
        color: 'var(--aethel-text-primary)',
      }}
      onContextMenu={(e) => handleContextMenu(e, null)}
    >
      {/* Header */}
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid var(--aethel-border-primary)',
        fontWeight: 'bold',
        fontSize: '13px',
        color: 'var(--aethel-text-primary)',
        background: 'var(--aethel-surface-secondary)',
      }}>
        🌍 World Outliner
      </div>

      {/* Filter Bar */}
      <OutlinerFilterBar
        filter={filter}
        onFilterChange={setFilter}
        onCollapseAll={handleCollapseAll}
        onExpandAll={handleExpandAll}
      />

      <EditorScaleReadinessBadge readiness={outlinerScaleReadiness} />

      {/* Tree */}
      <div
        ref={treeViewportRef}
        onScroll={handleTreeScroll}
        style={{ flex: 1, overflow: 'auto', position: 'relative' }}
      >
        {flattenedObjects.length > 0 && (
          <div style={{ height: virtualTreeHeight, position: 'relative' }}>
            {virtualTreeItems.map(({ index, offset }) => {
              const row = flattenedObjects[index];
              if (!row) return null;
              const { object, level } = row;

              return (
                <div
                  key={object.id}
                  style={{
                    position: 'absolute',
                    top: offset,
                    left: 0,
                    right: 0,
                    height: OUTLINER_ROW_HEIGHT,
                  }}
                >
                  <TreeItem
                    object={object}
                    level={level}
                    isExpanded={expandedIds.has(object.id)}
                    onToggleExpand={() => handleToggleExpand(object.id)}
                    onSelect={(e) => handleSelect(object, e)}
                    onToggleVisibility={() => handleToggleVisibility(object.id)}
                    onToggleBloquear={() => handleToggleBloquear(object.id)}
                    onRenomear={(name) => handleRenomear(object.id, name)}
                    onDragStart={(e) => handleDragStart(e, object.id)}
                    onDragOver={(e) => handleDragOver(e, object.id)}
                    onDrop={(e) => handleDrop(e, object.id)}
                    onContextMenu={(e) => handleContextMenu(e, object)}
                    isDragOver={dragOverId === object.id}
                    selecionadosIds={selecionadosIds}
                  />
                </div>
              );
            })}
          </div>
        )}

        {flattenedObjects.length === 0 && (
          <div style={{
            padding: '24px',
            textAlign: 'center',
            color: 'var(--aethel-text-quaternary)',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌐</div>
            <div>No objeto na cena</div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div style={{
        padding: '4px 12px',
        borderTop: '1px solid var(--aethel-border-primary)',
        fontSize: '11px',
        color: 'var(--aethel-text-quaternary)',
        background: 'var(--aethel-surface-secondary)',
      }}>
        {flattenedObjects.length} objetos • {selecionadosIds.size} selecionados
      </div>

      {/* Context Menu */}
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
  );
}
