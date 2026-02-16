'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface HairFurEditorProps {
  characterId: string;
  onHairUpdate?: (hairData: HairData) => void;
}

interface HairData {
  strandCount: number;
  regions: HairRegion[];
  clumping: ClumpingSettings;
  curl: CurlSettings;
  gradient: GradientStop[];
  physics: PhysicsSettings;
  lod: LODSettings;
  preset: HairPreset;
}

interface HairRegion {
  id: string;
  name: string;
  length: number;
  density: number;
  enabled: boolean;
}

interface ClumpingSettings {
  factor: number;
  iterations: number;
  noise: number;
  tightness: number;
}

interface CurlSettings {
  intensity: number;
  frequency: number;
  randomness: number;
  type: 'wave' | 'curl' | 'coil';
}

interface GradientStop {
  position: number;
  color: string;
}

interface PhysicsSettings {
  gravity: number;
  stiffness: number;
  damping: number;
  windStrength: number;
  windTurbulence: number;
}

interface LODSettings {
  strandDistance: number;
  cardDistance: number;
  cardCount: number;
  enableLOD: boolean;
}

type HairPreset = 'straight' | 'wavy' | 'curly' | 'afro' | 'fur' | 'custom';
type BrushTool = 'comb' | 'cut' | 'add' | 'length';

interface BrushSettings {
  tool: BrushTool;
  size: number;
  strength: number;
}

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

const HAIR_PRESETS: Record<HairPreset, Partial<HairData>> = {
  straight: {
    curl: { intensity: 0, frequency: 0, randomness: 0.1, type: 'wave' },
    clumping: { factor: 0.3, iterations: 2, noise: 0.1, tightness: 0.7 },
  },
  wavy: {
    curl: { intensity: 0.4, frequency: 2, randomness: 0.2, type: 'wave' },
    clumping: { factor: 0.4, iterations: 3, noise: 0.15, tightness: 0.5 },
  },
  curly: {
    curl: { intensity: 0.7, frequency: 4, randomness: 0.3, type: 'curl' },
    clumping: { factor: 0.5, iterations: 4, noise: 0.2, tightness: 0.4 },
  },
  afro: {
    curl: { intensity: 1.0, frequency: 8, randomness: 0.5, type: 'coil' },
    clumping: { factor: 0.6, iterations: 5, noise: 0.3, tightness: 0.3 },
  },
  fur: {
    curl: { intensity: 0.1, frequency: 1, randomness: 0.4, type: 'wave' },
    clumping: { factor: 0.2, iterations: 1, noise: 0.4, tightness: 0.8 },
  },
  custom: {},
};

const DEFAULT_REGIONS: HairRegion[] = [
  { id: 'top', name: 'Topo', length: 0.8, density: 1.0, enabled: true },
  { id: 'sides', name: 'Laterais', length: 0.6, density: 0.9, enabled: true },
  { id: 'back', name: 'Traseira', length: 0.7, density: 0.95, enabled: true },
  { id: 'front', name: 'Frontal', length: 0.5, density: 0.85, enabled: true },
  { id: 'nape', name: 'Nuca', length: 0.4, density: 0.8, enabled: true },
];

const DEFAULT_GRADIENT: GradientStop[] = [
  { position: 0, color: '#2d1810' },
  { position: 0.5, color: '#4a2c1a' },
  { position: 1, color: '#6b3d22' },
];

// ============================================================================
// HAIR GENERATION UTILITIES
// ============================================================================

