//! GPU Fluid Compute Bridge — S-21 GPU Physics Compute Unification.
//!
//! Offloads the CPU LBM D2Q9 collide+stream
//! ([`LatticeBoltzmannFluidGrid::step`](crate::lattice_boltzmann_fluid_solver::LatticeBoltzmannFluidGrid::step))
//! onto a single wgpu-30 compute spine with **real staging readback** and a
//! **CPU↔GPU parity soak**. This is the unified substrate that later SPH/NS GPU
//! passes will share (`gpu_fluid_unification_ready` stays `false` — honesty).
//!
//! Anti-mock / zero-placebo:
//! - `run_gpu_lbm_parity_soak()` sets `gpu_lbm_collide_stream_parity_ready`
//!   only after a **real GPU run** verifies bounded parity against the CPU
//!   reference. Fail-closed: no adapter / upload / readback / parity failure
//!   keeps every readiness flag `false`.
//! - Readback is real: `map_async` + `poll(PollType::wait_indefinitely())` +
//!   `get_mapped_range` (this closes the `gpu_compute.rs` gap that only
//!   dispatched on VRAM with no result return).
//! - Parity is bounded-equivalence (`GPU_PARITY_MAX_ABS_EPS`), because naga /
//!   backend f32 may contract mul+add into FMA — never bit-exact theater.
//! - All AAA / unification flags stay HELD `false`; `gpu_fluid_unification_ready`
//!   only flips when SPH and NS GPU passes ride the same spine.
//!
//! Whole module gated on `#[cfg(feature = "wgpu-bridge")]` (wgpu 30, off by
//! default) so the default build (studio-local wgpu 0.20) stays green.

use std::borrow::Cow;
use std::sync::mpsc;

use wgpu::util::DeviceExt;

use crate::aerodynamic_navier_stokes::NS_EVIDENCE_KIND;
use crate::lattice_boltzmann_fluid_solver::{
    LatticeBoltzmannFluidGrid, DEFAULT_TAU, FLUID_EVIDENCE_KIND, LOAD_SCALE_SIDE,
};
use crate::matter_thermodynamics_sph::SPH_EVIDENCE_KIND;

/// Distinct GPU LBM evidence kind (letter **ic** discipline — never reuses the
/// CPU `FLUID_EVIDENCE_KIND`).
pub const GPU_LBM_EVIDENCE_KIND: &str = "gpu_lbm_d2q9_collide_stream_parity";
/// Stable collide+stream steps for the CPU↔GPU parity soak (τ=0.8).
pub const GPU_LBM_PARITY_STEPS: u32 = 8;
/// Max absolute population / macro diff for parity (FMA contraction on
/// naga/backend → bounded-equivalence, not bit-exact).
pub const GPU_PARITY_MAX_ABS_EPS: f32 = 1e-4;
/// Mean absolute population / macro diff for parity.
pub const GPU_PARITY_MEAN_EPS: f32 = 1e-5;

/// GPU-backed D2Q9 collide+stream solver with real CPU staging readback.
///
/// Holds one wgpu-30 device shared by the collide and stream pipelines. All
/// buffers and bind groups are pre-created at construction; `step()` submits
/// two compute passes (implicit barrier at the pass boundary) plus staging
/// copies, and `readback()` maps the staging buffers back to CPU.
pub struct GpuFluidComputeBridge {
    device: wgpu::Device,
    queue: wgpu::Queue,
    collide_pipeline: wgpu::ComputePipeline,
    stream_pipeline: wgpu::ComputePipeline,
    bg_collide: wgpu::BindGroup,
    bg_stream: wgpu::BindGroup,
    f_buffer: wgpu::Buffer,
    solid_buffer: wgpu::Buffer,
    rho_buffer: wgpu::Buffer,
    vx_buffer: wgpu::Buffer,
    vy_buffer: wgpu::Buffer,
    staging_f: wgpu::Buffer,
    staging_macros: wgpu::Buffer,
    width: usize,
    height: usize,
    n: usize,
    workgroups: u32,
    f_bytes: u64,
    macro_cell_bytes: u64,
    adapter_name: Option<String>,
}

