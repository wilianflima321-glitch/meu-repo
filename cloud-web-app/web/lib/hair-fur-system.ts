/** Hair/Fur simulation runtime core. */

import * as THREE from 'three';
import { MarschnerHairShader } from './hair-fur-shader';
import { HairGroomSystem } from './hair-fur-groom';
import { HairPhysicsSimulation } from './hair-fur-physics';
import { ShellFurSystem } from './hair-fur-shell';
import type { FurConfig, HairCollider, HairConfig, HairStrand } from './hair-fur-types';

export { MarschnerHairShader };
export { HairGroomSystem } from './hair-fur-groom';
export { HairPhysicsSimulation } from './hair-fur-physics';
export { ShellFurSystem } from './hair-fur-shell';
export type {
  FurConfig,
  GroomGuide,
  HairClump,
  HairCollider,
  HairConfig,
  HairSegment,
  HairStrand,
} from './hair-fur-types';

export class HairFurSystem {
  private hairConfig: HairConfig;
  private groomSystem: HairGroomSystem;
  private physicsSimulation: HairPhysicsSimulation;
  private shader: MarschnerHairShader;

  private strands: HairStrand[] = [];
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.ShaderMaterial | null = null;
  private mesh: THREE.Mesh | null = null;

  constructor(config: Partial<HairConfig> = {}) {
    this.hairConfig = {
      strandCount: 10000,
      segmentsPerStrand: 8,
      rootWidth: 0.002,
      tipWidth: 0.0005,
      length: 0.3,
      lengthVariation: 0.2,
      curl: 0.05,
      curlFrequency: 2,
      clumpSize: 10,
      clumpStrength: 0.5,
      noise: 0.01,
      gravity: 0.5,
      stiffness: 0.8,
      damping: 0.95,
      color: new THREE.Color(0.2, 0.1, 0.05),
      colorVariation: 0.1,
      specularColor: new THREE.Color(1, 1, 1),
      specularPower: 64,
      shadowDensity: 0.7,
      ...config,
    };

    this.groomSystem = new HairGroomSystem();
    this.physicsSimulation = new HairPhysicsSimulation(this.hairConfig.stiffness, this.hairConfig.damping);
    this.shader = new MarschnerHairShader();
  }

  setScalpMesh(mesh: THREE.Mesh): void {
    this.groomSystem.setMesh(mesh);
  }

  addGroomGuide(position: THREE.Vector3, controlPoints: THREE.Vector3[]): void {
    this.groomSystem.addGuide(position, controlPoints);
  }

  generateHair(): void {
    this.strands = this.groomSystem.generateStrands(this.hairConfig);

    this.physicsSimulation.clear();
    for (const strand of this.strands) {
      this.physicsSimulation.addStrand(strand);
    }

    this.buildGeometry();
    this.createMaterial();
  }

