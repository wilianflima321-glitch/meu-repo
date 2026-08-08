struct Ray {
    origin: vec3<f32>,
    tmin: f32,
    dir: vec3<f32>,
    tmax: f32,
};

struct Intersection {
    t: f32,
    instance_id: u32,
    primitive_id: u32,
    barycentrics: vec2<f32>,
};

// WebGPU Hardware Raytracing experimental extension structures
// We fallback to software compute BVH traversal if hw_raytracing isn't available.
@group(0) @binding(0) var<storage, read_write> rays: array<Ray>;
@group(0) @binding(1) var<storage, read_write> intersections: array<Intersection>;
// TLAS and BLAS buffers for software traversal fallback
@group(0) @binding(2) var<storage, read> tlas_nodes: array<vec4<f32>>; 
@group(0) @binding(3) var<storage, read> blas_nodes: array<vec4<f32>>; 

// Bindless texture array
@group(1) @binding(0) var bindless_textures: binding_array<texture_2d<f32>>;
@group(1) @binding(1) var bindless_samplers: binding_array<sampler>;

@compute @workgroup_size(64)
fn raygen(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let id = global_id.x;
    
    // In a real bindless hardware implementation, this uses rayQueryInitialize
    // Since WebGPU currently lacks standardized ray tracing, we implement a fallback
    // Compute Shader AABB intersection for BVH traversal.
    
    var ray = rays[id];
    var best_t = ray.tmax;
    var inst_id = 0u;
    
    // ... software BVH traversal logic omitted for brevity ...
    
    if (best_t < ray.tmax) {
        intersections[id] = Intersection(best_t, inst_id, 0u, vec2<f32>(0.0, 0.0));
    }
}
