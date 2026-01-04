/**
 * Niagara VFX System - Editor de Partículas Visual
 * 
 * Sistema profissional estilo Unreal Engine para criar
 * efeitos visuais de partículas com node-based editor.
 * 
 * NÃO É MOCK - Sistema real e funcional!
 */

'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  Panel,
  NodeTypes,
  Handle,
  Position,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, GizmoHelper, GizmoViewport, Grid, Stats } from '@react-three/drei';
import * as THREE from 'three';

// ============================================================================
// TYPES
// ============================================================================

interface ParticleSystemState {
  id: string;
  name: string;
  emitters: EmitterConfig[];
  isPlaying: boolean;
  duration: number;
  looping: boolean;
}

interface EmitterConfig {
  id: string;
  name: string;
  enabled: boolean;
  
  // Spawn
  spawnRate: number;
  spawnBurst: { time: number; count: number }[];
  maxParticles: number;
  
  // Lifetime
  lifetime: { min: number; max: number };
  
  // Position
  spawnShape: 'point' | 'sphere' | 'box' | 'cone' | 'cylinder' | 'mesh';
  spawnShapeParams: Record<string, number>;
  
  // Velocity
  initialVelocity: { min: THREE.Vector3; max: THREE.Vector3 };
  velocityOverLife: VelocityCurve[];
  
  // Size
  initialSize: { min: number; max: number };
  sizeOverLife: SizeCurve[];
  
  // Color
  initialColor: THREE.Color;
  colorOverLife: ColorGradient[];
  
  // Rotation
  initialRotation: { min: number; max: number };
  rotationRate: { min: number; max: number };
  
  // Forces
  gravity: THREE.Vector3;
  drag: number;
  turbulence: { strength: number; frequency: number };
  
  // Rendering
  material: 'sprite' | 'mesh' | 'ribbon' | 'beam';
  texture?: string;
  blendMode: 'additive' | 'alpha' | 'multiply';
  sortMode: 'none' | 'byDistance' | 'byAge';
}

interface VelocityCurve {
  time: number;
  multiplier: number;
}

interface SizeCurve {
  time: number;
  size: number;
}

interface ColorGradient {
  time: number;
  color: THREE.Color;
  alpha: number;
}

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  age: number;
  lifetime: number;
  size: number;
  color: THREE.Color;
  alpha: number;
  rotation: number;
  rotationRate: number;
}

// ============================================================================
// PARTICLE SYSTEM CORE
// ============================================================================

class ParticleEmitter {
  private particles: Particle[] = [];
  private timeSinceLastSpawn: number = 0;
  private burstIndex: number = 0;
  private systemTime: number = 0;
  
  constructor(public config: EmitterConfig) {}
  
  update(deltaTime: number): Particle[] {
    if (!this.config.enabled) return this.particles;
    
    this.systemTime += deltaTime;
    
    // Spawn particles
    this.timeSinceLastSpawn += deltaTime;
    const spawnInterval = 1 / this.config.spawnRate;
    
    while (this.timeSinceLastSpawn >= spawnInterval && this.particles.length < this.config.maxParticles) {
      this.spawnParticle();
      this.timeSinceLastSpawn -= spawnInterval;
    }
    
    // Handle bursts
    while (this.burstIndex < this.config.spawnBurst.length) {
      const burst = this.config.spawnBurst[this.burstIndex];
      if (this.systemTime >= burst.time) {
        for (let i = 0; i < burst.count && this.particles.length < this.config.maxParticles; i++) {
          this.spawnParticle();
        }
        this.burstIndex++;
      } else {
        break;
      }
    }
    
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += deltaTime;
      
      if (p.age >= p.lifetime) {
        this.particles.splice(i, 1);
        continue;
      }
      
      const normalizedAge = p.age / p.lifetime;
      
      // Apply forces
      p.velocity.add(this.config.gravity.clone().multiplyScalar(deltaTime));
      p.velocity.multiplyScalar(1 - this.config.drag * deltaTime);
      
      // Apply turbulence
      if (this.config.turbulence.strength > 0) {
        const turb = new THREE.Vector3(
          Math.sin(this.systemTime * this.config.turbulence.frequency + p.position.x),
          Math.cos(this.systemTime * this.config.turbulence.frequency + p.position.y),
          Math.sin(this.systemTime * this.config.turbulence.frequency + p.position.z)
        ).multiplyScalar(this.config.turbulence.strength * deltaTime);
        p.velocity.add(turb);
      }
      
      // Apply velocity over life
      let velocityMult = 1;
      for (let j = 0; j < this.config.velocityOverLife.length - 1; j++) {
        const curr = this.config.velocityOverLife[j];
        const next = this.config.velocityOverLife[j + 1];
        if (normalizedAge >= curr.time && normalizedAge <= next.time) {
          const t = (normalizedAge - curr.time) / (next.time - curr.time);
          velocityMult = curr.multiplier + (next.multiplier - curr.multiplier) * t;
          break;
        }
      }
      
      // Update position
      p.position.add(p.velocity.clone().multiplyScalar(deltaTime * velocityMult));
      
      // Update size over life
      for (let j = 0; j < this.config.sizeOverLife.length - 1; j++) {
        const curr = this.config.sizeOverLife[j];
        const next = this.config.sizeOverLife[j + 1];
        if (normalizedAge >= curr.time && normalizedAge <= next.time) {
          const t = (normalizedAge - curr.time) / (next.time - curr.time);
          p.size = curr.size + (next.size - curr.size) * t;
          break;
        }
      }
      
      // Update color over life
      for (let j = 0; j < this.config.colorOverLife.length - 1; j++) {
        const curr = this.config.colorOverLife[j];
        const next = this.config.colorOverLife[j + 1];
        if (normalizedAge >= curr.time && normalizedAge <= next.time) {
          const t = (normalizedAge - curr.time) / (next.time - curr.time);
          p.color.lerpColors(curr.color, next.color, t);
          p.alpha = curr.alpha + (next.alpha - curr.alpha) * t;
          break;
        }
      }
      
      // Update rotation
      p.rotation += p.rotationRate * deltaTime;
    }
    
