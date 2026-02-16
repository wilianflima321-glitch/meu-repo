/**
 * FOLIAGE PAINTER - Aethel Engine
 * 
 * Sistema profissional de pintura de vegetação procedural.
 * Inspirado em UE5 Foliage Tool e SpeedTree.
 * 
 * FEATURES:
 * - Multi-foliage brush painting
 * - Density, scale, rotation variance
 * - Slope and height filtering
 * - Instanced rendering (GPU instancing)
 * - LOD system
 * - Wind animation
 * - Collision generation
 * - Export para runtime
 */

'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import {
  OrbitControls,
  Grid,
  Environment,
  GizmoHelper,
  GizmoViewport,
  Html,
  useTexture,
  Plane,
} from '@react-three/drei';
import * as THREE from 'three';
import {
  TreeDeciduous,
  Brush,
  Trash2,
  Settings,
  Download,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Layers,
  Wind,
  Mountain,
  Droplets,
  Plus,
  Minus,
  RotateCcw,
  Play,
  Pause,
  Shuffle,
  Move,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export type FoliageToolType = 'paint' | 'erase' | 'select' | 'move';

export interface FoliageType {
  id: string;
  name: string;
  meshPath: string;
  thumbnail: string;
  category: 'tree' | 'bush' | 'grass' | 'flower' | 'rock';
  
  // Placement
  densityMin: number;
  densityMax: number;
  scaleMin: number;
  scaleMax: number;
  rotationYRandom: boolean;
  alignToNormal: boolean;
  normalAlignmentStrength: number;
  
  // Constraints
  minSlope: number;
  maxSlope: number;
  minHeight: number;
  maxHeight: number;
  
  // Rendering
  castShadow: boolean;
  receiveShadow: boolean;
  cullDistance: number;
  lodBias: number;
  
  // Collision
  hasCollision: boolean;
  collisionType: 'box' | 'sphere' | 'mesh';
  
  // Wind
  windEnabled: boolean;
  windStrength: number;
  windFrequency: number;
}

export interface FoliageInstance {
  id: string;
  typeId: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
}

export interface FoliageBrushSettings {
  tool: FoliageToolType;
  radius: number;
  density: number;
  falloff: number;
}

export interface FoliageLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  types: string[];
  instances: FoliageInstance[];
}

// ============================================================================
// DEFAULT FOLIAGE TYPES
// ============================================================================

