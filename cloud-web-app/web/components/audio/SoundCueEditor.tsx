/**
 * SOUND CUE NODE EDITOR - Aethel Engine
 *
 * Editor visual de Sound Cues no estilo Unreal Engine.
 * Permite criar grafos de áudio complexos com routing, efeitos e modulação.
 *
 * FEATURES:
 * - Node-based audio graph
 * - Mixer/routing nodes
 * - Modulation (LFO, envelope, random)
 * - Effects (reverb, delay, filter, distortion)
 * - 3D spatialization
 * - Real-time preview
 * - Attenuation visualization
 * - Parameter binding
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('SoundCueEditor')


import { nodeDefinitions } from './sound-cue-models';
import type {
  SoundCue,
  SoundCueConnection,
  SoundCueNode,
  SoundCueParameter,
  SoundNodeDefinition,
  SoundNodeType,
} from './sound-cue-models';
export type {
  SoundCue,
  SoundCueConnection,
  SoundCueNode,
  SoundCueParameter,
  SoundNodeDefinition,
  SoundNodeType,
} from './sound-cue-models';
// ============================================================================
// SOUND NODE COMPONENT
// ============================================================================

interface SoundNodeData extends Record<string, unknown> {
  definition: SoundNodeDefinition;
  parameters: Record<string, unknown>;
  onParameterChange: (nodeId: string, paramId: string, value: unknown) => void;
}

function SoundNode({ id, data, selected }: NodeProps<Node<SoundNodeData>>) {
  const { definition, parameters, onParameterChange } = data;

  const getPinColor = (type: string) => {
    switch (type) {
      case 'audio': return 'var(--aethel-success)';
      case 'control': return 'var(--aethel-accent)';
      case 'trigger': return 'var(--aethel-warning)';
      default: return 'var(--aethel-text-muted)';
    }
  };

  return (
    <div
      style={{
        background: selected ? 'color-mix(in srgb, var(--aethel-primary) 24%, var(--aethel-surface-secondary))' : 'var(--aethel-surface-secondary)',
        border: `2px solid ${definition.color}`,
        borderRadius: '8px',
        minWidth: '180px',
        color: 'white',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: definition.color,
          padding: '8px 12px',
          borderRadius: '6px 6px 0 0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '12px', opacity: 0.8 }}>{definition.category}</span>
        <span style={{ fontWeight: 'bold', fontSize: '13px' }}>{definition.name}</span>
      </div>

      {/* Body */}
      <div style={{ padding: '12px' }}>
        {/* Pins */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          {/* Input pins */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {definition.inputs.map((pin) => (
              <div key={pin.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
                <Handle
                  type="target"
                  position={Position.Left}
                  id={pin.id}
                  style={{
                    background: getPinColor(pin.type),
                    width: 10,
                    height: 10,
                    left: -17,
                  }}
                />
                <span style={{ fontSize: '11px', color: 'var(--aethel-text-tertiary)' }}>{pin.name}</span>
              </div>
            ))}
          </div>

          {/* Output pins */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
            {definition.outputs.map((pin) => (
              <div key={pin.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
                <span style={{ fontSize: '11px', color: 'var(--aethel-text-tertiary)' }}>{pin.name}</span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={pin.id}
                  style={{
                    background: getPinColor(pin.type),
                    width: 10,
                    height: 10,
                    right: -17,
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Parameters */}
        {definition.parameters.length > 0 && (
          <div style={{ borderTop: '1px solid var(--aethel-border-primary)', paddingTop: '8px', marginTop: '8px' }}>
            {definition.parameters.slice(0, 3).map((param) => (
              <div key={param.id} style={{ marginBottom: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <label style={{ fontSize: '10px', color: 'var(--aethel-text-muted)' }}>{param.name}</label>
                  {param.type === 'float' && (
                    <span style={{ fontSize: '10px', color: 'var(--aethel-text-tertiary)' }}>
                      {((parameters[param.id] as number) ?? param.value as number).toFixed(2)}
                    </span>
                  )}
                </div>

                {param.type === 'float' && (
                  <input
                    type="range"
                    min={param.min ?? 0}
                    max={param.max ?? 1}
                    step={(param.max! - param.min!) / 100}
                    value={(parameters[param.id] as number) ?? param.value as number}
                    onChange={(e) => onParameterChange(id, param.id, parseFloat(e.target.value))}
                    style={{ width: '100%', height: '4px' }}
                  />
                )}

                {param.type === 'bool' && (
                  <input
                    type="checkbox"
                    checked={(parameters[param.id] as boolean) ?? param.value as boolean}
                    onChange={(e) => onParameterChange(id, param.id, e.target.checked)}
                  />
                )}

                {param.type === 'enum' && (
                  <select
                    value={(parameters[param.id] as string) ?? param.value as string}
                    onChange={(e) => onParameterChange(id, param.id, e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--aethel-surface-primary)',
                      border: '1px solid var(--aethel-border-primary)',
                      borderRadius: '2px',
                      padding: '2px',
                      color: 'white',
                      fontSize: '10px',
                    }}
                  >
                    {param.options?.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}

            {definition.parameters.length > 3 && (
              <div style={{ fontSize: '10px', color: 'var(--aethel-text-muted)', textAlign: 'center' }}>
                +{definition.parameters.length - 3} more params
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// NODE CATALOG
// ============================================================================

interface NodeCatalogProps {
  onAddNode: (type: SoundNodeType) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

function NodeCatalog({ onAddNode, searchQuery, onSearchChange }: NodeCatalogProps) {
  const categories = useMemo(() => {
    const cats: Record<string, SoundNodeDefinition[]> = {};

    Object.values(nodeDefinitions).forEach((def) => {
      if (!cats[def.category]) cats[def.category] = [];
      cats[def.category].push(def);
    });

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      Object.keys(cats).forEach((cat) => {
        cats[cat] = cats[cat].filter((def) =>
          def.name.toLowerCase().includes(query) ||
          def.category.toLowerCase().includes(query)
        );
        if (cats[cat].length === 0) delete cats[cat];
      });
    }

    return cats;
  }, [searchQuery]);

  return (
    <div style={{ padding: '12px', background: 'var(--aethel-surface-primary)', borderRadius: '8px' }}>
      <h3 style={{ color: 'white', fontSize: '14px', marginBottom: '12px' }}>Node Catalog</h3>

      {/* Search */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search nodes..."
        style={{
          width: '100%',
          background: 'var(--aethel-surface-secondary)',
          border: '1px solid var(--aethel-border-primary)',
          borderRadius: '4px',
          padding: '8px',
          color: 'white',
          fontSize: '12px',
          marginBottom: '12px',
        }}
      />

      {/* Categories */}
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {Object.entries(categories).map(([category, nodes]) => (
          <div key={category} style={{ marginBottom: '12px' }}>
            <h4 style={{
              color: 'var(--aethel-text-muted)',
              fontSize: '11px',
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}>
              {category}
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {nodes.map((def) => (
                <button type="button" aria-label={`Adicionar node ${def.type}`}
                  key={def.type}
                  onClick={() => onAddNode(def.type)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'var(--aethel-surface-secondary)',
                    border: '1px solid var(--aethel-border-primary)',
                    borderRadius: '4px',
                    padding: '6px 10px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '12px',
                    textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '2px',
                    background: def.color,
                  }} />
                  {def.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// PREVIEW PANEL
// ============================================================================

interface PreviewPanelProps {
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
}

function PreviewPanel({ isPlaying, onPlay, onStop, volume, onVolumeChange }: PreviewPanelProps) {
  return (
    <div style={{
      padding: '12px',
      background: 'var(--aethel-surface-primary)',
      borderRadius: '8px',
    }}>
      <h3 style={{ color: 'white', fontSize: '14px', marginBottom: '12px' }}>Preview</h3>

      {/* Playback controls */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <button type="button" aria-label={isPlaying ? 'Parar preview de audio' : 'Iniciar preview de audio'}
          onClick={isPlaying ? onStop : onPlay}
          style={{
            flex: 1,
            background: isPlaying ? 'var(--aethel-error)' : 'var(--aethel-success)',
            border: 'none',
            borderRadius: '6px',
            padding: '10px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 'bold',
          }}
        >
          {isPlaying ? '? Stop' : '? Play'}
        </button>
      </div>

      {/* Volume */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <label style={{ color: 'var(--aethel-text-tertiary)', fontSize: '12px' }}>Preview Volume</label>
          <span style={{ color: 'var(--aethel-text-muted)', fontSize: '11px' }}>{Math.round(volume * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {/* Waveform visualization placeholder */}
      <div style={{
        marginTop: '12px',
        height: '60px',
        background: 'var(--aethel-surface-secondary)',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--aethel-text-muted)',
        fontSize: '11px',
      }}>
        {isPlaying ? (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '40px' }}>
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: '4px',
                  height: `${20 + Math.random() * 20}px`,
                  background: 'var(--aethel-success)',
                  borderRadius: '2px',
                  animation: 'pulse 0.5s infinite',
                }}
              />
            ))}
          </div>
        ) : (
          'No audio playing'
        )}
      </div>
    </div>
  );
}

// ============================================================================
// PARAMETERS PANEL
// ============================================================================

interface ParametersPanelProps {
  parameters: SoundCueParameter[];
  onChange: (params: SoundCueParameter[]) => void;
  runtimeValues: Record<string, number | boolean>;
  onRuntimeValueChange: (id: string, value: number | boolean) => void;
}

function ParametersPanel({ parameters, onChange, runtimeValues, onRuntimeValueChange }: ParametersPanelProps) {
  const [newParamName, setNewParamName] = useState('');

  const addParameter = () => {
    if (!newParamName.trim()) return;

    const newParam: SoundCueParameter = {
      id: crypto.randomUUID(),
      name: newParamName,
      type: 'float',
      defaultValue: 0,
      min: 0,
      max: 1,
    };

    onChange([...parameters, newParam]);
    setNewParamName('');
  };

  return (
    <div style={{
      padding: '12px',
      background: 'var(--aethel-surface-primary)',
      borderRadius: '8px',
    }}>
      <h3 style={{ color: 'white', fontSize: '14px', marginBottom: '12px' }}>Cue Parameters</h3>

      {/* Parameter list */}
      <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '12px' }}>
        {parameters.map((param) => (
          <div
            key={param.id}
            style={{
              padding: '8px',
              background: 'var(--aethel-surface-secondary)',
              borderRadius: '4px',
              marginBottom: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: 'white', fontSize: '12px' }}>{param.name}</span>
              <button type="button" aria-label={`Remover parametro ${param.name}`}
                onClick={() => onChange(parameters.filter(p => p.id !== param.id))}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--aethel-error)',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                ×
              </button>
            </div>

            {param.type === 'float' && (
              <>
                <input
                  type="range"
                  min={param.min ?? 0}
                  max={param.max ?? 1}
                  step={0.01}
                  value={(runtimeValues[param.id] as number) ?? param.defaultValue as number}
                  onChange={(e) => onRuntimeValueChange(param.id, parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--aethel-text-muted)' }}>
                  <span>{param.min ?? 0}</span>
                  <span>{((runtimeValues[param.id] as number) ?? param.defaultValue).toFixed(2)}</span>
                  <span>{param.max ?? 1}</span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add parameter */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={newParamName}
          onChange={(e) => setNewParamName(e.target.value)}
          placeholder="Parameter name"
          style={{
            flex: 1,
            background: 'var(--aethel-surface-secondary)',
            border: '1px solid var(--aethel-border-primary)',
            borderRadius: '4px',
            padding: '6px',
            color: 'white',
            fontSize: '12px',
          }}
        />
        <button type="button" aria-label="Adicionar parametro de runtime"
          onClick={addParameter}
          style={{
            background: 'var(--aethel-primary)',
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
// MAIN SOUND CUE EDITOR
// ============================================================================

export interface SoundCueEditorProps {
  cue?: SoundCue;
  onChange?: (cue: SoundCue) => void;
}

const nodeTypes = {
  sound: SoundNode,
};

export function SoundCueEditor({ cue: initialCue, onChange }: SoundCueEditorProps) {
  // Cue state
  const [cue, setCue] = useState<SoundCue>(initialCue || {
    id: crypto.randomUUID(),
    name: 'New Sound Cue',
    nodes: [
      {
        id: 'output',
        type: 'output',
        position: { x: 600, y: 200 },
        parameters: {},
      },
    ],
    connections: [],
    parameters: [],
  });

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewVolume, setPreviewVolume] = useState(0.7);
  const [runtimeValues, setRuntimeValues] = useState<Record<string, number | boolean>>({});

  // Handle parameter changes on nodes
  const handleParameterChange = useCallback((nodeId: string, paramId: string, value: unknown) => {
    setCue((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === nodeId
          ? { ...n, parameters: { ...n.parameters, [paramId]: value } }
          : n
      ),
    }));
  }, []);

  // Convert to React Flow format
  const initialNodes: Node<SoundNodeData>[] = useMemo(() => {
    return cue.nodes.map((node) => ({
      id: node.id,
      type: 'sound',
      position: node.position,
      data: {
        definition: nodeDefinitions[node.type],
        parameters: node.parameters,
        onParameterChange: handleParameterChange,
      },
    }));
  }, [cue.nodes, handleParameterChange]);

  const initialEdges: Edge[] = useMemo(() => {
    return cue.connections.map((conn) => ({
      id: conn.id,
      source: conn.sourceNode,
      sourceHandle: conn.sourcePin,
      target: conn.targetNode,
      targetHandle: conn.targetPin,
      style: { stroke: 'var(--aethel-success)', strokeWidth: 2 },
      animated: isPlaying,
    }));
  }, [cue.connections, isPlaying]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Add new node
  const addNode = useCallback((type: SoundNodeType) => {
    const newNode: SoundCueNode = {
      id: crypto.randomUUID(),
      type,
      position: { x: 200, y: 200 },
      parameters: {},
    };

    setCue((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
    }));

    setNodes((nds) => [
      ...nds,
      {
        id: newNode.id,
        type: 'sound',
        position: newNode.position,
        data: {
          definition: nodeDefinitions[type],
          parameters: {},
          onParameterChange: handleParameterChange,
        },
      },
    ]);
  }, [setNodes, handleParameterChange]);

  // Handle connections
  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;

    const newConnection: SoundCueConnection = {
      id: crypto.randomUUID(),
      sourceNode: connection.source,
      sourcePin: connection.sourceHandle || 'audio',
      targetNode: connection.target,
      targetPin: connection.targetHandle || 'audio',
    };

    setCue((prev) => ({
      ...prev,
      connections: [...prev.connections, newConnection],
    }));

    setEdges((eds) =>
      addEdge(
        {
          ...connection,
          id: newConnection.id,
          style: { stroke: 'var(--aethel-success)', strokeWidth: 2 },
          animated: isPlaying,
        },
        eds
      )
    );
  }, [setEdges, isPlaying]);

  // Preview controls
  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    // Would trigger actual audio playback
    log.info('Playing sound cue:', cue);
  }, [cue]);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
  }, []);

  // Notify parent
  useEffect(() => {
    onChange?.(cue);
  }, [cue, onChange]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', background: 'var(--aethel-surface-primary)' }}>
      {/* Left sidebar */}
      <div style={{
        width: '240px',
        borderRight: '1px solid var(--aethel-surface-secondary)',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        overflowY: 'auto',
      }}>
        <NodeCatalog
          onAddNode={addNode}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      {/* Main graph */}
      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode={['Backspace', 'Delete']}
          style={{ background: 'var(--aethel-surface-primary)' }}
        >
          <Controls />
          <MiniMap
            style={{ background: 'var(--aethel-surface-secondary)' }}
            nodeColor={(n) => nodeDefinitions[(n.data as SoundNodeData).definition?.type]?.color || 'var(--aethel-text-muted)'}
          />
          <Background color="var(--aethel-surface-secondary)" gap={20} />

          <Panel position="top-left">
            <div style={{
              background: 'var(--aethel-surface-secondary)',
              padding: '8px 16px',
              borderRadius: '6px',
              color: 'white',
              fontSize: '14px',
              fontWeight: 'bold',
            }}>
              ?? {cue.name}
            </div>
          </Panel>

          <Panel position="top-right">
            <div style={{
              background: 'var(--aethel-surface-secondary)',
              padding: '8px 12px',
              borderRadius: '6px',
              color: 'var(--aethel-text-tertiary)',
              fontSize: '12px',
            }}>
              Nodes: {cue.nodes.length} | Connections: {cue.connections.length}
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Right sidebar */}
      <div style={{
        width: '260px',
        borderLeft: '1px solid var(--aethel-surface-secondary)',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        overflowY: 'auto',
      }}>
        <PreviewPanel
          isPlaying={isPlaying}
          onPlay={handlePlay}
          onStop={handleStop}
          volume={previewVolume}
          onVolumeChange={setPreviewVolume}
        />

        <ParametersPanel
          parameters={cue.parameters}
          onChange={(params) => setCue((prev) => ({ ...prev, parameters: params }))}
          runtimeValues={runtimeValues}
          onRuntimeValueChange={(id, value) => setRuntimeValues((prev) => ({ ...prev, [id]: value }))}
        />

        {/* Attenuation preview */}
        <div style={{
          padding: '12px',
          background: 'var(--aethel-surface-primary)',
          borderRadius: '8px',
        }}>
          <h3 style={{ color: 'white', fontSize: '14px', marginBottom: '12px' }}>3D Preview</h3>
          <div style={{
            height: '120px',
            background: 'var(--aethel-surface-secondary)',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}>
            {/* Simple attenuation visualization */}
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, var(--aethel-success) 0%, transparent 70%)',
              opacity: 0.5,
            }} />
            <div style={{
              position: 'absolute',
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              border: '1px dashed var(--aethel-success)',
              opacity: 0.3,
            }} />
            <div style={{
              position: 'absolute',
              width: '10px',
              height: '10px',
              background: 'var(--aethel-success)',
              borderRadius: '50%',
            }} />
          </div>
          <div style={{ marginTop: '8px', fontSize: '10px', color: 'var(--aethel-text-muted)', textAlign: 'center' }}>
            Attenuation sphere visualization
          </div>
        </div>
      </div>
    </div>
  );
}

export default SoundCueEditor;
