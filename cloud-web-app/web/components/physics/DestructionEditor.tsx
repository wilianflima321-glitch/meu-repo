/**
 * DESTRUCTION EDITOR - Aethel Engine
 * 
 * Editor visual profissional para configurar destruição de meshes.
 * Integra com destruction-system.ts para fragmentação em tempo real.
 * 
 * FEATURES:
 * - Voronoi/Radial/Directional fracture patterns
 * - Health points e damage thresholds configuráveis
 * - Preview de fragmentação em tempo real
 * - Impact point visualizer interativo
 * - Hierarquia de destruição (níveis)
 * - Configuração de debris (lifetime, physics)
 * - VFX/SFX triggers
 * - Export para runtime
 */

'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { 
  OrbitControls, 
  Grid, 
  Environment, 
  GizmoHelper,
  GizmoViewport,
  Html,
  Center,
} from '@react-three/drei';
import * as THREE from 'three';
import { 
  Hammer, 
  Crosshair,
  Layers,
  Play,
  RotateCcw,
  Settings,
  Download,
  Heart,
  Zap,
  Box,
  CircleDot,
  ArrowRight,
  Volume2,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Eye,
  Timer,
  Target,
  Bomb,
  Shield,
} from 'lucide-react';
import {
  DestructibleObject,
  DestructibleConfig,
  VoronoiFractureGenerator,
  DestructionEvent,
  FragmentData,
} from '@/lib/destruction-system';

// ============================================================================
// TYPES
// ============================================================================

export type FracturePattern = 'voronoi' | 'radial' | 'directional' | 'slice' | 'shatter';

export type DestructionToolType = 
  | 'view'
  | 'impact'
  | 'slice'
  | 'configure';

export interface DestructionPreset {
  id: string;
  name: string;
  description: string;
  config: Partial<DestructibleConfig>;
  pattern: FracturePattern;
}

export interface ImpactPoint {
  position: THREE.Vector3;
  normal: THREE.Vector3;
  force: number;
}

// ============================================================================
// PRESETS
// ============================================================================