  private buildGeometry(): void {
    if (this.geometry) {
      this.geometry.dispose();
    }

    const totalSegments = this.strands.reduce((sum, s) => sum + s.segments.length - 1, 0);
    const verticesPerSegment = 4;
    const totalVertices = totalSegments * verticesPerSegment;

    const positions = new Float32Array(totalVertices * 3);
    const normals = new Float32Array(totalVertices * 3);
    const uvs = new Float32Array(totalVertices * 2);
    const colors = new Float32Array(totalVertices * 3);
    const indices: number[] = [];

    let vertexIndex = 0;
    let indexOffset = 0;

    for (const strand of this.strands) {
      for (let i = 0; i < strand.segments.length - 1; i++) {
        const seg0 = strand.segments[i];
        const seg1 = strand.segments[i + 1];

        const t0 = i / (strand.segments.length - 1);
        const t1 = (i + 1) / (strand.segments.length - 1);

        const tangent = seg1.position.clone().sub(seg0.position).normalize();
        const viewDir = new THREE.Vector3(0, 0, 1);
        const bitangent = tangent.clone().cross(viewDir).normalize();

        const p0Left = seg0.position.clone().add(bitangent.clone().multiplyScalar(seg0.width));
        const p0Right = seg0.position.clone().sub(bitangent.clone().multiplyScalar(seg0.width));
        const p1Left = seg1.position.clone().add(bitangent.clone().multiplyScalar(seg1.width));
        const p1Right = seg1.position.clone().sub(bitangent.clone().multiplyScalar(seg1.width));

        positions[vertexIndex * 3] = p0Left.x;
        positions[vertexIndex * 3 + 1] = p0Left.y;
        positions[vertexIndex * 3 + 2] = p0Left.z;

        positions[(vertexIndex + 1) * 3] = p0Right.x;
        positions[(vertexIndex + 1) * 3 + 1] = p0Right.y;
        positions[(vertexIndex + 1) * 3 + 2] = p0Right.z;

        positions[(vertexIndex + 2) * 3] = p1Left.x;
        positions[(vertexIndex + 2) * 3 + 1] = p1Left.y;
        positions[(vertexIndex + 2) * 3 + 2] = p1Left.z;

        positions[(vertexIndex + 3) * 3] = p1Right.x;
        positions[(vertexIndex + 3) * 3 + 1] = p1Right.y;
        positions[(vertexIndex + 3) * 3 + 2] = p1Right.z;

        for (let j = 0; j < 4; j++) {
          normals[(vertexIndex + j) * 3] = tangent.x;
          normals[(vertexIndex + j) * 3 + 1] = tangent.y;
          normals[(vertexIndex + j) * 3 + 2] = tangent.z;
        }

        uvs[vertexIndex * 2] = 0;
        uvs[vertexIndex * 2 + 1] = t0;

        uvs[(vertexIndex + 1) * 2] = 1;
        uvs[(vertexIndex + 1) * 2 + 1] = t0;

        uvs[(vertexIndex + 2) * 2] = 0;
        uvs[(vertexIndex + 2) * 2 + 1] = t1;

        uvs[(vertexIndex + 3) * 2] = 1;
        uvs[(vertexIndex + 3) * 2 + 1] = t1;

        for (let j = 0; j < 4; j++) {
          colors[(vertexIndex + j) * 3] = strand.colorVariation.r;
          colors[(vertexIndex + j) * 3 + 1] = strand.colorVariation.g;
          colors[(vertexIndex + j) * 3 + 2] = strand.colorVariation.b;
        }

        indices.push(indexOffset, indexOffset + 1, indexOffset + 2, indexOffset + 2, indexOffset + 1, indexOffset + 3);

        vertexIndex += 4;
        indexOffset += 4;
      }
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setIndex(indices);
  }

  private createMaterial(): void {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        hairColor: { value: this.hairConfig.color },
        specularColor: { value: this.hairConfig.specularColor },
        specularPower: { value: this.hairConfig.specularPower },
        shadowDensity: { value: this.hairConfig.shadowDensity },
        lightDirection: { value: new THREE.Vector3(1, 1, 1).normalize() },
      },
      vertexShader: `
        attribute vec3 color;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec3 vColor;

        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vColor = color;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;

          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 hairColor;
        uniform vec3 specularColor;
        uniform float specularPower;
        uniform float shadowDensity;
        uniform vec3 lightDirection;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec3 vColor;

        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(vViewPosition);
          vec3 lightDir = normalize(lightDirection);

          float sinTL = sqrt(1.0 - pow(dot(lightDir, normal), 2.0));
          float diffuse = sinTL;

          vec3 H = normalize(lightDir + viewDir);
          float sinTH = sqrt(1.0 - pow(dot(H, normal), 2.0));
          float spec = pow(sinTH, specularPower);

          float shadow = mix(shadowDensity, 1.0, vUv.y);

          vec3 color = vColor * hairColor * diffuse * shadow;
          color += specularColor * spec;

          float alpha = 1.0 - vUv.y * 0.3;

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    });
  }

  getMesh(): THREE.Mesh | null {
    if (!this.geometry || !this.material) return null;

    if (!this.mesh) {
      this.mesh = new THREE.Mesh(this.geometry, this.material);
    }

    return this.mesh;
  }

  update(deltaTime: number, rootTransform?: THREE.Matrix4): void {
    this.physicsSimulation.simulate(deltaTime, rootTransform);
    this.updateGeometry();
  }

  private updateGeometry(): void {
    if (!this.geometry) return;

    const positions = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const posArray = positions.array as Float32Array;

    let vertexIndex = 0;

    for (const strand of this.strands) {
      for (let i = 0; i < strand.segments.length - 1; i++) {
        const seg0 = strand.segments[i];
        const seg1 = strand.segments[i + 1];

        const tangent = seg1.position.clone().sub(seg0.position).normalize();
        const viewDir = new THREE.Vector3(0, 0, 1);
        const bitangent = tangent.clone().cross(viewDir).normalize();

        const p0Left = seg0.position.clone().add(bitangent.clone().multiplyScalar(seg0.width));
        const p0Right = seg0.position.clone().sub(bitangent.clone().multiplyScalar(seg0.width));
        const p1Left = seg1.position.clone().add(bitangent.clone().multiplyScalar(seg1.width));
        const p1Right = seg1.position.clone().sub(bitangent.clone().multiplyScalar(seg1.width));

        posArray[vertexIndex * 3] = p0Left.x;
        posArray[vertexIndex * 3 + 1] = p0Left.y;
        posArray[vertexIndex * 3 + 2] = p0Left.z;

        posArray[(vertexIndex + 1) * 3] = p0Right.x;
        posArray[(vertexIndex + 1) * 3 + 1] = p0Right.y;
        posArray[(vertexIndex + 1) * 3 + 2] = p0Right.z;

        posArray[(vertexIndex + 2) * 3] = p1Left.x;
        posArray[(vertexIndex + 2) * 3 + 1] = p1Left.y;
        posArray[(vertexIndex + 2) * 3 + 2] = p1Left.z;

        posArray[(vertexIndex + 3) * 3] = p1Right.x;
        posArray[(vertexIndex + 3) * 3 + 1] = p1Right.y;
        posArray[(vertexIndex + 3) * 3 + 2] = p1Right.z;

        vertexIndex += 4;
      }
    }

    positions.needsUpdate = true;
  }

  setWind(direction: THREE.Vector3, turbulence: number = 0): void {
    this.physicsSimulation.setWind(direction, turbulence);
  }

  addCollider(collider: HairCollider): void {
    this.physicsSimulation.addCollider(collider);
  }

  dispose(): void {
    if (this.geometry) {
      this.geometry.dispose();
    }
    if (this.material) {
      this.material.dispose();
    }
  }
}

export const createHairSystem = (config?: Partial<HairConfig>): HairFurSystem => {
  return new HairFurSystem(config);
};

export const createFurSystem = (config?: Partial<FurConfig>): ShellFurSystem => {
  return new ShellFurSystem(config);
};
