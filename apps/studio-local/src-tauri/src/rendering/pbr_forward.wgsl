// Aethel Engine - Best in Market - Forward PBR Shader

struct CameraUniform {
    view_proj: mat4x4<f32>,
    view: mat4x4<f32>,
    proj: mat4x4<f32>,
    inv_view_proj: mat4x4<f32>,
    eye_position: vec4<f32>,
    num_lights: u32,
    _padding: vec3<u32>,
};

struct Light {
    position: vec3<f32>,
    light_type: u32,
    color: vec3<f32>,
    intensity: f32,
    direction: vec3<f32>,
    range: f32,
    inner_cone: f32,
    outer_cone: f32,
    _padding: vec2<f32>,
};

@group(0) @binding(0)
var<uniform> camera: CameraUniform;

@group(0) @binding(1)
var<storage, read> lights: array<Light>;

@group(0) @binding(2)
var t_shadow: texture_depth_2d;
@group(0) @binding(3)
var s_shadow: sampler_comparison;

struct VertexInput {
    @location(0) position: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) uv: vec2<f32>,
};

struct InstanceData {
    model_matrix_0: vec4<f32>,
    model_matrix_1: vec4<f32>,
    model_matrix_2: vec4<f32>,
    model_matrix_3: vec4<f32>,
    material_index: u32,
    _padding: vec3<u32>,
};

struct PbrMaterial {
    albedo: vec4<f32>,
    metallic: f32,
    roughness: f32,
    _padding: vec2<u32>,
};

@group(1) @binding(0) var<storage, read> visible_indices: array<u32>;
@group(1) @binding(1) var<storage, read> all_instances: array<InstanceData>;
@group(1) @binding(2) var<storage, read> materials: array<PbrMaterial>;

@group(2) @binding(0)
var t_albedo: texture_2d<f32>;
@group(2) @binding(1)
var s_albedo: sampler;
@group(2) @binding(2)
var t_normal: texture_2d<f32>;
@group(2) @binding(3)
var s_normal: sampler;

struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) world_position: vec3<f32>,
    @location(1) world_normal: vec3<f32>,
    @location(2) uv: vec2<f32>,
    @location(3) @interpolate(flat) material_index: u32,
};

@vertex
fn vs_main(
    model: VertexInput,
    @builtin(instance_index) instance_idx: u32,
) -> VertexOutput {
    let real_instance_idx = visible_indices[instance_idx];
    let instance = all_instances[real_instance_idx];

    let model_matrix = mat4x4<f32>(
        instance.model_matrix_0,
        instance.model_matrix_1,
        instance.model_matrix_2,
        instance.model_matrix_3,
    );

    var out: VertexOutput;
    let world_pos = model_matrix * vec4<f32>(model.position, 1.0);
    out.world_position = world_pos.xyz;
    
    // Naive normal matrix (assumes uniform scaling). Proper way: transpose(inverse(model))
    let normal_matrix = mat3x3<f32>(
        model_matrix[0].xyz,
        model_matrix[1].xyz,
        model_matrix[2].xyz,
    );
    out.world_normal = normal_matrix * model.normal;
    out.uv = model.uv;
    out.clip_position = camera.view_proj * world_pos;
    out.material_index = instance.material_index;
    return out;
}

// The fragment shader will iterate over lights.
const PI: f32 = 3.14159265359;

fn fresnel_schlick(cos_theta: f32, F0: vec3<f32>) -> vec3<f32> {
    return F0 + (1.0 - F0) * pow(clamp(1.0 - cos_theta, 0.0, 1.0), 5.0);
}

fn distribution_ggx(N: vec3<f32>, H: vec3<f32>, roughness: f32) -> f32 {
    let a = roughness * roughness;
    let a2 = a * a;
    let NdotH = max(dot(N, H), 0.0);
    let NdotH2 = NdotH * NdotH;
    
    let num = a2;
    let denom = (NdotH2 * (a2 - 1.0) + 1.0);
    let final_denom = PI * denom * denom;
    return num / max(final_denom, 0.0000001);
}

