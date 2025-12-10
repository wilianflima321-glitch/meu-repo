import React, { useState, useEffect, useRef } from 'react';
import { UnrealBlueprintService, BlueprintNode, BlueprintConnection, Blueprint } from '../../services/UnrealBlueprintService';
import { EventBus } from '../../services/EventBus';

export const BlueprintEditor: React.FC = () => {
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [nodes, setNodes] = useState<BlueprintNode[]>([]);
  const [connections, setConnections] = useState<BlueprintConnection[]>([]);
  const [selectedNode, setSelectedNode] = useState<BlueprintNode | null>(null);
  const [draggedNode, setDraggedNode] = useState<BlueprintNode | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<{ nodeId: string; pinIndex: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const blueprintService = UnrealBlueprintService.getInstance();

  useEffect(() => {
    const unsubscribe = EventBus.getInstance().subscribe('unreal:blueprintOpen', (data: { blueprint: Blueprint }) => {
      loadBlueprint(data.blueprint);
    });

    return () => unsubscribe();
  }, []);

  const loadBlueprint = async (bp: Blueprint) => {
    setBlueprint(bp);
    const bpNodes = await blueprintService.getNodes(bp.id);
    const bpConnections = await blueprintService.getConnections(bp.id);
    setNodes(bpNodes);
    setConnections(bpConnections);
  };

  const handleNodeDragStart = (e: React.MouseEvent, node: BlueprintNode) => {
    e.stopPropagation();
    setDraggedNode(node);
  };

  const handleNodeDrag = (e: React.MouseEvent) => {
    if (!draggedNode) return;

    const updatedNode = {
      ...draggedNode,
      position: {
        x: draggedNode.position.x + e.movementX / zoom,
        y: draggedNode.position.y + e.movementY / zoom
      }
    };

    setNodes(nodes.map(n => n.id === updatedNode.id ? updatedNode : n));
    setDraggedNode(updatedNode);
  };

  const handleNodeDragEnd = () => {
    if (draggedNode && blueprint) {
      blueprintService.updateNode(blueprint.id, draggedNode.id, draggedNode);
    }
    setDraggedNode(null);
  };

  const handlePinClick = (nodeId: string, pinIndex: number, isOutput: boolean) => {
    if (!connectingFrom) {
      if (isOutput) {
        setConnectingFrom({ nodeId, pinIndex });
      }
    } else {
      if (!isOutput && blueprint) {
        const connection: BlueprintConnection = {
          id: `conn_${Date.now()}`,
          fromNodeId: connectingFrom.nodeId,
          fromPinIndex: connectingFrom.pinIndex,
          toNodeId: nodeId,
          toPinIndex: pinIndex
        };
        
        blueprintService.addConnection(blueprint.id, connection);
        setConnections([...connections, connection]);
      }
      setConnectingFrom(null);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setSelectedNode(null);
      setConnectingFrom(null);
    }
  };

  const handleAddNode = async (type: string) => {
    if (!blueprint) return;

    const newNode: BlueprintNode = {
      id: `node_${Date.now()}`,
      type,
      name: type,
      position: { x: 100, y: 100 },
      inputs: getDefaultInputs(type),
      outputs: getDefaultOutputs(type),
      properties: {}
    };

    await blueprintService.addNode(blueprint.id, newNode);
    setNodes([...nodes, newNode]);
  };

  const handleDeleteNode = async () => {
    if (!selectedNode || !blueprint) return;

    await blueprintService.deleteNode(blueprint.id, selectedNode.id);
    setNodes(nodes.filter(n => n.id !== selectedNode.id));
    setConnections(connections.filter(c => 
      c.fromNodeId !== selectedNode.id && c.toNodeId !== selectedNode.id
    ));
    setSelectedNode(null);
  };

  const handleCompile = async () => {
    if (!blueprint) return;

    try {
      const result = await blueprintService.compile(blueprint.id);
      if (result.success) {
        EventBus.getInstance().emit('notification:show', {
          message: 'Blueprint compiled successfully',
          type: 'success'
        });
      } else {
        EventBus.getInstance().emit('notification:show', {
          message: `Compilation failed: ${result.errors.join(', ')}`,
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Compilation error:', error);
    }
  };

  const handleZoomIn = () => setZoom(Math.min(zoom * 1.2, 3));
  const handleZoomOut = () => setZoom(Math.max(zoom * 0.8, 0.3));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const getDefaultInputs = (type: string): string[] => {
    const inputMap: Record<string, string[]> = {
      'Event': [],
      'Function': ['Execute'],
      'Branch': ['Condition'],
      'Print': ['String'],
      'Add': ['A', 'B'],
      'Multiply': ['A', 'B'],
      'GetVariable': [],
      'SetVariable': ['Value']
    };
    return inputMap[type] || ['Input'];
  };

  const getDefaultOutputs = (type: string): string[] => {
    const outputMap: Record<string, string[]> = {
      'Event': ['Execute'],
      'Function': ['Return'],
      'Branch': ['True', 'False'],
      'Print': ['Execute'],
      'Add': ['Result'],
      'Multiply': ['Result'],
      'GetVariable': ['Value'],
      'SetVariable': ['Execute']
    };
    return outputMap[type] || ['Output'];
  };

  const getNodeColor = (type: string): string => {
    const colorMap: Record<string, string> = {
      'Event': '#ff4444',
      'Function': '#4444ff',
      'Branch': '#44ff44',
      'Print': '#ffaa44',
      'Add': '#aa44ff',
      'Multiply': '#aa44ff',
      'GetVariable': '#44aaff',
      'SetVariable': '#44aaff'
    };
    return colorMap[type] || '#888888';
  };

  return (
    <div className="blueprint-editor">
      <div className="editor-toolbar">
        <div className="toolbar-section">
          <span className="blueprint-name">{blueprint?.name || 'No Blueprint'}</span>
        </div>
        
        <div className="toolbar-section">
          <button onClick={() => handleAddNode('Event')}>Event</button>
          <button onClick={() => handleAddNode('Function')}>Function</button>
          <button onClick={() => handleAddNode('Branch')}>Branch</button>
          <button onClick={() => handleAddNode('Print')}>Print</button>
          <button onClick={() => handleAddNode('Add')}>Add</button>
          <button onClick={() => handleAddNode('GetVariable')}>Get Var</button>
          <button onClick={() => handleAddNode('SetVariable')}>Set Var</button>
        </div>

        <div className="toolbar-section">
          <button onClick={handleZoomIn}>Zoom +</button>
          <button onClick={handleZoomOut}>Zoom -</button>
          <button onClick={handleResetView}>Reset</button>
          <span className="zoom-level">{Math.round(zoom * 100)}%</span>
        </div>

        <div className="toolbar-section">
          <button onClick={handleCompile} className="compile-button">Compile</button>
          <button onClick={handleDeleteNode} disabled={!selectedNode}>Delete</button>
        </div>
      </div>

      <div 
        className="blueprint-canvas"
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseMove={draggedNode ? handleNodeDrag : undefined}
        onMouseUp={handleNodeDragEnd}
      >
        <div 
          className="canvas-content"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
          }}
        >
          <svg className="connections-layer">
            {connections.map(conn => {
              const fromNode = nodes.find(n => n.id === conn.fromNodeId);
              const toNode = nodes.find(n => n.id === conn.toNodeId);
              
              if (!fromNode || !toNode) return null;

              const fromX = fromNode.position.x + 200;
              const fromY = fromNode.position.y + 40 + (conn.fromPinIndex * 25);
              const toX = toNode.position.x;
              const toY = toNode.position.y + 40 + (conn.toPinIndex * 25);

              const midX = (fromX + toX) / 2;

              return (
                <path
                  key={conn.id}
                  d={`M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`}
                  stroke="#ffffff"
                  strokeWidth="2"
                  fill="none"
                />
              );
            })}
          </svg>

          {nodes.map(node => (
            <div
              key={node.id}
              className={`blueprint-node ${selectedNode?.id === node.id ? 'selected' : ''}`}
              style={{
                left: node.position.x,
                top: node.position.y,
                borderColor: getNodeColor(node.type)
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                setSelectedNode(node);
                handleNodeDragStart(e, node);
              }}
            >
              <div className="node-header" style={{ background: getNodeColor(node.type) }}>
                {node.name}
              </div>
              
              <div className="node-body">
                <div className="node-pins">
                  {node.inputs.map((input, index) => (
                    <div key={`in-${index}`} className="pin-row">
                      <div 
                        className="pin input"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePinClick(node.id, index, false);
                        }}
                      />
                      <span className="pin-label">{input}</span>
                    </div>
                  ))}
                </div>

                <div className="node-pins outputs">
                  {node.outputs.map((output, index) => (
                    <div key={`out-${index}`} className="pin-row">
                      <span className="pin-label">{output}</span>
                      <div 
                        className="pin output"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePinClick(node.id, index, true);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedNode && (
        <div className="node-properties">
          <h3>Node Properties</h3>
          <div className="property-row">
            <span className="label">Type:</span>
            <span className="value">{selectedNode.type}</span>
          </div>
          <div className="property-row">
            <span className="label">Name:</span>
            <input 
              type="text" 
              value={selectedNode.name}
              onChange={(e) => {
                const updated = { ...selectedNode, name: e.target.value };
                setNodes(nodes.map(n => n.id === updated.id ? updated : n));
                setSelectedNode(updated);
              }}
            />
          </div>
          <div className="property-row">
            <span className="label">Position:</span>
            <span className="value">
              X: {Math.round(selectedNode.position.x)}, Y: {Math.round(selectedNode.position.y)}
            </span>
          </div>
        </div>
      )}

      <style jsx>{`
        .blueprint-editor {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #1a1a1a;
          color: #ffffff;
        }

        .editor-toolbar {
          display: flex;
          gap: 16px;
          padding: 8px 12px;
          background: #2a2a2a;
          border-bottom: 1px solid #3a3a3a;
        }

        .toolbar-section {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .blueprint-name {
          font-size: 14px;
          font-weight: 600;
        }

        .editor-toolbar button {
          padding: 6px 12px;
          background: #3a3a3a;
          color: #ffffff;
          border: none;
          cursor: pointer;
          font-size: 12px;
          border-radius: 2px;
        }

        .editor-toolbar button:hover:not(:disabled) {
          background: #4a4a4a;
        }

        .editor-toolbar button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .compile-button {
          background: #0e639c !important;
        }

        .compile-button:hover {
          background: #1177bb !important;
        }

        .zoom-level {
          font-size: 12px;
          color: #aaaaaa;
        }

        .blueprint-canvas {
          flex: 1;
          position: relative;
          overflow: hidden;
          background: 
            linear-gradient(#2a2a2a 1px, transparent 1px),
            linear-gradient(90deg, #2a2a2a 1px, transparent 1px);
          background-size: 20px 20px;
          background-position: -1px -1px;
        }

        .canvas-content {
          position: absolute;
          width: 100%;
          height: 100%;
          transform-origin: 0 0;
        }

        .connections-layer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .blueprint-node {
          position: absolute;
          min-width: 200px;
          background: #2a2a2a;
          border: 2px solid #4a4a4a;
          border-radius: 4px;
          cursor: move;
          user-select: none;
        }

        .blueprint-node.selected {
          border-color: #0e639c;
          box-shadow: 0 0 10px rgba(14, 99, 156, 0.5);
        }

        .node-header {
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 600;
          text-align: center;
          border-radius: 2px 2px 0 0;
        }

        .node-body {
          padding: 12px;
          display: flex;
          justify-content: space-between;
          gap: 20px;
        }

        .node-pins {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .node-pins.outputs {
          align-items: flex-end;
        }

        .pin-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pin {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #4a4a4a;
          cursor: pointer;
          transition: all 0.1s;
        }

        .pin:hover {
          transform: scale(1.3);
          box-shadow: 0 0 8px rgba(255, 255, 255, 0.8);
        }

        .pin.input {
          margin-left: -18px;
        }

        .pin.output {
          margin-right: -18px;
        }

        .pin-label {
          font-size: 11px;
          color: #cccccc;
        }

        .node-properties {
          width: 300px;
          background: #2a2a2a;
          border-left: 1px solid #3a3a3a;
          padding: 16px;
          overflow-y: auto;
        }

        .node-properties h3 {
          margin: 0 0 16px 0;
          font-size: 14px;
          font-weight: 600;
        }

        .property-row {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 12px;
        }

        .property-row .label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          color: #aaaaaa;
        }

        .property-row .value {
          font-size: 12px;
          color: #ffffff;
        }

        .property-row input {
          padding: 6px 8px;
          background: #1a1a1a;
          color: #ffffff;
          border: 1px solid #3a3a3a;
          outline: none;
          font-size: 12px;
        }

        .property-row input:focus {
          border-color: #0e639c;
        }
      `}</style>
    </div>
  );
};
