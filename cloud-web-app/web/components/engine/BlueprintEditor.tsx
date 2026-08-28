'use client';

/**
 * Professional blueprint editor shell.
 *
 * Keeps graph state, persistence, compile/save actions, and workbench layout here.
 * Node rendering and side panels live in BlueprintEditor.parts.tsx.
 */

import React, { useState, useCallback } from 'react';
import { Cpu } from 'lucide-react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  Blueprint,
  BlueprintType,
  BlueprintVariable,
  BlueprintComponent,
  BlueprintFunction,
  NodeDefinition,
  StandardNodes,
  getBlueprintManager,
} from '@/lib/blueprint-system';
import { useToast } from '@/components/ui/Toast';
import {createComponentLogger, logger} from '@/lib/observability/logger'
import {
  BlueprintFlowNode,
  ComponentsPanel,
  DetailsPanel,
  FunctionsPanel,
  NodePalette,
  VariablesPanel,
  nodeTypes,
} from './BlueprintEditor.parts';

const log = createComponentLogger('BlueprintEditor')


// ============================================================================
// TYPES
// ============================================================================

interface BlueprintEditorProps {
  blueprintId?: string;
  onSave?: (blueprint: Blueprint) => void;
  onClose?: () => void;
}


// ============================================================================
// MAIN EDITOR COMPONENT
// ============================================================================

