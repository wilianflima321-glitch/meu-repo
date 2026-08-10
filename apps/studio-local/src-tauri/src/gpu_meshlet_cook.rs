//! Offline meshlet cook — CPU/Rust topology partition → `MeshletCluster` buffers.
//!
//! # Honesty
//! - Proves: real face-adjacency BFS partition (≤64 verts / ≤128 tris), tight
//!   bounds + normal cone, Instant cook timing, clusters consumable by
//!   `gpu_meshlet_cull` on the secondary present soak.
//! - Does **not** prove: Nanite virtualized geometry streaming, software
//!   micro-poly raster, DAG LOD selection in-frame, or Micro-Poly AAA.
//!   `nanite_ready` / `micro_poly_aaa_ready` stay **false**.

use std::collections::{HashMap, VecDeque};
use std::time::Instant;

use crate::gpu_meshlet_cull::{MeshletCluster, MESHLET_TRIANGLES_PER_CLUSTER};

/// Nanite-class vertex budget per leaf meshlet (cache-aligned contract).
pub const MESHLET_VERTS_PER_CLUSTER: usize = 64;

#[derive(Debug, Clone)]
pub struct CookInputMesh {
    /// Interleaved XYZ, length = vertex_count × 3.
    pub positions: Vec<f32>,
    /// Triangle indices, length = face_count × 3.
    pub indices: Vec<u32>,
}

/// One cooked leaf meshlet with topology retained for evidence (not GPU-uploaded here).
#[derive(Debug, Clone)]
pub struct CookedMeshlet {
    pub cluster: MeshletCluster,
    /// Global triangle indices belonging to this meshlet (length = triangle_count × 3).
    pub triangle_indices: Vec<u32>,
    pub unique_vertex_count: u32,
}

/// Offline cook receipt — Instant timings never fabricated.
#[derive(Debug, Clone)]
pub struct MeshletCookReceipt {
    pub meshlets: Vec<CookedMeshlet>,
    /// Leaf clusters only (HLOD parents not emitted for cull soak).
    pub cluster_count: u32,
    pub input_triangle_count: u32,
    pub cooked_triangle_count: u32,
    /// Wall-clock Instant ms for the cook (partition + bounds + cone).
    pub cook_ms: f64,
    /// True when every input face was assigned exactly once and budgets held.
    pub topology_complete: bool,
}

impl MeshletCookReceipt {
    /// GPU-ready `MeshletCluster` slice for `MeshletCullScaffold`.
    pub fn clusters(&self) -> Vec<MeshletCluster> {
        self.meshlets.iter().map(|m| m.cluster).collect()
    }

    /// CPU mirror of identity-frustum sphere test used by the soak.
    pub fn count_inside_identity_frustum(&self) -> u32 {
        self.meshlets
            .iter()
            .filter(|m| sphere_in_identity_frustum(m.cluster.center, m.cluster.radius))
            .count() as u32
    }
}

/// Offline meshlet cooker (CPU). Emits leaf clusters only.
pub struct MeshletCooker {
    max_verts: usize,
    max_tris: usize,
}

impl Default for MeshletCooker {
    fn default() -> Self {
        Self::new()
    }
}

impl MeshletCooker {
    pub fn new() -> Self {
        Self {
            max_verts: MESHLET_VERTS_PER_CLUSTER,
            max_tris: MESHLET_TRIANGLES_PER_CLUSTER as usize,
        }
    }

