'use client';

// @aethel-heavy-async-boundary: loaded only through the /studio/level?tool=material route dynamic import.

/**
 * Material Editor - Sistema de Materiais PBR Completo
 *
 * Editor visual de materiais com node graph para criar
 * shaders e materiais PBR estilo Unreal/Unity.
 *
 * Real Three.js-backed material graph, not a mock.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Handle,
  Position,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import * as THREE from 'three';
import { useToast } from '@/components/ui/Toast';
import { createComponentLogger } from '@/lib/observability/logger'
import { NODE_DEFINITIONS } from '@/components/materials/material-editor-models'
import type { MaterialGraph, MaterialNodeData, MaterialProperty } from '@/components/materials/material-editor-models'
import { PBRMaterial } from './material-editor-pbr';
import { ShaderCompiler } from './material-editor-shader-compiler';

export type { MaterialGraph, MaterialNodeData, MaterialNodeDefinition, MaterialPort, MaterialProperty } from '@/components/materials/material-editor-models'
export { PBRMaterial } from './material-editor-pbr';
export { ShaderCompiler } from './material-editor-shader-compiler';

const log = createComponentLogger('MaterialEditor')


// ============================================================================
// NODE COMPONENTS
// ============================================================================

interface NodeProps {
  id: string;
  data: MaterialNodeData;
  selected: boolean;
}

function MaterialNode({ id, data, selected }: NodeProps) {
  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'output': return 'var(--aethel-error)';
      case 'constant': return 'var(--aethel-success)';
      case 'texture': return 'var(--aethel-accent)';
      case 'math': return 'var(--aethel-info)';
      case 'color': return 'var(--aethel-warning)';
      case 'utility': return 'var(--aethel-success-light)';
      case 'procedural': return 'var(--aethel-surface-quaternary)';
      default: return 'var(--aethel-text-muted)';
    }
  };

  const getPortColor = (portType: string): string => {
    switch (portType) {
      case 'color': return 'yellow';
      case 'float': return 'cyan';
      case 'vector2': return 'lime';
      case 'vector3': return 'magenta';
      case 'texture': return 'red';
      default: return 'white';
    }
  };

  return (
    <div
      className={`rounded-lg shadow-lg min-w-[180px] ${selected ? 'ring-2 ring-blue-500' : ''}`}
      style={{
        backgroundColor: 'var(--aethel-surface-primary)',
        border: `2px solid ${getTypeColor(data.type)}`,
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 rounded-t-md text-[var(--aethel-text-primary)] text-sm font-medium"
        style={{ backgroundColor: getTypeColor(data.type) }}
      >
        {data.label}
      </div>

      {/* Body */}
      <div className="p-2">
        {/* Inputs */}
        <div className="space-y-1">
          {data.inputs.map((input, i) => (
            <div key={i} className="flex items-center">
              <Handle
                type="target"
                position={Position.Left}
                id={`input-${input.name}`}
                style={{
                  background: getPortColor(input.type),
                  width: 10,
                  height: 10,
                }}
              />
              <span className="text-xs text-[var(--aethel-text-secondary)] ml-2">{input.name}</span>
            </div>
          ))}
        </div>

        {/* Properties */}
        {data.properties.length > 0 && (
          <div className="mt-2 space-y-1 border-t border-[var(--aethel-border-primary)] pt-2">
            {data.properties.map((prop, i) => (
              <PropertyInput key={i} property={prop} />
            ))}
          </div>
        )}

        {/* Outputs */}
        <div className="space-y-1 mt-2">
          {data.outputs.map((output, i) => (
            <div key={i} className="flex items-center justify-end">
              <span className="text-xs text-[var(--aethel-text-secondary)] mr-2">{output.name}</span>
              <Handle
                type="source"
                position={Position.Right}
                id={`output-${output.name}`}
                style={{
                  background: getPortColor(output.type),
                  width: 10,
                  height: 10,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PropertyInput({ property }: { property: MaterialProperty }) {
  const [value, setValue] = useState(property.value);

  switch (property.type) {
    case 'color':
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--aethel-text-secondary)]">{property.name}</span>
          <input
            type="color"
            value={value as string}
            onChange={(e) => setValue(e.target.value)}
            className="w-6 h-6 rounded cursor-pointer"
          />
        </div>
      );

    case 'float':
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--aethel-text-secondary)] w-12">{property.name}</span>
          <input
            type="range"
            min={property.min ?? 0}
            max={property.max ?? 1}
            step={0.01}
            value={value as number}
            onChange={(e) => setValue(parseFloat(e.target.value))}
            className="flex-1 h-1"
          />
          <span className="text-xs text-[var(--aethel-text-secondary)] w-8">
            {(value as number).toFixed(2)}
          </span>
        </div>
      );

    case 'texture':
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--aethel-text-secondary)]">{property.name}</span>
          <button type="button" aria-label={`Select resource for ${property.name}`} className="px-2 py-1 text-xs bg-[var(--aethel-surface-secondary)] rounded hover:bg-[var(--aethel-surface-secondary)]">
            Select...
          </button>
        </div>
      );

    default:
      return null;
  }
}

// ============================================================================
// NODE PALETTE
// ============================================================================

