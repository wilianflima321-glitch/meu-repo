// @aethel-heavy-async-boundary Studio/render-gated cloth mesh renderer.
import * as THREE from 'three';

import type { ClothParticle } from './cloth-simulation-contracts';

interface ClothParticleSource {
  particles: ClothParticle[];
}

export class ClothMesh {
  readonly geometry: THREE.BufferGeometry;
  readonly mesh: THREE.Mesh;
  private particleSystem: ClothParticleSource;
  private vertices: Float32Array;
  private normals: Float32Array;
  private indices: Uint32Array;
  constructor(particleSystem: ClothParticleSource, material?: THREE.Material) {
    this.particleSystem = particleSystem;
    const particles = particleSystem.particles;
    const segmentsX = Math.sqrt(particles.length) - 1;
    const segmentsY = segmentsX;
    this.vertices = new Float32Array(particles.length * 3);
    this.normals = new Float32Array(particles.length * 3);
    const indexCount = segmentsX * segmentsY * 6;
    this.indices = new Uint32Array(indexCount);
    let indexOffset = 0;
    for (let j = 0; j < segmentsY; j++) {
      for (let i = 0; i < segmentsX; i++) {
        const a = j * (segmentsX + 1) + i;
        const b = a + 1;
        const c = a + (segmentsX + 1);
        const d = c + 1;
        this.indices[indexOffset++] = a;
        this.indices[indexOffset++] = c;
        this.indices[indexOffset++] = b;
        this.indices[indexOffset++] = b;
        this.indices[indexOffset++] = c;
        this.indices[indexOffset++] = d;
      }
    }
    const uvs = new Float32Array(particles.length * 2);
    for (let j = 0; j <= segmentsY; j++) {
      for (let i = 0; i <= segmentsX; i++) {
        const index = j * (segmentsX + 1) + i;
        uvs[index * 2] = i / segmentsX;
        uvs[index * 2 + 1] = 1 - j / segmentsY;
      }
    }
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.vertices, 3));
    this.geometry.setAttribute('normal', new THREE.BufferAttribute(this.normals, 3));
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    this.geometry.setIndex(new THREE.BufferAttribute(this.indices, 1));
    const defaultMaterial = material || new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      side: THREE.DoubleSide,
      roughness: 0.8,
      metalness: 0.0
    });
    this.mesh = new THREE.Mesh(this.geometry, defaultMaterial);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.updateGeometry();
  }
  updateGeometry(): void {
    const particles = this.particleSystem.particles;
    const positionAttribute = this.geometry.getAttribute('position');
    const normalAttribute = this.geometry.getAttribute('normal');
    for (let i = 0; i < particles.length; i++) {
      this.vertices[i * 3] = particles[i].position.x;
      this.vertices[i * 3 + 1] = particles[i].position.y;
      this.vertices[i * 3 + 2] = particles[i].position.z;
    }
    positionAttribute.needsUpdate = true;
    this.calculateNormals();
    normalAttribute.needsUpdate = true;
    this.geometry.computeBoundingSphere();
    this.geometry.computeBoundingBox();
  }
  private calculateNormals(): void {
    this.normals.fill(0);
    for (let i = 0; i < this.indices.length; i += 3) {
      const a = this.indices[i];
      const b = this.indices[i + 1];
      const c = this.indices[i + 2];
      const p1 = new THREE.Vector3(
        this.vertices[a * 3],
        this.vertices[a * 3 + 1],
        this.vertices[a * 3 + 2]
      );
      const p2 = new THREE.Vector3(
        this.vertices[b * 3],
        this.vertices[b * 3 + 1],
        this.vertices[b * 3 + 2]
      );
      const p3 = new THREE.Vector3(
        this.vertices[c * 3],
        this.vertices[c * 3 + 1],
        this.vertices[c * 3 + 2]
      );
      const edge1 = p2.clone().sub(p1);
      const edge2 = p3.clone().sub(p1);
      const normal = edge1.cross(edge2);
      for (const idx of [a, b, c]) {
        this.normals[idx * 3] += normal.x;
        this.normals[idx * 3 + 1] += normal.y;
        this.normals[idx * 3 + 2] += normal.z;
      }
    }
    for (let i = 0; i < this.normals.length; i += 3) {
      const len = Math.sqrt(
        this.normals[i] ** 2 +
        this.normals[i + 1] ** 2 +
        this.normals[i + 2] ** 2
      );
      if (len > 0) {
        this.normals[i] /= len;
        this.normals[i + 1] /= len;
        this.normals[i + 2] /= len;
      }
    }
  }
  dispose(): void {
    this.geometry.dispose();
    if (this.mesh.material instanceof THREE.Material) {
      this.mesh.material.dispose();
    }
  }
}
