//! Meshlet / cluster cull substrate (secondary_winit Nanite-*path* scaffolding).
//!
//! # Honesty
//! - Proves: real `MeshletCluster` buffer layout (128-tri contract + bounds +
//!   cone) → GPU frustum (+ optional Hi-Z) visibility → compacted indices →
//!   `DrawIndirectArgs` pack → single `draw_indirect` (one proxy tri per
//!   visible cluster).
//! - Does **not** prove: Nanite virtualized geometry, software micro-poly
//!   raster, true `MULTI_DRAW_INDIRECT` (one draw cmd per cluster), or
//!   Micro-Poly AAA. `nanite_ready` / `micro_poly_aaa_ready` /
//!   `multi_draw_indirect_aaa_ready` stay **false**.

use bytemuck::{Pod, Zeroable};
use wgpu::util::DeviceExt;

use crate::gpu_culling::CullingFrustum;
use crate::gpu_indirect_draw::DrawIndirectArgs;

/// Nanite-class layout contract: triangles reserved per cluster (not software-rasterized here).
pub const MESHLET_TRIANGLES_PER_CLUSTER: u32 = 128;

/// GPU meshlet / geometry-cluster record (48 bytes, 16-byte aligned).
#[repr(C)]
#[derive(Debug, Clone, Copy, Pod, Zeroable)]
pub struct MeshletCluster {
    pub center: [f32; 3],
    pub radius: f32,
    pub cone_axis: [f32; 3],
    /// Cosine cutoff; `< -1` disables cone cull for the fixture.
    pub cone_cutoff: f32,
    pub lod_error: f32,
    pub triangle_count: u32,
    pub cluster_id: u32,
    pub _pad: u32,
}

const CULL_SHADER: &str = r#"
struct MeshletCluster {
    center: vec3<f32>,
    radius: f32,
    cone_axis: vec3<f32>,
    cone_cutoff: f32,
    lod_error: f32,
    triangle_count: u32,
    cluster_id: u32,
    _pad: u32,
};

struct CullingFrustum {
    planes: array<vec4<f32>, 6>,
    object_count: u32,
    occlusion_enabled: u32,
    _padding: vec2<u32>,
};

@group(0) @binding(0) var<storage, read> clusters: array<MeshletCluster>;
@group(0) @binding(1) var<uniform> frustum: CullingFrustum;
@group(0) @binding(2) var<storage, read_write> visible_indices: array<u32>;
@group(0) @binding(3) var<storage, read_write> visible_count: atomic<u32>;
@group(0) @binding(4) var depth_pyramid: texture_2d<f32>;

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

fn cone_backface(axis: vec3<f32>, cutoff: f32, center: vec3<f32>) -> bool {
    // cutoff < -1 → disabled. View from origin toward cluster center.
    if (cutoff < -1.0) {
        return false;
    }
    let view_dir = normalize(-center);
    return dot(axis, view_dir) < cutoff;
}

fn hiz_occluded(center: vec3<f32>, radius: f32) -> bool {
    if (frustum.occlusion_enabled == 0u) {
        return false;
    }
    let ndc = center.xy / 25.0;
    let uv = ndc * 0.5 + vec2<f32>(0.5, 0.5);
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        return false;
    }
    let level0 = textureDimensions(depth_pyramid, 0);
    let radius_ndc = max(radius / 25.0, 0.001);
    let radius_px = radius_ndc * f32(level0.x) * 0.5;
    var mip_i: i32 = 0;
    if (radius_px > 1.0) {
        mip_i = i32(floor(log2(radius_px)));
    }
    let max_mip = i32(textureNumLevels(depth_pyramid)) - 1;
    mip_i = clamp(mip_i, 0, max_mip);
    let dims = textureDimensions(depth_pyramid, mip_i);
    let coord = vec2<i32>(
        clamp(i32(uv.x * f32(dims.x)), 0, i32(dims.x) - 1),
        clamp(i32(uv.y * f32(dims.y)), 0, i32(dims.y) - 1),
    );
    let max_z = textureLoad(depth_pyramid, coord, mip_i).r;
    let obj_near = clamp(0.5 + center.z / 50.0 - radius / 50.0, 0.0, 1.0);
    return obj_near > (max_z + 0.002);
}

