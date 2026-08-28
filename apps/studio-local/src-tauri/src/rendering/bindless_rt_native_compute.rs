use crate::wgpu_renderer::WgpuRenderer;

pub struct NativeBindlessRtCompute {
    pipeline: wgpu::ComputePipeline,
    bind_group_layout: wgpu::BindGroupLayout,
}

impl NativeBindlessRtCompute {
    pub fn new(renderer: &WgpuRenderer) -> Self {
        let shader = renderer.device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Native Bindless RT WGSL"),
            source: wgpu::ShaderSource::Wgsl(include_str!("bindless_rt_compute.wgsl").into()),
        });

        let bind_group_layout = renderer.device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Native Bindless RT Bind Group Layout"),
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
                        ty: wgpu::BufferBindingType::Storage { read_only: false },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 2,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Storage { read_only: true },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 3,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Storage { read_only: true },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
            ],
        });

        let pipeline_layout = renderer.device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Native Bindless RT Pipeline Layout"),
            bind_group_layouts: &[&bind_group_layout],
            push_constant_ranges: &[],
        });

        let pipeline = renderer.device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Bindless RT Pipeline"),
            layout: Some(&pipeline_layout),
            module: &shader,
            entry_point: "raygen",
            compilation_options: wgpu::PipelineCompilationOptions::default(),
        });

        Self {
            pipeline,
            bind_group_layout,
        }
    }
}
