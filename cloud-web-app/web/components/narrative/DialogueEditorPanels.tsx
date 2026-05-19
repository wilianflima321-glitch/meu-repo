'use client';

import React, { useMemo, useState } from 'react';
import { Edge, Handle, MarkerType, Node, NodeProps, Position } from '@xyflow/react';
import { ChevronDown, ChevronRight, CircleDot, Code, Flag, GitBranch, Globe, HelpCircle, MessageSquare, Pause, Play, Plus, Settings, Trash2, User, Volume2, Zap } from 'lucide-react';
import type { Character, DialogueChoice, DialogueLine, DialogueNodeData, DialogueVariable } from './DialogueEditor';

function EntryNode({ data, selected }: NodeProps<Node<DialogueNodeData>>) {
  return (
    <div className={`px-4 py-2 rounded-lg bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-text-primary)] shadow-lg ${selected ? 'ring-2 ring-white' : ''}`}>
      <div className="flex items-center gap-2">
        <CircleDot className="w-4 h-4" />
        <span className="font-medium">Start</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)]" />
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
    <div className={`w-72 rounded-lg bg-[var(--aethel-surface-secondary)] border shadow-lg ${selected ? 'ring-2 ring-[var(--aethel-primary)] border-[var(--aethel-primary)]' : 'border-[var(--aethel-border-secondary)]'}`}>
      <Handle type="target" position={Position.Top} className="!bg-[var(--aethel-primary)]" />

      <div className="px-3 py-2 border-b border-[var(--aethel-border-primary)] flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-[var(--aethel-primary)]" />
        <span className="font-medium text-sm text-[var(--aethel-text-primary)] truncate">{data.label}</span>
      </div>

      <div className="p-3 space-y-2 max-h-40 overflow-y-auto">
        {lines.map((line, i) => (
          <div key={line.id} className="bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] rounded p-2">
            <div className="flex items-center gap-2 mb-1">
              <User className="w-3 h-3 text-[var(--aethel-text-tertiary)]" />
              <span className="text-xs text-[var(--aethel-text-tertiary)]">{line.characterId}</span>
              <span className="text-[10px] text-[var(--aethel-text-quaternary)]">[{line.emotion}]</span>
            </div>
            <p className="text-xs text-[var(--aethel-text-primary)] line-clamp-2">{line.text}</p>
          </div>
        ))}
        {lines.length === 0 && (
          <p className="text-xs text-[var(--aethel-text-quaternary)] italic">No dialogue lines</p>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-[var(--aethel-primary)]" />
    </div>
  );
}

// ============================================================================
// CUSTOM NODE: CHOICE
// ============================================================================

