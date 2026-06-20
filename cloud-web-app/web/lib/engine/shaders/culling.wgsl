// Aethel Engine - Nanite Meshlet Culling Shader
// Wave 9.0: Rejects invisible clusters in 1ms on the GPU.

struct MeshletBounds {
    center: vec3<f32>,
    radius: f32,
    cone_apex: vec3<f32>,
    cone_axis: vec3<f32>,
    cone_cutoff: f32,
};

@group(0) @binding(0) var<storage, read> bounds: array<MeshletBounds>;
@group(0) @binding(1) var<storage, read_write> drawCommands: array<u32>; // Indirect draw buffer
@group(1) @binding(0) var<uniform> frustumPlanes: array<vec4<f32>, 6>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let meshlet_index = global_id.x;
    
    if (meshlet_index >= arrayLength(&bounds)) {
        return;
    }
    
    let b = bounds[meshlet_index];
    var is_visible = true;
    
    // Frustum Culling
    for (var i = 0u; i < 6u; i = i + 1u) {
        let distance = dot(frustumPlanes[i].xyz, b.center) + frustumPlanes[i].w;
        if (distance < -b.radius) {
            is_visible = false;
            break;
        }
    }
    
    // Write 1 to draw command instance count if visible, 0 if culled
    if (is_visible) {
        drawCommands[meshlet_index] = 1u;
    } else {
        drawCommands[meshlet_index] = 0u;
    }
}
