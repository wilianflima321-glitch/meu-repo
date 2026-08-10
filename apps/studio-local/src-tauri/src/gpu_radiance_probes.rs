//! Radiance / irradiance probe volume substrate (secondary_winit frame path).
//!
//! # Honesty
//! - Proves: real regular probe grid in a world AABB → GPU compute fill
//!   (directional irradiance + AABB occluder attenuation) → GPU sample at
//!   lit/dark world points → Instant metrics + post-loop sample readback.
//! - Does **not** prove: Lumen, radiance cascades AAA, screen-space GI,
//!   multi-bounce path tracing, or product WebView GI. `lumen_ready` /
//!   `nanite_ready` / `micro_poly_aaa_ready` stay **false**.

use bytemuck::{Pod, Zeroable};
use wgpu::util::DeviceExt;

/// Soak grid resolution (4³ = 64 probes — minimal real volume, not a toy scalar).
pub const RADIANCE_PROBE_DIM: u32 = 4;
pub const RADIANCE_PROBE_COUNT: u32 = RADIANCE_PROBE_DIM * RADIANCE_PROBE_DIM * RADIANCE_PROBE_DIM;
const _: () = assert!(RADIANCE_PROBE_COUNT == 64);

/// Two evidence sample points: lit (open) and dark (behind occluder).
pub const RADIANCE_SAMPLE_COUNT: u32 = 2;

#[repr(C)]
#[derive(Debug, Clone, Copy, Pod, Zeroable)]
pub struct ProbeVolumeParams {
    pub origin: [f32; 3],
    pub _pad0: f32,
    pub extent: [f32; 3],
    pub _pad1: f32,
    pub light_dir: [f32; 3],
    pub light_intensity: f32,
    pub occluder_min: [f32; 3],
    pub _pad2: f32,
    pub occluder_max: [f32; 3],
    pub dim: u32,
}

#[repr(C)]
#[derive(Debug, Clone, Copy, Pod, Zeroable)]
struct ProbeIrradiance {
    rgb: [f32; 3],
    _pad: f32,
}

#[repr(C)]
#[derive(Debug, Clone, Copy, Pod, Zeroable)]
struct SamplePoint {
    position: [f32; 3],
    _pad: f32,
}

#[repr(C)]
#[derive(Debug, Clone, Copy, Pod, Zeroable)]
pub struct SampleResult {
    pub rgb: [f32; 3],
    pub luminance: f32,
}

const FILL_SHADER: &str = r#"
struct ProbeVolumeParams {
    origin: vec3<f32>,
    _pad0: f32,
    extent: vec3<f32>,
    _pad1: f32,
    light_dir: vec3<f32>,
    light_intensity: f32,
    occluder_min: vec3<f32>,
    _pad2: f32,
    occluder_max: vec3<f32>,
    dim: u32,
};

struct ProbeIrradiance {
    rgb: vec3<f32>,
    _pad: f32,
};

@group(0) @binding(0) var<uniform> params: ProbeVolumeParams;
@group(0) @binding(1) var<storage, read_write> probes: array<ProbeIrradiance>;

fn probe_world_pos(index: u32) -> vec3<f32> {
    let d = params.dim;
    let x = index % d;
    let y = (index / d) % d;
    let z = index / (d * d);
    let t = vec3<f32>(
        (f32(x) + 0.5) / f32(d),
        (f32(y) + 0.5) / f32(d),
        (f32(z) + 0.5) / f32(d),
    );
    return params.origin + t * params.extent;
}

fn point_in_aabb(p: vec3<f32>, bmin: vec3<f32>, bmax: vec3<f32>) -> bool {
    return all(p >= bmin) && all(p <= bmax);
}

// Segment vs AABB: true if the segment from `origin` along `dir` (unit) of length `tmax` hits.
fn ray_hits_aabb(origin: vec3<f32>, dir: vec3<f32>, tmax: f32, bmin: vec3<f32>, bmax: vec3<f32>) -> bool {
    var t0 = 0.0;
    var t1 = tmax;
    for (var i = 0; i < 3; i = i + 1) {
        let o = origin[i];
        let d = dir[i];
        let mn = bmin[i];
        let mx = bmax[i];
        if (abs(d) < 1e-6) {
            if (o < mn || o > mx) {
                return false;
            }
        } else {
            let inv = 1.0 / d;
            var ta = (mn - o) * inv;
            var tb = (mx - o) * inv;
            if (ta > tb) {
                let tmp = ta;
                ta = tb;
                tb = tmp;
            }
            t0 = max(t0, ta);
            t1 = min(t1, tb);
            if (t0 > t1) {
                return false;
            }
        }
    }
    return t1 >= 0.0 && t0 <= tmax;
}

