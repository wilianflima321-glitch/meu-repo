'use client';

/**
 * SharedViewport3D - Viewport 3D Reutilizável
 * 
 * Componente ÚNICO de viewport 3D usado por TODOS os editores.
 * Evita duplicação de código e garante consistência.
 * 
 * Features:
 * - OrbitControls configuráveis
 * - TransformControls integrado
 * - Grid e helpers
 * - Gizmo de navegação
 * - Suporte a múltiplos modos de visualização
 * - Performance otimizada
 */

import React, { useRef, useState, useCallback, useEffect, Suspense } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { 
  OrbitControls, 
  TransformControls, 
  GizmoHelper, 
  GizmoViewport, 
  Grid,
  Environment,
  ContactShadows,
  Stats,
  PerspectiveCamera,
  OrthographicCamera,
  Html,
} from '@react-three/drei';
import * as THREE from 'three';

// ============================================================================
// TYPES
// ============================================================================

export type ViewportMode = 'perspective' | 'top' | 'front' | 'right' | 'ortho';
export type TransformMode = 'translate' | 'rotate' | 'scale';
export type RenderMode = 'lit' | 'unlit' | 'wireframe' | 'normals' | 'uv';

export interface ViewportSettings {
  mode: ViewportMode;
  transformMode: TransformMode;
  renderMode: RenderMode;
  showGrid: boolean;
  showGizmo: boolean;
  showStats: boolean;
  showShadows: boolean;
  backgroundColor: string;
  gridSize: number;
  gridDivisions: number;
  enablePostProcessing: boolean;
}

export interface ViewportObject {
  id: string;
  name: string;
  type: 'mesh' | 'light' | 'camera' | 'empty' | 'group';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  visible: boolean;
  geometry?: 'box' | 'sphere' | 'cylinder' | 'plane' | 'cone' | 'torus' | 'custom';
  color?: string;
  castShadow?: boolean;
  receiveShadow?: boolean;
  children?: ViewportObject[];
}

export interface SharedViewportProps {
  objects?: ViewportObject[];
  selectedId?: string;
  onSelect?: (id: string | null) => void;
  onTransform?: (id: string, transform: { position?: [number, number, number]; rotation?: [number, number, number]; scale?: [number, number, number] }) => void;
  settings?: Partial<ViewportSettings>;
  onSettingsChange?: (settings: ViewportSettings) => void;
  customContent?: React.ReactNode;
  className?: string;
}

// ============================================================================
// DEFAULT SETTINGS
// ============================================================================

