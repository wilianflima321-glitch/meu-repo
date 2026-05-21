'use client';

// @aethel-heavy-async-boundary
/**
 * FOLIAGE PAINTER - Aethel Engine
 *
 * Sistema profissional de pintura de vegetacao procedural.
 * Inspirado em UE5 Foliage Tool e SpeedTree.
 *
 * FEATURES:
 * - Multi-foliage brush painting
 * - Densidade, scale, rotation variance
 * - Slope and height filtering
 * - Instanced rendering (GPU instancing)
 * - LOD system
 * - Wind animation
 * - Collision generation
 * - Export para runtime
 */
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  OrbitControls,
  Grid,
  Environment,
  GizmoHelper,
  GizmoViewport,
} from '@react-three/drei';
import * as THREE from 'three';
import { resolveCssVarColor } from '@/lib/style/resolve-css-var';
import { CamadaItem, CollapsibleSection, FoliageInstances3D, FoliageStats, FoliageTypeCard, Slider, TerrainMesh } from './FoliagePainterPanels';
import {
  TreeDeciduous,
  Brush,
  Trash2,
  Settings,
  Download,
  Layers,
  Wind,
  Mountain,
  Plus,
  RotateCcw,
  Move,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export type FoliageToolType = 'paint' | 'erase' | 'select' | 'move';

export interface FoliageType {
  id: string;
  name: string;
  meshPath: string;
  thumbnail: string;
  category: 'tree' | 'bush' | 'grass' | 'flower' | 'rock';

  // Placement
  densityMin: number;
  densityMax: number;
  scaleMin: number;
  scaleMax: number;
  rotationYRandom: boolean;
  alignToNormal: boolean;
  normalAlignmentStrength: number;

  // Restricoes
  minSlope: number;
  maxSlope: number;
  minHeight: number;
  maxHeight: number;

  // Rendering
  castShadow: boolean;
  receiveShadow: boolean;
  cullDistance: number;
  lodBias: number;

  // Collision
  hasCollision: boolean;
  collisionType: 'box' | 'sphere' | 'mesh';

  // Wind
  windEnabled: boolean;
  windStrength: number;
  windFrequencia: number;
}

export interface FoliageInstance {
  id: string;
  typeId: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
}

export interface FoliageBrushSettings {
  tool: FoliageToolType;
  radius: number;
  density: number;
  falloff: number;
}

export interface FoliageCamada {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  types: string[];
  instancias: FoliageInstance[];
}

// ============================================================================
// DEFAULT FOLIAGE TYPES
// ============================================================================

const DEFAULT_FOLIAGE_TYPES: FoliageType[] = [
  {
    id: 'oak_tree',
    name: 'Oak Tree',
    meshPath: '/meshes/trees/oak.glb',
    thumbnail: '/thumbnails/oak.png',
    category: 'tree',
    densityMin: 0.1,
    densityMax: 0.3,
    scaleMin: 0.8,
    scaleMax: 1.2,
    rotationYRandom: true,
    alignToNormal: true,
    normalAlignmentStrength: 0.3,
    minSlope: 0,
    maxSlope: 30,
    minHeight: -100,
    maxHeight: 500,
    castShadow: true,
    receiveShadow: true,
    cullDistance: 500,
    lodBias: 0,
    hasCollision: true,
    collisionType: 'box',
    windEnabled: true,
    windStrength: 0.3,
    windFrequencia: 1.5,
  },
  {
    id: 'pine_tree',
    name: 'Pine Tree',
    meshPath: '/meshes/trees/pine.glb',
    thumbnail: '/thumbnails/pine.png',
    category: 'tree',
    densityMin: 0.15,
    densityMax: 0.4,
    scaleMin: 0.7,
    scaleMax: 1.3,
    rotationYRandom: true,
    alignToNormal: true,
    normalAlignmentStrength: 0.2,
    minSlope: 0,
    maxSlope: 40,
    minHeight: 100,
    maxHeight: 800,
    castShadow: true,
    receiveShadow: true,
    cullDistance: 600,
    lodBias: 0,
    hasCollision: true,
    collisionType: 'box',
    windEnabled: true,
    windStrength: 0.2,
    windFrequencia: 1.2,
  },
  {
    id: 'bush_green',
    name: 'Green Bush',
    meshPath: '/meshes/bushes/green.glb',
    thumbnail: '/thumbnails/bush_green.png',
    category: 'bush',
    densityMin: 0.3,
    densityMax: 0.6,
    scaleMin: 0.6,
    scaleMax: 1.4,
    rotationYRandom: true,
    alignToNormal: true,
    normalAlignmentStrength: 0.5,
    minSlope: 0,
    maxSlope: 45,
    minHeight: -100,
    maxHeight: 600,
    castShadow: true,
    receiveShadow: true,
    cullDistance: 200,
    lodBias: 0,
    hasCollision: true,
    collisionType: 'sphere',
    windEnabled: true,
    windStrength: 0.5,
    windFrequencia: 2.0,
  },
  {
    id: 'grass_tall',
    name: 'Tall Grass',
    meshPath: '/meshes/grass/tall.glb',
    thumbnail: '/thumbnails/grass_tall.png',
    category: 'grass',
    densityMin: 0.5,
    densityMax: 1.0,
    scaleMin: 0.7,
    scaleMax: 1.3,
    rotationYRandom: true,
    alignToNormal: true,
    normalAlignmentStrength: 0.8,
    minSlope: 0,
    maxSlope: 60,
    minHeight: -100,
    maxHeight: 1000,
    castShadow: false,
    receiveShadow: true,
    cullDistance: 100,
    lodBias: 1,
    hasCollision: false,
    collisionType: 'box',
    windEnabled: true,
    windStrength: 0.8,
    windFrequencia: 3.0,
  },
  {
    id: 'flower_red',
    name: 'Red Flower',
    meshPath: '/meshes/flowers/red.glb',
    thumbnail: '/thumbnails/flower_red.png',
    category: 'flower',
    densityMin: 0.3,
    densityMax: 0.8,
    scaleMin: 0.5,
    scaleMax: 1.0,
    rotationYRandom: true,
    alignToNormal: true,
    normalAlignmentStrength: 0.9,
    minSlope: 0,
    maxSlope: 30,
    minHeight: -50,
    maxHeight: 400,
    castShadow: false,
    receiveShadow: true,
    cullDistance: 80,
    lodBias: 1,
    hasCollision: false,
    collisionType: 'box',
    windEnabled: true,
    windStrength: 0.6,
    windFrequencia: 2.5,
  },
  {
    id: 'rock_small',
    name: 'Small Rock',
    meshPath: '/meshes/rocks/small.glb',
    thumbnail: '/thumbnails/rock_small.png',
    category: 'rock',
    densityMin: 0.1,
    densityMax: 0.3,
    scaleMin: 0.5,
    scaleMax: 2.0,
    rotationYRandom: true,
    alignToNormal: false,
    normalAlignmentStrength: 0,
    minSlope: 0,
    maxSlope: 90,
    minHeight: -100,
    maxHeight: 1000,
    castShadow: true,
    receiveShadow: true,
    cullDistance: 300,
    lodBias: 0,
    hasCollision: true,
    collisionType: 'mesh',
    windEnabled: false,
    windStrength: 0,
    windFrequencia: 0,
  },
];

// ============================================================================
// SLIDER COMPONENT
// ============================================================================

export interface FoliagePintarerProps {
  sceneId?: string;
  onFoliageUpdate?: (layers: FoliageCamada[]) => void;
  onExport?: (data: { layers: FoliageCamada[]; types: FoliageType[] }) => void;
}

export default function FoliagePintarer({
  sceneId,
  onFoliageUpdate,
  onExport,
}: FoliagePintarerProps) {
  const backgroundColor = useMemo(
    () => resolveCssVarColor('--aethel-surface-primary', 'rgb(15, 23, 42)'),
    []
  );
  // State
  const [foliageTypes] = useState<FoliageType[]>(DEFAULT_FOLIAGE_TYPES);
  const [selectedTypes, setSelecionaredTypes] = useState<string[]>(['grass_tall']);
  const [layers, setLayers] = useState<FoliageCamada[]>([
    { id: 'default', name: 'Camada padrao', visible: true, locked: false, types: [], instancias: [] },
  ]);
  const [activeCamadaId, setActiveCamadaId] = useState('default');

  // Brush settings
  const [brushSettings, setBrushSettings] = useState<FoliageBrushSettings>({
    tool: 'paint',
    radius: 3,
    density: 0.5,
    falloff: 0.5,
  });

  // Simulation
  const [isSimulating, setIsSimulating] = useState(false);
  const [windTime, setWindTime] = useState(0);
  const [brushPosition, setBrushPosition] = useState<THREE.Vector3 | null>(null);

  // Get active layer
  const activeCamada = useMemo(() =>
    layers.find((l) => l.id === activeCamadaId),
    [layers, activeCamadaId]
  );

  // Count instancias per type
  const instanceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    layers.forEach((layer) => {
      layer.instancias.forEach((inst) => {
        counts[inst.typeId] = (counts[inst.typeId] || 0) + 1;
      });
    });
    return counts;
  }, [layers]);

  // All visible instancias
  const visibleInstances = useMemo(() =>
    layers.filter((l) => l.visible).flatMap((l) => l.instancias),
    [layers]
  );

  // Pintar handler
  const handlePintar = useCallback((point: THREE.Vector3) => {
    if (!activeCamada || activeCamada.locked || selectedTypes.length === 0) return;

    if (brushSettings.tool === 'paint') {
      // Generate instancias
      const newInstances: FoliageInstance[] = [];
      const instanciasPerStroke = Math.floor(brushSettings.density * 10);

      for (let i = 0; i < instanciasPerStroke; i++) {
        const typeId = selectedTypes[Math.floor(Math.random() * selectedTypes.length)];
        const type = foliageTypes.find((t) => t.id === typeId);
        if (!type) continue;

        // Random position within brush radius
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * brushSettings.radius;
        const x = point.x + Math.cos(angle) * radius;
        const z = point.z + Math.sin(angle) * radius;

        // Scale variation
        const scaleValue = type.scaleMin + Math.random() * (type.scaleMax - type.scaleMin);

        newInstances.push({
          id: `inst_${Date.now()}_${i}`,
          typeId,
          position: new THREE.Vector3(x, point.y, z),
          rotation: new THREE.Euler(0, type.rotationYRandom ? Math.random() * Math.PI * 2 : 0, 0),
          scale: new THREE.Vector3(scaleValue, scaleValue, scaleValue),
        });
      }

      setLayers((prev) => prev.map((l) =>
        l.id === activeCamadaId
          ? { ...l, instancias: [...l.instancias, ...newInstances] }
          : l
      ));
    } else if (brushSettings.tool === 'erase') {
      // Remove instancias within radius
      setLayers((prev) => prev.map((l) =>
        l.id === activeCamadaId
          ? {
              ...l,
              instancias: l.instancias.filter((inst) =>
                inst.position.distanceTo(point) > brushSettings.radius
              ),
            }
          : l
      ));
    }
  }, [activeCamada, activeCamadaId, selectedTypes, brushSettings, foliageTypes]);

  // Toggle type selection
  const toggleTypeSelecionarion = useCallback((typeId: string) => {
    setSelecionaredTypes((prev) =>
      prev.includes(typeId)
        ? prev.filter((id) => id !== typeId)
        : [...prev, typeId]
    );
  }, []);

  // Add layer
  const addCamada = useCallback(() => {
    const newCamada: FoliageCamada = {
      id: `layer_${Date.now()}`,
      name: `Camada ${layers.length + 1}`,
      visible: true,
      locked: false,
      types: [],
      instancias: [],
    };
    setLayers((prev) => [...prev, newCamada]);
    setActiveCamadaId(newCamada.id);
  }, [layers.length]);

  // Delete layer
  const deleteCamada = useCallback((layerId: string) => {
    if (layers.length <= 1) return;
    setLayers((prev) => prev.filter((l) => l.id !== layerId));
    if (activeCamadaId === layerId) {
      setActiveCamadaId(layers[0].id);
    }
  }, [layers, activeCamadaId]);

  // Wind animation
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setWindTime((t) => t + 0.05);
    }, 16);

    return () => clearInterval(interval);
  }, [isSimulating]);

  // Clear all
  const clearAll = useCallback(() => {
    setLayers((prev) => prev.map((l) => ({ ...l, instancias: [] })));
  }, []);

  return (
    <div className="flex h-full w-full bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-secondary)]">
      {/* Left Panel - Tipos de foliage */}
      <div className="w-64 border-r border-[var(--aethel-border-primary)] flex flex-col">
        <div className="p-3 border-b border-[var(--aethel-border-primary)]">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <TreeDeciduous className="w-4 h-4 text-[var(--aethel-success)]" />
            Tipos de foliage
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {foliageTypes.map((type) => (
            <FoliageTypeCard
              key={type.id}
              type={type}
              isSelecionared={selectedTypes.includes(type.id)}
              onSelecionar={() => toggleTypeSelecionarion(type.id)}
              instanceCount={instanceCounts[type.id] || 0}
            />
          ))}
        </div>

        {/* Layers */}
        <div className="border-t border-[var(--aethel-border-primary)] p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[var(--aethel-text-tertiary)]">Layers</span>
            <button type="button" aria-label="Add foliage layer"
              onClick={addCamada}
              className="p-1 rounded bg-[var(--aethel-success)]/30 hover:bg-[var(--aethel-success)]/50"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-1">
            {layers.map((layer) => (
              <CamadaItem
                key={layer.id}
                layer={layer}
                isSelecionared={activeCamadaId === layer.id}
                onSelecionar={() => setActiveCamadaId(layer.id)}
                onToggleVisibility={() => {
                  setLayers((prev) => prev.map((l) =>
                    l.id === layer.id ? { ...l, visible: !l.visible } : l
                  ));
                }}
                onToggleLock={() => {
                  setLayers((prev) => prev.map((l) =>
                    l.id === layer.id ? { ...l, locked: !l.locked } : l
                  ));
                }}
                onDelete={() => deleteCamada(layer.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 3D Viewport */}
      <div className="flex-1 relative">
        <Canvas camera={{ position: [20, 20, 20], fov: 50 }} shadows>
          <color attach="background" args={[backgroundColor]} />

          <ambientLight intensity={0.4} />
          <directionalLight
            position={[20, 30, 10]}
            intensity={1}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />

          <TerrainMesh
            onPintar={handlePintar}
            brushPosition={brushPosition}
            brushRaio={brushSettings.radius}
            showBrush={brushSettings.tool === 'paint' || brushSettings.tool === 'erase'}
          />

          <FoliageInstances3D
            instancias={visibleInstances}
            types={foliageTypes}
            windTime={windTime}
          />

          <OrbitControls makeDefault />
          <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
            <GizmoViewport />
          </GizmoHelper>
        </Canvas>

        {/* Toolbar */}
        <div className="absolute top-4 left-4 flex gap-2">
          <div className="flex bg-[color-mix(in_srgb,var(--aethel-surface-primary)_90%,transparent)] rounded overflow-hidden">
            <button type="button" aria-label="Activate paint foliage tool"
              onClick={() => setBrushSettings((s) => ({ ...s, tool: 'paint' }))}
              className={`p-2 ${brushSettings.tool === 'paint' ? 'bg-[var(--aethel-success)]' : 'hover:bg-[var(--aethel-surface-quaternary)]'}`}
              title="Pintar"
            >
              <Brush className="w-4 h-4" />
            </button>
            <button type="button" aria-label="Activate erase foliage tool"
              onClick={() => setBrushSettings((s) => ({ ...s, tool: 'erase' }))}
              className={`p-2 ${brushSettings.tool === 'erase' ? 'bg-[var(--aethel-error)]' : 'hover:bg-[var(--aethel-surface-quaternary)]'}`}
              title="Apagar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button type="button" aria-label="Activate select foliage tool"
              onClick={() => setBrushSettings((s) => ({ ...s, tool: 'select' }))}
              className={`p-2 ${brushSettings.tool === 'select' ? 'bg-[var(--aethel-primary)]' : 'hover:bg-[var(--aethel-surface-quaternary)]'}`}
              title="Selecionar"
            >
              <Move className="w-4 h-4" />
            </button>
          </div>

          <button type="button" aria-label={isSimulating ? 'Stop foliage wind simulation' : 'Start foliage wind simulation'}
            onClick={() => setIsSimulating(!isSimulating)}
            className={`p-2 rounded ${isSimulating ? 'bg-[var(--aethel-success)]' : 'bg-[color-mix(in_srgb,var(--aethel-surface-primary)_90%,transparent)]'}`}
            title={isSimulating ? 'Stop Wind' : 'Simulate Wind'}
          >
            <Wind className="w-4 h-4" />
          </button>

          <button type="button" aria-label="Clear all foliage instances"
            onClick={clearAll}
            className="p-2 rounded bg-[color-mix(in_srgb,var(--aethel-surface-primary)_90%,transparent)] hover:bg-[var(--aethel-error)]/50"
            title="Limpar tudo"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button type="button" aria-label="Export foliage data"
            onClick={() => onExport?.({ layers, types: foliageTypes })}
            className="p-2 rounded bg-[var(--aethel-success)] hover:bg-[var(--aethel-success)]"
            title="Export"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        {/* Stats */}
        <div className="absolute bottom-4 left-4">
          <FoliageStats layers={layers} types={foliageTypes} />
        </div>
      </div>

      {/* Right Panel - Configuracoes do brush */}
      <div className="w-72 border-l border-[var(--aethel-border-primary)] overflow-y-auto">
        <div className="p-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-[var(--aethel-success)]" />
            Configuracoes do brush
          </h2>

          <CollapsibleSection title="Brush" icon={<Brush className="w-4 h-4 text-[var(--aethel-info)]" />}>
            <Slider
              label="Raio"
              value={brushSettings.radius}
              min={0.5}
              max={10}
              step={0.5}
              unit="m"
              onChange={(v) => setBrushSettings((s) => ({ ...s, radius: v }))}
            />
            <Slider
              label="Densidade"
              value={brushSettings.density}
              min={0.1}
              max={1}
              onChange={(v) => setBrushSettings((s) => ({ ...s, density: v }))}
            />
            <Slider
              label="Suavizacao"
              value={brushSettings.falloff}
              min={0}
              max={1}
              onChange={(v) => setBrushSettings((s) => ({ ...s, falloff: v }))}
            />
          </CollapsibleSection>

          {/* Selecionared type settings */}
          {selectedTypes.length === 1 && (
            <CollapsibleSection
              title="Configuracoes do tipo"
              icon={<TreeDeciduous className="w-4 h-4 text-[var(--aethel-success)]" />}
            >
              {(() => {
                const type = foliageTypes.find((t) => t.id === selectedTypes[0]);
                if (!type) return null;

                return (
                  <>
                    <div className="text-sm font-medium mb-3">{type.name}</div>

                    <Slider
                      label="Min Scale"
                      value={type.scaleMin}
                      min={0.1}
                      max={2}
                      onChange={() => {}}
                    />
                    <Slider
                      label="Max Scale"
                      value={type.scaleMax}
                      min={0.5}
                      max={3}
                      onChange={() => {}}
                    />

                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={type.rotationYRandom}
                        className="rounded"
                        readOnly
                      />
                      <span className="text-xs">Rotacao Y aleatoria</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={type.alignToNormal}
                        className="rounded"
                        readOnly
                      />
                      <span className="text-xs">Alinhar a normal</span>
                    </div>
                  </>
                );
              })()}
            </CollapsibleSection>
          )}

          <CollapsibleSection
            title="Restricoes"
            icon={<Mountain className="w-4 h-4 text-[var(--aethel-warning)]" />}
            defaultOpen={false}
          >
            <Slider
              label="Minimum slope"
              value={0}
              min={0}
              max={90}
              step={1}
              unit="°"
              onChange={() => {}}
            />
            <Slider
              label="Inclinacao maxima"
              value={45}
              min={0}
              max={90}
              step={1}
              unit="°"
              onChange={() => {}}
            />
            <Slider
              label="Altura minima"
              value={-100}
              min={-500}
              max={500}
              step={10}
              unit="m"
              onChange={() => {}}
            />
            <Slider
              label="Altura maxima"
              value={500}
              min={0}
              max={1000}
              step={10}
              unit="m"
              onChange={() => {}}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title="Wind"
            icon={<Wind className="w-4 h-4 text-[var(--aethel-primary)]" />}
            defaultOpen={false}
          >
            <Slider
              label="Forca global"
              value={0.5}
              min={0}
              max={2}
              onChange={() => {}}
            />
            <Slider
              label="Turbulencia"
              value={0.3}
              min={0}
              max={1}
              onChange={() => {}}
            />
            <Slider
              label="Frequencia"
              value={1.5}
              min={0.5}
              max={5}
              onChange={() => {}}
            />
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
}
