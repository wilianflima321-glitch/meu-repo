'use client';
// @aethel-heavy-async-boundary
import { Canvas } from '@react-three/fiber';
import { Environment, GizmoHelper, GizmoViewport, Grid, OrbitControls } from '@react-three/drei';
import { Box, Layers, Wind, Zap } from 'lucide-react';
import type { SPHFluidSimulation, FluidEditorState, FluidParams } from '@/lib/physics/fluid-simulation-core';
import { BoundaryBox, FlowArrows, FluidParticles3D, SimulationStats } from '@/lib/physics/FluidSimulationPanels.runtime';

export function FluidSimulationViewport({
  simulation,
  params,
  editorState,
  setEditorState,
}: {
  simulation: SPHFluidSimulation | null;
  params: FluidParams;
  editorState: FluidEditorState;
  setEditorState: React.Dispatch<React.SetStateAction<FluidEditorState>>;
}) {
  return (
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

        <FluidParticles3D
          simulation={simulation}
          params={params}
          editorState={editorState}
        />

        <BoundaryBox
          params={params}
          visible={editorState.showBoundary}
        />

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

      <div className="absolute top-4 left-4 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_90%,transparent)] p-3 rounded">
        <div className="text-xs text-[var(--aethel-text-secondary)] mb-2">Simulation Status</div>
        <SimulationStats simulation={simulation} params={params} />

        <div className="mt-2 pt-2 border-t border-[var(--aethel-border-secondary)]">
          <div className="flex items-center gap-2 text-xs">
            <div className={`w-2 h-2 rounded-full ${editorState.isSimulating ? 'bg-[var(--aethel-success)] animate-pulse' : 'bg-[color-mix(in_srgb,var(--aethel-border-secondary)_60%,transparent)]'}`} />
            <span>{editorState.isSimulating ? 'Running' : 'Paused'}</span>
          </div>
        </div>
      </div>

      <div className="absolute top-4 right-80 flex flex-col gap-1 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_90%,transparent)] p-2 rounded">
        <button
          type="button"
          onClick={() => setEditorState((state) => ({ ...state, showBoundary: !state.showBoundary }))}
          className={`p-1.5 rounded text-xs flex items-center gap-1.5 ${
            editorState.showBoundary ? 'bg-[var(--aethel-info)] text-[var(--aethel-text-primary)]' : 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)]'
          }`}
        >
          <Box className="w-3 h-3" /> Boundary
        </button>
        <button
          type="button"
          onClick={() => setEditorState((state) => ({ ...state, showFlowArrows: !state.showFlowArrows }))}
          className={`p-1.5 rounded text-xs flex items-center gap-1.5 ${
            editorState.showFlowArrows ? 'bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-text-primary)]' : 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)]'
          }`}
        >
          <Wind className="w-3 h-3" /> Flow
        </button>
        <button
          type="button"
          onClick={() => setEditorState((state) => ({ ...state, showVelocityColors: !state.showVelocityColors }))}
          className={`p-1.5 rounded text-xs flex items-center gap-1.5 ${
            editorState.showVelocityColors ? 'bg-[var(--aethel-warning)] text-[var(--aethel-text-primary)]' : 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)]'
          }`}
        >
          <Zap className="w-3 h-3" /> Velocity
        </button>
        <button
          type="button"
          onClick={() => setEditorState((state) => ({ ...state, showDensityColors: !state.showDensityColors }))}
          className={`p-1.5 rounded text-xs flex items-center gap-1.5 ${
            editorState.showDensityColors ? 'bg-[var(--aethel-primary-dark)] text-[var(--aethel-text-primary)]' : 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)]'
          }`}
        >
          <Layers className="w-3 h-3" /> Density
        </button>
      </div>
    </div>
  );
}
