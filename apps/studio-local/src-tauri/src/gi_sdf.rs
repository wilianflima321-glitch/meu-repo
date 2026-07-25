// gi_sdf.rs  — Sprint V33
//
// Native Rust SDF volume builder for Lumen-equivalent Global Illumination.
//
// The browser-side lumen-gi.ts implements sphere-primitive approximation.
// This Rust module provides the high-quality triangle-mesh SDF voxelization
// that runs offline (or on scene change) to produce a precise 3D distance
// field texture.
//
// Algorithm:
//   - For each voxel cell, compute the signed distance to the nearest
//     triangle using a SAT-based point-triangle distance test.
//   - Output: a 3D Float32 volume serialized as a flat Vec<f32> (XYZ major).
//
// Tauri IPC surface:
//   voxelize_scene(positions, indices, resolution, world_min, world_max)
//   → Vec<f32> (flat SDF values, length = rx*ry*rz)

use std::f32;

/// One precomputed triangle: (vertex a, vertex b, vertex c, face normal).
type TriangleWithNormal = ([f32; 3], [f32; 3], [f32; 3], [f32; 3]);

// ---------------------------------------------------------------------------
// Triangle SDF helper (SAT point-to-triangle distance)
// ---------------------------------------------------------------------------

fn point_triangle_distance_sq(p: [f32; 3], a: [f32; 3], b: [f32; 3], c: [f32; 3]) -> f32 {
    let ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    let ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];

    let d1 = dot3(ab, ap);
    let d2 = dot3(ac, ap);
    if d1 <= 0.0 && d2 <= 0.0 {
        return dist_sq3(p, a);
    }

    let bp = [p[0] - b[0], p[1] - b[1], p[2] - b[2]];
    let d3 = dot3(ab, bp);
    let d4 = dot3(ac, bp);
    if d3 >= 0.0 && d4 <= d3 {
        return dist_sq3(p, b);
    }

    let vc = d1 * d4 - d3 * d2;
    if vc <= 0.0 && d1 >= 0.0 && d3 <= 0.0 {
        let v = d1 / (d1 - d3);
        let proj = [a[0] + v * ab[0], a[1] + v * ab[1], a[2] + v * ab[2]];
        return dist_sq3(p, proj);
    }

    let cp = [p[0] - c[0], p[1] - c[1], p[2] - c[2]];
    let d5 = dot3(ab, cp);
    let d6 = dot3(ac, cp);
    if d6 >= 0.0 && d5 <= d6 {
        return dist_sq3(p, c);
    }

    let vb = d5 * d2 - d1 * d6;
    if vb <= 0.0 && d2 >= 0.0 && d6 <= 0.0 {
        let w = d2 / (d2 - d6);
        let proj = [a[0] + w * ac[0], a[1] + w * ac[1], a[2] + w * ac[2]];
        return dist_sq3(p, proj);
    }

    let va = d3 * d6 - d5 * d4;
    if va <= 0.0 && (d4 - d3) >= 0.0 && (d5 - d6) >= 0.0 {
        let w = (d4 - d3) / ((d4 - d3) + (d5 - d6));
        let proj = [b[0] + w * (c[0] - b[0]), b[1] + w * (c[1] - b[1]), b[2] + w * (c[2] - b[2])];
        return dist_sq3(p, proj);
    }

    // Inside triangle
    let denom = 1.0 / (va + vb + vc);
    let v = vb * denom;
    let w = vc * denom;
    let proj = [
        a[0] + ab[0] * v + ac[0] * w,
        a[1] + ab[1] * v + ac[1] * w,
        a[2] + ab[2] * v + ac[2] * w,
    ];
    dist_sq3(p, proj)
}

