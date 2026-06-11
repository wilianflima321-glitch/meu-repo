// @aethel-heavy-async-boundary GPU cloth simulation is Studio/runtime-only.
import * as THREE from 'three';

import type { ClothConfig } from './cloth-simulation-contracts';

export class GPUClothSimulation {
  private renderer: THREE.WebGLRenderer;
  private particleCount: number;
  private constraintCount: number;
  private positionBufferA: THREE.DataTexture;
  private positionBufferB: THREE.DataTexture;
  private velocityBuffer: THREE.DataTexture;
  private constraintBuffer: THREE.DataTexture;
  private integrationMaterial: THREE.ShaderMaterial;
  private constraintMaterial: THREE.ShaderMaterial;
  private quadMesh: THREE.Mesh;
  private renderTarget: THREE.WebGLRenderTarget;
  private currentBuffer: 'A' | 'B' = 'A';
  constructor(renderer: THREE.WebGLRenderer, config: ClothConfig) {
    this.renderer = renderer;
    this.particleCount = (config.segmentsX + 1) * (config.segmentsY + 1);
    this.constraintCount = 0; // Would calculate from config
    const size = Math.ceil(Math.sqrt(this.particleCount));
    this.positionBufferA = this.createDataTexture(size);
    this.positionBufferB = this.createDataTexture(size);
    this.velocityBuffer = this.createDataTexture(size);
    this.constraintBuffer = this.createDataTexture(size);
    this.renderTarget = new THREE.WebGLRenderTarget(size, size, {
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter
    });
    this.integrationMaterial = this.createIntegrationMaterial();
    this.constraintMaterial = this.createConstraintMaterial();
    const quadGeometry = new THREE.PlaneGeometry(2, 2);
    this.quadMesh = new THREE.Mesh(quadGeometry, this.integrationMaterial);
  }
  private createDataTexture(size: number): THREE.DataTexture {
    const data = new Float32Array(size * size * 4);
    const texture = new THREE.DataTexture(
      data, size, size,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    texture.needsUpdate = true;
    return texture;
  }
  private createIntegrationMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        positionTexture: { value: null },
        velocityTexture: { value: null },
        deltaTime: { value: 0.016 },
        gravity: { value: new THREE.Vector3(0, -9.81, 0) },
        wind: { value: new THREE.Vector3(0, 0, 0) },
        damping: { value: 0.99 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D positionTexture;
        uniform sampler2D velocityTexture;
        uniform float deltaTime;
        uniform vec3 gravity;
        uniform vec3 wind;
        uniform float damping;
        varying vec2 vUv;
        void main() {
          vec4 posData = texture2D(positionTexture, vUv);
          vec4 velData = texture2D(velocityTexture, vUv);
          vec3 position = posData.xyz;
          float pinned = posData.w;
          vec3 velocity = velData.xyz;
          if (pinned < 0.5) {
            vec3 acceleration = gravity + wind;
            velocity = velocity * damping + acceleration * deltaTime;
            position = position + velocity * deltaTime;
          }
          gl_FragColor = vec4(position, pinned);
        }
      `
    });
  }
  private createConstraintMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        positionTexture: { value: null },
        constraintTexture: { value: null },
        textureSize: { value: 0 },
        stiffness: { value: 0.9 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D positionTexture;
        uniform sampler2D constraintTexture;
        uniform float textureSize;
        uniform float stiffness;
        varying vec2 vUv;
        vec2 indexToUV(float index) {
          float y = floor(index / textureSize);
          float x = index - y * textureSize;
          return vec2((x + 0.5) / textureSize, (y + 0.5) / textureSize);
        }
        void main() {
          vec4 posData = texture2D(positionTexture, vUv);
          vec3 position = posData.xyz;
          float pinned = posData.w;
          gl_FragColor = vec4(position, pinned);
        }
      `
    });
  }
  update(dt: number): void {
    const readBuffer = this.currentBuffer === 'A' ? this.positionBufferA : this.positionBufferB;
    const writeBuffer = this.currentBuffer === 'A' ? this.positionBufferB : this.positionBufferA;
    this.integrationMaterial.uniforms.positionTexture.value = readBuffer;
    this.integrationMaterial.uniforms.velocityTexture.value = this.velocityBuffer;
    this.integrationMaterial.uniforms.deltaTime.value = dt;
    this.quadMesh.material = this.integrationMaterial;
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.quadMesh, new THREE.Camera());
    this.renderer.setRenderTarget(null);
    this.currentBuffer = this.currentBuffer === 'A' ? 'B' : 'A';
  }
  getPositionTexture(): THREE.Texture {
    return this.currentBuffer === 'A' ? this.positionBufferA : this.positionBufferB;
  }
  dispose(): void {
    this.positionBufferA.dispose();
    this.positionBufferB.dispose();
    this.velocityBuffer.dispose();
    this.constraintBuffer.dispose();
    this.renderTarget.dispose();
    this.integrationMaterial.dispose();
    this.constraintMaterial.dispose();
    this.quadMesh.geometry.dispose();
  }
}
