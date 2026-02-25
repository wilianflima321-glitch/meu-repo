/**
 * DIALOGUE EDITOR - Aethel Engine
 * 
 * Editor visual baseado em nós para criação de diálogos ramificados.
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

'use client';

import React, { useState, useCallback, useMemo } from 'react';
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
import {
  MessageSquare,
  GitBranch,
  Settings,
  Play,
  Pause,
  Download,
  Upload,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Volume2,
  Globe,
  Zap,
  Code,
  Flag,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

import type {
  Character,
  DialogueAction,
  DialogueChoice,
  DialogueCondition,
  DialogueLine,
  DialogueNodeData,
  DialogueNodeType,
  DialogueVariable,
} from './DialogueEditor.types';
import {
  DEFAULT_CHARACTERS,
  DEFAULT_VARIABLES,
  initialDialogueEdges,
  initialDialogueNodes,
} from './DialogueEditor.initial-data';
import { dialogueNodeTypes } from './DialogueEditor.nodes';

export type {
  Character,
  DialogueAction,
  DialogueChoice,
  DialogueCondition,
  DialogueLine,
  DialogueNodeData,
  DialogueNodeType,
  DialogueVariable,
} from './DialogueEditor.types';

// ============================================================================
// DIALOGUE LINE EDITOR
// ============================================================================

interface DialogueLineEditorProps {
  line: DialogueLine;
  characters: Character[];
  onUpdate: (line: DialogueLine) => void;
  onDelete: () => void;
}

function DialogueLineEditor({ line, characters, onUpdate, onDelete }: DialogueLineEditorProps) {
  const character = characters.find((c) => c.id === line.characterId);
  
  return (
    <div className="bg-slate-800/50 rounded p-3 mb-2">
      <div className="flex gap-2 mb-2">
        <select
          value={line.characterId}
          onChange={(e) => onUpdate({ ...line, characterId: e.target.value })}
          className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm"
        >
          {characters.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        
        <select
          value={line.emotion}
          onChange={(e) => onUpdate({ ...line, emotion: e.target.value })}
          className="w-28 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm"
        >
          {character?.emotions.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        
        <button
          onClick={onDelete}
          className="p-1 rounded bg-red-600/30 hover:bg-red-600/50"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      </div>
      
      <textarea
        value={line.text}
        onChange={(e) => onUpdate({ ...line, text: e.target.value })}
        className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm resize-none"
        rows={3}
        placeholder="Enter dialogue text..."
      />
      
      <div className="flex gap-2 mt-2">
        <button className="flex items-center gap-1 px-2 py-1 bg-slate-700 rounded text-xs hover:bg-slate-600">
          <Volume2 className="w-3 h-3" />
          Audio
        </button>
        <button className="flex items-center gap-1 px-2 py-1 bg-slate-700 rounded text-xs hover:bg-slate-600">
          <Globe className="w-3 h-3" />
          Localize
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// NODE INSPECTOR
// ============================================================================

interface NodeInspectorProps {
  node: Node<DialogueNodeData> | null;
  characters: Character[];
  onUpdate: (id: string, data: DialogueNodeData) => void;
  onDelete: (id: string) => void;
}

function NodeInspector({ node, characters, onUpdate, onDelete }: NodeInspectorProps) {
  if (!node) {
    return (
      <div className="p-4 text-center text-slate-500">
        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Select a node to edit</p>
      </div>
    );
  }
  
  const data = node.data;
  
  const updateData = (updates: Partial<DialogueNodeData>) => {
    onUpdate(node.id, { ...data, ...updates });
  };
  
  const addLine = () => {
    const newLine: DialogueLine = {
      id: `line_${Date.now()}`,
      characterId: characters[0]?.id || 'player',
      emotion: 'neutral',
      text: '',
      localization: {},
    };
    updateData({ lines: [...(data.lines || []), newLine] });
  };
  
  const updateLine = (index: number, line: DialogueLine) => {
    const lines = [...(data.lines || [])];
    lines[index] = line;
    updateData({ lines });
  };
  
  const deleteLine = (index: number) => {
    const lines = [...(data.lines || [])];
    lines.splice(index, 1);
    updateData({ lines });
  };
  
  const addChoice = () => {
    const newChoice: DialogueChoice = {
      id: `choice_${Date.now()}`,
      text: 'New choice',
      localization: {},
    };
    updateData({ choices: [...(data.choices || []), newChoice] });
  };
  
  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {data.nodeType === 'dialogue' && <MessageSquare className="w-5 h-5 text-blue-400" />}
          {data.nodeType === 'choice' && <GitBranch className="w-5 h-5 text-amber-400" />}
          {data.nodeType === 'condition' && <Code className="w-5 h-5 text-blue-400" />}
          {data.nodeType === 'action' && <Zap className="w-5 h-5 text-cyan-400" />}
          <span className="font-medium capitalize">{data.nodeType}</span>
        </div>
        
        {node.type !== 'entry' && (
          <button
            onClick={() => onDelete(node.id)}
            className="p-1 rounded bg-red-600/30 hover:bg-red-600/50"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        )}
      </div>
      
      {/* Label */}
      <div className="mb-4">
        <label className="text-xs text-slate-400 block mb-1">Node Label</label>
        <input
          value={data.label}
          onChange={(e) => updateData({ label: e.target.value })}
          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm"
        />
      </div>
      
      {/* Dialogue Lines */}
      {data.nodeType === 'dialogue' && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-slate-400">Dialogue Lines</label>
            <button
              onClick={addLine}
              className="flex items-center gap-1 px-2 py-1 bg-blue-600/30 hover:bg-blue-600/50 rounded text-xs"
            >
              <Plus className="w-3 h-3" />
              Add Line
            </button>
          </div>
          
          {(data.lines || []).map((line, i) => (
            <DialogueLineEditor
              key={line.id}
              line={line}
              characters={characters}
              onUpdate={(l) => updateLine(i, l)}
              onDelete={() => deleteLine(i)}
            />
          ))}
        </div>
      )}
      
      {/* Choices */}
      {data.nodeType === 'choice' && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-slate-400">Choices</label>
            <button
              onClick={addChoice}
              className="flex items-center gap-1 px-2 py-1 bg-amber-600/30 hover:bg-amber-600/50 rounded text-xs"
            >
              <Plus className="w-3 h-3" />
              Add Choice
            </button>
          </div>
          
          {(data.choices || []).map((choice, i) => (
            <div key={choice.id} className="bg-slate-800/50 rounded p-2 mb-2">
              <div className="flex gap-2">
                <span className="text-amber-400 text-sm">{i + 1}.</span>
                <input
                  value={choice.text}
                  onChange={(e) => {
                    const choices = [...(data.choices || [])];
                    choices[i] = { ...choice, text: e.target.value };
                    updateData({ choices });
                  }}
                  className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm"
                />
                <button
                  onClick={() => {
                    const choices = [...(data.choices || [])];
                    choices.splice(i, 1);
                    updateData({ choices });
                  }}
                  className="p-1 rounded bg-red-600/30 hover:bg-red-600/50"
                >
                  <Trash2 className="w-3 h-3 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Notes */}
      <div className="mb-4">
        <label className="text-xs text-slate-400 block mb-1">Notes</label>
        <textarea
          value={data.notes || ''}
          onChange={(e) => updateData({ notes: e.target.value })}
          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm resize-none"
          rows={2}
          placeholder="Internal notes..."
        />
      </div>
    </div>
  );
}

// ============================================================================
// VARIABLES PANEL
// ============================================================================

interface VariablesPanelProps {
  variables: DialogueVariable[];
  onAdd: (variable: DialogueVariable) => void;
  onUpdate: (index: number, variable: DialogueVariable) => void;
  onDelete: (index: number) => void;
}

function VariablesPanel({ variables, onAdd, onUpdate, onDelete }: VariablesPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="border-t border-slate-700">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full p-3 text-sm text-left hover:bg-slate-800/50"
      >
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <Code className="w-4 h-4 text-blue-400" />
        Variables ({variables.length})
      </button>
      
      {isOpen && (
        <div className="p-3 pt-0 space-y-2">
          {variables.map((v, i) => (
            <div key={v.name} className="flex gap-2 items-center bg-slate-800/50 rounded p-2">
              <code className="text-xs text-blue-300 flex-1 font-mono">{v.name}</code>
              <span className="text-[10px] text-slate-500">{v.type}</span>
              <span className="text-xs text-slate-400 font-mono">{String(v.defaultValue)}</span>
              <button
                onClick={() => onDelete(i)}
                className="p-0.5 rounded hover:bg-red-600/30"
              >
                <Trash2 className="w-3 h-3 text-red-400" />
              </button>
            </div>
          ))}
          
          <button
            onClick={() => onAdd({ name: `var_${Date.now()}`, type: 'string', defaultValue: '' })}
            className="flex items-center gap-1 w-full p-2 rounded bg-blue-600/20 hover:bg-blue-600/30 text-xs"
          >
            <Plus className="w-3 h-3" />
            Add Variable
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PREVIEW PANEL
// ============================================================================

interface PreviewPanelProps {
  isPlaying: boolean;
  onToggle: () => void;
  currentNode: Node<DialogueNodeData> | null;
  currentLineIndex: number;
  characters: Character[];
  onNext: () => void;
  onChoose: (choiceId: string) => void;
}

function PreviewPanel({
  isPlaying,
  onToggle,
  currentNode,
  currentLineIndex,
  characters,
  onNext,
  onChoose,
}: PreviewPanelProps) {
  if (!isPlaying) {
    return (
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded"
      >
        <Play className="w-4 h-4" />
        Preview Dialogue
      </button>
    );
  }
  
  const data = currentNode?.data;
  const line = data?.lines?.[currentLineIndex];
  const character = characters.find((c) => c.id === line?.characterId);
  
  return (
    <div className="w-96 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl">
      <div className="flex items-center justify-between p-3 border-b border-slate-700">
        <span className="text-sm font-medium">Dialogue Preview</span>
        <button onClick={onToggle} className="p-1 hover:bg-slate-700 rounded">
          <Pause className="w-4 h-4" />
        </button>
      </div>
      
      {data?.nodeType === 'dialogue' && line && (
        <div className="p-4">
          <div className="flex items-start gap-3 mb-4">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
              style={{ backgroundColor: character?.color || '#4488ff' }}
            >
              {character?.name?.[0] || '?'}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium" style={{ color: character?.color }}>
                {character?.name}
                <span className="text-slate-500 text-xs ml-2">[{line.emotion}]</span>
              </div>
              <p className="text-sm mt-1">{line.text}</p>
            </div>
          </div>
          
          <button
            onClick={onNext}
            className="w-full py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm"
          >
            Continue →
          </button>
        </div>
      )}
      
      {data?.nodeType === 'choice' && (
        <div className="p-4 space-y-2">
          {data.choices?.map((choice) => (
            <button
              key={choice.id}
              onClick={() => onChoose(choice.id)}
              className="w-full p-3 bg-amber-900/30 hover:bg-amber-900/50 rounded text-left text-sm"
            >
              {choice.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN DIALOGUE EDITOR
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
  const [nodes, setNodes, onNodesChange] = useNodesState(initialDialogueNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialDialogueEdges);
  
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
    <div className="flex h-full w-full bg-slate-900 text-slate-200">
      {/* Main Flow */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectionChange={onSelectionChange}
          nodeTypes={dialogueNodeTypes}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          defaultEdgeOptions={{
            style: { stroke: '#64748b', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed },
          }}
        >
          <Background color="#334155" gap={15} />
          <Controls className="!bg-slate-800 !border-slate-700" />
          <MiniMap 
            className="!bg-slate-800 !border-slate-700"
            nodeColor={(node) => {
              switch (node.type) {
                case 'entry': return '#22c55e';
                case 'dialogue': return '#3b82f6';
                case 'choice': return '#f59e0b';
                case 'condition': return '#a855f7';
                case 'action': return '#06b6d4';
                case 'exit': return '#ef4444';
                default: return '#64748b';
              }
            }}
          />
          
          {/* Toolbar */}
          <Panel position="top-left" className="flex gap-2">
            <button
              onClick={() => addNode('dialogue')}
              className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm"
            >
              <MessageSquare className="w-4 h-4" />
              Dialogue
            </button>
            <button
              onClick={() => addNode('choice')}
              className="flex items-center gap-1 px-3 py-2 bg-amber-600 hover:bg-amber-500 rounded text-sm"
            >
              <GitBranch className="w-4 h-4" />
              Choice
            </button>
            <button
              onClick={() => addNode('condition')}
              className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm"
            >
              <Code className="w-4 h-4" />
              Condition
            </button>
            <button
              onClick={() => addNode('action')}
              className="flex items-center gap-1 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 rounded text-sm"
            >
              <Zap className="w-4 h-4" />
              Action
            </button>
            <button
              onClick={() => addNode('exit')}
              className="flex items-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-500 rounded text-sm"
            >
              <Flag className="w-4 h-4" />
              Exit
            </button>
          </Panel>
          
          {/* Actions */}
          <Panel position="top-right" className="flex gap-2">
            <button
              onClick={() => onExport?.('json')}
              className="flex items-center gap-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              className="flex items-center gap-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm"
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
              <button
                onClick={startPreview}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded"
              >
                <Play className="w-4 h-4" />
                Preview
              </button>
            )}
          </Panel>
        </ReactFlow>
      </div>
      
      {/* Right Panel - Inspector */}
      <div className="w-80 border-l border-slate-700 flex flex-col">
        <div className="p-3 border-b border-slate-700">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-400" />
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
        <div className="border-t border-slate-700 p-3">
          <div className="text-xs text-slate-400 mb-2">Characters</div>
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
