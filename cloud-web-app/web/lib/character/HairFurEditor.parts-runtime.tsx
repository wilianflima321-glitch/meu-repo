import { tokenColor } from '@/lib/design-system/DesignTokenSync'
'use client';

// @aethel-heavy-async-boundary: transitive runtime chunk loaded through HairFurEditor.

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Html as DreiHtml } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { generateHairStrands, rgbToHex } from '@/components/character/hair-fur-model';
import type { BrushSettings, BrushTool, ClumpingSettings, CurlSettings, GradientStop, HairRegion, LODSettings, PhysicsSettings } from '@/components/character/hair-fur-model';

interface HairStrands3DProps {strandCount: number;
  regions: HairRegion[];
  clumping: ClumpingSettings;
  curl: CurlSettings;
  gradient: GradientStop[];
  physics: PhysicsSettings;
  animatePhysics: boolean;
}

export function readOrbitDistance(target: unknown, fallback = 3): number {
  if (!target || typeof target !== 'object') return fallback;
  const candidate = (target as { getDistance?: () => unknown }).getDistance;
  if (typeof candidate !== 'function') return fallback;
  const distance = candidate();
  return typeof distance === 'number' && Number.isFinite(distance) ? distance : fallback;
}

export function HairStrands3D({
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
export function HeadMesh() {
  return (
    <mesh position={[0, 0.3, 0]}>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshStandardMaterial color={tokenColor("--aethel-character-skin-soft")} roughness={0.8} metalness={0.1} />
    </mesh>
  );
}
interface BrushPreviewProps {
  brush: BrushSettings;
  active: boolean;
}
export function BrushPreview({ brush, active }: BrushPreviewProps) {
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
    comb: tokenColor('--aethel-primary'),
    cut: tokenColor('--aethel-error'),
    add: tokenColor('--aethel-success'),
    length: tokenColor('--aethel-warning'),
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
export function GradientPicker({ gradient, onChange }: GradientPickerProps) {
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
        <button type="button" aria-label="Add a new hair gradient stop"
          onClick={addStop}
          className="px-2 py-1 text-xs bg-[var(--aethel-info)] hover:brightness-110 rounded text-[var(--aethel-text-primary)] transition-colors"
        >
          + Stop
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
            <label className="text-xs text-[var(--aethel-text-tertiary)] block mb-1">Color</label>
            <input
              type="color"
              value={gradient[selectedStop].color}
              onChange={(e) => handleStopColorChange(selectedStop, e.target.value)}
              className="w-full h-8 rounded cursor-pointer border-0"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--aethel-text-tertiary)] block mb-1">Position</label>
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
            <button type="button" aria-label="Remove selected gradient stop"
              onClick={() => removeStop(selectedStop)}
              disabled={gradient.length <= 2}
              className="w-full h-8 text-xs bg-[var(--aethel-error)] hover:bg-[var(--aethel-error)] disabled:bg-[var(--aethel-surface-quaternary)] disabled:cursor-not-allowed rounded text-[var(--aethel-text-primary)] transition-colors"
            >
              Remove
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
export function LODPreview({ lod, currentDistance }: LODPreviewProps) {
  const currentMode = useMemo(() => {
    if (!lod.enableLOD) return 'strands';
    if (currentDistance < lod.strandDistance) return 'strands';
    if (currentDistance < lod.cardDistance) return 'cards';
    return 'billboard';
  }, [lod, currentDistance]);
  return (
    <div className="p-3 bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_50%,transparent)] rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--aethel-text-secondary)]">Current Mode:</span>
        <span
          className={`px-2 py-1 text-xs rounded font-medium ${
            currentMode === 'strands'
              ? 'bg-[var(--aethel-success)] text-[var(--aethel-text-primary)]'
              : currentMode === 'cards'
              ? 'bg-[var(--aethel-warning)] text-[var(--aethel-text-primary)]'
              : 'bg-[var(--aethel-error)] text-[var(--aethel-text-primary)]'
          }`}
        >
          {currentMode === 'strands' ? 'Strands (High Quality)' : currentMode === 'cards' ? 'Cards (Medium)' : 'Billboard (Low)'}
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
export function Slider({ label, value, min, max, step = 1, unit = '', onChange }: SliderProps) {
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
