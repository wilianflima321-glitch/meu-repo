'use client';
// @aethel-heavy-async-boundary
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
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, GizmoHelper, GizmoViewport, Grid, Stats } from '@react-three/drei';
import * as THREE from 'three';
import { resolveCssVarColor, resolveCssVarRgba } from '@/lib/style/resolve-css-var';
import { defaultEmitterConfig, EffectPresetsPanel, EmitterPanel, initialEdges, initialNodes, nodeStyles, nodeTypes, ParticleRenderer } from './NiagaraVFXPanels';
export interface ParticleSystemState {
  id: string;
  name: string;
  emitters: EmitterConfig[];
  isPlaying: boolean;
  duration: number;
  looping: boolean;
}
export interface EmitterConfig {
  id: string;
  name: string;
  enabled: boolean;
  spawnRate: number;
  spawnBurst: { time: number; count: number }[];
  maxParticles: number;
  lifetime: { min: number; max: number };
  spawnShape: 'point' | 'sphere' | 'box' | 'cone' | 'cylinder' | 'mesh';
  spawnShapeParams: Record<string, number>;
  initialVelocity: { min: THREE.Vector3; max: THREE.Vector3 };
  velocityOverLife: VelocityCurve[];
  initialSize: { min: number; max: number };
  sizeOverLife: SizeCurve[];
  initialColor: THREE.Color;
  colorOverLife: ColorGradient[];
  initialRotation: { min: number; max: number };
  rotationRate: { min: number; max: number };
  gravity: THREE.Vector3;
  drag: number;
  turbulence: { strength: number; frequency: number };
  material: 'sprite' | 'mesh' | 'ribbon' | 'beam';
  texture?: string;
  blendMode: 'additive' | 'alpha' | 'multiply';
  sortMode: 'none' | 'byDistance' | 'byAge';
}
export interface VelocityCurve {
  time: number;
  multiplier: number;
}
export interface SizeCurve {
  time: number;
  size: number;
}
export interface ColorGradient {
  time: number;
  color: THREE.Color;
  alpha: number;
}
export interface Particle {
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
export class ParticleEmitter {
  private particles: Particle[] = [];
  private timeSinceLastSpawn: number = 0;
  private burstIndex: number = 0;
  private systemTime: number = 0;
  constructor(public config: EmitterConfig) {}
  update(deltaTime: number): Particle[] {
    if (!this.config.enabled) return this.particles;
    this.systemTime += deltaTime;
    this.timeSinceLastSpawn += deltaTime;
    const spawnInterval = 1 / this.config.spawnRate;
    while (this.timeSinceLastSpawn >= spawnInterval && this.particles.length < this.config.maxParticles) {
      this.spawnParticle();
      this.timeSinceLastSpawn -= spawnInterval;
    }
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
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += deltaTime;
      if (p.age >= p.lifetime) {
        this.particles.splice(i, 1);
        continue;
      }
      const normalizedAge = p.age / p.lifetime;
      p.velocity.add(this.config.gravity.clone().multiplyScalar(deltaTime));
      p.velocity.multiplyScalar(1 - this.config.drag * deltaTime);
      if (this.config.turbulence.strength > 0) {
        const turb = new THREE.Vector3(
          Math.sin(this.systemTime * this.config.turbulence.frequency + p.position.x),
          Math.cos(this.systemTime * this.config.turbulence.frequency + p.position.y),
          Math.sin(this.systemTime * this.config.turbulence.frequency + p.position.z)
        ).multiplyScalar(this.config.turbulence.strength * deltaTime);
        p.velocity.add(turb);
      }
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
      p.position.add(p.velocity.clone().multiplyScalar(deltaTime * velocityMult));
      for (let j = 0; j < this.config.sizeOverLife.length - 1; j++) {
        const curr = this.config.sizeOverLife[j];
        const next = this.config.sizeOverLife[j + 1];
        if (normalizedAge >= curr.time && normalizedAge <= next.time) {
          const t = (normalizedAge - curr.time) / (next.time - curr.time);
          p.size = curr.size + (next.size - curr.size) * t;
          break;
        }
      }
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
export default function NiagaraVFX() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeTab, setActiveTab] = useState<'parameters' | 'presets' | 'timeline'>('parameters');
  const [emitterConfig, setEmitterConfig] = useState<EmitterConfig>(defaultEmitterConfig);
  const [showStats, setShowStats] = useState(true);
  const sceneBackground = useMemo(() => resolveCssVarColor('--aethel-surface-primary', 'rgb(26, 26, 26)'), []);
  const gridCellColor = useMemo(() => resolveCssVarColor('--aethel-border-primary', 'rgb(51, 51, 51)'), []);
  const gridSectionColor = useMemo(() => resolveCssVarColor('--aethel-border-secondary', 'rgb(85, 85, 85)'), []);
  const overlayBackground = useMemo(() => resolveCssVarRgba('--aethel-surface-primary', 0.7, 'rgba(0,0,0,0.7)'), []);
  const emittersRef = useRef<ParticleEmitter[]>([new ParticleEmitter(defaultEmitterConfig)]);
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: 'var(--aethel-text-primary)' } }, eds)),
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
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--aethel-surface-primary)', color: 'var(--aethel-text-primary)' }}>
      {/* Toolbar */}
      <div style={{
        height: '48px',
        background: 'var(--aethel-surface-tertiary)',
        borderBottom: '1px solid var(--aethel-border-primary)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: '8px',
      }}>
        <span style={{ fontWeight: 'bold', marginRight: '16px' }}>🎆 Niagara VFX Editor</span>
        <button type="button" aria-label={isPlaying ? 'Pause Niagara simulation' : 'Play Niagara simulation'}
          onClick={handlePlayPause}
          style={{
            padding: '6px 12px',
            background: isPlaying ? 'var(--aethel-error)' : 'var(--aethel-success)',
            border: 'none',
            borderRadius: '4px',
            color: 'var(--aethel-text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {isPlaying ? '⏸️ Pause' : '▶️ Play'}
        </button>
        <button type="button" aria-label="Restart Niagara simulation"
          onClick={handleRestart}
          style={{
            padding: '6px 12px',
            background: 'var(--aethel-primary)',
            border: 'none',
            borderRadius: '4px',
            color: 'var(--aethel-text-primary)',
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
          type="button"
          style={{
            padding: '6px 12px',
            background: 'var(--aethel-surface-quaternary)',
            border: '1px solid var(--aethel-border-secondary)',
            borderRadius: '4px',
            color: 'var(--aethel-text-primary)',
            cursor: 'pointer',
          }}
        >
          Save
        </button>
        <button
          type="button"
          style={{
            padding: '6px 12px',
            background: 'var(--aethel-surface-quaternary)',
            border: '1px solid var(--aethel-border-secondary)',
            borderRadius: '4px',
            color: 'var(--aethel-text-primary)',
            cursor: 'pointer',
          }}
        >
          Export
        </button>
      </div>
      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex' }}>
        {/* Left Panel - 3D Preview */}
        <div style={{ width: '40%', borderRight: '1px solid var(--aethel-border-primary)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '8px 12px', background: 'var(--aethel-surface-tertiary)', borderBottom: '1px solid var(--aethel-border-primary)', fontWeight: 'bold', fontSize: '12px' }}>
            Preview
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <Canvas camera={{ position: [5, 5, 5], fov: 60 }}>
              <color attach="background" args={[sceneBackground]} />
              <ambientLight intensity={0.3} />
              <directionalLight position={[10, 10, 5]} intensity={0.5} />
              <ParticleRenderer emitters={emittersRef.current} isPlaying={isPlaying} />
              <Grid
                position={[0, -0.01, 0]}
                args={[20, 20]}
                cellSize={1}
                cellThickness={0.5}
                cellColor={gridCellColor}
                sectionSize={5}
                sectionThickness={1}
                sectionColor={gridSectionColor}
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
              background: overlayBackground,
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
          <div style={{ padding: '8px 12px', background: 'var(--aethel-surface-tertiary)', borderBottom: '1px solid var(--aethel-border-primary)', fontWeight: 'bold', fontSize: '12px' }}>
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
              style={{ background: 'var(--aethel-surface-primary)' }}
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--aethel-border-primary)" />
              <Controls style={{ background: 'var(--aethel-surface-tertiary)', borderRadius: '8px' }} />
              <Panel position="top-left">
                <div style={{ background: 'var(--aethel-surface-tertiary)', padding: '8px 12px', borderRadius: '4px', fontSize: '11px' }}>
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
                          color: 'var(--aethel-text-primary)',
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
        <div style={{ width: '280px', borderLeft: '1px solid var(--aethel-border-primary)', display: 'flex', flexDirection: 'column' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--aethel-border-primary)' }}>
            {(['parameters', 'presets', 'timeline'] as const).map((tab) => (
              <button type="button" aria-label={`Open Niagara ${tab} tab`}
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: activeTab === tab ? 'var(--aethel-surface-quaternary)' : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab ? '2px solid var(--aethel-primary)' : '2px solid transparent',
                  color: activeTab === tab ? 'var(--aethel-text-primary)' : 'var(--aethel-text-quaternary)',
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
              <div style={{ padding: '12px', fontSize: '12px', color: 'var(--aethel-text-quaternary)' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '12px', color: 'var(--aethel-text-primary)' }}>Timeline</div>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ marginBottom: '8px' }}>Size Over Life</div>
                  <div style={{ height: '60px', background: 'var(--aethel-surface-tertiary)', borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
                    <svg width="100%" height="100%" style={{ position: 'absolute' }}>
                      <path
                        d="M 0 60 L 40 30 L 100 45 L 160 10 L 220 60"
                        fill="none"
                        stroke="var(--aethel-accent)"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ marginBottom: '8px' }}>Color Over Life</div>
                  <div
                    style={{
                      height: '24px',
                      borderRadius: '4px',
                      background:
                        'linear-gradient(to right, var(--aethel-warning, rgb(245, 158, 11)), var(--aethel-accent-orange, rgb(249, 115, 22)), var(--aethel-error, rgb(239, 68, 68)), var(--aethel-surface-primary, rgb(26, 26, 26)))',
                    }}
                  />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ marginBottom: '8px' }}>Alpha Over Life</div>
                  <div style={{ height: '60px', background: 'var(--aethel-surface-tertiary)', borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
                    <svg width="100%" height="100%" style={{ position: 'absolute' }}>
                      <path
                        d="M 0 10 L 80 10 L 180 50 L 220 60"
                        fill="none"
                        stroke="var(--aethel-success)"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                </div>
                <div>
                  <div style={{ marginBottom: '8px' }}>Velocity Over Life</div>
                  <div style={{ height: '60px', background: 'var(--aethel-surface-tertiary)', borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
                    <svg width="100%" height="100%" style={{ position: 'absolute' }}>
                      <path
                        d="M 0 10 L 220 50"
                        fill="none"
                        stroke="var(--aethel-primary)"
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
