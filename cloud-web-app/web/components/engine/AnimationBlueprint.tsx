
'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { resolveCssVarRgba } from '@/lib/style/resolve-css-var';
import { nodeTypes, StateInspector, TransitionInspector, VariablesPanel } from './AnimationBlueprintPanels';


export type AnimationStateType =
  | 'state'
  | 'entry'
  | 'conduit'
  | 'blend'
  | 'blendspace1d'
  | 'blendspace2d'
  | 'montage'
  | 'slot';

export interface AnimationState {
  id: string;
  name: string;
  type: AnimationStateType;
  animation?: string;
  looping: boolean;
  playRate: number;
  blendIn: number;
  blendOut: number;
  position: { x: number; y: number };
}

export interface TransitionRule {
  id: string;
  from: string;
  to: string;
  conditions: TransitionCondition[];
  blendTime: number;
  blendMode: 'linear' | 'cubic' | 'custom';
  priority: number;
  automatic: boolean;
}

export interface TransitionCondition {
  variable: string;
  operator: '==' | '!=' | '<' | '>' | '<=' | '>=';
  value: number | boolean | string;
}

export interface AnimationVariable {
  name: string;
  type: 'float' | 'int' | 'bool';
  defaultValue: number | boolean;
  min?: number;
  max?: number;
}

export interface BlendSpacePoint {
  animation: string;
  x: number;
  y?: number;
}


export interface AnimationBlueprintProps {
  onSave?: (data: { states: AnimationState[]; transitions: TransitionRule[]; variables: AnimationVariable[] }) => void;
}