@compute @workgroup_size(64)
fn cull_meshlets(@builtin(global_invocation_id) gid: vec3<u32>) {
    let index = gid.x;
    if (index >= frustum.object_count) {
        return;
    }
    let c = clusters[index];
    if (!sphere_in_frustum(c.center, c.radius)) {
        return;
    }
    if (cone_backface(c.cone_axis, c.cone_cutoff, c.center)) {
        return;
    }
    if (hiz_occluded(c.center, c.radius)) {
        return;
    }
    let slot = atomicAdd(&visible_count, 1u);
    visible_indices[slot] = index;
}
"#;

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
    // One proxy triangle per visible meshlet (not 128 micro-tris software raster).
    indirect.vertex_count = 3u;
    indirect.instance_count = visible_count;
    indirect.first_vertex = 0u;
    indirect.first_instance = 0u;
}
"#;

const DRAW_SHADER: &str = r#"
struct MeshletCluster {
    center: vec3<f32>,
    radius: f32,
    cone_axis: vec3<f32>,
    cone_cutoff: f32,
    lod_error: f32,
    triangle_count: u32,
    cluster_id: u32,
    _pad: u32,
};

@group(0) @binding(0) var<storage, read> clusters: array<MeshletCluster>;
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
    let idx = visible_indices[iid];
    let c = clusters[idx];
    var corners = array<vec2<f32>, 3>(
        vec2<f32>(-0.05, -0.05),
        vec2<f32>(0.05, -0.05),
        vec2<f32>(0.0, 0.06),
    );
    let ndc = (c.center.xy / 25.0) + corners[vid];
    var out: VsOut;
    out.clip_pos = vec4<f32>(ndc, clamp(0.5 + c.center.z / 50.0, 0.01, 0.99), 1.0);
    let t = f32(c.cluster_id) * 0.07;
    out.color = vec3<f32>(0.15 + t, 0.75 - t * 0.3, 0.35 + t * 0.4);
    return out;
}

@fragment
fn fs_main(in: VsOut) -> @location(0) vec4<f32> {
    return vec4<f32>(in.color, 1.0);
}
"#;

/// Fixture: 8 hand-placed clusters (layout soak only; present path uses offline cook).
#[allow(dead_code)]
pub fn soak_fixture_meshlets() -> ([MeshletCluster; 8], u32) {
    let mk = |id: u32, center: [f32; 3], radius: f32| MeshletCluster {
        center,
        radius,
        cone_axis: [0.0, 0.0, 1.0],
        cone_cutoff: -2.0, // disabled
        lod_error: 0.0,
        triangle_count: MESHLET_TRIANGLES_PER_CLUSTER,
        cluster_id: id,
        _pad: 0,
    };
    (
        [
            mk(0, [0.0, 0.0, 0.0], 1.0),
            mk(1, [5.0, 0.0, 0.0], 1.0),
            mk(2, [0.0, 5.0, 0.0], 1.0),
            mk(3, [0.0, 0.0, 5.0], 1.0),
            mk(4, [50.0, 0.0, 0.0], 1.0),
            mk(5, [-50.0, 0.0, 0.0], 1.0),
            mk(6, [0.0, 50.0, 0.0], 1.0),
            mk(7, [0.0, 0.0, 50.0], 1.0),
        ],
        4u32,
    )
}

/// Persistent meshlet cull + pack + proxy draw_indirect for secondary present.
pub struct MeshletCullScaffold {
    cull_pipeline: wgpu::ComputePipeline,
    cull_bind_group: wgpu::BindGroup,
    frustum_buffer: wgpu::Buffer,
    visible_count_buffer: wgpu::Buffer,
    #[allow(dead_code)]
    clusters_buffer: wgpu::Buffer,
    visible_indices_buffer: wgpu::Buffer,
    pack_pipeline: wgpu::ComputePipeline,
    pack_bind_group: wgpu::BindGroup,
    draw_pipeline: wgpu::RenderPipeline,
    draw_bind_group: wgpu::BindGroup,
    indirect_buffer: wgpu::Buffer,
    cluster_count: u32,
    frustum: CullingFrustum,
    pub triangles_per_cluster: u32,
}

