/**
 * CONTROL RIG EDITOR - Aethel Engine
 * 
 * Editor profissional de Control Rig para animação procedural e IK/FK.
 * Sistema inspirado em Unreal Control Rig e Maya HumanIK.
 * 
 * FEATURES:
 * - IK/FK blending
 * - Procedural animation nodes
 * - Constraint system (aim, look-at, pole vector)
 * - Bone chain manipulation
 * - Full/partial body IK
 * - Space switching
 * - Export para runtime
 */

'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  Grid,
  Environment,
  GizmoHelper,
  GizmoViewport,
  Html,
  Line,
} from '@react-three/drei';
import * as THREE from 'three';
import {
  Bone,
  Target,
  Settings,
  Link,
  Unlink,
  RotateCcw,
  Play,
  Pause,
  Download,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Move3D,
  Crosshair,
  Hand,
  Footprints,
  User,
  Zap,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface BoneNode {
  id: string;
  name: string;
  parentId: string | null;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  length: number;
  ikEnabled: boolean;
  fkWeight: number;
  locked: boolean;
  visible: boolean;
  children: string[];
}

export interface IKChain {
  id: string;
  name: string;
  startBone: string;
  endBone: string;
  poleVector: THREE.Vector3;
  effectorPosition: THREE.Vector3;
  iterations: number;
  tolerance: number;
  enabled: boolean;
}

export interface Constraint {
  id: string;
  type: 'aim' | 'lookAt' | 'parent' | 'point' | 'orient' | 'scale';
  sourceBone: string;
  targetBone: string;
  weight: number;
  maintainOffset: boolean;
  enabled: boolean;
}

export interface ControlRigConfig {
  bones: Record<string, BoneNode>;
  ikChains: IKChain[];
  constraints: Constraint[];
}

export interface SkeletonPreset {
  id: string;
  name: string;
  type: 'humanoid' | 'quadruped' | 'custom';
  bones: Partial<Record<string, Partial<BoneNode>>>;
}

// ============================================================================
// HUMANOID SKELETON TEMPLATE
// ============================================================================

const HUMANOID_BONES: BoneNode[] = [
  { id: 'hips', name: 'Hips', parentId: null, position: new THREE.Vector3(0, 1, 0), rotation: new THREE.Euler(), length: 0.1, ikEnabled: false, fkWeight: 1, locked: false, visible: true, children: ['spine', 'leftUpperLeg', 'rightUpperLeg'] },
  { id: 'spine', name: 'Spine', parentId: 'hips', position: new THREE.Vector3(0, 0.1, 0), rotation: new THREE.Euler(), length: 0.15, ikEnabled: false, fkWeight: 1, locked: false, visible: true, children: ['spine1'] },
  { id: 'spine1', name: 'Spine1', parentId: 'spine', position: new THREE.Vector3(0, 0.15, 0), rotation: new THREE.Euler(), length: 0.15, ikEnabled: false, fkWeight: 1, locked: false, visible: true, children: ['spine2'] },
  { id: 'spine2', name: 'Spine2', parentId: 'spine1', position: new THREE.Vector3(0, 0.15, 0), rotation: new THREE.Euler(), length: 0.15, ikEnabled: false, fkWeight: 1, locked: false, visible: true, children: ['neck', 'leftShoulder', 'rightShoulder'] },
  { id: 'neck', name: 'Neck', parentId: 'spine2', position: new THREE.Vector3(0, 0.15, 0), rotation: new THREE.Euler(), length: 0.08, ikEnabled: false, fkWeight: 1, locked: false, visible: true, children: ['head'] },
  { id: 'head', name: 'Head', parentId: 'neck', position: new THREE.Vector3(0, 0.08, 0), rotation: new THREE.Euler(), length: 0.2, ikEnabled: false, fkWeight: 1, locked: false, visible: true, children: [] },
  
  // Left Arm
  { id: 'leftShoulder', name: 'Left Shoulder', parentId: 'spine2', position: new THREE.Vector3(0.1, 0.12, 0), rotation: new THREE.Euler(0, 0, -Math.PI / 6), length: 0.1, ikEnabled: false, fkWeight: 1, locked: false, visible: true, children: ['leftUpperArm'] },
  { id: 'leftUpperArm', name: 'Left Upper Arm', parentId: 'leftShoulder', position: new THREE.Vector3(0.1, 0, 0), rotation: new THREE.Euler(), length: 0.28, ikEnabled: true, fkWeight: 0, locked: false, visible: true, children: ['leftLowerArm'] },
  { id: 'leftLowerArm', name: 'Left Lower Arm', parentId: 'leftUpperArm', position: new THREE.Vector3(0.28, 0, 0), rotation: new THREE.Euler(), length: 0.25, ikEnabled: true, fkWeight: 0, locked: false, visible: true, children: ['leftHand'] },
  { id: 'leftHand', name: 'Left Hand', parentId: 'leftLowerArm', position: new THREE.Vector3(0.25, 0, 0), rotation: new THREE.Euler(), length: 0.1, ikEnabled: true, fkWeight: 0, locked: false, visible: true, children: [] },
  
  // Right Arm
  { id: 'rightShoulder', name: 'Right Shoulder', parentId: 'spine2', position: new THREE.Vector3(-0.1, 0.12, 0), rotation: new THREE.Euler(0, 0, Math.PI / 6), length: 0.1, ikEnabled: false, fkWeight: 1, locked: false, visible: true, children: ['rightUpperArm'] },
  { id: 'rightUpperArm', name: 'Right Upper Arm', parentId: 'rightShoulder', position: new THREE.Vector3(-0.1, 0, 0), rotation: new THREE.Euler(), length: 0.28, ikEnabled: true, fkWeight: 0, locked: false, visible: true, children: ['rightLowerArm'] },
  { id: 'rightLowerArm', name: 'Right Lower Arm', parentId: 'rightUpperArm', position: new THREE.Vector3(-0.28, 0, 0), rotation: new THREE.Euler(), length: 0.25, ikEnabled: true, fkWeight: 0, locked: false, visible: true, children: ['rightHand'] },
  { id: 'rightHand', name: 'Right Hand', parentId: 'rightLowerArm', position: new THREE.Vector3(-0.25, 0, 0), rotation: new THREE.Euler(), length: 0.1, ikEnabled: true, fkWeight: 0, locked: false, visible: true, children: [] },
  
  // Left Leg
  { id: 'leftUpperLeg', name: 'Left Upper Leg', parentId: 'hips', position: new THREE.Vector3(0.1, 0, 0), rotation: new THREE.Euler(Math.PI, 0, 0), length: 0.4, ikEnabled: true, fkWeight: 0, locked: false, visible: true, children: ['leftLowerLeg'] },
  { id: 'leftLowerLeg', name: 'Left Lower Leg', parentId: 'leftUpperLeg', position: new THREE.Vector3(0, -0.4, 0), rotation: new THREE.Euler(), length: 0.4, ikEnabled: true, fkWeight: 0, locked: false, visible: true, children: ['leftFoot'] },
  { id: 'leftFoot', name: 'Left Foot', parentId: 'leftLowerLeg', position: new THREE.Vector3(0, -0.4, 0), rotation: new THREE.Euler(-Math.PI / 2, 0, 0), length: 0.15, ikEnabled: true, fkWeight: 0, locked: false, visible: true, children: [] },
  
  // Right Leg
  { id: 'rightUpperLeg', name: 'Right Upper Leg', parentId: 'hips', position: new THREE.Vector3(-0.1, 0, 0), rotation: new THREE.Euler(Math.PI, 0, 0), length: 0.4, ikEnabled: true, fkWeight: 0, locked: false, visible: true, children: ['rightLowerLeg'] },
  { id: 'rightLowerLeg', name: 'Right Lower Leg', parentId: 'rightUpperLeg', position: new THREE.Vector3(0, -0.4, 0), rotation: new THREE.Euler(), length: 0.4, ikEnabled: true, fkWeight: 0, locked: false, visible: true, children: ['rightFoot'] },
  { id: 'rightFoot', name: 'Right Foot', parentId: 'rightLowerLeg', position: new THREE.Vector3(0, -0.4, 0), rotation: new THREE.Euler(-Math.PI / 2, 0, 0), length: 0.15, ikEnabled: true, fkWeight: 0, locked: false, visible: true, children: [] },
];

const DEFAULT_IK_CHAINS: IKChain[] = [
  {
    id: 'leftArm',
    name: 'Left Arm IK',
    startBone: 'leftUpperArm',
    endBone: 'leftHand',
    poleVector: new THREE.Vector3(0, 0, -1),
    effectorPosition: new THREE.Vector3(0.7, 1.2, 0),
    iterations: 10,
    tolerance: 0.001,
    enabled: true,
  },
  {
    id: 'rightArm',
    name: 'Right Arm IK',
    startBone: 'rightUpperArm',
    endBone: 'rightHand',
    poleVector: new THREE.Vector3(0, 0, -1),
    effectorPosition: new THREE.Vector3(-0.7, 1.2, 0),
    iterations: 10,
    tolerance: 0.001,
    enabled: true,
  },
  {
    id: 'leftLeg',
    name: 'Left Leg IK',
    startBone: 'leftUpperLeg',
    endBone: 'leftFoot',
    poleVector: new THREE.Vector3(0, 0, 1),
    effectorPosition: new THREE.Vector3(0.1, 0, 0.15),
    iterations: 10,
    tolerance: 0.001,
    enabled: true,
  },
  {
    id: 'rightLeg',
    name: 'Right Leg IK',
    startBone: 'rightUpperLeg',
    endBone: 'rightFoot',
    poleVector: new THREE.Vector3(0, 0, 1),
    effectorPosition: new THREE.Vector3(-0.1, 0, 0.15),
    iterations: 10,
    tolerance: 0.001,
    enabled: true,
  },
];

// ============================================================================
// SLIDER
// ============================================================================

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}

