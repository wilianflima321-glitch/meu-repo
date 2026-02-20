/**
 * Fluid simulation editor panel and viewport helper components
 */

'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import {
  Box,
  Droplet,
  Eye,
  Pause,
  Play,
  RotateCcw,
  Wind,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import * as THREE from 'three';
import type { FluidEditorState, FluidParams, FluidParticle, FluidToolType } from './FluidSimulationEditor';

export interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  icon?: React.ReactNode;
  tooltip?: string;
}

export function Slider({ label, value, min, max, step = 0.01, unit = '', onChange, icon, tooltip }: SliderProps) {
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <label className="text-xs text-slate-400 flex items-center gap-1.5" title={tooltip}>
          {icon}
          {label}
        </label>
        <span className="text-xs text-slate-300 font-mono">
          {value.toFixed(step < 0.1 ? 3 : step < 1 ? 2 : 0)}{unit}
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
                   [&::-webkit-slider-thumb]:bg-cyan-500
                   [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:cursor-pointer
                   [&::-webkit-slider-thumb]:hover:bg-cyan-400
                   [&::-webkit-slider-thumb]:transition-colors"
      />
    </div>
  );
}

// ============================================================================
// VECTOR3 INPUT COMPONENT
// ============================================================================

export interface Vector3InputProps {
  label: string;
  value: { x: number; y: number; z: number };
  onChange: (value: { x: number; y: number; z: number }) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function Vector3Input({ label, value, onChange, min = -100, max = 100, step = 0.1 }: Vector3InputProps) {
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
                       text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// COLOR PICKER COMPONENT
// ============================================================================

export interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  return (
    <div className="mb-3">
      <label className="text-xs text-slate-400 block mb-1.5">{label}</label>
      <div className="flex gap-2 items-center">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-8 rounded border border-slate-700 cursor-pointer bg-transparent"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1.5
                   text-xs text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
        />
      </div>
    </div>
  );
}

// ============================================================================
// COLLAPSIBLE SECTION
// ============================================================================

export interface CollapsibleSectionProps {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({ title, icon, defaultOpen = true, children }: CollapsibleSectionProps) {
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
// FLUID PARTICLES 3D COMPONENT
// ============================================================================

export interface FluidSimulationRuntime {
  particles: FluidParticle[];
  update(deltaTime: number): void;
}

export interface FluidParticles3DProps {
  simulation: FluidSimulationRuntime | null;
  params: FluidParams;
  editorState: FluidEditorState;
}

export function FluidParticles3D({ simulation, params, editorState }: FluidParticles3DProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  
  // Create instanced geometry for particles
  const particleGeometry = useMemo(() => {
    return new THREE.SphereGeometry(params.particleRadius, 8, 8);
  }, [params.particleRadius]);
  
  // Create material with fluid color
  const particleMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: params.color,
      transparent: params.opacity < 1,
      opacity: params.opacity,
      metalness: 0.1,
      roughness: 0.3,
    });
  }, [params.color, params.opacity]);
  
  // Dummy object for matrix calculations
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // Update particle positions each frame
  useFrame((_, delta) => {
    if (!simulation || !editorState.isSimulating) return;
    
    // Update simulation
    simulation.update(Math.min(delta, 0.033));
    
    // Update instanced mesh
    if (instancedMeshRef.current) {
      const mesh = instancedMeshRef.current;
      
      for (let i = 0; i < simulation.particles.length; i++) {
        const p = simulation.particles[i];
        dummy.position.copy(p.position);
        
        // Scale based on density for visual feedback
        const densityScale = editorState.showDensityColors 
          ? 0.8 + (p.density / params.restDensity) * 0.4
          : 1;
        dummy.scale.setScalar(densityScale);
        
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        
        // Color based on velocity if enabled
        if (editorState.showVelocityColors) {
          const speed = p.velocity.length();
          const hue = Math.max(0, 0.6 - speed * 0.1);
          const color = new THREE.Color().setHSL(hue, 0.8, 0.5);
          mesh.setColorAt(i, color);
        }
      }
      
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  });
  
  if (!simulation) return null;
  
  return (
    <instancedMesh
      ref={instancedMeshRef}
      args={[particleGeometry, particleMaterial, params.particleCount]}
      castShadow
      receiveShadow
    />
  );
}

