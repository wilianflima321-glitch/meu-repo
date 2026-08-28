// Aethel Engine GPU Compute Kernel
// Massive Parallel Physics Solver

// Structure of Arrays layout matching the SceneGraph
struct FloatArray {
    data: array<f32>,
};

struct Uniforms {
    dt: f32, // Delta Time
    gravity: f32,
    num_entities: u32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read_write> pos_y: FloatArray;
@group(0) @binding(2) var<storage, read_write> vel_y: FloatArray;

// We process 64 entities per workgroup. 
// A GPU with 1024 cores can run 16 of these workgroups instantly in one clock cycle.
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let i = global_id.x;
    
    // Bounds check
    if (i >= uniforms.num_entities) {
        return;
    }

    // Read current state from VRAM
    var py = pos_y.data[i];
    var vy = vel_y.data[i];

    // Apply gravity
    vy -= uniforms.gravity * uniforms.dt;
    
    // Apply velocity to position
    py += vy * uniforms.dt;

    // Simple floor collision (Hardcoded at Y = 0 for the demo)
    if (py < 0.0) {
        py = 0.0;
        vy = -vy * 0.8; // Bounce with 80% restitution
    }

    // Write back to VRAM
    pos_y.data[i] = py;
    vel_y.data[i] = vy;
}
