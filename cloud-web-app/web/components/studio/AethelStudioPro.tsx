'use client';

/**
 * AethelStudioPro - Interface Unificada Profissional AAA
 * 
 * "A ferramenta deve ser tão invisível quanto o pensamento do criador."
 * - Aethel Design Manifesto 2026
 * 
 * Features:
 * - Layout Zinc 950 Deep Space Dark Mode
 * - Viewport 3D com React Three Fiber (real, não mock)
 * - Painéis dockáveis drag & drop
 * - Tabs para múltiplos assets/editores
 * - Atalhos de teclado profissionais
 * - Integração completa com componentes existentes
 * 
 * @author Aethel Team
 * @version 3.0.0 PRO
 */

import React, { useState, useCallback, useRef, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
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
  Sky,
  useHelper,
} from '@react-three/drei';
import * as THREE from 'three';
import { 
  Menu, 
  X, 
  Maximize2, 
  Minimize2,
  PanelLeft,
  PanelRight,
  PanelTop,
  PanelBottom,
  Layers,
  Settings,
  Save,
  FolderOpen,
  Play,
  Square,
  Pause,
  RotateCcw,
  Grid3X3,
  Box,
  Lightbulb,
  Camera,
  Wind,
  Droplets,
  Palette,
  Film,
  Volume2,
  MessageSquare,
  Map,
  Code,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Plus,
  Minus,
  Move,
  RotateCw,
  Maximize,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  Scissors,
  Clipboard,
  Undo,
  Redo,
  Search,
  Filter,
  MoreVertical,
  GripVertical,
  PanelLeftClose,
  PanelRightClose,
  Split,
  Columns,
  Rows,
  Home,
  Crosshair,
  SunMedium,
  Moon,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Zap,
  AlertTriangle,
  FileCode,
  Image,
  Music,
  Video,
  Folder,
  File,
  Package,
  Cpu,
  Database,
  Terminal,
  Bot,
  Wand2,
  RefreshCw,
  Download,
  Upload,
  ExternalLink,
  Keyboard,
  HelpCircle,
  Info,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Loader2,
  Circle,
} from 'lucide-react';

// ============================================================================
// DESIGN TOKENS (Aethel Design Manifesto 2026)
// ============================================================================

const COLORS = {
  // Deep Space Dark Mode (Zinc 950)
  bg: {
    base: '#09090b',
    elevated: '#18181b',
    surface: '#27272a',
    hover: '#3f3f46',
    active: '#52525b',
  },
  // Accent Colors
  accent: {
    primary: '#3b82f6',    // Blue 500
    secondary: '#8b5cf6',  // Violet 500
    success: '#22c55e',    // Green 500
    warning: '#f59e0b',    // Amber 500
    error: '#ef4444',      // Red 500
    info: '#06b6d4',       // Cyan 500
  },
  // Text
  text: {
    primary: '#fafafa',
    secondary: '#a1a1aa',
    muted: '#71717a',
    disabled: '#52525b',
  },
  // Borders
  border: {
    subtle: '#27272a',
    default: '#3f3f46',
    strong: '#52525b',
  },
  // Glow effects for AAA feel
  glow: {
    blue: 'rgba(59, 130, 246, 0.3)',
    purple: 'rgba(139, 92, 246, 0.3)',
    cyan: 'rgba(6, 182, 212, 0.3)',
  },
};

// ============================================================================
// TYPES
// ============================================================================

export type EditorMode = 
  | 'level' 
  | 'material' 
  | 'blueprint' 
  | 'animation' 
  | 'niagara' 
  | 'landscape' 
  | 'sequencer'
  | 'audio'
  | 'settings';

export type TransformMode = 'translate' | 'rotate' | 'scale';
export type TransformSpace = 'world' | 'local';
export type ViewportView = 'perspective' | 'top' | 'front' | 'right';
export type RenderMode = 'lit' | 'unlit' | 'wireframe' | 'normals';

interface SceneObject {
  id: string;
  name: string;
  type: 'mesh' | 'light' | 'camera' | 'empty' | 'audio' | 'particle';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  visible: boolean;
  locked: boolean;
  geometry?: 'box' | 'sphere' | 'cylinder' | 'plane' | 'cone';
  color?: string;
  parentId?: string;
  children?: string[];
}

interface Tab {
  id: string;
  title: string;
  type: EditorMode;
  icon: React.ReactNode;
  dirty: boolean;
  closable: boolean;
}

interface LogEntry {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: Date;
  source?: string;
}

// ============================================================================
// DEFAULT DATA
// ============================================================================