export default function AnimationBlueprint({ onSave }: AnimationBlueprintProps) {
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

  const [states, setStates] = useState<AnimationState[]>([
    { id: 'entry', name: 'Entry', type: 'entry', looping: false, playRate: 1, blendIn: 0, blendOut: 0, position: { x: 100, y: 200 } },
    { id: 'idle', name: 'Idle', type: 'state', animation: 'Idle', looping: true, playRate: 1, blendIn: 0.2, blendOut: 0.2, position: { x: 300, y: 200 } },
    { id: 'walk', name: 'Walk', type: 'state', animation: 'Walk', looping: true, playRate: 1, blendIn: 0.2, blendOut: 0.2, position: { x: 500, y: 100 } },
    { id: 'run', name: 'Run', type: 'state', animation: 'Run', looping: true, playRate: 1, blendIn: 0.15, blendOut: 0.15, position: { x: 500, y: 300 } },
    { id: 'jump', name: 'Jump', type: 'state', animation: 'Jump_Start', looping: false, playRate: 1, blendIn: 0.1, blendOut: 0.1, position: { x: 700, y: 200 } },
  ]);

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

  const [variables, setVariables] = useState<AnimationVariable[]>([
    { name: 'Speed', type: 'float', defaultValue: 0, min: 0, max: 1 },
    { name: 'Direction', type: 'float', defaultValue: 0, min: -180, max: 180 },
    { name: 'IsJumping', type: 'bool', defaultValue: false },
    { name: 'IsCrouching', type: 'bool', defaultValue: false },
    { name: 'IsAttacking', type: 'bool', defaultValue: false },
  ]);

  const [variableValues, setVariableValues] = useState<Record<string, number | boolean>>({
    Speed: 0,
    Direction: 0,
    IsJumping: false,
    IsCrouching: false,
    IsAttacking: false,
  });

  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedTransition, setSelectedTransition] = useState<string | null>(null);
  const minimapMaskColor = useMemo(
    () => resolveCssVarRgba('--aethel-surface-primary', 0.8, 'rgba(13,17,23,0.8)'),
    []
  );

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

  const edges: Edge[] = useMemo(() =>
    transitions.map(t => ({
      id: t.id,
      source: t.from,
      target: t.to,
      type: 'smoothstep',
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--aethel-primary)' },
      style: {
        stroke: selectedTransition === t.id ? 'var(--aethel-warning)' : 'var(--aethel-primary)',
        strokeWidth: selectedTransition === t.id ? 3 : 2,
      },
      label: t.conditions.length > 0 || !t.automatic
        ? `${t.conditions.map(c => `${c.variable}${c.operator}${c.value}`).join(', ')}`
        : 'Auto',
      labelStyle: { fill: 'var(--aethel-text-quaternary)', fontSize: 10 },
      labelBgStyle: { fill: 'var(--aethel-surface-tertiary)', fillOpacity: 0.9 },
    })),
  [transitions, selectedTransition]);

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(nodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(edges);

  useEffect(() => {
    setFlowNodes(nodes);
  }, [nodes, setFlowNodes]);

  useEffect(() => {
    setFlowEdges(edges);
  }, [edges, setFlowEdges]);

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
      background: 'var(--aethel-surface-primary)',
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
          background: 'var(--aethel-surface-tertiary)',
          padding: '4px',
          borderRadius: '6px',
          border: '1px solid var(--aethel-border-primary)',
        }}>
          <button type="button" aria-label="Adicionar estado ao animation blueprint"
            onClick={() => handleAddState('state')}
            style={{
              padding: '6px 12px',
              background: 'var(--aethel-primary)',
              border: 'none',
              borderRadius: '4px',
              color: 'var(--aethel-text-primary)',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            🎭 Add State
          </button>
          <button type="button" aria-label="Adicionar conduit ao animation blueprint"
            onClick={() => handleAddState('conduit')}
            style={{
              padding: '6px 12px',
              background: 'var(--aethel-warning)',
              border: 'none',
              borderRadius: '4px',
              color: 'var(--aethel-text-primary)',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            ⚡ Add Conduit
          </button>
          <button type="button" aria-label="Adicionar blend state ao animation blueprint"
            onClick={() => handleAddState('blend')}
            style={{
              padding: '6px 12px',
              background: 'var(--aethel-accent)',
              border: 'none',
              borderRadius: '4px',
              color: 'var(--aethel-text-primary)',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            🔀 Add Blend
          </button>
          {(selectedState || selectedTransition) && (
            <button type="button" aria-label="Excluir item selecionado do animation blueprint"
              onClick={handleDeleteSelected}
              style={{
                padding: '6px 12px',
                background: 'var(--aethel-error)',
                border: 'none',
                borderRadius: '4px',
                color: 'var(--aethel-text-primary)',
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
          style={{ background: 'var(--aethel-surface-primary)' }}
        >
          <Background color="var(--aethel-border-primary)" gap={20} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              switch (node.data?.type) {
                case 'entry': return 'var(--aethel-success)';
                case 'conduit': return 'var(--aethel-warning)';
                case 'blend': return 'var(--aethel-accent)';
                default: return 'var(--aethel-primary)';
              }
            }}
            maskColor={minimapMaskColor}
          />
        </ReactFlow>
      </div>

      {/* Side Panel */}
      <div style={{
        width: '280px',
        background: 'var(--aethel-surface-primary)',
        borderLeft: '1px solid var(--aethel-border-primary)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '12px',
          borderBottom: '1px solid var(--aethel-border-primary)',
          fontWeight: 'bold',
          fontSize: '14px',
          color: 'var(--aethel-text-primary)',
          background: 'var(--aethel-surface-tertiary)',
        }}>
          Animation Blueprint
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
              color: 'var(--aethel-text-muted)',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎭</div>
              <div>Select a state or transition<br />to view properties</div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div style={{
          padding: '12px',
          borderTop: '1px solid var(--aethel-border-primary)',
        }}>
          <button type="button" aria-label="Salvar animation blueprint"
            onClick={() => onSave?.({ states, transitions, variables })}
            style={{
              width: '100%',
              padding: '10px',
              background: 'var(--aethel-success)',
              border: 'none',
              borderRadius: '6px',
              color: 'var(--aethel-text-primary)',
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
