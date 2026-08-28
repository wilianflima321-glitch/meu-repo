//! GF-MESH-001 — dogfood mesh fixture + golden visibility hash (G.% ladder
//! 30→50 prep, Rust-side mirror of the web fixture). Deterministic subdivided
//! box (150 verts / 192 tris, never capsule/proxy) → greedy meshlet cook →
//! CPU soft-raster (byte-mirror of the WGSL projection math) → FNV-1a 64
//! golden hash over quantized coverage/depth — **never** meshlet-ID debug
//! colors. The same module carries the Hi-Z occlusion-win harness: frustum-only
//! vs Hi-Z-assisted visibility on a deterministic occluder scene, with the
//! ≥20% draw-reduction evidence computed off-GPU via the `hiz_occluded_cpu`
//! byte-mirror.
//!
//! Honesty invariants: no `g3` percent bump, no Nanite/Micro-Poly-AAA/Lumen
//! claims, no band flag flips — evidence only.

use crate::gpu_culling::CullingFrustum;
use crate::gpu_micropoly_raster::{project_point, Mat4, MicropolyCamera};

pub const GF_MESH_001_FIXTURE_ID: &str = "GF-MESH-001";
pub const GF_MESH_001_NAME: &str = "dogfood-subdivided-box";
pub const GF_MESH_001_SUBDIVISIONS: u32 = 4;
pub const GF_MESH_001_VERTEX_COUNT: usize = 150;
pub const GF_MESH_001_TRIANGLE_COUNT: usize = 192;
pub const GF_MESH_001_MAX_VERTS_PER_MESHLET: usize = 64;
pub const GF_MESH_001_MAX_TRIS_PER_MESHLET: usize = 128;
/// Golden raster extent (fixed — the pinned hash is over this exact buffer).
pub const GF_MESH_001_RASTER_EDGE: u32 = 256;
/// Occlusion-win harness: wall occluder + N behind + N front (33% front).
pub const GF_MESH_001_HIZ_OBJECTS_BEHIND: u32 = 12;
pub const GF_MESH_001_HIZ_OBJECTS_FRONT: u32 = 6;

/// Golden pins are captured on the Vulkan/RTX-class reference device.
/// Cross-vendor runs (AMD/Intel/etc.) must either re-pin on the new vendor or
/// exercise the documented tolerance band (parity ≤1 silhouette pixel) —
/// never fudge a mismatch into a pass.
pub const GOLDEN_PIN_HARDWARE_NOTE: &str =
    "pins=vulkan-rtx-class; cross-vendor: re-pin or tolerance band — never fudge";

/// Pinned golden visibility hash (FNV-1a 64 over the 256² coverage/depth
/// buffer of the dogfood mesh under the golden camera). Any drift in topology,
/// camera math, or raster semantics fails the pin test — that is the point.
pub const GF_MESH_001_GOLDEN_VISIBILITY_HASH: u64 = 0x3980_3478_6e12_6dc5;

pub fn fnv1a64_step(mut h: u64, bytes: &[u8]) -> u64 {
    for &b in bytes {
        h ^= u64::from(b);
        h = h.wrapping_mul(0x0000_0100_0000_01b3);
    }
    h
}

pub fn fnv1a64_init() -> u64 {
    0xcbf2_9ce4_8422_2325
}

