//! Virtual Shadow Map / cascade shadow substrate (secondary_winit).
//!
//! # Honesty
//! - Proves: real page table + physical depth atlas, cascade tagging, GPU
//!   clear + depth writes into allocated pages, Instant metrics, post-loop
//!   stats proving pages actually received depth.
//! - Does **not** prove: UE5 VSM parity, 16k virtual maps, clipmap streaming
//!   product path, or WebView exclusive shadows.
//!   `vsm_aaa_ready` / `nanite_ready` / `micro_poly_aaa_ready` / `lumen_ready`
//!   stay **false**.

use bytemuck::{Pod, Zeroable};
use wgpu::util::DeviceExt;

/// Substrate-scale virtual page grid (not UE 128²).
pub const VSM_VIRTUAL_GRID: u32 = 8;
pub const VSM_VIRTUAL_PAGES: u32 = VSM_VIRTUAL_GRID * VSM_VIRTUAL_GRID;
/// Physical atlas page pool capacity.
pub const VSM_PHYSICAL_POOL: u32 = 16;
/// Pixels per page edge.
pub const VSM_PAGE_PIXELS: u32 = 32;
/// Directional clipmap cascade count in this substrate.
pub const VSM_CASCADE_COUNT: u32 = 2;

const _: () = assert!(VSM_VIRTUAL_PAGES == 64);
const _: () = assert!(VSM_PHYSICAL_POOL <= VSM_VIRTUAL_PAGES);

#[repr(C)]
#[derive(Debug, Clone, Copy, Pod, Zeroable)]
pub struct VsmPageEntry {
    /// Physical slot index, or `0xFFFF_FFFF` if unallocated.
    pub physical_idx: u32,
    pub cascade: u32,
    pub _reserved: u32,
    pub last_frame: u32,
}

#[repr(C)]
#[derive(Debug, Clone, Copy, Pod, Zeroable)]
struct VsmParams {
    virtual_grid: u32,
    physical_pool: u32,
    page_pixels: u32,
    cascade_count: u32,
    light_dir: [f32; 3],
    frame_index: u32,
    caster_center: [f32; 3],
    caster_radius: f32,
}

#[repr(C)]
#[derive(Debug, Clone, Copy, Pod, Zeroable)]
pub struct VsmStats {
    pub pages_allocated: u32,
    pub pages_depth_written: u32,
    pub texels_written: u32,
    pub cascades_tagged: u32,
}

const CLEAR_SHADER: &str = r#"
struct VsmParams {
    virtual_grid: u32,
    physical_pool: u32,
    page_pixels: u32,
    cascade_count: u32,
    light_dir: vec3<f32>,
    frame_index: u32,
    caster_center: vec3<f32>,
    caster_radius: f32,
};

struct PageEntry {
    physical_idx: u32,
    cascade: u32,
    _reserved: u32,
    last_frame: u32,
};

struct Stats {
    pages_allocated: atomic<u32>,
    pages_depth_written: atomic<u32>,
    texels_written: atomic<u32>,
    cascades_tagged: atomic<u32>,
};

@group(0) @binding(0) var<uniform> params: VsmParams;
@group(0) @binding(1) var<storage, read_write> pages: array<PageEntry>;
@group(0) @binding(2) var<storage, read_write> atlas: array<f32>;
@group(0) @binding(3) var<storage, read_write> page_flags: array<atomic<u32>>;
@group(0) @binding(4) var<storage, read_write> stats: Stats;

@compute @workgroup_size(64)
fn clear_main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let i = gid.x;
    let atlas_len = params.physical_pool * params.page_pixels * params.page_pixels;
    if (i < atlas_len) {
        atlas[i] = 1.0;
    }
    let n = params.virtual_grid * params.virtual_grid;
    if (i < n) {
        atomicStore(&page_flags[i], 0u);
    }
    if (i == 0u) {
        atomicStore(&stats.pages_allocated, 0u);
        atomicStore(&stats.pages_depth_written, 0u);
        atomicStore(&stats.texels_written, 0u);
        atomicStore(&stats.cascades_tagged, 0u);
    }
}
"#;

const ALLOC_SHADER: &str = r#"
struct VsmParams {
    virtual_grid: u32,
    physical_pool: u32,
    page_pixels: u32,
    cascade_count: u32,
    light_dir: vec3<f32>,
    frame_index: u32,
    caster_center: vec3<f32>,
    caster_radius: f32,
};

struct PageEntry {
    physical_idx: u32,
    cascade: u32,
    _reserved: u32,
    last_frame: u32,
};

struct Stats {
    pages_allocated: atomic<u32>,
    pages_depth_written: atomic<u32>,
    texels_written: atomic<u32>,
    cascades_tagged: atomic<u32>,
};