// ============================================================================
// BOUNDARY BOX COMPONENT
// ============================================================================

export interface BoundaryBoxProps {
  params: FluidParams;
  visible: boolean;
  onResize?: (size: { x: number; y: number; z: number }) => void;
}

export function BoundaryBox({ params, visible, onResize }: BoundaryBoxProps) {
  if (!visible) return null;
  
  const { boundarySize, boundaryPosition } = params;
  
  return (
    <group position={[boundaryPosition.x, boundaryPosition.y, boundaryPosition.z]}>
      {/* Wireframe box */}
      <mesh>
        <boxGeometry args={[boundarySize.x, boundarySize.y, boundarySize.z]} />
        <meshBasicMaterial 
          color="#06b6d4" 
          wireframe 
          transparent 
          opacity={0.5} 
        />
      </mesh>
      
      {/* Bottom plane indicator */}
      <mesh position={[0, -boundarySize.y / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[boundarySize.x, boundarySize.z]} />
        <meshBasicMaterial 
          color="#06b6d4" 
          transparent 
          opacity={0.1} 
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Dimension labels */}
      <Html position={[boundarySize.x / 2 + 0.3, 0, 0]}>
        <div className="text-[10px] text-cyan-400 whitespace-nowrap bg-slate-900/80 px-1 rounded">
          W: {boundarySize.x.toFixed(1)}m
        </div>
      </Html>
      <Html position={[0, boundarySize.y / 2 + 0.3, 0]}>
        <div className="text-[10px] text-cyan-400 whitespace-nowrap bg-slate-900/80 px-1 rounded">
          H: {boundarySize.y.toFixed(1)}m
        </div>
      </Html>
      <Html position={[0, 0, boundarySize.z / 2 + 0.3]}>
        <div className="text-[10px] text-cyan-400 whitespace-nowrap bg-slate-900/80 px-1 rounded">
          D: {boundarySize.z.toFixed(1)}m
        </div>
      </Html>
    </group>
  );
}

// ============================================================================
// FLOW ARROWS COMPONENT
// ============================================================================

export interface FlowArrowsProps {
  params: FluidParams;
  visible: boolean;
}

export function FlowArrows({ params, visible }: FlowArrowsProps) {
  const { flowDirection, flowStrength, boundaryPosition, boundarySize } = params;
  
  // useMemo must be called before any conditional return
  const arrows = useMemo(() => {
    if (!visible || flowStrength === 0) return [];
    
    const result: { position: THREE.Vector3; direction: THREE.Vector3 }[] = [];
    const dir = new THREE.Vector3(flowDirection.x, flowDirection.y, flowDirection.z).normalize();
    const arrowLength = flowStrength * 0.5;
    
    // Create a grid of flow arrows
    const gridSize = 3;
    const spacingX = boundarySize.x / (gridSize + 1);
    const spacingY = boundarySize.y / (gridSize + 1);
    const spacingZ = boundarySize.z / (gridSize + 1);
    
    for (let x = 1; x <= gridSize; x++) {
      for (let z = 1; z <= gridSize; z++) {
        const pos = new THREE.Vector3(
          boundaryPosition.x - boundarySize.x / 2 + x * spacingX,
          boundaryPosition.y,
          boundaryPosition.z - boundarySize.z / 2 + z * spacingZ
        );
        result.push({ position: pos, direction: dir.clone().multiplyScalar(arrowLength) });
      }
    }
    
    return result;
  }, [visible, flowDirection, flowStrength, boundaryPosition, boundarySize]);
  
  if (!visible || params.flowStrength === 0 || arrows.length === 0) return null;
  
  return (
    <group>
      {arrows.map((arrow, index) => (
        <group key={index} position={arrow.position}>
          <Line
            points={[[0, 0, 0], arrow.direction.toArray()]}
            color="#22c55e"
            lineWidth={2}
          />
          <mesh position={arrow.direction}>
            <coneGeometry args={[0.08, 0.2, 8]} />
            <meshBasicMaterial color="#22c55e" />
          </mesh>
        </group>
      ))}
      
      {/* Flow strength indicator */}
      <Html position={[boundaryPosition.x, boundaryPosition.y + boundarySize.y / 2 + 0.5, boundaryPosition.z]}>
        <div className="text-xs text-green-400 whitespace-nowrap bg-slate-900/80 px-2 py-1 rounded flex items-center gap-1">
          <Wind className="w-3 h-3" />
          Flow: {flowStrength.toFixed(2)}
        </div>
      </Html>
    </group>
  );
}