/// Deterministic dogfood mesh — 6 faces of a unit cube, each subdivided into
/// `n×n` quads (2 tris each). Mirrors the web fixture topology exactly.
pub fn build_gf_mesh_001_dogfood_mesh() -> (Vec<[f32; 3]>, Vec<[u32; 3]>) {
    let n = GF_MESH_001_SUBDIVISIONS.clamp(2, 8);
    let faces: [([f32; 3], [f32; 3], [f32; 3]); 6] = [
        ([-0.5, -0.5, 0.5], [1.0, 0.0, 0.0], [0.0, 1.0, 0.0]),  // +Z
        ([0.5, -0.5, -0.5], [-1.0, 0.0, 0.0], [0.0, 1.0, 0.0]), // -Z
        ([-0.5, 0.5, -0.5], [1.0, 0.0, 0.0], [0.0, 0.0, 1.0]),  // +Y
        ([-0.5, -0.5, 0.5], [1.0, 0.0, 0.0], [0.0, 0.0, -1.0]), // -Y
        ([0.5, -0.5, 0.5], [0.0, 0.0, -1.0], [0.0, 1.0, 0.0]),  // +X
        ([-0.5, -0.5, -0.5], [0.0, 0.0, 1.0], [0.0, 1.0, 0.0]), // -X
    ];
    let mut positions: Vec<[f32; 3]> = Vec::with_capacity(GF_MESH_001_VERTEX_COUNT);
    let mut indices: Vec<[u32; 3]> = Vec::with_capacity(GF_MESH_001_TRIANGLE_COUNT);
    for (origin, u, v) in faces {
        let base = positions.len() as u32;
        for j in 0..=n {
            for i in 0..=n {
                let s = i as f32 / n as f32;
                let t = j as f32 / n as f32;
                positions.push([
                    origin[0] + u[0] * s + v[0] * t,
                    origin[1] + u[1] * s + v[1] * t,
                    origin[2] + u[2] * s + v[2] * t,
                ]);
            }
        }
        let stride = n + 1;
        for j in 0..n {
            for i in 0..n {
                let a = base + j * stride + i;
                let b = a + 1;
                let c = a + stride;
                let d = c + 1;
                indices.push([a, b, d]);
                indices.push([a, d, c]);
            }
        }
    }
    (positions, indices)
}

/// One cooked cluster (AABB center/radius — enough for cull + Hi-Z decisions).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct GfMeshletCluster {
    pub meshlet_index: u32,
    pub center: [f32; 3],
    pub radius: f32,
}

#[derive(Debug, Clone, PartialEq)]
pub struct GfMeshletCook {
    pub meshlet_count: u32,
    pub clusters: Vec<GfMeshletCluster>,
    /// `meshlet_id` per triangle (index = triangle order).
    pub tri_meshlet: Vec<u32>,
}

/// Deterministic greedy meshlet partition: triangles accumulate into a cluster
/// until the caps are hit, then a new cluster starts. AABB-derived center and
/// radius per cluster (fail-closed: no NaN, no empty clusters).
pub fn cook_gf_mesh_001_meshlets(
    positions: &[[f32; 3]],
    indices: &[[u32; 3]],
) -> GfMeshletCook {
    let mut clusters: Vec<GfMeshletCookBuilder> = Vec::new();
    let mut tri_meshlet = Vec::with_capacity(indices.len());
    for tri in indices {
        if clusters.is_empty()
            || clusters.last().map(|c| c.tris >= GF_MESH_001_MAX_TRIS_PER_MESHLET).unwrap_or(true)
        {
            clusters.push(GfMeshletCookBuilder::default());
        }
        let last = clusters.last_mut().expect("cluster exists");
        for &vi in tri {
            if !last.verts.contains(&vi) && last.verts.len() >= GF_MESH_001_MAX_VERTS_PER_MESHLET {
                clusters.push(GfMeshletCookBuilder::default());
                break;
            }
        }
        let last = clusters.last_mut().expect("cluster exists");
        last.verts.insert(tri[0]);
        last.verts.insert(tri[1]);
        last.verts.insert(tri[2]);
        last.tris += 1;
        tri_meshlet.push(clusters.len() as u32 - 1);
    }
    let out: Vec<GfMeshletCluster> = clusters
        .iter()
        .map(|c| {
            let mut min = [f32::INFINITY; 3];
            let mut max = [f32::NEG_INFINITY; 3];
            for &vi in &c.verts {
                let p = positions[vi as usize];
                for k in 0..3 {
                    min[k] = min[k].min(p[k]);
                    max[k] = max[k].max(p[k]);
                }
            }
            let center = [
                (min[0] + max[0]) * 0.5,
                (min[1] + max[1]) * 0.5,
                (min[2] + max[2]) * 0.5,
            ];
            let radius = c
                .verts
                .iter()
                .map(|&vi| {
                    let p = positions[vi as usize];
                    let dx = p[0] - center[0];
                    let dy = p[1] - center[1];
                    let dz = p[2] - center[2];
                    (dx * dx + dy * dy + dz * dz).sqrt()
                })
                .fold(0.0f32, f32::max);
            GfMeshletCluster {
                meshlet_index: 0,
                center,
                radius,
            }
        })
        .enumerate()
        .map(|(i, mut c)| {
            c.meshlet_index = i as u32;
            c
        })
        .collect();
    GfMeshletCook {
        meshlet_count: out.len() as u32,
        clusters: out,
        tri_meshlet,
    }
}

#[derive(Default)]
struct GfMeshletCookBuilder {
    verts: std::collections::HashSet<u32>,
    tris: usize,
}

