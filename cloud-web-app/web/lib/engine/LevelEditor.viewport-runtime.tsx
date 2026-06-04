'use client';

// @aethel-heavy-async-boundary: level viewport runtime stays behind the /studio/level dynamic editor.

import { Canvas } from '@react-three/fiber';
import {
  OrbitControls,
  TransformControls,
  GizmoHelper,
  GizmoViewport,
  Grid,
  Stats,
  ContactShadows,
  Sky,
} from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { resolveCssVarColor } from '@/lib/style/resolve-css-var';
import type {
  EnvironmentSettings,
  LevelObject,
  TransformMode,
  ViewportMode,
} from '@/components/engine/level-editor-core';

// ============================================================================
// 3D SCENE OBJECTS
// ============================================================================

interface SceneObjectProps {
  object: LevelObject;
  isSelected: boolean;
  onSelect: (id: string) => void;
  transformMode: TransformMode;
  onTransform: (id: string, position: [number, number, number], rotation: [number, number, number], scale: [number, number, number]) => void;
}

function SceneObject({ object, isSelected, onSelect, transformMode, onTransform }: SceneObjectProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const selectionColor = useMemo(() => resolveCssVarColor('--aethel-warning', 'rgb(255, 170, 0)'), []);
  const neutralColor = useMemo(() => resolveCssVarColor('--aethel-text-quaternary', 'rgb(136, 136, 136)'), []);
  const lightHelperColor = useMemo(() => resolveCssVarColor('--aethel-warning', 'rgb(255, 170, 0)'), []);
  const lightHelperBright = useMemo(() => resolveCssVarColor('--aethel-warning-light', 'rgb(255, 204, 102)'), []);
  const cameraSelectedColor = useMemo(() => resolveCssVarColor('--aethel-success', 'rgb(34, 197, 94)'), []);
  const cameraNeutralColor = useMemo(() => resolveCssVarColor('--aethel-text-muted', 'rgb(102, 102, 102)'), []);
  const cameraNeutralAltColor = useMemo(() => resolveCssVarColor('--aethel-text-quaternary', 'rgb(68, 68, 68)'), []);
  const emptySelectedColor = useMemo(() => resolveCssVarColor('--aethel-text-primary', 'rgb(255, 255, 255)'), []);
  const lightFallbackColor = useMemo(() => resolveCssVarColor('--aethel-text-primary', 'rgb(255, 255, 255)'), []);

  if (!object.visible) return null;

  const renderMesh = () => {
    const meshComp = object.components.find(c => c.type === 'StaticMesh');
    const meshType = (meshComp?.properties?.mesh as string) || 'Cube';
    const color = isSelected ? selectionColor : neutralColor;

    let geometry: THREE.BufferGeometry;
    switch (meshType) {
      case 'Sphere':
        geometry = new THREE.SphereGeometry(0.5, 32, 32);
        break;
      case 'Cylinder':
        geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
        break;
      case 'Cone':
        geometry = new THREE.ConeGeometry(0.5, 1, 32);
        break;
      case 'Torus':
        geometry = new THREE.TorusGeometry(0.5, 0.2, 16, 32);
        break;
      case 'Plane':
        geometry = new THREE.PlaneGeometry(1, 1);
        break;
      default:
        geometry = new THREE.BoxGeometry(1, 1, 1);
    }

    return (
      <mesh
        ref={meshRef}
        geometry={geometry}
        onClick={(e) => { e.stopPropagation(); onSelect(object.id); }}
        castShadow={object.properties.castShadow as boolean}
        receiveShadow={object.properties.receiveShadow as boolean}
      >
        <meshStandardMaterial color={color} wireframe={isSelected} />
      </mesh>
    );
  };

  const renderLight = () => {
    const lightComp = object.components.find(c => c.type === 'DirectionalLight' || c.type === 'PointLight' || c.type === 'SpotLight');
    if (!lightComp) return null;

    const color = (lightComp.properties.color as string) || lightFallbackColor;
    const intensity = (lightComp.properties.intensity as number) || 1;

    switch (lightComp.type) {
      case 'DirectionalLight':
        return (
          <>
            <directionalLight
              color={color}
              intensity={intensity}
              castShadow
              shadow-mapSize={[2048, 2048]}
            />
            {isSelected && (
              <mesh onClick={(e) => { e.stopPropagation(); onSelect(object.id); }}>
                <sphereGeometry args={[0.3, 16, 16]} />
                <meshBasicMaterial color={lightHelperBright} wireframe />
              </mesh>
            )}
          </>
        );
      case 'PointLight':
        return (
          <>
            <pointLight
              color={color}
              intensity={intensity}
              distance={(lightComp.properties.range as number) || 10}
              castShadow
            />
            {isSelected && (
              <mesh onClick={(e) => { e.stopPropagation(); onSelect(object.id); }}>
                <sphereGeometry args={[0.3, 16, 16]} />
                <meshBasicMaterial color={lightHelperColor} wireframe />
              </mesh>
            )}
          </>
        );
      case 'SpotLight':
        return (
          <>
            <spotLight
              color={color}
              intensity={intensity}
              angle={(lightComp.properties.angle as number) || 0.5}
              distance={(lightComp.properties.range as number) || 10}
              castShadow
            />
            {isSelected && (
              <mesh onClick={(e) => { e.stopPropagation(); onSelect(object.id); }}>
                <coneGeometry args={[0.3, 0.5, 16]} />
                <meshBasicMaterial color={lightHelperColor} wireframe />
              </mesh>
            )}
          </>
        );
      default:
        return null;
    }
  };

  const renderCamera = () => {
    return (
      <group>
        {/* Camera icon */}
        <mesh onClick={(e) => { e.stopPropagation(); onSelect(object.id); }}>
          <boxGeometry args={[0.4, 0.3, 0.3]} />
          <meshBasicMaterial color={isSelected ? cameraSelectedColor : cameraNeutralColor} wireframe />
        </mesh>
        {/* Lens */}
        <mesh position={[0, 0, 0.25]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.15, 0.2, 16]} />
          <meshBasicMaterial color={isSelected ? cameraSelectedColor : cameraNeutralAltColor} wireframe />
        </mesh>
      </group>
    );
  };

  const renderEmpty = () => {
    return (
      <mesh onClick={(e) => { e.stopPropagation(); onSelect(object.id); }}>
        <octahedronGeometry args={[0.2]} />
        <meshBasicMaterial color={isSelected ? emptySelectedColor : neutralColor} wireframe />
      </mesh>
    );
  };

  return (
    <group
      ref={groupRef}
      position={object.position}
      rotation={object.rotation.map(r => r * Math.PI / 180) as [number, number, number]}
      scale={object.scale}
    >
      {object.type === 'mesh' && renderMesh()}
      {object.type === 'light' && renderLight()}
      {object.type === 'camera' && renderCamera()}
      {object.type === 'empty' && renderEmpty()}
    </group>
  );
}

