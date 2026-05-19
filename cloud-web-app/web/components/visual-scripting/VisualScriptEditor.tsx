'use client';
import React, { useCallback, useState, useMemo, useRef, useEffect } from 'react';
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
import { openConfirmDialog } from '@/lib/ui/non-blocking-dialogs';
import {


  NODE_CATALOG,
  type NodeCategory,
  type NodeDefinition,
  type VisualNodeData,
} from './visual-node-catalog';
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('VisualScriptEditor')


export type { PortDefinition } from './visual-node-catalog';

export type VisualNodeType = Node<VisualNodeData>;

const ui = {
  surface: 'var(--aethel-surface-secondary)',
  surfaceAlt: 'var(--aethel-surface-tertiary)',
  surfaceDeep: 'var(--aethel-surface-primary)',
  surfaceMuted: 'var(--aethel-surface-quaternary)',
  border: 'var(--aethel-border-primary)',
  borderStrong: 'var(--aethel-border-secondary)',
  text: 'var(--aethel-text-primary)',
  textMuted: 'var(--aethel-text-tertiary)',
  textDim: 'var(--aethel-text-quaternary)',
  focus: 'var(--aethel-primary)',
  success: 'var(--aethel-success)',
  error: 'var(--aethel-error)',
  warning: 'var(--aethel-warning)',
  info: 'var(--aethel-info)',
};

