// @aethel-heavy-async-boundary

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
  Layers,
  Wind,
  Download,
  Settings,
  Eye,
  EyeOff,
  Save,
  Upload,
  Zap,
  Box,
  Circle,
} from 'lucide-react';
import {
  ClothSimulation,
  ClothConfig,
  ClothCollider,
} from '@/lib/cloth-simulation';
import { ClothMesh3D, ColliderVisualizer, CollapsibleSection, Slider, Toolbar, Vector3Input, WindArrow } from './ClothSimulationPanels';


export type ClothToolType =
  | 'select'
  | 'pin'
  | 'unpin'
  | 'tear'
  | 'move_collider';

export type ConstraintType = 'structural' | 'shear' | 'bend';

export interface ClothPreset {
  id: string;
  name: string;
  description: string;
  config: Partial<ClothConfig>;
}

export interface ClothEditorState {
  selectedVertices: Set<number>;
  pinnedVertices: Set<number>;
  isSimulating: boolean;
  showConstraints: boolean;
  showWireframe: boolean;
  showColliders: boolean;
  currentPreset: string | null;
}


const CLOTH_PRESETS: ClothPreset[] = [
  {
    id: 'silk',
    name: 'Seda',
    description: 'Light and flowing fabric',
    config: {
      mass: 0.3,
      stiffness: 0.6,
      damping: 0.02,
      iterations: 15,
      tearThreshold: 0.8,
    },
  },
  {
    id: 'cotton',
    name: 'Cotton',
    description: 'Medium fabric with natural behavior',
    config: {
      mass: 0.5,
      stiffness: 0.8,
      damping: 0.05,
      iterations: 12,
      tearThreshold: 1.2,
    },
  },
  {
    id: 'denim',
    name: 'Jeans',
    description: 'Heavy and rigid fabric',
    config: {
      mass: 0.8,
      stiffness: 0.95,
      damping: 0.1,
      iterations: 10,
      tearThreshold: 2.0,
    },
  },
  {
    id: 'leather',
    name: 'Couro',
    description: 'Rigid material with low flexibility',
    config: {
      mass: 1.0,
      stiffness: 0.98,
      damping: 0.15,
      iterations: 8,
      tearThreshold: 3.0,
    },
  },
  {
    id: 'rubber',
    name: 'Borracha',
    description: 'Elastic material',
    config: {
      mass: 0.6,
      stiffness: 0.4,
      damping: 0.08,
      iterations: 20,
      tearThreshold: 5.0,
    },
  },
  {
    id: 'flag',
    name: 'Bandeira',
    description: 'Otimizado para bandeiras ao vento',
    config: {
      mass: 0.2,
      stiffness: 0.7,
      damping: 0.03,
      iterations: 12,
      tearThreshold: 1.5,
      windVariation: 0.3,
    },
  },
  {
    id: 'cape',
    name: 'Capa',
    description: 'Para capas de personagens',
    config: {
      mass: 0.4,
      stiffness: 0.75,
      damping: 0.04,
      iterations: 14,
      tearThreshold: 1.8,
    },
  },
  {
    id: 'curtain',
    name: 'Cortina',
    description: 'Heavy fabric for curtains',
    config: {
      mass: 0.7,
      stiffness: 0.85,
      damping: 0.12,
      iterations: 10,
      tearThreshold: 2.5,
    },
  },
];


export interface ClothSimulationEditorProps {
  meshId?: string;
  initialConfig?: Partial<ClothConfig>;
  onSimulationUpdate?: (config: ClothConfig) => void;
  onExport?: (data: { config: ClothConfig; pinnedVertices: number[] }) => void;
}

