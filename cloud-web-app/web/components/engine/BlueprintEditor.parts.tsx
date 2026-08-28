'use client';

import React, { useMemo, useState } from 'react';
import { Package, Wrench } from 'lucide-react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import type {
  BlueprintComponent,
  BlueprintFunction,
  BlueprintVariable,
  NodeDefinition,
} from '@/lib/blueprint-system';
import { StandardNodes } from '@/lib/blueprint-system';

export type BlueprintNodeData = Record<string, unknown> & {
  label?: string;
  definition?: NodeDefinition;
};

export type BlueprintFlowNode = Node<BlueprintNodeData, 'blueprintNode'>;

// ============================================================================
// CUSTOM NODE COMPONENT
// ============================================================================

function getPinColor(type?: string) {
  switch (type) {
    case 'exec':
      return { border: 'var(--aethel-text-primary)', bg: 'transparent', isExec: true }
    case 'boolean':
      return { border: 'var(--aethel-error)', bg: 'color-mix(in srgb, var(--aethel-error) 40%, transparent)', isExec: false }
    case 'number':
    case 'float':
    case 'int':
      return { border: 'var(--aethel-success)', bg: 'color-mix(in srgb, var(--aethel-success) 40%, transparent)', isExec: false }
    case 'string':
      return { border: 'var(--aethel-warning)', bg: 'color-mix(in srgb, var(--aethel-warning) 40%, transparent)', isExec: false }
    case 'vector':
    case 'transform':
      return { border: 'var(--aethel-info)', bg: 'color-mix(in srgb, var(--aethel-info) 40%, transparent)', isExec: false }
    default:
      return { border: 'var(--aethel-primary)', bg: 'color-mix(in srgb, var(--aethel-primary) 40%, transparent)', isExec: false }
  }
}