@group(0) @binding(0) var<uniform> params: VsmParams;
@group(0) @binding(1) var<storage, read_write> pages: array<PageEntry>;
@group(0) @binding(2) var<storage, read_write> stats: Stats;

@compute @workgroup_size(64)
fn alloc_main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let i = gid.x;
    let n = params.virtual_grid * params.virtual_grid;
    if (i >= n) {
        return;
    }
    let gx = i % params.virtual_grid;
    let gy = i / params.virtual_grid;
    let cx = params.caster_center.x / 4.0 + f32(params.virtual_grid) * 0.5;
    let cy = params.caster_center.z / 4.0 + f32(params.virtual_grid) * 0.5;
    let dx = f32(gx) + 0.5 - cx;
    let dy = f32(gy) + 0.5 - cy;
    let dist = sqrt(dx * dx + dy * dy);
    if (dist >= 2.5) {
        pages[i].physical_idx = 0xffffffffu;
        pages[i].cascade = 0u;
        pages[i].last_frame = 0u;
        return;
    }
    let cascade = select(0u, 1u, dist > 1.25);
    let phys = (gx + gy * 3u + cascade * 7u) % params.physical_pool;
    pages[i].physical_idx = phys;
    pages[i].cascade = cascade;
    pages[i].last_frame = params.frame_index;
    atomicAdd(&stats.pages_allocated, 1u);
    if (cascade > 0u) {
        atomicAdd(&stats.cascades_tagged, 1u);
    }
}
"#;

const WRITE_SHADER: &str = r#"
struct VsmParams {
    virtual_grid: u32,
    physical_pool: u32,
    page_pixels: u32,
    cascade_count: u32,
    light_dir: vec3<f32>,
    frame_index: u32,
    caster_center: vec3<f32>,
    caster_radius: f32,
};

struct PageEntry {
    physical_idx: u32,
    cascade: u32,
    _reserved: u32,
    last_frame: u32,
};

struct Stats {
    pages_allocated: atomic<u32>,
    pages_depth_written: atomic<u32>,
    texels_written: atomic<u32>,
    cascades_tagged: atomic<u32>,
};

@group(0) @binding(0) var<uniform> params: VsmParams;
@group(0) @binding(1) var<storage, read> pages: array<PageEntry>;
@group(0) @binding(2) var<storage, read_write> atlas: array<f32>;
@group(0) @binding(3) var<storage, read_write> page_flags: array<atomic<u32>>;
@group(0) @binding(4) var<storage, read_write> stats: Stats;

fn page_atlas_base(phys: u32) -> u32 {
    return phys * params.page_pixels * params.page_pixels;
}

// One workgroup per virtual page; each thread covers a 4×4 block → 8×8 covers 32×32.
@compute @workgroup_size(8, 8, 1)
fn write_main(
    @builtin(workgroup_id) wid: vec3<u32>,
    @builtin(local_invocation_id) lid: vec3<u32>,
) {
    let page_i = wid.x;
    let n = params.virtual_grid * params.virtual_grid;
    if (page_i >= n) {
        return;
    }
    let entry = pages[page_i];
    if (entry.physical_idx == 0xffffffffu) {
        return;
    }

    var wrote_any = false;
    for (var ty = 0u; ty < 4u; ty = ty + 1u) {
        for (var tx = 0u; tx < 4u; tx = tx + 1u) {
            let lx = lid.x * 4u + tx;
            let ly = lid.y * 4u + ty;
            if (lx >= params.page_pixels || ly >= params.page_pixels) {
                continue;
            }

            let gx = page_i % params.virtual_grid;
            let gy = page_i / params.virtual_grid;
            let page_uv = (vec2<f32>(f32(gx), f32(gy)) + vec2<f32>(
                (f32(lx) + 0.5) / f32(params.page_pixels),
                (f32(ly) + 0.5) / f32(params.page_pixels),
            )) / f32(params.virtual_grid);
            let world_xz = (page_uv - vec2<f32>(0.5)) * 32.0;
            let world = vec3<f32>(world_xz.x, 0.0, world_xz.y);

            let to_p = world - params.caster_center;
            let dist = length(to_p);
            if (dist > params.caster_radius) {
                continue;
            }
            let ndotl = max(dot(normalize(to_p), normalize(-params.light_dir)), 0.0);
            let depth = clamp(
                0.15 + (1.0 - ndotl) * 0.35 + dist / max(params.caster_radius, 0.001) * 0.2,
                0.01,
                0.95,
            );

            let base = page_atlas_base(entry.physical_idx);
            let idx = base + ly * params.page_pixels + lx;
            let old = atlas[idx];
            if (depth < old) {
                atlas[idx] = depth;
                atomicAdd(&stats.texels_written, 1u);
                wrote_any = true;
            }
        }
    }

    if (wrote_any) {
        let prev = atomicMax(&page_flags[page_i], 1u);
        if (prev == 0u) {
            atomicAdd(&stats.pages_depth_written, 1u);
        }
    }
}
"#;

