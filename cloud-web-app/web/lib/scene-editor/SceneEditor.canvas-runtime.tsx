"use client";

// @aethel-heavy-async-boundary: Three.js scene editor runtime stays inside the scene studio chunk.

import { Suspense, useCallback, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Grid,
  GizmoHelper,
  GizmoViewport,
  Html as DreiHtml,
  OrbitControls,
  PivotControls,
  useHelper,
} from "@react-three/drei";
import * as THREE from "three";
import { GameSimulation } from "@/lib/scene-editor/GameSimulation.runtime";
import { AAAPostProcessing } from "@/components/scene-editor/AAAPostProcessing";
import {
  DEFAULT_SNAP_SETTINGS,
  snapPosition,
  snapRotation,
  snapScale,
} from "@/components/scene-editor/scene-editor-models";
import type {
  PrimitiveGeometryType,
  SceneObject,
  SnapSettings,
  TransformMode,
} from "@/components/scene-editor/scene-editor-models";

const PRIMITIVE_GEOMETRIES: Record<PrimitiveGeometryType, () => THREE.BufferGeometry> = {
  box: () => new THREE.BoxGeometry(1, 1, 1),
  sphere: () => new THREE.SphereGeometry(0.5, 32, 32),
  cylinder: () => new THREE.CylinderGeometry(0.5, 0.5, 1, 32),
  cone: () => new THREE.ConeGeometry(0.5, 1, 32),
  torus: () => new THREE.TorusGeometry(0.5, 0.2, 16, 32),
  plane: () => new THREE.PlaneGeometry(1, 1),
  capsule: () => new THREE.CapsuleGeometry(0.25, 0.5, 8, 16),
};

interface SceneObjectMeshProps {
  object: SceneObject;
  isSelected: boolean;
  onSelect: () => void;
  transformMode: TransformMode;
  onTransformChange: (
    position: [number, number, number],
    rotation: [number, number, number],
    scale: [number, number, number],
  ) => void;
  snapSettings?: SnapSettings;
}

function SceneObjectMesh({
  object,
  isSelected,
  onSelect,
  transformMode,
  onTransformChange,
  snapSettings = DEFAULT_SNAP_SETTINGS,
}: SceneObjectMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const geometry =
    PRIMITIVE_GEOMETRIES[
      object.properties.geometry as PrimitiveGeometryType
    ]?.() || new THREE.BoxGeometry(1, 1, 1);
  const materialColor = (object.properties.color as number) || 0x4a90d9;

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(...object.position);
      groupRef.current.rotation.set(...object.rotation);
      groupRef.current.scale.set(...object.scale);
    }
  }, [object.position, object.rotation, object.scale]);

  const handleTransformWithSnap = useCallback(
    (
      pos: [number, number, number],
      rot: [number, number, number],
      scl: [number, number, number],
    ) => {
      if (snapSettings.enabled) {
        onTransformChange(
          snapPosition(pos, snapSettings.gridSize),
          snapRotation(rot, snapSettings.rotationSnap),
          snapScale(scl, snapSettings.scaleSnap),
        );
        return;
      }

      onTransformChange(pos, rot, scl);
    },
    [snapSettings, onTransformChange],
  );

  return (
    <group ref={groupRef} name={object.id}>
      {isSelected ? (
        <PivotControls
          scale={0.75}
          activeAxes={[true, true, true]}
          depthTest={false}
          onDrag={(matrix: THREE.Matrix4) => {
            const position = new THREE.Vector3();
            const quaternion = new THREE.Quaternion();
            const scale = new THREE.Vector3();
            matrix.decompose(position, quaternion, scale);
            const euler = new THREE.Euler().setFromQuaternion(quaternion);
            handleTransformWithSnap(
              [position.x, position.y, position.z],
              [euler.x, euler.y, euler.z],
              [scale.x, scale.y, scale.z],
            );
          }}
        >
          <mesh ref={meshRef} onClick={onSelect}>
            <primitive object={geometry} attach="geometry" />
            <meshStandardMaterial color={materialColor} />
          </mesh>
        </PivotControls>
      ) : (
        <mesh
          ref={meshRef}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          <primitive object={geometry} attach="geometry" />
          <meshStandardMaterial color={materialColor} />
        </mesh>
      )}

      {isSelected && meshRef.current && (
        <lineSegments>
          <edgesGeometry args={[geometry]} />
          <lineBasicMaterial color={0xffff00} linewidth={2} />
        </lineSegments>
      )}

      {object.children.map((child) => (
        <SceneObjectMesh
          key={child.id}
          object={child}
          isSelected={false}
          onSelect={() => {}}
          transformMode={transformMode}
          onTransformChange={() => {}}
        />
      ))}
    </group>
  );
}

