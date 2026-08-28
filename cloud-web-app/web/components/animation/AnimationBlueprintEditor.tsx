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
  Panel,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { edgeTypes, nodeTypes, ParameterPanel, StateEditorModal, TransitionEditorModal } from './AnimationBlueprintEditorPanels';
import {
  type AnimationBlueprint,
  type AnimationLayer,
  type AnimationNodeType,
  type AnimationNotify,
  type AnimationParameter,
  type AnimationState,
  type AnimationTransition,
  type BlendTree,
  type BlendTreeNode,
  type StateNodeData,
  type TransitionCondition,
  type TransitionEdgeData,
} from './animation-blueprint-editor.types'
export type {
  AnimationBlueprint,
  AnimationLayer,
  AnimationNodeType,
  AnimationNotify,
  AnimationParameter,
  AnimationState,
  AnimationTransition,
  BlendTree,
  BlendTreeNode,
  TransitionCondition,
} from './animation-blueprint-editor.types'
export interface AnimationBlueprintEditorProps {
  blueprint?: AnimationBlueprint;
  onChange?: (blueprint: AnimationBlueprint) => void;
  availableAnimations?: string[];
}
export function AnimationBlueprintEditor({
  blueprint: initialBlueprint,
  onChange,
  availableAnimations = ['Idle', 'Walk', 'Run', 'Jump', 'Fall', 'Land', 'Attack', 'Hit', 'Die'],
}: AnimationBlueprintEditorProps) {
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
  const [editingState, setEditingState] = useState<AnimationState | null>(null);
  const [editingTransition, setEditingTransition] = useState<AnimationTransition | null>(null);
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
    setEdges((eds: Edge<TransitionEdgeData>[]) => addEdge({
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
    setNodes((nds: Node<StateNodeData>[]) => [...nds, {
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
  const saveStateEdit = (state: AnimationState) => {
    setBlueprint(prev => ({
      ...prev,
      states: prev.states.map(s => s.id === state.id ? state : s),
    }));
    setNodes((nds: Node<StateNodeData>[]) => nds.map((n: Node<StateNodeData>) => n.id === state.id ? {
      ...n,
      data: { ...n.data, state },
    } : n));
    setEditingState(null);
  };
  const saveTransitionEdit = (transition: AnimationTransition) => {
    setBlueprint(prev => ({
      ...prev,
      transitions: prev.transitions.map(t => t.id === transition.id ? transition : t),
    }));
    setEdges((eds: Edge<TransitionEdgeData>[]) => eds.map((e: Edge<TransitionEdgeData>) => e.id === transition.id ? {
      ...e,
      data: { ...e.data, transition },
    } : e));
    setEditingTransition(null);
  };
  const handleParameterValueChange = (id: string, value: number | boolean) => {
    setBlueprint(prev => ({
      ...prev,
      parameters: prev.parameters.map(p => p.id === id ? { ...p, value } : p),
    }));
  };
  useEffect(() => {
    onChange?.(blueprint);
  }, [blueprint, onChange]);
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex' }}>
      {/* Left sidebar - Parameters */}
      <div style={{ width: '280px', background: 'var(--aethel-surface-primary)', borderRight: '1px solid var(--aethel-border-primary)', padding: '12px' }}>
        <h2 style={{ color: 'white', fontSize: '16px', marginBottom: '16px' }}>
          Anim {blueprint.name}
        </h2>
        <ParameterPanel
          parameters={blueprint.parameters}
          onChange={(params) => setBlueprint(prev => ({ ...prev, parameters: params }))}
          onValueChange={handleParameterValueChange}
        />
        <div style={{ marginTop: '16px' }}>
          <button type="button" aria-label="Add new animation state"
            onClick={addState}
            style={{
              width: '100%',
              background: 'var(--aethel-primary)',
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
        <div style={{ marginTop: '20px', padding: '12px', background: 'var(--aethel-surface-tertiary)', borderRadius: '8px' }}>
          <h3 style={{ color: 'white', fontSize: '14px', marginBottom: '8px' }}>Layers</h3>
          <p style={{ color: 'var(--aethel-text-quaternary)', fontSize: '12px' }}>
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
          style={{ background: 'var(--aethel-surface-primary)' }}
        >
          <Controls />
          <MiniMap
            style={{ background: 'var(--aethel-surface-tertiary)' }}
            nodeColor="var(--aethel-primary)"
          />
          <Background color="var(--aethel-surface-tertiary)" gap={20} />
          <Panel position="top-right">
            <div style={{
              background: 'var(--aethel-surface-tertiary)',
              padding: '8px 12px',
              borderRadius: '6px',
              color: 'var(--aethel-text-tertiary)',
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
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--aethel-text-quaternary)" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}
export default AnimationBlueprintEditor;
