//! Entropy / GPU destruction substrate (secondary_winit).
//!
//! # Honesty
//! - Proves: real fracture chunk SoA buffer, GPU impulse fracture spawn,
//!   debris integration (gravity + domain bounce), Instant metrics, post-loop
//!   stats proving chunks actually updated.
//! - Does **not** prove: Unreal Chaos destruction, Niagara graph compiler,
//!   Voronoi cook product path, or WebView exclusive debris.
//!   `entropy_aaa_ready` / `chaos_aaa_ready` / `nanite_ready` /
//!   `micro_poly_aaa_ready` / `lumen_ready` / `vsm_aaa_ready` /
//!   `fsr_aaa_ready` stay **false**.

use bytemuck::{Pod, Zeroable};
use wgpu::util::DeviceExt;

/// Substrate chunk count (4k-class fracture — still not Chaos 10k+ clusters,
/// still not Voronoi-cooked product destruction).
pub const ENTROPY_CHUNK_COUNT: u32 = 4096;
const WORKGROUP: u32 = 64;

#[repr(C)]
#[derive(Debug, Clone, Copy, Pod, Zeroable)]
struct EntropyParams {
    chunk_count: u32,
    frame_index: u32,
    fracture_armed: u32,
    _pad: u32,
    dt: f32,
    gravity_y: f32,
    domain_half: f32,
    impulse_strength: f32,
    impact_point: [f32; 3],
    _pad2: f32,
}

#[repr(C)]
#[derive(Debug, Clone, Copy, Pod, Zeroable)]
pub struct EntropyChunk {
    /// xyz = position, w = health (1 intact → 0 shattered debris).
    pub pos_health: [f32; 4],
    /// xyz = velocity, w = angular speed stub.
    pub vel_spin: [f32; 4],
}

#[repr(C)]
#[derive(Debug, Clone, Copy, Pod, Zeroable)]
pub struct EntropyStats {
    pub chunks_active: u32,
    pub chunks_updated: u32,
    pub chunks_fractured: u32,
    pub debris_alive: u32,
}

const CLEAR_SHADER: &str = r#"
struct Stats {
    chunks_active: atomic<u32>,
    chunks_updated: atomic<u32>,
    chunks_fractured: atomic<u32>,
    debris_alive: atomic<u32>,
};

@group(0) @binding(0) var<storage, read_write> stats: Stats;

@compute @workgroup_size(1)
fn clear_main() {
    atomicStore(&stats.chunks_active, 0u);
    atomicStore(&stats.chunks_updated, 0u);
    atomicStore(&stats.chunks_fractured, 0u);
    atomicStore(&stats.debris_alive, 0u);
}
"#;

const SIM_SHADER: &str = r#"
struct EntropyParams {
    chunk_count: u32,
    frame_index: u32,
    fracture_armed: u32,
    _pad: u32,
    dt: f32,
    gravity_y: f32,
    domain_half: f32,
    impulse_strength: f32,
    impact_point: vec3<f32>,
    _pad2: f32,
};

struct Chunk {
    pos_health: vec4<f32>,
    vel_spin: vec4<f32>,
};

struct Stats {
    chunks_active: atomic<u32>,
    chunks_updated: atomic<u32>,
    chunks_fractured: atomic<u32>,
    debris_alive: atomic<u32>,
};

@group(0) @binding(0) var<uniform> params: EntropyParams;
@group(0) @binding(1) var<storage, read_write> chunks: array<Chunk>;
@group(0) @binding(2) var<storage, read_write> stats: Stats;

@compute @workgroup_size(64)
fn sim_main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let i = gid.x;
    if (i >= params.chunk_count) {
        return;
    }

    var c = chunks[i];
    let prev_pos = c.pos_health.xyz;
    let prev_health = c.pos_health.w;

    // Fracture impulse when armed and chunk still mostly intact near impact.
    if (params.fracture_armed != 0u && prev_health > 0.5) {
        let to_c = prev_pos - params.impact_point;
        let dist = length(to_c);
        if (dist < 2.5) {
            let dir = select(normalize(to_c), vec3<f32>(0.0, 1.0, 0.0), dist < 1e-4);
            let falloff = 1.0 - clamp(dist / 2.5, 0.0, 1.0);
            c.vel_spin = vec4<f32>(
                c.vel_spin.xyz + dir * params.impulse_strength * falloff,
                c.vel_spin.w + falloff * 4.0,
            );
            c.pos_health.w = max(prev_health - 0.55 * falloff, 0.0);
            atomicAdd(&stats.chunks_fractured, 1u);
        }
    }

    // Debris integration (gravity + domain bounce).
    var vel = c.vel_spin.xyz;
    vel.y = vel.y + params.gravity_y * params.dt;
    var pos = c.pos_health.xyz + vel * params.dt;
    let h = params.domain_half;
    if (pos.x > h) { pos.x = h; vel.x = -vel.x * 0.55; }
    if (pos.x < -h) { pos.x = -h; vel.x = -vel.x * 0.55; }
    if (pos.y > h) { pos.y = h; vel.y = -vel.y * 0.55; }
    if (pos.y < -h) { pos.y = -h; vel.y = -vel.y * 0.35; }
    if (pos.z > h) { pos.z = h; vel.z = -vel.z * 0.55; }
    if (pos.z < -h) { pos.z = -h; vel.z = -vel.z * 0.55; }

    c.pos_health = vec4<f32>(pos, c.pos_health.w);
    c.vel_spin = vec4<f32>(vel, c.vel_spin.w * 0.98);
    chunks[i] = c;

    atomicAdd(&stats.chunks_active, 1u);
    let moved = distance(prev_pos, pos) > 1e-5
        || abs(prev_health - c.pos_health.w) > 1e-5
        || length(vel) > 1e-4;
    if (moved) {
        atomicAdd(&stats.chunks_updated, 1u);
    }
    if (c.pos_health.w < 0.5) {
        atomicAdd(&stats.debris_alive, 1u);
    }
}
"#;