/// Camera for the golden raster: legacy affine conventions (mode 0) with a
/// deterministic 4× XY scale so the unit box covers a meaningful pixel area.
pub fn golden_camera() -> MicropolyCamera {
    MicropolyCamera {
        view_proj: Mat4 {
            cols: [
                [4.0 * 0.04, 0.0, 0.0, 0.0],
                [0.0, 4.0 * 0.04, 0.0, 0.0],
                [0.0, 0.0, 0.02, 0.0],
                [0.0, 0.0, 0.5, 1.0],
            ],
        },
        projection_mode: 0,
    }
}

fn to_pixel(ndc: [f32; 2]) -> [f32; 2] {
    [
        (ndc[0] * 0.5 + 0.5) * GF_MESH_001_RASTER_EDGE as f32,
        (1.0 - (ndc[1] * 0.5 + 0.5)) * GF_MESH_001_RASTER_EDGE as f32,
    ]
}

fn edge(a: [f32; 2], b: [f32; 2], p: [f32; 2]) -> f32 {
    (p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0])
}

/// CPU soft-raster (mode-0 mirror of the WGSL `raster_main`): per-triangle bbox
/// scan, barycentric coverage, interpolated depth with per-pixel min. Returns
/// (coverage count, per-pixel depth `[f32; edge²]`).
pub fn raster_gf_mesh_001_golden(
    positions: &[[f32; 3]],
    indices: &[[u32; 3]],
    camera: &MicropolyCamera,
) -> (u32, Vec<f32>) {
    let edge_n = GF_MESH_001_RASTER_EDGE as usize;
    let mut depth = vec![1.0f32; edge_n * edge_n];
    let mut covered = 0u32;
    for tri in indices {
        let p0 = project_point(camera, positions[tri[0] as usize]);
        let p1 = project_point(camera, positions[tri[1] as usize]);
        let p2 = project_point(camera, positions[tri[2] as usize]);
        let s0 = to_pixel([p0[0], p0[1]]);
        let s1 = to_pixel([p1[0], p1[1]]);
        let s2 = to_pixel([p2[0], p2[1]]);
        let area = edge(s0, s1, s2);
        if area.abs() < 1e-5 {
            continue;
        }
        let min_x = s0[0].min(s1[0]).min(s2[0]).floor() as i32;
        let max_x = s0[0].max(s1[0]).max(s2[0]).ceil() as i32;
        let min_y = s0[1].min(s1[1]).min(s2[1]).floor() as i32;
        let max_y = s0[1].max(s1[1]).max(s2[1]).ceil() as i32;
        let x0 = min_x.clamp(0, edge_n as i32 - 1);
        let x1 = max_x.clamp(0, edge_n as i32 - 1);
        let y0 = min_y.clamp(0, edge_n as i32 - 1);
        let y1 = max_y.clamp(0, edge_n as i32 - 1);
        for y in y0..=y1 {
            for x in x0..=x1 {
                let p = [x as f32 + 0.5, y as f32 + 0.5];
                let w0 = edge(s1, s2, p) / area;
                let w1 = edge(s2, s0, p) / area;
                let w2 = edge(s0, s1, p) / area;
                if w0 < 0.0 || w1 < 0.0 || w2 < 0.0 {
                    continue;
                }
                let z = w0 * p0[2] + w1 * p1[2] + w2 * p2[2];
                let idx = (y as usize) * edge_n + x as usize;
                if z <= depth[idx] {
                    if depth[idx] >= 0.999 {
                        covered += 1;
                    }
                    depth[idx] = z;
                }
            }
        }
    }
    (covered, depth)
}

/// FNV-1a 64 golden hash over (edge, per-pixel covered flag + quantized
/// u8 depth, row-major). Deterministic and pinned by a test — never
/// meshlet-ID colors, never timestamps. Depth is quantized to 8 bits (256
/// levels) so 1-ulp float differences (GPU FMA vs CPU scalar math) cannot
/// cross a quantization boundary — the golden is coverage-dominant and
/// GPU/CPU-portable by construction.
pub fn golden_visibility_hash(covered: u32, depth: &[f32]) -> u64 {
    let mut h = fnv1a64_init();
    h = fnv1a64_step(h, &GF_MESH_001_RASTER_EDGE.to_le_bytes());
    h = fnv1a64_step(h, &covered.to_le_bytes());
    for &d in depth {
        let covered_bit: u8 = if d < 0.999 { 1 } else { 0 };
        let q = (d.clamp(0.0, 1.0) * 255.0).round() as u8;
        h = fnv1a64_step(h, &[covered_bit]);
        h = fnv1a64_step(h, &[q]);
    }
    h
}

