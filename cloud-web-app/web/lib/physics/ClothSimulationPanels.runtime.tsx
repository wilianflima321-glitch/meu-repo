'use client';

// @aethel-heavy-async-boundary: transitive runtime chunk loaded through ClothSimulationEditor.

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html as DreiHtml, Line } from '@react-three/drei';
import { Box, ChevronDown, ChevronRight, Move, Pause, Pin, Play, RotateCcw, Scissors } from 'lucide-react';
import * as THREE from 'three';
import type { ClothCollider, ClothConfig, ClothSimulation } from '@/lib/cloth-simulation';
import type { ClothEditorState, ClothToolType } from '@/lib/physics/ClothSimulationEditor.runtime';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  tooltip?: string;
}

export function Slider({ label, value, min, max, step = 0.01, unit = '', onChange, tooltip }: SliderProps) {
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <label className="text-xs text-[var(--aethel-text-secondary)]" title={tooltip}>{label}</label>
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
                   [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:cursor-pointer
                   [&::-webkit-slider-thumb]:hover:bg-[var(--aethel-info-light)]
                   [&::-webkit-slider-thumb]:transition-colors"
      />
    </div>
  );
}


interface Vector3InputProps {
  label: string;
  value: { x: number; y: number; z: number };
  onChange: (value: { x: number; y: number; z: number }) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function Vector3Input({ label, value, onChange, min = -100, max = 100, step = 0.1 }: Vector3InputProps) {
  return (
    <div className="mb-3">
      <label className="text-xs text-[var(--aethel-text-secondary)] block mb-1.5">{label}</label>
      <div className="grid grid-cols-3 gap-1.5">
        {(['x', 'y', 'z'] as const).map((axis) => (
          <div key={axis} className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-[var(--aethel-text-tertiary)] uppercase">
              {axis}
            </span>
            <input
              type="number"
              value={value[axis]}
              min={min}
              max={max}
              step={step}
              onChange={(e) => onChange({ ...value, [axis]: parseFloat(e.target.value) || 0 })}
              className="w-full bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded px-2 py-1.5 pl-6
                       text-xs text-[var(--aethel-text-primary)] focus:border-[var(--aethel-info)] focus:outline-none"
            />
          </div>
        ))}
      </div>
    </div>
  );
}


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
      <button type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full text-left py-1.5 text-sm text-[var(--aethel-text-primary)]
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


interface ClothMesh3DProps {
  simulation: ClothSimulation | null;
  config: ClothConfig;
  editorState: ClothEditorState;
  onVertexClick: (index: number, shiftKey: boolean) => void;
  selectedTool: ClothToolType;
}

export function ClothMesh3D({
  simulation,
  config,
  editorState,
  onVertexClick,
  selectedTool,
}: ClothMesh3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);

  const [hoverVertex, setHoverVertex] = useState<number | null>(null);