/// Persistent fracture chunk buffer for secondary present.
pub struct EntropyDestructionScaffold {
    params: EntropyParams,
    params_buffer: wgpu::Buffer,
    #[allow(dead_code)]
    chunks_buffer: wgpu::Buffer,
    stats_buffer: wgpu::Buffer,
    clear_pipeline: wgpu::ComputePipeline,
    clear_bind_group: wgpu::BindGroup,
    sim_pipeline: wgpu::ComputePipeline,
    sim_bind_group: wgpu::BindGroup,
    pub chunk_count: u32,
    frame_index: u32,
    /// MPSC consumption: runtime impulse strength override (0 = substrate default).
    impulse_strength_override: std::sync::atomic::AtomicU32,
}

impl EntropyDestructionScaffold {
    pub fn new(device: &wgpu::Device) -> Result<Self, String> {
        let params = EntropyParams {
            chunk_count: ENTROPY_CHUNK_COUNT,
            frame_index: 1,
            fracture_armed: 1,
            _pad: 0,
            dt: 1.0 / 60.0,
            gravity_y: -9.81,
            domain_half: 4.0,
            impulse_strength: 6.0,
            impact_point: [0.0, 0.5, 0.0],
            _pad2: 0.0,
        };

        let mut chunks = Vec::with_capacity(ENTROPY_CHUNK_COUNT as usize);
        let side = (ENTROPY_CHUNK_COUNT as f32).sqrt().ceil() as u32;
        // Fill the domain with the chunk grid: spacing derives from the domain
        // so the density stays meaningful at any chunk count (no boundary pile-up).
        let spacing = (params.domain_half * 2.0) / side.max(1) as f32;
        for i in 0..ENTROPY_CHUNK_COUNT {
            let gx = (i % side) as f32;
            let gz = (i / side) as f32;
            let x = (gx - side as f32 * 0.5) * spacing;
            let z = (gz - side as f32 * 0.5) * spacing;
            chunks.push(EntropyChunk {
                pos_health: [x, 1.2 + (i % 3) as f32 * 0.15, z, 1.0],
                vel_spin: [0.0, 0.0, 0.0, 0.0],
            });
        }
        let stats_zero = EntropyStats {
            chunks_active: 0,
            chunks_updated: 0,
            chunks_fractured: 0,
            debris_alive: 0,
        };

        let params_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel Entropy Params"),
            contents: bytemuck::bytes_of(&params),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });
        let chunks_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel Entropy Chunks"),
            contents: bytemuck::cast_slice(&chunks),
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_SRC,
        });
        let stats_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel Entropy Stats"),
            contents: bytemuck::bytes_of(&stats_zero),
            usage: wgpu::BufferUsages::STORAGE
                | wgpu::BufferUsages::COPY_SRC
                | wgpu::BufferUsages::COPY_DST,
        });

        let clear_shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Aethel Entropy Clear"),
            source: wgpu::ShaderSource::Wgsl(CLEAR_SHADER.into()),
        });
        let sim_shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Aethel Entropy Sim"),
            source: wgpu::ShaderSource::Wgsl(SIM_SHADER.into()),
        });

        let clear_bgl = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Aethel Entropy Clear BGL"),
            entries: &[storage_entry(0, false)],
        });
        let clear_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Aethel Entropy Clear Layout"),
            bind_group_layouts: &[&clear_bgl],
            push_constant_ranges: &[],
        });
        let clear_pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Aethel Entropy Clear Pipeline"),
            layout: Some(&clear_layout),
            module: &clear_shader,
            entry_point: "clear_main",
            compilation_options: Default::default(),
        });
        let clear_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("Aethel Entropy Clear BG"),
            layout: &clear_bgl,
            entries: &[wgpu::BindGroupEntry {
                binding: 0,
                resource: stats_buffer.as_entire_binding(),
            }],
        });

        let sim_bgl = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Aethel Entropy Sim BGL"),
            entries: &[
                uniform_entry(0),
                storage_entry(1, false),
                storage_entry(2, false),
            ],
        });
        let sim_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Aethel Entropy Sim Layout"),
            bind_group_layouts: &[&sim_bgl],
            push_constant_ranges: &[],
        });
        let sim_pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Aethel Entropy Sim Pipeline"),
            layout: Some(&sim_layout),
            module: &sim_shader,
            entry_point: "sim_main",
            compilation_options: Default::default(),
        });
        let sim_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("Aethel Entropy Sim BG"),
            layout: &sim_bgl,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: params_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: chunks_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 2,
                    resource: stats_buffer.as_entire_binding(),
                },
            ],
        });

        Ok(Self {
            params,
            params_buffer,
            chunks_buffer,
            stats_buffer,
            clear_pipeline,
            clear_bind_group,
            sim_pipeline,
            sim_bind_group,
            chunk_count: ENTROPY_CHUNK_COUNT,
            frame_index: 1,
            impulse_strength_override: std::sync::atomic::AtomicU32::new(0.0f32.to_bits()),
        })
    }

    /// MPSC consumption: runtime impulse strength (0.5..=8.0).
    pub fn set_impulse_strength(&self, strength: f32) {
        self.impulse_strength_override
            .store(strength.clamp(0.5, 8.0).to_bits(), std::sync::atomic::Ordering::Relaxed);
    }

    /// Effective impulse strength (override or substrate default).
    pub fn effective_impulse_strength(&self) -> f32 {
        let ov = f32::from_bits(
            self.impulse_strength_override
                .load(std::sync::atomic::Ordering::Relaxed),
        );
        if ov > 0.0 {
            ov
        } else {
            self.params.impulse_strength
        }
    }

    /// Clear stats → fracture impulse (frame 0–1) → integrate debris chunks.
    pub fn encode_simulate(&mut self, queue: &wgpu::Queue, encoder: &mut wgpu::CommandEncoder) {
        self.frame_index = self.frame_index.wrapping_add(1).max(1);
        // Arm fracture on early frames so chunks shatter then settle under gravity.
        self.params.frame_index = self.frame_index;
        self.params.fracture_armed = u32::from(self.frame_index <= 3);
        // MPSC consumption: runtime impulse override.
        let ov = f32::from_bits(
            self.impulse_strength_override
                .load(std::sync::atomic::Ordering::Relaxed),
        );
        if ov > 0.0 {
            self.params.impulse_strength = ov;
        }
        queue.write_buffer(&self.params_buffer, 0, bytemuck::bytes_of(&self.params));

        {
            let mut pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
                label: Some("Aethel Entropy Clear Stats"),
                timestamp_writes: None,
            });
            pass.set_pipeline(&self.clear_pipeline);
            pass.set_bind_group(0, &self.clear_bind_group, &[]);
            pass.dispatch_workgroups(1, 1, 1);
        }
        {
            let mut pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
                label: Some("Aethel Entropy Fracture+Integrate"),
                timestamp_writes: None,
            });
            pass.set_pipeline(&self.sim_pipeline);
            pass.set_bind_group(0, &self.sim_bind_group, &[]);
            pass.dispatch_workgroups(self.chunk_count.div_ceil(WORKGROUP), 1, 1);
        }
    }

    pub fn readback_stats(&self, device: &wgpu::Device, queue: &wgpu::Queue) -> EntropyStats {
        let readback = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Aethel Entropy Stats Readback"),
            size: std::mem::size_of::<EntropyStats>() as u64,
            usage: wgpu::BufferUsages::MAP_READ | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });
        let mut encoder = device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
            label: Some("Aethel Entropy Stats Readback Encoder"),
        });
        encoder.copy_buffer_to_buffer(
            &self.stats_buffer,
            0,
            &readback,
            0,
            std::mem::size_of::<EntropyStats>() as u64,
        );
        queue.submit(Some(encoder.finish()));
        let slice = readback.slice(..);
        slice.map_async(wgpu::MapMode::Read, |_| {});
        device.poll(wgpu::Maintain::Wait);
        let stats = {
            let data = slice.get_mapped_range();
            *bytemuck::from_bytes::<EntropyStats>(&data)
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
    fn entropy_layout_contracts() {
        assert_eq!(std::mem::size_of::<EntropyChunk>(), 32);
        assert_eq!(std::mem::size_of::<EntropyStats>(), 16);
        assert_eq!(ENTROPY_CHUNK_COUNT, 4096);
    }
}
