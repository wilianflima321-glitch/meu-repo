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
import { Canvas } from '@react-three/fiber';
import {
  OrbitControls,
  Grid,
  Environment,
  GizmoHelper,
  GizmoViewport,
} from '@react-three/drei';
import * as THREE from 'three';
import {
  Droplet,
  RotateCcw,
  Settings,
  Download,
  Upload,
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

import {


  FLUID_PRESETS,
  SPHFluidSimulation,
  type FluidEditorState,
  type FluidParams,
  type FluidParticle,
  type FluidPreset,
  type FluidToolType,
} from './fluid-simulation-core';
import { BoundaryBox, CollapsibleSection, ColorPicker, FlowArrows, FluidParticles3D, SimulationStats, Slider, Toolbar, Vector3Input } from './FluidSimulationPanels';
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('FluidSimulationEditor')


export type {
  FluidEditorState,
  FluidParams,
  FluidParticle,
  FluidPreset,
  FluidToolType,
} from './fluid-simulation-core';

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
  const initialParamsRef = useRef(params);
  const simulationRef = useRef<SPHFluidSimulation | null>(null);

  // Initialize simulation
  useEffect(() => {
    simulationRef.current = new SPHFluidSimulation(initialParamsRef.current);
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
    log.info('Baking fluid to mesh with resolution:', params.meshResolution);

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
    <div className="flex h-full w-full bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-primary)]">
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
          <color attach="background" args={[0x0f172a]} />

          <ambientLight intensity={0.4} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <pointLight position={[-5, 5, -5]} intensity={0.5} color={0x0ea5e9} />

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
        <div className="absolute top-4 left-4 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_90%,transparent)] p-3 rounded">
          <div className="text-xs text-[var(--aethel-text-secondary)] mb-2">Simulation Status</div>
          <SimulationStats simulation={simulationRef.current} params={params} />

          <div className="mt-2 pt-2 border-t border-[var(--aethel-border-secondary)]">
            <div className="flex items-center gap-2 text-xs">
              <div className={`w-2 h-2 rounded-full ${editorState.isSimulating ? 'bg-[var(--aethel-success)] animate-pulse' : 'bg-[color-mix(in_srgb,var(--aethel-border-secondary)_60%,transparent)]'}`} />
              <span>{editorState.isSimulating ? 'Running' : 'Paused'}</span>
            </div>
          </div>
        </div>

        {/* View toggles */}
        <div className="absolute top-4 right-80 flex flex-col gap-1 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_90%,transparent)] p-2 rounded">
          <button type="button"
            onClick={() => setEditorState((p) => ({ ...p, showBoundary: !p.showBoundary }))}
            className={`p-1.5 rounded text-xs flex items-center gap-1.5 ${
              editorState.showBoundary ? 'bg-[var(--aethel-info)] text-[var(--aethel-text-primary)]' : 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)]'
            }`}
          >
            <Box className="w-3 h-3" /> Boundary
          </button>
          <button type="button"
            onClick={() => setEditorState((p) => ({ ...p, showFlowArrows: !p.showFlowArrows }))}
            className={`p-1.5 rounded text-xs flex items-center gap-1.5 ${
              editorState.showFlowArrows ? 'bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-text-primary)]' : 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)]'
            }`}
          >
            <Wind className="w-3 h-3" /> Flow
          </button>
          <button type="button"
            onClick={() => setEditorState((p) => ({ ...p, showVelocityColors: !p.showVelocityColors }))}
            className={`p-1.5 rounded text-xs flex items-center gap-1.5 ${
              editorState.showVelocityColors ? 'bg-[var(--aethel-warning)] text-[var(--aethel-text-primary)]' : 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)]'
            }`}
          >
            <Zap className="w-3 h-3" /> Velocity
          </button>
          <button type="button"
            onClick={() => setEditorState((p) => ({ ...p, showDensityColors: !p.showDensityColors }))}
            className={`p-1.5 rounded text-xs flex items-center gap-1.5 ${
              editorState.showDensityColors ? 'bg-[var(--aethel-primary-dark)] text-[var(--aethel-text-primary)]' : 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)]'
            }`}
          >
            <Layers className="w-3 h-3" /> Density
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      <div className="w-72 bg-[var(--aethel-surface-tertiary)] border-l border-[var(--aethel-border-secondary)] overflow-y-auto">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Droplet className="w-5 h-5 text-[var(--aethel-info)]" />
              Fluid Simulation
            </h2>
            <div className="flex gap-1">
              <button type="button"
                onClick={handleImport}
                className="p-1.5 rounded bg-[var(--aethel-surface-quaternary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)] transition-colors"
                title="Import Configuration"
              >
                <Upload className="w-4 h-4" />
              </button>
              <button type="button"
                onClick={handleExport}
                className="p-1.5 rounded bg-[var(--aethel-info)] hover:bg-[var(--aethel-info)] transition-colors"
                title="Export Configuration"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Presets */}
          <CollapsibleSection title="Fluid Presets" icon={<Zap className="w-4 h-4 text-[var(--aethel-warning)]" />}>
            <div className="grid grid-cols-2 gap-1.5">
              {FLUID_PRESETS.map((preset) => (
                <button type="button"
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className={`p-2 rounded transition-colors text-left ${
                    editorState.currentPreset === preset.id
                      ? 'bg-[var(--aethel-info)]/30 border border-[color-mix(in_srgb,var(--aethel-info)_60%,transparent)] text-[var(--aethel-text-primary)]'
                      : 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)]'
                  }`}
                >
                  <div className="text-xs font-medium">{preset.name}</div>
                  <div className="text-[10px] opacity-70 truncate">{preset.description}</div>
                </button>
              ))}
            </div>
          </CollapsibleSection>

          {/* Particle Settings */}
          <CollapsibleSection title="Particles" icon={<Droplet className="w-4 h-4 text-[var(--aethel-info)]" />}>
            <Slider
              label="Particle Count"
              value={params.particleCount}
              min={100}
              max={10000}
              step={100}
              onChange={(v) => updateParam('particleCount', v)}
              icon={<Target className="w-3 h-3 text-[var(--aethel-text-secondary)]" />}
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
          <CollapsibleSection title="Physical Properties" icon={<Waves className="w-4 h-4 text-[var(--aethel-primary-light)]" />}>
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
              icon={<Thermometer className="w-3 h-3 text-[var(--aethel-warning-light)]" />}
            />
          </CollapsibleSection>

          {/* Appearance */}
          <CollapsibleSection title="Appearance" icon={<Palette className="w-4 h-4 text-[var(--aethel-info)]" />}>
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
          <CollapsibleSection title="Gravity" icon={<ArrowDown className="w-4 h-4 text-[var(--aethel-primary-light)]" />}>
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
              <button type="button"
                onClick={() => updateParam('gravity', { x: 0, y: -9.81, z: 0 })}
                className="p-1.5 text-xs bg-[var(--aethel-surface-quaternary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)] rounded"
              >
                Earth
              </button>
              <button type="button"
                onClick={() => updateParam('gravity', { x: 0, y: -1.62, z: 0 })}
                className="p-1.5 text-xs bg-[var(--aethel-surface-quaternary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)] rounded"
              >
                Moon
              </button>
              <button type="button"
                onClick={() => updateParam('gravity', { x: 0, y: 0, z: 0 })}
                className="p-1.5 text-xs bg-[var(--aethel-surface-quaternary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)] rounded"
              >
                Zero-G
              </button>
            </div>
          </CollapsibleSection>

          {/* Boundary */}
          <CollapsibleSection title="Boundary Volume" icon={<Box className="w-4 h-4 text-[var(--aethel-info)]" />}>
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
          <CollapsibleSection title="External Flow" icon={<Wind className="w-4 h-4 text-[var(--aethel-success)]" />} defaultOpen={false}>
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
          <CollapsibleSection title="Surface Meshing" icon={<RefreshCw className="w-4 h-4 text-[var(--aethel-info)]" />} defaultOpen={false}>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs text-[var(--aethel-text-secondary)]">Enable Surface Mesh</label>
              <input
                type="checkbox"
                checked={params.enableSurfaceMeshing}
                onChange={(e) => updateParam('enableSurfaceMeshing', e.target.checked)}
                className="w-4 h-4 rounded bg-[var(--aethel-surface-quaternary)] border-[color-mix(in_srgb,var(--aethel-border-secondary)_70%,transparent)] text-[var(--aethel-info)]"
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

            <button type="button"
              onClick={bakeToMesh}
              disabled={isBaking}
              className="w-full mt-3 p-2 rounded bg-[var(--aethel-info)] hover:bg-[var(--aethel-info)]
                       disabled:bg-[var(--aethel-surface-quaternary)] disabled:text-[var(--aethel-text-tertiary)]
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
            <div className="mt-4 pt-4 border-t border-[var(--aethel-border-secondary)]">
              <div className="text-xs text-[var(--aethel-text-tertiary)]">
                Volume ID: <span className="font-mono text-[var(--aethel-text-secondary)]">{volumeId}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