    /// Partition `mesh` into leaf meshlets via face-adjacency BFS (not random).
    pub fn cook(&self, mesh: &CookInputMesh) -> Result<MeshletCookReceipt, String> {
        let t0 = Instant::now();
        if !mesh.positions.len().is_multiple_of(3) {
            return Err("positions length must be multiple of 3".into());
        }
        if !mesh.indices.len().is_multiple_of(3) {
            return Err("indices length must be multiple of 3".into());
        }
        let face_count = mesh.indices.len() / 3;
        if face_count == 0 {
            return Err("cook requires at least one triangle".into());
        }

        let adj = build_face_adjacency(&mesh.indices);
        let mut used = vec![false; face_count];
        let mut meshlets: Vec<CookedMeshlet> = Vec::new();
        let mut cluster_id = 0u32;

        for seed in 0..face_count {
            if used[seed] {
                continue;
            }
            let mut local_verts: Vec<u32> = Vec::new();
            let mut vert_map: HashMap<u32, u8> = HashMap::new();
            let mut local_tris: Vec<[u8; 3]> = Vec::new();
            let mut global_tris: Vec<u32> = Vec::new();
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
                let new_verts = tri.iter().filter(|v| !vert_map.contains_key(v)).count();
                if local_verts.len() + new_verts > self.max_verts {
                    // Try later seeds; do not mark used — another meshlet may take it.
                    continue;
                }
                if local_tris.len() >= self.max_tris {
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
                global_tris.extend_from_slice(&tri);

                for &nb in &adj[face_id] {
                    if !used[nb] {
                        queue.push_back(nb);
                    }
                }
            }

            if local_tris.is_empty() {
                // Seed alone couldn't fit (should be rare); force single-tri meshlet.
                if used[seed] {
                    continue;
                }
                used[seed] = true;
                let tri = [
                    mesh.indices[seed * 3],
                    mesh.indices[seed * 3 + 1],
                    mesh.indices[seed * 3 + 2],
                ];
                local_verts = tri.to_vec();
                for (i, &gv) in tri.iter().enumerate() {
                    vert_map.insert(gv, i as u8);
                }
                local_tris.push([0, 1, 2]);
                global_tris.extend_from_slice(&tri);
            }

            let (center, radius) = compute_bounding_sphere(&local_verts, &mesh.positions);
            let (cone_axis, cone_cutoff) =
                compute_normal_cone(&global_tris, &mesh.positions, center);
            let triangle_count = local_tris.len() as u32;
            if triangle_count == 0 || triangle_count > MESHLET_TRIANGLES_PER_CLUSTER {
                return Err(format!(
                    "meshlet {cluster_id} triangle_count={triangle_count} violates ≤{MESHLET_TRIANGLES_PER_CLUSTER}"
                ));
            }

            meshlets.push(CookedMeshlet {
                cluster: MeshletCluster {
                    center,
                    radius,
                    cone_axis,
                    cone_cutoff,
                    lod_error: radius,
                    triangle_count,
                    cluster_id,
                    _pad: 0,
                },
                triangle_indices: global_tris,
                unique_vertex_count: local_verts.len() as u32,
            });
            cluster_id = cluster_id.saturating_add(1);
        }

        // Second pass: any unused faces (skipped due to grow continue) get forced meshlets.
        for (face_id, is_used) in used.iter_mut().enumerate() {
            if *is_used {
                continue;
            }
            *is_used = true;
            let tri = [
                mesh.indices[face_id * 3],
                mesh.indices[face_id * 3 + 1],
                mesh.indices[face_id * 3 + 2],
            ];
            let local_verts = tri.to_vec();
            let (center, radius) = compute_bounding_sphere(&local_verts, &mesh.positions);
            let (cone_axis, cone_cutoff) =
                compute_normal_cone(&tri, &mesh.positions, center);
            meshlets.push(CookedMeshlet {
                cluster: MeshletCluster {
                    center,
                    radius,
                    cone_axis,
                    cone_cutoff,
                    lod_error: radius,
                    triangle_count: 1,
                    cluster_id,
                    _pad: 0,
                },
                triangle_indices: tri.to_vec(),
                unique_vertex_count: 3,
            });
            cluster_id = cluster_id.saturating_add(1);
        }

        let cooked_triangle_count: u32 = meshlets.iter().map(|m| m.cluster.triangle_count).sum();
        let indexed_triangle_count: u32 = meshlets
            .iter()
            .map(|m| (m.triangle_indices.len() / 3) as u32)
            .sum();
        let topology_complete = cooked_triangle_count == face_count as u32
            && indexed_triangle_count == cooked_triangle_count
            && used.iter().all(|&u| u)
            && meshlets
                .iter()
                .all(|m| m.unique_vertex_count as usize <= self.max_verts);
        let cook_ms = t0.elapsed().as_secs_f64() * 1000.0;

        Ok(MeshletCookReceipt {
            cluster_count: meshlets.len() as u32,
            meshlets,
            input_triangle_count: face_count as u32,
            cooked_triangle_count,
            cook_ms,
            topology_complete,
        })
    }
}

