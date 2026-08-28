// Aethel HLOD Traversal Culling WGSL Shader
//
// Replaces standard linear instance culling with a Hierarchical Breadth-First-Search (BFS)
// over the Meshlet DAG created by geometry_clusterizer.rs.
// This is the true "Nanite-like" GPU culling step.

struct Meshlet {
    vertex_indices: array<u32, 64>,
    triangles: array<u32, 96>, // 384 bytes as u32s
    lod_error: f32,
    parent_error: f32,
    bounds_center: vec3<f32>,
    bounds_radius: f32,
    cone_axis: vec3<f32>,
    cone_cutoff: f32,
    parent_id: u32,
    level: u32,
    child_index_start: u32,
    child_count: u32,
}

struct CameraUniforms {
    view_proj: mat4x4<f32>,
    frustum_planes: array<vec4<f32>, 6>,
    camera_pos: vec3<f32>,
    lod_threshold: f32, // Screen-space error tolerance
    num_meshlets: u32,
}

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<storage, read> meshlets: array<Meshlet>;
// Output visibility buffer for MultiDrawIndirect
@group(0) @binding(2) var<storage, read_write> visible_meshlets: array<u32>;
@group(0) @binding(3) var<storage, read_write> draw_indirect_buffer: array<u32>; // count, instance_count, first, base_vertex, base_instance

// Check if a sphere is inside the frustum
fn sphere_in_frustum(center: vec3<f32>, radius: f32) -> bool {
    for (var i = 0u; i < 6u; i = i + 1u) {
        let plane = camera.frustum_planes[i];
        let distance = dot(plane.xyz, center) + plane.w;
        if (distance < -radius) {
            return false; // Fully outside one of the planes
        }
    }
    return true; // Inside or intersecting
}

// Calculate screen space error approximation
fn calc_screen_space_error(center: vec3<f32>, error_metric: f32) -> f32 {
    let dist = distance(camera.camera_pos, center);
    // simplified screen area projection
    return error_metric / max(dist, 0.001);
}

// Workgroup shared stack for BFS traversal per compute thread
// In a full implementation, this uses a warp-level queue, but for simplicity
// we give each thread a small local stack.
var<private> traversal_stack: array<u32, 32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let root_index = global_id.x;
    
    // Only root nodes (level > 0 and no parent) initiate the traversal
    if (root_index >= camera.num_meshlets) {
        return;
    }
    
    let root = meshlets[root_index];
    if (root.parent_id != 0xFFFFFFFFu) {
        return; // Not a root node, let the parent traverse to it
    }

    var stack_top = 0u;
    traversal_stack[stack_top] = root_index;
    stack_top += 1u;

    while (stack_top > 0u) {
        stack_top -= 1u;
        let node_idx = traversal_stack[stack_top];
        let node = meshlets[node_idx];

        // 1. Frustum Culling
        if (!sphere_in_frustum(node.bounds_center, node.bounds_radius)) {
            continue; // Entire branch is culled
        }

        // 2. HLOD Error Test
        let error = calc_screen_space_error(node.bounds_center, node.lod_error);
        
        // If the error is acceptable, OR it's a leaf node, we draw THIS node
        if (error <= camera.lod_threshold || node.level == 0u) {
            // Add to draw list!
            let write_idx = atomicAdd(&draw_indirect_buffer[0], 1u);
            visible_meshlets[write_idx] = node_idx;
        } else {
            // Error is too high, we must refine by visiting children.
            // Since we stored children before parents in the flattened array,
            // we find children by searching for nodes whose parent_id == node_idx.
            // Push children to stack
            let start = node.child_index_start;
            let count = node.child_count;
            for (var i = 0u; i < count; i = i + 1u) {
                if (stack_top < 32u) {
                    traversal_stack[stack_top] = start + i;
                    stack_top += 1u;
                }
            }
        }
    }
}
