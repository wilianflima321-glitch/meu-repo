//! Radiance Cascades WGPU Bridge
//! Dispatches the `radiance_cascades.wgsl` compute shader to perform
//! multi-resolution coarse-to-fine irradiance merging.

use std::borrow::Cow;
use wgpu::util::DeviceExt;

pub struct RadianceCascadesWgpuBridge {
    pipeline: wgpu::ComputePipeline,
    bind_group_layout: wgpu::BindGroupLayout,
}

impl RadianceCascadesWgpuBridge {
    pub fn new(device: &wgpu::Device) -> Self {
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Radiance Cascades Shader"),
            source: wgpu::ShaderSource::Wgsl(Cow::Borrowed(include_str!("shaders/radiance_cascades.wgsl"))),
        });

        let bind_group_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Radiance Cascades Bind Group Layout"),
            entries: &[
                // fine_cascade (read-write storage)
                wgpu::BindGroupLayoutEntry {
                    binding: 0,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Storage { read_only: false },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                // coarse_cascade (read-only storage)
                wgpu::BindGroupLayoutEntry {
                    binding: 1,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Storage { read_only: true },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                // params (uniform)
                wgpu::BindGroupLayoutEntry {
                    binding: 2,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Uniform,
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
            ],
        });

        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Radiance Cascades Pipeline Layout"),
            bind_group_layouts: &[Some(&bind_group_layout)],
            immediate_size: 0,
        });

        let pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Radiance Cascades Compute Pipeline"),
            layout: Some(&pipeline_layout),
            module: &shader,
            entry_point: Some("main"),
            compilation_options: Default::default(),
            cache: None,
        });

        Self {
            pipeline,
            bind_group_layout,
        }
    }

    /// Dispatches the coarse-to-fine merge pass.
    pub fn dispatch_merge<'a>(
        &'a self,
        encoder: &mut wgpu::CommandEncoder,
        fine_buffer: &'a wgpu::Buffer,
        coarse_buffer: &'a wgpu::Buffer,
        fine_res: u32,
        coarse_res: u32,
        device: &wgpu::Device,
    ) {
        let push_data = [fine_res, coarse_res];
        let push_bytes: &[u8] = bytemuck::cast_slice(&push_data);
        
        let params_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Radiance Cascades Uniform Buffer"),
            contents: push_bytes,
            usage: wgpu::BufferUsages::UNIFORM,
        });

        let bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("Radiance Cascades Bind Group"),
            layout: &self.bind_group_layout,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: fine_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: coarse_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 2,
                    resource: params_buffer.as_entire_binding(),
                },
            ],
        });

        let mut cpass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
            label: Some("Radiance Cascades Compute Pass"),
            timestamp_writes: None,
        });
        
        cpass.set_pipeline(&self.pipeline);
        cpass.set_bind_group(0, &bind_group, &[]);
        
        // Group size is 8x8 in WGSL
        let dispatch_x = fine_res.div_ceil(8);
        let dispatch_y = fine_res.div_ceil(8);
        
        cpass.dispatch_workgroups(dispatch_x, dispatch_y, 1);
    }
}
