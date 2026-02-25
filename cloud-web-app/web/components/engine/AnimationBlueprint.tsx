/**
 * Animation Blueprint System
 * Professional animation state machine editor with transition blending.
 */

'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Background,
  Connection,
  Controls,
  Edge,
  MarkerType,
  MiniMap,
  Node,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { animationBlueprintNodeTypes } from './AnimationBlueprint.nodes'
import {
  cloneStates,
  cloneTransitions,
  cloneVariables,
  DEFAULT_ANIMATIONS,
  INITIAL_ANIMATION_STATES,
  INITIAL_TRANSITIONS,
  INITIAL_VARIABLES,
  INITIAL_VARIABLE_VALUES,
} from './AnimationBlueprint.data'
import {
  StateInspector,
  TransitionInspector,
  VariablesPanel,
} from './AnimationBlueprint.panels'
import type {
  AnimationState,
  AnimationStateType,
  AnimationVariable,
  BlendSpacePoint,
  TransitionCondition,
  TransitionRule,
} from './animation-blueprint-types'

export type {
  AnimationState,
  AnimationStateType,
  AnimationVariable,
  BlendSpacePoint,
  TransitionCondition,
  TransitionRule,
} from './animation-blueprint-types'

const nodeTypes = animationBlueprintNodeTypes

export interface AnimationBlueprintProps {
  onSave?: (data: { states: AnimationState[]; transitions: TransitionRule[]; variables: AnimationVariable[] }) => void
}