impl GpuFluidComputeBridge {
    /// Grid dimensions (also keeps the stored `width`/`height` fields live).
    pub fn grid_dims(&self) -> (usize, usize) {
        (self.width, self.height)
    }

    /// Synchronous constructor: builds a current-thread tokio runtime and
    /// blocks on [`Self::new_async`]. Returns `None` when no wgpu adapter /
    /// device is available (fail-closed, never panics).
    pub fn new_sync(width: usize, height: usize, tau: f32) -> Option<Self> {
        let runtime = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .ok()?;
        runtime.block_on(Self::new_async(width, height, tau))
    }

    async fn new_async(width: usize, height: usize, tau: f32) -> Option<Self> {
        let width = width.max(4);
        let height = height.max(4);
        let n = width * height;

        // wgpu 30: `InstanceDescriptor` has no `Default` — start from the
        // no-display-handle builder and pin the backend set explicitly (the
        // builder default is an empty backend set, which would panic).
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
        let adapter_name = adapter.get_info().name.clone();

        // wgpu 30: `request_device` takes a single descriptor argument.
        let (device, queue) = adapter.request_device(&wgpu::DeviceDescriptor::default()).await.ok()?;

        let shader_src = include_str!("shaders/lbm_d2q9_collide_stream.wgsl");
        let shader_module = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("LBM D2Q9 Shader"),
            source: wgpu::ShaderSource::Wgsl(Cow::Borrowed(shader_src)),
        });

        // 7 bindings: b0 params (uniform), b1 f_in (read), b2 f_out (write),
        // b3 solid (read), b4/b5/b6 rho/vx/vy (write).
        let bind_group_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("LBM Bind Group Layout"),
            entries: &[
                wgpu::BindGroupLayoutEntry {
                    binding: 0,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Uniform,
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
                        ty: wgpu::BufferBindingType::Storage { read_only: true },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 4,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Storage { read_only: false },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 5,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Storage { read_only: false },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 6,
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
        // `push_constant_ranges` was replaced by `immediate_size` (0 = none).
        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("LBM Pipeline Layout"),
            bind_group_layouts: &[Some(&bind_group_layout)],
            immediate_size: 0,
        });

        // wgpu 30: `entry_point` is `Option<&str>`; `cache` is a new field.
        let collide_pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("LBM Collide Pipeline"),
            layout: Some(&pipeline_layout),
            module: &shader_module,
            entry_point: Some("main_collide"),
            compilation_options: Default::default(),
            cache: None,
        });
        let stream_pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("LBM Stream Pipeline"),
            layout: Some(&pipeline_layout),
            module: &shader_module,
            entry_point: Some("main_stream"),
            compilation_options: Default::default(),
            cache: None,
        });

        // Buffers. f / f_tmp are 9n f32; macros are n f32 each; solid is n u32.
        let f_bytes = (n * 9 * 4) as u64;
        let cell_bytes = (n * 4) as u64;
        let macro_cell_bytes = cell_bytes;
        let storage_rw = wgpu::BufferUsages::STORAGE
            | wgpu::BufferUsages::COPY_DST
            | wgpu::BufferUsages::COPY_SRC;
        let f_buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("LBM f populations"),
            size: f_bytes,
            usage: storage_rw,
            mapped_at_creation: false,
        });
        let f_tmp_buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("LBM f_tmp"),
            size: f_bytes,
            usage: storage_rw,
            mapped_at_creation: false,
        });
        let solid_buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("LBM solid mask"),
            size: cell_bytes,
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });
        let rho_buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("LBM rho"),
            size: cell_bytes,
            usage: storage_rw,
            mapped_at_creation: false,
        });
        let vx_buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("LBM vx"),
            size: cell_bytes,
            usage: storage_rw,
            mapped_at_creation: false,
        });
        let vy_buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("LBM vy"),
            size: cell_bytes,
            usage: storage_rw,
            mapped_at_creation: false,
        });
        let staging_f = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("LBM staging f"),
            size: f_bytes,
            usage: wgpu::BufferUsages::MAP_READ | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });
        let staging_macros = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("LBM staging macros"),
            size: 3 * macro_cell_bytes,
            usage: wgpu::BufferUsages::MAP_READ | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });

        // Uniforms: [width u32, height u32, n u32, omega f32] — 16 bytes, no
        // padding in the WGSL `Params` struct (all scalar, 4-byte aligned).
        let omega = 1.0 / tau.max(0.5);
        let mut params_bytes = [0u8; 16];
        params_bytes[0..4].copy_from_slice(&(width as u32).to_le_bytes());
        params_bytes[4..8].copy_from_slice(&(height as u32).to_le_bytes());
        params_bytes[8..12].copy_from_slice(&(n as u32).to_le_bytes());
        params_bytes[12..16].copy_from_slice(&omega.to_le_bytes());
        let params_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("LBM params"),
            contents: &params_bytes,
            usage: wgpu::BufferUsages::UNIFORM,
        });

        // Collide: b1 -> f (read), b2 -> f_tmp (write).
        let bg_collide = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("LBM Collide Bind Group"),
            layout: &bind_group_layout,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: params_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: f_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 2,
                    resource: f_tmp_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 3,
                    resource: solid_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 4,
                    resource: rho_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 5,
                    resource: vx_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 6,
                    resource: vy_buffer.as_entire_binding(),
                },
            ],
        });
        // Stream: b1 -> f_tmp (read), b2 -> f (write).
        let bg_stream = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("LBM Stream Bind Group"),
            layout: &bind_group_layout,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: params_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: f_tmp_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 2,
                    resource: f_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 3,
                    resource: solid_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 4,
                    resource: rho_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 5,
                    resource: vx_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 6,
                    resource: vy_buffer.as_entire_binding(),
                },
            ],
        });

        let workgroups = (n as u32).div_ceil(64);
        Some(Self {
            device,
            queue,
            collide_pipeline,
            stream_pipeline,
            bg_collide,
            bg_stream,
            f_buffer,
            solid_buffer,
            rho_buffer,
            vx_buffer,
            vy_buffer,
            staging_f,
            staging_macros,
            width,
            height,
            n,
            workgroups,
            f_bytes,
            macro_cell_bytes,
            adapter_name: Some(adapter_name),
        })
    }

    /// Upload the CPU seed state into the GPU buffers (length-checked).
    fn upload_seed(
        &self,
        f: &[f32],
        solid: &[u32],
        rho: &[f32],
        vx: &[f32],
        vy: &[f32],
    ) -> Result<(), String> {
        let n = self.n;
        if f.len() != 9 * n {
            return Err(format!("gpu seed f length {} != {}", f.len(), 9 * n));
        }
        if solid.len() != n || rho.len() != n || vx.len() != n || vy.len() != n {
            return Err(format!(
                "gpu seed macro length mismatch (solid {}, rho {}, vx {}, vy {}, n {})",
                solid.len(),
                rho.len(),
                vx.len(),
                vy.len(),
                n
            ));
        }
        // Upload direction uses bytemuck::cast_slice (source alignment ≥ 4 → safe).
        self.queue.write_buffer(&self.f_buffer, 0, bytemuck::cast_slice(f));
        self.queue.write_buffer(&self.solid_buffer, 0, bytemuck::cast_slice(solid));
        self.queue.write_buffer(&self.rho_buffer, 0, bytemuck::cast_slice(rho));
        self.queue.write_buffer(&self.vx_buffer, 0, bytemuck::cast_slice(vx));
        self.queue.write_buffer(&self.vy_buffer, 0, bytemuck::cast_slice(vy));
        Ok(())
    }

    /// One full collide + stream step: two compute passes (implicit barrier at
    /// the pass boundary makes f_tmp writes visible to the stream reads) plus
    /// four staging copies. `submit` cannot fail in wgpu 30 (returns
    /// `SubmissionIndex`), so real errors surface at [`Self::readback`].
    pub fn step(&self) {
        let mut encoder = self
            .device
            .create_command_encoder(&wgpu::CommandEncoderDescriptor { label: Some("LBM step") });
        {
            let mut cpass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
                label: Some("LBM collide"),
                timestamp_writes: None,
            });
            cpass.set_pipeline(&self.collide_pipeline);
            cpass.set_bind_group(0, &self.bg_collide, &[]);
            cpass.dispatch_workgroups(self.workgroups, 1, 1);
        }
        {
            let mut cpass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
                label: Some("LBM stream"),
                timestamp_writes: None,
            });
            cpass.set_pipeline(&self.stream_pipeline);
            cpass.set_bind_group(0, &self.bg_stream, &[]);
            cpass.dispatch_workgroups(self.workgroups, 1, 1);
        }
        // Copy results to staging: f (9n) + rho/vx/vy (contiguous 3n block).
        encoder.copy_buffer_to_buffer(&self.f_buffer, 0, &self.staging_f, 0, self.f_bytes);
        encoder.copy_buffer_to_buffer(&self.rho_buffer, 0, &self.staging_macros, 0, self.macro_cell_bytes);
        encoder.copy_buffer_to_buffer(
            &self.vx_buffer,
            0,
            &self.staging_macros,
            self.macro_cell_bytes,
            self.macro_cell_bytes,
        );
        encoder.copy_buffer_to_buffer(
            &self.vy_buffer,
            0,
            &self.staging_macros,
            2 * self.macro_cell_bytes,
            self.macro_cell_bytes,
        );
        self.queue.submit(Some(encoder.finish()));
    }

    /// Real staging readback: maps `staging_f` (9n) and `staging_macros` (3n)
    /// back to CPU and returns the flat populations + macros.
    pub fn readback(&self) -> Result<GpuLbmReadback, String> {
        let f = Self::map_read_f32(&self.device, &self.staging_f)?;
        let macros = Self::map_read_f32(&self.device, &self.staging_macros)?;
        let n = self.n;
        let rho = macros[0..n].to_vec();
        let vx = macros[n..2 * n].to_vec();
        let vy = macros[2 * n..3 * n].to_vec();
        Ok(GpuLbmReadback { f, rho, vx, vy })
    }

    /// Map a staging buffer for reading and decode its `f32` payload.
    ///
    /// `map_async` + `poll(PollType::wait_indefinitely())` + `get_mapped_range`
    /// — this is the real readback path (closes the `gpu_compute.rs` dispatch-
    /// only gap). **Unmaps on every path** (including errors) so a failed
    /// readback never poisons the next `map_async` ("already mapped").
    fn map_read_f32(device: &wgpu::Device, buffer: &wgpu::Buffer) -> Result<Vec<f32>, String> {
        let (tx, rx) = mpsc::channel::<Result<(), wgpu::BufferAsyncError>>();
        buffer.slice(..).map_async(wgpu::MapMode::Read, move |res| {
            let _ = tx.send(res);
        });
        device
            .poll(wgpu::PollType::wait_indefinitely())
            .map_err(|e| {
                buffer.unmap();
                format!("gpu poll failed: {e}")
            })?;

        match rx.recv() {
            Ok(Ok(())) => {}
            Ok(Err(e)) => {
                buffer.unmap();
                return Err(format!("gpu buffer map failed: {e}"));
            }
            Err(_) => {
                buffer.unmap();
                return Err("gpu map callback dropped".to_string());
            }
        }

        let out = match buffer.slice(..).get_mapped_range() {
            Ok(view) => {
                let out = read_f32_slice(&view);
                // `view` (and its borrow of `buffer`) ends here.
                out
            }
            Err(e) => {
                buffer.unmap();
                return Err(format!("gpu get_mapped_range failed: {e}"));
            }
        };
        buffer.unmap();
        Ok(out)
    }
}

