import { tokenColor } from '@/lib/design-system/DesignTokenSync'
'use client';

// @aethel-heavy-async-boundary
/**
 * WATER EDITOR - Aethel Engine
 *
 * Editor profissional de corpos d'agua com simulacao fisica.
 * Inspirado em UE5 Water System e Unity HDRP Water.
 *
 * FEATURES:
 * - Ocean, lake, river, pond types
 * - Wave simulation (Gerstner waves)
 * - Foam generation
 * - Caustics
 * - Underwater effects
 * - Buoyancy settings
 * - Flow maps
 * - Shore blend
 * - Reflexao/refraction
 */
import React, { useState, useCallback, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  OrbitControls,
  Grid,
  Environment,
  GizmoHelper,
  GizmoViewport,
  Sky,
} from '@react-three/drei';
import {
  Waves,
  Droplets,
  Wind,
  Settings,
  Download,
  Eye,
  Zap,
  Palette,
  Sun,
  Anchor,
  Sparkles,
} from 'lucide-react';
import { DEFAULT_PARAMS, WATER_PRESETS } from '@/components/environment/water-editor-models';
import type { WaterParams, WaterPreset, WaterType, WaveParams } from '@/components/environment/water-editor-models';

export type { WaterParams, WaterPreset, WaterType, WaveParams } from '@/components/environment/water-editor-models';


import {
  CausticsProjector,
  CollapsibleSection,
  FoamOverlay,
  Slider,
  WaterSurface,
  WaveSettingsPanel,
  resolveCssVarColor,
} from '@/lib/environment/WaterEditor.parts-runtime';

// ============================================================================
// MAIN WATER EDITOR
// ============================================================================

export interface WaterEditorProps {
  sceneId?: string;
  onWaterUpdate?: (params: WaterParams) => void;
  onExport?: (params: WaterParams) => void;
}