export default function BlueprintEditor({ blueprintId, onSave, onClose }: BlueprintEditorProps) {
  const toast = useToast();
  const manager = getBlueprintManager();

  // Blueprint state
  const [blueprint, setBlueprint] = useState<Blueprint>(() => {
    if (blueprintId) {
      const existing = manager.getBlueprint(blueprintId);
      if (existing) return existing;
    }
    return manager.createBlueprint('NewBlueprint', 'Actor');
  });

  // Graph state
  const [nodes, setNodes, onNodesChange] = useNodesState<BlueprintFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'eventGraph' | 'constructionScript'>('eventGraph');
  const [selectedNode, setSelectedNode] = useState<BlueprintFlowNode | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [selectedFunctionId, setSelectedFunctionId] = useState<string | null>(null);

  // Add node to graph
  const handleAddNode = useCallback((type: string) => {
    const definition = StandardNodes.find(n => n.type === type);
    if (!definition) return;

    const newNode: BlueprintFlowNode = {
      id: `node_${Date.now()}`,
      type: 'blueprintNode',
      position: { x: 200 + Math.random() * 100, y: 200 + Math.random() * 100 },
      data: {
        label: definition.displayName,
        definition,
      },
    };

    setNodes((nds: BlueprintFlowNode[]) => [...nds, newNode]);
  }, [setNodes]);

  // Handle connections
  const onConnect = useCallback((connection: Connection) => {
    // Validate connection types match
    const sourceNode = nodes.find(n => n.id === connection.source);
    const targetNode = nodes.find(n => n.id === connection.target);

    if (!sourceNode || !targetNode) return;

    const sourceDef = sourceNode.data?.definition as NodeDefinition | undefined;
    const targetDef = targetNode.data?.definition as NodeDefinition | undefined;

    if (!sourceDef || !targetDef) return;

    const sourcePin = sourceDef.outputs.find(o => o.id === connection.sourceHandle);
    const targetPin = targetDef.inputs.find(i => i.id === connection.targetHandle);

    if (!sourcePin || !targetPin) return;

    // Check type compatibility
    if (sourcePin.type !== targetPin.type) {
      logger.warn('Incompatible pin types');
      return;
    }

    const newEdge: Edge = {
      ...connection,
      id: `edge_${Date.now()}`,
      type: 'smoothstep',
      animated: sourcePin.type === 'exec',
      style: {
        stroke: sourcePin.type === 'exec' ? 'var(--aethel-text-primary)' : 'var(--aethel-info)',
        strokeWidth: 2,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: sourcePin.type === 'exec' ? 'var(--aethel-text-primary)' : 'var(--aethel-info)',
      },
    } as Edge;

    setEdges((eds: Edge[]) => addEdge(newEdge, eds));
  }, [nodes, setEdges]);

  // Node selection
  const onNodeClick = useCallback((_: React.MouseEvent, node: BlueprintFlowNode) => {
    setSelectedNode(node);
  }, []);

  // Add variable
  const handleAddVariable = useCallback(() => {
    const newVar: BlueprintVariable = {
      id: `var_${Date.now()}`,
      name: `NewVariable${blueprint.variables.length + 1}`,
      type: 'float',
      defaultValue: 0,
      isPublic: true,
      isReadOnly: false,
    };

    setBlueprint(prev => ({
      ...prev,
      variables: [...prev.variables, newVar],
    }));
  }, [blueprint.variables.length]);

  // Delete variable
  const handleDeleteVariable = useCallback((id: string) => {
    setBlueprint(prev => ({
      ...prev,
      variables: prev.variables.filter(v => v.id !== id),
    }));
  }, []);

  // Add component
  const handleAddComponent = useCallback(() => {
    const newComp: BlueprintComponent = {
      id: `comp_${Date.now()}`,
      name: `NewComponent${blueprint.components.length + 1}`,
      type: 'StaticMeshComponent',
      parentId: blueprint.defaultSceneRoot,
      properties: {},
    };

    setBlueprint(prev => ({
      ...prev,
      components: [...prev.components, newComp],
    }));
  }, [blueprint.components.length, blueprint.defaultSceneRoot]);

  // Delete component
  const handleDeleteComponent = useCallback((id: string) => {
    setBlueprint(prev => ({
      ...prev,
      components: prev.components.filter(c => c.id !== id),
    }));
  }, []);

  // Add function
  const handleAddFunction = useCallback(() => {
    const newFunc: BlueprintFunction = {
      id: `func_${Date.now()}`,
      name: `NewFunction${blueprint.functions.length + 1}`,
      inputs: [],
      outputs: [],
      isPublic: true,
      isPure: false,
      isEvent: false,
      isLatent: false,
      nodes: [],
      connections: [],
    };

    setBlueprint(prev => ({
      ...prev,
      functions: [...prev.functions, newFunc],
    }));
  }, [blueprint.functions.length]);

  // Delete function
  const handleDeleteFunction = useCallback((id: string) => {
    setBlueprint(prev => ({
      ...prev,
      functions: prev.functions.filter(f => f.id !== id),
    }));
  }, []);

  // Compile blueprint
  const handleCompile = useCallback(() => {
    // Save nodes and edges to blueprint
    const updatedBlueprint: Blueprint = {
      ...blueprint,
      eventGraph: {
        nodes: nodes.map(n => ({
          id: n.id,
          type: n.type || '',
          position: n.position,
          data: n.data || {},
        })),
        connections: edges.map(e => ({
          id: e.id,
          sourceNodeId: e.source,
          sourcePin: e.sourceHandle || '',
          targetNodeId: e.target,
          targetPin: e.targetHandle || '',
        })),
      },
      modifiedAt: new Date(),
    };

    setBlueprint(updatedBlueprint);
    manager.updateBlueprint(blueprint.id, updatedBlueprint);

    log.info('Blueprint compiled successfully');
    toast.success('Blueprint compiled successfully!');
  }, [blueprint, nodes, edges, manager, toast]);

  // Save blueprint
  const handleSave = useCallback(() => {
    handleCompile();
    onSave?.(blueprint);
  }, [handleCompile, onSave, blueprint]);

  return (
    <div className="flex h-full bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      {/* Left Sidebar - Node Palette */}
      <NodePalette
        onAddNode={handleAddNode}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      {/* Main Graph Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="h-12 border-b border-[var(--aethel-border-primary)] flex items-center px-4 gap-4 bg-[var(--aethel-surface-tertiary)]">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-sky-400" />
            <input
              type="text"
              value={blueprint.name}
              onChange={(e) => setBlueprint(prev => ({ ...prev, name: e.target.value }))}
              className="bg-transparent border-b border-transparent hover:border-[var(--aethel-border-secondary)] focus:border-[var(--aethel-primary)] outline-none px-1 text-[var(--aethel-text-primary)] font-semibold"
            />
          </div>

          <select
            value={blueprint.type}
            onChange={(e) => setBlueprint(prev => ({ ...prev, type: e.target.value as BlueprintType }))}
            className="bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded px-2 py-1 text-sm"
          >
            <option value="Actor">Actor</option>
            <option value="Character">Character</option>
            <option value="Pawn">Pawn</option>
            <option value="GameMode">Game Mode</option>
            <option value="PlayerController">Player Controller</option>
            <option value="AIController">AI Controller</option>
            <option value="Widget">Widget</option>
            <option value="Component">Component</option>
            <option value="AnimInstance">Anim Instance</option>
            <option value="Object">Object</option>
          </select>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <button type="button" aria-label="Compile blueprint"
              onClick={handleCompile}
              className="px-4 py-1.5 bg-[var(--aethel-success)] hover:bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] rounded text-sm font-medium"
            >
              Compile
            </button>
            <button type="button" aria-label="Save blueprint"
              onClick={handleSave}
              className="px-4 py-1.5 bg-[var(--aethel-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] rounded text-sm font-medium"
            >
              Save
            </button>
            {onClose && (
              <button type="button" aria-label="Close blueprint editor"
                onClick={onClose}
                className="px-4 py-1.5 bg-[var(--aethel-surface-secondary)] hover:bg-[var(--aethel-surface-secondary)] rounded text-sm font-medium"
              >
                Close
              </button>
            )}
          </div>
        </div>

        {/* Tab Bar */}
        <div className="h-8 border-b border-[var(--aethel-border-primary)] flex items-center px-2 gap-1 bg-[var(--aethel-surface-tertiary)]">
          <button type="button" aria-label="Open Event Graph tab"
            onClick={() => setActiveTab('eventGraph')}
            className={`px-3 py-1 text-xs rounded ${
              activeTab === 'eventGraph'
                ? 'bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]'
                : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]'
            }`}
          >
            Event Graph
          </button>
          <button type="button" aria-label="Open Construction Script tab"
            onClick={() => setActiveTab('constructionScript')}
            className={`px-3 py-1 text-xs rounded ${
              activeTab === 'constructionScript'
                ? 'bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]'
                : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]'
            }`}
          >
            Construction Script
          </button>
        </div>

        {/* Graph Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            defaultEdgeOptions={{
              type: 'smoothstep',
            }}
            style={{ background: 'var(--aethel-surface-primary)' }}
          >
            <Background color="var(--aethel-border-primary)" gap={16} />
            <Controls className="bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded" />
            <MiniMap
              className="bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded"
              nodeColor="var(--aethel-primary)"
            />

            <Panel position="top-right" className="bg-[var(--aethel-surface-tertiary)] p-2 rounded border border-[var(--aethel-border-secondary)] text-xs text-[var(--aethel-text-tertiary)]">
              Right-click for context menu - Drag to pan - Scroll to zoom
            </Panel>
          </ReactFlow>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-72 border-l border-[var(--aethel-border-primary)] flex flex-col bg-[var(--aethel-surface-tertiary)]">
        {/* Blueprint Info */}
        <div className="p-3 border-b border-[var(--aethel-border-primary)]">
          <h3 className="text-sm font-semibold text-[var(--aethel-text-primary)] mb-2">My Blueprint</h3>
          <div className="text-xs text-[var(--aethel-text-tertiary)]">
            <div>Type: {blueprint.type}</div>
            <div>Parent: {blueprint.parentClass || 'None'}</div>
          </div>
        </div>

        {/* Variables */}
        <VariablesPanel
          variables={blueprint.variables}
          onAdd={handleAddVariable}
          onDelete={handleDeleteVariable}
          onUpdate={() => {}}
        />

        {/* Components */}
        <ComponentsPanel
          components={blueprint.components}
          onAdd={handleAddComponent}
          onDelete={handleDeleteComponent}
          selectedId={selectedComponentId}
          onSelect={setSelectedComponentId}
        />

        {/* Functions */}
        <FunctionsPanel
          functions={blueprint.functions}
          onAdd={handleAddFunction}
          onDelete={handleDeleteFunction}
          onSelect={setSelectedFunctionId}
          selectedId={selectedFunctionId}
        />

        {/* Details */}
        <div className="flex-1 border-t border-[var(--aethel-border-primary)] overflow-y-auto">
          <DetailsPanel
            selectedNode={selectedNode}
            onUpdate={() => {}}
          />
        </div>
      </div>
    </div>
  );
}