/// Flat GPU readback payload (populations + macros). A named struct keeps the
/// `readback` signature below clippy's `type_complexity` bar.
pub struct GpuLbmReadback {
    /// 9·n populations, SoA `f[q*n + i]`.
    pub f: Vec<f32>,
    pub rho: Vec<f32>,
    pub vx: Vec<f32>,
    pub vy: Vec<f32>,
}

/// Alignment-safe `f32` decode from a mapped `&[u8]` (staging Vec<u8> has
/// alignment 1 — `bytemuck::cast_slice` would panic; wgpu native is LE).
fn read_f32_slice(bytes: &[u8]) -> Vec<f32> {
    bytes
        .chunks_exact(4)
        .map(|c| f32::from_le_bytes([c[0], c[1], c[2], c[3]]))
        .collect()
}

/// Deterministic fingerprint of the measured GPU↔CPU parity (letter **ic**
/// discipline — distinct from every CPU solver fingerprint).
fn gpu_lbm_evidence_fingerprint(
    max_abs_f_diff: f32,
    mean_abs_f_diff: f32,
    max_abs_macro_diff: f32,
    parity_verified: bool,
) -> u64 {
    const SEED: u64 = 0x6770_756c_6d_21; // "gpu lbm!"
    let mut h = SEED;
    for v in [
        (max_abs_f_diff as f64).to_bits(),
        (mean_abs_f_diff as f64).to_bits(),
        (max_abs_macro_diff as f64).to_bits(),
    ] {
        h = h.rotate_left(31).wrapping_mul(0x9e37_79b9_7f4a_7c15);
        h ^= v.wrapping_add(0x517c_c1b7_2722_0a95);
    }
    if parity_verified {
        h ^= 0x5041_5254_5041_5254; // "PART" — verified parity marker
    }
    h ^ 0x4449_5354_4449_5354 // "DIST" — distinct evidence marker
}