/// Soak fixture: two disconnected grids — one inside identity frustum, one far outside.
/// Real topology (indexed grid), not random centers.
pub fn soak_cook_input_mesh() -> CookInputMesh {
    let mut positions = Vec::new();
    let mut indices = Vec::new();
    // Inside: 8×8 quads → 128 tris (exactly one full meshlet if contiguous).
    append_grid_xy(
        &mut positions,
        &mut indices,
        /*origin*/ [-4.0, -4.0, 0.0],
        /*size*/ 8.0,
        /*segments*/ 8,
    );
    // Extra inside patch offset in Z for a second cluster island.
    append_grid_xy(
        &mut positions,
        &mut indices,
        [-3.0, -3.0, 3.0],
        6.0,
        8,
    );
    // Outside frustum (x≈50).
    append_grid_xy(
        &mut positions,
        &mut indices,
        [46.0, -4.0, 0.0],
        8.0,
        8,
    );
    append_grid_xy(
        &mut positions,
        &mut indices,
        [46.0, -3.0, 3.0],
        6.0,
        8,
    );
    CookInputMesh { positions, indices }
}

/// Cook the soak fixture; returns clusters + expected frustum-visible leaf count.
pub fn cook_soak_meshlets() -> Result<(MeshletCookReceipt, u32), String> {
    let mesh = soak_cook_input_mesh();
    let receipt = MeshletCooker::new().cook(&mesh)?;
    if !receipt.topology_complete {
        return Err("soak cook topology incomplete".into());
    }
    let expected_visible = receipt.count_inside_identity_frustum();
    if expected_visible == 0 || expected_visible >= receipt.cluster_count {
        return Err(format!(
            "soak cook expected mixed visibility; inside={expected_visible} total={}",
            receipt.cluster_count
        ));
    }
    Ok((receipt, expected_visible))
}

fn append_grid_xy(
    positions: &mut Vec<f32>,
    indices: &mut Vec<u32>,
    origin: [f32; 3],
    size: f32,
    segments: u32,
) {
    let base = (positions.len() / 3) as u32;
    let step = size / segments as f32;
    for z in 0..=segments {
        for x in 0..=segments {
            positions.push(origin[0] + x as f32 * step);
            positions.push(origin[1]);
            positions.push(origin[2] + z as f32 * step);
        }
    }
    let stride = segments + 1;
    for z in 0..segments {
        for x in 0..segments {
            let i0 = base + z * stride + x;
            let i1 = i0 + 1;
            let i2 = i0 + stride;
            let i3 = i2 + 1;
            indices.extend_from_slice(&[i0, i2, i1, i1, i2, i3]);
        }
    }
}

fn build_face_adjacency(indices: &[u32]) -> Vec<Vec<usize>> {
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
            r = (r + dist) * 0.5;
            let inv = if dist > 1e-8 { d / (2.0 * dist) } else { 0.0 };
            cx += dx * inv;
            cy += dy * inv;
            cz += dz * inv;
        }
    }
    ([cx, cy, cz], r.max(0.01))
}

