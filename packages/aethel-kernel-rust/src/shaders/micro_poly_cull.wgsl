// WGSL Compute Shader for GPU Culling (Aethel Micro-Poly)
// Law I (GPU-driven culling) & Law V (Bindless + Indirect)

struct FrustumPlane {
    normal: vec3<f32>,
    distance: f32,
}

struct CameraFrustum {
    planes: array<FrustumPlane, 6>,
}

struct InstanceData {
    position: vec3<f32>,
    scale: vec3<f32>,
    // WebGPU struct alignment padding is automatic but typically 16 bytes.
    // If position is vec3 (12) + padding (4), and scale is vec3 (12) + padding (4).
    padding0: f32,
    padding1: f32,
}

struct DrawIndirectArgs {
    vertex_count: atomic<u32>,
    instance_count: atomic<u32>,
    base_vertex: atomic<u32>,
    base_instance: atomic<u32>,
}

@group(0) @binding(0) var<uniform> frustum: CameraFrustum;
@group(0) @binding(1) var<storage, read> instances: array<InstanceData>;
@group(0) @binding(2) var<storage, read_write> draw_indirect: DrawIndirectArgs;
@group(0) @binding(3) var<storage, read_write> visible_instances: array<u32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let instance_idx = global_id.x;
    
    // Bounds check
    if (instance_idx >= arrayLength(&instances)) {
        return;
    }

    let inst = instances[instance_idx];
    
    // Frustum Culling
    var visible = true;
    for (var i = 0u; i < 6u; i = i + 1u) {
        let plane = frustum.planes[i];
        
        let r = inst.scale.x * abs(plane.normal.x) +
                inst.scale.y * abs(plane.normal.y) +
                inst.scale.z * abs(plane.normal.z);
                
        let d = dot(plane.normal, inst.position);
        
        if (d + r < -plane.distance) {
            visible = false;
            break;
        }
    }

    if (visible) {
        // Atomically increment the instance count
        let out_idx = atomicAdd(&draw_indirect.instance_count, 1u);
        
        // Write the original instance index into the visible array
        visible_instances[out_idx] = instance_idx;
    }
}
