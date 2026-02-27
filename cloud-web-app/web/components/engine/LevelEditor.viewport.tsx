'use client';

import React, { useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  ContactShadows,
  GizmoHelper,
  GizmoViewport,
  Grid,
  OrbitControls,
  Sky,
  Stats,
  TransformControls,
} from '@react-three/drei';
import * as THREE from 'three';
import type {
  EnvironmentSettings,
  LevelObject,
  TransformMode,
  ViewportMode,
} from './LevelEditor.types';

interface SceneObjectProps {
  object: LevelObject;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function SceneObject({
  object,
  isSelected,
  onSelect,
}: SceneObjectProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  if (!object.visible) return null;

  const renderMesh = () => {
    const meshComp = object.components.find((c) => c.type === 'StaticMesh');
    const meshType = (meshComp?.properties?.mesh as string) || 'Cube';
    const color = isSelected ? '#ffaa00' : '#888888';

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
        onClick={(e) => {
          e.stopPropagation();
          onSelect(object.id);
        }}
        castShadow={object.properties.castShadow as boolean}
        receiveShadow={object.properties.receiveShadow as boolean}
      >
        <meshStandardMaterial color={color} wireframe={isSelected} />
      </mesh>
    );
  };

  const renderLight = () => {
    const lightComp = object.components.find(
      (c) =>
        c.type === 'DirectionalLight' ||
        c.type === 'PointLight' ||
        c.type === 'SpotLight',
    );
    if (!lightComp) return null;

    const color = (lightComp.properties.color as string) || '#ffffff';
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
              <mesh
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(object.id);
                }}
              >
                <sphereGeometry args={[0.3, 16, 16]} />
                <meshBasicMaterial color="#ffff00" wireframe />
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
              <mesh
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(object.id);
                }}
              >
                <sphereGeometry args={[0.3, 16, 16]} />
                <meshBasicMaterial color="#ffaa00" wireframe />
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
              <mesh
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(object.id);
                }}
              >
                <coneGeometry args={[0.3, 0.5, 16]} />
                <meshBasicMaterial color="#ff8800" wireframe />
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
        <mesh
          onClick={(e) => {
            e.stopPropagation();
            onSelect(object.id);
          }}
        >
          <boxGeometry args={[0.4, 0.3, 0.3]} />
          <meshBasicMaterial
            color={isSelected ? '#00ff00' : '#666666'}
            wireframe
          />
        </mesh>
        <mesh position={[0, 0, 0.25]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.15, 0.2, 16]} />
          <meshBasicMaterial
            color={isSelected ? '#00ff00' : '#444444'}
            wireframe
          />
        </mesh>
      </group>
    );
  };

  const renderEmpty = () => {
    return (
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect(object.id);
        }}
      >
        <octahedronGeometry args={[0.2]} />
        <meshBasicMaterial
          color={isSelected ? '#ffffff' : '#888888'}
          wireframe
        />
      </mesh>
    );
  };

  return (
    <group
      ref={groupRef}
      position={object.position}
      rotation={object.rotation.map((r) => (r * Math.PI) / 180) as [number, number, number]}
      scale={object.scale}
    >
      {object.type === 'mesh' && renderMesh()}
      {object.type === 'light' && renderLight()}
      {object.type === 'camera' && renderCamera()}
      {object.type === 'empty' && renderEmpty()}
    </group>
  );
}

export interface LevelEditorViewportProps {
  objects: LevelObject[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  transformMode: TransformMode;
  onTransform: (
    id: string,
    position: [number, number, number],
    rotation: [number, number, number],
    scale: [number, number, number],
  ) => void;
  viewMode: ViewportMode;
  showGrid: boolean;
  showStats: boolean;
  environment: EnvironmentSettings;
}

export function LevelEditorViewport({
  objects,
  selectedId,
  onSelect,
  transformMode,
  onTransform,
  viewMode,
  showGrid,
  showStats,
  environment,
}: LevelEditorViewportProps) {
  const cameraPosition = useMemo(() => {
    switch (viewMode) {
      case 'top':
        return [0, 20, 0] as [number, number, number];
      case 'front':
        return [0, 5, 20] as [number, number, number];
      case 'right':
        return [20, 5, 0] as [number, number, number];
      default:
        return [10, 8, 10] as [number, number, number];
    }
  }, [viewMode]);

  const selectedObject = objects.find((o) => o.id === selectedId);

  return (
    <Canvas
      shadows
      camera={{ position: cameraPosition, fov: 60 }}
      onPointerMissed={() => onSelect(null)}
    >
      <color attach="background" args={['#1a1a1a']} />
      <ambientLight intensity={environment.ambientIntensity} />
      {environment.skyType === 'procedural' && <Sky sunPosition={[100, 20, 100]} />}
      {environment.skyType === 'solid' && (
        <color attach="background" args={[environment.skyColor]} />
      )}
      {environment.fogEnabled && <fog attach="fog" args={[environment.fogColor, 10, 100]} />}

      <ContactShadows
        position={[0, -0.049, 0]}
        opacity={0.5}
        scale={20}
        blur={1}
        far={10}
        resolution={256}
      />

      {showGrid && (
        <Grid
          position={[0, 0, 0]}
          args={[100, 100]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#333333"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#555555"
          fadeDistance={100}
          infiniteGrid
        />
      )}

      {objects.map((obj) => (
        <SceneObject
          key={obj.id}
          object={obj}
          isSelected={selectedId === obj.id}
          onSelect={(id) => onSelect(id)}
        />
      ))}

      {selectedObject && !selectedObject.locked && (
        <TransformControls
          object={undefined}
          mode={transformMode}
          position={selectedObject.position}
          onObjectChange={(e) => {
            if (!e) return;
            const target = e.target as THREE.Object3D;
            onTransform(
              selectedObject.id,
              [target.position.x, target.position.y, target.position.z],
              [
                (target.rotation.x * 180) / Math.PI,
                (target.rotation.y * 180) / Math.PI,
                (target.rotation.z * 180) / Math.PI,
              ],
              [target.scale.x, target.scale.y, target.scale.z],
            );
          }}
        />
      )}

      <OrbitControls makeDefault enableDamping dampingFactor={0.1} />

      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport />
      </GizmoHelper>

      {showStats && <Stats />}
    </Canvas>
  );
}
