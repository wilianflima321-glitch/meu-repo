'use client';

import type { LevelObject, SnapMode, TransformMode, ViewportMode } from './level-editor-core';

// ============================================================================
// TOOLBAR COMPONENT
// ============================================================================

interface ToolbarProps {
  transformMode: TransformMode;
  onTransformModeChange: (mode: TransformMode) => void;
  viewMode: ViewportMode;
  onViewModeChange: (mode: ViewportMode) => void;
  snapMode: SnapMode;
  onSnapModeChange: (mode: SnapMode) => void;
  gridSize: number;
  onGridSizeChange: (size: number) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSave: () => void;
  onBuild: () => void;
}

export function Toolbar({
  transformMode, onTransformModeChange,
  viewMode, onViewModeChange,
  snapMode, onSnapModeChange,
  gridSize, onGridSizeChange,
  isPlaying, onPlayPause,
  onSave, onBuild,
}: ToolbarProps) {
  const transformTools: Record<TransformMode, { shortcut: string; label: string }> = {
    translate: { shortcut: 'W', label: 'Move' },
    rotate: { shortcut: 'E', label: 'Rotate' },
    scale: { shortcut: 'R', label: 'Scale' },
  };

  return (
    <div role="toolbar" aria-label="Level editor command toolbar" style={{
      height: '40px',
      background: 'var(--aethel-surface-tertiary)',
      borderBottom: '1px solid var(--aethel-border-primary)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
      gap: '8px',
    }}>
      {/* Transform Mode */}
      <div style={{ display: 'flex', gap: '2px', marginRight: '8px' }}>
        {(['translate', 'rotate', 'scale'] as TransformMode[]).map((mode) => {
          const tool = transformTools[mode];
          const active = transformMode === mode;
          return (
            <button type="button" aria-label={`Switch transform mode to ${tool.label}`}
              key={mode}
              onClick={() => onTransformModeChange(mode)}
              title={`${tool.label} (${tool.shortcut})`}
              style={{
                height: '28px',
                background: active ? 'var(--aethel-primary)' : 'var(--aethel-surface-quaternary)',
                border: active ? '1px solid var(--aethel-primary)' : '1px solid var(--aethel-border-subtle)',
                borderRadius: '6px',
                color: 'var(--aethel-text-primary)',
                cursor: 'pointer',
                fontSize: '11px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 8px',
              }}
            >
              <span style={{ color: active ? 'var(--aethel-text-primary)' : 'var(--aethel-text-quaternary)', fontWeight: 700 }}>{tool.shortcut}</span>
              <span>{tool.label}</span>
            </button>
          );
        })}
      </div>

      <div style={{ width: '1px', height: '20px', background: 'var(--aethel-border-primary)' }} />

      {/* Snap Mode */}
      <select
        value={snapMode}
        onChange={(e) => onSnapModeChange(e.target.value as SnapMode)}
        style={{
          background: 'var(--aethel-surface-quaternary)',
          border: '1px solid var(--aethel-border-primary)',
          borderRadius: '3px',
          color: 'var(--aethel-text-primary)',
          padding: '4px 8px',
          fontSize: '11px',
        }}
      >
        <option value="none">Free</option>
        <option value="grid">Grid</option>
        <option value="vertex">Vertex</option>
      </select>

      {snapMode === 'grid' && (
        <input
          type="number"
          value={gridSize}
          onChange={(e) => onGridSizeChange(parseFloat(e.target.value))}
          min={0.1}
          max={10}
          step={0.1}
          style={{
            width: '60px',
            background: 'var(--aethel-surface-quaternary)',
            border: '1px solid var(--aethel-border-primary)',
            borderRadius: '3px',
            color: 'var(--aethel-text-primary)',
            padding: '4px 8px',
            fontSize: '11px',
          }}
        />
      )}

      <div style={{ width: '1px', height: '20px', background: 'var(--aethel-border-primary)' }} />

      {/* View Mode */}
      <select
        value={viewMode}
        onChange={(e) => onViewModeChange(e.target.value as ViewportMode)}
        style={{
          background: 'var(--aethel-surface-quaternary)',
          border: '1px solid var(--aethel-border-primary)',
          borderRadius: '3px',
          color: 'var(--aethel-text-primary)',
          padding: '4px 8px',
          fontSize: '11px',
        }}
      >
        <option value="perspective">Perspective</option>
        <option value="top">Top</option>
        <option value="front">Front</option>
        <option value="right">Right</option>
      </select>

      <div style={{ flex: 1 }} />

      {/* Play/Pause */}
      <button type="button" aria-label={isPlaying ? 'Pause level simulation' : 'Play level simulation'}
        onClick={onPlayPause}
        style={{
          padding: '6px 16px',
          background: isPlaying ? 'var(--aethel-error)' : 'var(--aethel-success)',
          border: 'none',
          borderRadius: '4px',
          color: 'var(--aethel-text-primary)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
        }}
      >
        {isPlaying ? 'Stop' : 'Run'}
      </button>

      <div style={{ width: '1px', height: '20px', background: 'var(--aethel-border-primary)' }} />

      {/* Save & Build */}
      <button type="button" aria-label="Save level"
        onClick={onSave}
        style={{
          padding: '6px 12px',
          background: 'var(--aethel-surface-quaternary)',
          border: '1px solid var(--aethel-border-secondary)',
          borderRadius: '4px',
          color: 'var(--aethel-text-primary)',
          cursor: 'pointer',
          fontSize: '12px',
        }}
      >
        Save
      </button>

      <button type="button" aria-label="Build level"
        onClick={onBuild}
        style={{
          padding: '6px 12px',
          background: 'var(--aethel-primary)',
          border: 'none',
          borderRadius: '4px',
          color: 'var(--aethel-text-primary)',
          cursor: 'pointer',
          fontSize: '12px',
        }}
      >
        Build
      </button>
    </div>
  );
}

