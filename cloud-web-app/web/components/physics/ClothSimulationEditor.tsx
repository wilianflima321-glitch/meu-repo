/**
 * CLOTH SIMULATION EDITOR - Aethel Engine
 * 
 * Editor visual profissional para simulação de tecidos.
 * Integra diretamente com cloth-simulation.ts para resultados em tempo real.
 * 
 * FEATURES:
 * - Configuração completa de parâmetros físicos
 * - Pin vertices com seleção visual interativa
 * - Preview em tempo real com controles de câmera
 * - Múltiplos tipos de constraint (distance, bending, shear)
 * - Self-collision configurável
 * - Wind simulation com direção visual
 * - Export para runtime otimizado
 * - Presets profissionais (silk, cotton, leather, etc)
 */

'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  Grid, 
  Environment, 
  GizmoHelper,
  GizmoViewport,
  Line,
  Html,
  TransformControls,
} from '@react-three/drei';
import * as THREE from 'three';
import { 
  Layers, 
  Play, 
  Pause, 
  RotateCcw, 
  Wind, 
  Pin, 
  Download,
  Settings,
  Eye,
  EyeOff,
  Scissors,
  Move,
  ChevronDown,
  ChevronRight,
  Save,
  Upload,
  Zap,
  Box,
  Circle,
} from 'lucide-react';
import { 
  ClothSimulation, 
  ClothConfig, 
  ClothConstraint, 
  ClothCollider,
} from '@/lib/cloth-simulation';

// ============================================================================
// TYPES
// ============================================================================

export type ClothToolType = 
  | 'select'
  | 'pin'
  | 'unpin'
  | 'tear'
  | 'move_collider';

export type ConstraintType = 'structural' | 'shear' | 'bend';

export interface ClothPreset {
  id: string;
  name: string;
  description: string;
  config: Partial<ClothConfig>;
}

export interface ClothEditorState {
  selectedVertices: Set<number>;
  pinnedVertices: Set<number>;
  isSimulating: boolean;
  showConstraints: boolean;
  showWireframe: boolean;
  showColliders: boolean;
  currentPreset: string | null;
}

// ============================================================================
// PRESETS PROFISSIONAIS
// ============================================================================

