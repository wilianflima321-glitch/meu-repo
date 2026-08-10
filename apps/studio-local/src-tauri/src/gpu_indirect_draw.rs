//! GPU-driven indirect draw scaffold (secondary_winit engine frame only).
//!
//! # Honesty
//! - Proves: cull `visible_count` → pack `DrawIndirectArgs` → `draw_indirect`
//!   on the same encoder as present clear, with storage-buffer instance lookup
//!   (bindless-*layout* scaffold: objects + visible_indices indexed in VS).
//! - Does **not** prove: product WebView exclusive present, true multi-draw
//!   batch (`MULTI_DRAW_INDIRECT`), Nanite/Micro-Poly AAA, or UE RHI.
//! - `multi_draw_indirect_aaa_ready` / `nanite_ready` / `micro_poly_aaa_ready`
//!   stay **false** forever from this module alone.

use bytemuck::{Pod, Zeroable};
use wgpu::util::DeviceExt;

use crate::gpu_culling::{GpuCullingPersistentPass, ObjectBounds};

/// wgpu `DrawIndirect` args — must match GPU/CPU layout byte-for-byte.
#[repr(C)]
#[derive(Debug, Clone, Copy, Pod, Zeroable)]
pub struct DrawIndirectArgs {
    pub vertex_count: u32,
    pub instance_count: u32,
    pub first_vertex: u32,
    pub first_instance: u32,
}

const PACK_SHADER: &str = r#"
struct DrawIndirectArgs {
    vertex_count: u32,
    instance_count: u32,
    first_vertex: u32,
    first_instance: u32,
};

@group(0) @binding(0) var<storage, read> visible_count: u32;
@group(0) @binding(1) var<storage, read_write> indirect: DrawIndirectArgs;

@compute @workgroup_size(1)
fn pack_main() {
    // Fixed triangle mesh; instance_count comes from GPU frustum cull atomic.
    indirect.vertex_count = 3u;
    indirect.instance_count = visible_count;
    indirect.first_vertex = 0u;
    indirect.first_instance = 0u;
}
"#;

const DRAW_SHADER: &str = r#"
struct ObjectBounds {
    center: vec3<f32>,
    radius: f32,
};

@group(0) @binding(0) var<storage, read> objects: array<ObjectBounds>;
@group(0) @binding(1) var<storage, read> visible_indices: array<u32>;

struct VsOut {
    @builtin(position) clip_pos: vec4<f32>,
    @location(0) color: vec3<f32>,
};

@vertex
fn vs_main(
    @builtin(vertex_index) vid: u32,
    @builtin(instance_index) iid: u32,
) -> VsOut {
    let obj_idx = visible_indices[iid];
    let obj = objects[obj_idx];
    var corners = array<vec2<f32>, 3>(
        vec2<f32>(-0.04, -0.04),
        vec2<f32>(0.04, -0.04),
        vec2<f32>(0.0, 0.05),
    );
    // Fixture centers live in ~[-50,50]; map into a visible NDC band.
    let ndc = (obj.center.xy / 25.0) + corners[vid];
    var out: VsOut;
    out.clip_pos = vec4<f32>(ndc, clamp(0.5 + obj.center.z / 50.0, 0.01, 0.99), 1.0);
    let t = f32(obj_idx) * 0.08;
    out.color = vec3<f32>(0.25 + t, 0.55, 0.85 - t * 0.5);
    return out;
}

@fragment
fn fs_main(in: VsOut) -> @location(0) vec4<f32> {
    return vec4<f32>(in.color, 1.0);
}
"#;

/// Persistent pack + draw_indirect resources for the secondary engine frame loop.
pub struct IndirectDrawScaffold {
    pack_pipeline: wgpu::ComputePipeline,
    pack_bind_group: wgpu::BindGroup,
    draw_pipeline: wgpu::RenderPipeline,
    draw_bind_group: wgpu::BindGroup,
    indirect_buffer: wgpu::Buffer,
    /// Kept for bind-group lifetime.
    #[allow(dead_code)]
    objects_buffer: wgpu::Buffer,
}

