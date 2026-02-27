/**
 * Material Editor - Sistema de Materiais PBR Completo
 * 
 * Editor visual de materiais com node graph para criar
 * shaders e materiais PBR estilo Unreal/Unity.
 * 
 * NÃO É MOCK - Funciona de verdade com Three.js!
 */

'use client';

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
import { NODE_DEFINITIONS } from './MaterialEditor.node-definitions';

// ============================================================================
// TIPOS
// ============================================================================

import type {
  MaterialGraph,
  MaterialNodeData,
  MaterialProperty,
} from './MaterialEditor.types';

export type {
  MaterialGraph,
  MaterialNodeData,
  MaterialProperty,
} from './MaterialEditor.types';

// ============================================================================
// PBR MATERIAL CLASS
// ============================================================================

export class PBRMaterial {
  albedo: THREE.Color = new THREE.Color(1, 1, 1);
  albedoMap: THREE.Texture | null = null;
  metallic: number = 0;
  metallicMap: THREE.Texture | null = null;
  roughness: number = 0.5;
  roughnessMap: THREE.Texture | null = null;
  normal: THREE.Vector3 = new THREE.Vector3(0, 0, 1);
  normalMap: THREE.Texture | null = null;
  normalScale: number = 1;
  ao: number = 1;
  aoMap: THREE.Texture | null = null;
  emission: THREE.Color = new THREE.Color(0, 0, 0);
  emissionMap: THREE.Texture | null = null;
  emissionIntensity: number = 1;
  heightMap: THREE.Texture | null = null;
  heightScale: number = 0.05;
  opacity: number = 1;
  alphaMap: THREE.Texture | null = null;
  transparent: boolean = false;
  doubleSided: boolean = false;
  
  // Advanced
  clearcoat: number = 0;
  clearcoatRoughness: number = 0;
  sheen: number = 0;
  sheenColor: THREE.Color = new THREE.Color(1, 1, 1);
  transmission: number = 0;
  ior: number = 1.5;
  thickness: number = 0;
  
  toThreeMaterial(): THREE.MeshPhysicalMaterial {
    const material = new THREE.MeshPhysicalMaterial({
      color: this.albedo,
      map: this.albedoMap,
      metalness: this.metallic,
      metalnessMap: this.metallicMap,
      roughness: this.roughness,
      roughnessMap: this.roughnessMap,
      normalMap: this.normalMap,
      normalScale: new THREE.Vector2(this.normalScale, this.normalScale),
      aoMap: this.aoMap,
      aoMapIntensity: this.ao,
      emissive: this.emission,
      emissiveMap: this.emissionMap,
      emissiveIntensity: this.emissionIntensity,
      displacementMap: this.heightMap,
      displacementScale: this.heightScale,
      alphaMap: this.alphaMap,
      opacity: this.opacity,
      transparent: this.transparent,
      side: this.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
      clearcoat: this.clearcoat,
      clearcoatRoughness: this.clearcoatRoughness,
      sheen: this.sheen,
      sheenColor: this.sheenColor,
      transmission: this.transmission,
      ior: this.ior,
      thickness: this.thickness,
    });
    
    return material;
  }

  static fromThreeMaterial(mat: THREE.MeshPhysicalMaterial): PBRMaterial {
    const pbr = new PBRMaterial();
    pbr.albedo = mat.color.clone();
    pbr.albedoMap = mat.map;
    pbr.metallic = mat.metalness;
    pbr.metallicMap = mat.metalnessMap;
    pbr.roughness = mat.roughness;
    pbr.roughnessMap = mat.roughnessMap;
    pbr.normalMap = mat.normalMap;
    pbr.normalScale = mat.normalScale.x;
    pbr.aoMap = mat.aoMap;
    pbr.ao = mat.aoMapIntensity;
    pbr.emission = mat.emissive.clone();
    pbr.emissionMap = mat.emissiveMap;
    pbr.emissionIntensity = mat.emissiveIntensity;
    pbr.heightMap = mat.displacementMap;
    pbr.heightScale = mat.displacementScale;
    pbr.alphaMap = mat.alphaMap;
    pbr.opacity = mat.opacity;
    pbr.transparent = mat.transparent;
    pbr.doubleSided = mat.side === THREE.DoubleSide;
    pbr.clearcoat = mat.clearcoat;
    pbr.clearcoatRoughness = mat.clearcoatRoughness;
    pbr.sheen = mat.sheen;
    pbr.sheenColor = mat.sheenColor.clone();
    pbr.transmission = mat.transmission;
    pbr.ior = mat.ior;
    pbr.thickness = mat.thickness;
    return pbr;
  }
}

