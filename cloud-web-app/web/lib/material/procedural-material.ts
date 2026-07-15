// @aethel-heavy-async-boundary
/**
 * procedural-material.ts  — Sprint V31
 *
 * Shader node graph compiler for Aethel Studio.
 *
 * Architecture:
 *   MaterialGraph   — data model (serialisable, storable in world DB)
 *   MaterialNode    — individual nodes (texture, math, colour, mix, output…)
 *   compileMaterial — traverses the graph and emits a Three.js
 *                     ShaderMaterial with custom GLSL uniforms + vertex/fragment code
 *
 * The same graph JSON is sent to the Rust wgpu sidecar for native renders,
 * where it is compiled to WGSL instead.
 */

import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Node type registry
// ---------------------------------------------------------------------------

export type MaterialNodeKind =
  | 'output'          // PBR output: albedo, normal, roughness, metallic, emissive
  | 'texture'         // sample a 2D texture
  | 'colour'          // constant colour
  | 'scalar'          // constant float
  | 'math'            // add/subtract/multiply/divide/pow/clamp
  | 'mix'             // lerp between two inputs
  | 'fresnel'         // view-angle-dependent factor
  | 'noise'           // procedural noise (simplex / perlin / voronoi)
  | 'normal-map'      // tangent-space normal from a texture
  | 'uv-transform'    // scale + offset UV coordinates
  | 'time'            // elapsed time (for animated materials)
  | 'world-position'  // object world position (for triplanar mapping)
  | 'dot-product';    // vector dot product

export interface MaterialNodePort {
  id: string;
  label: string;
  type: 'float' | 'vec2' | 'vec3' | 'vec4' | 'sampler2D';
  /** Inline default value used when the port is not connected. */
  defaultValue?: number | [number, number] | [number, number, number] | [number, number, number, number];
}

export interface MaterialNode {
  id: string;
  kind: MaterialNodeKind;
  label: string;
  position: { x: number; y: number };
  inputs: MaterialNodePort[];
  outputs: MaterialNodePort[];
  /** Kind-specific parameters (texture URL, noise frequency, math op, etc.) */
  params: Record<string, unknown>;
}

export interface MaterialEdge {
  id: string;
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
}

export interface MaterialGraph {
  id: string;
  name: string;
  nodes: MaterialNode[];
  edges: MaterialEdge[];
  /** Style embedding hash — enables coherence comparison. */
  styleTag?: string;
}

// ---------------------------------------------------------------------------
// Compilation
// ---------------------------------------------------------------------------

interface CompileContext {
  uniforms: Record<string, THREE.IUniform>;
  vertexChunks: string[];
  fragmentChunks: string[];
  nodeOutputs: Map<string, Map<string, string>>; // nodeId → portId → glsl expression
}

function ensureOutputVar(ctx: CompileContext, nodeId: string, portId: string): string {
  const varName = `n_${nodeId.replace(/-/g, '_')}_${portId}`;
  const existing = ctx.nodeOutputs.get(nodeId)?.get(portId);
  return existing ?? varName;
}

