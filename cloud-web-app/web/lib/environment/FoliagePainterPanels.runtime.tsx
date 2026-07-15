'use client';

// @aethel-heavy-async-boundary: transitive runtime chunk loaded through FoliagePainter.

import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { ChevronDown, ChevronRight, Droplets, Eye, EyeOff, Mountain, Trash2, TreeDeciduous } from 'lucide-react';
import * as THREE from 'three';
import { resolveCssVarColor } from '@/lib/style/resolve-css-var';
import type { FoliageCamada, FoliageInstance, FoliageType } from '@/lib/environment/FoliagePainterRuntime';
import { buildGeometryFromHeightfield } from '@/lib/production/heightfield-viewport-bridge';

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
                   [&::-webkit-slider-thumb]:bg-[var(--aethel-success)]
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
// TERRAIN MESH
// ============================================================================

export function TerrainMesh({
  onPintar,
  brushPosition,
  brushRaio,
  showBrush,
  heightfield,
}: {
  onPintar: (point: THREE.Vector3) => void;
  brushPosition: THREE.Vector3 | null;
  brushRaio: number;
  showBrush: boolean;
  /** Onda A.1 — durable heights when available; flat plane otherwise (never sin-wave mock). */
  heightfield?: { heights: Float32Array; resolution: number; widthMeters: number; depthMeters: number; maxHeight: number } | null;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [isPintaring, setIsPintaring] = useState(false);
  const terrainColor = useMemo(
    () => resolveCssVarColor('--aethel-surface-tertiary', 'rgb(74, 90, 58)'),
    []
  );
  const brushColor = useMemo(
    () => resolveCssVarColor('--aethel-success', 'rgb(16, 185, 129)'),
    []
  );

  // Onda A.1 — geometry from durable heightfield or honest flat substrate (no sin-wave as shipped).
  const geometry = useMemo(() => {
    if (heightfield && heightfield.heights.length === heightfield.resolution * heightfield.resolution) {
      const build = buildGeometryFromHeightfield(
        {
          meta: {
            resolution: heightfield.resolution,
            widthMeters: heightfield.widthMeters,
            depthMeters: heightfield.depthMeters,
            maxHeight: heightfield.maxHeight,
            version: 1,
            updatedAt: new Date().toISOString(),
            strokeCount: 0,
          },
          heights: heightfield.heights,
        },
        { maxSegments: 64 },
      )
      return build.geometry
    }
    const geo = new THREE.PlaneGeometry(50, 50, 64, 64);
    geo.rotateX(-Math.PI / 2);
    geo.computeVertexNormals();
    return geo;
  }, [heightfield]);

  useLayoutEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setIsPintaring(true);
    if (e.point) onPintar(e.point as THREE.Vector3);
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (isPintaring && e.point) {
      onPintar(e.point as THREE.Vector3);
    }
  };

  const handlePointerUp = () => {
    setIsPintaring(false);
  };

  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={geometry}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        receiveShadow
      >
        <meshStandardMaterial
          color={terrainColor}
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      {/* Brush indicator */}
      {showBrush && brushPosition && (
        <mesh position={[brushPosition.x, brushPosition.y + 0.1, brushPosition.z]}>
          <ringGeometry args={[brushRaio * 0.9, brushRaio, 32]} />
          <meshBasicMaterial color={brushColor} transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

// ============================================================================
// FOLIAGE INSTANCES 3D
// ============================================================================

interface FoliageInstances3DProps {
  instancias: FoliageInstance[];
  types: FoliageType[];
  windTime: number;
}

export function FoliageInstances3D({ instancias, types, windTime }: FoliageInstances3DProps) {
  const palette = useMemo(
    () => ({
      tree: resolveCssVarColor('--aethel-success-dark', 'rgb(5, 150, 105)'),
      bush: resolveCssVarColor('--aethel-success', 'rgb(16, 185, 129)'),
      grass: resolveCssVarColor('--aethel-success-light', 'rgb(52, 211, 153)'),
      flower: resolveCssVarColor('--aethel-error', 'rgb(239, 68, 68)'),
      rock: resolveCssVarColor('--aethel-text-quaternary', 'rgb(100, 116, 139)'),
      fallback: resolveCssVarColor('--aethel-text-muted', 'rgb(148, 163, 184)'),
    }),
    []
  );

  const instanciasByType = useMemo(() => {
    const grouped: Record<string, FoliageInstance[]> = {};
    instancias.forEach((inst) => {
      if (!grouped[inst.typeId]) grouped[inst.typeId] = [];
      grouped[inst.typeId].push(inst);
    });
    return grouped;
  }, [instancias]);

  return (
    <group>
      {Object.entries(instanciasByType).map(([typeId, typeInstances]) => {
        const foliageType = types.find((t) => t.id === typeId);
        if (!foliageType || typeInstances.length === 0) return null;
        return (
          <FoliageTypeInstancedMesh
            key={typeId}
            type={foliageType}
            instances={typeInstances}
            windTime={windTime}
            color={palette[foliageType.category] ?? palette.fallback}
          />
        );
      })}
    </group>
  );
}

function geometryForCategory(category: FoliageType['category']): THREE.BufferGeometry {
  switch (category) {
    case 'tree':
      return new THREE.ConeGeometry(0.5, 2, 8);
    case 'bush':
      return new THREE.SphereGeometry(0.4, 8, 8);
    case 'grass':
      return new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4);
    case 'flower':
      return new THREE.SphereGeometry(0.1, 8, 8);
    case 'rock':
      return new THREE.DodecahedronGeometry(0.3);
    default:
      return new THREE.BoxGeometry(0.5, 0.5, 0.5);
  }
}

function FoliageTypeInstancedMesh({
  type,
  instances,
  windTime,
  color,
}: {
  type: FoliageType;
  instances: FoliageInstance[];
  windTime: number;
  color: string;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => geometryForCategory(type.category), [type.category]);
  const yLift = type.category === 'tree' ? 1 : 0.2;

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < instances.length; i++) {
      const inst = instances[i];
      const windOffset = type.windEnabled
        ? Math.sin(windTime * type.windFrequencia + inst.position.x) * type.windStrength * 0.1
        : 0;
      dummy.position.set(
        inst.position.x + windOffset,
        inst.position.y + yLift,
        inst.position.z,
      );
      dummy.rotation.copy(inst.rotation);
      dummy.scale.copy(inst.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.count = instances.length;
    mesh.instanceMatrix.needsUpdate = true;
  }, [instances, windTime, type.windEnabled, type.windFrequencia, type.windStrength, yLift]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, Math.max(instances.length, 1)]}
      castShadow={type.castShadow}
      receiveShadow={type.receiveShadow}
      frustumCulled={false}
    >
      <meshStandardMaterial color={color} />
    </instancedMesh>
  );
}

