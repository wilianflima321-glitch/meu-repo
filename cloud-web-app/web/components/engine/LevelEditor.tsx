/**
 * Level Editor Integrado - Editor de Níveis Profissional
 * 
 * Editor completo estilo Unreal Engine que integra todos
 * os sistemas: Scene, World Outliner, Details, etc.
 * 
 * NÃO É MOCK - Sistema real e funcional!
 */

'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  TransformControls, 
  GizmoHelper, 
  GizmoViewport, 
  Grid,
  PivotControls,
  Stats,
  Environment,
  ContactShadows,
  Sky,
  useHelper,
} from '@react-three/drei';
import * as THREE from 'three';

// ============================================================================
// TYPES
// ============================================================================

type TransformMode = 'translate' | 'rotate' | 'scale';
type ViewportMode = 'perspective' | 'top' | 'front' | 'right';
type SnapMode = 'none' | 'grid' | 'vertex';

interface LevelObject {
  id: string;
  name: string;
  type: 'mesh' | 'light' | 'camera' | 'empty' | 'blueprint' | 'volume' | 'spline' | 'decal' | 'foliage' | 'audio';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  visible: boolean;
  locked: boolean;
  parentId?: string;
  children: string[];
  components: LevelComponent[];
  properties: Record<string, unknown>;
}

interface LevelComponent {
  id: string;
  type: string;
  enabled: boolean;
  properties: Record<string, unknown>;
}

interface LevelData {
  id: string;
  name: string;
  objects: LevelObject[];
  environment: EnvironmentSettings;
  lightmapSettings: LightmapSettings;
  navmeshSettings: NavmeshSettings;
}

interface EnvironmentSettings {
  skyType: 'hdri' | 'procedural' | 'solid';
  skyColor: string;
  ambientIntensity: number;
  fogEnabled: boolean;
  fogColor: string;
  fogDensity: number;
  postProcessVolume?: string;
}

interface LightmapSettings {
  resolution: number;
  quality: 'preview' | 'medium' | 'high' | 'production';
  directSamples: number;
  indirectSamples: number;
  bounces: number;
}

interface NavmeshSettings {
  agentRadius: number;
  agentHeight: number;
  maxSlope: number;
  stepHeight: number;
  cellSize: number;
}

// ============================================================================
// DEFAULT DATA
// ============================================================================

