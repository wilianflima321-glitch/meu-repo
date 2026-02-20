/**
 * Visual Scripting - Sistema de Programação Visual
 * 
 * Sistema tipo Blueprint do Unreal Engine para criar lógica sem código.
 * Baseado em @xyflow/react para o editor de nós.
 */

'use client';

import React, { useCallback, useState, useMemo, useRef, useEffect } from 'react';
import {
  ReactFlow,
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
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { NODE_CATALOG } from './visual-script-catalog';
import type { NodeCategory, NodeDefinition, VisualNodeType } from './visual-script-types';

export { NODE_CATALOG } from './visual-script-catalog';
export type { NodeCategory, NodeDefinition, PortDefinition, VisualNodeData, VisualNodeType } from './visual-script-types';

// ============================================================================
// TIPOS DE NÓS
// ============================================================================

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
// CONTEXT MENU - Clique direito para criar nodes
// ============================================================================

interface ContextMenuProps {
  x: number;
  y: number;
  flowPosition: { x: number; y: number };
  onClose: () => void;
  onAddNode: (definition: NodeDefinition, position: { x: number; y: number }) => void;
}

function ContextMenu({ x, y, flowPosition, onClose, onAddNode }: ContextMenuProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<NodeCategory | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && e.target && !menuRef.current.contains(e.target as globalThis.Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const categories = useMemo(() => {
    const cats = new Map<NodeCategory, NodeDefinition[]>();
    NODE_CATALOG.forEach((node) => {
      const existing = cats.get(node.category) || [];
      existing.push(node);
      cats.set(node.category, existing);
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

  const filteredNodes = useMemo(() => {
    if (!searchTerm) return null;
    return NODE_CATALOG.filter(
      (n) =>
        n.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const handleAddNode = (node: NodeDefinition) => {
    onAddNode(node, flowPosition);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: x,
        top: y,
        width: '280px',
        maxHeight: '400px',
        background: '#1e1e1e',
        border: '1px solid #444',
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        zIndex: 1000,
      }}
    >
      {/* Header */}
      <div style={{ padding: '12px', borderBottom: '1px solid #333' }}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Buscar nó para criar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            background: '#2a2a2a',
            border: '1px solid #444',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '14px',
            outline: 'none',
          }}
        />
        <div style={{ fontSize: '11px', color: '#888', marginTop: '6px' }}>
          Clique direito no canvas para abrir este menu
        </div>
      </div>

      {/* Results */}
      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {filteredNodes ? (
          // Search results
          <div style={{ padding: '8px' }}>
            {filteredNodes.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#666' }}>
                Nenhum nó encontrado
              </div>
            ) : (
              filteredNodes.map((node) => (
                <button
                  key={node.type}
                  onClick={() => handleAddNode(node)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    marginBottom: '4px',
                    background: node.color,
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '13px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{node.label}</span>
                  <span style={{ fontSize: '11px', opacity: 0.8 }}>{node.description}</span>
                </button>
              ))
            )}
          </div>
        ) : (
          // Category view
          Array.from(categories).map(([category, nodes]) => (
            <div key={category}>
              <button
                onClick={() =>
                  setExpandedCategory(expandedCategory === category ? null : category)
                }
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: expandedCategory === category ? '#2a2a2a' : 'transparent',
                  border: 'none',
                  borderBottom: '1px solid #2a2a2a',
                  color: '#fff',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>{categoryLabels[category]}</span>
                <span style={{ color: '#666' }}>{nodes.length}</span>
              </button>

              {expandedCategory === category && (
                <div style={{ padding: '6px 10px', background: '#181818' }}>
                  {nodes.map((node) => (
                    <button
                      key={node.type}
                      onClick={() => handleAddNode(node)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
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
          ))
        )}
      </div>
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
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    flowPosition: { x: number; y: number };
  } | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

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

  // Handler para adicionar node via context menu na posição correta
  const handleAddNodeAtPosition = useCallback(
    (definition: NodeDefinition, position: { x: number; y: number }) => {
      const newNode: VisualNodeType = {
        id: `node-${Date.now()}`,
        type: 'visual',
        position,
        data: { definition },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  // Handler para context menu (clique direito)
  const handleContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      
      if (!reactFlowWrapper.current) return;
      
      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const x = event.clientX;
      const y = event.clientY;
      
      // Calcular posição no flow (aproximada, sem acesso ao viewport transform)
      const flowX = event.clientX - bounds.left;
      const flowY = event.clientY - bounds.top;
      
      setContextMenu({
        x,
        y,
        flowPosition: { x: flowX, y: flowY },
      });
    },
    []
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

      <div 
        ref={reactFlowWrapper}
        style={{ flex: 1 }}
        onContextMenu={handleContextMenu}
      >
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
          onPaneClick={() => setContextMenu(null)}
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

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          flowPosition={contextMenu.flowPosition}
          onClose={() => setContextMenu(null)}
          onAddNode={handleAddNodeAtPosition}
        />
      )}
    </div>
  );
}

export default VisualScriptEditor;
