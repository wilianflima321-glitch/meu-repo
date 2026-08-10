//! FSR / temporal upsample substrate (secondary_winit) — Law XV Scalable Fidelity.
//!
//! # Honesty
//! - Proves: real low-res color buffer, high-res history buffer, reactive mask
//!   stub, GPU temporal blend + upsample (2×), Instant metrics, post-loop
//!   stats proving history was sampled and output texels written.
//! - Does **not** prove: AMD FSR 3 Frame Generation, FidelityFX SDK product
//!   path, DLSS, or WebView exclusive upscale.
//!   `fsr_aaa_ready` / `fsr3_ready` / `nanite_ready` / `micro_poly_aaa_ready` /
//!   `lumen_ready` / `vsm_aaa_ready` stay **false**.

use bytemuck::{Pod, Zeroable};
use wgpu::util::DeviceExt;

/// Substrate low-res edge (not product viewport).
pub const FSR_INPUT_EDGE: u32 = 32;
/// Upscale factor for this substrate (Law XV internal scale 0.5 → 2× present).
pub const FSR_SCALE: u32 = 2;
pub const FSR_OUTPUT_EDGE: u32 = FSR_INPUT_EDGE * FSR_SCALE;

const _: () = assert!(FSR_OUTPUT_EDGE == 64);

#[repr(C)]
#[derive(Debug, Clone, Copy, Pod, Zeroable)]
struct FsrParams {
    input_edge: u32,
    output_edge: u32,
    scale: u32,
    frame_index: u32,
    /// Sub-pixel jitter in output UV space (temporal stub, not FSR3 FG).
    jitter: [f32; 2],
    history_weight: f32,
    reactive_threshold: f32,
}

#[repr(C)]
#[derive(Debug, Clone, Copy, Pod, Zeroable)]
pub struct FsrStats {
    pub input_texels_filled: u32,
    pub output_texels_written: u32,
    pub history_samples_blended: u32,
    pub reactive_mask_texels: u32,
}

const FILL_SHADER: &str = r#"
struct FsrParams {
    input_edge: u32,
    output_edge: u32,
    scale: u32,
    frame_index: u32,
    jitter: vec2<f32>,
    history_weight: f32,
    reactive_threshold: f32,
};

struct Stats {
    input_texels_filled: atomic<u32>,
    output_texels_written: atomic<u32>,
    history_samples_blended: atomic<u32>,
    reactive_mask_texels: atomic<u32>,
};

@group(0) @binding(0) var<uniform> params: FsrParams;
@group(0) @binding(1) var<storage, read_write> input_color: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read_write> stats: Stats;

@compute @workgroup_size(8, 8, 1)
fn fill_main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let x = gid.x;
    let y = gid.y;
    if (x >= params.input_edge || y >= params.input_edge) {
        return;
    }
    let uv = (vec2<f32>(f32(x), f32(y)) + vec2<f32>(0.5)) / f32(params.input_edge);
    let t = f32(params.frame_index) * 0.15;
    let r = 0.35 + 0.35 * sin(uv.x * 6.28318 + t);
    let g = 0.25 + 0.40 * cos(uv.y * 6.28318 - t * 0.7);
    let b = 0.20 + 0.30 * sin((uv.x + uv.y) * 4.0 + t * 0.5);
    let idx = y * params.input_edge + x;
    input_color[idx] = vec4<f32>(clamp(r, 0.0, 1.0), clamp(g, 0.0, 1.0), clamp(b, 0.0, 1.0), 1.0);
    atomicAdd(&stats.input_texels_filled, 1u);
}
"#;

const UPSAMPLE_SHADER: &str = r#"
struct FsrParams {
    input_edge: u32,
    output_edge: u32,
    scale: u32,
    frame_index: u32,
    jitter: vec2<f32>,
    history_weight: f32,
    reactive_threshold: f32,
};

struct Stats {
    input_texels_filled: atomic<u32>,
    output_texels_written: atomic<u32>,
    history_samples_blended: atomic<u32>,
    reactive_mask_texels: atomic<u32>,
};

@group(0) @binding(0) var<uniform> params: FsrParams;
@group(0) @binding(1) var<storage, read> input_color: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read_write> history: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read_write> output_color: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read_write> reactive_mask: array<f32>;
@group(0) @binding(5) var<storage, read_write> stats: Stats;