  const { geometry, pointsGeometry, constraintGeometry } = useMemo(() => {
    if (!simulation) return { geometry: null, pointsGeometry: null, constraintGeometry: null };

    const segmentsX = config.segmentsX;
    const segmentsY = config.segmentsY;
    const particles = simulation.particles;

    const geo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (const p of particles) {
      positions.push(p.position.x, p.position.y, p.position.z);
      uvs.push(
        (p.index % (segmentsX + 1)) / segmentsX,
        Math.floor(p.index / (segmentsX + 1)) / segmentsY
      );
    }

    for (let j = 0; j < segmentsY; j++) {
      for (let i = 0; i < segmentsX; i++) {
        const a = j * (segmentsX + 1) + i;
        const b = a + 1;
        const c = a + (segmentsX + 1);
        const d = c + 1;

        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const pointsGeo = new THREE.BufferGeometry();
    const pointPositions: number[] = [];
    const pointColors: number[] = [];

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      pointPositions.push(p.position.x, p.position.y, p.position.z);

      if (editorState.pinnedVertices.has(i)) {
        pointColors.push(1, 0.3, 0.3); // Red for pinned
      } else if (editorState.selectedVertices.has(i)) {
        pointColors.push(0.3, 0.8, 1); // Cyan for selected
      } else {
        pointColors.push(0.5, 0.5, 0.5); // Gray for normal
      }
    }

    pointsGeo.setAttribute('position', new THREE.Float32BufferAttribute(pointPositions, 3));
    pointsGeo.setAttribute('color', new THREE.Float32BufferAttribute(pointColors, 3));

    const constraintGeo = new THREE.BufferGeometry();
    const linePositions: number[] = [];
    const lineColors: number[] = [];

    if (editorState.showConstraints) {
      for (const constraint of simulation.constraints) {
        if (constraint.broken) continue;

        const p1 = particles[constraint.p1];
        const p2 = particles[constraint.p2];

        linePositions.push(p1.position.x, p1.position.y, p1.position.z);
        linePositions.push(p2.position.x, p2.position.y, p2.position.z);

        let color: [number, number, number];
        switch (constraint.type) {
          case 'structural': color = [0.2, 0.8, 0.2]; break;
          case 'shear': color = [0.8, 0.8, 0.2]; break;
          case 'bend': color = [0.2, 0.2, 0.8]; break;
          default: color = [0.5, 0.5, 0.5];
        }

        lineColors.push(...color, ...color);
      }
    }

    constraintGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    constraintGeo.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));

    return { geometry: geo, pointsGeometry: pointsGeo, constraintGeometry: constraintGeo };
  }, [simulation, config, editorState.selectedVertices, editorState.pinnedVertices, editorState.showConstraints]);

  useFrame((_, delta) => {
    if (!simulation || !editorState.isSimulating) return;

    simulation.update(Math.min(delta, 0.033)); // Cap at ~30fps physics

    if (meshRef.current && geometry) {
      const positions = geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < simulation.particles.length; i++) {
        const p = simulation.particles[i];
        positions[i * 3] = p.position.x;
        positions[i * 3 + 1] = p.position.y;
        positions[i * 3 + 2] = p.position.z;
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.computeVertexNormals();
    }

    if (pointsRef.current && pointsGeometry) {
      const positions = pointsGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < simulation.particles.length; i++) {
        const p = simulation.particles[i];
        positions[i * 3] = p.position.x;
        positions[i * 3 + 1] = p.position.y;
        positions[i * 3 + 2] = p.position.z;
      }
      pointsGeometry.attributes.position.needsUpdate = true;
    }
  });

  const handlePointClick = useCallback((event: THREE.Event) => {
    if (!simulation) return;

    const intersection = (event as any).intersections?.[0];
    if (intersection && intersection.index !== undefined) {
      onVertexClick(intersection.index, (event as any).shiftKey || false);
    }
  }, [simulation, onVertexClick]);

  if (!geometry || !pointsGeometry) return null;

  return (
    <group>
      {/* Cloth mesh */}
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial
          color={0x4a90d9}
          side={THREE.DoubleSide}
          wireframe={editorState.showWireframe}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>

      {/* Vertex points */}
      <points
        ref={pointsRef}
        geometry={pointsGeometry}
        onClick={handlePointClick}
      >
        <pointsMaterial
          size={selectedTool === 'pin' || selectedTool === 'unpin' ? 12 : 6}
          vertexColors
          sizeAttenuation={false}
        />
      </points>

      {/* Constraint lines */}
      {editorState.showConstraints && constraintGeometry && (
        <lineSegments ref={linesRef} geometry={constraintGeometry}>
          <lineBasicMaterial vertexColors transparent opacity={0.5} />
        </lineSegments>
      )}
    </group>
  );
}


interface ColliderVisualizerProps {
  colliders: ClothCollider[];
  showColliders: boolean;
  onColliderSelect: (index: number) => void;
  selectedCollider: number | null;
}

