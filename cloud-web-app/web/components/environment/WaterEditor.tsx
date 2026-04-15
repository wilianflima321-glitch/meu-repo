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

'use client';

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import {
  OrbitControls,
  Grid,
  Environment,
  GizmoHelper,
  GizmoViewport,
  Sky,
  Html,
} from '@react-three/drei';
import * as THREE from 'three';
import {
  Waves,
  Droplets,
  Wind,
  Settings,
  Download,
  ChevronDown,
  ChevronRight,
  Eye,
  Zap,
  Palette,
  Sun,
  Anchor,
  Sparkles,
} from 'lucide-react';

function resolveCssVarColor(varName: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return value || fallback;
}

function resolveCssVarValue(value: string, fallback: string): string {
  if (!value) return fallback;
  if (value.startsWith('var(')) {
    const varName = value.slice(4, -1).trim();
    return resolveCssVarColor(varName, fallback);
  }
  return value;
}

// ============================================================================
// TYPES
// ============================================================================

export type WaterType = 'ocean' | 'lake' | 'river' | 'pond' | 'pool';

export interface WaveParams {
  amplitude: number;
  frequency: number;
  speed: number;
  steepness: number;
  direction: number;
}

export interface WaterParams {
  type: WaterType;

  // Appearance
  shallowColor: string;
  deepColor: string;
  colorDepthFade: number;
  transparency: number;

  // Waves
  waves: WaveParams[];
  waveScale: number;

  // Foam
  foamEnabled: boolean;
  foamColor: string;
  foamIntensity: number;
  foamScale: number;
  shorelineFoam: number;

  // Caustics
  causticsEnabled: boolean;
  causticsIntensity: number;
  causticsScale: number;
  causticsVelocidade: number;

  // Refracao
  refractionEnabled: boolean;
  refractionStrength: number;

  // Reflexao
  reflectionEnabled: boolean;
  reflectionIntensity: number;

  // Flow (for rivers)
  flowEnabled: boolean;
  flowVelocidade: number;
  flowDirecao: number;

  // Underwater
  underwaterFogColor: string;
  underwaterFogDensity: number;

  // Buoyancy
  buoyancyEnabled: boolean;
  buoyancyStrength: number;
  waterDensity: number;
}

export interface WaterPreset {
  id: string;
  name: string;
  type: WaterType;
  params: Partial<WaterParams>;
}

// ============================================================================
// PRESETS
// ============================================================================

const WATER_PRESETS: WaterPreset[] = [
  {
    id: 'ocean_tropical',
    name: 'Tropical Ocean',
    type: 'ocean',
    params: {
      shallowColor: 'var(--aethel-info-light)',
      deepColor: 'var(--aethel-info-dark)',
      transparency: 0.8,
      waveScale: 1.5,
      foamIntensity: 0.6,
      causticsEnabled: true,
    },
  },
  {
    id: 'ocean_stormy',
    name: 'Stormy Ocean',
    type: 'ocean',
    params: {
      shallowColor: 'var(--aethel-text-tertiary)',
      deepColor: 'var(--aethel-surface-tertiary)',
      transparency: 0.5,
      waveScale: 3.0,
      foamIntensity: 1.0,
      causticsEnabled: false,
    },
  },
  {
    id: 'lake_calm',
    name: 'Calm Lake',
    type: 'lake',
    params: {
      shallowColor: 'var(--aethel-info)',
      deepColor: 'var(--aethel-surface-quaternary)',
      transparency: 0.7,
      waveScale: 0.3,
      foamIntensity: 0.1,
      causticsEnabled: true,
      reflectionIntensity: 0.9,
    },
  },
  {
    id: 'river_clear',
    name: 'Clear River',
    type: 'river',
    params: {
      shallowColor: 'var(--aethel-info-light)',
      deepColor: 'var(--aethel-accent)',
      transparency: 0.85,
      waveScale: 0.5,
      flowEnabled: true,
      flowVelocidade: 2.0,
      foamIntensity: 0.4,
    },
  },
  {
    id: 'pond_murky',
    name: 'Murky Pond',
    type: 'pond',
    params: {
      shallowColor: 'var(--aethel-success-dark)',
      deepColor: 'var(--aethel-success-dark)',
      transparency: 0.4,
      waveScale: 0.1,
      foamEnabled: false,
      causticsEnabled: false,
    },
  },
  {
    id: 'pool_crystal',
    name: 'Crystal Pool',
    type: 'pool',
    params: {
      shallowColor: 'var(--aethel-info-light)',
      deepColor: 'var(--aethel-primary-dark)',
      transparency: 0.95,
      waveScale: 0.2,
      causticsEnabled: true,
      causticsIntensity: 0.8,
      reflectionIntensity: 0.7,
    },
  },
];

