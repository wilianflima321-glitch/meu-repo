//! Hierarchical-Z depth pyramid substrate (secondary_winit engine frame only).
//!
//! # Honesty
//! - Proves: real wgpu depth target → R32Float mip0 copy → max-filter mip chain
//!   downsample; next-frame cull may **sample** the pyramid when
//!   `occlusion_enabled=1`.
//! - Does **not** prove: product WebView/RHI Hi-Z, Nanite/HZB parity, full
//!   screen-space AABB occlusion correctness, or Micro-Poly AAA.
//! - `hiz_ready` / `nanite_ready` / `micro_poly_aaa_ready` stay **false** —
//!   substrate ≠ shipping occlusion.

const COPY_DEPTH_SHADER: &str = r#"
@group(0) @binding(0) var depth_tex: texture_depth_2d;
@group(0) @binding(1) var mip0: texture_storage_2d<r32float, write>;

@compute @workgroup_size(8, 8)
fn copy_depth_main(@builtin(global_invocation_id) id: vec3<u32>) {
    let dims = textureDimensions(mip0);
    if (id.x >= dims.x || id.y >= dims.y) {
        return;
    }
    let d = textureLoad(depth_tex, vec2<i32>(i32(id.x), i32(id.y)), 0);
    textureStore(mip0, vec2<i32>(i32(id.x), i32(id.y)), vec4<f32>(d, 0.0, 0.0, 0.0));
}
"#;

const DOWNSAMPLE_SHADER: &str = r#"
@group(0) @binding(0) var src: texture_2d<f32>;
@group(0) @binding(1) var dst: texture_storage_2d<r32float, write>;

@compute @workgroup_size(8, 8)
fn downsample_main(@builtin(global_invocation_id) id: vec3<u32>) {
    let dst_dims = textureDimensions(dst);
    if (id.x >= dst_dims.x || id.y >= dst_dims.y) {
        return;
    }
    let src_coord = vec2<i32>(i32(id.x * 2u), i32(id.y * 2u));
    let src_dims = vec2<i32>(textureDimensions(src, 0));
    let c0 = min(src_coord, src_dims - vec2<i32>(1, 1));
    let c1 = min(src_coord + vec2<i32>(1, 0), src_dims - vec2<i32>(1, 1));
    let c2 = min(src_coord + vec2<i32>(0, 1), src_dims - vec2<i32>(1, 1));
    let c3 = min(src_coord + vec2<i32>(1, 1), src_dims - vec2<i32>(1, 1));
    let d0 = textureLoad(src, c0, 0).r;
    let d1 = textureLoad(src, c1, 0).r;
    let d2 = textureLoad(src, c2, 0).r;
    let d3 = textureLoad(src, c3, 0).r;
    let m = max(max(d0, d1), max(d2, d3));
    textureStore(dst, vec2<i32>(i32(id.x), i32(id.y)), vec4<f32>(m, 0.0, 0.0, 0.0));
}
"#;

fn mip_count_for(width: u32, height: u32) -> u32 {
    let m = width.max(height).max(1);
    (u32::BITS - m.leading_zeros()).max(1)
}

/// Depth attachment + R32Float max-mip pyramid for next-frame Hi-Z sample evidence.
pub struct DepthPyramidHiz {
    #[allow(dead_code)]
    pub width: u32,
    #[allow(dead_code)]
    pub height: u32,
    pub mip_count: u32,
    depth_view: wgpu::TextureView,
    /// Full mip-chain view for cull sampling (`textureLoad` at chosen mip).
    pyramid_full_view: wgpu::TextureView,
    #[allow(dead_code)]
    depth_texture: wgpu::Texture,
    #[allow(dead_code)]
    pyramid_texture: wgpu::Texture,
    copy_pipeline: wgpu::ComputePipeline,
    copy_bind_group: wgpu::BindGroup,
    downsample_pipeline: wgpu::ComputePipeline,
    downsample_bind_groups: Vec<wgpu::BindGroup>,
    mip_widths: Vec<u32>,
    mip_heights: Vec<u32>,
}

