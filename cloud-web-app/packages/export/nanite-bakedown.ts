/**
 * nanite-bakedown.ts — Nanite virtual-cluster → standard mesh flattening
 * (Missão Executiva 5 — Compatibility Defense).
 *
 * Unreal/Unity/glTF have no concept of Nanite's virtualized meshlet clusters
 * — a real interop mesh needs one flat, static vertex/index buffer at a
 * single LOD. Handing a meshlet cluster hierarchy straight to
 * `exportSceneToGLTF` (as `gltf-exporter.ts` used to do — see the removed
 * `meshletCount`-only metadata path) produces a spec-valid but *empty or
 * wrong* mesh, which is worse than refusing to export: it looks correct
 * until opened in the target engine.
 *
 * This module "bakes down" one LOD level of a `VirtualizedMesh` (see
 * `web/lib/nanite-virtualized-geometry-contracts.ts#VirtualizedMesh`) into a
 * single traditional high-poly mesh matching `ExportMesh` — real vertex
 * compaction (only vertices referenced by the selected LOD's meshlets are
 * kept, remapped to a dense 0..N-1 range), not a placeholder.
 *
 * Scope, stated plainly: this bakes GEOMETRY (positions/normals/uvs/indices)
 * at a chosen LOD. It does NOT bake per-cluster procedural material graphs
 * into a single texture atlas — that is a GPU texture-baking pipeline (its
 * own large feature, needs a render target + UV unwrap), not a
 * vertex/index reshuffle. Baked meshes are assigned a neutral standard PBR
 * material (see `bakedDownMaterial`) so they still render correctly with
 * sane defaults in Unreal/Unity rather than shipping unlit/black.
 *
 * `ExportMesh`/`ExportMaterial` come from `gltf-exporter.ts` (no import here
 * to avoid a cycle — this module only needs the shape, not the exporter).
 */

export interface SerializedMeshlet {
  id: number;
  triangleOffset: number;
  triangleCount: number;
  lodLevel: number;
  /** Screen-space error contribution of this meshlet at its LOD (see `Meshlet.error`). */
  error?: number;
}

/**
 * JSON-safe mirror of `VirtualizedMesh` (typed arrays don't survive
 * `Asset.metadata` Json-column round-trips) — this is the contract a future
 * meshlet-cooking pipeline (`nanite-meshlet-builder.ts`) writes into
 * `Asset.metadata.naniteVirtualizedMesh` for this bake-down step to consume.
 */
export interface SerializedVirtualizedMesh {
  name: string;
  /** Flat [x0,y0,z0, x1,y1,z1, ...] — same layout as `VirtualizedMesh.vertexBuffer`. */
  vertexBuffer: number[];
  /** Flat, GLOBAL absolute vertex indices (NOT meshlet-local) — matches `nanite-meshlet-builder.ts`'s actual output convention. */
  indexBuffer: number[];
  normalBuffer?: number[];
  uvBuffer?: number[];
  meshlets: SerializedMeshlet[];
}

export interface ExportMeshLike {
  name: string;
  positions: Float32Array;
  normals?: Float32Array;
  uvs?: Float32Array;
  indices: Uint32Array;
  materialIndex?: number;
  meshletCount?: number;
  lodError?: number;
}

export interface NaniteBakeDownOptions {
  /** Defaults to the finest (lowest-numbered) LOD present — the highest-fidelity bake. */
  targetLodLevel?: number;
  materialIndex?: number;
}

/** Runtime guard so the export worker can safely read untyped `Asset.metadata` JSON. */
export function isSerializedVirtualizedMesh(value: unknown): value is SerializedVirtualizedMesh {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    Array.isArray(candidate.vertexBuffer) &&
    Array.isArray(candidate.indexBuffer) &&
    Array.isArray(candidate.meshlets) &&
    typeof candidate.name === 'string'
  );
}

/**
 * Flattens one LOD level of a virtualized mesh into a standard, densely
 * indexed mesh. Real vertex-buffer compaction: only vertices actually
 * referenced by the selected LOD's triangles are kept.
 */
