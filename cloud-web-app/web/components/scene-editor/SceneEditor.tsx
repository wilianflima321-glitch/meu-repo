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
  Html as DreiHtml,
  useHelper,
} from '@react-three/drei';
import * as THREE from 'three';
import { World, Entity, TransformComponent, MeshComponent, getWorld } from '@/lib/game-engine-core';
import { GameSimulation } from './GameSimulation';
import StudioEngineModuleMiniPanel from '@/components/studio/StudioEngineModuleMiniPanel';
import { PropertiesPanel } from './ScenePropertiesPanel';
import { DEFAULT_SNAP_SETTINGS, PRIMITIVE_GEOMETRIES, snapPosition, snapRotation, snapScale } from './scene-editor-models';
import type { SceneEditorProps, SceneObject, SnapSettings, TransformMode } from './scene-editor-models';

export type { SceneEditorProps, SceneObject, SnapSettings, TransformMode } from './scene-editor-models';
const SCENE_ENGINE_MODULES = ['behavior-tree-system'] as const;
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
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(...object.position);
      groupRef.current.rotation.set(...object.rotation);
      groupRef.current.scale.set(...object.scale);
    }
  }, [object.position, object.rotation, object.scale]);
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
          <lineBasicMaterial color={0xffff00} linewidth={2} />
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
  useHelper(
    isSelected ? lightRef as React.MutableRefObject<THREE.Light> : null,
    THREE.PointLightHelper,
    0.5,
    color
  );
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
          color={isSelected ? 0xffff00 : color}
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
        <DreiHtml position={[0, 0.4, 0]}>
          <div style={{
            background: 'rgba(0,0,0,0.8)',
            color: 'var(--aethel-text-primary)',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            whiteSpace: 'nowrap',
            border: '1px solid var(--aethel-border-primary)'
          }}>
            💡 {object.name} ({lightType})
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
      {/* Camera frustum visualization */}
      <mesh onClick={onSelect}>
        <coneGeometry args={[0.3, 0.5, 4]} />
        <meshBasicMaterial
          color={isSelected ? 0xffff00 : 0x4a90d9}
          wireframe
        />
      </mesh>
      {isSelected && (
        <DreiHtml position={[0, 0.5, 0]}>
          <div style={{
            background: 'rgba(0,0,0,0.7)',
            color: 'var(--aethel-text-primary)',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap'
          }}>
            📷 {object.name}
          </div>
        </DreiHtml>
      )}
    </group>
  );
}
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
          cellColor="var(--aethel-border-primary)"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="var(--aethel-text-quaternary)"
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
          axisColors={["red", "lime", "blue"]}
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
          background: obj.id === selectedId ? 'var(--aethel-info)' : 'transparent',
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
          <button type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(obj.id);
            }}
            aria-label="Remove objeto da cena"
            style={{
              background: 'rgba(255,0,0,0.3)',
              border: 'none',
              borderRadius: '3px',
              color: 'var(--aethel-text-primary)',
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
      background: 'var(--aethel-surface-primary)',
      borderRight: '1px solid var(--aethel-border-secondary)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px',
        borderBottom: '1px solid var(--aethel-border-secondary)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontWeight: 'bold', color: 'var(--aethel-text-primary)' }}>Hierarchy</span>
        <div style={{ position: 'relative' }}>
          <button type="button"
            onClick={() => setShowAddMenu(!showAddMenu)}
            style={{
              background: 0x4a90d9,
              border: 'none',
              borderRadius: '4px',
              color: 'var(--aethel-text-primary)',
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
              background: 'var(--aethel-surface-secondary)',
              border: '1px solid var(--aethel-border-primary)',
              borderRadius: '4px',
              padding: '8px 0',
              zIndex: 100,
              minWidth: '150px',
            }}>
              <div style={{ padding: '4px 12px', color: 'var(--aethel-text-tertiary)', fontSize: '11px' }}>
                3D Objects
              </div>
              {Object.keys(PRIMITIVE_GEOMETRIES).map(geom => (
                <button type="button"
                  key={geom}
                  onClick={() => {
                    onAdd('mesh', geom);
                    setShowAddMenu(false);
                  }}
                  aria-label={`Add ${geom} to scene`}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 12px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--aethel-text-primary)',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  🧊 {geom.charAt(0).toUpperCase() + geom.slice(1)}
                </button>
              ))}
              <div style={{ borderTop: '1px solid var(--aethel-border-primary)', margin: '8px 0' }} />
              <div style={{ padding: '4px 12px', color: 'var(--aethel-text-tertiary)', fontSize: '11px' }}>
                Lights
              </div>
              <button type="button"
                onClick={() => { onAdd('light'); setShowAddMenu(false); }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--aethel-text-primary)',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                💡 Point Light
              </button>
              <div style={{ borderTop: '1px solid var(--aethel-border-primary)', margin: '8px 0' }} />
              <button type="button"
                onClick={() => { onAdd('camera'); setShowAddMenu(false); }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--aethel-text-primary)',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                📷 Camera
              </button>
              <button type="button"
                onClick={() => { onAdd('empty'); setShowAddMenu(false); }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--aethel-text-primary)',
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
            color: 'var(--aethel-text-quaternary)',
            textAlign: 'center',
            padding: '20px',
            fontSize: '13px'
          }}>
            Empty scene. Click &quot;+ Add&quot; to add objects.
          </div>
        )}
      </div>
      <StudioEngineModuleMiniPanel title="Scene AI" moduleIds={SCENE_ENGINE_MODULES} />
    </div>
  );
}
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
    background: active ? 'var(--aethel-info)' : 'var(--aethel-surface-tertiary)',
    border: 'none',
    borderRadius: '4px',
    color: 'var(--aethel-text-primary)',
    cursor: 'pointer',
    fontWeight: active ? 'bold' : 'normal' as 'bold' | 'normal',
  });
  return (
    <div style={{
      height: '48px',
      background: 'var(--aethel-surface-primary)',
      borderBottom: '1px solid var(--aethel-border-secondary)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: '8px',
    }}>
      {/* Transform tools */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <button type="button"
          onClick={() => onModeChange('translate')}
          style={buttonStyle(transformMode === 'translate')}
          title="Move (W)"
        >
          ↔️ Move
        </button>
        <button type="button"
          onClick={() => onModeChange('rotate')}
          style={buttonStyle(transformMode === 'rotate')}
          title="Rotate (E)"
        >
          🔄 Rotate
        </button>
        <button type="button"
          onClick={() => onModeChange('scale')}
          style={buttonStyle(transformMode === 'scale')}
          title="Scale (R)"
        >
          📐 Scale
        </button>
      </div>
      <div style={{ width: '1px', height: '24px', background: 'var(--aethel-border-primary)' }} />
      {/* View options */}
      <button type="button"
        onClick={onToggleGrid}
        aria-label={showGrid ? 'Ocultar grade da cena' : 'Exibir grade da cena'}
        aria-pressed={showGrid}
        style={buttonStyle(showGrid)}
      >
        {showGrid ? '▦' : '▢'} Grid
      </button>
      <div style={{ flex: 1 }} />
      {/* Play button */}
      <button type="button"
        onClick={onPlay}
        style={{
          ...buttonStyle(isPlaying),
          background: isPlaying ? 'var(--aethel-error)' : 'var(--aethel-success)',
          padding: '8px 24px',
        }}
      >
        {isPlaying ? '⏹ Stop' : '▶️ Play'}
      </button>
    </div>
  );
}
export function SceneEditor({ initialScene = [], onChange, onSelect }: SceneEditorProps) {
  const [objects, setObjects] = useState<SceneObject[]>(initialScene);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transformMode, setTransformMode] = useState<TransformMode>('translate');
  const [showGrid, setShowGrid] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const selectedObject = objects.find(o => o.id === selectedId) || null;
  useEffect(() => {
    onSelect?.(selectedId);
  }, [selectedId, onSelect]);
  useEffect(() => {
    onChange?.(objects);
  }, [objects, onChange]);
  const handleDelete = useCallback((id: string) => {
    setObjects(prev => prev.filter(o => o.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);
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
      background: 'var(--aethel-surface-primary)',
      color: 'var(--aethel-text-primary)',
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
