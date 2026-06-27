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
import { BlueprintsAIInput } from './BlueprintsAIInput';
import { requestAdvancedChat } from '@/lib/ai-chat-advanced-client';
import { createComponentLogger } from '@/lib/observability/logger';

const log = createComponentLogger('VisualScriptEditor');

export type { PortDefinition } from './visual-node-catalog';

export type VisualNodeType = Node<VisualNodeData>;

// Token references kept only for ReactFlow props that require raw color
// strings (edge stroke, minimap, background). All structural styling lives
// in Tailwind classes that resolve the same `--aethel-*` tokens.
const ui = {
  surface: 'var(--aethel-surface-secondary)',
  surfaceAlt: 'var(--aethel-surface-tertiary)',
  surfaceDeep: 'var(--aethel-surface-primary)',
  borderStrong: 'var(--aethel-border-secondary)',
  text: 'var(--aethel-text-primary)',
};

// Port colors are data-driven (depend on the port's data type) and therefore
// must stay as inline style values rather than static Tailwind classes.
const portColors: Record<string, string> = {
  exec: 'var(--aethel-text-primary)',
  boolean: 'var(--aethel-error)',
  number: 'var(--aethel-success)',
  string: 'var(--aethel-warning)',
  vector3: 'var(--aethel-accent)',
  object: 'var(--aethel-info)',
  any: 'var(--aethel-text-quaternary)',
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
      className="visual-node rounded-[10px] min-w-[180px] shadow-[var(--aethel-shadow-md)] border border-[var(--aethel-border-primary)]"
      style={{ background: definition.color }}
    >
      <div className="px-3 py-2 border-b border-[var(--aethel-border-secondary)] font-semibold text-[var(--aethel-text-primary)] text-xs tracking-[0.02em]">
        {definition.label}
      </div>
      <div className="py-2">
        {definition.inputs.map((port) => (
          <div
            key={port.id}
            className="flex items-center px-3 py-1 relative"
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
                border: '2px solid var(--aethel-text-primary)',
                left: '-6px',
              }}
            />
            <span className="text-[var(--aethel-text-primary)] text-[11px] ml-2">
              {port.label}
            </span>
            {port.type !== 'exec' && port.type !== 'object' && (
              <input
                type={port.type === 'number' ? 'number' : 'text'}
                defaultValue={values[port.id] as string ?? port.default}
                onChange={(e) => onValueChange?.(port.id, e.target.value)}
                aria-label={`Value for input ${port.label}`}
                className="ml-auto w-[70px] px-1.5 py-0.5 text-[10px] bg-[var(--aethel-surface-quaternary)] rounded border border-[var(--aethel-border-primary)] text-[var(--aethel-text-primary)]"
              />
            )}
          </div>
        ))}
      </div>
      <div className="py-2">
        {definition.outputs.map((port) => (
          <div
            key={port.id}
            className="flex items-center justify-end px-3 py-1 relative"
          >
            <span className="text-[var(--aethel-text-primary)] text-[11px] mr-2">
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
                border: '2px solid var(--aethel-text-primary)',
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
    event: 'Events',
    action: 'Actions',
    condition: 'Conditions',
    variable: 'Variables',
    math: 'Math',
    flow: 'Flow',
    input: 'Input',
    physics: 'Physics',
    audio: 'Audio',
    ui: 'UI',
    material: 'Material',
    'world-gen': 'World Gen',
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
    <div className="h-full w-[250px] overflow-y-auto border-r border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)]">
      <div className="p-3">
        <input
          type="text"
          placeholder="Search nodes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Search nodes in the palette"
          className="w-full rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-tertiary)] px-3 py-2.5 text-[13px] text-[var(--aethel-text-primary)]"
        />
      </div>
      {Array.from(filteredCategories).map(([category, nodes]) => (
        <div key={category}>
          <button
            type="button"
            onClick={() =>
              setExpandedCategory(expandedCategory === category ? null : category)
            }
            aria-label={`${expandedCategory === category ? 'Collapse' : 'Expand'} ${categoryLabels[category]} category`}
            className={`flex w-full cursor-pointer items-center justify-between border-none px-3 py-2.5 text-left text-[13px] font-semibold text-[var(--aethel-text-primary)] ${
              expandedCategory === category ? 'bg-[var(--aethel-surface-tertiary)]' : 'bg-transparent'
            }`}
          >
            <span>{categoryLabels[category]}</span>
            <span className="text-[var(--aethel-text-quaternary)]">({nodes.length})</span>
          </button>
          {expandedCategory === category && (
            <div className="px-2 py-1">
              {nodes.map((node) => (
                <button
                  type="button"
                  key={node.type}
                  onClick={() => onAddNode(node)}
                  aria-label={`Add ${node.label} node`}
                  className="mb-1 w-full cursor-pointer rounded-md border border-[var(--aethel-border-primary)] p-2 text-left text-[12px] text-[var(--aethel-text-primary)]"
                  style={{ background: node.color }}
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
    event: 'Events',
    action: 'Actions',
    condition: 'Conditions',
    variable: 'Variables',
    math: 'Math',
    flow: 'Flow',
    input: 'Input',
    physics: 'Physics',
    audio: 'Audio',
    ui: 'UI',
    material: 'Material',
    'world-gen': 'World Gen',
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
      className="fixed z-[1000] max-h-[400px] w-[280px] overflow-hidden rounded-[10px] border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] shadow-[var(--aethel-shadow-lg)]"
      style={{ left: x, top: y }}
    >
      <div className="border-b border-[var(--aethel-border-primary)] p-3">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search nodes to create..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Search nodes to add to the canvas"
          className="w-full rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-tertiary)] px-3 py-2.5 text-[14px] text-[var(--aethel-text-primary)]"
        />
        <div className="mt-1.5 text-[11px] text-[var(--aethel-text-quaternary)]">
          Right-click the canvas to open this menu
        </div>
      </div>
      <div className="max-h-[300px] overflow-y-auto">
        {filteredNodes ? (
          <div className="p-2">
            {filteredNodes.length === 0 ? (
              <div className="p-4 text-center text-[var(--aethel-text-quaternary)]">
                No nodes found
              </div>
            ) : (
              filteredNodes.map((node) => (
                <button
                  type="button"
                  key={node.type}
                  onClick={() => handleAddNode(node)}
                  aria-label={`Create ${node.label} node`}
                  className="mb-1 flex w-full cursor-pointer flex-col gap-0.5 rounded-lg border border-[var(--aethel-border-primary)] px-3 py-2.5 text-left text-[13px] text-[var(--aethel-text-primary)]"
                  style={{ background: node.color }}
                >
                  <span className="font-semibold">{node.label}</span>
                  <span className="text-[11px] opacity-80">{node.description}</span>
                </button>
              ))
            )}
          </div>
        ) : (
          Array.from(categories).map(([category, nodes]) => (
            <div key={category}>
              <button
                type="button"
                onClick={() =>
                  setExpandedCategory(expandedCategory === category ? null : category)
                }
                aria-label={`${expandedCategory === category ? 'Collapse' : 'Expand'} ${categoryLabels[category]} category in the context menu`}
                className={`flex w-full items-center justify-between border-b border-[var(--aethel-border-primary)] px-3.5 py-2.5 text-left text-[13px] font-medium text-[var(--aethel-text-primary)] ${
                  expandedCategory === category ? 'bg-[var(--aethel-surface-tertiary)]' : 'bg-transparent'
                }`}
              >
                <span>{categoryLabels[category]}</span>
                <span className="text-[var(--aethel-text-quaternary)]">{nodes.length}</span>
              </button>
              {expandedCategory === category && (
                <div className="bg-[var(--aethel-surface-primary)] px-2.5 py-1.5">
                  {nodes.map((node) => (
                    <button
                      type="button"
                      key={node.type}
                      onClick={() => handleAddNode(node)}
                      aria-label={`Add ${node.label} node from the context menu`}
                      className="mb-1 w-full cursor-pointer rounded-md border border-[var(--aethel-border-primary)] px-2.5 py-2 text-left text-[12px] text-[var(--aethel-text-primary)]"
                      style={{ background: node.color }}
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
  const [blueprintAIOpen, setBlueprintAIOpen] = useState(false);
  const [blueprintGenerating, setBlueprintGenerating] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'i') {
        event.preventDefault();
        setBlueprintAIOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
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
  const handleBlueprintGenerate = useCallback(async (prompt: string) => {
    setBlueprintGenerating(true);
    try {
      const result = await requestAdvancedChat({
        message: `Generate blueprint nodes for: ${prompt}. Return actionable node graph instructions.`,
        model: 'openrouter/auto',
        messages: [{ role: 'user', content: prompt }],
        profileOverride: { qualityMode: 'delivery', agentCount: 1, enableWebResearch: false },
      });
      log.info('Blueprint AI response received', { length: result.raw.length });
    } catch (error) {
      log.error('Blueprint AI generation failed', error);
    } finally {
      setBlueprintGenerating(false);
      setBlueprintAIOpen(false);
    }
  }, []);
  const handleClearGraph = useCallback(async () => {
    const shouldClear = await openConfirmDialog({
      title: 'Clear graph',
      message: 'Clear all nodes?',
      confirmText: 'Clear',
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
    <div className="flex h-full w-full">
      <NodePalette onAddNode={handleAddNode} />
      <div
        ref={reactFlowWrapper}
        className="flex-1"
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
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const json = JSON.stringify(compileScript(), null, 2);
                  log.info('Compiled Script:', json);
                  navigator.clipboard.writeText(json);
                }}
                aria-label="Save visual script and copy JSON"
                className="cursor-pointer rounded-lg border border-[var(--aethel-border-secondary)] bg-[var(--aethel-primary)] px-4 py-2 font-semibold text-[var(--aethel-text-primary)]"
              >
                Save
              </button>
              <button
                type="button"
                onClick={handleClearGraph}
                aria-label="Clear all visual script nodes"
                className="cursor-pointer rounded-lg border border-[var(--aethel-border-secondary)] bg-[var(--aethel-error)] px-4 py-2 font-semibold text-[var(--aethel-text-primary)]"
              >
                Clear
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
      <BlueprintsAIInput
        isOpen={blueprintAIOpen}
        onClose={() => setBlueprintAIOpen(false)}
        onGenerate={handleBlueprintGenerate}
        isGenerating={blueprintGenerating}
      />
    </div>
  );
}
export default VisualScriptEditor;