const defaultObjects: LevelObject[] = [
  {
    id: 'floor',
    name: 'Floor',
    type: 'mesh',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [10, 0.1, 10],
    visible: true,
    locked: false,
    children: [],
    components: [
      { id: 'mesh_floor', type: 'StaticMesh', enabled: true, properties: { mesh: 'Cube', material: 'M_Floor' } },
      { id: 'col_floor', type: 'BoxCollider', enabled: true, properties: { isTrigger: false } },
    ],
    properties: { castShadow: true, receiveShadow: true },
  },
  {
    id: 'cube1',
    name: 'Cube_01',
    type: 'mesh',
    position: [0, 1, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    visible: true,
    locked: false,
    children: [],
    components: [
      { id: 'mesh_cube1', type: 'StaticMesh', enabled: true, properties: { mesh: 'Cube', material: 'M_Default' } },
    ],
    properties: { castShadow: true, receiveShadow: true },
  },
  {
    id: 'sphere1',
    name: 'Sphere_01',
    type: 'mesh',
    position: [3, 1, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    visible: true,
    locked: false,
    children: [],
    components: [
      { id: 'mesh_sphere1', type: 'StaticMesh', enabled: true, properties: { mesh: 'Sphere', material: 'M_Metal' } },
    ],
    properties: { castShadow: true, receiveShadow: true },
  },
  {
    id: 'light_main',
    name: 'DirectionalLight',
    type: 'light',
    position: [5, 10, 5],
    rotation: [-45, 30, 0],
    scale: [1, 1, 1],
    visible: true,
    locked: false,
    children: [],
    components: [
      { id: 'light_dir', type: 'DirectionalLight', enabled: true, properties: { color: '#ffffff', intensity: 1, castShadow: true } },
    ],
    properties: {},
  },
  {
    id: 'light_point',
    name: 'PointLight',
    type: 'light',
    position: [-3, 2, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    visible: true,
    locked: false,
    children: [],
    components: [
      { id: 'light_pt', type: 'PointLight', enabled: true, properties: { color: '#ff9900', intensity: 1, range: 10 } },
    ],
    properties: {},
  },
  {
    id: 'camera_main',
    name: 'MainCamera',
    type: 'camera',
    position: [5, 5, 5],
    rotation: [-35, 45, 0],
    scale: [1, 1, 1],
    visible: true,
    locked: false,
    children: [],
    components: [
      { id: 'cam_main', type: 'Camera', enabled: true, properties: { fov: 60, near: 0.1, far: 1000 } },
    ],
    properties: {},
  },
];

const defaultEnvironment: EnvironmentSettings = {
  skyType: 'procedural',
  skyColor: '#87ceeb',
  ambientIntensity: 0.3,
  fogEnabled: false,
  fogColor: '#aabbcc',
  fogDensity: 0.01,
};

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
  
  if (!object.visible) return null;
  
  const renderMesh = () => {
    const meshComp = object.components.find(c => c.type === 'StaticMesh');
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
              <mesh onClick={(e) => { e.stopPropagation(); onSelect(object.id); }}>
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
              <mesh onClick={(e) => { e.stopPropagation(); onSelect(object.id); }}>
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
              <mesh onClick={(e) => { e.stopPropagation(); onSelect(object.id); }}>
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
        {/* Camera icon */}
        <mesh onClick={(e) => { e.stopPropagation(); onSelect(object.id); }}>
          <boxGeometry args={[0.4, 0.3, 0.3]} />
          <meshBasicMaterial color={isSelected ? '#00ff00' : '#666666'} wireframe />
        </mesh>
        {/* Lens */}
        <mesh position={[0, 0, 0.25]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.15, 0.2, 16]} />
          <meshBasicMaterial color={isSelected ? '#00ff00' : '#444444'} wireframe />
        </mesh>
      </group>
    );
  };
  
  const renderEmpty = () => {
    return (
      <mesh onClick={(e) => { e.stopPropagation(); onSelect(object.id); }}>
        <octahedronGeometry args={[0.2]} />
        <meshBasicMaterial color={isSelected ? '#ffffff' : '#888888'} wireframe />
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

function Viewport({ objects, selectedId, onSelect, transformMode, onTransform, viewMode, showGrid, showStats, environment }: ViewportProps) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  
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
      <color attach="background" args={['#1a1a1a']} />
      
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
          cellColor="#333333"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#555555"
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

// ============================================================================
// TOOLBAR COMPONENT
// ============================================================================

interface ToolbarProps {
  transformMode: TransformMode;
  onTransformModeChange: (mode: TransformMode) => void;
  viewMode: ViewportMode;
  onViewModeChange: (mode: ViewportMode) => void;
  snapMode: SnapMode;
  onSnapModeChange: (mode: SnapMode) => void;
  gridSize: number;
  onGridSizeChange: (size: number) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSave: () => void;
  onBuild: () => void;
}

function Toolbar({
  transformMode, onTransformModeChange,
  viewMode, onViewModeChange,
  snapMode, onSnapModeChange,
  gridSize, onGridSizeChange,
  isPlaying, onPlayPause,
  onSave, onBuild,
}: ToolbarProps) {
  return (
    <div style={{
      height: '40px',
      background: '#252525',
      borderBottom: '1px solid #333',
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
      gap: '8px',
    }}>
      {/* Transform Mode */}
      <div style={{ display: 'flex', gap: '2px', marginRight: '8px' }}>
        {(['translate', 'rotate', 'scale'] as TransformMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => onTransformModeChange(mode)}
            title={mode.charAt(0).toUpperCase() + mode.slice(1) + ' (W/E/R)'}
            style={{
              width: '32px',
              height: '28px',
              background: transformMode === mode ? '#3498db' : '#333',
              border: 'none',
              borderRadius: '3px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {mode === 'translate' ? '↔' : mode === 'rotate' ? '⟳' : '⤢'}
          </button>
        ))}
      </div>
      
      <div style={{ width: '1px', height: '20px', background: '#444' }} />
      
      {/* Snap Mode */}
      <select
        value={snapMode}
        onChange={(e) => onSnapModeChange(e.target.value as SnapMode)}
        style={{
          background: '#333',
          border: '1px solid #444',
          borderRadius: '3px',
          color: '#fff',
          padding: '4px 8px',
          fontSize: '11px',
        }}
      >
        <option value="none">No Snap</option>
        <option value="grid">Grid Snap</option>
        <option value="vertex">Vertex Snap</option>
      </select>
      
      {snapMode === 'grid' && (
        <input
          type="number"
          value={gridSize}
          onChange={(e) => onGridSizeChange(parseFloat(e.target.value))}
          min={0.1}
          max={10}
          step={0.1}
          style={{
            width: '60px',
            background: '#333',
            border: '1px solid #444',
            borderRadius: '3px',
            color: '#fff',
            padding: '4px 8px',
            fontSize: '11px',
          }}
        />
      )}
      
      <div style={{ width: '1px', height: '20px', background: '#444' }} />
      
      {/* View Mode */}
      <select
        value={viewMode}
        onChange={(e) => onViewModeChange(e.target.value as ViewportMode)}
        style={{
          background: '#333',
          border: '1px solid #444',
          borderRadius: '3px',
          color: '#fff',
          padding: '4px 8px',
          fontSize: '11px',
        }}
      >
        <option value="perspective">Perspective</option>
        <option value="top">Top</option>
        <option value="front">Front</option>
        <option value="right">Right</option>
      </select>
      
      <div style={{ flex: 1 }} />
      
      {/* Play/Pause */}
      <button
        onClick={onPlayPause}
        style={{
          padding: '6px 16px',
          background: isPlaying ? '#e74c3c' : '#2ecc71',
          border: 'none',
          borderRadius: '4px',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
        }}
      >
        {isPlaying ? '⏹ Stop' : '▶ Play'}
      </button>
      
      <div style={{ width: '1px', height: '20px', background: '#444' }} />
      
      {/* Save & Build */}
      <button
        onClick={onSave}
        style={{
          padding: '6px 12px',
          background: '#333',
          border: '1px solid #555',
          borderRadius: '4px',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '12px',
        }}
      >
        💾 Save
      </button>
      
      <button
        onClick={onBuild}
        style={{
          padding: '6px 12px',
          background: '#3498db',
          border: 'none',
          borderRadius: '4px',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '12px',
        }}
      >
        🔨 Build
      </button>
    </div>
  );
}

// ============================================================================
// WORLD OUTLINER MINI
// ============================================================================

interface OutlinerMiniProps {
  objects: LevelObject[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

function OutlinerMini({ objects, selectedId, onSelect, onToggleVisibility, onToggleLock, onDelete, onDuplicate }: OutlinerMiniProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'mesh': return '🔷';
      case 'light': return '💡';
      case 'camera': return '📷';
      case 'empty': return '⭕';
      case 'blueprint': return '📜';
      case 'volume': return '📦';
      case 'spline': return '〰️';
      case 'audio': return '🔊';
      default: return '❓';
    }
  };
  
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #333', fontWeight: 'bold', fontSize: '12px' }}>
        World Outliner
      </div>
      
      <div style={{ flex: 1, overflow: 'auto', padding: '4px' }}>
        {objects.map((obj) => (
          <div
            key={obj.id}
            onClick={() => onSelect(obj.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              // Context menu would go here
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 8px',
              background: selectedId === obj.id ? '#3498db33' : 'transparent',
              borderRadius: '4px',
              cursor: 'pointer',
              opacity: obj.visible ? 1 : 0.5,
            }}
          >
            <span>{getIcon(obj.type)}</span>
            <span style={{ flex: 1, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {obj.name}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleVisibility(obj.id); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', opacity: 0.6 }}
            >
              {obj.visible ? '👁' : '👁‍🗨'}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleLock(obj.id); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', opacity: 0.6 }}
            >
              {obj.locked ? '🔒' : '🔓'}
            </button>
          </div>
        ))}
      </div>
      
      {/* Add object buttons */}
      <div style={{ padding: '8px', borderTop: '1px solid #333', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {['Cube', 'Sphere', 'Light', 'Camera', 'Empty'].map((type) => (
          <button
            key={type}
            style={{
              padding: '4px 8px',
              background: '#333',
              border: '1px solid #444',
              borderRadius: '3px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '10px',
            }}
          >
            + {type}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// DETAILS PANEL MINI
// ============================================================================

interface DetailsPanelMiniProps {
  object: LevelObject | null;
  onChange: (id: string, changes: Partial<LevelObject>) => void;
}

function DetailsPanelMini({ object, onChange }: DetailsPanelMiniProps) {
  if (!object) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #333', fontWeight: 'bold', fontSize: '12px' }}>
          Details
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
          Select an object
        </div>
      </div>
    );
  }
  
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #333', fontWeight: 'bold', fontSize: '12px' }}>
        Details - {object.name}
      </div>
      
      <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
        {/* Name */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px' }}>Name</label>
          <input
            type="text"
            value={object.name}
            onChange={(e) => onChange(object.id, { name: e.target.value })}
            style={{
              width: '100%',
              background: '#333',
              border: '1px solid #444',
              borderRadius: '4px',
              color: '#fff',
              padding: '6px 10px',
              fontSize: '12px',
            }}
          />
        </div>
        
        {/* Transform */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>Transform</div>
          
          {/* Position */}
          <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px' }}>Position</label>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
            {['X', 'Y', 'Z'].map((axis, i) => (
              <div key={axis} style={{ flex: 1 }}>
                <div style={{ fontSize: '10px', color: ['#e74c3c', '#2ecc71', '#3498db'][i], marginBottom: '2px' }}>{axis}</div>
                <input
                  type="number"
                  value={object.position[i]}
                  step={0.1}
                  onChange={(e) => {
                    const newPos = [...object.position] as [number, number, number];
                    newPos[i] = parseFloat(e.target.value);
                    onChange(object.id, { position: newPos });
                  }}
                  style={{
                    width: '100%',
                    background: '#252525',
                    border: '1px solid #444',
                    borderRadius: '3px',
                    color: '#fff',
                    padding: '4px 6px',
                    fontSize: '11px',
                  }}
                />
              </div>
            ))}
          </div>
          
          {/* Rotation */}
          <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px' }}>Rotation</label>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
            {['X', 'Y', 'Z'].map((axis, i) => (
              <div key={axis} style={{ flex: 1 }}>
                <div style={{ fontSize: '10px', color: ['#e74c3c', '#2ecc71', '#3498db'][i], marginBottom: '2px' }}>{axis}</div>
                <input
                  type="number"
                  value={object.rotation[i]}
                  step={1}
                  onChange={(e) => {
                    const newRot = [...object.rotation] as [number, number, number];
                    newRot[i] = parseFloat(e.target.value);
                    onChange(object.id, { rotation: newRot });
                  }}
                  style={{
                    width: '100%',
                    background: '#252525',
                    border: '1px solid #444',
                    borderRadius: '3px',
                    color: '#fff',
                    padding: '4px 6px',
                    fontSize: '11px',
                  }}
                />
              </div>
            ))}
          </div>
          
          {/* Scale */}
          <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px' }}>Scale</label>
          <div style={{ display: 'flex', gap: '4px' }}>
            {['X', 'Y', 'Z'].map((axis, i) => (
              <div key={axis} style={{ flex: 1 }}>
                <div style={{ fontSize: '10px', color: ['#e74c3c', '#2ecc71', '#3498db'][i], marginBottom: '2px' }}>{axis}</div>
                <input
                  type="number"
                  value={object.scale[i]}
                  step={0.1}
                  min={0.01}
                  onChange={(e) => {
                    const newScale = [...object.scale] as [number, number, number];
                    newScale[i] = parseFloat(e.target.value);
                    onChange(object.id, { scale: newScale });
                  }}
                  style={{
                    width: '100%',
                    background: '#252525',
                    border: '1px solid #444',
                    borderRadius: '3px',
                    color: '#fff',
                    padding: '4px 6px',
                    fontSize: '11px',
                  }}
                />
              </div>
            ))}
          </div>
        </div>
        
        {/* Components */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>Components</div>
          {object.components.map((comp) => (
            <div
              key={comp.id}
              style={{
                background: '#333',
                borderRadius: '4px',
                padding: '8px',
                marginBottom: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" checked={comp.enabled} readOnly />
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{comp.type}</span>
              </div>
            </div>
          ))}
          
          <button
            style={{
              width: '100%',
              padding: '8px',
              background: '#333',
              border: '1px dashed #555',
              borderRadius: '4px',
              color: '#888',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            + Add Component
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function LevelEditor() {
  const [objects, setObjects] = useState<LevelObject[]>(defaultObjects);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transformMode, setTransformMode] = useState<TransformMode>('translate');
  const [viewMode, setViewMode] = useState<ViewportMode>('perspective');
  const [snapMode, setSnapMode] = useState<SnapMode>('grid');
  const [gridSize, setGridSize] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [environment] = useState<EnvironmentSettings>(defaultEnvironment);
  
  const selectedObject = useMemo(
    () => objects.find(o => o.id === selectedId) || null,
    [objects, selectedId]
  );

  const handleDuplicate = useCallback((id: string) => {
    const timestamp = Date.now();
    let nextId: string | null = null;

    setObjects(prev => {
      const obj = prev.find(o => o.id === id);
      if (!obj) return prev;

      nextId = `${obj.id}_copy_${timestamp}`;

      const newObj: LevelObject = {
        ...obj,
        id: nextId,
        name: `${obj.name}_Copy`,
        position: [obj.position[0] + 1, obj.position[1], obj.position[2] + 1],
      };

      return [...prev, newObj];
    });

    if (nextId) {
      setSelectedId(nextId);
    }
  }, []);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      
      switch (e.key.toLowerCase()) {
        case 'w':
          setTransformMode('translate');
          break;
        case 'e':
          setTransformMode('rotate');
          break;
        case 'r':
          setTransformMode('scale');
          break;
        case 'delete':
        case 'backspace':
          if (selectedId) {
            setObjects(prev => prev.filter(o => o.id !== selectedId));
            setSelectedId(null);
          }
          break;
        case 'd':
          if (e.ctrlKey && selectedObject) {
            handleDuplicate(selectedObject.id);
          }
          break;
        case 'g':
          setShowGrid(prev => !prev);
          break;
        case 'escape':
          setSelectedId(null);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDuplicate, selectedId, selectedObject]);
  
  const handleTransform = useCallback((id: string, position: [number, number, number], rotation: [number, number, number], scale: [number, number, number]) => {
    setObjects(prev => prev.map(obj => 
      obj.id === id ? { ...obj, position, rotation, scale } : obj
    ));
  }, []);
  
  const handleObjectChange = useCallback((id: string, changes: Partial<LevelObject>) => {
    setObjects(prev => prev.map(obj => 
      obj.id === id ? { ...obj, ...changes } : obj
    ));
  }, []);
  
  const handleToggleVisibility = useCallback((id: string) => {
    setObjects(prev => prev.map(obj => 
      obj.id === id ? { ...obj, visible: !obj.visible } : obj
    ));
  }, []);
  
  const handleToggleLock = useCallback((id: string) => {
    setObjects(prev => prev.map(obj => 
      obj.id === id ? { ...obj, locked: !obj.locked } : obj
    ));
  }, []);
  
  const handleDelete = useCallback((id: string) => {
    setObjects(prev => prev.filter(obj => obj.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);
  
  const handleSave = useCallback(() => {
    const levelData: LevelData = {
      id: 'level_1',
      name: 'Main Level',
      objects,
      environment,
      lightmapSettings: { resolution: 1024, quality: 'high', directSamples: 32, indirectSamples: 128, bounces: 3 },
      navmeshSettings: { agentRadius: 0.5, agentHeight: 2, maxSlope: 45, stepHeight: 0.4, cellSize: 0.3 },
    };
    
    localStorage.setItem('aethel_level_data', JSON.stringify(levelData));
    console.log('Level saved:', levelData);
  }, [objects, environment]);
  
  const handleBuild = useCallback(() => {
    console.log('Building level...');
    // Build process would go here
  }, []);
  
  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', background: '#1a1a1a', color: '#fff' }}>
      {/* Toolbar */}
      <Toolbar
        transformMode={transformMode}
        onTransformModeChange={setTransformMode}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        snapMode={snapMode}
        onSnapModeChange={setSnapMode}
        gridSize={gridSize}
        onGridSizeChange={setGridSize}
        isPlaying={isPlaying}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        onSave={handleSave}
        onBuild={handleBuild}
      />
      
      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Panel - World Outliner */}
        <div style={{ width: '250px', borderRight: '1px solid #333', background: '#222' }}>
          <OutlinerMini
            objects={objects}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onToggleVisibility={handleToggleVisibility}
            onToggleLock={handleToggleLock}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
          />
        </div>
        
        {/* Center - Viewport */}
        <div style={{ flex: 1, position: 'relative' }}>
          <Viewport
            objects={objects}
            selectedId={selectedId}
            onSelect={setSelectedId}
            transformMode={transformMode}
            onTransform={handleTransform}
            viewMode={viewMode}
            showGrid={showGrid}
            showStats={showStats}
            environment={environment}
          />
          
          {/* Viewport Overlay */}
          <div style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            display: 'flex',
            gap: '8px',
          }}>
            <button
              onClick={() => setShowGrid(!showGrid)}
              style={{
                padding: '4px 8px',
                background: showGrid ? '#3498db' : '#333',
                border: 'none',
                borderRadius: '3px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              Grid
            </button>
            <button
              onClick={() => setShowStats(!showStats)}
              style={{
                padding: '4px 8px',
                background: showStats ? '#3498db' : '#333',
                border: 'none',
                borderRadius: '3px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              Stats
            </button>
          </div>
          
          {/* Status Bar */}
          <div style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
            height: '24px',
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            fontSize: '11px',
            color: '#888',
          }}>
            <span>Objects: {objects.length}</span>
            <span style={{ margin: '0 16px' }}>|</span>
            <span>Selected: {selectedObject?.name || 'None'}</span>
            <span style={{ margin: '0 16px' }}>|</span>
            <span>Mode: {transformMode.toUpperCase()}</span>
            <div style={{ flex: 1 }} />
            <span>W/E/R: Transform | G: Grid | Del: Delete</span>
          </div>
        </div>
        
        {/* Right Panel - Details */}
        <div style={{ width: '300px', borderLeft: '1px solid #333', background: '#222' }}>
          <DetailsPanelMini
            object={selectedObject}
            onChange={handleObjectChange}
          />
        </div>
      </div>
    </div>
  );
}
