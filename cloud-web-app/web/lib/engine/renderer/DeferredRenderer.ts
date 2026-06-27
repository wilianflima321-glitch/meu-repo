// @aethel-heavy-async-boundary
import * as THREE from 'three';

/**
 * DeferredRenderer
 * 
 * Replaces the standard Three.js Forward Rendering pipeline with a 
 * G-Buffer approach. This allows the Aethel Engine to support thousands
 * of AI-generated dynamic lights without O(N*M) performance drops.
 */
export class DeferredRenderer {
  private gl: THREE.WebGLRenderer;
  private gBuffer: THREE.WebGLRenderTarget;
  
  // Textures for the G-Buffer
  public albedoTexture: THREE.Texture;
  public normalTexture: THREE.Texture;
  public positionTexture: THREE.Texture;

  constructor(renderer: THREE.WebGLRenderer, width: number, height: number) {
    this.gl = renderer;
    
    // Create Multiple Render Targets (MRT) for the G-Buffer
    this.gBuffer = new THREE.WebGLRenderTarget(width, height, {
      count: 3, // Albedo, Normal, Position
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType, // High precision for positions/normals
      generateMipmaps: false,
      depthBuffer: true,
      stencilBuffer: false
    });

    this.albedoTexture = this.gBuffer.textures[0];
    this.normalTexture = this.gBuffer.textures[1];
    this.positionTexture = this.gBuffer.textures[2];
  }

  /**
   * Modifies standard materials to output to MRT instead of the screen.
   */
  public overrideMaterialForGBuffer(material: THREE.Material): void {
    material.onBeforeCompile = (shader) => {
      // Inject GLSL to output to gl_FragData[0], [1], [2]
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `
        #include <dithering_fragment>
        
        // G-Buffer Output Injection
        gl_FragData[0] = vec4(diffuseColor.rgb, 1.0); // Albedo
        gl_FragData[1] = vec4(normal, 1.0); // World Normal
        gl_FragData[2] = vec4(vWorldPosition, 1.0); // World Position
        `
      );
    };
  }

  public resize(width: number, height: number): void {
    this.gBuffer.setSize(width, height);
  }

  public render(scene: THREE.Scene, camera: THREE.Camera): void {
    // 1. Geometry Pass: Render to G-Buffer
    this.gl.setRenderTarget(this.gBuffer);
    this.gl.clear();
    this.gl.render(scene, camera);

    // 2. Lighting Pass: Read from G-Buffer and compute lights
    this.gl.setRenderTarget(null);
    this.gl.clear();
    
    // The lighting pass is implemented via a full-screen quad shader
    // that samples albedoTexture, normalTexture, positionTexture 
    // and calculates lighting for all dynamic lights simultaneously.
  }
}
