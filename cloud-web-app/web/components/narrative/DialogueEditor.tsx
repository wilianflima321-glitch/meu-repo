'use client';

/**
 * DIALOGUE EDITOR - Aethel Engine
 *
 * Editor visual baseado em ns para criao de dilogos ramificados.
 * Sistema profissional inspirado em Ink, Yarn Spinner e Articy:Draft.
 *
 * FEATURES:
 * - Node-based dialogue flow
 * - Branching conversations
 * - Conditional logic (variables, flags)
 * - Character portraits/emotions
 * - Localization support
 * - Audio cue linking
 * - Real-time preview
 * - Export to runtime format
 */
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  MarkerType,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { initialEdges, initialNodes, nodeTypes, NodeInspector, PreviewPanel, VariablesPanel } from './DialogueEditorPanels';
import {
  MessageSquare,
  User,
  GitBranch,
  CircleDot,
  Settings,
  Play,
  Pause,
  Download,
  Upload,
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronRight,
  Eye,
  Volume2,
  Globe,
  Zap,
  Code,
  HelpCircle,
  Flag,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export type DialogueNodeType =
  | 'entry'
  | 'dialogue'
  | 'choice'
  | 'condition'
  | 'action'
  | 'exit'
  | 'random'
  | 'jump';

export interface DialogueLine {
  id: string;
  characterId: string;
  emotion: string;
  text: string;
  audioFile?: string;
  duration?: number;
  localization: Record<string, string>;
}

export interface DialogueChoice {
  id: string;
  text: string;
  condition?: string;
  localization: Record<string, string>;
}

export interface DialogueCondition {
  variable: string;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=';
  value: string | number | boolean;
}

export interface DialogueAction {
  type: 'set_variable' | 'trigger_event' | 'play_audio' | 'camera' | 'custom';
  params: Record<string, unknown>;
}

export interface DialogueNodeData extends Record<string, unknown> {
  label: string;
  nodeType: DialogueNodeType;
  lines?: DialogueLine[];
  choices?: DialogueChoice[];
  conditions?: DialogueCondition[];
  actions?: DialogueAction[];
  targetNode?: string;
  notes?: string;
}

export interface Character {
  id: string;
  name: string;
  portrait: string;
  color: string;
  emotions: string[];
}

export interface DialogueVariable {
  name: string;
  type: 'string' | 'number' | 'boolean';
  defaultValue: unknown;
}

// ============================================================================
// DEFAULT DATA
// ============================================================================

const DEFAULT_CHARACTERS: Character[] = [
  { id: 'player', name: 'Player', portrait: '/portraits/player.png', color: 'var(--aethel-primary)', emotions: ['neutral', 'happy', 'angry', 'sad', 'surprised'] },
  { id: 'npc1', name: 'Merchant', portrait: '/portraits/merchant.png', color: 'var(--aethel-success)', emotions: ['neutral', 'happy', 'suspicious', 'friendly'] },
  { id: 'npc2', name: 'Guard', portrait: '/portraits/guard.png', color: 'var(--aethel-error)', emotions: ['neutral', 'stern', 'alert', 'relaxed'] },
];

const DEFAULT_VARIABLES: DialogueVariable[] = [
  { name: 'player_gold', type: 'number', defaultValue: 100 },
  { name: 'has_key', type: 'boolean', defaultValue: false },
  { name: 'reputation', type: 'number', defaultValue: 50 },
  { name: 'quest_stage', type: 'string', defaultValue: 'not_started' },
];

// ============================================================================
// CUSTOM NODE: ENTRY
// ============================================================================

export interface DialogueEditorProps {
  dialogueId?: string;
  onSave?: (nodes: Node<DialogueNodeData>[], edges: Edge[]) => void;
  onExport?: (format: 'json' | 'yarn' | 'ink') => void;
}

export default function DialogueEditor({
  dialogueId,
  onSave,
  onExport,
}: DialogueEditorProps) {
  // Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Selection
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const selectedNode = useMemo(() =>
    nodes.find((n) => selectedNodes.includes(n.id)),
    [nodes, selectedNodes]
  );

  // Data
  const [characters] = useState<Character[]>(DEFAULT_CHARACTERS);
  const [variables, setVariables] = useState<DialogueVariable[]>(DEFAULT_VARIABLES);

  // Preview
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewNode, setPreviewNode] = useState<Node<DialogueNodeData> | null>(null);
  const [previewLineIndex, setPreviewLineIndex] = useState(0);

  // Connection handler
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, markerEnd: { type: MarkerType.ArrowClosed } }, eds));
    },
    [setEdges]
  );

  // Selection handler
  const onSelectionChange = useCallback(({ nodes }: { nodes: Node[] }) => {
    setSelectedNodes(nodes.map((n) => n.id));
  }, []);

  // Update node data
  const updateNodeData = useCallback((id: string, data: DialogueNodeData) => {
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data } : n)));
  }, [setNodes]);

  // Delete node
  const deleteNode = useCallback((id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  }, [setNodes, setEdges]);

  // Add node
  const addNode = useCallback((type: DialogueNodeType) => {
    const id = `${type}_${Date.now()}`;
    const newNode: Node<DialogueNodeData> = {
      id,
      type,
      position: { x: 400, y: 300 },
      data: {
        label: type.charAt(0).toUpperCase() + type.slice(1),
        nodeType: type,
        lines: type === 'dialogue' ? [] : undefined,
        choices: type === 'choice' ? [] : undefined,
        conditions: type === 'condition' ? [] : undefined,
        actions: type === 'action' ? [] : undefined,
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  // Preview navigation
  const startPreview = useCallback(() => {
    const entryNode = nodes.find((n) => n.type === 'entry');
    if (!entryNode) return;

    // Find first connected node
    const firstEdge = edges.find((e) => e.source === entryNode.id);
    const firstNode = nodes.find((n) => n.id === firstEdge?.target);

    setIsPreviewPlaying(true);
    setPreviewNode(firstNode || null);
    setPreviewLineIndex(0);
  }, [nodes, edges]);

  const advancePreview = useCallback(() => {
    if (!previewNode) return;

    const data = previewNode.data;

    // If dialogue, check if more lines
    if (data.nodeType === 'dialogue') {
      if (data.lines && previewLineIndex < data.lines.length - 1) {
        setPreviewLineIndex((i) => i + 1);
        return;
      }
    }

    // Move to next node
    const nextEdge = edges.find((e) => e.source === previewNode.id);
    const nextNode = nodes.find((n) => n.id === nextEdge?.target);

    if (nextNode?.type === 'exit') {
      setIsPreviewPlaying(false);
      setPreviewNode(null);
    } else {
      setPreviewNode(nextNode || null);
      setPreviewLineIndex(0);
    }
  }, [previewNode, previewLineIndex, nodes, edges]);

  const chooseOption = useCallback((choiceId: string) => {
    if (!previewNode) return;

    const nextEdge = edges.find((e) => e.source === previewNode.id && e.sourceHandle === choiceId);
    const nextNode = nodes.find((n) => n.id === nextEdge?.target);

    if (nextNode?.type === 'exit') {
      setIsPreviewPlaying(false);
      setPreviewNode(null);
    } else {
      setPreviewNode(nextNode || null);
      setPreviewLineIndex(0);
    }
  }, [previewNode, nodes, edges]);

  return (
    <div className="flex h-full w-full bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      {/* Main Flow */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectionChange={onSelectionChange}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          defaultEdgeOptions={{
            style: { stroke: 'var(--aethel-text-muted)', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed },
          }}
        >
          <Background color="var(--aethel-border-primary)" gap={15} />
          <Controls className="!bg-[var(--aethel-surface-secondary)] !border-[var(--aethel-border-primary)]" />
          <MiniMap
            className="!bg-[var(--aethel-surface-secondary)] !border-[var(--aethel-border-primary)]"
            nodeColor={(node) => {
              switch (node.type) {
                case 'entry': return 'var(--aethel-success)';
                case 'dialogue': return 'var(--aethel-primary)';
                case 'choice': return 'var(--aethel-warning)';
                case 'condition': return 'var(--aethel-accent)';
                case 'action': return 'var(--aethel-info)';
                case 'exit': return 'var(--aethel-error)';
                default: return 'var(--aethel-text-muted)';
              }
            }}
          />

          {/* Toolbar */}
          <Panel position="top-left" className="flex gap-2">
            <button type="button"
              onClick={() => addNode('dialogue')}
              className="flex items-center gap-1 px-3 py-2 bg-[var(--aethel-primary)] hover:brightness-110 rounded text-sm"
            >
              <MessageSquare className="w-4 h-4" />
              Dialogue
            </button>
            <button type="button"
              onClick={() => addNode('choice')}
              className="flex items-center gap-1 px-3 py-2 bg-[var(--aethel-warning-dark)] hover:bg-[var(--aethel-warning)] rounded text-sm"
            >
              <GitBranch className="w-4 h-4" />
              Choice
            </button>
            <button type="button"
              onClick={() => addNode('condition')}
              className="flex items-center gap-1 px-3 py-2 bg-[var(--aethel-primary)] hover:brightness-110 rounded text-sm"
            >
              <Code className="w-4 h-4" />
              Condition
            </button>
            <button type="button"
              onClick={() => addNode('action')}
              className="flex items-center gap-1 px-3 py-2 bg-[var(--aethel-info)] hover:brightness-110 rounded text-sm"
            >
              <Zap className="w-4 h-4" />
              Action
            </button>
            <button type="button"
              onClick={() => addNode('exit')}
              className="flex items-center gap-1 px-3 py-2 bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] rounded text-sm"
            >
              <Flag className="w-4 h-4" />
              Exit
            </button>
          </Panel>

          {/* Actions */}
          <Panel position="top-right" className="flex gap-2">
            <button type="button"
              onClick={() => onExport?.('json')}
              className="flex items-center gap-1 px-3 py-2 bg-[var(--aethel-surface-tertiary)] hover:bg-[var(--aethel-surface-quaternary)] rounded text-sm"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button type="button"
              className="flex items-center gap-1 px-3 py-2 bg-[var(--aethel-surface-tertiary)] hover:bg-[var(--aethel-surface-quaternary)] rounded text-sm"
            >
              <Upload className="w-4 h-4" />
              Import
            </button>
          </Panel>

          {/* Preview */}
          <Panel position="bottom-center">
            {isPreviewPlaying ? (
              <PreviewPanel
                isPlaying={isPreviewPlaying}
                onToggle={() => setIsPreviewPlaying(false)}
                currentNode={previewNode}
                currentLineIndex={previewLineIndex}
                characters={characters}
                onNext={advancePreview}
                onChoose={chooseOption}
              />
            ) : (
              <button type="button"
                onClick={startPreview}
                className="flex items-center gap-2 px-4 py-2 bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] rounded"
              >
                <Play className="w-4 h-4" />
                Preview
              </button>
            )}
          </Panel>
        </ReactFlow>
      </div>

      {/* Right Panel - Inspector */}
      <div className="w-80 border-l border-[var(--aethel-border-primary)] flex flex-col">
        <div className="p-3 border-b border-[var(--aethel-border-primary)]">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Settings className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
            Inspector
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          <NodeInspector
            node={selectedNode ?? null}
            characters={characters}
            onUpdate={updateNodeData}
            onDelete={deleteNode}
          />
        </div>

        {/* Variables */}
        <VariablesPanel
          variables={variables}
          onAdd={(v) => setVariables((vs) => [...vs, v])}
          onUpdate={(i, v) => {
            const vs = [...variables];
            vs[i] = v;
            setVariables(vs);
          }}
          onDelete={(i) => {
            const vs = [...variables];
            vs.splice(i, 1);
            setVariables(vs);
          }}
        />

        {/* Characters */}
        <div className="border-t border-[var(--aethel-border-primary)] p-3">
          <div className="text-xs text-[var(--aethel-text-tertiary)] mb-2">Characters</div>
          <div className="flex gap-2 flex-wrap">
            {characters.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                style={{ backgroundColor: c.color + '33' }}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: c.color }}
                />
                {c.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

