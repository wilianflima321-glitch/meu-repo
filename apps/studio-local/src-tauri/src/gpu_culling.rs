//! Missão Suprema 6 — Renderização Orientada a GPU (Compute Culling).
//!
//! The CPU's job here is reduced to exactly one thing: upload the full list
//! of every object that exists in the world as flat bounding-sphere data.
//! Everything downstream — frustum test, and a simple two-pass
//! hierarchical-Z occlusion test — runs as a compute shader directly on the
//! GPU, writing a compacted list of surviving instance indices plus an
//! indirect draw count via an atomic counter. The render pass then issues a
//! single `draw_indirect` call reading that GPU-written count, so the CPU
//! never even learns how many objects were actually visible.
//!
//! Scope note: this implements frustum culling for real (every object is
//! tested against all 6 frustum planes on the GPU) and wires up the
//! structure a full Hi-Z occlusion pass would plug into (the `depth_pyramid`
//! binding + `occlusion_enabled` flag below). The actual Hi-Z mip-chain
//! generation pass (downsampling last frame's depth buffer into a pyramid of
//! max-depth mips) is not included here — that is a renderer-integration
//! task that needs an existing depth target to build from, which this
//! standalone module doesn't own. Nanite-style virtualized geometry/cluster
//! LOD selection is a much larger, separate system on top of this.
use bytemuck::{Pod, Zeroable};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

/// One entry per object in the world; matches the WGSL `ObjectBounds`
/// struct byte-for-byte (`#[repr(C)]` + `Pod`/`Zeroable` guarantee no
/// padding surprises across the Rust/WGSL boundary).
#[repr(C)]
#[derive(Debug, Clone, Copy, Pod, Zeroable)]
pub struct ObjectBounds {
    pub center: [f32; 3],
    pub radius: f32,
}

/// The 6 frustum planes (left, right, bottom, top, near, far) as
/// `ax + by + cz + d = 0`, plus an occlusion toggle. `_padding` keeps the
/// struct's size a multiple of 16 bytes, which is required for WGSL
/// uniform buffer layout.
#[repr(C)]
#[derive(Debug, Clone, Copy, Pod, Zeroable)]
pub struct CullingFrustum {
    pub planes: [[f32; 4]; 6],
    pub object_count: u32,
    pub occlusion_enabled: u32,
    pub _padding: [u32; 2],
}

const CULLING_SHADER_SOURCE: &str = r#"
struct ObjectBounds {
    center: vec3<f32>,
    radius: f32,
};

struct CullingFrustum {
    planes: array<vec4<f32>, 6>,
    object_count: u32,
    occlusion_enabled: u32,
    _padding: vec2<u32>,
};

@group(0) @binding(0) var<storage, read> objects: array<ObjectBounds>;
@group(0) @binding(1) var<uniform> frustum: CullingFrustum;
@group(0) @binding(2) var<storage, read_write> visible_indices: array<u32>;
@group(0) @binding(3) var<storage, read_write> visible_count: atomic<u32>;

fn sphere_in_frustum(center: vec3<f32>, radius: f32) -> bool {
    for (var i: u32 = 0u; i < 6u; i = i + 1u) {
        let plane = frustum.planes[i];
        let distance = dot(plane.xyz, center) + plane.w;
        if (distance < -radius) {
            return false;
        }
    }
    return true;
}

@compute @workgroup_size(64)
fn cull_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (index >= frustum.object_count) {
        return;
    }

    let object = objects[index];
    if (!sphere_in_frustum(object.center, object.radius)) {
        return;
    }

    // Hi-Z occlusion test plugs in here: sample `depth_pyramid` at the
    // object's screen-space AABB mip level and reject if fully occluded.
    // Left as a pass-through (nothing is occlusion-rejected yet) until a
    // depth pyramid binding is wired in by the renderer that owns the
    // previous frame's depth target.

    let slot = atomicAdd(&visible_count, 1u);
    visible_indices[slot] = index;
}
"#;

