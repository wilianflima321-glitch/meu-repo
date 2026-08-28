'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  type Node,
  type Edge,
  type Connection,
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
import { Download, Save, Settings, Upload } from 'lucide-react';
import { QUEST_CATEGORIES, initialEdges, initialNodes } from './quest-editor-models';
import { QuestStats } from './QuestStats';
import { QuestInspector, nodeTypes } from './QuestEditor.parts';
import type { QuestNodeData } from './quest-editor-models';

export type { ObjectiveType, QuestCategory, QuestNodeData, QuestObjective, QuestPrerequisite, QuestReward, QuestState, RewardType } from './quest-editor-models';

export interface QuestEditorProps {
  gameId?: string;
  onSave?: (nodes: Node<QuestNodeData>[], edges: Edge[]) => void;
  onExport?: (format: 'json' | 'yaml') => void;
}

export default function QuestEditor({
  gameId,
  onSave,
  onExport,
}: QuestEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);

  const selectedNode = useMemo(() =>
    nodes.find((node) => selectedNodes.includes(node.id)),
    [nodes, selectedNodes]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((currentEdges: Edge[]) => addEdge({
        ...connection,
        id: `e-${connection.source}-${connection.target}`,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: 'var(--aethel-warning)', strokeWidth: 2 },
        label: 'requires',
        labelStyle: { fill: 'var(--aethel-warning)', fontSize: 10 },
        labelBgStyle: { fill: 'var(--aethel-surface-tertiary)' },
      } as Edge, currentEdges));
    },
    [setEdges]
  );

  const onSelectionChange = useCallback(({ nodes: selectedFlowNodes }: { nodes: Node[] }) => {
    setSelectedNodes(selectedFlowNodes.map((node) => node.id));
  }, []);

  const updateNodeData = useCallback((id: string, data: QuestNodeData) => {
    setNodes((currentNodes: Node<QuestNodeData>[]) => currentNodes.map((node: Node<QuestNodeData>) => (node.id === id ? { ...node, data } : node)));
  }, [setNodes]);

  const deleteNode = useCallback((id: string) => {
    setNodes((currentNodes: Node<QuestNodeData>[]) => currentNodes.filter((node: Node<QuestNodeData>) => node.id !== id));
    setEdges((currentEdges: Edge[]) => currentEdges.filter((edge: Edge) => edge.source !== id && edge.target !== id));
  }, [setNodes, setEdges]);

  const addQuest = useCallback((category: string) => {
    const id = `quest_${Date.now()}`;

    const newNode: Node<QuestNodeData> = {
      id,
      type: 'quest',
      position: { x: 300, y: 200 },
      data: {
        questId: id,
        title: 'New Quest',
        description: 'Quest description...',
        state: 'unavailable',
        category,
        level: 1,
        isMainQuest: category === 'main',
        objectives: [],
        rewards: [],
        prerequisites: [],
      },
    };

    setNodes((currentNodes: Node<QuestNodeData>[]) => [...currentNodes, newNode]);
  }, [setNodes]);

  return (
    <div className="flex h-full w-full bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]" data-game-id={gameId}>
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
          snapGrid={[20, 20]}
        >
          <Background color="var(--aethel-border-primary)" gap={20} />
          <Controls className="!bg-[var(--aethel-surface-secondary)] !border-[var(--aethel-border-primary)]" />
          <MiniMap
            className="!bg-[var(--aethel-surface-secondary)] !border-[var(--aethel-border-primary)]"
            nodeColor={(node) => {
              const data = node.data as QuestNodeData;
              return QUEST_CATEGORIES.find((category) => category.id === data.category)?.color || 'var(--aethel-text-muted)';
            }}
          />

          <Panel position="top-left" className="flex gap-2 flex-wrap">
            {QUEST_CATEGORIES.map((category) => (
              <button
                type="button"
                key={category.id}
                onClick={() => addQuest(category.id)}
                className="flex items-center gap-1 px-3 py-2 rounded text-sm"
                style={{ backgroundColor: `${category.color}33`, color: category.color }}
              >
                <span>{category.icon}</span>
                {category.name}
              </button>
            ))}
          </Panel>

          <Panel position="top-right" className="flex gap-2">
            {onSave ? (
              <button
                type="button"
                onClick={() => onSave(nodes, edges)}
                className="flex items-center gap-1 px-3 py-2 bg-[var(--aethel-primary)] hover:bg-[var(--aethel-primary-light)] rounded text-sm text-white"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onExport?.('json')}
              className="flex items-center gap-1 px-3 py-2 bg-[var(--aethel-surface-tertiary)] hover:bg-[var(--aethel-surface-quaternary)] rounded text-sm"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              type="button"
              className="flex items-center gap-1 px-3 py-2 bg-[var(--aethel-surface-tertiary)] hover:bg-[var(--aethel-surface-quaternary)] rounded text-sm"
            >
              <Upload className="w-4 h-4" />
              Import
            </button>
          </Panel>

          <Panel position="bottom-left">
            <QuestStats nodes={nodes} />
          </Panel>
        </ReactFlow>
      </div>

      <div className="w-80 border-l border-[var(--aethel-border-primary)] flex flex-col">
        <div className="p-3 border-b border-[var(--aethel-border-primary)]">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Settings className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
            Quest Inspector
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          <QuestInspector
            node={selectedNode ?? null}
            onUpdate={updateNodeData}
            onDelete={deleteNode}
          />
        </div>

        <div className="border-t border-[var(--aethel-border-primary)] p-3">
          <div className="text-xs text-[var(--aethel-text-tertiary)] mb-2">Legend</div>
          <div className="grid grid-cols-2 gap-1 text-[10px]">
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)]" />Unavailable</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)]" />Available</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)]" />Active</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)]" />Completed</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)]" />Failed</div>
          </div>
        </div>
      </div>
    </div>
  );
}
