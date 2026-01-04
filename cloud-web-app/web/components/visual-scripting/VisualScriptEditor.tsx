/**
 * Visual Scripting - Sistema de Programação Visual
 * 
 * Sistema tipo Blueprint do Unreal Engine para criar lógica sem código.
 * Baseado em @xyflow/react para o editor de nós.
 */

'use client';

import React, { useCallback, useState, useMemo } from 'react';
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
  Panel,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// ============================================================================
// TIPOS DE NÓS
// ============================================================================

export type NodeCategory = 
  | 'event'     // Eventos (OnStart, OnUpdate, etc.)
  | 'action'    // Ações (Move, Jump, Spawn, etc.)
  | 'condition' // Condições (If, Compare, etc.)
  | 'variable'  // Variáveis (Get, Set)
  | 'math'      // Matemática (Add, Multiply, etc.)
  | 'flow'      // Controle de fluxo (Branch, Loop, etc.)
  | 'input'     // Input do jogador
  | 'physics'   // Física (Raycast, Force, etc.)
  | 'audio'     // Áudio (Play Sound, etc.)
  | 'ui';       // Interface do usuário

export interface NodeDefinition {
  type: string;
  category: NodeCategory;
  label: string;
  description: string;
  inputs: PortDefinition[];
  outputs: PortDefinition[];
  color: string;
  icon?: string;
}

export interface PortDefinition {
  id: string;
  label: string;
  type: 'exec' | 'boolean' | 'number' | 'string' | 'vector3' | 'object' | 'any';
  default?: unknown;
}

export interface VisualNodeData extends Record<string, unknown> {
	definition: NodeDefinition;
	values?: Record<string, unknown>;
	onValueChange?: (portId: string, value: unknown) => void;
}

export type VisualNodeType = Node<VisualNodeData>;

// ============================================================================
// CATÁLOGO DE NÓS
// ============================================================================