fn sample_input_bilinear(uv: vec2<f32>) -> vec4<f32> {
    let edge = f32(params.input_edge);
    let px = uv * edge - vec2<f32>(0.5);
    let x0 = u32(clamp(floor(px.x), 0.0, edge - 1.0));
    let y0 = u32(clamp(floor(px.y), 0.0, edge - 1.0));
    let x1 = min(x0 + 1u, params.input_edge - 1u);
    let y1 = min(y0 + 1u, params.input_edge - 1u);
    let fx = clamp(px.x - f32(x0), 0.0, 1.0);
    let fy = clamp(px.y - f32(y0), 0.0, 1.0);
    let c00 = input_color[y0 * params.input_edge + x0];
    let c10 = input_color[y0 * params.input_edge + x1];
    let c01 = input_color[y1 * params.input_edge + x0];
    let c11 = input_color[y1 * params.input_edge + x1];
    let a = mix(c00, c10, fx);
    let b = mix(c01, c11, fx);
    return mix(a, b, fy);
}

fn luma(c: vec4<f32>) -> f32 {
    return dot(c.rgb, vec3<f32>(0.2126, 0.7152, 0.0722));
}

@compute @workgroup_size(8, 8, 1)
fn upsample_main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let x = gid.x;
    let y = gid.y;
    if (x >= params.output_edge || y >= params.output_edge) {
        return;
    }
    let out_uv = (vec2<f32>(f32(x), f32(y)) + vec2<f32>(0.5) + params.jitter)
        / f32(params.output_edge);
    let uv = clamp(out_uv, vec2<f32>(0.0), vec2<f32>(1.0));
    let current = sample_input_bilinear(uv);
    let idx = y * params.output_edge + x;
    let hist = history[idx];
    let delta = abs(luma(current) - luma(hist));
    let reactive = select(0.0, 1.0, delta > params.reactive_threshold);
    reactive_mask[idx] = reactive;
    if (reactive > 0.5) {
        atomicAdd(&stats.reactive_mask_texels, 1u);
    }

    var out_c = current;
    // Frame 0 seeds history; later frames blend (temporal stub — not FSR3 FG).
    if (params.frame_index > 1u) {
        let w = mix(params.history_weight, 0.05, reactive);
        out_c = mix(current, hist, w);
        atomicAdd(&stats.history_samples_blended, 1u);
    }
    output_color[idx] = out_c;
    history[idx] = out_c;
    atomicAdd(&stats.output_texels_written, 1u);
}
"#;

const CLEAR_STATS_SHADER: &str = r#"
struct Stats {
    input_texels_filled: atomic<u32>,
    output_texels_written: atomic<u32>,
    history_samples_blended: atomic<u32>,
    reactive_mask_texels: atomic<u32>,
};

@group(0) @binding(0) var<storage, read_write> stats: Stats;

@compute @workgroup_size(1)
fn clear_stats_main() {
    atomicStore(&stats.input_texels_filled, 0u);
    atomicStore(&stats.output_texels_written, 0u);
    atomicStore(&stats.history_samples_blended, 0u);
    atomicStore(&stats.reactive_mask_texels, 0u);
}
"#;

/// Persistent FSR temporal upsample buffers for secondary present.
pub struct FsrTemporalUpsample {
    params: FsrParams,
    params_buffer: wgpu::Buffer,
    #[allow(dead_code)]
    input_buffer: wgpu::Buffer,
    #[allow(dead_code)]
    history_buffer: wgpu::Buffer,
    #[allow(dead_code)]
    output_buffer: wgpu::Buffer,
    #[allow(dead_code)]
    reactive_buffer: wgpu::Buffer,
    stats_buffer: wgpu::Buffer,
    clear_pipeline: wgpu::ComputePipeline,
    clear_bind_group: wgpu::BindGroup,
    fill_pipeline: wgpu::ComputePipeline,
    fill_bind_group: wgpu::BindGroup,
    upsample_pipeline: wgpu::ComputePipeline,
    upsample_bind_group: wgpu::BindGroup,
    pub input_edge: u32,
    pub output_edge: u32,
    pub scale: u32,
    frame_index: u32,
}

