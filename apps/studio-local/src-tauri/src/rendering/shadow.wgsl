// shadow.wgsl
struct CameraUniform {
    view_proj: mat4x4<f32>,
    view: mat4x4<f32>,
    proj: mat4x4<f32>,
    inv_view_proj: mat4x4<f32>,
    eye_position: vec4<f32>,
    num_lights: u32,
    _padding: vec3<u32>,
};

@group(0) @binding(0)
var<uniform> light_camera: CameraUniform; // We reuse CameraUniform structure for the Light's perspective

struct InstanceInput {
    @location(3) model_matrix_0: vec4<f32>,
    @location(4) model_matrix_1: vec4<f32>,
    @location(5) model_matrix_2: vec4<f32>,
    @location(6) model_matrix_3: vec4<f32>,
};

@vertex
fn vs_main(
    @location(0) position: vec3<f32>,
    instance: InstanceInput,
) -> @builtin(position) vec4<f32> {
    let model_matrix = mat4x4<f32>(
        instance.model_matrix_0,
        instance.model_matrix_1,
        instance.model_matrix_2,
        instance.model_matrix_3,
    );
    let world_position = model_matrix * vec4<f32>(position, 1.0);
    return light_camera.view_proj * world_position;
}