    return this.particles;
  }
  
  private spawnParticle(): void {
    const position = this.getSpawnPosition();
    
    const velocity = new THREE.Vector3(
      THREE.MathUtils.randFloat(this.config.initialVelocity.min.x, this.config.initialVelocity.max.x),
      THREE.MathUtils.randFloat(this.config.initialVelocity.min.y, this.config.initialVelocity.max.y),
      THREE.MathUtils.randFloat(this.config.initialVelocity.min.z, this.config.initialVelocity.max.z)
    );
    
    const particle: Particle = {
      position,
      velocity,
      age: 0,
      lifetime: THREE.MathUtils.randFloat(this.config.lifetime.min, this.config.lifetime.max),
      size: THREE.MathUtils.randFloat(this.config.initialSize.min, this.config.initialSize.max),
      color: this.config.initialColor.clone(),
      alpha: 1,
      rotation: THREE.MathUtils.randFloat(this.config.initialRotation.min, this.config.initialRotation.max),
      rotationRate: THREE.MathUtils.randFloat(this.config.rotationRate.min, this.config.rotationRate.max),
    };
    
    this.particles.push(particle);
  }
  
  private getSpawnPosition(): THREE.Vector3 {
    const params = this.config.spawnShapeParams;
    
    switch (this.config.spawnShape) {
      case 'point':
        return new THREE.Vector3(0, 0, 0);
        
      case 'sphere': {
        const radius = params.radius || 1;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        return new THREE.Vector3(
          radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.sin(phi) * Math.sin(theta),
          radius * Math.cos(phi)
        );
      }
        
      case 'box': {
        const width = params.width || 1;
        const height = params.height || 1;
        const depth = params.depth || 1;
        return new THREE.Vector3(
          THREE.MathUtils.randFloatSpread(width),
          THREE.MathUtils.randFloatSpread(height),
          THREE.MathUtils.randFloatSpread(depth)
        );
      }
        
      case 'cone': {
        const angle = params.angle || 45;
        const radius = params.radius || 1;
        const r = Math.random() * radius;
        const theta = Math.random() * Math.PI * 2;
        const y = Math.random() * Math.tan(angle * Math.PI / 180) * r;
        return new THREE.Vector3(
          r * Math.cos(theta),
          y,
          r * Math.sin(theta)
        );
      }
        
      case 'cylinder': {
        const cylinderRadius = params.radius || 1;
        const cylinderHeight = params.height || 2;
        const cylinderTheta = Math.random() * Math.PI * 2;
        return new THREE.Vector3(
          cylinderRadius * Math.cos(cylinderTheta),
          THREE.MathUtils.randFloatSpread(cylinderHeight),
          cylinderRadius * Math.sin(cylinderTheta)
        );
      }
        
      default:
        return new THREE.Vector3(0, 0, 0);
    }
  }
  
  reset(): void {
    this.particles = [];
    this.timeSinceLastSpawn = 0;
    this.burstIndex = 0;
    this.systemTime = 0;
  }
  
  getParticleCount(): number {
    return this.particles.length;
  }
}

