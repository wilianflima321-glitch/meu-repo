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
use std::sync::atomic::{AtomicU32, Ordering};
use wgpu::util::DeviceExt;

/// Substrate-scale virtual page grid — 32² pages / 128 px pages / 4 cascades
/// (not UE 16k virtual maps, not clipmap streaming — `vsm_aaa_ready` false).
pub const VSM_VIRTUAL_GRID: u32 = 32;
pub const VSM_VIRTUAL_PAGES: u32 = VSM_VIRTUAL_GRID * VSM_VIRTUAL_GRID;
/// Physical atlas page pool capacity.
pub const VSM_PHYSICAL_POOL: u32 = 256;
/// Pixels per page edge.
pub const VSM_PAGE_PIXELS: u32 = 128;
/// Directional clipmap cascade count in this substrate.
pub const VSM_CASCADE_COUNT: u32 = 4;

const _: () = assert!(VSM_VIRTUAL_PAGES == 1024);
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
    /// Spectral illuminant tint (kernel ac chain) — the shadow tint shares
    /// the single illuminant with the Radiance fill light.
    light_color: [f32; 3],
    _pad: f32,
}

#[repr(C)]
#[derive(Debug, Clone, Copy, Pod, Zeroable)]
pub struct VsmStats {
    pub pages_allocated: u32,
    pub pages_depth_written: u32,
    pub texels_written: u32,
    pub cascades_tagged: u32,
    /// Final free-slot allocator cursor (informational — mirrors the WGSL
    /// fifth atomic so the stats buffer layout matches the shader exactly).
    pub next_slot: u32,
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
    light_color: vec3<f32>,
    _pad: f32,
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
    next_slot: atomic<u32>,
};

@group(0) @binding(0) var<uniform> params: VsmParams;
@group(0) @binding(1) var<storage, read_write> pages: array<PageEntry>;
@group(0) @binding(2) var<storage, read_write> atlas: array<f32>;
@group(0) @binding(3) var<storage, read_write> page_flags: array<atomic<u32>>;
@group(0) @binding(4) var<storage, read_write> stats: Stats;

@compute @workgroup_size(64)
fn clear_main(@builtin(global_invocation_id) gid: vec3<u32>) {
    // Two-dimensional index: a 256×128×128 atlas needs 65536 workgroups of 64,
    // which exceeds max_compute_workgroups_per_dimension (65535) on default
    // limits — spread across Y instead of overflowing X.
    let i = gid.y * 64u + gid.x;
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
        atomicStore(&stats.next_slot, 0u);
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
    light_color: vec3<f32>,
    _pad: f32,
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
    next_slot: atomic<u32>,
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
    if (dist >= 5.0) {
        pages[i].physical_idx = 0xffffffffu;
        pages[i].cascade = 0u;
        pages[i].last_frame = 0u;
        return;
    }
    let cascade = min(u32(dist / 1.25), params.cascade_count - 1u);
    // Free-slot allocator (real VSM semantics): every allocated page claims a
    // unique physical slot via an atomic counter — injective by construction.
    // Pool exhaustion fails closed (page left unallocated this frame).
    let phys = atomicAdd(&stats.next_slot, 1u);
    if (phys >= params.physical_pool) {
        pages[i].physical_idx = 0xffffffffu;
        pages[i].cascade = cascade;
        pages[i].last_frame = 0u;
        return;
    }
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
    light_color: vec3<f32>,
    _pad: f32,
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
    next_slot: atomic<u32>,
};

@group(0) @binding(0) var<uniform> params: VsmParams;
@group(0) @binding(1) var<storage, read> pages: array<PageEntry>;
@group(0) @binding(2) var<storage, read_write> atlas: array<f32>;
@group(0) @binding(3) var<storage, read_write> page_flags: array<atomic<u32>>;
@group(0) @binding(4) var<storage, read_write> stats: Stats;

fn page_atlas_base(phys: u32) -> u32 {
    return phys * params.page_pixels * params.page_pixels;
}