function generateHairStrands(
  strandCount: number,
  regions: HairRegion[],
  clumping: ClumpingSettings,
  curl: CurlSettings,
  gradient: GradientStop[],
  physics: PhysicsSettings,
  time: number
): { positions: Float32Array; colors: Float32Array } {
  const segmentsPerStrand = 12;
  const totalPoints = strandCount * segmentsPerStrand * 2;
  const positions = new Float32Array(totalPoints * 3);
  const colors = new Float32Array(totalPoints * 3);

  const enabledRegions = regions.filter((r) => r.enabled);
  const strandsPerRegion = Math.floor(strandCount / Math.max(enabledRegions.length, 1));

  let pointIndex = 0;

  enabledRegions.forEach((region, regionIdx) => {
    const regionAngleStart = (regionIdx / enabledRegions.length) * Math.PI * 2;
    const regionAngleEnd = ((regionIdx + 1) / enabledRegions.length) * Math.PI * 2;

    for (let i = 0; i < strandsPerRegion; i++) {
      // Generate root position on scalp sphere
      const theta = regionAngleStart + Math.random() * (regionAngleEnd - regionAngleStart);
      const phi = Math.acos(1 - 2 * (0.2 + Math.random() * 0.3));
      const scalRadius = 0.5;

      const rootX = scalRadius * Math.sin(phi) * Math.cos(theta);
      const rootY = scalRadius * Math.cos(phi) + 0.3;
      const rootZ = scalRadius * Math.sin(phi) * Math.sin(theta);

      // Calculate strand direction (outward from scalp)
      const dirX = rootX;
      const dirY = rootY - 0.3;
      const dirZ = rootZ;
      const dirLen = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ) || 1;

      // Clumping offset
      const clumpSeed = Math.floor(i / (strandsPerRegion * clumping.factor + 1));
      const clumpOffsetX = (Math.sin(clumpSeed * 12.9898) * 0.5) * clumping.tightness;
      const clumpOffsetZ = (Math.cos(clumpSeed * 78.233) * 0.5) * clumping.tightness;

      for (let seg = 0; seg < segmentsPerStrand; seg++) {
        const t = seg / (segmentsPerStrand - 1);
        const tNext = (seg + 1) / (segmentsPerStrand - 1);

        // Base length with region multiplier
        const length = region.length * 0.8;

        // Curl calculation
        let curlX = 0, curlZ = 0;
        if (curl.intensity > 0) {
          const curlPhase = i * 0.1 + curl.randomness * Math.random();
          const curlAmp = curl.intensity * 0.1 * t;
          
          if (curl.type === 'wave') {
            curlX = Math.sin(t * curl.frequency * Math.PI + curlPhase) * curlAmp;
          } else if (curl.type === 'curl') {
            curlX = Math.sin(t * curl.frequency * Math.PI * 2 + curlPhase) * curlAmp;
            curlZ = Math.cos(t * curl.frequency * Math.PI * 2 + curlPhase) * curlAmp;
          } else if (curl.type === 'coil') {
            curlX = Math.sin(t * curl.frequency * Math.PI * 3 + curlPhase) * curlAmp * 1.5;
            curlZ = Math.cos(t * curl.frequency * Math.PI * 3 + curlPhase) * curlAmp * 1.5;
          }
        }

        // Physics simulation (gravity + wind)
        const gravityEffect = t * t * physics.gravity * 0.3;
        const windEffect = Math.sin(time * 2 + rootX * 5) * physics.windStrength * t * 0.1;
        const windTurbEffect = Math.sin(time * 5 + rootZ * 10) * physics.windTurbulence * t * 0.05;

        // Calculate positions
        const calcPos = (tVal: number) => {
          const stiffMult = 1 - physics.stiffness * 0.5;
          return {
            x: rootX + (dirX / dirLen) * tVal * length + curlX + clumpOffsetX * tVal + windEffect * stiffMult,
            y: rootY + (dirY / dirLen) * tVal * length - gravityEffect * stiffMult + windTurbEffect,
            z: rootZ + (dirZ / dirLen) * tVal * length + curlZ + clumpOffsetZ * tVal,
          };
        };

        const p1 = calcPos(t);
        const p2 = calcPos(Math.min(tNext, 1));

        // Store line segment
        positions[pointIndex * 3] = p1.x;
        positions[pointIndex * 3 + 1] = p1.y;
        positions[pointIndex * 3 + 2] = p1.z;
        pointIndex++;

        positions[pointIndex * 3] = p2.x;
        positions[pointIndex * 3 + 1] = p2.y;
        positions[pointIndex * 3 + 2] = p2.z;
        pointIndex++;

        // Interpolate gradient colors
        const color1 = interpolateGradient(gradient, t);
        const color2 = interpolateGradient(gradient, tNext);

        colors[(pointIndex - 2) * 3] = color1.r;
        colors[(pointIndex - 2) * 3 + 1] = color1.g;
        colors[(pointIndex - 2) * 3 + 2] = color1.b;

        colors[(pointIndex - 1) * 3] = color2.r;
        colors[(pointIndex - 1) * 3 + 1] = color2.g;
        colors[(pointIndex - 1) * 3 + 2] = color2.b;
      }
    }
  });

  return { positions, colors };
}

