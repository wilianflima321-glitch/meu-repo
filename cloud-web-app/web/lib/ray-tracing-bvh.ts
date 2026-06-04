// @aethel-heavy-async-boundary Studio/ray-tracing BVH runtime; do not import from public route shells.
import * as THREE from 'three';
import type { BVHNode, RTMaterial, Triangle } from './ray-tracing-contracts';

export class BVHBuilder {
  private triangles: Triangle[] = [];
  private nodes: BVHNode[] = [];
  private materials: RTMaterial[] = [];

  private maxTrianglesPerLeaf: number = 4;
  private maxDepth: number = 32;

  build(meshes: THREE.Mesh[]): void {
    this.triangles = [];
    this.nodes = [];
    this.materials = [];

    // Extract triangles from meshes
    for (const mesh of meshes) {
      this.extractTriangles(mesh);
    }

    if (this.triangles.length === 0) return;

    // Build BVH
    const indices = this.triangles.map((_, i) => i);
    this.buildNode(indices, 0);
  }

  private extractTriangles(mesh: THREE.Mesh): void {
    const geometry = mesh.geometry;
    if (!geometry) return;

    const positionAttr = geometry.getAttribute('position');
    const normalAttr = geometry.getAttribute('normal');
    const indexAttr = geometry.getIndex();

    if (!positionAttr) return;

    // Get material
    const materialIndex = this.materials.length;
    const mat = mesh.material as THREE.MeshStandardMaterial;

    this.materials.push({
      albedo: mat.color?.clone() ?? new THREE.Color(1, 1, 1),
      roughness: mat.roughness ?? 0.5,
      metalness: mat.metalness ?? 0,
      emissive: mat.emissive?.clone() ?? new THREE.Color(0, 0, 0),
      emissiveIntensity: mat.emissiveIntensity ?? 0
    });

    // Transform matrix
    mesh.updateMatrixWorld();
    const matrix = mesh.matrixWorld;
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix);

    const getVertex = (index: number): THREE.Vector3 => {
      const v = new THREE.Vector3(
        positionAttr.getX(index),
        positionAttr.getY(index),
        positionAttr.getZ(index)
      );
      return v.applyMatrix4(matrix);
    };

    const getNormal = (index: number): THREE.Vector3 => {
      if (!normalAttr) return new THREE.Vector3(0, 1, 0);
      const n = new THREE.Vector3(
        normalAttr.getX(index),
        normalAttr.getY(index),
        normalAttr.getZ(index)
      );
      return n.applyMatrix3(normalMatrix).normalize();
    };