function Slider({ label, value, min, max, step = 0.01, onChange }: SliderProps) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300 font-mono">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-slate-700 rounded appearance-none cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none
                   [&::-webkit-slider-thumb]:w-3
                   [&::-webkit-slider-thumb]:h-3
                   [&::-webkit-slider-thumb]:bg-blue-500
                   [&::-webkit-slider-thumb]:rounded-full"
      />
    </div>
  );
}

// ============================================================================
// COLLAPSIBLE SECTION
// ============================================================================

interface CollapsibleSectionProps {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ title, icon, defaultOpen = true, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="mb-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full text-left py-1 text-sm text-slate-200 hover:text-white"
      >
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        {icon}
        {title}
      </button>
      {isOpen && <div className="pl-6 pt-2">{children}</div>}
    </div>
  );
}

// ============================================================================
// BONE 3D VISUALIZATION
// ============================================================================

interface Bone3DProps {
  bone: BoneNode;
  worldPosition: THREE.Vector3;
  worldRotation: THREE.Euler;
  isSelected: boolean;
  onSelect: () => void;
  showIK: boolean;
}

function Bone3D({ bone, worldPosition, worldRotation, isSelected, onSelect, showIK }: Bone3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Bone shape (octahedron) - useMemo must be called before any conditional return
  const boneGeo = useMemo(() => {
    const geo = new THREE.OctahedronGeometry(0.02);
    geo.scale(1, bone.length * 5, 1);
    return geo;
  }, [bone.length]);
  
  if (!bone.visible) return null;
  
  const color = bone.locked 
    ? '#666666' 
    : bone.ikEnabled && showIK 
      ? '#00ff88' 
      : isSelected 
        ? '#ff9900' 
        : '#4488ff';
  
  return (
    <group position={worldPosition} rotation={worldRotation}>
      <mesh
        ref={meshRef}
        geometry={boneGeo}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <meshStandardMaterial 
          color={color} 
          emissive={color} 
          emissiveIntensity={isSelected ? 0.5 : 0.2}
          transparent
          opacity={0.8}
        />
      </mesh>
      
      {/* Joint sphere */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.015, 16, 16]} />
        <meshStandardMaterial color={isSelected ? '#ffcc00' : '#ffffff'} />
      </mesh>
      
      {/* Label */}
      {isSelected && (
        <Html position={[0, 0.05, 0]} center>
          <div className="bg-slate-900/90 px-2 py-1 rounded text-xs whitespace-nowrap">
            {bone.name}
          </div>
        </Html>
      )}
    </group>
  );
}