// ============================================================================
// VIEWPORT COMPONENT
// ============================================================================

interface ViewportProps {
  objects: LevelObject[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  transformMode: TransformMode;
  onTransform: (id: string, position: [number, number, number], rotation: [number, number, number], scale: [number, number, number]) => void;
  viewMode: ViewportMode;
  showGrid: boolean;
  showStats: boolean;
  environment: EnvironmentSettings;
}

export function LevelViewport({ objects, selectedId, onSelect, transformMode, onTransform, viewMode, showGrid, showStats, environment }: ViewportProps) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const sceneBackground = useMemo(() => resolveCssVarColor('--aethel-surface-primary', 'rgb(26, 26, 26)'), []);
  const gridCellColor = useMemo(() => resolveCssVarColor('--aethel-border-primary', 'rgb(51, 51, 51)'), []);
  const gridSectionColor = useMemo(() => resolveCssVarColor('--aethel-border-secondary', 'rgb(85, 85, 85)'), []);

  // Get camera position based on view mode
  const cameraPosition = useMemo(() => {
    switch (viewMode) {
      case 'top': return [0, 20, 0] as [number, number, number];
      case 'front': return [0, 5, 20] as [number, number, number];
      case 'right': return [20, 5, 0] as [number, number, number];
      default: return [10, 8, 10] as [number, number, number];
    }
  }, [viewMode]);

  const selectedObject = objects.find(o => o.id === selectedId);

  return (
    <Canvas
      shadows
      camera={{ position: cameraPosition, fov: 60 }}
      onPointerMissed={() => onSelect(null)}
    >
      <color attach="background" args={[sceneBackground]} />

      {/* Ambient Light */}
      <ambientLight intensity={environment.ambientIntensity} />

      {/* Sky */}
      {environment.skyType === 'procedural' && <Sky sunPosition={[100, 20, 100]} />}
      {environment.skyType === 'solid' && <color attach="background" args={[environment.skyColor]} />}

      {/* Fog */}
      {environment.fogEnabled && (
        <fog attach="fog" args={[environment.fogColor, 10, 100]} />
      )}

      {/* Contact Shadows */}
      <ContactShadows
        position={[0, -0.049, 0]}
        opacity={0.5}
        scale={20}
        blur={1}
        far={10}
        resolution={256}
      />

      {/* Grid */}
      {showGrid && (
        <Grid
          position={[0, 0, 0]}
          args={[100, 100]}
          cellSize={1}
          cellThickness={0.5}
          cellColor={gridCellColor}
          sectionSize={5}
          sectionThickness={1}
          sectionColor={gridSectionColor}
          fadeDistance={100}
          infiniteGrid
        />
      )}

      {/* Scene Objects */}
      {objects.map((obj) => (
        <SceneObject
          key={obj.id}
          object={obj}
          isSelected={selectedId === obj.id}
          onSelect={onSelect}
          transformMode={transformMode}
          onTransform={onTransform}
        />
      ))}

      {/* Transform Controls for Selected Object */}
      {selectedObject && !selectedObject.locked && (
        <TransformControls
          object={undefined}
          mode={transformMode}
          position={selectedObject.position}
          onObjectChange={(e) => {
            if (e) {
              const target = e.target as THREE.Object3D;
              onTransform(
                selectedObject.id,
                [target.position.x, target.position.y, target.position.z],
                [target.rotation.x * 180 / Math.PI, target.rotation.y * 180 / Math.PI, target.rotation.z * 180 / Math.PI],
                [target.scale.x, target.scale.y, target.scale.z]
              );
            }
          }}
        />
      )}

      {/* Controls */}
      <OrbitControls makeDefault enableDamping dampingFactor={0.1} />

      {/* Gizmo */}
      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport />
      </GizmoHelper>

      {/* Stats */}
      {showStats && <Stats />}
    </Canvas>
  );
}
