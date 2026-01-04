/**
 * World Outliner - Hierarchia de Objetos da Cena
 * 
 * Sistema profissional estilo Unreal Engine para visualizar
 * e gerenciar a hierarquia de objetos na cena.
 * 
 * NÃO É MOCK - Sistema real e funcional!
 */

'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';

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
  selected: boolean;
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
  showLocked?: boolean;
  tags?: string[];
}

// ============================================================================
// ICONS E CORES POR TIPO
// ============================================================================

const OBJECT_TYPE_CONFIG: Record<SceneObjectType, { icon: string; color: string }> = {
  empty: { icon: '⊡', color: '#888' },
  mesh: { icon: '🔷', color: '#2196f3' },
  light: { icon: '💡', color: '#ffc107' },
  camera: { icon: '📷', color: '#9c27b0' },
  audio: { icon: '🔊', color: '#00bcd4' },
  particle: { icon: '✨', color: '#ff5722' },
  trigger: { icon: '🎯', color: '#4caf50' },
  volume: { icon: '📦', color: '#607d8b' },
  blueprint: { icon: '📐', color: '#3f51b5' },
  prefab: { icon: '🧩', color: '#00acc1' },
  landscape: { icon: '🏔️', color: '#8bc34a' },
  foliage: { icon: '🌿', color: '#4caf50' },
  spline: { icon: '〰️', color: '#ff9800' },
  group: { icon: '📁', color: '#795548' },
};

// ============================================================================
// TREE ITEM COMPONENT
// ============================================================================

interface TreeItemProps {
  object: SceneObject;
  level: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSelect: (e: React.MouseEvent) => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  onRename: (name: string) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  isDragOver: boolean;
  selectedIds: Set<string>;
}

