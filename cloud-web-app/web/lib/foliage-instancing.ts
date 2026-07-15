// @aethel-heavy-async-boundary Three.js runtime module; never import from public/dashboard/admin route shells.
import * as THREE from 'three';

import { logger } from '@/lib/observability/logger';
import { FOLIAGE_FRAGMENT_SHADER, FOLIAGE_VERTEX_SHADER } from './foliage-shaders';

export class FoliageMaterial extends THREE.ShaderMaterial {
  constructor(diffuseTexture?: THREE.Texture, normalTexture?: THREE.Texture) {
    super({
      uniforms: {
        uDiffuse: { value: diffuseTexture || null },
        uNormal: { value: normalTexture || null },
        uTime: { value: 0 },
        uWindDirection: { value: new THREE.Vector2(1, 0) },
        uWindSpeed: { value: 1.0 },
        uWindStrength: { value: 0.3 },
        uAlphaTest: { value: 0.5 },
        uSubsurfaceColor: { value: new THREE.Color(0x2d5a1e) },
        uSubsurfaceStrength: { value: 0.5 },
      },
      vertexShader: FOLIAGE_VERTEX_SHADER,
      fragmentShader: FOLIAGE_FRAGMENT_SHADER,
      side: THREE.DoubleSide,
      transparent: true,
      alphaTest: 0.5,
    });
  }

  setWind(direction: THREE.Vector2, speed: number, strength: number): void {
    this.uniforms.uWindDirection.value.copy(direction);
    this.uniforms.uWindSpeed.value = speed;
    this.uniforms.uWindStrength.value = strength;
  }

  update(deltaTime: number): void {
    this.uniforms.uTime.value += deltaTime;
  }
}

// ============================================================================
// INSTANCED FOLIAGE MESH
// ============================================================================

export class InstancedFoliageMesh {
  readonly mesh: THREE.InstancedMesh;
  private instanceData: {
    position: THREE.Vector3;
    rotation: THREE.Quaternion;
    scale: THREE.Vector3;
  }[] = [];
  private maxInstances: number;
  private activeInstances: number = 0;

  private positionAttribute: THREE.InstancedBufferAttribute;
  private rotationAttribute: THREE.InstancedBufferAttribute;
  private scaleAttribute: THREE.InstancedBufferAttribute;

  constructor(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    maxInstances: number = 10000
  ) {
    this.maxInstances = maxInstances;

    // Create instanced mesh
    this.mesh = new THREE.InstancedMesh(geometry, material, maxInstances);
    this.mesh.count = 0;

    // Create instance attributes
    const positions = new Float32Array(maxInstances * 3);
    const rotations = new Float32Array(maxInstances * 4);
    const scales = new Float32Array(maxInstances * 3);

    this.positionAttribute = new THREE.InstancedBufferAttribute(positions, 3);
    this.rotationAttribute = new THREE.InstancedBufferAttribute(rotations, 4);
    this.scaleAttribute = new THREE.InstancedBufferAttribute(scales, 3);

    geometry.setAttribute('instancePosition', this.positionAttribute);
    geometry.setAttribute('instanceRotation', this.rotationAttribute);
    geometry.setAttribute('instanceScale', this.scaleAttribute);
  }

  addInstance(
    position: THREE.Vector3,
    rotation: THREE.Quaternion,
    scale: THREE.Vector3
  ): number {
    if (this.activeInstances >= this.maxInstances) {
      logger.warn('Max instances reached');
      return -1;
    }

    const idx = this.activeInstances;

    // Store data
    this.instanceData.push({ position: position.clone(), rotation: rotation.clone(), scale: scale.clone() });

    // Update attributes
    this.positionAttribute.setXYZ(idx, position.x, position.y, position.z);
    this.rotationAttribute.setXYZW(idx, rotation.x, rotation.y, rotation.z, rotation.w);
    this.scaleAttribute.setXYZ(idx, scale.x, scale.y, scale.z);

    // Update matrix for picking/bounds
    const matrix = new THREE.Matrix4();
    matrix.compose(position, rotation, scale);
    this.mesh.setMatrixAt(idx, matrix);

    this.activeInstances++;
    this.mesh.count = this.activeInstances;

    this.positionAttribute.needsUpdate = true;
    this.rotationAttribute.needsUpdate = true;
    this.scaleAttribute.needsUpdate = true;
    this.mesh.instanceMatrix.needsUpdate = true;

    return idx;
  }

  /**
   * Swap-remove one GPU instance.
   * @returns the previous last index that moved into `index` (for cluster remapping), or null when no swap.
   */
  removeInstance(index: number): number | null {
    if (index < 0 || index >= this.activeInstances) return null;

    const lastIdx = this.activeInstances - 1;
    let swappedFrom: number | null = null;
    if (index !== lastIdx) {
      const last = this.instanceData[lastIdx];

      this.positionAttribute.setXYZ(index, last.position.x, last.position.y, last.position.z);
      this.rotationAttribute.setXYZW(index, last.rotation.x, last.rotation.y, last.rotation.z, last.rotation.w);
      this.scaleAttribute.setXYZ(index, last.scale.x, last.scale.y, last.scale.z);

      const matrix = new THREE.Matrix4();
      matrix.compose(last.position, last.rotation, last.scale);
      this.mesh.setMatrixAt(index, matrix);

      this.instanceData[index] = last;
      swappedFrom = lastIdx;
    }

    this.instanceData.pop();
    this.activeInstances--;
    this.mesh.count = this.activeInstances;

    this.positionAttribute.needsUpdate = true;
    this.rotationAttribute.needsUpdate = true;
    this.scaleAttribute.needsUpdate = true;
    this.mesh.instanceMatrix.needsUpdate = true;
    return swappedFrom;
  }

  /** Cull without deleting — zero-scale hide / restore authored scale. */
  setInstanceVisible(index: number, visible: boolean): void {
    if (index < 0 || index >= this.activeInstances) return;
    const data = this.instanceData[index];
    const scale = visible
      ? data.scale
      : new THREE.Vector3(0, 0, 0);
    this.scaleAttribute.setXYZ(index, scale.x, scale.y, scale.z);
    const matrix = new THREE.Matrix4();
    matrix.compose(data.position, data.rotation, scale);
    this.mesh.setMatrixAt(index, matrix);
    this.scaleAttribute.needsUpdate = true;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  clear(): void {
    this.instanceData = [];
    this.activeInstances = 0;
    this.mesh.count = 0;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  getInstanceCount(): number {
    return this.activeInstances;
  }

  updateBounds(): void {
    this.mesh.computeBoundingBox();
    this.mesh.computeBoundingSphere();
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    if (this.mesh.material) {
      if (Array.isArray(this.mesh.material)) {
        this.mesh.material.forEach(m => m.dispose());
      } else {
        this.mesh.material.dispose();
      }
    }
  }
}