fn geometry_schlick_ggx(NdotV: f32, roughness: f32) -> f32 {
    let r = (roughness + 1.0);
    let k = (r * r) / 8.0;
    
    let num = NdotV;
    let denom = NdotV * (1.0 - k) + k;
    return num / denom;
}

fn geometry_smith(N: vec3<f32>, V: vec3<f32>, L: vec3<f32>, roughness: f32) -> f32 {
    let NdotV = max(dot(N, V), 0.0);
    let NdotL = max(dot(N, L), 0.0);
    let ggx2 = geometry_schlick_ggx(NdotV, roughness);
    let ggx1 = geometry_schlick_ggx(NdotL, roughness);
    return ggx1 * ggx2;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let material = materials[in.material_index];
    
    // Sample texture and multiply by base color
    let tex_albedo = textureSample(t_albedo, s_albedo, in.uv).rgb;
    let ALBEDO = material.albedo.rgb * tex_albedo;
    
    let ROUGHNESS = material.roughness;
    let METALLIC = material.metallic;
    let AO = 1.0;

    let N = normalize(in.world_normal);
    let V = normalize(camera.eye_position.xyz - in.world_position); // Real camera eye
    
    let F0 = mix(vec3<f32>(0.04), ALBEDO, METALLIC);
    
    var Lo = vec3<f32>(0.0);
    
    for (var i: u32 = 0u; i < camera.num_lights; i = i + 1u) {
        let light = lights[i];
        var L = vec3<f32>(0.0);
        var attenuation = 1.0;
        
        if (light.light_type == 0u) { // Directional
            L = normalize(light.position); // position stores direction for directional lights
            
            // Calculate shadow visibility
            let pos_light_space = camera.light_view_proj * vec4<f32>(in.world_position, 1.0);
            var shadow_pos = pos_light_space.xyz / pos_light_space.w;
            // Convert to texture space (0.0 to 1.0)
            shadow_pos = vec3<f32>(
                shadow_pos.x * 0.5 + 0.5,
                shadow_pos.y * -0.5 + 0.5,
                shadow_pos.z
            );
            
            if (shadow_pos.z > 0.0 && shadow_pos.z < 1.0 && 
                shadow_pos.x > 0.0 && shadow_pos.x < 1.0 && 
                shadow_pos.y > 0.0 && shadow_pos.y < 1.0) 
            {
                var visibility = 0.0;
                let one_over_size = 1.0 / 2048.0;
                for (var y: i32 = -1; y <= 1; y++) {
                    for (var x: i32 = -1; x <= 1; x++) {
                        let offset = vec2<f32>(vec2<i32>(x, y)) * one_over_size;
                        visibility += textureSampleCompare(
                            t_shadow, s_shadow,
                            shadow_pos.xy + offset, shadow_pos.z - 0.005
                        );
                    }
                }
                visibility /= 9.0;
                attenuation *= visibility;
            }
        } else if (light.light_type == 1u) { // Point
            let diff = light.position - in.world_position;
            let distance = length(diff);
            L = diff / distance;
            // Simple inverse square falloff
            attenuation = 1.0 / (distance * distance);
            if (distance > light.range) {
                attenuation = 0.0;
            }
        }
        
        let H = normalize(V + L);
        let radiance = light.color * light.intensity * attenuation;

        // Cook-Torrance BRDF
        let NDF = distribution_ggx(N, H, ROUGHNESS);
        let G = geometry_smith(N, V, L, ROUGHNESS);
        let F = fresnel_schlick(max(dot(H, V), 0.0), F0);

        let numerator = NDF * G * F;
        let denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.0001;
        let specular = numerator / denominator;

        let kS = F;
        var kD = vec3<f32>(1.0) - kS;
        kD = kD * (1.0 - METALLIC);

        let NdotL = max(dot(N, L), 0.0);
        Lo += (kD * ALBEDO / PI + specular) * radiance * NdotL;
    }
    
    let ambient = vec3<f32>(0.03) * ALBEDO * AO;
    var color = ambient + Lo;
    
    // Reinhard tone mapping
    color = color / (color + vec3<f32>(1.0));
    // Gamma correction
    color = pow(color, vec3<f32>(1.0 / 2.2));
    
    return vec4<f32>(color, 1.0);
}