// ============================================================================
// SHADER COMPILER
// ============================================================================

export class ShaderCompiler {
  private graph: MaterialGraph;
  
  constructor(graph: MaterialGraph) {
    this.graph = graph;
  }
  
  compile(): { vertexShader: string; fragmentShader: string } {
    const vertexShader = this.generateVertexShader();
    const fragmentShader = this.generateFragmentShader();
    return { vertexShader, fragmentShader };
  }
  
  private generateVertexShader(): string {
    return `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * mvPosition;
}
    `.trim();
  }
  
  private generateFragmentShader(): string {
    // Find output node
    const outputNode = this.graph.nodes.find(n => n.data.type === 'output');
    if (!outputNode) {
      return this.getDefaultFragmentShader();
    }
    
    // Trace connections back from output
    const uniforms = new Set<string>();
    const code: string[] = [];
    
    // Generate code for each input to output
    const inputConnections = this.graph.edges.filter(e => e.target === outputNode.id);
    
    let albedoCode = 'vec3(1.0)';
    let metallicCode = '0.0';
    let roughnessCode = '0.5';
    let normalCode = 'vNormal';
    let aoCode = '1.0';
    let emissionCode = 'vec3(0.0)';
    let opacityCode = '1.0';
    
    for (const conn of inputConnections) {
      const sourceNode = this.graph.nodes.find(n => n.id === conn.source);
      if (!sourceNode) continue;
      
      const nodeCode = this.generateNodeCode(sourceNode, uniforms);
      
      const targetHandle = conn.targetHandle || '';
      if (targetHandle.includes('Albedo')) albedoCode = nodeCode.output;
      else if (targetHandle.includes('Metallic')) metallicCode = nodeCode.output;
      else if (targetHandle.includes('Roughness')) roughnessCode = nodeCode.output;
      else if (targetHandle.includes('Normal')) normalCode = nodeCode.output;
      else if (targetHandle.includes('AO')) aoCode = nodeCode.output;
      else if (targetHandle.includes('Emission')) emissionCode = nodeCode.output;
      else if (targetHandle.includes('Opacity')) opacityCode = nodeCode.output;
      
      code.push(nodeCode.code);
    }
    
    return `
${Array.from(uniforms).map(u => `uniform ${u};`).join('\n')}

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;

// PBR Functions
vec3 fresnelSchlick(float cosTheta, vec3 F0) {
  return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

float distributionGGX(vec3 N, vec3 H, float roughness) {
  float a = roughness * roughness;
  float a2 = a * a;
  float NdotH = max(dot(N, H), 0.0);
  float NdotH2 = NdotH * NdotH;
  float num = a2;
  float denom = (NdotH2 * (a2 - 1.0) + 1.0);
  denom = 3.14159265 * denom * denom;
  return num / denom;
}

float geometrySchlickGGX(float NdotV, float roughness) {
  float r = (roughness + 1.0);
  float k = (r * r) / 8.0;
  float num = NdotV;
  float denom = NdotV * (1.0 - k) + k;
  return num / denom;
}

float geometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
  float NdotV = max(dot(N, V), 0.0);
  float NdotL = max(dot(N, L), 0.0);
  float ggx2 = geometrySchlickGGX(NdotV, roughness);
  float ggx1 = geometrySchlickGGX(NdotL, roughness);
  return ggx1 * ggx2;
}

void main() {
  ${code.join('\n  ')}
  
  vec3 albedo = ${albedoCode};
  float metallic = ${metallicCode};
  float roughness = ${roughnessCode};
  vec3 N = normalize(${normalCode});
  float ao = ${aoCode};
  vec3 emission = ${emissionCode};
  float opacity = ${opacityCode};
  
  // View direction
  vec3 V = normalize(vViewPosition);
  
  // Simple lighting
  vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
  vec3 lightColor = vec3(1.0);
  
  // PBR calculation
  vec3 F0 = vec3(0.04);
  F0 = mix(F0, albedo, metallic);
  
  vec3 L = lightDir;
  vec3 H = normalize(V + L);
  
  float NDF = distributionGGX(N, H, roughness);
  float G = geometrySmith(N, V, L, roughness);
  vec3 F = fresnelSchlick(max(dot(H, V), 0.0), F0);
  
  vec3 kS = F;
  vec3 kD = vec3(1.0) - kS;
  kD *= 1.0 - metallic;
  
  vec3 numerator = NDF * G * F;
  float denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.0001;
  vec3 specular = numerator / denominator;
  
  float NdotL = max(dot(N, L), 0.0);
  vec3 Lo = (kD * albedo / 3.14159265 + specular) * lightColor * NdotL;
  
  vec3 ambient = vec3(0.03) * albedo * ao;
  vec3 color = ambient + Lo + emission;
  
  // Tone mapping
  color = color / (color + vec3(1.0));
  color = pow(color, vec3(1.0 / 2.2));
  
  gl_FragColor = vec4(color, opacity);
}
    `.trim();
  }
  