const CLOTH_PRESETS: ClothPreset[] = [
  {
    id: 'silk',
    name: 'Seda',
    description: 'Tecido leve e fluido',
    config: {
      mass: 0.3,
      stiffness: 0.6,
      damping: 0.02,
      iterations: 15,
      tearThreshold: 0.8,
    },
  },
  {
    id: 'cotton',
    name: 'Algodão',
    description: 'Tecido médio, comportamento natural',
    config: {
      mass: 0.5,
      stiffness: 0.8,
      damping: 0.05,
      iterations: 12,
      tearThreshold: 1.2,
    },
  },
  {
    id: 'denim',
    name: 'Jeans',
    description: 'Tecido pesado e rígido',
    config: {
      mass: 0.8,
      stiffness: 0.95,
      damping: 0.1,
      iterations: 10,
      tearThreshold: 2.0,
    },
  },
  {
    id: 'leather',
    name: 'Couro',
    description: 'Material rígido com pouca flexibilidade',
    config: {
      mass: 1.0,
      stiffness: 0.98,
      damping: 0.15,
      iterations: 8,
      tearThreshold: 3.0,
    },
  },
  {
    id: 'rubber',
    name: 'Borracha',
    description: 'Material elástico',
    config: {
      mass: 0.6,
      stiffness: 0.4,
      damping: 0.08,
      iterations: 20,
      tearThreshold: 5.0,
    },
  },
  {
    id: 'flag',
    name: 'Bandeira',
    description: 'Otimizado para bandeiras ao vento',
    config: {
      mass: 0.2,
      stiffness: 0.7,
      damping: 0.03,
      iterations: 12,
      tearThreshold: 1.5,
      windVariation: 0.3,
    },
  },
  {
    id: 'cape',
    name: 'Capa',
    description: 'Para capas de personagens',
    config: {
      mass: 0.4,
      stiffness: 0.75,
      damping: 0.04,
      iterations: 14,
      tearThreshold: 1.8,
    },
  },
  {
    id: 'curtain',
    name: 'Cortina',
    description: 'Tecido pesado para cortinas',
    config: {
      mass: 0.7,
      stiffness: 0.85,
      damping: 0.12,
      iterations: 10,
      tearThreshold: 2.5,
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
  tooltip?: string;
}

function Slider({ label, value, min, max, step = 0.01, unit = '', onChange, tooltip }: SliderProps) {
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <label className="text-xs text-slate-400" title={tooltip}>{label}</label>
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
                   [&::-webkit-slider-thumb]:bg-sky-500
                   [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:cursor-pointer
                   [&::-webkit-slider-thumb]:hover:bg-sky-400
                   [&::-webkit-slider-thumb]:transition-colors"
      />
    </div>
  );
}

// ============================================================================
// VECTOR3 INPUT COMPONENT
// ============================================================================

interface Vector3InputProps {
  label: string;
  value: { x: number; y: number; z: number };
  onChange: (value: { x: number; y: number; z: number }) => void;
  min?: number;
  max?: number;
  step?: number;
}

function Vector3Input({ label, value, onChange, min = -100, max = 100, step = 0.1 }: Vector3InputProps) {
  return (
    <div className="mb-3">
      <label className="text-xs text-slate-400 block mb-1.5">{label}</label>
      <div className="grid grid-cols-3 gap-1.5">
        {(['x', 'y', 'z'] as const).map((axis) => (
          <div key={axis} className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-500 uppercase">
              {axis}
            </span>
            <input
              type="number"
              value={value[axis]}
              min={min}
              max={max}
              step={step}
              onChange={(e) => onChange({ ...value, [axis]: parseFloat(e.target.value) || 0 })}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 pl-6
                       text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
            />
          </div>
        ))}
      </div>
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
// CLOTH MESH 3D COMPONENT
// ============================================================================

interface ClothMesh3DProps {
  simulation: ClothSimulation | null;
  config: ClothConfig;
  editorState: ClothEditorState;
  onVertexClick: (index: number, shiftKey: boolean) => void;
  selectedTool: ClothToolType;
}

function ClothMesh3D({ 
  simulation, 
  config, 
  editorState, 
  onVertexClick,
  selectedTool,
}: ClothMesh3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  
  const [hoverVertex, setHoverVertex] = useState<number | null>(null);
  
  // Create geometry from simulation
  const { geometry, pointsGeometry, constraintGeometry } = useMemo(() => {
    if (!simulation) return { geometry: null, pointsGeometry: null, constraintGeometry: null };
    
    const segmentsX = config.segmentsX;
    const segmentsY = config.segmentsY;
    const particles = simulation.particles;
    
    // Cloth mesh geometry
    const geo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    
    for (const p of particles) {
      positions.push(p.position.x, p.position.y, p.position.z);
      uvs.push(
        (p.index % (segmentsX + 1)) / segmentsX,
        Math.floor(p.index / (segmentsX + 1)) / segmentsY
      );
    }
    
    // Create indices for quad mesh
    for (let j = 0; j < segmentsY; j++) {
      for (let i = 0; i < segmentsX; i++) {
        const a = j * (segmentsX + 1) + i;
        const b = a + 1;
        const c = a + (segmentsX + 1);
        const d = c + 1;
        
        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }
    
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    
    // Points geometry for vertex selection
    const pointsGeo = new THREE.BufferGeometry();
    const pointPositions: number[] = [];
    const pointColors: number[] = [];
    
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      pointPositions.push(p.position.x, p.position.y, p.position.z);
      
      if (editorState.pinnedVertices.has(i)) {
        pointColors.push(1, 0.3, 0.3); // Red for pinned
      } else if (editorState.selectedVertices.has(i)) {
        pointColors.push(0.3, 0.8, 1); // Cyan for selected
      } else {
        pointColors.push(0.5, 0.5, 0.5); // Gray for normal
      }
    }
    
    pointsGeo.setAttribute('position', new THREE.Float32BufferAttribute(pointPositions, 3));
    pointsGeo.setAttribute('color', new THREE.Float32BufferAttribute(pointColors, 3));
    
    // Constraint lines geometry
    const constraintGeo = new THREE.BufferGeometry();
    const linePositions: number[] = [];
    const lineColors: number[] = [];
    
    if (editorState.showConstraints) {
      for (const constraint of simulation.constraints) {
        if (constraint.broken) continue;
        
        const p1 = particles[constraint.p1];
        const p2 = particles[constraint.p2];
        
        linePositions.push(p1.position.x, p1.position.y, p1.position.z);
        linePositions.push(p2.position.x, p2.position.y, p2.position.z);
        
        // Color by constraint type
        let color: [number, number, number];
        switch (constraint.type) {
          case 'structural': color = [0.2, 0.8, 0.2]; break;
          case 'shear': color = [0.8, 0.8, 0.2]; break;
          case 'bend': color = [0.2, 0.2, 0.8]; break;
          default: color = [0.5, 0.5, 0.5];
        }
        
        lineColors.push(...color, ...color);
      }
    }
    
    constraintGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    constraintGeo.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));
    
    return { geometry: geo, pointsGeometry: pointsGeo, constraintGeometry: constraintGeo };
  }, [simulation, config, editorState.selectedVertices, editorState.pinnedVertices, editorState.showConstraints]);
  
  // Update simulation each frame
  useFrame((_, delta) => {
    if (!simulation || !editorState.isSimulating) return;
    
    simulation.update(Math.min(delta, 0.033)); // Cap at ~30fps physics
    
    // Update mesh geometry
    if (meshRef.current && geometry) {
      const positions = geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < simulation.particles.length; i++) {
        const p = simulation.particles[i];
        positions[i * 3] = p.position.x;
        positions[i * 3 + 1] = p.position.y;
        positions[i * 3 + 2] = p.position.z;
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.computeVertexNormals();
    }
    
    // Update points
    if (pointsRef.current && pointsGeometry) {
      const positions = pointsGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < simulation.particles.length; i++) {
        const p = simulation.particles[i];
        positions[i * 3] = p.position.x;
        positions[i * 3 + 1] = p.position.y;
        positions[i * 3 + 2] = p.position.z;
      }
      pointsGeometry.attributes.position.needsUpdate = true;
    }
  });
  
  // Handle vertex click
  const handlePointClick = useCallback((event: THREE.Event) => {
    if (!simulation) return;
    
    const intersection = (event as any).intersections?.[0];
    if (intersection && intersection.index !== undefined) {
      onVertexClick(intersection.index, (event as any).shiftKey || false);
    }
  }, [simulation, onVertexClick]);
  
  if (!geometry || !pointsGeometry) return null;
  
  return (
    <group>
      {/* Cloth mesh */}
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial 
          color="#4a90d9"
          side={THREE.DoubleSide}
          wireframe={editorState.showWireframe}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>
      
      {/* Vertex points */}
      <points 
        ref={pointsRef} 
        geometry={pointsGeometry}
        onClick={handlePointClick}
      >
        <pointsMaterial 
          size={selectedTool === 'pin' || selectedTool === 'unpin' ? 12 : 6}
          vertexColors
          sizeAttenuation={false}
        />
      </points>
      
      {/* Constraint lines */}
      {editorState.showConstraints && constraintGeometry && (
        <lineSegments ref={linesRef} geometry={constraintGeometry}>
          <lineBasicMaterial vertexColors transparent opacity={0.5} />
        </lineSegments>
      )}
    </group>
  );
}

// ============================================================================
// COLLIDER VISUALIZER
// ============================================================================

interface ColliderVisualizerProps {
  colliders: ClothCollider[];
  showColliders: boolean;
  onColliderSelect: (index: number) => void;
  selectedCollider: number | null;
}

function ColliderVisualizer({ 
  colliders, 
  showColliders, 
  onColliderSelect,
  selectedCollider,
}: ColliderVisualizerProps) {
  if (!showColliders) return null;
  
  return (
    <group>
      {colliders.map((collider, index) => {
        const isSelected = selectedCollider === index;
        const color = isSelected ? '#ffaa00' : '#00aaff';
        
        switch (collider.type) {
          case 'sphere':
            return (
              <mesh 
                key={index} 
                position={collider.position}
                onClick={() => onColliderSelect(index)}
              >
                <sphereGeometry args={[collider.radius || 1, 16, 16]} />
                <meshBasicMaterial color={color} wireframe transparent opacity={0.5} />
              </mesh>
            );
          case 'plane':
            return (
              <mesh 
                key={index} 
                position={collider.position}
                rotation={new THREE.Euler().setFromQuaternion(
                  new THREE.Quaternion().setFromUnitVectors(
                    new THREE.Vector3(0, 1, 0),
                    collider.normal || new THREE.Vector3(0, 1, 0)
                  )
                )}
                onClick={() => onColliderSelect(index)}
              >
                <planeGeometry args={[10, 10]} />
                <meshBasicMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.3} />
              </mesh>
            );
          case 'box':
            return (
              <mesh 
                key={index} 
                position={collider.position}
                onClick={() => onColliderSelect(index)}
              >
                <boxGeometry args={[
                  collider.size?.x || 1,
                  collider.size?.y || 1,
                  collider.size?.z || 1,
                ]} />
                <meshBasicMaterial color={color} wireframe transparent opacity={0.5} />
              </mesh>
            );
          default:
            return null;
        }
      })}
    </group>
  );
}