export default function WaterEditor({
  sceneId,
  onWaterUpdate,
  onExport,
}: WaterEditorProps) {
  const [params, setParams] = useState<WaterParams>(DEFAULT_PARAMS);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [showCaustics, setShowCaustics] = useState(true);
  const backgroundColor = useMemo(
    () => resolveCssVarColor('--aethel-surface-primary', tokenColor('--aethel-surface-primary')),
    []
  );
  const underwaterColor = useMemo(
    () => resolveCssVarColor('--aethel-warning-dark', tokenColor('--aethel-warning-dark')),
    []
  );

  // Apply preset
  const applyPreset = useCallback((preset: WaterPreset) => {
    setParams((prev) => ({ ...prev, ...preset.params, type: preset.type }));
    setSelectedPreset(preset.id);
  }, []);

  // Update parameter
  const updateParam = useCallback(<K extends keyof WaterParams>(
    key: K,
    value: WaterParams[K]
  ) => {
    setParams((prev) => {
      const updated = { ...prev, [key]: value };
      onWaterUpdate?.(updated);
      return updated;
    });
  }, [onWaterUpdate]);

  // Type icons
  const typeIcons: Record<WaterType, React.ReactNode> = {
    ocean: <Waves className="w-4 h-4" />,
    lake: <Droplets className="w-4 h-4" />,
    river: <Wind className="w-4 h-4" />,
    pond: <Droplets className="w-4 h-4" />,
    pool: <Sparkles className="w-4 h-4" />,
  };

  return (
    <div className="flex h-full w-full bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-secondary)]">
      {/* 3D Viewport */}
      <div className="flex-1 relative">
        <Canvas camera={{ position: [30, 20, 30], fov: 50 }}>
          <color attach="background" args={[backgroundColor]} />

          <ambientLight intensity={0.3} />
          <directionalLight position={[20, 30, 10]} intensity={1} />

          <WaterSurface params={params} />
          <FoamOverlay params={params} />
          {showCaustics && <CausticsProjector params={params} />}

          {/* Underwater plane */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]}>
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial
              color={underwaterColor}
              roughness={0.9}
            />
          </mesh>

          <Sky sunPosition={[100, 50, 100]} />
          <OrbitControls makeDefault />
          <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
            <GizmoViewport />
          </GizmoHelper>
          <Environment preset="sunset" />
        </Canvas>

        {/* Overlay info */}
        <div className="absolute top-4 left-4 bg-[var(--aethel-surface-primary)]/90 p-3 rounded">
          <div className="flex items-center gap-2 mb-2">
            {typeIcons[params.type]}
            <span className="font-medium capitalize">{params.type}</span>
          </div>
          <div className="text-xs text-[var(--aethel-text-tertiary)] space-y-1">
            <div>Waves: {params.waves.length}</div>
            <div>Scale: {params.waveScale.toFixed(1)}x</div>
            <div>Transparencia: {(params.transparency * 100).toFixed(0)}%</div>
          </div>
        </div>

        {/* Export button */}
        <div className="absolute top-4 right-4">
          <button type="button" aria-label="Export water settings"
            onClick={() => onExport?.(params)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--aethel-primary)] hover:bg-[var(--aethel-primary-dark)] rounded"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      <div className="w-80 border-l border-[var(--aethel-border-primary)] overflow-y-auto">
        <div className="p-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Waves className="w-5 h-5 text-[var(--aethel-primary)]" />
            Water Editor
          </h2>

          {/* Type selector */}
          <div className="mb-4">
            <label className="text-xs text-[var(--aethel-text-tertiary)] block mb-2">Water Type</label>
            <div className="grid grid-cols-3 gap-1">
              {(['ocean', 'lake', 'river', 'pond', 'pool'] as WaterType[]).map((type) => (
                <button type="button" aria-label={`Select water type ${type}`}
                  key={type}
                  onClick={() => updateParam('type', type)}
                  className={`p-2 rounded text-xs capitalize flex flex-col items-center gap-1 ${
                    params.type === type
                      ? 'bg-[var(--aethel-primary)]/30 border border-[var(--aethel-primary)]'
                      : 'bg-[var(--aethel-surface-quaternary)] hover:bg-[var(--aethel-surface-tertiary)]'
                  }`}
                >
                  {typeIcons[type]}
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Presets */}
          <CollapsibleSection title="Presets" icon={<Zap className="w-4 h-4 text-[var(--aethel-warning)]" />}>
            <div className="grid grid-cols-2 gap-1.5">
              {WATER_PRESETS.map((preset) => (
                <button type="button" aria-label={`Apply water preset ${preset.name}`}
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className={`p-2 rounded text-left ${
                    selectedPreset === preset.id
                      ? 'bg-[var(--aethel-primary)]/30 border border-[var(--aethel-primary)]'
                      : 'bg-[var(--aethel-surface-quaternary)] hover:bg-[var(--aethel-surface-tertiary)]'
                  }`}
                >
                  <div className="text-xs font-medium">{preset.name}</div>
                  <div className="text-[10px] text-[var(--aethel-text-tertiary)] capitalize">{preset.type}</div>
                </button>
              ))}
            </div>
          </CollapsibleSection>

          {/* Colors */}
          <CollapsibleSection title="Colors" icon={<Palette className="w-4 h-4 text-[var(--aethel-info)]" />}>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="text-[10px] text-[var(--aethel-text-tertiary)] block mb-1">Shallow</label>
                <input
                  type="color"
                  value={params.shallowColor}
                  onChange={(e) => updateParam('shallowColor', e.target.value)}
                  className="w-full h-8 rounded cursor-pointer bg-[var(--aethel-surface-quaternary)] border border-[var(--aethel-border-secondary)]"
                />
              </div>
              <div>
                <label className="text-[10px] text-[var(--aethel-text-tertiary)] block mb-1">Deep</label>
                <input
                  type="color"
                  value={params.deepColor}
                  onChange={(e) => updateParam('deepColor', e.target.value)}
                  className="w-full h-8 rounded cursor-pointer bg-[var(--aethel-surface-quaternary)] border border-[var(--aethel-border-secondary)]"
                />
              </div>
            </div>

            <Slider
              label="Transparencia"
              value={params.transparency}
              min={0}
              max={1}
              onChange={(v) => updateParam('transparency', v)}
            />

            <Slider
              label="Depth fade"
              value={params.colorDepthFade}
              min={1}
              max={50}
              step={1}
              unit="m"
              onChange={(v) => updateParam('colorDepthFade', v)}
            />
          </CollapsibleSection>

          {/* Waves */}
          <CollapsibleSection title="Waves" icon={<Waves className="w-4 h-4 text-[var(--aethel-primary)]" />}>
            <Slider
              label="Escala das ondas"
              value={params.waveScale}
              min={0}
              max={5}
              onChange={(v) => updateParam('waveScale', v)}
            />

            <WaveSettingsPanel
              waves={params.waves}
              onUpdate={(waves) => updateParam('waves', waves)}
            />
          </CollapsibleSection>

          {/* Foam */}
          <CollapsibleSection title="Foam" icon={<Sparkles className="w-4 h-4 text-[var(--aethel-text-primary)]" />}>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={params.foamEnabled}
                onChange={(e) => updateParam('foamEnabled', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Ativar foam</span>
            </div>

            {params.foamEnabled && (
              <>
                <div className="mb-3">
                  <label className="text-[10px] text-[var(--aethel-text-tertiary)] block mb-1">Cor do foam</label>
                  <input
                    type="color"
                    value={params.foamColor}
                    onChange={(e) => updateParam('foamColor', e.target.value)}
                    className="w-full h-8 rounded cursor-pointer bg-[var(--aethel-surface-quaternary)] border border-[var(--aethel-border-secondary)]"
                  />
                </div>

                <Slider
                  label="Intensity"
                  value={params.foamIntensity}
                  min={0}
                  max={1}
                  onChange={(v) => updateParam('foamIntensity', v)}
                />

                <Slider
                  label="Shoreline Foam"
                  value={params.shorelineFoam}
                  min={0}
                  max={1}
                  onChange={(v) => updateParam('shorelineFoam', v)}
                />
              </>
            )}
          </CollapsibleSection>

          {/* Caustics */}
          <CollapsibleSection title="Caustics" icon={<Sun className="w-4 h-4 text-[var(--aethel-warning)]" />} defaultOpen={false}>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={params.causticsEnabled}
                onChange={(e) => updateParam('causticsEnabled', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Ativar caustics</span>
            </div>

            {params.causticsEnabled && (
              <>
                <Slider
                  label="Intensity"
                  value={params.causticsIntensity}
                  min={0}
                  max={1}
                  onChange={(v) => updateParam('causticsIntensity', v)}
                />

                <Slider
                  label="Scale"
                  value={params.causticsScale}
                  min={0.1}
                  max={5}
                  onChange={(v) => updateParam('causticsScale', v)}
                />

                <Slider
                  label="Velocidade"
                  value={params.causticsVelocidade}
                  min={0.1}
                  max={3}
                  onChange={(v) => updateParam('causticsVelocidade', v)}
                />
              </>
            )}
          </CollapsibleSection>

          {/* Reflexao/Refracao */}
          <CollapsibleSection title="Optics" icon={<Eye className="w-4 h-4 text-[var(--aethel-info)]" />} defaultOpen={false}>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={params.reflectionEnabled}
                onChange={(e) => updateParam('reflectionEnabled', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Reflexao</span>
            </div>

            {params.reflectionEnabled && (
              <Slider
                label="Reflexao Intensity"
                value={params.reflectionIntensity}
                min={0}
                max={1}
                onChange={(v) => updateParam('reflectionIntensity', v)}
              />
            )}

            <div className="flex items-center gap-2 mb-3 mt-4">
              <input
                type="checkbox"
                checked={params.refractionEnabled}
                onChange={(e) => updateParam('refractionEnabled', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Refracao</span>
            </div>

            {params.refractionEnabled && (
              <Slider
                label="Refracao Strength"
                value={params.refractionStrength}
                min={0}
                max={1}
                onChange={(v) => updateParam('refractionStrength', v)}
              />
            )}
          </CollapsibleSection>

          {/* Flow (River) */}
          {params.type === 'river' && (
            <CollapsibleSection title="Flow" icon={<Wind className="w-4 h-4 text-[var(--aethel-accent)]" />}>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={params.flowEnabled}
                  onChange={(e) => updateParam('flowEnabled', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Ativar flow</span>
              </div>

              {params.flowEnabled && (
                <>
                  <Slider
                    label="Velocidade do flow"
                    value={params.flowVelocidade}
                    min={0}
                    max={5}
                    onChange={(v) => updateParam('flowVelocidade', v)}
                  />

                  <Slider
                    label="Direcao do flow"
                    value={params.flowDirecao}
                    min={-180}
                    max={180}
                    step={5}
                    unit="deg"
                    onChange={(v) => updateParam('flowDirecao', v)}
                  />
                </>
              )}
            </CollapsibleSection>
          )}

          {/* Buoyancy + Ocean FFT (cm) */}
          <CollapsibleSection title="Buoyancy" icon={<Anchor className="w-4 h-4 text-[var(--aethel-warning)]" />} defaultOpen={false}>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={params.fftOceanEnabled}
                onChange={(e) => updateParam('fftOceanEnabled', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">FFT ocean surface (cm)</span>
            </div>
            {params.fftOceanEnabled && (
              <Slider
                label="CapScore (FFT detail)"
                value={params.capabilityScore}
                min={0}
                max={100}
                step={1}
                onChange={(v) => updateParam('capabilityScore', v)}
              />
            )}
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={params.buoyancyEnabled}
                onChange={(e) => updateParam('buoyancyEnabled', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Ativar buoyancy</span>
            </div>

            {params.buoyancyEnabled && (
              <>
                <Slider
                  label="Forca de buoyancy"
                  value={params.buoyancyStrength}
                  min={0}
                  max={2}
                  onChange={(v) => updateParam('buoyancyStrength', v)}
                />

                <Slider
                  label="Densidade da agua"
                  value={params.waterDensity}
                  min={500}
                  max={1500}
                  step={50}
                  unit=" kg/m^3"
                  onChange={(v) => updateParam('waterDensity', v)}
                />
              </>
            )}
          </CollapsibleSection>

          {/* Underwater */}
          <CollapsibleSection title="Underwater" icon={<Droplets className="w-4 h-4 text-[var(--aethel-info)]" />} defaultOpen={false}>
            <div className="mb-3">
              <label className="text-[10px] text-[var(--aethel-text-tertiary)] block mb-1">Cor do fog</label>
              <input
                type="color"
                value={params.underwaterFogColor}
                onChange={(e) => updateParam('underwaterFogColor', e.target.value)}
                className="w-full h-8 rounded cursor-pointer bg-[var(--aethel-surface-quaternary)] border border-[var(--aethel-border-secondary)]"
              />
            </div>

            <Slider
              label="Densidade do fog"
              value={params.underwaterFogDensity}
              min={0}
              max={0.5}
              onChange={(v) => updateParam('underwaterFogDensity', v)}
            />
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
}