impl FsrTemporalUpsample {
    pub fn new(device: &wgpu::Device) -> Result<Self, String> {
        let params = FsrParams {
            input_edge: FSR_INPUT_EDGE,
            output_edge: FSR_OUTPUT_EDGE,
            scale: FSR_SCALE,
            frame_index: 1,
            jitter: [0.0, 0.0],
            history_weight: 0.85,
            reactive_threshold: 0.08,
        };

        let input_len = (FSR_INPUT_EDGE * FSR_INPUT_EDGE) as usize;
        let output_len = (FSR_OUTPUT_EDGE * FSR_OUTPUT_EDGE) as usize;
        let input_init = vec![[0.0_f32; 4]; input_len];
        let output_init = vec![[0.0_f32; 4]; output_len];
        let reactive_init = vec![0.0_f32; output_len];
        let stats_zero = FsrStats {
            input_texels_filled: 0,
            output_texels_written: 0,
            history_samples_blended: 0,
            reactive_mask_texels: 0,
        };

        let params_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel FSR Params"),
            contents: bytemuck::bytes_of(&params),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });
        let input_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel FSR Input Color"),
            contents: bytemuck::cast_slice(&input_init),
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_DST,
        });
        let history_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel FSR History"),
            contents: bytemuck::cast_slice(&output_init),
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_DST,
        });
        let output_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel FSR Output Color"),
            contents: bytemuck::cast_slice(&output_init),
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_SRC,
        });
        let reactive_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel FSR Reactive Mask"),
            contents: bytemuck::cast_slice(&reactive_init),
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_DST,
        });
        let stats_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel FSR Stats"),
            contents: bytemuck::bytes_of(&stats_zero),
            usage: wgpu::BufferUsages::STORAGE
                | wgpu::BufferUsages::COPY_SRC
                | wgpu::BufferUsages::COPY_DST,
        });

        let clear_shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Aethel FSR Clear Stats"),
            source: wgpu::ShaderSource::Wgsl(CLEAR_STATS_SHADER.into()),
        });
        let fill_shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Aethel FSR Fill"),
            source: wgpu::ShaderSource::Wgsl(FILL_SHADER.into()),
        });
        let upsample_shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Aethel FSR Upsample"),
            source: wgpu::ShaderSource::Wgsl(UPSAMPLE_SHADER.into()),
        });

        let clear_bgl = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Aethel FSR Clear BGL"),
            entries: &[storage_entry(0, false)],
        });
        let clear_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Aethel FSR Clear Layout"),
            bind_group_layouts: &[&clear_bgl],
            push_constant_ranges: &[],
        });
        let clear_pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Aethel FSR Clear Pipeline"),
            layout: Some(&clear_layout),
            module: &clear_shader,
            entry_point: "clear_stats_main",
            compilation_options: Default::default(),
        });
        let clear_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("Aethel FSR Clear BG"),
            layout: &clear_bgl,
            entries: &[wgpu::BindGroupEntry {
                binding: 0,
                resource: stats_buffer.as_entire_binding(),
            }],
        });

        let fill_bgl = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Aethel FSR Fill BGL"),
            entries: &[
                uniform_entry(0),
                storage_entry(1, false),
                storage_entry(2, false),
            ],
        });
        let fill_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Aethel FSR Fill Layout"),
            bind_group_layouts: &[&fill_bgl],
            push_constant_ranges: &[],
        });
        let fill_pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Aethel FSR Fill Pipeline"),
            layout: Some(&fill_layout),
            module: &fill_shader,
            entry_point: "fill_main",
            compilation_options: Default::default(),
        });
        let fill_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("Aethel FSR Fill BG"),
            layout: &fill_bgl,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: params_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: input_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 2,
                    resource: stats_buffer.as_entire_binding(),
                },
            ],
        });

        let upsample_bgl = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Aethel FSR Upsample BGL"),
            entries: &[
                uniform_entry(0),
                storage_entry(1, true),
                storage_entry(2, false),
                storage_entry(3, false),
                storage_entry(4, false),
                storage_entry(5, false),
            ],
        });
        let upsample_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Aethel FSR Upsample Layout"),
            bind_group_layouts: &[&upsample_bgl],
            push_constant_ranges: &[],
        });
        let upsample_pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Aethel FSR Upsample Pipeline"),
            layout: Some(&upsample_layout),
            module: &upsample_shader,
            entry_point: "upsample_main",
            compilation_options: Default::default(),
        });
        let upsample_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("Aethel FSR Upsample BG"),
            layout: &upsample_bgl,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: params_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: input_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 2,
                    resource: history_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 3,
                    resource: output_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 4,
                    resource: reactive_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 5,
                    resource: stats_buffer.as_entire_binding(),
                },
            ],
        });

        Ok(Self {
            params,
            params_buffer,
            input_buffer,
            history_buffer,
            output_buffer,
            reactive_buffer,
            stats_buffer,
            clear_pipeline,
            clear_bind_group,
            fill_pipeline,
            fill_bind_group,
            upsample_pipeline,
            upsample_bind_group,
            input_edge: FSR_INPUT_EDGE,
            output_edge: FSR_OUTPUT_EDGE,
            scale: FSR_SCALE,
            frame_index: 1,
        })
    }

    /// Clear stats → fill LR color → temporal upsample into HR + history + reactive mask.
    pub fn encode_upsample(&mut self, queue: &wgpu::Queue, encoder: &mut wgpu::CommandEncoder) {
        self.frame_index = self.frame_index.wrapping_add(1).max(1);
        // Halton-lite 2D jitter stub (not AMD FSR3 FG).
        let phase = (self.frame_index % 8) as f32;
        self.params.frame_index = self.frame_index;
        let edge = self.output_edge as f32;
        self.params.jitter = [
            ((phase * 0.125) - 0.5) / edge,
            (((phase * 0.375) % 1.0) - 0.5) / edge,
        ];
        queue.write_buffer(&self.params_buffer, 0, bytemuck::bytes_of(&self.params));

        {
            let mut pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
                label: Some("Aethel FSR Clear Stats"),
                timestamp_writes: None,
            });
            pass.set_pipeline(&self.clear_pipeline);
            pass.set_bind_group(0, &self.clear_bind_group, &[]);
            pass.dispatch_workgroups(1, 1, 1);
        }
        {
            let mut pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
                label: Some("Aethel FSR Fill LR"),
                timestamp_writes: None,
            });
            pass.set_pipeline(&self.fill_pipeline);
            pass.set_bind_group(0, &self.fill_bind_group, &[]);
            pass.dispatch_workgroups(
                self.input_edge.div_ceil(8),
                self.input_edge.div_ceil(8),
                1,
            );
        }
        {
            let mut pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
                label: Some("Aethel FSR Temporal Upsample"),
                timestamp_writes: None,
            });
            pass.set_pipeline(&self.upsample_pipeline);
            pass.set_bind_group(0, &self.upsample_bind_group, &[]);
            pass.dispatch_workgroups(
                self.output_edge.div_ceil(8),
                self.output_edge.div_ceil(8),
                1,
            );
        }
    }

    pub fn readback_stats(&self, device: &wgpu::Device, queue: &wgpu::Queue) -> FsrStats {
        let readback = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Aethel FSR Stats Readback"),
            size: std::mem::size_of::<FsrStats>() as u64,
            usage: wgpu::BufferUsages::MAP_READ | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });
        let mut encoder = device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
            label: Some("Aethel FSR Stats Readback Encoder"),
        });
        encoder.copy_buffer_to_buffer(
            &self.stats_buffer,
            0,
            &readback,
            0,
            std::mem::size_of::<FsrStats>() as u64,
        );
        queue.submit(Some(encoder.finish()));
        let slice = readback.slice(..);
        slice.map_async(wgpu::MapMode::Read, |_| {});
        device.poll(wgpu::Maintain::Wait);
        let stats = {
            let data = slice.get_mapped_range();
            *bytemuck::from_bytes::<FsrStats>(&data)
        };
        readback.unmap();
        stats
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
    fn fsr_layout_contracts() {
        assert_eq!(std::mem::size_of::<FsrStats>(), 16);
        assert_eq!(std::mem::size_of::<FsrParams>(), 32);
        assert_eq!(FSR_INPUT_EDGE, 32);
        assert_eq!(FSR_OUTPUT_EDGE, 64);
        assert_eq!(FSR_SCALE, 2);
    }
}