interface LightObjectProps {
  object: SceneObject;
  isSelected: boolean;
  onSelect: () => void;
}

function LightObject({ object, isSelected, onSelect }: LightObjectProps) {
  const lightRef = useRef<THREE.Light>(null);
  const lightType = (object.properties.lightType as string) || "point";
  const color = (object.properties.color as number) || 0xffffff;
  const intensity = (object.properties.intensity as number) || 1;

  useHelper(
    isSelected ? (lightRef as React.MutableRefObject<THREE.Light>) : null,
    THREE.PointLightHelper,
    0.5,
    color,
  );

  const angle = (object.properties.angle as number) || 0.5;
  const penumbra = (object.properties.penumbra as number) || 0.5;
  const distance = (object.properties.distance as number) || 0;
  const decay = (object.properties.decay as number) || 2;
  const width = (object.properties.width as number) || 1;
  const height = (object.properties.height as number) || 1;

  return (
    <group position={object.position} rotation={object.rotation}>
      {lightType === "point" && (
        <pointLight
          ref={lightRef as React.MutableRefObject<THREE.PointLight>}
          color={color}
          intensity={intensity}
          distance={distance}
          decay={decay}
          castShadow
        />
      )}
      {lightType === "directional" && (
        <directionalLight
          ref={lightRef as React.MutableRefObject<THREE.DirectionalLight>}
          color={color}
          intensity={intensity}
          castShadow
        />
      )}
      {lightType === "spot" && (
        <spotLight
          ref={lightRef as React.MutableRefObject<THREE.SpotLight>}
          color={color}
          intensity={intensity}
          castShadow
          angle={angle}
          penumbra={penumbra}
          distance={distance}
          decay={decay}
        />
      )}
      {lightType === "hemisphere" && (
        <hemisphereLight
          color={color}
          groundColor={(object.properties.groundColor as number) || 0x444444}
          intensity={intensity}
        />
      )}
      {lightType === "rect" && (
        <rectAreaLight
          color={color}
          intensity={intensity}
          width={width}
          height={height}
        />
      )}
      <mesh onClick={onSelect}>
        {lightType === "point" && <sphereGeometry args={[0.15, 16, 16]} />}
        {lightType === "spot" && <coneGeometry args={[0.15, 0.3, 16]} />}
        {lightType === "directional" && (
          <cylinderGeometry args={[0.05, 0.15, 0.3, 8]} />
        )}
        {lightType === "hemisphere" && <sphereGeometry args={[0.15, 16, 8]} />}
        {lightType === "rect" && (
          <boxGeometry args={[width * 0.3, height * 0.3, 0.05]} />
        )}
        <meshBasicMaterial
          color={isSelected ? 0xffff00 : color}
          transparent
          opacity={0.9}
        />
      </mesh>
      {(lightType === "spot" || lightType === "directional") && (
        <arrowHelper
          args={[
            new THREE.Vector3(0, -1, 0),
            new THREE.Vector3(0, 0, 0),
            0.5,
            isSelected ? 0xffff00 : color,
          ]}
        />
      )}
      {isSelected && (
        <DreiHtml position={[0, 0.4, 0]}>
          <div
            style={{
              background: "var(--aethel-anim-overlay)",
              color: "var(--aethel-text-primary)",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "11px",
              whiteSpace: "nowrap",
              border: "1px solid var(--aethel-border-primary)",
            }}
          >
            Light: {object.name} ({lightType})
          </div>
        </DreiHtml>
      )}
    </group>
  );
}