function compileNode(
  node: MaterialNode,
  graph: MaterialGraph,
  ctx: CompileContext,
): void {
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
  const edgeMap = new Map<string, MaterialEdge[]>(); // toNodeId → edges
  for (const e of graph.edges) {
    if (!edgeMap.has(e.toNodeId)) edgeMap.set(e.toNodeId, []);
    edgeMap.get(e.toNodeId)!.push(e);
  }

  const resolve = (portId: string, fallback: string): string => {
    const incoming = (edgeMap.get(node.id) ?? []).find((e) => e.toPortId === portId);
    if (!incoming) return fallback;
    const srcNode = nodeMap.get(incoming.fromNodeId);
    if (!srcNode) return fallback;
    // Recursively compile the source node first
    compileNode(srcNode, graph, ctx);
    return ensureOutputVar(ctx, incoming.fromNodeId, incoming.fromPortId);
  };

  const out = (portId: string, glsl: string, type: string): string => {
    const varName = `n_${node.id.replace(/-/g, '_')}_${portId}`;
    ctx.fragmentChunks.push(`${type} ${varName} = ${glsl};`);
    if (!ctx.nodeOutputs.has(node.id)) ctx.nodeOutputs.set(node.id, new Map());
    ctx.nodeOutputs.get(node.id)!.set(portId, varName);
    return varName;
  };

  switch (node.kind) {
    case 'colour': {
      const c = (node.params.colour as [number, number, number, number]) ?? [1, 1, 1, 1];
      out('colour', `vec4(${c[0].toFixed(4)}, ${c[1].toFixed(4)}, ${c[2].toFixed(4)}, ${c[3].toFixed(4)})`, 'vec4');
      break;
    }
    case 'scalar': {
      const v = (node.params.value as number) ?? 1.0;
      out('value', `float(${v.toFixed(4)})`, 'float');
      break;
    }
    case 'texture': {
      const uName = `u_tex_${node.id.replace(/-/g, '_')}`;
      ctx.uniforms[uName] = { value: null }; // caller sets .value = THREE.Texture
      const uvExpr = resolve('uv', 'vUv');
      out('colour', `texture2D(${uName}, ${uvExpr})`, 'vec4');
      break;
    }
    case 'mix': {
      const a = resolve('a', 'vec4(0.0)');
      const b = resolve('b', 'vec4(1.0)');
      const t = resolve('factor', '0.5');
      out('result', `mix(${a}, ${b}, ${t})`, 'vec4');
      break;
    }
    case 'math': {
      const op = (node.params.op as string) ?? 'add';
      const a = resolve('a', '0.0');
      const b = resolve('b', '0.0');
      const glsl: Record<string, string> = {
        add: `(${a} + ${b})`,
        subtract: `(${a} - ${b})`,
        multiply: `(${a} * ${b})`,
        divide: `(${b} == 0.0 ? 0.0 : ${a} / ${b})`,
        pow: `pow(${a}, ${b})`,
        clamp: `clamp(${a}, 0.0, 1.0)`,
      };
      out('result', glsl[op] ?? '0.0', 'float');
      break;
    }
    case 'fresnel': {
      out('factor', 'pow(1.0 - max(dot(normalize(vNormal), normalize(-vViewDir)), 0.0), 3.0)', 'float');
      break;
    }
    case 'noise': {
      // Simplex-style approximation via fract/sin hash (no external dependency)
      const freq = (node.params.frequency as number) ?? 4.0;
      ctx.fragmentChunks.push(
        `float n_${node.id.replace(/-/g,'_')}_noise_hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}`,
      );
      out('value',
        `mix(n_${node.id.replace(/-/g,'_')}_noise_hash(floor(vUv*${freq.toFixed(1)})), n_${node.id.replace(/-/g,'_')}_noise_hash(floor(vUv*${freq.toFixed(1)})+vec2(1.0,1.0)), fract(vUv.x*${freq.toFixed(1)}))`,
        'float',
      );
      break;
    }
    case 'time': {
      ctx.uniforms['u_time'] = { value: 0 };
      out('value', 'u_time', 'float');
      break;
    }
    case 'uv-transform': {
      const sx = (node.params.scaleX as number) ?? 1;
      const sy = (node.params.scaleY as number) ?? 1;
      const ox = (node.params.offsetX as number) ?? 0;
      const oy = (node.params.offsetY as number) ?? 0;
      out('uv', `vUv * vec2(${sx.toFixed(4)}, ${sy.toFixed(4)}) + vec2(${ox.toFixed(4)}, ${oy.toFixed(4)})`, 'vec2');
      break;
    }
    case 'output':
      // Output node is the root — collected by compileMaterial after all other nodes
      break;
    default:
      break;
  }
}

/**
 * Compile a MaterialGraph into a Three.js ShaderMaterial.
 * The caller may mutate `material.uniforms` to set textures or animate `u_time`.
 */