const portColors: Record<string, string> = {
  exec: ui.text,
  boolean: ui.error,
  number: ui.success,
  string: ui.warning,
  vector3: 'var(--aethel-accent)',
  object: ui.info,
  any: ui.textDim,
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
        borderRadius: '10px',
        minWidth: '180px',
        boxShadow: 'var(--aethel-shadow-md)',
        border: `1px solid ${ui.border}`,
      }}
    >
      <div
        style={{
          padding: '8px 12px',
          borderBottom: `1px solid ${ui.borderStrong}`,
          fontWeight: 600,
          color: ui.text,
          fontSize: '12px',
          letterSpacing: '0.02em',
        }}
      >
        {definition.label}
      </div>
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
                border: `2px solid ${ui.text}`,
                left: '-6px',
              }}
            />
            <span style={{ color: ui.text, fontSize: '11px', marginLeft: '8px' }}>
              {port.label}
            </span>
            {port.type !== 'exec' && port.type !== 'object' && (
              <input
                type={port.type === 'number' ? 'number' : 'text'}
                defaultValue={values[port.id] as string ?? port.default}
                onChange={(e) => onValueChange?.(port.id, e.target.value)}
                aria-label={`Valor da entrada ${port.label}`}
                style={{
                  marginLeft: 'auto',
                  width: '70px',
                  padding: '2px 6px',
                  fontSize: '10px',
                  background: ui.surfaceMuted,
                  borderRadius: '4px',
                  border: `1px solid ${ui.border}`,
                  color: ui.text,
                }}
              />
            )}
          </div>
        ))}
      </div>
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
            <span style={{ color: ui.text, fontSize: '11px', marginRight: '8px' }}>
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
                border: `2px solid ${ui.text}`,
                right: '-6px',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
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
    event: 'Eventos',
    action: 'Acoes',
    condition: 'Condicoes',
    variable: 'Variaveis',
    math: 'Matematica',
    flow: 'Fluxo',
    input: 'Input',
    physics: 'Fisica',
    audio: 'Audio',
    ui: 'UI',
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
        background: ui.surface,
        borderRight: `1px solid ${ui.border}`,
        overflowY: 'auto',
        height: '100%',
      }}
    >
      <div style={{ padding: '12px' }}>
        <input
          type="text"
          placeholder="Search nos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Search nos na paleta"
          style={{
            width: '100%',
            background: ui.surfaceAlt,
            fontSize: '13px',
            padding: '10px 12px',
            border: `1px solid ${ui.border}`,
            borderRadius: '8px',
            color: ui.text,
          }}
        />
      </div>
      {Array.from(filteredCategories).map(([category, nodes]) => (
        <div key={category}>
          <button type="button"
            onClick={() =>
              setExpandedCategory(expandedCategory === category ? null : category)
            }
            aria-label={`${expandedCategory === category ? 'Recolher' : 'Expandir'} categoria ${categoryLabels[category]}`}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: expandedCategory === category ? ui.surfaceAlt : 'transparent',
              borderRadius: 0,
              border: 'none',
              color: ui.text,
              textAlign: 'left',
              fontSize: '13px',
              fontWeight: 600,
              justifyContent: 'space-between',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
            }}
          >
            <span>{categoryLabels[category]}</span>
            <span style={{ color: ui.textDim }}>({nodes.length})</span>
          </button>
          {expandedCategory === category && (
            <div style={{ padding: '4px 8px' }}>
              {nodes.map((node) => (
                <button type="button"
                  key={node.type}
                  onClick={() => onAddNode(node)}
                  aria-label={`Add no ${node.label}`}
                  style={{
                    width: '100%',
                    padding: '8px',
                    marginBottom: '4px',
                    background: node.color,
                    border: `1px solid ${ui.border}`,
                    borderRadius: '6px',
                    color: ui.text,
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
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
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
    event: 'Eventos',
    action: 'Acoes',
    condition: 'Condicoes',
    variable: 'Variaveis',
    math: 'Matematica',
    flow: 'Fluxo',
    input: 'Input',
    physics: 'Fisica',
    audio: 'Audio',
    ui: 'UI',
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
        background: ui.surface,
        border: `1px solid ${ui.borderStrong}`,
        borderRadius: '10px',
        boxShadow: 'var(--aethel-shadow-lg)',
        overflow: 'hidden',
        zIndex: 1000,
      }}
    >
      <div style={{ padding: '12px', borderBottom: `1px solid ${ui.border}` }}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search no para criar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Search no para adicionar ao canvas"
          style={{
            width: '100%',
            padding: '10px 12px',
            background: ui.surfaceAlt,
            fontSize: '14px',
            border: `1px solid ${ui.border}`,
            borderRadius: '8px',
            color: ui.text,
          }}
        />
        <div style={{ fontSize: '11px', color: ui.textDim, marginTop: '6px' }}>
          Clique com o botao direito no canvas para abrir este menu
        </div>
      </div>
      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {filteredNodes ? (
          <div style={{ padding: '8px' }}>
            {filteredNodes.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: ui.textDim }}>
                No no encontrado
              </div>
            ) : (
              filteredNodes.map((node) => (
                <button type="button"
                  key={node.type}
                  onClick={() => handleAddNode(node)}
                  aria-label={`Create no ${node.label}`}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    marginBottom: '4px',
                    background: node.color,
                    border: `1px solid ${ui.border}`,
                    borderRadius: '8px',
                    color: ui.text,
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
          Array.from(categories).map(([category, nodes]) => (
            <div key={category}>
              <button type="button"
                onClick={() =>
                  setExpandedCategory(expandedCategory === category ? null : category)
                }
                aria-label={`${expandedCategory === category ? 'Recolher' : 'Expandir'} categoria ${categoryLabels[category]} no menu contextual`}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: expandedCategory === category ? ui.surfaceAlt : 'transparent',
                  borderRadius: 0,
                  borderBottom: `1px solid ${ui.border}`,
                  borderLeft: 'none',
                  borderRight: 'none',
                  borderTop: 'none',
                  color: ui.text,
                  textAlign: 'left',
                  fontSize: '13px',
                  fontWeight: 500,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>{categoryLabels[category]}</span>
                <span style={{ color: ui.textDim }}>{nodes.length}</span>
              </button>
              {expandedCategory === category && (
                <div style={{ padding: '6px 10px', background: ui.surfaceDeep }}>
                  {nodes.map((node) => (
                    <button type="button"
                      key={node.type}
                      onClick={() => handleAddNode(node)}
                      aria-label={`Add no ${node.label} a partir do menu contextual`}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        marginBottom: '4px',
                        background: node.color,
                        border: `1px solid ${ui.border}`,
                        borderRadius: '6px',
                        color: ui.text,
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
        style: { stroke: ui.text, strokeWidth: 2 },
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
  const handleContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      if (!reactFlowWrapper.current) return;
      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const x = event.clientX;
      const y = event.clientY;
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
  const compileScript = useCallback((): VisualScript => {
    return {
      id: script?.id || `script-${Date.now()}`,
      name: script?.name || 'New Script',
      nodes,
      edges,
      variables: script?.variables || [],
    };
  }, [nodes, edges, script]);
  const handleClearGraph = useCallback(async () => {
    const shouldClear = await openConfirmDialog({
      title: 'Limpar grafo',
      message: 'Limpar todos os nos?',
      confirmText: 'Limpar',
      cancelText: 'Cancel',
    });
    if (!shouldClear) return;
    setNodes([]);
    setEdges([]);
  }, [setEdges, setNodes]);
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
          style={{ background: ui.surfaceDeep }}
          onPaneClick={() => setContextMenu(null)}
        >
          <Background color={ui.borderStrong} gap={16} />
          <Controls />
          <MiniMap
            nodeColor={(node: VisualNodeType) => node.data?.definition?.color || ui.surfaceAlt}
            style={{ background: ui.surface }}
          />
          <Panel position="top-right">
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button"
                onClick={() => {
                  const json = JSON.stringify(compileScript(), null, 2);
                  log.info('Compiled Script:', json);
                  navigator.clipboard.writeText(json);
                }}
                aria-label="Save visual script and copy JSON"
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${ui.borderStrong}`,
                  background: ui.focus,
                  color: ui.text,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Save
              </button>
              <button type="button"
                onClick={handleClearGraph}
                aria-label="Limpar todos os nos do script visual"
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${ui.borderStrong}`,
                  background: ui.error,
                  color: ui.text,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Limpar
              </button>
            </div>
          </Panel>
        </ReactFlow>
      </div>
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