export default function AnimationBlueprint({ onSave }: AnimationBlueprintProps) {
  const [states, setStates] = useState<AnimationState[]>(() => cloneStates(INITIAL_ANIMATION_STATES))
  const [transitions, setTransitions] = useState<TransitionRule[]>(() => cloneTransitions(INITIAL_TRANSITIONS))
  const [variables, setVariables] = useState<AnimationVariable[]>(() => cloneVariables(INITIAL_VARIABLES))
  const [variableValues, setVariableValues] = useState<Record<string, number | boolean>>(() => ({ ...INITIAL_VARIABLE_VALUES }))

  const [selectedState, setSelectedState] = useState<string | null>(null)
  const [selectedTransition, setSelectedTransition] = useState<string | null>(null)

  const nodes: Node[] = useMemo(
    () =>
      states.map((state) => ({
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
    [states, selectedState],
  )

  const edges: Edge[] = useMemo(
    () =>
      transitions.map((transition) => ({
        id: transition.id,
        source: transition.from,
        target: transition.to,
        type: 'smoothstep',
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#3f51b5' },
        style: {
          stroke: selectedTransition === transition.id ? '#ff9800' : '#3f51b5',
          strokeWidth: selectedTransition === transition.id ? 3 : 2,
        },
        label:
          transition.conditions.length > 0 || !transition.automatic
            ? transition.conditions.map((condition) => `${condition.variable}${condition.operator}${condition.value}`).join(', ')
            : 'Auto',
        labelStyle: { fill: '#888', fontSize: 10 },
        labelBgStyle: { fill: '#1a1a2e', fillOpacity: 0.9 },
      })),
    [transitions, selectedTransition],
  )

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(nodes)
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(edges)

  useEffect(() => {
    setFlowNodes(nodes)
  }, [nodes, setFlowNodes])

  useEffect(() => {
    setFlowEdges(edges)
  }, [edges, setFlowEdges])

  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return

    const newTransition: TransitionRule = {
      id: `t${Date.now()}`,
      from: connection.source,
      to: connection.target,
      conditions: [],
      blendTime: 0.2,
      blendMode: 'linear',
      priority: 0,
      automatic: false,
    }

    setTransitions((prev) => [...prev, newTransition])
  }, [])

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedState(node.id)
    setSelectedTransition(null)
  }, [])

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedTransition(edge.id)
    setSelectedState(null)
  }, [])

  const onNodesPositionChange = useCallback((nextNodes: Node[]) => {
    setStates((prevStates) =>
      prevStates.map((state) => {
        const movedNode = nextNodes.find((node) => node.id === state.id)
        return movedNode ? { ...state, position: movedNode.position } : state
      }),
    )
  }, [])

  const handleStateUpdate = useCallback(
    (updates: Partial<AnimationState>) => {
      if (!selectedState) return
      setStates((prev) => prev.map((state) => (state.id === selectedState ? { ...state, ...updates } : state)))
    },
    [selectedState],
  )

  const handleTransitionUpdate = useCallback(
    (updates: Partial<TransitionRule>) => {
      if (!selectedTransition) return
      setTransitions((prev) =>
        prev.map((transition) =>
          transition.id === selectedTransition ? { ...transition, ...updates } : transition,
        ),
      )
    },
    [selectedTransition],
  )

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
    }

    setStates((prev) => [...prev, newState])
    setSelectedState(newState.id)
    setSelectedTransition(null)
  }, [])

  const handleDeleteSelected = useCallback(() => {
    if (selectedState && selectedState !== 'entry') {
      setStates((prev) => prev.filter((state) => state.id !== selectedState))
      setTransitions((prev) => prev.filter((transition) => transition.from !== selectedState && transition.to !== selectedState))
      setSelectedState(null)
    }

    if (selectedTransition) {
      setTransitions((prev) => prev.filter((transition) => transition.id !== selectedTransition))
      setSelectedTransition(null)
    }
  }, [selectedState, selectedTransition])

  const currentState = selectedState ? states.find((state) => state.id === selectedState) || null : null
  const currentTransition = selectedTransition
    ? transitions.find((transition) => transition.id === selectedTransition) || null
    : null

  return (
    <div style={{ display: 'flex', height: '100%', background: '#0d1117' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <div
          style={{
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
          }}
        >
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
            Add State
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
            Add Conduit
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
            Add Blend
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
              Delete
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
          onNodeDragStop={(_, __, nextNodes) => onNodesPositionChange(nextNodes)}
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
                case 'entry':
                  return '#4caf50'
                case 'conduit':
                  return '#ff9800'
                case 'blend':
                  return '#9c27b0'
                default:
                  return '#3f51b5'
              }
            }}
            maskColor="#0d1117cc"
          />
        </ReactFlow>
      </div>

      <div
        style={{
          width: '280px',
          background: '#0f0f23',
          borderLeft: '1px solid #333',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '12px',
            borderBottom: '1px solid #333',
            fontWeight: 'bold',
            fontSize: '14px',
            color: '#fff',
            background: '#1a1a2e',
          }}
        >
          Animation Blueprint
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          <VariablesPanel
            variables={variables}
            values={variableValues}
            onValueChange={(name, value) => setVariableValues((prev) => ({ ...prev, [name]: value }))}
            onAddVariable={(variable) => {
              setVariables((prev) => [...prev, variable])
              setVariableValues((prev) => ({ ...prev, [variable.name]: variable.defaultValue }))
            }}
            onRemoveVariable={(name) => {
              setVariables((prev) => prev.filter((variable) => variable.name !== name))
              setVariableValues((prev) => {
                const nextValues = { ...prev }
                delete nextValues[name]
                return nextValues
              })
            }}
          />

          {selectedState && (
            <StateInspector state={currentState} onUpdate={handleStateUpdate} animations={DEFAULT_ANIMATIONS} />
          )}

          {selectedTransition && (
            <TransitionInspector transition={currentTransition} variables={variables} onUpdate={handleTransitionUpdate} />
          )}

          {!selectedState && !selectedTransition && (
            <div style={{ padding: '24px', textAlign: 'center', color: '#555' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>AB</div>
              <div>Select a state or transition to view properties</div>
            </div>
          )}
        </div>

        <div style={{ padding: '12px', borderTop: '1px solid #333' }}>
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
            Save Blueprint
          </button>
        </div>
      </div>
    </div>
  )
}