impl IndirectDrawScaffold {
    /// Builds pack+draw pipelines bound to cull pass storage buffers.
    pub fn new(
        device: &wgpu::Device,
        surface_format: wgpu::TextureFormat,
        cull: &GpuCullingPersistentPass,
        objects: &[ObjectBounds],
    ) -> Result<Self, String> {
        if objects.is_empty() {
            return Err("IndirectDrawScaffold requires non-empty objects".into());
        }

        let pack_shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Aethel Indirect Pack Shader"),
            source: wgpu::ShaderSource::Wgsl(PACK_SHADER.into()),
        });
        let pack_bgl = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Aethel Indirect Pack BGL"),
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
                        ty: wgpu::BufferBindingType::Storage { read_only: false },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
            ],
        });
        let pack_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Aethel Indirect Pack Layout"),
            bind_group_layouts: &[&pack_bgl],
            push_constant_ranges: &[],
        });
        let pack_pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Aethel Indirect Pack Pipeline"),
            layout: Some(&pack_layout),
            module: &pack_shader,
            entry_point: "pack_main",
            compilation_options: Default::default(),
        });

        let zero = DrawIndirectArgs {
            vertex_count: 3,
            instance_count: 0,
            first_vertex: 0,
            first_instance: 0,
        };
        let indirect_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel DrawIndirectArgs Buffer"),
            contents: bytemuck::bytes_of(&zero),
            usage: wgpu::BufferUsages::INDIRECT
                | wgpu::BufferUsages::STORAGE
                | wgpu::BufferUsages::COPY_SRC,
        });

        let pack_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("Aethel Indirect Pack Bind Group"),
            layout: &pack_bgl,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: cull.visible_count_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: indirect_buffer.as_entire_binding(),
                },
            ],
        });

        let objects_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel Indirect Objects Buffer"),
            contents: bytemuck::cast_slice(objects),
            usage: wgpu::BufferUsages::STORAGE,
        });

        let draw_shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Aethel Indirect Draw Shader"),
            source: wgpu::ShaderSource::Wgsl(DRAW_SHADER.into()),
        });
        let draw_bgl = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Aethel Indirect Draw BGL"),
            entries: &[
                wgpu::BindGroupLayoutEntry {
                    binding: 0,
                    visibility: wgpu::ShaderStages::VERTEX,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Storage { read_only: true },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 1,
                    visibility: wgpu::ShaderStages::VERTEX,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Storage { read_only: true },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
            ],
        });
        let draw_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Aethel Indirect Draw Layout"),
            bind_group_layouts: &[&draw_bgl],
            push_constant_ranges: &[],
        });
        let draw_pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("Aethel Indirect Draw Pipeline"),
            layout: Some(&draw_layout),
            vertex: wgpu::VertexState {
                module: &draw_shader,
                entry_point: "vs_main",
                compilation_options: Default::default(),
                buffers: &[],
            },
            fragment: Some(wgpu::FragmentState {
                module: &draw_shader,
                entry_point: "fs_main",
                compilation_options: Default::default(),
                targets: &[Some(wgpu::ColorTargetState {
                    format: surface_format,
                    blend: Some(wgpu::BlendState::REPLACE),
                    write_mask: wgpu::ColorWrites::ALL,
                })],
            }),
            primitive: wgpu::PrimitiveState {
                topology: wgpu::PrimitiveTopology::TriangleList,
                ..Default::default()
            },
            depth_stencil: Some(wgpu::DepthStencilState {
                format: wgpu::TextureFormat::Depth32Float,
                depth_write_enabled: true,
                depth_compare: wgpu::CompareFunction::Less,
                stencil: wgpu::StencilState::default(),
                bias: wgpu::DepthBiasState::default(),
            }),
            multisample: wgpu::MultisampleState::default(),
            multiview: None,
        });

        let draw_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("Aethel Indirect Draw Bind Group"),
            layout: &draw_bgl,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: objects_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: cull.visible_indices_binding(),
                },
            ],
        });

        Ok(Self {
            pack_pipeline,
            pack_bind_group,
            draw_pipeline,
            draw_bind_group,
            indirect_buffer,
            objects_buffer,
        })
    }

    /// Packs GPU cull count into DrawIndirectArgs (hot-path safe — no readback).
    pub fn encode_pack(&self, encoder: &mut wgpu::CommandEncoder) {
        let mut pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
            label: Some("Aethel Indirect Pack Pass"),
            timestamp_writes: None,
        });
        pass.set_pipeline(&self.pack_pipeline);
        pass.set_bind_group(0, &self.pack_bind_group, &[]);
        pass.dispatch_workgroups(1, 1, 1);
    }

    /// Issues `draw_indirect` into an open render pass (clear already begun by caller).
    pub fn encode_draw_indirect<'a>(&'a self, pass: &mut wgpu::RenderPass<'a>) {
        pass.set_pipeline(&self.draw_pipeline);
        pass.set_bind_group(0, &self.draw_bind_group, &[]);
        pass.draw_indirect(&self.indirect_buffer, 0);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn draw_indirect_args_are_16_byte_pod() {
        assert_eq!(std::mem::size_of::<DrawIndirectArgs>(), 16);
        assert_eq!(std::mem::align_of::<DrawIndirectArgs>(), 4);
    }
}
