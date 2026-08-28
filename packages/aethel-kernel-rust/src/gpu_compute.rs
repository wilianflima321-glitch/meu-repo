use wgpu::util::DeviceExt;
use std::borrow::Cow;

use crate::ecs_core::SceneGraph;

pub struct GpuComputePipeline {
    device: wgpu::Device,
    queue: wgpu::Queue,
    compute_pipeline: wgpu::ComputePipeline,
    bind_group_layout: wgpu::BindGroupLayout,
}

impl GpuComputePipeline {
    pub async fn new() -> Option<Self> {
        // wgpu 30: `InstanceDescriptor` has no `Default` — start from the
        // no-display-handle builder and pin the backend set explicitly
        // (the builder default is an empty backend set, which would panic).
        let instance = wgpu::Instance::new(wgpu::InstanceDescriptor {
            backends: wgpu::Backends::all(),
            ..wgpu::InstanceDescriptor::new_without_display_handle()
        });

        // wgpu 30: `request_adapter` returns `Result`, not `Option`.
        let adapter = instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::HighPerformance,
                ..Default::default()
            })
            .await
            .ok()?;

        // wgpu 30: `request_device` takes a single descriptor argument.
        let (device, queue) = adapter
            .request_device(&wgpu::DeviceDescriptor::default())
            .await
            .ok()?;

        let shader_src = include_str!("shaders/ecs_physics.wgsl");
        let shader_module = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("ECS Physics Shader"),
            source: wgpu::ShaderSource::Wgsl(Cow::Borrowed(shader_src)),
        });

        let bind_group_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("ECS Physics Bind Group Layout"),
            entries: &[
                wgpu::BindGroupLayoutEntry {
                    binding: 0, // Uniforms
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Uniform,
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 1, // PosY
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Storage { read_only: false },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 2, // VelY
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

        // wgpu 30: bind group layouts are `Option<&BindGroupLayout>` entries and
        // `push_constant_ranges` was replaced by `immediate_size` (0 = none;
        // non-zero would require `Features::IMMEDIATES`).
        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("ECS Physics Pipeline Layout"),
            bind_group_layouts: &[Some(&bind_group_layout)],
            immediate_size: 0,
        });

        // wgpu 30: `entry_point` is `Option<&str>`; `cache` is a new field.
        let compute_pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("ECS Physics Pipeline"),
            layout: Some(&pipeline_layout),
            module: &shader_module,
            entry_point: Some("main"),
            compilation_options: Default::default(),
            cache: None,
        });

        Some(Self {
            device,
            queue,
            compute_pipeline,
            bind_group_layout,
        })
    }

    pub fn dispatch(&self, sg: &mut SceneGraph, dt: f32) {
        if sg.len == 0 { return; }

        let num_entities = sg.capacity as u32;

        // Uniforms buffer [dt, gravity, num_entities, padding]
        let uniforms: [f32; 4] = [dt, 9.81, num_entities as f32, 0.0];
        let uniforms_bytes: &[u8] = unsafe {
            std::slice::from_raw_parts(uniforms.as_ptr() as *const u8, std::mem::size_of_val(&uniforms))
        };
        let uniform_buffer = self.device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Uniform Buffer"),
            contents: uniforms_bytes,
            usage: wgpu::BufferUsages::UNIFORM,
        });

        // PosY buffer
        let pos_bytes: &[u8] = unsafe {
            std::slice::from_raw_parts(sg.pos_y.as_ptr() as *const u8, sg.pos_y.len() * 4)
        };
        let pos_buffer = self.device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("PosY Buffer"),
            contents: pos_bytes,
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_SRC | wgpu::BufferUsages::COPY_DST,
        });

        // VelY buffer
        let vel_bytes: &[u8] = unsafe {
            std::slice::from_raw_parts(sg.vel_y.as_ptr() as *const u8, sg.vel_y.len() * 4)
        };
        let vel_buffer = self.device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("VelY Buffer"),
            contents: vel_bytes,
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_SRC | wgpu::BufferUsages::COPY_DST,
        });

        let bind_group = self.device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("ECS Physics Bind Group"),
            layout: &self.bind_group_layout,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: uniform_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: pos_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 2,
                    resource: vel_buffer.as_entire_binding(),
                },
            ],
        });

        let mut encoder = self.device.create_command_encoder(&wgpu::CommandEncoderDescriptor { label: None });
        {
            let mut cpass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
                label: None,
                timestamp_writes: None,
            });
            cpass.set_pipeline(&self.compute_pipeline);
            cpass.set_bind_group(0, &bind_group, &[]);
            // Calculate workgroups based on 64 size
            let workgroup_count = num_entities.div_ceil(64);
            cpass.dispatch_workgroups(workgroup_count, 1, 1);
        }

        // We would ideally copy the result back to CPU RAM using a staging buffer here
        // For architectural demonstration, the dispatch happens on GPU VRAM
        self.queue.submit(Some(encoder.finish()));
    }
}
