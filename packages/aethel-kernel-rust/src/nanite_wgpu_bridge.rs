//! Nanite WGPU Bridge
//! Dispatches the `nanite_rasterizer.wgsl` compute shader to perform
//! hardware-accelerated micro-polygon rasterization using visibility buffers.

use std::borrow::Cow;

/// Interface for dispatching the Nanite WGSL Compute Shader.
pub struct NaniteWgpuBridge {
    pipeline: wgpu::ComputePipeline,
    bind_group_layout: wgpu::BindGroupLayout,
}

impl NaniteWgpuBridge {
    /// Creates the Nanite Compute Pipeline from the WGSL source.
    pub fn new(device: &wgpu::Device) -> Self {
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Nanite Rasterizer Shader"),
            source: wgpu::ShaderSource::Wgsl(Cow::Borrowed(include_str!("shaders/nanite_rasterizer.wgsl"))),
        });

        let bind_group_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Nanite Bind Group Layout"),
            entries: &[
                // clusters array (read-only storage)
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
                // tile_buffer (read-write storage for visibility buffer atomics)
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

        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Nanite Pipeline Layout"),
            bind_group_layouts: &[Some(&bind_group_layout)],
            immediate_size: 0,
        });

        let pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Nanite Compute Pipeline"),
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

    /// Records the compute pass for a cluster batch.
    pub fn dispatch<'a>(
        &'a self,
        encoder: &mut wgpu::CommandEncoder,
        clusters_buffer: &'a wgpu::Buffer,
        tile_buffer: &'a wgpu::Buffer,
        cluster_count: u32,
        device: &wgpu::Device,
    ) {
        let bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("Nanite Bind Group"),
            layout: &self.bind_group_layout,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: clusters_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: tile_buffer.as_entire_binding(),
                },
            ],
        });

        let mut cpass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
            label: Some("Nanite Compute Pass"),
            timestamp_writes: None,
        });
        
        cpass.set_pipeline(&self.pipeline);
        cpass.set_bind_group(0, &bind_group, &[]);
        
        // 128 threads per cluster (1 for each micro-triangle).
        let total_triangles = cluster_count * 128;
        // Group size in WGSL is 128.
        let dispatch_groups = total_triangles.div_ceil(128);
        
        cpass.dispatch_workgroups(dispatch_groups, 1, 1);
    }
}