const BlueprintNode = ({ data, selected }: NodeProps<BlueprintFlowNode>) => {
  const definition = data.definition;
  const isEvent = definition?.isEvent;
  const isPure = definition?.isPure;

  return (
    <div
      className={`
        min-w-[180px] rounded-lg shadow-lg border-2
        ${selected ? 'ring-2 ring-[var(--aethel-primary)] shadow-[0_0_15px_rgba(59,130,246,0.25)]' : ''}
        ${isEvent ? 'border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)]' : 'border-[var(--aethel-border-secondary)]'}
      `}
      style={{ backgroundColor: 'var(--aethel-surface-primary)' }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 rounded-t-md text-[var(--aethel-text-primary)] text-sm font-semibold flex items-center gap-2"
        style={{ backgroundColor: definition?.color || 'var(--aethel-text-quaternary)' }}
      >
        {isEvent && <span className="text-xs">Event</span>}
        {isPure && <span className="text-xs">Fn</span>}
        {definition?.displayName || data.label || 'Node'}
      </div>

      {/* Body with pins */}
      <div className="flex">
        {/* Input pins */}
        <div className="flex flex-col py-2 px-1 min-w-[80px]">
          {definition?.inputs.map((input, i) => {
            const pin = getPinColor(input.type)
            return (
              <div key={input.id} className="flex items-center gap-1 py-1 relative">
                <Handle
                  type="target"
                  position={Position.Left}
                  id={input.id}
                  className={`w-3 h-3 rounded-full border-2 ${pin.isExec ? 'rounded-none rotate-45' : ''}`}
                  style={{ left: -6, borderColor: pin.border, backgroundColor: pin.bg }}
                />
                <span className="text-xs text-[var(--aethel-text-secondary)] ml-2">{input.name}</span>
              </div>
            )
          })}
        </div>

        {/* Output pins */}
        <div className="flex flex-col py-2 px-1 min-w-[80px] items-end ml-auto">
          {definition?.outputs.map((output, i) => {
            const pin = getPinColor(output.type)
            return (
              <div key={output.id} className="flex items-center gap-1 py-1 relative">
                <span className="text-xs text-[var(--aethel-text-secondary)] mr-2">{output.name}</span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={output.id}
                  className={`w-3 h-3 rounded-full border-2 ${pin.isExec ? 'rounded-none rotate-45' : ''}`}
                  style={{ right: -6, borderColor: pin.border, backgroundColor: pin.bg }}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
};

export const nodeTypes = {
  blueprintNode: BlueprintNode,
};

// ============================================================================
// NODE PALETTE
// ============================================================================

export const NodePalette: React.FC<{
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
            <button type="button" aria-label={expandedCats.has(category) ? `Collapse ${category}` : `Expand ${category}`}
              onClick={() => toggleCategory(category)}
              className="w-full px-3 py-2 flex items-center justify-between text-sm font-medium text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)] border-b border-[var(--aethel-border-primary)]"
            >
              <span>{category}</span>
              <span>{expandedCats.has(category) ? 'Open' : 'Closed'}</span>
            </button>

            {expandedCats.has(category) && (
              <div className="py-1">
                {nodes.map(node => (
                  <button type="button" aria-label={`Add ${node.displayName} to blueprint`}
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

export const VariablesPanel: React.FC<{
  variables: BlueprintVariable[];
  onAdd: () => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<BlueprintVariable>) => void;
}> = ({ variables, onAdd, onDelete, onUpdate }) => {
  return (
    <div className="p-3 border-b border-[var(--aethel-border-primary)]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-[var(--aethel-text-secondary)]">Variables</span>
        <button type="button" aria-label="Add blueprint variable"
          onClick={onAdd}
          className="px-2 py-1 text-xs bg-[var(--aethel-success)] hover:bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] rounded text-[var(--aethel-text-primary)]"
        >
          + Add
        </button>
      </div>

      <div className="space-y-1 max-h-40 overflow-y-auto">
        {variables.length === 0 ? (
          <div className="text-xs text-[var(--aethel-text-secondary)] italic">No variables</div>
        ) : (
          variables.map(v => (
            <div
              key={v.id}
              className="flex items-center justify-between px-2 py-1 bg-[var(--aethel-surface-tertiary)] rounded text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)]" />
                <span className="text-[var(--aethel-text-primary)]">{v.name}</span>
                <span className="text-[var(--aethel-text-secondary)]">({v.type})</span>
              </div>
              <button type="button" aria-label={`Remove blueprint variable ${v.name}`}
                onClick={() => onDelete(v.id)}
                className="text-[var(--aethel-error-light)] hover:text-[var(--aethel-error)]"
              >
                x
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

export const ComponentsPanel: React.FC<{
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
          {comp.isRootComponent ? <Package className="w-3.5 h-3.5 text-[var(--aethel-primary)] shrink-0" /> : <Wrench className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
          <span>{comp.name}</span>
          <span className="text-[var(--aethel-text-secondary)] ml-auto">{comp.type}</span>
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
        <button type="button" aria-label="Add blueprint component"
          onClick={onAdd}
          className="px-2 py-1 text-xs bg-[var(--aethel-success)] hover:bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] rounded text-[var(--aethel-text-primary)]"
        >
          + Add
        </button>
      </div>

      <div className="space-y-0.5 max-h-48 overflow-y-auto bg-[var(--aethel-surface-primary)] rounded p-1">
        {rootComponents.length === 0 ? (
          <div className="text-xs text-[var(--aethel-text-secondary)] italic p-2">No components</div>
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

export const FunctionsPanel: React.FC<{
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
        <button type="button" aria-label="Add blueprint function"
          onClick={onAdd}
          className="px-2 py-1 text-xs bg-[var(--aethel-success)] hover:bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] rounded text-[var(--aethel-text-primary)]"
        >
          + Add
        </button>
      </div>

      <div className="space-y-1 max-h-40 overflow-y-auto">
        {functions.length === 0 ? (
          <div className="text-xs text-[var(--aethel-text-secondary)] italic">No functions</div>
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
                <span>{f.isEvent ? 'Event' : 'Fn'}</span>
                <span>{f.name}</span>
              </div>
              <button type="button" aria-label={`Remove blueprint function ${f.name}`}
                onClick={(e) => { e.stopPropagation(); onDelete(f.id); }}
                className="text-[var(--aethel-error-light)] hover:text-[var(--aethel-error)]"
              >
                x
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

export const DetailsPanel: React.FC<{
  selectedNode: Node | null;
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
}> = ({ selectedNode, onUpdate }) => {
  if (!selectedNode) {
    return (
      <div className="p-4 text-[var(--aethel-text-secondary)] text-sm">
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