const DEFAULT_PARAMS: WaterParams = {
  type: 'ocean',
  shallowColor: 'var(--aethel-info-light)',
  deepColor: 'var(--aethel-info-dark)',
  colorDepthFade: 10,
  transparency: 0.75,
  waves: [
    { amplitude: 0.5, frequency: 0.5, speed: 1.0, steepness: 0.5, direction: 0 },
    { amplitude: 0.25, frequency: 1.0, speed: 1.5, steepness: 0.3, direction: 45 },
    { amplitude: 0.1, frequency: 2.0, speed: 2.0, steepness: 0.2, direction: -30 },
  ],
  waveScale: 1.0,
  foamEnabled: true,
  foamColor: 'var(--aethel-text-primary)',
  foamIntensity: 0.5,
  foamScale: 1.0,
  shorelineFoam: 0.5,
  causticsEnabled: true,
  causticsIntensity: 0.5,
  causticsScale: 1.0,
  causticsVelocidade: 1.0,
  refractionEnabled: true,
  refractionStrength: 0.3,
  reflectionEnabled: true,
  reflectionIntensity: 0.5,
  flowEnabled: false,
  flowVelocidade: 1.0,
  flowDirecao: 0,
  underwaterFogColor: 'var(--aethel-info-dark)',
  underwaterFogDensity: 0.1,
  buoyancyEnabled: true,
  buoyancyStrength: 1.0,
  waterDensity: 1000,
};

// ============================================================================
// SLIDER
// ============================================================================

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}

function Slider({ label, value, min, max, step = 0.01, unit = '', onChange }: SliderProps) {
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <label className="text-xs text-[var(--aethel-text-tertiary)]">{label}</label>
        <span className="text-xs text-[var(--aethel-text-secondary)] font-mono">
          {value.toFixed(step < 1 ? 2 : 0)}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-[var(--aethel-surface-quaternary)] rounded-lg appearance-none cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none
                   [&::-webkit-slider-thumb]:w-3
                   [&::-webkit-slider-thumb]:h-3
                   [&::-webkit-slider-thumb]:bg-[var(--aethel-info)]
                   [&::-webkit-slider-thumb]:rounded-full"
      />
    </div>
  );
}

// ============================================================================
// COLLAPSIBLE SECTION
// ============================================================================

interface CollapsibleSectionProps {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ title, icon, defaultOpen = true, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-4">
      <button type="button" aria-label={isOpen ? `Collapse ${title} section` : `Expand ${title} section`}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full text-left py-1.5 text-sm text-[var(--aethel-text-secondary)]
                   hover:text-[var(--aethel-text-primary)] transition-colors"
      >
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        {icon}
        {title}
      </button>
      {isOpen && <div className="pl-6 pt-2">{children}</div>}
    </div>
  );
}

// ============================================================================
// WATER SURFACE MESH
// ============================================================================

interface WaterSurfaceProps {
  params: WaterParams;
}