@compute @workgroup_size(64)
fn fill_probes(@builtin(global_invocation_id) gid: vec3<u32>) {
    let index = gid.x;
    let count = params.dim * params.dim * params.dim;
    if (index >= count) {
        return;
    }
    let p = probe_world_pos(index);
    // Hemisphere-up irradiance proxy: max(N·L, 0) with N = +Y; attenuate if light ray hits occluder.
    let n = vec3<f32>(0.0, 1.0, 0.0);
    let l = normalize(-params.light_dir);
    var ndotl = max(dot(n, l), 0.0);
    // Shadow: cast from probe toward light (against light_dir).
    let to_light = normalize(-params.light_dir);
    let shadowed = ray_hits_aabb(p, to_light, 40.0, params.occluder_min, params.occluder_max)
        || point_in_aabb(p, params.occluder_min, params.occluder_max);
    if (shadowed) {
        ndotl = ndotl * 0.05;
    }
    let e = params.light_intensity * ndotl;
    probes[index].rgb = vec3<f32>(e, e * 0.95, e * 0.85);
    probes[index]._pad = 0.0;
}
"#;

const SAMPLE_SHADER: &str = r#"
struct ProbeVolumeParams {
    origin: vec3<f32>,
    _pad0: f32,
    extent: vec3<f32>,
    _pad1: f32,
    light_dir: vec3<f32>,
    light_intensity: f32,
    occluder_min: vec3<f32>,
    _pad2: f32,
    occluder_max: vec3<f32>,
    dim: u32,
};

struct ProbeIrradiance {
    rgb: vec3<f32>,
    _pad: f32,
};

struct SamplePoint {
    position: vec3<f32>,
    _pad: f32,
};

struct SampleResult {
    rgb: vec3<f32>,
    luminance: f32,
};

@group(0) @binding(0) var<uniform> params: ProbeVolumeParams;
@group(0) @binding(1) var<storage, read> probes: array<ProbeIrradiance>;
@group(0) @binding(2) var<storage, read> samples: array<SamplePoint>;
@group(0) @binding(3) var<storage, read_write> results: array<SampleResult>;

fn clamp_probe_coord(c: vec3<i32>, dim: i32) -> vec3<i32> {
    return clamp(c, vec3<i32>(0), vec3<i32>(dim - 1));
}

fn probe_index(c: vec3<i32>, dim: u32) -> u32 {
    return u32(c.x) + u32(c.y) * dim + u32(c.z) * dim * dim;
}

fn sample_trilinear(world: vec3<f32>) -> vec3<f32> {
    let d = i32(params.dim);
    let local = (world - params.origin) / max(params.extent, vec3<f32>(1e-4));
    let grid = local * f32(d) - vec3<f32>(0.5);
    let base = vec3<i32>(floor(grid));
    let f = fract(grid);
    var acc = vec3<f32>(0.0);
    var wsum = 0.0;
    for (var dz = 0; dz < 2; dz = dz + 1) {
        for (var dy = 0; dy < 2; dy = dy + 1) {
            for (var dx = 0; dx < 2; dx = dx + 1) {
                let c = clamp_probe_coord(base + vec3<i32>(dx, dy, dz), d);
                let w = (select(1.0 - f.x, f.x, dx == 1))
                    * (select(1.0 - f.y, f.y, dy == 1))
                    * (select(1.0 - f.z, f.z, dz == 1));
                acc = acc + probes[probe_index(c, params.dim)].rgb * w;
                wsum = wsum + w;
            }
        }
    }
    return acc / max(wsum, 1e-4);
}

@compute @workgroup_size(1)
fn sample_probes(@builtin(global_invocation_id) gid: vec3<u32>) {
    let index = gid.x;
    if (index >= arrayLength(&samples)) {
        return;
    }
    let rgb = sample_trilinear(samples[index].position);
    let lum = dot(rgb, vec3<f32>(0.2126, 0.7152, 0.0722));
    results[index].rgb = rgb;
    results[index].luminance = lum;
}
"#;