interface CameraObjectProps {
  object: SceneObject;
  isSelected: boolean;
  onSelect: () => void;
}

function CameraObject({ object, isSelected, onSelect }: CameraObjectProps) {
  return (
    <group position={object.position} rotation={object.rotation}>
      <mesh onClick={onSelect}>
        <coneGeometry args={[0.3, 0.5, 4]} />
        <meshBasicMaterial
          color={isSelected ? 0xffff00 : 0x4a90d9}
          wireframe
        />
      </mesh>
      {isSelected && (
        <DreiHtml position={[0, 0.5, 0]}>
          <div
            style={{
              background: "var(--aethel-video-black-70)",
              color: "var(--aethel-text-primary)",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "12px",
              whiteSpace: "nowrap",
            }}
          >
            Camera: {object.name}
          </div>
        </DreiHtml>
      )}
    </group>
  );
}

interface SceneCanvasProps {
  objects: SceneObject[];
  selectedId: string | null;
  transformMode: TransformMode;
  onSelect: (id: string | null) => void;
  onTransformChange: (
    id: string,
    position: [number, number, number],
    rotation: [number, number, number],
    scale: [number, number, number],
  ) => void;
  showGrid: boolean;
  isPlaying?: boolean;
}

function SceneCanvas({
  objects,
  selectedId,
  transformMode,
  onSelect,
  onTransformChange,
  showGrid,
  isPlaying = false,
}: SceneCanvasProps) {
  const handlePointerMissed = useCallback(() => {
    onSelect(null);
  }, [onSelect]);

  return (
    <>
      {isPlaying && <GameSimulation objects={objects} />}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} castShadow />
      {showGrid && (
        <Grid
          position={[0, 0, 0]}
          args={[20, 20]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="var(--aethel-border-primary)"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="var(--aethel-text-quaternary)"
          fadeDistance={50}
          infiniteGrid
        />
      )}
      <group onPointerMissed={handlePointerMissed}>
        {objects.map((obj) => {
          if (obj.type === "mesh") {
            return (
              <SceneObjectMesh
                key={obj.id}
                object={obj}
                isSelected={obj.id === selectedId}
                onSelect={() => onSelect(obj.id)}
                transformMode={transformMode}
                onTransformChange={(pos, rot, scale) =>
                  onTransformChange(obj.id, pos, rot, scale)
                }
              />
            );
          }
          if (obj.type === "light") {
            return (
              <LightObject
                key={obj.id}
                object={obj}
                isSelected={obj.id === selectedId}
                onSelect={() => onSelect(obj.id)}
              />
            );
          }
          if (obj.type === "camera") {
            return (
              <CameraObject
                key={obj.id}
                object={obj}
                isSelected={obj.id === selectedId}
                onSelect={() => onSelect(obj.id)}
              />
            );
          }
          return null;
        })}
      </group>
      <OrbitControls makeDefault enableDamping dampingFactor={0.1} />
      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport
          axisColors={["red", "lime", "blue"]}
          labelColor="white"
        />
      </GizmoHelper>
      <color attach="background" args={[0x0b1220]} />
      <fog attach="fog" args={[0x0b1220, 16, 48]} />
      <AAAPostProcessing />
    </>
  );
}

interface SceneViewportCanvasProps extends SceneCanvasProps {}

export function SceneViewportCanvas(props: SceneViewportCanvasProps) {
  return (
    <Canvas shadows camera={{ position: [5, 5, 5], fov: 50 }}>
      <Suspense fallback={null}>
        <SceneCanvas {...props} />
      </Suspense>
    </Canvas>
  );
}