// ============================================================================
// FOLIAGE TYPE CARD
// ============================================================================

interface FoliageTypeCardProps {
  type: FoliageType;
  isSelecionared: boolean;
  onSelecionar: () => void;
  instanceCount: number;
}

export function FoliageTypeCard({ type, isSelecionared, onSelecionar, instanceCount }: FoliageTypeCardProps) {
  const categoryColors: Record<string, string> = {
    tree: 'bg-[var(--aethel-success)]',
    bush: 'bg-[var(--aethel-success)]',
    grass: 'bg-[var(--aethel-success)]',
    flower: 'bg-[var(--aethel-primary)]',
    rock: 'bg-[var(--aethel-text-quaternary)]',
  };

  const categoryIcons: Record<string, React.ReactNode> = {
    tree: <TreeDeciduous className="w-4 h-4" />,
    bush: <TreeDeciduous className="w-3 h-3" />,
    grass: <Droplets className="w-4 h-4" />,
    flower: <Droplets className="w-4 h-4" />,
    rock: <Mountain className="w-4 h-4" />,
  };

  return (
    <button type="button" aria-label={`${isSelecionared ? 'Deselect' : 'Select'} foliage type ${type.name}`}
      onClick={onSelecionar}
      className={`w-full p-2 rounded flex items-center gap-2 text-left transition-colors ${
        isSelecionared
          ? 'bg-[var(--aethel-success)]/30 border border-[var(--aethel-success)]'
          : 'bg-[var(--aethel-surface-tertiary)] hover:bg-[var(--aethel-surface-quaternary)]/50 border border-transparent'
      }`}
    >
      <div className={`p-1.5 rounded ${categoryColors[type.category]}`}>
        {categoryIcons[type.category]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{type.name}</div>
        <div className="text-[10px] text-[var(--aethel-text-tertiary)]">{instanceCount} instancias</div>
      </div>
      <input
        type="checkbox"
        checked={isSelecionared}
        onChange={() => {}}
        className="rounded border-[var(--aethel-border-secondary)]"
      />
    </button>
  );
}

// ============================================================================
// LAYER ITEM
// ============================================================================

interface CamadaItemProps {
  layer: FoliageCamada;
  isSelecionared: boolean;
  onSelecionar: () => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
}

export function CamadaItem({
  layer,
  isSelecionared,
  onSelecionar,
  onToggleVisibility,
  onToggleLock,
  onDelete,
}: CamadaItemProps) {
  return (
    <div
      className={`flex items-center gap-2 p-2 rounded ${
        isSelecionared ? 'bg-[var(--aethel-success)]/20 border border-[var(--aethel-success)]' : 'bg-[var(--aethel-surface-tertiary)]'
      }`}
    >
      <button type="button" aria-label={`Select foliage layer ${layer.name}`} onClick={onSelecionar} className="flex-1 text-left text-sm truncate">
        {layer.name}
      </button>
      <span className="text-[10px] text-[var(--aethel-text-quaternary)]">{layer.instancias.length}</span>
      <button type="button" aria-label={layer.visible ? `Hide foliage layer ${layer.name}` : `Show foliage layer ${layer.name}`}
        onClick={onToggleVisibility}
        className="p-1 rounded hover:bg-[var(--aethel-surface-quaternary)]"
      >
        {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-[var(--aethel-text-quaternary)]" />}
      </button>
      <button type="button" aria-label={`Delete foliage layer ${layer.name}`}
        onClick={onDelete}
        className="p-1 rounded hover:bg-[var(--aethel-error)]/30"
      >
        <Trash2 className="w-3 h-3 text-[var(--aethel-error)]" />
      </button>
    </div>
  );
}

// ============================================================================
// FOLIAGE STATS
// ============================================================================

interface FoliageStatsProps {
  layers: FoliageCamada[];
  types: FoliageType[];
}

export function FoliageStats({ layers, types }: FoliageStatsProps) {
  const stats = useMemo(() => {
    let totalInstances = 0;
    const byCategory: Record<string, number> = {};

    layers.forEach((layer) => {
      layer.instancias.forEach((inst) => {
        totalInstances++;
        const type = types.find((t) => t.id === inst.typeId);
        if (type) {
          byCategory[type.category] = (byCategory[type.category] || 0) + 1;
        }
      });
    });

    return { totalInstances, byCategory };
  }, [layers, types]);

  return (
    <div className="bg-[var(--aethel-surface-tertiary)] rounded p-3 text-xs">
      <div className="font-medium mb-2">Estatisticas</div>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--aethel-text-tertiary)]">Total de instancias:</span>
          <span>{stats.totalInstances.toLocaleString()}</span>
        </div>
        {Object.entries(stats.byCategory).map(([cat, count]) => (
          <div key={cat} className="flex justify-between">
            <span className="text-[var(--aethel-text-tertiary)] capitalize">{cat}:</span>
            <span>{count.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN FOLIAGE PAINTER
// ============================================================================