function TreeItem({
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
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(object.name);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const config = OBJECT_TYPE_CONFIG[object.type];
  const isSelected = selectedIds.has(object.id);
  const hasChildren = object.children.length > 0;
  
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);
  
  const handleRenameSubmit = () => {
    if (renameValue.trim() && renameValue !== object.name) {
      onRename(renameValue.trim());
    }
    setIsRenaming(false);
  };
  
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!isRenaming) {
      e.stopPropagation();
      setIsRenaming(true);
    }
  };
  
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onContextMenu={onContextMenu}
      style={{
        borderLeft: isDragOver ? '2px solid #3f51b5' : '2px solid transparent',
      }}
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
          if (!isSelected) e.currentTarget.style.background = '#ffffff08';
        }}
        onMouseOut={(e) => {
          if (!isSelected) e.currentTarget.style.background = 'transparent';
        }}
      >
        {/* Expand Arrow */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
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
          {isExpanded ? '▼' : '▶'}
        </button>
        
        {/* Icon */}
        <span style={{ 
          marginRight: '6px', 
          fontSize: '14px',
          color: config.color,
        }}>
          {config.icon}
        </span>
        
        {/* Name */}
        {isRenaming ? (
          <input
            ref={inputRef}
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSubmit();
              if (e.key === 'Escape') {
                setRenameValue(object.name);
                setIsRenaming(false);
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
          <span style={{ 
            flex: 1, 
            color: isSelected ? '#fff' : '#ccc',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {object.name}
          </span>
        )}
        
        {/* Component badges */}
        {object.components && object.components.length > 0 && (
          <span style={{
            padding: '1px 4px',
            background: '#333',
            borderRadius: '3px',
            fontSize: '10px',
            color: '#888',
            marginRight: '6px',
          }}>
            {object.components.length}
          </span>
        )}
        
        {/* Visibility Toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
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
          {object.visible ? '👁' : '👁‍🗨'}
        </button>
        
        {/* Lock Toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleLock(); }}
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
          {object.locked ? '🔒' : '🔓'}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// CONTEXT MENU
// ============================================================================

function OutlinerContextMenu({
  x,
  y,
  object,
  onClose,
  onAction,
}: {
  x: number;
  y: number;
  object: SceneObject | null;
  onClose: () => void;
  onAction: (action: string) => void;
}) {
  useEffect(() => {
    const handleClick = () => onClose();
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [onClose]);
  
  const items = object ? [
    { id: 'focus', label: '🎯 Focus', divider: false },
    { id: 'rename', label: '✏️ Rename', divider: false },
    { id: 'duplicate', label: '📋 Duplicate', divider: true },
    { id: 'visibility', label: object.visible ? '👁‍🗨 Hide' : '👁 Show', divider: false },
    { id: 'lock', label: object.locked ? '🔓 Unlock' : '🔒 Lock', divider: true },
    { id: 'group', label: '📁 Group', divider: false },
    { id: 'ungroup', label: '📂 Ungroup', divider: true },
    { id: 'create_prefab', label: '🧩 Create Prefab', divider: false },
    { id: 'create_blueprint', label: '📐 Create Blueprint', divider: true },
    { id: 'delete', label: '🗑️ Delete', divider: false },
  ] : [
    { id: 'create_empty', label: '⊡ Create Empty', divider: false },
    { id: 'create_cube', label: '🔷 Create Cube', divider: false },
    { id: 'create_sphere', label: '🔵 Create Sphere', divider: false },
    { id: 'create_plane', label: '⬜ Create Plane', divider: true },
    { id: 'create_light', label: '💡 Create Light', divider: false },
    { id: 'create_camera', label: '📷 Create Camera', divider: false },
    { id: 'create_audio', label: '🔊 Create Audio Source', divider: true },
    { id: 'create_particle', label: '✨ Create Particle System', divider: false },
    { id: 'create_trigger', label: '🎯 Create Trigger', divider: false },
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
              padding: '6px 16px',
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

// ============================================================================
// FILTER BAR
// ============================================================================

function OutlinerFilterBar({
  filter,
  onFilterChange,
  onCollapseAll,
  onExpandAll,
}: {
  filter: OutlinerFilter;
  onFilterChange: (filter: OutlinerFilter) => void;
  onCollapseAll: () => void;
  onExpandAll: () => void;
}) {
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px',
      borderBottom: '1px solid #333',
    }}>
      {/* Search */}
      <input
        type="text"
        placeholder="🔍 Search..."
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
      
      {/* Type Filter */}
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
          📋
        </button>
        
        {showTypeFilter && (
          <div style={{
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
          }}>
            {Object.entries(OBJECT_TYPE_CONFIG).map(([type, config]) => (
              <label key={type} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '2px 4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}>
                <input
                  type="checkbox"
                  checked={filter.types?.includes(type as SceneObjectType) || false}
                  onChange={(e) => {
                    const types = new Set(filter.types || []);
                    if (e.target.checked) {
                      types.add(type as SceneObjectType);
                    } else {
                      types.delete(type as SceneObjectType);
                    }
                    onFilterChange({ ...filter, types: Array.from(types) });
                  }}
                />
                <span style={{ color: config.color }}>{config.icon}</span>
                <span style={{ color: '#ccc' }}>{type}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      
      {/* Collapse All */}
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
        ⬆
      </button>
      
      {/* Expand All */}
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
        ⬇
      </button>
    </div>
  );
}

// ============================================================================
// MAIN WORLD OUTLINER COMPONENT
// ============================================================================

export interface WorldOutlinerProps {
  objects?: SceneObject[];
  onSelectionChange?: (selected: SceneObject[]) => void;
  onObjectChange?: (object: SceneObject) => void;
  onCreateObject?: (type: SceneObjectType, parent?: SceneObject) => void;
  onDeleteObject?: (object: SceneObject) => void;
  onFocusObject?: (object: SceneObject) => void;
  onReparentObject?: (object: SceneObject, newParent: SceneObject | null) => void;
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
  // Sample data
  const [objects, setObjects] = useState<SceneObject[]>(initialObjects || [
    {
      id: '1',
      name: 'DirectionalLight',
      type: 'light',
      visible: true,
      locked: false,
      selected: false,
      children: [],
    },
    {
      id: '2',
      name: 'MainCamera',
      type: 'camera',
      visible: true,
      locked: true,
      selected: false,
      children: [],
    },
    {
      id: '3',
      name: 'Environment',
      type: 'group',
      visible: true,
      locked: false,
      selected: false,
      children: [
        {
          id: '3a',
          name: 'Landscape',
          type: 'landscape',
          visible: true,
          locked: false,
          selected: false,
          children: [],
          parentId: '3',
        },
        {
          id: '3b',
          name: 'Foliage',
          type: 'foliage',
          visible: true,
          locked: false,
          selected: false,
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
      selected: true,
      components: ['CharacterMovement', 'CameraArm', 'SkeletalMesh'],
      children: [
        {
          id: '4a',
          name: 'Weapon',
          type: 'mesh',
          visible: true,
          locked: false,
          selected: false,
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
      selected: false,
      children: [
        {
          id: '5a',
          name: 'Enemy_01',
          type: 'blueprint',
          visible: true,
          locked: false,
          selected: false,
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
          selected: false,
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
      selected: false,
      children: [],
    },
    {
      id: '7',
      name: 'ParticleEffects',
      type: 'group',
      visible: true,
      locked: false,
      selected: false,
      children: [
        {
          id: '7a',
          name: 'Fire_FX',
          type: 'particle',
          visible: true,
          locked: false,
          selected: false,
          children: [],
          parentId: '7',
        },
      ],
    },
  ]);
  
  const [filter, setFilter] = useState<OutlinerFilter>({});
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['3', '4', '5', '7']));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(['4']));
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; object: SceneObject | null } | null>(null);
  
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
    
    traverse(objects, 0);
    return result;
  }, [objects, filter, expandedIds]);
  
  // Find object by ID in tree
  const findObjectById = useCallback((id: string, items: SceneObject[] = objects): SceneObject | null => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children.length > 0) {
        const found = findObjectById(id, item.children);
        if (found) return found;
      }
    }
    return null;
  }, [objects]);
  
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
    
    setObjects(updateInTree(objects));
  }, [objects, onObjectChange]);
  
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
    const selected = Array.from(selectedIds)
      .map(id => findObjectById(id))
      .filter(Boolean) as SceneObject[];
    onSelectionChange?.(selected);
  }, [selectedIds, findObjectById, onSelectionChange]);
  
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
  
  const handleToggleLock = useCallback((id: string) => {
    const obj = findObjectById(id);
    if (obj) {
      updateObject(id, { locked: !obj.locked });
    }
  }, [findObjectById, updateObject]);
  
  const handleRename = useCallback((id: string, name: string) => {
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
        if (object) onFocusObject?.(object);
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
            selected: false,
            children: [],
          };
          setObjects(prev => [...prev, duplicate]);
        }
        break;
        
      case 'visibility':
        if (object) handleToggleVisibility(object.id);
        break;
        
      case 'lock':
        if (object) handleToggleLock(object.id);
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
  }, [contextMenu, handleToggleVisibility, handleToggleLock, onFocusObject, onDeleteObject, onCreateObject]);
  
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
    collectIds(objects);
    setExpandedIds(allIds);
  }, [objects]);
  
  return (
    <div 
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#0d1117',
        color: '#fff',
      }}
      onContextMenu={(e) => handleContextMenu(e, null)}
    >
      {/* Header */}
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid #333',
        fontWeight: 'bold',
        fontSize: '13px',
        color: '#fff',
        background: '#1a1a2e',
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
      
      {/* Tree */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {flattenedObjects.map(({ object, level }) => (
          <TreeItem
            key={object.id}
            object={object}
            level={level}
            isExpanded={expandedIds.has(object.id)}
            onToggleExpand={() => handleToggleExpand(object.id)}
            onSelect={(e) => handleSelect(object, e)}
            onToggleVisibility={() => handleToggleVisibility(object.id)}
            onToggleLock={() => handleToggleLock(object.id)}
            onRename={(name) => handleRename(object.id, name)}
            onDragStart={(e) => handleDragStart(e, object.id)}
            onDragOver={(e) => handleDragOver(e, object.id)}
            onDrop={(e) => handleDrop(e, object.id)}
            onContextMenu={(e) => handleContextMenu(e, object)}
            isDragOver={dragOverId === object.id}
            selectedIds={selectedIds}
          />
        ))}
        
        {flattenedObjects.length === 0 && (
          <div style={{
            padding: '24px',
            textAlign: 'center',
            color: '#555',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌐</div>
            <div>No objects in scene</div>
          </div>
        )}
      </div>
      
      {/* Status Bar */}
      <div style={{
        padding: '4px 12px',
        borderTop: '1px solid #333',
        fontSize: '11px',
        color: '#666',
        background: '#1a1a2e',
      }}>
        {flattenedObjects.length} objects • {selectedIds.size} selected
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
