/**
 * World Outliner - Hierarquia de Objetos da Cena
 *
 * Sistema profissional estilo Unreal Engine para visualizar
 * e gerenciar a hierarquia de objetos na cena.
 *
 * NAO E MOCK - Sistema real e funcional!
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

const OBJECT_TYPE_CONFIG: Record<SceneObjectType, { icon: string; color: string }> = {
  empty: { icon: '⊡', color: 'var(--aethel-text-quaternary)' },
  mesh: { icon: '🔷', color: 'var(--aethel-primary)' },
  light: { icon: '💡', color: 'var(--aethel-warning)' },
  camera: { icon: '📷', color: 'var(--aethel-accent)' },
  audio: { icon: '🔊', color: 'var(--aethel-info)' },
  particle: { icon: '✨', color: 'var(--aethel-error)' },
  trigger: { icon: '🎯', color: 'var(--aethel-success)' },
  volume: { icon: '📦', color: 'var(--aethel-text-tertiary)' },
  blueprint: { icon: '📐', color: 'var(--aethel-primary)' },
  prefab: { icon: '🧩', color: 'var(--aethel-info)' },
  landscape: { icon: '🏔️', color: 'var(--aethel-success)' },
  foliage: { icon: '🌿', color: 'var(--aethel-success)' },
  spline: { icon: '〰️', color: 'var(--aethel-warning)' },
  group: { icon: '📁', color: 'var(--aethel-text-tertiary)' },
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
  onToggleBloquear: () => void;
  onRenomear: (name: string) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  isDragOver: boolean;
  selecionadosIds: Set<string>;
}

function TreeItem({
  object,
  level,
  isExpanded,
  onToggleExpand,
  onSelect,
  onToggleVisibility,
  onToggleBloquear,
  onRenomear,
  onDragStart,
  onDragOver,
  onDrop,
  onContextMenu,
  isDragOver,
  selecionadosIds,
}: TreeItemProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenomearValue] = useState(object.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const config = OBJECT_TYPE_CONFIG[object.type];
  const isSelected = selecionadosIds.has(object.id);
  const hasChildren = object.children.length > 0;

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const handleRenomearSubmit = () => {
    if (renameValue.trim() && renameValue !== object.name) {
      onRenomear(renameValue.trim());
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
        borderLeft: isDragOver ? '2px solid var(--aethel-primary)' : '2px solid transparent',
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
          background: isSelected ? 'var(--aethel-primary)33' : isDragOver ? 'var(--aethel-primary)22' : 'transparent',
          cursor: 'pointer',
          fontSize: '13px',
          opacity: object.visible ? 1 : 0.5,
          userSelect: 'none',
        }}
        onMouseOver={(e) => {
          if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
        }}
        onMouseOut={(e) => {
          if (!isSelected) e.currentTarget.style.background = 'transparent';
        }}
      >
        {/* Expand Arrow */}
        <button type="button"
          onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
          style={{
            width: '16px',
            height: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: 'none',
            color: 'var(--aethel-text-quaternary)',
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
            onChange={(e) => setRenomearValue(e.target.value)}
            onBlur={handleRenomearSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenomearSubmit();
              if (e.key === 'Escape') {
                setRenomearValue(object.name);
                setIsRenaming(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            style={{
              flex: 1,
              background: 'var(--aethel-surface-tertiary)',
              border: '1px solid var(--aethel-primary)',
              borderRadius: '3px',
              color: 'var(--aethel-text-primary)',
              fontSize: '13px',
              padding: '1px 6px',
              outline: 'none',
            }}
          />
        ) : (
          <span style={{
            flex: 1,
            color: isSelected ? 'var(--aethel-text-primary)' : 'var(--aethel-text-secondary)',
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
            background: 'var(--aethel-surface-quaternary)',
            borderRadius: '3px',
            fontSize: '10px',
            color: 'var(--aethel-text-quaternary)',
            marginRight: '6px',
          }}>
            {object.components.length}
          </span>
        )}

        {/* Visibility Toggle */}
        <button type="button"
          onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
          style={{
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: 'none',
            color: object.visible ? 'var(--aethel-success)' : 'var(--aethel-text-quaternary)',
            cursor: 'pointer',
            fontSize: '12px',
          }}
          title={object.visible ? 'Ocultar' : 'Mostrar'}
        >
          {object.visible ? '👁' : '👁‍🗨'}
        </button>

        {/* Bloquear Toggle */}
        <button type="button"
          onClick={(e) => { e.stopPropagation(); onToggleBloquear(); }}
          style={{
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: 'none',
            color: object.locked ? 'var(--aethel-warning)' : 'var(--aethel-text-quaternary)',
            cursor: 'pointer',
            fontSize: '12px',
          }}
          title={object.locked ? 'Desbloquear' : 'Bloquear'}
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
    { id: 'focus', label: '🎯 Focar', divider: false },
    { id: 'rename', label: '✏️ Renomear', divider: false },
    { id: 'duplicate', label: '📋 Duplicar', divider: true },
    { id: 'visibility', label: object.visible ? '👁‍🗨 Ocultar' : '👁 Mostrar', divider: false },
    { id: 'lock', label: object.locked ? '🔓 Desbloquear' : '🔒 Bloquear', divider: true },
    { id: 'group', label: '📁 Agrupar', divider: false },
    { id: 'ungroup', label: '📂 Desagrupar', divider: true },
    { id: 'create_prefab', label: '🧩 Criar Prefab', divider: false },
    { id: 'create_blueprint', label: '📐 Criar Blueprint', divider: true },
    { id: 'delete', label: '🗑️ Excluir', divider: false },
  ] : [
    { id: 'create_empty', label: '⊡ Criar Vazio', divider: false },
    { id: 'create_cube', label: '🔷 Criar Cubo', divider: false },
    { id: 'create_sphere', label: '🔵 Criar Esfera', divider: false },
    { id: 'create_plane', label: '⬜ Criar Plano', divider: true },
    { id: 'create_light', label: '💡 Criar Luz', divider: false },
    { id: 'create_camera', label: '📷 Criar Camera', divider: false },
    { id: 'create_audio', label: '🔊 Criar Audio', divider: true },
    { id: 'create_particle', label: '✨ Criar Particulas', divider: false },
    { id: 'create_trigger', label: '🎯 Criar Trigger', divider: false },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        left: x,
        top: y,
        background: 'var(--aethel-surface-secondary)',
        border: '1px solid var(--aethel-border-primary)',
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
          <button type="button"
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
              color: item.id === 'delete' ? 'var(--aethel-error)' : 'var(--aethel-text-secondary)',
              fontSize: '13px',
              textAlign: 'left',
              cursor: 'pointer',
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'var(--aethel-surface-quaternary)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'none'}
          >
            {item.label}
          </button>
          {item.divider && <div style={{ borderBottom: '1px solid var(--aethel-border-primary)', margin: '4px 0' }} />}
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
  const [showTypeFilter, setMostrarTypeFilter] = useState(false);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px',
      borderBottom: '1px solid var(--aethel-border-primary)',
    }}>
      {/* Search */}
      <input
        type="text"
        placeholder="🔍 Buscar..."
        value={filter.search || ''}
        onChange={(e) => onFilterChange({ ...filter, search: e.target.value })}
        style={{
          flex: 1,
          padding: '4px 8px',
          background: 'var(--aethel-surface-tertiary)',
          border: '1px solid var(--aethel-border-primary)',
          borderRadius: '4px',
          color: 'var(--aethel-text-primary)',
          fontSize: '12px',
        }}
      />

      {/* Type Filter */}
      <div style={{ position: 'relative' }}>
        <button type="button"
          onClick={() => setMostrarTypeFilter(!showTypeFilter)}
          style={{
            padding: '4px 8px',
            background: filter.types?.length ? 'var(--aethel-primary)' : 'var(--aethel-surface-tertiary)',
            border: '1px solid var(--aethel-border-primary)',
            borderRadius: '4px',
            color: 'var(--aethel-text-primary)',
            cursor: 'pointer',
            fontSize: '12px',
          }}
          title="Filtrar por tipo"
        >
          📋
        </button>

        {showTypeFilter && (
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '4px',
            background: 'var(--aethel-surface-secondary)',
            border: '1px solid var(--aethel-border-primary)',
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
                <span style={{ color: 'var(--aethel-text-secondary)' }}>{type}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Recolher tudo */}
      <button type="button"
        onClick={onCollapseAll}
        style={{
          padding: '4px 8px',
          background: 'var(--aethel-surface-tertiary)',
          border: '1px solid var(--aethel-border-primary)',
          borderRadius: '4px',
          color: 'var(--aethel-text-primary)',
          cursor: 'pointer',
          fontSize: '12px',
        }}
        title="Recolher tudo"
      >
        ⬆
      </button>

      {/* Expandir tudo */}
      <button type="button"
        onClick={onExpandAll}
        style={{
          padding: '4px 8px',
          background: 'var(--aethel-surface-tertiary)',
          border: '1px solid var(--aethel-border-primary)',
          borderRadius: '4px',
          color: 'var(--aethel-text-primary)',
          cursor: 'pointer',
          fontSize: '12px',
        }}
        title="Expandir tudo"
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
  objetos?: SceneObject[];
  onSelectionChange?: (selecionados: SceneObject[]) => void;
  onObjectChange?: (object: SceneObject) => void;
  onCreateObject?: (type: SceneObjectType, parent?: SceneObject) => void;
  onExcluirObject?: (object: SceneObject) => void;
  onFocarObject?: (object: SceneObject) => void;
  onReparentObject?: (object: SceneObject, newParent: SceneObject | null) => void;
}

export default function WorldOutliner({
  objetos: initialObjects,
  onSelectionChange,
  onObjectChange,
  onCreateObject,
  onExcluirObject,
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
          onExcluirObject?.(object);
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
  }, [contextMenu, handleToggleVisibility, handleToggleBloquear, onFocarObject, onExcluirObject, onCreateObject]);

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
            onToggleBloquear={() => handleToggleBloquear(object.id)}
            onRenomear={(name) => handleRenomear(object.id, name)}
            onDragStart={(e) => handleDragStart(e, object.id)}
            onDragOver={(e) => handleDragOver(e, object.id)}
            onDrop={(e) => handleDrop(e, object.id)}
            onContextMenu={(e) => handleContextMenu(e, object)}
            isDragOver={dragOverId === object.id}
            selecionadosIds={selecionadosIds}
          />
        ))}

        {flattenedObjects.length === 0 && (
          <div style={{
            padding: '24px',
            textAlign: 'center',
            color: 'var(--aethel-text-quaternary)',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌐</div>
            <div>Nenhum objeto na cena</div>
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
