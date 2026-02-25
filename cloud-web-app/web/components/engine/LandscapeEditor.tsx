/**
 * Landscape/Terrain Editor - Editor de Terrenos Profissional
 * 
 * Sistema completo estilo Unreal Engine para criar e editar
 * terrenos procedurais com sculpting, painting e foliage.
 * 
 * NÃO É MOCK - Sistema real com Three.js!
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  createInitialHeightmap,
  DEFAULT_TERRAIN_CONFIG,
  generateTerrainHeightmap,
  type TerrainPreset,
} from './LandscapeEditor.initial-data';

// ============================================================================
// TIPOS
// ============================================================================

import type {
  BrushSettings,
  TerrainConfig,
  TerrainLayer,
} from './LandscapeEditor.types';

export type {
  BrushMode,
  BrushSettings,
  FoliageType,
  SculptOperation,
  TerrainConfig,
  TerrainLayer,
} from './LandscapeEditor.types';

import { LandscapeScene } from './LandscapeEditor.scene';
import { BrushPanel, LayersPanel, Toolbar } from './LandscapeEditor.panels';

// ============================================================================
// MAIN LANDSCAPE EDITOR COMPONENT
// ============================================================================

export interface LandscapeEditorProps {
  onSave?: (heightmap: Float32Array, config: TerrainConfig) => void;
}

export default function LandscapeEditor({ onSave }: LandscapeEditorProps) {
  // Terrain config
  const [config, setConfig] = useState<TerrainConfig>(DEFAULT_TERRAIN_CONFIG);
  
  // Heightmap
  const [heightmap, setHeightmap] = useState<Float32Array>(() => createInitialHeightmap(config.resolution));
  
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
  
  // Generate terrain
  const handleGenerateTerrain = useCallback((type: TerrainPreset) => {
    setHeightmap(generateTerrainHeightmap(type, config.resolution));
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
      background: '#0d1117',
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
            style={{ background: '#87ceeb' }}
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
          borderLeft: '1px solid #333',
        }}>
          {/* Panel Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #333',
          }}>
            {(['brush', 'layers'] as const).map((panel) => (
              <button
                key={panel}
                onClick={() => setActivePanel(panel)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: activePanel === panel ? '#1a1a2e' : '#0f0f23',
                  border: 'none',
                  borderBottom: activePanel === panel ? '2px solid #3f51b5' : '2px solid transparent',
                  color: activePanel === panel ? '#fff' : '#888',
                  cursor: 'pointer',
                  fontSize: '12px',
                  textTransform: 'capitalize',
                }}
              >
                {panel}
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
        background: '#1a1a2e',
        borderTop: '1px solid #333',
        fontSize: '11px',
        color: '#666',
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