impl DepthPyramidHiz {
    pub fn new(device: &wgpu::Device, width: u32, height: u32) -> Result<Self, String> {
        let width = width.max(2);
        let height = height.max(2);
        let mip_count = mip_count_for(width, height);

        let depth_texture = device.create_texture(&wgpu::TextureDescriptor {
            label: Some("Aethel Hi-Z Depth Target"),
            size: wgpu::Extent3d {
                width,
                height,
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::Depth32Float,
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT | wgpu::TextureUsages::TEXTURE_BINDING,
            view_formats: &[],
        });
        let depth_view = depth_texture.create_view(&wgpu::TextureViewDescriptor::default());

        let pyramid_texture = device.create_texture(&wgpu::TextureDescriptor {
            label: Some("Aethel Hi-Z Depth Pyramid R32"),
            size: wgpu::Extent3d {
                width,
                height,
                depth_or_array_layers: 1,
            },
            mip_level_count: mip_count,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::R32Float,
            usage: wgpu::TextureUsages::TEXTURE_BINDING | wgpu::TextureUsages::STORAGE_BINDING,
            view_formats: &[],
        });
        let pyramid_full_view = pyramid_texture.create_view(&wgpu::TextureViewDescriptor {
            label: Some("Aethel Hi-Z Pyramid Full"),
            format: Some(wgpu::TextureFormat::R32Float),
            dimension: Some(wgpu::TextureViewDimension::D2),
            aspect: wgpu::TextureAspect::All,
            base_mip_level: 0,
            mip_level_count: Some(mip_count),
            base_array_layer: 0,
            array_layer_count: Some(1),
        });

        let mut mip_views_storage = Vec::with_capacity(mip_count as usize);
        let mut mip_views_read = Vec::with_capacity(mip_count as usize);
        let mut mip_widths = Vec::with_capacity(mip_count as usize);
        let mut mip_heights = Vec::with_capacity(mip_count as usize);
        let mut w = width;
        let mut h = height;
        for level in 0..mip_count {
            mip_widths.push(w);
            mip_heights.push(h);
            mip_views_storage.push(pyramid_texture.create_view(&wgpu::TextureViewDescriptor {
                label: Some("Aethel Hi-Z Pyramid Storage Mip"),
                format: Some(wgpu::TextureFormat::R32Float),
                dimension: Some(wgpu::TextureViewDimension::D2),
                aspect: wgpu::TextureAspect::All,
                base_mip_level: level,
                mip_level_count: Some(1),
                base_array_layer: 0,
                array_layer_count: Some(1),
            }));
            mip_views_read.push(pyramid_texture.create_view(&wgpu::TextureViewDescriptor {
                label: Some("Aethel Hi-Z Pyramid Read Mip"),
                format: Some(wgpu::TextureFormat::R32Float),
                dimension: Some(wgpu::TextureViewDimension::D2),
                aspect: wgpu::TextureAspect::All,
                base_mip_level: level,
                mip_level_count: Some(1),
                base_array_layer: 0,
                array_layer_count: Some(1),
            }));
            w = (w / 2).max(1);
            h = (h / 2).max(1);
        }

        let copy_shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Aethel Hi-Z Copy Depth Shader"),
            source: wgpu::ShaderSource::Wgsl(COPY_DEPTH_SHADER.into()),
        });
        let copy_bgl = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Aethel Hi-Z Copy BGL"),
            entries: &[
                wgpu::BindGroupLayoutEntry {
                    binding: 0,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Texture {
                        sample_type: wgpu::TextureSampleType::Depth,
                        view_dimension: wgpu::TextureViewDimension::D2,
                        multisampled: false,
                    },
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 1,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::StorageTexture {
                        access: wgpu::StorageTextureAccess::WriteOnly,
                        format: wgpu::TextureFormat::R32Float,
                        view_dimension: wgpu::TextureViewDimension::D2,
                    },
                    count: None,
                },
            ],
        });
        let copy_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Aethel Hi-Z Copy Layout"),
            bind_group_layouts: &[&copy_bgl],
            push_constant_ranges: &[],
        });
        let copy_pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Aethel Hi-Z Copy Pipeline"),
            layout: Some(&copy_layout),
            module: &copy_shader,
            entry_point: "copy_depth_main",
            compilation_options: Default::default(),
        });
        let copy_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("Aethel Hi-Z Copy Bind Group"),
            layout: &copy_bgl,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: wgpu::BindingResource::TextureView(&depth_view),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: wgpu::BindingResource::TextureView(&mip_views_storage[0]),
                },
            ],
        });

        let down_shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Aethel Hi-Z Downsample Shader"),
            source: wgpu::ShaderSource::Wgsl(DOWNSAMPLE_SHADER.into()),
        });
        let down_bgl = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Aethel Hi-Z Downsample BGL"),
            entries: &[
                wgpu::BindGroupLayoutEntry {
                    binding: 0,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Texture {
                        sample_type: wgpu::TextureSampleType::Float { filterable: false },
                        view_dimension: wgpu::TextureViewDimension::D2,
                        multisampled: false,
                    },
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 1,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::StorageTexture {
                        access: wgpu::StorageTextureAccess::WriteOnly,
                        format: wgpu::TextureFormat::R32Float,
                        view_dimension: wgpu::TextureViewDimension::D2,
                    },
                    count: None,
                },
            ],
        });
        let down_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Aethel Hi-Z Downsample Layout"),
            bind_group_layouts: &[&down_bgl],
            push_constant_ranges: &[],
        });
        let downsample_pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Aethel Hi-Z Downsample Pipeline"),
            layout: Some(&down_layout),
            module: &down_shader,
            entry_point: "downsample_main",
            compilation_options: Default::default(),
        });

        let mut downsample_bind_groups = Vec::new();
        for level in 1..mip_count as usize {
            downsample_bind_groups.push(device.create_bind_group(&wgpu::BindGroupDescriptor {
                label: Some("Aethel Hi-Z Downsample Bind Group"),
                layout: &down_bgl,
                entries: &[
                    wgpu::BindGroupEntry {
                        binding: 0,
                        resource: wgpu::BindingResource::TextureView(&mip_views_read[level - 1]),
                    },
                    wgpu::BindGroupEntry {
                        binding: 1,
                        resource: wgpu::BindingResource::TextureView(&mip_views_storage[level]),
                    },
                ],
            }));
        }

        Ok(Self {
            width,
            height,
            mip_count,
            depth_view,
            pyramid_full_view,
            depth_texture,
            pyramid_texture,
            copy_pipeline,
            copy_bind_group,
            downsample_pipeline,
            downsample_bind_groups,
            mip_widths,
            mip_heights,
        })
    }

    /// 1×1 far-depth (1.0) pyramid for headless cull soaks (occlusion off / no present).
    pub fn new_dummy_far(device: &wgpu::Device) -> Result<Self, String> {
        Self::new(device, 2, 2)
    }

    pub fn depth_view(&self) -> &wgpu::TextureView {
        &self.depth_view
    }

    pub fn pyramid_view(&self) -> &wgpu::TextureView {
        &self.pyramid_full_view
    }

    /// Copy depth → mip0, then max-downsample remaining mips. Returns downsample pass count.
    pub fn encode_build(&self, encoder: &mut wgpu::CommandEncoder) -> u32 {
        {
            let mut pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
                label: Some("Aethel Hi-Z Copy Depth"),
                timestamp_writes: None,
            });
            pass.set_pipeline(&self.copy_pipeline);
            pass.set_bind_group(0, &self.copy_bind_group, &[]);
            let gx = self.mip_widths[0].div_ceil(8);
            let gy = self.mip_heights[0].div_ceil(8);
            pass.dispatch_workgroups(gx, gy, 1);
        }
        let mut downs = 0u32;
        for (i, bg) in self.downsample_bind_groups.iter().enumerate() {
            let level = i + 1;
            let mut pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
                label: Some("Aethel Hi-Z Downsample"),
                timestamp_writes: None,
            });
            pass.set_pipeline(&self.downsample_pipeline);
            pass.set_bind_group(0, bg, &[]);
            let gx = self.mip_widths[level].div_ceil(8);
            let gy = self.mip_heights[level].div_ceil(8);
            pass.dispatch_workgroups(gx, gy, 1);
            downs = downs.saturating_add(1);
        }
        downs
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mip_count_scales_with_resolution() {
        assert_eq!(mip_count_for(1, 1), 1);
        assert_eq!(mip_count_for(2, 2), 2);
        assert_eq!(mip_count_for(64, 64), 7);
        assert_eq!(mip_count_for(128, 64), 8);
    }
}
