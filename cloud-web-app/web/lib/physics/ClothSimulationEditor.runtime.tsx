// @aethel-heavy-async-boundary

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  OrbitControls,
  Grid,
  Environment,
  GizmoHelper,
  GizmoViewport,
} from '@react-three/drei';
import { ClothSimulation } from '@/lib/cloth-simulation';
import type { ClothCollider } from '@/lib/cloth-simulation';
import { ClothMesh3D, ColliderVisualizer, Toolbar, WindArrow } from '@/lib/physics/ClothSimulationPanels.runtime';
import { ClothSettingsPanel } from '@/lib/physics/ClothSimulationEditor.settings';
import type { ClothEditorState, ClothPreset, ClothSimulationEditorProps, ClothToolType } from '@/lib/physics/ClothSimulationEditor.types';
import { createClothCollider, createInitialClothColliders, createInitialClothConfig } from '@/lib/physics/ClothSimulationEditor.vectors';

export type {
  ClothEditorState,
  ClothPreset,
  ClothSimulationEditorProps,
  ClothToolType,
  ConstraintType,
} from '@/lib/physics/ClothSimulationEditor.types';

export default function ClothSimulationEditor({
  initialConfig,
  onSimulationUpdate,
  onExport,
}: ClothSimulationEditorProps) {
  const [config, setConfig] = useState(() => createInitialClothConfig(initialConfig));

  const [editorState, setEditorState] = useState<ClothEditorState>({
    selectedVertices: new Set(),
    pinnedVertices: new Set([0, 1, 2, 3, 4]), // Default: pin top row
    isSimulating: false,
    showConstraints: false,
    showWireframe: false,
    showColliders: true,
    currentPreset: null,
  });

  const [selectedTool, setSelectedTool] = useState<ClothToolType>('select');
  const [showWindArrow, setShowWindArrow] = useState(true);

  const [colliders, setColliders] = useState<ClothCollider[]>(createInitialClothColliders);
  const [selectedCollider, setSelectedCollider] = useState<number | null>(null);

  const [simulation, setSimulation] = useState<ClothSimulation | null>(null);

  useEffect(() => {
    const sim = new ClothSimulation(config);

    for (const idx of editorState.pinnedVertices) {
      if (sim.particles[idx]) {
        sim.particles[idx].pinned = true;
      }
    }

    sim.setColliders(colliders);

    setSimulation(sim);
  }, [config, colliders, editorState.pinnedVertices]);

  useEffect(() => {
    if (simulation) {
      simulation.updateConfig(config);
      simulation.setColliders(colliders);
      onSimulationUpdate?.(config);
    }
  }, [simulation, config, colliders, onSimulationUpdate]);

  const handleVertexClick = useCallback((index: number, shiftKey: boolean) => {
    if (!simulation) return;

    setEditorState((prev) => {
      const newState = { ...prev };

      switch (selectedTool) {
        case 'select':
          if (shiftKey) {
            const newSelection = new Set(prev.selectedVertices);
            if (newSelection.has(index)) {
              newSelection.delete(index);
            } else {
              newSelection.add(index);
            }
            newState.selectedVertices = newSelection;
          } else {
            newState.selectedVertices = new Set([index]);
          }
          break;

        case 'pin':
          const newPinned = new Set(prev.pinnedVertices);
          newPinned.add(index);
          newState.pinnedVertices = newPinned;
          if (simulation.particles[index]) {
            simulation.particles[index].pinned = true;
          }
          break;

        case 'unpin':
          const unpinned = new Set(prev.pinnedVertices);
          unpinned.delete(index);
          newState.pinnedVertices = unpinned;
          if (simulation.particles[index]) {
            simulation.particles[index].pinned = false;
          }
          break;

        case 'tear':
          for (const constraint of simulation.constraints) {
            if (constraint.p1 === index || constraint.p2 === index) {
              constraint.broken = true;
            }
          }
          break;
      }

      return newState;
    });
  }, [simulation, selectedTool]);

  const applyPreset = useCallback((preset: ClothPreset) => {
    setConfig((prev) => ({
      ...prev,
      ...preset.config,
      gravity: prev.gravity,
      wind: prev.wind,
    }));
    setEditorState((prev) => ({
      ...prev,
      currentPreset: preset.id,
    }));
  }, []);

  const resetSimulation = useCallback(() => {
    const sim = new ClothSimulation(config);
    for (const idx of editorState.pinnedVertices) {
      if (sim.particles[idx]) {
        sim.particles[idx].pinned = true;
      }
    }
    sim.setColliders(colliders);
    setSimulation(sim);
    setEditorState((prev) => ({ ...prev, isSimulating: false }));
  }, [config, editorState.pinnedVertices, colliders]);

  const handleExport = useCallback(() => {
    onExport?.({
      config,
      pinnedVertices: Array.from(editorState.pinnedVertices),
    });
  }, [config, editorState.pinnedVertices, onExport]);

  const addCollider = useCallback((type: ClothCollider['type']) => {
    setColliders((prev) => [...prev, createClothCollider(type)]);
  }, []);

  return (
    <div className="flex h-full w-full bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-primary)]">
      {/* Left toolbar */}
      <div className="p-2">
        <Toolbar
          selectedTool={selectedTool}
          onToolChange={setSelectedTool}
          isSimulating={editorState.isSimulating}
          onToggleSimulation={() => setEditorState((prev) => ({
            ...prev,
            isSimulating: !prev.isSimulating
          }))}
          onReset={resetSimulation}
        />
      </div>

      {/* 3D Viewport */}
      <div className="flex-1 relative">
        <Canvas camera={{ position: [5, 5, 5], fov: 50 }}>
          <color attach="background" args={[0x0f172a]} />

          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 10, 5]} intensity={1} castShadow />

          <ClothMesh3D
            simulation={simulation}
            config={config}
            editorState={editorState}
            onVertexClick={handleVertexClick}
            selectedTool={selectedTool}
          />

          <ColliderVisualizer
            colliders={colliders}
            showColliders={editorState.showColliders}
            onColliderSelect={setSelectedCollider}
            selectedCollider={selectedCollider}
          />

          <WindArrow
            direction={{ x: config.wind.x, y: config.wind.y, z: config.wind.z }}
            strength={config.wind.length()}
            visible={showWindArrow}
          />

          {config.groundPlane && (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, config.groundHeight, 0]}>
              <planeGeometry args={[20, 20]} />
              <meshStandardMaterial color={0x1e293b} />
            </mesh>
          )}

          <Grid infiniteGrid fadeDistance={50} />
          <OrbitControls makeDefault />
          <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
            <GizmoViewport />
          </GizmoHelper>
          <Environment preset="city" />
        </Canvas>

        {/* Viewport overlay info */}
        <div className="absolute top-4 left-4 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_80%,transparent)] p-2 rounded text-xs">
          <div className="text-[var(--aethel-text-secondary)]">
            Vertices: {simulation?.particles.length ?? 0}
          </div>
          <div className="text-[var(--aethel-text-secondary)]">
            Constraints: {simulation?.constraints.filter(c => !c.broken).length ?? 0}
          </div>
          <div className="text-[var(--aethel-text-secondary)]">
            Pinned: {editorState.pinnedVertices.size}
          </div>
          {editorState.isSimulating && (
            <div className="text-[var(--aethel-success)] mt-1">Simulating</div>
          )}
        </div>
      </div>

      <ClothSettingsPanel
        config={config}
        setConfig={setConfig}
        editorState={editorState}
        setEditorState={setEditorState}
        colliders={colliders}
        setColliders={setColliders}
        selectedCollider={selectedCollider}
        setSelectedCollider={setSelectedCollider}
        showWindArrow={showWindArrow}
        setShowWindArrow={setShowWindArrow}
        applyPreset={applyPreset}
        addCollider={addCollider}
        handleExport={handleExport}
      />
    </div>
  );
}