function NodePalette({ onAddNode }: { onAddNode: (type: string) => void }) {
  const categories = {
    Constants: ['constant_color', 'constant_float', 'constant_vector'],
    Textures: ['texture_sample', 'texture_coords', 'normal_map'],
    Math: ['math_add', 'math_multiply', 'math_lerp', 'math_clamp', 'math_power', 'math_one_minus'],
    Color: ['color_blend', 'color_hsv', 'color_rgb_split'],
    Procedural: ['noise', 'voronoi', 'gradient'],
    Utility: ['fresnel'],
  };

  return (
    <div className="absolute left-4 top-20 w-56 bg-[var(--aethel-surface-secondary)] rounded-lg p-3 shadow-xl max-h-[calc(100vh-200px)] overflow-y-auto">
      <h3 className="text-[var(--aethel-text-primary)] font-medium mb-3">Add Node</h3>
      {Object.entries(categories).map(([category, nodeTypes]) => (
        <div key={category} className="mb-3">
          <h4 className="text-[var(--aethel-text-secondary)] text-sm font-medium mb-1">{category}</h4>
          <div className="space-y-1">
            {nodeTypes.map(type => {
              const def = NODE_DEFINITIONS[type];
              if (!def) return null;
              return (
                <button type="button" aria-label={`Add node ${def.label}`}
                  key={type}
                  onClick={() => onAddNode(type)}
                  className="w-full text-left px-2 py-1.5 text-sm text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-secondary)] rounded"
                >
                  {def.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// PREVIEW PANEL
// ============================================================================

function MaterialPreview({ material }: { material: PBRMaterial }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Setup scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 3);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
    });
    renderer.setSize(256, 256);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Mesh
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial());
    scene.add(mesh);
    meshRef.current = mesh;

    // Animation
    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      mesh.rotation.y += 0.005;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      renderer.dispose();
    };
  }, []);

  // Update material when it changes
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.material = material.toThreeMaterial();
    }
  }, [material]);

  return (
    <div className="absolute right-4 top-20 bg-[var(--aethel-surface-secondary)] rounded-lg p-3 shadow-xl">
      <h3 className="text-[var(--aethel-text-primary)] font-medium mb-2">Preview</h3>
      <canvas ref={canvasRef} className="rounded" />
      <div className="mt-2 space-y-1">
        <button type="button" className="w-full px-2 py-1 text-xs text-[var(--aethel-text-primary)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] rounded">
          Export GLSL
        </button>
        <button type="button" className="w-full px-2 py-1 text-xs text-[var(--aethel-text-primary)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] rounded">
          Save Material
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const nodeTypes = {
  materialNode: MaterialNode,
};

export function MaterialEditor() {
  const toast = useToast();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<MaterialNodeData>>([
    // Default output node
    {
      id: 'output-1',
      type: 'materialNode',
      position: { x: 500, y: 200 },
      data: {
        label: 'Material Output',
        type: 'output',
        properties: [],
        inputs: NODE_DEFINITIONS['material_output'].inputs,
        outputs: [],
      },
    },
  ]);

	const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [material] = useState(() => new PBRMaterial());
  const [showPalette, setShowPalette] = useState(true);

  const onConnect = useCallback(
    (params: Connection) => {
			if (!params.source || !params.target) return;
			const edge: Edge = {
				...params,
				id: `edge-${params.source}-${params.sourceHandle ?? ''}-${params.target}-${params.targetHandle ?? ''}-${Date.now()}`,
				animated: true,
				style: { stroke: 'white', strokeWidth: 2 },
			};
			setEdges((eds) => addEdge(edge, eds));
		},
    [setEdges]
  );

  const addNode = useCallback((type: string) => {
    const def = NODE_DEFINITIONS[type];
    if (!def) return;

    const newNode: Node<MaterialNodeData> = {
      id: `${type}-${Date.now()}`,
      type: 'materialNode',
      position: { x: 200, y: 200 + Math.random() * 100 },
      data: {
        label: def.label,
        type: def.type,
        properties: [...def.defaultProperties],
        inputs: [...def.inputs],
        outputs: [...def.outputs],
      },
    };

    setNodes(nodes => [...nodes, newNode]);
  }, [setNodes]);

  const compileShader = useCallback(() => {
    const graph: MaterialGraph = {
      nodes,
      edges,
      name: 'Material',
      description: '',
    };
    const compiler = new ShaderCompiler(graph);
    const glsl = compiler.generateGLSL();
    log.info('Generated GLSL:\n', glsl);
    toast.success('Shader compiled! Check console for GLSL output.');
  }, [nodes, edges, toast]);

  return (
    <div className="w-full h-full bg-[var(--aethel-surface-secondary)]">
			<ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="bg-[var(--aethel-surface-secondary)]"
      >
        <Background color="var(--aethel-border-secondary)" gap={20} />
        <Controls />
        <MiniMap />

        <Panel position="top-left">
          <div className="flex gap-2">
            <button type="button" aria-label={showPalette ? 'Ocultar paleta de material' : 'Mostrar paleta de material'}
              onClick={() => setShowPalette(!showPalette)}
              className="px-3 py-2 bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-primary)] rounded hover:bg-[var(--aethel-surface-secondary)]"
            >
              {showPalette ? 'Hide Palette' : 'Show Palette'}
            </button>
            <button type="button" aria-label="Compilar shader do material"
              onClick={compileShader}
              className="px-3 py-2 bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-text-primary)] rounded hover:bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)]"
            >
              Compile Shader
            </button>
          </div>
        </Panel>
      </ReactFlow>

      {showPalette && <NodePalette onAddNode={addNode} />}
      <MaterialPreview material={material} />
    </div>
  );
}

export default MaterialEditor;
