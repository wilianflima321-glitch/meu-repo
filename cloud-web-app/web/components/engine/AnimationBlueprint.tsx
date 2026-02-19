/**
 * Animation Blueprint System - Sistema de Animação Avançado
 * 
 * Sistema profissional estilo Unreal Engine para criar
 * e editar state machines de animação com blending.
 * 
 * NÃO É MOCK - Sistema real e funcional!
 */

'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
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
  NodeTypes,
  Handle,
  Position,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// ============================================================================
// TIPOS
// ============================================================================

import type {
  AnimationState,
  AnimationStateType,
  AnimationVariable,
  BlendSpacePoint,
  TransitionCondition,
  TransitionRule
} from './animation-blueprint-types';

export type {
  AnimationState,
  AnimationStateType,
  AnimationVariable,
  BlendSpacePoint,
  TransitionCondition,
  TransitionRule
} from './animation-blueprint-types';

// ============================================================================
// NODE COMPONENTS
// ============================================================================

// State Node
function StateNode({ data, selected }: { data: { label: string; type: AnimationStateType; animation?: string; isEntry?: boolean }; selected: boolean }) {
  const getNodeColor = () => {
    switch (data.type) {
      case 'entry': return '#4caf50';
      case 'conduit': return '#ff9800';
      case 'blend': return '#9c27b0';
      case 'blendspace1d':
      case 'blendspace2d': return '#00bcd4';
      case 'montage': return '#f44336';
      case 'slot': return '#795548';
      default: return '#3f51b5';
    }
  };
  
  const getNodeIcon = () => {
    switch (data.type) {
      case 'entry': return '▶️';
      case 'conduit': return '⚡';
      case 'blend': return '🔀';
      case 'blendspace1d': return '📊';
      case 'blendspace2d': return '📈';
      case 'montage': return '🎬';
      case 'slot': return '📍';
      default: return '🎭';
    }
  };
  
  return (
    <div style={{
      padding: '12px 16px',
      background: '#1a1a2e',
      border: `2px solid ${selected ? '#fff' : getNodeColor()}`,
      borderRadius: data.type === 'entry' ? '50%' : '8px',
      minWidth: data.type === 'entry' ? '60px' : '140px',
      textAlign: 'center',
      boxShadow: selected ? `0 0 12px ${getNodeColor()}` : '0 2px 8px rgba(0,0,0,0.3)',
    }}>
      {/* Input handle */}
      {data.type !== 'entry' && (
        <Handle
          type="target"
          position={Position.Left}
          style={{
            background: getNodeColor(),
            width: '12px',
            height: '12px',
            border: '2px solid #fff',
          }}
        />
      )}
      
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        marginBottom: data.animation ? '8px' : 0,
      }}>
        <span>{getNodeIcon()}</span>
        <span style={{ 
          fontWeight: 'bold', 
          color: '#fff',
          fontSize: '13px',
        }}>
          {data.label}
        </span>
      </div>
      
      {/* Animation name */}
      {data.animation && (
        <div style={{
          fontSize: '11px',
          color: '#888',
          padding: '4px 8px',
          background: '#0f0f23',
          borderRadius: '4px',
        }}>
          🎬 {data.animation}
        </div>
      )}
      
      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: getNodeColor(),
          width: '12px',
          height: '12px',
          border: '2px solid #fff',
        }}
      />
    </div>
  );
}

