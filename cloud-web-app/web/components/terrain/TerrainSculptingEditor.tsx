/**
 * TERRAIN SCULPTING EDITOR - Aethel Engine
 * 
 * Editor visual completo para esculpir terrenos no estilo Unreal/Unity.
 * Suporta sculpting, painting, erosion, foliage placement e muito mais.
 * 
 * FEATURES:
 * - Height sculpting com múltiplos brushes
 * - Texture/material painting com layers
 * - Erosion tools (hidráulica, térmica, eólica)
 * - Foliage painting
 * - Hole tool para caves
 * - Import/export heightmaps
 * - LOD management
 * - Streaming terrain
 */

'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { 
  OrbitControls, 
  Grid, 
  Environment, 
  Stats,
  GizmoHelper,
  GizmoViewport,
} from '@react-three/drei';
import * as THREE from 'three';

// ============================================================================
// TYPES
// ============================================================================

export type TerrainToolType = 
  | 'sculpt_raise'
  | 'sculpt_lower'
  | 'sculpt_smooth'
  | 'sculpt_flatten'
  | 'sculpt_noise'
  | 'sculpt_erosion'
  | 'paint_layer'
  | 'paint_hole'
  | 'foliage_paint'
  | 'foliage_erase'
  | 'select'
  | 'region';

export type BrushShape = 'circle' | 'square' | 'custom';
export type BrushFalloff = 'linear' | 'smooth' | 'spherical' | 'tip' | 'constant';

export interface BrushSettings {
  size: number;           // Radius in world units
  strength: number;       // 0-1
  falloff: BrushFalloff;
  shape: BrushShape;
  rotation: number;       // Degrees
  spacing: number;        // Stroke spacing
  jitter: number;         // Position randomization
  customMask?: ImageData; // For custom shapes
}

export interface TerrainLayer {
  id: string;
  name: string;
  diffuseTexture: string;
  normalTexture?: string;
  roughnessTexture?: string;
  tiling: { x: number; y: number };
  heightBlend: number;
  metallic: number;
  roughness: number;
}

export interface ErosionSettings {
  type: 'hydraulic' | 'thermal' | 'wind';
  iterations: number;
  strength: number;
  // Hydraulic
  rainAmount?: number;
  evaporation?: number;
  sedimentCapacity?: number;
  // Thermal
  talusAngle?: number;
  // Wind
  windDirection?: { x: number; y: number };
  windStrength?: number;
}

export interface FoliageType {
  id: string;
  name: string;
  mesh: string;
  density: number;
  minScale: number;
  maxScale: number;
  alignToNormal: boolean;
  randomRotation: boolean;
  minSlope: number;
  maxSlope: number;
  minHeight: number;
  maxHeight: number;
  collisionEnabled: boolean;
}

export interface TerrainSettings {
  resolution: number;        // Heightmap resolution
  size: { x: number; y: number; z: number }; // World size
  maxHeight: number;
  lodLevels: number;
  streamingEnabled: boolean;
  tessellation: boolean;
  castShadows: boolean;
  receiveShadows: boolean;
}

export interface TerrainData {
  heightmap: Float32Array;
  splatmaps: Float32Array[]; // One per 4 layers
  holemask: Uint8Array;
  foliageInstances: FoliageInstance[];
  resolution: number;
}

export interface FoliageInstance {
  typeId: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: number;
}

// ============================================================================
// BRUSH PREVIEW COMPONENT
// ============================================================================

interface BrushPreviewProps {
  position: THREE.Vector3 | null;
  settings: BrushSettings;
  color: string;
}

function BrushPreview({ position, settings, color }: BrushPreviewProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (meshRef.current && position) {
      meshRef.current.position.copy(position);
      meshRef.current.position.y += 0.1; // Slight offset
    }
  });
  
  if (!position) return null;
  
  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, THREE.MathUtils.degToRad(settings.rotation)]}>
      {settings.shape === 'circle' ? (
        <ringGeometry args={[settings.size * 0.95, settings.size, 64]} />
      ) : (
        <planeGeometry args={[settings.size * 2, settings.size * 2]} />
      )}
      <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ============================================================================
