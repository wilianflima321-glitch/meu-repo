import * as THREE from 'three';

// ============================================================================
// DENOISER
// ============================================================================

export class Denoiser {
  private renderer: THREE.WebGLRenderer;
  private material: THREE.ShaderMaterial;
  private renderTarget: THREE.WebGLRenderTarget;
  private quad: THREE.Mesh;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  
  constructor(renderer: THREE.WebGLRenderer, width: number, height: number) {
    this.renderer = renderer;
    
    this.renderTarget = new THREE.WebGLRenderTarget(width, height, {
      format: THREE.RGBAFormat,
      type: THREE.FloatType
    });
    
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tNormal: { value: null },
        tDepth: { value: null },
        strength: { value: 0.5 },
        resolution: { value: new THREE.Vector2(width, height) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform sampler2D tNormal;
        uniform sampler2D tDepth;
        uniform float strength;
        uniform vec2 resolution;
        
        varying vec2 vUv;
        
        // Edge-aware bilateral filter
        void main() {
          vec3 centerColor = texture2D(tDiffuse, vUv).rgb;
          
          if (strength == 0.0) {
            gl_FragColor = vec4(centerColor, 1.0);
            return;
          }
          
          vec3 sum = vec3(0.0);
          float weightSum = 0.0;
          
          float sigma_spatial = 3.0;
          float sigma_color = 0.1 * strength;
          
          int radius = 3;
          
          for (int x = -3; x <= 3; x++) {
            for (int y = -3; y <= 3; y++) {
              vec2 offset = vec2(float(x), float(y)) / resolution;
              vec3 sampleColor = texture2D(tDiffuse, vUv + offset).rgb;
              
              // Spatial weight
              float spatialDist = length(vec2(float(x), float(y)));
              float spatialWeight = exp(-spatialDist * spatialDist / (2.0 * sigma_spatial * sigma_spatial));
              
              // Color weight
              float colorDist = length(sampleColor - centerColor);
              float colorWeight = exp(-colorDist * colorDist / (2.0 * sigma_color * sigma_color));
              
              float weight = spatialWeight * colorWeight;
              sum += sampleColor * weight;
              weightSum += weight;
            }
          }
          
          vec3 denoised = sum / weightSum;
          gl_FragColor = vec4(denoised, 1.0);
        }
      `
    });
    
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.quad = new THREE.Mesh(geometry, this.material);
    
    this.scene = new THREE.Scene();
    this.scene.add(this.quad);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  
  denoise(input: THREE.Texture, strength: number = 0.5): THREE.Texture {
    this.material.uniforms.tDiffuse.value = input;
    this.material.uniforms.strength.value = strength;
    
    const currentTarget = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(currentTarget);
    
    return this.renderTarget.texture;
  }
  
  resize(width: number, height: number): void {
    this.renderTarget.setSize(width, height);
    this.material.uniforms.resolution.value.set(width, height);
  }
  
  dispose(): void {
    this.renderTarget.dispose();
    this.material.dispose();
    this.quad.geometry.dispose();
  }
}