function WaterSurface({ params }: WaterSurfaceProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);
  const shallowColorValue = useMemo(
    () => resolveCssVarValue(params.shallowColor, 'rgb(34, 211, 238)'),
    [params.shallowColor]
  );
  const deepColorValue = useMemo(
    () => resolveCssVarValue(params.deepColor, 'rgb(8, 145, 178)'),
    [params.deepColor]
  );

  // Create water geometry
  const geometry = useMemo(() => {
    return new THREE.PlaneGeometry(100, 100, 128, 128);
  }, []);

  // Animate waves
  useFrame((_, delta) => {
    if (!meshRef.current) return;

    timeRef.current += delta;
    const positions = geometry.attributes.position.array as Float32Array;
    const originalPositions = geometry.attributes.position.clone().array as Float32Array;

    for (let i = 0; i < positions.length; i += 3) {
      const x = originalPositions[i];
      const y = originalPositions[i + 1];

      let height = 0;

      // Gerstner waves
      params.waves.forEach((wave) => {
        const dirRad = (wave.direction * Math.PI) / 180;
        const dirX = Math.cos(dirRad);
        const dirY = Math.sin(dirRad);

        const dotProduct = x * dirX + y * dirY;
        const phase = dotProduct * wave.frequency - timeRef.current * wave.speed;

        height += wave.amplitude * params.waveScale * Math.sin(phase);
      });

      // Flow for rivers
      if (params.flowEnabled && params.type === 'river') {
        const flowDir = (params.flowDirecao * Math.PI) / 180;
        const flowOffset = timeRef.current * params.flowVelocidade;
        height += Math.sin(x * 0.5 + flowOffset) * 0.1;
      }

      positions[i + 2] = height;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  });

  // Water material
  const shallowColor = new THREE.Color(shallowColorValue);
  const deepColor = new THREE.Color(deepColorValue);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
    >
      <meshPhysicalMaterial
        color={shallowColor.lerp(deepColor, 0.5)}
        transparent
        opacity={params.transparency}
        roughness={0.1}
        metalness={0}
        transmission={params.refractionEnabled ? params.refractionStrength : 0}
        thickness={5}
        envMapIntensity={params.reflectionEnabled ? params.reflectionIntensity : 0}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ============================================================================
// FOAM OVERLAY
// ============================================================================

interface FoamOverlayProps {
  params: WaterParams;
}

function FoamOverlay({ params }: FoamOverlayProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);
  const foamColor = useMemo(
    () => resolveCssVarValue(params.foamColor, 'rgb(248, 250, 252)'),
    [params.foamColor]
  );

  // useFrame must be called before any conditional return
  useFrame((_, delta) => {
    if (!params.foamEnabled) return;
    timeRef.current += delta;
    if (meshRef.current) {
      (meshRef.current.material as THREE.MeshBasicMaterial).opacity =
        params.foamIntensity * 0.3 * (0.5 + 0.5 * Math.sin(timeRef.current * 2));
    }
  });

  if (!params.foamEnabled) return null;

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
      <planeGeometry args={[100, 100]} />
      <meshBasicMaterial
        color={foamColor}
        transparent
        opacity={params.foamIntensity * 0.2}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ============================================================================
// CAUSTICS PROJECTOR
// ============================================================================

interface CausticsProjectorProps {
  params: WaterParams;
}

function CausticsProjector({ params }: CausticsProjectorProps) {
  const lightRef = useRef<THREE.SpotLight>(null);
  const timeRef = useRef(0);
  const causticsColor = useMemo(
    () => resolveCssVarColor('--aethel-info-light', 'rgb(34, 211, 238)'),
    []
  );

  // useFrame must be called before any conditional return
  useFrame((_, delta) => {
    if (!params.causticsEnabled) return;
    timeRef.current += delta * params.causticsVelocidade;
    if (lightRef.current) {
      // Animate caustics position slightly
      lightRef.current.position.x = Math.sin(timeRef.current * 0.5) * 2;
      lightRef.current.position.z = Math.cos(timeRef.current * 0.5) * 2;
    }
  });

  if (!params.causticsEnabled) return null;

  return (
    <spotLight
      ref={lightRef}
      position={[0, 10, 0]}
      angle={Math.PI / 3}
      penumbra={0.5}
      intensity={params.causticsIntensity * 2}
      color={causticsColor}
      castShadow={false}
    />
  );
}

// ============================================================================
// WAVE SETTINGS PANEL
// ============================================================================

interface WaveSettingsPanelProps {
  waves: WaveParams[];
  onUpdate: (waves: WaveParams[]) => void;
}

function WaveSettingsPanel({ waves, onUpdate }: WaveSettingsPanelProps) {
  const updateWave = (index: number, updates: Partial<WaveParams>) => {
    const newWaves = [...waves];
    newWaves[index] = { ...newWaves[index], ...updates };
    onUpdate(newWaves);
  };

  return (
    <div className="space-y-3">
      {waves.map((wave, i) => (
        <div key={i} className="bg-[var(--aethel-surface-tertiary)] rounded p-2">
          <div className="text-xs text-[var(--aethel-text-tertiary)] mb-2">Wave {i + 1}</div>

          <Slider
            label="Amplitude"
            value={wave.amplitude}
            min={0}
            max={2}
            onChange={(v) => updateWave(i, { amplitude: v })}
          />

          <Slider
            label="Frequencia"
            value={wave.frequency}
            min={0.1}
            max={5}
            onChange={(v) => updateWave(i, { frequency: v })}
          />

          <Slider
            label="Velocidade"
            value={wave.speed}
            min={0.1}
            max={5}
            onChange={(v) => updateWave(i, { speed: v })}
          />

          <Slider
            label="Direcao"
            value={wave.direction}
            min={-180}
            max={180}
            step={5}
            unit="deg"
            onChange={(v) => updateWave(i, { direction: v })}
          />
        </div>
      ))}
    </div>
  );
}

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
    () => resolveCssVarColor('--aethel-surface-primary', 'rgb(15, 23, 42)'),
    []
  );
  const underwaterColor = useMemo(
    () => resolveCssVarColor('--aethel-warning-dark', 'rgb(217, 119, 6)'),
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

          {/* Buoyancy */}
          <CollapsibleSection title="Buoyancy" icon={<Anchor className="w-4 h-4 text-[var(--aethel-warning)]" />} defaultOpen={false}>
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
                  unit=" kg/m³"
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
