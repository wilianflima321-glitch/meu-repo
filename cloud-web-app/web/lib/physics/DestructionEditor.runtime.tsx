"use client";

// @aethel-heavy-async-boundary: destruction simulation loads only in Studio physics/editor surfaces.
/**
 * Destruction editor for configuring fracture, debris, impact and export behavior.
 * Heavy simulation stays inside governed Studio physics/editor surfaces.
 */
import React, {
  useState,
  useCallback,
  useEffect,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  Environment,
  GizmoHelper,
  GizmoViewport,
  Center,
} from "@react-three/drei";
import * as THREE from "three";
import {
  Hammer,
  Crosshair,
  Layers,
  Play,
  Download,
  Heart,
  Zap,
  Box,
  Volume2,
  Sparkles,
  Timer,
  Shield,
  Bomb,
  Target,
} from "lucide-react";
import {
  DestructibleObject,
  DestructibleConfig,
  DestructionEvent,
  FragmentData,
} from "@/lib/destruction-system";

// ============================================================================
// TYPES
// ============================================================================

import {
  CollapsibleSection,
  PatternSelector,
  Slider,
  DestructionLevels,
  Toolbar,
} from "@/components/physics/DestructionEditor.parts";
import {
  DESTRUCTION_PRESETS,
  type DestructionPreset,
  type DestructionToolType,
  type FracturePattern,
  type ImpactPoint,
} from "@/components/physics/DestructionEditor.model";
export { DESTRUCTION_PRESETS } from "@/components/physics/DestructionEditor.model";
export type {
  DestructionPreset,
  DestructionToolType,
  FracturePattern,
  ImpactPoint,
} from "@/components/physics/DestructionEditor.model";

// ============================================================================
// DESTRUCTIBLE MESH 3D
// ============================================================================

import { DestructibleMesh3D } from "./DestructionEditorMesh.runtime";

// ============================================================================
// MAIN DESTRUCTION EDITOR
// ============================================================================

export interface DestructionEditorProps {
  meshId?: string;
  initialConfig?: Partial<DestructibleConfig>;
  onFragmentGenerated?: (fragments: FragmentData[]) => void;
  onExport?: (data: {
    config: DestructibleConfig;
    pattern: FracturePattern;
  }) => void;
}

