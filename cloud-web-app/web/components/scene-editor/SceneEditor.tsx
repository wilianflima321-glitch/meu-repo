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
// HIERARCHY PANEL
// ============================================================================

interface HierarchyPanelProps {
  objects: SceneObject[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: (type: SceneObject['type'], geometry?: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

function HierarchyPanel({ 
  objects, 
  selectedId, 
  onSelect, 
  onAdd, 
  onDelete,
  onRename,
}: HierarchyPanelProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  const renderObject = (obj: SceneObject, depth: number = 0) => (
    <div key={obj.id}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 8px',
          paddingLeft: `${8 + depth * 16}px`,
          background: obj.id === selectedId ? '#4a90d9' : 'transparent',
          cursor: 'pointer',
          borderRadius: '4px',
          marginBottom: '2px',
        }}
        onClick={() => onSelect(obj.id)}
      >
        <span style={{ marginRight: '8px' }}>
          {obj.type === 'mesh' && '🧊'}
          {obj.type === 'light' && '💡'}
          {obj.type === 'camera' && '📷'}
          {obj.type === 'empty' && '📁'}
        </span>
        <span style={{ flex: 1, fontSize: '13px' }}>{obj.name}</span>
        {obj.id === selectedId && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(obj.id);
            }}
            style={{
              background: 'rgba(255,0,0,0.3)',
              border: 'none',
              borderRadius: '3px',
              color: '#fff',
              padding: '2px 6px',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            ✕
          </button>
        )}
      </div>
      {obj.children.map(child => renderObject(child, depth + 1))}
    </div>
  );

