//! Software micro-poly / cluster soft-raster substrate (secondary_winit).
//!
//! # Honesty
//! - Proves: cooked meshlet triangle soup → GPU visibility gate from
//!   `gpu_meshlet_cull` → compute soft-raster into a small depth/vis buffer
//!   with Instant metrics + fragment coverage evidence.
//! - Does **not** prove: Nanite virtualized geometry, hardware micro-poly AAA,
//!   UE visibility-buffer parity, or product WebView path.
//!   `nanite_ready` / `micro_poly_aaa_ready` stay **false**.

use bytemuck::{Pod, Zeroable};
use wgpu::util::DeviceExt;

use crate::gpu_meshlet_cull::MeshletCullScaffold;

/// Soft-raster target resolution (substrate — not product viewport).
pub const MICROPOLY_WIDTH: u32 = 64;
pub const MICROPOLY_HEIGHT: u32 = 64;

/// One cooked triangle tagged with owning meshlet (48 bytes, 16-aligned).
#[repr(C)]
#[derive(Debug, Clone, Copy, Pod, Zeroable)]
pub struct MicropolyTri {
    pub v0: [f32; 3],
    pub meshlet_id: u32,
    pub v1: [f32; 3],
    pub tri_id: u32,
    pub v2: [f32; 3],
    pub _pad: u32,
}

#[repr(C)]
#[derive(Debug, Clone, Copy, Pod, Zeroable)]
struct RasterParams {
    width: u32,
    height: u32,
    tri_count: u32,
    _pad: u32,
}

#[repr(C)]
#[derive(Debug, Clone, Copy, Pod, Zeroable)]
pub struct MicropolyRasterStats {
    pub triangles_considered: u32,
    pub triangles_visible: u32,
    pub fragments_written: u32,
    pub depth_tests_passed: u32,
}

const CLEAR_SHADER: &str = r#"
struct RasterParams {
    width: u32,
    height: u32,
    tri_count: u32,
    _pad: u32,
};

struct Stats {
    triangles_considered: atomic<u32>,
    triangles_visible: atomic<u32>,
    fragments_written: atomic<u32>,
    depth_tests_passed: atomic<u32>,
};

@group(0) @binding(0) var<uniform> params: RasterParams;
@group(0) @binding(1) var<storage, read_write> depth: array<atomic<u32>>;
@group(0) @binding(2) var<storage, read_write> vis: array<u32>;
@group(0) @binding(3) var<storage, read_write> stats: Stats;

@compute @workgroup_size(64)
fn clear_main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let pix = gid.x;
    let n = params.width * params.height;
    if (pix < n) {
        // Far depth as ordered u32 bits of 1.0f.
        atomicStore(&depth[pix], 0x3f800000u);
        vis[pix] = 0xffffffffu;
    }
    if (pix == 0u) {
        atomicStore(&stats.triangles_considered, 0u);
        atomicStore(&stats.triangles_visible, 0u);
        atomicStore(&stats.fragments_written, 0u);
        atomicStore(&stats.depth_tests_passed, 0u);
    }
}
"#;

const RASTER_SHADER: &str = r#"
struct MicropolyTri {
    v0: vec3<f32>,
    meshlet_id: u32,
    v1: vec3<f32>,
    tri_id: u32,
    v2: vec3<f32>,
    _pad: u32,
};

struct RasterParams {
    width: u32,
    height: u32,
    tri_count: u32,
    _pad: u32,
};

struct Stats {
    triangles_considered: atomic<u32>,
    triangles_visible: atomic<u32>,
    fragments_written: atomic<u32>,
    depth_tests_passed: atomic<u32>,
};

@group(0) @binding(0) var<uniform> params: RasterParams;
@group(0) @binding(1) var<storage, read> tris: array<MicropolyTri>;
@group(0) @binding(2) var<storage, read> visible_indices: array<u32>;
@group(0) @binding(3) var<storage, read> visible_count: u32;
@group(0) @binding(4) var<storage, read_write> depth: array<atomic<u32>>;
@group(0) @binding(5) var<storage, read_write> vis: array<u32>;
@group(0) @binding(6) var<storage, read_write> stats: Stats;

fn meshlet_visible(mid: u32) -> bool {
    let n = visible_count;
    for (var i = 0u; i < n; i = i + 1u) {
        if (visible_indices[i] == mid) {
            return true;
        }
    }
    return false;
}

fn project(p: vec3<f32>) -> vec3<f32> {
    // Match meshlet proxy draw NDC convention (xy/25, z from world).
    let ndc_xy = p.xy / 25.0;
    let z = clamp(0.5 + p.z / 50.0, 0.01, 0.99);
    return vec3<f32>(ndc_xy, z);
}

fn to_pixel(ndc: vec2<f32>) -> vec2<f32> {
    return vec2<f32>(
        (ndc.x * 0.5 + 0.5) * f32(params.width),
        (1.0 - (ndc.y * 0.5 + 0.5)) * f32(params.height),
    );
}

