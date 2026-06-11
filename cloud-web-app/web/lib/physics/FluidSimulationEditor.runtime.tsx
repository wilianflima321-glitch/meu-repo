'use client';

// @aethel-heavy-async-boundary: loaded only through the /studio/vfx?tool=fluid grouped dynamic import.

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
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Droplet,
  Download,
  Upload,
  Box,
  ArrowDown,
  Palette,
  Waves,
  Thermometer,
  Wind,
  Zap,
  Target,
  RefreshCw,
  FileOutput,
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
} from '@/lib/physics/fluid-simulation-core';
import { CollapsibleSection, ColorPicker, Slider, Toolbar, Vector3Input } from '@/lib/physics/FluidSimulationPanels.runtime';
import { bakeFluidToMesh, exportFluidConfiguration, importFluidConfiguration } from './FluidSimulationEditor.actions-runtime';
import { createDefaultFluidEditorState, createDefaultFluidParams } from './FluidSimulationEditor.config-runtime';
import { FluidSimulationViewport } from './FluidSimulationEditor.viewport-runtime';
import {createComponentLogger, logger} from '@/lib/observability/logger'

const log = createComponentLogger('FluidSimulationEditor')


export type {
  FluidEditorState,
  FluidParams,
  FluidParticle,
  FluidPreset,
  FluidToolType,
} from '@/lib/physics/fluid-simulation-core';

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
  // State
  const [params, setParams] = useState<FluidParams>(() => createDefaultFluidParams(initialParams));
  const [editorState, setEditorState] = useState<FluidEditorState>(() => createDefaultFluidEditorState());
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
    await bakeFluidToMesh({ meshResolution: params.meshResolution, log });
    setIsBaking(false);
  }, [params.meshResolution]);

  // Export configuration
  const handleExport = useCallback(() => {
    exportFluidConfiguration({ params, volumeId, onExport });
  }, [params, volumeId, onExport]);

  // Import configuration
  const handleImport = useCallback(() => {
    importFluidConfiguration({
      onParams: (nextParams) => setParams((prev) => ({ ...prev, ...nextParams })),
      onError: (error) => logger.error('Failed to import fluid config:', error),
    });
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

      <FluidSimulationViewport
        simulation={simulationRef.current}
        params={params}
        editorState={editorState}
        setEditorState={setEditorState}
      />

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
