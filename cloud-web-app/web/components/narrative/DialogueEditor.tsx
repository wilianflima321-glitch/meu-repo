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
  Handle,
  Position,
  NodeProps,
  MarkerType,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
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
  params: Record<string, any>;
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
  defaultValue: any;
}

// ============================================================================
// DEFAULT DATA
// ============================================================================

const DEFAULT_CHARACTERS: Character[] = [
  { id: 'player', name: 'Player', portrait: '/portraits/player.png', color: '#3b82f6', emotions: ['neutral', 'happy', 'angry', 'sad', 'surprised'] },
  { id: 'npc1', name: 'Merchant', portrait: '/portraits/merchant.png', color: '#22c55e', emotions: ['neutral', 'happy', 'suspicious', 'friendly'] },
  { id: 'npc2', name: 'Guard', portrait: '/portraits/guard.png', color: '#ef4444', emotions: ['neutral', 'stern', 'alert', 'relaxed'] },
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

function EntryNode({ data, selected }: NodeProps<Node<DialogueNodeData>>) {
  return (
    <div className={`px-4 py-2 rounded-lg bg-green-600 text-white shadow-lg ${selected ? 'ring-2 ring-white' : ''}`}>
      <div className="flex items-center gap-2">
        <CircleDot className="w-4 h-4" />
        <span className="font-medium">Start</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-green-400" />
    </div>
  );
}

// ============================================================================
// CUSTOM NODE: DIALOGUE
// ============================================================================

function DialogueNode({ data, selected }: NodeProps<Node<DialogueNodeData>>) {
  const lines = data.lines || [];
  const firstLine = lines[0];
  
  return (
    <div className={`w-72 rounded-lg bg-slate-800 border shadow-lg ${selected ? 'ring-2 ring-blue-500 border-blue-500' : 'border-slate-600'}`}>
      <Handle type="target" position={Position.Top} className="!bg-blue-400" />
      
      <div className="px-3 py-2 border-b border-slate-700 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-blue-400" />
        <span className="font-medium text-sm text-white truncate">{data.label}</span>
      </div>
      
      <div className="p-3 space-y-2 max-h-40 overflow-y-auto">
        {lines.map((line, i) => (
          <div key={line.id} className="bg-slate-700/50 rounded p-2">
            <div className="flex items-center gap-2 mb-1">
              <User className="w-3 h-3 text-slate-400" />
              <span className="text-xs text-slate-400">{line.characterId}</span>
              <span className="text-[10px] text-slate-500">[{line.emotion}]</span>
            </div>
            <p className="text-xs text-slate-200 line-clamp-2">{line.text}</p>
          </div>
        ))}
        {lines.length === 0 && (
          <p className="text-xs text-slate-500 italic">No dialogue lines</p>
        )}
      </div>
      
      <Handle type="source" position={Position.Bottom} className="!bg-blue-400" />
    </div>
  );
}

// ============================================================================
// CUSTOM NODE: CHOICE
// ============================================================================

function ChoiceNode({ data, selected }: NodeProps<Node<DialogueNodeData>>) {
  const choices = data.choices || [];
  
  return (
    <div className={`w-64 rounded-lg bg-slate-800 border shadow-lg ${selected ? 'ring-2 ring-amber-500 border-amber-500' : 'border-slate-600'}`}>
      <Handle type="target" position={Position.Top} className="!bg-amber-400" />
      
      <div className="px-3 py-2 border-b border-slate-700 flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-amber-400" />
        <span className="font-medium text-sm text-white">{data.label}</span>
      </div>
      
      <div className="p-2 space-y-1">
        {choices.map((choice, i) => (
          <div 
            key={choice.id} 
            className="relative bg-amber-900/30 rounded p-2 pr-4 text-xs text-amber-200"
          >
            <span className="text-amber-400 mr-1">{i + 1}.</span>
            {choice.text}
            <Handle
              type="source"
              position={Position.Right}
              id={choice.id}
              className="!bg-amber-400 !right-0"
              style={{ top: `${(i + 1) * 36}px` }}
            />
          </div>
        ))}
        {choices.length === 0 && (
          <p className="text-xs text-slate-500 italic p-2">No choices</p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// CUSTOM NODE: CONDITION
// ============================================================================

function ConditionNode({ data, selected }: NodeProps<Node<DialogueNodeData>>) {
  const conditions = data.conditions || [];
  const condition = conditions[0];
  
  return (
    <div className={`w-56 rounded-lg bg-slate-800 border shadow-lg ${selected ? 'ring-2 ring-sky-500 border-purple-500' : 'border-slate-600'}`}>
      <Handle type="target" position={Position.Top} className="!bg-blue-400" />
      
      <div className="px-3 py-2 border-b border-slate-700 flex items-center gap-2">
        <Code className="w-4 h-4 text-blue-400" />
        <span className="font-medium text-sm text-white">Condition</span>
      </div>
      
      <div className="p-3">
        {condition ? (
          <div className="bg-blue-900/30 rounded p-2 text-xs font-mono text-blue-200">
            {condition.variable} {condition.operator} {String(condition.value)}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">No condition set</p>
        )}
      </div>
      
      <div className="flex justify-between px-3 pb-2">
        <div className="text-[10px] text-green-400 relative">
          True
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            className="!bg-green-400 !left-2"
          />
        </div>
        <div className="text-[10px] text-red-400 relative">
          False
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            className="!bg-red-400 !right-2"
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CUSTOM NODE: ACTION
// ============================================================================

function ActionNode({ data, selected }: NodeProps<Node<DialogueNodeData>>) {
  const actions = data.actions || [];
  
  return (
    <div className={`w-56 rounded-lg bg-slate-800 border shadow-lg ${selected ? 'ring-2 ring-cyan-500 border-cyan-500' : 'border-slate-600'}`}>
      <Handle type="target" position={Position.Top} className="!bg-cyan-400" />
      
      <div className="px-3 py-2 border-b border-slate-700 flex items-center gap-2">
        <Zap className="w-4 h-4 text-cyan-400" />
        <span className="font-medium text-sm text-white">Action</span>
      </div>
      
      <div className="p-2 space-y-1">
        {actions.map((action, i) => (
          <div key={i} className="bg-cyan-900/30 rounded p-2 text-xs text-cyan-200 font-mono">
            {action.type}: {JSON.stringify(action.params).slice(0, 30)}...
          </div>
        ))}
        {actions.length === 0 && (
          <p className="text-xs text-slate-500 italic p-2">No actions</p>
        )}
      </div>
      
      <Handle type="source" position={Position.Bottom} className="!bg-cyan-400" />
    </div>
  );
}

// ============================================================================
// CUSTOM NODE: EXIT
// ============================================================================

function ExitNode({ data, selected }: NodeProps<Node<DialogueNodeData>>) {
  return (
    <div className={`px-4 py-2 rounded-lg bg-red-600 text-white shadow-lg ${selected ? 'ring-2 ring-white' : ''}`}>
      <Handle type="target" position={Position.Top} className="!bg-red-400" />
      <div className="flex items-center gap-2">
        <Flag className="w-4 h-4" />
        <span className="font-medium">End</span>
      </div>
    </div>
  );
}

// ============================================================================
// CUSTOM NODE: RANDOM
// ============================================================================

function RandomNode({ data, selected }: NodeProps<Node<DialogueNodeData>>) {
  return (
    <div className={`w-48 rounded-lg bg-slate-800 border shadow-lg ${selected ? 'ring-2 ring-cyan-500 border-cyan-500' : 'border-slate-600'}`}>
      <Handle type="target" position={Position.Top} className="!bg-cyan-400" />
      
      <div className="px-3 py-2 border-b border-slate-700 flex items-center gap-2">
        <HelpCircle className="w-4 h-4 text-cyan-400" />
        <span className="font-medium text-sm text-white">Random</span>
      </div>
      
      <div className="p-2 flex flex-col gap-1">
        {[1, 2, 3].map((n) => (
          <div key={n} className="relative bg-cyan-900/30 rounded p-1.5 text-xs text-cyan-200 pr-4">
            Path {n}
            <Handle
              type="source"
              position={Position.Right}
              id={`path${n}`}
              className="!bg-cyan-400"
              style={{ top: `${n * 28 + 44}px` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// NODE TYPES REGISTRY
// ============================================================================

const nodeTypes = {
  entry: EntryNode,
  dialogue: DialogueNode,
  choice: ChoiceNode,
  condition: ConditionNode,
  action: ActionNode,
  exit: ExitNode,
  random: RandomNode,
};

// ============================================================================
// INITIAL NODES & EDGES
// ============================================================================

const initialNodes: Node<DialogueNodeData>[] = [
  {
    id: 'entry',
    type: 'entry',
    position: { x: 400, y: 50 },
    data: { label: 'Start', nodeType: 'entry' },
  },
  {
    id: 'dialogue1',
    type: 'dialogue',
    position: { x: 350, y: 150 },
    data: {
      label: 'Greeting',
      nodeType: 'dialogue',
      lines: [
        {
          id: 'l1',
          characterId: 'npc1',
          emotion: 'friendly',
          text: 'Welcome, traveler! Looking for something special today?',
          localization: { 'pt-BR': 'Bem-vindo, viajante! Procurando algo especial hoje?' },
        },
      ],
    },
  },
  {
    id: 'choice1',
    type: 'choice',
    position: { x: 350, y: 350 },
    data: {
      label: 'Player Response',
      nodeType: 'choice',
      choices: [
        { id: 'c1', text: 'Show me your wares.', localization: {} },
        { id: 'c2', text: "I'm just looking around.", localization: {} },
        { id: 'c3', text: 'Any rumors to share?', localization: {} },
      ],
    },
  },
  {
    id: 'exit1',
    type: 'exit',
    position: { x: 600, y: 500 },
    data: { label: 'End', nodeType: 'exit' },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1', source: 'entry', target: 'dialogue1', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e2', source: 'dialogue1', target: 'choice1', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e3', source: 'choice1', sourceHandle: 'c2', target: 'exit1', markerEnd: { type: MarkerType.ArrowClosed } },
];

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
          nodeTypes={nodeTypes}
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
