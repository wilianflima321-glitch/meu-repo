// @aethel-heavy-async-boundary Studio/terrain material runtime; do not import from public route shells.
/**
 * Terrain Engine - split runtime modules.
 *
 * Procedural terrain generation, chunk meshes, materials, and sculpting stay
 * behind Studio/runtime boundaries instead of public route imports.
 */

import * as THREE from 'three';
import type { TerrainLayer } from './types';

export class TerrainMaterial extends THREE.ShaderMaterial {
  constructor(layers: TerrainLayer[]) {
    const uniforms: Record<string, THREE.IUniform> = {
      uHeightScale: { value: 100 },
    };
    
    // Add layer uniforms
    for (let i = 0; i < Math.min(layers.length, 4); i++) {
      const layer = layers[i];
      uniforms[`uLayer${i}Diffuse`] = { value: layer.diffuseMap };
      uniforms[`uLayer${i}Normal`] = { value: layer.normalMap };
      uniforms[`uLayer${i}Tiling`] = { value: layer.tiling };
      uniforms[`uLayer${i}HeightRange`] = { value: new THREE.Vector2(layer.minHeight, layer.maxHeight) };
      uniforms[`uLayer${i}SlopeRange`] = { value: new THREE.Vector2(layer.minSlope, layer.maxSlope) };
    }
    
    super({
      uniforms,
      vertexShader: TERRAIN_VERTEX_SHADER,
      fragmentShader: generateTerrainFragmentShader(layers.length),
      lights: true,
    });

    (this.extensions as unknown as { derivatives?: boolean }).derivatives = true;
  }
  
  setHeightScale(scale: number): void {
    this.uniforms.uHeightScale.value = scale;
  }
}

export const TERRAIN_VERTEX_SHADER = `
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vHeight;
  varying float vSlope;
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vHeight = position.y;
    
    // Calculate slope from normal (1 = flat, 0 = vertical)
    vSlope = dot(vNormal, vec3(0.0, 1.0, 0.0));
    
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

export function generateTerrainFragmentShader(layerCount: number): string {
  let layerUniforms = '';
  let layerSampling = '';
  
  for (let i = 0; i < Math.min(layerCount, 4); i++) {
    layerUniforms += `
      uniform sampler2D uLayer${i}Diffuse;
      uniform sampler2D uLayer${i}Normal;
      uniform vec2 uLayer${i}Tiling;
      uniform vec2 uLayer${i}HeightRange;
      uniform vec2 uLayer${i}SlopeRange;
    `;
    
    layerSampling += `
      {
        vec2 tiledUv = vUv * uLayer${i}Tiling;
        vec4 layerColor = texture2D(uLayer${i}Diffuse, tiledUv);
        
        // Height blend
        float heightBlend = smoothstep(uLayer${i}HeightRange.x, uLayer${i}HeightRange.y, normalizedHeight);
        
        // Slope blend
        float slopeBlend = smoothstep(uLayer${i}SlopeRange.x, uLayer${i}SlopeRange.y, vSlope);
        
        float blend = heightBlend * slopeBlend;
        finalColor = mix(finalColor, layerColor.rgb, blend);
        totalBlend += blend;
      }
    `;
  }
  
  return `
    uniform float uHeightScale;
    
    ${layerUniforms}
    
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying vec2 vUv;
    varying float vHeight;
    varying float vSlope;
    
    void main() {
      float normalizedHeight = vHeight / uHeightScale;
      
      vec3 finalColor = vec3(0.3, 0.3, 0.3); // Base color
      float totalBlend = 0.0;
      
      ${layerSampling}
      
      // Basic lighting
      vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
      float diff = max(dot(vNormal, lightDir), 0.0);
      vec3 ambient = vec3(0.3);
      
      vec3 color = finalColor * (ambient + diff * vec3(0.7));
      
      gl_FragColor = vec4(color, 1.0);
    }
  `;
}

// ============================================================================
// TERRAIN CHUNK
// ============================================================================