const DEFAULT_SETTINGS: ViewportSettings = {
  mode: 'perspective',
  transformMode: 'translate',
  renderMode: 'lit',
  showGrid: true,
  showGizmo: true,
  showStats: false,
  showShadows: true,
  backgroundColor: '#1a1a2e',
  gridSize: 20,
  gridDivisions: 20,
  enablePostProcessing: false,
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

// Camera controller for different view modes
const CameraController: React.FC<{ mode: ViewportMode }> = ({ mode }) => {
  const { camera } = useThree();
  
  useEffect(() => {
    switch (mode) {
      case 'top':
        camera.position.set(0, 20, 0);
        camera.lookAt(0, 0, 0);
        break;
      case 'front':
        camera.position.set(0, 5, 20);
        camera.lookAt(0, 0, 0);
        break;
      case 'right':
        camera.position.set(20, 5, 0);
        camera.lookAt(0, 0, 0);
        break;
      case 'perspective':
      default:
        camera.position.set(10, 10, 10);
        camera.lookAt(0, 0, 0);
        break;
    }
  }, [mode, camera]);

  return null;
};

// Render object based on geometry type
const RenderObject: React.FC<{
  object: ViewportObject;
  isSelected: boolean;
  onClick: () => void;
  renderMode: RenderMode;
}> = ({ object, isSelected, onClick, renderMode }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  if (!object.visible) return null;

  const getGeometry = () => {
    switch (object.geometry) {
      case 'sphere': return <sphereGeometry args={[0.5, 32, 32]} />;
      case 'cylinder': return <cylinderGeometry args={[0.5, 0.5, 1, 32]} />;
      case 'plane': return <planeGeometry args={[1, 1]} />;
      case 'cone': return <coneGeometry args={[0.5, 1, 32]} />;
      case 'torus': return <torusGeometry args={[0.5, 0.2, 16, 32]} />;
      case 'box':
      default: return <boxGeometry args={[1, 1, 1]} />;
    }
  };

  const getMaterial = () => {
    const color = object.color || '#4080ff';
    
    switch (renderMode) {
      case 'wireframe':
        return <meshBasicMaterial color={color} wireframe />;
      case 'unlit':
        return <meshBasicMaterial color={color} />;
      case 'normals':
        return <meshNormalMaterial />;
      default:
        return <meshStandardMaterial color={color} />;
    }
  };

  if (object.type === 'light') {
    return (
      <group position={object.position}>
        <pointLight intensity={1} distance={10} />
        <mesh onClick={onClick}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshBasicMaterial color="#ffff00" />
        </mesh>
        {isSelected && (
          <mesh>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshBasicMaterial color="#ffffff" wireframe />
          </mesh>
        )}
      </group>
    );
  }

  if (object.type === 'camera') {
    return (
      <group position={object.position} rotation={object.rotation.map(r => r * Math.PI / 180) as [number, number, number]}>
        <mesh onClick={onClick}>
          <coneGeometry args={[0.3, 0.5, 4]} />
          <meshBasicMaterial color="#00ffff" wireframe />
        </mesh>
      </group>
    );
  }

  return (
    <mesh
      ref={meshRef}
      position={object.position}
      rotation={object.rotation.map(r => r * Math.PI / 180) as [number, number, number]}
      scale={object.scale}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      castShadow={object.castShadow}
      receiveShadow={object.receiveShadow}
    >
      {getGeometry()}
      {getMaterial()}
      
      {/* Selection outline */}
      {isSelected && (
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(1.05, 1.05, 1.05)]} />
          <lineBasicMaterial color="#ff9900" linewidth={2} />
        </lineSegments>
      )}
    </mesh>
  );
};

