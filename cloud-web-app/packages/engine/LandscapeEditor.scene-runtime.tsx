'use client';

// @aethel-heavy-async-boundary: landscape scene runtime is loaded through LandscapeEditor.

import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { OrbitControls, GizmoHelper, GizmoViewport, Grid } from '@react-three/drei';
import * as THREE from 'three';

import { resolveCssVarColor } from '../../web/lib/style/resolve-css-var';
import type { BrushSettings, FoliageType, TerrainConfig, TerrainLayer } from './LandscapeEditor.types';
import type { FoliageInstanceRecord } from '../../web/lib/production/terrain-foliage-math';

interface TerrainMeshProps {
  heightmap: Float32Array;
  resolution: number;
  width: number;
  height: number;
  maxHeight: number;
  layers: TerrainLayer[];
  /** Interleaved splat weights (letter be) — drives vertex colors when present */
  splatWeights?: Float32Array | null;
  splatLayerCount?: number;
  onBrushStroke: (point: THREE.Vector3) => void;
  brushSize: number;
  brushActive: boolean;
}

function parseLayerRgb(color: string): [number, number, number] {
  const hex = color.trim().match(/^#([0-9a-fA-F]{6})$/);
  if (hex) {
    const n = parseInt(hex[1]!, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  const rgb = color.trim().match(/^rgba?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*[,\s]\s*([\d.]+)/i);
  if (rgb) {
    return [Number(rgb[1]) / 255, Number(rgb[2]) / 255, Number(rgb[3]) / 255];
  }
  return [0.29, 0.49, 0.31];
}

function geometryForCategory(category: NonNullable<FoliageType['category']>): THREE.BufferGeometry {
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
      return new THREE.ConeGeometry(0.5, 2, 8);
  }
}

function LandscapeFoliageTypeMesh({
  type,
  instances,
}: {
  type: FoliageType;
  instances: FoliageInstanceRecord[];
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const category = type.category ?? 'tree';
  const geometry = useMemo(() => geometryForCategory(category), [category]);
  const yLift = category === 'tree' ? 1 : category === 'grass' ? 0.15 : 0.2;
  const color = type.color || 'rgb(34, 139, 34)';

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < instances.length; i++) {
      const inst = instances[i]!;
      dummy.position.set(inst.x, inst.y + yLift, inst.z);
      dummy.rotation.set(0, inst.rotY, 0);
      dummy.scale.set(inst.scale, inst.scale, inst.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.count = instances.length;
    mesh.instanceMatrix.needsUpdate = true;
  }, [instances, yLift]);

  if (instances.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, Math.max(instances.length, 1)]}
      castShadow
      receiveShadow
      frustumCulled={false}
    >
      <meshStandardMaterial color={color} />
    </instancedMesh>
  );
}

/** Letter bf — InstancedMesh viewport from durable foliage authority (empty-honest when none). */
export function LandscapeFoliageInstances3D({
  instances,
  types,
}: {
  instances: FoliageInstanceRecord[];
  types: FoliageType[];
}) {
  const byType = useMemo(() => {
    const grouped: Record<string, FoliageInstanceRecord[]> = {};
    for (const inst of instances) {
      if (!grouped[inst.typeId]) grouped[inst.typeId] = [];
      grouped[inst.typeId]!.push(inst);
    }
    return grouped;
  }, [instances]);

  if (!instances.length) return null;

  return (
    <group name="aethel-landscape-foliage">
      {Object.entries(byType).map(([typeId, typeInstances]) => {
        const foliageType = types.find((t) => t.id === typeId);
        if (!foliageType || typeInstances.length === 0) return null;
        return (
          <LandscapeFoliageTypeMesh
            key={typeId}
            type={foliageType}
            instances={typeInstances}
          />
        );
      })}
    </group>
  );
}

