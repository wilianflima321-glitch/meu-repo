'use client';

// @aethel-heavy-async-boundary: transitive runtime chunk loaded through NiagaraVFX.

import React, { useMemo, useRef, useState } from 'react';
import { Handle, Node, Edge, NodeTypes, Position } from '@xyflow/react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ParticleEmitter } from './NiagaraParticleEmitter.runtime';
import type { EmitterConfig, Particle } from './NiagaraVFX.types';

interface ParticleRendererProps {
  emitters: ParticleEmitter[];
  isPlaying: boolean;
}
export function ParticleRenderer({ emitters, isPlaying }: ParticleRendererProps) {
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
export const nodeStyles = {
  emitter: {
    background: 'linear-gradient(135deg, var(--aethel-error) 0%, color-mix(in_srgb,var(--aethel-error)_70%,var(--aethel-surface-primary)) 100%)',
    border: '2px solid color-mix(in_srgb,var(--aethel-error)_70%,var(--aethel-surface-primary))',
  },
  spawn: {
    background: 'linear-gradient(135deg, var(--aethel-primary) 0%, color-mix(in_srgb,var(--aethel-primary)_70%,var(--aethel-surface-primary)) 100%)',
    border: '2px solid color-mix(in_srgb,var(--aethel-primary)_70%,var(--aethel-surface-primary))',
  },
  velocity: {
    background: 'linear-gradient(135deg, var(--aethel-success) 0%, color-mix(in_srgb,var(--aethel-success)_70%,var(--aethel-surface-primary)) 100%)',
    border: '2px solid color-mix(in_srgb,var(--aethel-success)_70%,var(--aethel-surface-primary))',
  },
  size: {
    background: 'linear-gradient(135deg, var(--aethel-accent) 0%, color-mix(in_srgb,var(--aethel-accent)_70%,var(--aethel-surface-primary)) 100%)',
    border: '2px solid color-mix(in_srgb,var(--aethel-accent)_70%,var(--aethel-surface-primary))',
  },
  color: {
    background: 'linear-gradient(135deg, var(--aethel-warning) 0%, color-mix(in_srgb,var(--aethel-warning)_70%,var(--aethel-surface-primary)) 100%)',
    border: '2px solid color-mix(in_srgb,var(--aethel-warning)_70%,var(--aethel-surface-primary))',
  },
  force: {
    background: 'linear-gradient(135deg, var(--aethel-info) 0%, color-mix(in_srgb,var(--aethel-info)_70%,var(--aethel-surface-primary)) 100%)',
    border: '2px solid color-mix(in_srgb,var(--aethel-info)_70%,var(--aethel-surface-primary))',
  },
  render: {
    background: 'linear-gradient(135deg, var(--aethel-text-muted) 0%, color-mix(in_srgb,var(--aethel-text-muted)_70%,var(--aethel-surface-primary)) 100%)',
    border: '2px solid color-mix(in_srgb,var(--aethel-text-muted)_70%,var(--aethel-surface-primary))',
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
        boxShadow: selected ? '0 0 0 2px var(--aethel-text-primary), 0 4px 12px rgba(0,0,0,0.4)' : '0 4px 8px rgba(0,0,0,0.3)',
        transition: 'box-shadow 0.2s',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: 'var(--aethel-text-primary)', width: 10, height: 10 }} />
      <div style={{ color: 'var(--aethel-text-primary)', fontWeight: 'bold', fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {data.label}
      </div>
      {data.params && Object.entries(data.params).slice(0, 3).map(([key, value]) => (
        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'color-mix(in_srgb,var(--aethel-text-primary) 80%, transparent)', marginBottom: '2px' }}>
          <span>{key}:</span>
          <span style={{ fontWeight: 'bold' }}>{typeof value === 'number' ? value.toFixed(2) : String(value)}</span>
        </div>
      ))}
      <Handle type="source" position={Position.Right} style={{ background: 'var(--aethel-text-primary)', width: 10, height: 10 }} />
    </div>
  );
}
export const nodeTypes: NodeTypes = {
  niagara: NiagaraNode,
};
export const defaultEmitterConfig: EmitterConfig = {
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
export const initialNodes: Node[] = [
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
export const initialEdges: Edge[] = [
  { id: 'e1', source: 'emitter-1', target: 'spawn-1', animated: true, style: { stroke: 'var(--aethel-text-primary)' } },
  { id: 'e2', source: 'emitter-1', target: 'velocity-1', animated: true, style: { stroke: 'var(--aethel-text-primary)' } },
  { id: 'e3', source: 'spawn-1', target: 'size-1', animated: true, style: { stroke: 'var(--aethel-text-primary)' } },
  { id: 'e4', source: 'velocity-1', target: 'color-1', animated: true, style: { stroke: 'var(--aethel-text-primary)' } },
  { id: 'e5', source: 'velocity-1', target: 'force-1', animated: true, style: { stroke: 'var(--aethel-text-primary)' } },
  { id: 'e6', source: 'size-1', target: 'render-1', animated: true, style: { stroke: 'var(--aethel-text-primary)' } },
  { id: 'e7', source: 'color-1', target: 'render-1', animated: true, style: { stroke: 'var(--aethel-text-primary)' } },
  { id: 'e8', source: 'force-1', target: 'render-1', animated: true, style: { stroke: 'var(--aethel-text-primary)' } },
];
interface EmitterPanelProps {
  config: EmitterConfig;
  onChange: (config: EmitterConfig) => void;
}
export function EmitterPanel({ config, onChange }: EmitterPanelProps) {
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
        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: 'var(--aethel-primary)' }}>Spawn</div>
        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Spawn Rate:</span>
          <input
            type="number"
            value={config.spawnRate}
            onChange={(e) => handleChange('spawnRate', parseFloat(e.target.value))}
            style={{ width: '80px', background: 'var(--aethel-surface-quaternary)', border: '1px solid var(--aethel-border-secondary)', borderRadius: '3px', color: 'var(--aethel-text-primary)', padding: '2px 4px' }}
          />
        </label>
        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Max Particles:</span>
          <input
            type="number"
            value={config.maxParticles}
            onChange={(e) => handleChange('maxParticles', parseInt(e.target.value))}
            style={{ width: '80px', background: 'var(--aethel-surface-quaternary)', border: '1px solid var(--aethel-border-secondary)', borderRadius: '3px', color: 'var(--aethel-text-primary)', padding: '2px 4px' }}
          />
        </label>
        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Shape:</span>
          <select
            value={config.spawnShape}
            onChange={(e) => handleChange('spawnShape', e.target.value)}
            style={{ width: '100px', background: 'var(--aethel-surface-quaternary)', border: '1px solid var(--aethel-border-secondary)', borderRadius: '3px', color: 'var(--aethel-text-primary)', padding: '2px' }}
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
        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: 'var(--aethel-accent)' }}>Lifetime</div>
        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Min:</span>
          <input
            type="number"
            value={config.lifetime.min}
            step={0.1}
            onChange={(e) => handleChange('lifetime', { ...config.lifetime, min: parseFloat(e.target.value) })}
            style={{ width: '80px', background: 'var(--aethel-surface-quaternary)', border: '1px solid var(--aethel-border-secondary)', borderRadius: '3px', color: 'var(--aethel-text-primary)', padding: '2px 4px' }}
          />
        </label>
        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Max:</span>
          <input
            type="number"
            value={config.lifetime.max}
            step={0.1}
            onChange={(e) => handleChange('lifetime', { ...config.lifetime, max: parseFloat(e.target.value) })}
            style={{ width: '80px', background: 'var(--aethel-surface-quaternary)', border: '1px solid var(--aethel-border-secondary)', borderRadius: '3px', color: 'var(--aethel-text-primary)', padding: '2px 4px' }}
          />
        </label>
      </div>
      {/* Size */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: 'var(--aethel-success)' }}>Size</div>
        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Min Size:</span>
          <input
            type="number"
            value={config.initialSize.min}
            step={0.05}
            onChange={(e) => handleChange('initialSize', { ...config.initialSize, min: parseFloat(e.target.value) })}
            style={{ width: '80px', background: 'var(--aethel-surface-quaternary)', border: '1px solid var(--aethel-border-secondary)', borderRadius: '3px', color: 'var(--aethel-text-primary)', padding: '2px 4px' }}
          />
        </label>
        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Max Size:</span>
          <input
            type="number"
            value={config.initialSize.max}
            step={0.05}
            onChange={(e) => handleChange('initialSize', { ...config.initialSize, max: parseFloat(e.target.value) })}
            style={{ width: '80px', background: 'var(--aethel-surface-quaternary)', border: '1px solid var(--aethel-border-secondary)', borderRadius: '3px', color: 'var(--aethel-text-primary)', padding: '2px 4px' }}
          />
        </label>
      </div>
      {/* Forces */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: 'var(--aethel-info)' }}>Forces</div>
        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Gravity Y:</span>
          <input
            type="number"
            value={config.gravity.y}
            step={0.5}
            onChange={(e) => handleChange('gravity', new THREE.Vector3(config.gravity.x, parseFloat(e.target.value), config.gravity.z))}
            style={{ width: '80px', background: 'var(--aethel-surface-quaternary)', border: '1px solid var(--aethel-border-secondary)', borderRadius: '3px', color: 'var(--aethel-text-primary)', padding: '2px 4px' }}
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
            style={{ width: '80px', background: 'var(--aethel-surface-quaternary)', border: '1px solid var(--aethel-border-secondary)', borderRadius: '3px', color: 'var(--aethel-text-primary)', padding: '2px 4px' }}
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
            style={{ width: '80px', background: 'var(--aethel-surface-quaternary)', border: '1px solid var(--aethel-border-secondary)', borderRadius: '3px', color: 'var(--aethel-text-primary)', padding: '2px 4px' }}
          />
        </label>
      </div>
      {/* Rendering */}
      <div>
        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: 'var(--aethel-error)' }}>Rendering</div>
        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Blend Mode:</span>
          <select
            value={config.blendMode}
            onChange={(e) => handleChange('blendMode', e.target.value as EmitterConfig['blendMode'])}
            style={{ width: '100px', background: 'var(--aethel-surface-quaternary)', border: '1px solid var(--aethel-border-secondary)', borderRadius: '3px', color: 'var(--aethel-text-primary)', padding: '2px' }}
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
export function EffectPresetsPanel({ onSelect }: EffectPresetsPanelProps) {
  const presets = [
    { id: 'fire', name: 'Fire', icon: 'FI' },
    { id: 'smoke', name: 'Smoke', icon: 'SM' },
    { id: 'sparks', name: 'Sparks', icon: 'SP' },
    { id: 'explosion', name: 'Explosion', icon: 'EX' },
    { id: 'rain', name: 'Rain', icon: 'RN' },
    { id: 'snow', name: 'Snow', icon: 'SN' },
    { id: 'dust', name: 'Dust', icon: 'DU' },
    { id: 'magic', name: 'Magic', icon: 'MG' },
    { id: 'blood', name: 'Blood', icon: 'BL' },
    { id: 'water', name: 'Water', icon: 'WA' },
    { id: 'electricity', name: 'Electricity', icon: 'EL' },
    { id: 'leaves', name: 'Leaves', icon: 'LV' },
  ];
  return (
    <div style={{ padding: '12px' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '14px' }}>
        Effect Presets
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {presets.map((preset) => (
          <button type="button" aria-label={`Select Niagara preset ${preset.name}`}
            key={preset.id}
            onClick={() => onSelect(preset.id)}
            style={{
              padding: '12px 8px',
              background: 'var(--aethel-surface-quaternary)',
              border: '1px solid var(--aethel-border-secondary)',
              borderRadius: '6px',
              color: 'var(--aethel-text-primary)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--aethel-surface-tertiary)';
              e.currentTarget.style.borderColor = 'var(--aethel-border-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--aethel-surface-quaternary)';
              e.currentTarget.style.borderColor = 'var(--aethel-border-secondary)';
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