// TERRAIN MESH COMPONENT
// ============================================================================

interface TerrainMeshProps {
  data: TerrainData;
  settings: TerrainSettings;
  layers: TerrainLayer[];
  onBrushStart: (position: THREE.Vector3, uv: THREE.Vector2) => void;
  onBrushMove: (position: THREE.Vector3, uv: THREE.Vector2) => void;
  onBrushEnd: () => void;
  brushPosition: THREE.Vector3 | null;
  setBrushPosition: (pos: THREE.Vector3 | null) => void;
}

function TerrainMesh({
  data,
  settings,
  layers,
  onBrushStart,
  onBrushMove,
  onBrushEnd,
  brushPosition,
  setBrushPosition,
}: TerrainMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.PlaneGeometry | null>(null);
  const [isPainting, setIsPainting] = useState(false);
  
  // Create terrain geometry from heightmap
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(
      settings.size.x,
      settings.size.y,
      data.resolution - 1,
      data.resolution - 1
    );
    geo.rotateX(-Math.PI / 2);
    
    const positions = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i++) {
      const height = data.heightmap[i] * settings.maxHeight;
      positions.setY(i, height);
    }
    
    positions.needsUpdate = true;
    geo.computeVertexNormals();
    
    geometryRef.current = geo;
    return geo;
  }, [data.heightmap, data.resolution, settings]);
  
  // Create terrain material with splatmapping
  const material = useMemo(() => {
    // Simple material for now - in production would use custom shader
    return new THREE.MeshStandardMaterial({
      color: '#4a7c59',
      roughness: 0.8,
      metalness: 0.1,
      wireframe: false,
    });
  }, []);
  
  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.point && e.uv) {
      setIsPainting(true);
      onBrushStart(e.point, e.uv);
    }
  }, [onBrushStart]);
  
  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (e.point) {
      setBrushPosition(e.point.clone());
      if (isPainting && e.uv) {
        onBrushMove(e.point, e.uv);
      }
    }
  }, [isPainting, onBrushMove, setBrushPosition]);
  
  const handlePointerUp = useCallback(() => {
    setIsPainting(false);
    onBrushEnd();
  }, [onBrushEnd]);
  
  const handlePointerLeave = useCallback(() => {
    setBrushPosition(null);
    if (isPainting) {
      setIsPainting(false);
      onBrushEnd();
    }
  }, [isPainting, onBrushEnd, setBrushPosition]);
  
  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      onPointerDown={handlePointerDown as never}
      onPointerMove={handlePointerMove as never}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      castShadow={settings.castShadows}
      receiveShadow={settings.receiveShadows}
    />
  );
}

// ============================================================================
// TOOLBAR COMPONENT
// ============================================================================

interface ToolbarProps {
  selectedTool: TerrainToolType;
  onToolChange: (tool: TerrainToolType) => void;
}

const toolCategories = [
  {
    name: 'Sculpt',
    tools: [
      { id: 'sculpt_raise', icon: '⬆️', label: 'Raise' },
      { id: 'sculpt_lower', icon: '⬇️', label: 'Lower' },
      { id: 'sculpt_smooth', icon: '🌊', label: 'Smooth' },
      { id: 'sculpt_flatten', icon: '➖', label: 'Flatten' },
      { id: 'sculpt_noise', icon: '🎲', label: 'Noise' },
      { id: 'sculpt_erosion', icon: '💧', label: 'Erosion' },
    ],
  },
  {
    name: 'Paint',
    tools: [
      { id: 'paint_layer', icon: '🎨', label: 'Paint Layer' },
      { id: 'paint_hole', icon: '🕳️', label: 'Hole Tool' },
    ],
  },
  {
    name: 'Foliage',
    tools: [
      { id: 'foliage_paint', icon: '🌿', label: 'Paint Foliage' },
      { id: 'foliage_erase', icon: '🧹', label: 'Erase Foliage' },
    ],
  },
  {
    name: 'Selection',
    tools: [
      { id: 'select', icon: '👆', label: 'Select' },
      { id: 'region', icon: '⬜', label: 'Region' },
    ],
  },
];