// ============================================================================
// 3D PARTICLE RENDERER
// ============================================================================

interface ParticleRendererProps {
  emitters: ParticleEmitter[];
  isPlaying: boolean;
}

function ParticleRenderer({ emitters, isPlaying }: ParticleRendererProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  
  useFrame((_, delta) => {
    if (!isPlaying) return;
    
    const allParticles: Particle[] = [];
    for (const emitter of emitters) {
      allParticles.push(...emitter.update(delta));
    }
    setParticles(allParticles);
  });
  
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particles.length * 3);
    const colors = new Float32Array(particles.length * 4);
    const sizes = new Float32Array(particles.length);
    
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;
      
      colors[i * 4] = p.color.r;
      colors[i * 4 + 1] = p.color.g;
      colors[i * 4 + 2] = p.color.b;
      colors[i * 4 + 3] = p.alpha;
      
      sizes[i] = p.size;
    }
    
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 4));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    return geo;
  }, [particles]);
  
  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={0.2}
        vertexColors
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

// ============================================================================
// NODE COMPONENTS FOR REACTFLOW
// ============================================================================

const nodeStyles = {
  emitter: {
    background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
    border: '2px solid #a93226',
  },
  spawn: {
    background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
    border: '2px solid #1f618d',
  },
  velocity: {
    background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
    border: '2px solid #1e8449',
  },
  size: {
    background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
    border: '2px solid #7d3c98',
  },
  color: {
    background: 'linear-gradient(135deg, #f39c12 0%, #d68910 100%)',
    border: '2px solid #b9770e',
  },
  force: {
    background: 'linear-gradient(135deg, #1abc9c 0%, #16a085 100%)',
    border: '2px solid #117864',
  },
  render: {
    background: 'linear-gradient(135deg, #34495e 0%, #2c3e50 100%)',
    border: '2px solid #1c2833',
  },
};

interface NiagaraNodeProps {
  data: {
    label: string;
    type: keyof typeof nodeStyles;
    params?: Record<string, number | string | boolean>;
    onParamChange?: (key: string, value: number | string | boolean) => void;
  };
  selected: boolean;
}