impl MeshletCullScaffold {
    pub fn new(
        device: &wgpu::Device,
        surface_format: wgpu::TextureFormat,
        clusters: &[MeshletCluster],
        frustum: CullingFrustum,
        pyramid_view: &wgpu::TextureView,
    ) -> Result<Self, String> {
        if clusters.is_empty() {
            return Err("MeshletCullScaffold requires non-empty clusters".into());
        }
        if frustum.object_count as usize != clusters.len() {
            return Err("frustum.object_count must match clusters.len()".into());
        }

        let cull_shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Aethel Meshlet Cull Shader"),
            source: wgpu::ShaderSource::Wgsl(CULL_SHADER.into()),
        });
        let cull_bgl = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Aethel Meshlet Cull BGL"),
            entries: &[
                storage_entry(0, true),
                uniform_entry(1),
                storage_entry(2, false),
                storage_entry(3, false),
                wgpu::BindGroupLayoutEntry {
                    binding: 4,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Texture {
                        sample_type: wgpu::TextureSampleType::Float { filterable: false },
                        view_dimension: wgpu::TextureViewDimension::D2,
                        multisampled: false,
                    },
                    count: None,
                },
            ],
        });
        let cull_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Aethel Meshlet Cull Layout"),
            bind_group_layouts: &[&cull_bgl],
            push_constant_ranges: &[],
        });
        let cull_pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Aethel Meshlet Cull Pipeline"),
            layout: Some(&cull_layout),
            module: &cull_shader,
            entry_point: "cull_meshlets",
            compilation_options: Default::default(),
        });

        let clusters_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel Meshlet Clusters"),
            contents: bytemuck::cast_slice(clusters),
            usage: wgpu::BufferUsages::STORAGE,
        });
        let frustum_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel Meshlet Frustum"),
            contents: bytemuck::bytes_of(&frustum),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });
        let visible_indices_buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Aethel Meshlet Visible Indices"),
            size: (clusters.len() * std::mem::size_of::<u32>()) as u64,
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_SRC,
            mapped_at_creation: false,
        });
        let visible_count_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel Meshlet Visible Count"),
            contents: bytemuck::bytes_of(&0u32),
            usage: wgpu::BufferUsages::STORAGE
                | wgpu::BufferUsages::COPY_SRC
                | wgpu::BufferUsages::COPY_DST,
        });
        let cull_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("Aethel Meshlet Cull BG"),
            layout: &cull_bgl,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: clusters_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: frustum_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 2,
                    resource: visible_indices_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 3,
                    resource: visible_count_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 4,
                    resource: wgpu::BindingResource::TextureView(pyramid_view),
                },
            ],
        });

        let pack_shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Aethel Meshlet Pack Shader"),
            source: wgpu::ShaderSource::Wgsl(PACK_SHADER.into()),
        });
        let pack_bgl = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Aethel Meshlet Pack BGL"),
            entries: &[storage_entry(0, true), storage_entry(1, false)],
        });
        let pack_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Aethel Meshlet Pack Layout"),
            bind_group_layouts: &[&pack_bgl],
            push_constant_ranges: &[],
        });
        let pack_pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Aethel Meshlet Pack Pipeline"),
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
            label: Some("Aethel Meshlet DrawIndirect"),
            contents: bytemuck::bytes_of(&zero),
            usage: wgpu::BufferUsages::INDIRECT
                | wgpu::BufferUsages::STORAGE
                | wgpu::BufferUsages::COPY_SRC,
        });
        let pack_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("Aethel Meshlet Pack BG"),
            layout: &pack_bgl,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: visible_count_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: indirect_buffer.as_entire_binding(),
                },
            ],
        });

        let draw_shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Aethel Meshlet Draw Shader"),
            source: wgpu::ShaderSource::Wgsl(DRAW_SHADER.into()),
        });
        let draw_bgl = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Aethel Meshlet Draw BGL"),
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
            label: Some("Aethel Meshlet Draw Layout"),
            bind_group_layouts: &[&draw_bgl],
            push_constant_ranges: &[],
        });
        let draw_pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("Aethel Meshlet Draw Pipeline"),
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
            label: Some("Aethel Meshlet Draw BG"),
            layout: &draw_bgl,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: clusters_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: visible_indices_buffer.as_entire_binding(),
                },
            ],
        });

        Ok(Self {
            cull_pipeline,
            cull_bind_group,
            frustum_buffer,
            visible_count_buffer,
            clusters_buffer,
            visible_indices_buffer,
            pack_pipeline,
            pack_bind_group,
            draw_pipeline,
            draw_bind_group,
            indirect_buffer,
            cluster_count: clusters.len() as u32,
            frustum,
            triangles_per_cluster: MESHLET_TRIANGLES_PER_CLUSTER,
        })
    }

    pub fn encode_cull(
        &self,
        queue: &wgpu::Queue,
        encoder: &mut wgpu::CommandEncoder,
        occlusion_enabled: bool,
    ) {
        let mut frustum = self.frustum;
        frustum.occlusion_enabled = u32::from(occlusion_enabled);
        queue.write_buffer(&self.frustum_buffer, 0, bytemuck::bytes_of(&frustum));
        queue.write_buffer(&self.visible_count_buffer, 0, bytemuck::bytes_of(&0u32));
        let mut pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
            label: Some("Aethel Meshlet Cull Pass"),
            timestamp_writes: None,
        });
        pass.set_pipeline(&self.cull_pipeline);
        pass.set_bind_group(0, &self.cull_bind_group, &[]);
        pass.dispatch_workgroups(self.cluster_count.div_ceil(64), 1, 1);
    }

    pub fn encode_pack(&self, encoder: &mut wgpu::CommandEncoder) {
        let mut pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
            label: Some("Aethel Meshlet Pack Pass"),
            timestamp_writes: None,
        });
        pass.set_pipeline(&self.pack_pipeline);
        pass.set_bind_group(0, &self.pack_bind_group, &[]);
        pass.dispatch_workgroups(1, 1, 1);
    }

    pub fn encode_draw_indirect<'a>(&'a self, pass: &mut wgpu::RenderPass<'a>) {
        pass.set_pipeline(&self.draw_pipeline);
        pass.set_bind_group(0, &self.draw_bind_group, &[]);
        pass.draw_indirect(&self.indirect_buffer, 0);
    }

    /// Binding for micro-poly soft-raster (compacted visible meshlet ids).
    pub fn visible_indices_binding(&self) -> wgpu::BindingResource<'_> {
        self.visible_indices_buffer.as_entire_binding()
    }

    /// Binding for micro-poly soft-raster (visible meshlet count).
    pub fn visible_count_binding(&self) -> wgpu::BindingResource<'_> {
        self.visible_count_buffer.as_entire_binding()
    }

    pub fn readback_visible_count(&self, device: &wgpu::Device, queue: &wgpu::Queue) -> u32 {
        let readback = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Aethel Meshlet Count Readback"),
            size: std::mem::size_of::<u32>() as u64,
            usage: wgpu::BufferUsages::MAP_READ | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });
        let mut encoder = device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
            label: Some("Aethel Meshlet Readback Encoder"),
        });
        encoder.copy_buffer_to_buffer(
            &self.visible_count_buffer,
            0,
            &readback,
            0,
            std::mem::size_of::<u32>() as u64,
        );
        queue.submit(Some(encoder.finish()));
        let slice = readback.slice(..);
        slice.map_async(wgpu::MapMode::Read, |_| {});
        device.poll(wgpu::Maintain::Wait);
        let count = {
            let data = slice.get_mapped_range();
            bytemuck::pod_read_unaligned::<u32>(&data)
        };
        readback.unmap();
        count
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
    fn meshlet_cluster_is_48_byte_aligned() {
        assert_eq!(std::mem::size_of::<MeshletCluster>(), 48);
        assert_eq!(std::mem::size_of::<MeshletCluster>() % 16, 0);
        assert_eq!(MESHLET_TRIANGLES_PER_CLUSTER, 128);
    }

    #[test]
    fn fixture_expects_four_visible() {
        let (clusters, expected) = soak_fixture_meshlets();
        assert_eq!(clusters.len(), 8);
        assert_eq!(expected, 4);
        assert!(clusters.iter().all(|c| c.triangle_count == 128));
    }
}