export const NODE_CATALOG: NodeDefinition[] = [
  // === EVENTOS ===
  {
    type: 'event_start',
    category: 'event',
    label: 'On Start',
    description: 'Executa quando o jogo inicia',
    inputs: [],
    outputs: [{ id: 'exec', label: '', type: 'exec' }],
    color: '#e74c3c',
  },
  {
    type: 'event_update',
    category: 'event',
    label: 'On Update',
    description: 'Executa a cada frame',
    inputs: [],
    outputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'deltaTime', label: 'Delta Time', type: 'number' },
    ],
    color: '#e74c3c',
  },
  {
    type: 'event_collision',
    category: 'event',
    label: 'On Collision',
    description: 'Executa quando há colisão',
    inputs: [],
    outputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'other', label: 'Other Object', type: 'object' },
      { id: 'point', label: 'Point', type: 'vector3' },
    ],
    color: '#e74c3c',
  },
  {
    type: 'event_trigger',
    category: 'event',
    label: 'On Trigger',
    description: 'Executa quando entra em trigger',
    inputs: [],
    outputs: [
      { id: 'enter', label: 'Enter', type: 'exec' },
      { id: 'exit', label: 'Exit', type: 'exec' },
      { id: 'other', label: 'Other', type: 'object' },
    ],
    color: '#e74c3c',
  },

  // === AÇÕES ===
  {
    type: 'action_move',
    category: 'action',
    label: 'Move',
    description: 'Move o objeto',
    inputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'direction', label: 'Direction', type: 'vector3' },
      { id: 'speed', label: 'Speed', type: 'number', default: 5 },
    ],
    outputs: [{ id: 'exec', label: '', type: 'exec' }],
    color: '#3498db',
  },
  {
    type: 'action_rotate',
    category: 'action',
    label: 'Rotate',
    description: 'Rotaciona o objeto',
    inputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'euler', label: 'Euler Angles', type: 'vector3' },
      { id: 'speed', label: 'Speed', type: 'number', default: 1 },
    ],
    outputs: [{ id: 'exec', label: '', type: 'exec' }],
    color: '#3498db',
  },
  {
    type: 'action_spawn',
    category: 'action',
    label: 'Spawn Object',
    description: 'Cria um novo objeto',
    inputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'prefab', label: 'Prefab', type: 'string' },
      { id: 'position', label: 'Position', type: 'vector3' },
    ],
    outputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'spawned', label: 'Spawned', type: 'object' },
    ],
    color: '#3498db',
  },
  {
    type: 'action_destroy',
    category: 'action',
    label: 'Destroy',
    description: 'Destrói um objeto',
    inputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'target', label: 'Target', type: 'object' },
      { id: 'delay', label: 'Delay', type: 'number', default: 0 },
    ],
    outputs: [{ id: 'exec', label: '', type: 'exec' }],
    color: '#3498db',
  },
  {
    type: 'action_log',
    category: 'action',
    label: 'Print',
    description: 'Imprime mensagem no console',
    inputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'message', label: 'Message', type: 'string' },
    ],
    outputs: [{ id: 'exec', label: '', type: 'exec' }],
    color: '#3498db',
  },

  // === CONDIÇÕES ===
  {
    type: 'condition_branch',
    category: 'flow',
    label: 'Branch',
    description: 'If/Else condicional',
    inputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'condition', label: 'Condition', type: 'boolean' },
    ],
    outputs: [
      { id: 'true', label: 'True', type: 'exec' },
      { id: 'false', label: 'False', type: 'exec' },
    ],
    color: '#9b59b6',
  },
  {
    type: 'condition_compare',
    category: 'condition',
    label: 'Compare',
    description: 'Compara dois valores',
    inputs: [
      { id: 'a', label: 'A', type: 'number' },
      { id: 'b', label: 'B', type: 'number' },
    ],
    outputs: [
      { id: 'equal', label: 'A == B', type: 'boolean' },
      { id: 'greater', label: 'A > B', type: 'boolean' },
      { id: 'less', label: 'A < B', type: 'boolean' },
    ],
    color: '#f39c12',
  },

  // === MATEMÁTICA ===
  {
    type: 'math_add',
    category: 'math',
    label: 'Add',
    description: 'Soma dois números',
    inputs: [
      { id: 'a', label: 'A', type: 'number', default: 0 },
      { id: 'b', label: 'B', type: 'number', default: 0 },
    ],
    outputs: [{ id: 'result', label: 'Result', type: 'number' }],
    color: '#27ae60',
  },
  {
    type: 'math_subtract',
    category: 'math',
    label: 'Subtract',
    description: 'Subtrai dois números',
    inputs: [
      { id: 'a', label: 'A', type: 'number', default: 0 },
      { id: 'b', label: 'B', type: 'number', default: 0 },
    ],
    outputs: [{ id: 'result', label: 'Result', type: 'number' }],
    color: '#27ae60',
  },
  {
    type: 'math_multiply',
    category: 'math',
    label: 'Multiply',
    description: 'Multiplica dois números',
    inputs: [
      { id: 'a', label: 'A', type: 'number', default: 1 },
      { id: 'b', label: 'B', type: 'number', default: 1 },
    ],
    outputs: [{ id: 'result', label: 'Result', type: 'number' }],
    color: '#27ae60',
  },
  {
    type: 'math_divide',
    category: 'math',
    label: 'Divide',
    description: 'Divide dois números',
    inputs: [
      { id: 'a', label: 'A', type: 'number', default: 1 },
      { id: 'b', label: 'B', type: 'number', default: 1 },
    ],
    outputs: [{ id: 'result', label: 'Result', type: 'number' }],
    color: '#27ae60',
  },
  {
    type: 'math_vector3',
    category: 'math',
    label: 'Make Vector3',
    description: 'Cria um Vector3',
    inputs: [
      { id: 'x', label: 'X', type: 'number', default: 0 },
      { id: 'y', label: 'Y', type: 'number', default: 0 },
      { id: 'z', label: 'Z', type: 'number', default: 0 },
    ],
    outputs: [{ id: 'vector', label: 'Vector', type: 'vector3' }],
    color: '#27ae60',
  },
  {
    type: 'math_break_vector3',
    category: 'math',
    label: 'Break Vector3',
    description: 'Separa componentes de um Vector3',
    inputs: [{ id: 'vector', label: 'Vector', type: 'vector3' }],
    outputs: [
      { id: 'x', label: 'X', type: 'number' },
      { id: 'y', label: 'Y', type: 'number' },
      { id: 'z', label: 'Z', type: 'number' },
    ],
    color: '#27ae60',
  },
  {
    type: 'math_random',
    category: 'math',
    label: 'Random',
    description: 'Gera número aleatório',
    inputs: [
      { id: 'min', label: 'Min', type: 'number', default: 0 },
      { id: 'max', label: 'Max', type: 'number', default: 1 },
    ],
    outputs: [{ id: 'value', label: 'Value', type: 'number' }],
    color: '#27ae60',
  },

  // === INPUT ===
  {
    type: 'input_key',
    category: 'input',
    label: 'Get Key',
    description: 'Verifica se tecla está pressionada',
    inputs: [{ id: 'key', label: 'Key', type: 'string', default: 'Space' }],
    outputs: [
      { id: 'pressed', label: 'Pressed', type: 'boolean' },
      { id: 'just_pressed', label: 'Just Pressed', type: 'boolean' },
      { id: 'just_released', label: 'Just Released', type: 'boolean' },
    ],
    color: '#e67e22',
  },
  {
    type: 'input_axis',
    category: 'input',
    label: 'Get Axis',
    description: 'Obtém valor de eixo de input',
    inputs: [{ id: 'axis', label: 'Axis', type: 'string', default: 'Horizontal' }],
    outputs: [{ id: 'value', label: 'Value', type: 'number' }],
    color: '#e67e22',
  },
  {
    type: 'input_mouse',
    category: 'input',
    label: 'Get Mouse',
    description: 'Obtém posição do mouse',
    inputs: [],
    outputs: [
      { id: 'position', label: 'Screen Pos', type: 'vector3' },
      { id: 'delta', label: 'Delta', type: 'vector3' },
      { id: 'left', label: 'Left Button', type: 'boolean' },
      { id: 'right', label: 'Right Button', type: 'boolean' },
    ],
    color: '#e67e22',
  },

  // === PHYSICS ===
  {
    type: 'physics_raycast',
    category: 'physics',
    label: 'Raycast',
    description: 'Lança raio e detecta colisão',
    inputs: [
      { id: 'origin', label: 'Origin', type: 'vector3' },
      { id: 'direction', label: 'Direction', type: 'vector3' },
      { id: 'distance', label: 'Distance', type: 'number', default: 100 },
    ],
    outputs: [
      { id: 'hit', label: 'Hit', type: 'boolean' },
      { id: 'point', label: 'Point', type: 'vector3' },
      { id: 'normal', label: 'Normal', type: 'vector3' },
      { id: 'object', label: 'Object', type: 'object' },
    ],
    color: '#1abc9c',
  },
  {
    type: 'physics_add_force',
    category: 'physics',
    label: 'Add Force',
    description: 'Adiciona força a um objeto',
    inputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'target', label: 'Target', type: 'object' },
      { id: 'force', label: 'Force', type: 'vector3' },
      { id: 'impulse', label: 'Impulse', type: 'boolean', default: false },
    ],
    outputs: [{ id: 'exec', label: '', type: 'exec' }],
    color: '#1abc9c',
  },

  // === AUDIO ===
  {
    type: 'audio_play',
    category: 'audio',
    label: 'Play Sound',
    description: 'Toca um som',
    inputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'sound', label: 'Sound', type: 'string' },
      { id: 'volume', label: 'Volume', type: 'number', default: 1 },
      { id: 'loop', label: 'Loop', type: 'boolean', default: false },
    ],
    outputs: [{ id: 'exec', label: '', type: 'exec' }],
    color: '#9b59b6',
  },

  // === FLOW ===
  {
    type: 'flow_sequence',
    category: 'flow',
    label: 'Sequence',
    description: 'Executa em sequência',
    inputs: [{ id: 'exec', label: '', type: 'exec' }],
    outputs: [
      { id: 'then_0', label: 'Then 0', type: 'exec' },
      { id: 'then_1', label: 'Then 1', type: 'exec' },
      { id: 'then_2', label: 'Then 2', type: 'exec' },
    ],
    color: '#9b59b6',
  },
  {
    type: 'flow_delay',
    category: 'flow',
    label: 'Delay',
    description: 'Aguarda tempo antes de continuar',
    inputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'duration', label: 'Duration', type: 'number', default: 1 },
    ],
    outputs: [{ id: 'exec', label: '', type: 'exec' }],
    color: '#9b59b6',
  },
  {
    type: 'flow_loop',
    category: 'flow',
    label: 'For Loop',
    description: 'Loop com contador',
    inputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'start', label: 'Start', type: 'number', default: 0 },
      { id: 'end', label: 'End', type: 'number', default: 10 },
    ],
    outputs: [
      { id: 'body', label: 'Loop Body', type: 'exec' },
      { id: 'index', label: 'Index', type: 'number' },
      { id: 'completed', label: 'Completed', type: 'exec' },
    ],
    color: '#9b59b6',
  },

  // === VARIÁVEIS ===
  {
    type: 'variable_get',
    category: 'variable',
    label: 'Get Variable',
    description: 'Obtém valor de variável',
    inputs: [{ id: 'name', label: 'Name', type: 'string' }],
    outputs: [{ id: 'value', label: 'Value', type: 'any' }],
    color: '#2ecc71',
  },
  {
    type: 'variable_set',
    category: 'variable',
    label: 'Set Variable',
    description: 'Define valor de variável',
    inputs: [
      { id: 'exec', label: '', type: 'exec' },
      { id: 'name', label: 'Name', type: 'string' },
      { id: 'value', label: 'Value', type: 'any' },
    ],
    outputs: [{ id: 'exec', label: '', type: 'exec' }],
    color: '#2ecc71',
  },
];

