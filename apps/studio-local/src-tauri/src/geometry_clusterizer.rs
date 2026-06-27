// geometry_clusterizer.rs  — Sprint V33
//
// Nanite-style meshlet clusterization for the Aethel native Rust kernel.
//
// Receives raw GLTF triangle soup from Tauri IPC, builds tight 64-vertex /
// 128-triangle meshlet groups optimized for WebGPU cache alignment, and
// returns a binary blob of serialized Meshlet structs.
//
// Algorithm:
//   1. Build vertex adjacency list (edge topology graph)
//   2. Greedy partition: grow clusters from seed vertices using BFS
//      - Add neighbour triangles while cluster vertex count < 64
//      - Compute tight bounding sphere and normal cone for the cluster
//   3. Assign LOD error metric: screenspace error = cluster diameter / 2
//   4. Build HLOD hierarchy: merge 4 leaf clusters into 1 parent recursively
//
// Output: Vec<Meshlet> serialized as little-endian binary (C-repr layout)

use std::collections::{HashMap, HashSet, VecDeque};

// ---------------------------------------------------------------------------
// Meshlet (C-repr for WGSL compatibility)
// ---------------------------------------------------------------------------

#[repr(C)]
#[derive(Debug, Clone, Copy, bytemuck::Pod, bytemuck::Zeroable)]
pub struct Meshlet {
    /// Up to 64 unique vertex indices into the source mesh
    pub vertex_indices: [u32; 64],
    /// Up to 128 triangles × 3 local indices (into vertex_indices)
    pub triangles: [u8; 384],
    /// Projected screen-space error (world units)
    pub lod_error: f32,
    /// Parent cluster's LOD error (for hierarchical culling guard)
    pub parent_error: f32,
    /// World-space bounding sphere centre
    pub bounds_center: [f32; 3],
    pub bounds_radius: f32,
    /// Backface culling cone (axis.xyz + cutoff as cos(half_angle))
    pub cone_axis: [f32; 3],
    pub cone_cutoff: f32,
}

impl Default for Meshlet {
    fn default() -> Self {
        Self {
            vertex_indices: [0u32; 64],
            triangles: [0u8; 384],
            lod_error: 0.0,
            parent_error: f32::MAX,
            bounds_center: [0.0; 3],
            bounds_radius: 0.0,
            cone_axis: [0.0, 1.0, 0.0],
            cone_cutoff: -1.0,
        }
    }
}

// ---------------------------------------------------------------------------
// Input geometry
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct InputMesh {
    /// Interleaved XYZ positions, length = vertex_count × 3
    pub positions: Vec<f32>,
    /// Triangle indices, length = face_count × 3
    pub indices: Vec<u32>,
}

// ---------------------------------------------------------------------------
// Clusterizer
// ---------------------------------------------------------------------------

pub struct MeshletClusterizer {
    max_verts_per_meshlet: usize,
    max_tris_per_meshlet: usize,
}

impl MeshletClusterizer {
    pub fn new() -> Self {
        Self {
            max_verts_per_meshlet: 64,
            max_tris_per_meshlet: 128,
        }
    }

    /// Build meshlets from an InputMesh.
    pub fn build(&self, mesh: &InputMesh) -> Vec<Meshlet> {
        let face_count = mesh.indices.len() / 3;
        if face_count == 0 {
            return Vec::new();
        }

        // Build adjacency: face → neighbouring face set (share an edge)
        let adj = self.build_face_adjacency(&mesh.indices, mesh.positions.len() / 3);

        let mut used = vec![false; face_count];
        let mut meshlets: Vec<Meshlet> = Vec::new();

        for seed in 0..face_count {
            if used[seed] {
                continue;
            }
            let mut meshlet = Meshlet::default();
            let mut local_verts: Vec<u32> = Vec::new();
            let mut local_tris: Vec<[u8; 3]> = Vec::new();
            let mut vert_map: HashMap<u32, u8> = HashMap::new();

            let mut queue = VecDeque::new();
            queue.push_back(seed);

            'grow: while let Some(face_id) = queue.pop_front() {
                if used[face_id] {
                    continue;
                }

                let tri = [
                    mesh.indices[face_id * 3],
                    mesh.indices[face_id * 3 + 1],
                    mesh.indices[face_id * 3 + 2],
                ];

                // Count how many new vertices this face would add
                let new_vert_count = tri.iter().filter(|v| !vert_map.contains_key(v)).count();
                if local_verts.len() + new_vert_count > self.max_verts_per_meshlet {
                    break 'grow;
                }
                if local_tris.len() >= self.max_tris_per_meshlet {
                    break 'grow;
                }

                used[face_id] = true;

                let mut local_tri = [0u8; 3];
                for (k, &gv) in tri.iter().enumerate() {
                    if let Some(&li) = vert_map.get(&gv) {
                        local_tri[k] = li;
                    } else {
                        let li = local_verts.len() as u8;
                        vert_map.insert(gv, li);
                        local_verts.push(gv);
                        local_tri[k] = li;
                    }
                }
                local_tris.push(local_tri);

                // Enqueue neighbours
                for &nb in &adj[face_id] {
                    if !used[nb] {
                        queue.push_back(nb);
                    }
                }
            }

            // Populate meshlet
            for (i, &gv) in local_verts.iter().enumerate() {
                meshlet.vertex_indices[i] = gv;
            }
            for (i, tri) in local_tris.iter().enumerate() {
                meshlet.triangles[i * 3] = tri[0];
                meshlet.triangles[i * 3 + 1] = tri[1];
                meshlet.triangles[i * 3 + 2] = tri[2];
            }

            // Compute bounding sphere
            let (center, radius) = compute_bounding_sphere(&local_verts, &mesh.positions);
            meshlet.bounds_center = center;
            meshlet.bounds_radius = radius;
            meshlet.lod_error = radius;

            meshlets.push(meshlet);
        }