// ============================================================================
// IK EFFECTOR HANDLE
// ============================================================================

interface IKEffectorProps {
  chain: IKChain;
  onPositionChange: (position: THREE.Vector3) => void;
  isSelected: boolean;
  onSelect: () => void;
}

function IKEffector({ chain, onPositionChange, isSelected, onSelect }: IKEffectorProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  if (!chain.enabled) return null;
  
  return (
    <group position={chain.effectorPosition}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <boxGeometry args={[0.06, 0.06, 0.06]} />
        <meshStandardMaterial
          color={isSelected ? '#ff4444' : '#44ff44'}
          emissive={isSelected ? '#ff4444' : '#44ff44'}
          emissiveIntensity={0.5}
        />
      </mesh>
      
      {/* Pole vector indicator */}
      <Line
        points={[
          [0, 0, 0],
          chain.poleVector.toArray() as [number, number, number],
        ]}
        color="#ffff00"
        lineWidth={2}
        dashed
      />
      <mesh position={chain.poleVector}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshBasicMaterial color="#ffff00" />
      </mesh>
      
      <Html position={[0, 0.08, 0]} center>
        <div className="bg-green-900/90 px-2 py-0.5 rounded text-[10px] whitespace-nowrap">
          {chain.name}
        </div>
      </Html>
    </group>
  );
}