/// Soak report for the GPU LBM parity run. Every flag is fail-closed: a flag is
/// only `true` when the corresponding reality was actually observed.
pub struct GpuFluidComputeSoakReport {
    /// `true` only after a REAL GPU run verified bounded CPU↔GPU parity.
    pub gpu_lbm_collide_stream_parity_ready: bool,
    pub parity_verified: bool,
    pub outputs_finite: bool,
    pub max_abs_f_diff: f32,
    pub mean_abs_f_diff: f32,
    pub max_abs_macro_diff: f32,
    pub mean_abs_macro_diff: f32,
    pub cell_count: u32,
    pub steps: u32,
    pub evidence_kind: &'static str,
    pub evidence_fingerprint: u64,
    pub distinct_from_cpu_lbm_probe: bool,
    pub distinct_from_sph_probe: bool,
    pub distinct_from_navier_stokes_probe: bool,
    pub adapter_name: Option<String>,
    /// Failure reason when fail-closed (no adapter / upload / readback /
    /// parity). `None` only when parity was verified.
    pub reason: Option<&'static str>,
    // --- HELD — AAA / unification flags stay false (honesty). ---
    pub full_lbm_parity_ready: bool,
    pub chaos_fluid_aaa_ready: bool,
    pub full_cfd_parity_ready: bool,
    pub dualsphysics_parity_ready: bool,
    pub flip_apic_parity_ready: bool,
    pub chaos_hybrid_fluid_ready: bool,
    pub gpu_fluid_unification_ready: bool,
}

