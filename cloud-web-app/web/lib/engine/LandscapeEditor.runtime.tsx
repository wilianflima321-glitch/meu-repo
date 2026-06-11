'use client';

// @aethel-heavy-async-boundary
/**
 * Landscape/Terrain Editor - professional terrain editor
 *
 * Unreal-style system for creating and editing procedural
 * terrain with sculpting, painting, and foliage.
 *
 * Production-oriented landscape surface with Three.js runtime.
 */
import React, { useState, useCallback, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { resolveCssVarColor } from '@/lib/style/resolve-css-var';
import { LandscapeScene } from '@/lib/engine/LandscapeEditor.scene-runtime';
import type { BrushSettings, TerrainConfig, TerrainLayer } from '@/lib/engine/LandscapeEditor.types';
import { BrushPanel, LayersPanel, Toolbar } from '@/components/engine/LandscapeEditorPanels';

// ============================================================================
// TIPOS
// ============================================================================

export type {
  BrushMode,
  BrushSettings,
  FoliageType,
  SculptOperation,
  TerrainConfig,
  TerrainLayer,
} from '@/lib/engine/LandscapeEditor.types';

// ============================================================================
// TOOLBAR
// ============================================================================

export interface LandscapeEditorProps {
  onSave?: (heightmap: Float32Array, config: TerrainConfig) => void;
}

export default function LandscapeEditor({ onSave }: LandscapeEditorProps) {
  // Terrain config
  const [config, setConfig] = useState<TerrainConfig>({
    width: 200,
    height: 200,
    resolution: 129,
    maxHeight: 50,
    layers: [
      { id: '1', name: 'Grass', texture: '', tiling: 10, color: 'rgb(74 124 79)', blendWeight: 1, minSlope: 0, maxSlope: 0.3, minHeight: 0, maxHeight: 0.3 },
      { id: '2', name: 'Rock', texture: '', tiling: 5, color: 'rgb(107 107 107)', blendWeight: 1, minSlope: 0.3, maxSlope: 1, minHeight: 0.3, maxHeight: 0.7 },
      { id: '3', name: 'Snow', texture: '', tiling: 8, color: 'rgb(232 232 232)', blendWeight: 1, minSlope: 0, maxSlope: 0.5, minHeight: 0.7, maxHeight: 1 },
    ],
    foliage: [],
  });

  // Heightmap
  const [heightmap, setHeightmap] = useState<Float32Array>(() => {
    const data = new Float32Array(config.resolution * config.resolution);
    // Initialize with gentle hills
    for (let z = 0; z < config.resolution; z++) {
      for (let x = 0; x < config.resolution; x++) {
        const nx = x / config.resolution;
        const nz = z / config.resolution;
        data[z * config.resolution + x] =
          0.3 +
          Math.sin(nx * Math.PI * 2) * 0.1 +
          Math.cos(nz * Math.PI * 3) * 0.1;
      }
    }
    return data;
  });

  // Brush settings
  const [brushSettings, setBrushSettings] = useState<BrushSettings>({
    size: 10,
    strength: 0.5,
    falloff: 1.5,
    mode: 'sculpt',
    operation: 'raise',
  });

  const [brushActive, setBrushActive] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState<string | null>('1');
  const [activePanel, setActivePanel] = useState<'brush' | 'layers'>('brush');
  const canvasBackground = useMemo(() => resolveCssVarColor('--aethel-info-light', 'rgb(135, 206, 235)'), []);

  // Generate terrain
  const handleGenerateTerrain = useCallback((type: string) => {
    const newHeightmap = new Float32Array(config.resolution * config.resolution);

    for (let z = 0; z < config.resolution; z++) {
      for (let x = 0; x < config.resolution; x++) {
        const nx = x / config.resolution - 0.5;
        const nz = z / config.resolution - 0.5;
        const dist = Math.sqrt(nx * nx + nz * nz);

        let height = 0;

        switch (type) {
          case 'flat':
            height = 0.3;
            break;
          case 'hills':
            height = 0.3 +
              Math.sin(x * 0.1) * Math.cos(z * 0.1) * 0.2 +
              Math.sin(x * 0.05 + 1) * Math.cos(z * 0.07 + 2) * 0.15;
            break;
          case 'mountains':
            height = Math.pow(Math.sin(x * 0.05) * Math.cos(z * 0.05) * 0.5 + 0.5, 2) * 0.8 +
              Math.random() * 0.05;
            break;
          case 'valley':
            height = 0.8 - Math.pow(Math.abs(nx) * 2, 0.5) * 0.6;
            break;
          case 'island':
            height = Math.max(0, 0.6 - dist * 1.5) +
              Math.sin(x * 0.1) * Math.cos(z * 0.1) * 0.1;
            break;
          case 'canyon':
            const canyonDist = Math.abs(nx);
            height = canyonDist < 0.1 ? 0.1 : 0.5 + Math.sin(z * 0.1) * 0.1;
            break;
        }

        newHeightmap[z * config.resolution + x] = Math.max(0, Math.min(1, height));
      }
    }

    setHeightmap(newHeightmap);
  }, [config.resolution]);

  // Export
  const handleExport = useCallback(() => {
    const data = {
      config,
      heightmap: Array.from(heightmap),
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'terrain.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [config, heightmap]);

  // Import
  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        const data = JSON.parse(text);
        setConfig(data.config);
        setHeightmap(new Float32Array(data.heightmap));
      }
    };
    input.click();
  }, []);

  // Layer management
  const handleAddLayer = useCallback(() => {
    const newLayer: TerrainLayer = {
      id: Date.now().toString(),
      name: `Layer ${config.layers.length + 1}`,
      texture: '',
      tiling: 10,
      color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
      blendWeight: 1,
      minSlope: 0,
      maxSlope: 1,
      minHeight: 0,
      maxHeight: 1,
    };
    setConfig({ ...config, layers: [...config.layers, newLayer] });
  }, [config]);

  const handleUpdateLayer = useCallback((id: string, updates: Partial<TerrainLayer>) => {
    setConfig({
      ...config,
      layers: config.layers.map(l => l.id === id ? { ...l, ...updates } : l),
    });
  }, [config]);

  const handleRemoveLayer = useCallback((id: string) => {
    setConfig({
      ...config,
      layers: config.layers.filter(l => l.id !== id),
    });
    if (selectedLayer === id) {
      setSelectedLayer(config.layers[0]?.id || null);
    }
  }, [config, selectedLayer]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--aethel-surface-primary)',
    }}>
      {/* Toolbar */}
      <Toolbar
        brushSettings={brushSettings}
        onBrushSettingsChange={setBrushSettings}
        brushActive={brushActive}
        onBrushActiveChange={setBrushActive}
        onGenerateTerrain={handleGenerateTerrain}
        onExport={handleExport}
        onImport={handleImport}
      />

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* 3D Viewport */}
        <div style={{ flex: 1 }}>
          <Canvas
            shadows
            camera={{ position: [100, 80, 100], fov: 50 }}
            style={{ background: canvasBackground }}
          >
            <LandscapeScene
              heightmap={heightmap}
              config={config}
              brushSettings={brushSettings}
              brushActive={brushActive}
              onHeightmapChange={setHeightmap}
            />
          </Canvas>
        </div>

        {/* Side Panel */}
        <div style={{
          width: '280px',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid var(--aethel-border-primary)',
        }}>
          {/* Panel Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--aethel-border-primary)',
          }}>
            {(['brush', 'layers'] as const).map((panel) => (
              <button type="button" aria-label={`Open terrain ${panel} panel`}
                key={panel}
                onClick={() => setActivePanel(panel)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: activePanel === panel ? 'var(--aethel-surface-tertiary)' : 'var(--aethel-surface-primary)',
                  border: 'none',
                  borderBottom: activePanel === panel ? '2px solid var(--aethel-primary)' : '2px solid transparent',
                  color: activePanel === panel ? 'var(--aethel-text-primary)' : 'var(--aethel-text-quaternary)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  textTransform: 'capitalize',
                }}
              >
                {panel === 'brush' ? '🖌️' : '🎨'} {panel}
              </button>
            ))}
          </div>

          {/* Panel Content */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {activePanel === 'brush' ? (
              <BrushPanel
                brushSettings={brushSettings}
                onBrushSettingsChange={setBrushSettings}
              />
            ) : (
              <LayersPanel
                layers={config.layers}
                selectedLayer={selectedLayer}
                onSelectLayer={setSelectedLayer}
                onUpdateLayer={handleUpdateLayer}
                onAddLayer={handleAddLayer}
                onRemoveLayer={handleRemoveLayer}
              />
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div style={{
        padding: '6px 12px',
        background: 'var(--aethel-surface-tertiary)',
        borderTop: '1px solid var(--aethel-border-primary)',
        fontSize: '11px',
        color: 'var(--aethel-text-muted)',
        display: 'flex',
        gap: '24px',
      }}>
        <span>Resolution: {config.resolution}x{config.resolution}</span>
        <span>Size: {config.width}m x {config.height}m</span>
        <span>Max Height: {config.maxHeight}m</span>
        <span>Layers: {config.layers.length}</span>
        <span>Mode: {brushSettings.mode}</span>
      </div>
    </div>
  );
}
