// @aethel-heavy-async-boundary
import * as THREE from 'three';
import { ShaderSecurityParser } from './ShaderSecurityParser';

/**
 * MaterialCompiler
 * 
 * JIT Compiler for AI-Generated GLSL Shaders.
 * Validates the raw string provided by the AI and wraps it in a 
 * THREE.ShaderMaterial, injecting necessary Engine Uniforms (Time, Resolution).
 */
export class MaterialCompiler {
  private defaultVertexShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;

    void main() {
      vUv = uv;
      vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  /**
   * Compiles AI-generated Fragment Shader GLSL into a live material.
   */
  public compileGenerativeMaterial(aiFragmentGLSL: string): THREE.ShaderMaterial {
    // Inject Engine Uniforms so the AI's shader can animate and react
    const wrappedFragmentShader = `
      uniform float uTime;
      uniform vec2 uResolution;
      uniform vec3 uCameraPosition;
      
      varying vec2 vUv;
      varying vec3 vPosition;
      varying vec3 vNormal;

      ${ShaderSecurityParser.sanitizeGLSL(aiFragmentGLSL)}
    `;

    // We do not eval() here, we pass it to WebGL which does its own compilation.
    // If the AI made a syntax error, WebGL will log a warning and fallback.
    const material = new THREE.ShaderMaterial({
      vertexShader: this.defaultVertexShader,
      fragmentShader: wrappedFragmentShader,
      uniforms: {
        uTime: { value: 0.0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uCameraPosition: { value: new THREE.Vector3() }
      },
      transparent: true // Generative materials often use alpha
    });

    return material;
  }

  /**
   * Must be called every frame by the Render Loop to animate the shaders.
   */
  public updateUniforms(materials: THREE.ShaderMaterial[], time: number, cameraPos: THREE.Vector3): void {
    for (const mat of materials) {
      if (mat.uniforms.uTime) {
        mat.uniforms.uTime.value = time;
      }
      if (mat.uniforms.uCameraPosition) {
        mat.uniforms.uCameraPosition.value.copy(cameraPos);
      }
    }
  }
}

export const materialCompiler = new MaterialCompiler();