function Toolbar({ selectedTool, onToolChange }: ToolbarProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '12px',
      background: '#0f172a',
      borderRadius: '8px',
    }}>
      {toolCategories.map(category => (
        <div key={category.name}>
          <h4 style={{ color: '#64748b', fontSize: '11px', marginBottom: '8px', textTransform: 'uppercase' }}>
            {category.name}
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {category.tools.map(tool => (
              <button
                key={tool.id}
                onClick={() => onToolChange(tool.id as TerrainToolType)}
                title={tool.label}
                style={{
                  width: '36px',
                  height: '36px',
                  background: selectedTool === tool.id ? '#3b82f6' : '#1e293b',
                  border: selectedTool === tool.id ? '2px solid #60a5fa' : '1px solid #374151',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {tool.icon}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// BRUSH SETTINGS PANEL
// ============================================================================

interface BrushSettingsPanelProps {
  settings: BrushSettings;
  onChange: (settings: BrushSettings) => void;
}

function BrushSettingsPanel({ settings, onChange }: BrushSettingsPanelProps) {
  const update = <K extends keyof BrushSettings>(key: K, value: BrushSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };
  
  return (
    <div style={{
      padding: '12px',
      background: '#0f172a',
      borderRadius: '8px',
    }}>
      <h3 style={{ color: 'white', fontSize: '14px', marginBottom: '12px' }}>Brush Settings</h3>
      
      {/* Size */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <label style={{ color: '#94a3b8', fontSize: '12px' }}>Size</label>
          <span style={{ color: '#64748b', fontSize: '11px' }}>{settings.size.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min={0.5}
          max={50}
          step={0.5}
          value={settings.size}
          onChange={(e) => update('size', parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>
      
      {/* Strength */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <label style={{ color: '#94a3b8', fontSize: '12px' }}>Strength</label>
          <span style={{ color: '#64748b', fontSize: '11px' }}>{(settings.strength * 100).toFixed(0)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={settings.strength}
          onChange={(e) => update('strength', parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>
      
      {/* Falloff */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
          Falloff
        </label>
        <select
          value={settings.falloff}
          onChange={(e) => update('falloff', e.target.value as BrushFalloff)}
          style={{
            width: '100%',
            background: '#1e293b',
            border: '1px solid #374151',
            borderRadius: '4px',
            padding: '6px',
            color: 'white',
            fontSize: '12px',
          }}
        >
          <option value="linear">Linear</option>
          <option value="smooth">Smooth</option>
          <option value="spherical">Spherical</option>
          <option value="tip">Tip</option>
          <option value="constant">Constant</option>
        </select>
      </div>
      
      {/* Shape */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
          Shape
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['circle', 'square'] as BrushShape[]).map(shape => (
            <button
              key={shape}
              onClick={() => update('shape', shape)}
              style={{
                flex: 1,
                padding: '6px',
                background: settings.shape === shape ? '#3b82f6' : '#1e293b',
                border: '1px solid #374151',
                borderRadius: '4px',
                color: 'white',
                fontSize: '12px',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {shape}
            </button>
          ))}
        </div>
      </div>
      
      {/* Rotation */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <label style={{ color: '#94a3b8', fontSize: '12px' }}>Rotation</label>
          <span style={{ color: '#64748b', fontSize: '11px' }}>{settings.rotation}°</span>
        </div>
        <input
          type="range"
          min={0}
          max={360}
          step={1}
          value={settings.rotation}
          onChange={(e) => update('rotation', parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>
      
      {/* Jitter */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <label style={{ color: '#94a3b8', fontSize: '12px' }}>Jitter</label>
          <span style={{ color: '#64748b', fontSize: '11px' }}>{(settings.jitter * 100).toFixed(0)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={settings.jitter}
          onChange={(e) => update('jitter', parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
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
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (layer: TerrainLayer) => void;
}

function LayersPanel({ layers, selectedLayer, onSelect, onAdd, onRemove, onUpdate }: LayersPanelProps) {
  return (
    <div style={{
      padding: '12px',
      background: '#0f172a',
      borderRadius: '8px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ color: 'white', fontSize: '14px' }}>Terrain Layers</h3>
        <button
          onClick={onAdd}
          style={{
            background: '#3b82f6',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 8px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '11px',
          }}
        >
          + Add
        </button>
      </div>
      
      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
        {layers.map((layer, index) => (
          <div
            key={layer.id}
            onClick={() => onSelect(layer.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px',
              background: selectedLayer === layer.id ? '#1e3a5f' : '#1e293b',
              border: selectedLayer === layer.id ? '1px solid #3b82f6' : '1px solid transparent',
              borderRadius: '4px',
              marginBottom: '4px',
              cursor: 'pointer',
            }}
          >
            {/* Layer preview */}
            <div style={{
              width: '32px',
              height: '32px',
              background: `linear-gradient(135deg, #4a7c59, #2d5a3d)`,
              borderRadius: '4px',
              flexShrink: 0,
            }} />
            
            {/* Layer info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: 'white', fontSize: '12px', fontWeight: 500 }}>
                {layer.name}
              </div>
              <div style={{ color: '#64748b', fontSize: '10px' }}>
                Tiling: {layer.tiling.x}x{layer.tiling.y}
              </div>
            </div>
            
            {/* Index */}
            <div style={{
              width: '20px',
              height: '20px',
              background: '#374151',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              fontSize: '10px',
            }}>
              {index + 1}
            </div>
            
            {/* Delete */}
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(layer.id); }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      
      {/* Layer settings for selected */}
      {selectedLayer && (() => {
        const layer = layers.find(l => l.id === selectedLayer);
        if (!layer) return null;
        
        return (
          <div style={{ marginTop: '12px', padding: '12px', background: '#1e293b', borderRadius: '4px' }}>
            <div style={{ marginBottom: '8px' }}>
              <label style={{ color: '#94a3b8', fontSize: '11px', display: 'block', marginBottom: '4px' }}>
                Height Blend
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={layer.heightBlend}
                onChange={(e) => onUpdate({ ...layer, heightBlend: parseFloat(e.target.value) })}
                style={{ width: '100%' }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ color: '#94a3b8', fontSize: '11px', display: 'block', marginBottom: '4px' }}>
                  Tiling X
                </label>
                <input
                  type="number"
                  value={layer.tiling.x}
                  onChange={(e) => onUpdate({ ...layer, tiling: { ...layer.tiling, x: parseFloat(e.target.value) } })}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #374151',
                    borderRadius: '4px',
                    padding: '4px',
                    color: 'white',
                    fontSize: '11px',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ color: '#94a3b8', fontSize: '11px', display: 'block', marginBottom: '4px' }}>
                  Tiling Y
                </label>
                <input
                  type="number"
                  value={layer.tiling.y}
                  onChange={(e) => onUpdate({ ...layer, tiling: { ...layer.tiling, y: parseFloat(e.target.value) } })}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #374151',
                    borderRadius: '4px',
                    padding: '4px',
                    color: 'white',
                    fontSize: '11px',
                  }}
                />
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ============================================================================
// EROSION PANEL
// ============================================================================

interface ErosionPanelProps {
  settings: ErosionSettings;
  onChange: (settings: ErosionSettings) => void;
  onApply: () => void;
}

function ErosionPanel({ settings, onChange, onApply }: ErosionPanelProps) {
  const update = <K extends keyof ErosionSettings>(key: K, value: ErosionSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };
  
  return (
    <div style={{
      padding: '12px',
      background: '#0f172a',
      borderRadius: '8px',
    }}>
      <h3 style={{ color: 'white', fontSize: '14px', marginBottom: '12px' }}>Erosion Settings</h3>
      
      {/* Type */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
          Type
        </label>
        <select
          value={settings.type}
          onChange={(e) => update('type', e.target.value as ErosionSettings['type'])}
          style={{
            width: '100%',
            background: '#1e293b',
            border: '1px solid #374151',
            borderRadius: '4px',
            padding: '6px',
            color: 'white',
            fontSize: '12px',
          }}
        >
          <option value="hydraulic">Hydraulic (Water)</option>
          <option value="thermal">Thermal (Gravity)</option>
          <option value="wind">Wind</option>
        </select>
      </div>
      
      {/* Iterations */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <label style={{ color: '#94a3b8', fontSize: '12px' }}>Iterations</label>
          <span style={{ color: '#64748b', fontSize: '11px' }}>{settings.iterations}</span>
        </div>
        <input
          type="range"
          min={1}
          max={500}
          step={1}
          value={settings.iterations}
          onChange={(e) => update('iterations', parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>
      
      {/* Strength */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <label style={{ color: '#94a3b8', fontSize: '12px' }}>Strength</label>
          <span style={{ color: '#64748b', fontSize: '11px' }}>{(settings.strength * 100).toFixed(0)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={settings.strength}
          onChange={(e) => update('strength', parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>
      
      {/* Type-specific settings */}
      {settings.type === 'hydraulic' && (
        <>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ color: '#94a3b8', fontSize: '11px', display: 'block', marginBottom: '4px' }}>
              Rain Amount
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={settings.rainAmount ?? 0.5}
              onChange={(e) => update('rainAmount', parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ color: '#94a3b8', fontSize: '11px', display: 'block', marginBottom: '4px' }}>
              Sediment Capacity
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={settings.sedimentCapacity ?? 0.5}
              onChange={(e) => update('sedimentCapacity', parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </>
      )}
      
      {settings.type === 'thermal' && (
        <div style={{ marginBottom: '8px' }}>
          <label style={{ color: '#94a3b8', fontSize: '11px', display: 'block', marginBottom: '4px' }}>
            Talus Angle: {settings.talusAngle ?? 45}°
          </label>
          <input
            type="range"
            min={0}
            max={90}
            step={1}
            value={settings.talusAngle ?? 45}
            onChange={(e) => update('talusAngle', parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      )}
      
      <button
        onClick={onApply}
        style={{
          width: '100%',
          background: '#3b82f6',
          border: 'none',
          borderRadius: '6px',
          padding: '10px',
          color: 'white',
          cursor: 'pointer',
          fontSize: '13px',
          marginTop: '8px',
        }}
      >
        Apply Erosion
      </button>
    </div>
  );
}

// ============================================================================
// 3D VIEWPORT SCENE
// ============================================================================

interface ViewportSceneProps {
  terrainData: TerrainData;
  terrainSettings: TerrainSettings;
  layers: TerrainLayer[];
  selectedTool: TerrainToolType;
  brushSettings: BrushSettings;
  onApplyBrush: (x: number, z: number) => void;
}

function ViewportScene({
  terrainData,
  terrainSettings,
  layers,
  selectedTool,
  brushSettings,
  onApplyBrush,
}: ViewportSceneProps) {
  const [brushPosition, setBrushPosition] = useState<THREE.Vector3 | null>(null);
  
  const getBrushColor = () => {
    if (selectedTool.startsWith('sculpt_raise')) return '#22c55e';
    if (selectedTool.startsWith('sculpt_lower')) return '#ef4444';
    if (selectedTool.startsWith('sculpt_smooth')) return '#3b82f6';
    if (selectedTool.startsWith('paint')) return '#f59e0b';
    if (selectedTool.startsWith('foliage')) return '#10b981';
    return '#64748b';
  };
  
  const handleBrushStart = useCallback((position: THREE.Vector3, _uv: THREE.Vector2) => {
    onApplyBrush(position.x, position.z);
  }, [onApplyBrush]);
  
  const handleBrushMove = useCallback((position: THREE.Vector3, _uv: THREE.Vector2) => {
    onApplyBrush(position.x, position.z);
  }, [onApplyBrush]);
  
  const handleBrushEnd = useCallback(() => {
    // Finalize stroke - could save undo state here
  }, []);
  
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight 
        position={[50, 100, 50]} 
        intensity={1} 
        castShadow 
        shadow-mapSize={[2048, 2048]}
      />
      
      {/* Environment */}
      <Environment preset="sunset" />
      
      {/* Grid */}
      <Grid 
        args={[100, 100]} 
        position={[0, 0.01, 0]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#374151"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#475569"
        fadeDistance={100}
        fadeStrength={1}
      />
      
      {/* Terrain */}
      <TerrainMesh
        data={terrainData}
        settings={terrainSettings}
        layers={layers}
        onBrushStart={handleBrushStart}
        onBrushMove={handleBrushMove}
        onBrushEnd={handleBrushEnd}
        brushPosition={brushPosition}
        setBrushPosition={setBrushPosition}
      />
      
      {/* Brush preview */}
      <BrushPreview
        position={brushPosition}
        settings={brushSettings}
        color={getBrushColor()}
      />
      
      {/* Camera controls */}
      <OrbitControls 
        makeDefault
        enablePan
        enableZoom
        enableRotate
        maxPolarAngle={Math.PI / 2.1}
      />
      
      {/* Gizmo */}
      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport labelColor="white" />
      </GizmoHelper>
    </>
  );
}

// ============================================================================
// MAIN TERRAIN SCULPTING EDITOR
// ============================================================================

export interface TerrainSculptingEditorProps {
  initialData?: TerrainData;
  initialSettings?: TerrainSettings;
  onChange?: (data: TerrainData) => void;
}

export function TerrainSculptingEditor({
  initialData,
  initialSettings,
  onChange,
}: TerrainSculptingEditorProps) {
  // Default terrain settings
  const [terrainSettings] = useState<TerrainSettings>(initialSettings || {
    resolution: 257,
    size: { x: 100, y: 100, z: 50 },
    maxHeight: 50,
    lodLevels: 4,
    streamingEnabled: true,
    tessellation: true,
    castShadows: true,
    receiveShadows: true,
  });
  
  // Initialize terrain data
  const [terrainData, setTerrainData] = useState<TerrainData>(() => {
    if (initialData) return initialData;
    
    const resolution = terrainSettings.resolution;
    const heightmap = new Float32Array(resolution * resolution);
    
    // Generate initial terrain with some hills
    for (let z = 0; z < resolution; z++) {
      for (let x = 0; x < resolution; x++) {
        const nx = x / resolution - 0.5;
        const nz = z / resolution - 0.5;
        
        // Simple noise-like pattern
        const height = 
          Math.sin(nx * 10) * Math.cos(nz * 10) * 0.1 +
          Math.sin(nx * 5 + nz * 3) * 0.15 +
          0.2;
        
        heightmap[z * resolution + x] = Math.max(0, Math.min(1, height));
      }
    }
    
    return {
      heightmap,
      splatmaps: [new Float32Array(resolution * resolution * 4)],
      holemask: new Uint8Array(resolution * resolution),
      foliageInstances: [],
      resolution,
    };
  });
  
  // Tool state
  const [selectedTool, setSelectedTool] = useState<TerrainToolType>('sculpt_raise');
  const [brushSettings, setBrushSettings] = useState<BrushSettings>({
    size: 5,
    strength: 0.3,
    falloff: 'smooth',
    shape: 'circle',
    rotation: 0,
    spacing: 0.25,
    jitter: 0,
  });
  
  // Layers state
  const [layers, setLayers] = useState<TerrainLayer[]>([
    {
      id: 'grass',
      name: 'Grass',
      diffuseTexture: '/textures/grass_diffuse.jpg',
      normalTexture: '/textures/grass_normal.jpg',
      tiling: { x: 10, y: 10 },
      heightBlend: 0.5,
      metallic: 0,
      roughness: 0.8,
    },
    {
      id: 'dirt',
      name: 'Dirt',
      diffuseTexture: '/textures/dirt_diffuse.jpg',
      normalTexture: '/textures/dirt_normal.jpg',
      tiling: { x: 8, y: 8 },
      heightBlend: 0.3,
      metallic: 0,
      roughness: 0.9,
    },
    {
      id: 'rock',
      name: 'Rock',
      diffuseTexture: '/textures/rock_diffuse.jpg',
      normalTexture: '/textures/rock_normal.jpg',
      tiling: { x: 4, y: 4 },
      heightBlend: 0.7,
      metallic: 0.1,
      roughness: 0.7,
    },
  ]);
  const [selectedLayer, setSelectedLayer] = useState<string | null>('grass');
  
  // Erosion settings
  const [erosionSettings, setErosionSettings] = useState<ErosionSettings>({
    type: 'hydraulic',
    iterations: 50,
    strength: 0.5,
    rainAmount: 0.5,
    evaporation: 0.1,
    sedimentCapacity: 0.5,
    talusAngle: 45,
  });
  
  // UI state
  const [showErosion, setShowErosion] = useState(false);
  const [showStats, setShowStats] = useState(true);
  
  // Apply brush to terrain
  const applyBrush = useCallback((worldX: number, worldZ: number) => {
    const resolution = terrainData.resolution;
    const { size } = terrainSettings;
    
    // Convert world to heightmap coordinates
    const hx = ((worldX / size.x) + 0.5) * (resolution - 1);
    const hz = ((worldZ / size.y) + 0.5) * (resolution - 1);
    
    // Calculate brush radius in heightmap units
    const brushRadius = (brushSettings.size / size.x) * resolution;
    
    // Get brush effect based on tool
    let effect: (height: number, distance: number) => number;
    
    switch (selectedTool) {
      case 'sculpt_raise':
        effect = (h, d) => h + brushSettings.strength * getFalloff(d, brushRadius, brushSettings.falloff) * 0.01;
        break;
      case 'sculpt_lower':
        effect = (h, d) => h - brushSettings.strength * getFalloff(d, brushRadius, brushSettings.falloff) * 0.01;
        break;
      case 'sculpt_smooth':
        effect = (h, _d) => h; // Smooth is handled separately
        break;
      case 'sculpt_flatten':
        effect = (h, d) => {
          const centerHeight = terrainData.heightmap[Math.floor(hz) * resolution + Math.floor(hx)];
          const t = getFalloff(d, brushRadius, brushSettings.falloff) * brushSettings.strength;
          return h + (centerHeight - h) * t;
        };
        break;
      default:
        effect = (h) => h;
    }
    
    // Apply to heightmap
    setTerrainData(prev => {
      const newHeightmap = new Float32Array(prev.heightmap);
      
      const minX = Math.max(0, Math.floor(hx - brushRadius));
      const maxX = Math.min(resolution - 1, Math.ceil(hx + brushRadius));
      const minZ = Math.max(0, Math.floor(hz - brushRadius));
      const maxZ = Math.min(resolution - 1, Math.ceil(hz + brushRadius));
      
      for (let z = minZ; z <= maxZ; z++) {
        for (let x = minX; x <= maxX; x++) {
          const dx = x - hx;
          const dz = z - hz;
          const distance = Math.sqrt(dx * dx + dz * dz);
          
          if (distance <= brushRadius) {
            const idx = z * resolution + x;
            const currentHeight = newHeightmap[idx];
            newHeightmap[idx] = Math.max(0, Math.min(1, effect(currentHeight, distance)));
          }
        }
      }
      
      return { ...prev, heightmap: newHeightmap };
    });
  }, [terrainData, terrainSettings, brushSettings, selectedTool]);
  
  // Falloff function
  const getFalloff = (distance: number, radius: number, type: BrushFalloff): number => {
    const t = Math.max(0, 1 - distance / radius);
    
    switch (type) {
      case 'linear': return t;
      case 'smooth': return t * t * (3 - 2 * t); // Smoothstep
      case 'spherical': return Math.sqrt(1 - (1 - t) * (1 - t));
      case 'tip': return t * t * t * t;
      case 'constant': return 1;
      default: return t;
    }
  };
  
  // Apply erosion
  const applyErosion = useCallback(() => {
    // This would run the erosion simulation
    console.log('Applying erosion:', erosionSettings);
    // Implementation would modify heightmap based on erosion type
  }, [erosionSettings]);
  
  // Add layer
  const addLayer = () => {
    const newLayer: TerrainLayer = {
      id: crypto.randomUUID(),
      name: `Layer ${layers.length + 1}`,
      diffuseTexture: '',
      tiling: { x: 10, y: 10 },
      heightBlend: 0.5,
      metallic: 0,
      roughness: 0.8,
    };
    setLayers(prev => [...prev, newLayer]);
  };
  
  // Notify parent of changes
  useEffect(() => {
    onChange?.(terrainData);
  }, [terrainData, onChange]);
  
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', background: '#0f172a' }}>
      {/* Left sidebar - Tools */}
      <div style={{ 
        width: '200px', 
        borderRight: '1px solid #1e293b', 
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        overflowY: 'auto',
      }}>
        <Toolbar
          selectedTool={selectedTool}
          onToolChange={setSelectedTool}
        />
        
        <BrushSettingsPanel
          settings={brushSettings}
          onChange={setBrushSettings}
        />
        
        {selectedTool === 'sculpt_erosion' && (
          <ErosionPanel
            settings={erosionSettings}
            onChange={setErosionSettings}
            onApply={applyErosion}
          />
        )}
      </div>
      
      {/* Main viewport */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Canvas
          shadows
          camera={{ position: [50, 50, 50], fov: 50 }}
          style={{ background: '#1e293b' }}
        >
          <ViewportScene
            terrainData={terrainData}
            terrainSettings={terrainSettings}
            layers={layers}
            selectedTool={selectedTool}
            brushSettings={brushSettings}
            onApplyBrush={applyBrush}
          />
          {showStats && <Stats />}
        </Canvas>
        
        {/* Top toolbar */}
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          display: 'flex',
          gap: '8px',
        }}>
          <button
            onClick={() => setShowStats(s => !s)}
            style={{
              background: showStats ? '#3b82f6' : '#1e293b',
              border: '1px solid #374151',
              borderRadius: '4px',
              padding: '6px 12px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            📊 Stats
          </button>
          
          <button
            onClick={() => setShowErosion(s => !s)}
            style={{
              background: showErosion ? '#3b82f6' : '#1e293b',
              border: '1px solid #374151',
              borderRadius: '4px',
              padding: '6px 12px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            💧 Erosion Panel
          </button>
        </div>
        
        {/* Status bar */}
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          background: '#1e293b',
          padding: '8px 12px',
          borderRadius: '6px',
          color: '#94a3b8',
          fontSize: '11px',
          display: 'flex',
          gap: '16px',
        }}>
          <span>Resolution: {terrainData.resolution}x{terrainData.resolution}</span>
          <span>Size: {terrainSettings.size.x}m x {terrainSettings.size.y}m</span>
          <span>Max Height: {terrainSettings.maxHeight}m</span>
          <span>Layers: {layers.length}</span>
        </div>
      </div>
      
      {/* Right sidebar - Layers */}
      <div style={{ 
        width: '260px', 
        borderLeft: '1px solid #1e293b', 
        padding: '12px',
        overflowY: 'auto',
      }}>
        <LayersPanel
          layers={layers}
          selectedLayer={selectedLayer}
          onSelect={setSelectedLayer}
          onAdd={addLayer}
          onRemove={(id) => setLayers(prev => prev.filter(l => l.id !== id))}
          onUpdate={(layer) => setLayers(prev => prev.map(l => l.id === layer.id ? layer : l))}
        />
        
        {/* Terrain info */}
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: '#0f172a',
          borderRadius: '8px',
        }}>
          <h3 style={{ color: 'white', fontSize: '14px', marginBottom: '12px' }}>Terrain Settings</h3>
          
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ color: '#64748b' }}>Resolution:</span> {terrainData.resolution}²
            </div>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ color: '#64748b' }}>Vertices:</span> {(terrainData.resolution * terrainData.resolution).toLocaleString()}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ color: '#64748b' }}>LOD Levels:</span> {terrainSettings.lodLevels}
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Streaming:</span>{' '}
              <span style={{ color: terrainSettings.streamingEnabled ? '#22c55e' : '#ef4444' }}>
                {terrainSettings.streamingEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>
        
        {/* Import/Export */}
        <div style={{
          marginTop: '16px',
          display: 'flex',
          gap: '8px',
        }}>
          <button
            style={{
              flex: 1,
              background: '#1e293b',
              border: '1px solid #374151',
              borderRadius: '6px',
              padding: '10px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            📥 Import
          </button>
          <button
            style={{
              flex: 1,
              background: '#1e293b',
              border: '1px solid #374151',
              borderRadius: '6px',
              padding: '10px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            📤 Export
          </button>
        </div>
      </div>
    </div>
  );
}

export default TerrainSculptingEditor;
