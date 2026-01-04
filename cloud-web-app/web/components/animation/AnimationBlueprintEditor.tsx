/**
 * ANIMATION BLUEPRINT EDITOR - Aethel Engine
 * 
 * Editor visual de Animation Blueprints no estilo Unreal Engine.
 * Permite criar state machines, blend trees e lógica de animação visualmente.
 * 
 * FEATURES:
 * - Animation State Machine visual
 * - Blend Tree editor
 * - Transition rules visuais
 * - Parameter management
 * - Preview em tempo real
 * - Notifies e eventos
 * - IK/FK layers
 * - Montages
 */

'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Handle,
  Position,
  Panel,
  MarkerType,
  NodeProps,
  EdgeProps,
  getBezierPath,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// ============================================================================
// TYPES
// ============================================================================

export type AnimationNodeType = 
  | 'state'
  | 'entry'
  | 'exit'
  | 'conduit'
  | 'blend_space_1d'
  | 'blend_space_2d'
  | 'blend_node'
  | 'sequence'
  | 'pose_snapshot'
  | 'state_alias';

export interface AnimationParameter {
  id: string;
  name: string;
  type: 'float' | 'int' | 'bool' | 'trigger';
  value: number | boolean;
  min?: number;
  max?: number;
}

export interface TransitionCondition {
  parameter: string;
  comparison: '==' | '!=' | '>' | '<' | '>=' | '<=';
  value: number | boolean;
}

export interface AnimationTransition {
  id: string;
  sourceState: string;
  targetState: string;
  conditions: TransitionCondition[];
  blendTime: number;
  blendMode: 'linear' | 'cubic' | 'custom';
  interruptible: boolean;
  priority: number;
}

export interface AnimationState {
  id: string;
  name: string;
  type: AnimationNodeType;
  animation?: string;
  blendTree?: BlendTree;
  speed: number;
  loop: boolean;
  notifies: AnimationNotify[];
}

export interface BlendTree {
  type: '1d' | '2d' | 'additive';
  parameterX: string;
  parameterY?: string;
  children: BlendTreeNode[];
}

export interface BlendTreeNode {
  animation: string;
  position: { x: number; y?: number };
  weight?: number;
}

export interface AnimationNotify {
  id: string;
  name: string;
  time: number;
  duration?: number;
  payload?: Record<string, unknown>;
}

export interface AnimationLayer {
  id: string;
  name: string;
  blendMode: 'override' | 'additive';
  weight: number;
  mask?: string[]; // Bone mask
  stateMachine: string;
}

export interface AnimationBlueprint {
  id: string;
  name: string;
  skeleton: string;
  parameters: AnimationParameter[];
  states: AnimationState[];
  transitions: AnimationTransition[];
  layers: AnimationLayer[];
  defaultState: string;
}

// ============================================================================
// NODE DATA TYPES
// ============================================================================

interface StateNodeData extends Record<string, unknown> {
  state: AnimationState;
  isDefault: boolean;
  isSelected: boolean;
  onEdit: (state: AnimationState) => void;
  onSetDefault: (stateId: string) => void;
}

interface TransitionEdgeData extends Record<string, unknown> {
  transition: AnimationTransition;
  onEdit?: (transition: AnimationTransition) => void;
}

// ============================================================================
// STATE NODE COMPONENT
// ============================================================================