// One workgroup per virtual page; each thread covers a 16×16 block →
// 8×8 threads × 16×16 texels = 128×128 (the full page at PAGE_PIXELS).
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
    for (var ty = 0u; ty < 16u; ty = ty + 1u) {
        for (var tx = 0u; tx < 16u; tx = tx + 1u) {
            let lx = lid.x * 16u + tx;
            let ly = lid.y * 16u + ty;
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

const SAMPLE_SHADER: &str = r#"
struct VsmParams {
    virtual_grid: u32,
    physical_pool: u32,
    page_pixels: u32,
    cascade_count: u32,
    light_dir: vec3<f32>,
    frame_index: u32,
    caster_center: vec3<f32>,
    caster_radius: f32,
    light_color: vec3<f32>,
    _pad: f32,
};

struct PageEntry {
    physical_idx: u32,
    cascade: u32,
    _reserved: u32,
    last_frame: u32,
};

struct SamplePointIn {
    world_xz: vec2<f32>,
    receiver_depth: f32,
    _pad: f32,
};

@group(0) @binding(0) var<uniform> params: VsmParams;
@group(0) @binding(1) var<storage, read> pages: array<PageEntry>;
@group(0) @binding(2) var<storage, read> atlas: array<f32>;
@group(0) @binding(3) var<storage, read> samples: array<SamplePointIn>;
@group(0) @binding(4) var<storage, read_write> shadow_out: array<f32>;

@compute @workgroup_size(64)
fn sample_main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let i = gid.x;
    if (i >= arrayLength(&samples)) {
        return;
    }
    let sp = samples[i];
    // Inverse of the write mapping: world_xz → page uv → (gx, gy) + texel.
    let page_uv = sp.world_xz / 32.0 + vec2<f32>(0.5);
    let gx = u32(clamp(floor(page_uv.x * f32(params.virtual_grid)), 0.0, f32(params.virtual_grid - 1u)));
    let gy = u32(clamp(floor(page_uv.y * f32(params.virtual_grid)), 0.0, f32(params.virtual_grid - 1u)));
    let page_i = gy * params.virtual_grid + gx;
    let entry = pages[page_i];
    if (entry.physical_idx == 0xffffffffu) {
        shadow_out[i] = 1.0;
        return;
    }
    let lx = u32(clamp(floor(fract(page_uv.x * f32(params.virtual_grid)) * f32(params.page_pixels)), 0.0, f32(params.page_pixels - 1u)));
    let ly = u32(clamp(floor(fract(page_uv.y * f32(params.virtual_grid)) * f32(params.page_pixels)), 0.0, f32(params.page_pixels - 1u)));
    let base = entry.physical_idx * params.page_pixels * params.page_pixels;
    let depth = atlas[base + ly * params.page_pixels + lx];
    // Receiver plane compare: shadowed when the caster depth is nearer than
    // the receiver plane (+ bias). Unallocated pages mean no caster → lit.
    shadow_out[i] = select(1.0, 0.15, depth <= sp.receiver_depth + 0.02);
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
    sample_pipeline: wgpu::ComputePipeline,
    sample_bind_group: wgpu::BindGroup,
    #[allow(dead_code)]
    samples_buffer: wgpu::Buffer,
    #[allow(dead_code)]
    shadow_out_buffer: wgpu::Buffer,
    pub virtual_pages: u32,
    pub physical_pool: u32,
    pub page_pixels: u32,
    pub cascade_count: u32,
    frame_index: u32,
    /// Runtime pool budget (MPSC channel consumption): clamps the allocator
    /// free-slot ceiling below the physical pool — fail-closed, never above.
    pool_budget: AtomicU32,
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
            light_color: crate::gpu_radiance_probes::illuminant_chroma_6500k(),
            _pad: 0.0,
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
        next_slot: 0,
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

        // ---- Shadow sample (substrate-level receiver-plane compare) ----
        #[repr(C)]
        #[derive(Debug, Clone, Copy, Pod, Zeroable)]
        struct SamplePointIn {
            world_xz: [f32; 2],
            receiver_depth: f32,
            _pad: f32,
        }
        let sample_points = [
            SamplePointIn {
                world_xz: [-9.0, 0.0], // outside the alloc circle → unallocated → lit
                receiver_depth: 0.9,
                _pad: 0.0,
            },
            SamplePointIn {
                world_xz: [2.0, 0.0], // inside the caster blob → shadowed
                receiver_depth: 0.9,
                _pad: 0.0,
            },
        ];
        let samples_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel VSM Sample Points"),
            contents: bytemuck::cast_slice(&sample_points),
            usage: wgpu::BufferUsages::STORAGE,
        });
        let shadow_out_init = [0.0f32; 2];
        let shadow_out_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel VSM Shadow Factors"),
            contents: bytemuck::cast_slice(&shadow_out_init),
            usage: wgpu::BufferUsages::STORAGE
                | wgpu::BufferUsages::COPY_DST
                | wgpu::BufferUsages::COPY_SRC,
        });
        let sample_shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Aethel VSM Sample Shader"),
            source: wgpu::ShaderSource::Wgsl(SAMPLE_SHADER.into()),
        });
        let sample_bgl = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Aethel VSM Sample BGL"),
            entries: &[
                uniform_entry(0),
                storage_entry(1, true),
                storage_entry(2, true),
                storage_entry(3, true),
                storage_entry(4, false),
            ],
        });
        let sample_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Aethel VSM Sample Layout"),
            bind_group_layouts: &[&sample_bgl],
            push_constant_ranges: &[],
        });
        let sample_pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Aethel VSM Sample Pipeline"),
            layout: Some(&sample_layout),
            module: &sample_shader,
            entry_point: "sample_main",
            compilation_options: Default::default(),
        });
        let sample_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("Aethel VSM Sample BG"),
            layout: &sample_bgl,
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
                    resource: samples_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 4,
                    resource: shadow_out_buffer.as_entire_binding(),
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
            sample_pipeline,
            sample_bind_group,
            samples_buffer,
            shadow_out_buffer,
            virtual_pages: VSM_VIRTUAL_PAGES,
            physical_pool: VSM_PHYSICAL_POOL,
            page_pixels: VSM_PAGE_PIXELS,
            cascade_count: VSM_CASCADE_COUNT,
            frame_index: 1,
            pool_budget: AtomicU32::new(VSM_PHYSICAL_POOL),
        })
    }

    /// MPSC consumption: runtime pool budget (16..=physical pool).
    pub fn set_pool_budget(&self, pages: u32) {
        self.pool_budget
            .store(pages.clamp(16, VSM_PHYSICAL_POOL), Ordering::Relaxed);
    }

    /// Current effective pool budget (evidence).
    pub fn effective_pool_budget(&self) -> u32 {
        self.pool_budget.load(Ordering::Relaxed)
    }

    /// Clear atlas → allocate pages → write depth into allocated pages (no CPU readback).
    pub fn encode_update(&mut self, queue: &wgpu::Queue, encoder: &mut wgpu::CommandEncoder) {
        self.frame_index = self.frame_index.wrapping_add(1).max(1);
        self.params.frame_index = self.frame_index;
        // MPSC consumption: the runtime budget clamps the allocator ceiling
        // (atlas stays full-size; stale texels beyond the budget are never
        // allocated, hence never sampled).
        self.params.physical_pool = self.effective_pool_budget();
        queue.write_buffer(&self.params_buffer, 0, bytemuck::bytes_of(&self.params));
        let atlas_len = self.physical_pool * self.page_pixels * self.page_pixels;
        {
            let mut pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
                label: Some("Aethel VSM Clear"),
                timestamp_writes: None,
            });
            pass.set_pipeline(&self.clear_pipeline);
            pass.set_bind_group(0, &self.clear_bind_group, &[]);
            // 2D dispatch: 65536 workgroups overflow the per-dimension limit.
            let groups = atlas_len.div_ceil(64);
            pass.dispatch_workgroups(groups.div_ceil(64), 64, 1);
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

    /// Encode the shadow sample pass (2 receiver points) after an update.
    pub fn encode_sample(&self, encoder: &mut wgpu::CommandEncoder) {
        let mut pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
            label: Some("Aethel VSM Shadow Sample"),
            timestamp_writes: None,
        });
        pass.set_pipeline(&self.sample_pipeline);
        pass.set_bind_group(0, &self.sample_bind_group, &[]);
        pass.dispatch_workgroups(1, 1, 1);
    }

    /// Post-loop evidence: [lit, shadowed] receiver factors.
    pub fn readback_shadow_factors(
        &self,
        device: &wgpu::Device,
        queue: &wgpu::Queue,
    ) -> Vec<f32> {
        let byte_len = 2u64 * 4;
        let readback = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Aethel VSM Shadow Factors Readback"),
            size: byte_len,
            usage: wgpu::BufferUsages::MAP_READ | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });
        let mut encoder = device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
            label: Some("Aethel VSM Shadow Factors Readback Encoder"),
        });
        encoder.copy_buffer_to_buffer(&self.shadow_out_buffer, 0, &readback, 0, byte_len);
        queue.submit(Some(encoder.finish()));
        let slice = readback.slice(..);
        slice.map_async(wgpu::MapMode::Read, |_| {});
        device.poll(wgpu::Maintain::Wait);
        let factors: Vec<f32> = {
            let data = slice.get_mapped_range();
            bytemuck::cast_slice(&data).to_vec()
        };
        readback.unmap();
        factors
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
        assert_eq!(std::mem::size_of::<VsmStats>(), 20);
        assert_eq!(VSM_VIRTUAL_PAGES, 1024);
        assert_eq!(VSM_PAGE_PIXELS, 128);
        assert_eq!(VSM_CASCADE_COUNT, 4);
    }

    #[test]
    fn vsm_allocation_circle_fits_physical_pool() {
        // CPU mirror of the alloc distance/cascade model: the default
        // allocation circle must never exceed the physical pool, so the
        // atomic free-slot allocator stays injective (never exhausts).
        let grid = VSM_VIRTUAL_GRID;
        let cx = 0.0f32 / 4.0 + grid as f32 * 0.5;
        let cy = 0.0f32 / 4.0 + grid as f32 * 0.5;
        let mut allocated = 0u32;
        for gy in 0..grid {
            for gx in 0..grid {
                let dx = gx as f32 + 0.5 - cx;
                let dy = gy as f32 + 0.5 - cy;
                let dist = (dx * dx + dy * dy).sqrt();
                if dist < 5.0 {
                    allocated += 1;
                }
            }
        }
        assert!(allocated > 16, "allocation circle must exercise a real page set");
        assert!(
            allocated <= VSM_PHYSICAL_POOL,
            "allocation circle needs {allocated} pages > pool {}",
            VSM_PHYSICAL_POOL
        );
    }
}