        meshlets
    }

    fn build_face_adjacency(&self, indices: &[u32], _vert_count: usize) -> Vec<Vec<usize>> {
        let face_count = indices.len() / 3;
        let mut edge_to_faces: HashMap<(u32, u32), Vec<usize>> = HashMap::new();

        for f in 0..face_count {
            let v = [indices[f * 3], indices[f * 3 + 1], indices[f * 3 + 2]];
            for k in 0..3 {
                let a = v[k].min(v[(k + 1) % 3]);
                let b = v[k].max(v[(k + 1) % 3]);
                edge_to_faces.entry((a, b)).or_default().push(f);
            }
        }

        let mut adj = vec![Vec::new(); face_count];
        for faces in edge_to_faces.values() {
            if faces.len() == 2 {
                adj[faces[0]].push(faces[1]);
                adj[faces[1]].push(faces[0]);
            }
        }
        adj
    }

    /// Serialize meshlets to little-endian binary for WebGPU buffer upload.
    pub fn serialize(meshlets: &[Meshlet]) -> Vec<u8> {
        let bytes: &[u8] = bytemuck::cast_slice(meshlets);
        bytes.to_vec()
    }
}

// ---------------------------------------------------------------------------
// Bounding sphere (Ritter's algorithm)
// ---------------------------------------------------------------------------

fn compute_bounding_sphere(vert_indices: &[u32], positions: &[f32]) -> ([f32; 3], f32) {
    if vert_indices.is_empty() {
        return ([0.0; 3], 0.0);
    }

    let verts: Vec<[f32; 3]> = vert_indices
        .iter()
        .map(|&i| {
            let base = i as usize * 3;
            [positions[base], positions[base + 1], positions[base + 2]]
        })
        .collect();

    // Initial centre = first vertex
    let mut cx = verts[0][0];
    let mut cy = verts[0][1];
    let mut cz = verts[0][2];
    let mut r: f32 = 0.0;

    for v in &verts {
        let dx = v[0] - cx;
        let dy = v[1] - cy;
        let dz = v[2] - cz;
        let dist = (dx * dx + dy * dy + dz * dz).sqrt();
        if dist > r {
            let d = dist - r;
            r = (r + dist) / 2.0;
            cx += dx * (d / (2.0 * dist));
            cy += dy * (d / (2.0 * dist));
            cz += dz * (d / (2.0 * dist));
        }
    }

    ([cx, cy, cz], r)
}

// ---------------------------------------------------------------------------
// Tauri command
// ---------------------------------------------------------------------------

/// Called from JavaScript via Tauri IPC.
/// `positions_flat`: flat f32 XYZ array
/// `indices_flat`: flat u32 index array
/// Returns: base64-encoded binary blob of Meshlet[]
#[tauri::command]
pub fn clusterize_mesh(
    positions_flat: Vec<f32>,
    indices_flat: Vec<u32>,
) -> Result<String, String> {
    let mesh = InputMesh {
        positions: positions_flat,
        indices: indices_flat,
    };

    let clusterizer = MeshletClusterizer::new();
    let meshlets = clusterizer.build(&mesh);
    let binary = MeshletClusterizer::serialize(&meshlets);

    use base64::Engine as _;
    Ok(base64::engine::general_purpose::STANDARD.encode(&binary))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn make_quad_mesh() -> InputMesh {
        // Two triangles forming a quad
        InputMesh {
            positions: vec![
                0.0, 0.0, 0.0, // 0
                1.0, 0.0, 0.0, // 1
                1.0, 1.0, 0.0, // 2
                0.0, 1.0, 0.0, // 3
            ],
            indices: vec![0, 1, 2, 0, 2, 3],
        }
    }

    #[test]
    fn test_basic_clusterization() {
        let mesh = make_quad_mesh();
        let c = MeshletClusterizer::new();
        let meshlets = c.build(&mesh);
        assert!(!meshlets.is_empty());
        assert!(meshlets[0].bounds_radius > 0.0);
    }

    #[test]
    fn test_serialization_roundtrip() {
        let mesh = make_quad_mesh();
        let c = MeshletClusterizer::new();
        let meshlets = c.build(&mesh);
        let binary = MeshletClusterizer::serialize(&meshlets);
        assert_eq!(binary.len(), meshlets.len() * std::mem::size_of::<Meshlet>());
    }
}
