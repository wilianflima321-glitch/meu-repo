/**
 * 3D Scene Editor - Editor de Cenas 3D
 * 
 * Editor visual para criar e manipular cenas 3D.
 * Integrado com react-three-fiber e o Game Engine Core.
 */

'use client';

import React, { useRef, useState, useCallback, useEffect, Suspense } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import {
  TransformControls,
  OrbitControls,
  Grid,
  GizmoHelper,
  GizmoViewport,
  Environment,
  PivotControls,
  Html,
  useHelper,
} from '@react-three/drei';
import * as THREE from 'three';
import { World, Entity, TransformComponent, MeshComponent, getWorld } from '@/lib/game-engine-core';
import { GameSimulation } from './GameSimulation';
import { HierarchyPanel, PropertiesPanel, Toolbar } from './SceneEditorPanels';

// ============================================================================
// TIPOS
// ============================================================================

export type TransformMode = 'translate' | 'rotate' | 'scale';

export interface SceneObject {
  id: string;
  name: string;
  type: 'mesh' | 'light' | 'camera' | 'empty' | 'prefab';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  children: SceneObject[];
  properties: Record<string, unknown>;
}

export interface SceneEditorProps {
  initialScene?: SceneObject[];
  onChange?: (scene: SceneObject[]) => void;
  onSelect?: (objectId: string | null) => void;
}

// ============================================================================
// GEOMETRIAS DISPONÍVEIS
// ============================================================================

const PRIMITIVE_GEOMETRIES = {
  box: () => new THREE.BoxGeometry(1, 1, 1),
  sphere: () => new THREE.SphereGeometry(0.5, 32, 32),
  cylinder: () => new THREE.CylinderGeometry(0.5, 0.5, 1, 32),
  cone: () => new THREE.ConeGeometry(0.5, 1, 32),
  torus: () => new THREE.TorusGeometry(0.5, 0.2, 16, 32),
  plane: () => new THREE.PlaneGeometry(1, 1),
  capsule: () => new THREE.CapsuleGeometry(0.25, 0.5, 8, 16),
};

// ============================================================================
// SNAP TO GRID UTILITY
// ============================================================================

interface SnapSettings {
  enabled: boolean;
  gridSize: number;
  rotationSnap: number; // em graus
  scaleSnap: number;
}

const DEFAULT_SNAP_SETTINGS: SnapSettings = {
  enabled: true,
  gridSize: 0.5, // Snap a cada 0.5 unidades
  rotationSnap: 15, // Snap a cada 15 graus
  scaleSnap: 0.1, // Snap a cada 0.1
};

function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

function snapPosition(
  position: [number, number, number],
  gridSize: number
): [number, number, number] {
  return [
    snapToGrid(position[0], gridSize),
    snapToGrid(position[1], gridSize),
    snapToGrid(position[2], gridSize),
  ];
}

function snapRotation(
  rotation: [number, number, number],
  snapDegrees: number
): [number, number, number] {
  const snapRad = (snapDegrees * Math.PI) / 180;
  return [
    snapToGrid(rotation[0], snapRad),
    snapToGrid(rotation[1], snapRad),
    snapToGrid(rotation[2], snapRad),
  ];
}

function snapScale(
  scale: [number, number, number],
  snapSize: number
): [number, number, number] {
  return [
    snapToGrid(scale[0], snapSize),
    snapToGrid(scale[1], snapSize),
    snapToGrid(scale[2], snapSize),
  ];
}

// ============================================================================
// SCENE OBJECT COMPONENT
// ============================================================================

interface SceneObjectMeshProps {
  object: SceneObject;
  isSelected: boolean;
  onSelect: () => void;
  transformMode: TransformMode;
  onTransformChange: (position: [number, number, number], rotation: [number, number, number], scale: [number, number, number]) => void;
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
  
  const geometry = PRIMITIVE_GEOMETRIES[object.properties.geometry as keyof typeof PRIMITIVE_GEOMETRIES]?.() 
    || new THREE.BoxGeometry(1, 1, 1);
  
