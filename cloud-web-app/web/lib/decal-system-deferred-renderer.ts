// @aethel-heavy-async-boundary Studio/render-gated runtime; do not import from public route shells.
import THREE from './decal-system-runtime';

import { DEFERRED_DECAL_FRAGMENT, DEFERRED_DECAL_VERTEX } from './decal-system-shaders';

export class DeferredDecalRenderer {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private decalBoxes: THREE.Mesh[] = [];

  private decalMaterial: THREE.ShaderMaterial;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;

    // Create deferred decal material
    this.decalMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uDecalTexture: { value: null },
        uDecalNormalMap: { value: null },
        uDepthTexture: { value: null },
        uNormalTexture: { value: null },
        uViewMatrix: { value: new THREE.Matrix4() },
        uProjectionMatrix: { value: new THREE.Matrix4() },
        uProjectionMatrixInverse: { value: new THREE.Matrix4() },
        uDecalMatrix: { value: new THREE.Matrix4() },
        uDecalMatrixInverse: { value: new THREE.Matrix4() },
      },
      vertexShader: DEFERRED_DECAL_VERTEX,
      fragmentShader: DEFERRED_DECAL_FRAGMENT,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
  }

  addDecal(
    position: THREE.Vector3,
    orientation: THREE.Quaternion,
    size: THREE.Vector3,
    texture: THREE.Texture,
    normalMap?: THREE.Texture
  ): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const material = this.decalMaterial.clone();

    material.uniforms.uDecalTexture.value = texture;
    material.uniforms.uDecalNormalMap.value = normalMap || null;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.quaternion.copy(orientation);

    // Store decal matrix
    const decalMatrix = new THREE.Matrix4();
    mesh.updateMatrixWorld();
    decalMatrix.copy(mesh.matrixWorld);
    material.uniforms.uDecalMatrix.value = decalMatrix;
    material.uniforms.uDecalMatrixInverse.value = decalMatrix.clone().invert();

    this.decalBoxes.push(mesh);
    this.scene.add(mesh);

    return mesh;
  }

  setGBufferTextures(depthTexture: THREE.Texture, normalTexture: THREE.Texture): void {
    for (const box of this.decalBoxes) {
      const material = box.material as THREE.ShaderMaterial;
      material.uniforms.uDepthTexture.value = depthTexture;
      material.uniforms.uNormalTexture.value = normalTexture;
    }
  }

  updateMatrices(): void {
    const viewMatrix = this.camera.matrixWorldInverse;
    const projectionMatrix = (this.camera as THREE.PerspectiveCamera).projectionMatrix;
    const projectionMatrixInverse = projectionMatrix.clone().invert();

    for (const box of this.decalBoxes) {
      const material = box.material as THREE.ShaderMaterial;
      material.uniforms.uViewMatrix.value = viewMatrix;
      material.uniforms.uProjectionMatrix.value = projectionMatrix;
      material.uniforms.uProjectionMatrixInverse.value = projectionMatrixInverse;
    }
  }

  removeDecal(mesh: THREE.Mesh): void {
    const idx = this.decalBoxes.indexOf(mesh);
    if (idx !== -1) {
      this.decalBoxes.splice(idx, 1);
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
  }

  dispose(): void {
    for (const box of this.decalBoxes) {
      this.scene.remove(box);
      box.geometry.dispose();
      (box.material as THREE.Material).dispose();
    }
    this.decalBoxes = [];
    this.decalMaterial.dispose();
  }
}

// ============================================================================