fn edge(a: vec2<f32>, b: vec2<f32>, p: vec2<f32>) -> f32 {
    return (p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x);
}

@compute @workgroup_size(64)
fn raster_main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let tid = gid.x;
    if (tid >= params.tri_count) {
        return;
    }
    atomicAdd(&stats.triangles_considered, 1u);
    let tri = tris[tid];
    if (!meshlet_visible(tri.meshlet_id)) {
        return;
    }
    atomicAdd(&stats.triangles_visible, 1u);

    let p0 = project(tri.v0);
    let p1 = project(tri.v1);
    let p2 = project(tri.v2);
    let s0 = to_pixel(p0.xy);
    let s1 = to_pixel(p1.xy);
    let s2 = to_pixel(p2.xy);

    let min_x = i32(floor(min(s0.x, min(s1.x, s2.x))));
    let max_x = i32(ceil(max(s0.x, max(s1.x, s2.x))));
    let min_y = i32(floor(min(s0.y, min(s1.y, s2.y))));
    let max_y = i32(ceil(max(s0.y, max(s1.y, s2.y))));
    let x0 = clamp(min_x, 0, i32(params.width) - 1);
    let x1 = clamp(max_x, 0, i32(params.width) - 1);
    let y0 = clamp(min_y, 0, i32(params.height) - 1);
    let y1 = clamp(max_y, 0, i32(params.height) - 1);

    let area = edge(s0, s1, s2);
    if (abs(area) < 1e-5) {
        return;
    }

    for (var y = y0; y <= y1; y = y + 1) {
        for (var x = x0; x <= x1; x = x + 1) {
            let p = vec2<f32>(f32(x) + 0.5, f32(y) + 0.5);
            let w0 = edge(s1, s2, p) / area;
            let w1 = edge(s2, s0, p) / area;
            let w2 = edge(s0, s1, p) / area;
            if (w0 < 0.0 || w1 < 0.0 || w2 < 0.0) {
                continue;
            }
            let z = w0 * p0.z + w1 * p1.z + w2 * p2.z;
            let zbits = bitcast<u32>(z);
            let pix = u32(y) * params.width + u32(x);
            let old = atomicMin(&depth[pix], zbits);
            if (zbits <= old) {
                atomicAdd(&stats.depth_tests_passed, 1u);
                vis[pix] = (tri.meshlet_id << 16u) | (tri.tri_id & 0xffffu);
                atomicAdd(&stats.fragments_written, 1u);
            }
        }
    }
}
"#;

/// Persistent soft-raster scaffold bound to cull visibility buffers.
pub struct MicropolyRasterScaffold {
    params: RasterParams,
    params_buffer: wgpu::Buffer,
    #[allow(dead_code)]
    tris_buffer: wgpu::Buffer,
    #[allow(dead_code)]
    depth_buffer: wgpu::Buffer,
    #[allow(dead_code)]
    vis_buffer: wgpu::Buffer,
    stats_buffer: wgpu::Buffer,
    clear_pipeline: wgpu::ComputePipeline,
    clear_bind_group: wgpu::BindGroup,
    raster_pipeline: wgpu::ComputePipeline,
    raster_bind_group: wgpu::BindGroup,
    pub triangle_count: u32,
    pub width: u32,
    pub height: u32,
}

