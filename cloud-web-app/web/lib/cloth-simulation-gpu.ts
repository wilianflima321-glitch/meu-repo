import * as THREE from 'three';

import type { ClothConfig } from './cloth-simulation.types';

// ============================================================================
// GPU CLOTH SIMULATION (WebGL Compute/Transform Feedback)
// ============================================================================

export class GPUClothSimulation {
  private renderer: THREE.WebGLRenderer;
  private particleCount: number;
  private constraintCount: number;
  
  // Double buffer for positions
  private positionBufferA: THREE.DataTexture;
  private positionBufferB: THREE.DataTexture;
  private velocityBuffer: THREE.DataTexture;
  private constraintBuffer: THREE.DataTexture;
  
  // Compute materials
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
    
    // Create position buffers
    this.positionBufferA = this.createDataTexture(size);
    this.positionBufferB = this.createDataTexture(size);
    this.velocityBuffer = this.createDataTexture(size);
    this.constraintBuffer = this.createDataTexture(size);
    
    // Create render target
    this.renderTarget = new THREE.WebGLRenderTarget(size, size, {
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter
    });
    
    // Create shaders
    this.integrationMaterial = this.createIntegrationMaterial();
    this.constraintMaterial = this.createConstraintMaterial();
    
    // Create fullscreen quad
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
            // Verlet integration
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
          
          // Would apply constraint corrections here
          // Simplified version - actual implementation would be more complex
          
          gl_FragColor = vec4(position, pinned);
        }
      `
    });
  }
  
  update(dt: number): void {
    // Swap buffers
    const readBuffer = this.currentBuffer === 'A' ? this.positionBufferA : this.positionBufferB;
    const writeBuffer = this.currentBuffer === 'A' ? this.positionBufferB : this.positionBufferA;
    
    // Integration pass
    this.integrationMaterial.uniforms.positionTexture.value = readBuffer;
    this.integrationMaterial.uniforms.velocityTexture.value = this.velocityBuffer;
    this.integrationMaterial.uniforms.deltaTime.value = dt;
    
    this.quadMesh.material = this.integrationMaterial;
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.quadMesh, new THREE.Camera());
    
    // Constraint passes would go here
    
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

// ============================================================================
// PRESETS
// ============================================================================

export const CLOTH_PRESETS = {
  flag: {
    width: 2,
    height: 1.5,
    segmentsX: 30,
    segmentsY: 20,
    mass: 0.5,
    stiffness: 0.95,
    damping: 0.98,
    wind: new THREE.Vector3(5, 0, 1),
    windVariation: 2
  },
  
  cape: {
    width: 1.2,
    height: 1.5,
    segmentsX: 15,
    segmentsY: 20,
    mass: 0.8,
    stiffness: 0.9,
    damping: 0.97,
    wind: new THREE.Vector3(0, 0, 0),
    windVariation: 0.5
  },
  
  curtain: {
    width: 3,
    height: 2.5,
    segmentsX: 40,
    segmentsY: 35,
    mass: 2.0,
    stiffness: 0.85,
    damping: 0.96,
    wind: new THREE.Vector3(0, 0, 0),
    windVariation: 0.2
  },
  
  tablecloth: {
    width: 2,
    height: 2,
    segmentsX: 25,
    segmentsY: 25,
    mass: 1.5,
    stiffness: 0.8,
    damping: 0.95,
    gravity: new THREE.Vector3(0, -15, 0),
    wind: new THREE.Vector3(0, 0, 0),
    windVariation: 0
  },
  
  silk: {
    width: 1.5,
    height: 2,
    segmentsX: 50,
    segmentsY: 60,
    mass: 0.3,
    stiffness: 0.6,
    damping: 0.99,
    wind: new THREE.Vector3(1, 0, 0.5),
    windVariation: 1
  }
};

