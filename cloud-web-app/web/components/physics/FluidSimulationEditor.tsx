/**
 * FLUID SIMULATION EDITOR - Aethel Engine
 * Visual editor for SPH fluid simulation.
 */

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, GizmoHelper, GizmoViewport, Grid, OrbitControls } from '@react-three/drei';
import { Box, Layers, Wind, Zap } from 'lucide-react';
import {
  BoundaryBox,
  FlowArrows,
  FluidParticles3D,
  SimulationStats,
  Toolbar,
} from './FluidSimulationEditorPanels';
import { DEFAULT_FLUID_PARAMS } from './fluid-simulation.defaults';
import { SPHFluidSimulation } from './fluid-simulation.runtime';
import { FluidSimulationEditorSettingsPanel } from './FluidSimulationEditorSettingsPanel';
import type {
  FluidEditorState,
  FluidParams,
  FluidPreset,
  FluidSimulationEditorProps,
  FluidToolType,
} from './fluid-simulation.types';

export type {
  FluidEditorState,
  FluidParams,
  FluidParticle,
  FluidPreset,
  FluidSimulationEditorProps,
  FluidToolType,
} from './fluid-simulation.types';

export default function FluidSimulationEditor({
  volumeId,
  initialParams,
  onFluidUpdate,
  onExport,
}: FluidSimulationEditorProps) {
  const [params, setParams] = useState<FluidParams>({ ...DEFAULT_FLUID_PARAMS, ...initialParams });
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

  const initialParamsRef = useRef(params);
  const simulationRef = useRef<SPHFluidSimulation | null>(null);

  useEffect(() => {
    simulationRef.current = new SPHFluidSimulation(initialParamsRef.current);
    return () => {
      simulationRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (simulationRef.current) {
      simulationRef.current.updateParams(params);
    }
    onFluidUpdate?.(params);
  }, [params, onFluidUpdate]);

  const applyPreset = useCallback((preset: FluidPreset) => {
    setParams((prev) => ({ ...prev, ...preset.params }));
    setEditorState((prev) => ({ ...prev, currentPreset: preset.id }));

    if (simulationRef.current) {
      simulationRef.current.updateParams(preset.params);
    }
  }, []);

  const toggleSimulation = useCallback(() => {
    setEditorState((prev) => ({ ...prev, isSimulating: !prev.isSimulating }));
  }, []);

  const resetSimulation = useCallback(() => {
    if (simulationRef.current) {
      simulationRef.current.reset();
    }
    setEditorState((prev) => ({ ...prev, isSimulating: false }));
  }, []);

  const updateParam = useCallback(<K extends keyof FluidParams>(key: K, value: FluidParams[K]) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  }, []);

  const bakeToMesh = useCallback(async () => {
    setIsBaking(true);

    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log('Baking fluid to mesh with resolution:', params.meshResolution);

    setIsBaking(false);
  }, [params.meshResolution]);

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

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fluid_${volumeId || 'config'}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [params, volumeId, onExport]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
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
      <div className="p-2">
        <Toolbar
          selectedTool={selectedTool}
          onToolChange={setSelectedTool}
          isSimulating={editorState.isSimulating}
          onToggleSimulation={toggleSimulation}
          onReset={resetSimulation}
        />
      </div>

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

          <FluidParticles3D simulation={simulationRef.current} params={params} editorState={editorState} />
          <BoundaryBox params={params} visible={editorState.showBoundary} />
          <FlowArrows params={params} visible={editorState.showFlowArrows} />

          <Grid infiniteGrid fadeDistance={30} />
          <OrbitControls makeDefault />
          <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
            <GizmoViewport />
          </GizmoHelper>
          <Environment preset="warehouse" />
        </Canvas>

        <div className="absolute top-4 left-4 bg-slate-900/90 p-3 rounded">
          <div className="text-xs text-slate-400 mb-2">Simulation Status</div>
          <SimulationStats simulation={simulationRef.current} params={params} />

          <div className="mt-2 pt-2 border-t border-slate-700">
            <div className="flex items-center gap-2 text-xs">
              <div
                className={`w-2 h-2 rounded-full ${editorState.isSimulating ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`}
              />
              <span>{editorState.isSimulating ? 'Running' : 'Paused'}</span>
            </div>
          </div>
        </div>

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
              editorState.showDensityColors ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'
            }`}
          >
            <Layers className="w-3 h-3" /> Density
          </button>
        </div>
      </div>

      <FluidSimulationEditorSettingsPanel
        volumeId={volumeId}
        params={params}
        editorState={editorState}
        isBaking={isBaking}
        onApplyPreset={applyPreset}
        onUpdateParam={updateParam}
        onImport={handleImport}
        onExport={handleExport}
        onBakeToMesh={bakeToMesh}
      />
    </div>
  );
}
