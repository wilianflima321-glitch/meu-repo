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
  EdgeTypes,
  Handle,
  Position,
  Panel,
  MarkerType,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { openConfirmDialog } from './lib/non-blocking-dialogs';
import {


  NODE_CATALOG,
  type NodeCategory,
  type NodeDefinition,
  type VisualNodeData,
} from './visual-node-catalog';
import { BlueprintsAIInput } from './BlueprintsAIInput';
import { NodePortValueInput } from './NodePortValueInput';
import { AETHEL_ASSET_DRAG_MIME, readAssetDragPayload } from '../../web/lib/ide/assetDragPayload';
import { createComponentLogger } from './lib/logger';
import { useVisualScriptPersistence } from './persistence';
import { SmartEdge } from './SmartEdge';
import { suggestNextNodeHeuristically, type GhostSuggestion } from './lib/ghost-suggestions';

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
    /** Ghost Nodes (FASE 3.1 Ação B) — AI-projected suggestion, committed with TAB. */
    isGhost?: boolean;
    /** Console hyperlink target (FASE 3.3) — briefly pulses red so the user can spot it. */
    isFlashing?: boolean;
  };
}

function VisualNode({ data }: VisualNodeProps) {
  const { definition, values = {}, onValueChange, isGhost, isFlashing } = data;
  // Universal Asset Drag (AGDS): a texture/material dragged out of the File
  // Explorer can be dropped directly onto any `string` port — same
  // `AETHEL_ASSET_DRAG_MIME` payload the 3D viewport already accepts
  // (`SceneViewportStage.tsx`). Only string ports accept it: the catalog's
  // `object` ports are live entity/runtime references (Target, Source,
  // Region...), not asset file paths, so they intentionally stay out of scope.
  const [assetDropPortId, setAssetDropPortId] = useState<string | null>(null);
  return (
    <div
      className={`visual-node rounded-[10px] min-w-[180px] shadow-[var(--aethel-shadow-md)] border transition-shadow ${
        isGhost ? 'opacity-50 pointer-events-none border-dashed border-[var(--aethel-text-primary)]' : 'border-[var(--aethel-border-primary)]'
      } ${isFlashing ? 'border-[var(--aethel-error)] animate-pulse ring-4 ring-[var(--aethel-error)]/60' : ''}`}
      style={{ background: definition.color }}
    >
      <div className="px-3 py-2 border-b border-[var(--aethel-border-secondary)] font-semibold text-[var(--aethel-text-primary)] text-xs tracking-[0.02em] flex items-center justify-between gap-2">
        <span>{definition.label}</span>
        {isGhost ? (
          <span className="rounded bg-[color-mix(in_srgb,var(--aethel-surface-primary)_55%,transparent)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--aethel-text-primary)]">
            Tab
          </span>
        ) : null}
      </div>
      <div className="py-2">
        {definition.inputs.map((port) => {
          const acceptsAssetDrop = port.type === 'string';
          return (
          <div
            key={port.id}
            className={`flex items-center px-3 py-1 relative rounded transition-colors ${
              acceptsAssetDrop && assetDropPortId === port.id
                ? 'bg-[color-mix(in_srgb,var(--aethel-info)_22%,transparent)] ring-1 ring-inset ring-[var(--aethel-info)]'
                : ''
            }`}
            onDragOver={acceptsAssetDrop ? (event) => {
              if (!event.dataTransfer.types.includes(AETHEL_ASSET_DRAG_MIME)) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = 'copy';
              setAssetDropPortId(port.id);
            } : undefined}
            onDragLeave={acceptsAssetDrop ? () => setAssetDropPortId((current) => (current === port.id ? null : current)) : undefined}
            onDrop={acceptsAssetDrop ? (event) => {
              const payload = readAssetDragPayload(event.dataTransfer);
              if (!payload) return;
              event.preventDefault();
              event.stopPropagation();
              setAssetDropPortId(null);
              onValueChange?.(port.id, payload.path);
            } : undefined}
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
              <NodePortValueInput
                port={port}
                value={values[port.id]}
                onCommit={(nextValue) => onValueChange?.(port.id, nextValue)}
                className="ml-auto w-[70px] px-1.5 py-0.5 text-[10px] bg-[var(--aethel-surface-quaternary)] rounded border border-[var(--aethel-border-primary)] text-[var(--aethel-text-primary)] outline-none focus:border-[var(--aethel-primary)]"
              />
            )}
          </div>
          );
        })}
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
    ability: 'Ability (GAS)',
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
    ability: 'Ability (GAS)',
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
  /**
   * Stable id to enable native offline persistence (Yjs + IndexedDB, see
   * `./persistence.ts`). When provided, the editor survives tab closes/
   * connectivity loss with zero external wiring — the package owns its own
   * save path, per Golden Rule 1 (Isomorfismo Fractal). Omit to keep the
   * editor purely controlled by `script`/`onChange` (e.g. when the host app
   * already provides its own persistence, as `web/` does today via
   * `lib/visual-script-collaboration.ts` for live multi-user sync).
   */
  persistenceId?: string;
  /**
   * Injectable AI backend for "Generate with AI" blueprint scaffolding
   * (Golden Rule 1: no package-internal network calls / hardcoded API
   * routes). Host apps wire their real chat backend here; when omitted the
   * feature no-ops with a warning instead of silently depending on a
   * `/api/ai/chat-advanced` route that only exists inside `web/`.
   */
  onGenerateBlueprint?: (prompt: string) => Promise<string>;
  /**
   * Injectable AI backend for Ghost Node suggestions (FASE 3.1 Ação B). When
   * omitted, `suggestNextNodeHeuristically` (a local, synchronous, zero-network
   * affinity table — see `lib/ghost-suggestions.ts`) drives the projection
   * instead. Host apps that want real LLM-driven graph-diff suggestions wire
   * this the same way `onGenerateBlueprint` is wired.
   */
  onSuggestNextNodes?: (graph: VisualScript) => Promise<GhostSuggestion | null>;
}
const nodeTypes: NodeTypes = {
  visual: VisualNode,
};
const edgeTypes: EdgeTypes = {
  smart: SmartEdge,
};
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable
}
export function VisualScriptEditor({ script, onChange, persistenceId, onGenerateBlueprint, onSuggestNextNodes }: VisualScriptEditorProps) {
  const initialNodes = script?.nodes ?? [];
  const initialEdges = script?.edges ?? [];
  const [nodes, setNodes, onNodesChange] = useNodesState<VisualNodeType>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const persistence = useVisualScriptPersistence({
    documentId: persistenceId ?? '',
    enabled: !!persistenceId,
  });
  const hasHydratedFromPersistence = useRef(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    flowPosition: { x: number; y: number };
  } | null>(null);
  const [blueprintAIOpen, setBlueprintAIOpen] = useState(false);
  const [blueprintGenerating, setBlueprintGenerating] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstanceRef = useRef<ReactFlowInstance<VisualNodeType, Edge> | null>(null);
  const [ghost, setGhost] = useState<GhostSuggestion | null>(null);

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
        type: 'smart',
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
  // ── Ghost Nodes (FASE 3.1 Ação B) ─────────────────────────────────────────
  // Recomputes whenever the graph changes: prefers the injected AI backend
  // (if provided) and otherwise falls back to the local heuristic so the
  // feature always works without extra host wiring.
  useEffect(() => {
    let cancelled = false;
    if (onSuggestNextNodes) {
      onSuggestNextNodes(compileScript())
        .then((suggestion) => { if (!cancelled) setGhost(suggestion); })
        .catch((error) => {
          log.error('Ghost node AI suggestion failed — falling back to heuristic.', error);
          if (!cancelled) setGhost(suggestNextNodeHeuristically(nodes, edges));
        });
    } else {
      setGhost(suggestNextNodeHeuristically(nodes, edges));
    }
    return () => { cancelled = true; };
  }, [nodes, edges, onSuggestNextNodes, compileScript]);

  const commitGhostNode = useCallback(() => {
    if (!ghost) return;
    const newNodeId = `node-${Date.now()}`;
    const newNode: VisualNodeType = {
      id: newNodeId,
      type: 'visual',
      position: ghost.position,
      data: { definition: ghost.definition },
    };
    const execInput = ghost.definition.inputs.find((port) => port.type === 'exec');
    setNodes((nds) => [...nds, newNode]);
    if (execInput) {
      const newEdge: Edge = {
        id: `edge-${Date.now()}`,
        source: ghost.sourceNodeId,
        sourceHandle: ghost.sourcePortId,
        target: newNodeId,
        targetHandle: execInput.id,
        type: 'smart',
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: ui.text, strokeWidth: 2 },
        animated: true,
      } as Edge;
      setEdges((eds) => addEdge(newEdge, eds));
    }
    setGhost(null);
  }, [ghost, setNodes, setEdges]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !ghost || isEditableTarget(event.target)) return;
      event.preventDefault();
      commitGhostNode();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [ghost, commitGhostNode]);

  // ── Universal Search (FASE 3.5) -> insert node into this graph ────────────
  useEffect(() => {
    const onInsertNode = (event: Event) => {
      const nodeType = (event as CustomEvent<{ nodeType?: string }>).detail?.nodeType;
      const definition = nodeType ? NODE_CATALOG.find((candidate) => candidate.type === nodeType) : undefined;
      if (!definition) {
        log.warn('Command palette requested an unknown scripting node type', { nodeType });
        return;
      }
      handleAddNode(definition);
    };
    window.addEventListener('aethel.visualScript.insertNode', onInsertNode);
    return () => window.removeEventListener('aethel.visualScript.insertNode', onInsertNode);
  }, [handleAddNode]);

  // ── Console hyperlink -> focus + flash node (FASE 3.3) ────────────────────
  useEffect(() => {
    const onFocusNode = (event: Event) => {
      const nodeId = (event as CustomEvent<{ nodeId?: string }>).detail?.nodeId;
      if (!nodeId) return;
      const target = reactFlowInstanceRef.current?.getNode(nodeId);
      if (!target) {
        log.warn('Console requested focus on an unknown visual script node', { nodeId });
        return;
      }
      const width = target.measured?.width ?? 200;
      const height = target.measured?.height ?? 80;
      reactFlowInstanceRef.current?.setCenter(target.position.x + width / 2, target.position.y + height / 2, {
        zoom: 1.2,
        duration: 800,
      });
      setNodes((nds) => nds.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, isFlashing: true } } : node)));
      window.setTimeout(() => {
        setNodes((nds) => nds.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, isFlashing: false } } : node)));
      }, 1600);
    };
    window.addEventListener('aethel.visualScript.focusNode', onFocusNode);
    return () => window.removeEventListener('aethel.visualScript.focusNode', onFocusNode);
  }, [setNodes]);

  const handleBlueprintGenerate = useCallback(async (prompt: string) => {
    if (!onGenerateBlueprint) {
      log.warn('Blueprint AI requested but no onGenerateBlueprint backend was injected — skipping.');
      setBlueprintAIOpen(false);
      return;
    }
    setBlueprintGenerating(true);
    try {
      const raw = await onGenerateBlueprint(
        `Generate blueprint nodes for: ${prompt}. Return actionable node graph instructions.`
      );
      log.info('Blueprint AI response received', { length: raw.length });
    } catch (error) {
      log.error('Blueprint AI generation failed', error);
    } finally {
      setBlueprintGenerating(false);
      setBlueprintAIOpen(false);
    }
  }, [onGenerateBlueprint]);
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
  // Native offline persistence (only active when `persistenceId` is set — see prop doc above).
  useEffect(() => {
    if (!persistenceId || !persistence.isSynced || hasHydratedFromPersistence.current) return;
    hasHydratedFromPersistence.current = true;
    const hydrated = persistence.hydrate(compileScript());
    setNodes(hydrated.nodes);
    setEdges(hydrated.edges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistenceId, persistence.isSynced]);

  useEffect(() => {
    if (!persistenceId) return;
    return persistence.subscribe((remote) => {
      setNodes(remote.nodes);
      setEdges(remote.edges);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistenceId, persistence]);

  React.useEffect(() => {
    const compiled = compileScript();
    onChange?.(compiled);
    if (persistenceId && hasHydratedFromPersistence.current) {
      persistence.applyScript(compiled);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, onChange, compileScript, persistenceId]);

  // Ghost node/edge are display-only projections — never merged into the
  // real `nodes`/`edges` state until TAB commits them (see commitGhostNode).
  const displayNodes = useMemo<VisualNodeType[]>(() => {
    if (!ghost) return nodes;
    const ghostNode: VisualNodeType = {
      id: '__ghost__',
      type: 'visual',
      position: ghost.position,
      selectable: false,
      draggable: false,
      data: { definition: ghost.definition, isGhost: true },
    };
    return [...nodes, ghostNode];
  }, [nodes, ghost]);

  const displayEdges = useMemo<Edge[]>(() => {
    if (!ghost) return edges;
    const execInput = ghost.definition.inputs.find((port) => port.type === 'exec');
    if (!execInput) return edges;
    const ghostEdge: Edge = {
      id: '__ghost-edge__',
      source: ghost.sourceNodeId,
      sourceHandle: ghost.sourcePortId,
      target: '__ghost__',
      targetHandle: execInput.id,
      type: 'smart',
      style: { stroke: ui.text, strokeWidth: 2, strokeDasharray: '4 4', opacity: 0.5 },
      selectable: false,
    } as Edge;
    return [...edges, ghostEdge];
  }, [edges, ghost]);

  return (
    <div className="flex h-full w-full">
      <NodePalette onAddNode={handleAddNode} />
      <div
        ref={reactFlowWrapper}
        className="flex-1"
        onContextMenu={handleContextMenu}
      >
        <ReactFlow
          nodes={displayNodes}
          edges={displayEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={(instance) => { reactFlowInstanceRef.current = instance; }}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{ type: 'smart' }}
          fitView
          snapToGrid
          snapGrid={[16, 16]}
          connectionRadius={20}
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
              {ghost ? (
                <div
                  className="flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_82%,transparent)] px-3 py-2 text-xs text-[var(--aethel-text-secondary)]"
                  role="status"
                >
                  <kbd className="rounded bg-[var(--aethel-surface-tertiary)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--aethel-text-primary)]">Tab</kbd>
                  Add &ldquo;{ghost.definition.label}&rdquo;
                </div>
              ) : null}
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