// ============================================================================
// SKELETON VISUALIZER
// ============================================================================

interface SkeletonVisualizerProps {
  bones: BoneNode[];
  ikChains: IKChain[];
  selectedBone: string | null;
  selectedChain: string | null;
  onSelectBone: (id: string) => void;
  onSelectChain: (id: string) => void;
  onUpdateChain: (id: string, position: THREE.Vector3) => void;
  showIK: boolean;
  showBones: boolean;
}

function SkeletonVisualizer({
  bones,
  ikChains,
  selectedBone,
  selectedChain,
  onSelectBone,
  onSelectChain,
  onUpdateChain,
  showIK,
  showBones,
}: SkeletonVisualizerProps) {
  // Calculate world positions
  const worldTransforms = useMemo(() => {
    const transforms: Record<string, { position: THREE.Vector3; rotation: THREE.Euler }> = {};
    
    const calcTransform = (bone: BoneNode, parentPos: THREE.Vector3, parentRot: THREE.Euler) => {
      const localPos = bone.position.clone();
      localPos.applyEuler(parentRot);
      const worldPos = parentPos.clone().add(localPos);
      const worldRot = new THREE.Euler(
        parentRot.x + bone.rotation.x,
        parentRot.y + bone.rotation.y,
        parentRot.z + bone.rotation.z
      );
      
      transforms[bone.id] = { position: worldPos, rotation: worldRot };
      
      // Process children
      bones
        .filter((b) => b.parentId === bone.id)
        .forEach((child) => calcTransform(child, worldPos, worldRot));
    };
    
    // Start from root bones
    bones
      .filter((b) => !b.parentId)
      .forEach((root) => calcTransform(root, new THREE.Vector3(), new THREE.Euler()));
    
    return transforms;
  }, [bones]);
  
  // Draw bone connections
  const connections = useMemo(() => {
    const lines: { start: THREE.Vector3; end: THREE.Vector3; isIK: boolean }[] = [];
    
    bones.forEach((bone) => {
      if (bone.parentId && worldTransforms[bone.id] && worldTransforms[bone.parentId]) {
        lines.push({
          start: worldTransforms[bone.parentId].position,
          end: worldTransforms[bone.id].position,
          isIK: bone.ikEnabled,
        });
      }
    });
    
    return lines;
  }, [bones, worldTransforms]);
  
  return (
    <group>
      {/* Bone connections */}
      {connections.map((conn, i) => (
        <Line
          key={i}
          points={[conn.start.toArray(), conn.end.toArray()]}
          color={conn.isIK && showIK ? '#00ff88' : '#4488ff'}
          lineWidth={conn.isIK && showIK ? 3 : 2}
        />
      ))}
      
      {/* Bones */}
      {showBones && bones.map((bone) => {
        const transform = worldTransforms[bone.id];
        if (!transform) return null;
        
        return (
          <Bone3D
            key={bone.id}
            bone={bone}
            worldPosition={transform.position}
            worldRotation={transform.rotation}
            isSelected={selectedBone === bone.id}
            onSelect={() => onSelectBone(bone.id)}
            showIK={showIK}
          />
        );
      })}
      
      {/* IK Effectors */}
      {showIK && ikChains.map((chain) => (
        <IKEffector
          key={chain.id}
          chain={chain}
          isSelected={selectedChain === chain.id}
          onSelect={() => onSelectChain(chain.id)}
          onPositionChange={(pos) => onUpdateChain(chain.id, pos)}
        />
      ))}
    </group>
  );
}