function interpolateGradient(gradient: GradientStop[], t: number): { r: number; g: number; b: number } {
  if (gradient.length === 0) return { r: 0.5, g: 0.3, b: 0.2 };
  if (gradient.length === 1) {
    const c = hexToRgb(gradient[0].color);
    return c || { r: 0.5, g: 0.3, b: 0.2 };
  }

  // Find surrounding stops
  let lower = gradient[0];
  let upper = gradient[gradient.length - 1];

  for (let i = 0; i < gradient.length - 1; i++) {
    if (t >= gradient[i].position && t <= gradient[i + 1].position) {
      lower = gradient[i];
      upper = gradient[i + 1];
      break;
    }
  }

  const range = upper.position - lower.position;
  const localT = range > 0 ? (t - lower.position) / range : 0;

  const c1 = hexToRgb(lower.color) || { r: 0, g: 0, b: 0 };
  const c2 = hexToRgb(upper.color) || { r: 1, g: 1, b: 1 };

  return {
    r: c1.r + (c2.r - c1.r) * localT,
    g: c1.g + (c2.g - c1.g) * localT,
    b: c1.b + (c2.b - c1.b) * localT,
  };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ============================================================================
// SUBCOMPONENT: HairStrands3D
// ============================================================================

interface HairStrands3DProps {
  strandCount: number;
  regions: HairRegion[];
  clumping: ClumpingSettings;
  curl: CurlSettings;
  gradient: GradientStop[];
  physics: PhysicsSettings;
  animatePhysics: boolean;
}

function HairStrands3D({
  strandCount,
  regions,
  clumping,
  curl,
  gradient,
  physics,
  animatePhysics,
}: HairStrands3DProps) {
  const linesRef = useRef<THREE.LineSegments>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const timeRef = useRef(0);

  // Update hair geometry
  useFrame((_, delta) => {
    if (animatePhysics) {
      timeRef.current += delta;
    }

    if (geometryRef.current) {
      const { positions, colors } = generateHairStrands(
        Math.min(strandCount, 10000), // Cap for performance in preview
        regions,
        clumping,
        curl,
        gradient,
        physics,
        timeRef.current
      );

      geometryRef.current.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometryRef.current.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometryRef.current.attributes.position.needsUpdate = true;
      geometryRef.current.attributes.color.needsUpdate = true;
    }
  });

  return (
    <lineSegments ref={linesRef}>
      <bufferGeometry ref={geometryRef} />
      <lineBasicMaterial vertexColors transparent opacity={0.9} linewidth={1} />
    </lineSegments>
  );
}

// ============================================================================
// SUBCOMPONENT: HeadMesh
// ============================================================================

function HeadMesh() {
  return (
    <mesh position={[0, 0.3, 0]}>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshStandardMaterial color="#e8d5c4" roughness={0.8} metalness={0.1} />
    </mesh>
  );
}

// ============================================================================
// SUBCOMPONENT: BrushPreview
// ============================================================================

interface BrushPreviewProps {
  brush: BrushSettings;
  active: boolean;
}

function BrushPreview({ brush, active }: BrushPreviewProps) {
  const { raycaster, camera, mouse } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);
  const [position, setPosition] = useState<THREE.Vector3>(new THREE.Vector3());

  useFrame(() => {
    if (!active || !meshRef.current) return;

    raycaster.setFromCamera(mouse, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersection);

    if (intersection) {
      setPosition(intersection);
      meshRef.current.position.copy(intersection);
    }
  });

  if (!active) return null;

  const brushColors: Record<BrushTool, string> = {
    comb: '#3b82f6',
    cut: '#ef4444',
    add: '#22c55e',
    length: '#f59e0b',
  };

  return (
    <mesh ref={meshRef} position={position}>
      <ringGeometry args={[brush.size * 0.08, brush.size * 0.1, 32]} />
      <meshBasicMaterial
        color={brushColors[brush.tool]}
        transparent
        opacity={0.5}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ============================================================================
// SUBCOMPONENT: GradientPicker
// ============================================================================

interface GradientPickerProps {
  gradient: GradientStop[];
  onChange: (gradient: GradientStop[]) => void;
}

function GradientPicker({ gradient, onChange }: GradientPickerProps) {
  const [selectedStop, setSelectedStop] = useState<number>(0);

  const handleStopColorChange = useCallback(
    (index: number, color: string) => {
      const newGradient = [...gradient];
      newGradient[index] = { ...newGradient[index], color };
      onChange(newGradient);
    },
    [gradient, onChange]
  );

  const handleStopPositionChange = useCallback(
    (index: number, position: number) => {
      const newGradient = [...gradient];
      newGradient[index] = { ...newGradient[index], position: Math.max(0, Math.min(1, position)) };
      newGradient.sort((a, b) => a.position - b.position);
      onChange(newGradient);
      setSelectedStop(newGradient.findIndex((s) => s.position === position));
    },
    [gradient, onChange]
  );

  const addStop = useCallback(() => {
    const newPosition = gradient.length > 0 ? (gradient[gradient.length - 1].position + 1) / 2 : 0.5;
    const newGradient = [...gradient, { position: newPosition, color: '#8b5a2b' }];
    newGradient.sort((a, b) => a.position - b.position);
    onChange(newGradient);
  }, [gradient, onChange]);

  const removeStop = useCallback(
    (index: number) => {
      if (gradient.length <= 2) return;
      const newGradient = gradient.filter((_, i) => i !== index);
      onChange(newGradient);
      setSelectedStop(Math.min(selectedStop, newGradient.length - 1));
    },
    [gradient, onChange, selectedStop]
  );

  const gradientStyle = useMemo(() => {
    const stops = gradient.map((s) => `${s.color} ${s.position * 100}%`).join(', ');
    return { background: `linear-gradient(to right, ${stops})` };
  }, [gradient]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-300">Gradiente Raiz → Ponta</label>
        <button
          onClick={addStop}
          className="px-2 py-1 text-xs bg-sky-600 hover:bg-sky-500 rounded text-white transition-colors"
        >
          + Parada
        </button>
      </div>

      {/* Gradient Preview Bar */}
      <div className="relative h-8 rounded-lg border border-slate-600 overflow-hidden" style={gradientStyle}>
        {gradient.map((stop, index) => (
          <div
            key={index}
            className={`absolute top-0 bottom-0 w-1 cursor-pointer transition-transform ${
              selectedStop === index ? 'ring-2 ring-white' : ''
            }`}
            style={{ left: `${stop.position * 100}%`, transform: 'translateX(-50%)' }}
            onClick={() => setSelectedStop(index)}
          >
            <div className="w-3 h-3 rounded-full border-2 border-white shadow-lg mx-auto mt-6" style={{ backgroundColor: stop.color }} />
          </div>
        ))}
      </div>

      {/* Stop Editor */}
      {gradient[selectedStop] && (
        <div className="grid grid-cols-3 gap-2 p-3 bg-slate-800/50 rounded-lg">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Cor</label>
            <input
              type="color"
              value={gradient[selectedStop].color}
              onChange={(e) => handleStopColorChange(selectedStop, e.target.value)}
              className="w-full h-8 rounded cursor-pointer border-0"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Posição</label>
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={gradient[selectedStop].position.toFixed(2)}
              onChange={(e) => handleStopPositionChange(selectedStop, parseFloat(e.target.value))}
              className="w-full h-8 px-2 bg-slate-700 border border-slate-600 rounded text-sm text-white"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => removeStop(selectedStop)}
              disabled={gradient.length <= 2}
              className="w-full h-8 text-xs bg-red-600 hover:bg-red-500 disabled:bg-slate-600 disabled:cursor-not-allowed rounded text-white transition-colors"
            >
              Remover
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUBCOMPONENT: LODPreview
// ============================================================================

interface LODPreviewProps {
  lod: LODSettings;
  currentDistance: number;
}

function LODPreview({ lod, currentDistance }: LODPreviewProps) {
  const currentMode = useMemo(() => {
    if (!lod.enableLOD) return 'strands';
    if (currentDistance < lod.strandDistance) return 'strands';
    if (currentDistance < lod.cardDistance) return 'cards';
    return 'billboard';
  }, [lod, currentDistance]);

  return (
    <div className="p-3 bg-slate-800/50 rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-300">Modo Atual:</span>
        <span
          className={`px-2 py-1 text-xs rounded font-medium ${
            currentMode === 'strands'
              ? 'bg-green-600 text-white'
              : currentMode === 'cards'
              ? 'bg-yellow-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {currentMode === 'strands' ? 'Strands (Alta Qualidade)' : currentMode === 'cards' ? 'Cards (Média)' : 'Billboard (Baixa)'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all"
            style={{ width: `${Math.min((currentDistance / (lod.cardDistance * 1.5)) * 100, 100)}%` }}
          />
        </div>
        <span className="text-xs text-slate-400 w-16 text-right">{currentDistance.toFixed(1)}m</span>
      </div>
    </div>
  );
}

// ============================================================================
// SUBCOMPONENT: Slider
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

function Slider({ label, value, min, max, step = 1, unit = '', onChange }: SliderProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-sm text-slate-300">{label}</label>
        <span className="text-sm font-mono text-sky-400">
          {step < 1 ? value.toFixed(2) : value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
      />
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT: HairFurEditor
// ============================================================================

export default function HairFurEditor({ characterId, onHairUpdate }: HairFurEditorProps) {
  // State
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
  const [activeTab, setActiveTab] = useState<'general' | 'style' | 'physics' | 'lod' | 'brush'>('general');
  const [cameraDistance, setCameraDistance] = useState(3);

  // Apply preset
  const applyPreset = useCallback((presetName: HairPreset) => {
    setPreset(presetName);
    if (presetName !== 'custom') {
      const presetData = HAIR_PRESETS[presetName];
      if (presetData.curl) setCurl((prev) => ({ ...prev, ...presetData.curl }));
      if (presetData.clumping) setClumping((prev) => ({ ...prev, ...presetData.clumping }));
    }
  }, []);

  // Compile hair data
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

  // Notify parent on changes
  useEffect(() => {
    onHairUpdate?.(hairData);
  }, [hairData, onHairUpdate]);

  // Update region
  const updateRegion = useCallback((id: string, updates: Partial<HairRegion>) => {
    setRegions((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    setPreset('custom');
  }, []);

  // Export functions
  const exportAsCards = useCallback(() => {
    const exportData = {
      type: 'hair_cards',
      characterId,
      ...hairData,
      cardCount: lod.cardCount,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${characterId}_hair_cards.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [characterId, hairData, lod.cardCount]);

  const exportAsStrands = useCallback(() => {
    const exportData = {
      type: 'hair_strands',
      characterId,
      ...hairData,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${characterId}_hair_strands.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [characterId, hairData]);

  // Brush icons
  const brushIcons: Record<BrushTool, string> = {
    comb: '🪥',
    cut: '✂️',
    add: '➕',
    length: '📏',
  };

  return (
    <div className="w-full h-full min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
      {/* 3D Viewport */}
      <div className="flex-1 relative">
        <Canvas
          camera={{ position: [0, 1, 3], fov: 50 }}
          onPointerMissed={() => setBrushActive(false)}
          className="w-full h-full"
        >
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
          <directionalLight position={[-3, 3, -3]} intensity={0.3} />
          <pointLight position={[0, 2, 0]} intensity={0.5} color="#fff5e6" />

          <HeadMesh />
          <HairStrands3D
            strandCount={strandCount}
            regions={regions}
            clumping={clumping}
            curl={curl}
            gradient={gradient}
            physics={physics}
            animatePhysics={animatePhysics}
          />

          <BrushPreview brush={brush} active={brushActive} />

          <OrbitControls
            enablePan={true}
            enableZoom={true}
            minDistance={1}
            maxDistance={10}
            onChange={(e) => {
              if (e?.target) {
                const dist = (e.target as any).getDistance?.() || 3;
                setCameraDistance(dist);
              }
            }}
          />

          <gridHelper args={[10, 10, '#334155', '#1e293b']} position={[0, -0.5, 0]} />
        </Canvas>

        {/* Viewport Overlay - Stats */}
        <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-sm rounded-lg p-3 text-sm space-y-1">
          <div className="text-slate-400">
            Strands: <span className="text-sky-400 font-mono">{strandCount.toLocaleString()}</span>
          </div>
          <div className="text-slate-400">
            Preset: <span className="text-sky-400 capitalize">{preset}</span>
          </div>
          <div className="text-slate-400">
            Física: <span className={animatePhysics ? 'text-green-400' : 'text-red-400'}>{animatePhysics ? 'Ativa' : 'Pausada'}</span>
          </div>
        </div>

        {/* Viewport Overlay - Controls */}
        <div className="absolute bottom-4 left-4 flex gap-2">
          <button
            onClick={() => setAnimatePhysics(!animatePhysics)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              animatePhysics
                ? 'bg-green-600 hover:bg-green-500 text-white'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
            }`}
          >
            {animatePhysics ? '⏸️ Pausar Física' : '▶️ Animar Física'}
          </button>
        </div>

        {/* Viewport Overlay - LOD */}
        <div className="absolute bottom-4 right-4 w-64">
          <LODPreview lod={lod} currentDistance={cameraDistance} />
        </div>
      </div>

      {/* Control Panel */}
      <div className="w-96 bg-slate-800/95 backdrop-blur-sm border-l border-slate-700 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            💇 Editor de Cabelo/Pelo
          </h2>
          <p className="text-sm text-slate-400 mt-1">Character: {characterId}</p>
        </div>

        {/* Preset Bar */}
        <div className="p-4 border-b border-slate-700">
          <label className="text-sm font-medium text-slate-300 block mb-2">Presets</label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(HAIR_PRESETS) as HairPreset[]).map((p) => (
              <button
                key={p}
                onClick={() => applyPreset(p)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
                  preset === p
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {p === 'straight' && '〰️ Liso'}
                {p === 'wavy' && '🌊 Ondulado'}
                {p === 'curly' && '🔄 Cacheado'}
                {p === 'afro' && '⭕ Afro'}
                {p === 'fur' && '🐾 Pelo'}
                {p === 'custom' && '⚙️ Custom'}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-700">
          {[
            { id: 'general', label: '⚙️ Geral' },
            { id: 'style', label: '✨ Estilo' },
            { id: 'physics', label: '🌪️ Física' },
            { id: 'lod', label: '📊 LOD' },
            { id: 'brush', label: '🖌️ Brush' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 px-3 py-2.5 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-sky-600/20 text-sky-400 border-b-2 border-sky-500'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* General Tab */}
          {activeTab === 'general' && (
            <>
              <Slider
                label="Quantidade de Fios"
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
                <label className="text-sm font-medium text-slate-300 block">Regiões</label>
                {regions.map((region) => (
                  <div
                    key={region.id}
                    className={`p-3 rounded-lg border transition-all ${
                      region.enabled
                        ? 'bg-slate-700/50 border-slate-600'
                        : 'bg-slate-800/50 border-slate-700 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-200">{region.name}</span>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={region.enabled}
                          onChange={(e) => updateRegion(region.id, { enabled: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-sky-600 focus:ring-sky-500"
                        />
                      </label>
                    </div>
                    {region.enabled && (
                      <div className="space-y-2">
                        <Slider
                          label="Comprimento"
                          value={region.length}
                          min={0.1}
                          max={1.5}
                          step={0.05}
                          onChange={(v) => updateRegion(region.id, { length: v })}
                        />
                        <Slider
                          label="Densidade"
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
                <h3 className="text-sm font-semibold text-sky-400 uppercase tracking-wider">Agrupamento (Clumping)</h3>
                <Slider
                  label="Fator"
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
                  label="Iterações"
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
                  label="Ruído"
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
                  label="Coesão"
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
              <div className="space-y-3 pt-4 border-t border-slate-700">
                <h3 className="text-sm font-semibold text-sky-400 uppercase tracking-wider">Ondulação/Cacho</h3>
                <div>
                  <label className="text-sm text-slate-300 block mb-2">Tipo</label>
                  <div className="flex gap-2">
                    {(['wave', 'curl', 'coil'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => {
                          setCurl((prev) => ({ ...prev, type }));
                          setPreset('custom');
                        }}
                        className={`flex-1 px-3 py-2 text-sm rounded-lg font-medium transition-all ${
                          curl.type === type
                            ? 'bg-sky-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {type === 'wave' && '〰️ Onda'}
                        {type === 'curl' && '🔄 Cacho'}
                        {type === 'coil' && '⭕ Espiral'}
                      </button>
                    ))}
                  </div>
                </div>
                <Slider
                  label="Intensidade"
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
                  label="Frequência"
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
                  label="Aleatoriedade"
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
              <div className="space-y-3 pt-4 border-t border-slate-700">
                <h3 className="text-sm font-semibold text-sky-400 uppercase tracking-wider">Cor do Cabelo</h3>
                <GradientPicker gradient={gradient} onChange={setGradient} />
              </div>
            </>
          )}

          {/* Physics Tab */}
          {activeTab === 'physics' && (
            <>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-sky-400 uppercase tracking-wider">Simulação Física</h3>
                <Slider
                  label="Gravidade"
                  value={physics.gravity}
                  min={0}
                  max={2}
                  step={0.1}
                  onChange={(v) => setPhysics((prev) => ({ ...prev, gravity: v }))}
                />
                <Slider
                  label="Rigidez"
                  value={physics.stiffness}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(v) => setPhysics((prev) => ({ ...prev, stiffness: v }))}
                />
                <Slider
                  label="Amortecimento"
                  value={physics.damping}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(v) => setPhysics((prev) => ({ ...prev, damping: v }))}
                />
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-700">
                <h3 className="text-sm font-semibold text-sky-400 uppercase tracking-wider">Vento</h3>
                <Slider
                  label="Força do Vento"
                  value={physics.windStrength}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(v) => setPhysics((prev) => ({ ...prev, windStrength: v }))}
                />
                <Slider
                  label="Turbulência"
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
                  <h3 className="text-sm font-semibold text-sky-400 uppercase tracking-wider">Level of Detail</h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-sm text-slate-400">Ativo</span>
                    <input
                      type="checkbox"
                      checked={lod.enableLOD}
                      onChange={(e) => setLod((prev) => ({ ...prev, enableLOD: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-sky-600 focus:ring-sky-500"
                    />
                  </label>
                </div>

                {lod.enableLOD && (
                  <>
                    <Slider
                      label="Distância Strands"
                      value={lod.strandDistance}
                      min={1}
                      max={20}
                      step={0.5}
                      unit="m"
                      onChange={(v) => setLod((prev) => ({ ...prev, strandDistance: v }))}
                    />
                    <Slider
                      label="Distância Cards"
                      value={lod.cardDistance}
                      min={5}
                      max={50}
                      step={1}
                      unit="m"
                      onChange={(v) => setLod((prev) => ({ ...prev, cardDistance: v }))}
                    />
                    <Slider
                      label="Quantidade de Cards"
                      value={lod.cardCount}
                      min={100}
                      max={2000}
                      step={50}
                      onChange={(v) => setLod((prev) => ({ ...prev, cardCount: v }))}
                    />
                  </>
                )}
              </div>

              <div className="p-4 bg-slate-700/30 rounded-lg space-y-2 mt-4">
                <h4 className="text-sm font-medium text-slate-200">Níveis de LOD</h4>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-slate-300">Strands: 0 - {lod.strandDistance}m</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-slate-300">Cards: {lod.strandDistance} - {lod.cardDistance}m</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-slate-300">Billboard: &gt; {lod.cardDistance}m</span>
                </div>
              </div>
            </>
          )}

          {/* Brush Tab */}
          {activeTab === 'brush' && (
            <>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-sky-400 uppercase tracking-wider">Ferramentas de Groom</h3>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(brushIcons) as BrushTool[]).map((tool) => (
                    <button
                      key={tool}
                      onClick={() => setBrush((prev) => ({ ...prev, tool }))}
                      className={`px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                        brush.tool === tool
                          ? 'bg-sky-600 text-white ring-2 ring-sky-400'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      <span className="text-xl">{brushIcons[tool]}</span>
                      <span className="text-sm capitalize">
                        {tool === 'comb' && 'Pentear'}
                        {tool === 'cut' && 'Cortar'}
                        {tool === 'add' && 'Adicionar'}
                        {tool === 'length' && 'Comprimento'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-700">
                <h3 className="text-sm font-semibold text-sky-400 uppercase tracking-wider">Configuração do Brush</h3>
                <Slider
                  label="Tamanho"
                  value={brush.size}
                  min={0.1}
                  max={5}
                  step={0.1}
                  onChange={(v) => setBrush((prev) => ({ ...prev, size: v }))}
                />
                <Slider
                  label="Força"
                  value={brush.strength}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(v) => setBrush((prev) => ({ ...prev, strength: v }))}
                />
              </div>

              <div className="pt-4">
                <button
                  onClick={() => setBrushActive(!brushActive)}
                  className={`w-full py-3 rounded-lg font-medium transition-all ${
                    brushActive
                      ? 'bg-green-600 hover:bg-green-500 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  }`}
                >
                  {brushActive ? '✓ Brush Ativo - Clique no Viewport' : 'Ativar Brush'}
                </button>
              </div>

              <div className="p-4 bg-amber-900/30 border border-amber-700/50 rounded-lg mt-4">
                <p className="text-sm text-amber-200">
                  <strong>💡 Dica:</strong> Com o brush ativo, clique e arraste no viewport 3D para aplicar a ferramenta selecionada nos fios de cabelo.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Export Footer */}
        <div className="p-4 border-t border-slate-700 space-y-3">
          <h3 className="text-sm font-semibold text-slate-300">Exportar para Runtime</h3>
          <div className="flex gap-2">
            <button
              onClick={exportAsCards}
              className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <span>🃏</span>
              <span>Cards</span>
            </button>
            <button
              onClick={exportAsStrands}
              className="flex-1 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <span>〰️</span>
              <span>Strands</span>
            </button>
          </div>
          <p className="text-xs text-slate-500 text-center">
            Cards: Melhor performance | Strands: Maior qualidade
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// NAMED EXPORTS FOR SUBCOMPONENTS
// ============================================================================

export { HairStrands3D, BrushPreview, GradientPicker, LODPreview };
export type { HairData, HairRegion, ClumpingSettings, CurlSettings, PhysicsSettings, LODSettings, BrushSettings };