// ============================================================================
// WIND ARROW VISUALIZER
// ============================================================================

interface WindArrowProps {
  direction: { x: number; y: number; z: number };
  strength: number;
  visible: boolean;
}

function WindArrow({ direction, strength, visible }: WindArrowProps) {
  if (!visible || strength === 0) return null;
  
  const length = strength * 2;
  const dir = new THREE.Vector3(direction.x, direction.y, direction.z).normalize();
  const end = dir.clone().multiplyScalar(length);
  
  return (
    <group position={[0, 3, 0]}>
      <Line
        points={[[0, 0, 0], end.toArray()]}
        color="#00ff88"
        lineWidth={3}
      />
      <mesh position={end}>
        <coneGeometry args={[0.15, 0.4, 8]} />
        <meshBasicMaterial color="#00ff88" />
      </mesh>
      <Html position={end.clone().add(new THREE.Vector3(0.3, 0.3, 0))}>
        <div className="text-xs text-green-400 whitespace-nowrap bg-slate-900/80 px-1 rounded">
          Wind: {strength.toFixed(1)}
        </div>
      </Html>
    </group>
  );
}

// ============================================================================
// TOOLBAR COMPONENT
// ============================================================================

interface ToolbarProps {
  selectedTool: ClothToolType;
  onToolChange: (tool: ClothToolType) => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  onReset: () => void;
}