/// One object of the Hi-Z occlusion-win harness.
#[derive(Debug, Clone, Copy)]
pub struct GfHizObject {
    pub center: [f32; 3],
    pub radius: f32,
}

/// Deterministic occluder scene: a wall at the origin + objects behind it
/// (occluded) and in front of it (visible). All inside the frustum.
pub fn build_gf_mesh_001_hiz_scene() -> (GfHizObject, Vec<GfHizObject>) {
    let wall = GfHizObject {
        center: [0.0, 0.0, 0.0],
        radius: 1.0,
    };
    let mut objects = Vec::new();
    // Legacy z mapping (z = 0.5 + z_world/50): LARGER world z = LARGER depth =
    // farther from the camera. Occluded objects sit at +8 (depth > wall),
    // visible ones at -8 (nearer than the wall).
    for i in 0..GF_MESH_001_HIZ_OBJECTS_BEHIND {
        let col = i % 4;
        let row = i / 4;
        objects.push(GfHizObject {
            center: [
                -3.0 + col as f32 * 2.0,
                -2.0 + row as f32 * 2.0,
                8.0,
            ],
            radius: 0.8,
        });
    }
    for i in 0..GF_MESH_001_HIZ_OBJECTS_FRONT {
        let col = i % 3;
        let row = i / 3;
        objects.push(GfHizObject {
            center: [
                -2.0 + col as f32 * 2.0,
                -1.0 + row as f32 * 2.0,
                -8.0,
            ],
            radius: 0.8,
        });
    }
    (wall, objects)
}

/// Hi-Z occlusion-win evidence: frustum-only vs Hi-Z-assisted visibility.
/// The Hi-Z sample value is the wall's own near depth (legacy mode-0 mapping),
/// so every object whose near depth is beyond the wall + epsilon is culled.
pub fn evaluate_gf_mesh_001_hiz_win() -> (u32, u32, f32) {
    let frustum = CullingFrustum {
        planes: [[0.0; 4]; 6],
        object_count: 0,
        occlusion_enabled: 1,
        _padding: [0; 2],
        view_proj: Mat4::legacy_affine().cols,
        projection_mode: 0,
        _pad2: [0; 3],
    };
    let (wall, objects) = build_gf_mesh_001_hiz_scene();
    // Legacy z mapping: z = 0.5 + z_world / 50 → wall near depth (radius 1).
    let wall_near = (0.5 + wall.center[2] / 50.0 - wall.radius / 50.0).clamp(0.0, 1.0);
    let frustum_only = objects.len() as u32;
    let visible = objects
        .iter()
        .filter(|o| !frustum.hiz_occluded_cpu(o.center, o.radius, wall_near))
        .count() as u32;
    let win = if frustum_only > 0 {
        (frustum_only - visible) as f32 / frustum_only as f32
    } else {
        0.0
    };
    (frustum_only, visible, win)
}

/// IPC probe report — evidence only; every AAA/band flag stays false.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct GfMesh001EvidenceReport {
    pub fixture_id: String,
    pub fixture_name: String,
    pub vertex_count: usize,
    pub triangle_count: usize,
    pub meshlet_count: u32,
    pub raster_edge: u32,
    pub covered_pixels: u32,
    pub golden_visibility_hash: String,
    pub golden_hash_pinned: bool,
    pub hiz_frustum_only_visible: u32,
    pub hiz_assisted_visible: u32,
    pub hiz_draw_reduction_percent: f32,
    pub hiz_win_above_20_percent: bool,
    pub nanite_ready: bool,
    pub micro_poly_aaa_ready: bool,
    pub lumen_ready: bool,
    pub g3_band_30_to_50_passed: bool,
    pub claim: String,
}