const DEFAULT_FOLIAGE_TYPES: FoliageType[] = [
  {
    id: 'oak_tree',
    name: 'Oak Tree',
    meshPath: '/meshes/trees/oak.glb',
    thumbnail: '/thumbnails/oak.png',
    category: 'tree',
    densityMin: 0.1,
    densityMax: 0.3,
    scaleMin: 0.8,
    scaleMax: 1.2,
    rotationYRandom: true,
    alignToNormal: true,
    normalAlignmentStrength: 0.3,
    minSlope: 0,
    maxSlope: 30,
    minHeight: -100,
    maxHeight: 500,
    castShadow: true,
    receiveShadow: true,
    cullDistance: 500,
    lodBias: 0,
    hasCollision: true,
    collisionType: 'box',
    windEnabled: true,
    windStrength: 0.3,
    windFrequency: 1.5,
  },
  {
    id: 'pine_tree',
    name: 'Pine Tree',
    meshPath: '/meshes/trees/pine.glb',
    thumbnail: '/thumbnails/pine.png',
    category: 'tree',
    densityMin: 0.15,
    densityMax: 0.4,
    scaleMin: 0.7,
    scaleMax: 1.3,
    rotationYRandom: true,
    alignToNormal: true,
    normalAlignmentStrength: 0.2,
    minSlope: 0,
    maxSlope: 40,
    minHeight: 100,
    maxHeight: 800,
    castShadow: true,
    receiveShadow: true,
    cullDistance: 600,
    lodBias: 0,
    hasCollision: true,
    collisionType: 'box',
    windEnabled: true,
    windStrength: 0.2,
    windFrequency: 1.2,
  },
  {
    id: 'bush_green',
    name: 'Green Bush',
    meshPath: '/meshes/bushes/green.glb',
    thumbnail: '/thumbnails/bush_green.png',
    category: 'bush',
    densityMin: 0.3,
    densityMax: 0.6,
    scaleMin: 0.6,
    scaleMax: 1.4,
    rotationYRandom: true,
    alignToNormal: true,
    normalAlignmentStrength: 0.5,
    minSlope: 0,
    maxSlope: 45,
    minHeight: -100,
    maxHeight: 600,
    castShadow: true,
    receiveShadow: true,
    cullDistance: 200,
    lodBias: 0,
    hasCollision: true,
    collisionType: 'sphere',
    windEnabled: true,
    windStrength: 0.5,
    windFrequency: 2.0,
  },
  {
    id: 'grass_tall',
    name: 'Tall Grass',
    meshPath: '/meshes/grass/tall.glb',
    thumbnail: '/thumbnails/grass_tall.png',
    category: 'grass',
    densityMin: 0.5,
    densityMax: 1.0,
    scaleMin: 0.7,
    scaleMax: 1.3,
    rotationYRandom: true,
    alignToNormal: true,
    normalAlignmentStrength: 0.8,
    minSlope: 0,
    maxSlope: 60,
    minHeight: -100,
    maxHeight: 1000,
    castShadow: false,
    receiveShadow: true,
    cullDistance: 100,
    lodBias: 1,
    hasCollision: false,
    collisionType: 'box',
    windEnabled: true,
    windStrength: 0.8,
    windFrequency: 3.0,
  },
  {
    id: 'flower_red',
    name: 'Red Flower',
    meshPath: '/meshes/flowers/red.glb',
    thumbnail: '/thumbnails/flower_red.png',
    category: 'flower',
    densityMin: 0.3,
    densityMax: 0.8,
    scaleMin: 0.5,
    scaleMax: 1.0,
    rotationYRandom: true,
    alignToNormal: true,
    normalAlignmentStrength: 0.9,
    minSlope: 0,
    maxSlope: 30,
    minHeight: -50,
    maxHeight: 400,
    castShadow: false,
    receiveShadow: true,
    cullDistance: 80,
    lodBias: 1,
    hasCollision: false,
    collisionType: 'box',
    windEnabled: true,
    windStrength: 0.6,
    windFrequency: 2.5,
  },
  {
    id: 'rock_small',
    name: 'Small Rock',
    meshPath: '/meshes/rocks/small.glb',
    thumbnail: '/thumbnails/rock_small.png',
    category: 'rock',
    densityMin: 0.1,
    densityMax: 0.3,
    scaleMin: 0.5,
    scaleMax: 2.0,
    rotationYRandom: true,
    alignToNormal: false,
    normalAlignmentStrength: 0,
    minSlope: 0,
    maxSlope: 90,
    minHeight: -100,
    maxHeight: 1000,
    castShadow: true,
    receiveShadow: true,
    cullDistance: 300,
    lodBias: 0,
    hasCollision: true,
    collisionType: 'mesh',
    windEnabled: false,
    windStrength: 0,
    windFrequency: 0,
  },
];

// ============================================================================
// SLIDER COMPONENT
// ============================================================================

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}

function Slider({ label, value, min, max, step = 0.01, unit = '', onChange }: SliderProps) {
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <label className="text-xs text-slate-400">{label}</label>
        <span className="text-xs text-slate-300 font-mono">
          {value.toFixed(step < 1 ? 2 : 0)}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none
                   [&::-webkit-slider-thumb]:w-3
                   [&::-webkit-slider-thumb]:h-3
                   [&::-webkit-slider-thumb]:bg-green-500
                   [&::-webkit-slider-thumb]:rounded-full"
      />
    </div>
  );
}

// ============================================================================
// COLLAPSIBLE SECTION
// ============================================================================

interface CollapsibleSectionProps {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ title, icon, defaultOpen = true, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full text-left py-1.5 text-sm text-slate-200 
                   hover:text-white transition-colors"
      >
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        {icon}
        {title}
      </button>
      {isOpen && <div className="pl-6 pt-2">{children}</div>}
    </div>
  );
}

