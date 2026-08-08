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
import { resolveCssVarColor, resolveCssVarRgba } from '../../web/lib/style/resolve-css-var';
import { createComponentLogger } from '../../web/lib/observability/logger';
import { defaultEmitterConfig, compileGraphToEmitterConfig, EffectPresetsPanel, EmitterPanel, initialEdges, initialNodes, nodeStyles, nodeTypes, ParticleRenderer } from './NiagaraVFXPanels.runtime';
import { ParticleEmitter } from './NiagaraParticleEmitter.runtime';
import { NIAGARA_PRESET_FACTORIES } from './niagara-vfx-presets';
import type { EmitterConfig } from './NiagaraVFX.types';

const log = createComponentLogger('NiagaraVFX');

export { ParticleEmitter } from './NiagaraParticleEmitter.runtime';
export type {
  ColorGradient,
  EmitterConfig,
  Particle,
  ParticleSystemState,
  SizeCurve,
  VelocityCurve,
} from './NiagaraVFX.types';
// Maps a set of {time: 0..1, value} points onto a 220x60 SVG path, normalized
// against `maxValue` (or the curve's own peak when omitted). Used to render the
// Timeline tab's Size/Alpha/Velocity-over-life graphs from the real emitterConfig.
function curveToSvgPath(points: { time: number; value: number }[], maxValue?: number): string {
  if (points.length === 0) return '';
  const sorted = [...points].sort((a, b) => a.time - b.time);
  const width = 220;
  const height = 60;
  const peak = maxValue ?? Math.max(...sorted.map((p) => p.value), 0.0001);
  const toXY = (p: { time: number; value: number }) => {
    const x = Math.min(1, Math.max(0, p.time)) * width;
    const y = height - Math.min(1, Math.max(0, p.value / peak)) * height;
    return `${x.toFixed(1)} ${y.toFixed(1)}`;
  };
  if (sorted.length === 1) {
    const xy = toXY(sorted[0]);
    return `M 0 ${xy.split(' ')[1]} L ${width} ${xy.split(' ')[1]}`;
  }
  return `M ${toXY(sorted[0])} ${sorted
    .slice(1)
    .map((p) => `L ${toXY(p)}`)
    .join(' ')}`;
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

  // DEBT-NIAGARA-002: Compile node graph to EmitterConfig automatically
  useEffect(() => {
    const compiled = compileGraphToEmitterConfig(nodes, edges, emitterConfig);
    setEmitterConfig(compiled);
    emittersRef.current[0] = new ParticleEmitter(compiled);
  }, [nodes, edges]);

  const handlePresetSelect = useCallback((presetId: string) => {
    const factory = NIAGARA_PRESET_FACTORIES[presetId];
    if (!factory) {
      log.warn('niagara_preset_not_found', { presetId });
      return;
    }
    handleEmitterConfigChange(factory({ ...defaultEmitterConfig }));
  }, [handleEmitterConfigChange]);
  const handlePlayPause = useCallback(() => {
    setIsPlaying((p) => !p);
  }, []);
  // Live curve paths derived from the actual emitterConfig — replaces static placeholder SVGs
  // so Timeline actually reflects the current node graph / preset (DEBT-NIAGARA-003).
  const sizeCurvePath = useMemo(
    () => curveToSvgPath(emitterConfig.sizeOverLife.map((c) => ({ time: c.time, value: c.size }))),
    [emitterConfig.sizeOverLife]
  );
  const alphaCurvePath = useMemo(
    () => curveToSvgPath(emitterConfig.colorOverLife.map((c) => ({ time: c.time, value: c.alpha })), 1),
    [emitterConfig.colorOverLife]
  );
  const velocityCurvePath = useMemo(
    () => curveToSvgPath(emitterConfig.velocityOverLife.map((c) => ({ time: c.time, value: c.multiplier }))),
    [emitterConfig.velocityOverLife]
  );
  const colorOverLifeGradient = useMemo(() => {
    const stops = [...emitterConfig.colorOverLife].sort((a, b) => a.time - b.time);
    if (stops.length === 0) return 'var(--aethel-surface-primary)';
    return `linear-gradient(to right, ${stops
      .map((stop) => {
        const r = Math.round(stop.color.r * 255);
        const g = Math.round(stop.color.g * 255);
        const b = Math.round(stop.color.b * 255);
        return `rgba(${r}, ${g}, ${b}, ${stop.alpha}) ${stop.time * 100}%`;
      })
      .join(', ')})`;
  }, [emitterConfig.colorOverLife]);
  const handleExportConfig = useCallback(() => {
    const json = JSON.stringify(emitterConfig, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${(emitterConfig.name || 'emitter-config').replace(/\s+/g, '-').toLowerCase()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [emitterConfig]);
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
        <span style={{ fontWeight: 'bold', marginRight: '16px' }}>Niagara VFX Editor</span>
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
          {isPlaying ? 'Pause' : 'Play'}
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
          Restart
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
          disabled
          aria-label="Save VFX graph — not yet wired to project persistence"
          title="Save is held until VFX graphs are wired to project persistence."
          style={{
            padding: '6px 12px',
            background: 'var(--aethel-surface-quaternary)',
            border: '1px solid var(--aethel-border-secondary)',
            borderRadius: '4px',
            color: 'var(--aethel-text-muted)',
            cursor: 'not-allowed',
            opacity: 0.6,
          }}
        >
          Save
        </button>
        <button
          type="button"
          onClick={handleExportConfig}
          aria-label="Export emitter config as JSON"
          title="Export the current emitter configuration as a JSON file."
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
                    <svg width="100%" height="100%" viewBox="0 0 220 60" preserveAspectRatio="none" style={{ position: 'absolute' }}>
                      <path
                        d={sizeCurvePath}
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
                      background: colorOverLifeGradient,
                    }}
                  />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ marginBottom: '8px' }}>Alpha Over Life</div>
                  <div style={{ height: '60px', background: 'var(--aethel-surface-tertiary)', borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
                    <svg width="100%" height="100%" viewBox="0 0 220 60" preserveAspectRatio="none" style={{ position: 'absolute' }}>
                      <path
                        d={alphaCurvePath}
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
                    <svg width="100%" height="100%" viewBox="0 0 220 60" preserveAspectRatio="none" style={{ position: 'absolute' }}>
                      <path
                        d={velocityCurvePath}
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