/// Run the GPU LBM collide+stream parity soak against the CPU reference.
///
/// Seeds an identical 46² grid (boundary walls + settled dust + tool velocity
/// inject), then runs [`GPU_LBM_PARITY_STEPS`] steps on both GPU and CPU,
/// reading the GPU state back after every step. Ready flags flip only on real,
/// verified parity. No adapter → fail-closed `no_wgpu_adapter_or_device`.
pub fn run_gpu_lbm_parity_soak() -> GpuFluidComputeSoakReport {
    match run_gpu_lbm_parity_soak_inner() {
        Ok(report) => report,
        Err((adapter_name, reason)) => GpuFluidComputeSoakReport {
            gpu_lbm_collide_stream_parity_ready: false,
            parity_verified: false,
            outputs_finite: false,
            max_abs_f_diff: f32::INFINITY,
            mean_abs_f_diff: f32::INFINITY,
            max_abs_macro_diff: f32::INFINITY,
            mean_abs_macro_diff: f32::INFINITY,
            cell_count: 0,
            steps: 0,
            evidence_kind: GPU_LBM_EVIDENCE_KIND,
            evidence_fingerprint: 0,
            distinct_from_cpu_lbm_probe: false,
            distinct_from_sph_probe: false,
            distinct_from_navier_stokes_probe: false,
            adapter_name,
            reason: Some(reason),
            full_lbm_parity_ready: false,
            chaos_fluid_aaa_ready: false,
            full_cfd_parity_ready: false,
            dualsphysics_parity_ready: false,
            flip_apic_parity_ready: false,
            chaos_hybrid_fluid_ready: false,
            gpu_fluid_unification_ready: false,
        },
    }
}