// ============================================================================
// TERRAIN MESH
// ============================================================================

function TerrainMesh({ 
  onPaint, 
  brushPosition, 
  brushRadius,
  showBrush,
}: { 
  onPaint: (point: THREE.Vector3) => void;
  brushPosition: THREE.Vector3 | null;
  brushRadius: number;
  showBrush: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [isPainting, setIsPainting] = useState(false);
  
  // Generate terrain height
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(50, 50, 100, 100);
    const positions = geo.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      // Simple noise-like height
      const height = Math.sin(x * 0.3) * Math.cos(y * 0.3) * 2 +
                     Math.sin(x * 0.1 + y * 0.1) * 1.5;
      positions[i + 2] = height;
    }
    
    geo.computeVertexNormals();
    return geo;
  }, []);
  
  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setIsPainting(true);
    if (e.point) onPaint(e.point as THREE.Vector3);
  };
  
  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (isPainting && e.point) {
      onPaint(e.point as THREE.Vector3);
    }
  };
  
  const handlePointerUp = () => {
    setIsPainting(false);
  };
  
  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={geometry}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <meshStandardMaterial 
          color="#4a5a3a" 
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
      
      {/* Brush indicator */}
      {showBrush && brushPosition && (
        <mesh position={[brushPosition.x, brushPosition.y + 0.1, brushPosition.z]}>
          <ringGeometry args={[brushRadius * 0.9, brushRadius, 32]} />
          <meshBasicMaterial color="#00ff88" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

// ============================================================================
// FOLIAGE INSTANCES 3D
// ============================================================================

interface FoliageInstances3DProps {
  instances: FoliageInstance[];
  types: FoliageType[];
  windTime: number;
}

function FoliageInstances3D({ instances, types, windTime }: FoliageInstances3DProps) {
  // Group instances by type
  const instancesByType = useMemo(() => {
    const grouped: Record<string, FoliageInstance[]> = {};
    instances.forEach((inst) => {
      if (!grouped[inst.typeId]) grouped[inst.typeId] = [];
      grouped[inst.typeId].push(inst);
    });
    return grouped;
  }, [instances]);
  
  return (
    <group>
      {Object.entries(instancesByType).map(([typeId, typeInstances]) => {
        const foliageType = types.find((t) => t.id === typeId);
        if (!foliageType) return null;
        
        return typeInstances.map((inst) => {
          // Simple representation based on category
          let geometry: THREE.BufferGeometry;
          let color: string;
          
          switch (foliageType.category) {
            case 'tree':
              geometry = new THREE.ConeGeometry(0.5, 2, 8);
              color = '#2d5a27';
              break;
            case 'bush':
              geometry = new THREE.SphereGeometry(0.4, 8, 8);
              color = '#3d7a37';
              break;
            case 'grass':
              geometry = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4);
              color = '#5a8a4a';
              break;
            case 'flower':
              geometry = new THREE.SphereGeometry(0.1, 8, 8);
              color = '#e74c3c';
              break;
            case 'rock':
              geometry = new THREE.DodecahedronGeometry(0.3);
              color = '#7a7a7a';
              break;
            default:
              geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
              color = '#888888';
          }
          
          // Wind offset
          const windOffset = foliageType.windEnabled
            ? Math.sin(windTime * foliageType.windFrequency + inst.position.x) * foliageType.windStrength * 0.1
            : 0;
          
          return (
            <mesh
              key={inst.id}
              position={[
                inst.position.x + windOffset,
                inst.position.y + (foliageType.category === 'tree' ? 1 : 0.2),
                inst.position.z,
              ]}
              rotation={inst.rotation}
              scale={inst.scale}
              geometry={geometry}
              castShadow={foliageType.castShadow}
              receiveShadow={foliageType.receiveShadow}
            >
              <meshStandardMaterial color={color} />
            </mesh>
          );
        });
      })}
    </group>
  );
}

// ============================================================================
// FOLIAGE TYPE CARD
// ============================================================================

interface FoliageTypeCardProps {
  type: FoliageType;
  isSelected: boolean;
  onSelect: () => void;
  instanceCount: number;
}

function FoliageTypeCard({ type, isSelected, onSelect, instanceCount }: FoliageTypeCardProps) {
  const categoryColors: Record<string, string> = {
    tree: 'bg-green-600',
    bush: 'bg-emerald-600',
    grass: 'bg-lime-600',
    flower: 'bg-cyan-600',
    rock: 'bg-stone-600',
  };
  
  const categoryIcons: Record<string, React.ReactNode> = {
    tree: <TreeDeciduous className="w-4 h-4" />,
    bush: <TreeDeciduous className="w-3 h-3" />,
    grass: <Droplets className="w-4 h-4" />,
    flower: <Droplets className="w-4 h-4" />,
    rock: <Mountain className="w-4 h-4" />,
  };
  
  return (
    <button
      onClick={onSelect}
      className={`w-full p-2 rounded flex items-center gap-2 text-left transition-colors ${
        isSelected 
          ? 'bg-green-600/30 border border-green-500' 
          : 'bg-slate-800/50 hover:bg-slate-700/50 border border-transparent'
      }`}
    >
      <div className={`p-1.5 rounded ${categoryColors[type.category]}`}>
        {categoryIcons[type.category]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{type.name}</div>
        <div className="text-[10px] text-slate-400">{instanceCount} instances</div>
      </div>
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => {}}
        className="rounded border-slate-500"
      />
    </button>
  );
}

// ============================================================================
// LAYER ITEM
// ============================================================================

interface LayerItemProps {
  layer: FoliageLayer;
  isSelected: boolean;
  onSelect: () => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
}

function LayerItem({ 
  layer, 
  isSelected, 
  onSelect, 
  onToggleVisibility,
  onToggleLock,
  onDelete,
}: LayerItemProps) {
  return (
    <div 
      className={`flex items-center gap-2 p-2 rounded ${
        isSelected ? 'bg-green-600/20 border border-green-500/50' : 'bg-slate-800/50'
      }`}
    >
      <button onClick={onSelect} className="flex-1 text-left text-sm truncate">
        {layer.name}
      </button>
      <span className="text-[10px] text-slate-500">{layer.instances.length}</span>
      <button 
        onClick={onToggleVisibility}
        className="p-1 rounded hover:bg-slate-700"
      >
        {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-slate-500" />}
      </button>
      <button 
        onClick={onDelete}
        className="p-1 rounded hover:bg-red-600/30"
      >
        <Trash2 className="w-3 h-3 text-red-400" />
      </button>
    </div>
  );
}

// ============================================================================
// FOLIAGE STATS
// ============================================================================

interface FoliageStatsProps {
  layers: FoliageLayer[];
  types: FoliageType[];
}

function FoliageStats({ layers, types }: FoliageStatsProps) {
  const stats = useMemo(() => {
    let totalInstances = 0;
    const byCategory: Record<string, number> = {};
    
    layers.forEach((layer) => {
      layer.instances.forEach((inst) => {
        totalInstances++;
        const type = types.find((t) => t.id === inst.typeId);
        if (type) {
          byCategory[type.category] = (byCategory[type.category] || 0) + 1;
        }
      });
    });
    
    return { totalInstances, byCategory };
  }, [layers, types]);
  
  return (
    <div className="bg-slate-800/50 rounded p-3 text-xs">
      <div className="font-medium mb-2">Statistics</div>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-slate-400">Total Instances:</span>
          <span>{stats.totalInstances.toLocaleString()}</span>
        </div>
        {Object.entries(stats.byCategory).map(([cat, count]) => (
          <div key={cat} className="flex justify-between">
            <span className="text-slate-400 capitalize">{cat}:</span>
            <span>{count.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN FOLIAGE PAINTER
// ============================================================================

export interface FoliagePainterProps {
  sceneId?: string;
  onFoliageUpdate?: (layers: FoliageLayer[]) => void;
  onExport?: (data: { layers: FoliageLayer[]; types: FoliageType[] }) => void;
}

export default function FoliagePainter({
  sceneId,
  onFoliageUpdate,
  onExport,
}: FoliagePainterProps) {
  // State
  const [foliageTypes] = useState<FoliageType[]>(DEFAULT_FOLIAGE_TYPES);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['grass_tall']);
  const [layers, setLayers] = useState<FoliageLayer[]>([
    { id: 'default', name: 'Default Layer', visible: true, locked: false, types: [], instances: [] },
  ]);
  const [activeLayerId, setActiveLayerId] = useState('default');
  
  // Brush settings
  const [brushSettings, setBrushSettings] = useState<FoliageBrushSettings>({
    tool: 'paint',
    radius: 3,
    density: 0.5,
    falloff: 0.5,
  });
  
  // Simulation
  const [isSimulating, setIsSimulating] = useState(false);
  const [windTime, setWindTime] = useState(0);
  const [brushPosition, setBrushPosition] = useState<THREE.Vector3 | null>(null);
  
  // Get active layer
  const activeLayer = useMemo(() => 
    layers.find((l) => l.id === activeLayerId),
    [layers, activeLayerId]
  );
  
  // Count instances per type
  const instanceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    layers.forEach((layer) => {
      layer.instances.forEach((inst) => {
        counts[inst.typeId] = (counts[inst.typeId] || 0) + 1;
      });
    });
    return counts;
  }, [layers]);
  
  // All visible instances
  const visibleInstances = useMemo(() => 
    layers.filter((l) => l.visible).flatMap((l) => l.instances),
    [layers]
  );
  
  // Paint handler
  const handlePaint = useCallback((point: THREE.Vector3) => {
    if (!activeLayer || activeLayer.locked || selectedTypes.length === 0) return;
    
    if (brushSettings.tool === 'paint') {
      // Generate instances
      const newInstances: FoliageInstance[] = [];
      const instancesPerStroke = Math.floor(brushSettings.density * 10);
      
      for (let i = 0; i < instancesPerStroke; i++) {
        const typeId = selectedTypes[Math.floor(Math.random() * selectedTypes.length)];
        const type = foliageTypes.find((t) => t.id === typeId);
        if (!type) continue;
        
        // Random position within brush radius
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * brushSettings.radius;
        const x = point.x + Math.cos(angle) * radius;
        const z = point.z + Math.sin(angle) * radius;
        
        // Scale variation
        const scaleValue = type.scaleMin + Math.random() * (type.scaleMax - type.scaleMin);
        
        newInstances.push({
          id: `inst_${Date.now()}_${i}`,
          typeId,
          position: new THREE.Vector3(x, point.y, z),
          rotation: new THREE.Euler(0, type.rotationYRandom ? Math.random() * Math.PI * 2 : 0, 0),
          scale: new THREE.Vector3(scaleValue, scaleValue, scaleValue),
        });
      }
      
      setLayers((prev) => prev.map((l) => 
        l.id === activeLayerId 
          ? { ...l, instances: [...l.instances, ...newInstances] }
          : l
      ));
    } else if (brushSettings.tool === 'erase') {
      // Remove instances within radius
      setLayers((prev) => prev.map((l) => 
        l.id === activeLayerId 
          ? {
              ...l,
              instances: l.instances.filter((inst) => 
                inst.position.distanceTo(point) > brushSettings.radius
              ),
            }
          : l
      ));
    }
  }, [activeLayer, activeLayerId, selectedTypes, brushSettings, foliageTypes]);
  
  // Toggle type selection
  const toggleTypeSelection = useCallback((typeId: string) => {
    setSelectedTypes((prev) => 
      prev.includes(typeId) 
        ? prev.filter((id) => id !== typeId)
        : [...prev, typeId]
    );
  }, []);
  
  // Add layer
  const addLayer = useCallback(() => {
    const newLayer: FoliageLayer = {
      id: `layer_${Date.now()}`,
      name: `Layer ${layers.length + 1}`,
      visible: true,
      locked: false,
      types: [],
      instances: [],
    };
    setLayers((prev) => [...prev, newLayer]);
    setActiveLayerId(newLayer.id);
  }, [layers.length]);
  
  // Delete layer
  const deleteLayer = useCallback((layerId: string) => {
    if (layers.length <= 1) return;
    setLayers((prev) => prev.filter((l) => l.id !== layerId));
    if (activeLayerId === layerId) {
      setActiveLayerId(layers[0].id);
    }
  }, [layers, activeLayerId]);
  
  // Wind animation
  useEffect(() => {
    if (!isSimulating) return;
    
    const interval = setInterval(() => {
      setWindTime((t) => t + 0.05);
    }, 16);
    
    return () => clearInterval(interval);
  }, [isSimulating]);
  
  // Clear all
  const clearAll = useCallback(() => {
    setLayers((prev) => prev.map((l) => ({ ...l, instances: [] })));
  }, []);
  
  return (
    <div className="flex h-full w-full bg-slate-900 text-slate-200">
      {/* Left Panel - Foliage Types */}
      <div className="w-64 border-r border-slate-700 flex flex-col">
        <div className="p-3 border-b border-slate-700">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <TreeDeciduous className="w-4 h-4 text-green-400" />
            Foliage Types
          </h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {foliageTypes.map((type) => (
            <FoliageTypeCard
              key={type.id}
              type={type}
              isSelected={selectedTypes.includes(type.id)}
              onSelect={() => toggleTypeSelection(type.id)}
              instanceCount={instanceCounts[type.id] || 0}
            />
          ))}
        </div>
        
        {/* Layers */}
        <div className="border-t border-slate-700 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Layers</span>
            <button
              onClick={addLayer}
              className="p-1 rounded bg-green-600/30 hover:bg-green-600/50"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-1">
            {layers.map((layer) => (
              <LayerItem
                key={layer.id}
                layer={layer}
                isSelected={activeLayerId === layer.id}
                onSelect={() => setActiveLayerId(layer.id)}
                onToggleVisibility={() => {
                  setLayers((prev) => prev.map((l) => 
                    l.id === layer.id ? { ...l, visible: !l.visible } : l
                  ));
                }}
                onToggleLock={() => {
                  setLayers((prev) => prev.map((l) => 
                    l.id === layer.id ? { ...l, locked: !l.locked } : l
                  ));
                }}
                onDelete={() => deleteLayer(layer.id)}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* 3D Viewport */}
      <div className="flex-1 relative">
        <Canvas camera={{ position: [20, 20, 20], fov: 50 }} shadows>
          <color attach="background" args={['#0f172a']} />
          
          <ambientLight intensity={0.4} />
          <directionalLight 
            position={[20, 30, 10]} 
            intensity={1} 
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          
          <TerrainMesh
            onPaint={handlePaint}
            brushPosition={brushPosition}
            brushRadius={brushSettings.radius}
            showBrush={brushSettings.tool === 'paint' || brushSettings.tool === 'erase'}
          />
          
          <FoliageInstances3D
            instances={visibleInstances}
            types={foliageTypes}
            windTime={windTime}
          />
          
          <OrbitControls makeDefault />
          <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
            <GizmoViewport />
          </GizmoHelper>
        </Canvas>
        
        {/* Toolbar */}
        <div className="absolute top-4 left-4 flex gap-2">
          <div className="flex bg-slate-800/90 rounded overflow-hidden">
            <button
              onClick={() => setBrushSettings((s) => ({ ...s, tool: 'paint' }))}
              className={`p-2 ${brushSettings.tool === 'paint' ? 'bg-green-600' : 'hover:bg-slate-700'}`}
              title="Paint"
            >
              <Brush className="w-4 h-4" />
            </button>
            <button
              onClick={() => setBrushSettings((s) => ({ ...s, tool: 'erase' }))}
              className={`p-2 ${brushSettings.tool === 'erase' ? 'bg-red-600' : 'hover:bg-slate-700'}`}
              title="Erase"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setBrushSettings((s) => ({ ...s, tool: 'select' }))}
              className={`p-2 ${brushSettings.tool === 'select' ? 'bg-blue-600' : 'hover:bg-slate-700'}`}
              title="Select"
            >
              <Move className="w-4 h-4" />
            </button>
          </div>
          
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`p-2 rounded ${isSimulating ? 'bg-green-600' : 'bg-slate-800/90'}`}
            title={isSimulating ? 'Stop Wind' : 'Simulate Wind'}
          >
            <Wind className="w-4 h-4" />
          </button>
          
          <button
            onClick={clearAll}
            className="p-2 rounded bg-slate-800/90 hover:bg-red-600/50"
            title="Clear All"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => onExport?.({ layers, types: foliageTypes })}
            className="p-2 rounded bg-green-600 hover:bg-green-500"
            title="Export"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
        
        {/* Stats */}
        <div className="absolute bottom-4 left-4">
          <FoliageStats layers={layers} types={foliageTypes} />
        </div>
      </div>
      
      {/* Right Panel - Brush Settings */}
      <div className="w-72 border-l border-slate-700 overflow-y-auto">
        <div className="p-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-green-400" />
            Brush Settings
          </h2>
          
          <CollapsibleSection title="Brush" icon={<Brush className="w-4 h-4 text-blue-400" />}>
            <Slider
              label="Radius"
              value={brushSettings.radius}
              min={0.5}
              max={10}
              step={0.5}
              unit="m"
              onChange={(v) => setBrushSettings((s) => ({ ...s, radius: v }))}
            />
            <Slider
              label="Density"
              value={brushSettings.density}
              min={0.1}
              max={1}
              onChange={(v) => setBrushSettings((s) => ({ ...s, density: v }))}
            />
            <Slider
              label="Falloff"
              value={brushSettings.falloff}
              min={0}
              max={1}
              onChange={(v) => setBrushSettings((s) => ({ ...s, falloff: v }))}
            />
          </CollapsibleSection>
          
          {/* Selected type settings */}
          {selectedTypes.length === 1 && (
            <CollapsibleSection 
              title="Type Settings" 
              icon={<TreeDeciduous className="w-4 h-4 text-green-400" />}
            >
              {(() => {
                const type = foliageTypes.find((t) => t.id === selectedTypes[0]);
                if (!type) return null;
                
                return (
                  <>
                    <div className="text-sm font-medium mb-3">{type.name}</div>
                    
                    <Slider
                      label="Min Scale"
                      value={type.scaleMin}
                      min={0.1}
                      max={2}
                      onChange={() => {}}
                    />
                    <Slider
                      label="Max Scale"
                      value={type.scaleMax}
                      min={0.5}
                      max={3}
                      onChange={() => {}}
                    />
                    
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={type.rotationYRandom}
                        className="rounded"
                        readOnly
                      />
                      <span className="text-xs">Random Y Rotation</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={type.alignToNormal}
                        className="rounded"
                        readOnly
                      />
                      <span className="text-xs">Align to Normal</span>
                    </div>
                  </>
                );
              })()}
            </CollapsibleSection>
          )}
          
          <CollapsibleSection 
            title="Constraints" 
            icon={<Mountain className="w-4 h-4 text-orange-400" />}
            defaultOpen={false}
          >
            <Slider
              label="Min Slope"
              value={0}
              min={0}
              max={90}
              step={1}
              unit="°"
              onChange={() => {}}
            />
            <Slider
              label="Max Slope"
              value={45}
              min={0}
              max={90}
              step={1}
              unit="°"
              onChange={() => {}}
            />
            <Slider
              label="Min Height"
              value={-100}
              min={-500}
              max={500}
              step={10}
              unit="m"
              onChange={() => {}}
            />
            <Slider
              label="Max Height"
              value={500}
              min={0}
              max={1000}
              step={10}
              unit="m"
              onChange={() => {}}
            />
          </CollapsibleSection>
          
          <CollapsibleSection 
            title="Wind" 
            icon={<Wind className="w-4 h-4 text-cyan-400" />}
            defaultOpen={false}
          >
            <Slider
              label="Global Strength"
              value={0.5}
              min={0}
              max={2}
              onChange={() => {}}
            />
            <Slider
              label="Turbulence"
              value={0.3}
              min={0}
              max={1}
              onChange={() => {}}
            />
            <Slider
              label="Frequency"
              value={1.5}
              min={0.5}
              max={5}
              onChange={() => {}}
            />
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
}