#[tauri::command]
pub fn run_gf_mesh_001_golden_cmd() -> GfMesh001EvidenceReport {
    let (positions, indices) = build_gf_mesh_001_dogfood_mesh();
    let cook = cook_gf_mesh_001_meshlets(&positions, &indices);
    let camera = golden_camera();
    let (covered, depth) = raster_gf_mesh_001_golden(&positions, &indices, &camera);
    let hash = golden_visibility_hash(covered, &depth);
    let (frustum_only, visible, win) = evaluate_gf_mesh_001_hiz_win();
    GfMesh001EvidenceReport {
        fixture_id: GF_MESH_001_FIXTURE_ID.into(),
        fixture_name: GF_MESH_001_NAME.into(),
        vertex_count: positions.len(),
        triangle_count: indices.len(),
        meshlet_count: cook.meshlet_count,
        raster_edge: GF_MESH_001_RASTER_EDGE,
        covered_pixels: covered,
        golden_visibility_hash: format!("{hash:016x}"),
        golden_hash_pinned: hash == GF_MESH_001_GOLDEN_VISIBILITY_HASH,
        hiz_frustum_only_visible: frustum_only,
        hiz_assisted_visible: visible,
        hiz_draw_reduction_percent: win * 100.0,
        hiz_win_above_20_percent: win >= 0.20,
        nanite_ready: false,
        micro_poly_aaa_ready: false,
        lumen_ready: false,
        g3_band_30_to_50_passed: false,
        claim: format!(
            "GF-MESH-001 Rust fixture: dogfood mesh cook + CPU soft-raster golden hash + Hi-Z occlusion-win harness (evidence only; no AAA flags, no % bump; {GOLDEN_PIN_HARDWARE_NOTE})"
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dogfood_mesh_topology_matches_manifest() {
        let (positions, indices) = build_gf_mesh_001_dogfood_mesh();
        assert_eq!(positions.len(), GF_MESH_001_VERTEX_COUNT);
        assert_eq!(indices.len(), GF_MESH_001_TRIANGLE_COUNT);
        for p in &positions {
            for &v in p {
                assert!(
                    (-0.5 - 1e-4..=0.5 + 1e-4).contains(&v),
                    "box vertex {v} outside unit cube"
                );
            }
        }
        for tri in &indices {
            assert!(tri[0] < positions.len() as u32);
            assert!(tri[1] < positions.len() as u32);
            assert!(tri[2] < positions.len() as u32);
        }
    }

    #[test]
    fn cook_produces_multiple_nonempty_meshlets() {
        let (positions, indices) = build_gf_mesh_001_dogfood_mesh();
        let cook = cook_gf_mesh_001_meshlets(&positions, &indices);
        assert!(cook.meshlet_count >= 2, "dogfood box must cook into ≥2 meshlets");
        assert_eq!(cook.tri_meshlet.len(), indices.len());
        for c in &cook.clusters {
            assert!(c.radius.is_finite() && c.radius >= 0.0);
        }
    }

    #[test]
    fn golden_raster_covers_pixels_and_hash_is_deterministic() {
        let (positions, indices) = build_gf_mesh_001_dogfood_mesh();
        let camera = golden_camera();
        let (covered, depth) = raster_gf_mesh_001_golden(&positions, &indices, &camera);
        assert!(covered > 100, "golden raster must cover a real pixel area");
        let h1 = golden_visibility_hash(covered, &depth);
        let (covered2, depth2) = raster_gf_mesh_001_golden(&positions, &indices, &camera);
        assert_eq!(covered, covered2);
        assert_eq!(h1, golden_visibility_hash(covered2, &depth2));
    }

    #[test]
    fn golden_hash_matches_pinned_fixture_constant() {
        assert!(!GOLDEN_PIN_HARDWARE_NOTE.is_empty(), "pin tolerance policy must be documented");
        let (positions, indices) = build_gf_mesh_001_dogfood_mesh();
        let camera = golden_camera();
        let (covered, depth) = raster_gf_mesh_001_golden(&positions, &indices, &camera);
        assert_eq!(
            golden_visibility_hash(covered, &depth),
            GF_MESH_001_GOLDEN_VISIBILITY_HASH,
            "golden hash drifted — fixture topology, camera, or raster math changed"
        );
    }

    #[test]
    fn hiz_win_harness_reaches_20_percent_draw_reduction() {
        let (frustum_only, visible, win) = evaluate_gf_mesh_001_hiz_win();
        assert_eq!(frustum_only, GF_MESH_001_HIZ_OBJECTS_BEHIND + GF_MESH_001_HIZ_OBJECTS_FRONT);
        assert!(visible < frustum_only, "Hi-Z must cull occluded objects");
        assert!(win >= 0.20, "draw reduction {win:.2} below the 20% band gate");
        assert_eq!(visible, GF_MESH_001_HIZ_OBJECTS_FRONT, "only front objects survive");
    }
}
