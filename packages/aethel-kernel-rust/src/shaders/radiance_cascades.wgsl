// WGSL Compute Shader for Radiance Cascades (Global Illumination)
// Implements multi-resolution coarse-to-fine energy merging.

struct CascadeProbe {
    // 4 angular bins (e.g., +X, -X, +Y, +Z or Spherical Harmonics) 
    // each storing RGB irradiance.
    irradiance: array<vec3<f32>, 4>,
}

struct CascadeLevel {
    probes: array<CascadeProbe>,
}

@group(0) @binding(0) var<storage, read_write> fine_cascade: CascadeLevel;
@group(0) @binding(1) var<storage, read> coarse_cascade: CascadeLevel;

struct UniformParams {
    fine_res: u32,
    coarse_res: u32,
}
@group(0) @binding(2) var<uniform> params: UniformParams;

fn get_coarse_probe(x: u32, y: u32) -> CascadeProbe {
    if (x >= params.coarse_res || y >= params.coarse_res) {
        var empty: CascadeProbe;
        for (var i = 0u; i < 4u; i = i + 1u) {
            empty.irradiance[i] = vec3<f32>(0.0);
        }
        return empty;
    }
    return coarse_cascade.probes[y * params.coarse_res + x];
}

fn sample_bilinear_coarse(u: f32, v: f32) -> CascadeProbe {
    let res = f32(params.coarse_res);
    let uf = clamp(u, 0.0, 1.0) * (res - 1.0);
    let vf = clamp(v, 0.0, 1.0) * (res - 1.0);
    
    let x0 = u32(floor(uf));
    let y0 = u32(floor(vf));
    let x1 = min(x0 + 1u, params.coarse_res - 1u);
    let y1 = min(y0 + 1u, params.coarse_res - 1u);
    
    let tx = uf - f32(x0);
    let ty = vf - f32(y0);
    
    let p00 = get_coarse_probe(x0, y0);
    let p10 = get_coarse_probe(x1, y0);
    let p01 = get_coarse_probe(x0, y1);
    let p11 = get_coarse_probe(x1, y1);
    
    var result: CascadeProbe;
    for (var i = 0u; i < 4u; i = i + 1u) {
        let a = mix(p00.irradiance[i], p10.irradiance[i], tx);
        let b = mix(p01.irradiance[i], p11.irradiance[i], tx);
        result.irradiance[i] = mix(a, b, ty);
    }
    
    return result;
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let x = global_id.x;
    let y = global_id.y;
    
    if (x >= params.fine_res || y >= params.fine_res) {
        return;
    }
    
    let u = (f32(x) + 0.5) / f32(params.fine_res);
    let v = (f32(y) + 0.5) / f32(params.fine_res);
    
    // Sample coarser cascade
    let upsampled = sample_bilinear_coarse(u, v);
    
    let idx = y * params.fine_res + x;
    var current_probe = fine_cascade.probes[idx];
    
    // Merge weight (0.5 contribution from coarse)
    for (var i = 0u; i < 4u; i = i + 1u) {
        current_probe.irradiance[i] = current_probe.irradiance[i] + upsampled.irradiance[i] * 0.5;
    }
    
    // Write back to fine cascade
    fine_cascade.probes[idx] = current_probe;
}