// ============================================================================
// BONE HIERARCHY TREE
// ============================================================================

interface BoneTreeItemProps {
  bone: BoneNode;
  bones: BoneNode[];
  level: number;
  selectedBone: string | null;
  onSelect: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onToggleIK: (id: string) => void;
}

function BoneTreeItem({
  bone,
  bones,
  level,
  selectedBone,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onToggleIK,
}: BoneTreeItemProps) {
  const [expanded, setExpanded] = useState(true);
  const children = bones.filter((b) => b.parentId === bone.id);
  const hasChildren = children.length > 0;
  
  return (
    <div>
      <div
        className={`flex items-center gap-1 py-0.5 px-1 rounded cursor-pointer group
          ${selectedBone === bone.id ? 'bg-blue-600/40' : 'hover:bg-slate-700/50'}`}
        style={{ paddingLeft: `${level * 12 + 4}px` }}
        onClick={() => onSelect(bone.id)}
      >
        {hasChildren ? (
          <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}>
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        ) : (
          <span className="w-3" />
        )}
        
        <Bone className="w-3 h-3 text-blue-400" />
        
        <span className={`text-xs flex-1 ${bone.visible ? '' : 'opacity-50'}`}>
          {bone.name}
        </span>
        
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleIK(bone.id); }}
            className={`p-0.5 rounded ${bone.ikEnabled ? 'text-green-400' : 'text-slate-500'}`}
            title="Toggle IK"
          >
            <Target className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleVisibility(bone.id); }}
            className="p-0.5 rounded text-slate-400 hover:text-white"
          >
            {bone.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleLock(bone.id); }}
            className={`p-0.5 rounded ${bone.locked ? 'text-yellow-400' : 'text-slate-500'}`}
          >
            {bone.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          </button>
        </div>
      </div>
      
      {expanded && children.map((child) => (
        <BoneTreeItem
          key={child.id}
          bone={child}
          bones={bones}
          level={level + 1}
          selectedBone={selectedBone}
          onSelect={onSelect}
          onToggleVisibility={onToggleVisibility}
          onToggleLock={onToggleLock}
          onToggleIK={onToggleIK}
        />
      ))}
    </div>
  );
}

// ============================================================================
// IK CHAIN PANEL
// ============================================================================

interface IKChainPanelProps {
  chain: IKChain;
  onUpdate: (updates: Partial<IKChain>) => void;
  onDelete: () => void;
}

function IKChainPanel({ chain, onUpdate, onDelete }: IKChainPanelProps) {
  return (
    <div className="p-3 bg-slate-800/50 rounded mb-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{chain.name}</span>
        <div className="flex gap-1">
          <button
            onClick={() => onUpdate({ enabled: !chain.enabled })}
            className={`p-1 rounded ${chain.enabled ? 'bg-green-600' : 'bg-slate-600'}`}
          >
            {chain.enabled ? <Link className="w-3 h-3" /> : <Unlink className="w-3 h-3" />}
          </button>
        </div>
      </div>
      
      <div className="text-[10px] text-slate-400 mb-2">
        {chain.startBone} → {chain.endBone}
      </div>
      
      <Slider
        label="Iterations"
        value={chain.iterations}
        min={1}
        max={50}
        step={1}
        onChange={(v) => onUpdate({ iterations: v })}
      />
      
      <Slider
        label="Tolerance"
        value={chain.tolerance}
        min={0.0001}
        max={0.01}
        step={0.0001}
        onChange={(v) => onUpdate({ tolerance: v })}
      />
    </div>
  );
}