impl MicropolyRasterScaffold {
    pub fn new(
        device: &wgpu::Device,
        tris: &[MicropolyTri],
        cull: &MeshletCullScaffold,
    ) -> Result<Self, String> {
        if tris.is_empty() {
            return Err("MicropolyRasterScaffold requires non-empty triangle soup".into());
        }
        let params = RasterParams {
            width: MICROPOLY_WIDTH,
            height: MICROPOLY_HEIGHT,
            tri_count: tris.len() as u32,
            _pad: 0,
        };
        let pix = (MICROPOLY_WIDTH * MICROPOLY_HEIGHT) as usize;

        let clear_shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Aethel Micropoly Clear"),
            source: wgpu::ShaderSource::Wgsl(CLEAR_SHADER.into()),
        });
        let raster_shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Aethel Micropoly Raster"),
            source: wgpu::ShaderSource::Wgsl(RASTER_SHADER.into()),
        });

        let params_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel Micropoly Params"),
            contents: bytemuck::bytes_of(&params),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });
        let tris_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel Micropoly Tris"),
            contents: bytemuck::cast_slice(tris),
            usage: wgpu::BufferUsages::STORAGE,
        });
        let depth_init = vec![0x3f800000u32; pix];
        let depth_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel Micropoly Depth"),
            contents: bytemuck::cast_slice(&depth_init),
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_DST,
        });
        let vis_init = vec![0xffffffffu32; pix];
        let vis_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel Micropoly Vis"),
            contents: bytemuck::cast_slice(&vis_init),
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_DST,
        });
        let stats_zero = MicropolyRasterStats {
            triangles_considered: 0,
            triangles_visible: 0,
            fragments_written: 0,
            depth_tests_passed: 0,
        };
        let stats_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel Micropoly Stats"),
            contents: bytemuck::bytes_of(&stats_zero),
            usage: wgpu::BufferUsages::STORAGE
                | wgpu::BufferUsages::COPY_SRC
                | wgpu::BufferUsages::COPY_DST,
        });

        let clear_bgl = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Aethel Micropoly Clear BGL"),
            entries: &[
                uniform_entry(0),
                storage_entry(1, false),
                storage_entry(2, false),
                storage_entry(3, false),
            ],
        });
        let clear_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Aethel Micropoly Clear Layout"),
            bind_group_layouts: &[&clear_bgl],
            push_constant_ranges: &[],
        });
        let clear_pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Aethel Micropoly Clear Pipeline"),
            layout: Some(&clear_layout),
            module: &clear_shader,
            entry_point: "clear_main",
            compilation_options: Default::default(),
        });
        let clear_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("Aethel Micropoly Clear BG"),
            layout: &clear_bgl,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: params_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: depth_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 2,
                    resource: vis_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 3,
                    resource: stats_buffer.as_entire_binding(),
                },
            ],
        });

        let raster_bgl = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Aethel Micropoly Raster BGL"),
            entries: &[
                uniform_entry(0),
                storage_entry(1, true),
                storage_entry(2, true),
                storage_entry(3, true),
                storage_entry(4, false),
                storage_entry(5, false),
                storage_entry(6, false),
            ],
        });
        let raster_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Aethel Micropoly Raster Layout"),
            bind_group_layouts: &[&raster_bgl],
            push_constant_ranges: &[],
        });
        let raster_pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Aethel Micropoly Raster Pipeline"),
            layout: Some(&raster_layout),
            module: &raster_shader,
            entry_point: "raster_main",
            compilation_options: Default::default(),
        });
        let raster_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("Aethel Micropoly Raster BG"),
            layout: &raster_bgl,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: params_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: tris_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 2,
                    resource: cull.visible_indices_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 3,
                    resource: cull.visible_count_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 4,
                    resource: depth_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 5,
                    resource: vis_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 6,
                    resource: stats_buffer.as_entire_binding(),
                },
            ],
        });

        Ok(Self {
            params,
            params_buffer,
            tris_buffer,
            depth_buffer,
            vis_buffer,
            stats_buffer,
            clear_pipeline,
            clear_bind_group,
            raster_pipeline,
            raster_bind_group,
            triangle_count: params.tri_count,
            width: params.width,
            height: params.height,
        })
    }

    /// Clear + soft-raster visible meshlet triangles (no CPU readback on hot path).
    pub fn encode_raster(&self, queue: &wgpu::Queue, encoder: &mut wgpu::CommandEncoder) {
        queue.write_buffer(&self.params_buffer, 0, bytemuck::bytes_of(&self.params));
        let pix = self.width * self.height;
        {
            let mut pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
                label: Some("Aethel Micropoly Clear"),
                timestamp_writes: None,
            });
            pass.set_pipeline(&self.clear_pipeline);
            pass.set_bind_group(0, &self.clear_bind_group, &[]);
            pass.dispatch_workgroups(pix.div_ceil(64), 1, 1);
        }
        {
            let mut pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
                label: Some("Aethel Micropoly Soft Raster"),
                timestamp_writes: None,
            });
            pass.set_pipeline(&self.raster_pipeline);
            pass.set_bind_group(0, &self.raster_bind_group, &[]);
            pass.dispatch_workgroups(self.triangle_count.div_ceil(64), 1, 1);
        }
    }

    /// Post-loop evidence only.
    pub fn readback_stats(
        &self,
        device: &wgpu::Device,
        queue: &wgpu::Queue,
    ) -> MicropolyRasterStats {
        let readback = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Aethel Micropoly Stats Readback"),
            size: std::mem::size_of::<MicropolyRasterStats>() as u64,
            usage: wgpu::BufferUsages::MAP_READ | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });
        let mut encoder = device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
            label: Some("Aethel Micropoly Stats Readback Encoder"),
        });
        encoder.copy_buffer_to_buffer(
            &self.stats_buffer,
            0,
            &readback,
            0,
            std::mem::size_of::<MicropolyRasterStats>() as u64,
        );
        queue.submit(Some(encoder.finish()));
        let slice = readback.slice(..);
        slice.map_async(wgpu::MapMode::Read, |_| {});
        device.poll(wgpu::Maintain::Wait);
        let stats = {
            let data = slice.get_mapped_range();
            *bytemuck::from_bytes::<MicropolyRasterStats>(&data)
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
    fn micropoly_tri_is_48_bytes() {
        assert_eq!(std::mem::size_of::<MicropolyTri>(), 48);
        assert_eq!(std::mem::size_of::<MicropolyRasterStats>(), 16);
        assert_eq!(MICROPOLY_WIDTH, 64);
    }
}
