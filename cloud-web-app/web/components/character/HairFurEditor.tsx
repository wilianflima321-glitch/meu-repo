'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  DEFAULT_GRADIENT,
  DEFAULT_REGIONS,
  HAIR_PRESETS,
  generateHairStrands,
  rgbToHex,
} from './hair-fur-core';
import type {
  BrushSettings,
  BrushTool,
  ClumpingSettings,
  CurlSettings,
  GradientStop,
  HairData,
  HairPreset,
  HairRegion,
  LODSettings,
  PhysicsSettings,
} from './hair-fur-core';

export interface HairFurEditorProps {
  characterId: string;
  onHairUpdate?: (hairData: HairData) => void;
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