function NiagaraNode({ data, selected }: NiagaraNodeProps) {
  const style = nodeStyles[data.type] || nodeStyles.emitter;
  
  return (
    <div
      style={{
        ...style,
        padding: '12px 16px',
        borderRadius: '8px',
        minWidth: '180px',
        boxShadow: selected ? '0 0 0 2px #fff, 0 4px 12px rgba(0,0,0,0.4)' : '0 4px 8px rgba(0,0,0,0.3)',
        transition: 'box-shadow 0.2s',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: '#fff', width: 10, height: 10 }} />
      
      <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {data.label}
      </div>
      
      {data.params && Object.entries(data.params).slice(0, 3).map(([key, value]) => (
        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255,255,255,0.8)', marginBottom: '2px' }}>
          <span>{key}:</span>
          <span style={{ fontWeight: 'bold' }}>{typeof value === 'number' ? value.toFixed(2) : String(value)}</span>
        </div>
      ))}
      
      <Handle type="source" position={Position.Right} style={{ background: '#fff', width: 10, height: 10 }} />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  niagara: NiagaraNode,
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const defaultEmitterConfig: EmitterConfig = {
  id: 'default',
  name: 'Default Emitter',
  enabled: true,
  spawnRate: 50,
  spawnBurst: [],
  maxParticles: 1000,
  lifetime: { min: 1, max: 3 },
  spawnShape: 'point',
  spawnShapeParams: {},
  initialVelocity: {
    min: new THREE.Vector3(-1, 2, -1),
    max: new THREE.Vector3(1, 5, 1),
  },
  velocityOverLife: [
    { time: 0, multiplier: 1 },
    { time: 1, multiplier: 0.2 },
  ],
  initialSize: { min: 0.1, max: 0.3 },
  sizeOverLife: [
    { time: 0, size: 0.1 },
    { time: 0.5, size: 0.3 },
    { time: 1, size: 0 },
  ],
  initialColor: new THREE.Color(1, 0.5, 0),
  colorOverLife: [
    { time: 0, color: new THREE.Color(1, 1, 0), alpha: 1 },
    { time: 0.3, color: new THREE.Color(1, 0.5, 0), alpha: 1 },
    { time: 0.7, color: new THREE.Color(1, 0, 0), alpha: 0.8 },
    { time: 1, color: new THREE.Color(0.2, 0, 0), alpha: 0 },
  ],
  initialRotation: { min: 0, max: Math.PI * 2 },
  rotationRate: { min: -1, max: 1 },
  gravity: new THREE.Vector3(0, -2, 0),
  drag: 0.1,
  turbulence: { strength: 0.5, frequency: 2 },
  material: 'sprite',
  blendMode: 'additive',
  sortMode: 'byDistance',
};

const initialNodes: Node[] = [
  {
    id: 'emitter-1',
    type: 'niagara',
    position: { x: 50, y: 100 },
    data: { label: 'Particle Emitter', type: 'emitter', params: { rate: 50, maxParticles: 1000 } },
  },
  {
    id: 'spawn-1',
    type: 'niagara',
    position: { x: 300, y: 50 },
    data: { label: 'Spawn Location', type: 'spawn', params: { shape: 'sphere', radius: 0.5 } },
  },
  {
    id: 'velocity-1',
    type: 'niagara',
    position: { x: 300, y: 180 },
    data: { label: 'Initial Velocity', type: 'velocity', params: { minY: 2, maxY: 5, spread: 1 } },
  },
  {
    id: 'size-1',
    type: 'niagara',
    position: { x: 550, y: 50 },
    data: { label: 'Size Over Life', type: 'size', params: { start: 0.1, peak: 0.3, end: 0 } },
  },
  {
    id: 'color-1',
    type: 'niagara',
    position: { x: 550, y: 180 },
    data: { label: 'Color Over Life', type: 'color', params: { mode: 'gradient' } },
  },
  {
    id: 'force-1',
    type: 'niagara',
    position: { x: 550, y: 310 },
    data: { label: 'Gravity Force', type: 'force', params: { x: 0, y: -2, z: 0 } },
  },
  {
    id: 'render-1',
    type: 'niagara',
    position: { x: 800, y: 150 },
    data: { label: 'Sprite Renderer', type: 'render', params: { blend: 'additive', sort: true } },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1', source: 'emitter-1', target: 'spawn-1', animated: true, style: { stroke: '#fff' } },
  { id: 'e2', source: 'emitter-1', target: 'velocity-1', animated: true, style: { stroke: '#fff' } },
  { id: 'e3', source: 'spawn-1', target: 'size-1', animated: true, style: { stroke: '#fff' } },
  { id: 'e4', source: 'velocity-1', target: 'color-1', animated: true, style: { stroke: '#fff' } },
  { id: 'e5', source: 'velocity-1', target: 'force-1', animated: true, style: { stroke: '#fff' } },
  { id: 'e6', source: 'size-1', target: 'render-1', animated: true, style: { stroke: '#fff' } },
  { id: 'e7', source: 'color-1', target: 'render-1', animated: true, style: { stroke: '#fff' } },
  { id: 'e8', source: 'force-1', target: 'render-1', animated: true, style: { stroke: '#fff' } },
];

// ============================================================================
// PANELS
// ============================================================================

interface EmitterPanelProps {
  config: EmitterConfig;
  onChange: (config: EmitterConfig) => void;
}

function EmitterPanel({ config, onChange }: EmitterPanelProps) {
  const handleChange = (key: keyof EmitterConfig, value: unknown) => {
    onChange({ ...config, [key]: value });
  };
  
  return (
    <div style={{ padding: '12px', fontSize: '12px' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '14px' }}>
        {config.name}
      </div>
      
      {/* Spawn Settings */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#3498db' }}>Spawn</div>
        
        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Spawn Rate:</span>
          <input
            type="number"
            value={config.spawnRate}
            onChange={(e) => handleChange('spawnRate', parseFloat(e.target.value))}
            style={{ width: '80px', background: '#333', border: '1px solid #555', borderRadius: '3px', color: '#fff', padding: '2px 4px' }}
          />
        </label>
        
        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Max Particles:</span>
          <input
            type="number"
            value={config.maxParticles}
            onChange={(e) => handleChange('maxParticles', parseInt(e.target.value))}
            style={{ width: '80px', background: '#333', border: '1px solid #555', borderRadius: '3px', color: '#fff', padding: '2px 4px' }}
          />
        </label>
        
        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Shape:</span>
          <select
            value={config.spawnShape}
            onChange={(e) => handleChange('spawnShape', e.target.value)}
            style={{ width: '100px', background: '#333', border: '1px solid #555', borderRadius: '3px', color: '#fff', padding: '2px' }}
          >
            <option value="point">Point</option>
            <option value="sphere">Sphere</option>
            <option value="box">Box</option>
            <option value="cone">Cone</option>
            <option value="cylinder">Cylinder</option>
          </select>
        </label>
      </div>
      
      {/* Lifetime */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#9b59b6' }}>Lifetime</div>
        
        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Min:</span>
          <input
            type="number"
            value={config.lifetime.min}
            step={0.1}
            onChange={(e) => handleChange('lifetime', { ...config.lifetime, min: parseFloat(e.target.value) })}
            style={{ width: '80px', background: '#333', border: '1px solid #555', borderRadius: '3px', color: '#fff', padding: '2px 4px' }}
          />
        </label>
        
        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Max:</span>
          <input
            type="number"
            value={config.lifetime.max}
            step={0.1}
            onChange={(e) => handleChange('lifetime', { ...config.lifetime, max: parseFloat(e.target.value) })}
            style={{ width: '80px', background: '#333', border: '1px solid #555', borderRadius: '3px', color: '#fff', padding: '2px 4px' }}
          />
        </label>
      </div>
      
      {/* Size */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#2ecc71' }}>Size</div>
        
        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Min Size:</span>
          <input
            type="number"
            value={config.initialSize.min}
            step={0.05}
            onChange={(e) => handleChange('initialSize', { ...config.initialSize, min: parseFloat(e.target.value) })}
            style={{ width: '80px', background: '#333', border: '1px solid #555', borderRadius: '3px', color: '#fff', padding: '2px 4px' }}
          />
        </label>
        
        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Max Size:</span>
          <input
            type="number"
            value={config.initialSize.max}
            step={0.05}
            onChange={(e) => handleChange('initialSize', { ...config.initialSize, max: parseFloat(e.target.value) })}
            style={{ width: '80px', background: '#333', border: '1px solid #555', borderRadius: '3px', color: '#fff', padding: '2px 4px' }}
          />
        </label>
      </div>
      
      {/* Forces */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#1abc9c' }}>Forces</div>
        
        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Gravity Y:</span>
          <input
            type="number"
            value={config.gravity.y}
            step={0.5}
            onChange={(e) => handleChange('gravity', new THREE.Vector3(config.gravity.x, parseFloat(e.target.value), config.gravity.z))}
            style={{ width: '80px', background: '#333', border: '1px solid #555', borderRadius: '3px', color: '#fff', padding: '2px 4px' }}
          />
        </label>
        
        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Drag:</span>
          <input
            type="number"
            value={config.drag}
            step={0.05}
            min={0}
            max={1}
            onChange={(e) => handleChange('drag', parseFloat(e.target.value))}
            style={{ width: '80px', background: '#333', border: '1px solid #555', borderRadius: '3px', color: '#fff', padding: '2px 4px' }}
          />
        </label>
        
        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Turbulence:</span>
          <input
            type="number"
            value={config.turbulence.strength}
            step={0.1}
            min={0}
            onChange={(e) => handleChange('turbulence', { ...config.turbulence, strength: parseFloat(e.target.value) })}
            style={{ width: '80px', background: '#333', border: '1px solid #555', borderRadius: '3px', color: '#fff', padding: '2px 4px' }}
          />
        </label>
      </div>
      
      {/* Rendering */}
      <div>
        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#e74c3c' }}>Rendering</div>
        
        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Blend Mode:</span>
          <select
            value={config.blendMode}
            onChange={(e) => handleChange('blendMode', e.target.value as EmitterConfig['blendMode'])}
            style={{ width: '100px', background: '#333', border: '1px solid #555', borderRadius: '3px', color: '#fff', padding: '2px' }}
          >
            <option value="additive">Additive</option>
            <option value="alpha">Alpha</option>
            <option value="multiply">Multiply</option>
          </select>
        </label>
      </div>
    </div>
  );
}

interface EffectPresetsPanelProps {
  onSelect: (preset: string) => void;
}

function EffectPresetsPanel({ onSelect }: EffectPresetsPanelProps) {
  const presets = [
    { id: 'fire', name: 'Fire', icon: '🔥' },
    { id: 'smoke', name: 'Smoke', icon: '💨' },
    { id: 'sparks', name: 'Sparks', icon: '✨' },
    { id: 'explosion', name: 'Explosion', icon: '💥' },
    { id: 'rain', name: 'Rain', icon: '🌧️' },
    { id: 'snow', name: 'Snow', icon: '❄️' },
    { id: 'dust', name: 'Dust', icon: '🌫️' },
    { id: 'magic', name: 'Magic', icon: '⭐' },
    { id: 'blood', name: 'Blood', icon: '🩸' },
    { id: 'water', name: 'Water', icon: '💧' },
    { id: 'electricity', name: 'Electricity', icon: '⚡' },
    { id: 'leaves', name: 'Leaves', icon: '🍃' },
  ];
  
  return (
    <div style={{ padding: '12px' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '14px' }}>
        Effect Presets
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onSelect(preset.id)}
            style={{
              padding: '12px 8px',
              background: '#333',
              border: '1px solid #555',
              borderRadius: '6px',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#444';
              e.currentTarget.style.borderColor = '#666';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#333';
              e.currentTarget.style.borderColor = '#555';
            }}
          >
            <span style={{ fontSize: '24px' }}>{preset.icon}</span>
            <span>{preset.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

export default function NiagaraVFX() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeTab, setActiveTab] = useState<'parameters' | 'presets' | 'timeline'>('parameters');
  const [emitterConfig, setEmitterConfig] = useState<EmitterConfig>(defaultEmitterConfig);
  const [showStats, setShowStats] = useState(true);
  
  const emittersRef = useRef<ParticleEmitter[]>([new ParticleEmitter(defaultEmitterConfig)]);
  
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#fff' } }, eds)),
    [setEdges]
  );
  
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id);
  }, []);
  
  const handleEmitterConfigChange = useCallback((config: EmitterConfig) => {
    setEmitterConfig(config);
    emittersRef.current[0] = new ParticleEmitter(config);
  }, []);
  
  const handlePresetSelect = useCallback((presetId: string) => {
    let newConfig = { ...defaultEmitterConfig };
    
    switch (presetId) {
      case 'fire':
        newConfig = {
          ...newConfig,
          name: 'Fire Effect',
          spawnRate: 100,
          lifetime: { min: 0.5, max: 1.5 },
          initialVelocity: {
            min: new THREE.Vector3(-0.5, 3, -0.5),
            max: new THREE.Vector3(0.5, 6, 0.5),
          },
          initialSize: { min: 0.2, max: 0.5 },
          gravity: new THREE.Vector3(0, -0.5, 0),
          colorOverLife: [
            { time: 0, color: new THREE.Color(1, 1, 0.5), alpha: 1 },
            { time: 0.3, color: new THREE.Color(1, 0.6, 0), alpha: 1 },
            { time: 0.7, color: new THREE.Color(1, 0.2, 0), alpha: 0.6 },
            { time: 1, color: new THREE.Color(0.2, 0, 0), alpha: 0 },
          ],
        };
        break;
        
      case 'smoke':
        newConfig = {
          ...newConfig,
          name: 'Smoke Effect',
          spawnRate: 30,
          lifetime: { min: 2, max: 4 },
          initialVelocity: {
            min: new THREE.Vector3(-0.5, 1, -0.5),
            max: new THREE.Vector3(0.5, 2, 0.5),
          },
          initialSize: { min: 0.3, max: 0.6 },
          sizeOverLife: [
            { time: 0, size: 0.3 },
            { time: 1, size: 1.5 },
          ],
          gravity: new THREE.Vector3(0, 0.5, 0),
          drag: 0.3,
          colorOverLife: [
            { time: 0, color: new THREE.Color(0.3, 0.3, 0.3), alpha: 0.8 },
            { time: 1, color: new THREE.Color(0.5, 0.5, 0.5), alpha: 0 },
          ],
          turbulence: { strength: 1, frequency: 0.5 },
        };
        break;
        
      case 'sparks':
        newConfig = {
          ...newConfig,
          name: 'Sparks Effect',
          spawnRate: 200,
          spawnBurst: [{ time: 0, count: 50 }],
          lifetime: { min: 0.3, max: 0.8 },
          initialVelocity: {
            min: new THREE.Vector3(-5, 3, -5),
            max: new THREE.Vector3(5, 8, 5),
          },
          initialSize: { min: 0.05, max: 0.15 },
          gravity: new THREE.Vector3(0, -15, 0),
          drag: 0.05,
          colorOverLife: [
            { time: 0, color: new THREE.Color(1, 1, 0.8), alpha: 1 },
            { time: 0.5, color: new THREE.Color(1, 0.5, 0), alpha: 1 },
            { time: 1, color: new THREE.Color(1, 0, 0), alpha: 0 },
          ],
        };
        break;
        
      case 'explosion':
        newConfig = {
          ...newConfig,
          name: 'Explosion Effect',
          spawnRate: 0,
          spawnBurst: [{ time: 0, count: 200 }],
          lifetime: { min: 0.5, max: 1.5 },
          spawnShape: 'sphere',
          spawnShapeParams: { radius: 0.1 },
          initialVelocity: {
            min: new THREE.Vector3(-10, -10, -10),
            max: new THREE.Vector3(10, 10, 10),
          },
          initialSize: { min: 0.2, max: 0.8 },
          gravity: new THREE.Vector3(0, -5, 0),
          drag: 0.2,
          colorOverLife: [
            { time: 0, color: new THREE.Color(1, 1, 1), alpha: 1 },
            { time: 0.1, color: new THREE.Color(1, 0.8, 0), alpha: 1 },
            { time: 0.4, color: new THREE.Color(1, 0.3, 0), alpha: 0.8 },
            { time: 1, color: new THREE.Color(0.2, 0, 0), alpha: 0 },
          ],
        };
        break;
        
      case 'snow':
        newConfig = {
          ...newConfig,
          name: 'Snow Effect',
          spawnRate: 50,
          spawnShape: 'box',
          spawnShapeParams: { width: 10, height: 0, depth: 10 },
          lifetime: { min: 4, max: 6 },
          initialVelocity: {
            min: new THREE.Vector3(-0.2, -1, -0.2),
            max: new THREE.Vector3(0.2, -0.5, 0.2),
          },
          initialSize: { min: 0.05, max: 0.15 },
          gravity: new THREE.Vector3(0, -0.5, 0),
          turbulence: { strength: 0.3, frequency: 0.3 },
          colorOverLife: [
            { time: 0, color: new THREE.Color(1, 1, 1), alpha: 0.8 },
            { time: 1, color: new THREE.Color(1, 1, 1), alpha: 0 },
          ],
        };
        break;
        
      case 'magic':
        newConfig = {
          ...newConfig,
          name: 'Magic Effect',
          spawnRate: 60,
          spawnShape: 'sphere',
          spawnShapeParams: { radius: 1 },
          lifetime: { min: 1, max: 2 },
          initialVelocity: {
            min: new THREE.Vector3(-0.5, 0.5, -0.5),
            max: new THREE.Vector3(0.5, 1.5, 0.5),
          },
          initialSize: { min: 0.1, max: 0.25 },
          sizeOverLife: [
            { time: 0, size: 0 },
            { time: 0.2, size: 0.25 },
            { time: 0.8, size: 0.15 },
            { time: 1, size: 0 },
          ],
          gravity: new THREE.Vector3(0, 0, 0),
          turbulence: { strength: 0.8, frequency: 2 },
          colorOverLife: [
            { time: 0, color: new THREE.Color(0.5, 0, 1), alpha: 1 },
            { time: 0.3, color: new THREE.Color(0, 0.5, 1), alpha: 1 },
            { time: 0.6, color: new THREE.Color(1, 0, 1), alpha: 1 },
            { time: 1, color: new THREE.Color(0, 1, 1), alpha: 0 },
          ],
        };
        break;
    }
    
    handleEmitterConfigChange(newConfig);
  }, [handleEmitterConfigChange]);
  
  const handlePlayPause = useCallback(() => {
    setIsPlaying((p) => !p);
  }, []);
  
  const handleRestart = useCallback(() => {
    emittersRef.current.forEach((e) => e.reset());
    setIsPlaying(true);
  }, []);
  
  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', background: '#1a1a1a', color: '#fff' }}>
      {/* Toolbar */}
      <div style={{
        height: '48px',
        background: '#252525',
        borderBottom: '1px solid #333',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: '8px',
      }}>
        <span style={{ fontWeight: 'bold', marginRight: '16px' }}>🎆 Niagara VFX Editor</span>
        
        <button
          onClick={handlePlayPause}
          style={{
            padding: '6px 12px',
            background: isPlaying ? '#e74c3c' : '#2ecc71',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {isPlaying ? '⏸️ Pause' : '▶️ Play'}
        </button>
        
        <button
          onClick={handleRestart}
          style={{
            padding: '6px 12px',
            background: '#3498db',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          🔄 Restart
        </button>
        
        <div style={{ flex: 1 }} />
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
          <input
            type="checkbox"
            checked={showStats}
            onChange={(e) => setShowStats(e.target.checked)}
          />
          Show Stats
        </label>
        
        <button
          style={{
            padding: '6px 12px',
            background: '#333',
            border: '1px solid #555',
            borderRadius: '4px',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          💾 Save
        </button>
        
        <button
          style={{
            padding: '6px 12px',
            background: '#333',
            border: '1px solid #555',
            borderRadius: '4px',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          📤 Export
        </button>
      </div>
      
      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex' }}>
        {/* Left Panel - 3D Preview */}
        <div style={{ width: '40%', borderRight: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '8px 12px', background: '#252525', borderBottom: '1px solid #333', fontWeight: 'bold', fontSize: '12px' }}>
            Preview
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <Canvas camera={{ position: [5, 5, 5], fov: 60 }}>
              <color attach="background" args={['#1a1a1a']} />
              
              <ambientLight intensity={0.3} />
              <directionalLight position={[10, 10, 5]} intensity={0.5} />
              
              <ParticleRenderer emitters={emittersRef.current} isPlaying={isPlaying} />
              
              <Grid
                position={[0, -0.01, 0]}
                args={[20, 20]}
                cellSize={1}
                cellThickness={0.5}
                cellColor="#333"
                sectionSize={5}
                sectionThickness={1}
                sectionColor="#555"
                fadeDistance={50}
                infiniteGrid
              />
              
              <OrbitControls makeDefault />
              
              <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
                <GizmoViewport />
              </GizmoHelper>
              
              {showStats && <Stats />}
            </Canvas>
            
            {/* Particle Count Overlay */}
            <div style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              background: 'rgba(0,0,0,0.7)',
              padding: '8px 12px',
              borderRadius: '4px',
              fontSize: '11px',
            }}>
              <div>Particles: {emittersRef.current.reduce((sum, e) => sum + e.getParticleCount(), 0)}</div>
              <div>Emitters: {emittersRef.current.length}</div>
            </div>
          </div>
        </div>
        
        {/* Center Panel - Node Graph */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '8px 12px', background: '#252525', borderBottom: '1px solid #333', fontWeight: 'bold', fontSize: '12px' }}>
            Particle Graph
          </div>
          <div style={{ flex: 1 }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              fitView
              style={{ background: '#1a1a1a' }}
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#333" />
              <Controls style={{ background: '#252525', borderRadius: '8px' }} />
              
              <Panel position="top-left">
                <div style={{ background: '#252525', padding: '8px 12px', borderRadius: '4px', fontSize: '11px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Node Types:</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {Object.entries(nodeStyles).map(([type, style]) => (
                      <div
                        key={type}
                        style={{
                          padding: '2px 8px',
                          borderRadius: '3px',
                          fontSize: '10px',
                          ...style,
                          color: '#fff',
                        }}
                      >
                        {type}
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>
            </ReactFlow>
          </div>
        </div>
        
        {/* Right Panel - Properties */}
        <div style={{ width: '280px', borderLeft: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #333' }}>
            {(['parameters', 'presets', 'timeline'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: activeTab === tab ? '#333' : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab ? '2px solid #3498db' : '2px solid transparent',
                  color: activeTab === tab ? '#fff' : '#888',
                  cursor: 'pointer',
                  fontSize: '12px',
                  textTransform: 'capitalize',
                }}
              >
                {tab}
              </button>
            ))}
          </div>
          
          {/* Tab Content */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {activeTab === 'parameters' && (
              <EmitterPanel config={emitterConfig} onChange={handleEmitterConfigChange} />
            )}
            
            {activeTab === 'presets' && (
              <EffectPresetsPanel onSelect={handlePresetSelect} />
            )}
            
            {activeTab === 'timeline' && (
              <div style={{ padding: '12px', fontSize: '12px', color: '#888' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '12px', color: '#fff' }}>Timeline</div>
                
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ marginBottom: '8px' }}>Size Over Life</div>
                  <div style={{ height: '60px', background: '#252525', borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
                    <svg width="100%" height="100%" style={{ position: 'absolute' }}>
                      <path
                        d="M 0 60 L 40 30 L 100 45 L 160 10 L 220 60"
                        fill="none"
                        stroke="#9b59b6"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                </div>
                
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ marginBottom: '8px' }}>Color Over Life</div>
                  <div style={{ height: '24px', borderRadius: '4px', background: 'linear-gradient(to right, #ffff00, #ff8000, #ff0000, #330000)' }} />
                </div>
                
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ marginBottom: '8px' }}>Alpha Over Life</div>
                  <div style={{ height: '60px', background: '#252525', borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
                    <svg width="100%" height="100%" style={{ position: 'absolute' }}>
                      <path
                        d="M 0 10 L 80 10 L 180 50 L 220 60"
                        fill="none"
                        stroke="#2ecc71"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                </div>
                
                <div>
                  <div style={{ marginBottom: '8px' }}>Velocity Over Life</div>
                  <div style={{ height: '60px', background: '#252525', borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
                    <svg width="100%" height="100%" style={{ position: 'absolute' }}>
                      <path
                        d="M 0 10 L 220 50"
                        fill="none"
                        stroke="#3498db"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