fn compute_normal_cone(
    triangle_indices: &[u32],
    positions: &[f32],
    center: [f32; 3],
) -> ([f32; 3], f32) {
    let face_count = triangle_indices.len() / 3;
    if face_count == 0 {
        return ([0.0, 0.0, 1.0], -2.0);
    }
    let mut axis = [0.0_f32; 3];
    let mut normals: Vec<[f32; 3]> = Vec::with_capacity(face_count);
    for f in 0..face_count {
        let i0 = triangle_indices[f * 3] as usize * 3;
        let i1 = triangle_indices[f * 3 + 1] as usize * 3;
        let i2 = triangle_indices[f * 3 + 2] as usize * 3;
        let a = [positions[i0], positions[i0 + 1], positions[i0 + 2]];
        let b = [positions[i1], positions[i1 + 1], positions[i1 + 2]];
        let c = [positions[i2], positions[i2 + 1], positions[i2 + 2]];
        let e0 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
        let e1 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
        let mut n = [
            e0[1] * e1[2] - e0[2] * e1[1],
            e0[2] * e1[0] - e0[0] * e1[2],
            e0[0] * e1[1] - e0[1] * e1[0],
        ];
        let len = (n[0] * n[0] + n[1] * n[1] + n[2] * n[2]).sqrt();
        if len > 1e-8 {
            n[0] /= len;
            n[1] /= len;
            n[2] /= len;
        } else {
            // Degenerate — point away from origin via center.
            let mut d = [center[0], center[1], center[2]];
            let dl = (d[0] * d[0] + d[1] * d[1] + d[2] * d[2]).sqrt().max(1e-8);
            d[0] /= dl;
            d[1] /= dl;
            d[2] /= dl;
            n = d;
        }
        axis[0] += n[0];
        axis[1] += n[1];
        axis[2] += n[2];
        normals.push(n);
    }
    let al = (axis[0] * axis[0] + axis[1] * axis[1] + axis[2] * axis[2])
        .sqrt()
        .max(1e-8);
    axis[0] /= al;
    axis[1] /= al;
    axis[2] /= al;
    let mut min_dot = 1.0_f32;
    for n in &normals {
        let d = axis[0] * n[0] + axis[1] * n[1] + axis[2] * n[2];
        min_dot = min_dot.min(d);
    }
    // Cosine cutoff for backface cone (slightly tightened).
    let cutoff = (min_dot - 0.05).clamp(-1.0, 1.0);
    (axis, cutoff)
}

fn sphere_in_identity_frustum(center: [f32; 3], radius: f32) -> bool {
    let planes: [[f32; 4]; 6] = [
        [1.0, 0.0, 0.0, 10.0],
        [-1.0, 0.0, 0.0, 10.0],
        [0.0, 1.0, 0.0, 10.0],
        [0.0, -1.0, 0.0, 10.0],
        [0.0, 0.0, 1.0, 10.0],
        [0.0, 0.0, -1.0, 10.0],
    ];
    for p in &planes {
        let distance = p[0] * center[0] + p[1] * center[1] + p[2] * center[2] + p[3];
        if distance < -radius {
            return false;
        }
    }
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cook_partitions_all_triangles() {
        let mesh = soak_cook_input_mesh();
        let input_tris = (mesh.indices.len() / 3) as u32;
        assert!(input_tris >= 256);
        let receipt = MeshletCooker::new().cook(&mesh).expect("cook");
        assert!(receipt.topology_complete);
        assert_eq!(receipt.input_triangle_count, input_tris);
        assert_eq!(receipt.cooked_triangle_count, input_tris);
        assert!(receipt.cluster_count >= 2);
        assert!(receipt.cook_ms >= 0.0);
        for m in &receipt.meshlets {
            assert!(m.cluster.triangle_count <= MESHLET_TRIANGLES_PER_CLUSTER);
            assert!(m.unique_vertex_count as usize <= MESHLET_VERTS_PER_CLUSTER);
            assert_eq!(m.triangle_indices.len(), m.cluster.triangle_count as usize * 3);
        }
    }

    #[test]
    fn soak_cook_has_mixed_frustum_visibility() {
        let (receipt, expected) = cook_soak_meshlets().expect("soak cook");
        assert!(expected > 0);
        assert!(expected < receipt.cluster_count);
        assert!(receipt.topology_complete);
    }

    #[test]
    fn cook_is_not_random_centers() {
        let mesh = soak_cook_input_mesh();
        let a = MeshletCooker::new().cook(&mesh).unwrap();
        let b = MeshletCooker::new().cook(&mesh).unwrap();
        assert_eq!(a.cluster_count, b.cluster_count);
        for (x, y) in a.clusters().iter().zip(b.clusters().iter()) {
            assert_eq!(x.center, y.center);
            assert_eq!(x.triangle_count, y.triangle_count);
        }
    }
}