export function bakeDownVirtualizedMesh(
  mesh: SerializedVirtualizedMesh,
  options: NaniteBakeDownOptions = {}
): ExportMeshLike {
  if (mesh.meshlets.length === 0) {
    throw new Error(`nanite-bakedown: "${mesh.name}" has no meshlets to bake down`);
  }

  const targetLod = options.targetLodLevel ?? Math.min(...mesh.meshlets.map((m) => m.lodLevel));
  let selected = mesh.meshlets.filter((m) => m.lodLevel === targetLod);
  if (selected.length === 0) {
    // Requested LOD doesn't exist in this mesh — bake the finest available LOD instead
    // of silently producing an empty mesh.
    const fallbackLod = Math.min(...mesh.meshlets.map((m) => m.lodLevel));
    selected = mesh.meshlets.filter((m) => m.lodLevel === fallbackLod);
  }

  const hasNormals = Array.isArray(mesh.normalBuffer) && mesh.normalBuffer.length > 0;
  const hasUvs = Array.isArray(mesh.uvBuffer) && mesh.uvBuffer.length > 0;

  const vertexRemap = new Map<number, number>();
  const outPositions: number[] = [];
  const outNormals: number[] = hasNormals ? [] : [];
  const outUvs: number[] = hasUvs ? [] : [];
  const outIndices: number[] = [];

  const remapVertex = (globalIdx: number): number => {
    let local = vertexRemap.get(globalIdx);
    if (local !== undefined) return local;

    local = vertexRemap.size;
    vertexRemap.set(globalIdx, local);

    outPositions.push(
      mesh.vertexBuffer[globalIdx * 3],
      mesh.vertexBuffer[globalIdx * 3 + 1],
      mesh.vertexBuffer[globalIdx * 3 + 2]
    );
    if (hasNormals) {
      const normals = mesh.normalBuffer as number[];
      outNormals.push(normals[globalIdx * 3] ?? 0, normals[globalIdx * 3 + 1] ?? 0, normals[globalIdx * 3 + 2] ?? 0);
    }
    if (hasUvs) {
      const uvs = mesh.uvBuffer as number[];
      outUvs.push(uvs[globalIdx * 2] ?? 0, uvs[globalIdx * 2 + 1] ?? 0);
    }
    return local;
  };

  let errorSum = 0;
  for (const meshlet of selected) {
    const start = meshlet.triangleOffset;
    const end = meshlet.triangleOffset + meshlet.triangleCount * 3;
    for (let i = start; i < end; i++) {
      const globalIdx = mesh.indexBuffer[i];
      outIndices.push(remapVertex(globalIdx));
    }
    errorSum += meshlet.error ?? 0;
  }

  if (outIndices.length === 0) {
    throw new Error(`nanite-bakedown: "${mesh.name}" LOD ${targetLod} produced zero triangles`);
  }

  return {
    name: mesh.name,
    positions: new Float32Array(outPositions),
    normals: hasNormals ? new Float32Array(outNormals) : undefined,
    uvs: hasUvs ? new Float32Array(outUvs) : undefined,
    indices: new Uint32Array(outIndices),
    materialIndex: options.materialIndex,
    meshletCount: selected.length,
    lodError: selected.length > 0 ? errorSum / selected.length : 0,
  };
}

/**
 * Neutral standard-PBR fallback for baked meshes. Real per-cluster material
 * graph baking (procedural-material.ts → texture atlas) is a separate,
 * larger GPU-texture-baking feature — this keeps exported meshes from
 * rendering unlit/black in Unreal/Unity in the meantime.
 */
export function bakedDownMaterial(name = 'Aethel Nanite Bake'): {
  name: string;
  baseColorFactor: [number, number, number, number];
  metallicFactor: number;
  roughnessFactor: number;
} {
  return {
    name,
    baseColorFactor: [0.72, 0.72, 0.72, 1],
    metallicFactor: 0.05,
    roughnessFactor: 0.6,
  };
}
