'use client';

// @aethel-heavy-async-boundary: loaded only through the /studio/animation?tool=rig route dynamic import.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, GizmoHelper, GizmoViewport, Grid, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  Bone,
  Download,
  Footprints,
  Hand,
  Link,
  Lock,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Target,
  Unlock,
  User,
  Zap,
} from 'lucide-react';
import { DEFAULT_IK_CHAINS, HUMANOID_BONES } from '@/lib/character/control-rig-model';
import { BoneTreeItem, CollapsibleSection, ConstraintPanel, IKChainPanel, SkeletonVisualizer, Slider } from '@/lib/character/ControlRigEditor.parts-runtime';
import type { BoneNode, Constraint, ControlRigConfig, IKChain, SkeletonPreset } from '@/components/character/ControlRigEditor.types';

export type { BoneNode, Constraint, ControlRigConfig, IKChain, SkeletonPreset } from '@/components/character/ControlRigEditor.types';

export interface ControlRigEditorProps {
  characterId?: string;
  onRigUpdate?: (config: ControlRigConfig) => void;
  onExport?: (config: ControlRigConfig) => void;
}

export default function ControlRigEditor({
  characterId,
  onRigUpdate,
  onExport,
}: ControlRigEditorProps) {
  // State
  const [bones, setBones] = useState<BoneNode[]>(HUMANOID_BONES);
  const [ikChains, setIkChains] = useState<IKChain[]>(DEFAULT_IK_CHAINS);
  const [constraints, setConstraints] = useState<Constraint[]>([]);

  const [selectedBone, setSelectedBone] = useState<string | null>(null);
  const [selectedChain, setSelectedChain] = useState<string | null>(null);

  const [showBones, setShowBones] = useState(true);
  const [showIK, setShowIK] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);

  // Get selected bone data
  const selectedBoneData = useMemo(() =>
    bones.find((b) => b.id === selectedBone),
    [bones, selectedBone]
  );

  // Toggle bone properties
  const toggleBoneVisibility = useCallback((id: string) => {
    setBones((prev) => prev.map((b) =>
      b.id === id ? { ...b, visible: !b.visible } : b
    ));
  }, []);

  const toggleBoneLock = useCallback((id: string) => {
    setBones((prev) => prev.map((b) =>
      b.id === id ? { ...b, locked: !b.locked } : b
    ));
  }, []);

  const toggleBoneIK = useCallback((id: string) => {
    setBones((prev) => prev.map((b) =>
      b.id === id ? { ...b, ikEnabled: !b.ikEnabled } : b
    ));
  }, []);

  const updateBoneFKWeight = useCallback((id: string, weight: number) => {
    setBones((prev) => prev.map((b) =>
      b.id === id ? { ...b, fkWeight: weight } : b
    ));
  }, []);

  // Update IK chain
  const updateIKChain = useCallback((id: string, updates: Partial<IKChain>) => {
    setIkChains((prev) => prev.map((c) =>
      c.id === id ? { ...c, ...updates } : c
    ));
  }, []);

  const updateChainPosition = useCallback((id: string, position: THREE.Vector3) => {
    setIkChains((prev) => prev.map((c) =>
      c.id === id ? { ...c, effectorPosition: position } : c
    ));
  }, []);

  // Update constraint
  const updateConstraint = useCallback((id: string, updates: Partial<Constraint>) => {
    setConstraints((prev) => prev.map((c) =>
      c.id === id ? { ...c, ...updates } : c
    ));
  }, []);

  const rigConfig = useMemo<ControlRigConfig>(() => ({
    bones: Object.fromEntries(bones.map((bone) => [bone.id, bone])),
    ikChains,
    constraints,
  }), [bones, ikChains, constraints]);

  useEffect(() => {
    onRigUpdate?.(rigConfig);
  }, [onRigUpdate, rigConfig]);

  const handleExport = useCallback(() => {
    onExport?.(rigConfig);
  }, [onExport, rigConfig]);

  // Root bones for hierarchy
  const rootBones = useMemo(() => bones.filter((b) => !b.parentId), [bones]);

  return (
    <div className="flex h-full w-full bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      {/* Left Panel - Hierarchy */}
      <div className="w-64 border-r border-[var(--aethel-border-primary)] flex flex-col">
        <div className="p-3 border-b border-[var(--aethel-border-primary)]">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Bone className="w-4 h-4 text-[var(--aethel-info-light)]" />
            Bone Hierarchy
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {rootBones.map((bone) => (
            <BoneTreeItem
              key={bone.id}
              bone={bone}
              bones={bones}
              level={0}
              selectedBone={selectedBone}
              onSelect={setSelectedBone}
              onToggleVisibility={toggleBoneVisibility}
              onToggleLock={toggleBoneLock}
              onToggleIK={toggleBoneIK}
            />
          ))}
        </div>

        {/* View toggles */}
        <div className="p-3 border-t border-[var(--aethel-border-primary)] flex gap-2">
          <button type="button" aria-label={showBones ? 'Hide bone list' : 'Show bone list'}
            onClick={() => setShowBones(!showBones)}
            className={`flex-1 p-2 rounded text-xs ${showBones ? 'bg-[var(--aethel-primary)]' : 'bg-[var(--aethel-surface-quaternary)]'}`}
          >
            Bones
          </button>
          <button type="button" aria-label={showIK ? 'Hide IK chains' : 'Show IK chains'}
            onClick={() => setShowIK(!showIK)}
            className={`flex-1 p-2 rounded text-xs ${showIK ? 'bg-[var(--aethel-success)]' : 'bg-[var(--aethel-surface-quaternary)]'}`}
          >
            IK
          </button>
        </div>
      </div>

      {/* 3D Viewport */}
      <div className="flex-1 relative">
        <Canvas camera={{ position: [2, 2, 3], fov: 50 }}>
          <color attach="background" args={[0x0f172a]} />

          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />

          <SkeletonVisualizer
            bones={bones}
            ikChains={ikChains}
            selectedBone={selectedBone}
            selectedChain={selectedChain}
            onSelectBone={setSelectedBone}
            onSelectChain={setSelectedChain}
            onUpdateChain={updateChainPosition}
            showIK={showIK}
            showBones={showBones}
          />

          <Grid infiniteGrid fadeDistance={15} />
          <OrbitControls makeDefault target={[0, 1, 0]} />
          <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
            <GizmoViewport />
          </GizmoHelper>
        </Canvas>

        {/* Toolbar */}
        <div className="absolute top-4 left-4 flex gap-2">
          <button type="button" aria-label={isSimulating ? 'Stop control rig simulation' : 'Start control rig simulation'}
            onClick={() => setIsSimulating(!isSimulating)}
            className={`p-2 rounded ${isSimulating ? 'bg-[var(--aethel-success)]' : 'bg-[var(--aethel-surface-quaternary)]'}`}
            title={isSimulating ? 'Stop' : 'Simulate'}
          >
            {isSimulating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button type="button" aria-label="Reset control rig to bind pose"
            onClick={() => setBones(HUMANOID_BONES)}
            className="p-2 rounded bg-[var(--aethel-surface-quaternary)] hover:bg-[var(--aethel-surface-quaternary)]"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button type="button" aria-label="Export control rig configuration"
            onClick={handleExport}
            className="p-2 rounded bg-[var(--aethel-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)]"
            title="Export"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        {/* Info */}
        <div className="absolute bottom-4 left-4 bg-[color-mix(in_srgb,var(--aethel-surface-primary)_85%,transparent)] p-2 rounded text-xs">
          <div>Bones: {bones.length}</div>
          <div>IK Chains: {ikChains.filter((c) => c.enabled).length}</div>
          <div>Constraints: {constraints.filter((c) => c.enabled).length}</div>
        </div>
      </div>

      {/* Right Panel - Properties */}
      <div className="w-72 border-l border-[var(--aethel-border-primary)] overflow-y-auto">
        <div className="p-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-[var(--aethel-info-light)]" />
            Control Rig
          </h2>

          {/* Selected Bone Properties */}
          {selectedBoneData && (
            <CollapsibleSection
              title={`Bone: ${selectedBoneData.name}`}
              icon={<Bone className="w-4 h-4 text-[var(--aethel-info-light)]" />}
            >
              <Slider
                label="FK / IK Blend"
                value={selectedBoneData.fkWeight}
                min={0}
                max={1}
                onChange={(v) => updateBoneFKWeight(selectedBoneData.id, v)}
              />

              <div className="flex gap-2 mt-3">
                <button type="button" aria-label={selectedBoneData.ikEnabled ? 'Disable IK for selected bone' : 'Enable IK for selected bone'}
                  onClick={() => toggleBoneIK(selectedBoneData.id)}
                  className={`flex-1 p-2 rounded text-xs ${
                    selectedBoneData.ikEnabled ? 'bg-[var(--aethel-success)]' : 'bg-[var(--aethel-surface-quaternary)]'
                  }`}
                >
                  <Target className="w-3 h-3 inline mr-1" />
                  IK
                </button>
                <button type="button" aria-label={selectedBoneData.locked ? 'Unlock selected bone' : 'Lock selected bone'}
                  onClick={() => toggleBoneLock(selectedBoneData.id)}
                  className={`flex-1 p-2 rounded text-xs ${
                    selectedBoneData.locked ? 'bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)]' : 'bg-[var(--aethel-surface-quaternary)]'
                  }`}
                >
                  {selectedBoneData.locked ? <Lock className="w-3 h-3 inline mr-1" /> : <Unlock className="w-3 h-3 inline mr-1" />}
                  Lock
                </button>
              </div>
            </CollapsibleSection>
          )}

          {/* IK Chains */}
          <CollapsibleSection
            title="IK Chains"
            icon={<Target className="w-4 h-4 text-[var(--aethel-success)]" />}
          >
            {ikChains.map((chain) => (
              <IKChainPanel
                key={chain.id}
                chain={chain}
                onUpdate={(updates) => updateIKChain(chain.id, updates)}
                onDelete={() => setIkChains((prev) => prev.filter((c) => c.id !== chain.id))}
              />
            ))}
          </CollapsibleSection>

          {/* Constraints */}
          <CollapsibleSection
            title="Constraints"
            icon={<Link className="w-4 h-4 text-[var(--aethel-info-light)]" />}
            defaultOpen={false}
          >
            {constraints.length === 0 ? (
              <div className="text-xs text-[var(--aethel-text-tertiary)] italic">No constraints</div>
            ) : (
              constraints.map((constraint) => (
                <ConstraintPanel
                  key={constraint.id}
                  constraint={constraint}
                  onUpdate={(updates) => updateConstraint(constraint.id, updates)}
                  onDelete={() => setConstraints((prev) => prev.filter((c) => c.id !== constraint.id))}
                />
              ))
            )}

            <button type="button" aria-label="Add new constraint to control rig"
              className="w-full p-2 mt-2 rounded bg-[var(--aethel-surface-quaternary)] hover:bg-[var(--aethel-surface-quaternary)] text-xs"
            >
              + Add Constraint
            </button>
          </CollapsibleSection>

          {/* Body Zones */}
          <CollapsibleSection
            title="Body Zones"
            icon={<User className="w-4 h-4 text-[var(--aethel-warning-light)]" />}
            defaultOpen={false}
          >
            <div className="grid grid-cols-3 gap-1">
              <button type="button" aria-label="Select left arm zone" className="p-2 rounded bg-[var(--aethel-surface-quaternary)] hover:bg-[var(--aethel-surface-quaternary)] text-xs">
                <Hand className="w-4 h-4 mx-auto mb-1" />
                L.Arm
              </button>
              <button type="button" aria-label="Select spine zone" className="p-2 rounded bg-[var(--aethel-surface-quaternary)] hover:bg-[var(--aethel-surface-quaternary)] text-xs">
                <User className="w-4 h-4 mx-auto mb-1" />
                Spine
              </button>
              <button type="button" aria-label="Select right arm zone" className="p-2 rounded bg-[var(--aethel-surface-quaternary)] hover:bg-[var(--aethel-surface-quaternary)] text-xs">
                <Hand className="w-4 h-4 mx-auto mb-1" />
                R.Arm
              </button>
              <button type="button" aria-label="Select left leg zone" className="p-2 rounded bg-[var(--aethel-surface-quaternary)] hover:bg-[var(--aethel-surface-quaternary)] text-xs">
                <Footprints className="w-4 h-4 mx-auto mb-1" />
                L.Leg
              </button>
              <button type="button" aria-label="Select hips zone" className="p-2 rounded bg-[var(--aethel-surface-quaternary)] hover:bg-[var(--aethel-surface-quaternary)] text-xs">
                <Zap className="w-4 h-4 mx-auto mb-1" />
                Hips
              </button>
              <button type="button" aria-label="Select right leg zone" className="p-2 rounded bg-[var(--aethel-surface-quaternary)] hover:bg-[var(--aethel-surface-quaternary)] text-xs">
                <Footprints className="w-4 h-4 mx-auto mb-1" />
                R.Leg
              </button>
            </div>
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
}
