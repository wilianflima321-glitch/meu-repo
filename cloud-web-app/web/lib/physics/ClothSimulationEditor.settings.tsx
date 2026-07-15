import type { Dispatch, SetStateAction } from 'react';
import { Box, Circle, Download, Eye, Layers, Settings, Wind, Zap } from 'lucide-react';
import type { ClothCollider, ClothConfig } from '@/lib/cloth-simulation';
import { CLOTH_PRESETS } from '@/lib/physics/ClothSimulationEditor.presets';
import type { ClothEditorState, ClothPreset } from '@/lib/physics/ClothSimulationEditor.types';
import { createClothVector } from '@/lib/physics/ClothSimulationEditor.vectors';
import { CollapsibleSection, Slider, Vector3Input } from '@/lib/physics/ClothSimulationPanels.runtime';

interface ClothSettingsPanelProps {
  config: ClothConfig;
  setConfig: Dispatch<SetStateAction<ClothConfig>>;
  editorState: ClothEditorState;
  setEditorState: Dispatch<SetStateAction<ClothEditorState>>;
  colliders: ClothCollider[];
  setColliders: Dispatch<SetStateAction<ClothCollider[]>>;
  selectedCollider: number | null;
  setSelectedCollider: Dispatch<SetStateAction<number | null>>;
  showWindArrow: boolean;
  setShowWindArrow: Dispatch<SetStateAction<boolean>>;
  applyPreset: (preset: ClothPreset) => void;
  addCollider: (type: ClothCollider['type']) => void;
  handleExport: () => void;
}

export function ClothSettingsPanel({
  config,
  setConfig,
  editorState,
  setEditorState,
  colliders,
  setColliders,
  selectedCollider,
  setSelectedCollider,
  showWindArrow,
  setShowWindArrow,
  applyPreset,
  addCollider,
  handleExport,
}: ClothSettingsPanelProps) {
  return (
    <div className="w-72 bg-[var(--aethel-surface-tertiary)] border-l border-[var(--aethel-border-secondary)] overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5 text-[var(--aethel-info)]" />
            Cloth Settings
          </h2>
          <button
            type="button"
            onClick={handleExport}
            className="p-1.5 rounded bg-[var(--aethel-info)] hover:bg-[var(--aethel-info)] transition-colors"
            title="Export Configuration"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        <CollapsibleSection title="Presets" icon={<Zap className="w-4 h-4 text-[var(--aethel-warning)]" />}>
          <div className="grid grid-cols-2 gap-1.5">
            {CLOTH_PRESETS.map((preset) => (
              <button
                type="button"
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
              className="w-4 h-4 rounded bg-[var(--aethel-surface-quaternary)] border-[color-mix(in_srgb,var(--aethel-border-secondary)_70%,transparent)] text-[var(--aethel-info)] focus:ring-[var(--aethel-primary)] focus:ring-offset-[var(--aethel-surface-primary)]"
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Wind" icon={<Wind className="w-4 h-4 text-[var(--aethel-info)]" />}>
          <Vector3Input
            label="Direction & Strength"
            value={{ x: config.wind.x, y: config.wind.y, z: config.wind.z }}
            onChange={(v) => setConfig((p) => ({
              ...p,
              wind: createClothVector(v.x, v.y, v.z),
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

        <CollapsibleSection title="Gravity" icon={<Circle className="w-4 h-4 text-[var(--aethel-primary-light)]" />}>
          <Vector3Input
            label="Gravity Vector"
            value={{ x: config.gravity.x, y: config.gravity.y, z: config.gravity.z }}
            onChange={(v) => setConfig((p) => ({
              ...p,
              gravity: createClothVector(v.x, v.y, v.z),
            }))}
            min={-20}
            max={20}
          />
        </CollapsibleSection>

        <CollapsibleSection title="Colliders" icon={<Box className="w-4 h-4 text-[var(--aethel-warning-light)]" />}>
          <div className="flex gap-1 mb-3">
            <button
              type="button"
              onClick={() => addCollider('sphere')}
              className="flex-1 p-1.5 text-xs bg-[var(--aethel-surface-quaternary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)] rounded transition-colors"
            >
              + Sphere
            </button>
            <button
              type="button"
              onClick={() => addCollider('box')}
              className="flex-1 p-1.5 text-xs bg-[var(--aethel-surface-quaternary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)] rounded transition-colors"
            >
              + Box
            </button>
            <button
              type="button"
              onClick={() => addCollider('plane')}
              className="flex-1 p-1.5 text-xs bg-[var(--aethel-surface-quaternary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)] rounded transition-colors"
            >
              + Plane
            </button>
          </div>

          {colliders.map((collider, index) => (
            <div
              key={`${collider.type}-${index}`}
              className={`p-2 rounded mb-1.5 cursor-pointer transition-colors ${
                selectedCollider === index
                  ? 'bg-[var(--aethel-info)]/30 border border-[color-mix(in_srgb,var(--aethel-info)_60%,transparent)]'
                  : 'bg-[var(--aethel-surface-quaternary)]'
              }`}
              onClick={() => setSelectedCollider(index)}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs capitalize">{collider.type}</span>
                <button
                  type="button"
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
  );
}