// Transform controls wrapper
const TransformControlsWrapper: React.FC<{
  targetRef: React.RefObject<THREE.Object3D>;
  mode: TransformMode;
  enabled: boolean;
  onDragEnd?: () => void;
}> = ({ targetRef, mode, enabled, onDragEnd }) => {
  if (!enabled || !targetRef.current) return null;
  
  return (
    <TransformControls 
      object={targetRef.current}
      mode={mode}
      onMouseUp={onDragEnd}
    />
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SharedViewport3D({
  objects = [],
  selectedId,
  onSelect,
  onTransform,
  settings: propSettings,
  onSettingsChange,
  customContent,
  className = '',
}: SharedViewportProps) {
  const [settings, setSettings] = useState<ViewportSettings>({
    ...DEFAULT_SETTINGS,
    ...propSettings,
  });

  const selectedRef = useRef<THREE.Object3D>(null);

  // Update settings when props change
  useEffect(() => {
    if (propSettings) {
      setSettings(s => ({ ...s, ...propSettings }));
    }
  }, [propSettings]);

  // Handle settings change
  const updateSettings = useCallback((updates: Partial<ViewportSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    onSettingsChange?.(newSettings);
  }, [settings, onSettingsChange]);

  // Handle deselection when clicking on empty space
  const handlePointerMissed = useCallback(() => {
    onSelect?.(null);
  }, [onSelect]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <Canvas
        shadows={settings.showShadows}
        camera={{ position: [10, 10, 10], fov: 50 }}
        onPointerMissed={handlePointerMissed}
        gl={{ antialias: true, alpha: false }}
        style={{ background: settings.backgroundColor }}
      >
        <Suspense fallback={null}>
          {/* Camera Controller */}
          <CameraController mode={settings.mode} />
          
          {/* Orbit Controls */}
          <OrbitControls 
            makeDefault 
            enableDamping 
            dampingFactor={0.1}
          />
          
          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[10, 20, 10]}
            intensity={1}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          
          {/* Environment */}
          <Environment preset="city" background={false} />
          
          {/* Grid */}
          {settings.showGrid && (
            <Grid
              args={[settings.gridSize, settings.gridDivisions]}
              position={[0, 0, 0]}
              cellSize={1}
              cellThickness={0.5}
              cellColor="#3f3f46"
              sectionSize={5}
              sectionThickness={1}
              sectionColor="#52525b"
              fadeDistance={30}
              fadeStrength={1}
              followCamera={false}
            />
          )}
          
          {/* Contact Shadows */}
          {settings.showShadows && (
            <ContactShadows
              position={[0, 0, 0]}
              opacity={0.4}
              scale={20}
              blur={2}
              far={4}
            />
          )}
          
          {/* Render Objects */}
          {objects.map(obj => (
            <RenderObject
              key={obj.id}
              object={obj}
              isSelected={selectedId === obj.id}
              onClick={() => onSelect?.(obj.id)}
              renderMode={settings.renderMode}
            />
          ))}
          
          {/* Custom Content (for editor-specific elements) */}
          {customContent}
          
          {/* Gizmo Helper */}
          {settings.showGizmo && (
            <GizmoHelper alignment="top-right" margin={[80, 80]}>
              <GizmoViewport 
                axisColors={['#ff4444', '#44ff44', '#4444ff']} 
                labelColor="white"
              />
            </GizmoHelper>
          )}
          
          {/* Stats */}
          {settings.showStats && <Stats />}
        </Suspense>
      </Canvas>

      {/* Viewport Toolbar */}
      <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded px-2 py-1">
        {/* View Mode */}
        <select
          value={settings.mode}
          onChange={(e) => updateSettings({ mode: e.target.value as ViewportMode })}
          className="bg-transparent text-white text-xs px-2 py-1 rounded border border-white/20"
        >
          <option value="perspective">Perspective</option>
          <option value="top">Top</option>
          <option value="front">Front</option>
          <option value="right">Right</option>
          <option value="ortho">Orthographic</option>
        </select>
        
        <div className="w-px h-4 bg-white/20 mx-1" />
        
        {/* Render Mode */}
        <select
          value={settings.renderMode}
          onChange={(e) => updateSettings({ renderMode: e.target.value as RenderMode })}
          className="bg-transparent text-white text-xs px-2 py-1 rounded border border-white/20"
        >
          <option value="lit">Lit</option>
          <option value="unlit">Unlit</option>
          <option value="wireframe">Wireframe</option>
          <option value="normals">Normals</option>
        </select>
        
        <div className="w-px h-4 bg-white/20 mx-1" />
        
        {/* Toggle buttons */}
        <button
          onClick={() => updateSettings({ showGrid: !settings.showGrid })}
          className={`p-1 rounded ${settings.showGrid ? 'bg-blue-500' : 'bg-white/10'}`}
          title="Toggle Grid"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 9h16M4 15h16M9 4v16M15 4v16" />
          </svg>
        </button>
        
        <button
          onClick={() => updateSettings({ showStats: !settings.showStats })}
          className={`p-1 rounded ${settings.showStats ? 'bg-blue-500' : 'bg-white/10'}`}
          title="Toggle Stats"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </button>
      </div>

      {/* Selection Info */}
      {selectedId && (
        <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm rounded px-3 py-2">
          <p className="text-white text-xs">
            Selected: <span className="text-blue-400">{objects.find(o => o.id === selectedId)?.name || selectedId}</span>
          </p>
        </div>
      )}

      {/* Viewport Info */}
      <div className="absolute bottom-2 right-2 text-white/50 text-xs">
        <span>{settings.mode} | {settings.renderMode} | Objects: {objects.length}</span>
      </div>
    </div>
  );
}

export default SharedViewport3D;