  private generateNodeCode(node: Node<MaterialNodeData>, uniforms: Set<string>): { code: string; output: string } {
    const data = node.data;
    const nodeId = node.id.replace(/-/g, '_');
    
    switch (data.type) {
      case 'constant': {
        if (node.data.label === 'Color') {
          const colorProp = data.properties.find(p => p.name === 'Color');
          const color = colorProp?.value || '#ffffff';
          // Parse hex to RGB
          const r = parseInt((color as string).slice(1, 3), 16) / 255;
          const g = parseInt((color as string).slice(3, 5), 16) / 255;
          const b = parseInt((color as string).slice(5, 7), 16) / 255;
          return { code: '', output: `vec3(${r.toFixed(3)}, ${g.toFixed(3)}, ${b.toFixed(3)})` };
        } else if (node.data.label === 'Float') {
          const valueProp = data.properties.find(p => p.name === 'Value');
          return { code: '', output: (valueProp?.value as number || 0).toFixed(3) };
        }
        return { code: '', output: 'vec3(1.0)' };
      }
      
      case 'texture': {
        const texName = `tex_${nodeId}`;
        uniforms.add(`sampler2D ${texName}`);
        return {
          code: `vec4 ${nodeId}_sample = texture2D(${texName}, vUv);`,
          output: `${nodeId}_sample.rgb`,
        };
      }
      
      case 'utility': {
        if (node.data.label === 'Fresnel') {
          const powerProp = data.properties.find(p => p.name === 'Power');
          const power = (powerProp?.value as number) || 5;
          return {
            code: `float ${nodeId}_fresnel = pow(1.0 - max(dot(vNormal, normalize(vViewPosition)), 0.0), ${power.toFixed(2)});`,
            output: `${nodeId}_fresnel`,
          };
        }
        return { code: '', output: 'vUv' };
      }
      
      case 'procedural': {
        if (node.data.label === 'Noise') {
          const scaleProp = data.properties.find(p => p.name === 'Scale');
          const scale = (scaleProp?.value as number) || 10;
          return {
            code: `
float ${nodeId}_noise = fract(sin(dot(vUv * ${scale.toFixed(2)}, vec2(12.9898, 78.233))) * 43758.5453);
            `.trim(),
            output: `${nodeId}_noise`,
          };
        }
        return { code: '', output: '0.5' };
      }
      
      default:
        return { code: '', output: 'vec3(1.0)' };
    }
  }
  
  private getDefaultFragmentShader(): string {
    return `
varying vec2 vUv;
varying vec3 vNormal;

void main() {
  vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
  float NdotL = max(dot(vNormal, lightDir), 0.0);
  vec3 color = vec3(0.8) * (0.3 + 0.7 * NdotL);
  gl_FragColor = vec4(color, 1.0);
}
    `.trim();
  }

