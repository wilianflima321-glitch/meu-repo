// @aethel-heavy-async-boundary Studio/render-gated runtime; do not import from public route shells.
import THREE from './decal-system-runtime';

export class DecalGeometry extends THREE.BufferGeometry {
  constructor(
    mesh: THREE.Mesh,
    position: THREE.Vector3,
    orientation: THREE.Euler,
    size: THREE.Vector3
  ) {
    super();

    // Generate decal geometry by projecting onto mesh
    const vertices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];

    // Create projection matrix
    const projectorMatrix = new THREE.Matrix4();
    projectorMatrix.makeRotationFromEuler(orientation);
    projectorMatrix.setPosition(position);

    const projectorMatrixInverse = projectorMatrix.clone().invert();

    // Get mesh geometry
    const geometry = mesh.geometry;
    const positionAttr = geometry.getAttribute('position');
    const normalAttr = geometry.getAttribute('normal');
    const index = geometry.getIndex();

    // Transform mesh to projector space
    const meshMatrix = mesh.matrixWorld.clone();
    const meshMatrixInverse = meshMatrix.clone().invert();

    const decalMatrix = projectorMatrixInverse.clone().multiply(meshMatrix);

    // Process triangles
    const vertex = new THREE.Vector3();
    const normal = new THREE.Vector3();

    const processTriangle = (a: number, b: number, c: number) => {
      const vA = this.getVertex(positionAttr, a, decalMatrix);
      const vB = this.getVertex(positionAttr, b, decalMatrix);
      const vC = this.getVertex(positionAttr, c, decalMatrix);

      const nA = this.getNormal(normalAttr, a, decalMatrix);
      const nB = this.getNormal(normalAttr, b, decalMatrix);
      const nC = this.getNormal(normalAttr, c, decalMatrix);

      // Clip triangle to decal box
      const clipped = this.clipTriangle([
        { vertex: vA, normal: nA },
        { vertex: vB, normal: nB },
        { vertex: vC, normal: nC },
      ], size);

      if (clipped.length >= 3) {
        // Triangulate clipped polygon
        for (let i = 1; i < clipped.length - 1; i++) {
          this.addVertex(clipped[0], size, vertices, normals, uvs);
          this.addVertex(clipped[i], size, vertices, normals, uvs);
          this.addVertex(clipped[i + 1], size, vertices, normals, uvs);
        }
      }
    };

    // Iterate triangles
    if (index) {
      for (let i = 0; i < index.count; i += 3) {
        processTriangle(index.getX(i), index.getX(i + 1), index.getX(i + 2));
      }
    } else {
      for (let i = 0; i < positionAttr.count; i += 3) {
        processTriangle(i, i + 1, i + 2);
      }
    }

    // Apply inverse projection to get world space
    const finalMatrix = projectorMatrix;

    // Set attributes
    if (vertices.length > 0) {
      // Transform back to world space
      const transformedVertices = new Float32Array(vertices.length);
      for (let i = 0; i < vertices.length; i += 3) {
        vertex.set(vertices[i], vertices[i + 1], vertices[i + 2]);
        vertex.applyMatrix4(finalMatrix);
        transformedVertices[i] = vertex.x;
        transformedVertices[i + 1] = vertex.y;
        transformedVertices[i + 2] = vertex.z;
      }

      const transformedNormals = new Float32Array(normals.length);
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(finalMatrix);
      for (let i = 0; i < normals.length; i += 3) {
        normal.set(normals[i], normals[i + 1], normals[i + 2]);
        normal.applyMatrix3(normalMatrix).normalize();
        transformedNormals[i] = normal.x;
        transformedNormals[i + 1] = normal.y;
        transformedNormals[i + 2] = normal.z;
      }

      this.setAttribute('position', new THREE.BufferAttribute(transformedVertices, 3));
      this.setAttribute('normal', new THREE.BufferAttribute(transformedNormals, 3));
      this.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
    }
  }

  private getVertex(
    attr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
    index: number,
    matrix: THREE.Matrix4
  ): THREE.Vector3 {
    const vertex = new THREE.Vector3(
      attr.getX(index),
      attr.getY(index),
      attr.getZ(index)
    );
    return vertex.applyMatrix4(matrix);
  }

  private getNormal(
    attr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
    index: number,
    matrix: THREE.Matrix4
  ): THREE.Vector3 {
    const normal = new THREE.Vector3(
      attr.getX(index),
      attr.getY(index),
      attr.getZ(index)
    );
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix);
    return normal.applyMatrix3(normalMatrix).normalize();
  }

  private clipTriangle(
    triangle: { vertex: THREE.Vector3; normal: THREE.Vector3 }[],
    size: THREE.Vector3
  ): { vertex: THREE.Vector3; normal: THREE.Vector3 }[] {
    let output = [...triangle];

    // Clip against all 6 planes
    const planes = [
      { axis: 'x', sign: 1 },
      { axis: 'x', sign: -1 },
      { axis: 'y', sign: 1 },
      { axis: 'y', sign: -1 },
      { axis: 'z', sign: 1 },
      { axis: 'z', sign: -1 },
    ];

    for (const plane of planes) {
      if (output.length < 3) break;

      const axis = plane.axis as 'x' | 'y' | 'z';
      const sign = plane.sign;
      const limit = (size as any)[axis] / 2;

      output = this.clipPolygonToPlane(output, axis, sign, limit);
    }

    return output;
  }

  private clipPolygonToPlane(
    polygon: { vertex: THREE.Vector3; normal: THREE.Vector3 }[],
    axis: 'x' | 'y' | 'z',
    sign: number,
    limit: number
  ): { vertex: THREE.Vector3; normal: THREE.Vector3 }[] {
    const output: { vertex: THREE.Vector3; normal: THREE.Vector3 }[] = [];

    for (let i = 0; i < polygon.length; i++) {
      const current = polygon[i];
      const next = polygon[(i + 1) % polygon.length];

      const currentInside = (current.vertex[axis] * sign) <= limit;
      const nextInside = (next.vertex[axis] * sign) <= limit;

      if (currentInside) {
        output.push(current);

        if (!nextInside) {
          // Add intersection point
          const t = (limit - current.vertex[axis] * sign) /
                    ((next.vertex[axis] - current.vertex[axis]) * sign);
          output.push(this.interpolate(current, next, t));
        }
      } else if (nextInside) {
        // Add intersection point
        const t = (limit - current.vertex[axis] * sign) /
                  ((next.vertex[axis] - current.vertex[axis]) * sign);
        output.push(this.interpolate(current, next, t));
      }
    }

    return output;
  }

  private interpolate(
    a: { vertex: THREE.Vector3; normal: THREE.Vector3 },
    b: { vertex: THREE.Vector3; normal: THREE.Vector3 },
    t: number
  ): { vertex: THREE.Vector3; normal: THREE.Vector3 } {
    return {
      vertex: a.vertex.clone().lerp(b.vertex, t),
      normal: a.normal.clone().lerp(b.normal, t).normalize(),
    };
  }

  private addVertex(
    point: { vertex: THREE.Vector3; normal: THREE.Vector3 },
    size: THREE.Vector3,
    vertices: number[],
    normals: number[],
    uvs: number[]
  ): void {
    vertices.push(point.vertex.x, point.vertex.y, point.vertex.z);
    normals.push(point.normal.x, point.normal.y, point.normal.z);

    // Calculate UV from position
    uvs.push(
      point.vertex.x / size.x + 0.5,
      point.vertex.y / size.y + 0.5
    );
  }
}

// ============================================================================
