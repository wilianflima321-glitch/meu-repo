/**
 * Behavior Tree Editor - Visual AI Behavior Editor
 * Connects to lib/behavior-tree.ts
 */

'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';

// Types
type BTNodeType = 'root' | 'selector' | 'sequence' | 'parallel' | 'decorator' | 'task' | 'condition';

interface BTNode {
  id: string;
  type: BTNodeType;
  name: string;
  position: { x: number; y: number };
  children: string[];
  properties: Record<string, any>;
  status?: 'inactive' | 'running' | 'success' | 'failure';
}

interface BehaviorTree {
  id: string;
  name: string;
  rootId: string | null;
  nodes: Record<string, BTNode>;
}

// Node Templates
const BT_NODE_TEMPLATES: Record<string, Partial<BTNode>> = {
  // Composites
  selector: {
    type: 'selector',
    name: 'Selector',
    properties: { description: 'Executes children until one succeeds' }
  },
  sequence: {
    type: 'sequence',
    name: 'Sequence',
    properties: { description: 'Executes children in order until one fails' }
  },
  parallel: {
    type: 'parallel',
    name: 'Parallel',
    properties: { policy: 'require_all', description: 'Executes all children simultaneously' }
  },

  // Decorators
  'repeat': {
    type: 'decorator',
    name: 'Repeat',
    properties: { times: 3, infinite: false }
  },
  'retry': {
    type: 'decorator',
    name: 'Retry',
    properties: { maxAttempts: 3 }
  },
  'inverter': {
    type: 'decorator',
    name: 'Inverter',
    properties: { description: 'Inverts child result' }
  },
  'cooldown': {
    type: 'decorator',
    name: 'Cooldown',
    properties: { duration: 5 }
  },
  'timeout': {
    type: 'decorator',
    name: 'Timeout',
    properties: { duration: 10 }
  },

  // Tasks
  'move-to': {
    type: 'task',
    name: 'Move To',
    properties: { target: 'player', speed: 5, acceptRadius: 1 }
  },
  'attack': {
    type: 'task',
    name: 'Attack',
    properties: { damage: 10, range: 2, cooldown: 1 }
  },
  'wait': {
    type: 'task',
    name: 'Wait',
    properties: { duration: 2, randomVariation: 0.5 }
  },
  'play-animation': {
    type: 'task',
    name: 'Play Animation',
    properties: { animationName: '', waitForComplete: true }
  },
  'patrol': {
    type: 'task',
    name: 'Patrol',
    properties: { patrolPoints: [], waitTime: 2, loop: true }
  },
  'flee': {
    type: 'task',
    name: 'Flee',
    properties: { fleeDistance: 10, target: 'player' }
  },
  'custom-action': {
    type: 'task',
    name: 'Custom Action',
    properties: { functionName: '', parameters: {} }
  },

  // Conditions
  'is-in-range': {
    type: 'condition',
    name: 'Is In Range',
    properties: { target: 'player', range: 10 }
  },
  'has-target': {
    type: 'condition',
    name: 'Has Target',
    properties: { targetType: 'enemy' }
  },
  'health-check': {
    type: 'condition',
    name: 'Health Check',
    properties: { comparison: 'less_than', value: 50, asPercent: true }
  },
  'can-see-target': {
    type: 'condition',
    name: 'Can See Target',
    properties: { target: 'player', fov: 90, maxDistance: 20 }
  },
  'blackboard-check': {
    type: 'condition',
    name: 'Blackboard Check',
    properties: { key: '', comparison: 'equals', value: '' }
  }
};

// Node colors and icons
const NODE_STYLES: Record<BTNodeType, { color: string; icon: string }> = {
  root: { color: '#ef4444', icon: '🌳' },
  selector: { color: '#f59e0b', icon: '❓' },
  sequence: { color: '#22c55e', icon: '→' },
  parallel: { color: '#3b82f6', icon: '⇉' },
  decorator: { color: '#8b5cf6', icon: '🔄' },
  task: { color: '#06b6d4', icon: '⚡' },
  condition: { color: '#ec4899', icon: '❔' }
};