function TerrainMesh({
  heightmap,
  resolution,
  width,
  height,
  maxHeight,
  layers,
  splatWeights,
  splatLayerCount = 0,
  onBrushStroke,
  brushSize,
  brushActive,
}: TerrainMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const brushIndicatorRef = useRef<THREE.Mesh>(null);
  const [brushPosition, setBrushPosition] = useState<THREE.Vector3 | null>(null);
  const brushColor = useMemo(() => resolveCssVarColor('--aethel-success', 'rgb(34, 197, 94)'), []);

  // Generate geometry from heightmap + optional splat vertex colors (durable authority)
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(width, height, resolution - 1, resolution - 1);
    geo.rotateX(-Math.PI / 2);

    const positions = geo.attributes.position.array as Float32Array;

    for (let i = 0; i < heightmap.length; i++) {
      positions[i * 3 + 1] = heightmap[i]! * maxHeight;
    }

    geo.computeVertexNormals();
    geo.attributes.position.needsUpdate = true;

    if (splatWeights && splatLayerCount > 0 && splatWeights.length >= heightmap.length * splatLayerCount) {
      const colors = new Float32Array(heightmap.length * 3);
      const layerRgbs = layers.map((l) => parseLayerRgb(l.color));
      for (let i = 0; i < heightmap.length; i++) {
        let r = 0;
        let g = 0;
        let b = 0;
        const base = i * splatLayerCount;
        for (let c = 0; c < splatLayerCount; c++) {
          const w = splatWeights[base + c] ?? 0;
          const rgb = layerRgbs[c] ?? layerRgbs[0] ?? [0.29, 0.49, 0.31];
          r += rgb[0] * w;
          g += rgb[1] * w;
          b += rgb[2] * w;
        }
        colors[i * 3] = r;
        colors[i * 3 + 1] = g;
        colors[i * 3 + 2] = b;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }

    return geo;
  }, [heightmap, resolution, width, height, maxHeight, splatWeights, splatLayerCount, layers]);

  const material = useMemo(() => {
    const useVertexColors = Boolean(splatWeights && splatLayerCount > 0);
    return new THREE.MeshStandardMaterial({
      color: useVertexColors ? 'rgb(255, 255, 255)' : (layers[0]?.color || 'rgb(74, 124, 79)'),
      vertexColors: useVertexColors,
      roughness: 0.8,
      metalness: 0.0,
      flatShading: false,
      wireframe: false,
    });
  }, [layers, splatWeights, splatLayerCount]);

  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.point) {
      setBrushPosition(e.point.clone());
    }
  }, []);

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (brushActive && e.point) {
      onBrushStroke(e.point.clone());
    }
  }, [brushActive, onBrushStroke]);

  useFrame(() => {
    if (brushIndicatorRef.current && brushPosition) {
      brushIndicatorRef.current.position.copy(brushPosition);
      brushIndicatorRef.current.position.y += 0.1;
    }
  });

  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        receiveShadow
        castShadow
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
      />

      {brushPosition && brushActive && (
        <mesh ref={brushIndicatorRef} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[brushSize * 0.95, brushSize, 32]} />
          <meshBasicMaterial color={brushColor} transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

interface LandscapeSceneProps {
  heightmap: Float32Array;
  config: TerrainConfig;
  brushSettings: BrushSettings;
  brushActive: boolean;
  /** Onda A.1 deepen — parent persists via heightfield authority */
  onBrushStroke: (point: THREE.Vector3) => void;
  brushBusy?: boolean;
  /** Letter be — durable splat weights for layer paint preview */
  splatWeights?: Float32Array | null;
  splatLayerCount?: number;
  /** Letter bf — durable foliage instances for InstancedMesh viewport */
  foliageInstances?: FoliageInstanceRecord[];
}

export function LandscapeScene({
  heightmap,
  config,
  brushSettings,
  brushActive,
  onBrushStroke,
  brushBusy = false,
  splatWeights = null,
  splatLayerCount = 0,
  foliageInstances = [],
}: LandscapeSceneProps) {
  const skyColor = useMemo(() => resolveCssVarColor('--aethel-info-light', 'rgb(135, 206, 235)'), []);
  const groundColor = useMemo(() => resolveCssVarColor('--aethel-success-dark', 'rgb(85, 107, 47)'), []);
  const gridCellColor = useMemo(() => resolveCssVarColor('--aethel-border-primary', 'rgb(51, 51, 51)'), []);
  const gridSectionColor = useMemo(() => resolveCssVarColor('--aethel-border-secondary', 'rgb(85, 85, 85)'), []);
  const gizmoAxisColors = useMemo(
    () => [
      resolveCssVarColor('--aethel-error', 'rgb(231, 76, 60)'),
      resolveCssVarColor('--aethel-success', 'rgb(34, 197, 94)'),
      resolveCssVarColor('--aethel-info', 'rgb(6, 182, 212)'),
    ] as [string, string, string],
    []
  );
  const gizmoLabelColor = useMemo(() => resolveCssVarColor('--aethel-text-primary', 'rgb(255, 255, 255)'), []);

  const handleBrushStroke = useCallback((point: THREE.Vector3) => {
    if (brushBusy) return;
    onBrushStroke(point);
  }, [brushBusy, onBrushStroke]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[50, 100, 50]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={200}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />
      <hemisphereLight args={[skyColor, groundColor, 0.3]} />

      <color attach="background" args={[skyColor]} />

      <TerrainMesh
        heightmap={heightmap}
        resolution={config.resolution}
        width={config.width}
        height={config.height}
        maxHeight={config.maxHeight}
        layers={config.layers}
        splatWeights={splatWeights}
        splatLayerCount={splatLayerCount}
        onBrushStroke={handleBrushStroke}
        brushSize={brushSettings.size}
        brushActive={brushActive && !brushBusy}
      />

      <LandscapeFoliageInstances3D
        instances={foliageInstances}
        types={config.foliage}
      />

      <Grid
        position={[0, -0.01, 0]}
        args={[config.width, config.height]}
        cellSize={10}
        cellThickness={0.5}
        cellColor={gridCellColor}
        sectionSize={50}
        sectionThickness={1}
        sectionColor={gridSectionColor}
        fadeDistance={300}
        fadeStrength={1}
        followCamera={false}
      />

      <OrbitControls
        makeDefault
        minDistance={10}
        maxDistance={500}
        maxPolarAngle={Math.PI * 0.45}
      />

      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport axisColors={gizmoAxisColors} labelColor={gizmoLabelColor} />
      </GizmoHelper>
    </>
  );
}
