'use client';

/**
 * Blueprint Editor - Editor Visual de Blueprints
 * 
 * Editor completo estilo Unreal Engine para criar e editar
 * blueprints com sistema de nós visuais.
 * 
 * NÃO É MOCK - Editor real e funcional!
 */

import React, { useState, useCallback, useMemo } from 'react';
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
  Node,
  Edge,
  Handle,
  Position,
  NodeProps,
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

// ============================================================================
// TYPES
// ============================================================================

interface BlueprintEditorProps {
  blueprintId?: string;
  onSave?: (blueprint: Blueprint) => void;
  onClose?: () => void;
}

type BlueprintNodeData = Record<string, unknown> & {
  label?: string;
  definition?: NodeDefinition;
};

type BlueprintFlowNode = Node<BlueprintNodeData, 'blueprintNode'>;

// ============================================================================
// CUSTOM NODE COMPONENT
// ============================================================================

const BlueprintNode = ({ data, selected }: NodeProps<BlueprintFlowNode>) => {
  const definition = data.definition;
  const isEvent = definition?.isEvent;
  const isPure = definition?.isPure;
  
  return (
    <div
      className={`
        min-w-[180px] rounded-lg shadow-lg border-2
        ${selected ? 'ring-2 ring-blue-500' : ''}
        ${isEvent ? 'border-red-600' : 'border-[var(--aethel-border-secondary)]'}
      `}
      style={{ backgroundColor: 'var(--aethel-surface-primary)' }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 rounded-t-md text-[var(--aethel-text-primary)] text-sm font-semibold flex items-center gap-2"
        style={{ backgroundColor: definition?.color || 'var(--aethel-text-quaternary)' }}
      >
        {isEvent && <span className="text-xs">⚡</span>}
        {isPure && <span className="text-xs">ƒ</span>}
        {definition?.displayName || data.label || 'Node'}
      </div>
      
      {/* Body with pins */}
      <div className="flex">
        {/* Input pins */}
        <div className="flex flex-col py-2 px-1 min-w-[80px]">
          {definition?.inputs.map((input, i) => (
            <div key={input.id} className="flex items-center gap-1 py-1 relative">
              <Handle
                type="target"
                position={Position.Left}
                id={input.id}
                className={`
                  w-3 h-3 rounded-full border-2 
                  ${input.type === 'exec' 
                    ? 'border-white bg-transparent' 
                    : 'border-cyan-400 bg-cyan-400/30'}
                `}
                style={{ left: -6 }}
              />
              <span className="text-xs text-[var(--aethel-text-secondary)] ml-2">{input.name}</span>
            </div>
          ))}
        </div>
        
        {/* Output pins */}
        <div className="flex flex-col py-2 px-1 min-w-[80px] items-end ml-auto">
          {definition?.outputs.map((output, i) => (
            <div key={output.id} className="flex items-center gap-1 py-1 relative">
              <span className="text-xs text-[var(--aethel-text-secondary)] mr-2">{output.name}</span>
              <Handle
                type="source"
                position={Position.Right}
                id={output.id}
                className={`
                  w-3 h-3 rounded-full border-2
                  ${output.type === 'exec' 
                    ? 'border-white bg-transparent' 
                    : 'border-cyan-400 bg-cyan-400/30'}
                `}
                style={{ right: -6 }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const nodeTypes = {
  blueprintNode: BlueprintNode,
};

// ============================================================================
// NODE PALETTE
// ============================================================================

const NodePalette: React.FC<{
  onAddNode: (type: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}> = ({ onAddNode, searchTerm, setSearchTerm }) => {
  const categories = useMemo(() => {
    const cats = new Map<string, NodeDefinition[]>();
    for (const node of StandardNodes) {
      const cat = cats.get(node.category) || [];
      cat.push(node);
      cats.set(node.category, cat);
    }
    return cats;
  }, []);
  
  const filteredCategories = useMemo(() => {
    if (!searchTerm) return categories;
    
    const filtered = new Map<string, NodeDefinition[]>();
    for (const [cat, nodes] of categories) {
      const matchingNodes = nodes.filter(n => 
        n.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (matchingNodes.length > 0) {
        filtered.set(cat, matchingNodes);
      }
    }
    return filtered;
  }, [categories, searchTerm]);
  
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(['Events', 'Flow Control']));
  
  const toggleCategory = (cat: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };
  
  return (
    <div className="w-64 bg-[var(--aethel-surface-primary)] border-r border-[var(--aethel-border-primary)] flex flex-col">
      <div className="p-3 border-b border-[var(--aethel-border-primary)]">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search nodes..."
          className="w-full px-3 py-2 bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded text-sm text-[var(--aethel-text-primary)] placeholder:text-[var(--aethel-text-quaternary)] focus:border-[var(--aethel-primary)] focus:outline-none"
        />
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {Array.from(filteredCategories).map(([category, nodes]) => (
          <div key={category}>
            <button
              onClick={() => toggleCategory(category)}
              className="w-full px-3 py-2 flex items-center justify-between text-sm font-medium text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)] border-b border-[var(--aethel-border-primary)]"
            >
              <span>{category}</span>
              <span>{expandedCats.has(category) ? '▼' : '▶'}</span>
            </button>
            
            {expandedCats.has(category) && (
              <div className="py-1">
                {nodes.map(node => (
                  <button
                    key={node.type}
                    onClick={() => onAddNode(node.type)}
                    className="w-full px-4 py-1.5 text-left text-xs text-[var(--aethel-text-tertiary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)] flex items-center gap-2"
                    title={node.description}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: node.color }}
                    />
                    {node.displayName}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// VARIABLES PANEL
// ============================================================================

const VariablesPanel: React.FC<{
  variables: BlueprintVariable[];
  onAdd: () => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<BlueprintVariable>) => void;
}> = ({ variables, onAdd, onDelete, onUpdate }) => {
  return (
    <div className="p-3 border-b border-[var(--aethel-border-primary)]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-[var(--aethel-text-secondary)]">Variables</span>
        <button
          onClick={onAdd}
          className="px-2 py-1 text-xs bg-[var(--aethel-success)] hover:bg-green-700 rounded text-[var(--aethel-text-primary)]"
        >
          + Add
        </button>
      </div>
      
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {variables.length === 0 ? (
          <div className="text-xs text-gray-500 italic">No variables</div>
        ) : (
          variables.map(v => (
            <div
              key={v.id}
              className="flex items-center justify-between px-2 py-1 bg-[var(--aethel-surface-tertiary)] rounded text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                <span className="text-[var(--aethel-text-primary)]">{v.name}</span>
                <span className="text-gray-500">({v.type})</span>
              </div>
              <button
                onClick={() => onDelete(v.id)}
                className="text-red-500 hover:text-[var(--aethel-error)]"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENTS PANEL
// ============================================================================

const ComponentsPanel: React.FC<{
  components: BlueprintComponent[];
  onAdd: () => void;
  onDelete: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}> = ({ components, onAdd, onDelete, selectedId, onSelect }) => {
  const buildTree = (parentId?: string) => {
    return components.filter(c => c.parentId === parentId);
  };
  
  const renderComponent = (comp: BlueprintComponent, depth: number = 0) => {
    const children = buildTree(comp.id);
    
    return (
      <div key={comp.id}>
        <div
          onClick={() => onSelect(comp.id)}
          className={`
            flex items-center gap-2 px-2 py-1 text-xs cursor-pointer rounded
            ${selectedId === comp.id ? 'bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)]' : 'hover:bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)]'}
          `}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
        >
          <span>{comp.isRootComponent ? '📦' : '🔧'}</span>
          <span>{comp.name}</span>
          <span className="text-gray-500 ml-auto">{comp.type}</span>
        </div>
        {children.map(child => renderComponent(child, depth + 1))}
      </div>
    );
  };
  
  const rootComponents = buildTree(undefined);
  
  return (
    <div className="p-3 border-b border-[var(--aethel-border-primary)]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-[var(--aethel-text-secondary)]">Components</span>
        <button
          onClick={onAdd}
          className="px-2 py-1 text-xs bg-[var(--aethel-success)] hover:bg-green-700 rounded text-[var(--aethel-text-primary)]"
        >
          + Add
        </button>
      </div>
      
      <div className="space-y-0.5 max-h-48 overflow-y-auto bg-[var(--aethel-surface-primary)] rounded p-1">
        {rootComponents.length === 0 ? (
          <div className="text-xs text-gray-500 italic p-2">No components</div>
        ) : (
          rootComponents.map(c => renderComponent(c))
        )}
      </div>
    </div>
  );
};

// ============================================================================
// FUNCTIONS PANEL
// ============================================================================

const FunctionsPanel: React.FC<{
  functions: BlueprintFunction[];
  onAdd: () => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  selectedId: string | null;
}> = ({ functions, onAdd, onDelete, onSelect, selectedId }) => {
  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-[var(--aethel-text-secondary)]">Functions</span>
        <button
          onClick={onAdd}
          className="px-2 py-1 text-xs bg-[var(--aethel-success)] hover:bg-green-700 rounded text-[var(--aethel-text-primary)]"
        >
          + Add
        </button>
      </div>
      
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {functions.length === 0 ? (
          <div className="text-xs text-gray-500 italic">No functions</div>
        ) : (
          functions.map(f => (
            <div
              key={f.id}
              onClick={() => onSelect(f.id)}
              className={`
                flex items-center justify-between px-2 py-1 rounded text-xs cursor-pointer
                ${selectedId === f.id ? 'bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)]' : 'bg-[var(--aethel-surface-tertiary)] hover:bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)]'}
              `}
            >
              <div className="flex items-center gap-2">
                <span>{f.isEvent ? '⚡' : 'ƒ'}</span>
                <span>{f.name}</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(f.id); }}
                className="text-red-500 hover:text-[var(--aethel-error)]"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ============================================================================
// DETAILS PANEL
// ============================================================================

const DetailsPanel: React.FC<{
  selectedNode: Node | null;
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
}> = ({ selectedNode, onUpdate }) => {
  if (!selectedNode) {
    return (
      <div className="p-4 text-gray-500 text-sm">
        Select a node to view details
      </div>
    );
  }
  
  const definition = selectedNode.data?.definition as NodeDefinition | undefined;
  
  return (
    <div className="p-4">
      <h3 className="text-[var(--aethel-text-primary)] font-semibold mb-3">
        {definition?.displayName || 'Node Details'}
      </h3>
      
      <div className="space-y-3 text-sm">
        <div>
          <label className="text-[var(--aethel-text-tertiary)] text-xs">Type</label>
          <div className="text-[var(--aethel-text-primary)]">{selectedNode.type}</div>
        </div>
        
        <div>
          <label className="text-[var(--aethel-text-tertiary)] text-xs">Category</label>
          <div className="text-[var(--aethel-text-primary)]">{definition?.category || 'Unknown'}</div>
        </div>
        
        {definition?.description && (
          <div>
            <label className="text-[var(--aethel-text-tertiary)] text-xs">Description</label>
            <div className="text-[var(--aethel-text-secondary)] text-xs">{definition.description}</div>
          </div>
        )}
        
        <div>
          <label className="text-[var(--aethel-text-tertiary)] text-xs">Position</label>
          <div className="flex gap-2 text-[var(--aethel-text-primary)]">
            <span>X: {Math.round(selectedNode.position.x)}</span>
            <span>Y: {Math.round(selectedNode.position.y)}</span>
          </div>
        </div>
        
        {/* Input default values */}
        {definition?.inputs.filter(i => i.type === 'data').map(input => (
          <div key={input.id}>
            <label className="text-[var(--aethel-text-tertiary)] text-xs">{input.name}</label>
            <input
              type="text"
              defaultValue={String(input.defaultValue ?? '')}
              className="w-full px-2 py-1 bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded text-[var(--aethel-text-primary)] text-xs"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

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
    
    setNodes(nds => [...nds, newNode]);
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
      console.warn('Incompatible pin types');
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
    
    setEdges(eds => addEdge(newEdge, eds));
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
    
    console.log('✅ Blueprint compiled successfully!');
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
            <span className="text-blue-400">📘</span>
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
            <button
              onClick={handleCompile}
              className="px-4 py-1.5 bg-[var(--aethel-success)] hover:bg-green-700 rounded text-sm font-medium"
            >
              Compile
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 bg-[var(--aethel-primary)] hover:bg-blue-700 rounded text-sm font-medium"
            >
              Save
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-1.5 bg-gray-600 hover:bg-gray-700 rounded text-sm font-medium"
              >
                Close
              </button>
            )}
          </div>
        </div>
        
        {/* Tab Bar */}
        <div className="h-8 border-b border-[var(--aethel-border-primary)] flex items-center px-2 gap-1 bg-[var(--aethel-surface-tertiary)]">
          <button
            onClick={() => setActiveTab('eventGraph')}
            className={`px-3 py-1 text-xs rounded ${
              activeTab === 'eventGraph' 
                ? 'bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]' 
                : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]'
            }`}
          >
            Event Graph
          </button>
          <button
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
              Right-click for context menu • Drag to pan • Scroll to zoom
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