#[inline]
fn dot3(a: [f32; 3], b: [f32; 3]) -> f32 {
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

#[inline]
fn dist_sq3(a: [f32; 3], b: [f32; 3]) -> f32 {
    let d = [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    d[0] * d[0] + d[1] * d[1] + d[2] * d[2]
}

/// Triangle normal (unnormalized)
fn triangle_normal(a: [f32; 3], b: [f32; 3], c: [f32; 3]) -> [f32; 3] {
    let ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    let ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    [
        ab[1] * ac[2] - ab[2] * ac[1],
        ab[2] * ac[0] - ab[0] * ac[2],
        ab[0] * ac[1] - ab[1] * ac[0],
    ]
}

// ---------------------------------------------------------------------------
// SDF voxelizer
// ---------------------------------------------------------------------------

pub struct SDFVoxelizer;

impl SDFVoxelizer {
    /// Build a 3D SDF volume from a triangle mesh.
    /// Returns flat signed distances, length = rx*ry*rz (row-major XYZ).
    pub fn voxelize(
        positions: &[f32],    // flat XYZ
        indices: &[u32],      // triangle indices
        resolution: [u32; 3],
        world_min: [f32; 3],
        world_max: [f32; 3],
    ) -> Vec<f32> {
        let [rx, ry, rz] = resolution;
        let total = (rx * ry * rz) as usize;
        let mut sdf = vec![f32::MAX; total];

        let cell_size = [
            (world_max[0] - world_min[0]) / rx as f32,
            (world_max[1] - world_min[1]) / ry as f32,
            (world_max[2] - world_min[2]) / rz as f32,
        ];

        let face_count = indices.len() / 3;

        // Precompute triangle vertices
        let tris: Vec<TriangleWithNormal> = (0..face_count)
            .map(|f| {
                let get_v = |i: usize| -> [f32; 3] {
                    let vi = indices[i] as usize * 3;
                    [positions[vi], positions[vi + 1], positions[vi + 2]]
                };
                let a = get_v(f * 3);
                let b = get_v(f * 3 + 1);
                let c = get_v(f * 3 + 2);
                let n = triangle_normal(a, b, c);
                (a, b, c, n)
            })
            .collect();

        // For each voxel, find nearest triangle distance (brute-force for now)
        for iz in 0..rz {
            for iy in 0..ry {
                for ix in 0..rx {
                    let p = [
                        world_min[0] + (ix as f32 + 0.5) * cell_size[0],
                        world_min[1] + (iy as f32 + 0.5) * cell_size[1],
                        world_min[2] + (iz as f32 + 0.5) * cell_size[2],
                    ];

                    let mut min_dist_sq = f32::MAX;
                    let mut sign = 1.0f32;

                    for (a, b, c, n) in &tris {
                        let dsq = point_triangle_distance_sq(p, *a, *b, *c);
                        if dsq < min_dist_sq {
                            min_dist_sq = dsq;
                            // Sign: dot(p - a, n) < 0 → inside
                            let pa = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
                            sign = if dot3(pa, *n) < 0.0 { -1.0 } else { 1.0 };
                        }
                    }

                    let idx = (iz * ry * rx + iy * rx + ix) as usize;
                    sdf[idx] = sign * min_dist_sq.sqrt();
                }
            }
        }

        sdf
    }
}

// ---------------------------------------------------------------------------
// Tauri IPC command
// ---------------------------------------------------------------------------

/// Voxelize a triangle mesh into a SDF volume.
/// Returns flat f32 array as base64 (compatible with GPU texture upload).
#[tauri::command]
pub fn voxelize_scene_sdf(
    positions: Vec<f32>,
    indices: Vec<u32>,
    resolution_x: u32,
    resolution_y: u32,
    resolution_z: u32,
    world_min: Vec<f32>,
    world_max: Vec<f32>,
) -> Result<String, String> {
    if world_min.len() < 3 || world_max.len() < 3 {
        return Err("world_min and world_max must have 3 components".to_string());
    }

    let sdf = SDFVoxelizer::voxelize(
        &positions,
        &indices,
        [resolution_x, resolution_y, resolution_z],
        [world_min[0], world_min[1], world_min[2]],
        [world_max[0], world_max[1], world_max[2]],
    );

    // Encode as base64 binary
    let bytes: &[u8] = bytemuck::cast_slice(&sdf);
    use base64::Engine as _;
    Ok(base64::engine::general_purpose::STANDARD.encode(bytes))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_voxelize_single_triangle() {
        let positions = vec![
            0.0_f32, 0.0, 0.0,
            1.0, 0.0, 0.0,
            0.5, 1.0, 0.0,
        ];
        let indices = vec![0u32, 1, 2];
        let sdf = SDFVoxelizer::voxelize(
            &positions,
            &indices,
            [4, 4, 4],
            [-1.0, -1.0, -1.0],
            [2.0, 2.0, 2.0],
        );
        assert_eq!(sdf.len(), 64);
        assert!(sdf.iter().any(|&v| v < 0.5));
    }

    #[test]
    fn test_point_triangle_distance() {
        let a = [0.0_f32, 0.0, 0.0];
        let b = [1.0, 0.0, 0.0];
        let c = [0.0, 1.0, 0.0];
        // Centroid should be very close
        let p = [0.33, 0.33, 0.0];
        let dsq = point_triangle_distance_sq(p, a, b, c);
        assert!(dsq < 0.01);
    }
}
