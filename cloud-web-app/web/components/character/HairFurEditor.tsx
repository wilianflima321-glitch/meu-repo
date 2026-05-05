'use client';
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html as DreiHtml } from '@react-three/drei';
import * as THREE from 'three';
import { DEFAULT_GRADIENT, DEFAULT_REGIONS, HAIR_PRESETS, generateHairStrands, rgbToHex, type BrushSettings, type BrushTool, type ClumpingSettings, type CurlSettings, type GradientStop, type HairData, type HairPreset, type HairRegion, type LODSettings, type PhysicsSettings } from './hair-fur-model';
export interface HairFurEditorProps {
  characterId: string;
  onHairUpdate?: (hairData: HairData) => void;
}
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
function HeadMesh() {
  return (
    <mesh position={[0, 0.3, 0]}>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshStandardMaterial color="rgb(232 213 196)" roughness={0.8} metalness={0.1} />
    </mesh>
  );
}
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
    comb: 'rgb(59 130 246)',
    cut: 'rgb(239 68 68)',
    add: 'rgb(34 197 94)',
    length: 'rgb(245 158 11)',
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
    const newGradient = [...gradient, { position: newPosition, color: rgbToHex(139, 90, 43) }];
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
        <label className="text-sm font-medium text-[var(--aethel-text-secondary)]">Gradiente Raiz → Ponta</label>
        <button type="button" aria-label="Adicionar nova parada ao gradiente do cabelo"
          onClick={addStop}
          className="px-2 py-1 text-xs bg-[var(--aethel-info)] hover:brightness-110 rounded text-[var(--aethel-text-primary)] transition-colors"
        >
          + Parada
        </button>
      </div>
      {/* Gradient Preview Bar */}
      <div className="relative h-8 rounded-lg border border-[var(--aethel-border-secondary)] overflow-hidden" style={gradientStyle}>
        {gradient.map((stop, index) => (
          <div
            key={index}
            className={`absolute top-0 bottom-0 w-1 cursor-pointer transition-transform ${
              selectedStop === index ? 'ring-2 ring-white' : ''
            }`}
            style={{ left: `${stop.position * 100}%`, transform: 'translateX(-50%)' }}
            onClick={() => setSelectedStop(index)}
          >
            <div className="w-3 h-3 rounded-full border-2 border-[var(--aethel-border-primary)] shadow-lg mx-auto mt-6" style={{ backgroundColor: stop.color }} />
          </div>
        ))}
      </div>
      {/* Stop Editor */}
      {gradient[selectedStop] && (
        <div className="grid grid-cols-3 gap-2 p-3 bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_50%,transparent)] rounded-lg">
          <div>
            <label className="text-xs text-[var(--aethel-text-tertiary)] block mb-1">Cor</label>
            <input
              type="color"
              value={gradient[selectedStop].color}
              onChange={(e) => handleStopColorChange(selectedStop, e.target.value)}
              className="w-full h-8 rounded cursor-pointer border-0"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--aethel-text-tertiary)] block mb-1">Posição</label>
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={gradient[selectedStop].position.toFixed(2)}
              onChange={(e) => handleStopPositionChange(selectedStop, parseFloat(e.target.value))}
              className="w-full h-8 px-2 bg-[var(--aethel-surface-quaternary)] border border-[var(--aethel-border-secondary)] rounded text-sm text-[var(--aethel-text-primary)]"
            />
          </div>
          <div className="flex items-end">
            <button type="button" aria-label="Remover parada selecionada do gradiente"
              onClick={() => removeStop(selectedStop)}
              disabled={gradient.length <= 2}
              className="w-full h-8 text-xs bg-[var(--aethel-error)] hover:bg-[var(--aethel-error)] disabled:bg-[var(--aethel-surface-quaternary)] disabled:cursor-not-allowed rounded text-[var(--aethel-text-primary)] transition-colors"
            >
              Remover
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
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
    <div className="p-3 bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_50%,transparent)] rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--aethel-text-secondary)]">Modo Atual:</span>
        <span
          className={`px-2 py-1 text-xs rounded font-medium ${
            currentMode === 'strands'
              ? 'bg-[var(--aethel-success)] text-[var(--aethel-text-primary)]'
              : currentMode === 'cards'
              ? 'bg-[var(--aethel-warning)] text-[var(--aethel-text-primary)]'
              : 'bg-[var(--aethel-error)] text-[var(--aethel-text-primary)]'
          }`}
        >
          {currentMode === 'strands' ? 'Strands (Alta Qualidade)' : currentMode === 'cards' ? 'Cards (Média)' : 'Billboard (Baixa)'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-[var(--aethel-surface-quaternary)] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--aethel-success)] via-[var(--aethel-warning)] to-[var(--aethel-error)] transition-all"
            style={{ width: `${Math.min((currentDistance / (lod.cardDistance * 1.5)) * 100, 100)}%` }}
          />
        </div>
        <span className="text-xs text-[var(--aethel-text-tertiary)] w-16 text-right">{currentDistance.toFixed(1)}m</span>
      </div>
    </div>
  );
}
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
        <label className="text-sm text-[var(--aethel-text-secondary)]">{label}</label>
        <span className="text-sm font-mono text-[var(--aethel-info-light)]">
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
        className="w-full h-2 bg-[var(--aethel-surface-quaternary)] rounded-lg appearance-none cursor-pointer accent-[var(--aethel-info)]"
      />
    </div>
  );
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
  const [activeTab, setActiveTab] = useState<'general' | 'style' | 'physics' | 'lod' | 'brush'>('general');
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
  const brushIcons: Record<BrushTool, string> = {
    comb: 'C',
    cut: 'X',
    add: '+',
    length: 'L',
  };
  return (
    <div className="w-full h-full min-h-screen bg-gradient-to-br from-[var(--aethel-surface-primary)] via-[var(--aethel-surface-secondary)] to-[var(--aethel-surface-primary)] flex">
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
          <pointLight position={[0, 2, 0]} intensity={0.5} color="rgb(255 245 230)" />
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
          <gridHelper args={[10, 10, 'rgb(31 41 51)', 'rgb(20 26 36)']} position={[0, -0.5, 0]} />
        </Canvas>
        {/* Viewport Overlay - Stats */}
        <div className="absolute top-4 left-4 bg-[color-mix(in_srgb,var(--aethel-surface-primary)_80%,transparent)] backdrop-blur-sm rounded-lg p-3 text-sm space-y-1">
          <div className="text-[var(--aethel-text-tertiary)]">
            Strands: <span className="text-[var(--aethel-info-light)] font-mono">{strandCount.toLocaleString()}</span>
          </div>
          <div className="text-[var(--aethel-text-tertiary)]">
            Preset: <span className="text-[var(--aethel-info-light)] capitalize">{preset}</span>
          </div>
          <div className="text-[var(--aethel-text-tertiary)]">
            Física: <span className={animatePhysics ? 'text-[var(--aethel-success)]' : 'text-[var(--aethel-error)]'}>{animatePhysics ? 'Ativa' : 'Pausada'}</span>
          </div>
        </div>
        {/* Viewport Overlay - Controls */}
        <div className="absolute bottom-4 left-4 flex gap-2">
          <button type="button" aria-label={animatePhysics ? 'Pausar simulacao de fisica do cabelo' : 'Ativar simulacao de fisica do cabelo'}
            onClick={() => setAnimatePhysics(!animatePhysics)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              animatePhysics
                ? 'bg-[var(--aethel-success)] hover:brightness-110 text-[var(--aethel-text-primary)]'
                : 'bg-[var(--aethel-surface-quaternary)] hover:bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)]'
            }`}
          >
            {animatePhysics ? 'Pausar fisica' : 'Animar fisica'}
          </button>
        </div>
        {/* Viewport Overlay - LOD */}
        <div className="absolute bottom-4 right-4 w-64">
          <LODPreview lod={lod} currentDistance={cameraDistance} />
        </div>
      </div>
      {/* Control Panel */}
      <div className="w-96 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_95%,transparent)] backdrop-blur-sm border-l border-[var(--aethel-border-primary)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[var(--aethel-border-primary)]">
          <h2 className="text-xl font-bold text-[var(--aethel-text-primary)] flex items-center gap-2">
            Editor de Cabelo/Pelo
          </h2>
          <p className="text-sm text-[var(--aethel-text-tertiary)] mt-1">Personagem: {characterId}</p>
        </div>
        {/* Preset Bar */}
        <div className="p-4 border-b border-[var(--aethel-border-primary)]">
          <label className="text-sm font-medium text-[var(--aethel-text-secondary)] block mb-2">Presets</label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(HAIR_PRESETS) as HairPreset[]).map((p) => (
              <button type="button" aria-label={`Aplicar preset ${p} no cabelo`}
                key={p}
                onClick={() => applyPreset(p)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
                  preset === p
                    ? 'bg-[var(--aethel-info)] text-[var(--aethel-text-primary)]'
                    : 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-quaternary)]'
                }`}
              >
                {p === 'straight' && 'Liso'}
                {p === 'wavy' && 'Ondulado'}
                {p === 'curly' && 'Cacheado'}
                {p === 'afro' && 'Afro'}
                {p === 'fur' && 'Pelo'}
                {p === 'custom' && 'Custom'}
              </button>
            ))}
          </div>
        </div>
        {/* Tab Navigation */}
        <div className="flex border-b border-[var(--aethel-border-primary)]">
          {[
            { id: 'general', label: 'Geral' },
            { id: 'style', label: 'Estilo' },
            { id: 'physics', label: 'Fisica' },
            { id: 'lod', label: 'LOD' },
            { id: 'brush', label: 'Brush' },
          ].map((tab) => (
            <button type="button" aria-label={`Abrir aba ${tab.label.toLowerCase()} do editor de cabelo`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
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
                <label className="text-sm font-medium text-[var(--aethel-text-secondary)] block">Regiões</label>
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
                <h3 className="text-sm font-semibold text-[var(--aethel-info-light)] uppercase tracking-wider">Agrupamento (Clumping)</h3>
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
              <div className="space-y-3 pt-4 border-t border-[var(--aethel-border-primary)]">
                <h3 className="text-sm font-semibold text-[var(--aethel-info-light)] uppercase tracking-wider">Ondulação/Cacho</h3>
                <div>
                  <label className="text-sm text-[var(--aethel-text-secondary)] block mb-2">Tipo</label>
                  <div className="flex gap-2">
                    {(['wave', 'curl', 'coil'] as const).map((type) => (
                      <button type="button" aria-label={`Selecionar tipo de ondulacao ${type}`}
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
                        {type === 'wave' && 'Onda'}
                        {type === 'curl' && 'Cacho'}
                        {type === 'coil' && 'Espiral'}
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
              <div className="space-y-3 pt-4 border-t border-[var(--aethel-border-primary)]">
                <h3 className="text-sm font-semibold text-[var(--aethel-info-light)] uppercase tracking-wider">Cor do Cabelo</h3>
                <GradientPicker gradient={gradient} onChange={setGradient} />
              </div>
            </>
          )}
          {/* Physics Tab */}
          {activeTab === 'physics' && (
            <>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[var(--aethel-info-light)] uppercase tracking-wider">Simulação Física</h3>
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
              <div className="space-y-3 pt-4 border-t border-[var(--aethel-border-primary)]">
                <h3 className="text-sm font-semibold text-[var(--aethel-info-light)] uppercase tracking-wider">Vento</h3>
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
                  <h3 className="text-sm font-semibold text-[var(--aethel-info-light)] uppercase tracking-wider">Level of Detail</h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-sm text-[var(--aethel-text-tertiary)]">Ativo</span>
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
              <div className="p-4 bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_30%,transparent)] rounded-lg space-y-2 mt-4">
                <h4 className="text-sm font-medium text-[var(--aethel-text-primary)]">Níveis de LOD</h4>
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
                <h3 className="text-sm font-semibold text-[var(--aethel-info-light)] uppercase tracking-wider">Ferramentas de Groom</h3>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(brushIcons) as BrushTool[]).map((tool) => (
                    <button type="button" aria-label={`Selecionar ferramenta ${tool} de groom`}
                      key={tool}
                      onClick={() => setBrush((prev) => ({ ...prev, tool }))}
                      className={`px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                        brush.tool === tool
                          ? 'bg-[var(--aethel-info)] text-[var(--aethel-text-primary)] ring-2 ring-[var(--aethel-info-light)]'
                          : 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-quaternary)]'
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
              <div className="space-y-3 pt-4 border-t border-[var(--aethel-border-primary)]">
                <h3 className="text-sm font-semibold text-[var(--aethel-info-light)] uppercase tracking-wider">Configuração do Brush</h3>
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
                <button type="button" aria-label={brushActive ? 'Desativar brush de cabelo' : 'Ativar brush de cabelo'}
                  onClick={() => setBrushActive(!brushActive)}
                  className={`w-full py-3 rounded-lg font-medium transition-all ${
                    brushActive
                      ? 'bg-[var(--aethel-success)] hover:brightness-110 text-[var(--aethel-text-primary)]'
                      : 'bg-[var(--aethel-surface-quaternary)] hover:bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)]'
                  }`}
                >
                  {brushActive ? 'Brush ativo - clique no viewport' : 'Ativar brush'}
                </button>
              </div>
              <div className="p-4 bg-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] border border-[color-mix(in_srgb,var(--aethel-warning)_50%,transparent)] rounded-lg mt-4">
                <p className="text-sm text-[var(--aethel-warning-light)]">
                  <strong>Dica:</strong> Com o brush ativo, clique e arraste no viewport 3D para aplicar a ferramenta selecionada nos fios de cabelo.
                </p>
              </div>
            </>
          )}
        </div>
        {/* Export Footer */}
        <div className="p-4 border-t border-[var(--aethel-border-primary)] space-y-3">
          <h3 className="text-sm font-semibold text-[var(--aethel-text-secondary)]">Exportar para Runtime</h3>
          <div className="flex gap-2">
            <button type="button" aria-label="Exportar cabelo como cards"
              onClick={exportAsCards}
              className="flex-1 px-4 py-2.5 bg-[var(--aethel-warning)] hover:bg-[var(--aethel-warning)] text-[var(--aethel-text-primary)] rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-[var(--aethel-warning-light)]">Cards</span>
              <span>Cards</span>
            </button>
            <button type="button" aria-label="Exportar cabelo como strands"
              onClick={exportAsStrands}
              className="flex-1 px-4 py-2.5 bg-[var(--aethel-info)] hover:brightness-110 text-[var(--aethel-text-primary)] rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-[var(--aethel-info-light)]">Strands</span>
              <span>Strands</span>
            </button>
          </div>
          <p className="text-xs text-[var(--aethel-text-tertiary)] text-center">
            Cards: Melhor performance | Strands: Maior qualidade
          </p>
        </div>
      </div>
    </div>
  );
}
export { HairStrands3D, BrushPreview, GradientPicker, LODPreview };
export type { HairData, HairRegion, ClumpingSettings, CurlSettings, PhysicsSettings, LODSettings, BrushSettings };