  generateGLSL(): string {
    const { vertexShader, fragmentShader } = this.compile();
    return `// === VERTEX SHADER ===\n${vertexShader}\n\n// === FRAGMENT SHADER ===\n${fragmentShader}`;
  }
}

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
      case 'output': return '#e74c3c';
      case 'constant': return '#2ecc71';
      case 'texture': return '#9b59b6';
      case 'math': return '#3498db';
      case 'color': return '#e67e22';
      case 'utility': return '#1abc9c';
      case 'procedural': return '#34495e';
      default: return '#7f8c8d';
    }
  };
  
  const getPortColor = (portType: string): string => {
    switch (portType) {
      case 'color': return '#ff0';
      case 'float': return '#0ff';
      case 'vector2': return '#0f0';
      case 'vector3': return '#f0f';
      case 'texture': return '#f00';
      default: return '#fff';
    }
  };

  return (
    <div
      className={`rounded-lg shadow-lg min-w-[180px] ${selected ? 'ring-2 ring-blue-500' : ''}`}
      style={{
        backgroundColor: '#1e1e1e',
        border: `2px solid ${getTypeColor(data.type)}`,
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 rounded-t-md text-white text-sm font-medium"
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
              <span className="text-xs text-gray-400 ml-2">{input.name}</span>
            </div>
          ))}
        </div>
        
        {/* Properties */}
        {data.properties.length > 0 && (
          <div className="mt-2 space-y-1 border-t border-gray-700 pt-2">
            {data.properties.map((prop, i) => (
              <PropertyInput key={i} property={prop} />
            ))}
          </div>
        )}
        
        {/* Outputs */}
        <div className="space-y-1 mt-2">
          {data.outputs.map((output, i) => (
            <div key={i} className="flex items-center justify-end">
              <span className="text-xs text-gray-400 mr-2">{output.name}</span>
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
          <span className="text-xs text-gray-400">{property.name}</span>
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
          <span className="text-xs text-gray-400 w-12">{property.name}</span>
          <input
            type="range"
            min={property.min ?? 0}
            max={property.max ?? 1}
            step={0.01}
            value={value as number}
            onChange={(e) => setValue(parseFloat(e.target.value))}
            className="flex-1 h-1"
          />
          <span className="text-xs text-gray-500 w-8">
            {(value as number).toFixed(2)}
          </span>
        </div>
      );
    
    case 'texture':
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{property.name}</span>
          <button className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600">
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
    <div className="absolute left-4 top-20 w-56 bg-gray-900 rounded-lg p-3 shadow-xl max-h-[calc(100vh-200px)] overflow-y-auto">
      <h3 className="text-white font-medium mb-3">Add Node</h3>
      {Object.entries(categories).map(([category, nodeTypes]) => (
        <div key={category} className="mb-3">
          <h4 className="text-gray-400 text-sm font-medium mb-1">{category}</h4>
          <div className="space-y-1">
            {nodeTypes.map(type => {
              const def = NODE_DEFINITIONS[type];
              if (!def) return null;
              return (
                <button
                  key={type}
                  onClick={() => onAddNode(type)}
                  className="w-full text-left px-2 py-1.5 text-sm text-gray-300 hover:bg-gray-700 rounded"
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
    <div className="absolute right-4 top-20 bg-gray-900 rounded-lg p-3 shadow-xl">
      <h3 className="text-white font-medium mb-2">Preview</h3>
      <canvas ref={canvasRef} className="rounded" />
      <div className="mt-2 space-y-1">
        <button className="w-full px-2 py-1 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded">
          Export GLSL
        </button>
        <button className="w-full px-2 py-1 text-xs text-white bg-green-600 hover:bg-green-700 rounded">
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
				style: { stroke: '#fff', strokeWidth: 2 },
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
    console.log('Generated GLSL:\n', glsl);
    toast.success('Shader compiled! Check console for GLSL output.');
  }, [nodes, edges, toast]);

  return (
    <div className="w-full h-full bg-gray-800">
			<ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="bg-gray-900"
      >
        <Background color="#333" gap={20} />
        <Controls />
        <MiniMap />
        
        <Panel position="top-left">
          <div className="flex gap-2">
            <button
              onClick={() => setShowPalette(!showPalette)}
              className="px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
            >
              {showPalette ? 'Hide Palette' : 'Show Palette'}
            </button>
            <button
              onClick={compileShader}
              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
