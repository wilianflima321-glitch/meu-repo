// @aethel-heavy-async-boundary Procedural mesh generation for Studio/runtime jobs.
import * as THREE from 'three';
import { SimplexNoise } from './terrain-engine';

export type MeshPrimitive =
  | 'building'
  | 'tree'
  | 'rock'
  | 'plant'
  | 'cloud'
  | 'terrain'
  | 'road'
  | 'bridge'
  | 'wall'
  | 'fence'
  | 'vehicle'
  | 'furniture'
  | 'prop';

export interface ProceduralMeshParams {
  primitive: MeshPrimitive;
  seed: number;
  complexity: number;          // 0-1
  variation: number;           // 0-1
  scale: [number, number, number];
  // Primitive-specific
  buildingHeight?: number;
  buildingFloors?: number;
  treeSpecies?: 'oak' | 'pine' | 'palm' | 'birch';
  rockType?: 'smooth' | 'rough' | 'crystalline';
}

export class ProceduralMeshGenerator {
  private noise: SimplexNoise;

  constructor(seed: number = Date.now()) {
    this.noise = new SimplexNoise(seed);
  }

  generate(params: ProceduralMeshParams): THREE.BufferGeometry {
    switch (params.primitive) {
      case 'building':
        return this.generateBuilding(params);
      case 'tree':
        return this.generateTree(params);
      case 'rock':
        return this.generateRock(params);
      case 'plant':
        return this.generatePlant(params);
      case 'cloud':
        return this.generateCloud(params);
      default:
        return new THREE.BoxGeometry(1, 1, 1);
    }
  }

  private generateBuilding(params: ProceduralMeshParams): THREE.BufferGeometry {
    const height = params.buildingHeight || 10;
    const floors = params.buildingFloors || Math.floor(height / 3);

    // Generate building footprint using noise
    const footprint = this.generateFootprint(params.seed, params.variation);

    // Extrude footprint to create building
    const shape = new THREE.Shape(footprint);
    const extrudeSettings = {
      depth: height,
      bevelEnabled: false,
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    // Add details (windows, doors, etc.)
    this.addBuildingDetails(geometry, floors, params.complexity);

    return geometry;
  }

  private generateFootprint(seed: number, variation: number): THREE.Vector2[] {
    const points: THREE.Vector2[] = [];
    const sides = 4 + Math.floor(variation * 4); // 4-8 sides

    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
      const radius = 5 + this.noise.noise2D(i * 0.1, seed) * variation * 2;
      points.push(new THREE.Vector2(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius
      ));
    }

    return points;
  }

  private addBuildingDetails(geometry: THREE.BufferGeometry, floors: number, complexity: number): void {
    // Add windows, doors, balconies based on complexity
    // This would modify geometry to add detail
  }

  private generateTree(params: ProceduralMeshParams): THREE.BufferGeometry {
    const species = params.treeSpecies || 'oak';
    const geometries: THREE.BufferGeometry[] = [];

    // Generate trunk
    const trunkGeometry = this.generateTrunk(params.scale[1], params.variation);
    geometries.push(trunkGeometry);

    // Generate branches using L-system
    const branches = this.generateBranches(species, params.complexity);
    geometries.push(...branches);

    // Generate foliage
    const foliage = this.generateFoliage(species, params.complexity, params.variation);
    geometries.push(foliage);

    // Merge all geometries
    const { mergeGeometries } = require('three/examples/jsm/utils/BufferGeometryUtils.js');
    return mergeGeometries(geometries);
  }