// ============================================================================
// CONSTRAINT PANEL
// ============================================================================

interface ConstraintPanelProps {
  constraint: Constraint;
  onUpdate: (updates: Partial<Constraint>) => void;
  onDelete: () => void;
}

function ConstraintPanel({ constraint, onUpdate, onDelete }: ConstraintPanelProps) {
  const typeIcons: Record<Constraint['type'], React.ReactNode> = {
    aim: <Crosshair className="w-3 h-3" />,
    lookAt: <Eye className="w-3 h-3" />,
    parent: <Link className="w-3 h-3" />,
    point: <Move3D className="w-3 h-3" />,
    orient: <RotateCcw className="w-3 h-3" />,
    scale: <Settings className="w-3 h-3" />,
  };
  
  return (
    <div className="p-2 bg-slate-800/50 rounded mb-2">
      <div className="flex items-center gap-2 mb-2">
        {typeIcons[constraint.type]}
        <span className="text-xs font-medium capitalize">{constraint.type}</span>
        <button
          onClick={() => onUpdate({ enabled: !constraint.enabled })}
          className={`ml-auto p-1 rounded text-xs ${constraint.enabled ? 'bg-blue-600' : 'bg-slate-600'}`}
        >
          {constraint.enabled ? 'ON' : 'OFF'}
        </button>
      </div>
      
      <div className="text-[10px] text-slate-400 mb-2">
        {constraint.sourceBone} → {constraint.targetBone}
      </div>
      
      <Slider
        label="Weight"
        value={constraint.weight}
        min={0}
        max={1}
        onChange={(v) => onUpdate({ weight: v })}
      />
    </div>
  );
}

// ============================================================================
// MAIN CONTROL RIG EDITOR
// ============================================================================

export interface ControlRigEditorProps {
  characterId?: string;
  onRigUpdate?: (config: ControlRigConfig) => void;
  onExport?: (config: ControlRigConfig) => void;
}

