/**
 * VFX Graph Editor - Node-based Visual Effects Editor
 * Connects to lib/vfx-graph-editor.ts
 */

'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';

// Types
interface VFXNode {
  id: string;
  type: 'emitter' | 'module' | 'renderer' | 'output' | 'math' | 'parameter';
  name: string;
  position: { x: number; y: number };
  inputs: { id: string; name: string; type: string; connected?: string }[];
  outputs: { id: string; name: string; type: string }[];
  properties: Record<string, any>;
}

interface Connection {
  id: string;
  from: { nodeId: string; outputId: string };
  to: { nodeId: string; inputId: string };
}

interface VFXGraph {
  id: string;
  name: string;
  nodes: VFXNode[];
  connections: Connection[];
}

// Node Templates
const NODE_TEMPLATES: Record<string, Omit<VFXNode, 'id' | 'position'>> = {
  'spawn-rate': {
    type: 'emitter',
    name: 'Spawn Rate',
    inputs: [{ id: 'rate', name: 'Rate', type: 'float' }],
    outputs: [{ id: 'particles', name: 'Particles', type: 'particle-stream' }],
    properties: { rate: 100, burst: false }
  },
  'velocity': {
    type: 'module',
    name: 'Initial Velocity',
    inputs: [{ id: 'in', name: 'Input', type: 'particle-stream' }],
    outputs: [{ id: 'out', name: 'Output', type: 'particle-stream' }],
    properties: { velocity: { x: 0, y: 10, z: 0 }, randomize: 0.2 }
  },
  'lifetime': {
    type: 'module',
    name: 'Lifetime',
    inputs: [{ id: 'in', name: 'Input', type: 'particle-stream' }],
    outputs: [{ id: 'out', name: 'Output', type: 'particle-stream' }],
    properties: { min: 1, max: 3 }
  },
  'color-over-life': {
    type: 'module',
    name: 'Color Over Life',
    inputs: [
      { id: 'in', name: 'Input', type: 'particle-stream' },
      { id: 'gradient', name: 'Gradient', type: 'gradient' }
    ],
    outputs: [{ id: 'out', name: 'Output', type: 'particle-stream' }],
    properties: { gradient: [{ t: 0, color: '#ffffff' }, { t: 1, color: '#ff0000' }] }
  },
  'size-over-life': {
    type: 'module',
    name: 'Size Over Life',
    inputs: [
      { id: 'in', name: 'Input', type: 'particle-stream' },
      { id: 'curve', name: 'Curve', type: 'curve' }
    ],
    outputs: [{ id: 'out', name: 'Output', type: 'particle-stream' }],
    properties: { startSize: 1, endSize: 0 }
  },
  'gravity': {
    type: 'module',
    name: 'Gravity',
    inputs: [{ id: 'in', name: 'Input', type: 'particle-stream' }],
    outputs: [{ id: 'out', name: 'Output', type: 'particle-stream' }],
    properties: { force: { x: 0, y: -9.81, z: 0 } }
  },
  'turbulence': {
    type: 'module',
    name: 'Turbulence',
    inputs: [{ id: 'in', name: 'Input', type: 'particle-stream' }],
    outputs: [{ id: 'out', name: 'Output', type: 'particle-stream' }],
    properties: { intensity: 1, frequency: 1, octaves: 3 }
  },
  'sprite-renderer': {
    type: 'renderer',
    name: 'Sprite Renderer',
    inputs: [{ id: 'in', name: 'Particles', type: 'particle-stream' }],
    outputs: [],
    properties: { texture: '', blendMode: 'additive', sortMode: 'byDistance' }
  },
  'mesh-renderer': {
    type: 'renderer',
    name: 'Mesh Renderer',
    inputs: [{ id: 'in', name: 'Particles', type: 'particle-stream' }],
    outputs: [],
    properties: { mesh: 'sphere', material: '', castShadows: false }
  },
  'ribbon-renderer': {
    type: 'renderer',
    name: 'Ribbon Renderer',
    inputs: [{ id: 'in', name: 'Particles', type: 'particle-stream' }],
    outputs: [],
    properties: { width: 0.5, segments: 16, texture: '' }
  },
  'multiply': {
    type: 'math',
    name: 'Multiply',
    inputs: [
      { id: 'a', name: 'A', type: 'float' },
      { id: 'b', name: 'B', type: 'float' }
    ],
    outputs: [{ id: 'result', name: 'Result', type: 'float' }],
    properties: {}
  },
  'random-float': {
    type: 'math',
    name: 'Random Float',
    inputs: [
      { id: 'min', name: 'Min', type: 'float' },
      { id: 'max', name: 'Max', type: 'float' }
    ],
    outputs: [{ id: 'value', name: 'Value', type: 'float' }],
    properties: { seed: 0 }
  },
  'parameter-float': {
    type: 'parameter',
    name: 'Float Parameter',
    inputs: [],
    outputs: [{ id: 'value', name: 'Value', type: 'float' }],
    properties: { name: 'MyParam', default: 1, min: 0, max: 10, exposed: true }
  }
};