/// Soak params: volume around origin; occluder blocks +X side; light from -Z/+Y.
pub fn soak_probe_volume_params() -> ProbeVolumeParams {
    ProbeVolumeParams {
        origin: [-8.0, -8.0, -8.0],
        _pad0: 0.0,
        extent: [16.0, 16.0, 16.0],
        _pad1: 0.0,
        light_dir: [0.2, -0.8, -0.5], // direction *toward* surface from light
        light_intensity: 2.0,
        occluder_min: [1.0, -6.0, -6.0],
        _pad2: 0.0,
        occluder_max: [4.0, 6.0, 6.0],
        dim: RADIANCE_PROBE_DIM,
    }
}

/// Lit sample (open sky side) + dark sample (in/behind occluder).
fn soak_sample_points() -> [SamplePoint; RADIANCE_SAMPLE_COUNT as usize] {
    [
        SamplePoint {
            position: [-4.0, 0.0, 0.0],
            _pad: 0.0,
        },
        SamplePoint {
            position: [2.5, 0.0, 0.0], // inside occluder AABB
            _pad: 0.0,
        },
    ]
}

/// Persistent GPU probe volume for secondary present frame path.
pub struct RadianceProbeVolume {
    params: ProbeVolumeParams,
    params_buffer: wgpu::Buffer,
    #[allow(dead_code)]
    probes_buffer: wgpu::Buffer,
    #[allow(dead_code)]
    samples_buffer: wgpu::Buffer,
    results_buffer: wgpu::Buffer,
    fill_pipeline: wgpu::ComputePipeline,
    fill_bind_group: wgpu::BindGroup,
    sample_pipeline: wgpu::ComputePipeline,
    sample_bind_group: wgpu::BindGroup,
    pub probe_count: u32,
    pub sample_count: u32,
}

