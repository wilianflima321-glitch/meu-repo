'use client';

// @aethel-heavy-async-boundary: loaded only through the /studio/level?tool=material route dynamic import.

/**
 * Material Editor - Complete PBR Material System
 *
 * Visual material editor with node graph for creating
 * shaders and PBR materials, Unreal/Unity style.
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
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import * as THREE from 'three';
import { useToast } from '@/components/ui/Toast';
import { createComponentLogger } from '@/lib/observability/logger'
import { NODE_DEFINITIONS } from '@/components/materials/material-editor-models'
import type { MaterialGraph, MaterialNodeData } from '@/components/materials/material-editor-models'
import { PBRMaterial } from './material-editor-pbr';
import { ShaderCompiler } from './material-editor-shader-compiler';
import { MaterialNode } from './MaterialEditor.node';

export type { MaterialGraph, MaterialNodeData, MaterialNodeDefinition, MaterialPort, MaterialProperty } from '@/components/materials/material-editor-models'
export { PBRMaterial } from './material-editor-pbr';
export { ShaderCompiler } from './material-editor-shader-compiler';

const log = createComponentLogger('MaterialEditor')

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
  // "Latest ref" indirection so the initial node literal below can already
  // close over a stable `updateNodeProperty` before `setNodes` exists yet
  // (useNodesState's initial argument is evaluated eagerly, before its own
  // setter is available) — see updateNodeProperty for the real commit logic.
  const setNodesRef = useRef<React.Dispatch<React.SetStateAction<Node<MaterialNodeData>[]>>>(() => {});

  const updateNodeProperty = useCallback((nodeId: string, propertyName: string, value: unknown) => {
    setNodesRef.current((currentNodes) =>
      currentNodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                properties: node.data.properties.map((prop) =>
                  prop.name === propertyName ? { ...prop, value } : prop
                ),
              },
            }
          : node
      )
    );
  }, []);

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
        onPropertyChange: (name, value) => updateNodeProperty('output-1', name, value),
      },
    },
  ]);
  setNodesRef.current = setNodes;

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
			setEdges((eds: Edge[]) => addEdge(edge, eds));
		},
    [setEdges]
  );

  const addNode = useCallback((type: string) => {
    const def = NODE_DEFINITIONS[type];
    if (!def) return;

    const id = `${type}-${Date.now()}`;
    const newNode: Node<MaterialNodeData> = {
      id,
      type: 'materialNode',
      position: { x: 200, y: 200 + Math.random() * 100 },
      data: {
        label: def.label,
        type: def.type,
        properties: [...def.defaultProperties],
        inputs: [...def.inputs],
        outputs: [...def.outputs],
        onPropertyChange: (name, value) => updateNodeProperty(id, name, value),
      },
    };

    setNodes((nodes: Node<MaterialNodeData>[]) => [...nodes, newNode]);
  }, [setNodes, updateNodeProperty]);

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
            <button type="button" aria-label={showPalette ? 'Hide material palette' : 'Show material palette'}
              onClick={() => setShowPalette(!showPalette)}
              className="px-3 py-2 bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-primary)] rounded hover:bg-[var(--aethel-surface-secondary)]"
            >
              {showPalette ? 'Hide Palette' : 'Show Palette'}
            </button>
            <button type="button" aria-label="Compile material shader"
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