// ============================================================================
// WORLD OUTLINER MINI
// ============================================================================

interface OutlinerMiniProps {
  objects: LevelObject[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export function OutlinerMini({ objects, selectedId, onSelect, onToggleVisibility, onToggleLock, onDelete, onDuplicate }: OutlinerMiniProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'mesh': return 'M';
      case 'light': return 'L';
      case 'camera': return 'C';
      case 'empty': return 'E';
      case 'blueprint': return 'B';
      case 'volume': return 'V';
      case 'spline': return 'S';
      case 'audio': return 'A';
      default: return '?';
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--aethel-border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '12px', letterSpacing: '0.01em' }}>World Outliner</div>
          <div style={{ marginTop: '2px', fontSize: '10px', color: 'var(--aethel-text-quaternary)' }}>Scene hierarchy</div>
        </div>
        <span style={{ border: '1px solid var(--aethel-border-secondary)', borderRadius: '999px', padding: '3px 7px', color: 'var(--aethel-text-tertiary)', fontSize: '10px', whiteSpace: 'nowrap' }}>
          {objects.length} objects
        </span>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '4px' }}>
        {objects.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', color: 'var(--aethel-text-tertiary)', textAlign: 'center' }}>
            <div style={{ maxWidth: '220px' }}>
              <div style={{ color: 'var(--aethel-text-primary)', fontSize: '12px', fontWeight: 700 }}>No objects yet</div>
              <div style={{ marginTop: '6px', fontSize: '11px', lineHeight: 1.5 }}>Drop assets or create a primitive to begin the scene hierarchy.</div>
            </div>
          </div>
        ) : objects.map((obj) => (
          <div
            key={obj.id}
            onClick={() => onSelect(obj.id)}
            onContextMenu={(e) => {
              e.preventDefault();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 8px',
              background: selectedId === obj.id ? 'var(--aethel-surface-quaternary)' : 'transparent',
              borderRadius: '4px',
              cursor: 'pointer',
              opacity: obj.visible ? 1 : 0.5,
            }}
          >
            <span
              title={obj.type}
              aria-hidden="true"
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '5px',
                border: '1px solid var(--aethel-border-secondary)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--aethel-text-tertiary)',
                fontSize: '10px',
                fontWeight: 700,
                flex: '0 0 auto',
              }}
            >
              {getIcon(obj.type)}
            </span>
            <span style={{ flex: 1, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {obj.name}
            </span>
            <button type="button" aria-label={obj.visible ? `Hide ${obj.name}` : `Show ${obj.name}`}
              title={obj.visible ? 'Hide object' : 'Show object'}
              onClick={(e) => { e.stopPropagation(); onToggleVisibility(obj.id); }}
              style={{ minWidth: '30px', background: 'var(--aethel-surface-tertiary)', border: '1px solid var(--aethel-border-subtle)', borderRadius: '999px', cursor: 'pointer', padding: '2px 6px', color: 'var(--aethel-text-tertiary)', fontSize: '10px' }}
            >
              {obj.visible ? 'On' : 'Off'}
            </button>
            <button type="button" aria-label={obj.locked ? `Unlock ${obj.name}` : `Lock ${obj.name}`}
              title={obj.locked ? 'Unlock object' : 'Lock object'}
              onClick={(e) => { e.stopPropagation(); onToggleLock(obj.id); }}
              style={{ minWidth: '42px', background: obj.locked ? 'var(--aethel-surface-quaternary)' : 'transparent', border: '1px solid var(--aethel-border-subtle)', borderRadius: '999px', cursor: 'pointer', padding: '2px 6px', color: 'var(--aethel-text-tertiary)', fontSize: '10px' }}
            >
              {obj.locked ? 'Locked' : 'Edit'}
            </button>
          </div>
        ))}
      </div>

      <div style={{ padding: '8px', borderTop: '1px solid var(--aethel-border-primary)', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {['Cube', 'Sphere', 'Light', 'Camera', 'Empty'].map((type) => (
          <button type="button" aria-label={`Add ${type} object to level`}
            key={type}
            style={{
              padding: '4px 8px',
              background: 'var(--aethel-surface-quaternary)',
              border: '1px solid var(--aethel-border-primary)',
              borderRadius: '3px',
              color: 'var(--aethel-text-primary)',
              cursor: 'pointer',
              fontSize: '10px',
            }}
          >
            + {type}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// DETAILS PANEL MINI
// ============================================================================

interface DetailsPanelMiniProps {
  object: LevelObject | null;
  onChange: (id: string, changes: Partial<LevelObject>) => void;
}

export function DetailsPanelMini({ object, onChange }: DetailsPanelMiniProps) {
  if (!object) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--aethel-border-primary)' }}>
          <div style={{ fontWeight: 700, fontSize: '12px', letterSpacing: '0.01em' }}>Inspector</div>
          <div style={{ marginTop: '2px', color: 'var(--aethel-text-quaternary)', fontSize: '10px' }}>Context-aware properties</div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px', color: 'var(--aethel-text-muted)' }}>
          <div style={{ maxWidth: '260px', border: '1px solid var(--aethel-border-subtle)', borderRadius: '12px', background: 'var(--aethel-surface-tertiary)', padding: '16px', textAlign: 'left' }}>
            <div style={{ color: 'var(--aethel-text-quaternary)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>No selection</div>
            <div style={{ marginTop: '8px', color: 'var(--aethel-text-primary)', fontSize: '13px', fontWeight: 700 }}>Select an object in the viewport or outliner.</div>
            <div style={{ marginTop: '6px', color: 'var(--aethel-text-tertiary)', fontSize: '11px', lineHeight: 1.5 }}>
              Transform, components, and asset quality appear here only when there is real context.
            </div>
            <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {['Click object', 'Use outliner', 'W/E/R transform'].map((hint) => (
                <span key={hint} style={{ border: '1px solid var(--aethel-border-secondary)', borderRadius: '999px', padding: '3px 7px', color: 'var(--aethel-text-tertiary)', fontSize: '10px' }}>
                  {hint}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--aethel-border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '12px', letterSpacing: '0.01em' }}>Inspector</div>
          <div style={{ marginTop: '2px', color: 'var(--aethel-text-quaternary)', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{object.name}</div>
        </div>
        <span style={{ border: '1px solid var(--aethel-border-secondary)', borderRadius: '999px', padding: '3px 7px', color: 'var(--aethel-text-tertiary)', fontSize: '10px', textTransform: 'capitalize' }}>
          {object.type}
        </span>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
        {/* Name */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--aethel-text-quaternary)', marginBottom: '4px' }}>Name</label>
          <input
            type="text"
            value={object.name}
            onChange={(e) => onChange(object.id, { name: e.target.value })}
            style={{
              width: '100%',
              background: 'var(--aethel-surface-quaternary)',
              border: '1px solid var(--aethel-border-primary)',
              borderRadius: '4px',
              color: 'var(--aethel-text-primary)',
              padding: '6px 10px',
              fontSize: '12px',
            }}
          />
        </div>

        {/* Transform */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>Transform</div>

          {/* Position */}
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--aethel-text-quaternary)', marginBottom: '4px' }}>Position</label>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
            {['X', 'Y', 'Z'].map((axis, i) => (
              <div key={axis} style={{ flex: 1 }}>
                <div style={{ fontSize: '10px', color: ['var(--aethel-error)', 'var(--aethel-success)', 'var(--aethel-primary)'][i], marginBottom: '2px' }}>{axis}</div>
                <input
                  type="number"
                  value={object.position[i]}
                  step={0.1}
                  onChange={(e) => {
                    const newPos = [...object.position] as [number, number, number];
                    newPos[i] = parseFloat(e.target.value);
                    onChange(object.id, { position: newPos });
                  }}
                  style={{
                    width: '100%',
                    background: 'var(--aethel-surface-tertiary)',
                    border: '1px solid var(--aethel-border-primary)',
                    borderRadius: '3px',
                    color: 'var(--aethel-text-primary)',
                    padding: '4px 6px',
                    fontSize: '11px',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Rotation */}
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--aethel-text-quaternary)', marginBottom: '4px' }}>Rotation</label>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
            {['X', 'Y', 'Z'].map((axis, i) => (
              <div key={axis} style={{ flex: 1 }}>
                <div style={{ fontSize: '10px', color: ['var(--aethel-error)', 'var(--aethel-success)', 'var(--aethel-primary)'][i], marginBottom: '2px' }}>{axis}</div>
                <input
                  type="number"
                  value={object.rotation[i]}
                  step={1}
                  onChange={(e) => {
                    const newRot = [...object.rotation] as [number, number, number];
                    newRot[i] = parseFloat(e.target.value);
                    onChange(object.id, { rotation: newRot });
                  }}
                  style={{
                    width: '100%',
                    background: 'var(--aethel-surface-tertiary)',
                    border: '1px solid var(--aethel-border-primary)',
                    borderRadius: '3px',
                    color: 'var(--aethel-text-primary)',
                    padding: '4px 6px',
                    fontSize: '11px',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Scale */}
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--aethel-text-quaternary)', marginBottom: '4px' }}>Scale</label>
          <div style={{ display: 'flex', gap: '4px' }}>
            {['X', 'Y', 'Z'].map((axis, i) => (
              <div key={axis} style={{ flex: 1 }}>
                <div style={{ fontSize: '10px', color: ['var(--aethel-error)', 'var(--aethel-success)', 'var(--aethel-primary)'][i], marginBottom: '2px' }}>{axis}</div>
                <input
                  type="number"
                  value={object.scale[i]}
                  step={0.1}
                  min={0.01}
                  onChange={(e) => {
                    const newScale = [...object.scale] as [number, number, number];
                    newScale[i] = parseFloat(e.target.value);
                    onChange(object.id, { scale: newScale });
                  }}
                  style={{
                    width: '100%',
                    background: 'var(--aethel-surface-tertiary)',
                    border: '1px solid var(--aethel-border-primary)',
                    borderRadius: '3px',
                    color: 'var(--aethel-text-primary)',
                    padding: '4px 6px',
                    fontSize: '11px',
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Components */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>Components</div>
          {object.components.map((comp) => (
            <div
              key={comp.id}
              style={{
                background: 'var(--aethel-surface-quaternary)',
                borderRadius: '4px',
                padding: '8px',
                marginBottom: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" checked={comp.enabled} readOnly />
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{comp.type}</span>
              </div>
            </div>
          ))}

          <button
            type="button"
            style={{
              width: '100%',
              padding: '8px',
              background: 'var(--aethel-surface-quaternary)',
              border: '1px dashed var(--aethel-border-secondary)',
              borderRadius: '4px',
              color: 'var(--aethel-text-quaternary)',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            + Add Component
          </button>
        </div>
      </div>
    </div>
  );
}