export function ColliderVisualizer({
  colliders,
  showColliders,
  onColliderSelect,
  selectedCollider,
}: ColliderVisualizerProps) {
  if (!showColliders) return null;

  return (
    <group>
      {colliders.map((collider, index) => {
        const isSelected = selectedCollider === index;
        const color = isSelected ? 0xffaa00 : 0x00aaff;

        switch (collider.type) {
          case 'sphere':
            return (
              <mesh
                key={index}
                position={collider.position}
                onClick={() => onColliderSelect(index)}
              >
                <sphereGeometry args={[collider.radius || 1, 16, 16]} />
                <meshBasicMaterial color={color} wireframe transparent opacity={0.5} />
              </mesh>
            );
          case 'plane':
            return (
              <mesh
                key={index}
                position={collider.position}
                rotation={new THREE.Euler().setFromQuaternion(
                  new THREE.Quaternion().setFromUnitVectors(
                    new THREE.Vector3(0, 1, 0),
                    collider.normal || new THREE.Vector3(0, 1, 0)
                  )
                )}
                onClick={() => onColliderSelect(index)}
              >
                <planeGeometry args={[10, 10]} />
                <meshBasicMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.3} />
              </mesh>
            );
          case 'box':
            return (
              <mesh
                key={index}
                position={collider.position}
                onClick={() => onColliderSelect(index)}
              >
                <boxGeometry args={[
                  collider.size?.x || 1,
                  collider.size?.y || 1,
                  collider.size?.z || 1,
                ]} />
                <meshBasicMaterial color={color} wireframe transparent opacity={0.5} />
              </mesh>
            );
          default:
            return null;
        }
      })}
    </group>
  );
}


interface WindArrowProps {
  direction: { x: number; y: number; z: number };
  strength: number;
  visible: boolean;
}

export function WindArrow({ direction, strength, visible }: WindArrowProps) {
  if (!visible || strength === 0) return null;

  const length = strength * 2;
  const dir = new THREE.Vector3(direction.x, direction.y, direction.z).normalize();
  const end = dir.clone().multiplyScalar(length);

  return (
    <group position={[0, 3, 0]}>
      <Line
        points={[[0, 0, 0], end.toArray()]}
        color={0x00ff88}
        lineWidth={3}
      />
      <mesh position={end}>
        <coneGeometry args={[0.15, 0.4, 8]} />
        <meshBasicMaterial color={0x00ff88} />
      </mesh>
      <DreiHtml position={end.clone().add(new THREE.Vector3(0.3, 0.3, 0))}>
        <div className="text-xs text-[var(--aethel-success)] whitespace-nowrap bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_80%,transparent)] px-1 rounded">
          Wind: {strength.toFixed(1)}
        </div>
      </DreiHtml>
    </group>
  );
}


interface ToolbarProps {
  selectedTool: ClothToolType;
  onToolChange: (tool: ClothToolType) => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  onReset: () => void;
}

export function Toolbar({
  selectedTool,
  onToolChange,
  isSimulating,
  onToggleSimulation,
  onReset,
}: ToolbarProps) {
  const tools: { id: ClothToolType; icon: React.ReactNode; label: string }[] = [
    { id: 'select', icon: <Move className="w-4 h-4" />, label: 'Select' },
    { id: 'pin', icon: <Pin className="w-4 h-4" />, label: 'Pin Vertices' },
    { id: 'unpin', icon: <Pin className="w-4 h-4 text-[var(--aethel-error)]" />, label: 'Unpin' },
    { id: 'tear', icon: <Scissors className="w-4 h-4" />, label: 'Tear' },
    { id: 'move_collider', icon: <Box className="w-4 h-4" />, label: 'Move Collider' },
  ];

  return (
    <div className="flex flex-col gap-1 p-2 bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_90%,transparent)] rounded-lg">
      {/* Simulation controls */}
      <button type="button"
        onClick={onToggleSimulation}
        className={`p-2 rounded transition-colors ${
          isSimulating
            ? 'bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-text-primary)]'
            : 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)]'
        }`}
        title={isSimulating ? 'Pause Simulation' : 'Play Simulation'}
      >
        {isSimulating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>

      <button type="button"
        onClick={onReset}
        className="p-2 rounded bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)] transition-colors"
        title="Reset Simulation"
      >
        <RotateCcw className="w-4 h-4" />
      </button>

      <div className="h-px bg-[var(--aethel-surface-quaternary)] my-2" />

      {/* Tools */}
      {tools.map((tool) => (
        <button type="button"
          key={tool.id}
          onClick={() => onToolChange(tool.id)}
          className={`p-2 rounded transition-colors ${
            selectedTool === tool.id
              ? 'bg-[var(--aethel-info)] text-[var(--aethel-text-primary)]'
              : 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)]'
          }`}
          title={tool.label}
        >
          {tool.icon}
        </button>
      ))}
    </div>
  );
}