export default function ClothSimulationEditor({
  meshId,
  initialConfig,
  onSimulationUpdate,
  onExport,
}: ClothSimulationEditorProps) {
  const [config, setConfig] = useState<ClothConfig>({
    width: 4,
    height: 4,
    segmentsX: 20,
    segmentsY: 20,
    mass: 0.5,
    stiffness: 0.8,
    damping: 0.05,
    gravity: new THREE.Vector3(0, -9.81, 0),
    wind: new THREE.Vector3(0, 0, 0),
    windVariation: 0.1,
    iterations: 12,
    tearThreshold: 1.5,
    selfCollision: false,
    groundPlane: true,
    groundHeight: -2,
    ...initialConfig,
  });

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

  const [colliders, setColliders] = useState<ClothCollider[]>([
    {
      type: 'sphere',
      position: new THREE.Vector3(0, 0, 0),
      radius: 0.5,
    },
  ]);
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
    const newCollider: ClothCollider = {
      type,
      position: new THREE.Vector3(0, -1, 0),
      ...(type === 'sphere' && { radius: 0.5 }),
      ...(type === 'plane' && { normal: new THREE.Vector3(0, 1, 0) }),
      ...(type === 'box' && { size: new THREE.Vector3(1, 1, 1) }),
    };
    setColliders((prev) => [...prev, newCollider]);
  }, []);

  const removeSelectedCollider = useCallback(() => {
    if (selectedCollider !== null) {
      setColliders((prev) => prev.filter((_, i) => i !== selectedCollider));
      setSelectedCollider(null);
    }
  }, [selectedCollider]);

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
            <div className="text-[var(--aethel-success)] mt-1">● Simulating</div>
          )}
        </div>
      </div>

      {/* Right panel - Settings */}
      <div className="w-72 bg-[var(--aethel-surface-tertiary)] border-l border-[var(--aethel-border-secondary)] overflow-y-auto">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Layers className="w-5 h-5 text-[var(--aethel-info)]" />
              Cloth Settings
            </h2>
            <button type="button"
              onClick={handleExport}
              className="p-1.5 rounded bg-[var(--aethel-info)] hover:bg-[var(--aethel-info)] transition-colors"
              title="Export Configuration"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>

          {/* Presets */}
          <CollapsibleSection title="Presets" icon={<Zap className="w-4 h-4 text-[var(--aethel-warning)]" />}>
            <div className="grid grid-cols-2 gap-1.5">
              {CLOTH_PRESETS.map((preset) => (
                <button type="button"
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className={`p-2 rounded text-left transition-colors ${
                    editorState.currentPreset === preset.id
                      ? 'bg-[var(--aethel-info)] text-[var(--aethel-text-primary)]'
                      : 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)]'
                  }`}
                >
                  <div className="text-xs font-medium">{preset.name}</div>
                  <div className="text-[10px] opacity-70 truncate">{preset.description}</div>
                </button>
              ))}
            </div>
          </CollapsibleSection>

          {/* Physics Parameters */}
          <CollapsibleSection title="Physics" icon={<Settings className="w-4 h-4 text-[var(--aethel-primary-light)]" />}>
            <Slider
              label="Mass"
              value={config.mass}
              min={0.1}
              max={2}
              step={0.1}
              unit=" kg"
              onChange={(v) => setConfig((p) => ({ ...p, mass: v }))}
              tooltip="Total mass of the cloth"
            />
            <Slider
              label="Stiffness"
              value={config.stiffness}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => setConfig((p) => ({ ...p, stiffness: v }))}
              tooltip="How rigid the cloth is"
            />
            <Slider
              label="Damping"
              value={config.damping}
              min={0}
              max={0.5}
              step={0.01}
              onChange={(v) => setConfig((p) => ({ ...p, damping: v }))}
              tooltip="Energy dissipation"
            />
            <Slider
              label="Iterations"
              value={config.iterations}
              min={1}
              max={30}
              step={1}
              onChange={(v) => setConfig((p) => ({ ...p, iterations: v }))}
              tooltip="Solver iterations per frame"
            />
            <Slider
              label="Tear Threshold"
              value={config.tearThreshold}
              min={0.5}
              max={5}
              step={0.1}
              onChange={(v) => setConfig((p) => ({ ...p, tearThreshold: v }))}
              tooltip="Force required to tear the cloth"
            />

            <div className="flex items-center justify-between mt-3">
              <label className="text-xs text-[var(--aethel-text-secondary)]">Self Collision</label>
              <input
                type="checkbox"
                checked={config.selfCollision}
                onChange={(e) => setConfig((p) => ({ ...p, selfCollision: e.target.checked }))}
                className="w-4 h-4 rounded bg-[var(--aethel-surface-quaternary)] border-[color-mix(in_srgb,var(--aethel-border-secondary)_70%,transparent)] text-[var(--aethel-info)]
                         focus:ring-[var(--aethel-primary)] focus:ring-offset-[var(--aethel-surface-primary)]"
              />
            </div>
          </CollapsibleSection>

          {/* Wind */}
          <CollapsibleSection title="Wind" icon={<Wind className="w-4 h-4 text-[var(--aethel-info)]" />}>
            <Vector3Input
              label="Direction & Strength"
              value={{ x: config.wind.x, y: config.wind.y, z: config.wind.z }}
              onChange={(v) => setConfig((p) => ({
                ...p,
                wind: new THREE.Vector3(v.x, v.y, v.z)
              }))}
              min={-10}
              max={10}
            />
            <Slider
              label="Variation"
              value={config.windVariation}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => setConfig((p) => ({ ...p, windVariation: v }))}
              tooltip="Wind turbulence"
            />
            <div className="flex items-center justify-between mt-2">
              <label className="text-xs text-[var(--aethel-text-secondary)]">Show Wind Arrow</label>
              <input
                type="checkbox"
                checked={showWindArrow}
                onChange={(e) => setShowWindArrow(e.target.checked)}
                className="w-4 h-4 rounded bg-[var(--aethel-surface-quaternary)] border-[color-mix(in_srgb,var(--aethel-border-secondary)_70%,transparent)] text-[var(--aethel-info)]"
              />
            </div>
          </CollapsibleSection>

          {/* Gravity */}
          <CollapsibleSection title="Gravity" icon={<Circle className="w-4 h-4 text-[var(--aethel-primary-light)]" />}>
            <Vector3Input
              label="Gravity Vector"
              value={{ x: config.gravity.x, y: config.gravity.y, z: config.gravity.z }}
              onChange={(v) => setConfig((p) => ({
                ...p,
                gravity: new THREE.Vector3(v.x, v.y, v.z)
              }))}
              min={-20}
              max={20}
            />
          </CollapsibleSection>

          {/* Colliders */}
          <CollapsibleSection title="Colliders" icon={<Box className="w-4 h-4 text-[var(--aethel-warning-light)]" />}>
            <div className="flex gap-1 mb-3">
              <button type="button"
                onClick={() => addCollider('sphere')}
                className="flex-1 p-1.5 text-xs bg-[var(--aethel-surface-quaternary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)] rounded transition-colors"
              >
                + Sphere
              </button>
              <button type="button"
                onClick={() => addCollider('box')}
                className="flex-1 p-1.5 text-xs bg-[var(--aethel-surface-quaternary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)] rounded transition-colors"
              >
                + Box
              </button>
              <button type="button"
                onClick={() => addCollider('plane')}
                className="flex-1 p-1.5 text-xs bg-[var(--aethel-surface-quaternary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)] rounded transition-colors"
              >
                + Plane
              </button>
            </div>

            {colliders.map((collider, index) => (
              <div
                key={index}
                className={`p-2 rounded mb-1.5 cursor-pointer transition-colors ${
                  selectedCollider === index
                    ? 'bg-[var(--aethel-info)]/30 border border-[color-mix(in_srgb,var(--aethel-info)_60%,transparent)]'
                    : 'bg-[var(--aethel-surface-quaternary)]'
                }`}
                onClick={() => setSelectedCollider(index)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs capitalize">{collider.type}</span>
                  <button type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setColliders((prev) => prev.filter((_, i) => i !== index));
                    }}
                    className="text-[var(--aethel-error)] hover:text-[var(--aethel-error-light)] text-xs"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between mt-2">
              <label className="text-xs text-[var(--aethel-text-secondary)]">Show Colliders</label>
              <input
                type="checkbox"
                checked={editorState.showColliders}
                onChange={(e) => setEditorState((p) => ({ ...p, showColliders: e.target.checked }))}
                className="w-4 h-4 rounded bg-[var(--aethel-surface-quaternary)] border-[color-mix(in_srgb,var(--aethel-border-secondary)_70%,transparent)] text-[var(--aethel-info)]"
              />
            </div>

            <div className="flex items-center justify-between mt-2">
              <label className="text-xs text-[var(--aethel-text-secondary)]">Ground Plane</label>
              <input
                type="checkbox"
                checked={config.groundPlane}
                onChange={(e) => setConfig((p) => ({ ...p, groundPlane: e.target.checked }))}
                className="w-4 h-4 rounded bg-[var(--aethel-surface-quaternary)] border-[color-mix(in_srgb,var(--aethel-border-secondary)_70%,transparent)] text-[var(--aethel-info)]"
              />
            </div>
          </CollapsibleSection>

          {/* View Options */}
          <CollapsibleSection title="View Options" icon={<Eye className="w-4 h-4 text-[var(--aethel-text-secondary)]" />} defaultOpen={false}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-[var(--aethel-text-secondary)]">Show Wireframe</label>
                <input
                  type="checkbox"
                  checked={editorState.showWireframe}
                  onChange={(e) => setEditorState((p) => ({ ...p, showWireframe: e.target.checked }))}
                  className="w-4 h-4 rounded bg-[var(--aethel-surface-quaternary)] border-[color-mix(in_srgb,var(--aethel-border-secondary)_70%,transparent)] text-[var(--aethel-info)]"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-[var(--aethel-text-secondary)]">Show Constraints</label>
                <input
                  type="checkbox"
                  checked={editorState.showConstraints}
                  onChange={(e) => setEditorState((p) => ({ ...p, showConstraints: e.target.checked }))}
                  className="w-4 h-4 rounded bg-[var(--aethel-surface-quaternary)] border-[color-mix(in_srgb,var(--aethel-border-secondary)_70%,transparent)] text-[var(--aethel-info)]"
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Mesh Settings */}
          <CollapsibleSection title="Mesh Resolution" icon={<Layers className="w-4 h-4 text-[var(--aethel-success)]" />} defaultOpen={false}>
            <Slider
              label="Width"
              value={config.width}
              min={1}
              max={10}
              step={0.5}
              unit="m"
              onChange={(v) => setConfig((p) => ({ ...p, width: v }))}
            />
            <Slider
              label="Height"
              value={config.height}
              min={1}
              max={10}
              step={0.5}
              unit="m"
              onChange={(v) => setConfig((p) => ({ ...p, height: v }))}
            />
            <Slider
              label="Segments X"
              value={config.segmentsX}
              min={5}
              max={50}
              step={1}
              onChange={(v) => setConfig((p) => ({ ...p, segmentsX: v }))}
            />
            <Slider
              label="Segments Y"
              value={config.segmentsY}
              min={5}
              max={50}
              step={1}
              onChange={(v) => setConfig((p) => ({ ...p, segmentsY: v }))}
            />
            <p className="text-[10px] text-[var(--aethel-text-tertiary)] mt-2">
              Note: Changing resolution will reset the simulation
            </p>
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
}

