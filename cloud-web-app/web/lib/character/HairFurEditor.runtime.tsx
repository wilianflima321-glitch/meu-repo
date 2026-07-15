'use client';
// @aethel-heavy-async-boundary
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { DEFAULT_GRADIENT, DEFAULT_REGIONS, HAIR_PRESETS, type BrushSettings, type BrushTool, type ClumpingSettings, type CurlSettings, type GradientStop, type HairData, type HairPreset, type HairRegion, type LODSettings, type PhysicsSettings } from '@/components/character/hair-fur-model';
import { GradientPicker, Slider } from '@/lib/character/HairFurEditor.parts-runtime';
import {
  exportHairRuntimeData,
  HAIR_BRUSH_ICONS,
  HAIR_BRUSH_LABELS,
  HAIR_EDITOR_TABS,
  type HairEditorTabId,
} from './HairFurEditor.config-runtime';
import { HairExportFooter, HairPresetBar } from './HairFurEditor.panel-runtime';
import { HairFurViewport } from './HairFurEditor.viewport-runtime';

export interface HairFurEditorProps {
  characterId: string;
  onHairUpdate?: (hairData: HairData) => void;
}

export default function HairFurEditor({ characterId, onHairUpdate }: HairFurEditorProps) {
  const [strandCount, setStrandCount] = useState(10000);
  const [regions, setRegions] = useState<HairRegion[]>(DEFAULT_REGIONS);
  const [clumping, setClumping] = useState<ClumpingSettings>({
    factor: 0.4,
    iterations: 3,
    noise: 0.15,
    tightness: 0.5,
  });
  const [curl, setCurl] = useState<CurlSettings>({
    intensity: 0.3,
    frequency: 2,
    randomness: 0.2,
    type: 'wave',
  });
  const [gradient, setGradient] = useState<GradientStop[]>(DEFAULT_GRADIENT);
  const [physics, setPhysics] = useState<PhysicsSettings>({
    gravity: 0.5,
    stiffness: 0.5,
    damping: 0.3,
    windStrength: 0.2,
    windTurbulence: 0.1,
  });
  const [lod, setLod] = useState<LODSettings>({
    strandDistance: 5,
    cardDistance: 15,
    cardCount: 500,
    enableLOD: true,
  });
  const [preset, setPreset] = useState<HairPreset>('wavy');
  const [brush, setBrush] = useState<BrushSettings>({
    tool: 'comb',
    size: 1,
    strength: 0.5,
  });
  const [brushActive, setBrushActive] = useState(false);
  const [animatePhysics, setAnimatePhysics] = useState(true);
  const [activeTab, setActiveTab] = useState<HairEditorTabId>('general');
  const [cameraDistance, setCameraDistance] = useState(3);
  const applyPreset = useCallback((presetName: HairPreset) => {
    setPreset(presetName);
    if (presetName !== 'custom') {
      const presetData = HAIR_PRESETS[presetName];
      if (presetData.curl) setCurl((prev) => ({ ...prev, ...presetData.curl }));
      if (presetData.clumping) setClumping((prev) => ({ ...prev, ...presetData.clumping }));
    }
  }, []);
  const hairData = useMemo<HairData>(
    () => ({
      strandCount,
      regions,
      clumping,
      curl,
      gradient,
      physics,
      lod,
      preset,
    }),
    [strandCount, regions, clumping, curl, gradient, physics, lod, preset]
  );
  useEffect(() => {
    onHairUpdate?.(hairData);
  }, [hairData, onHairUpdate]);
  const updateRegion = useCallback((id: string, updates: Partial<HairRegion>) => {
    setRegions((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    setPreset('custom');
  }, []);
  const exportAsCards = useCallback(() => {
    exportHairRuntimeData({ type: 'hair_cards', characterId, hairData, lod });
  }, [characterId, hairData, lod]);
  const exportAsStrands = useCallback(() => {
    exportHairRuntimeData({ type: 'hair_strands', characterId, hairData });
  }, [characterId, hairData]);
  return (
    <div className="w-full h-full min-h-screen bg-gradient-to-br from-[var(--aethel-surface-primary)] via-[var(--aethel-surface-secondary)] to-[var(--aethel-surface-primary)] flex">
      <HairFurViewport
        strandCount={strandCount}
        regions={regions}
        clumping={clumping}
        curl={curl}
        gradient={gradient}
        physics={physics}
        lod={lod}
        preset={preset}
        brush={brush}
        brushActive={brushActive}
        animatePhysics={animatePhysics}
        cameraDistance={cameraDistance}
        onBrushInactive={() => setBrushActive(false)}
        onCameraDistanceChange={setCameraDistance}
        onAnimatePhysicsChange={setAnimatePhysics}
      />
      {/* Control Panel */}
      <div className="w-96 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_95%,transparent)] backdrop-blur-sm border-l border-[var(--aethel-border-primary)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[var(--aethel-border-primary)]">
          <h2 className="text-xl font-bold text-[var(--aethel-text-primary)] flex items-center gap-2">
            Hair/Fur Editor
          </h2>
          <p className="text-sm text-[var(--aethel-text-tertiary)] mt-1">Character: {characterId}</p>
        </div>
        <HairPresetBar preset={preset} onPresetChange={applyPreset} />
        {/* Tab Navigation */}
        <div className="flex border-b border-[var(--aethel-border-primary)]">
          {HAIR_EDITOR_TABS.map((tab) => (
            <button type="button" aria-label={`Open ${tab.label.toLowerCase()} hair editor tab`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-3 py-2.5 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)] text-[var(--aethel-info-light)] border-b-2 border-[var(--aethel-info)]'
                  : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_50%,transparent)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* General Tab */}
          {activeTab === 'general' && (
            <>
              <Slider
                label="Strand Count"
                value={strandCount}
                min={1000}
                max={100000}
                step={1000}
                onChange={(v) => {
                  setStrandCount(v);
                  setPreset('custom');
                }}
              />
              <div className="space-y-3">
                <label className="text-sm font-medium text-[var(--aethel-text-secondary)] block">Regions</label>
                {regions.map((region) => (
                  <div
                    key={region.id}
                    className={`p-3 rounded-lg border transition-all ${
                      region.enabled
                        ? 'bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_50%,transparent)] border-[var(--aethel-border-secondary)]'
                        : 'bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_50%,transparent)] border-[var(--aethel-border-primary)] opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-[var(--aethel-text-primary)]">{region.name}</span>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={region.enabled}
                          onChange={(e) => updateRegion(region.id, { enabled: e.target.checked })}
                          className="w-4 h-4 rounded border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-info)] focus:ring-[var(--aethel-info)]"
                        />
                      </label>
                    </div>
                    {region.enabled && (
                      <div className="space-y-2">
                        <Slider
                          label="Length"
                          value={region.length}
                          min={0.1}
                          max={1.5}
                          step={0.05}
                          onChange={(v) => updateRegion(region.id, { length: v })}
                        />
                        <Slider
                          label="Density"
                          value={region.density}
                          min={0.1}
                          max={1}
                          step={0.05}
                          onChange={(v) => updateRegion(region.id, { density: v })}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
          {/* Style Tab */}
          {activeTab === 'style' && (
            <>
              {/* Clumping */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[var(--aethel-info-light)] uppercase tracking-wider">Clumping</h3>
                <Slider
                  label="Factor"
                  value={clumping.factor}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(v) => {
                    setClumping((prev) => ({ ...prev, factor: v }));
                    setPreset('custom');
                  }}
                />
                <Slider
                  label="Iterations"
                  value={clumping.iterations}
                  min={1}
                  max={10}
                  step={1}
                  onChange={(v) => {
                    setClumping((prev) => ({ ...prev, iterations: v }));
                    setPreset('custom');
                  }}
                />
                <Slider
                  label="Noise"
                  value={clumping.noise}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(v) => {
                    setClumping((prev) => ({ ...prev, noise: v }));
                    setPreset('custom');
                  }}
                />
                <Slider
                  label="Cohesion"
                  value={clumping.tightness}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(v) => {
                    setClumping((prev) => ({ ...prev, tightness: v }));
                    setPreset('custom');
                  }}
                />
              </div>
              {/* Curl */}
              <div className="space-y-3 pt-4 border-t border-[var(--aethel-border-primary)]">
                <h3 className="text-sm font-semibold text-[var(--aethel-info-light)] uppercase tracking-wider">Wave/Curl</h3>
                <div>
                  <label className="text-sm text-[var(--aethel-text-secondary)] block mb-2">Type</label>
                  <div className="flex gap-2">
                    {(['wave', 'curl', 'coil'] as const).map((type) => (
                      <button type="button" aria-label={`Select wave type ${type}`}
                        key={type}
                        onClick={() => {
                          setCurl((prev) => ({ ...prev, type }));
                          setPreset('custom');
                        }}
                        className={`flex-1 px-3 py-2 text-sm rounded-lg font-medium transition-all ${
                          curl.type === type
                            ? 'bg-[var(--aethel-info)] text-[var(--aethel-text-primary)]'
                            : 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-quaternary)]'
                        }`}
                      >
                        {type === 'wave' && 'Wave'}
                        {type === 'curl' && 'Curl'}
                        {type === 'coil' && 'Coil'}
                      </button>
                    ))}
                  </div>
                </div>
                <Slider
                  label="Intensity"
                  value={curl.intensity}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(v) => {
                    setCurl((prev) => ({ ...prev, intensity: v }));
                    setPreset('custom');
                  }}
                />
                <Slider
                  label="Frequency"
                  value={curl.frequency}
                  min={0}
                  max={10}
                  step={0.5}
                  onChange={(v) => {
                    setCurl((prev) => ({ ...prev, frequency: v }));
                    setPreset('custom');
                  }}
                />
                <Slider
                  label="Randomness"
                  value={curl.randomness}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(v) => {
                    setCurl((prev) => ({ ...prev, randomness: v }));
                    setPreset('custom');
                  }}
                />
              </div>
              {/* Gradient */}
              <div className="space-y-3 pt-4 border-t border-[var(--aethel-border-primary)]">
                <h3 className="text-sm font-semibold text-[var(--aethel-info-light)] uppercase tracking-wider">Hair Color</h3>
                <GradientPicker gradient={gradient} onChange={setGradient} />
              </div>
            </>
          )}
          {/* Physics Tab */}
          {activeTab === 'physics' && (
            <>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[var(--aethel-info-light)] uppercase tracking-wider">Physics Simulation</h3>
                <Slider
                  label="Gravity"
                  value={physics.gravity}
                  min={0}
                  max={2}
                  step={0.1}
                  onChange={(v) => setPhysics((prev) => ({ ...prev, gravity: v }))}
                />
                <Slider
                  label="Stiffness"
                  value={physics.stiffness}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(v) => setPhysics((prev) => ({ ...prev, stiffness: v }))}
                />
                <Slider
                  label="Damping"
                  value={physics.damping}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(v) => setPhysics((prev) => ({ ...prev, damping: v }))}
                />
              </div>
              <div className="space-y-3 pt-4 border-t border-[var(--aethel-border-primary)]">
                <h3 className="text-sm font-semibold text-[var(--aethel-info-light)] uppercase tracking-wider">Vento</h3>
                <Slider
                  label="Wind force"
                  value={physics.windStrength}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(v) => setPhysics((prev) => ({ ...prev, windStrength: v }))}
                />
                <Slider
                  label="Turbulence"
                  value={physics.windTurbulence}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(v) => setPhysics((prev) => ({ ...prev, windTurbulence: v }))}
                />
              </div>
            </>
          )}
          {/* LOD Tab */}
          {activeTab === 'lod' && (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--aethel-info-light)] uppercase tracking-wider">Level of Detail</h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-sm text-[var(--aethel-text-tertiary)]">Active</span>
                    <input
                      type="checkbox"
                      checked={lod.enableLOD}
                      onChange={(e) => setLod((prev) => ({ ...prev, enableLOD: e.target.checked }))}
                      className="w-4 h-4 rounded border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-info)] focus:ring-[var(--aethel-info)]"
                    />
                  </label>
                </div>
                {lod.enableLOD && (
                  <>
                    <Slider
                      label="Strands distance"
                      value={lod.strandDistance}
                      min={1}
                      max={20}
                      step={0.5}
                      unit="m"
                      onChange={(v) => setLod((prev) => ({ ...prev, strandDistance: v }))}
                    />
                    <Slider
                      label="Cards distance"
                      value={lod.cardDistance}
                      min={5}
                      max={50}
                      step={1}
                      unit="m"
                      onChange={(v) => setLod((prev) => ({ ...prev, cardDistance: v }))}
                    />
                    <Slider
                      label="Card Count"
                      value={lod.cardCount}
                      min={100}
                      max={2000}
                      step={50}
                      onChange={(v) => setLod((prev) => ({ ...prev, cardCount: v }))}
                    />
                  </>
                )}
              </div>
              <div className="p-4 bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_30%,transparent)] rounded-lg space-y-2 mt-4">
                <h4 className="text-sm font-medium text-[var(--aethel-text-primary)]">LOD levels</h4>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-[var(--aethel-success)]" />
                  <span className="text-[var(--aethel-text-secondary)]">Strands: 0 - {lod.strandDistance}m</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-[var(--aethel-warning)]" />
                  <span className="text-[var(--aethel-text-secondary)]">Cards: {lod.strandDistance} - {lod.cardDistance}m</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-[var(--aethel-error)]" />
                  <span className="text-[var(--aethel-text-secondary)]">Billboard: &gt; {lod.cardDistance}m</span>
                </div>
              </div>
            </>
          )}
          {/* Brush Tab */}
          {activeTab === 'brush' && (
            <>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[var(--aethel-info-light)] uppercase tracking-wider">Groom Tools</h3>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(HAIR_BRUSH_ICONS) as BrushTool[]).map((tool) => (
                    <button type="button" aria-label={`Select ${tool} groom tool`}
                      key={tool}
                      onClick={() => setBrush((prev) => ({ ...prev, tool }))}
                      className={`px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                        brush.tool === tool
                          ? 'bg-[var(--aethel-info)] text-[var(--aethel-text-primary)] ring-2 ring-[var(--aethel-info-light)]'
                          : 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-quaternary)]'
                      }`}
                    >
                      <span className="text-xl">{HAIR_BRUSH_ICONS[tool]}</span>
                      <span className="text-sm capitalize">{HAIR_BRUSH_LABELS[tool]}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3 pt-4 border-t border-[var(--aethel-border-primary)]">
                <h3 className="text-sm font-semibold text-[var(--aethel-info-light)] uppercase tracking-wider">Brush configuration</h3>
                <Slider
                  label="Size"
                  value={brush.size}
                  min={0.1}
                  max={5}
                  step={0.1}
                  onChange={(v) => setBrush((prev) => ({ ...prev, size: v }))}
                />
                <Slider
                  label="Strength"
                  value={brush.strength}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(v) => setBrush((prev) => ({ ...prev, strength: v }))}
                />
              </div>
              <div className="pt-4">
                <button type="button" aria-label={brushActive ? 'Disable hair brush' : 'Activer brush de cabelo'}
                  onClick={() => setBrushActive(!brushActive)}
                  className={`w-full py-3 rounded-lg font-medium transition-all ${
                    brushActive
                      ? 'bg-[var(--aethel-success)] hover:brightness-110 text-[var(--aethel-text-primary)]'
                      : 'bg-[var(--aethel-surface-quaternary)] hover:bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)]'
                  }`}
                >
                  {brushActive ? 'Brush active - click in the viewport' : 'Activer brush'}
                </button>
              </div>
              <div className="p-4 bg-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] border border-[color-mix(in_srgb,var(--aethel-warning)_50%,transparent)] rounded-lg mt-4">
                <p className="text-sm text-[var(--aethel-warning-light)]">
                  <strong>Tip:</strong> With the brush active, click and drag in the 3D viewport to apply the selected tool to hair strands.
                </p>
              </div>
            </>
          )}
        </div>
        <HairExportFooter onExportCards={exportAsCards} onExportStrands={exportAsStrands} />
      </div>
    </div>
  );
}
export type { HairData, HairRegion, ClumpingSettings, CurlSettings, PhysicsSettings, LODSettings, BrushSettings };