// Status colors
const STATUS_COLORS: Record<string, string> = {
  inactive: '#64748b',
  running: '#f59e0b',
  success: '#22c55e',
  failure: '#ef4444'
};

// Single Node Component
const BTNodeComponent: React.FC<{
  node: BTNode;
  selected: boolean;
  onSelect: () => void;
  onDrag: (pos: { x: number; y: number }) => void;
  onAddChild: () => void;
  tree: BehaviorTree;
}> = ({ node, selected, onSelect, onDrag, onAddChild, tree }) => {
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const style = NODE_STYLES[node.type];

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    setDragging(true);
    dragStart.current = { x: e.clientX - node.position.x, y: e.clientY - node.position.y };
  }, [node.position, onSelect]);

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e: MouseEvent) => {
      onDrag({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y
      });
    };

    const handleUp = () => setDragging(false);

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragging, onDrag]);

  const statusColor = STATUS_COLORS[node.status || 'inactive'];
  const canHaveChildren = ['root', 'selector', 'sequence', 'parallel', 'decorator'].includes(node.type);
  const maxChildren = node.type === 'decorator' ? 1 : Infinity;
  const canAddChild = canHaveChildren && node.children.length < maxChildren;

  return (
    <div
      className={`absolute select-none cursor-move ${selected ? 'z-10' : ''}`}
      style={{ left: node.position.x, top: node.position.y }}
      onMouseDown={handleMouseDown}
    >
      {/* Main Node */}
      <div
        className={`rounded-lg shadow-lg min-w-[140px] ${selected ? 'ring-2 ring-white' : ''}`}
        style={{
          backgroundColor: '#1e293b',
          borderLeft: `4px solid ${style.color}`,
          borderTop: `2px solid ${statusColor}`,
          borderRight: `2px solid ${statusColor}`,
          borderBottom: `2px solid ${statusColor}`
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="text-lg">{style.icon}</span>
          <div>
            <div className="text-white text-sm font-medium">{node.name}</div>
            <div className="text-xs text-gray-400 capitalize">{node.type}</div>
          </div>
        </div>

        {/* Status indicator */}
        {node.status && node.status !== 'inactive' && (
          <div
            className="text-xs text-center py-1 capitalize"
            style={{ backgroundColor: statusColor, color: 'white' }}
          >
            {node.status}
          </div>
        )}
      </div>

      {/* Add Child Button */}
      {canAddChild && (
        <button
          className="absolute left-1/2 -translate-x-1/2 -bottom-3 w-6 h-6 rounded-full bg-slate-700 hover:bg-slate-600 text-white text-xs flex items-center justify-center"
          onClick={(e) => {
            e.stopPropagation();
            onAddChild();
          }}
        >
          +
        </button>
      )}
    </div>
  );
};

// Main Editor Component
export default function BehaviorTreeEditor() {
  const [tree, setTree] = useState<BehaviorTree>({
    id: 'default',
    name: 'New Behavior Tree',
    rootId: null,
    nodes: {}
  });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState<{ parentId: string | null; position: { x: number; y: number } } | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Add node
  const addNode = useCallback((templateKey: string, parentId: string | null, position: { x: number; y: number }) => {
    const template = BT_NODE_TEMPLATES[templateKey];
    if (!template) return;

    const newNodeId = `node_${Date.now()}`;
    const newNode: BTNode = {
      id: newNodeId,
      type: template.type!,
      name: template.name!,
      position,
      children: [],
      properties: { ...template.properties }
    };

    setTree(prev => {
      const updatedNodes = { ...prev.nodes, [newNodeId]: newNode };

      // If has parent, add as child
      if (parentId && prev.nodes[parentId]) {
        updatedNodes[parentId] = {
          ...prev.nodes[parentId],
          children: [...prev.nodes[parentId].children, newNodeId]
        };
      }

      // If no root, this becomes root
      const newRootId = prev.rootId || (template.type === 'root' ? null : newNodeId);

      return {
        ...prev,
        rootId: newRootId,
        nodes: updatedNodes
      };
    });

    setShowAddMenu(null);
    setSelectedNodeId(newNodeId);
  }, []);

  // Delete node
  const deleteNode = useCallback((nodeId: string) => {
    setTree(prev => {
      const newNodes = { ...prev.nodes };
      const nodeToDelete = newNodes[nodeId];
      if (!nodeToDelete) return prev;

      // Recursively delete children
      const deleteRecursive = (id: string) => {
        const node = newNodes[id];
        if (!node) return;
        node.children.forEach(deleteRecursive);
        delete newNodes[id];
      };
      deleteRecursive(nodeId);

      // Remove from parent's children
      Object.values(newNodes).forEach(node => {
        node.children = node.children.filter(childId => childId !== nodeId);
      });

      return {
        ...prev,
        rootId: prev.rootId === nodeId ? null : prev.rootId,
        nodes: newNodes
      };
    });
    setSelectedNodeId(null);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedNodeId) {
        deleteNode(selectedNodeId);
      }
      if (e.key === 'Escape') {
        setShowAddMenu(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, deleteNode]);

  // Simulation tick
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setTree(prev => {
        const newNodes = { ...prev.nodes };
        Object.values(newNodes).forEach(node => {
          // Random status for demo
          const statuses: BTNode['status'][] = ['inactive', 'running', 'success', 'failure'];
          node.status = statuses[Math.floor(Math.random() * statuses.length)];
        });
        return { ...prev, nodes: newNodes };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSimulating]);

  // Group templates by type
  const templateGroups = useMemo(() => {
    const groups: Record<string, string[]> = {
      composite: [],
      decorator: [],
      task: [],
      condition: []
    };

    Object.entries(BT_NODE_TEMPLATES).forEach(([key, template]) => {
      if (template.type === 'selector' || template.type === 'sequence' || template.type === 'parallel') {
        groups.composite.push(key);
      } else if (template.type === 'decorator') {
        groups.decorator.push(key);
      } else if (template.type === 'task') {
        groups.task.push(key);
      } else if (template.type === 'condition') {
        groups.condition.push(key);
      }
    });

    return groups;
  }, []);

  const selectedNode = selectedNodeId ? tree.nodes[selectedNodeId] : null;

  // Render connections
  const renderConnections = () => {
    const lines: JSX.Element[] = [];

    Object.values(tree.nodes).forEach(node => {
      node.children.forEach((childId, index) => {
        const child = tree.nodes[childId];
        if (!child) return;

        const startX = node.position.x + 70;
        const startY = node.position.y + 60;
        const endX = child.position.x + 70;
        const endY = child.position.y;

        lines.push(
          <path
            key={`${node.id}-${childId}`}
            d={`M ${startX} ${startY} C ${startX} ${(startY + endY) / 2}, ${endX} ${(startY + endY) / 2}, ${endX} ${endY}`}
            stroke="#475569"
            strokeWidth="2"
            fill="none"
          />
        );
      });
    });

    return lines;
  };

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-4">
          <h2 className="text-white font-semibold">🧠 Behavior Tree Editor</h2>
          <input
            type="text"
            value={tree.name}
            onChange={(e) => setTree(prev => ({ ...prev, name: e.target.value }))}
            className="px-2 py-1 bg-slate-700 text-white rounded text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`px-3 py-1 rounded text-sm font-medium ${
              isSimulating ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
            } text-white`}
          >
            {isSimulating ? '⏹ Stop' : '▶ Simulate'}
          </button>
          <button
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
            onClick={() => setShowAddMenu({ parentId: null, position: { x: 400, y: 100 } })}
          >
            + Add Root
          </button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 relative overflow-auto"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '20px 20px'
          }}
          onClick={() => {
            setSelectedNodeId(null);
            setShowAddMenu(null);
          }}
        >
          {/* Connections */}
          <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
            {renderConnections()}
          </svg>

          {/* Nodes */}
          {Object.values(tree.nodes).map((node) => (
            <BTNodeComponent
              key={node.id}
              node={node}
              selected={node.id === selectedNodeId}
              onSelect={() => setSelectedNodeId(node.id)}
              onDrag={(pos) => {
                setTree(prev => ({
                  ...prev,
                  nodes: {
                    ...prev.nodes,
                    [node.id]: { ...prev.nodes[node.id], position: pos }
                  }
                }));
              }}
              onAddChild={() => {
                setShowAddMenu({
                  parentId: node.id,
                  position: {
                    x: node.position.x,
                    y: node.position.y + 100
                  }
                });
              }}
              tree={tree}
            />
          ))}

          {/* Add Menu */}
          {showAddMenu && (
            <div
              className="absolute bg-slate-800 rounded-lg shadow-2xl border border-slate-600 z-50"
              style={{ left: showAddMenu.position.x + 150, top: showAddMenu.position.y, minWidth: 200 }}
            >
              <div className="px-3 py-2 border-b border-slate-600">
                <span className="text-white text-sm font-medium">Add Node</span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {Object.entries(templateGroups).map(([group, keys]) => (
                  <div key={group}>
                    <div className="px-3 py-1 text-xs font-semibold uppercase text-gray-400">
                      {group}
                    </div>
                    {keys.map((key) => {
                      const template = BT_NODE_TEMPLATES[key];
                      const style = NODE_STYLES[template.type!];
                      return (
                        <button
                          key={key}
                          className="w-full px-3 py-1 text-left text-sm text-gray-300 hover:bg-slate-700 flex items-center gap-2"
                          onClick={() => addNode(key, showAddMenu.parentId, showAddMenu.position)}
                        >
                          <span style={{ color: style.color }}>{style.icon}</span>
                          {template.name}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Properties Panel */}
        {selectedNode && (
          <div className="w-72 bg-slate-800 border-l border-slate-700 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{NODE_STYLES[selectedNode.type].icon}</span>
                <div>
                  <input
                    type="text"
                    value={selectedNode.name}
                    onChange={(e) => {
                      setTree(prev => ({
                        ...prev,
                        nodes: {
                          ...prev.nodes,
                          [selectedNodeId!]: { ...prev.nodes[selectedNodeId!], name: e.target.value }
                        }
                      }));
                    }}
                    className="bg-transparent text-white font-semibold border-b border-transparent hover:border-gray-500 focus:border-blue-500 outline-none"
                  />
                  <div className="text-xs text-gray-400 capitalize">{selectedNode.type}</div>
                </div>
              </div>

              <div className="space-y-3">
                {Object.entries(selectedNode.properties).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-xs text-gray-400 mb-1 capitalize">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </label>
                    {typeof value === 'boolean' ? (
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => {
                            setTree(prev => ({
                              ...prev,
                              nodes: {
                                ...prev.nodes,
                                [selectedNodeId!]: {
                                  ...prev.nodes[selectedNodeId!],
                                  properties: { ...prev.nodes[selectedNodeId!].properties, [key]: e.target.checked }
                                }
                              }
                            }));
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-gray-300">{key}</span>
                      </label>
                    ) : typeof value === 'number' ? (
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => {
                          setTree(prev => ({
                            ...prev,
                            nodes: {
                              ...prev.nodes,
                              [selectedNodeId!]: {
                                ...prev.nodes[selectedNodeId!],
                                properties: { ...prev.nodes[selectedNodeId!].properties, [key]: parseFloat(e.target.value) || 0 }
                              }
                            }
                          }));
                        }}
                        className="w-full px-2 py-1 bg-slate-700 text-white rounded text-sm"
                      />
                    ) : (
                      <input
                        type="text"
                        value={String(value)}
                        onChange={(e) => {
                          setTree(prev => ({
                            ...prev,
                            nodes: {
                              ...prev.nodes,
                              [selectedNodeId!]: {
                                ...prev.nodes[selectedNodeId!],
                                properties: { ...prev.nodes[selectedNodeId!].properties, [key]: e.target.value }
                              }
                            }
                          }));
                        }}
                        className="w-full px-2 py-1 bg-slate-700 text-white rounded text-sm"
                      />
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={() => deleteNode(selectedNodeId!)}
                className="mt-4 w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
              >
                🗑️ Delete Node
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-1 bg-slate-800 border-t border-slate-700 text-xs text-gray-400">
        <span>Nodes: {Object.keys(tree.nodes).length}</span>
        <span>{isSimulating ? '🔴 Simulating' : '⚪ Idle'}</span>
      </div>
    </div>
  );
}