function ChoiceNode({ data, selected }: NodeProps<Node<DialogueNodeData>>) {
  const choices = data.choices || [];

  return (
    <div className={`w-64 rounded-lg bg-[var(--aethel-surface-secondary)] border shadow-lg ${selected ? 'ring-2 ring-[color-mix(in_srgb,var(--aethel-warning)_50%,transparent)] border-[color-mix(in_srgb,var(--aethel-warning)_50%,transparent)]' : 'border-[var(--aethel-border-secondary)]'}`}>
      <Handle type="target" position={Position.Top} className="!bg-[var(--aethel-warning-light)]" />

      <div className="px-3 py-2 border-b border-[var(--aethel-border-primary)] flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-[var(--aethel-warning-light)]" />
        <span className="font-medium text-sm text-[var(--aethel-text-primary)]">{data.label}</span>
      </div>

      <div className="p-2 space-y-1">
        {choices.map((choice, i) => (
          <div
            key={choice.id}
            className="relative bg-[color-mix(in_srgb,var(--aethel-warning-dark)_30%,transparent)] rounded p-2 pr-4 text-xs text-[color-mix(in_srgb,var(--aethel-warning-light)_80%,transparent)]"
          >
            <span className="text-[var(--aethel-warning-light)] mr-1">{i + 1}.</span>
            {choice.text}
            <Handle
              type="source"
              position={Position.Right}
              id={choice.id}
              className="!bg-[var(--aethel-warning-light)] !right-0"
              style={{ top: `${(i + 1) * 36}px` }}
            />
          </div>
        ))}
        {choices.length === 0 && (
          <p className="text-xs text-[var(--aethel-text-quaternary)] italic p-2">No choices</p>
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
    <div className={`w-56 rounded-lg bg-[var(--aethel-surface-secondary)] border shadow-lg ${selected ? 'ring-2 ring-[var(--aethel-info)] border-[var(--aethel-primary)]' : 'border-[var(--aethel-border-secondary)]'}`}>
      <Handle type="target" position={Position.Top} className="!bg-[var(--aethel-primary)]" />
<p className="text-xs text-[var(--aethel-text-quaternary)] italic">No condition defined</p>
      <div className="px-3 py-2 border-b border-[var(--aethel-border-primary)] flex items-center gap-2">
        <Code className="w-4 h-4 text-[var(--aethel-primary)]" />
        <span className="font-medium text-sm text-[var(--aethel-text-primary)]">Condition</span>
      </div>

      <div className="p-3">
        {condition ? (
          <div className="bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] rounded p-2 text-xs font-mono text-[var(--aethel-primary)]">
            {condition.variable} {condition.operator} {String(condition.value)}
          </div>
        ) : (
          <p className="text-xs text-[var(--aethel-text-quaternary)] italic">No condition defined</p>
        )}
      </div>

      <div className="flex justify-between px-3 pb-2">
        <div className="text-[10px] text-[var(--aethel-success-light)] relative">
          True
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            className="!bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] !left-2"
          />
        </div>
        <div className="text-[10px] text-[var(--aethel-error-light)] relative">
          False
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            className="!bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] !right-2"
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
    <div className={`w-56 rounded-lg bg-[var(--aethel-surface-secondary)] border shadow-lg ${selected ? 'ring-2 ring-[var(--aethel-info)] border-[var(--aethel-info)]' : 'border-[var(--aethel-border-secondary)]'}`}>
      <Handle type="target" position={Position.Top} className="!bg-[var(--aethel-info)]" />

      <div className="px-3 py-2 border-b border-[var(--aethel-border-primary)] flex items-center gap-2">
        <Zap className="w-4 h-4 text-[var(--aethel-info)]" />
        <span className="font-medium text-sm text-[var(--aethel-text-primary)]">Action</span>
      </div>

      <div className="p-2 space-y-1">
        {actions.map((action, i) => (
          <div key={i} className="bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] rounded p-2 text-xs text-[var(--aethel-info)] font-mono">
            {action.type}: {JSON.stringify(action.params).slice(0, 30)}...
          </div>
        ))}
        {actions.length === 0 && (
          <p className="text-xs text-[var(--aethel-text-quaternary)] italic p-2">No actions</p>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-[var(--aethel-info)]" />
    </div>
  );
}

// ============================================================================
// CUSTOM NODE: EXIT
// ============================================================================

function ExitNode({ data, selected }: NodeProps<Node<DialogueNodeData>>) {
  return (
    <div className={`px-4 py-2 rounded-lg bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] text-[var(--aethel-text-primary)] shadow-lg ${selected ? 'ring-2 ring-white' : ''}`}>
      <Handle type="target" position={Position.Top} className="!bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)]" />
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
    <div className={`w-48 rounded-lg bg-[var(--aethel-surface-secondary)] border shadow-lg ${selected ? 'ring-2 ring-[var(--aethel-info)] border-[var(--aethel-info)]' : 'border-[var(--aethel-border-secondary)]'}`}>
      <Handle type="target" position={Position.Top} className="!bg-[var(--aethel-info)]" />

      <div className="px-3 py-2 border-b border-[var(--aethel-border-primary)] flex items-center gap-2">
        <HelpCircle className="w-4 h-4 text-[var(--aethel-info)]" />
        <span className="font-medium text-sm text-[var(--aethel-text-primary)]">Random</span>
      </div>

      <div className="p-2 flex flex-col gap-1">
        {[1, 2, 3].map((n) => (
          <div key={n} className="relative bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] rounded p-1.5 text-xs text-[var(--aethel-info)] pr-4">
            Path {n}
            <Handle
              type="source"
              position={Position.Right}
              id={`path${n}`}
              className="!bg-[var(--aethel-info)]"
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

export const nodeTypes = {
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

export const initialNodes: Node<DialogueNodeData>[] = [
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
          localization: { 'pt-BR': 'Welcome, viajante! Procurando algo especial hoje?' },
        },
      ],
    },
  },
  {
    id: 'choice1',
    type: 'choice',
    position: { x: 350, y: 350 },
    data: {
      label: 'Resposta do jogador',
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

export const initialEdges: Edge[] = [
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

export function DialogueLineEditor({ line, characters, onUpdate, onDelete }: DialogueLineEditorProps) {
  const character = characters.find((c) => c.id === line.characterId);

  return (
    <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] rounded p-3 mb-2">
      <div className="flex gap-2 mb-2">
        <select
          value={line.characterId}
          onChange={(e) => onUpdate({ ...line, characterId: e.target.value })}
          className="flex-1 bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded px-2 py-1 text-sm"
        >
          {characters.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={line.emotion}
          onChange={(e) => onUpdate({ ...line, emotion: e.target.value })}
          className="w-28 bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded px-2 py-1 text-sm"
        >
          {character?.emotions.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>

        <button type="button"
          onClick={onDelete}
          className="p-1 rounded bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)]"
        >
          <Trash2 className="w-4 h-4 text-[var(--aethel-error-light)]" />
        </button>
      </div>

      <textarea
        value={line.text}
        onChange={(e) => onUpdate({ ...line, text: e.target.value })}
        className="w-full bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded px-3 py-2 text-sm resize-none"
        rows={3}
        placeholder="Enter dialogue text..."
      />

      <div className="flex gap-2 mt-2">
        <button type="button" className="flex items-center gap-1 px-2 py-1 bg-[var(--aethel-surface-tertiary)] rounded text-xs hover:bg-[var(--aethel-surface-quaternary)]">
          <Volume2 className="w-3 h-3" />
          Audio
        </button>
        <button type="button" className="flex items-center gap-1 px-2 py-1 bg-[var(--aethel-surface-tertiary)] rounded text-xs hover:bg-[var(--aethel-surface-quaternary)]">
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

export function NodeInspector({ node, characters, onUpdate, onDelete }: NodeInspectorProps) {
  if (!node) {
    return (
      <div className="p-4 text-center text-[var(--aethel-text-quaternary)]">
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
          {data.nodeType === 'dialogue' && <MessageSquare className="w-5 h-5 text-[var(--aethel-primary)]" />}
          {data.nodeType === 'choice' && <GitBranch className="w-5 h-5 text-[var(--aethel-warning-light)]" />}
          {data.nodeType === 'condition' && <Code className="w-5 h-5 text-[var(--aethel-primary)]" />}
          {data.nodeType === 'action' && <Zap className="w-5 h-5 text-[var(--aethel-info)]" />}
          <span className="font-medium capitalize">{data.nodeType}</span>
        </div>

        {node.type !== 'entry' && (
          <button type="button"
            onClick={() => onDelete(node.id)}
            className="p-1 rounded bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)]"
          >
            <Trash2 className="w-4 h-4 text-[var(--aethel-error-light)]" />
          </button>
        )}
      </div>

      {/* Label */}
      <div className="mb-4">
        <label className="text-xs text-[var(--aethel-text-tertiary)] block mb-1">Node Label</label>
        <input
          value={data.label}
          onChange={(e) => updateData({ label: e.target.value })}
          className="w-full bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded px-3 py-2 text-sm"
        />
      </div>

      {/* Dialogue Lines */}
      {data.nodeType === 'dialogue' && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-[var(--aethel-text-tertiary)]">Dialogue Lines</label>
            <button type="button"
              onClick={addLine}
              className="flex items-center gap-1 px-2 py-1 bg-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-primary)_45%,transparent)] rounded text-xs"
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
            <label className="text-xs text-[var(--aethel-text-tertiary)]">Choices</label>
            <button type="button"
              onClick={addChoice}
              className="flex items-center gap-1 px-2 py-1 bg-[color-mix(in_srgb,var(--aethel-warning-dark)_30%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-warning-dark)_50%,transparent)] rounded text-xs"
            >
              <Plus className="w-3 h-3" />
              Add Choice
            </button>
          </div>

          {(data.choices || []).map((choice, i) => (
            <div key={choice.id} className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] rounded p-2 mb-2">
              <div className="flex gap-2">
                <span className="text-[var(--aethel-warning-light)] text-sm">{i + 1}.</span>
                <input
                  value={choice.text}
                  onChange={(e) => {
                    const choices = [...(data.choices || [])];
                    choices[i] = { ...choice, text: e.target.value };
                    updateData({ choices });
                  }}
                  className="flex-1 bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded px-2 py-1 text-sm"
                />
                <button type="button"
                  onClick={() => {
                    const choices = [...(data.choices || [])];
                    choices.splice(i, 1);
                    updateData({ choices });
                  }}
                  className="p-1 rounded bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)]"
                >
                  <Trash2 className="w-3 h-3 text-[var(--aethel-error-light)]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      <div className="mb-4">
        <label className="text-xs text-[var(--aethel-text-tertiary)] block mb-1">Notes</label>
        <textarea
          value={data.notes || ''}
          onChange={(e) => updateData({ notes: e.target.value })}
          className="w-full bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded px-3 py-2 text-sm resize-none"
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

export function VariablesPanel({ variables, onAdd, onUpdate, onDelete }: VariablesPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-t border-[var(--aethel-border-primary)]">
      <button type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full p-3 text-sm text-left hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)]"
      >
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <Code className="w-4 h-4 text-[var(--aethel-primary)]" />
        Variables ({variables.length})
      </button>

      {isOpen && (
        <div className="p-3 pt-0 space-y-2">
          {variables.map((v, i) => (
            <div key={v.name} className="flex gap-2 items-center bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] rounded p-2">
              <code className="text-xs text-[var(--aethel-primary)] flex-1 font-mono">{v.name}</code>
              <span className="text-[10px] text-[var(--aethel-text-quaternary)]">{v.type}</span>
              <span className="text-xs text-[var(--aethel-text-tertiary)] font-mono">{String(v.defaultValue)}</span>
              <button type="button"
                onClick={() => onDelete(i)}
                className="p-0.5 rounded hover:bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)]"
              >
                Dialogue preview
          </button>
        </div>
      ))}

          <button type="button"
            onClick={() => onAdd({ name: `var_${Date.now()}`, type: 'string', defaultValue: '' })}
            className="flex items-center gap-1 w-full p-2 rounded bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] text-xs"
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

export function PreviewPanel({
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
      <button type="button"
        onClick={onToggle}
        className="flex items-center gap-2 px-4 py-2 bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] rounded"
      >
        <Play className="w-4 h-4" />
        Dialogue preview
      </button>
    );
  }

  const data = currentNode?.data;
  const line = data?.lines?.[currentLineIndex];
  const character = characters.find((c) => c.id === line?.characterId);

  return (
    <div className="w-96 bg-[var(--aethel-surface-primary)] border border-[var(--aethel-border-primary)] rounded-lg shadow-2xl">
      <div className="flex items-center justify-between p-3 border-b border-[var(--aethel-border-primary)]">
        <span className="text-sm font-medium">Dialogue preview</span>
        <button type="button" onClick={onToggle} className="p-1 hover:bg-[var(--aethel-surface-tertiary)] rounded">
          <Pause className="w-4 h-4" />
        </button>
      </div>

      {data?.nodeType === 'dialogue' && line && (
        <div className="p-4">
          <div className="flex items-start gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
              style={{ backgroundColor: character?.color || 'var(--aethel-info)' }}
            >
              {character?.name?.[0] || '?'}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium" style={{ color: character?.color }}>
                {character?.name}
                <span className="text-[var(--aethel-text-quaternary)] text-xs ml-2">[{line.emotion}]</span>
              </div>
              <p className="text-sm mt-1">{line.text}</p>
            </div>
          </div>

          <button type="button"
            onClick={onNext}
            className="w-full py-2 bg-[var(--aethel-surface-tertiary)] hover:bg-[var(--aethel-surface-quaternary)] rounded text-sm"
          >
            Continue →
          </button>
        </div>
      )}

      {data?.nodeType === 'choice' && (
        <div className="p-4 space-y-2">
          {data.choices?.map((choice) => (
            <button type="button"
              key={choice.id}
              onClick={() => onChoose(choice.id)}
              className="w-full p-3 bg-[color-mix(in_srgb,var(--aethel-warning-dark)_30%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-warning-dark)_50%,transparent)] rounded text-left text-sm"
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
