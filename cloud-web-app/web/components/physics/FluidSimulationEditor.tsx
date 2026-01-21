/**
 * FLUID SIMULATION EDITOR - Aethel Engine
 * 
 * Editor visual profissional para simulação de fluidos usando SPH.
 * Sistema de partículas com física realista em tempo real.
 * 
 * FEATURES:
 * - Particle count configurável (100-10000)
 * - Viscosity e Surface Tension sliders
 * - Color picker para fluido
 * - Boundary box editor visual
 * - Flow direction arrows visuais
 * - Preview em tempo real com partículas SPH
 * - Presets profissionais (water, oil, honey, lava, blood)
 * - Gravity settings configurável
 * - Bake to mesh option
 * - Export para runtime format
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
  Line,
  Html,
  Box as DreiBox,
} from '@react-three/drei';
import * as THREE from 'three';
import { 
  Droplet,
  Play,
  Pause,
  RotateCcw,
  Settings,
  Download,
  Upload,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Box,
  ArrowDown,
  Palette,
  Waves,
  Thermometer,
  Wind,
  Layers,
  Zap,
  Target,
  Move,
  Maximize,
  RefreshCw,
  FileOutput,
  Pipette,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface FluidParams {
  particleCount: number;
  viscosity: number;
  surfaceTension: number;
  restDensity: number;
  stiffness: number;
  particleRadius: number;
  smoothingRadius: number;
  color: string;
  opacity: number;
  gravity: { x: number; y: number; z: number };
  boundarySize: { x: number; y: number; z: number };
  boundaryPosition: { x: number; y: number; z: number };
  flowDirection: { x: number; y: number; z: number };
  flowStrength: number;
  temperature: number;
  enableSurfaceMeshing: boolean;
  meshResolution: number;
}

export interface FluidPreset {
  id: string;
  name: string;
  description: string;
  params: Partial<FluidParams>;
}

export interface FluidParticle {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  acceleration: THREE.Vector3;
  density: number;
  pressure: number;
  mass: number;
}

export type FluidToolType = 
  | 'view'
  | 'emitter'
  | 'boundary'
  | 'flow';

export interface FluidEditorState {
  isSimulating: boolean;
  showBoundary: boolean;
  showFlowArrows: boolean;
  showVelocityColors: boolean;
  showDensityColors: boolean;
  currentPreset: string | null;
}

// ============================================================================
// SPH FLUID SIMULATION SYSTEM
// ============================================================================

class SPHFluidSimulation {
  particles: FluidParticle[] = [];
  params: FluidParams;
  
  private kernelPoly6Coeff: number = 0;
  private kernelSpikyCoeff: number = 0;
  private kernelViscosityCoeff: number = 0;
  
  constructor(params: FluidParams) {
    this.params = params;
    this.updateKernelCoefficients();
    this.initializeParticles();
  }
  
  private updateKernelCoefficients(): void {
    const h = this.params.smoothingRadius;
    const h2 = h * h;
    const h3 = h2 * h;
    const h6 = h3 * h3;
    const h9 = h6 * h3;
    
    // Poly6 kernel coefficient
    this.kernelPoly6Coeff = 315 / (64 * Math.PI * h9);
    
    // Spiky kernel gradient coefficient  
    this.kernelSpikyCoeff = -45 / (Math.PI * h6);
    
    // Viscosity kernel laplacian coefficient
    this.kernelViscosityCoeff = 45 / (Math.PI * h6);
  }
  
  initializeParticles(): void {
    this.particles = [];
    const { particleCount, boundarySize, boundaryPosition, particleRadius } = this.params;
    
    // Calculate grid dimensions for initial particle placement
    const volume = boundarySize.x * boundarySize.y * boundarySize.z;
    const particleVolume = volume / particleCount;
    const spacing = Math.pow(particleVolume, 1/3) * 0.8;
    
    const startX = boundaryPosition.x - boundarySize.x / 2 + spacing;
    const startY = boundaryPosition.y - boundarySize.y / 2 + spacing;
    const startZ = boundaryPosition.z - boundarySize.z / 2 + spacing;
    
    let id = 0;
    for (let x = startX; x < boundaryPosition.x + boundarySize.x / 2 - spacing && id < particleCount; x += spacing) {
      for (let y = startY; y < boundaryPosition.y + boundarySize.y / 2 - spacing && id < particleCount; y += spacing) {
        for (let z = startZ; z < boundaryPosition.z + boundarySize.z / 2 - spacing && id < particleCount; z += spacing) {
          // Add small random offset for natural look
          const jitter = spacing * 0.1;
          const particle: FluidParticle = {
            id: id++,
            position: new THREE.Vector3(
              x + (Math.random() - 0.5) * jitter,
              y + (Math.random() - 0.5) * jitter,
              z + (Math.random() - 0.5) * jitter
            ),
            velocity: new THREE.Vector3(0, 0, 0),
            acceleration: new THREE.Vector3(0, 0, 0),
            density: this.params.restDensity,
            pressure: 0,
            mass: 1,
          };
          this.particles.push(particle);
        }
      }
    }
    
    // Fill remaining particles if grid didn't create enough
    while (this.particles.length < particleCount) {
      const particle: FluidParticle = {
        id: this.particles.length,
        position: new THREE.Vector3(
          boundaryPosition.x + (Math.random() - 0.5) * boundarySize.x * 0.8,
          boundaryPosition.y + (Math.random() - 0.5) * boundarySize.y * 0.8,
          boundaryPosition.z + (Math.random() - 0.5) * boundarySize.z * 0.8
        ),
        velocity: new THREE.Vector3(0, 0, 0),
        acceleration: new THREE.Vector3(0, 0, 0),
        density: this.params.restDensity,
        pressure: 0,
        mass: 1,
      };
      this.particles.push(particle);
    }
  }
  
  // Poly6 kernel for density estimation
  private kernelPoly6(r: number): number {
    const h = this.params.smoothingRadius;
    if (r > h) return 0;
    const diff = h * h - r * r;
    return this.kernelPoly6Coeff * diff * diff * diff;
  }
  
  // Spiky kernel gradient for pressure force
  private kernelSpikyGradient(r: THREE.Vector3, dist: number): THREE.Vector3 {
    const h = this.params.smoothingRadius;
    if (dist > h || dist < 0.0001) return new THREE.Vector3(0, 0, 0);
    const diff = h - dist;
    const coeff = this.kernelSpikyCoeff * diff * diff / dist;
    return r.clone().multiplyScalar(coeff);
  }
  
  // Viscosity kernel laplacian
  private kernelViscosityLaplacian(r: number): number {
    const h = this.params.smoothingRadius;
    if (r > h) return 0;
    return this.kernelViscosityCoeff * (h - r);
  }
  
  // Compute density for all particles
  private computeDensity(): void {
    for (const pi of this.particles) {
      pi.density = 0;
      
      for (const pj of this.particles) {
        const r = pi.position.distanceTo(pj.position);
        pi.density += pj.mass * this.kernelPoly6(r);
      }
      
      // Compute pressure using equation of state
      pi.pressure = this.params.stiffness * (pi.density - this.params.restDensity);
    }
  }
  
  // Compute forces (pressure, viscosity, external)
  private computeForces(): void {
    const { gravity, viscosity, surfaceTension, flowDirection, flowStrength } = this.params;
    
    for (const pi of this.particles) {
      // Reset acceleration
      pi.acceleration.set(0, 0, 0);
      
      // Gravity force
      pi.acceleration.add(new THREE.Vector3(gravity.x, gravity.y, gravity.z));
      
      // Flow force
      if (flowStrength > 0) {
        const flowForce = new THREE.Vector3(
          flowDirection.x * flowStrength,
          flowDirection.y * flowStrength,
          flowDirection.z * flowStrength
        );
        pi.acceleration.add(flowForce);
      }
      
      // Particle-particle interactions
      const pressureForce = new THREE.Vector3(0, 0, 0);
      const viscosityForce = new THREE.Vector3(0, 0, 0);
      const surfaceTensionForce = new THREE.Vector3(0, 0, 0);
      
      for (const pj of this.particles) {
        if (pi.id === pj.id) continue;
        
        const r = new THREE.Vector3().subVectors(pi.position, pj.position);
        const dist = r.length();
        
        if (dist < this.params.smoothingRadius) {
          // Pressure force (symmetric)
          const pressureGrad = this.kernelSpikyGradient(r, dist);
          const pressureTerm = (pi.pressure + pj.pressure) / (2 * pj.density + 0.0001);
          pressureForce.add(pressureGrad.multiplyScalar(-pj.mass * pressureTerm));
          
          // Viscosity force
          const velDiff = new THREE.Vector3().subVectors(pj.velocity, pi.velocity);
          const viscLaplacian = this.kernelViscosityLaplacian(dist);
          viscosityForce.add(
            velDiff.multiplyScalar(viscosity * pj.mass * viscLaplacian / (pj.density + 0.0001))
          );
          
          // Surface tension (simplified)
          if (surfaceTension > 0 && dist > 0.0001) {
            const cohesion = r.clone().normalize().multiplyScalar(
              -surfaceTension * pj.mass * this.kernelPoly6(dist)
            );
            surfaceTensionForce.add(cohesion);
          }
        }
      }
      
      // Apply forces (divided by density for acceleration)
      if (pi.density > 0.0001) {
        pi.acceleration.add(pressureForce.divideScalar(pi.density));
        pi.acceleration.add(viscosityForce);
        pi.acceleration.add(surfaceTensionForce.divideScalar(pi.density));
      }
    }
  }
  
  // Integrate positions using Verlet integration
  private integrate(dt: number): void {
    for (const p of this.particles) {
      // Update velocity
      p.velocity.add(p.acceleration.clone().multiplyScalar(dt));
      
      // Damping for stability
      p.velocity.multiplyScalar(0.998);
      
      // Limit velocity for stability
      const maxVel = 10;
      if (p.velocity.length() > maxVel) {
        p.velocity.normalize().multiplyScalar(maxVel);
      }
      
      // Update position
      p.position.add(p.velocity.clone().multiplyScalar(dt));
    }
  }
  
  // Handle boundary collisions
  private handleBoundaryCollisions(): void {
    const { boundarySize, boundaryPosition, particleRadius } = this.params;
    const dampingFactor = 0.3;
    
    const minX = boundaryPosition.x - boundarySize.x / 2 + particleRadius;
    const maxX = boundaryPosition.x + boundarySize.x / 2 - particleRadius;
    const minY = boundaryPosition.y - boundarySize.y / 2 + particleRadius;
    const maxY = boundaryPosition.y + boundarySize.y / 2 - particleRadius;
    const minZ = boundaryPosition.z - boundarySize.z / 2 + particleRadius;
    const maxZ = boundaryPosition.z + boundarySize.z / 2 - particleRadius;
    
    for (const p of this.particles) {
      // X bounds
      if (p.position.x < minX) {
        p.position.x = minX;
        p.velocity.x *= -dampingFactor;
      } else if (p.position.x > maxX) {
        p.position.x = maxX;
        p.velocity.x *= -dampingFactor;
      }
      
      // Y bounds
      if (p.position.y < minY) {
        p.position.y = minY;
        p.velocity.y *= -dampingFactor;
      } else if (p.position.y > maxY) {
        p.position.y = maxY;
        p.velocity.y *= -dampingFactor;
      }
      
      // Z bounds
      if (p.position.z < minZ) {
        p.position.z = minZ;
        p.velocity.z *= -dampingFactor;
      } else if (p.position.z > maxZ) {
        p.position.z = maxZ;
        p.velocity.z *= -dampingFactor;
      }
    }
  }
  
  // Main simulation step
  update(dt: number): void {
    const substeps = 2;
    const subDt = dt / substeps;
    
    for (let i = 0; i < substeps; i++) {
      this.computeDensity();
      this.computeForces();
      this.integrate(subDt);
      this.handleBoundaryCollisions();
    }
  }
  
  // Update parameters and reinitialize if needed
  updateParams(newParams: Partial<FluidParams>): void {
    const oldParticleCount = this.params.particleCount;
    this.params = { ...this.params, ...newParams };
    
    if (newParams.smoothingRadius !== undefined) {
      this.updateKernelCoefficients();
    }
    
    if (newParams.particleCount !== undefined && newParams.particleCount !== oldParticleCount) {
      this.initializeParticles();
    }
  }
  
  reset(): void {
    this.initializeParticles();
  }
}

// ============================================================================
// PRESETS
// ============================================================================

const FLUID_PRESETS: FluidPreset[] = [
  {
    id: 'water',
    name: 'Water',
    description: 'Clear liquid with low viscosity',
    params: {
      viscosity: 0.01,
      surfaceTension: 0.07,
      restDensity: 1000,
      stiffness: 200,
      color: '#3b82f6',
      opacity: 0.7,
      temperature: 20,
    },
  },
  {
    id: 'oil',
    name: 'Oil',
    description: 'Viscous liquid with smooth flow',
    params: {
      viscosity: 0.3,
      surfaceTension: 0.03,
      restDensity: 920,
      stiffness: 150,
      color: '#854d0e',
      opacity: 0.85,
      temperature: 25,
    },
  },
  {
    id: 'honey',
    name: 'Honey',
    description: 'Very thick and slow flowing',
    params: {
      viscosity: 0.9,
      surfaceTension: 0.08,
      restDensity: 1400,
      stiffness: 100,
      color: '#f59e0b',
      opacity: 0.9,
      temperature: 20,
    },
  },
  {
    id: 'lava',
    name: 'Lava',
    description: 'Molten rock with high viscosity',
    params: {
      viscosity: 0.7,
      surfaceTension: 0.05,
      restDensity: 2700,
      stiffness: 80,
      color: '#dc2626',
      opacity: 1,
      temperature: 1200,
    },
  },
  {
    id: 'blood',
    name: 'Blood',
    description: 'Biological fluid simulation',
    params: {
      viscosity: 0.04,
      surfaceTension: 0.06,
      restDensity: 1060,
      stiffness: 180,
      color: '#991b1b',
      opacity: 0.95,
      temperature: 37,
    },
  },
  {
    id: 'mercury',
    name: 'Mercury',
    description: 'Dense metallic liquid',
    params: {
      viscosity: 0.02,
      surfaceTension: 0.5,
      restDensity: 13500,
      stiffness: 300,
      color: '#94a3b8',
      opacity: 1,
      temperature: 25,
    },
  },
  {
    id: 'slime',
    name: 'Slime',
    description: 'Non-newtonian goo',
    params: {
      viscosity: 0.5,
      surfaceTension: 0.15,
      restDensity: 1200,
      stiffness: 50,
      color: '#22c55e',
      opacity: 0.8,
      temperature: 20,
    },
  },
  {
    id: 'milk',
    name: 'Milk',
    description: 'Opaque liquid with low viscosity',
    params: {
      viscosity: 0.02,
      surfaceTension: 0.05,
      restDensity: 1030,
      stiffness: 180,
      color: '#f8fafc',
      opacity: 1,
      temperature: 4,
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
  tooltip?: string;
}

function Slider({ label, value, min, max, step = 0.01, unit = '', onChange, icon, tooltip }: SliderProps) {
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

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorPicker({ label, value, onChange }: ColorPickerProps) {
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
// FLUID PARTICLES 3D COMPONENT
// ============================================================================

interface FluidParticles3DProps {
  simulation: SPHFluidSimulation | null;
  params: FluidParams;
  editorState: FluidEditorState;
}

function FluidParticles3D({ simulation, params, editorState }: FluidParticles3DProps) {
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

interface BoundaryBoxProps {
  params: FluidParams;
  visible: boolean;
  onResize?: (size: { x: number; y: number; z: number }) => void;
}

function BoundaryBox({ params, visible, onResize }: BoundaryBoxProps) {
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

interface FlowArrowsProps {
  params: FluidParams;
  visible: boolean;
}

function FlowArrows({ params, visible }: FlowArrowsProps) {
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

interface ToolbarProps {
  selectedTool: FluidToolType;
  onToolChange: (tool: FluidToolType) => void;
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

interface SimulationStatsProps {
  simulation: SPHFluidSimulation | null;
  params: FluidParams;
}

function SimulationStats({ simulation, params }: SimulationStatsProps) {
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

// ============================================================================
// MAIN FLUID SIMULATION EDITOR
// ============================================================================

export interface FluidSimulationEditorProps {
  volumeId?: string;
  initialParams?: Partial<FluidParams>;
  onFluidUpdate?: (params: FluidParams) => void;
  onExport?: (data: { params: FluidParams; meshData?: ArrayBuffer }) => void;
}

export default function FluidSimulationEditor({
  volumeId,
  initialParams,
  onFluidUpdate,
  onExport,
}: FluidSimulationEditorProps) {
  // Default fluid parameters
  const defaultParams: FluidParams = {
    particleCount: 500,
    viscosity: 0.01,
    surfaceTension: 0.07,
    restDensity: 1000,
    stiffness: 200,
    particleRadius: 0.05,
    smoothingRadius: 0.2,
    color: '#3b82f6',
    opacity: 0.7,
    gravity: { x: 0, y: -9.81, z: 0 },
    boundarySize: { x: 3, y: 3, z: 3 },
    boundaryPosition: { x: 0, y: 1.5, z: 0 },
    flowDirection: { x: 1, y: 0, z: 0 },
    flowStrength: 0,
    temperature: 20,
    enableSurfaceMeshing: false,
    meshResolution: 32,
  };
  
  // State
  const [params, setParams] = useState<FluidParams>({ ...defaultParams, ...initialParams });
  const [editorState, setEditorState] = useState<FluidEditorState>({
    isSimulating: false,
    showBoundary: true,
    showFlowArrows: true,
    showVelocityColors: false,
    showDensityColors: false,
    currentPreset: null,
  });
  const [selectedTool, setSelectedTool] = useState<FluidToolType>('view');
  const [isBaking, setIsBaking] = useState(false);
  
  // Simulation reference
  const simulationRef = useRef<SPHFluidSimulation | null>(null);
  
  // Initialize simulation
  useEffect(() => {
    simulationRef.current = new SPHFluidSimulation(params);
    return () => {
      simulationRef.current = null;
    };
  }, []);
  
  // Update simulation params
  useEffect(() => {
    if (simulationRef.current) {
      simulationRef.current.updateParams(params);
    }
    onFluidUpdate?.(params);
  }, [params, onFluidUpdate]);
  
  // Apply preset
  const applyPreset = useCallback((preset: FluidPreset) => {
    setParams((prev) => ({ ...prev, ...preset.params }));
    setEditorState((prev) => ({ ...prev, currentPreset: preset.id }));
    
    if (simulationRef.current) {
      simulationRef.current.updateParams(preset.params);
    }
  }, []);
  
  // Toggle simulation
  const toggleSimulation = useCallback(() => {
    setEditorState((prev) => ({ ...prev, isSimulating: !prev.isSimulating }));
  }, []);
  
  // Reset simulation
  const resetSimulation = useCallback(() => {
    if (simulationRef.current) {
      simulationRef.current.reset();
    }
    setEditorState((prev) => ({ ...prev, isSimulating: false }));
  }, []);
  
  // Update a single param
  const updateParam = useCallback(<K extends keyof FluidParams>(key: K, value: FluidParams[K]) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  }, []);
  
  // Bake to mesh (placeholder - would generate a mesh from particles)
  const bakeToMesh = useCallback(async () => {
    setIsBaking(true);
    
    // Simulate baking process
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    // In a real implementation, this would use marching cubes or similar
    // to generate a mesh from the particle positions
    console.log('Baking fluid to mesh with resolution:', params.meshResolution);
    
    setIsBaking(false);
  }, [params.meshResolution]);
  
  // Export configuration
  const handleExport = useCallback(() => {
    const exportData = {
      params,
      metadata: {
        volumeId,
        timestamp: Date.now(),
        version: '1.0',
      },
    };
    
    onExport?.({ params });
    
    // Also trigger download
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fluid_${volumeId || 'config'}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [params, volumeId, onExport]);
  
  // Import configuration
  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          if (data.params) {
            setParams((prev) => ({ ...prev, ...data.params }));
          }
        } catch (err) {
          console.error('Failed to import fluid config:', err);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);
  
  return (
    <div className="flex h-full w-full bg-slate-900 text-slate-200">
      {/* Toolbar */}
      <div className="p-2">
        <Toolbar
          selectedTool={selectedTool}
          onToolChange={setSelectedTool}
          isSimulating={editorState.isSimulating}
          onToggleSimulation={toggleSimulation}
          onReset={resetSimulation}
        />
      </div>
      
      {/* 3D Viewport */}
      <div className="flex-1 relative">
        <Canvas camera={{ position: [5, 5, 5], fov: 50 }} shadows>
          <color attach="background" args={['#0f172a']} />
          
          <ambientLight intensity={0.4} />
          <directionalLight 
            position={[10, 10, 5]} 
            intensity={1} 
            castShadow 
            shadow-mapSize={[2048, 2048]}
          />
          <pointLight position={[-5, 5, -5]} intensity={0.5} color="#0ea5e9" />
          
          {/* Fluid particles */}
          <FluidParticles3D
            simulation={simulationRef.current}
            params={params}
            editorState={editorState}
          />
          
          {/* Boundary box */}
          <BoundaryBox
            params={params}
            visible={editorState.showBoundary}
          />
          
          {/* Flow arrows */}
          <FlowArrows
            params={params}
            visible={editorState.showFlowArrows}
          />
          
          <Grid infiniteGrid fadeDistance={30} />
          <OrbitControls makeDefault />
          <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
            <GizmoViewport />
          </GizmoHelper>
          <Environment preset="warehouse" />
        </Canvas>
        
        {/* Viewport info overlay */}
        <div className="absolute top-4 left-4 bg-slate-900/90 p-3 rounded">
          <div className="text-xs text-slate-400 mb-2">Simulation Status</div>
          <SimulationStats simulation={simulationRef.current} params={params} />
          
          <div className="mt-2 pt-2 border-t border-slate-700">
            <div className="flex items-center gap-2 text-xs">
              <div className={`w-2 h-2 rounded-full ${editorState.isSimulating ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`} />
              <span>{editorState.isSimulating ? 'Running' : 'Paused'}</span>
            </div>
          </div>
        </div>
        
        {/* View toggles */}
        <div className="absolute top-4 right-80 flex flex-col gap-1 bg-slate-900/90 p-2 rounded">
          <button
            onClick={() => setEditorState((p) => ({ ...p, showBoundary: !p.showBoundary }))}
            className={`p-1.5 rounded text-xs flex items-center gap-1.5 ${
              editorState.showBoundary ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-400'
            }`}
          >
            <Box className="w-3 h-3" /> Boundary
          </button>
          <button
            onClick={() => setEditorState((p) => ({ ...p, showFlowArrows: !p.showFlowArrows }))}
            className={`p-1.5 rounded text-xs flex items-center gap-1.5 ${
              editorState.showFlowArrows ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-400'
            }`}
          >
            <Wind className="w-3 h-3" /> Flow
          </button>
          <button
            onClick={() => setEditorState((p) => ({ ...p, showVelocityColors: !p.showVelocityColors }))}
            className={`p-1.5 rounded text-xs flex items-center gap-1.5 ${
              editorState.showVelocityColors ? 'bg-orange-600 text-white' : 'bg-slate-700 text-slate-400'
            }`}
          >
            <Zap className="w-3 h-3" /> Velocity
          </button>
          <button
            onClick={() => setEditorState((p) => ({ ...p, showDensityColors: !p.showDensityColors }))}
            className={`p-1.5 rounded text-xs flex items-center gap-1.5 ${
              editorState.showDensityColors ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400'
            }`}
          >
            <Layers className="w-3 h-3" /> Density
          </button>
        </div>
      </div>
      
      {/* Settings Panel */}
      <div className="w-72 bg-slate-850 border-l border-slate-700 overflow-y-auto">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Droplet className="w-5 h-5 text-cyan-400" />
              Fluid Simulation
            </h2>
            <div className="flex gap-1">
              <button
                onClick={handleImport}
                className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 transition-colors"
                title="Import Configuration"
              >
                <Upload className="w-4 h-4" />
              </button>
              <button
                onClick={handleExport}
                className="p-1.5 rounded bg-cyan-600 hover:bg-cyan-500 transition-colors"
                title="Export Configuration"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Presets */}
          <CollapsibleSection title="Fluid Presets" icon={<Zap className="w-4 h-4 text-yellow-400" />}>
            <div className="grid grid-cols-2 gap-1.5">
              {FLUID_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className={`p-2 rounded transition-colors text-left ${
                    editorState.currentPreset === preset.id
                      ? 'bg-cyan-600/30 border border-cyan-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <div className="text-xs font-medium">{preset.name}</div>
                  <div className="text-[10px] opacity-70 truncate">{preset.description}</div>
                </button>
              ))}
            </div>
          </CollapsibleSection>
          
          {/* Particle Settings */}
          <CollapsibleSection title="Particles" icon={<Droplet className="w-4 h-4 text-cyan-400" />}>
            <Slider
              label="Particle Count"
              value={params.particleCount}
              min={100}
              max={10000}
              step={100}
              onChange={(v) => updateParam('particleCount', v)}
              icon={<Target className="w-3 h-3 text-slate-400" />}
              tooltip="Number of fluid particles (affects performance)"
            />
            
            <Slider
              label="Particle Radius"
              value={params.particleRadius}
              min={0.01}
              max={0.2}
              step={0.01}
              unit="m"
              onChange={(v) => updateParam('particleRadius', v)}
            />
            
            <Slider
              label="Smoothing Radius"
              value={params.smoothingRadius}
              min={0.1}
              max={0.5}
              step={0.01}
              unit="m"
              onChange={(v) => updateParam('smoothingRadius', v)}
              tooltip="SPH kernel radius"
            />
          </CollapsibleSection>
          
          {/* Physical Properties */}
          <CollapsibleSection title="Physical Properties" icon={<Waves className="w-4 h-4 text-blue-400" />}>
            <Slider
              label="Viscosity"
              value={params.viscosity}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => updateParam('viscosity', v)}
              tooltip="Fluid thickness (0=water, 1=honey)"
            />
            
            <Slider
              label="Surface Tension"
              value={params.surfaceTension}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => updateParam('surfaceTension', v)}
              tooltip="Cohesion between particles"
            />
            
            <Slider
              label="Rest Density"
              value={params.restDensity}
              min={100}
              max={15000}
              step={100}
              unit=" kg/m³"
              onChange={(v) => updateParam('restDensity', v)}
            />
            
            <Slider
              label="Stiffness"
              value={params.stiffness}
              min={10}
              max={500}
              step={10}
              onChange={(v) => updateParam('stiffness', v)}
              tooltip="Pressure response strength"
            />
            
            <Slider
              label="Temperature"
              value={params.temperature}
              min={-50}
              max={1500}
              step={1}
              unit="°C"
              onChange={(v) => updateParam('temperature', v)}
              icon={<Thermometer className="w-3 h-3 text-orange-400" />}
            />
          </CollapsibleSection>
          
          {/* Appearance */}
          <CollapsibleSection title="Appearance" icon={<Palette className="w-4 h-4 text-pink-400" />}>
            <ColorPicker
              label="Fluid Color"
              value={params.color}
              onChange={(v) => updateParam('color', v)}
            />
            
            <Slider
              label="Opacity"
              value={params.opacity}
              min={0.1}
              max={1}
              step={0.05}
              onChange={(v) => updateParam('opacity', v)}
            />
          </CollapsibleSection>
          
          {/* Gravity */}
          <CollapsibleSection title="Gravity" icon={<ArrowDown className="w-4 h-4 text-purple-400" />}>
            <Vector3Input
              label="Gravity Vector"
              value={params.gravity}
              onChange={(v) => updateParam('gravity', v)}
              min={-20}
              max={20}
              step={0.1}
            />
            
            {/* Quick gravity presets */}
            <div className="grid grid-cols-3 gap-1 mt-2">
              <button
                onClick={() => updateParam('gravity', { x: 0, y: -9.81, z: 0 })}
                className="p-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded"
              >
                Earth
              </button>
              <button
                onClick={() => updateParam('gravity', { x: 0, y: -1.62, z: 0 })}
                className="p-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded"
              >
                Moon
              </button>
              <button
                onClick={() => updateParam('gravity', { x: 0, y: 0, z: 0 })}
                className="p-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded"
              >
                Zero-G
              </button>
            </div>
          </CollapsibleSection>
          
          {/* Boundary */}
          <CollapsibleSection title="Boundary Volume" icon={<Box className="w-4 h-4 text-cyan-400" />}>
            <Vector3Input
              label="Size"
              value={params.boundarySize}
              onChange={(v) => updateParam('boundarySize', v)}
              min={0.5}
              max={20}
              step={0.1}
            />
            
            <Vector3Input
              label="Position"
              value={params.boundaryPosition}
              onChange={(v) => updateParam('boundaryPosition', v)}
              min={-10}
              max={10}
              step={0.1}
            />
          </CollapsibleSection>
          
          {/* Flow */}
          <CollapsibleSection title="External Flow" icon={<Wind className="w-4 h-4 text-green-400" />} defaultOpen={false}>
            <Vector3Input
              label="Flow Direction"
              value={params.flowDirection}
              onChange={(v) => updateParam('flowDirection', v)}
              min={-1}
              max={1}
              step={0.1}
            />
            
            <Slider
              label="Flow Strength"
              value={params.flowStrength}
              min={0}
              max={10}
              step={0.1}
              onChange={(v) => updateParam('flowStrength', v)}
            />
          </CollapsibleSection>
          
          {/* Bake to Mesh */}
          <CollapsibleSection title="Surface Meshing" icon={<RefreshCw className="w-4 h-4 text-indigo-400" />} defaultOpen={false}>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs text-slate-400">Enable Surface Mesh</label>
              <input
                type="checkbox"
                checked={params.enableSurfaceMeshing}
                onChange={(e) => updateParam('enableSurfaceMeshing', e.target.checked)}
                className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-cyan-600"
              />
            </div>
            
            <Slider
              label="Mesh Resolution"
              value={params.meshResolution}
              min={16}
              max={128}
              step={8}
              onChange={(v) => updateParam('meshResolution', v)}
              tooltip="Higher = smoother but slower"
            />
            
            <button
              onClick={bakeToMesh}
              disabled={isBaking}
              className="w-full mt-3 p-2 rounded bg-indigo-600 hover:bg-indigo-500 
                       disabled:bg-slate-700 disabled:text-slate-500
                       transition-colors flex items-center justify-center gap-2"
            >
              {isBaking ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Baking...
                </>
              ) : (
                <>
                  <FileOutput className="w-4 h-4" />
                  Bake to Mesh
                </>
              )}
            </button>
          </CollapsibleSection>
          
          {/* Volume ID */}
          {volumeId && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="text-xs text-slate-500">
                Volume ID: <span className="font-mono text-slate-400">{volumeId}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
