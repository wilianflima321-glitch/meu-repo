// @aethel-heavy-async-boundary Studio/render-gated runtime; do not import from public route shells.

import * as THREE from 'three';
import type { AdvancedPBRParams, ShaderGraph, ShaderNode } from './aaa-material-system.contracts';
import { createMaterialPresetMap } from './aaa-material-system.presets';
import {
  buildAdvancedPBRFragmentShader,
  buildAdvancedPBRUniforms,
  buildAdvancedPBRVertexShader,
  createDefaultPBRParams,
} from './aaa-material-system.shaders';

export type { AdvancedPBRParams, MaterialType, NodeSocket, NodeType, ShaderConnection, ShaderGraph, ShaderNode } from './aaa-material-system.contracts';

export const DEFAULT_PBR_PARAMS: AdvancedPBRParams = createDefaultPBRParams(THREE);

export class AdvancedPBRMaterial extends THREE.ShaderMaterial {
  private params: AdvancedPBRParams;

  constructor(params: Partial<AdvancedPBRParams> = {}) {
    const mergedParams = { ...DEFAULT_PBR_PARAMS, ...params };

    super({
      uniforms: buildAdvancedPBRUniforms(mergedParams, THREE),
      vertexShader: buildAdvancedPBRVertexShader(),
      fragmentShader: buildAdvancedPBRFragmentShader(),
      lights: true,
      fog: true,
    });

    this.params = mergedParams;
  }

  setParameter<K extends keyof AdvancedPBRParams>(key: K, value: AdvancedPBRParams[K]): void {
    this.params[key] = value;

    if (this.uniforms[key]) {
      this.uniforms[key].value = value;
    }
  }

  getParameter<K extends keyof AdvancedPBRParams>(key: K): AdvancedPBRParams[K] {
    return this.params[key];
  }
}

export class MaterialLibrary {
  private static presets: Map<string, Partial<AdvancedPBRParams>> = createMaterialPresetMap(THREE);

  static initialize(): void {
    this.presets = createMaterialPresetMap(THREE);
  }

  static getPreset(name: string): Partial<AdvancedPBRParams> | undefined {
    return this.presets.get(name);
  }

  static createMaterial(preset: string): AdvancedPBRMaterial {
    const params = this.presets.get(preset);
    if (!params) {
      throw new Error(`Unknown material preset: ${preset}`);
    }
    return new AdvancedPBRMaterial(params);
  }

  static listPresets(): string[] {
    return Array.from(this.presets.keys());
  }
}

MaterialLibrary.initialize();

export class ShaderGraphCompiler {
  compile(graph: ShaderGraph): { vertexShader: string; fragmentShader: string; uniforms: Record<string, THREE.IUniform> } {
    const uniforms: Record<string, THREE.IUniform> = {};
    const outputNode = graph.nodes.find(n => n.type === 'output');

    if (!outputNode) {
      throw new Error('Shader graph must have an output node');
    }

    const fragmentCode = this.generateFragmentCode(graph, outputNode, uniforms);
    const vertexShader = `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;

      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;

      ${this.generateUniforms(uniforms)}
      ${fragmentCode}

      void main() {
        gl_FragColor = calculateOutput();
      }
    `;

    return { vertexShader, fragmentShader, uniforms };
  }

  private generateFragmentCode(
    graph: ShaderGraph,
    node: ShaderNode,
    uniforms: Record<string, THREE.IUniform>,
  ): string {
    void graph;
    void node;
    void uniforms;

    return `
      vec4 calculateOutput() {
        return vec4(1.0, 0.0, 1.0, 1.0);
      }
    `;
  }

  private generateUniforms(uniforms: Record<string, THREE.IUniform>): string {
    let code = '';
    for (const [name, uniform] of Object.entries(uniforms)) {
      code += `uniform ${this.getGLSLType(uniform.value)} ${name};\n`;
    }
    return code;
  }

  private getGLSLType(value: unknown): string {
    if (typeof value === 'number') return 'float';
    if (value instanceof THREE.Vector2) return 'vec2';
    if (value instanceof THREE.Vector3) return 'vec3';
    if (value instanceof THREE.Vector4 || value instanceof THREE.Color) return 'vec4';
    if (value instanceof THREE.Texture) return 'sampler2D';
    return 'float';
  }
}

export const shaderGraphCompiler = new ShaderGraphCompiler();

const aaaMaterialSystem = {
  AdvancedPBRMaterial,
  MaterialLibrary,
  ShaderGraphCompiler,
  shaderGraphCompiler,
  DEFAULT_PBR_PARAMS,
};

export default aaaMaterialSystem;
