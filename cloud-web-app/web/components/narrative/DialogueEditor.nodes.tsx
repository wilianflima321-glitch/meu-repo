import React from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import {
  CircleDot,
  Code,
  Flag,
  GitBranch,
  HelpCircle,
  MessageSquare,
  User,
  Zap,
} from 'lucide-react';
import type { DialogueNodeData } from './DialogueEditor.types';

function EntryNode({ selected }: NodeProps<Node<DialogueNodeData>>) {
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
  
  return (
    <div className={`w-72 rounded-lg bg-slate-800 border shadow-lg ${selected ? 'ring-2 ring-blue-500 border-blue-500' : 'border-slate-600'}`}>
      <Handle type="target" position={Position.Top} className="!bg-blue-400" />
      
      <div className="px-3 py-2 border-b border-slate-700 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-blue-400" />
        <span className="font-medium text-sm text-white truncate">{data.label}</span>
      </div>
      
      <div className="p-3 space-y-2 max-h-40 overflow-y-auto">
        {lines.map((line) => (
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

function ExitNode({ selected }: NodeProps<Node<DialogueNodeData>>) {
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

function RandomNode({ selected }: NodeProps<Node<DialogueNodeData>>) {
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

export const dialogueNodeTypes = {
  entry: EntryNode,
  dialogue: DialogueNode,
  choice: ChoiceNode,
  condition: ConditionNode,
  action: ActionNode,
  exit: ExitNode,
  random: RandomNode,
};