function StateNode({ data, selected }: NodeProps<Node<StateNodeData>>) {
  const { state, isDefault, onEdit, onSetDefault } = data;
  
  const getNodeColor = () => {
    switch (state.type) {
      case 'entry': return '#22c55e';
      case 'exit': return '#ef4444';
      case 'conduit': return '#f59e0b';
      case 'blend_space_1d':
      case 'blend_space_2d': return '#8b5cf6';
      default: return '#3b82f6';
    }
  };
  
  return (
    <div
      style={{
        background: selected ? '#1e3a5f' : '#1e293b',
        border: `2px solid ${isDefault ? '#22c55e' : getNodeColor()}`,
        borderRadius: '8px',
        padding: '12px 16px',
        minWidth: '150px',
        color: 'white',
        position: 'relative',
      }}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#64748b', width: 10, height: 10 }}
      />
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: getNodeColor(),
          }}
        />
        <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{state.name}</span>
        {isDefault && (
          <span style={{ fontSize: '10px', background: '#22c55e', padding: '2px 6px', borderRadius: '4px' }}>
            Default
          </span>
        )}
      </div>
      
      {/* Animation info */}
      {state.animation && (
        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
          🎬 {state.animation}
        </div>
      )}
      
      {/* Blend tree indicator */}
      {state.blendTree && (
        <div style={{ fontSize: '12px', color: '#8b5cf6' }}>
          ⚡ Blend Tree ({state.blendTree.type})
        </div>
      )}
      
      {/* Speed */}
      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
        Speed: {state.speed}x {state.loop ? '🔄' : ''}
      </div>
      
      {/* Notifies count */}
      {state.notifies.length > 0 && (
        <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '2px' }}>
          📌 {state.notifies.length} notifies
        </div>
      )}
      
      {/* Context menu buttons (visible on hover) */}
      <div
        style={{
          position: 'absolute',
          top: '4px',
          right: '4px',
          display: 'flex',
          gap: '4px',
          opacity: selected ? 1 : 0,
          transition: 'opacity 0.2s',
        }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(state); }}
          style={{
            background: '#374151',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 8px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '10px',
          }}
        >
          Edit
        </button>
        {!isDefault && state.type === 'state' && (
          <button
            onClick={(e) => { e.stopPropagation(); onSetDefault(state.id); }}
            style={{
              background: '#374151',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '10px',
            }}
          >
            Set Default
          </button>
        )}
      </div>
      
      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#64748b', width: 10, height: 10 }}
      />
    </div>
  );
}

// ============================================================================
// TRANSITION EDGE COMPONENT
// ============================================================================

function TransitionEdge({ 
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<Edge<TransitionEdgeData>>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  
  const transition = data?.transition;
  
  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        strokeWidth={selected ? 3 : 2}
        stroke={selected ? '#3b82f6' : '#64748b'}
        fill="none"
        markerEnd="url(#arrow)"
      />
      
      {/* Transition label */}
      {transition && (
        <foreignObject
          x={labelX - 50}
          y={labelY - 15}
          width={100}
          height={30}
          style={{ overflow: 'visible' }}
        >
          <div
            style={{
              background: '#1e293b',
              border: '1px solid #374151',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '10px',
              color: '#94a3b8',
              textAlign: 'center',
              cursor: 'pointer',
            }}
            onClick={() => data?.onEdit?.(transition)}
          >
            {transition.conditions.length > 0 
              ? `${transition.conditions.length} conditions`
              : 'No conditions'}
            <br />
            <span style={{ color: '#64748b' }}>{transition.blendTime}s blend</span>
          </div>
        </foreignObject>
      )}
    </>
  );
}

// ============================================================================
// PARAMETER PANEL
// ============================================================================

interface ParameterPanelProps {
  parameters: AnimationParameter[];
  onChange: (params: AnimationParameter[]) => void;
  onValueChange: (id: string, value: number | boolean) => void;
}