export default function DestructionEditor({
  meshId,
  initialConfig,
  onFragmentGenerated,
  onExport,
}: DestructionEditorProps) {
  // Configuration
  const [config, setConfig] = useState<DestructibleConfig>({
    maxHealth: 100,
    fractureLevels: 3,
    fragmentCount: 12,
    debrisLifetime: 10,
    impactPropagation: 2.0,
    enablePhysics: true,
    enableSound: true,
    enableVFX: true,
    ...initialConfig,
  });

  // Editor state
  const [pattern, setPattern] = useState<FracturePattern>("voronoi");
  const [selectedTool, setSelectedTool] = useState<DestructionToolType>("view");
  const [showPreview, setShowPreview] = useState(false);
  const [impactPoint, setImpactPoint] = useState<ImpactPoint | null>(null);
  const [currentHealth, setCurrentHealth] = useState(config.maxHealth);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [fragments, setFragments] = useState<THREE.Mesh[]>([]);
  const [events, setEvents] = useState<DestructionEvent[]>([]);

  // Apply preset
  const applyPreset = useCallback(
    (preset: DestructionPreset) => {
      setConfig((prev) => ({ ...prev, ...preset.config }));
      setPattern(preset.pattern);
      setCurrentHealth(preset.config.maxHealth ?? config.maxHealth);
    },
    [config.maxHealth],
  );

  // Handle impact
  const handleImpact = useCallback((point: ImpactPoint) => {
    setImpactPoint(point);
  }, []);

  // Apply damage
  const applyDamage = useCallback(
    (damage: number) => {
      const newHealth = Math.max(0, currentHealth - damage);
      setCurrentHealth(newHealth);

      const healthPerLevel = config.maxHealth / config.fractureLevels;
      const newLevel = Math.min(
        config.fractureLevels - 1,
        Math.floor((config.maxHealth - newHealth) / healthPerLevel),
      );

      if (newLevel > currentLevel) {
        setCurrentLevel(newLevel);

        const event: DestructionEvent = {
          type: newHealth <= 0 ? "destroy" : "fracture",
          targetId: meshId || "main",
          damage,
          impactPoint: impactPoint?.position || new THREE.Vector3(),
          impactNormal: impactPoint?.normal || new THREE.Vector3(0, 1, 0),
          impactForce: impactPoint?.force || damage,
        };

        setEvents((prev) => [...prev, event]);
      }
    },
    [currentHealth, currentLevel, config, impactPoint, meshId],
  );

  // Preview destruction
  const previewDestruction = useCallback(() => {
    if (impactPoint) {
      applyDamage(impactPoint.force);
    } else {
      applyDamage(50);
    }
  }, [impactPoint, applyDamage]);

  // Reset
  const reset = useCallback(() => {
    setCurrentHealth(config.maxHealth);
    setCurrentLevel(0);
    setFragments([]);
    setImpactPoint(null);
    setEvents([]);
  }, [config.maxHealth]);

  // Update max health when config changes
  useEffect(() => {
    setCurrentHealth(config.maxHealth);
  }, [config.maxHealth]);

  // Export
  const handleExport = useCallback(() => {
    onExport?.({ config, pattern });
  }, [config, pattern, onExport]);

  return (
    <div className="flex h-full w-full bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-primary)]">
      {/* Toolbar */}
      <div className="p-2">
        <Toolbar
          selectedTool={selectedTool}
          onToolChange={setSelectedTool}
          onPreviewDestruction={previewDestruction}
          onReset={reset}
        />
      </div>

      {/* 3D Viewport */}
      <div className="flex-1 relative">
        <Canvas camera={{ position: [4, 4, 4], fov: 50 }}>
          <color attach="background" args={[0x0f172a]} />

          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
          <pointLight position={[-5, 5, -5]} intensity={0.5} color={0xff6600} />

          <DestructibleMesh3D
            config={config}
            pattern={pattern}
            fragments={fragments}
            showPreview={showPreview}
            impactPoint={impactPoint}
            onImpactClick={handleImpact}
            selectedTool={selectedTool}
            health={currentHealth}
            maxHealth={config.maxHealth}
          />

          <Grid infiniteGrid fadeDistance={30} />
          <OrbitControls makeDefault />
          <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
            <GizmoViewport />
          </GizmoHelper>
          <Environment preset="warehouse" />
        </Canvas>

        {/* Viewport info */}
        <div className="absolute top-4 left-4 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_90%,transparent)] p-3 rounded">
          <div className="text-xs text-[var(--aethel-text-secondary)] mb-2">
            Destruction Status
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <Heart className="w-3 h-3 text-[var(--aethel-error)]" />
              <span>
                Health: {currentHealth.toFixed(0)} / {config.maxHealth}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="w-3 h-3 text-[var(--aethel-warning-light)]" />
              <span>
                Level: {currentLevel + 1} / {config.fractureLevels}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Box className="w-3 h-3 text-[var(--aethel-primary-light)]" />
              <span>Fragments: {config.fragmentCount}</span>
            </div>
          </div>
        </div>

        {/* Events log */}
        {events.length > 0 && (
          <div className="absolute bottom-4 left-4 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_90%,transparent)] p-2 rounded max-w-xs max-h-32 overflow-y-auto">
            <div className="text-xs text-[var(--aethel-text-secondary)] mb-1">
              Events
            </div>
            {events.slice(-5).map((event, i) => (
              <div
                key={i}
                className="text-[10px] text-[var(--aethel-text-secondary)] flex items-center gap-1"
              >
                {event.type === "destroy" ? (
                  <Bomb className="w-2.5 h-2.5 text-[var(--aethel-error)]" />
                ) : (
                  <Zap className="w-2.5 h-2.5 text-[var(--aethel-warning-light)]" />
                )}
                {event.type}: {event.damage.toFixed(0)} damage
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settings Panel */}
      <div className="w-72 bg-[var(--aethel-surface-tertiary)] border-l border-[var(--aethel-border-secondary)] overflow-y-auto">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Hammer className="w-5 h-5 text-[var(--aethel-error)]" />
              Destruction
            </h2>
            <button
              type="button"
              onClick={handleExport}
              className="p-1.5 rounded bg-[var(--aethel-error-dark)] hover:bg-[var(--aethel-error)] transition-colors"
              title="Export Configuration"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>

          {/* Presets */}
          <CollapsibleSection
            title="Material Presets"
            icon={<Zap className="w-4 h-4 text-[var(--aethel-warning)]" />}
          >
            <div className="grid grid-cols-2 gap-1.5">
              {DESTRUCTION_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className="p-2 rounded bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)]
                           transition-colors text-left"
                >
                  <div className="text-xs font-medium">{preset.name}</div>
                  <div className="text-[10px] opacity-70 truncate">
                    {preset.description}
                  </div>
                </button>
              ))}
            </div>
          </CollapsibleSection>

          {/* Fracture Pattern */}
          <CollapsibleSection
            title="Fracture Pattern"
            icon={
              <Sparkles className="w-4 h-4 text-[var(--aethel-primary-light)]" />
            }
          >
            <PatternSelector value={pattern} onChange={setPattern} />

            <div className="mt-3 flex items-center justify-between">
              <label className="text-xs text-[var(--aethel-text-secondary)]">
                Show Preview
              </label>
              <input
                type="checkbox"
                checked={showPreview}
                onChange={(e) => setShowPreview(e.target.checked)}
                className="w-4 h-4 rounded bg-[var(--aethel-surface-quaternary)] border-[color-mix(in_srgb,var(--aethel-border-secondary)_70%,transparent)] text-[var(--aethel-error)]"
              />
            </div>
          </CollapsibleSection>

          {/* Health & Damage */}
          <CollapsibleSection
            title="Health & Damage"
            icon={<Shield className="w-4 h-4 text-[var(--aethel-success)]" />}
          >
            <Slider
              label="Max Health"
              value={config.maxHealth}
              min={10}
              max={500}
              step={10}
              unit=" HP"
              onChange={(v) => setConfig((p) => ({ ...p, maxHealth: v }))}
              icon={<Heart className="w-3 h-3 text-[var(--aethel-error)]" />}
            />

            <Slider
              label="Fracture Levels"
              value={config.fractureLevels}
              min={1}
              max={5}
              step={1}
              onChange={(v) => setConfig((p) => ({ ...p, fractureLevels: v }))}
              icon={
                <Layers className="w-3 h-3 text-[var(--aethel-warning-light)]" />
              }
            />

            <div className="mt-3">
              <label className="text-xs text-[var(--aethel-text-secondary)] block mb-2">
                Destruction Levels
              </label>
              <DestructionLevels
                levels={config.fractureLevels}
                currentLevel={currentLevel}
                health={currentHealth}
                maxHealth={config.maxHealth}
              />
            </div>

            {/* Quick damage buttons */}
            <div className="mt-3 grid grid-cols-4 gap-1">
              {[10, 25, 50, 100].map((dmg) => (
                <button
                  type="button"
                  key={dmg}
                  onClick={() => applyDamage(dmg)}
                  className="p-1.5 text-xs bg-[color-mix(in_srgb,var(--aethel-error-dark)_50%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-error-dark)_50%,transparent)] rounded
                           text-[var(--aethel-error-light)] transition-colors"
                >
                  -{dmg}
                </button>
              ))}
            </div>
          </CollapsibleSection>

          {/* Fragment Settings */}
          <CollapsibleSection
            title="Fragments"
            icon={
              <Box className="w-4 h-4 text-[var(--aethel-primary-light)]" />
            }
          >
            <Slider
              label="Fragment Count"
              value={config.fragmentCount}
              min={4}
              max={50}
              step={1}
              onChange={(v) => setConfig((p) => ({ ...p, fragmentCount: v }))}
            />

            <Slider
              label="Debris Lifetime"
              value={config.debrisLifetime}
              min={1}
              max={30}
              step={1}
              unit="s"
              onChange={(v) => setConfig((p) => ({ ...p, debrisLifetime: v }))}
              icon={
                <Timer className="w-3 h-3 text-[var(--aethel-text-secondary)]" />
              }
            />

            <Slider
              label="Impact Propagation"
              value={config.impactPropagation}
              min={0.5}
              max={5}
              step={0.1}
              onChange={(v) =>
                setConfig((p) => ({ ...p, impactPropagation: v }))
              }
            />
          </CollapsibleSection>

          {/* Effects */}
          <CollapsibleSection
            title="Effects"
            icon={<Sparkles className="w-4 h-4 text-[var(--aethel-info)]" />}
            defaultOpen={false}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-[var(--aethel-text-secondary)] flex items-center gap-1.5">
                  <Zap className="w-3 h-3" /> Physics
                </label>
                <input
                  type="checkbox"
                  checked={config.enablePhysics}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      enablePhysics: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 rounded bg-[var(--aethel-surface-quaternary)] border-[color-mix(in_srgb,var(--aethel-border-secondary)_70%,transparent)] text-[var(--aethel-error)]"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs text-[var(--aethel-text-secondary)] flex items-center gap-1.5">
                  <Volume2 className="w-3 h-3" /> Sound
                </label>
                <input
                  type="checkbox"
                  checked={config.enableSound}
                  onChange={(e) =>
                    setConfig((p) => ({ ...p, enableSound: e.target.checked }))
                  }
                  className="w-4 h-4 rounded bg-[var(--aethel-surface-quaternary)] border-[color-mix(in_srgb,var(--aethel-border-secondary)_70%,transparent)] text-[var(--aethel-error)]"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs text-[var(--aethel-text-secondary)] flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> VFX
                </label>
                <input
                  type="checkbox"
                  checked={config.enableVFX}
                  onChange={(e) =>
                    setConfig((p) => ({ ...p, enableVFX: e.target.checked }))
                  }
                  className="w-4 h-4 rounded bg-[var(--aethel-surface-quaternary)] border-[color-mix(in_srgb,var(--aethel-border-secondary)_70%,transparent)] text-[var(--aethel-error)]"
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Impact Point */}
          {impactPoint && (
            <CollapsibleSection
              title="Impact Point"
              icon={<Target className="w-4 h-4 text-[var(--aethel-error)]" />}
            >
              <div className="text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-[var(--aethel-text-secondary)]">
                    Position:
                  </span>
                  <span className="font-mono">
                    ({impactPoint.position.x.toFixed(2)},{" "}
                    {impactPoint.position.y.toFixed(2)},{" "}
                    {impactPoint.position.z.toFixed(2)})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--aethel-text-secondary)]">
                    Normal:
                  </span>
                  <span className="font-mono">
                    ({impactPoint.normal.x.toFixed(2)},{" "}
                    {impactPoint.normal.y.toFixed(2)},{" "}
                    {impactPoint.normal.z.toFixed(2)})
                  </span>
                </div>
                <Slider
                  label="Force"
                  value={impactPoint.force}
                  min={10}
                  max={500}
                  step={10}
                  unit=" N"
                  onChange={(v) =>
                    setImpactPoint((p) => (p ? { ...p, force: v } : null))
                  }
                />
                <button
                  type="button"
                  onClick={() => setImpactPoint(null)}
                  className="w-full p-1.5 mt-2 text-xs bg-[var(--aethel-surface-quaternary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)] rounded"
                >
                  Clear Impact Point
                </button>
              </div>
            </CollapsibleSection>
          )}
        </div>
      </div>
    </div>
  );
}