// ============================================================================
// TOOLBAR COMPONENT
// ============================================================================

export interface ToolbarProps {
  selectedTool: FluidToolType;
  onToolChange: (tool: FluidToolType) => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  onReset: () => void;
}

export function Toolbar({ 
  selectedTool, 
  onToolChange, 
  isSimulating, 
  onToggleSimulation,
  onReset,
}: ToolbarProps) {
  const tools: { id: FluidToolType; icon: React.ReactNode; label: string }[] = [
    { id: 'view', icon: <Eye className="w-4 h-4" />, label: 'View' },
    { id: 'emitter', icon: <Droplet className="w-4 h-4" />, label: 'Add Emitter' },
    { id: 'boundary', icon: <Box className="w-4 h-4" />, label: 'Edit Boundary' },
    { id: 'flow', icon: <Wind className="w-4 h-4" />, label: 'Set Flow Direction' },
  ];
  
  return (
    <div className="flex flex-col gap-1 p-2 bg-slate-800/90 rounded-lg">
      {/* Simulation controls */}
      <button
        onClick={onToggleSimulation}
        className={`p-2 rounded transition-colors ${
          isSimulating 
            ? 'bg-cyan-600 text-white' 
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
              ? 'bg-cyan-600 text-white'
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
// SIMULATION STATS COMPONENT
// ============================================================================

export interface SimulationStatsProps {
  simulation: FluidSimulationRuntime | null;
  params: FluidParams;
}

export function SimulationStats({ simulation, params }: SimulationStatsProps) {
  const [stats, setStats] = useState({ avgDensity: 0, avgSpeed: 0, maxSpeed: 0 });
  
  useEffect(() => {
    if (!simulation) return;
    
    const interval = setInterval(() => {
      let totalDensity = 0;
      let totalSpeed = 0;
      let maxSpeed = 0;
      
      for (const p of simulation.particles) {
        totalDensity += p.density;
        const speed = p.velocity.length();
        totalSpeed += speed;
        if (speed > maxSpeed) maxSpeed = speed;
      }
      
      const count = simulation.particles.length || 1;
      setStats({
        avgDensity: totalDensity / count,
        avgSpeed: totalSpeed / count,
        maxSpeed,
      });
    }, 100);
    
    return () => clearInterval(interval);
  }, [simulation]);
  
  return (
    <div className="space-y-1 text-xs">
      <div className="flex justify-between">
        <span className="text-slate-400">Particles:</span>
        <span className="font-mono">{params.particleCount}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-400">Avg Density:</span>
        <span className="font-mono">{stats.avgDensity.toFixed(1)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-400">Avg Speed:</span>
        <span className="font-mono">{stats.avgSpeed.toFixed(2)} m/s</span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-400">Max Speed:</span>
        <span className="font-mono">{stats.maxSpeed.toFixed(2)} m/s</span>
      </div>
    </div>
  );
}