  return (
    <div style={{
      width: '250px',
      background: '#1e1e1e',
      borderRight: '1px solid #333',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px',
        borderBottom: '1px solid #333',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontWeight: 'bold', color: '#fff' }}>Hierarquia</span>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            style={{
              background: '#4a90d9',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              padding: '4px 12px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            + Add
          </button>
          
          {showAddMenu && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              background: '#2d2d2d',
              border: '1px solid #444',
              borderRadius: '4px',
              padding: '8px 0',
              zIndex: 100,
              minWidth: '150px',
            }}>
              <div style={{ padding: '4px 12px', color: '#888', fontSize: '11px' }}>
                3D Objects
              </div>
              {Object.keys(PRIMITIVE_GEOMETRIES).map(geom => (
                <button
                  key={geom}
                  onClick={() => {
                    onAdd('mesh', geom);
                    setShowAddMenu(false);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 12px',
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  🧊 {geom.charAt(0).toUpperCase() + geom.slice(1)}
                </button>
              ))}
              
              <div style={{ borderTop: '1px solid #444', margin: '8px 0' }} />
              <div style={{ padding: '4px 12px', color: '#888', fontSize: '11px' }}>
                Lights
              </div>
              <button
                onClick={() => { onAdd('light'); setShowAddMenu(false); }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                💡 Point Light
              </button>
              
              <div style={{ borderTop: '1px solid #444', margin: '8px 0' }} />
              <button
                onClick={() => { onAdd('camera'); setShowAddMenu(false); }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                📷 Camera
              </button>
              <button
                onClick={() => { onAdd('empty'); setShowAddMenu(false); }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                📁 Empty Object
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Objects List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {objects.map(obj => renderObject(obj))}
        
        {objects.length === 0 && (
          <div style={{ 
            color: '#666', 
            textAlign: 'center', 
            padding: '20px',
            fontSize: '13px'
          }}>
            Cena vazia. Clique em &quot;+ Add&quot; para adicionar objetos.
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// PROPERTIES PANEL
// ============================================================================

interface PropertiesPanelProps {
  object: SceneObject | null;
  onChange: (updates: Partial<SceneObject>) => void;
}

function PropertiesPanel({ object, onChange }: PropertiesPanelProps) {
  if (!object) {
    return (
      <div style={{
        width: '280px',
        background: '#1e1e1e',
        borderLeft: '1px solid #333',
        padding: '16px',
        color: '#666',
        fontSize: '13px',
      }}>
        Selecione um objeto para ver suas propriedades.
      </div>
    );
  }

  const updatePosition = (axis: number, value: number) => {
    const newPos: [number, number, number] = [...object.position];
    newPos[axis] = value;
    onChange({ position: newPos });
  };

  const updateRotation = (axis: number, value: number) => {
    const newRot: [number, number, number] = [...object.rotation];
    newRot[axis] = value * (Math.PI / 180); // Degrees to radians
    onChange({ rotation: newRot });
  };

  const updateScale = (axis: number, value: number) => {
    const newScale: [number, number, number] = [...object.scale];
    newScale[axis] = value;
    onChange({ scale: newScale });
  };

  const inputStyle = {
    width: '60px',
    padding: '4px 8px',
    background: '#333',
    border: '1px solid #444',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '12px',
  };

  const labelStyle = {
    width: '20px',
    textAlign: 'center' as const,
    fontWeight: 'bold' as const,
  };

  const properties = object.properties as Record<string, any>;

  return (
    <div style={{
      width: '280px',
      background: '#1e1e1e',
      borderLeft: '1px solid #333',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px',
        borderBottom: '1px solid #333',
      }}>
        <input
          type="text"
          value={object.name}
          onChange={(e) => onChange({ name: e.target.value })}
          style={{
            width: '100%',
            padding: '8px',
            background: '#333',
            border: '1px solid #444',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        />
      </div>

      {/* Transform */}
      <div style={{ padding: '12px', borderBottom: '1px solid #333' }}>
        <h4 style={{ margin: '0 0 12px 0', color: '#888', fontSize: '12px' }}>
          TRANSFORM
        </h4>

        {/* Position */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ color: '#aaa', fontSize: '11px', marginBottom: '4px' }}>
            Position
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ ...labelStyle, color: '#ff6b6b' }}>X</span>
            <input
              type="number"
              step="0.1"
              value={object.position[0].toFixed(2)}
              onChange={(e) => updatePosition(0, parseFloat(e.target.value) || 0)}
              style={inputStyle}
            />
            <span style={{ ...labelStyle, color: '#51cf66' }}>Y</span>
            <input
              type="number"
              step="0.1"
              value={object.position[1].toFixed(2)}
              onChange={(e) => updatePosition(1, parseFloat(e.target.value) || 0)}
              style={inputStyle}
            />
            <span style={{ ...labelStyle, color: '#339af0' }}>Z</span>
            <input
              type="number"
              step="0.1"
              value={object.position[2].toFixed(2)}
              onChange={(e) => updatePosition(2, parseFloat(e.target.value) || 0)}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Rotation */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ color: '#aaa', fontSize: '11px', marginBottom: '4px' }}>
            Rotation (degrees)
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ ...labelStyle, color: '#ff6b6b' }}>X</span>
            <input
              type="number"
              step="1"
              value={(object.rotation[0] * (180 / Math.PI)).toFixed(0)}
              onChange={(e) => updateRotation(0, parseFloat(e.target.value) || 0)}
              style={inputStyle}
            />
            <span style={{ ...labelStyle, color: '#51cf66' }}>Y</span>
            <input
              type="number"
              step="1"
              value={(object.rotation[1] * (180 / Math.PI)).toFixed(0)}
              onChange={(e) => updateRotation(1, parseFloat(e.target.value) || 0)}
              style={inputStyle}
            />
            <span style={{ ...labelStyle, color: '#339af0' }}>Z</span>
            <input
              type="number"
              step="1"
              value={(object.rotation[2] * (180 / Math.PI)).toFixed(0)}
              onChange={(e) => updateRotation(2, parseFloat(e.target.value) || 0)}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Scale */}
        <div>
          <div style={{ color: '#aaa', fontSize: '11px', marginBottom: '4px' }}>
            Scale
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ ...labelStyle, color: '#ff6b6b' }}>X</span>
            <input
              type="number"
              step="0.1"
              value={object.scale[0].toFixed(2)}
              onChange={(e) => updateScale(0, parseFloat(e.target.value) || 1)}
              style={inputStyle}
            />
            <span style={{ ...labelStyle, color: '#51cf66' }}>Y</span>
            <input
              type="number"
              step="0.1"
              value={object.scale[1].toFixed(2)}
              onChange={(e) => updateScale(1, parseFloat(e.target.value) || 1)}
              style={inputStyle}
            />
            <span style={{ ...labelStyle, color: '#339af0' }}>Z</span>
            <input
              type="number"
              step="0.1"
              value={object.scale[2].toFixed(2)}
              onChange={(e) => updateScale(2, parseFloat(e.target.value) || 1)}
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* Type-specific properties */}
      {object.type === 'mesh' && (
        <>
          <div style={{ padding: '12px', borderBottom: '1px solid #333' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#888', fontSize: '12px' }}>
              MESH
            </h4>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ color: '#aaa', fontSize: '11px', marginBottom: '4px' }}>
                Geometry
              </div>
              <select
                value={(object.properties.geometry as string) || 'box'}
                onChange={(e) => onChange({ 
                  properties: { ...object.properties, geometry: e.target.value } 
                })}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#333',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  color: '#fff',
                }}
              >
                {Object.keys(PRIMITIVE_GEOMETRIES).map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={{ color: '#aaa', fontSize: '11px', marginBottom: '4px' }}>
                Color
              </div>
              <input
                type="color"
                value={`#${((object.properties.color as number) || 0x4a90d9).toString(16).padStart(6, '0')}`}
                onChange={(e) => onChange({
                  properties: { ...object.properties, color: parseInt(e.target.value.slice(1), 16) }
                })}
                style={{
                  width: '100%',
                  height: '32px',
                  padding: '0',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
            </div>
          </div>

          {/* PHYSICS PANEL */}
          <div style={{ padding: '12px', borderBottom: '1px solid #333' }}>
             <h4 style={{ margin: '0 0 12px 0', color: '#888', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
               PHYSICS
               <input 
                 type="checkbox" 
                 checked={Boolean(properties.rigidbody)}
                 onChange={(e) => {
                   if (e.target.checked) {
                     onChange({ properties: { ...properties, rigidbody: { mass: 1, type: 'dynamic' } } });
                   } else {
                     const { rigidbody, ...rest } = properties;
                     onChange({ properties: rest });
                   }
                 }}
               />
             </h4>
             
             {Boolean(properties.rigidbody) && (
               <>
                 <div style={{ marginBottom: '8px' }}>
                   <div style={{ color: '#aaa', fontSize: '11px', marginBottom: '4px' }}>Type</div>
                   <select
                     value={(properties.rigidbody as any).type || 'dynamic'}
                     onChange={(e) => {
                       const rb = properties.rigidbody as any;
                       onChange({ properties: { ...properties, rigidbody: { ...rb, type: e.target.value } } });
                     }}
                     style={{ width: '100%', background: '#333', color: '#fff', border: '1px solid #444', padding: '4px' }}
                   >
                     <option value="dynamic">Dynamic</option>
                     <option value="static">Static (Floor)</option>
                     <option value="kinematic">Kinematic</option>
                   </select>
                 </div>

                 <div style={{ marginBottom: '8px' }}>
                   <div style={{ color: '#aaa', fontSize: '11px', marginBottom: '4px' }}>Mass</div>
                   <input
                     type="number"
                     step="0.1"
                     value={(properties.rigidbody as any).mass || 1}
                     onChange={(e) => {
                        const rb = properties.rigidbody as any;
                        onChange({ properties: { ...properties, rigidbody: { ...rb, mass: parseFloat(e.target.value) } } });
                     }}
                     style={{ width: '100%', background: '#333', color: '#fff', border: '1px solid #444', padding: '4px' }}
                   />
                 </div>
               </>
             )}
          </div>
        </>
      )}

      {object.type === 'light' && (
        <div style={{ padding: '12px', borderBottom: '1px solid #333' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#888', fontSize: '12px' }}>
            LIGHT
          </h4>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ color: '#aaa', fontSize: '11px', marginBottom: '4px' }}>
              Type
            </div>
            <select
              value={(object.properties.lightType as string) || 'point'}
              onChange={(e) => onChange({
                properties: { ...object.properties, lightType: e.target.value }
              })}
              style={{
                width: '100%',
                padding: '8px',
                background: '#333',
                border: '1px solid #444',
                borderRadius: '4px',
                color: '#fff',
              }}
            >
              <option value="point">Point</option>
              <option value="directional">Directional</option>
              <option value="spot">Spot</option>
            </select>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ color: '#aaa', fontSize: '11px', marginBottom: '4px' }}>
              Intensity
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="0.1"
              value={(object.properties.intensity as number) || 1}
              onChange={(e) => onChange({
                properties: { ...object.properties, intensity: parseFloat(e.target.value) }
              })}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <div style={{ color: '#aaa', fontSize: '11px', marginBottom: '4px' }}>
              Color
            </div>
            <input
              type="color"
              value={`#${((object.properties.color as number) || 0xffffff).toString(16).padStart(6, '0')}`}
              onChange={(e) => onChange({
                properties: { ...object.properties, color: parseInt(e.target.value.slice(1), 16) }
              })}
              style={{
                width: '100%',
                height: '32px',
                padding: '0',
                border: '1px solid #444',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TOOLBAR
// ============================================================================

interface ToolbarProps {
  transformMode: TransformMode;
  onModeChange: (mode: TransformMode) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  onPlay: () => void;
  isPlaying: boolean;
}

function Toolbar({ 
  transformMode, 
  onModeChange, 
  showGrid, 
  onToggleGrid, 
  onPlay, 
  isPlaying 
}: ToolbarProps) {
  const buttonStyle = (active: boolean) => ({
    padding: '8px 12px',
    background: active ? '#4a90d9' : '#333',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: active ? 'bold' : 'normal' as 'bold' | 'normal',
  });

  return (
    <div style={{
      height: '48px',
      background: '#1e1e1e',
      borderBottom: '1px solid #333',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: '8px',
    }}>
      {/* Transform tools */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          onClick={() => onModeChange('translate')}
          style={buttonStyle(transformMode === 'translate')}
          title="Move (W)"
        >
          ↔️ Move
        </button>
        <button
          onClick={() => onModeChange('rotate')}
          style={buttonStyle(transformMode === 'rotate')}
          title="Rotate (E)"
        >
          🔄 Rotate
        </button>
        <button
          onClick={() => onModeChange('scale')}
          style={buttonStyle(transformMode === 'scale')}
          title="Scale (R)"
        >
          📐 Scale
        </button>
      </div>

      <div style={{ width: '1px', height: '24px', background: '#444' }} />

      {/* View options */}
      <button
        onClick={onToggleGrid}
        style={buttonStyle(showGrid)}
      >
        {showGrid ? '▦' : '▢'} Grid
      </button>

      <div style={{ flex: 1 }} />

      {/* Play button */}
      <button
        onClick={onPlay}
        style={{
          ...buttonStyle(isPlaying),
          background: isPlaying ? '#e74c3c' : '#27ae60',
          padding: '8px 24px',
        }}
      >
        {isPlaying ? '⏹ Stop' : '▶️ Play'}
      </button>
    </div>
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
          selectedId={selectedId}
          onSelect={setSelectedId}
          onAdd={handleAddObject}
          onDelete={handleDelete}
          onRename={(id, name) => {
            setObjects(prev => prev.map(o => o.id === id ? { ...o, name } : o));
          }}
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