  const materialColor = (object.properties.color as number) || 0x4a90d9;

  // Atualizar transform quando objeto mudar
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(...object.position);
      groupRef.current.rotation.set(...object.rotation);
      groupRef.current.scale.set(...object.scale);
    }
  }, [object.position, object.rotation, object.scale]);

  // Handler com snap aplicado
  const handleTransformWithSnap = useCallback(
    (pos: [number, number, number], rot: [number, number, number], scl: [number, number, number]) => {
      if (snapSettings.enabled) {
        const snappedPos = snapPosition(pos, snapSettings.gridSize);
        const snappedRot = snapRotation(rot, snapSettings.rotationSnap);
        const snappedScl = snapScale(scl, snapSettings.scaleSnap);
        onTransformChange(snappedPos, snappedRot, snappedScl);
      } else {
        onTransformChange(pos, rot, scl);
      }
    },
    [snapSettings, onTransformChange]
  );

  return (
    <group ref={groupRef} name={object.id}>
      {isSelected && (
        <PivotControls
          scale={0.75}
          activeAxes={[true, true, true]}
          depthTest={false}
          onDrag={(matrix) => {
            const position = new THREE.Vector3();
            const quaternion = new THREE.Quaternion();
            const scale = new THREE.Vector3();
            matrix.decompose(position, quaternion, scale);
            
            const euler = new THREE.Euler().setFromQuaternion(quaternion);
            
            // Usar handler com snap
            handleTransformWithSnap(
              [position.x, position.y, position.z],
              [euler.x, euler.y, euler.z],
              [scale.x, scale.y, scale.z]
            );
          }}
        >
          <mesh ref={meshRef} onClick={onSelect}>
            <primitive object={geometry} attach="geometry" />
            <meshStandardMaterial color={materialColor} />
          </mesh>
        </PivotControls>
      )}
      
      {!isSelected && (
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

      {/* Selection outline */}
      {isSelected && meshRef.current && (
        <lineSegments>
          <edgesGeometry args={[geometry]} />
          <lineBasicMaterial color="#ffff00" linewidth={2} />
        </lineSegments>
      )}
      
      {/* Render children */}
      {object.children.map(child => (
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

// ============================================================================
// LIGHT COMPONENT
// ============================================================================

interface LightObjectProps {
  object: SceneObject;
  isSelected: boolean;
  onSelect: () => void;
}

function LightObject({ object, isSelected, onSelect }: LightObjectProps) {
  const lightRef = useRef<THREE.Light>(null);
  const lightType = (object.properties.lightType as string) || 'point';
  const color = (object.properties.color as number) || 0xffffff;
  const intensity = (object.properties.intensity as number) || 1;

  // Helper para visualizar luz selecionada
  useHelper(
    isSelected ? lightRef as React.MutableRefObject<THREE.Light> : null,
    THREE.PointLightHelper,
    0.5,
    color
  );

  // Propriedades adicionais para luzes
  const angle = (object.properties.angle as number) || 0.5;
  const penumbra = (object.properties.penumbra as number) || 0.5;
  const distance = (object.properties.distance as number) || 0;
  const decay = (object.properties.decay as number) || 2;
  const width = (object.properties.width as number) || 1;
  const height = (object.properties.height as number) || 1;

  return (
    <group position={object.position} rotation={object.rotation}>
      {lightType === 'point' && (
        <pointLight
          ref={lightRef as React.MutableRefObject<THREE.PointLight>}
          color={color}
          intensity={intensity}
          distance={distance}
          decay={decay}
          castShadow
        />
      )}
      {lightType === 'directional' && (
        <directionalLight
          ref={lightRef as React.MutableRefObject<THREE.DirectionalLight>}
          color={color}
          intensity={intensity}
          castShadow
        />
      )}
      {lightType === 'spot' && (
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
      {lightType === 'hemisphere' && (
        <hemisphereLight
          color={color}
          groundColor={(object.properties.groundColor as number) || 0x444444}
          intensity={intensity}
        />
      )}
      {lightType === 'rect' && (
        <rectAreaLight
          color={color}
          intensity={intensity}
          width={width}
          height={height}
        />
      )}
      
      {/* Light icon indicator - diferente por tipo */}
      <mesh onClick={onSelect}>
        {lightType === 'point' && <sphereGeometry args={[0.15, 16, 16]} />}
        {lightType === 'spot' && <coneGeometry args={[0.15, 0.3, 16]} />}
        {lightType === 'directional' && <cylinderGeometry args={[0.05, 0.15, 0.3, 8]} />}
        {lightType === 'hemisphere' && <sphereGeometry args={[0.15, 16, 8]} />}
        {lightType === 'rect' && <boxGeometry args={[width * 0.3, height * 0.3, 0.05]} />}
        <meshBasicMaterial 
          color={isSelected ? '#ffff00' : color} 
          transparent 
          opacity={0.9} 
        />
      </mesh>
      
      {/* Light direction indicator for spot/directional */}
      {(lightType === 'spot' || lightType === 'directional') && (
        <arrowHelper args={[
          new THREE.Vector3(0, -1, 0),
          new THREE.Vector3(0, 0, 0),
          0.5,
          isSelected ? 0xffff00 : color
        ]} />
      )}
      
      {/* Selection label */}
      {isSelected && (
        <Html position={[0, 0.4, 0]}>
          <div style={{
            background: 'rgba(0,0,0,0.8)',
            color: '#fff',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            whiteSpace: 'nowrap',
            border: '1px solid #444'
          }}>
            💡 {object.name} ({lightType})
          </div>
        </Html>
      )}
    </group>
  );
}

// ============================================================================
// CAMERA PREVIEW
// ============================================================================

interface CameraObjectProps {
  object: SceneObject;
  isSelected: boolean;
  onSelect: () => void;
}

function CameraObject({ object, isSelected, onSelect }: CameraObjectProps) {
  return (
    <group position={object.position} rotation={object.rotation}>
      {/* Camera frustum visualization */}
      <mesh onClick={onSelect}>
        <coneGeometry args={[0.3, 0.5, 4]} />
        <meshBasicMaterial 
          color={isSelected ? '#ffff00' : '#4a90d9'} 
          wireframe 
        />
      </mesh>
      
      {isSelected && (
        <Html position={[0, 0.5, 0]}>
          <div style={{
            background: 'rgba(0,0,0,0.7)',
            color: '#fff',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap'
          }}>
            📷 {object.name}
          </div>
        </Html>
      )}
    </group>
  );
}

// ============================================================================
// SCENE CANVAS
// ============================================================================

import { AAAPostProcessing } from './AAAPostProcessing';

interface SceneCanvasProps {
  objects: SceneObject[];
  selectedId: string | null;
  transformMode: TransformMode;
  onSelect: (id: string | null) => void;
  onTransformChange: (
    id: string,
    position: [number, number, number],
    rotation: [number, number, number],
    scale: [number, number, number]
  ) => void;
  showGrid: boolean;
  showStats: boolean;
  isPlaying?: boolean;
}

function SceneCanvas({ 
  objects, 
  selectedId, 
  transformMode, 
  onSelect, 
  onTransformChange,
  showGrid,
  showStats,
  isPlaying = false
}: SceneCanvasProps) {
  const { camera } = useThree();

  // Deselect on empty click
  const handlePointerMissed = useCallback(() => {
    onSelect(null);
  }, [onSelect]);

  return (
    <>
      {isPlaying && <GameSimulation objects={objects} />}
      {/* Lights */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} castShadow />

      {/* Grid */}
      {showGrid && (
        <Grid
          position={[0, 0, 0]}
          args={[20, 20]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#444"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#666"
          fadeDistance={50}
          infiniteGrid
        />
      )}

      {/* Scene Objects */}
      <group onPointerMissed={handlePointerMissed}>
        {objects.map(obj => {
          if (obj.type === 'mesh') {
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
          
          if (obj.type === 'light') {
            return (
              <LightObject
                key={obj.id}
                object={obj}
                isSelected={obj.id === selectedId}
                onSelect={() => onSelect(obj.id)}
              />
            );
          }
          
          if (obj.type === 'camera') {
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

      {/* Controls */}
      <OrbitControls makeDefault enableDamping dampingFactor={0.1} />

      {/* Gizmo */}
      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport 
          axisColors={['#ff4444', '#44ff44', '#4444ff']} 
          labelColor="white"
        />
      </GizmoHelper>

      {/* Environment */}
      <Environment preset="city" background blur={0.5} />
      
      {/* AAA Post Processing */}
      <AAAPostProcessing />
    </>
  );
}

// ============================================================================
// MAIN EDITOR
// ============================================================================

export function SceneEditor({ initialScene = [], onChange, onSelect }: SceneEditorProps) {
  const [objects, setObjects] = useState<SceneObject[]>(initialScene);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transformMode, setTransformMode] = useState<TransformMode>('translate');
  const [showGrid, setShowGrid] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  const selectedObject = objects.find(o => o.id === selectedId) || null;

  // Notify parent of selection
  useEffect(() => {
    onSelect?.(selectedId);
  }, [selectedId, onSelect]);

  // Notify parent of changes
  useEffect(() => {
    onChange?.(objects);
  }, [objects, onChange]);

  const handleDelete = useCallback((id: string) => {
    setObjects(prev => prev.filter(o => o.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'w') setTransformMode('translate');
      if (e.key === 'e') setTransformMode('rotate');
      if (e.key === 'r') setTransformMode('scale');
      if (e.key === 'Delete' && selectedId) {
        handleDelete(selectedId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDelete, selectedId]);

  const handleAddObject = useCallback((type: SceneObject['type'], geometry?: string) => {
    const newObject: SceneObject = {
      id: `obj_${Date.now()}`,
      name: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      type,
      position: [0, type === 'light' ? 3 : 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      children: [],
      properties: {
        geometry: geometry || 'box',
        color: type === 'light' ? 0xffffff : 0x4a90d9,
        intensity: 1,
        lightType: 'point',
      },
    };

    setObjects(prev => [...prev, newObject]);
    setSelectedId(newObject.id);
  }, []);

  const handleTransformChange = useCallback((
    id: string,
    position: [number, number, number],
    rotation: [number, number, number],
    scale: [number, number, number]
  ) => {
    setObjects(prev => prev.map(obj => 
      obj.id === id ? { ...obj, position, rotation, scale } : obj
    ));
  }, []);

  const handlePropertyChange = useCallback((updates: Partial<SceneObject>) => {
    if (!selectedId) return;
    setObjects(prev => prev.map(obj =>
      obj.id === selectedId ? { ...obj, ...updates } : obj
    ));
  }, [selectedId]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      width: '100%',
      background: '#0d0d0d',
      color: '#fff',
    }}>
      <Toolbar
        transformMode={transformMode}
        onModeChange={setTransformMode}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid(!showGrid)}
        onPlay={() => setIsPlaying(!isPlaying)}
        isPlaying={isPlaying}
      />

      <div style={{ display: 'flex', flex: 1 }}>
        <HierarchyPanel
          objects={objects}
          primitiveGeometries={Object.keys(PRIMITIVE_GEOMETRIES)}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onAdd={handleAddObject}
          onDelete={handleDelete}
        />

        <div style={{ flex: 1 }}>
          <Canvas shadows camera={{ position: [5, 5, 5], fov: 50 }}>
            <Suspense fallback={null}>
              <SceneCanvas
                objects={objects}
                selectedId={selectedId}
                transformMode={transformMode}
                onSelect={setSelectedId}
                isPlaying={isPlaying}
                onTransformChange={handleTransformChange}
                showGrid={showGrid}
                showStats={false}
              />
            </Suspense>
          </Canvas>
        </div>

        <PropertiesPanel
          object={selectedObject}
          onChange={handlePropertyChange}
        />
      </div>
    </div>
  );
}

export default SceneEditor;
