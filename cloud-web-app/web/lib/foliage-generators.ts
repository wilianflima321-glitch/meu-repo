// @aethel-heavy-async-boundary Studio/render-gated runtime; do not import from public route shells.
/**
 * Procedural foliage generators.
 */

import * as THREE from 'three';

// ============================================================================
// GRASS GENERATOR
// ============================================================================

export class GrassGenerator {
  static createGrassBlade(
    height: number = 0.5,
    width: number = 0.05,
    segments: number = 3
  ): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();

    const vertices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const segmentHeight = height / segments;

    for (let i = 0; i <= segments; i++) {
      const y = i * segmentHeight;
      const w = width * (1 - i / segments); // Taper toward top

      // Left vertex
      vertices.push(-w / 2, y, 0);
      normals.push(0, 0, 1);
      uvs.push(0, i / segments);

      // Right vertex
      vertices.push(w / 2, y, 0);
      normals.push(0, 0, 1);
      uvs.push(1, i / segments);
    }

    // Create triangles
    for (let i = 0; i < segments; i++) {
      const base = i * 2;
      indices.push(base, base + 1, base + 2);
      indices.push(base + 1, base + 3, base + 2);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);

    return geometry;
  }

  static createGrassClump(
    bladeCount: number = 5,
    spread: number = 0.1
  ): THREE.BufferGeometry {
    const geometries: THREE.BufferGeometry[] = [];

    for (let i = 0; i < bladeCount; i++) {
      const blade = this.createGrassBlade(
        0.3 + Math.random() * 0.4,
        0.03 + Math.random() * 0.02
      );

      // Random position and rotation
      const matrix = new THREE.Matrix4();
      matrix.makeRotationY(Math.random() * Math.PI * 2);
      matrix.setPosition(
        (Math.random() - 0.5) * spread,
        0,
        (Math.random() - 0.5) * spread
      );

      blade.applyMatrix4(matrix);
      geometries.push(blade);
    }

    // Merge geometries
    return this.mergeGeometries(geometries);
  }

  private static mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
    const merged = new THREE.BufferGeometry();

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    let indexOffset = 0;

    for (const geometry of geometries) {
      const pos = geometry.getAttribute('position');
      const norm = geometry.getAttribute('normal');
      const uv = geometry.getAttribute('uv');
      const idx = geometry.getIndex();

      for (let i = 0; i < pos.count; i++) {
        positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
        normals.push(norm.getX(i), norm.getY(i), norm.getZ(i));
        uvs.push(uv.getX(i), uv.getY(i));
      }

      if (idx) {
        for (let i = 0; i < idx.count; i++) {
          indices.push(idx.getX(i) + indexOffset);
        }
      }

      indexOffset += pos.count;
    }

    merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    merged.setIndex(indices);

    return merged;
  }
}

// ============================================================================
// TREE GENERATOR
// ============================================================================

export class TreeGenerator {
  static createSimpleTree(
    trunkHeight: number = 3,
    trunkRadius: number = 0.2,
    canopyRadius: number = 2,
    canopyHeight: number = 3
  ): THREE.Group {
    const tree = new THREE.Group();

    // Trunk
    const trunkGeometry = new THREE.CylinderGeometry(
      trunkRadius * 0.7,
      trunkRadius,
      trunkHeight,
      8
    );
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3728,
      roughness: 0.9,
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    tree.add(trunk);

    // Canopy
    const canopyGeometry = new THREE.ConeGeometry(canopyRadius, canopyHeight, 8);
    const canopyMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d5a1e,
      roughness: 0.8,
    });
    const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
    canopy.position.y = trunkHeight + canopyHeight / 2;
    canopy.castShadow = true;
    tree.add(canopy);

    return tree;
  }

  static createPineTree(
    height: number = 8,
    baseRadius: number = 2,
    levels: number = 4
  ): THREE.Group {
    const tree = new THREE.Group();

    // Trunk
    const trunkHeight = height * 0.3;
    const trunkGeometry = new THREE.CylinderGeometry(0.15, 0.25, trunkHeight, 6);
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3728,
      roughness: 0.9,
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    tree.add(trunk);

    // Foliage levels
    const foliageMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a4a1a,
      roughness: 0.8,
    });

    const foliageHeight = height - trunkHeight;
    const levelHeight = foliageHeight / levels;

    for (let i = 0; i < levels; i++) {
      const radius = baseRadius * (1 - i / (levels + 1));
      const coneHeight = levelHeight * 1.5;

      const coneGeometry = new THREE.ConeGeometry(radius, coneHeight, 8);
      const cone = new THREE.Mesh(coneGeometry, foliageMaterial);
      cone.position.y = trunkHeight + i * levelHeight + coneHeight / 2;
      cone.castShadow = true;
      tree.add(cone);
    }

    return tree;
  }
}