export function compileMaterial(graph: MaterialGraph): THREE.ShaderMaterial {
  const outputNode = graph.nodes.find((n) => n.kind === 'output');
  if (!outputNode) {
    // Fallback: white unlit
    return new THREE.ShaderMaterial({
      vertexShader: 'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'void main(){gl_FragColor=vec4(1.0);}',
    });
  }

  const ctx: CompileContext = {
    uniforms: {},
    vertexChunks: [],
    fragmentChunks: [],
    nodeOutputs: new Map(),
  };

  // Compile all non-output nodes that feed into output
  for (const node of graph.nodes) {
    if (node.kind !== 'output') compileNode(node, graph, ctx);
  }

  // Resolve output ports
  const edgesIntoOutput = graph.edges.filter((e) => e.toNodeId === outputNode.id);
  const resolve = (portId: string, fallback: string): string => {
    const edge = edgesIntoOutput.find((e) => e.toPortId === portId);
    if (!edge) return fallback;
    return ensureOutputVar(ctx, edge.fromNodeId, edge.fromPortId);
  };

  const albedo   = resolve('albedo',    'vec4(0.8, 0.8, 0.8, 1.0)');
  const roughness = resolve('roughness', '0.5');
  const metallic  = resolve('metallic',  '0.0');
  const emissive  = resolve('emissive',  'vec3(0.0)');

  const vertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;
void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vViewDir = cameraPosition - worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

  const fragmentShader = `
uniform float u_time;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;

${ctx.fragmentChunks.join('\n')}

void main() {
  vec4 albedoVal = ${albedo};
  float roughVal = ${roughness};
  float metalVal = ${metallic};
  vec3 emissiveVal = ${emissive};

  // Simple directional diffuse approximation for editor preview
  vec3 lightDir = normalize(vec3(1.0, 2.0, 1.0));
  float diff = max(dot(normalize(vNormal), lightDir), 0.0);
  vec3 finalColour = albedoVal.rgb * (0.15 + 0.85 * diff) + emissiveVal;
  finalColour = mix(finalColour, finalColour * 0.5, metalVal);
  finalColour = mix(finalColour, finalColour * (1.0 - roughVal * 0.4), roughVal);

  gl_FragColor = vec4(finalColour, albedoVal.a);
}
`;

  return new THREE.ShaderMaterial({
    uniforms: { u_time: { value: 0 }, ...ctx.uniforms },
    vertexShader,
    fragmentShader,
    transparent: true,
  });
}

/**
 * Serialize a MaterialGraph as a WGSL-compatible JSON blob for the Rust sidecar.
 * The actual WGSL emission happens in the native kernel; this just ships the graph.
 */
export function serializeForNative(graph: MaterialGraph): string {
  return JSON.stringify(graph);
}

/** Create a minimal default PBR output graph to seed new materials. */
export function createDefaultGraph(name: string): MaterialGraph {
  return {
    id: crypto.randomUUID(),
    name,
    nodes: [
      {
        id: 'colour-0',
        kind: 'colour',
        label: 'Base Colour',
        position: { x: 100, y: 100 },
        inputs: [],
        outputs: [{ id: 'colour', label: 'Colour', type: 'vec4' }],
        params: { colour: [0.8, 0.8, 0.8, 1.0] },
      },
      {
        id: 'roughness-0',
        kind: 'scalar',
        label: 'Roughness',
        position: { x: 100, y: 240 },
        inputs: [],
        outputs: [{ id: 'value', label: 'Value', type: 'float' }],
        params: { value: 0.5 },
      },
      {
        id: 'output-0',
        kind: 'output',
        label: 'PBR Output',
        position: { x: 480, y: 160 },
        inputs: [
          { id: 'albedo', label: 'Albedo', type: 'vec4' },
          { id: 'roughness', label: 'Roughness', type: 'float' },
          { id: 'metallic', label: 'Metallic', type: 'float' },
          { id: 'emissive', label: 'Emissive', type: 'vec3' },
        ],
        outputs: [],
        params: {},
      },
    ],
    edges: [
      { id: 'e0', fromNodeId: 'colour-0', fromPortId: 'colour', toNodeId: 'output-0', toPortId: 'albedo' },
      { id: 'e1', fromNodeId: 'roughness-0', fromPortId: 'value', toNodeId: 'output-0', toPortId: 'roughness' },
    ],
  };
}
