'use client';

import React from 'react';
import {
  ArrowDown,
  Box,
  Download,
  Droplet,
  FileOutput,
  Palette,
  RefreshCw,
  Target,
  Thermometer,
  Upload,
  Waves,
  Wind,
  Zap,
} from 'lucide-react';
import {
  CollapsibleSection,
  ColorPicker,
  Slider,
  Vector3Input,
} from './FluidSimulationEditorPanels';
import { FLUID_PRESETS } from './fluid-simulation.defaults';
import type { FluidEditorState, FluidParams, FluidPreset } from './fluid-simulation.types';

interface FluidSimulationEditorSettingsPanelProps {
  volumeId?: string;
  params: FluidParams;
  editorState: FluidEditorState;
  isBaking: boolean;
  onApplyPreset: (preset: FluidPreset) => void;
  onUpdateParam: <K extends keyof FluidParams>(key: K, value: FluidParams[K]) => void;
  onImport: () => void;
  onExport: () => void;
  onBakeToMesh: () => void;
}

export function FluidSimulationEditorSettingsPanel({
  volumeId,
  params,
  editorState,
  isBaking,
  onApplyPreset,
  onUpdateParam,
  onImport,
  onExport,
  onBakeToMesh,
}: FluidSimulationEditorSettingsPanelProps): React.JSX.Element {
  return (
    <div className="w-72 bg-slate-850 border-l border-slate-700 overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Droplet className="w-5 h-5 text-cyan-400" />
            Fluid Simulation
          </h2>
          <div className="flex gap-1">
            <button
              onClick={onImport}
              className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 transition-colors"
              title="Import Configuration"
            >
              <Upload className="w-4 h-4" />
            </button>
            <button
              onClick={onExport}
              className="p-1.5 rounded bg-cyan-600 hover:bg-cyan-500 transition-colors"
              title="Export Configuration"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        <CollapsibleSection title="Fluid Presets" icon={<Zap className="w-4 h-4 text-yellow-400" />}>
          <div className="grid grid-cols-2 gap-1.5">
            {FLUID_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => onApplyPreset(preset)}
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

        <CollapsibleSection title="Particles" icon={<Droplet className="w-4 h-4 text-cyan-400" />}>
          <Slider
            label="Particle Count"
            value={params.particleCount}
            min={100}
            max={10000}
            step={100}
            onChange={(v) => onUpdateParam('particleCount', v)}
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
            onChange={(v) => onUpdateParam('particleRadius', v)}
          />

          <Slider
            label="Smoothing Radius"
            value={params.smoothingRadius}
            min={0.1}
            max={0.5}
            step={0.01}
            unit="m"
            onChange={(v) => onUpdateParam('smoothingRadius', v)}
            tooltip="SPH kernel radius"
          />
        </CollapsibleSection>

        <CollapsibleSection title="Physical Properties" icon={<Waves className="w-4 h-4 text-blue-400" />}>
          <Slider
            label="Viscosity"
            value={params.viscosity}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => onUpdateParam('viscosity', v)}
            tooltip="Fluid thickness (0=water, 1=honey)"
          />

          <Slider
            label="Surface Tension"
            value={params.surfaceTension}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => onUpdateParam('surfaceTension', v)}
            tooltip="Cohesion between particles"
          />

          <Slider
            label="Rest Density"
            value={params.restDensity}
            min={100}
            max={15000}
            step={100}
            unit=" kg/mÂ³"
            onChange={(v) => onUpdateParam('restDensity', v)}
          />

          <Slider
            label="Stiffness"
            value={params.stiffness}
            min={10}
            max={500}
            step={10}
            onChange={(v) => onUpdateParam('stiffness', v)}
            tooltip="Pressure response strength"
          />

          <Slider
            label="Temperature"
            value={params.temperature}
            min={-50}
            max={1500}
            step={1}
            unit="Â°C"
            onChange={(v) => onUpdateParam('temperature', v)}
            icon={<Thermometer className="w-3 h-3 text-orange-400" />}
          />
        </CollapsibleSection>

        <CollapsibleSection title="Appearance" icon={<Palette className="w-4 h-4 text-cyan-400" />}>
          <ColorPicker
            label="Fluid Color"
            value={params.color}
            onChange={(v) => onUpdateParam('color', v)}
          />

          <Slider
            label="Opacity"
            value={params.opacity}
            min={0.1}
            max={1}
            step={0.05}
            onChange={(v) => onUpdateParam('opacity', v)}
          />
        </CollapsibleSection>

        <CollapsibleSection title="Gravity" icon={<ArrowDown className="w-4 h-4 text-blue-400" />}>
          <Vector3Input
            label="Gravity Vector"
            value={params.gravity}
            onChange={(v) => onUpdateParam('gravity', v)}
            min={-20}
            max={20}
            step={0.1}
          />

          <div className="grid grid-cols-3 gap-1 mt-2">
            <button
              onClick={() => onUpdateParam('gravity', { x: 0, y: -9.81, z: 0 })}
              className="p-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded"
            >
              Earth
            </button>
            <button
              onClick={() => onUpdateParam('gravity', { x: 0, y: -1.62, z: 0 })}
              className="p-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded"
            >
              Moon
            </button>
            <button
              onClick={() => onUpdateParam('gravity', { x: 0, y: 0, z: 0 })}
              className="p-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded"
            >
              Zero-G
            </button>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Boundary Volume" icon={<Box className="w-4 h-4 text-cyan-400" />}>
          <Vector3Input
            label="Size"
            value={params.boundarySize}
            onChange={(v) => onUpdateParam('boundarySize', v)}
            min={0.5}
            max={20}
            step={0.1}
          />

          <Vector3Input
            label="Position"
            value={params.boundaryPosition}
            onChange={(v) => onUpdateParam('boundaryPosition', v)}
            min={-10}
            max={10}
            step={0.1}
          />
        </CollapsibleSection>

        <CollapsibleSection title="External Flow" icon={<Wind className="w-4 h-4 text-green-400" />} defaultOpen={false}>
          <Vector3Input
            label="Flow Direction"
            value={params.flowDirection}
            onChange={(v) => onUpdateParam('flowDirection', v)}
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
            onChange={(v) => onUpdateParam('flowStrength', v)}
          />
        </CollapsibleSection>

        <CollapsibleSection title="Surface Meshing" icon={<RefreshCw className="w-4 h-4 text-sky-400" />} defaultOpen={false}>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs text-slate-400">Enable Surface Mesh</label>
            <input
              type="checkbox"
              checked={params.enableSurfaceMeshing}
              onChange={(e) => onUpdateParam('enableSurfaceMeshing', e.target.checked)}
              className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-cyan-600"
            />
          </div>

          <Slider
            label="Mesh Resolution"
            value={params.meshResolution}
            min={16}
            max={128}
            step={8}
            onChange={(v) => onUpdateParam('meshResolution', v)}
            tooltip="Higher = smoother but slower"
          />

          <button
            onClick={onBakeToMesh}
            disabled={isBaking}
            className="w-full mt-3 p-2 rounded bg-sky-600 hover:bg-sky-500 
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

        {volumeId && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="text-xs text-slate-500">
              Volume ID: <span className="font-mono text-slate-400">{volumeId}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
