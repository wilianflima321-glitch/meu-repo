// nanite-cull.wgsl — Sprint V33
// GPU-driven Nanite meshlet visibility culling.
// Dispatched as a compute pass before rendering; appends visible meshlet
// indices into the visible_meshlets storage buffer.

// ---------------------------------------------------------------------------
// Structs
// ---------------------------------------------------------------------------

struct Meshlet {
    bounds_center : vec3<f32>,
    bounds_radius : f32,
    lod_error     : f32,
    parent_error  : f32,
    _pad0         : f32,
    _pad1         : f32,
}

struct CullUniforms {
    camera_pos       : vec3<f32>,
    viewport_height  : f32,
    fov_y            : f32,
    max_error_px     : f32,
    meshlet_count    : u32,
    _pad             : u32,
    // Frustum planes (6 × vec4)
    planes           : array<vec4<f32>, 6>,
}

struct VisibleList {
    count   : atomic<u32>,
    indices : array<u32>,
}

// ---------------------------------------------------------------------------
// Bindings
// ---------------------------------------------------------------------------

@group(0) @binding(0) var<storage, read>           meshlets      : array<Meshlet>;
@group(0) @binding(1) var<storage, read_write>      visible       : VisibleList;
@group(0) @binding(2) var<uniform>                  uniforms      : CullUniforms;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn sphere_inside_plane(center: vec3<f32>, radius: f32, plane: vec4<f32>) -> bool {
    return dot(plane.xyz, center) + plane.w >= -radius;
}

fn frustum_cull(center: vec3<f32>, radius: f32) -> bool {
    for (var i = 0u; i < 6u; i = i + 1u) {
        if !sphere_inside_plane(center, radius, uniforms.planes[i]) {
            return false; // outside this plane → invisible
        }
    }
    return true;
}

fn projected_error_px(center: vec3<f32>, lod_error: f32) -> f32 {
    let dist = length(uniforms.camera_pos - center);
    if dist < 0.0001 {
        return 1e9;
    }
    // δ_px = (lod_error × viewport_h) / (2 × tan(fov/2) × dist)
    let tan_half_fov = tan(uniforms.fov_y * 0.5);
    return (lod_error * uniforms.viewport_height) / (2.0 * tan_half_fov * dist);
}

// ---------------------------------------------------------------------------
// Compute entry point
// ---------------------------------------------------------------------------

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let idx = id.x;
    if idx >= uniforms.meshlet_count {
        return;
    }

    let m = meshlets[idx];

    // 1. Frustum cull
    if !frustum_cull(m.bounds_center, m.bounds_radius) {
        return;
    }

    // 2. Screen-space error — skip cluster if its projected error exceeds threshold
    //    meaning a coarser LOD is sufficient
    let err_px = projected_error_px(m.bounds_center, m.lod_error);
    if err_px > uniforms.max_error_px {
        return;
    }

    // 3. Parent error guard — only draw if the parent LOD is NOT sufficient
    //    (ensures we don't render both parent and child clusters simultaneously)
    let parent_err = projected_error_px(m.bounds_center, m.parent_error);
    if parent_err <= uniforms.max_error_px {
        return; // parent is good enough; skip this finer LOD
    }

    // 4. Append to visible list
    let slot = atomicAdd(&visible.count, 1u);
    visible.indices[slot] = idx;
}