  private generateTrunk(height: number, variation: number): THREE.BufferGeometry {
    const radiusTop = 0.2 + variation * 0.1;
    const radiusBottom = 0.5 + variation * 0.2;
    const segments = 8;

    return new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments);
  }

  private generateBranches(species: string, complexity: number): THREE.BufferGeometry[] {
    const branches: THREE.BufferGeometry[] = [];
    const branchCount = Math.floor(5 + complexity * 15);

    // L-system rules for different species
    const rules: Record<string, string> = {
      oak: 'F[+F]F[-F]F',
      pine: 'F[+F][-F]F[+F]',
      palm: 'F[++F][--F]',
      birch: 'F[+F][-F][+F]',
    };

    const rule = rules[species] || rules.oak;

    for (let i = 0; i < branchCount; i++) {
      // Generate branch using L-system
      const branch = new THREE.CylinderGeometry(0.05, 0.1, 2, 6);

      // Position and rotate based on L-system
      const angle = (i / branchCount) * Math.PI * 2;
      const height = 5 + this.noise.noise2D(i * 0.1, 0) * 3;

      branch.translate(
        Math.cos(angle) * 0.5,
        height,
        Math.sin(angle) * 0.5
      );

      branches.push(branch);
    }

    return branches;
  }

  private generateFoliage(species: string, complexity: number, variation: number): THREE.BufferGeometry {
    // Generate foliage using metaballs or instanced spheres
    const foliageCount = Math.floor(20 + complexity * 80);
    const geometries: THREE.BufferGeometry[] = [];

    for (let i = 0; i < foliageCount; i++) {
      const radius = 0.5 + this.noise.noise2D(i * 0.1, 0) * variation * 0.5;
      const sphere = new THREE.SphereGeometry(radius, 8, 8);

      // Position around crown
      const angle = (i / foliageCount) * Math.PI * 2;
      const distance = 2 + this.noise.noise2D(i * 0.2, 1) * 2;
      const height = 8 + this.noise.noise2D(i * 0.15, 2) * 2;

      sphere.translate(
        Math.cos(angle) * distance,
        height,
        Math.sin(angle) * distance
      );

      geometries.push(sphere);
    }

    const { mergeGeometries } = require('three/examples/jsm/utils/BufferGeometryUtils.js');
    return mergeGeometries(geometries);
  }

  private generateRock(params: ProceduralMeshParams): THREE.BufferGeometry {
    const type = params.rockType || 'rough';

    // Start with icosphere
    const geometry = new THREE.IcosahedronGeometry(1, 2);
    const positions = geometry.attributes.position;

    // Deform vertices using noise
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);

      // Apply noise-based displacement
      let displacement = 1;

      if (type === 'rough') {
        displacement += this.noise.noise3D(x * 2, y * 2, z * 2) * 0.3;
        displacement += this.noise.noise3D(x * 4, y * 4, z * 4) * 0.15;
      } else if (type === 'smooth') {
        displacement += this.noise.noise3D(x, y, z) * 0.2;
      } else if (type === 'crystalline') {
        // Sharp faceted look
        displacement += Math.abs(this.noise.noise3D(x * 3, y * 3, z * 3)) * 0.4;
      }

      positions.setXYZ(
        i,
        x * displacement,
        y * displacement,
        z * displacement
      );
    }

    positions.needsUpdate = true;
    geometry.computeVertexNormals();

    // Scale to params
    geometry.scale(params.scale[0], params.scale[1], params.scale[2]);

    return geometry;
  }

  private generatePlant(params: ProceduralMeshParams): THREE.BufferGeometry {
    // Generate grass, flowers, bushes
    const geometries: THREE.BufferGeometry[] = [];
    const bladeCount = Math.floor(10 + params.complexity * 50);

    for (let i = 0; i < bladeCount; i++) {
      const blade = this.generateGrassBlade(params.variation);

      // Position randomly
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 0.5;
      blade.translate(
        Math.cos(angle) * distance,
        0,
        Math.sin(angle) * distance
      );

      geometries.push(blade);
    }

    const { mergeGeometries } = require('three/examples/jsm/utils/BufferGeometryUtils.js');
    return mergeGeometries(geometries);
  }

  private generateGrassBlade(variation: number): THREE.BufferGeometry {
    const height = 0.5 + variation * 0.5;
    const width = 0.05;

    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(width / 2, 0);
    shape.lineTo(width / 4, height);
    shape.lineTo(0, height);
    shape.lineTo(-width / 4, height);
    shape.lineTo(-width / 2, 0);

    return new THREE.ShapeGeometry(shape);
  }

  private generateCloud(params: ProceduralMeshParams): THREE.BufferGeometry {
    // Volumetric cloud using metaballs or instanced spheres
    const sphereCount = Math.floor(10 + params.complexity * 30);
    const geometries: THREE.BufferGeometry[] = [];

    for (let i = 0; i < sphereCount; i++) {
      const radius = 1 + this.noise.noise2D(i * 0.1, 0) * params.variation * 2;
      const sphere = new THREE.SphereGeometry(radius, 8, 8);

      sphere.translate(
        this.noise.noise2D(i * 0.2, 1) * 5,
        this.noise.noise2D(i * 0.2, 2) * 2,
        this.noise.noise2D(i * 0.2, 3) * 5
      );

      geometries.push(sphere);
    }

    const { mergeGeometries } = require('three/examples/jsm/utils/BufferGeometryUtils.js');
    return mergeGeometries(geometries);
  }
}