    if (indexAttr) {
      for (let i = 0; i < indexAttr.count; i += 3) {
        const i0 = indexAttr.getX(i);
        const i1 = indexAttr.getX(i + 1);
        const i2 = indexAttr.getX(i + 2);

        this.triangles.push({
          v0: getVertex(i0),
          v1: getVertex(i1),
          v2: getVertex(i2),
          n0: getNormal(i0),
          n1: getNormal(i1),
          n2: getNormal(i2),
          materialIndex
        });
      }
    } else {
      for (let i = 0; i < positionAttr.count; i += 3) {
        this.triangles.push({
          v0: getVertex(i),
          v1: getVertex(i + 1),
          v2: getVertex(i + 2),
          n0: getNormal(i),
          n1: getNormal(i + 1),
          n2: getNormal(i + 2),
          materialIndex
        });
      }
    }
  }

  private buildNode(indices: number[], depth: number): number {
    const nodeIndex = this.nodes.length;

    // Calculate bounding box
    const bbox = new THREE.Box3();
    for (const idx of indices) {
      const tri = this.triangles[idx];
      bbox.expandByPoint(tri.v0);
      bbox.expandByPoint(tri.v1);
      bbox.expandByPoint(tri.v2);
    }

    const node: BVHNode = {
      boundingBox: bbox,
      leftChild: null,
      rightChild: null,
      triangleStart: 0,
      triangleCount: 0
    };

    this.nodes.push(node);

    // Leaf node check
    if (indices.length <= this.maxTrianglesPerLeaf || depth >= this.maxDepth) {
      node.triangleStart = indices[0];
      node.triangleCount = indices.length;
      return nodeIndex;
    }

    // Find split axis (largest extent)
    const extent = new THREE.Vector3();
    bbox.getSize(extent);

    let splitAxis = 0;
    if (extent.y > extent.x) splitAxis = 1;
    if (extent.z > (splitAxis === 0 ? extent.x : extent.y)) splitAxis = 2;

    // Sort triangles along split axis
    const centroid = (tri: Triangle): number => {
      const c = tri.v0.clone().add(tri.v1).add(tri.v2).divideScalar(3);
      return splitAxis === 0 ? c.x : splitAxis === 1 ? c.y : c.z;
    };

    indices.sort((a, b) => centroid(this.triangles[a]) - centroid(this.triangles[b]));

    // Split
    const mid = Math.floor(indices.length / 2);
    const leftIndices = indices.slice(0, mid);
    const rightIndices = indices.slice(mid);

    // Recursively build children
    node.leftChild = this.buildNode(leftIndices, depth + 1);
    node.rightChild = this.buildNode(rightIndices, depth + 1);

    return nodeIndex;
  }

  getNodes(): BVHNode[] {
    return this.nodes;
  }

  getTriangles(): Triangle[] {
    return this.triangles;
  }

  getMaterials(): RTMaterial[] {
    return this.materials;
  }

  // Create data textures for GPU
  createDataTextures(): {
    bvhTexture: THREE.DataTexture;
    triangleTexture: THREE.DataTexture;
    materialTexture: THREE.DataTexture;
  } {
    // BVH texture: each node needs 8 floats (bbox min, bbox max, children/triangle info)
    const bvhSize = Math.ceil(Math.sqrt(this.nodes.length * 2));
    const bvhData = new Float32Array(bvhSize * bvhSize * 4);

    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      const baseIdx = i * 8;

      // First texel: bbox min + left child
      bvhData[baseIdx + 0] = node.boundingBox.min.x;
      bvhData[baseIdx + 1] = node.boundingBox.min.y;
      bvhData[baseIdx + 2] = node.boundingBox.min.z;
      bvhData[baseIdx + 3] = node.leftChild ?? -1;

      // Second texel: bbox max + right child
      bvhData[baseIdx + 4] = node.boundingBox.max.x;
      bvhData[baseIdx + 5] = node.boundingBox.max.y;
      bvhData[baseIdx + 6] = node.boundingBox.max.z;
      bvhData[baseIdx + 7] = node.rightChild ?? -1;
    }

    const bvhTexture = new THREE.DataTexture(
      bvhData, bvhSize, bvhSize,
      THREE.RGBAFormat, THREE.FloatType
    );
    bvhTexture.needsUpdate = true;

    // Triangle texture: each triangle needs 12 floats (3 vertices + 3 normals + material)
    const triSize = Math.ceil(Math.sqrt(this.triangles.length * 4));
    const triData = new Float32Array(triSize * triSize * 4);

    for (let i = 0; i < this.triangles.length; i++) {
      const tri = this.triangles[i];
      const baseIdx = i * 16;

      // Vertex 0 + material
      triData[baseIdx + 0] = tri.v0.x;
      triData[baseIdx + 1] = tri.v0.y;
      triData[baseIdx + 2] = tri.v0.z;
      triData[baseIdx + 3] = tri.materialIndex;

      // Vertex 1
      triData[baseIdx + 4] = tri.v1.x;
      triData[baseIdx + 5] = tri.v1.y;
      triData[baseIdx + 6] = tri.v1.z;
      triData[baseIdx + 7] = 0;

      // Vertex 2
      triData[baseIdx + 8] = tri.v2.x;
      triData[baseIdx + 9] = tri.v2.y;
      triData[baseIdx + 10] = tri.v2.z;
      triData[baseIdx + 11] = 0;

      // Normals (packed)
      triData[baseIdx + 12] = tri.n0.x;
      triData[baseIdx + 13] = tri.n0.y;
      triData[baseIdx + 14] = tri.n0.z;
      triData[baseIdx + 15] = 0;
    }

    const triangleTexture = new THREE.DataTexture(
      triData, triSize, triSize,
      THREE.RGBAFormat, THREE.FloatType
    );
    triangleTexture.needsUpdate = true;

    // Material texture
    const matSize = Math.ceil(Math.sqrt(this.materials.length * 2));
    const matData = new Float32Array(matSize * matSize * 4);

    for (let i = 0; i < this.materials.length; i++) {
      const mat = this.materials[i];
      const baseIdx = i * 8;

      matData[baseIdx + 0] = mat.albedo.r;
      matData[baseIdx + 1] = mat.albedo.g;
      matData[baseIdx + 2] = mat.albedo.b;
      matData[baseIdx + 3] = mat.roughness;

      matData[baseIdx + 4] = mat.emissive.r * mat.emissiveIntensity;
      matData[baseIdx + 5] = mat.emissive.g * mat.emissiveIntensity;
      matData[baseIdx + 6] = mat.emissive.b * mat.emissiveIntensity;
      matData[baseIdx + 7] = mat.metalness;
    }

    const materialTexture = new THREE.DataTexture(
      matData, matSize, matSize,
      THREE.RGBAFormat, THREE.FloatType
    );
    materialTexture.needsUpdate = true;

    return { bvhTexture, triangleTexture, materialTexture };
  }
}