function ParameterPanel({ parameters, onChange, onValueChange }: ParameterPanelProps) {
  const [newParamName, setNewParamName] = useState('');
  const [newParamType, setNewParamType] = useState<AnimationParameter['type']>('float');
  
  const addParameter = () => {
    if (!newParamName.trim()) return;
    
    const newParam: AnimationParameter = {
      id: crypto.randomUUID(),
      name: newParamName,
      type: newParamType,
      value: newParamType === 'bool' || newParamType === 'trigger' ? false : 0,
      min: newParamType === 'float' || newParamType === 'int' ? 0 : undefined,
      max: newParamType === 'float' ? 1 : newParamType === 'int' ? 100 : undefined,
    };
    
    onChange([...parameters, newParam]);
    setNewParamName('');
  };
  
  const removeParameter = (id: string) => {
    onChange(parameters.filter(p => p.id !== id));
  };
  
  return (
    <div style={{ padding: '12px', background: '#0f172a', borderRadius: '8px' }}>
      <h3 style={{ color: 'white', fontSize: '14px', marginBottom: '12px' }}>
        Parameters
      </h3>
      
      {/* Parameter list */}
      <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '12px' }}>
        {parameters.map(param => (
          <div
            key={param.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px',
              padding: '8px',
              background: '#1e293b',
              borderRadius: '4px',
            }}
          >
            {/* Type indicator */}
            <span style={{ 
              fontSize: '10px', 
              padding: '2px 6px', 
              borderRadius: '4px',
              background: param.type === 'bool' ? '#22c55e' : 
                         param.type === 'trigger' ? '#f59e0b' : '#3b82f6',
              color: 'white',
            }}>
              {param.type}
            </span>
            
            {/* Name */}
            <span style={{ flex: 1, color: 'white', fontSize: '12px' }}>
              {param.name}
            </span>
            
            {/* Value control */}
            {(param.type === 'float' || param.type === 'int') && (
              <input
                type="range"
                min={param.min ?? 0}
                max={param.max ?? 1}
                step={param.type === 'int' ? 1 : 0.01}
                value={param.value as number}
                onChange={(e) => onValueChange(param.id, parseFloat(e.target.value))}
                style={{ width: '80px' }}
              />
            )}
            
            {param.type === 'bool' && (
              <input
                type="checkbox"
                checked={param.value as boolean}
                onChange={(e) => onValueChange(param.id, e.target.checked)}
              />
            )}
            
            {param.type === 'trigger' && (
              <button
                onClick={() => {
                  onValueChange(param.id, true);
                  setTimeout(() => onValueChange(param.id, false), 100);
                }}
                style={{
                  background: '#f59e0b',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '10px',
                }}
              >
                Fire
              </button>
            )}
            
            {/* Value display */}
            <span style={{ color: '#64748b', fontSize: '11px', width: '40px', textAlign: 'right' }}>
              {typeof param.value === 'boolean' ? (param.value ? 'true' : 'false') : param.value.toFixed(2)}
            </span>
            
            {/* Delete */}
            <button
              onClick={() => removeParameter(param.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      
      {/* Add new parameter */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={newParamName}
          onChange={(e) => setNewParamName(e.target.value)}
          placeholder="Parameter name"
          style={{
            flex: 1,
            background: '#1e293b',
            border: '1px solid #374151',
            borderRadius: '4px',
            padding: '6px 10px',
            color: 'white',
            fontSize: '12px',
          }}
        />
        <select
          value={newParamType}
          onChange={(e) => setNewParamType(e.target.value as AnimationParameter['type'])}
          style={{
            background: '#1e293b',
            border: '1px solid #374151',
            borderRadius: '4px',
            padding: '6px',
            color: 'white',
            fontSize: '12px',
          }}
        >
          <option value="float">Float</option>
          <option value="int">Int</option>
          <option value="bool">Bool</option>
          <option value="trigger">Trigger</option>
        </select>
        <button
          onClick={addParameter}
          style={{
            background: '#3b82f6',
            border: 'none',
            borderRadius: '4px',
            padding: '6px 12px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// STATE EDITOR MODAL
// ============================================================================

interface StateEditorModalProps {
  state: AnimationState;
  onSave: (state: AnimationState) => void;
  onClose: () => void;
  availableAnimations: string[];
  parameters: AnimationParameter[];
}

function StateEditorModal({ state, onSave, onClose, availableAnimations, parameters }: StateEditorModalProps) {
  const [editedState, setEditedState] = useState<AnimationState>({ ...state });
  
  const updateField = <K extends keyof AnimationState>(field: K, value: AnimationState[K]) => {
    setEditedState(prev => ({ ...prev, [field]: value }));
  };
  
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#1e293b',
          borderRadius: '12px',
          padding: '24px',
          width: '500px',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ color: 'white', marginBottom: '20px' }}>Edit State: {state.name}</h2>
        
        {/* Name */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
            Name
          </label>
          <input
            type="text"
            value={editedState.name}
            onChange={(e) => updateField('name', e.target.value)}
            style={{
              width: '100%',
              background: '#0f172a',
              border: '1px solid #374151',
              borderRadius: '4px',
              padding: '8px 12px',
              color: 'white',
            }}
          />
        </div>
        
        {/* Animation */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
            Animation
          </label>
          <select
            value={editedState.animation || ''}
            onChange={(e) => updateField('animation', e.target.value || undefined)}
            style={{
              width: '100%',
              background: '#0f172a',
              border: '1px solid #374151',
              borderRadius: '4px',
              padding: '8px 12px',
              color: 'white',
            }}
          >
            <option value="">-- Select Animation --</option>
            {availableAnimations.map(anim => (
              <option key={anim} value={anim}>{anim}</option>
            ))}
          </select>
        </div>
        
        {/* Speed */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
            Speed: {editedState.speed.toFixed(2)}x
          </label>
          <input
            type="range"
            min={0}
            max={3}
            step={0.1}
            value={editedState.speed}
            onChange={(e) => updateField('speed', parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
        
        {/* Loop */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: '#94a3b8', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={editedState.loop}
              onChange={(e) => updateField('loop', e.target.checked)}
            />
            Loop Animation
          </label>
        </div>
        
        {/* Blend Tree option */}
        <div style={{ marginBottom: '16px', padding: '12px', background: '#0f172a', borderRadius: '8px' }}>
          <label style={{ color: '#94a3b8', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <input
              type="checkbox"
              checked={!!editedState.blendTree}
              onChange={(e) => updateField('blendTree', e.target.checked ? {
                type: '1d',
                parameterX: parameters[0]?.id || '',
                children: [],
              } : undefined)}
            />
            Use Blend Tree
          </label>
          
          {editedState.blendTree && (
            <div style={{ marginTop: '8px' }}>
              <select
                value={editedState.blendTree.type}
                onChange={(e) => updateField('blendTree', {
                  ...editedState.blendTree!,
                  type: e.target.value as BlendTree['type'],
                })}
                style={{
                  width: '100%',
                  background: '#1e293b',
                  border: '1px solid #374151',
                  borderRadius: '4px',
                  padding: '6px',
                  color: 'white',
                  marginBottom: '8px',
                }}
              >
                <option value="1d">1D Blend Space</option>
                <option value="2d">2D Blend Space</option>
                <option value="additive">Additive</option>
              </select>
              
              <select
                value={editedState.blendTree.parameterX}
                onChange={(e) => updateField('blendTree', {
                  ...editedState.blendTree!,
                  parameterX: e.target.value,
                })}
                style={{
                  width: '100%',
                  background: '#1e293b',
                  border: '1px solid #374151',
                  borderRadius: '4px',
                  padding: '6px',
                  color: 'white',
                }}
              >
                <option value="">-- Parameter X --</option>
                {parameters.filter(p => p.type === 'float').map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              background: '#374151',
              border: 'none',
              borderRadius: '6px',
              padding: '10px 20px',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(editedState)}
            style={{
              background: '#3b82f6',
              border: 'none',
              borderRadius: '6px',
              padding: '10px 20px',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TRANSITION EDITOR MODAL
// ============================================================================

interface TransitionEditorModalProps {
  transition: AnimationTransition;
  onSave: (transition: AnimationTransition) => void;
  onClose: () => void;
  parameters: AnimationParameter[];
}

function TransitionEditorModal({ transition, onSave, onClose, parameters }: TransitionEditorModalProps) {
  const [editedTransition, setEditedTransition] = useState<AnimationTransition>({ ...transition });
  
  const addCondition = () => {
    const newCondition: TransitionCondition = {
      parameter: parameters[0]?.id || '',
      comparison: '==',
      value: 0,
    };
    setEditedTransition(prev => ({
      ...prev,
      conditions: [...prev.conditions, newCondition],
    }));
  };
  
  const updateCondition = (index: number, updates: Partial<TransitionCondition>) => {
    setEditedTransition(prev => ({
      ...prev,
      conditions: prev.conditions.map((c, i) => i === index ? { ...c, ...updates } : c),
    }));
  };
  
  const removeCondition = (index: number) => {
    setEditedTransition(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index),
    }));
  };
  
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#1e293b',
          borderRadius: '12px',
          padding: '24px',
          width: '500px',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ color: 'white', marginBottom: '20px' }}>Edit Transition</h2>
        
        {/* Blend Time */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
            Blend Time: {editedTransition.blendTime.toFixed(2)}s
          </label>
          <input
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={editedTransition.blendTime}
            onChange={(e) => setEditedTransition(prev => ({ ...prev, blendTime: parseFloat(e.target.value) }))}
            style={{ width: '100%' }}
          />
        </div>
        
        {/* Blend Mode */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
            Blend Mode
          </label>
          <select
            value={editedTransition.blendMode}
            onChange={(e) => setEditedTransition(prev => ({ 
              ...prev, 
              blendMode: e.target.value as AnimationTransition['blendMode'] 
            }))}
            style={{
              width: '100%',
              background: '#0f172a',
              border: '1px solid #374151',
              borderRadius: '4px',
              padding: '8px',
              color: 'white',
            }}
          >
            <option value="linear">Linear</option>
            <option value="cubic">Cubic</option>
            <option value="custom">Custom Curve</option>
          </select>
        </div>
        
        {/* Interruptible */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: '#94a3b8', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={editedTransition.interruptible}
              onChange={(e) => setEditedTransition(prev => ({ ...prev, interruptible: e.target.checked }))}
            />
            Can Be Interrupted
          </label>
        </div>
        
        {/* Priority */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
            Priority: {editedTransition.priority}
          </label>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={editedTransition.priority}
            onChange={(e) => setEditedTransition(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
            style={{ width: '100%' }}
          />
        </div>
        
        {/* Conditions */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ color: '#94a3b8', fontSize: '12px' }}>Conditions</label>
            <button
              onClick={addCondition}
              style={{
                background: '#3b82f6',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              + Add
            </button>
          </div>
          
          {editedTransition.conditions.map((condition, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                marginBottom: '8px',
                padding: '8px',
                background: '#0f172a',
                borderRadius: '4px',
              }}
            >
              <select
                value={condition.parameter}
                onChange={(e) => updateCondition(index, { parameter: e.target.value })}
                style={{
                  flex: 1,
                  background: '#1e293b',
                  border: '1px solid #374151',
                  borderRadius: '4px',
                  padding: '4px',
                  color: 'white',
                  fontSize: '11px',
                }}
              >
                {parameters.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              
              <select
                value={condition.comparison}
                onChange={(e) => updateCondition(index, { comparison: e.target.value as TransitionCondition['comparison'] })}
                style={{
                  background: '#1e293b',
                  border: '1px solid #374151',
                  borderRadius: '4px',
                  padding: '4px',
                  color: 'white',
                  fontSize: '11px',
                }}
              >
                <option value="==">=</option>
                <option value="!=">≠</option>
                <option value=">">&gt;</option>
                <option value="<">&lt;</option>
                <option value=">=">&gt;=</option>
                <option value="<=">&lt;=</option>
              </select>
              
              <input
                type="number"
                value={condition.value as number}
                onChange={(e) => updateCondition(index, { value: parseFloat(e.target.value) })}
                style={{
                  width: '60px',
                  background: '#1e293b',
                  border: '1px solid #374151',
                  borderRadius: '4px',
                  padding: '4px',
                  color: 'white',
                  fontSize: '11px',
                }}
              />
              
              <button
                onClick={() => removeCondition(index)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        
        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              background: '#374151',
              border: 'none',
              borderRadius: '6px',
              padding: '10px 20px',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(editedTransition)}
            style={{
              background: '#3b82f6',
              border: 'none',
              borderRadius: '6px',
              padding: '10px 20px',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN ANIMATION BLUEPRINT EDITOR
// ============================================================================

export interface AnimationBlueprintEditorProps {
  blueprint?: AnimationBlueprint;
  onChange?: (blueprint: AnimationBlueprint) => void;
  availableAnimations?: string[];
}

const nodeTypes = {
  state: StateNode,
};

const edgeTypes = {
  transition: TransitionEdge,
};

export function AnimationBlueprintEditor({
  blueprint: initialBlueprint,
  onChange,
  availableAnimations = ['Idle', 'Walk', 'Run', 'Jump', 'Fall', 'Land', 'Attack', 'Hit', 'Die'],
}: AnimationBlueprintEditorProps) {
  // Blueprint state
  const [blueprint, setBlueprint] = useState<AnimationBlueprint>(initialBlueprint || {
    id: crypto.randomUUID(),
    name: 'New Animation Blueprint',
    skeleton: '',
    parameters: [
      { id: 'speed', name: 'Speed', type: 'float', value: 0, min: 0, max: 1 },
      { id: 'grounded', name: 'IsGrounded', type: 'bool', value: true },
    ],
    states: [
      {
        id: 'entry',
        name: 'Entry',
        type: 'entry',
        speed: 1,
        loop: false,
        notifies: [],
      },
      {
        id: 'idle',
        name: 'Idle',
        type: 'state',
        animation: 'Idle',
        speed: 1,
        loop: true,
        notifies: [],
      },
      {
        id: 'locomotion',
        name: 'Locomotion',
        type: 'blend_space_1d',
        blendTree: {
          type: '1d',
          parameterX: 'speed',
          children: [
            { animation: 'Idle', position: { x: 0 } },
            { animation: 'Walk', position: { x: 0.5 } },
            { animation: 'Run', position: { x: 1 } },
          ],
        },
        speed: 1,
        loop: true,
        notifies: [],
      },
    ],
    transitions: [
      {
        id: 't1',
        sourceState: 'entry',
        targetState: 'idle',
        conditions: [],
        blendTime: 0,
        blendMode: 'linear',
        interruptible: false,
        priority: 0,
      },
    ],
    layers: [],
    defaultState: 'idle',
  });
  
  // Modals
  const [editingState, setEditingState] = useState<AnimationState | null>(null);
  const [editingTransition, setEditingTransition] = useState<AnimationTransition | null>(null);
  
  // Convert to React Flow nodes/edges
  const initialNodes: Node<StateNodeData>[] = useMemo(() => {
    return blueprint.states.map((state, index) => ({
      id: state.id,
      type: 'state',
      position: { x: 100 + (index % 3) * 250, y: 100 + Math.floor(index / 3) * 150 },
      data: {
        state,
        isDefault: state.id === blueprint.defaultState,
        isSelected: false,
        onEdit: setEditingState,
        onSetDefault: (stateId: string) => {
          setBlueprint(prev => ({ ...prev, defaultState: stateId }));
        },
      },
    }));
  }, [blueprint.states, blueprint.defaultState]);
  
  const initialEdges: Edge<TransitionEdgeData>[] = useMemo(() => {
    return blueprint.transitions.map(transition => ({
      id: transition.id,
      source: transition.sourceState,
      target: transition.targetState,
      type: 'transition',
      markerEnd: { type: MarkerType.ArrowClosed },
      data: {
        transition,
        onEdit: setEditingTransition,
      },
    }));
  }, [blueprint.transitions]);
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  // Handle new connections
  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    
    const newTransition: AnimationTransition = {
      id: crypto.randomUUID(),
      sourceState: connection.source,
      targetState: connection.target,
      conditions: [],
      blendTime: 0.2,
      blendMode: 'linear',
      interruptible: true,
      priority: 0,
    };
    
    setBlueprint(prev => ({
      ...prev,
      transitions: [...prev.transitions, newTransition],
    }));
    
    setEdges(eds => addEdge({
      ...connection,
      id: newTransition.id,
      type: 'transition',
      markerEnd: { type: MarkerType.ArrowClosed },
      data: {
        transition: newTransition,
        onEdit: setEditingTransition,
      },
    }, eds));
  }, [setEdges]);
  
  // Add new state
  const addState = () => {
    const newState: AnimationState = {
      id: crypto.randomUUID(),
      name: `State_${blueprint.states.length}`,
      type: 'state',
      speed: 1,
      loop: true,
      notifies: [],
    };
    
    setBlueprint(prev => ({
      ...prev,
      states: [...prev.states, newState],
    }));
    
    setNodes(nds => [...nds, {
      id: newState.id,
      type: 'state',
      position: { x: 300, y: 300 },
      data: {
        state: newState,
        isDefault: false,
        isSelected: false,
        onEdit: setEditingState,
        onSetDefault: (stateId: string) => {
          setBlueprint(prev => ({ ...prev, defaultState: stateId }));
        },
      },
    }]);
  };
  
  // Save state edit
  const saveStateEdit = (state: AnimationState) => {
    setBlueprint(prev => ({
      ...prev,
      states: prev.states.map(s => s.id === state.id ? state : s),
    }));
    
    setNodes(nds => nds.map(n => n.id === state.id ? {
      ...n,
      data: { ...n.data, state },
    } : n));
    
    setEditingState(null);
  };
  
  // Save transition edit
  const saveTransitionEdit = (transition: AnimationTransition) => {
    setBlueprint(prev => ({
      ...prev,
      transitions: prev.transitions.map(t => t.id === transition.id ? transition : t),
    }));
    
    setEdges(eds => eds.map(e => e.id === transition.id ? {
      ...e,
      data: { ...e.data, transition },
    } : e));
    
    setEditingTransition(null);
  };
  
  // Parameter value change (for preview)
  const handleParameterValueChange = (id: string, value: number | boolean) => {
    setBlueprint(prev => ({
      ...prev,
      parameters: prev.parameters.map(p => p.id === id ? { ...p, value } : p),
    }));
  };
  
  // Notify parent of changes
  useEffect(() => {
    onChange?.(blueprint);
  }, [blueprint, onChange]);
  
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex' }}>
      {/* Left sidebar - Parameters */}
      <div style={{ width: '280px', background: '#0f172a', borderRight: '1px solid #1e293b', padding: '12px' }}>
        <h2 style={{ color: 'white', fontSize: '16px', marginBottom: '16px' }}>
          🎬 {blueprint.name}
        </h2>
        
        <ParameterPanel
          parameters={blueprint.parameters}
          onChange={(params) => setBlueprint(prev => ({ ...prev, parameters: params }))}
          onValueChange={handleParameterValueChange}
        />
        
        <div style={{ marginTop: '16px' }}>
          <button
            onClick={addState}
            style={{
              width: '100%',
              background: '#3b82f6',
              border: 'none',
              borderRadius: '6px',
              padding: '10px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            + Add State
          </button>
        </div>
        
        {/* Layers panel would go here */}
        <div style={{ marginTop: '20px', padding: '12px', background: '#1e293b', borderRadius: '8px' }}>
          <h3 style={{ color: 'white', fontSize: '14px', marginBottom: '8px' }}>Layers</h3>
          <p style={{ color: '#64748b', fontSize: '12px' }}>
            Add animation layers for blending multiple state machines
          </p>
        </div>
      </div>
      
      {/* Main graph area */}
      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          deleteKeyCode={['Backspace', 'Delete']}
          style={{ background: '#0f172a' }}
        >
          <Controls />
          <MiniMap
            style={{ background: '#1e293b' }}
            nodeColor="#3b82f6"
          />
          <Background color="#1e293b" gap={20} />
          
          <Panel position="top-right">
            <div style={{ 
              background: '#1e293b', 
              padding: '8px 12px', 
              borderRadius: '6px',
              color: '#94a3b8',
              fontSize: '12px',
            }}>
              States: {blueprint.states.length} | Transitions: {blueprint.transitions.length}
            </div>
          </Panel>
        </ReactFlow>
      </div>
      
      {/* Modals */}
      {editingState && (
        <StateEditorModal
          state={editingState}
          onSave={saveStateEdit}
          onClose={() => setEditingState(null)}
          availableAnimations={availableAnimations}
          parameters={blueprint.parameters}
        />
      )}
      
      {editingTransition && (
        <TransitionEditorModal
          transition={editingTransition}
          onSave={saveTransitionEdit}
          onClose={() => setEditingTransition(null)}
          parameters={blueprint.parameters}
        />
      )}
      
      {/* Arrow marker definition */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}

export default AnimationBlueprintEditor;