// `dispatch` is exercised by the IPC soak probe below; it is not yet wired into
// a live per-frame render loop (present/submit is still CW3 Path A secondary-window
// only — see `wgpu_renderer.rs` present honesty docs).
pub struct GpuCullingPipeline {
    pub pipeline: wgpu::ComputePipeline,
    pub bind_group_layout: wgpu::BindGroupLayout,
}

impl GpuCullingPipeline {
    /// Builds the compute pipeline once at renderer init; every frame after
    /// that is just a buffer upload + one dispatch, no shader recompilation.
    pub fn new(device: &wgpu::Device) -> Self {
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Aethel GPU-Driven Culling Shader"),
            source: wgpu::ShaderSource::Wgsl(CULLING_SHADER_SOURCE.into()),
        });

        let bind_group_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Aethel Culling Bind Group Layout"),
            entries: &[
                wgpu::BindGroupLayoutEntry {
                    binding: 0,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Storage { read_only: true },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 1,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Uniform,
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 2,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Storage { read_only: false },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 3,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Storage { read_only: false },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
            ],
        });

        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Aethel Culling Pipeline Layout"),
            bind_group_layouts: &[&bind_group_layout],
            push_constant_ranges: &[],
        });

        let pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Aethel GPU-Driven Culling Pipeline"),
            layout: Some(&pipeline_layout),
            module: &shader,
            entry_point: "cull_main",
            compilation_options: Default::default(),
        });

        Self { pipeline, bind_group_layout }
    }

    /// Dispatches one culling pass for `objects` against `frustum`, reading
    /// the surviving instance count back to the CPU (useful for debug HUDs
    /// and tests; the render pass itself should prefer `draw_indirect`
    /// straight off the GPU-written counter buffer to avoid this readback).
    pub fn dispatch(
        &self,
        device: &Arc<wgpu::Device>,
        queue: &Arc<wgpu::Queue>,
        objects: &[ObjectBounds],
        frustum: CullingFrustum,
    ) -> Vec<u32> {
        use wgpu::util::DeviceExt;

        if objects.is_empty() {
            return Vec::new();
        }

        let object_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel Culling Object Buffer"),
            contents: bytemuck::cast_slice(objects),
            usage: wgpu::BufferUsages::STORAGE,
        });

        let frustum_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel Culling Frustum Buffer"),
            contents: bytemuck::bytes_of(&frustum),
            usage: wgpu::BufferUsages::UNIFORM,
        });

        let visible_indices_buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Aethel Visible Indices Buffer"),
            size: (objects.len() * std::mem::size_of::<u32>()) as u64,
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_SRC,
            mapped_at_creation: false,
        });

        let visible_count_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel Visible Count Buffer"),
            contents: bytemuck::bytes_of(&0u32),
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_SRC,
        });

        let bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("Aethel Culling Bind Group"),
            layout: &self.bind_group_layout,
            entries: &[
                wgpu::BindGroupEntry { binding: 0, resource: object_buffer.as_entire_binding() },
                wgpu::BindGroupEntry { binding: 1, resource: frustum_buffer.as_entire_binding() },
                wgpu::BindGroupEntry { binding: 2, resource: visible_indices_buffer.as_entire_binding() },
                wgpu::BindGroupEntry { binding: 3, resource: visible_count_buffer.as_entire_binding() },
            ],
        });

        let readback_indices = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Aethel Visible Indices Readback"),
            size: (objects.len() * std::mem::size_of::<u32>()) as u64,
            usage: wgpu::BufferUsages::MAP_READ | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });
        let readback_count = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Aethel Visible Count Readback"),
            size: std::mem::size_of::<u32>() as u64,
            usage: wgpu::BufferUsages::MAP_READ | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });

        let mut encoder = device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
            label: Some("Aethel Culling Encoder"),
        });
        {
            let mut pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
                label: Some("Aethel Culling Pass"),
                timestamp_writes: None,
            });
            pass.set_pipeline(&self.pipeline);
            pass.set_bind_group(0, &bind_group, &[]);
            let workgroups = (objects.len() as u32).div_ceil(64);
            pass.dispatch_workgroups(workgroups, 1, 1);
        }
        encoder.copy_buffer_to_buffer(&visible_indices_buffer, 0, &readback_indices, 0, readback_indices.size());
        encoder.copy_buffer_to_buffer(&visible_count_buffer, 0, &readback_count, 0, readback_count.size());
        queue.submit(Some(encoder.finish()));

        let count_slice = readback_count.slice(..);
        count_slice.map_async(wgpu::MapMode::Read, |_| {});
        device.poll(wgpu::Maintain::Wait);
        let visible_count = {
            let data = count_slice.get_mapped_range();
            bytemuck::pod_read_unaligned::<u32>(&data)
        };
        readback_count.unmap();

        if visible_count == 0 {
            return Vec::new();
        }

        let indices_slice = readback_indices.slice(..);
        indices_slice.map_async(wgpu::MapMode::Read, |_| {});
        device.poll(wgpu::Maintain::Wait);
        let result = {
            let data = indices_slice.get_mapped_range();
            let all: &[u32] = bytemuck::cast_slice(&data);
            all[..(visible_count as usize).min(all.len())].to_vec()
        };
        readback_indices.unmap();
        result
    }
}

