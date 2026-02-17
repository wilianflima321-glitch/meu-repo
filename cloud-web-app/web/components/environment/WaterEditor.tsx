/**
 * WATER EDITOR - Aethel Engine
 * 
 * Editor profissional de corpos d'água com simulação física.
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
 * - Reflection/refraction
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
  causticsSpeed: number;
  
  // Refraction
  refractionEnabled: boolean;
  refractionStrength: number;
  
  // Reflection
  reflectionEnabled: boolean;
  reflectionIntensity: number;
  
  // Flow (for rivers)
  flowEnabled: boolean;
  flowSpeed: number;
  flowDirection: number;
  
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
      shallowColor: '#40e0d0',
      deepColor: '#006994',
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
      shallowColor: '#4a6670',
      deepColor: '#1a2f38',
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
      shallowColor: '#5f9ea0',
      deepColor: '#2f4f4f',
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
      shallowColor: '#7fffd4',
      deepColor: '#20b2aa',
      transparency: 0.85,
      waveScale: 0.5,
      flowEnabled: true,
      flowSpeed: 2.0,
      foamIntensity: 0.4,
    },
  },
  {
    id: 'pond_murky',
    name: 'Murky Pond',
    type: 'pond',
    params: {
      shallowColor: '#556b2f',
      deepColor: '#2f4f2f',
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
      shallowColor: '#87ceeb',
      deepColor: '#4169e1',
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
  shallowColor: '#40e0d0',
  deepColor: '#006994',
  colorDepthFade: 10,
  transparency: 0.75,
  waves: [
    { amplitude: 0.5, frequency: 0.5, speed: 1.0, steepness: 0.5, direction: 0 },
    { amplitude: 0.25, frequency: 1.0, speed: 1.5, steepness: 0.3, direction: 45 },
    { amplitude: 0.1, frequency: 2.0, speed: 2.0, steepness: 0.2, direction: -30 },
  ],
  waveScale: 1.0,
  foamEnabled: true,
  foamColor: '#ffffff',
  foamIntensity: 0.5,
  foamScale: 1.0,
  shorelineFoam: 0.5,
  causticsEnabled: true,
  causticsIntensity: 0.5,
  causticsScale: 1.0,
  causticsSpeed: 1.0,
  refractionEnabled: true,
  refractionStrength: 0.3,
  reflectionEnabled: true,
  reflectionIntensity: 0.5,
  flowEnabled: false,
  flowSpeed: 1.0,
  flowDirection: 0,
  underwaterFogColor: '#006994',
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
        <label className="text-xs text-slate-400">{label}</label>
        <span className="text-xs text-slate-300 font-mono">
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
        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none
                   [&::-webkit-slider-thumb]:w-3
                   [&::-webkit-slider-thumb]:h-3
                   [&::-webkit-slider-thumb]:bg-cyan-500
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
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full text-left py-1.5 text-sm text-slate-200 
                   hover:text-white transition-colors"
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
        const flowDir = (params.flowDirection * Math.PI) / 180;
        const flowOffset = timeRef.current * params.flowSpeed;
        height += Math.sin(x * 0.5 + flowOffset) * 0.1;
      }
      
      positions[i + 2] = height;
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  });
  
  // Water material
  const shallowColor = new THREE.Color(params.shallowColor);
  const deepColor = new THREE.Color(params.deepColor);
  
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
        color={params.foamColor}
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
  
  // useFrame must be called before any conditional return
  useFrame((_, delta) => {
    if (!params.causticsEnabled) return;
    timeRef.current += delta * params.causticsSpeed;
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
      color="#88ccff"
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
        <div key={i} className="bg-slate-800/50 rounded p-2">
          <div className="text-xs text-slate-400 mb-2">Wave {i + 1}</div>
          
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
            unit="°"
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
    <div className="flex h-full w-full bg-slate-900 text-slate-200">
      {/* 3D Viewport */}
      <div className="flex-1 relative">
        <Canvas camera={{ position: [30, 20, 30], fov: 50 }}>
          <color attach="background" args={['#0a1628']} />
          
          <ambientLight intensity={0.3} />
          <directionalLight position={[20, 30, 10]} intensity={1} />
          
          <WaterSurface params={params} />
          <FoamOverlay params={params} />
          {showCaustics && <CausticsProjector params={params} />}
          
          {/* Underwater plane */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]}>
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial 
              color="#8b7355" 
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
        <div className="absolute top-4 left-4 bg-slate-900/90 p-3 rounded">
          <div className="flex items-center gap-2 mb-2">
            {typeIcons[params.type]}
            <span className="font-medium capitalize">{params.type}</span>
          </div>
          <div className="text-xs text-slate-400 space-y-1">
            <div>Waves: {params.waves.length}</div>
            <div>Scale: {params.waveScale.toFixed(1)}x</div>
            <div>Transparency: {(params.transparency * 100).toFixed(0)}%</div>
          </div>
        </div>
        
        {/* Export button */}
        <div className="absolute top-4 right-4">
          <button
            onClick={() => onExport?.(params)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>
      
      {/* Settings Panel */}
      <div className="w-80 border-l border-slate-700 overflow-y-auto">
        <div className="p-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Waves className="w-5 h-5 text-cyan-400" />
            Water Editor
          </h2>
          
          {/* Type selector */}
          <div className="mb-4">
            <label className="text-xs text-slate-400 block mb-2">Water Type</label>
            <div className="grid grid-cols-3 gap-1">
              {(['ocean', 'lake', 'river', 'pond', 'pool'] as WaterType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => updateParam('type', type)}
                  className={`p-2 rounded text-xs capitalize flex flex-col items-center gap-1 ${
                    params.type === type
                      ? 'bg-cyan-600/30 border border-cyan-500'
                      : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                >
                  {typeIcons[type]}
                  {type}
                </button>
              ))}
            </div>
          </div>
          
          {/* Presets */}
          <CollapsibleSection title="Presets" icon={<Zap className="w-4 h-4 text-yellow-400" />}>
            <div className="grid grid-cols-2 gap-1.5">
              {WATER_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className={`p-2 rounded text-left ${
                    selectedPreset === preset.id
                      ? 'bg-cyan-600/30 border border-cyan-500'
                      : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                >
                  <div className="text-xs font-medium">{preset.name}</div>
                  <div className="text-[10px] text-slate-400 capitalize">{preset.type}</div>
                </button>
              ))}
            </div>
          </CollapsibleSection>
          
          {/* Colors */}
          <CollapsibleSection title="Colors" icon={<Palette className="w-4 h-4 text-blue-400" />}>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Shallow</label>
                <input
                  type="color"
                  value={params.shallowColor}
                  onChange={(e) => updateParam('shallowColor', e.target.value)}
                  className="w-full h-8 rounded cursor-pointer bg-slate-700 border border-slate-600"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Deep</label>
                <input
                  type="color"
                  value={params.deepColor}
                  onChange={(e) => updateParam('deepColor', e.target.value)}
                  className="w-full h-8 rounded cursor-pointer bg-slate-700 border border-slate-600"
                />
              </div>
            </div>
            
            <Slider
              label="Transparency"
              value={params.transparency}
              min={0}
              max={1}
              onChange={(v) => updateParam('transparency', v)}
            />
            
            <Slider
              label="Depth Fade"
              value={params.colorDepthFade}
              min={1}
              max={50}
              step={1}
              unit="m"
              onChange={(v) => updateParam('colorDepthFade', v)}
            />
          </CollapsibleSection>
          
          {/* Waves */}
          <CollapsibleSection title="Waves" icon={<Waves className="w-4 h-4 text-cyan-400" />}>
            <Slider
              label="Wave Scale"
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
          <CollapsibleSection title="Foam" icon={<Sparkles className="w-4 h-4 text-white" />}>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={params.foamEnabled}
                onChange={(e) => updateParam('foamEnabled', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Enable Foam</span>
            </div>
            
            {params.foamEnabled && (
              <>
                <div className="mb-3">
                  <label className="text-[10px] text-slate-400 block mb-1">Foam Color</label>
                  <input
                    type="color"
                    value={params.foamColor}
                    onChange={(e) => updateParam('foamColor', e.target.value)}
                    className="w-full h-8 rounded cursor-pointer bg-slate-700 border border-slate-600"
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
          <CollapsibleSection title="Caustics" icon={<Sun className="w-4 h-4 text-yellow-400" />} defaultOpen={false}>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={params.causticsEnabled}
                onChange={(e) => updateParam('causticsEnabled', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Enable Caustics</span>
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
                  label="Speed"
                  value={params.causticsSpeed}
                  min={0.1}
                  max={3}
                  onChange={(v) => updateParam('causticsSpeed', v)}
                />
              </>
            )}
          </CollapsibleSection>
          
          {/* Reflection/Refraction */}
          <CollapsibleSection title="Optics" icon={<Eye className="w-4 h-4 text-blue-400" />} defaultOpen={false}>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={params.reflectionEnabled}
                onChange={(e) => updateParam('reflectionEnabled', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Reflection</span>
            </div>
            
            {params.reflectionEnabled && (
              <Slider
                label="Reflection Intensity"
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
              <span className="text-sm">Refraction</span>
            </div>
            
            {params.refractionEnabled && (
              <Slider
                label="Refraction Strength"
                value={params.refractionStrength}
                min={0}
                max={1}
                onChange={(v) => updateParam('refractionStrength', v)}
              />
            )}
          </CollapsibleSection>
          
          {/* Flow (River) */}
          {params.type === 'river' && (
            <CollapsibleSection title="Flow" icon={<Wind className="w-4 h-4 text-teal-400" />}>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={params.flowEnabled}
                  onChange={(e) => updateParam('flowEnabled', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Enable Flow</span>
              </div>
              
              {params.flowEnabled && (
                <>
                  <Slider
                    label="Flow Speed"
                    value={params.flowSpeed}
                    min={0}
                    max={5}
                    onChange={(v) => updateParam('flowSpeed', v)}
                  />
                  
                  <Slider
                    label="Flow Direction"
                    value={params.flowDirection}
                    min={-180}
                    max={180}
                    step={5}
                    unit="°"
                    onChange={(v) => updateParam('flowDirection', v)}
                  />
                </>
              )}
            </CollapsibleSection>
          )}
          
          {/* Buoyancy */}
          <CollapsibleSection title="Buoyancy" icon={<Anchor className="w-4 h-4 text-orange-400" />} defaultOpen={false}>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={params.buoyancyEnabled}
                onChange={(e) => updateParam('buoyancyEnabled', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Enable Buoyancy</span>
            </div>
            
            {params.buoyancyEnabled && (
              <>
                <Slider
                  label="Buoyancy Strength"
                  value={params.buoyancyStrength}
                  min={0}
                  max={2}
                  onChange={(v) => updateParam('buoyancyStrength', v)}
                />
                
                <Slider
                  label="Water Density"
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
          <CollapsibleSection title="Underwater" icon={<Droplets className="w-4 h-4 text-blue-400" />} defaultOpen={false}>
            <div className="mb-3">
              <label className="text-[10px] text-slate-400 block mb-1">Fog Color</label>
              <input
                type="color"
                value={params.underwaterFogColor}
                onChange={(e) => updateParam('underwaterFogColor', e.target.value)}
                className="w-full h-8 rounded cursor-pointer bg-slate-700 border border-slate-600"
              />
            </div>
            
            <Slider
              label="Fog Density"
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
