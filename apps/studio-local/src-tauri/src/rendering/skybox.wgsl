// skybox.wgsl
struct CameraUniform {
    view_proj: mat4x4<f32>,
    view: mat4x4<f32>,
    proj: mat4x4<f32>,
    inv_view_proj: mat4x4<f32>,
    eye_position: vec4<f32>,
    num_lights: u32,
    _padding: vec3<u32>,
    light_view_proj: mat4x4<f32>,
};

@group(0) @binding(0)
var<uniform> camera: CameraUniform;

struct VertexInput {
    @location(0) position: vec3<f32>,
};

struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) world_pos: vec3<f32>,
};

@vertex
fn vs_main(model: VertexInput) -> VertexOutput {
    var out: VertexOutput;
    
    // We want the skybox to be infinitely far away.
    // By setting w = 0 in the view matrix translation part, the skybox moves with the camera.
    var view_rot = camera.view;
    view_rot[3] = vec4<f32>(0.0, 0.0, 0.0, 1.0); // Remove translation
    
    let clip_pos = camera.proj * view_rot * vec4<f32>(model.position, 1.0);
    
    // Force z to w so it always passes the depth test at exactly the far plane (z=1.0)
    out.clip_position = vec4<f32>(clip_pos.xy, clip_pos.w, clip_pos.w);
    out.world_pos = model.position;
    
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let dir = normalize(in.world_pos);
    
    // Procedural Atmospheric Sky
    let sun_dir = normalize(vec3<f32>(1.0, -1.0, 1.0)); // Should match light dir
    
    let sky_color = vec3<f32>(0.1, 0.3, 0.6);
    let horizon_color = vec3<f32>(0.6, 0.7, 0.8);
    let sun_color = vec3<f32>(1.0, 0.95, 0.9);
    
    let up = vec3<f32>(0.0, 1.0, 0.0);
    let elevation = max(dot(dir, up), 0.0);
    
    var color = mix(horizon_color, sky_color, pow(elevation, 0.5));
    
    // Sun disk
    let sun_dot = max(dot(dir, -sun_dir), 0.0);
    if (sun_dot > 0.999) {
        color = sun_color * 100.0; // HDR Sun
    } else {
        // Sun halo / Mie scattering approx
        color += sun_color * pow(sun_dot, 128.0) * 2.0;
    }
    
    // Tonemapping for skybox to match scene
    color = color / (color + vec3<f32>(1.0));
    color = pow(color, vec3<f32>(1.0 / 2.2));
    
    return vec4<f32>(color, 1.0);
}
