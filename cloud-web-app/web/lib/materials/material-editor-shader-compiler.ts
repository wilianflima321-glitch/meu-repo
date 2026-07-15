// @aethel-heavy-async-boundary GLSL compiler for Studio material graphs.
import type { Node } from '@xyflow/react';
import type { MaterialGraph, MaterialNodeData } from '@/components/materials/material-editor-models';

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
          const color = colorProp?.value || 'white';
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