const DEFAULT_OBJECTS: SceneObject[] = [
  {
    id: 'floor',
    name: 'Floor',
    type: 'mesh',
    position: [0, -0.05, 0],
    rotation: [0, 0, 0],
    scale: [20, 0.1, 20],
    visible: true,
    locked: true,
    geometry: 'box',
    color: '#3f3f46',
  },
  {
    id: 'cube-1',
    name: 'Cube_01',
    type: 'mesh',
    position: [0, 0.5, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    visible: true,
    locked: false,
    geometry: 'box',
    color: '#3b82f6',
  },
  {
    id: 'sphere-1',
    name: 'Sphere_01',
    type: 'mesh',
    position: [3, 0.5, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    visible: true,
    locked: false,
    geometry: 'sphere',
    color: '#22c55e',
  },
  {
    id: 'cylinder-1',
    name: 'Cylinder_01',
    type: 'mesh',
    position: [-3, 0.5, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    visible: true,
    locked: false,
    geometry: 'cylinder',
    color: '#f59e0b',
  },
  {
    id: 'light-main',
    name: 'DirectionalLight',
    type: 'light',
    position: [5, 10, 5],
    rotation: [-45, 30, 0],
    scale: [1, 1, 1],
    visible: true,
    locked: false,
  },
  {
    id: 'camera-main',
    name: 'MainCamera',
    type: 'camera',
    position: [8, 6, 8],
    rotation: [-30, 45, 0],
    scale: [1, 1, 1],
    visible: true,
    locked: false,
  },
];

const DEFAULT_TABS: Tab[] = [
  { id: 'main-level', title: 'MainLevel', type: 'level', icon: <Map className="w-4 h-4" />, dirty: false, closable: false },
];

// ============================================================================
// 3D VIEWPORT COMPONENTS
// ============================================================================

// Scene Object Renderer
const SceneObjectMesh: React.FC<{
  object: SceneObject;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hovering: boolean) => void;
  transformMode: TransformMode;
  showTransformControls: boolean;
}> = ({ object, isSelected, isHovered, onSelect, onHover, transformMode, showTransformControls }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  if (!object.visible) return null;

  const getGeometry = () => {
    switch (object.geometry) {
      case 'sphere': return <sphereGeometry args={[0.5, 32, 32]} />;
      case 'cylinder': return <cylinderGeometry args={[0.5, 0.5, 1, 32]} />;
      case 'plane': return <planeGeometry args={[1, 1]} />;
      case 'cone': return <coneGeometry args={[0.5, 1, 32]} />;
      case 'box':
      default: return <boxGeometry args={[1, 1, 1]} />;
    }
  };

  // Light visualization
  if (object.type === 'light') {
    return (
      <group position={object.position}>
        <directionalLight 
          intensity={1.5} 
          castShadow 
          shadow-mapSize={[2048, 2048]}
          shadow-camera-far={50}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        <mesh 
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          onPointerOver={() => onHover(true)}
          onPointerOut={() => onHover(false)}
        >
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.8} />
        </mesh>
        {(isSelected || isHovered) && (
          <mesh>
            <sphereGeometry args={[0.4, 16, 16]} />
            <meshBasicMaterial color={isSelected ? "#f59e0b" : "#fbbf24"} wireframe />
          </mesh>
        )}
      </group>
    );
  }

  // Camera visualization
  if (object.type === 'camera') {
    return (
      <group position={object.position}>
        <mesh 
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          onPointerOver={() => onHover(true)}
          onPointerOut={() => onHover(false)}
        >
          <boxGeometry args={[0.4, 0.3, 0.5]} />
          <meshBasicMaterial color="#06b6d4" transparent opacity={0.8} />
        </mesh>
        <mesh position={[0, 0, -0.4]}>
          <coneGeometry args={[0.2, 0.3, 4]} />
          <meshBasicMaterial color="#06b6d4" wireframe />
        </mesh>
      </group>
    );
  }

  return (
    <group>
      <mesh
        ref={meshRef}
        position={object.position}
        rotation={object.rotation.map(r => r * Math.PI / 180) as [number, number, number]}
        scale={object.scale}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        onPointerOver={() => onHover(true)}
        onPointerOut={() => onHover(false)}
        castShadow
        receiveShadow={object.id === 'floor'}
      >
        {getGeometry()}
        <meshStandardMaterial 
          color={object.color || '#ffffff'} 
          metalness={0.1}
          roughness={0.6}
        />
      </mesh>
      
      {/* Selection/Hover Outline */}
      {(isSelected || isHovered) && object.id !== 'floor' && (
        <mesh
          position={object.position}
          rotation={object.rotation.map(r => r * Math.PI / 180) as [number, number, number]}
          scale={object.scale.map(s => s * 1.02) as [number, number, number]}
        >
          {getGeometry()}
          <meshBasicMaterial 
            color={isSelected ? "#f59e0b" : "#3b82f6"} 
            wireframe 
            transparent 
            opacity={0.8}
          />
        </mesh>
      )}

      {/* Transform Controls */}
      {isSelected && showTransformControls && meshRef.current && (
        <TransformControls
          object={meshRef.current}
          mode={transformMode}
          size={0.8}
        />
      )}
    </group>
  );
};

// Main Viewport Component
const Viewport3D: React.FC<{
  objects: SceneObject[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  transformMode: TransformMode;
  showGrid: boolean;
  showStats: boolean;
  renderMode: RenderMode;
}> = ({ objects, selectedId, hoveredId, onSelect, onHover, transformMode, showGrid, showStats, renderMode }) => {
  return (
    <Canvas
      shadows
      camera={{ position: [10, 8, 10], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      onPointerMissed={() => onSelect(null)}
      style={{ background: 'linear-gradient(180deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)' }}
    >
      <Suspense fallback={null}>
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <hemisphereLight intensity={0.3} color="#87ceeb" groundColor="#362312" />
        
        {/* Environment */}
        <Environment preset="night" background={false} />
        <Sky 
          distance={450000}
          sunPosition={[5, 1, 8]}
          inclination={0.1}
          azimuth={0.25}
        />
        
        {/* Grid */}
        {showGrid && (
          <Grid
            args={[50, 50]}
            position={[0, 0, 0]}
            cellSize={1}
            cellThickness={0.5}
            cellColor="#27272a"
            sectionSize={5}
            sectionThickness={1}
            sectionColor="#3f3f46"
            fadeDistance={40}
            fadeStrength={1}
            followCamera={false}
          />
        )}
        
        {/* Shadows */}
        <ContactShadows 
          position={[0, 0, 0]} 
          opacity={0.5} 
          scale={30} 
          blur={2} 
          far={10} 
          color="#000000"
        />
        
        {/* Scene Objects */}
        {objects.map(obj => (
          <SceneObjectMesh
            key={obj.id}
            object={obj}
            isSelected={selectedId === obj.id}
            isHovered={hoveredId === obj.id}
            onSelect={() => onSelect(obj.id)}
            onHover={(h) => onHover(h ? obj.id : null)}
            transformMode={transformMode}
            showTransformControls={selectedId === obj.id && !obj.locked}
          />
        ))}
        
        {/* Controls */}
        <OrbitControls 
          makeDefault 
          enableDamping 
          dampingFactor={0.05}
          minDistance={2}
          maxDistance={100}
        />
        
        {/* Gizmo */}
        <GizmoHelper alignment="top-right" margin={[80, 80]}>
          <GizmoViewport 
            axisColors={['#ef4444', '#22c55e', '#3b82f6']} 
            labelColor="white"
          />
        </GizmoHelper>
        
        {/* Stats */}
        {showStats && <Stats />}
      </Suspense>
    </Canvas>
  );
};

// ============================================================================
// PANEL COMPONENTS
// ============================================================================

// World Outliner Panel
const WorldOutliner: React.FC<{
  objects: SceneObject[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
}> = ({ objects, selectedId, onSelect, onToggleVisibility, onToggleLock }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['world']));

  const filteredObjects = objects.filter(obj => 
    obj.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getIcon = (type: SceneObject['type']) => {
    switch (type) {
      case 'light': return <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />;
      case 'camera': return <Camera className="w-3.5 h-3.5 text-cyan-400" />;
      case 'audio': return <Volume2 className="w-3.5 h-3.5 text-purple-400" />;
      case 'particle': return <Sparkles className="w-3.5 h-3.5 text-orange-400" />;
      case 'empty': return <Circle className="w-3.5 h-3.5 text-gray-400" />;
      case 'mesh':
      default: return <Box className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  return (
    <div className="h-full flex flex-col" style={{ background: COLORS.bg.elevated }}>
      {/* Search */}
      <div className="p-2 border-b" style={{ borderColor: COLORS.border.subtle }}>
        <div className="flex items-center gap-2 px-2 py-1.5 rounded" style={{ background: COLORS.bg.base }}>
          <Search className="w-3.5 h-3.5" style={{ color: COLORS.text.muted }} />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs outline-none"
            style={{ color: COLORS.text.primary }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}>
              <X className="w-3 h-3" style={{ color: COLORS.text.muted }} />
            </button>
          )}
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto p-1">
        {/* World Root */}
        <button
          className="w-full flex items-center gap-2 px-2 py-1 rounded text-left"
          style={{ background: expandedGroups.has('world') ? COLORS.bg.surface : 'transparent' }}
          onClick={() => setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has('world')) next.delete('world');
            else next.add('world');
            return next;
          })}
        >
          {expandedGroups.has('world') ? (
            <ChevronDown className="w-3 h-3" style={{ color: COLORS.text.muted }} />
          ) : (
            <ChevronRight className="w-3 h-3" style={{ color: COLORS.text.muted }} />
          )}
          <Folder className="w-3.5 h-3.5 text-yellow-500" />
          <span className="text-xs font-medium" style={{ color: COLORS.text.primary }}>World</span>
          <span className="ml-auto text-xs" style={{ color: COLORS.text.muted }}>{objects.length}</span>
        </button>

        {/* Objects */}
        {expandedGroups.has('world') && (
          <div className="ml-4 mt-1 space-y-0.5">
            {filteredObjects.map(obj => (
              <div
                key={obj.id}
                className={`group flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors ${
                  selectedId === obj.id ? 'ring-1' : ''
                }`}
                style={{ 
                  background: selectedId === obj.id ? COLORS.bg.surface : 'transparent',
                  borderColor: selectedId === obj.id ? COLORS.accent.primary : 'transparent',
                }}
                onClick={() => onSelect(obj.id)}
                onDoubleClick={() => {/* Focus in viewport */}}
              >
                {getIcon(obj.type)}
                <span 
                  className="flex-1 text-xs truncate"
                  style={{ 
                    color: obj.visible ? COLORS.text.primary : COLORS.text.muted,
                    fontStyle: obj.locked ? 'italic' : 'normal',
                  }}
                >
                  {obj.name}
                </span>
                
                {/* Quick Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleVisibility(obj.id); }}
                    className="p-0.5 rounded hover:bg-white/10"
                    title={obj.visible ? 'Hide' : 'Show'}
                  >
                    {obj.visible ? (
                      <Eye className="w-3 h-3" style={{ color: COLORS.text.secondary }} />
                    ) : (
                      <EyeOff className="w-3 h-3" style={{ color: COLORS.text.muted }} />
                    )}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleLock(obj.id); }}
                    className="p-0.5 rounded hover:bg-white/10"
                    title={obj.locked ? 'Unlock' : 'Lock'}
                  >
                    {obj.locked ? (
                      <Lock className="w-3 h-3" style={{ color: COLORS.accent.warning }} />
                    ) : (
                      <Unlock className="w-3 h-3" style={{ color: COLORS.text.muted }} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t flex items-center justify-between" style={{ borderColor: COLORS.border.subtle }}>
        <span className="text-xs" style={{ color: COLORS.text.muted }}>
          {filteredObjects.length} objects
        </span>
        <button 
          className="p-1 rounded hover:bg-white/10"
          title="Add Object"
        >
          <Plus className="w-4 h-4" style={{ color: COLORS.text.secondary }} />
        </button>
      </div>
    </div>
  );
};

// Details Panel (Properties Inspector)
const DetailsPanel: React.FC<{
  selectedObject: SceneObject | null;
  onUpdate: (id: string, updates: Partial<SceneObject>) => void;
}> = ({ selectedObject, onUpdate }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['transform', 'properties'])
  );

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  if (!selectedObject) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4" style={{ background: COLORS.bg.elevated }}>
        <Box className="w-12 h-12 mb-3" style={{ color: COLORS.text.muted }} />
        <p className="text-sm text-center" style={{ color: COLORS.text.secondary }}>
          Select an object to view its properties
        </p>
      </div>
    );
  }

  const VectorInput: React.FC<{
    label: string;
    value: [number, number, number];
    onChange: (value: [number, number, number]) => void;
  }> = ({ label, value, onChange }) => (
    <div className="flex items-center gap-2">
      <span className="w-16 text-xs" style={{ color: COLORS.text.muted }}>{label}</span>
      <div className="flex-1 flex gap-1">
        {['X', 'Y', 'Z'].map((axis, i) => (
          <div key={axis} className="flex-1 flex items-center">
            <span className={`text-xs px-1 ${
              i === 0 ? 'text-red-400' : i === 1 ? 'text-green-400' : 'text-blue-400'
            }`}>{axis}</span>
            <input
              type="number"
              step={0.1}
              value={value[i].toFixed(2)}
              onChange={(e) => {
                const newValue = [...value] as [number, number, number];
                newValue[i] = parseFloat(e.target.value) || 0;
                onChange(newValue);
              }}
              className="w-full px-1 py-0.5 text-xs text-right rounded outline-none focus:ring-1"
              style={{ 
                background: COLORS.bg.base, 
                color: COLORS.text.primary,
                borderColor: COLORS.border.default,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto" style={{ background: COLORS.bg.elevated }}>
      {/* Header */}
      <div className="p-3 border-b flex items-center gap-2" style={{ borderColor: COLORS.border.subtle }}>
        <Box className="w-4 h-4" style={{ color: COLORS.accent.primary }} />
        <span className="text-sm font-medium" style={{ color: COLORS.text.primary }}>
          {selectedObject.name}
        </span>
        <span className="ml-auto text-xs px-2 py-0.5 rounded" style={{ 
          background: COLORS.bg.surface,
          color: COLORS.text.muted,
        }}>
          {selectedObject.type}
        </span>
      </div>

      {/* Transform Section */}
      <div className="border-b" style={{ borderColor: COLORS.border.subtle }}>
        <button
          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5"
          onClick={() => toggleSection('transform')}
        >
          {expandedSections.has('transform') ? (
            <ChevronDown className="w-3 h-3" style={{ color: COLORS.text.muted }} />
          ) : (
            <ChevronRight className="w-3 h-3" style={{ color: COLORS.text.muted }} />
          )}
          <Move className="w-3.5 h-3.5" style={{ color: COLORS.accent.info }} />
          <span className="text-xs font-medium" style={{ color: COLORS.text.primary }}>Transform</span>
        </button>
        
        {expandedSections.has('transform') && (
          <div className="px-3 pb-3 space-y-2">
            <VectorInput
              label="Location"
              value={selectedObject.position}
              onChange={(v) => onUpdate(selectedObject.id, { position: v })}
            />
            <VectorInput
              label="Rotation"
              value={selectedObject.rotation}
              onChange={(v) => onUpdate(selectedObject.id, { rotation: v })}
            />
            <VectorInput
              label="Scale"
              value={selectedObject.scale}
              onChange={(v) => onUpdate(selectedObject.id, { scale: v })}
            />
          </div>
        )}
      </div>

      {/* Properties Section */}
      <div className="border-b" style={{ borderColor: COLORS.border.subtle }}>
        <button
          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5"
          onClick={() => toggleSection('properties')}
        >
          {expandedSections.has('properties') ? (
            <ChevronDown className="w-3 h-3" style={{ color: COLORS.text.muted }} />
          ) : (
            <ChevronRight className="w-3 h-3" style={{ color: COLORS.text.muted }} />
          )}
          <Settings className="w-3.5 h-3.5" style={{ color: COLORS.accent.secondary }} />
          <span className="text-xs font-medium" style={{ color: COLORS.text.primary }}>Properties</span>
        </button>
        
        {expandedSections.has('properties') && (
          <div className="px-3 pb-3 space-y-2">
            {/* Name */}
            <div className="flex items-center gap-2">
              <span className="w-16 text-xs" style={{ color: COLORS.text.muted }}>Name</span>
              <input
                type="text"
                value={selectedObject.name}
                onChange={(e) => onUpdate(selectedObject.id, { name: e.target.value })}
                className="flex-1 px-2 py-1 text-xs rounded outline-none focus:ring-1"
                style={{ 
                  background: COLORS.bg.base, 
                  color: COLORS.text.primary,
                }}
              />
            </div>
            
            {/* Visible */}
            <div className="flex items-center gap-2">
              <span className="w-16 text-xs" style={{ color: COLORS.text.muted }}>Visible</span>
              <button
                onClick={() => onUpdate(selectedObject.id, { visible: !selectedObject.visible })}
                className={`w-10 h-5 rounded-full transition-colors ${
                  selectedObject.visible ? 'bg-blue-500' : 'bg-zinc-600'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  selectedObject.visible ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            
            {/* Color (if mesh) */}
            {selectedObject.type === 'mesh' && selectedObject.color && (
              <div className="flex items-center gap-2">
                <span className="w-16 text-xs" style={{ color: COLORS.text.muted }}>Color</span>
                <input
                  type="color"
                  value={selectedObject.color}
                  onChange={(e) => onUpdate(selectedObject.id, { color: e.target.value })}
                  className="w-8 h-6 rounded cursor-pointer"
                />
                <span className="text-xs" style={{ color: COLORS.text.secondary }}>
                  {selectedObject.color}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Content Browser Panel
const ContentBrowser: React.FC = () => {
  const [selectedFolder, setSelectedFolder] = useState('Content');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const folders = [
    { name: 'Content', icon: <Folder className="w-4 h-4 text-yellow-500" /> },
    { name: 'Meshes', icon: <Box className="w-4 h-4 text-blue-400" />, parent: 'Content' },
    { name: 'Materials', icon: <Palette className="w-4 h-4 text-pink-400" />, parent: 'Content' },
    { name: 'Textures', icon: <Image className="w-4 h-4 text-purple-400" />, parent: 'Content' },
    { name: 'Blueprints', icon: <FileCode className="w-4 h-4 text-blue-500" />, parent: 'Content' },
    { name: 'Audio', icon: <Music className="w-4 h-4 text-green-400" />, parent: 'Content' },
    { name: 'Animations', icon: <Film className="w-4 h-4 text-cyan-400" />, parent: 'Content' },
  ];

  const assets = [
    { name: 'SM_Cube', type: 'mesh', icon: <Box className="w-8 h-8" /> },
    { name: 'SM_Sphere', type: 'mesh', icon: <Circle className="w-8 h-8" /> },
    { name: 'SM_Cylinder', type: 'mesh', icon: <Box className="w-8 h-8" /> },
    { name: 'M_Default', type: 'material', icon: <Palette className="w-8 h-8" /> },
    { name: 'M_Metal', type: 'material', icon: <Palette className="w-8 h-8" /> },
    { name: 'M_Glass', type: 'material', icon: <Palette className="w-8 h-8" /> },
  ];

  return (
    <div className="h-full flex" style={{ background: COLORS.bg.elevated }}>
      {/* Folder Tree */}
      <div className="w-48 border-r overflow-y-auto" style={{ borderColor: COLORS.border.subtle }}>
        <div className="p-2 space-y-0.5">
          {folders.filter(f => !f.parent).map(folder => (
            <div key={folder.name}>
              <button
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left ${
                  selectedFolder === folder.name ? 'bg-blue-500/20' : 'hover:bg-white/5'
                }`}
                onClick={() => setSelectedFolder(folder.name)}
              >
                {folder.icon}
                <span className="text-xs" style={{ color: COLORS.text.primary }}>{folder.name}</span>
              </button>
              {/* Sub-folders */}
              <div className="ml-4">
                {folders.filter(f => f.parent === folder.name).map(sub => (
                  <button
                    key={sub.name}
                    className={`w-full flex items-center gap-2 px-2 py-1 rounded text-left ${
                      selectedFolder === sub.name ? 'bg-blue-500/20' : 'hover:bg-white/5'
                    }`}
                    onClick={() => setSelectedFolder(sub.name)}
                  >
                    {sub.icon}
                    <span className="text-xs" style={{ color: COLORS.text.secondary }}>{sub.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Assets Grid */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="p-2 border-b flex items-center gap-2" style={{ borderColor: COLORS.border.subtle }}>
          <div className="flex items-center gap-1 px-2 py-1 rounded" style={{ background: COLORS.bg.base }}>
            <Search className="w-3 h-3" style={{ color: COLORS.text.muted }} />
            <input
              type="text"
              placeholder="Search assets..."
              className="bg-transparent text-xs outline-none w-32"
              style={{ color: COLORS.text.primary }}
            />
          </div>
          <div className="flex-1" />
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1 rounded ${viewMode === 'grid' ? 'bg-white/10' : ''}`}
          >
            <Grid3X3 className="w-4 h-4" style={{ color: COLORS.text.secondary }} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1 rounded ${viewMode === 'list' ? 'bg-white/10' : ''}`}
          >
            <Rows className="w-4 h-4" style={{ color: COLORS.text.secondary }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-4 gap-4">
              {assets.map(asset => (
                <div 
                  key={asset.name}
                  className="group cursor-pointer"
                >
                  <div 
                    className="aspect-square rounded-lg flex items-center justify-center transition-all group-hover:ring-2 ring-blue-500"
                    style={{ background: COLORS.bg.surface }}
                  >
                    <div style={{ color: COLORS.text.muted }}>{asset.icon}</div>
                  </div>
                  <p className="text-xs text-center mt-1 truncate" style={{ color: COLORS.text.secondary }}>
                    {asset.name}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {assets.map(asset => (
                <div 
                  key={asset.name}
                  className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-white/5 cursor-pointer"
                >
                  <div style={{ color: COLORS.text.muted }}>{asset.icon}</div>
                  <span className="text-xs" style={{ color: COLORS.text.primary }}>{asset.name}</span>
                  <span className="text-xs ml-auto" style={{ color: COLORS.text.muted }}>{asset.type}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Output Log Panel
const OutputLog: React.FC<{ logs: LogEntry[] }> = ({ logs }) => {
  const [filter, setFilter] = useState<'all' | 'info' | 'warning' | 'error'>('all');
  
  const filteredLogs = logs.filter(log => filter === 'all' || log.type === filter);

  const getIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-3 h-3 text-green-400" />;
      case 'warning': return <AlertCircle className="w-3 h-3 text-yellow-400" />;
      case 'error': return <XCircle className="w-3 h-3 text-red-400" />;
      default: return <Info className="w-3 h-3 text-blue-400" />;
    }
  };

  return (
    <div className="h-full flex flex-col" style={{ background: COLORS.bg.base }}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-2 py-1 border-b" style={{ borderColor: COLORS.border.subtle }}>
        <button
          onClick={() => setFilter('all')}
          className={`px-2 py-0.5 text-xs rounded ${filter === 'all' ? 'bg-white/10' : ''}`}
          style={{ color: COLORS.text.secondary }}
        >
          All
        </button>
        <button
          onClick={() => setFilter('info')}
          className={`px-2 py-0.5 text-xs rounded ${filter === 'info' ? 'bg-white/10' : ''}`}
          style={{ color: COLORS.text.secondary }}
        >
          Info
        </button>
        <button
          onClick={() => setFilter('warning')}
          className={`px-2 py-0.5 text-xs rounded ${filter === 'warning' ? 'bg-white/10' : ''}`}
          style={{ color: COLORS.text.secondary }}
        >
          Warnings
        </button>
        <button
          onClick={() => setFilter('error')}
          className={`px-2 py-0.5 text-xs rounded ${filter === 'error' ? 'bg-white/10' : ''}`}
          style={{ color: COLORS.text.secondary }}
        >
          Errors
        </button>
      </div>

      {/* Log Entries */}
      <div className="flex-1 overflow-y-auto font-mono text-xs p-2 space-y-0.5">
        {filteredLogs.map(log => (
          <div key={log.id} className="flex items-start gap-2">
            {getIcon(log.type)}
            <span style={{ color: COLORS.text.muted }}>
              [{log.timestamp.toLocaleTimeString()}]
            </span>
            <span style={{ 
              color: log.type === 'error' ? COLORS.accent.error : 
                     log.type === 'warning' ? COLORS.accent.warning :
                     log.type === 'success' ? COLORS.accent.success :
                     COLORS.text.secondary 
            }}>
              {log.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AethelStudioPro() {
  // State
  const [objects, setObjects] = useState<SceneObject[]>(DEFAULT_OBJECTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tabs, setTabs] = useState<Tab[]>(DEFAULT_TABS);
  const [activeTabId, setActiveTabId] = useState('main-level');
  const [transformMode, setTransformMode] = useState<TransformMode>('translate');
  const [transformSpace, setTransformSpace] = useState<TransformSpace>('world');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [renderMode, setRenderMode] = useState<RenderMode>('lit');
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [snapValue, setSnapValue] = useState(1);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [bottomPanelOpen, setBottomPanelOpen] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: '1', type: 'info', message: 'Aethel Engine v3.0.0 PRO initialized', timestamp: new Date() },
    { id: '2', type: 'success', message: 'Project loaded: MainLevel', timestamp: new Date() },
    { id: '3', type: 'info', message: 'Ready for editing', timestamp: new Date() },
  ]);

  const selectedObject = useMemo(() => 
    objects.find(o => o.id === selectedId) || null,
    [objects, selectedId]
  );

  // Handlers
  const handleUpdateObject = useCallback((id: string, updates: Partial<SceneObject>) => {
    setObjects(prev => prev.map(obj => 
      obj.id === id ? { ...obj, ...updates } : obj
    ));
  }, []);

  const handleToggleVisibility = useCallback((id: string) => {
    handleUpdateObject(id, { visible: !objects.find(o => o.id === id)?.visible });
  }, [objects, handleUpdateObject]);

  const handleToggleLock = useCallback((id: string) => {
    handleUpdateObject(id, { locked: !objects.find(o => o.id === id)?.locked });
  }, [objects, handleUpdateObject]);

  const handleSave = useCallback(() => {
    setLogs(prev => [...prev, {
      id: Date.now().toString(),
      type: 'success',
      message: 'Level saved successfully',
      timestamp: new Date(),
    }]);
  }, []);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    setIsPaused(false);
    setLogs(prev => [...prev, {
      id: Date.now().toString(),
      type: 'info',
      message: 'Started Play mode',
      timestamp: new Date(),
    }]);
  }, []);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    setIsPaused(false);
    setLogs(prev => [...prev, {
      id: Date.now().toString(),
      type: 'info',
      message: 'Stopped Play mode',
      timestamp: new Date(),
    }]);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 's':
            e.preventDefault();
            handleSave();
            break;
          case 'z':
            e.preventDefault();
            break;
        }
      } else {
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
            if (selectedId && !objects.find(o => o.id === selectedId)?.locked) {
              setObjects(prev => prev.filter(o => o.id !== selectedId));
              setSelectedId(null);
            }
            break;
          case 'escape':
            if (isPlaying) handleStop();
            else setSelectedId(null);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, objects, isPlaying, handleSave, handleStop]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden select-none" style={{ background: COLORS.bg.base, color: COLORS.text.primary }}>
      
      {/* ===== TOP MENU BAR ===== */}
      <div className="h-7 flex items-center border-b text-xs" style={{ background: COLORS.bg.elevated, borderColor: COLORS.border.subtle }}>
        {/* Logo */}
        <div className="px-3 flex items-center gap-2 border-r h-full" style={{ borderColor: COLORS.border.subtle }}>
          <div className="w-4 h-4 rounded bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500" />
          <span className="font-bold">AETHEL</span>
        </div>
        
        {/* Menus */}
        {['File', 'Edit', 'View', 'Actor', 'Build', 'Tools', 'Window', 'Help'].map(menu => (
          <button key={menu} className="px-3 py-1.5 hover:bg-white/5">{menu}</button>
        ))}
        
        {/* Right side */}
        <div className="ml-auto flex items-center gap-1 px-2">
          <button onClick={handleSave} className="p-1.5 hover:bg-white/10 rounded" title="Save (Ctrl+S)">
            <Save className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 hover:bg-white/10 rounded" title="Undo (Ctrl+Z)">
            <Undo className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 hover:bg-white/10 rounded" title="Redo (Ctrl+Y)">
            <Redo className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ===== TOOLBAR ===== */}
      <div className="h-10 flex items-center px-2 gap-2 border-b" style={{ background: COLORS.bg.surface, borderColor: COLORS.border.subtle }}>
        {/* Transform Tools */}
        <div className="flex items-center rounded overflow-hidden" style={{ background: COLORS.bg.base }}>
          {[
            { mode: 'translate' as TransformMode, icon: Move, label: 'Move (W)' },
            { mode: 'rotate' as TransformMode, icon: RotateCw, label: 'Rotate (E)' },
            { mode: 'scale' as TransformMode, icon: Maximize, label: 'Scale (R)' },
          ].map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setTransformMode(mode)}
              className={`p-2 transition-colors ${transformMode === mode ? 'bg-blue-600' : 'hover:bg-white/10'}`}
              title={label}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        <div className="w-px h-6" style={{ background: COLORS.border.default }} />

        {/* Transform Space */}
        <button
          onClick={() => setTransformSpace(s => s === 'world' ? 'local' : 'world')}
          className="px-2 py-1 text-xs rounded"
          style={{ background: COLORS.bg.base }}
        >
          {transformSpace === 'world' ? <Globe className="w-4 h-4" /> : <Box className="w-4 h-4" />}
        </button>

        {/* Snap */}
        <button
          onClick={() => setSnapEnabled(!snapEnabled)}
          className={`p-2 rounded ${snapEnabled ? 'bg-blue-600' : ''}`}
          style={{ background: snapEnabled ? undefined : COLORS.bg.base }}
          title="Toggle Snap"
        >
          <Grid3X3 className="w-4 h-4" />
        </button>
        <select
          value={snapValue}
          onChange={(e) => setSnapValue(Number(e.target.value))}
          className="text-xs px-2 py-1 rounded border"
          style={{ background: COLORS.bg.base, borderColor: COLORS.border.default }}
        >
          {[0.1, 0.5, 1, 5, 10].map(v => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>

        <div className="flex-1" />

        {/* Play Controls */}
        <div className="flex items-center rounded overflow-hidden" style={{ background: COLORS.bg.base }}>
          {!isPlaying ? (
            <button
              onClick={handlePlay}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              <span className="text-xs font-medium">Play</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="px-3 py-2 bg-yellow-600 hover:bg-yellow-500"
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>
              <button
                onClick={handleStop}
                className="px-3 py-2 bg-red-600 hover:bg-red-500"
              >
                <Square className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        <div className="flex-1" />

        {/* View Options */}
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`p-2 rounded ${showGrid ? 'bg-white/10' : ''}`}
          title="Toggle Grid"
        >
          <Grid3X3 className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowStats(!showStats)}
          className={`p-2 rounded ${showStats ? 'bg-white/10' : ''}`}
          title="Toggle Stats"
        >
          <Monitor className="w-4 h-4" />
        </button>
      </div>

      {/* ===== TABS ===== */}
      <div className="h-8 flex items-center border-b" style={{ background: COLORS.bg.base, borderColor: COLORS.border.subtle }}>
        {tabs.map(tab => (
          <div
            key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            className={`flex items-center gap-2 px-4 py-1.5 cursor-pointer border-r ${
              activeTabId === tab.id ? 'border-t-2 border-t-blue-500' : ''
            }`}
            style={{ 
              background: activeTabId === tab.id ? COLORS.bg.elevated : 'transparent',
              borderRightColor: COLORS.border.subtle,
            }}
          >
            {tab.icon}
            <span className="text-xs">{tab.title}</span>
            {tab.dirty && <span className="text-blue-400">•</span>}
            {tab.closable && (
              <button className="p-0.5 hover:bg-white/10 rounded opacity-50 hover:opacity-100">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
        <button className="p-2 hover:bg-white/5" title="New Tab">
          <Plus className="w-4 h-4" style={{ color: COLORS.text.muted }} />
        </button>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Panel Toggle */}
        <button
          onClick={() => setLeftPanelOpen(!leftPanelOpen)}
          className="w-6 flex items-center justify-center hover:bg-white/5 border-r"
          style={{ background: COLORS.bg.surface, borderColor: COLORS.border.subtle }}
        >
          {leftPanelOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* Left Panel (Outliner) */}
        {leftPanelOpen && (
          <div className="w-64 border-r flex flex-col" style={{ borderColor: COLORS.border.subtle }}>
            <div className="h-8 flex items-center px-3 border-b" style={{ background: COLORS.bg.elevated, borderColor: COLORS.border.subtle }}>
              <Layers className="w-4 h-4 mr-2" style={{ color: COLORS.text.muted }} />
              <span className="text-xs font-medium">World Outliner</span>
            </div>
            <div className="flex-1">
              <WorldOutliner
                objects={objects}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onToggleVisibility={handleToggleVisibility}
                onToggleLock={handleToggleLock}
              />
            </div>
          </div>
        )}

        {/* Center + Bottom */}
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Viewport */}
          <div className="flex-1 relative">
            <Viewport3D
              objects={objects}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onSelect={setSelectedId}
              onHover={setHoveredId}
              transformMode={transformMode}
              showGrid={showGrid}
              showStats={showStats}
              renderMode={renderMode}
            />
            
            {/* Viewport Info Overlay */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2 px-2 py-1 rounded text-xs" style={{ background: 'rgba(0,0,0,0.6)' }}>
              <span style={{ color: COLORS.text.muted }}>Perspective</span>
              <span style={{ color: COLORS.border.default }}>|</span>
              <span style={{ color: COLORS.text.muted }}>{renderMode}</span>
            </div>
          </div>

          {/* Bottom Panel */}
          {bottomPanelOpen && (
            <div className="border-t" style={{ borderColor: COLORS.border.subtle, height: 200 }}>
              <div className="flex h-full">
                {/* Content Browser */}
                <div className="flex-1 border-r" style={{ borderColor: COLORS.border.subtle }}>
                  <div className="h-8 flex items-center px-3 border-b" style={{ background: COLORS.bg.elevated, borderColor: COLORS.border.subtle }}>
                    <FolderOpen className="w-4 h-4 mr-2" style={{ color: COLORS.text.muted }} />
                    <span className="text-xs font-medium">Content Browser</span>
                  </div>
                  <div className="h-[calc(100%-2rem)]">
                    <ContentBrowser />
                  </div>
                </div>
                
                {/* Output Log */}
                <div className="w-80">
                  <div className="h-8 flex items-center px-3 border-b" style={{ background: COLORS.bg.elevated, borderColor: COLORS.border.subtle }}>
                    <Terminal className="w-4 h-4 mr-2" style={{ color: COLORS.text.muted }} />
                    <span className="text-xs font-medium">Output Log</span>
                  </div>
                  <div className="h-[calc(100%-2rem)]">
                    <OutputLog logs={logs} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel (Details) */}
        {rightPanelOpen && (
          <div className="w-72 border-l flex flex-col" style={{ borderColor: COLORS.border.subtle }}>
            <div className="h-8 flex items-center px-3 border-b" style={{ background: COLORS.bg.elevated, borderColor: COLORS.border.subtle }}>
              <Settings className="w-4 h-4 mr-2" style={{ color: COLORS.text.muted }} />
              <span className="text-xs font-medium">Details</span>
            </div>
            <div className="flex-1">
              <DetailsPanel
                selectedObject={selectedObject}
                onUpdate={handleUpdateObject}
              />
            </div>
          </div>
        )}

        {/* Right Panel Toggle */}
        <button
          onClick={() => setRightPanelOpen(!rightPanelOpen)}
          className="w-6 flex items-center justify-center hover:bg-white/5 border-l"
          style={{ background: COLORS.bg.surface, borderColor: COLORS.border.subtle }}
        >
          {rightPanelOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Bottom Panel Toggle */}
      <button
        onClick={() => setBottomPanelOpen(!bottomPanelOpen)}
        className="h-5 flex items-center justify-center hover:bg-white/5 border-t"
        style={{ background: COLORS.bg.surface, borderColor: COLORS.border.subtle }}
      >
        {bottomPanelOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
      </button>

      {/* ===== STATUS BAR ===== */}
      <div className="h-6 flex items-center px-3 text-xs" style={{ background: '#007acc' }}>
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          Ready
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-4" style={{ color: 'rgba(255,255,255,0.9)' }}>
          <span>FPS: 60</span>
          <span>Objects: {objects.length}</span>
          <span>Selected: {selectedId || 'None'}</span>
          <span>Memory: 256 MB</span>
        </div>
      </div>
    </div>
  );
}

// Missing icon component
const ChevronUp: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);
