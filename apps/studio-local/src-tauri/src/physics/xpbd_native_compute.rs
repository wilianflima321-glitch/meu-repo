use std::sync::Arc;
use wgpu::util::DeviceExt;
use crate::wgpu_renderer::WgpuRenderer;

pub struct NativeXpbdCompute {
    pipeline_predict: wgpu::ComputePipeline,
    pipeline_solve: wgpu::ComputePipeline,
    pipeline_update: wgpu::ComputePipeline,
    bind_group_layout: wgpu::BindGroupLayout,
}

impl NativeXpbdCompute {
    pub fn new(renderer: &WgpuRenderer) -> Self {
        let shader = renderer.device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Native XPBD WGSL"),
            source: wgpu::ShaderSource::Wgsl(include_str!("xpbd_compute.wgsl").into()),
        });

        let bind_group_layout = renderer.device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Native XPBD Bind Group Layout"),
            entries: &[
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

        let pipeline_layout = renderer.device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Native XPBD Pipeline Layout"),
            bind_group_layouts: &[&bind_group_layout],
            push_constant_ranges: &[],
        });

        let pipeline_predict = renderer.device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("XPBD Predict Pipeline"),
            layout: Some(&pipeline_layout),
            module: &shader,
            entry_point: "predict_positions",
        });

        let pipeline_solve = renderer.device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("XPBD Solve Pipeline"),
            layout: Some(&pipeline_layout),
            module: &shader,
            entry_point: "solve_constraints",
        });

        let pipeline_update = renderer.device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("XPBD Update Pipeline"),
            layout: Some(&pipeline_layout),
            module: &shader,
            entry_point: "update_velocities",
        });

        Self {
            pipeline_predict,
            pipeline_solve,
            pipeline_update,
            bind_group_layout,
        }
    }

    /// Dispatches the XPBD physics iteration to the native GPU
    pub fn step(
        &self,
        renderer: &WgpuRenderer,
        particles_buffer: &wgpu::Buffer,
        constraints_buffer: &wgpu::Buffer,
        params_buffer: &wgpu::Buffer,
        num_particles: u32,
        num_constraints: u32,
        iterations: u32,
    ) {
        let bind_group = renderer.device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("XPBD Bind Group"),
            layout: &self.bind_group_layout,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: particles_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: constraints_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 2,
                    resource: params_buffer.as_entire_binding(),
                },
            ],
        });

        let mut encoder = renderer.device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
            label: Some("XPBD Command Encoder"),
        });

        {
            let mut cpass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
                label: Some("XPBD Compute Pass"),
                timestamp_writes: None,
            });

            cpass.set_bind_group(0, &bind_group, &[]);

            // 1. Predict
            cpass.set_pipeline(&self.pipeline_predict);
            cpass.dispatch_workgroups((num_particles as f32 / 256.0).ceil() as u32, 1, 1);

            // 2. Solve (iterations)
            cpass.set_pipeline(&self.pipeline_solve);
            for _ in 0..iterations {
                cpass.dispatch_workgroups((num_constraints as f32 / 256.0).ceil() as u32, 1, 1);
            }

            // 3. Update
            cpass.set_pipeline(&self.pipeline_update);
            cpass.dispatch_workgroups((num_particles as f32 / 256.0).ceil() as u32, 1, 1);
        }

        renderer.queue.submit(std::iter::once(encoder.finish()));
    }
}
