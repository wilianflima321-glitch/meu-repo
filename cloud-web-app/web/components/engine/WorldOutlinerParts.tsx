'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { OutlinerFilter, SceneObject, SceneObjectType } from './WorldOutliner';

export const OBJECT_TYPE_CONFIG: Record<SceneObjectType, { icon: string; color: string }> = {
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

export function TreeItem({
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
        <button type="button" aria-label={isExpanded ? `Collapse ${object.name}` : `Expand ${object.name}`}
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
        <button type="button" aria-label={object.visible ? `Hide ${object.name}` : `Show ${object.name}`}
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
        <button type="button" aria-label={object.locked ? `Unlock ${object.name}` : `Lock ${object.name}`}
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

export function OutlinerContextMenu({
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
    { id: 'create_prefab', label: '🧩 Create Prefab', divider: false },
    { id: 'create_blueprint', label: '📐 Create Blueprint', divider: true },
    { id: 'delete', label: 'Delete', divider: false },
  ] : [
    { id: 'create_empty', label: '⊡ Create Vazio', divider: false },
    { id: 'create_cube', label: '🔷 Create Cubo', divider: false },
    { id: 'create_sphere', label: '🔵 Create Esfera', divider: false },
    { id: 'create_plane', label: '⬜ Create Plano', divider: true },
    { id: 'create_light', label: '💡 Create Luz', divider: false },
    { id: 'create_camera', label: '📷 Create Camera', divider: false },
    { id: 'create_audio', label: '🔊 Create Audio', divider: true },
    { id: 'create_particle', label: '✨ Create Particulas', divider: false },
    { id: 'create_trigger', label: '🎯 Create Trigger', divider: false },
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
          <button type="button" aria-label={`Run world outliner action ${item.label}`}
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

export function OutlinerFilterBar({
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
        placeholder="🔍 Search..."
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
        <button type="button" aria-label={showTypeFilter ? 'Hide type filters' : 'Show type filters'}
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
          title="Filter por tipo"
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
      <button type="button" aria-label="Collapse all world outliner items"
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
      <button type="button" aria-label="Expand all world outliner items"
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