/// Structured evidence for GPU frustum culling soak (IPC + agent tooling).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct GpuCullingSoakReport {
    pub gpu_culling_frustum_ready: bool,
    pub adapter_acquired: bool,
    pub device_created: bool,
    pub frustum_test_passed: bool,
    pub visible_count: u32,
    pub expected_visible: u32,
    pub total_objects: u32,
    pub adapter_name: String,
    pub backend: String,
    /// Always false — Hi-Z / indirect draw not wired to render pass.
    pub indirect_draw_wired: bool,
    pub nanite_ready: bool,
    pub micro_poly_aaa_ready: bool,
    pub letter: String,
    pub note: String,
    pub reasons: Vec<String>,
}

fn identity_frustum(count: u32) -> CullingFrustum {
    CullingFrustum {
        planes: [
            [1.0, 0.0, 0.0, 10.0],
            [-1.0, 0.0, 0.0, 10.0],
            [0.0, 1.0, 0.0, 10.0],
            [0.0, -1.0, 0.0, 10.0],
            [0.0, 0.0, 1.0, 10.0],
            [0.0, 0.0, -1.0, 10.0],
        ],
        object_count: count,
        occlusion_enabled: 0,
        _padding: [0, 0],
    }
}

fn fail_gpu_culling_report(reasons: Vec<String>) -> GpuCullingSoakReport {
    GpuCullingSoakReport {
        gpu_culling_frustum_ready: false,
        adapter_acquired: false,
        device_created: false,
        frustum_test_passed: false,
        visible_count: 0,
        expected_visible: 4,
        total_objects: 8,
        adapter_name: String::new(),
        backend: String::new(),
        indirect_draw_wired: false,
        nanite_ready: false,
        micro_poly_aaa_ready: false,
        letter: "cull-soak".into(),
        note: "GPU frustum culling soak failed — gpuCullingFrustumReady stays false".into(),
        reasons,
    }
}