const DESTRUCTION_PRESETS: DestructionPreset[] = [
  {
    id: 'glass',
    name: 'Vidro',
    description: 'Fragmentação em muitos pedaços pequenos',
    pattern: 'shatter',
    config: {
      maxHealth: 50,
      fractureLevels: 1,
      fragmentCount: 25,
      debrisLifetime: 3,
      impactPropagation: 3.0,
    },
  },
  {
    id: 'wood',
    name: 'Madeira',
    description: 'Quebra em pedaços maiores',
    pattern: 'directional',
    config: {
      maxHealth: 100,
      fractureLevels: 2,
      fragmentCount: 8,
      debrisLifetime: 10,
      impactPropagation: 1.5,
    },
  },
  {
    id: 'concrete',
    name: 'Concreto',
    description: 'Destruição pesada com debris',
    pattern: 'voronoi',
    config: {
      maxHealth: 200,
      fractureLevels: 3,
      fragmentCount: 15,
      debrisLifetime: 15,
      impactPropagation: 2.0,
    },
  },
  {
    id: 'metal',
    name: 'Metal',
    description: 'Alta resistência, deforma antes de quebrar',
    pattern: 'slice',
    config: {
      maxHealth: 300,
      fractureLevels: 2,
      fragmentCount: 6,
      debrisLifetime: 20,
      impactPropagation: 1.0,
    },
  },
  {
    id: 'ceramic',
    name: 'Cerâmica',
    description: 'Quebra em pedaços irregulares',
    pattern: 'radial',
    config: {
      maxHealth: 30,
      fractureLevels: 1,
      fragmentCount: 12,
      debrisLifetime: 5,
      impactPropagation: 2.5,
    },
  },
  {
    id: 'ice',
    name: 'Gelo',
    description: 'Fragmentação cristalina',
    pattern: 'shatter',
    config: {
      maxHealth: 40,
      fractureLevels: 1,
      fragmentCount: 20,
      debrisLifetime: 8,
      impactPropagation: 4.0,
    },
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
  icon?: React.ReactNode;
}

function Slider({ label, value, min, max, step = 1, unit = '', onChange, icon }: SliderProps) {
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <label className="text-xs text-slate-400 flex items-center gap-1.5">
          {icon}
          {label}
        </label>
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
                   [&::-webkit-slider-thumb]:bg-red-500
                   [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:cursor-pointer"
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
// PATTERN SELECTOR
// ============================================================================

interface PatternSelectorProps {
  value: FracturePattern;
  onChange: (pattern: FracturePattern) => void;
}

function PatternSelector({ value, onChange }: PatternSelectorProps) {
  const patterns: { id: FracturePattern; label: string; icon: React.ReactNode; description: string }[] = [
    { id: 'voronoi', label: 'Voronoi', icon: <Box className="w-4 h-4" />, description: 'Células irregulares naturais' },
    { id: 'radial', label: 'Radial', icon: <CircleDot className="w-4 h-4" />, description: 'Fragmentos do centro para fora' },
    { id: 'directional', label: 'Directional', icon: <ArrowRight className="w-4 h-4" />, description: 'Seguindo direção do impacto' },
    { id: 'slice', label: 'Slice', icon: <Layers className="w-4 h-4" />, description: 'Cortes paralelos' },
    { id: 'shatter', label: 'Shatter', icon: <Sparkles className="w-4 h-4" />, description: 'Muitos fragmentos pequenos' },
  ];
  
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-slate-400 block mb-2">Fracture Pattern</label>
      {patterns.map((pattern) => (
        <button
          key={pattern.id}
          onClick={() => onChange(pattern.id)}
          className={`w-full p-2 rounded flex items-center gap-2 transition-colors ${
            value === pattern.id
              ? 'bg-red-600/30 border border-red-500 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          {pattern.icon}
          <div className="text-left">
            <div className="text-xs font-medium">{pattern.label}</div>
            <div className="text-[10px] opacity-70">{pattern.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// DESTRUCTIBLE MESH 3D
// ============================================================================

interface DestructibleMesh3DProps {
  config: DestructibleConfig;
  pattern: FracturePattern;
  fragments: THREE.Mesh[];
  showPreview: boolean;
  impactPoint: ImpactPoint | null;
  onImpactClick: (point: ImpactPoint) => void;
  selectedTool: DestructionToolType;
  health: number;
  maxHealth: number;
}

function DestructibleMesh3D({
  config,
  pattern,
  fragments,
  showPreview,
  impactPoint,
  onImpactClick,
  selectedTool,
  health,
  maxHealth,
}: DestructibleMesh3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hoverPoint, setHoverPoint] = useState<THREE.Vector3 | null>(null);
  const [isExploded, setIsExploded] = useState(false);
  
  // Original mesh geometry
  const originalGeometry = useMemo(() => {
    return new THREE.BoxGeometry(2, 2, 2);
  }, []);
  
  // Generate fracture preview
  const fracturePreview = useMemo(() => {
    if (!showPreview) return null;
    
    const generator = new VoronoiFractureGenerator(42);
    const bounds = new THREE.Box3(
      new THREE.Vector3(-1, -1, -1),
      new THREE.Vector3(1, 1, 1)
    );
    
    const pointCount = config.fragmentCount;
    const points = generator.generatePoints(bounds, pointCount);
    const cells = generator.generateCells(points, bounds);
    
    return cells.map((cell, index) => {
      const geometry = generator.cellToGeometry(cell);
      const color = new THREE.Color().setHSL(index / cells.length, 0.7, 0.5);
      return { geometry, color, center: cell.center };
    });
  }, [showPreview, config.fragmentCount]);
  
  // Handle pointer events for impact point selection
  const handlePointerMove = useCallback((event: ThreeEvent<PointerEvent>) => {
    if (selectedTool !== 'impact') return;
    
    const point = event.point.clone();
    setHoverPoint(point);
  }, [selectedTool]);
  
  const handleClick = useCallback((event: ThreeEvent<MouseEvent>) => {
    if (selectedTool !== 'impact') return;
    
    event.stopPropagation();
    
    const point = event.point.clone();
    const normal = event.face?.normal?.clone() || new THREE.Vector3(0, 1, 0);
    
    // Transform normal to world space
    if (meshRef.current) {
      normal.applyQuaternion(meshRef.current.quaternion);
    }
    
    onImpactClick({
      position: point,
      normal: normal.normalize(),
      force: 100, // Default force
    });
  }, [selectedTool, onImpactClick]);
  
  // Health bar color
  const healthPercent = health / maxHealth;
  const healthColor = healthPercent > 0.6 ? '#22c55e' : healthPercent > 0.3 ? '#eab308' : '#ef4444';
  
  return (
    <group>
      {/* Original mesh or fragments */}
      {!isExploded ? (
        <mesh
          ref={meshRef}
          geometry={originalGeometry}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverPoint(null)}
          onClick={handleClick}
        >
          <meshStandardMaterial
            color="#4a6fa5"
            metalness={0.2}
            roughness={0.8}
            transparent={showPreview}
            opacity={showPreview ? 0.3 : 1}
          />
        </mesh>
      ) : (
        fragments.map((fragment, i) => (
          <primitive key={i} object={fragment} />
        ))
      )}
      
      {/* Fracture preview overlay */}
      {showPreview && fracturePreview && fracturePreview.map((cell, index) => (
        <mesh key={index} geometry={cell.geometry} position={cell.center}>
          <meshStandardMaterial
            color={cell.color}
            transparent
            opacity={0.7}
            wireframe
          />
        </mesh>
      ))}
      
      {/* Hover indicator for impact tool */}
      {hoverPoint && selectedTool === 'impact' && (
        <group position={hoverPoint}>
          <mesh>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshBasicMaterial color="#ff0000" />
          </mesh>
          <mesh>
            <ringGeometry args={[0.15, 0.2, 32]} />
            <meshBasicMaterial color="#ff0000" side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}
      
      {/* Impact point marker */}
      {impactPoint && (
        <group position={impactPoint.position}>
          <mesh>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshBasicMaterial color="#ff4444" />
          </mesh>
          {/* Arrow showing impact direction */}
          <arrowHelper
            args={[
              impactPoint.normal.clone().negate(),
              new THREE.Vector3(0, 0, 0),
              0.5,
              0xff4444,
            ]}
          />
          <Html position={[0.3, 0.3, 0]}>
            <div className="bg-slate-900/90 px-2 py-1 rounded text-xs text-white whitespace-nowrap">
              Impact: {impactPoint.force.toFixed(0)} N
            </div>
          </Html>
        </group>
      )}
      
      {/* Health bar above mesh */}
      <Html position={[0, 1.8, 0]} center>
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1 text-xs text-white">
            <Heart className="w-3 h-3" style={{ color: healthColor }} />
            <span>{health.toFixed(0)} / {maxHealth}</span>
          </div>
          <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full transition-all duration-300"
              style={{ 
                width: `${healthPercent * 100}%`,
                backgroundColor: healthColor,
              }}
            />
          </div>
        </div>
      </Html>
    </group>
  );
}

// ============================================================================
// DESTRUCTION LEVELS VISUALIZER
// ============================================================================

interface DestructionLevelsProps {
  levels: number;
  currentLevel: number;
  health: number;
  maxHealth: number;
}

function DestructionLevels({ levels, currentLevel, health, maxHealth }: DestructionLevelsProps) {
  const healthPerLevel = maxHealth / levels;
  
  return (
    <div className="space-y-1.5">
      {Array.from({ length: levels }).map((_, i) => {
        const levelHealth = Math.max(0, Math.min(healthPerLevel, health - i * healthPerLevel));
        const percent = levelHealth / healthPerLevel;
        const isActive = i === currentLevel;
        
        return (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded flex items-center justify-center text-xs ${
              isActive ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-400'
            }`}>
              {levels - i}
            </div>
            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-red-600 to-orange-500 transition-all"
                style={{ width: `${percent * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 w-8">
              {(percent * 100).toFixed(0)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// TOOLBAR
// ============================================================================

interface ToolbarProps {
  selectedTool: DestructionToolType;
  onToolChange: (tool: DestructionToolType) => void;
  onPreviewDestruction: () => void;
  onReset: () => void;
}

function Toolbar({ selectedTool, onToolChange, onPreviewDestruction, onReset }: ToolbarProps) {
  const tools: { id: DestructionToolType; icon: React.ReactNode; label: string }[] = [
    { id: 'view', icon: <Eye className="w-4 h-4" />, label: 'View' },
    { id: 'impact', icon: <Target className="w-4 h-4" />, label: 'Set Impact Point' },
    { id: 'configure', icon: <Settings className="w-4 h-4" />, label: 'Configure' },
  ];
  
  return (
    <div className="flex flex-col gap-1 p-2 bg-slate-800/90 rounded-lg">
      {/* Action buttons */}
      <button
        onClick={onPreviewDestruction}
        className="p-2 rounded bg-red-600 text-white hover:bg-red-500 transition-colors"
        title="Test Destruction"
      >
        <Bomb className="w-4 h-4" />
      </button>
      
      <button
        onClick={onReset}
        className="p-2 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
        title="Reset"
      >
        <RotateCcw className="w-4 h-4" />
      </button>
      
      <div className="h-px bg-slate-700 my-2" />
      
      {/* Tools */}
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => onToolChange(tool.id)}
          className={`p-2 rounded transition-colors ${
            selectedTool === tool.id
              ? 'bg-red-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
          title={tool.label}
        >
          {tool.icon}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN DESTRUCTION EDITOR
// ============================================================================

export interface DestructionEditorProps {
  meshId?: string;
  initialConfig?: Partial<DestructibleConfig>;
  onFragmentGenerated?: (fragments: FragmentData[]) => void;
  onExport?: (data: { config: DestructibleConfig; pattern: FracturePattern }) => void;
}

export default function DestructionEditor({
  meshId,
  initialConfig,
  onFragmentGenerated,
  onExport,
}: DestructionEditorProps) {
  // Configuration
  const [config, setConfig] = useState<DestructibleConfig>({
    maxHealth: 100,
    fractureLevels: 3,
    fragmentCount: 12,
    debrisLifetime: 10,
    impactPropagation: 2.0,
    enablePhysics: true,
    enableSound: true,
    enableVFX: true,
    ...initialConfig,
  });
  
  // Editor state
  const [pattern, setPattern] = useState<FracturePattern>('voronoi');
  const [selectedTool, setSelectedTool] = useState<DestructionToolType>('view');
  const [showPreview, setShowPreview] = useState(false);
  const [impactPoint, setImpactPoint] = useState<ImpactPoint | null>(null);
  const [currentHealth, setCurrentHealth] = useState(config.maxHealth);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [fragments, setFragments] = useState<THREE.Mesh[]>([]);
  const [events, setEvents] = useState<DestructionEvent[]>([]);
  
  // Apply preset
  const applyPreset = useCallback((preset: DestructionPreset) => {
    setConfig((prev) => ({ ...prev, ...preset.config }));
    setPattern(preset.pattern);
    setCurrentHealth(preset.config.maxHealth ?? config.maxHealth);
  }, [config.maxHealth]);
  
  // Handle impact
  const handleImpact = useCallback((point: ImpactPoint) => {
    setImpactPoint(point);
  }, []);
  
  // Apply damage
  const applyDamage = useCallback((damage: number) => {
    const newHealth = Math.max(0, currentHealth - damage);
    setCurrentHealth(newHealth);
    
    const healthPerLevel = config.maxHealth / config.fractureLevels;
    const newLevel = Math.min(
      config.fractureLevels - 1,
      Math.floor((config.maxHealth - newHealth) / healthPerLevel)
    );
    
    if (newLevel > currentLevel) {
      setCurrentLevel(newLevel);
      
      const event: DestructionEvent = {
        type: newHealth <= 0 ? 'destroy' : 'fracture',
        targetId: meshId || 'main',
        damage,
        impactPoint: impactPoint?.position || new THREE.Vector3(),
        impactNormal: impactPoint?.normal || new THREE.Vector3(0, 1, 0),
        impactForce: impactPoint?.force || damage,
      };
      
      setEvents((prev) => [...prev, event]);
    }
  }, [currentHealth, currentLevel, config, impactPoint, meshId]);
  
  // Preview destruction
  const previewDestruction = useCallback(() => {
    if (impactPoint) {
      applyDamage(impactPoint.force);
    } else {
      applyDamage(50);
    }
  }, [impactPoint, applyDamage]);
  
  // Reset
  const reset = useCallback(() => {
    setCurrentHealth(config.maxHealth);
    setCurrentLevel(0);
    setFragments([]);
    setImpactPoint(null);
    setEvents([]);
  }, [config.maxHealth]);
  
  // Update max health when config changes
  useEffect(() => {
    setCurrentHealth(config.maxHealth);
  }, [config.maxHealth]);
  
  // Export
  const handleExport = useCallback(() => {
    onExport?.({ config, pattern });
  }, [config, pattern, onExport]);
  
  return (
    <div className="flex h-full w-full bg-slate-900 text-slate-200">
      {/* Toolbar */}
      <div className="p-2">
        <Toolbar
          selectedTool={selectedTool}
          onToolChange={setSelectedTool}
          onPreviewDestruction={previewDestruction}
          onReset={reset}
        />
      </div>
      
      {/* 3D Viewport */}
      <div className="flex-1 relative">
        <Canvas camera={{ position: [4, 4, 4], fov: 50 }}>
          <color attach="background" args={['#0f172a']} />
          
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
          <pointLight position={[-5, 5, -5]} intensity={0.5} color="#ff6600" />
          
          <DestructibleMesh3D
            config={config}
            pattern={pattern}
            fragments={fragments}
            showPreview={showPreview}
            impactPoint={impactPoint}
            onImpactClick={handleImpact}
            selectedTool={selectedTool}
            health={currentHealth}
            maxHealth={config.maxHealth}
          />
          
          <Grid infiniteGrid fadeDistance={30} />
          <OrbitControls makeDefault />
          <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
            <GizmoViewport />
          </GizmoHelper>
          <Environment preset="warehouse" />
        </Canvas>
        
        {/* Viewport info */}
        <div className="absolute top-4 left-4 bg-slate-900/90 p-3 rounded">
          <div className="text-xs text-slate-400 mb-2">Destruction Status</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <Heart className="w-3 h-3 text-red-400" />
              <span>Health: {currentHealth.toFixed(0)} / {config.maxHealth}</span>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="w-3 h-3 text-orange-400" />
              <span>Level: {currentLevel + 1} / {config.fractureLevels}</span>
            </div>
            <div className="flex items-center gap-2">
              <Box className="w-3 h-3 text-blue-400" />
              <span>Fragments: {config.fragmentCount}</span>
            </div>
          </div>
        </div>
        
        {/* Events log */}
        {events.length > 0 && (
          <div className="absolute bottom-4 left-4 bg-slate-900/90 p-2 rounded max-w-xs max-h-32 overflow-y-auto">
            <div className="text-xs text-slate-400 mb-1">Events</div>
            {events.slice(-5).map((event, i) => (
              <div key={i} className="text-[10px] text-slate-300 flex items-center gap-1">
                {event.type === 'destroy' ? (
                  <Bomb className="w-2.5 h-2.5 text-red-400" />
                ) : (
                  <Zap className="w-2.5 h-2.5 text-orange-400" />
                )}
                {event.type}: {event.damage.toFixed(0)} damage
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Settings Panel */}
      <div className="w-72 bg-slate-850 border-l border-slate-700 overflow-y-auto">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Hammer className="w-5 h-5 text-red-400" />
              Destruction
            </h2>
            <button
              onClick={handleExport}
              className="p-1.5 rounded bg-red-600 hover:bg-red-500 transition-colors"
              title="Export Configuration"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
          
          {/* Presets */}
          <CollapsibleSection title="Material Presets" icon={<Zap className="w-4 h-4 text-yellow-400" />}>
            <div className="grid grid-cols-2 gap-1.5">
              {DESTRUCTION_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className="p-2 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 
                           transition-colors text-left"
                >
                  <div className="text-xs font-medium">{preset.name}</div>
                  <div className="text-[10px] opacity-70 truncate">{preset.description}</div>
                </button>
              ))}
            </div>
          </CollapsibleSection>
          
          {/* Fracture Pattern */}
          <CollapsibleSection title="Fracture Pattern" icon={<Sparkles className="w-4 h-4 text-blue-400" />}>
            <PatternSelector value={pattern} onChange={setPattern} />
            
            <div className="mt-3 flex items-center justify-between">
              <label className="text-xs text-slate-400">Show Preview</label>
              <input
                type="checkbox"
                checked={showPreview}
                onChange={(e) => setShowPreview(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-red-600"
              />
            </div>
          </CollapsibleSection>
          
          {/* Health & Damage */}
          <CollapsibleSection title="Health & Damage" icon={<Shield className="w-4 h-4 text-green-400" />}>
            <Slider
              label="Max Health"
              value={config.maxHealth}
              min={10}
              max={500}
              step={10}
              unit=" HP"
              onChange={(v) => setConfig((p) => ({ ...p, maxHealth: v }))}
              icon={<Heart className="w-3 h-3 text-red-400" />}
            />
            
            <Slider
              label="Fracture Levels"
              value={config.fractureLevels}
              min={1}
              max={5}
              step={1}
              onChange={(v) => setConfig((p) => ({ ...p, fractureLevels: v }))}
              icon={<Layers className="w-3 h-3 text-orange-400" />}
            />
            
            <div className="mt-3">
              <label className="text-xs text-slate-400 block mb-2">Destruction Levels</label>
              <DestructionLevels
                levels={config.fractureLevels}
                currentLevel={currentLevel}
                health={currentHealth}
                maxHealth={config.maxHealth}
              />
            </div>
            
            {/* Quick damage buttons */}
            <div className="mt-3 grid grid-cols-4 gap-1">
              {[10, 25, 50, 100].map((dmg) => (
                <button
                  key={dmg}
                  onClick={() => applyDamage(dmg)}
                  className="p-1.5 text-xs bg-red-900/50 hover:bg-red-800/50 rounded 
                           text-red-300 transition-colors"
                >
                  -{dmg}
                </button>
              ))}
            </div>
          </CollapsibleSection>
          
          {/* Fragment Settings */}
          <CollapsibleSection title="Fragments" icon={<Box className="w-4 h-4 text-blue-400" />}>
            <Slider
              label="Fragment Count"
              value={config.fragmentCount}
              min={4}
              max={50}
              step={1}
              onChange={(v) => setConfig((p) => ({ ...p, fragmentCount: v }))}
            />
            
            <Slider
              label="Debris Lifetime"
              value={config.debrisLifetime}
              min={1}
              max={30}
              step={1}
              unit="s"
              onChange={(v) => setConfig((p) => ({ ...p, debrisLifetime: v }))}
              icon={<Timer className="w-3 h-3 text-slate-400" />}
            />
            
            <Slider
              label="Impact Propagation"
              value={config.impactPropagation}
              min={0.5}
              max={5}
              step={0.1}
              onChange={(v) => setConfig((p) => ({ ...p, impactPropagation: v }))}
            />
          </CollapsibleSection>
          
          {/* Effects */}
          <CollapsibleSection title="Effects" icon={<Sparkles className="w-4 h-4 text-cyan-400" />} defaultOpen={false}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Zap className="w-3 h-3" /> Physics
                </label>
                <input
                  type="checkbox"
                  checked={config.enablePhysics}
                  onChange={(e) => setConfig((p) => ({ ...p, enablePhysics: e.target.checked }))}
                  className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-red-600"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Volume2 className="w-3 h-3" /> Sound
                </label>
                <input
                  type="checkbox"
                  checked={config.enableSound}
                  onChange={(e) => setConfig((p) => ({ ...p, enableSound: e.target.checked }))}
                  className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-red-600"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> VFX
                </label>
                <input
                  type="checkbox"
                  checked={config.enableVFX}
                  onChange={(e) => setConfig((p) => ({ ...p, enableVFX: e.target.checked }))}
                  className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-red-600"
                />
              </div>
            </div>
          </CollapsibleSection>
          
          {/* Impact Point */}
          {impactPoint && (
            <CollapsibleSection title="Impact Point" icon={<Target className="w-4 h-4 text-red-400" />}>
              <div className="text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Position:</span>
                  <span className="font-mono">
                    ({impactPoint.position.x.toFixed(2)}, {impactPoint.position.y.toFixed(2)}, {impactPoint.position.z.toFixed(2)})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Normal:</span>
                  <span className="font-mono">
                    ({impactPoint.normal.x.toFixed(2)}, {impactPoint.normal.y.toFixed(2)}, {impactPoint.normal.z.toFixed(2)})
                  </span>
                </div>
                <Slider
                  label="Force"
                  value={impactPoint.force}
                  min={10}
                  max={500}
                  step={10}
                  unit=" N"
                  onChange={(v) => setImpactPoint((p) => p ? { ...p, force: v } : null)}
                />
                <button
                  onClick={() => setImpactPoint(null)}
                  className="w-full p-1.5 mt-2 text-xs bg-slate-700 hover:bg-slate-600 rounded"
                >
                  Clear Impact Point
                </button>
              </div>
            </CollapsibleSection>
          )}
        </div>
      </div>
    </div>
  );
}
