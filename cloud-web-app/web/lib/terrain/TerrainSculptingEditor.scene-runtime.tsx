import { tokenColor } from "@/lib/design-system/DesignTokenSync"
"use client";

// @aethel-heavy-async-boundary: Three.js terrain runtime loaded through TerrainSculptingEditor only.

import { useCallback, useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import {
  Environment,
  GizmoHelper,
  GizmoViewport,
  Grid,
  OrbitControls,
} from "@react-three/drei";
import * as THREE from "three";
import { resolveCssVarColor } from "@/lib/style/resolve-css-var";
import type {
  BrushSettings,
  TerrainData,
  TerrainLayer,
  TerrainSettings,
  TerrainToolType,
} from "@/components/terrain/terrain-sculpting-models";

interface BrushPreviewProps {
  position: THREE.Vector3 | null;
  settings: BrushSettings;
  color: string;
}

function BrushPreview({ position, settings, color }: BrushPreviewProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current && position) {
      meshRef.current.position.copy(position);
      meshRef.current.position.y += 0.1;
    }
  });

  if (!position) return null;

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, THREE.MathUtils.degToRad(settings.rotation)]}
    >
      {settings.shape === "circle" ? (
        <ringGeometry args={[settings.size * 0.95, settings.size, 64]} />
      ) : (
        <planeGeometry args={[settings.size * 2, settings.size * 2]} />
      )}
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.5}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

interface TerrainMeshProps {
  data: TerrainData;
  settings: TerrainSettings;
  onBrushStart: (position: THREE.Vector3, uv: THREE.Vector2) => void;
  onBrushMove: (position: THREE.Vector3, uv: THREE.Vector2) => void;
  onBrushEnd: () => void;
  setBrushPosition: (pos: THREE.Vector3 | null) => void;
}

function TerrainMesh({
  data,
  settings,
  onBrushStart,
  onBrushMove,
  onBrushEnd,
  setBrushPosition,
}: TerrainMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [isPainting, setIsPainting] = useState(false);
  const terrainColor = useMemo(
    () => resolveCssVarColor("--aethel-terrain-mesh", tokenColor("--aethel-terrain-mesh")),
    [],
  );

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(
      settings.size.x,
      settings.size.y,
      data.resolution - 1,
      data.resolution - 1,
    );
    geo.rotateX(-Math.PI / 2);

    const positions = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i += 1) {
      const height = data.heightmap[i] * settings.maxHeight;
      positions.setY(i, height);
    }

    positions.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [data.heightmap, data.resolution, settings]);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: terrainColor,
        roughness: 0.8,
        metalness: 0.1,
        wireframe: false,
      }),
    [terrainColor],
  );

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (e.point && e.uv) {
        setIsPainting(true);
        onBrushStart(e.point, e.uv);
      }
    },
    [onBrushStart],
  );

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (e.point) {
        setBrushPosition(e.point.clone());
        if (isPainting && e.uv) {
          onBrushMove(e.point, e.uv);
        }
      }
    },
    [isPainting, onBrushMove, setBrushPosition],
  );

  const handlePointerUp = useCallback(() => {
    setIsPainting(false);
    onBrushEnd();
  }, [onBrushEnd]);

  const handlePointerLeave = useCallback(() => {
    setBrushPosition(null);
    if (isPainting) {
      setIsPainting(false);
      onBrushEnd();
    }
  }, [isPainting, onBrushEnd, setBrushPosition]);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      onPointerDown={handlePointerDown as never}
      onPointerMove={handlePointerMove as never}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      castShadow={settings.castShadows}
      receiveShadow={settings.receiveShadows}
    />
  );
}

interface ViewportSceneProps {
  terrainData: TerrainData;
  terrainSettings: TerrainSettings;
  layers: TerrainLayer[];
  selectedTool: TerrainToolType;
  brushSettings: BrushSettings;
  onApplyBrush: (x: number, z: number) => void;
}

export function ViewportScene({
  terrainData,
  terrainSettings,
  selectedTool,
  brushSettings,
  onApplyBrush,
}: ViewportSceneProps) {
  const [brushPosition, setBrushPosition] = useState<THREE.Vector3 | null>(
    null,
  );
  const gridCellColor = useMemo(
    () => resolveCssVarColor("--aethel-border-primary", tokenColor("--aethel-border-primary")),
    [],
  );
  const gridSectionColor = useMemo(
    () => resolveCssVarColor("--aethel-border-secondary", tokenColor("--aethel-border-secondary")),
    [],
  );
  const brushPalette = useMemo(
    () => ({
      success: resolveCssVarColor("--aethel-success", tokenColor("--aethel-success")),
      error: resolveCssVarColor("--aethel-error", tokenColor("--aethel-error")),
      primary: resolveCssVarColor("--aethel-primary", tokenColor("--aethel-primary")),
      warning: resolveCssVarColor("--aethel-warning", tokenColor("--aethel-warning")),
      muted: resolveCssVarColor(
        "--aethel-text-quaternary",
        tokenColor("--aethel-text-muted"),
      ),
    }),
    [],
  );

  const getBrushColor = () => {
    if (selectedTool.startsWith("sculpt_raise")) return brushPalette.success;
    if (selectedTool.startsWith("sculpt_lower")) return brushPalette.error;
    if (selectedTool.startsWith("sculpt_smooth")) return brushPalette.primary;
    if (selectedTool.startsWith("paint")) return brushPalette.warning;
    if (selectedTool.startsWith("foliage")) return brushPalette.success;
    return brushPalette.muted;
  };

  const handleBrushStart = useCallback(
    (position: THREE.Vector3, _uv: THREE.Vector2) => {
      onApplyBrush(position.x, position.z);
    },
    [onApplyBrush],
  );

  const handleBrushMove = useCallback(
    (position: THREE.Vector3, _uv: THREE.Vector2) => {
      onApplyBrush(position.x, position.z);
    },
    [onApplyBrush],
  );

  const handleBrushEnd = useCallback(() => {}, []);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[50, 100, 50]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <Environment preset="sunset" />
      <Grid
        args={[100, 100]}
        position={[0, 0.01, 0]}
        cellSize={1}
        cellThickness={0.5}
        cellColor={gridCellColor}
        sectionSize={10}
        sectionThickness={1}
        sectionColor={gridSectionColor}
        fadeDistance={100}
        fadeStrength={1}
      />
      <TerrainMesh
        data={terrainData}
        settings={terrainSettings}
        onBrushStart={handleBrushStart}
        onBrushMove={handleBrushMove}
        onBrushEnd={handleBrushEnd}
        setBrushPosition={setBrushPosition}
      />
      <BrushPreview
        position={brushPosition}
        settings={brushSettings}
        color={getBrushColor()}
      />
      <OrbitControls
        makeDefault
        enablePan
        enableZoom
        enableRotate
        maxPolarAngle={Math.PI / 2.1}
      />
      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport labelColor="white" />
      </GizmoHelper>
    </>
  );
}