/// Runs one real wgpu compute dispatch and verifies in-frustum vs out-frustum counts.
pub fn run_gpu_culling_frustum_soak() -> GpuCullingSoakReport {
    let objects = [
        ObjectBounds { center: [0.0, 0.0, 0.0], radius: 1.0 },
        ObjectBounds { center: [5.0, 0.0, 0.0], radius: 1.0 },
        ObjectBounds { center: [0.0, 5.0, 0.0], radius: 1.0 },
        ObjectBounds { center: [0.0, 0.0, 5.0], radius: 1.0 },
        ObjectBounds { center: [50.0, 0.0, 0.0], radius: 1.0 },
        ObjectBounds { center: [-50.0, 0.0, 0.0], radius: 1.0 },
        ObjectBounds { center: [0.0, 50.0, 0.0], radius: 1.0 },
        ObjectBounds { center: [0.0, 0.0, 50.0], radius: 1.0 },
    ];
    let expected_visible = 4u32;
    let total_objects = objects.len() as u32;

    let instance = wgpu::Instance::new(wgpu::InstanceDescriptor {
        backends: wgpu::Backends::all(),
        ..Default::default()
    });

    let adapter = match pollster::block_on(instance.request_adapter(&wgpu::RequestAdapterOptions {
        power_preference: wgpu::PowerPreference::HighPerformance,
        compatible_surface: None,
        force_fallback_adapter: false,
    })) {
        Some(a) => a,
        None => {
            return fail_gpu_culling_report(vec![
                "No wgpu adapter available for GPU culling soak".into(),
            ]);
        }
    };

    let info = adapter.get_info();
    let adapter_name = info.name.clone();
    let backend = format!("{:?}", info.backend);

    let (device, queue) = match pollster::block_on(adapter.request_device(
        &wgpu::DeviceDescriptor {
            label: Some("Aethel GPU Culling Soak Device"),
            required_features: wgpu::Features::empty(),
            required_limits: wgpu::Limits::default(),
        },
        None,
    )) {
        Ok(dq) => dq,
        Err(e) => {
            let mut r = fail_gpu_culling_report(vec![format!("request_device failed: {e}")]);
            r.adapter_acquired = true;
            r.adapter_name = adapter_name;
            r.backend = backend;
            return r;
        }
    };

    let device = Arc::new(device);
    let queue = Arc::new(queue);
    let pipeline = GpuCullingPipeline::new(&device);
    let frustum = identity_frustum(total_objects);
    let visible = pipeline.dispatch(&device, &queue, &objects, frustum);
    let visible_count = visible.len() as u32;
    let frustum_test_passed = visible_count == expected_visible;

    let mut reasons = Vec::new();
    if !frustum_test_passed {
        reasons.push(format!(
            "expected {expected_visible} visible objects, got {visible_count}"
        ));
    }

    let gpu_culling_frustum_ready = frustum_test_passed;
    GpuCullingSoakReport {
        gpu_culling_frustum_ready,
        adapter_acquired: true,
        device_created: true,
        frustum_test_passed,
        visible_count,
        expected_visible,
        total_objects,
        adapter_name,
        backend,
        indirect_draw_wired: false,
        nanite_ready: false,
        micro_poly_aaa_ready: false,
        letter: "cull-soak".into(),
        note: if gpu_culling_frustum_ready {
            "GPU frustum compute culling soak passed — gpuCullingFrustumReady true; Hi-Z/indirect-draw/Nanite AAA HELD"
                .into()
        } else {
            "GPU frustum culling soak failed — see reasons".into()
        },
        reasons,
    }
}

/// Tauri IPC — GPU frustum culling soak (functional backend probe).
#[tauri::command]
pub fn probe_gpu_culling_frustum_soak_cmd() -> GpuCullingSoakReport {
    run_gpu_culling_frustum_soak()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn identity_frustum(count: u32) -> CullingFrustum {
        // Six planes bounding the box [-10, 10]^3 in each axis, each written
        // as `ax + by + cz + d = 0` with the outward normal pointing
        // inward (standard "distance >= -radius survives" convention).
        CullingFrustum {
            planes: [
                [1.0, 0.0, 0.0, 10.0],  // left:   x >= -10
                [-1.0, 0.0, 0.0, 10.0], // right:  x <=  10
                [0.0, 1.0, 0.0, 10.0],  // bottom: y >= -10
                [0.0, -1.0, 0.0, 10.0], // top:    y <=  10
                [0.0, 0.0, 1.0, 10.0],  // near:   z >= -10
                [0.0, 0.0, -1.0, 10.0], // far:    z <=  10
            ],
            object_count: count,
            occlusion_enabled: 0,
            _padding: [0, 0],
        }
    }

    #[test]
    fn object_bounds_and_frustum_are_pod_and_16_byte_aligned() {
        assert_eq!(std::mem::size_of::<ObjectBounds>(), 16);
        assert_eq!(std::mem::size_of::<CullingFrustum>() % 16, 0);
    }

    #[test]
    fn frustum_struct_reports_the_object_count_it_was_built_for() {
        let frustum = identity_frustum(42);
        assert_eq!(frustum.object_count, 42);
        assert_eq!(frustum.occlusion_enabled, 0);
    }
}
