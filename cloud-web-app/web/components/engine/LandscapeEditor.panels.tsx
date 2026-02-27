'use client';

import React from 'react';
import type { BrushMode, BrushSettings, SculptOperation, TerrainLayer } from './LandscapeEditor.types';
import type { TerrainPreset } from './LandscapeEditor.initial-data';

// ============================================================================
// TOOLBAR
// ============================================================================

interface ToolbarProps {
  brushSettings: BrushSettings;
  onBrushSettingsChange: (settings: BrushSettings) => void;
  brushActive: boolean;
  onBrushActiveChange: (active: boolean) => void;
  onGenerateTerrain: (type: TerrainPreset) => void;
  onExport: () => void;
  onImport: () => void;
}

export function Toolbar({
  brushSettings,
  onBrushSettingsChange,
  brushActive,
  onBrushActiveChange,
  onGenerateTerrain,
  onExport,
  onImport,
}: ToolbarProps) {
  const modes: { mode: BrushMode; icon: string; label: string }[] = [
    { mode: 'sculpt', icon: 'SC', label: 'Sculpt' },
    { mode: 'smooth', icon: 'SM', label: 'Smooth' },
    { mode: 'flatten', icon: 'FL', label: 'Flatten' },
    { mode: 'paint', icon: 'PT', label: 'Paint' },
    { mode: 'foliage', icon: 'FG', label: 'Foliage' },
    { mode: 'erosion', icon: 'ER', label: 'Erosion' },
  ];
  
  const operations: { op: SculptOperation; icon: string; label: string }[] = [
    { op: 'raise', icon: 'UP', label: 'Raise' },
    { op: 'lower', icon: 'DN', label: 'Lower' },
    { op: 'level', icon: 'LV', label: 'Level' },
    { op: 'noise', icon: 'NS', label: 'Noise' },
  ];
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '8px 12px',
      background: '#1a1a2e',
      borderBottom: '1px solid #333',
    }}>
      {/* Brush Active Toggle */}
      <button
        onClick={() => onBrushActiveChange(!brushActive)}
        style={{
          padding: '8px 16px',
          background: brushActive ? '#4caf50' : '#333',
          border: 'none',
          borderRadius: '4px',
          color: '#fff',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '13px',
        }}
      >
        {brushActive ? 'Brush On' : 'Navigate'}
      </button>
      
      <div style={{ width: '1px', height: '24px', background: '#333' }} />
      
      {/* Mode Buttons */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {modes.map(({ mode, icon, label }) => (
          <button
            key={mode}
            onClick={() => onBrushSettingsChange({ ...brushSettings, mode })}
            style={{
              padding: '6px 12px',
              background: brushSettings.mode === mode ? '#3f51b5' : '#0f0f23',
              border: '1px solid #333',
              borderRadius: '4px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '12px',
            }}
            title={label}
          >
            {icon} {label}
          </button>
        ))}
      </div>
      
      {/* Sculpt Operations (only show when in sculpt mode) */}
      {brushSettings.mode === 'sculpt' && (
        <>
          <div style={{ width: '1px', height: '24px', background: '#333' }} />
          <div style={{ display: 'flex', gap: '4px' }}>
            {operations.map(({ op, icon, label }) => (
              <button
                key={op}
                onClick={() => onBrushSettingsChange({ ...brushSettings, operation: op })}
                style={{
                  padding: '6px 10px',
                  background: brushSettings.operation === op ? '#ff9800' : '#0f0f23',
                  border: '1px solid #333',
                  borderRadius: '4px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '11px',
                }}
                title={label}
              >
                {icon}
              </button>
            ))}
          </div>
        </>
      )}
      
      <div style={{ flex: 1 }} />
      
      {/* Generate Menu */}
      <div style={{ position: 'relative' }}>
        <button
          style={{
            padding: '6px 12px',
            background: '#0f0f23',
            border: '1px solid #333',
            borderRadius: '4px',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '12px',
          }}
          onClick={() => {
            const menu = document.getElementById('generate-menu');
            if (menu) menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
          }}
        >
          Generate
        </button>
        <div
          id="generate-menu"
          style={{
            display: 'none',
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '4px',
            background: '#1a1a2e',
            border: '1px solid #333',
            borderRadius: '4px',
            padding: '4px',
            minWidth: '150px',
            zIndex: 100,
          }}
        >
          {(['flat', 'hills', 'mountains', 'valley', 'island', 'canyon'] as TerrainPreset[]).map((type) => (
            <button
              key={type}
              onClick={() => {
                onGenerateTerrain(type);
                const menu = document.getElementById('generate-menu');
                if (menu) menu.style.display = 'none';
              }}
              style={{
                display: 'block',
                width: '100%',
                padding: '6px 12px',
                background: 'none',
                border: 'none',
                color: '#ccc',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '12px',
                textTransform: 'capitalize',
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#333'}
              onMouseOut={(e) => e.currentTarget.style.background = 'none'}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
      
      {/* Import/Export */}
      <button
        onClick={onImport}
        style={{
          padding: '6px 12px',
          background: '#0f0f23',
          border: '1px solid #333',
          borderRadius: '4px',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '12px',
        }}
      >
          Import
        </button>
      <button
        onClick={onExport}
        style={{
          padding: '6px 12px',
          background: '#0f0f23',
          border: '1px solid #333',
          borderRadius: '4px',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '12px',
        }}
      >
          Export
        </button>
    </div>
  );
}

// ============================================================================
// BRUSH SETTINGS PANEL
// ============================================================================

interface BrushPanelProps {
  brushSettings: BrushSettings;
  onBrushSettingsChange: (settings: BrushSettings) => void;
}

export function BrushPanel({ brushSettings, onBrushSettingsChange }: BrushPanelProps) {
  return (
    <div style={{
      width: '280px',
      background: '#0f0f23',
      borderLeft: '1px solid #333',
      overflow: 'auto',
    }}>
      <div style={{
        padding: '12px',
        borderBottom: '1px solid #333',
        fontWeight: 'bold',
        fontSize: '13px',
        color: '#fff',
      }}>
        Brush Settings
      </div>
      
      <div style={{ padding: '12px' }}>
        {/* Size */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '4px' }}>
            Size: {brushSettings.size.toFixed(1)}
          </label>
          <input
            type="range"
            min="1"
            max="50"
            step="0.5"
            value={brushSettings.size}
            onChange={(e) => onBrushSettingsChange({ ...brushSettings, size: parseFloat(e.target.value) })}
            style={{ width: '100%' }}
          />
        </div>
        
        {/* Strength */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '4px' }}>
            Strength: {brushSettings.strength.toFixed(2)}
          </label>
          <input
            type="range"
            min="0.01"
            max="1"
            step="0.01"
            value={brushSettings.strength}
            onChange={(e) => onBrushSettingsChange({ ...brushSettings, strength: parseFloat(e.target.value) })}
            style={{ width: '100%' }}
          />
        </div>
        
        {/* Falloff */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '4px' }}>
            Falloff: {brushSettings.falloff.toFixed(1)}
          </label>
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={brushSettings.falloff}
            onChange={(e) => onBrushSettingsChange({ ...brushSettings, falloff: parseFloat(e.target.value) })}
            style={{ width: '100%' }}
          />
        </div>
        
        {/* Target Height (for level operation) */}
        {brushSettings.mode === 'sculpt' && brushSettings.operation === 'level' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '4px' }}>
              Target Height: {(brushSettings.targetHeight ?? 0.5).toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={brushSettings.targetHeight ?? 0.5}
              onChange={(e) => onBrushSettingsChange({ ...brushSettings, targetHeight: parseFloat(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>
        )}
      </div>
      
      {/* Brush Presets */}
      <div style={{
        padding: '12px',
        borderTop: '1px solid #333',
      }}>
        <div style={{
          fontSize: '12px',
          color: '#888',
          marginBottom: '8px',
        }}>
          Presets
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
          {[
            { name: 'Soft', size: 15, strength: 0.3, falloff: 2 },
            { name: 'Medium', size: 10, strength: 0.5, falloff: 1.5 },
            { name: 'Hard', size: 5, strength: 0.8, falloff: 0.5 },
            { name: 'Large', size: 30, strength: 0.2, falloff: 3 },
          ].map((preset) => (
            <button
              key={preset.name}
              onClick={() => onBrushSettingsChange({
                ...brushSettings,
                size: preset.size,
                strength: preset.strength,
                falloff: preset.falloff,
              })}
              style={{
                padding: '6px',
                background: '#1a1a2e',
                border: '1px solid #333',
                borderRadius: '4px',
                color: '#ccc',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// LAYERS PANEL
// ============================================================================

interface LayersPanelProps {
  layers: TerrainLayer[];
  selectedLayer: string | null;
  onSelectLayer: (id: string) => void;
  onUpdateLayer: (id: string, updates: Partial<TerrainLayer>) => void;
  onAddLayer: () => void;
  onRemoveLayer: (id: string) => void;
}

export function LayersPanel({
  layers,
  selectedLayer,
  onSelectLayer,
  onUpdateLayer,
  onAddLayer,
  onRemoveLayer,
}: LayersPanelProps) {
  return (
    <div style={{
      width: '280px',
      background: '#0f0f23',
      borderLeft: '1px solid #333',
      overflow: 'auto',
    }}>
      <div style={{
        padding: '12px',
        borderBottom: '1px solid #333',
        fontWeight: 'bold',
        fontSize: '13px',
        color: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        Terrain Layers
        <button
          onClick={onAddLayer}
          style={{
            padding: '4px 8px',
            background: '#3f51b5',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          + Add
        </button>
      </div>
      
      <div style={{ padding: '8px' }}>
        {layers.map((layer, index) => (
          <div
            key={layer.id}
            onClick={() => onSelectLayer(layer.id)}
            style={{
              padding: '8px',
              marginBottom: '4px',
              background: selectedLayer === layer.id ? '#3f51b533' : '#1a1a2e',
              border: `1px solid ${selectedLayer === layer.id ? '#3f51b5' : '#333'}`,
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '24px',
                height: '24px',
                background: layer.color,
                borderRadius: '4px',
                border: '1px solid #555',
              }} />
              <span style={{ flex: 1, color: '#fff', fontSize: '13px' }}>{layer.name}</span>
              <span style={{ color: '#666', fontSize: '11px' }}>#{index}</span>
              {layers.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); onRemoveLayer(layer.id); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#e74c3c',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  x
                </button>
              )}
            </div>
            
            {selectedLayer === layer.id && (
              <div style={{ marginTop: '12px' }}>
                {/* Color */}
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#888', width: '60px' }}>Color:</span>
                    <input
                      type="color"
                      value={layer.color}
                      onChange={(e) => onUpdateLayer(layer.id, { color: e.target.value })}
                      style={{ width: '40px', height: '24px', border: 'none', cursor: 'pointer' }}
                    />
                  </label>
                </div>
                
                {/* Tiling */}
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#888', width: '60px' }}>Tiling:</span>
                    <input
                      type="number"
                      value={layer.tiling}
                      onChange={(e) => onUpdateLayer(layer.id, { tiling: parseFloat(e.target.value) })}
                      style={{
                        flex: 1,
                        padding: '4px',
                        background: '#0f0f23',
                        border: '1px solid #333',
                        borderRadius: '3px',
                        color: '#fff',
                        fontSize: '11px',
                      }}
                    />
                  </label>
                </div>
                
                {/* Height Range */}
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#888' }}>Height Range:</span>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <input
                      type="number"
                      value={layer.minHeight}
                      onChange={(e) => onUpdateLayer(layer.id, { minHeight: parseFloat(e.target.value) })}
                      placeholder="Min"
                      style={{
                        flex: 1,
                        padding: '4px',
                        background: '#0f0f23',
                        border: '1px solid #333',
                        borderRadius: '3px',
                        color: '#fff',
                        fontSize: '11px',
                      }}
                    />
                    <input
                      type="number"
                      value={layer.maxHeight}
                      onChange={(e) => onUpdateLayer(layer.id, { maxHeight: parseFloat(e.target.value) })}
                      placeholder="Max"
                      style={{
                        flex: 1,
                        padding: '4px',
                        background: '#0f0f23',
                        border: '1px solid #333',
                        borderRadius: '3px',
                        color: '#fff',
                        fontSize: '11px',
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
