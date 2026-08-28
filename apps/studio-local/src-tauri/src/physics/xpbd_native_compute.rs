//! Native GPU XPBD scaffold (compute-side) — a future GPU physics path.
//!
//! Decoupled from the mount-only `WgpuRenderer`: constructed from a raw
//! `wgpu::Device` so it can be driven by any wgpu device/queue owner. HELD
//! (not wired) until the product viewport present constraint is resolved —
//! see the `#[allow(dead_code)]` note on `mod physics;` in main.rs. Real
//! physics on the main thread is `PhysicsKernel` (Rapier3D).

pub struct NativeXpbdCompute {
    pipeline_predict: wgpu::ComputePipeline,
    pipeline_solve: wgpu::ComputePipeline,
    pipeline_update: wgpu::ComputePipeline,
    bind_group_layout: wgpu::BindGroupLayout,
    /// Reused bind group + the buffers it was created from. XPBD particle /
    /// constraint / params buffers are persistent for a simulation's lifetime,
    /// so the bind group is created once and only rebuilt when a caller swaps a
    /// buffer (rare) — keeping the steady-state tick loop free of per-tick
    /// `create_bind_group` resource work (S-18 Zero-Alloc Hot-Loop Audit).
    bind_group_cache: Option<CachedBindGroup>,
}

/// A bind group plus the three buffer ids it was built from, so
/// [`NativeXpbdCompute::step`] can detect a buffer swap and rebuild exactly
/// once instead of on every tick.
///
/// wgpu 0.20 `Buffer`/`BindGroup` are neither `Clone` nor `PartialEq`, so
/// stable buffer identity is carried via the `Copy` `wgpu::Id<T>` returned by
/// the inherent `Buffer::global_id()` (unique per `wgpu::Instance`) — no trait
/// import required.
struct CachedBindGroup {
    particles: wgpu::Id<wgpu::Buffer>,
    constraints: wgpu::Id<wgpu::Buffer>,
    params: wgpu::Id<wgpu::Buffer>,
    bind_group: wgpu::BindGroup,
}

impl CachedBindGroup {
    fn matches(&self, params: &XpbdStepParams<'_>) -> bool {
        params.particles_buffer.global_id() == self.particles
            && params.constraints_buffer.global_id() == self.constraints
            && params.params_buffer.global_id() == self.params
    }
}

/// Per-step dispatch parameters for the XPBD GPU solver.
pub struct XpbdStepParams<'a> {
    pub particles_buffer: &'a wgpu::Buffer,
    pub constraints_buffer: &'a wgpu::Buffer,
    pub params_buffer: &'a wgpu::Buffer,
    pub num_particles: u32,
    pub num_constraints: u32,
    pub iterations: u32,
}

impl NativeXpbdCompute {
    pub fn new(device: &wgpu::Device) -> Self {
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Native XPBD WGSL"),
            source: wgpu::ShaderSource::Wgsl(include_str!("xpbd_compute.wgsl").into()),
        });

        let bind_group_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
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

        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Native XPBD Pipeline Layout"),
            bind_group_layouts: &[&bind_group_layout],
            push_constant_ranges: &[],
        });

        let pipeline_predict = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("XPBD Predict Pipeline"),
            layout: Some(&pipeline_layout),
            module: &shader,
            entry_point: "predict_positions",
            compilation_options: wgpu::PipelineCompilationOptions::default(),
        });

        let pipeline_solve = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("XPBD Solve Pipeline"),
            layout: Some(&pipeline_layout),
            module: &shader,
            entry_point: "solve_constraints",
            compilation_options: wgpu::PipelineCompilationOptions::default(),
        });

        let pipeline_update = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("XPBD Update Pipeline"),
            layout: Some(&pipeline_layout),
            module: &shader,
            entry_point: "update_velocities",
            compilation_options: wgpu::PipelineCompilationOptions::default(),
        });

        Self {
            pipeline_predict,
            pipeline_solve,
            pipeline_update,
            bind_group_layout,
            bind_group_cache: None,
        }
    }

    /// Dispatches the XPBD physics iteration to the native GPU.
    ///
    /// Zero-alloc on the steady-state tick (S-18): the bind group is reused
    /// from [`NativeXpbdCompute::bind_group_cache`] when the buffers are
    /// unchanged. One `CommandEncoder` per submitted frame is still created —
    /// that is inherent to the wgpu API (`finish()` consumes an encoder), so it
    /// is documented, not faked as a pooled encoder.
    pub fn step(
        &mut self,
        device: &wgpu::Device,
        queue: &wgpu::Queue,
        params: &XpbdStepParams<'_>,
    ) {
        // Reuse the cached bind group when the buffers are unchanged; rebuild
        // exactly once on a buffer swap (rare — XPBD buffers are persistent).
        let needs_rebuild = match &self.bind_group_cache {
            Some(cached) => !cached.matches(params),
            None => true,
        };
        if needs_rebuild {
            let bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
                label: Some("XPBD Bind Group"),
                layout: &self.bind_group_layout,
                entries: &[
                    wgpu::BindGroupEntry {
                        binding: 0,
                        resource: params.particles_buffer.as_entire_binding(),
                    },
                    wgpu::BindGroupEntry {
                        binding: 1,
                        resource: params.constraints_buffer.as_entire_binding(),
                    },
                    wgpu::BindGroupEntry {
                        binding: 2,
                        resource: params.params_buffer.as_entire_binding(),
                    },
                ],
            });
            self.bind_group_cache = Some(CachedBindGroup {
                particles: params.particles_buffer.global_id(),
                constraints: params.constraints_buffer.global_id(),
                params: params.params_buffer.global_id(),
                bind_group,
            });
        }
        let bind_group = self
            .bind_group_cache
            .as_ref()
            .map(|cached| &cached.bind_group)
            .expect("bind group is built above whenever the cache is empty");

        let mut encoder = device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
            label: Some("XPBD Command Encoder"),
        });

        {
            let mut cpass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
                label: Some("XPBD Compute Pass"),
                timestamp_writes: None,
            });

            cpass.set_bind_group(0, bind_group, &[]);

            // 1. Predict — integer dispatch size, matching the `div_ceil(64)`
            //    convention across gpu_culling / gpu_hiz / gpu_fsr (the prior
            //    f32 `ceil` cast was both slower and lossy for large counts).
            cpass.set_pipeline(&self.pipeline_predict);
            cpass.dispatch_workgroups(params.num_particles.div_ceil(256), 1, 1);

            // 2. Solve (iterations)
            cpass.set_pipeline(&self.pipeline_solve);
            for _ in 0..params.iterations {
                cpass.dispatch_workgroups(params.num_constraints.div_ceil(256), 1, 1);
            }

            // 3. Update
            cpass.set_pipeline(&self.pipeline_update);
            cpass.dispatch_workgroups(params.num_particles.div_ceil(256), 1, 1);
        }

        queue.submit(std::iter::once(encoder.finish()));
    }
}