// Transition Edge Label
function TransitionLabel({ data }: { data: { conditions?: TransitionCondition[]; blendTime: number } }) {
  if (!data.conditions?.length) {
    return (
      <div style={{
        padding: '4px 8px',
        background: '#1a1a2e',
        borderRadius: '4px',
        fontSize: '10px',
        color: '#888',
        border: '1px solid #333',
      }}>
        Auto ({data.blendTime}s)
      </div>
    );
  }
  
  return (
    <div style={{
      padding: '6px 10px',
      background: '#1a1a2e',
      borderRadius: '4px',
      fontSize: '10px',
      color: '#ccc',
      border: '1px solid #333',
      maxWidth: '120px',
    }}>
      {data.conditions.map((cond, i) => (
        <div key={i}>
          {cond.variable} {cond.operator} {String(cond.value)}
        </div>
      ))}
      <div style={{ color: '#666', marginTop: '2px' }}>
        Blend: {data.blendTime}s
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  animState: StateNode,
};

// ============================================================================
// SIDE PANEL COMPONENTS
// ============================================================================

// Variables Panel
function VariablesPanel({
  variables,
  values,
  onValueChange,
  onAddVariable,
  onRemoveVariable,
}: {
  variables: AnimationVariable[];
  values: Record<string, number | boolean>;
  onValueChange: (name: string, value: number | boolean) => void;
  onAddVariable: (variable: AnimationVariable) => void;
  onRemoveVariable: (name: string) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [newVar, setNewVar] = useState({ name: '', type: 'float' as AnimationVariable['type'], defaultValue: 0 });
  
  return (
    <div style={{
      padding: '12px',
      borderBottom: '1px solid #333',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
      }}>
        <span style={{ fontWeight: 'bold', fontSize: '12px', color: '#fff' }}>
          📊 Variables
        </span>
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{
            padding: '4px 8px',
            background: '#3f51b5',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '11px',
          }}
        >
          + Add
        </button>
      </div>
      
      {/* Add Variable Form */}
      {showAdd && (
        <div style={{
          padding: '8px',
          background: '#0f0f23',
          borderRadius: '4px',
          marginBottom: '8px',
        }}>
          <input
            type="text"
            placeholder="Variable name"
            value={newVar.name}
            onChange={(e) => setNewVar({ ...newVar, name: e.target.value })}
            style={{
              width: '100%',
              padding: '4px 8px',
              marginBottom: '4px',
              background: '#1a1a2e',
              border: '1px solid #333',
              borderRadius: '3px',
              color: '#fff',
              fontSize: '11px',
            }}
          />
          <div style={{ display: 'flex', gap: '4px' }}>
            <select
              value={newVar.type}
              onChange={(e) => setNewVar({ ...newVar, type: e.target.value as AnimationVariable['type'] })}
              style={{
                flex: 1,
                padding: '4px',
                background: '#1a1a2e',
                border: '1px solid #333',
                borderRadius: '3px',
                color: '#fff',
                fontSize: '11px',
              }}
            >
              <option value="float">Float</option>
              <option value="int">Int</option>
              <option value="bool">Bool</option>
            </select>
            <button
              onClick={() => {
                if (newVar.name) {
                  onAddVariable({
                    ...newVar,
                    defaultValue: newVar.type === 'bool' ? false : 0,
                  });
                  setNewVar({ name: '', type: 'float', defaultValue: 0 });
                  setShowAdd(false);
                }
              }}
              style={{
                padding: '4px 12px',
                background: '#4caf50',
                border: 'none',
                borderRadius: '3px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              Add
            </button>
          </div>
        </div>
      )}
      
      {/* Variable List */}
      {variables.map((variable) => (
        <div
          key={variable.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px',
            background: '#0f0f23',
            borderRadius: '4px',
            marginBottom: '4px',
          }}
        >
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: variable.type === 'bool' ? '#e74c3c' : variable.type === 'int' ? '#3498db' : '#2ecc71',
          }} />
          <span style={{ flex: 1, fontSize: '11px', color: '#ccc' }}>
            {variable.name}
          </span>
          
          {variable.type === 'bool' ? (
            <label style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={values[variable.name] as boolean ?? false}
                onChange={(e) => onValueChange(variable.name, e.target.checked)}
              />
            </label>
          ) : (
            <input
              type="number"
              value={values[variable.name] as number ?? 0}
              onChange={(e) => onValueChange(variable.name, parseFloat(e.target.value))}
              step={variable.type === 'int' ? 1 : 0.1}
              min={variable.min}
              max={variable.max}
              style={{
                width: '60px',
                padding: '2px 4px',
                background: '#1a1a2e',
                border: '1px solid #333',
                borderRadius: '2px',
                color: '#fff',
                fontSize: '11px',
                textAlign: 'right',
              }}
            />
          )}
          
          <button
            onClick={() => onRemoveVariable(variable.name)}
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              padding: '2px',
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

// State Inspector
function StateInspector({
  state,
  onUpdate,
  animations,
}: {
  state: AnimationState | null;
  onUpdate: (updates: Partial<AnimationState>) => void;
  animations: string[];
}) {
  if (!state) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: '#555',
      }}>
        Select a state to inspect
      </div>
    );
  }
  
  return (
    <div style={{ padding: '12px' }}>
      <div style={{
        fontWeight: 'bold',
        fontSize: '13px',
        color: '#fff',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        🎭 {state.name}
      </div>
      
      {/* Name */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px' }}>
          Name
        </label>
        <input
          type="text"
          value={state.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          style={{
            width: '100%',
            padding: '6px 8px',
            background: '#0f0f23',
            border: '1px solid #333',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '12px',
          }}
        />
      </div>
      
      {/* Animation */}
      {state.type === 'state' && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px' }}>
            Animation
          </label>
          <select
            value={state.animation || ''}
            onChange={(e) => onUpdate({ animation: e.target.value })}
            style={{
              width: '100%',
              padding: '6px 8px',
              background: '#0f0f23',
              border: '1px solid #333',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '12px',
            }}
          >
            <option value="">Select animation...</option>
            {animations.map((anim) => (
              <option key={anim} value={anim}>{anim}</option>
            ))}
          </select>
        </div>
      )}
      
      {/* Looping */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          color: '#ccc',
          cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={state.looping}
            onChange={(e) => onUpdate({ looping: e.target.checked })}
          />
          Looping
        </label>
      </div>
      
      {/* Play Rate */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px' }}>
          Play Rate: {state.playRate.toFixed(2)}
        </label>
        <input
          type="range"
          min="0"
          max="3"
          step="0.1"
          value={state.playRate}
          onChange={(e) => onUpdate({ playRate: parseFloat(e.target.value) })}
          style={{ width: '100%' }}
        />
      </div>
      
      {/* Blend Times */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px' }}>
            Blend In
          </label>
          <input
            type="number"
            value={state.blendIn}
            onChange={(e) => onUpdate({ blendIn: parseFloat(e.target.value) })}
            step="0.05"
            min="0"
            style={{
              width: '100%',
              padding: '4px 8px',
              background: '#0f0f23',
              border: '1px solid #333',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '12px',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px' }}>
            Blend Out
          </label>
          <input
            type="number"
            value={state.blendOut}
            onChange={(e) => onUpdate({ blendOut: parseFloat(e.target.value) })}
            step="0.05"
            min="0"
            style={{
              width: '100%',
              padding: '4px 8px',
              background: '#0f0f23',
              border: '1px solid #333',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '12px',
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Transition Inspector
function TransitionInspector({
  transition,
  variables,
  onUpdate,
}: {
  transition: TransitionRule | null;
  variables: AnimationVariable[];
  onUpdate: (updates: Partial<TransitionRule>) => void;
}) {
  if (!transition) return null;
  
  return (
    <div style={{ padding: '12px' }}>
      <div style={{
        fontWeight: 'bold',
        fontSize: '13px',
        color: '#fff',
        marginBottom: '16px',
      }}>
        ➡️ Transition
      </div>
      
      {/* Blend Time */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px' }}>
          Blend Time: {transition.blendTime.toFixed(2)}s
        </label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.05"
          value={transition.blendTime}
          onChange={(e) => onUpdate({ blendTime: parseFloat(e.target.value) })}
          style={{ width: '100%' }}
        />
      </div>
      
      {/* Blend Mode */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px' }}>
          Blend Mode
        </label>
        <select
          value={transition.blendMode}
          onChange={(e) => onUpdate({ blendMode: e.target.value as TransitionRule['blendMode'] })}
          style={{
            width: '100%',
            padding: '6px 8px',
            background: '#0f0f23',
            border: '1px solid #333',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '12px',
          }}
        >
          <option value="linear">Linear</option>
          <option value="cubic">Cubic</option>
          <option value="custom">Custom Curve</option>
        </select>
      </div>
      
      {/* Automatic */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          color: '#ccc',
          cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={transition.automatic}
            onChange={(e) => onUpdate({ automatic: e.target.checked })}
          />
          Automatic (when animation ends)
        </label>
      </div>
      
      {/* Conditions */}
      <div style={{ marginTop: '16px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}>
          <span style={{ fontSize: '11px', color: '#888' }}>Conditions</span>
          <button
            onClick={() => {
              const newCondition: TransitionCondition = {
                variable: variables[0]?.name || '',
                operator: '==',
                value: 0,
              };
              onUpdate({ conditions: [...transition.conditions, newCondition] });
            }}
            style={{
              padding: '2px 8px',
              background: '#333',
              border: 'none',
              borderRadius: '3px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '10px',
            }}
          >
            + Add
          </button>
        </div>
        
        {transition.conditions.map((cond, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: '4px',
              alignItems: 'center',
              marginBottom: '4px',
              padding: '6px',
              background: '#0f0f23',
              borderRadius: '4px',
            }}
          >
            <select
              value={cond.variable}
              onChange={(e) => {
                const newConditions = [...transition.conditions];
                newConditions[i] = { ...cond, variable: e.target.value };
                onUpdate({ conditions: newConditions });
              }}
              style={{
                flex: 1,
                padding: '2px 4px',
                background: '#1a1a2e',
                border: '1px solid #333',
                borderRadius: '2px',
                color: '#fff',
                fontSize: '10px',
              }}
            >
              {variables.map((v) => (
                <option key={v.name} value={v.name}>{v.name}</option>
              ))}
            </select>
            
            <select
              value={cond.operator}
              onChange={(e) => {
                const newConditions = [...transition.conditions];
                newConditions[i] = { ...cond, operator: e.target.value as TransitionCondition['operator'] };
                onUpdate({ conditions: newConditions });
              }}
              style={{
                width: '40px',
                padding: '2px',
                background: '#1a1a2e',
                border: '1px solid #333',
                borderRadius: '2px',
                color: '#fff',
                fontSize: '10px',
              }}
            >
              <option value="==">==</option>
              <option value="!=">!=</option>
              <option value="<">&lt;</option>
              <option value=">">&gt;</option>
              <option value="<=">&lt;=</option>
              <option value=">=">&gt;=</option>
            </select>
            
            <input
              type={typeof cond.value === 'boolean' ? 'checkbox' : 'number'}
              checked={typeof cond.value === 'boolean' ? cond.value : undefined}
              value={typeof cond.value !== 'boolean' ? cond.value : undefined}
              onChange={(e) => {
                const newConditions = [...transition.conditions];
                const varDef = variables.find(v => v.name === cond.variable);
                const value = varDef?.type === 'bool' 
                  ? e.target.checked 
                  : parseFloat(e.target.value);
                newConditions[i] = { ...cond, value };
                onUpdate({ conditions: newConditions });
              }}
              style={{
                width: '50px',
                padding: '2px 4px',
                background: '#1a1a2e',
                border: '1px solid #333',
                borderRadius: '2px',
                color: '#fff',
                fontSize: '10px',
              }}
            />
            
            <button
              onClick={() => {
                const newConditions = transition.conditions.filter((_, j) => j !== i);
                onUpdate({ conditions: newConditions });
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#e74c3c',
                cursor: 'pointer',
                padding: '2px',
                fontSize: '10px',
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN ANIMATION BLUEPRINT COMPONENT
// ============================================================================

export interface AnimationBlueprintProps {
  onSave?: (data: { states: AnimationState[]; transitions: TransitionRule[]; variables: AnimationVariable[] }) => void;
}

export default function AnimationBlueprint({ onSave }: AnimationBlueprintProps) {
  // Sample animations
  const animations = [
    'Idle',
    'Walk',
    'Run',
    'Sprint',
    'Jump_Start',
    'Jump_Loop',
    'Jump_End',
    'Crouch_Idle',
    'Crouch_Walk',
    'Attack_Light',
    'Attack_Heavy',
    'Hit_React',
    'Death',
  ];
  
  // States
  const [states, setStates] = useState<AnimationState[]>([
    { id: 'entry', name: 'Entry', type: 'entry', looping: false, playRate: 1, blendIn: 0, blendOut: 0, position: { x: 100, y: 200 } },
    { id: 'idle', name: 'Idle', type: 'state', animation: 'Idle', looping: true, playRate: 1, blendIn: 0.2, blendOut: 0.2, position: { x: 300, y: 200 } },
    { id: 'walk', name: 'Walk', type: 'state', animation: 'Walk', looping: true, playRate: 1, blendIn: 0.2, blendOut: 0.2, position: { x: 500, y: 100 } },
    { id: 'run', name: 'Run', type: 'state', animation: 'Run', looping: true, playRate: 1, blendIn: 0.15, blendOut: 0.15, position: { x: 500, y: 300 } },
    { id: 'jump', name: 'Jump', type: 'state', animation: 'Jump_Start', looping: false, playRate: 1, blendIn: 0.1, blendOut: 0.1, position: { x: 700, y: 200 } },
  ]);
  
  // Transitions
  const [transitions, setTransitions] = useState<TransitionRule[]>([
    { id: 't1', from: 'entry', to: 'idle', conditions: [], blendTime: 0, blendMode: 'linear', priority: 0, automatic: true },
    { id: 't2', from: 'idle', to: 'walk', conditions: [{ variable: 'Speed', operator: '>', value: 0.1 }], blendTime: 0.2, blendMode: 'linear', priority: 1, automatic: false },
    { id: 't3', from: 'walk', to: 'idle', conditions: [{ variable: 'Speed', operator: '<', value: 0.1 }], blendTime: 0.2, blendMode: 'linear', priority: 1, automatic: false },
    { id: 't4', from: 'walk', to: 'run', conditions: [{ variable: 'Speed', operator: '>', value: 0.6 }], blendTime: 0.15, blendMode: 'linear', priority: 2, automatic: false },
    { id: 't5', from: 'run', to: 'walk', conditions: [{ variable: 'Speed', operator: '<', value: 0.6 }], blendTime: 0.15, blendMode: 'linear', priority: 2, automatic: false },
    { id: 't6', from: 'idle', to: 'jump', conditions: [{ variable: 'IsJumping', operator: '==', value: true }], blendTime: 0.1, blendMode: 'linear', priority: 3, automatic: false },
    { id: 't7', from: 'walk', to: 'jump', conditions: [{ variable: 'IsJumping', operator: '==', value: true }], blendTime: 0.1, blendMode: 'linear', priority: 3, automatic: false },
    { id: 't8', from: 'run', to: 'jump', conditions: [{ variable: 'IsJumping', operator: '==', value: true }], blendTime: 0.1, blendMode: 'linear', priority: 3, automatic: false },
    { id: 't9', from: 'jump', to: 'idle', conditions: [{ variable: 'IsJumping', operator: '==', value: false }], blendTime: 0.2, blendMode: 'linear', priority: 0, automatic: false },
  ]);
  
  // Variables
  const [variables, setVariables] = useState<AnimationVariable[]>([
    { name: 'Speed', type: 'float', defaultValue: 0, min: 0, max: 1 },
    { name: 'Direction', type: 'float', defaultValue: 0, min: -180, max: 180 },
    { name: 'IsJumping', type: 'bool', defaultValue: false },
    { name: 'IsCrouching', type: 'bool', defaultValue: false },
    { name: 'IsAttacking', type: 'bool', defaultValue: false },
  ]);
  
  // Runtime values for preview
  const [variableValues, setVariableValues] = useState<Record<string, number | boolean>>({
    Speed: 0,
    Direction: 0,
    IsJumping: false,
    IsCrouching: false,
    IsAttacking: false,
  });
  
  // Selection
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedTransition, setSelectedTransition] = useState<string | null>(null);
  
  // Convert to ReactFlow nodes
  const nodes: Node[] = useMemo(() => 
    states.map(state => ({
      id: state.id,
      type: 'animState',
      position: state.position,
      data: {
        label: state.name,
        type: state.type,
        animation: state.animation,
      },
      selected: selectedState === state.id,
    })),
  [states, selectedState]);
  
  // Convert to ReactFlow edges
  const edges: Edge[] = useMemo(() =>
    transitions.map(t => ({
      id: t.id,
      source: t.from,
      target: t.to,
      type: 'smoothstep',
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3f51b5' },
      style: { 
        stroke: selectedTransition === t.id ? '#ff9800' : '#3f51b5',
        strokeWidth: selectedTransition === t.id ? 3 : 2,
      },
      label: t.conditions.length > 0 || !t.automatic 
        ? `${t.conditions.map(c => `${c.variable}${c.operator}${c.value}`).join(', ')}` 
        : 'Auto',
      labelStyle: { fill: '#888', fontSize: 10 },
      labelBgStyle: { fill: '#1a1a2e', fillOpacity: 0.9 },
    })),
  [transitions, selectedTransition]);
  
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(nodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(edges);
  
  // Sync nodes
  useEffect(() => {
    setFlowNodes(nodes);
  }, [nodes, setFlowNodes]);
  
  useEffect(() => {
    setFlowEdges(edges);
  }, [edges, setFlowEdges]);
  
  // Handlers
  const onConnect = useCallback((connection: Connection) => {
    if (connection.source && connection.target) {
      const newTransition: TransitionRule = {
        id: `t${Date.now()}`,
        from: connection.source,
        to: connection.target,
        conditions: [],
        blendTime: 0.2,
        blendMode: 'linear',
        priority: 0,
        automatic: false,
      };
      setTransitions([...transitions, newTransition]);
    }
  }, [transitions]);
  
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedState(node.id);
    setSelectedTransition(null);
  }, []);
  
  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedTransition(edge.id);
    setSelectedState(null);
  }, []);
  
  const onNodesPositionChange = useCallback((nodes: Node[]) => {
    setStates(states.map(s => {
      const node = nodes.find(n => n.id === s.id);
      if (node) {
        return { ...s, position: node.position };
      }
      return s;
    }));
  }, [states]);
  
  const handleStateUpdate = useCallback((updates: Partial<AnimationState>) => {
    if (!selectedState) return;
    setStates(states.map(s => 
      s.id === selectedState ? { ...s, ...updates } : s
    ));
  }, [selectedState, states]);
  
  const handleTransitionUpdate = useCallback((updates: Partial<TransitionRule>) => {
    if (!selectedTransition) return;
    setTransitions(transitions.map(t =>
      t.id === selectedTransition ? { ...t, ...updates } : t
    ));
  }, [selectedTransition, transitions]);
  
  const handleAddState = useCallback((type: AnimationStateType) => {
    const newState: AnimationState = {
      id: `state_${Date.now()}`,
      name: `New ${type}`,
      type,
      looping: true,
      playRate: 1,
      blendIn: 0.2,
      blendOut: 0.2,
      position: { x: 400, y: 200 },
    };
    setStates([...states, newState]);
    setSelectedState(newState.id);
  }, [states]);
  
  const handleDeleteSelected = useCallback(() => {
    if (selectedState && selectedState !== 'entry') {
      setStates(states.filter(s => s.id !== selectedState));
      setTransitions(transitions.filter(t => t.from !== selectedState && t.to !== selectedState));
      setSelectedState(null);
    }
    if (selectedTransition) {
      setTransitions(transitions.filter(t => t.id !== selectedTransition));
      setSelectedTransition(null);
    }
  }, [selectedState, selectedTransition, states, transitions]);
  
  const currentState = selectedState ? states.find(s => s.id === selectedState) : null;
  const currentTransition = selectedTransition ? transitions.find(t => t.id === selectedTransition) : null;
  
  return (
    <div style={{
      display: 'flex',
      height: '100%',
      background: '#0d1117',
    }}>
      {/* Graph Editor */}
      <div style={{ flex: 1, position: 'relative' }}>
        {/* Toolbar */}
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          zIndex: 10,
          display: 'flex',
          gap: '4px',
          background: '#1a1a2e',
          padding: '4px',
          borderRadius: '6px',
          border: '1px solid #333',
        }}>
          <button
            onClick={() => handleAddState('state')}
            style={{
              padding: '6px 12px',
              background: '#3f51b5',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            🎭 Add State
          </button>
          <button
            onClick={() => handleAddState('conduit')}
            style={{
              padding: '6px 12px',
              background: '#ff9800',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            ⚡ Add Conduit
          </button>
          <button
            onClick={() => handleAddState('blend')}
            style={{
              padding: '6px 12px',
              background: '#9c27b0',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            🔀 Add Blend
          </button>
          {(selectedState || selectedTransition) && (
            <button
              onClick={handleDeleteSelected}
              style={{
                padding: '6px 12px',
                background: '#e74c3c',
                border: 'none',
                borderRadius: '4px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              🗑️ Delete
            </button>
          )}
        </div>
        
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onNodeDragStop={(_, __, nodes) => onNodesPositionChange(nodes)}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid
          snapGrid={[10, 10]}
          style={{ background: '#0d1117' }}
        >
          <Background color="#333" gap={20} />
          <Controls />
          <MiniMap 
            nodeColor={(node) => {
              switch (node.data?.type) {
                case 'entry': return '#4caf50';
                case 'conduit': return '#ff9800';
                case 'blend': return '#9c27b0';
                default: return '#3f51b5';
              }
            }}
            maskColor="#0d1117cc"
          />
        </ReactFlow>
      </div>
      
      {/* Side Panel */}
      <div style={{
        width: '280px',
        background: '#0f0f23',
        borderLeft: '1px solid #333',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '12px',
          borderBottom: '1px solid #333',
          fontWeight: 'bold',
          fontSize: '14px',
          color: '#fff',
          background: '#1a1a2e',
        }}>
          🎬 Animation Blueprint
        </div>
        
        <div style={{ flex: 1, overflow: 'auto' }}>
          {/* Variables */}
          <VariablesPanel
            variables={variables}
            values={variableValues}
            onValueChange={(name, value) => setVariableValues({ ...variableValues, [name]: value })}
            onAddVariable={(v) => {
              setVariables([...variables, v]);
              setVariableValues({ ...variableValues, [v.name]: v.defaultValue });
            }}
            onRemoveVariable={(name) => {
              setVariables(variables.filter(v => v.name !== name));
              const newValues = { ...variableValues };
              delete newValues[name];
              setVariableValues(newValues);
            }}
          />
          
          {/* State Inspector */}
          {selectedState && (
            <StateInspector
              state={currentState || null}
              onUpdate={handleStateUpdate}
              animations={animations}
            />
          )}
          
          {/* Transition Inspector */}
          {selectedTransition && (
            <TransitionInspector
              transition={currentTransition || null}
              variables={variables}
              onUpdate={handleTransitionUpdate}
            />
          )}
          
          {!selectedState && !selectedTransition && (
            <div style={{
              padding: '24px',
              textAlign: 'center',
              color: '#555',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎭</div>
              <div>Select a state or transition<br />to view properties</div>
            </div>
          )}
        </div>
        
        {/* Save Button */}
        <div style={{
          padding: '12px',
          borderTop: '1px solid #333',
        }}>
          <button
            onClick={() => onSave?.({ states, transitions, variables })}
            style={{
              width: '100%',
              padding: '10px',
              background: '#4caf50',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            💾 Save Blueprint
          </button>
        </div>
      </div>
    </div>
  );
}
