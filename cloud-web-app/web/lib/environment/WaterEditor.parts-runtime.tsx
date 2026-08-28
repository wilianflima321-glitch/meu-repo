'use client';

import { tokenColor } from '@/lib/design-system/DesignTokenSync'

// @aethel-heavy-async-boundary

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { WaterParams, WaveParams } from '@/components/environment/water-editor-models';
import {
  bindOceanViewportMesh,
  tickOceanViewportDisplacement,
} from '@/lib/ocean/ocean-viewport-wire';
import {
  applyOceanLightToMaterial,
  resolveOceanLightCoupling,
} from '@/lib/ocean/ocean-render-pass';

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
  const originalPositionsRef = useRef<Float32Array | null>(null);
  const shallowColorValue = useMemo(
    () => resolveCssVarValue(params.shallowColor, tokenColor('--aethel-neon-cyan')),
    [params.shallowColor]
  );
  const deepColorValue = useMemo(
    () => resolveCssVarValue(params.deepColor, tokenColor('--aethel-water-deep')),
    [params.deepColor]
  );

  // CapScore FFT segments (cm) vs Gerstner 128 when FFT opt-in off.
  const fftSegments = useMemo(() => {
    if (!params.fftOceanEnabled) return 128;
    const score = params.capabilityScore ?? 38;
    if (score >= 75) return 64;
    if (score >= 45) return 48;
    if (score >= 20) return 32;
    return 16;
  }, [params.fftOceanEnabled, params.capabilityScore]);

  // Create water geometry — rebuild when FFT segment budget changes.
  const geometry = useMemo(() => {
    return new THREE.PlaneGeometry(100, 100, fftSegments, fftSegments);
  }, [fftSegments]);

  useEffect(() => {
    const attr = geometry.attributes.position;
    originalPositionsRef.current = new Float32Array(attr.array as Float32Array);
    return () => {
      bindOceanViewportMesh(null);
    };
  }, [geometry]);

  // Animate waves — Gerstner default; FFT when fftOceanEnabled (letter cm).
  const shaderUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uWaveScale: { value: params.waveScale },
    uNumWaves: { value: params.waves.length },
    uWaves: { value: new Float32Array(8 * 4) }, // Max 8 waves, vec4(dirX, dirY, speed, frequency), and amplitudes in another uniform or packed
    uAmplitudes: { value: new Float32Array(8) },
    uFlow: { value: new THREE.Vector4(0, 0, 0, 0) }, // x, y (flowDir), offsetMult, weight
  }), []);

  // Update uniforms when params change
  useEffect(() => {
    shaderUniforms.uWaveScale.value = params.waveScale;
    const waveCount = Math.min(params.waves.length, 8);
    shaderUniforms.uNumWaves.value = waveCount;
    
    for (let i = 0; i < waveCount; i++) {
      const w = params.waves[i];
      const dirRad = (w.direction * Math.PI) / 180;
      shaderUniforms.uWaves.value[i * 4 + 0] = Math.cos(dirRad);
      shaderUniforms.uWaves.value[i * 4 + 1] = Math.sin(dirRad);
      shaderUniforms.uWaves.value[i * 4 + 2] = w.speed;
      shaderUniforms.uWaves.value[i * 4 + 3] = w.frequency;
      shaderUniforms.uAmplitudes.value[i] = w.amplitude;
    }
    
    if (params.flowEnabled && params.type === 'river') {
      const flowDir = (params.flowDirecao * Math.PI) / 180;
      shaderUniforms.uFlow.value.set(Math.cos(flowDir), Math.sin(flowDir), params.flowVelocidade, 1.0);
    } else {
      shaderUniforms.uFlow.value.setW(0.0);
    }
  }, [params]);

  // Animate waves
  useFrame((_, delta) => {
    if (!meshRef.current) return;
    timeRef.current += delta;
    
    if (params.fftOceanEnabled) {
      // Keep existing FFT CPU path for compatibility with capability score metrics
      const positions = geometry.attributes.position.array as Float32Array;
      const originals =
        originalPositionsRef.current ??
        (originalPositionsRef.current = new Float32Array(positions));

      const target = {
        positions,
        originalPositions: originals,
        worldSize: 100,
        setNeedsUpdate: () => {
          geometry.attributes.position.needsUpdate = true;
        },
      };
      bindOceanViewportMesh(target);
      tickOceanViewportDisplacement({
        capabilityScore: params.capabilityScore ?? 38,
        userEnabled: true,
        seed: Math.floor(timeRef.current * 10) % 10_000,
        waveScale: params.waveScale,
        windSpeed: 10 + params.waveScale * 4,
        amplitude: 0.4 * params.waveScale,
        target,
      });
      if (meshRef.current?.material) {
        const coupling = resolveOceanLightCoupling({
          capabilityScore: params.capabilityScore ?? 38,
          reflectionIntensity: params.reflectionIntensity,
          cloudCoverage: 0.2,
        });
        const mat = meshRef.current.material as THREE.MeshPhysicalMaterial;
        applyOceanLightToMaterial(
          {
            setColorRgb: (r, g, b) => { mat.color.setRGB(r, g, b); },
            setEnvMapIntensity: (v) => { mat.envMapIntensity = v; },
            setOpacity: (v) => { mat.opacity = v; },
          },
          coupling,
          params,
        );
      }
      geometry.computeVertexNormals();
    } else {
      // GPU PATH: DEBT-PERF-004 CLOSED. Just update the time uniform.
      shaderUniforms.uTime.value = timeRef.current;
    }
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
        onBeforeCompile={(shader) => {
          shader.uniforms.uTime = shaderUniforms.uTime;
          shader.uniforms.uWaveScale = shaderUniforms.uWaveScale;
          shader.uniforms.uNumWaves = shaderUniforms.uNumWaves;
          shader.uniforms.uWaves = shaderUniforms.uWaves;
          shader.uniforms.uAmplitudes = shaderUniforms.uAmplitudes;
          shader.uniforms.uFlow = shaderUniforms.uFlow;

          shader.vertexShader = `
            uniform float uTime;
            uniform float uWaveScale;
            uniform int uNumWaves;
            uniform vec4 uWaves[8];
            uniform float uAmplitudes[8];
            uniform vec4 uFlow;
            ${shader.vertexShader}
          `;

          shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `
            #include <begin_vertex>
            
            // Apply GPU Gerstner displacement
            float height = 0.0;
            for(int i = 0; i < 8; i++) {
              if(i >= uNumWaves) break;
              vec2 dir = uWaves[i].xy;
              float speed = uWaves[i].z;
              float freq = uWaves[i].w;
              float amp = uAmplitudes[i];
              float phase = dot(position.xy, dir) * freq - uTime * speed;
              height += amp * uWaveScale * sin(phase);
            }
            
            if (uFlow.w > 0.5) {
               float flowOffset = uTime * uFlow.z;
               height += sin(position.x * 0.5 + flowOffset) * 0.1;
            }
            
            transformed.z += height;
            `
          );
        }}
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
    () => resolveCssVarValue(params.foamColor, tokenColor('--aethel-text-primary')),
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
    () => resolveCssVarColor('--aethel-neon-cyan', tokenColor('--aethel-neon-cyan')),
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
            label="Frequency"
            value={wave.frequency}
            min={0.1}
            max={5}
            onChange={(v) => updateWave(i, { frequency: v })}
          />

          <Slider
            label="Speed"
            value={wave.speed}
            min={0.1}
            max={5}
            onChange={(v) => updateWave(i, { speed: v })}
          />

          <Slider
            label="Direction"
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
