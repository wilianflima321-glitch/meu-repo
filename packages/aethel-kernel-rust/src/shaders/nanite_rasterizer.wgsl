// WGSL Compute Shader for Nanite Micro-Polygon Rasterization
// Hardware Acceleration Parity for Sub-Pixel Geometry
// Implements Visibility Buffer locking via atomic U64 (Depth + ID)

struct MicroVertex {
    position: vec3<f32>,
    normal: vec3<f32>,
    uv: vec2<f32>,
}

struct MicroTriangle {
    v0: MicroVertex,
    v1: MicroVertex,
    v2: MicroVertex,
}

struct GeometryCluster {
    cluster_id: u32,
    cone_cutoff: f32,
    triangles: array<MicroTriangle, 128>,
}

struct TileDepthBuffer {
    // 64-bit Visibility Buffer: High 32 bits = Depth (f32 bits), Low 32 bits = Cluster/Tri ID
    depth_id: array<atomic<u64>, 64>, 
}

@group(0) @binding(0) var<storage, read> clusters: array<GeometryCluster>;
@group(0) @binding(1) var<storage, read_write> tile_buffer: TileDepthBuffer;

const FIXED_SHIFT: i32 = 16;
const SW_RASTER_AREA_THRESHOLD: f32 = 16.0;

fn edge_function_fixed(px: i32, py: i32, v0x: i32, v0y: i32, v1x: i32, v1y: i32) -> i64 {
    let dx1 = i64(px - v0x);
    let dy1 = i64(v1y - v0y);
    let dy2 = i64(py - v0y);
    let dx2 = i64(v1x - v0x);
    return (dx1 * dy1) - (dy2 * dx2);
}

fn triangle_pixel_area_2d(p0: vec2<f32>, p1: vec2<f32>, p2: vec2<f32>) -> f32 {
    return 0.5 * abs(p0.x * (p1.y - p2.y) + p1.x * (p2.y - p0.y) + p2.x * (p0.y - p1.y));
}

@compute @workgroup_size(128)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let cluster_idx = global_id.x / 128u;
    let tri_idx = global_id.x % 128u;

    if (cluster_idx >= arrayLength(&clusters)) {
        return;
    }

    let cluster = clusters[cluster_idx];
    let tri = cluster.triangles[tri_idx];

    let p0_2d = vec2<f32>(tri.v0.position.x, tri.v0.position.y);
    let p1_2d = vec2<f32>(tri.v1.position.x, tri.v1.position.y);
    let p2_2d = vec2<f32>(tri.v2.position.x, tri.v2.position.y);

    let area = triangle_pixel_area_2d(p0_2d, p1_2d, p2_2d);
    
    // Only rasterize sub-pixel micro-polygons in software
    if (area <= SW_RASTER_AREA_THRESHOLD) {
        let v0x = i32(tri.v0.position.x * f32(1 << FIXED_SHIFT));
        let v0y = i32(tri.v0.position.y * f32(1 << FIXED_SHIFT));
        let v1x = i32(tri.v1.position.x * f32(1 << FIXED_SHIFT));
        let v1y = i32(tri.v1.position.y * f32(1 << FIXED_SHIFT));
        let v2x = i32(tri.v2.position.x * f32(1 << FIXED_SHIFT));
        let v2y = i32(tri.v2.position.y * f32(1 << FIXED_SHIFT));

        let avg_z = (tri.v0.position.z + tri.v1.position.z + tri.v2.position.z) / 3.0;
        let depth_bits = bitcast<u32>(avg_z);
        
        let id_payload = (cluster.cluster_id << 8u) | tri_idx;
        let vis_payload = (u64(depth_bits) << 32u) | u64(id_payload);

        // Rasterize into 8x8 tile
        for (var py: u32 = 0u; py < 8u; py = py + 1u) {
            for (var px: u32 = 0u; px < 8u; px = px + 1u) {
                let p_fixed_x = i32(f32(px) * f32(1 << FIXED_SHIFT));
                let p_fixed_y = i32(f32(py) * f32(1 << FIXED_SHIFT));

                let e0 = edge_function_fixed(p_fixed_x, p_fixed_y, v0x, v0y, v1x, v1y);
                let e1 = edge_function_fixed(p_fixed_x, p_fixed_y, v1x, v1y, v2x, v2y);
                let e2 = edge_function_fixed(p_fixed_x, p_fixed_y, v2x, v2y, v0x, v0y);

                if (e0 >= 0 && e1 >= 0 && e2 >= 0) {
                    let idx = py * 8u + px;
                    // Atomic U64 Max (since depth is stored inverted or we use Min if supported)
                    // For WebGPU u64 atomicMin:
                    atomicMin(&tile_buffer.depth_id[idx], vis_payload);
                }
            }
        }
    }
}
