// @aethel-heavy-async-boundary

import { THREE } from './pbr-three-namespace';

export class ShadowMapRenderer {
  private shadowMap: THREE.WebGLRenderTarget;
  private shadowCamera: THREE.OrthographicCamera;
  private depthMaterial: THREE.MeshDepthMaterial;
  private shadowMatrix: THREE.Matrix4;
  constructor(
    private renderer: THREE.WebGLRenderer,
    size: number = 2048
  ) {
    this.shadowMap = new THREE.WebGLRenderTarget(size, size, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
    });
    this.shadowCamera = new THREE.OrthographicCamera(-50, 50, 50, -50, 0.1, 500);
    this.depthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
    });
    this.shadowMatrix = new THREE.Matrix4();
  }
  render(scene: THREE.Scene, light: THREE.DirectionalLight): void {
    this.shadowCamera.position.copy(light.position);
    this.shadowCamera.lookAt(light.target.position);
    this.shadowCamera.updateMatrixWorld();
    this.shadowMatrix.set(
      0.5, 0.0, 0.0, 0.5,
      0.0, 0.5, 0.0, 0.5,
      0.0, 0.0, 0.5, 0.5,
      0.0, 0.0, 0.0, 1.0
    );
    this.shadowMatrix.multiply(this.shadowCamera.projectionMatrix);
    this.shadowMatrix.multiply(this.shadowCamera.matrixWorldInverse);
    const currentRenderTarget = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(this.shadowMap);
    this.renderer.clear();
    scene.overrideMaterial = this.depthMaterial;
    this.renderer.render(scene, this.shadowCamera);
    scene.overrideMaterial = null;
    this.renderer.setRenderTarget(currentRenderTarget);
  }
  getShadowMap(): THREE.Texture {
    return this.shadowMap.texture;
  }
  getShadowMatrix(): THREE.Matrix4 {
    return this.shadowMatrix;
  }
  dispose(): void {
    this.shadowMap.dispose();
    this.depthMaterial.dispose();
  }
}