function Toolbar({ 
  selectedTool, 
  onToolChange, 
  isSimulating, 
  onToggleSimulation,
  onReset,
}: ToolbarProps) {
  const tools: { id: ClothToolType; icon: React.ReactNode; label: string }[] = [
    { id: 'select', icon: <Move className="w-4 h-4" />, label: 'Select' },
    { id: 'pin', icon: <Pin className="w-4 h-4" />, label: 'Pin Vertices' },
    { id: 'unpin', icon: <Pin className="w-4 h-4 text-red-400" />, label: 'Unpin' },
    { id: 'tear', icon: <Scissors className="w-4 h-4" />, label: 'Tear' },
    { id: 'move_collider', icon: <Box className="w-4 h-4" />, label: 'Move Collider' },
  ];
  
  return (
    <div className="flex flex-col gap-1 p-2 bg-slate-800/90 rounded-lg">
      {/* Simulation controls */}
      <button
        onClick={onToggleSimulation}
        className={`p-2 rounded transition-colors ${
          isSimulating 
            ? 'bg-green-600 text-white' 
            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
        }`}
        title={isSimulating ? 'Pause Simulation' : 'Play Simulation'}
      >
        {isSimulating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>
      
      <button
        onClick={onReset}
        className="p-2 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
        title="Reset Simulation"
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
              ? 'bg-sky-600 text-white'
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
// MAIN CLOTH SIMULATION EDITOR
// ============================================================================

export interface ClothSimulationEditorProps {
  meshId?: string;
  initialConfig?: Partial<ClothConfig>;
  onSimulationUpdate?: (config: ClothConfig) => void;
  onExport?: (data: { config: ClothConfig; pinnedVertices: number[] }) => void;
}

export default function ClothSimulationEditor({
  meshId,
  initialConfig,
  onSimulationUpdate,
  onExport,
}: ClothSimulationEditorProps) {
  // Configuration state
  const [config, setConfig] = useState<ClothConfig>({
    width: 4,
    height: 4,
    segmentsX: 20,
    segmentsY: 20,
    mass: 0.5,
    stiffness: 0.8,
    damping: 0.05,
    gravity: new THREE.Vector3(0, -9.81, 0),
    wind: new THREE.Vector3(0, 0, 0),
    windVariation: 0.1,
    iterations: 12,
    tearThreshold: 1.5,
    selfCollision: false,
    groundPlane: true,
    groundHeight: -2,
    ...initialConfig,
  });
  
  // Editor state
  const [editorState, setEditorState] = useState<ClothEditorState>({
    selectedVertices: new Set(),
    pinnedVertices: new Set([0, 1, 2, 3, 4]), // Default: pin top row
    isSimulating: false,
    showConstraints: false,
    showWireframe: false,
    showColliders: true,
    currentPreset: null,
  });
  
  // Tool state
  const [selectedTool, setSelectedTool] = useState<ClothToolType>('select');
  const [showWindArrow, setShowWindArrow] = useState(true);
  
  // Colliders
  const [colliders, setColliders] = useState<ClothCollider[]>([
    {
      type: 'sphere',
      position: new THREE.Vector3(0, 0, 0),
      radius: 0.5,
    },
  ]);
  const [selectedCollider, setSelectedCollider] = useState<number | null>(null);
  
  // Simulation instance
  const [simulation, setSimulation] = useState<ClothSimulation | null>(null);
  
  // Initialize simulation
  useEffect(() => {
    const sim = new ClothSimulation(config);
    
    // Apply pinned vertices
    for (const idx of editorState.pinnedVertices) {
      if (sim.particles[idx]) {
        sim.particles[idx].pinned = true;
      }
    }
    
    // Add colliders
    sim.setColliders(colliders);
    
    setSimulation(sim);
  }, [config, colliders, editorState.pinnedVertices]);
  
  // Update simulation config when changed
  useEffect(() => {
    if (simulation) {
      simulation.updateConfig(config);
      simulation.setColliders(colliders);
      onSimulationUpdate?.(config);
    }
  }, [simulation, config, colliders, onSimulationUpdate]);
  
  // Handle vertex click
  const handleVertexClick = useCallback((index: number, shiftKey: boolean) => {
    if (!simulation) return;
    
    setEditorState((prev) => {
      const newState = { ...prev };
      
      switch (selectedTool) {
        case 'select':
          if (shiftKey) {
            const newSelection = new Set(prev.selectedVertices);
            if (newSelection.has(index)) {
              newSelection.delete(index);
            } else {
              newSelection.add(index);
            }
            newState.selectedVertices = newSelection;
          } else {
            newState.selectedVertices = new Set([index]);
          }
          break;
          
        case 'pin':
          const newPinned = new Set(prev.pinnedVertices);
          newPinned.add(index);
          newState.pinnedVertices = newPinned;
          if (simulation.particles[index]) {
            simulation.particles[index].pinned = true;
          }
          break;
          
        case 'unpin':
          const unpinned = new Set(prev.pinnedVertices);
          unpinned.delete(index);
          newState.pinnedVertices = unpinned;
          if (simulation.particles[index]) {
            simulation.particles[index].pinned = false;
          }
          break;
          
        case 'tear':
          // Mark constraints connected to this vertex as broken
          for (const constraint of simulation.constraints) {
            if (constraint.p1 === index || constraint.p2 === index) {
              constraint.broken = true;
            }
          }
          break;
      }
      
      return newState;
    });
  }, [simulation, selectedTool]);
  
  // Apply preset
  const applyPreset = useCallback((preset: ClothPreset) => {
    setConfig((prev) => ({
      ...prev,
      ...preset.config,
      gravity: prev.gravity,
      wind: prev.wind,
    }));
    setEditorState((prev) => ({
      ...prev,
      currentPreset: preset.id,
    }));
  }, []);
  
  // Reset simulation
  const resetSimulation = useCallback(() => {
    const sim = new ClothSimulation(config);
    for (const idx of editorState.pinnedVertices) {
      if (sim.particles[idx]) {
        sim.particles[idx].pinned = true;
      }
    }
    sim.setColliders(colliders);
    setSimulation(sim);
    setEditorState((prev) => ({ ...prev, isSimulating: false }));
  }, [config, editorState.pinnedVertices, colliders]);
  
  // Export configuration
  const handleExport = useCallback(() => {
    onExport?.({
      config,
      pinnedVertices: Array.from(editorState.pinnedVertices),
    });
  }, [config, editorState.pinnedVertices, onExport]);
  
  // Add collider
  const addCollider = useCallback((type: ClothCollider['type']) => {
    const newCollider: ClothCollider = {
      type,
      position: new THREE.Vector3(0, -1, 0),
      ...(type === 'sphere' && { radius: 0.5 }),
      ...(type === 'plane' && { normal: new THREE.Vector3(0, 1, 0) }),
      ...(type === 'box' && { size: new THREE.Vector3(1, 1, 1) }),
    };
    setColliders((prev) => [...prev, newCollider]);
  }, []);
  
  // Remove selected collider
  const removeSelectedCollider = useCallback(() => {
    if (selectedCollider !== null) {
      setColliders((prev) => prev.filter((_, i) => i !== selectedCollider));
      setSelectedCollider(null);
    }
  }, [selectedCollider]);
  
  return (
    <div className="flex h-full w-full bg-slate-900 text-slate-200">
      {/* Left toolbar */}
      <div className="p-2">
        <Toolbar
          selectedTool={selectedTool}
          onToolChange={setSelectedTool}
          isSimulating={editorState.isSimulating}
          onToggleSimulation={() => setEditorState((prev) => ({ 
            ...prev, 
            isSimulating: !prev.isSimulating 
          }))}
          onReset={resetSimulation}
        />
      </div>
      
      {/* 3D Viewport */}
      <div className="flex-1 relative">
        <Canvas camera={{ position: [5, 5, 5], fov: 50 }}>
          <color attach="background" args={['#0f172a']} />
          
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
          
          <ClothMesh3D
            simulation={simulation}
            config={config}
            editorState={editorState}
            onVertexClick={handleVertexClick}
            selectedTool={selectedTool}
          />
          
          <ColliderVisualizer
            colliders={colliders}
            showColliders={editorState.showColliders}
            onColliderSelect={setSelectedCollider}
            selectedCollider={selectedCollider}
          />
          
          <WindArrow
            direction={{ x: config.wind.x, y: config.wind.y, z: config.wind.z }}
            strength={config.wind.length()}
            visible={showWindArrow}
          />
          
          {config.groundPlane && (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, config.groundHeight, 0]}>
              <planeGeometry args={[20, 20]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
          )}
          
          <Grid infiniteGrid fadeDistance={50} />
          <OrbitControls makeDefault />
          <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
            <GizmoViewport />
          </GizmoHelper>
          <Environment preset="city" />
        </Canvas>
        
        {/* Viewport overlay info */}
        <div className="absolute top-4 left-4 bg-slate-900/80 p-2 rounded text-xs">
          <div className="text-slate-400">
            Vertices: {simulation?.particles.length ?? 0}
          </div>
          <div className="text-slate-400">
            Constraints: {simulation?.constraints.filter(c => !c.broken).length ?? 0}
          </div>
          <div className="text-slate-400">
            Pinned: {editorState.pinnedVertices.size}
          </div>
          {editorState.isSimulating && (
            <div className="text-green-400 mt-1">● Simulating</div>
          )}
        </div>
      </div>
      
      {/* Right panel - Settings */}
      <div className="w-72 bg-slate-850 border-l border-slate-700 overflow-y-auto">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Layers className="w-5 h-5 text-sky-400" />
              Cloth Settings
            </h2>
            <button
              onClick={handleExport}
              className="p-1.5 rounded bg-sky-600 hover:bg-sky-500 transition-colors"
              title="Export Configuration"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
          
          {/* Presets */}
          <CollapsibleSection title="Presets" icon={<Zap className="w-4 h-4 text-yellow-400" />}>
            <div className="grid grid-cols-2 gap-1.5">
              {CLOTH_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className={`p-2 rounded text-left transition-colors ${
                    editorState.currentPreset === preset.id
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <div className="text-xs font-medium">{preset.name}</div>
                  <div className="text-[10px] opacity-70 truncate">{preset.description}</div>
                </button>
              ))}
            </div>
          </CollapsibleSection>
          
          {/* Physics Parameters */}
          <CollapsibleSection title="Physics" icon={<Settings className="w-4 h-4 text-blue-400" />}>
            <Slider
              label="Mass"
              value={config.mass}
              min={0.1}
              max={2}
              step={0.1}
              unit=" kg"
              onChange={(v) => setConfig((p) => ({ ...p, mass: v }))}
              tooltip="Total mass of the cloth"
            />
            <Slider
              label="Stiffness"
              value={config.stiffness}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => setConfig((p) => ({ ...p, stiffness: v }))}
              tooltip="How rigid the cloth is"
            />
            <Slider
              label="Damping"
              value={config.damping}
              min={0}
              max={0.5}
              step={0.01}
              onChange={(v) => setConfig((p) => ({ ...p, damping: v }))}
              tooltip="Energy dissipation"
            />
            <Slider
              label="Iterations"
              value={config.iterations}
              min={1}
              max={30}
              step={1}
              onChange={(v) => setConfig((p) => ({ ...p, iterations: v }))}
              tooltip="Solver iterations per frame"
            />
            <Slider
              label="Tear Threshold"
              value={config.tearThreshold}
              min={0.5}
              max={5}
              step={0.1}
              onChange={(v) => setConfig((p) => ({ ...p, tearThreshold: v }))}
              tooltip="Force required to tear the cloth"
            />
            
            <div className="flex items-center justify-between mt-3">
              <label className="text-xs text-slate-400">Self Collision</label>
              <input
                type="checkbox"
                checked={config.selfCollision}
                onChange={(e) => setConfig((p) => ({ ...p, selfCollision: e.target.checked }))}
                className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-sky-600 
                         focus:ring-sky-500 focus:ring-offset-slate-900"
              />
            </div>
          </CollapsibleSection>
          
          {/* Wind */}
          <CollapsibleSection title="Wind" icon={<Wind className="w-4 h-4 text-cyan-400" />}>
            <Vector3Input
              label="Direction & Strength"
              value={{ x: config.wind.x, y: config.wind.y, z: config.wind.z }}
              onChange={(v) => setConfig((p) => ({ 
                ...p, 
                wind: new THREE.Vector3(v.x, v.y, v.z) 
              }))}
              min={-10}
              max={10}
            />
            <Slider
              label="Variation"
              value={config.windVariation}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => setConfig((p) => ({ ...p, windVariation: v }))}
              tooltip="Wind turbulence"
            />
            <div className="flex items-center justify-between mt-2">
              <label className="text-xs text-slate-400">Show Wind Arrow</label>
              <input
                type="checkbox"
                checked={showWindArrow}
                onChange={(e) => setShowWindArrow(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-sky-600"
              />
            </div>
          </CollapsibleSection>
          
          {/* Gravity */}
          <CollapsibleSection title="Gravity" icon={<Circle className="w-4 h-4 text-blue-400" />}>
            <Vector3Input
              label="Gravity Vector"
              value={{ x: config.gravity.x, y: config.gravity.y, z: config.gravity.z }}
              onChange={(v) => setConfig((p) => ({ 
                ...p, 
                gravity: new THREE.Vector3(v.x, v.y, v.z) 
              }))}
              min={-20}
              max={20}
            />
          </CollapsibleSection>
          
          {/* Colliders */}
          <CollapsibleSection title="Colliders" icon={<Box className="w-4 h-4 text-orange-400" />}>
            <div className="flex gap-1 mb-3">
              <button
                onClick={() => addCollider('sphere')}
                className="flex-1 p-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded transition-colors"
              >
                + Sphere
              </button>
              <button
                onClick={() => addCollider('box')}
                className="flex-1 p-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded transition-colors"
              >
                + Box
              </button>
              <button
                onClick={() => addCollider('plane')}
                className="flex-1 p-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded transition-colors"
              >
                + Plane
              </button>
            </div>
            
            {colliders.map((collider, index) => (
              <div 
                key={index}
                className={`p-2 rounded mb-1.5 cursor-pointer transition-colors ${
                  selectedCollider === index 
                    ? 'bg-sky-600/30 border border-sky-500' 
                    : 'bg-slate-700'
                }`}
                onClick={() => setSelectedCollider(index)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs capitalize">{collider.type}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setColliders((prev) => prev.filter((_, i) => i !== index));
                    }}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            
            <div className="flex items-center justify-between mt-2">
              <label className="text-xs text-slate-400">Show Colliders</label>
              <input
                type="checkbox"
                checked={editorState.showColliders}
                onChange={(e) => setEditorState((p) => ({ ...p, showColliders: e.target.checked }))}
                className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-sky-600"
              />
            </div>
            
            <div className="flex items-center justify-between mt-2">
              <label className="text-xs text-slate-400">Ground Plane</label>
              <input
                type="checkbox"
                checked={config.groundPlane}
                onChange={(e) => setConfig((p) => ({ ...p, groundPlane: e.target.checked }))}
                className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-sky-600"
              />
            </div>
          </CollapsibleSection>
          
          {/* View Options */}
          <CollapsibleSection title="View Options" icon={<Eye className="w-4 h-4 text-slate-400" />} defaultOpen={false}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400">Show Wireframe</label>
                <input
                  type="checkbox"
                  checked={editorState.showWireframe}
                  onChange={(e) => setEditorState((p) => ({ ...p, showWireframe: e.target.checked }))}
                  className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-sky-600"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400">Show Constraints</label>
                <input
                  type="checkbox"
                  checked={editorState.showConstraints}
                  onChange={(e) => setEditorState((p) => ({ ...p, showConstraints: e.target.checked }))}
                  className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-sky-600"
                />
              </div>
            </div>
          </CollapsibleSection>
          
          {/* Mesh Settings */}
          <CollapsibleSection title="Mesh Resolution" icon={<Layers className="w-4 h-4 text-green-400" />} defaultOpen={false}>
            <Slider
              label="Width"
              value={config.width}
              min={1}
              max={10}
              step={0.5}
              unit="m"
              onChange={(v) => setConfig((p) => ({ ...p, width: v }))}
            />
            <Slider
              label="Height"
              value={config.height}
              min={1}
              max={10}
              step={0.5}
              unit="m"
              onChange={(v) => setConfig((p) => ({ ...p, height: v }))}
            />
            <Slider
              label="Segments X"
              value={config.segmentsX}
              min={5}
              max={50}
              step={1}
              onChange={(v) => setConfig((p) => ({ ...p, segmentsX: v }))}
            />
            <Slider
              label="Segments Y"
              value={config.segmentsY}
              min={5}
              max={50}
              step={1}
              onChange={(v) => setConfig((p) => ({ ...p, segmentsY: v }))}
            />
            <p className="text-[10px] text-slate-500 mt-2">
              Note: Changing resolution will reset the simulation
            </p>
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
}