// Node colors by type
const NODE_COLORS: Record<string, string> = {
  emitter: '#22c55e',
  module: '#3b82f6',
  renderer: '#a855f7',
  output: '#ef4444',
  math: '#f59e0b',
  parameter: '#ec4899'
};

// Single Node Component
const VFXNodeComponent: React.FC<{
  node: VFXNode;
  selected: boolean;
  onSelect: () => void;
  onMove: (pos: { x: number; y: number }) => void;
  onConnectStart: (outputId: string) => void;
  onConnectEnd: (inputId: string) => void;
}> = ({ node, selected, onSelect, onMove, onConnectStart, onConnectEnd }) => {
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('port')) return;
    e.stopPropagation();
    onSelect();
    setDragging(true);
    dragStart.current = { x: e.clientX - node.position.x, y: e.clientY - node.position.y };
  }, [node.position, onSelect]);

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e: MouseEvent) => {
      onMove({
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
  }, [dragging, onMove]);

  const borderColor = NODE_COLORS[node.type] || '#666';

  return (
    <div
      className={`absolute rounded-lg shadow-xl transition-shadow ${selected ? 'ring-2 ring-white' : ''}`}
      style={{
        left: node.position.x,
        top: node.position.y,
        minWidth: 180,
        backgroundColor: '#1e293b',
        border: `2px solid ${borderColor}`
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div
        className="px-3 py-2 rounded-t-md text-white text-sm font-medium"
        style={{ backgroundColor: borderColor }}
      >
        {node.name}
      </div>

      {/* Content */}
      <div className="p-2">
        {/* Inputs */}
        {node.inputs.map((input) => (
          <div key={input.id} className="flex items-center mb-1">
            <div
              className="port w-3 h-3 rounded-full bg-gray-500 hover:bg-blue-400 cursor-pointer mr-2"
              onClick={() => onConnectEnd(input.id)}
              title={`${input.name} (${input.type})`}
            />
            <span className="text-xs text-gray-300">{input.name}</span>
          </div>
        ))}

        {/* Outputs */}
        {node.outputs.map((output) => (
          <div key={output.id} className="flex items-center justify-end mb-1">
            <span className="text-xs text-gray-300">{output.name}</span>
            <div
              className="port w-3 h-3 rounded-full bg-gray-500 hover:bg-green-400 cursor-pointer ml-2"
              onClick={() => onConnectStart(output.id)}
              title={`${output.name} (${output.type})`}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// Main Editor Component
export default function VFXGraphEditor() {
  const [graph, setGraph] = useState<VFXGraph>({
    id: 'default',
    name: 'New VFX Graph',
    nodes: [],
    connections: []
  });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<{ nodeId: string; outputId: string } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Add node
  const addNode = useCallback((templateKey: string) => {
    const template = NODE_TEMPLATES[templateKey];
    if (!template) return;

    const newNode: VFXNode = {
      ...template,
      id: `node_${Date.now()}`,
      position: { x: menuPosition.x - pan.x, y: menuPosition.y - pan.y },
      inputs: template.inputs.map(i => ({ ...i })),
      outputs: template.outputs.map(o => ({ ...o }))
    };

    setGraph(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }));
    setShowAddMenu(false);
  }, [menuPosition, pan]);

  // Delete selected node
  const deleteSelectedNode = useCallback(() => {
    if (!selectedNodeId) return;
    setGraph(prev => ({
      ...prev,
      nodes: prev.nodes.filter(n => n.id !== selectedNodeId),
      connections: prev.connections.filter(
        c => c.from.nodeId !== selectedNodeId && c.to.nodeId !== selectedNodeId
      )
    }));
    setSelectedNodeId(null);
  }, [selectedNodeId]);

  // Handle connection
  const handleConnectStart = useCallback((nodeId: string, outputId: string) => {
    setConnecting({ nodeId, outputId });
  }, []);

  const handleConnectEnd = useCallback((nodeId: string, inputId: string) => {
    if (!connecting || connecting.nodeId === nodeId) {
      setConnecting(null);
      return;
    }

    // Add connection
    const newConnection: Connection = {
      id: `conn_${Date.now()}`,
      from: { nodeId: connecting.nodeId, outputId: connecting.outputId },
      to: { nodeId, inputId }
    };

    setGraph(prev => ({
      ...prev,
      connections: [...prev.connections, newConnection]
    }));
    setConnecting(null);
  }, [connecting]);

  // Context menu
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setShowAddMenu(true);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelectedNode();
      }
      if (e.key === 'Escape') {
        setConnecting(null);
        setShowAddMenu(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelectedNode]);

  // Group nodes by type for menu
  const nodeGroups = useMemo(() => {
    const groups: Record<string, string[]> = {};
    Object.entries(NODE_TEMPLATES).forEach(([key, template]) => {
      if (!groups[template.type]) groups[template.type] = [];
      groups[template.type].push(key);
    });
    return groups;
  }, []);

  const selectedNode = graph.nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-4">
          <h2 className="text-white font-semibold">🎆 VFX Graph Editor</h2>
          <input
            type="text"
            value={graph.name}
            onChange={(e) => setGraph(prev => ({ ...prev, name: e.target.value }))}
            className="px-2 py-1 bg-slate-700 text-white rounded text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-3 py-1 rounded text-sm font-medium ${
              isPlaying ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
            } text-white`}
          >
            {isPlaying ? '⏹ Stop' : '▶ Play'}
          </button>
          <button
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
            onClick={() => setShowAddMenu(true)}
          >
            + Add Node
          </button>
          <div className="flex items-center gap-1 ml-4">
            <button
              className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs"
              onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
            >
              -
            </button>
            <span className="text-white text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button
              className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs"
              onClick={() => setZoom(z => Math.min(2, z + 0.25))}
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 relative overflow-hidden"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
            `,
            backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`
          }}
          onContextMenu={handleContextMenu}
          onClick={() => {
            setSelectedNodeId(null);
            setShowAddMenu(false);
          }}
        >
          {/* Connections SVG */}
          <svg className="absolute inset-0 pointer-events-none" style={{ overflow: 'visible' }}>
            {graph.connections.map((conn) => {
              const fromNode = graph.nodes.find(n => n.id === conn.from.nodeId);
              const toNode = graph.nodes.find(n => n.id === conn.to.nodeId);
              if (!fromNode || !toNode) return null;

              const startX = fromNode.position.x + 180;
              const startY = fromNode.position.y + 50;
              const endX = toNode.position.x;
              const endY = toNode.position.y + 50;
              const midX = (startX + endX) / 2;

              return (
                <path
                  key={conn.id}
                  d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                  stroke="#6366f1"
                  strokeWidth="2"
                  fill="none"
                />
              );
            })}
          </svg>

          {/* Nodes */}
          {graph.nodes.map((node) => (
            <VFXNodeComponent
              key={node.id}
              node={node}
              selected={node.id === selectedNodeId}
              onSelect={() => setSelectedNodeId(node.id)}
              onMove={(pos) => {
                setGraph(prev => ({
                  ...prev,
                  nodes: prev.nodes.map(n =>
                    n.id === node.id ? { ...n, position: pos } : n
                  )
                }));
              }}
              onConnectStart={(outputId) => handleConnectStart(node.id, outputId)}
              onConnectEnd={(inputId) => handleConnectEnd(node.id, inputId)}
            />
          ))}

          {/* Add Node Menu */}
          {showAddMenu && (
            <div
              className="absolute bg-slate-800 rounded-lg shadow-2xl border border-slate-600 z-50"
              style={{ left: menuPosition.x, top: menuPosition.y, minWidth: 200 }}
            >
              <div className="px-3 py-2 border-b border-slate-600">
                <span className="text-white text-sm font-medium">Add Node</span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {Object.entries(nodeGroups).map(([type, keys]) => (
                  <div key={type}>
                    <div
                      className="px-3 py-1 text-xs font-semibold uppercase"
                      style={{ color: NODE_COLORS[type] }}
                    >
                      {type}
                    </div>
                    {keys.map((key) => (
                      <button
                        key={key}
                        className="w-full px-3 py-1 text-left text-sm text-gray-300 hover:bg-slate-700"
                        onClick={() => addNode(key)}
                      >
                        {NODE_TEMPLATES[key].name}
                      </button>
                    ))}
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
              <h3 className="text-white font-semibold mb-4">{selectedNode.name}</h3>
              
              <div className="space-y-3">
                {Object.entries(selectedNode.properties).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-xs text-gray-400 mb-1 capitalize">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </label>
                    {typeof value === 'boolean' ? (
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => {
                          setGraph(prev => ({
                            ...prev,
                            nodes: prev.nodes.map(n =>
                              n.id === selectedNodeId
                                ? { ...n, properties: { ...n.properties, [key]: e.target.checked } }
                                : n
                            )
                          }));
                        }}
                        className="w-4 h-4"
                      />
                    ) : typeof value === 'number' ? (
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => {
                          setGraph(prev => ({
                            ...prev,
                            nodes: prev.nodes.map(n =>
                              n.id === selectedNodeId
                                ? { ...n, properties: { ...n.properties, [key]: parseFloat(e.target.value) || 0 } }
                                : n
                            )
                          }));
                        }}
                        className="w-full px-2 py-1 bg-slate-700 text-white rounded text-sm"
                      />
                    ) : typeof value === 'string' ? (
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => {
                          setGraph(prev => ({
                            ...prev,
                            nodes: prev.nodes.map(n =>
                              n.id === selectedNodeId
                                ? { ...n, properties: { ...n.properties, [key]: e.target.value } }
                                : n
                            )
                          }));
                        }}
                        className="w-full px-2 py-1 bg-slate-700 text-white rounded text-sm"
                      />
                    ) : typeof value === 'object' && value !== null ? (
                      <pre className="text-xs text-gray-400 bg-slate-700 p-2 rounded overflow-auto">
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                ))}
              </div>

              <button
                onClick={deleteSelectedNode}
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
        <span>Nodes: {graph.nodes.length} | Connections: {graph.connections.length}</span>
        <span>{isPlaying ? '🔴 Running' : '⚪ Stopped'}</span>
      </div>
    </div>
  );
}
