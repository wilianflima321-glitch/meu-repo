/**
 * Level Editor panel surfaces
 */

'use client';

import React from 'react';
import type {
  LevelObject,
  SnapMode,
  TransformMode,
  ViewportMode,
} from './LevelEditor';

export interface ToolbarProps {
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
  return (
    <div style={{
      height: '40px',
      background: '#252525',
      borderBottom: '1px solid #333',
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
      gap: '8px',
    }}>
      {/* Transform Mode */}
      <div style={{ display: 'flex', gap: '2px', marginRight: '8px' }}>
        {(['translate', 'rotate', 'scale'] as TransformMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => onTransformModeChange(mode)}
            title={mode.charAt(0).toUpperCase() + mode.slice(1) + ' (W/E/R)'}
            style={{
              width: '32px',
              height: '28px',
              background: transformMode === mode ? '#3498db' : '#333',
              border: 'none',
              borderRadius: '3px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {mode === 'translate' ? '↔' : mode === 'rotate' ? '⟳' : '⤢'}
          </button>
        ))}
      </div>
      
      <div style={{ width: '1px', height: '20px', background: '#444' }} />
      
      {/* Snap Mode */}
      <select
        value={snapMode}
        onChange={(e) => onSnapModeChange(e.target.value as SnapMode)}
        style={{
          background: '#333',
          border: '1px solid #444',
          borderRadius: '3px',
          color: '#fff',
          padding: '4px 8px',
          fontSize: '11px',
        }}
      >
        <option value="none">No Snap</option>
        <option value="grid">Grid Snap</option>
        <option value="vertex">Vertex Snap</option>
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
            background: '#333',
            border: '1px solid #444',
            borderRadius: '3px',
            color: '#fff',
            padding: '4px 8px',
            fontSize: '11px',
          }}
        />
      )}
      
      <div style={{ width: '1px', height: '20px', background: '#444' }} />
      
      {/* View Mode */}
      <select
        value={viewMode}
        onChange={(e) => onViewModeChange(e.target.value as ViewportMode)}
        style={{
          background: '#333',
          border: '1px solid #444',
          borderRadius: '3px',
          color: '#fff',
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
      <button
        onClick={onPlayPause}
        style={{
          padding: '6px 16px',
          background: isPlaying ? '#e74c3c' : '#2ecc71',
          border: 'none',
          borderRadius: '4px',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
        }}
      >
        {isPlaying ? '⏹ Stop' : '▶ Play'}
      </button>
      
      <div style={{ width: '1px', height: '20px', background: '#444' }} />
      
      {/* Save & Build */}
      <button
        onClick={onSave}
        style={{
          padding: '6px 12px',
          background: '#333',
          border: '1px solid #555',
          borderRadius: '4px',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '12px',
        }}
      >
        💾 Save
      </button>
      
      <button
        onClick={onBuild}
        style={{
          padding: '6px 12px',
          background: '#3498db',
          border: 'none',
          borderRadius: '4px',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '12px',
        }}
      >
        🔨 Build
      </button>
    </div>
  );
}

// ============================================================================
// WORLD OUTLINER MINI
// ============================================================================

export interface OutlinerMiniProps {
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
      case 'mesh': return '🔷';
      case 'light': return '💡';
      case 'camera': return '📷';
      case 'empty': return '⭕';
      case 'blueprint': return '📜';
      case 'volume': return '📦';
      case 'spline': return '〰️';
      case 'audio': return '🔊';
      default: return '❓';
    }
  };
  
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #333', fontWeight: 'bold', fontSize: '12px' }}>
        World Outliner
      </div>
      
      <div style={{ flex: 1, overflow: 'auto', padding: '4px' }}>
        {objects.map((obj) => (
          <div
            key={obj.id}
            onClick={() => onSelect(obj.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              // Context menu would go here
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 8px',
              background: selectedId === obj.id ? '#3498db33' : 'transparent',
              borderRadius: '4px',
              cursor: 'pointer',
              opacity: obj.visible ? 1 : 0.5,
            }}
          >
            <span>{getIcon(obj.type)}</span>
            <span style={{ flex: 1, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {obj.name}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleVisibility(obj.id); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', opacity: 0.6 }}
            >
              {obj.visible ? '👁' : '👁‍🗨'}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleLock(obj.id); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', opacity: 0.6 }}
            >
              {obj.locked ? '🔒' : '🔓'}
            </button>
          </div>
        ))}
      </div>
      
      {/* Add object buttons */}
      <div style={{ padding: '8px', borderTop: '1px solid #333', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {['Cube', 'Sphere', 'Light', 'Camera', 'Empty'].map((type) => (
          <button
            key={type}
            style={{
              padding: '4px 8px',
              background: '#333',
              border: '1px solid #444',
              borderRadius: '3px',
              color: '#fff',
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

export interface DetailsPanelMiniProps {
  object: LevelObject | null;
  onChange: (id: string, changes: Partial<LevelObject>) => void;
}

export function DetailsPanelMini({ object, onChange }: DetailsPanelMiniProps) {
  if (!object) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #333', fontWeight: 'bold', fontSize: '12px' }}>
          Details
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
          Select an object
        </div>
      </div>
    );
  }
  
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #333', fontWeight: 'bold', fontSize: '12px' }}>
        Details - {object.name}
      </div>
      
      <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
        {/* Name */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px' }}>Name</label>
          <input
            type="text"
            value={object.name}
            onChange={(e) => onChange(object.id, { name: e.target.value })}
            style={{
              width: '100%',
              background: '#333',
              border: '1px solid #444',
              borderRadius: '4px',
              color: '#fff',
              padding: '6px 10px',
              fontSize: '12px',
            }}
          />
        </div>
        
        {/* Transform */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>Transform</div>
          
          {/* Position */}
          <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px' }}>Position</label>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
            {['X', 'Y', 'Z'].map((axis, i) => (
              <div key={axis} style={{ flex: 1 }}>
                <div style={{ fontSize: '10px', color: ['#e74c3c', '#2ecc71', '#3498db'][i], marginBottom: '2px' }}>{axis}</div>
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
                    background: '#252525',
                    border: '1px solid #444',
                    borderRadius: '3px',
                    color: '#fff',
                    padding: '4px 6px',
                    fontSize: '11px',
                  }}
                />
              </div>
            ))}
          </div>
          
          {/* Rotation */}
          <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px' }}>Rotation</label>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
            {['X', 'Y', 'Z'].map((axis, i) => (
              <div key={axis} style={{ flex: 1 }}>
                <div style={{ fontSize: '10px', color: ['#e74c3c', '#2ecc71', '#3498db'][i], marginBottom: '2px' }}>{axis}</div>
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
                    background: '#252525',
                    border: '1px solid #444',
                    borderRadius: '3px',
                    color: '#fff',
                    padding: '4px 6px',
                    fontSize: '11px',
                  }}
                />
              </div>
            ))}
          </div>
          
          {/* Scale */}
          <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px' }}>Scale</label>
          <div style={{ display: 'flex', gap: '4px' }}>
            {['X', 'Y', 'Z'].map((axis, i) => (
              <div key={axis} style={{ flex: 1 }}>
                <div style={{ fontSize: '10px', color: ['#e74c3c', '#2ecc71', '#3498db'][i], marginBottom: '2px' }}>{axis}</div>
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
                    background: '#252525',
                    border: '1px solid #444',
                    borderRadius: '3px',
                    color: '#fff',
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
                background: '#333',
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
            style={{
              width: '100%',
              padding: '8px',
              background: '#333',
              border: '1px dashed #555',
              borderRadius: '4px',
              color: '#888',
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