impl RadianceProbeVolume {
    pub fn new(device: &wgpu::Device, params: ProbeVolumeParams) -> Result<Self, String> {
        if params.dim < 2 {
            return Err("RadianceProbeVolume dim must be ≥2".into());
        }
        let probe_count = params.dim * params.dim * params.dim;
        let samples = soak_sample_points();

        let fill_shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Aethel Radiance Probe Fill"),
            source: wgpu::ShaderSource::Wgsl(FILL_SHADER.into()),
        });
        let sample_shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Aethel Radiance Probe Sample"),
            source: wgpu::ShaderSource::Wgsl(SAMPLE_SHADER.into()),
        });

        let params_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel Radiance Probe Params"),
            contents: bytemuck::bytes_of(&params),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });
        let zero_probes = vec![ProbeIrradiance::zeroed(); probe_count as usize];
        let probes_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel Radiance Probe Grid"),
            contents: bytemuck::cast_slice(&zero_probes),
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_SRC,
        });
        let samples_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel Radiance Sample Points"),
            contents: bytemuck::cast_slice(&samples),
            usage: wgpu::BufferUsages::STORAGE,
        });
        let zero_results = vec![SampleResult::zeroed(); samples.len()];
        let results_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel Radiance Sample Results"),
            contents: bytemuck::cast_slice(&zero_results),
            usage: wgpu::BufferUsages::STORAGE
                | wgpu::BufferUsages::COPY_SRC
                | wgpu::BufferUsages::COPY_DST,
        });

        let fill_bgl = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Aethel Radiance Fill BGL"),
            entries: &[
                uniform_entry(0),
                storage_entry(1, false),
            ],
        });
        let fill_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Aethel Radiance Fill Layout"),
            bind_group_layouts: &[&fill_bgl],
            push_constant_ranges: &[],
        });
        let fill_pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Aethel Radiance Fill Pipeline"),
            layout: Some(&fill_layout),
            module: &fill_shader,
            entry_point: "fill_probes",
            compilation_options: Default::default(),
        });
        let fill_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("Aethel Radiance Fill BG"),
            layout: &fill_bgl,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: params_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: probes_buffer.as_entire_binding(),
                },
            ],
        });

        let sample_bgl = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Aethel Radiance Sample BGL"),
            entries: &[
                uniform_entry(0),
                storage_entry(1, true),
                storage_entry(2, true),
                storage_entry(3, false),
            ],
        });
        let sample_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Aethel Radiance Sample Layout"),
            bind_group_layouts: &[&sample_bgl],
            push_constant_ranges: &[],
        });
        let sample_pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Aethel Radiance Sample Pipeline"),
            layout: Some(&sample_layout),
            module: &sample_shader,
            entry_point: "sample_probes",
            compilation_options: Default::default(),
        });
        let sample_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("Aethel Radiance Sample BG"),
            layout: &sample_bgl,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: params_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: probes_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 2,
                    resource: samples_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 3,
                    resource: results_buffer.as_entire_binding(),
                },
            ],
        });

        Ok(Self {
            params,
            params_buffer,
            probes_buffer,
            samples_buffer,
            results_buffer,
            fill_pipeline,
            fill_bind_group,
            sample_pipeline,
            sample_bind_group,
            probe_count,
            sample_count: samples.len() as u32,
        })
    }

    /// Encode fill + sample on the present encoder (no CPU readback on hot path).
    pub fn encode_fill_and_sample(
        &self,
        queue: &wgpu::Queue,
        encoder: &mut wgpu::CommandEncoder,
    ) {
        queue.write_buffer(&self.params_buffer, 0, bytemuck::bytes_of(&self.params));
        {
            let mut pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
                label: Some("Aethel Radiance Probe Fill"),
                timestamp_writes: None,
            });
            pass.set_pipeline(&self.fill_pipeline);
            pass.set_bind_group(0, &self.fill_bind_group, &[]);
            pass.dispatch_workgroups(self.probe_count.div_ceil(64), 1, 1);
        }
        {
            let mut pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
                label: Some("Aethel Radiance Probe Sample"),
                timestamp_writes: None,
            });
            pass.set_pipeline(&self.sample_pipeline);
            pass.set_bind_group(0, &self.sample_bind_group, &[]);
            pass.dispatch_workgroups(self.sample_count, 1, 1);
        }
    }

    /// Post-loop evidence only — maps sample luminances (not present hot path).
    pub fn readback_samples(
        &self,
        device: &wgpu::Device,
        queue: &wgpu::Queue,
    ) -> Vec<SampleResult> {
        let bytes = (self.sample_count as usize) * std::mem::size_of::<SampleResult>();
        let readback = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Aethel Radiance Sample Readback"),
            size: bytes as u64,
            usage: wgpu::BufferUsages::MAP_READ | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });
        let mut encoder = device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
            label: Some("Aethel Radiance Sample Readback Encoder"),
        });
        encoder.copy_buffer_to_buffer(&self.results_buffer, 0, &readback, 0, bytes as u64);
        queue.submit(Some(encoder.finish()));
        let slice = readback.slice(..);
        slice.map_async(wgpu::MapMode::Read, |_| {});
        device.poll(wgpu::Maintain::Wait);
        let data = {
            let mapped = slice.get_mapped_range();
            bytemuck::cast_slice::<u8, SampleResult>(&mapped).to_vec()
        };
        readback.unmap();
        data
    }
}

fn storage_entry(binding: u32, read_only: bool) -> wgpu::BindGroupLayoutEntry {
    wgpu::BindGroupLayoutEntry {
        binding,
        visibility: wgpu::ShaderStages::COMPUTE,
        ty: wgpu::BindingType::Buffer {
            ty: wgpu::BufferBindingType::Storage { read_only },
            has_dynamic_offset: false,
            min_binding_size: None,
        },
        count: None,
    }
}

fn uniform_entry(binding: u32) -> wgpu::BindGroupLayoutEntry {
    wgpu::BindGroupLayoutEntry {
        binding,
        visibility: wgpu::ShaderStages::COMPUTE,
        ty: wgpu::BindingType::Buffer {
            ty: wgpu::BufferBindingType::Uniform,
            has_dynamic_offset: false,
            min_binding_size: None,
        },
        count: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn probe_volume_layout_is_aligned() {
        assert_eq!(std::mem::size_of::<ProbeIrradiance>(), 16);
        assert_eq!(std::mem::size_of::<SampleResult>(), 16);
        assert_eq!(RADIANCE_PROBE_COUNT, 64);
        let p = soak_probe_volume_params();
        assert_eq!(p.dim, 4);
        assert!(p.extent[0] > 0.0);
    }

    #[test]
    fn soak_samples_are_lit_and_dark_positions() {
        let s = soak_sample_points();
        assert_eq!(s.len(), 2);
        assert!(s[0].position[0] < 0.0);
        assert!(s[1].position[0] > 0.0);
    }
}