/// Persistent VSM page table + physical depth atlas for secondary present.
pub struct VsmShadowAtlas {
    params: VsmParams,
    params_buffer: wgpu::Buffer,
    #[allow(dead_code)]
    pages_buffer: wgpu::Buffer,
    #[allow(dead_code)]
    atlas_buffer: wgpu::Buffer,
    #[allow(dead_code)]
    page_flags_buffer: wgpu::Buffer,
    stats_buffer: wgpu::Buffer,
    clear_pipeline: wgpu::ComputePipeline,
    clear_bind_group: wgpu::BindGroup,
    alloc_pipeline: wgpu::ComputePipeline,
    alloc_bind_group: wgpu::BindGroup,
    write_pipeline: wgpu::ComputePipeline,
    write_bind_group: wgpu::BindGroup,
    pub virtual_pages: u32,
    pub physical_pool: u32,
    pub page_pixels: u32,
    pub cascade_count: u32,
    frame_index: u32,
}

impl VsmShadowAtlas {
    pub fn new(device: &wgpu::Device) -> Result<Self, String> {
        let params = VsmParams {
            virtual_grid: VSM_VIRTUAL_GRID,
            physical_pool: VSM_PHYSICAL_POOL,
            page_pixels: VSM_PAGE_PIXELS,
            cascade_count: VSM_CASCADE_COUNT,
            light_dir: [0.3, -1.0, 0.2],
            frame_index: 1,
            caster_center: [0.0, 0.5, 0.0],
            caster_radius: 6.0,
        };

        let empty_pages = vec![
            VsmPageEntry {
                physical_idx: 0xffff_ffff,
                cascade: 0,
                _reserved: 0,
                last_frame: 0,
            };
            VSM_VIRTUAL_PAGES as usize
        ];
        let atlas_len = (VSM_PHYSICAL_POOL * VSM_PAGE_PIXELS * VSM_PAGE_PIXELS) as usize;
        let atlas_init = vec![1.0_f32; atlas_len];
        let flags_init = vec![0u32; VSM_VIRTUAL_PAGES as usize];
        let stats_zero = VsmStats {
            pages_allocated: 0,
            pages_depth_written: 0,
            texels_written: 0,
            cascades_tagged: 0,
        };

        let params_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel VSM Params"),
            contents: bytemuck::bytes_of(&params),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });
        let pages_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel VSM Page Table"),
            contents: bytemuck::cast_slice(&empty_pages),
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_SRC,
        });
        let atlas_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel VSM Depth Atlas"),
            contents: bytemuck::cast_slice(&atlas_init),
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_DST,
        });
        let page_flags_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel VSM Page Flags"),
            contents: bytemuck::cast_slice(&flags_init),
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_DST,
        });
        let stats_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel VSM Stats"),
            contents: bytemuck::bytes_of(&stats_zero),
            usage: wgpu::BufferUsages::STORAGE
                | wgpu::BufferUsages::COPY_SRC
                | wgpu::BufferUsages::COPY_DST,
        });

        let clear_shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Aethel VSM Clear"),
            source: wgpu::ShaderSource::Wgsl(CLEAR_SHADER.into()),
        });
        let alloc_shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Aethel VSM Alloc"),
            source: wgpu::ShaderSource::Wgsl(ALLOC_SHADER.into()),
        });
        let write_shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Aethel VSM Write"),
            source: wgpu::ShaderSource::Wgsl(WRITE_SHADER.into()),
        });

        let clear_bgl = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Aethel VSM Clear BGL"),
            entries: &[
                uniform_entry(0),
                storage_entry(1, false),
                storage_entry(2, false),
                storage_entry(3, false),
                storage_entry(4, false),
            ],
        });
        let clear_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Aethel VSM Clear Layout"),
            bind_group_layouts: &[&clear_bgl],
            push_constant_ranges: &[],
        });
        let clear_pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Aethel VSM Clear Pipeline"),
            layout: Some(&clear_layout),
            module: &clear_shader,
            entry_point: "clear_main",
            compilation_options: Default::default(),
        });
        let clear_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("Aethel VSM Clear BG"),
            layout: &clear_bgl,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: params_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: pages_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 2,
                    resource: atlas_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 3,
                    resource: page_flags_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 4,
                    resource: stats_buffer.as_entire_binding(),
                },
            ],
        });

        let alloc_bgl = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Aethel VSM Alloc BGL"),
            entries: &[
                uniform_entry(0),
                storage_entry(1, false),
                storage_entry(2, false),
            ],
        });
        let alloc_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Aethel VSM Alloc Layout"),
            bind_group_layouts: &[&alloc_bgl],
            push_constant_ranges: &[],
        });
        let alloc_pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Aethel VSM Alloc Pipeline"),
            layout: Some(&alloc_layout),
            module: &alloc_shader,
            entry_point: "alloc_main",
            compilation_options: Default::default(),
        });
        let alloc_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("Aethel VSM Alloc BG"),
            layout: &alloc_bgl,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: params_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: pages_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 2,
                    resource: stats_buffer.as_entire_binding(),
                },
            ],
        });

        let write_bgl = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Aethel VSM Write BGL"),
            entries: &[
                uniform_entry(0),
                storage_entry(1, true),
                storage_entry(2, false),
                storage_entry(3, false),
                storage_entry(4, false),
            ],
        });
        let write_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Aethel VSM Write Layout"),
            bind_group_layouts: &[&write_bgl],
            push_constant_ranges: &[],
        });
        let write_pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Aethel VSM Write Pipeline"),
            layout: Some(&write_layout),
            module: &write_shader,
            entry_point: "write_main",
            compilation_options: Default::default(),
        });
        let write_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("Aethel VSM Write BG"),
            layout: &write_bgl,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: params_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: pages_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 2,
                    resource: atlas_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 3,
                    resource: page_flags_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 4,
                    resource: stats_buffer.as_entire_binding(),
                },
            ],
        });

        Ok(Self {
            params,
            params_buffer,
            pages_buffer,
            atlas_buffer,
            page_flags_buffer,
            stats_buffer,
            clear_pipeline,
            clear_bind_group,
            alloc_pipeline,
            alloc_bind_group,
            write_pipeline,
            write_bind_group,
            virtual_pages: VSM_VIRTUAL_PAGES,
            physical_pool: VSM_PHYSICAL_POOL,
            page_pixels: VSM_PAGE_PIXELS,
            cascade_count: VSM_CASCADE_COUNT,
            frame_index: 1,
        })
    }

    /// Clear atlas → allocate pages → write depth into allocated pages (no CPU readback).
    pub fn encode_update(&mut self, queue: &wgpu::Queue, encoder: &mut wgpu::CommandEncoder) {
        self.frame_index = self.frame_index.wrapping_add(1).max(1);
        self.params.frame_index = self.frame_index;
        queue.write_buffer(&self.params_buffer, 0, bytemuck::bytes_of(&self.params));

        let atlas_len = self.physical_pool * self.page_pixels * self.page_pixels;
        {
            let mut pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
                label: Some("Aethel VSM Clear"),
                timestamp_writes: None,
            });
            pass.set_pipeline(&self.clear_pipeline);
            pass.set_bind_group(0, &self.clear_bind_group, &[]);
            pass.dispatch_workgroups(atlas_len.div_ceil(64), 1, 1);
        }
        {
            let mut pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
                label: Some("Aethel VSM Alloc"),
                timestamp_writes: None,
            });
            pass.set_pipeline(&self.alloc_pipeline);
            pass.set_bind_group(0, &self.alloc_bind_group, &[]);
            pass.dispatch_workgroups(self.virtual_pages.div_ceil(64), 1, 1);
        }
        {
            let mut pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
                label: Some("Aethel VSM Depth Write"),
                timestamp_writes: None,
            });
            pass.set_pipeline(&self.write_pipeline);
            pass.set_bind_group(0, &self.write_bind_group, &[]);
            pass.dispatch_workgroups(self.virtual_pages, 1, 1);
        }
    }

    pub fn readback_stats(&self, device: &wgpu::Device, queue: &wgpu::Queue) -> VsmStats {
        let readback = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Aethel VSM Stats Readback"),
            size: std::mem::size_of::<VsmStats>() as u64,
            usage: wgpu::BufferUsages::MAP_READ | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });
        let mut encoder = device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
            label: Some("Aethel VSM Stats Readback Encoder"),
        });
        encoder.copy_buffer_to_buffer(
            &self.stats_buffer,
            0,
            &readback,
            0,
            std::mem::size_of::<VsmStats>() as u64,
        );
        queue.submit(Some(encoder.finish()));
        let slice = readback.slice(..);
        slice.map_async(wgpu::MapMode::Read, |_| {});
        device.poll(wgpu::Maintain::Wait);
        let stats = {
            let data = slice.get_mapped_range();
            *bytemuck::from_bytes::<VsmStats>(&data)
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
    fn vsm_layout_contracts() {
        assert_eq!(std::mem::size_of::<VsmPageEntry>(), 16);
        assert_eq!(std::mem::size_of::<VsmStats>(), 16);
        assert_eq!(VSM_VIRTUAL_PAGES, 64);
        assert_eq!(VSM_PAGE_PIXELS, 32);
        assert_eq!(VSM_CASCADE_COUNT, 2);
    }
}
