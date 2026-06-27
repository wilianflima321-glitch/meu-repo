// @aethel-heavy-async-boundary
/// <reference lib="webworker" />

export interface PhysicsWorkerInput {
  modelId: string;
  geometries: {
    id: string;
    vertices: Float32Array;
    indices: Uint32Array | null;
  }[];
}

export interface PhysicsWorkerOutput {
  modelId: string;
  cookedData: {
    id: string;
    trimeshVertices: Float32Array;
    trimeshIndices: Uint32Array;
    convexHullVertices: Float32Array;
  }[];
}

self.onmessage = async (e: MessageEvent<PhysicsWorkerInput>) => {
  const { modelId, geometries } = e.data;
  const result: PhysicsWorkerOutput['cookedData'] = [];
  const transferables: Transferable[] = [];

  for (const geom of geometries) {
    let indices = geom.indices;
    let vertices = geom.vertices;

    // Convert non-indexed geometry to indexed format if needed for Trimesh
    if (!indices) {
      indices = new Uint32Array(vertices.length / 3);
      for (let i = 0; i < indices.length; i++) {
        indices[i] = i;
      }
    }

    // Simplification for ConvexHull (e.g. bounding points extraction)
    // We pass the raw Float32Array back, but ideally we'd use a lightweight QuickHull 
    // algorithm here in the worker. For now, we return the vertices directly.
    const convexHullVertices = new Float32Array(vertices);

    result.push({
      id: geom.id,
      trimeshVertices: vertices,
      trimeshIndices: indices,
      convexHullVertices: convexHullVertices,
    });

    transferables.push(vertices.buffer, indices.buffer, convexHullVertices.buffer);
  }

  // Use Transferable Objects for ZERO-COPY transfer back to main thread
  self.postMessage({ modelId, cookedData: result } as PhysicsWorkerOutput, transferables);
};