fn run_gpu_lbm_parity_soak_inner() -> Result<GpuFluidComputeSoakReport, (Option<String>, &'static str)> {
    let width = LOAD_SCALE_SIDE;
    let height = LOAD_SCALE_SIDE;
    let n = width * height;

    let bridge = GpuFluidComputeBridge::new_sync(width, height, DEFAULT_TAU)
        .ok_or((None, "no_wgpu_adapter_or_device"))?;

    // CPU reference, identically seeded.
    let mut cpu = LatticeBoltzmannFluidGrid::new(width, height);
    cpu.seed_settled_dust(0.2);
    cpu.inject_tool_velocity(2.5);

    // Flatten the CPU seed into GPU SoA layout (f[q][i] -> f_flat[q*n + i]).
    let mut f_flat: Vec<f32> = Vec::with_capacity(9 * n);
    for q in 0..9 {
        f_flat.extend_from_slice(&cpu.f[q]);
    }
    let solid_flat: Vec<u32> = cpu.solid.iter().map(|&s| u32::from(s)).collect();
    let rho_flat = cpu.rho.to_vec();
    let vx_flat = cpu.vx.to_vec();
    let vy_flat = cpu.vy.to_vec();

    bridge
        .upload_seed(&f_flat, &solid_flat, &rho_flat, &vx_flat, &vy_flat)
        .map_err(|_| (bridge.adapter_name.clone(), "seed_upload_failed"))?;

    let mut max_abs_f_diff: f32 = 0.0;
    let mut sum_abs_f_diff: f64 = 0.0;
    let mut max_abs_macro_diff: f32 = 0.0;
    let mut sum_abs_macro_diff: f64 = 0.0;
    let mut outputs_finite = true;

    for _ in 0..GPU_LBM_PARITY_STEPS {
        bridge.step();
        cpu.step();
        let read = bridge
            .readback()
            .map_err(|_| (bridge.adapter_name.clone(), "gpu_readback_failed"))?;
        let (gpu_f, gpu_rho, gpu_vx, gpu_vy) = (read.f, read.rho, read.vx, read.vy);

        // Populations parity: 9n cells, per-q SoA slices.
        for (q, cpu_q) in cpu.f.iter().enumerate() {
            let gpu_q = &gpu_f[q * n..(q + 1) * n];
            for (&g, &c) in gpu_q.iter().zip(cpu_q.iter()) {
                let d = (g - c).abs();
                max_abs_f_diff = max_abs_f_diff.max(d);
                sum_abs_f_diff += d as f64;
                if !d.is_finite() {
                    outputs_finite = false;
                }
            }
        }
        // Macro parity: rho/vx/vy, fully iterator-zipped (no index loops).
        for (((&gr, &gvx), &gvy), ((&cr, &cvx), &cvy)) in gpu_rho
            .iter()
            .zip(gpu_vx.iter())
            .zip(gpu_vy.iter())
            .zip(cpu.rho.iter().zip(cpu.vx.iter()).zip(cpu.vy.iter()))
        {
            let dr = (gr - cr).abs();
            let dvx = (gvx - cvx).abs();
            let dvy = (gvy - cvy).abs();
            let d = dr.max(dvx).max(dvy);
            max_abs_macro_diff = max_abs_macro_diff.max(d);
            sum_abs_macro_diff += dr as f64 + dvx as f64 + dvy as f64;
            if !d.is_finite() {
                outputs_finite = false;
            }
        }
    }

    let mean_abs_f_diff = (sum_abs_f_diff / (9 * n) as f64) as f32;
    let mean_abs_macro_diff = (sum_abs_macro_diff / (3 * n) as f64) as f32;

    let parity_verified = outputs_finite
        && max_abs_f_diff <= GPU_PARITY_MAX_ABS_EPS
        && max_abs_macro_diff <= GPU_PARITY_MAX_ABS_EPS
        && mean_abs_f_diff <= GPU_PARITY_MEAN_EPS
        && mean_abs_macro_diff <= GPU_PARITY_MEAN_EPS;

    let evidence_fingerprint = gpu_lbm_evidence_fingerprint(
        max_abs_f_diff,
        mean_abs_f_diff,
        max_abs_macro_diff,
        parity_verified,
    );

    // Letter **ic**: peers are measured via their evidence kinds — no hard-coded
    // peer `true`. Ready requires real verified parity AND a distinct kind.
    let gpu_lbm_collide_stream_parity_ready = parity_verified;
    let distinct_from_cpu_lbm_probe = parity_verified
        && evidence_fingerprint != 0
        && FLUID_EVIDENCE_KIND != GPU_LBM_EVIDENCE_KIND;
    let distinct_from_sph_probe = parity_verified
        && evidence_fingerprint != 0
        && SPH_EVIDENCE_KIND != GPU_LBM_EVIDENCE_KIND;
    let distinct_from_navier_stokes_probe = parity_verified
        && evidence_fingerprint != 0
        && NS_EVIDENCE_KIND != GPU_LBM_EVIDENCE_KIND;

    Ok(GpuFluidComputeSoakReport {
        gpu_lbm_collide_stream_parity_ready,
        parity_verified,
        outputs_finite,
        max_abs_f_diff,
        mean_abs_f_diff,
        max_abs_macro_diff,
        mean_abs_macro_diff,
        cell_count: n as u32,
        steps: GPU_LBM_PARITY_STEPS,
        evidence_kind: GPU_LBM_EVIDENCE_KIND,
        evidence_fingerprint,
        distinct_from_cpu_lbm_probe,
        distinct_from_sph_probe,
        distinct_from_navier_stokes_probe,
        adapter_name: bridge.adapter_name.clone(),
        reason: if parity_verified { None } else { Some("parity_soak_failed") },
        full_lbm_parity_ready: false,
        chaos_fluid_aaa_ready: false,
        full_cfd_parity_ready: false,
        dualsphysics_parity_ready: false,
        flip_apic_parity_ready: false,
        chaos_hybrid_fluid_ready: false,
        gpu_fluid_unification_ready: false,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Honesty contract: a `true` readiness flag must be backed by real,
    /// verified, distinct evidence; otherwise the report is fail-closed with a
    /// reason (no fake "success").
    #[test]
    fn honesty_ready_implies_verified_and_distinct() {
        let report = run_gpu_lbm_parity_soak();
        if report.gpu_lbm_collide_stream_parity_ready {
            assert!(report.parity_verified);
            assert!(report.outputs_finite);
            assert!(report.max_abs_f_diff <= GPU_PARITY_MAX_ABS_EPS);
            assert!(report.max_abs_macro_diff <= GPU_PARITY_MAX_ABS_EPS);
            assert!(report.mean_abs_f_diff <= GPU_PARITY_MEAN_EPS);
            assert!(report.mean_abs_macro_diff <= GPU_PARITY_MEAN_EPS);
            assert!(report.distinct_from_cpu_lbm_probe);
            assert!(report.distinct_from_sph_probe);
            assert!(report.distinct_from_navier_stokes_probe);
            assert!(report.evidence_fingerprint != 0);
            assert!(report.reason.is_none());
            assert!(report.adapter_name.is_some());
        } else {
            assert!(report.reason.is_some());
        }
    }

    /// AAA / unification flags are never flipped by a GPU soak run.
    #[test]
    fn held_flags_never_flip_on_gpu_soak() {
        let report = run_gpu_lbm_parity_soak();
        assert!(!report.full_lbm_parity_ready);
        assert!(!report.chaos_fluid_aaa_ready);
        assert!(!report.full_cfd_parity_ready);
        assert!(!report.dualsphysics_parity_ready);
        assert!(!report.flip_apic_parity_ready);
        assert!(!report.chaos_hybrid_fluid_ready);
        assert!(!report.gpu_fluid_unification_ready);
    }

    /// The GPU evidence kind is textually distinct from every CPU solver kind.
    #[test]
    fn gpu_evidence_kind_distinct_from_cpu_solvers() {
        assert_ne!(GPU_LBM_EVIDENCE_KIND, FLUID_EVIDENCE_KIND);
        assert_ne!(GPU_LBM_EVIDENCE_KIND, SPH_EVIDENCE_KIND);
        assert_ne!(GPU_LBM_EVIDENCE_KIND, NS_EVIDENCE_KIND);
    }

    /// `read_f32_slice` decodes a byte slice bit-exactly (incl. INFINITY,
    /// -0.0), independent of the source byte-buffer alignment.
    #[test]
    fn f32_byte_roundtrip_alignment_safe() {
        let values = [
            0.0_f32,
            -0.0_f32,
            1.5,
            -2.25,
            1.2345678,
            f32::INFINITY,
            f32::NEG_INFINITY,
            f32::MAX,
            f32::MIN_POSITIVE,
        ];
        let flat: Vec<u8> = values.iter().flat_map(|v| v.to_le_bytes()).collect();
        let decoded = read_f32_slice(&flat);
        assert_eq!(decoded.len(), values.len());
        for (d, v) in decoded.iter().zip(values.iter()) {
            assert_eq!(d.to_bits(), v.to_bits(), "bit-exact for {v}");
        }
    }

    /// The CPU parity reference is deterministic: two identically seeded grids
    /// produce bit-identical populations and macros after the same steps.
    #[test]
    fn cpu_reference_parity_reference_is_deterministic() {
        let mut a = LatticeBoltzmannFluidGrid::new(LOAD_SCALE_SIDE, LOAD_SCALE_SIDE);
        a.seed_settled_dust(0.2);
        a.inject_tool_velocity(2.5);
        let mut b = LatticeBoltzmannFluidGrid::new(LOAD_SCALE_SIDE, LOAD_SCALE_SIDE);
        b.seed_settled_dust(0.2);
        b.inject_tool_velocity(2.5);
        for _ in 0..GPU_LBM_PARITY_STEPS {
            a.step();
            b.step();
        }
        for (aq, bq) in a.f.iter().zip(b.f.iter()) {
            for (av, bv) in aq.iter().zip(bq.iter()) {
                assert_eq!(av.to_bits(), bv.to_bits());
            }
        }
        for (ar, br) in a.rho.iter().zip(b.rho.iter()) {
            assert_eq!(ar.to_bits(), br.to_bits());
        }
        for (av, bv) in a.vx.iter().zip(b.vx.iter()) {
            assert_eq!(av.to_bits(), bv.to_bits());
        }
        for (av, bv) in a.vy.iter().zip(b.vy.iter()) {
            assert_eq!(av.to_bits(), bv.to_bits());
        }
    }

    /// Guards the GPU design invariant: the CPU post-stream macro refresh
    /// leaves solid rho at its init value (1.0) while zeroing solid vx/vy. The
    /// GPU shader must reproduce exactly this, or macro parity breaks.
    #[test]
    fn solid_rho_stays_at_initial_one_after_cpu_steps() {
        let mut grid = LatticeBoltzmannFluidGrid::new(LOAD_SCALE_SIDE, LOAD_SCALE_SIDE);
        grid.seed_settled_dust(0.2);
        grid.inject_tool_velocity(2.5);
        for _ in 0..GPU_LBM_PARITY_STEPS {
            grid.step();
        }
        for (s, r) in grid.solid.iter().zip(grid.rho.iter()) {
            if *s {
                assert_eq!(r.to_bits(), 1.0f32.to_bits());
            }
        }
    }
}