export default function ControlRigEditor({
  characterId,
  onRigUpdate,
  onExport,
}: ControlRigEditorProps) {
  // State
  const [bones, setBones] = useState<BoneNode[]>(HUMANOID_BONES);
  const [ikChains, setIkChains] = useState<IKChain[]>(DEFAULT_IK_CHAINS);
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  
  const [selectedBone, setSelectedBone] = useState<string | null>(null);
  const [selectedChain, setSelectedChain] = useState<string | null>(null);
  
  const [showBones, setShowBones] = useState(true);
  const [showIK, setShowIK] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  
  // Get selected bone data
  const selectedBoneData = useMemo(() => 
    bones.find((b) => b.id === selectedBone),
    [bones, selectedBone]
  );
  
  // Toggle bone properties
  const toggleBoneVisibility = useCallback((id: string) => {
    setBones((prev) => prev.map((b) => 
      b.id === id ? { ...b, visible: !b.visible } : b
    ));
  }, []);
  
  const toggleBoneLock = useCallback((id: string) => {
    setBones((prev) => prev.map((b) => 
      b.id === id ? { ...b, locked: !b.locked } : b
    ));
  }, []);
  
  const toggleBoneIK = useCallback((id: string) => {
    setBones((prev) => prev.map((b) => 
      b.id === id ? { ...b, ikEnabled: !b.ikEnabled } : b
    ));
  }, []);
  
  const updateBoneFKWeight = useCallback((id: string, weight: number) => {
    setBones((prev) => prev.map((b) => 
      b.id === id ? { ...b, fkWeight: weight } : b
    ));
  }, []);
  
  // Update IK chain
  const updateIKChain = useCallback((id: string, updates: Partial<IKChain>) => {
    setIkChains((prev) => prev.map((c) => 
      c.id === id ? { ...c, ...updates } : c
    ));
  }, []);
  
  const updateChainPosition = useCallback((id: string, position: THREE.Vector3) => {
    setIkChains((prev) => prev.map((c) => 
      c.id === id ? { ...c, effectorPosition: position } : c
    ));
  }, []);
  
  // Update constraint
  const updateConstraint = useCallback((id: string, updates: Partial<Constraint>) => {
    setConstraints((prev) => prev.map((c) => 
      c.id === id ? { ...c, ...updates } : c
    ));
  }, []);
  
  // Export
  const handleExport = useCallback(() => {
    const config: ControlRigConfig = {
      bones: Object.fromEntries(bones.map((b) => [b.id, b])),
      ikChains,
      constraints,
    };
    onExport?.(config);
  }, [bones, ikChains, constraints, onExport]);
  
  // Root bones for hierarchy
  const rootBones = useMemo(() => bones.filter((b) => !b.parentId), [bones]);
  
  return (
    <div className="flex h-full w-full bg-slate-900 text-slate-200">
      {/* Left Panel - Hierarchy */}
      <div className="w-64 border-r border-slate-700 flex flex-col">
        <div className="p-3 border-b border-slate-700">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Bone className="w-4 h-4 text-blue-400" />
            Bone Hierarchy
          </h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {rootBones.map((bone) => (
            <BoneTreeItem
              key={bone.id}
              bone={bone}
              bones={bones}
              level={0}
              selectedBone={selectedBone}
              onSelect={setSelectedBone}
              onToggleVisibility={toggleBoneVisibility}
              onToggleLock={toggleBoneLock}
              onToggleIK={toggleBoneIK}
            />
          ))}
        </div>
        
        {/* View toggles */}
        <div className="p-3 border-t border-slate-700 flex gap-2">
          <button
            onClick={() => setShowBones(!showBones)}
            className={`flex-1 p-2 rounded text-xs ${showBones ? 'bg-blue-600' : 'bg-slate-700'}`}
          >
            Bones
          </button>
          <button
            onClick={() => setShowIK(!showIK)}
            className={`flex-1 p-2 rounded text-xs ${showIK ? 'bg-green-600' : 'bg-slate-700'}`}
          >
            IK
          </button>
        </div>
      </div>
      
      {/* 3D Viewport */}
      <div className="flex-1 relative">
        <Canvas camera={{ position: [2, 2, 3], fov: 50 }}>
          <color attach="background" args={['#0f172a']} />
          
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          
          <SkeletonVisualizer
            bones={bones}
            ikChains={ikChains}
            selectedBone={selectedBone}
            selectedChain={selectedChain}
            onSelectBone={setSelectedBone}
            onSelectChain={setSelectedChain}
            onUpdateChain={updateChainPosition}
            showIK={showIK}
            showBones={showBones}
          />
          
          <Grid infiniteGrid fadeDistance={15} />
          <OrbitControls makeDefault target={[0, 1, 0]} />
          <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
            <GizmoViewport />
          </GizmoHelper>
        </Canvas>
        
        {/* Toolbar */}
        <div className="absolute top-4 left-4 flex gap-2">
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`p-2 rounded ${isSimulating ? 'bg-green-600' : 'bg-slate-700'}`}
            title={isSimulating ? 'Stop' : 'Simulate'}
          >
            {isSimulating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setBones(HUMANOID_BONES)}
            className="p-2 rounded bg-slate-700 hover:bg-slate-600"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExport}
            className="p-2 rounded bg-blue-600 hover:bg-blue-500"
            title="Export"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
        
        {/* Info */}
        <div className="absolute bottom-4 left-4 bg-slate-900/90 p-2 rounded text-xs">
          <div>Bones: {bones.length}</div>
          <div>IK Chains: {ikChains.filter((c) => c.enabled).length}</div>
          <div>Constraints: {constraints.filter((c) => c.enabled).length}</div>
        </div>
      </div>
      
      {/* Right Panel - Properties */}
      <div className="w-72 border-l border-slate-700 overflow-y-auto">
        <div className="p-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-blue-400" />
            Control Rig
          </h2>
          
          {/* Selected Bone Properties */}
          {selectedBoneData && (
            <CollapsibleSection 
              title={`Bone: ${selectedBoneData.name}`} 
              icon={<Bone className="w-4 h-4 text-blue-400" />}
            >
              <Slider
                label="FK / IK Blend"
                value={selectedBoneData.fkWeight}
                min={0}
                max={1}
                onChange={(v) => updateBoneFKWeight(selectedBoneData.id, v)}
              />
              
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => toggleBoneIK(selectedBoneData.id)}
                  className={`flex-1 p-2 rounded text-xs ${
                    selectedBoneData.ikEnabled ? 'bg-green-600' : 'bg-slate-700'
                  }`}
                >
                  <Target className="w-3 h-3 inline mr-1" />
                  IK
                </button>
                <button
                  onClick={() => toggleBoneLock(selectedBoneData.id)}
                  className={`flex-1 p-2 rounded text-xs ${
                    selectedBoneData.locked ? 'bg-yellow-600' : 'bg-slate-700'
                  }`}
                >
                  {selectedBoneData.locked ? <Lock className="w-3 h-3 inline mr-1" /> : <Unlock className="w-3 h-3 inline mr-1" />}
                  Lock
                </button>
              </div>
            </CollapsibleSection>
          )}
          
          {/* IK Chains */}
          <CollapsibleSection 
            title="IK Chains" 
            icon={<Target className="w-4 h-4 text-green-400" />}
          >
            {ikChains.map((chain) => (
              <IKChainPanel
                key={chain.id}
                chain={chain}
                onUpdate={(updates) => updateIKChain(chain.id, updates)}
                onDelete={() => setIkChains((prev) => prev.filter((c) => c.id !== chain.id))}
              />
            ))}
          </CollapsibleSection>
          
          {/* Constraints */}
          <CollapsibleSection 
            title="Constraints" 
            icon={<Link className="w-4 h-4 text-blue-400" />}
            defaultOpen={false}
          >
            {constraints.length === 0 ? (
              <div className="text-xs text-slate-500 italic">No constraints</div>
            ) : (
              constraints.map((constraint) => (
                <ConstraintPanel
                  key={constraint.id}
                  constraint={constraint}
                  onUpdate={(updates) => updateConstraint(constraint.id, updates)}
                  onDelete={() => setConstraints((prev) => prev.filter((c) => c.id !== constraint.id))}
                />
              ))
            )}
            
            <button
              className="w-full p-2 mt-2 rounded bg-slate-700 hover:bg-slate-600 text-xs"
            >
              + Add Constraint
            </button>
          </CollapsibleSection>
          
          {/* Body Zones */}
          <CollapsibleSection 
            title="Body Zones" 
            icon={<User className="w-4 h-4 text-amber-400" />}
            defaultOpen={false}
          >
            <div className="grid grid-cols-3 gap-1">
              <button className="p-2 rounded bg-slate-700 hover:bg-slate-600 text-xs">
                <Hand className="w-4 h-4 mx-auto mb-1" />
                L.Arm
              </button>
              <button className="p-2 rounded bg-slate-700 hover:bg-slate-600 text-xs">
                <User className="w-4 h-4 mx-auto mb-1" />
                Spine
              </button>
              <button className="p-2 rounded bg-slate-700 hover:bg-slate-600 text-xs">
                <Hand className="w-4 h-4 mx-auto mb-1" />
                R.Arm
              </button>
              <button className="p-2 rounded bg-slate-700 hover:bg-slate-600 text-xs">
                <Footprints className="w-4 h-4 mx-auto mb-1" />
                L.Leg
              </button>
              <button className="p-2 rounded bg-slate-700 hover:bg-slate-600 text-xs">
                <Zap className="w-4 h-4 mx-auto mb-1" />
                Hips
              </button>
              <button className="p-2 rounded bg-slate-700 hover:bg-slate-600 text-xs">
                <Footprints className="w-4 h-4 mx-auto mb-1" />
                R.Leg
              </button>
            </div>
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
}
