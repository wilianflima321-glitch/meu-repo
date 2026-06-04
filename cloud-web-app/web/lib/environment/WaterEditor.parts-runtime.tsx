'use client';

// @aethel-heavy-async-boundary

import React, { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { WaterParams, WaveParams } from '@/components/environment/water-editor-models';

export function resolveCssVarColor(varName: string, fallback: string): string {
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

export function Slider({ label, value, min, max, step = 0.01, unit = '', onChange }: SliderProps) {
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

export function CollapsibleSection({ title, icon, defaultOpen = true, children }: CollapsibleSectionProps) {
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

export function WaterSurface({ params }: WaterSurfaceProps) {
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

export function FoamOverlay({ params }: FoamOverlayProps) {
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

export function CausticsProjector({ params }: CausticsProjectorProps) {
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

export function WaveSettingsPanel({ waves, onUpdate }: WaveSettingsPanelProps) {
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