// ============================================================================
// COMPONENTES DE NÓS CUSTOMIZADOS
// ============================================================================

const portColors: Record<string, string> = {
  exec: '#ffffff',
  boolean: '#e74c3c',
  number: '#27ae60',
  string: '#f39c12',
  vector3: '#9b59b6',
  object: '#3498db',
  any: '#95a5a6',
};

interface VisualNodeProps {
  data: {
    definition: NodeDefinition;
    values?: Record<string, unknown>;
    onValueChange?: (portId: string, value: unknown) => void;
  };
}

function VisualNode({ data }: VisualNodeProps) {
  const { definition, values = {}, onValueChange } = data;

  return (
    <div
      className="visual-node"
      style={{
        background: definition.color,
        borderRadius: '8px',
        minWidth: '180px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.2)',
          fontWeight: 'bold',
          color: '#fff',
          fontSize: '12px',
        }}
      >
        {definition.label}
      </div>

      {/* Inputs */}
      <div style={{ padding: '8px 0' }}>
        {definition.inputs.map((port) => (
          <div
            key={port.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '4px 12px',
              position: 'relative',
            }}
          >
            <Handle
              type="target"
              position={Position.Left}
              id={port.id}
              style={{
                background: portColors[port.type],
                width: port.type === 'exec' ? '12px' : '8px',
                height: port.type === 'exec' ? '12px' : '8px',
                borderRadius: port.type === 'exec' ? '2px' : '50%',
                border: '2px solid #fff',
                left: '-6px',
              }}
            />
            <span style={{ color: '#fff', fontSize: '11px', marginLeft: '8px' }}>
              {port.label}
            </span>
            {port.type !== 'exec' && port.type !== 'object' && (
              <input
                type={port.type === 'number' ? 'number' : 'text'}
                defaultValue={values[port.id] as string ?? port.default}
                onChange={(e) => onValueChange?.(port.id, e.target.value)}
                style={{
                  marginLeft: 'auto',
                  width: '60px',
                  padding: '2px 4px',
                  fontSize: '10px',
                  background: 'rgba(0,0,0,0.3)',
                  border: 'none',
                  borderRadius: '3px',
                  color: '#fff',
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Outputs */}
      <div style={{ padding: '8px 0' }}>
        {definition.outputs.map((port) => (
          <div
            key={port.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              padding: '4px 12px',
              position: 'relative',
            }}
          >
            <span style={{ color: '#fff', fontSize: '11px', marginRight: '8px' }}>
              {port.label}
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id={port.id}
              style={{
                background: portColors[port.type],
                width: port.type === 'exec' ? '12px' : '8px',
                height: port.type === 'exec' ? '12px' : '8px',
                borderRadius: port.type === 'exec' ? '2px' : '50%',
                border: '2px solid #fff',
                right: '-6px',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// NODE PALETTE
// ============================================================================

interface NodePaletteProps {
  onAddNode: (definition: NodeDefinition) => void;
}

function NodePalette({ onAddNode }: NodePaletteProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>('event');

  const categories = useMemo(() => {
    const cats = new Map<NodeCategory, NodeDefinition[]>();
    NODE_CATALOG.forEach((node) => {
      const list = cats.get(node.category) || [];
      list.push(node);
      cats.set(node.category, list);
    });
    return cats;
  }, []);

  const categoryLabels: Record<NodeCategory, string> = {
    event: '🎯 Eventos',
    action: '⚡ Ações',
    condition: '❓ Condições',
    variable: '📦 Variáveis',
    math: '🔢 Matemática',
    flow: '🔀 Fluxo',
    input: '🎮 Input',
    physics: '🔮 Física',
    audio: '🔊 Áudio',
    ui: '🖼️ UI',
  };

  const filteredCategories = useMemo(() => {
    if (!searchTerm) return categories;

    const filtered = new Map<NodeCategory, NodeDefinition[]>();
    categories.forEach((nodes, category) => {
      const matchingNodes = nodes.filter(
        (n) =>
          n.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          n.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (matchingNodes.length > 0) {
        filtered.set(category, matchingNodes);
      }
    });
    return filtered;
  }, [categories, searchTerm]);

  return (
    <div
      style={{
        width: '250px',
        background: '#1e1e1e',
        borderRight: '1px solid #333',
        overflowY: 'auto',
        height: '100%',
      }}
    >
      <div style={{ padding: '12px' }}>
        <input
          type="text"
          placeholder="Buscar nós..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            background: '#333',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '13px',
          }}
        />
      </div>

      {Array.from(filteredCategories).map(([category, nodes]) => (
        <div key={category}>
          <button
            onClick={() =>
              setExpandedCategory(expandedCategory === category ? null : category)
            }
            style={{
              width: '100%',
              padding: '10px 12px',
              background: expandedCategory === category ? '#333' : 'transparent',
              border: 'none',
              color: '#fff',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 'bold',
            }}
          >
            {categoryLabels[category]} ({nodes.length})
          </button>

          {expandedCategory === category && (
            <div style={{ padding: '4px 8px' }}>
              {nodes.map((node) => (
                <button
                  key={node.type}
                  onClick={() => onAddNode(node)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    marginBottom: '4px',
                    background: node.color,
                    border: 'none',
                    borderRadius: '4px',
                    color: '#fff',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                  title={node.description}
                >
                  {node.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// VISUAL SCRIPT EDITOR
// ============================================================================

export interface VisualScript {
  id: string;
  name: string;
	nodes: VisualNodeType[];
	edges: Edge[];
  variables: { name: string; type: string; defaultValue: unknown }[];
}

interface VisualScriptEditorProps {
  script?: VisualScript;
  onChange?: (script: VisualScript) => void;
}

const nodeTypes: NodeTypes = {
  visual: VisualNode,
};

export function VisualScriptEditor({ script, onChange }: VisualScriptEditorProps) {
  const initialNodes = script?.nodes ?? [];
  const initialEdges = script?.edges ?? [];

	const [nodes, setNodes, onNodesChange] = useNodesState<VisualNodeType>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge: Edge = {
        ...connection,
        id: `edge-${Date.now()}`,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: '#fff', strokeWidth: 2 },
        animated: connection.sourceHandle === 'exec',
      } as Edge;
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  const handleAddNode = useCallback(
    (definition: NodeDefinition) => {
			const newNode: VisualNodeType = {
        id: `node-${Date.now()}`,
        type: 'visual',
        position: { x: 300 + Math.random() * 200, y: 200 + Math.random() * 200 },
        data: { definition },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  // Compilar script para JSON
  const compileScript = useCallback((): VisualScript => {
    return {
      id: script?.id || `script-${Date.now()}`,
      name: script?.name || 'New Script',
      nodes,
      edges,
      variables: script?.variables || [],
    };
  }, [nodes, edges, script]);

  // Notificar mudanças
  React.useEffect(() => {
    onChange?.(compileScript());
  }, [nodes, edges, onChange, compileScript]);

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%' }}>
      <NodePalette onAddNode={handleAddNode} />

      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid
          snapGrid={[16, 16]}
          style={{ background: '#0d0d0d' }}
        >
          <Background color="#333" gap={16} />
          <Controls />
          <MiniMap
            nodeColor={(node: VisualNodeType) => node.data?.definition?.color || '#666'}
            style={{ background: '#1e1e1e' }}
          />

          <Panel position="top-right">
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  const json = JSON.stringify(compileScript(), null, 2);
                  console.log('Compiled Script:', json);
                  navigator.clipboard.writeText(json);
                }}
                style={{
                  padding: '8px 16px',
                  background: '#27ae60',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                💾 Salvar
              </button>
              <button
                onClick={() => {
                  if (confirm('Limpar todos os nós?')) {
                    setNodes([]);
                    setEdges([]);
                  }
                }}
                style={{
                  padding: '8px 16px',
                  background: '#e74c3c',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                🗑️ Limpar
              </button>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}

export default VisualScriptEditor;
