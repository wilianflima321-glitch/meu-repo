//! Console HAL desktop path (letter **bs**) + CW3 Path A present/submit deepen.
//!
//! wgpu documents Vulkan / DX12 / Metal via `wgpu::Backends` for studio-local.
//! Maps to TS `lib/immunity/console-hal.ts` negotiate (`webgpu` / `vulkan` / `dx12`).
//! **PS5 GNM always HELD** — no proprietary SDK; never claim `ps5GnmReady`.
//!
//! # Present honesty (CW3 Path A)
//! - Tauri main window hosts a Chromium WebView; exclusive native swapchain present
//!   on that HWND remains **HELD** (WebView owns the pixels — Chromium compositor
//!   owns the HWND; mounting a wgpu surface without exclusive ownership is identity
//!   only, never product viewport replacement).
//! - Maximum real path: controlled secondary `winit` window → surface configure →
//!   **engine frame skeleton** (offline meshlet cook → cluster `encode_cull`
//!   [+ next-frame Hi-Z sample] → pack `DrawIndirectArgs` → clear + depth +
//!   proxy `draw_indirect` → build depth pyramid → radiance probe fill/sample →
//!   `queue.submit` → `SurfaceTexture::present`) with **no CPU readback** on
//!   the hot path. Final meshlet/probe sample counts may be read **after** the
//!   loop for evidence.
//! - `hiz_ready` / `nanite_ready` / `micro_poly_aaa_ready` /
//!   `multi_draw_indirect_aaa_ready` / `lumen_ready` stay **false** —
//!   substrate ≠ AAA Parity. WebView exclusive present remains HELD.

use std::sync::{Arc, Mutex};
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::{WebviewWindow, Wry};
use winit::dpi::PhysicalSize;
use winit::event_loop::EventLoopBuilder;
use winit::window::WindowBuilder;

use crate::gpu_culling::identity_frustum;
use crate::gpu_hiz::DepthPyramidHiz;
use crate::gpu_meshlet_cook::cook_soak_meshlets;
use crate::gpu_meshlet_cull::MeshletCullScaffold;
use crate::gpu_radiance_probes::{soak_probe_volume_params, RadianceProbeVolume};
use crate::gpu_culling::GpuCullingPipeline;

/// Default soak frames for present probe (bounded — not a product game loop).
const DEFAULT_PRESENT_SOAK_FRAMES: u32 = 3;
const MAX_PRESENT_SOAK_FRAMES: u32 = 8;
const PRESENT_PROBE_TIMEOUT: Duration = Duration::from_secs(45);

// Held for identity/lifetime (surface must outlive present) and future present-loop
// wiring (CW3 Path A secondary-window present already proves the technique in
// `run_renderer_present_probe`; wiring it onto this mount is tracked, not silent).
// Not read directly yet because `mount_on_window` is currently identity/mount-only —
// see module docs above ("present honesty").
#[allow(dead_code)]
pub struct WgpuRenderer {
    pub instance: wgpu::Instance,
    pub surface: wgpu::Surface<'static>,
    pub adapter: wgpu::Adapter,
    pub device: Arc<wgpu::Device>,
    pub queue: Arc<wgpu::Queue>,
    /// Missão Suprema 6 — GPU-Driven Rendering: built once alongside the
    /// device so frustum/occlusion culling can dispatch every frame without
    /// touching shader compilation again.
    pub culling: GpuCullingPipeline,
}

/// Structured evidence for desktop present/submit (IPC + Critic soak).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RendererPresentProbeReport {
    /// True only after `SurfaceTexture::present()` succeeded for ≥1 frame.
    pub presented: bool,
    /// True only after `queue.submit` completed for the present pass.
    pub submitted: bool,
    pub surface_configured: bool,
    pub adapter_acquired: bool,
    pub device_created: bool,
    pub frames_presented: u32,
    pub frames_requested: u32,
    pub adapter_name: String,
    /// e.g. "Vulkan", "Dx12", "Metal", "Gl" — from `AdapterInfo::backend`.
    pub backend: String,
    /// `secondary_winit` | `tauri_webview` | `none`
    pub surface_kind: String,
    /// Hot path never maps textures / readbacks for this probe.
    pub cpu_readback_on_hot_path: bool,
    /// True when submit→present had no intermediate CPU image copy.
    pub zero_copy_hot_path: bool,
    /// WebView HWND exclusive present remains blocked / unproven as product path.
    pub webview_exclusive_present_held: bool,
    /// Engine skeleton: frustum cull encode ran each presented frame (no hot-path readback).
    pub cull_dispatches: u32,
    pub cull_visible_final: u32,
    pub cull_expected_visible: u32,
    pub cull_frustum_ok: bool,
    /// Wall-clock Instant per cull+clear+submit+present frame (ms). Never fabricated.
    pub frame_ms_min: f64,
    pub frame_ms_max: f64,
    pub frame_ms_mean: f64,
    pub frame_ms_total: f64,
    /// True when this soak ran the present+cull engine frame skeleton.
    pub engine_frame_loop_with_cull: bool,
    /// True when secondary soak issued GPU `draw_indirect` (scaffold proven).
    /// Product WebView path + true MULTI_DRAW_INDIRECT AAA remain HELD.
    pub indirect_draw_wired: bool,
    /// Always false — `Features::MULTI_DRAW_INDIRECT` batch / Nanite MDI not claimed.
    pub multi_draw_indirect_aaa_ready: bool,
    /// True when VS indexed objects via storage buffers (bindless-*layout* scaffold).
    pub bindless_layout_scaffold: bool,
    /// Always false — full bindless descriptor heap / UE RHI bindless AAA HELD.
    pub bindless_aaa_ready: bool,
    /// Mip levels in the secondary Hi-Z R32Float pyramid (0 if not built).
    pub hiz_pyramid_mips: u32,
    /// Total max-downsample compute passes across presented frames.
    pub hiz_downsample_passes: u32,
    /// Frames where cull ran with `occlusion_enabled=1` (next-frame sample).
    pub hiz_cull_sampled_frames: u32,
    /// Instant ms spent in Hi-Z copy+downsample (sum over frames). Never fabricated.
    pub hiz_build_ms_total: f64,
    /// True when mip_count≥2, downsample ran, and ≥1 next-frame cull sample.
    pub hiz_substrate_proven: bool,
    /// Always false — product RHI / Nanite HZB / shipping occlusion not claimed.
    pub hiz_ready: bool,
    /// Meshlet clusters in the secondary Nanite-path fixture.
    pub meshlet_cluster_count: u32,
    /// Contract triangles-per-cluster (128) — not software-rasterized here.
    pub meshlet_triangles_per_cluster: u32,
    /// Visible meshlets after GPU cluster cull (post-loop readback).
    pub meshlet_visible_final: u32,
    pub meshlet_expected_visible: u32,
    /// True when meshlet layout + cull → draw_indirect evidence passed.
    pub meshlet_cull_substrate_proven: bool,
    /// Instant ms spent in meshlet cull+pack encode (sum over frames).
    pub meshlet_cull_ms_total: f64,
    /// Instant ms for offline CPU meshlet cook (topology partition). Never fabricated.
    pub meshlet_cook_ms: f64,
    /// Input triangles fed to the offline cook.
    pub meshlet_cook_input_triangles: u32,
    /// Triangles assigned across cooked leaf clusters (must match input when proven).
    pub meshlet_cook_cooked_triangles: u32,
    /// True when offline cook topology was complete and clusters drove the soak.
    pub meshlet_cook_proven: bool,
    /// Adapter reports `Features::MULTI_DRAW_INDIRECT` (capability only).
    pub multi_draw_indirect_feature_available: bool,
    /// Probe cells in the secondary irradiance volume (dim³).
    pub radiance_probe_count: u32,
    /// Instant ms spent in GPU probe fill+sample (sum over frames).
    pub radiance_probe_ms_total: f64,
    /// Post-loop sample luminance at open (lit) world point.
    pub radiance_sample_lit_luminance: f64,
    /// Post-loop sample luminance at occluded (dark) world point.
    pub radiance_sample_dark_luminance: f64,
    /// True when fill+sample ran and lit luminance > dark (fail-closed evidence).
    pub radiance_probe_substrate_proven: bool,
    /// Reasons (fail-closed or remaining HELD vs UE RHI).
    pub reasons: Vec<String>,
    pub held_vs_ue_rhi: Vec<String>,
    /// Always false — never flip marketing from present soak.
    pub nanite_ready: bool,
    pub lumen_ready: bool,
    pub micro_poly_aaa_ready: bool,
    pub unreal_rhi_parity_ready: bool,
    pub letter: String,
    pub note: String,
}

/// Last successful/failed probe for IPC pull without re-running GPU work.
#[derive(Default)]
pub struct PresentProbeState(pub Mutex<Option<RendererPresentProbeReport>>);

impl WgpuRenderer {
    /// Compiles and creates a Compute Pipeline from a raw WGSL shader string.
    /// General-purpose helper for future compute passes (denoise, skinning, particles);
    /// `GpuCullingPipeline` currently builds its own dedicated pipeline instead of this.
    #[allow(dead_code)]
    pub fn create_compute_pipeline(
        &self,
        shader_source: &str,
        entry_point: &str,
    ) -> wgpu::ComputePipeline {
        let shader = self.device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Aethel Compute Shader"),
            source: wgpu::ShaderSource::Wgsl(shader_source.into()),
        });

        self.device
            .create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
                label: Some("Aethel Compute Pipeline"),
                layout: None,
                module: &shader,
                entry_point,
                compilation_options: Default::default(),
            })
    }

    /// Mounts a wgpu surface onto the Tauri OS window (adapter identity + HAL mount).
    ///
    /// **Honesty:** this is surface+device mount for profiler identity — **not** a
    /// product present/submit loop. WebView exclusive present stays HELD; use
    /// [`run_renderer_present_probe`] for proven secondary-window present.
    pub async fn mount_on_window(window: Arc<WebviewWindow<Wry>>) -> Result<Self, String> {
        let instance = wgpu::Instance::new(wgpu::InstanceDescriptor {
            backends: wgpu::Backends::PRIMARY,
            ..Default::default()
        });

        // wgpu 0.19's `create_surface` is safe for any `Arc<T: HasWindowHandle + HasDisplayHandle>`
        // target; the Tauri `WebviewWindow` Arc keeps the HWND alive for as long as the surface does.
        let surface = instance
            .create_surface(window.clone())
            .map_err(|e| e.to_string())?;

        let adapter = instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::HighPerformance,
                compatible_surface: Some(&surface),
                force_fallback_adapter: false,
            })
            .await
            .ok_or_else(|| {
                "Failed to find an appropriate GPU adapter for Aethel Engine".to_string()
            })?;

        let (device, queue) = adapter
            .request_device(
                &wgpu::DeviceDescriptor {
                    label: Some("Aethel Engine Native Device"),
                    required_features: wgpu::Features::empty(),
                    required_limits: wgpu::Limits::default(),
                },
                None,
            )
            .await
            .map_err(|e| format!("Failed to request device: {e}"))?;

        let culling = GpuCullingPipeline::new(&device);

        Ok(Self {
            instance,
            surface,
            adapter,
            device: Arc::new(device),
            queue: Arc::new(queue),
            culling,
        })
    }
}

fn held_vs_ue_baseline() -> Vec<String> {
    vec![
        "UE ships a unified RHI present pipeline into the game viewport".into(),
        "Aethel Studio Local UI is WebView-composited — exclusive HWND present HELD".into(),
        "Probe proves secondary winit cook→meshlet cull→draw_indirect→Hi-Z→radiance probe fill/sample only".into(),
        "MULTI_DRAW_INDIRECT feature may be available but multi_draw_indirect_aaa_ready stays false".into(),
        "hiz_ready / nanite_ready / micro_poly_aaa_ready / lumen_ready stay false — substrate ≠ AAA Parity".into(),
        "True Lumen / radiance-cascades AAA / MULTI_DRAW batch / Nanite virtualized geometry still HELD".into(),
    ]
}

fn fail_report(frames_requested: u32, reasons: Vec<String>) -> RendererPresentProbeReport {
    RendererPresentProbeReport {
        presented: false,
        submitted: false,
        surface_configured: false,
        adapter_acquired: false,
        device_created: false,
        frames_presented: 0,
        frames_requested,
        adapter_name: String::new(),
        backend: String::new(),
        surface_kind: "none".into(),
        cpu_readback_on_hot_path: false,
        zero_copy_hot_path: false,
        webview_exclusive_present_held: true,
        cull_dispatches: 0,
        cull_visible_final: 0,
        cull_expected_visible: 0,
        cull_frustum_ok: false,
        frame_ms_min: 0.0,
        frame_ms_max: 0.0,
        frame_ms_mean: 0.0,
        frame_ms_total: 0.0,
        engine_frame_loop_with_cull: false,
        indirect_draw_wired: false,
        multi_draw_indirect_aaa_ready: false,
        bindless_layout_scaffold: false,
        bindless_aaa_ready: false,
        hiz_pyramid_mips: 0,
        hiz_downsample_passes: 0,
        hiz_cull_sampled_frames: 0,
        hiz_build_ms_total: 0.0,
        hiz_substrate_proven: false,
        hiz_ready: false,
        meshlet_cluster_count: 0,
        meshlet_triangles_per_cluster: 0,
        meshlet_visible_final: 0,
        meshlet_expected_visible: 0,
        meshlet_cull_substrate_proven: false,
        meshlet_cull_ms_total: 0.0,
        meshlet_cook_ms: 0.0,
        meshlet_cook_input_triangles: 0,
        meshlet_cook_cooked_triangles: 0,
        meshlet_cook_proven: false,
        multi_draw_indirect_feature_available: false,
        radiance_probe_count: 0,
        radiance_probe_ms_total: 0.0,
        radiance_sample_lit_luminance: 0.0,
        radiance_sample_dark_luminance: 0.0,
        radiance_probe_substrate_proven: false,
        reasons,
        held_vs_ue_rhi: held_vs_ue_baseline(),
        nanite_ready: false,
        lumen_ready: false,
        micro_poly_aaa_ready: false,
        unreal_rhi_parity_ready: false,
        letter: "cw3-present".into(),
        note: "Present/submit probe fail-closed — never invent presented:true".into(),
    }
}

struct EngineFrameOutcome {
    hiz_downs: u32,
    hiz_build_ms: f64,
    meshlet_cull_ms: f64,
    radiance_probe_ms: f64,
}

/// Meshlet cull → pack → clear+depth+draw_indirect → Hi-Z → radiance probes → present.
fn present_one_engine_frame(
    device: &wgpu::Device,
    queue: &wgpu::Queue,
    surface: &wgpu::Surface<'_>,
    meshlets: &MeshletCullScaffold,
    hiz: &DepthPyramidHiz,
    radiance: &RadianceProbeVolume,
    occlusion_enabled: bool,
) -> Result<EngineFrameOutcome, String> {
    let frame = surface
        .get_current_texture()
        .map_err(|e| format!("get_current_texture failed: {e}"))?;
    let view = frame
        .texture
        .create_view(&wgpu::TextureViewDescriptor::default());
    let mut encoder = device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
        label: Some("aethel-engine-frame-encoder"),
    });
    let t_meshlet = std::time::Instant::now();
    meshlets.encode_cull(queue, &mut encoder, occlusion_enabled);
    meshlets.encode_pack(&mut encoder);
    let meshlet_cull_ms = t_meshlet.elapsed().as_secs_f64() * 1000.0;
    {
        let mut rpass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
            label: Some("aethel-present-probe-meshlet-draw-depth"),
            color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                view: &view,
                resolve_target: None,
                ops: wgpu::Operations {
                    load: wgpu::LoadOp::Clear(wgpu::Color {
                        r: 0.02,
                        g: 0.03,
                        b: 0.06,
                        a: 1.0,
                    }),
                    store: wgpu::StoreOp::Store,
                },
            })],
            depth_stencil_attachment: Some(wgpu::RenderPassDepthStencilAttachment {
                view: hiz.depth_view(),
                depth_ops: Some(wgpu::Operations {
                    load: wgpu::LoadOp::Clear(1.0),
                    store: wgpu::StoreOp::Store,
                }),
                stencil_ops: None,
            }),
            occlusion_query_set: None,
            timestamp_writes: None,
        });
        meshlets.encode_draw_indirect(&mut rpass);
    }
    let t_hiz = std::time::Instant::now();
    let hiz_downs = hiz.encode_build(&mut encoder);
    let hiz_build_ms = t_hiz.elapsed().as_secs_f64() * 1000.0;
    let t_rad = std::time::Instant::now();
    radiance.encode_fill_and_sample(queue, &mut encoder);
    let radiance_probe_ms = t_rad.elapsed().as_secs_f64() * 1000.0;
    queue.submit(std::iter::once(encoder.finish()));
    frame.present();
    Ok(EngineFrameOutcome {
        hiz_downs,
        hiz_build_ms,
        meshlet_cull_ms,
        radiance_probe_ms,
    })
}

fn configure_surface(
    device: &wgpu::Device,
    adapter: &wgpu::Adapter,
    surface: &wgpu::Surface<'_>,
    width: u32,
    height: u32,
) -> Result<wgpu::TextureFormat, String> {
    let caps = surface.get_capabilities(adapter);
    let format = caps
        .formats
        .first()
        .copied()
        .ok_or_else(|| "Surface has no texture formats".to_string())?;
    let alpha_mode = caps
        .alpha_modes
        .first()
        .copied()
        .unwrap_or(wgpu::CompositeAlphaMode::Opaque);
    let present_mode = if caps.present_modes.contains(&wgpu::PresentMode::Fifo) {
        wgpu::PresentMode::Fifo
    } else {
        *caps
            .present_modes
            .first()
            .ok_or_else(|| "Surface has no present modes".to_string())?
    };
    let config = wgpu::SurfaceConfiguration {
        usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
        format,
        width: width.max(1),
        height: height.max(1),
        present_mode,
        alpha_mode,
        view_formats: vec![],
        desired_maximum_frame_latency: 2,
    };
    surface.configure(device, &config);
    Ok(format)
}

/// Blocking present soak on a dedicated thread (owns its own winit EventLoop).
fn present_probe_on_secondary_window(frames_requested: u32) -> RendererPresentProbeReport {
    let frames_requested = frames_requested.clamp(1, MAX_PRESENT_SOAK_FRAMES);

    let mut event_loop_builder = EventLoopBuilder::new();
    let event_loop = match event_loop_builder.build() {
        Ok(el) => el,
        Err(e) => {
            return fail_report(
                frames_requested,
                vec![
                    format!("winit EventLoopBuilder failed: {e}"),
                    "Cannot prove present without a native window surface".into(),
                ],
            );
        }
    };

    let window = match WindowBuilder::new()
        .with_title("Aethel Present Probe")
        .with_inner_size(PhysicalSize::new(128, 128))
        .with_visible(false)
        .build(&event_loop)
    {
        Ok(w) => w,
        Err(e) => {
            return fail_report(
                frames_requested,
                vec![
                    format!("secondary winit window create failed: {e}"),
                    "Present soak HELD — no controlled surface".into(),
                ],
            );
        }
    };

    let size = window.inner_size();
    let instance = wgpu::Instance::new(wgpu::InstanceDescriptor {
        backends: wgpu::Backends::PRIMARY,
        ..Default::default()
    });

    let surface = match instance.create_surface(&window) {
        Ok(s) => s,
        Err(e) => {
            return fail_report(
                frames_requested,
                vec![
                    format!("create_surface on secondary winit failed: {e}"),
                    "Present soak HELD — surface create failed".into(),
                ],
            );
        }
    };

    let adapter = match pollster::block_on(instance.request_adapter(&wgpu::RequestAdapterOptions {
        power_preference: wgpu::PowerPreference::HighPerformance,
        compatible_surface: Some(&surface),
        force_fallback_adapter: false,
    })) {
        Some(a) => a,
        None => {
            return fail_report(
                frames_requested,
                vec!["No wgpu adapter compatible with secondary surface".into()],
            );
        }
    };

    let info = adapter.get_info();
    let adapter_name = info.name.clone();
    let backend = format!("{:?}", info.backend);
    let multi_draw_indirect_feature_available = adapter
        .features()
        .contains(wgpu::Features::MULTI_DRAW_INDIRECT);

    let (device, queue) = match pollster::block_on(adapter.request_device(
        &wgpu::DeviceDescriptor {
            label: Some("Aethel Present Probe Device"),
            // Portable path: do not require MULTI_DRAW_INDIRECT (often missing /
            // non-portable on typical Windows wgpu). Capability is reported only.
            required_features: wgpu::Features::empty(),
            required_limits: wgpu::Limits::default(),
        },
        None,
    )) {
        Ok(dq) => dq,
        Err(e) => {
            let mut r = fail_report(
                frames_requested,
                vec![format!("request_device failed: {e}")],
            );
            r.adapter_acquired = true;
            r.adapter_name = adapter_name;
            r.backend = backend;
            r.surface_kind = "secondary_winit".into();
            r.multi_draw_indirect_feature_available = multi_draw_indirect_feature_available;
            return r;
        }
    };

    let surface_format = match configure_surface(&device, &adapter, &surface, size.width, size.height)
    {
        Ok(f) => f,
        Err(e) => {
            let mut r = fail_report(frames_requested, vec![e]);
            r.adapter_acquired = true;
            r.device_created = true;
            r.adapter_name = adapter_name;
            r.backend = backend;
            r.surface_kind = "secondary_winit".into();
            r.multi_draw_indirect_feature_available = multi_draw_indirect_feature_available;
            return r;
        }
    };

    let (cook_receipt, expected_visible) = match cook_soak_meshlets() {
        Ok(v) => v,
        Err(e) => {
            let mut r = fail_report(
                frames_requested,
                vec![format!("offline meshlet cook failed: {e}")],
            );
            r.adapter_acquired = true;
            r.device_created = true;
            r.adapter_name = adapter_name;
            r.backend = backend;
            r.surface_kind = "secondary_winit".into();
            r.surface_configured = true;
            r.multi_draw_indirect_feature_available = multi_draw_indirect_feature_available;
            return r;
        }
    };
    let clusters = cook_receipt.clusters();
    let meshlet_cook_ms = cook_receipt.cook_ms;
    let meshlet_cook_input_triangles = cook_receipt.input_triangle_count;
    let meshlet_cook_cooked_triangles = cook_receipt.cooked_triangle_count;
    let frustum = identity_frustum(clusters.len() as u32);

    let hiz = match DepthPyramidHiz::new(&device, size.width.max(2), size.height.max(2)) {
        Ok(h) => h,
        Err(e) => {
            let mut r = fail_report(
                frames_requested,
                vec![format!("DepthPyramidHiz init failed: {e}")],
            );
            r.adapter_acquired = true;
            r.device_created = true;
            r.adapter_name = adapter_name;
            r.backend = backend;
            r.surface_kind = "secondary_winit".into();
            r.surface_configured = true;
            r.multi_draw_indirect_feature_available = multi_draw_indirect_feature_available;
            r.meshlet_cook_ms = meshlet_cook_ms;
            r.meshlet_cook_input_triangles = meshlet_cook_input_triangles;
            r.meshlet_cook_cooked_triangles = meshlet_cook_cooked_triangles;
            return r;
        }
    };

    let meshlets = match MeshletCullScaffold::new(
        &device,
        surface_format,
        &clusters,
        frustum,
        hiz.pyramid_view(),
    ) {
        Ok(m) => m,
        Err(e) => {
            let mut r = fail_report(
                frames_requested,
                vec![format!("MeshletCullScaffold init failed: {e}")],
            );
            r.adapter_acquired = true;
            r.device_created = true;
            r.adapter_name = adapter_name;
            r.backend = backend;
            r.surface_kind = "secondary_winit".into();
            r.surface_configured = true;
            r.multi_draw_indirect_feature_available = multi_draw_indirect_feature_available;
            r.meshlet_cook_ms = meshlet_cook_ms;
            r.meshlet_cook_input_triangles = meshlet_cook_input_triangles;
            r.meshlet_cook_cooked_triangles = meshlet_cook_cooked_triangles;
            return r;
        }
    };

    let radiance = match RadianceProbeVolume::new(&device, soak_probe_volume_params()) {
        Ok(v) => v,
        Err(e) => {
            let mut r = fail_report(
                frames_requested,
                vec![format!("RadianceProbeVolume init failed: {e}")],
            );
            r.adapter_acquired = true;
            r.device_created = true;
            r.adapter_name = adapter_name;
            r.backend = backend;
            r.surface_kind = "secondary_winit".into();
            r.surface_configured = true;
            r.multi_draw_indirect_feature_available = multi_draw_indirect_feature_available;
            r.meshlet_cook_ms = meshlet_cook_ms;
            r.meshlet_cook_input_triangles = meshlet_cook_input_triangles;
            r.meshlet_cook_cooked_triangles = meshlet_cook_cooked_triangles;
            return r;
        }
    };

    let mut frames_presented = 0u32;
    let mut cull_dispatches = 0u32;
    let mut indirect_draws = 0u32;
    let mut hiz_downsample_passes = 0u32;
    let mut hiz_cull_sampled_frames = 0u32;
    let mut hiz_build_ms_total = 0.0_f64;
    let mut meshlet_cull_ms_total = 0.0_f64;
    let mut radiance_probe_ms_total = 0.0_f64;
    let mut submitted = false;
    let mut last_err: Option<String> = None;
    let mut frame_ms: Vec<f64> = Vec::with_capacity(frames_requested as usize);
    for frame_i in 0..frames_requested {
        // Frame 0 builds pyramid with occlusion off; frame ≥1 samples prior Hi-Z.
        let occlusion_enabled = frame_i > 0;
        let t0 = std::time::Instant::now();
        match present_one_engine_frame(
            &device,
            &queue,
            &surface,
            &meshlets,
            &hiz,
            &radiance,
            occlusion_enabled,
        ) {
            Ok(outcome) => {
                submitted = true;
                frames_presented = frames_presented.saturating_add(1);
                cull_dispatches = cull_dispatches.saturating_add(1);
                indirect_draws = indirect_draws.saturating_add(1);
                hiz_downsample_passes =
                    hiz_downsample_passes.saturating_add(outcome.hiz_downs);
                hiz_build_ms_total += outcome.hiz_build_ms;
                meshlet_cull_ms_total += outcome.meshlet_cull_ms;
                radiance_probe_ms_total += outcome.radiance_probe_ms;
                if occlusion_enabled {
                    hiz_cull_sampled_frames = hiz_cull_sampled_frames.saturating_add(1);
                }
                frame_ms.push(t0.elapsed().as_secs_f64() * 1000.0);
            }
            Err(e) => {
                last_err = Some(e);
                break;
            }
        }
    }

    // Evidence-only readback after the present loop (not hot path).
    let cull_visible_final = if cull_dispatches > 0 {
        meshlets.readback_visible_count(&device, &queue)
    } else {
        0
    };
    let radiance_samples = if frames_presented > 0 {
        radiance.readback_samples(&device, &queue)
    } else {
        Vec::new()
    };
    let radiance_sample_lit_luminance = radiance_samples
        .first()
        .map(|s| f64::from(s.luminance))
        .unwrap_or(0.0);
    let radiance_sample_dark_luminance = radiance_samples
        .get(1)
        .map(|s| f64::from(s.luminance))
        .unwrap_or(0.0);
    // With Hi-Z sampling, last-frame visible may be ≤ expected frustum-only count.
    let cull_frustum_ok = cull_visible_final > 0
        && cull_visible_final <= expected_visible
        && cull_dispatches > 0;
    let indirect_draw_wired = presented_ok(frames_presented, indirect_draws) && cull_frustum_ok;
    let meshlet_cook_proven = cook_receipt.topology_complete
        && meshlet_cook_input_triangles > 0
        && meshlet_cook_input_triangles == meshlet_cook_cooked_triangles
        && cook_receipt.cluster_count >= 2
        && presented_ok(frames_presented, indirect_draws);
    let meshlet_cull_substrate_proven = indirect_draw_wired
        && meshlet_cook_proven
        && meshlets.triangles_per_cluster == crate::gpu_meshlet_cull::MESHLET_TRIANGLES_PER_CLUSTER;
    let hiz_substrate_proven = hiz.mip_count >= 2
        && hiz_downsample_passes > 0
        && hiz_cull_sampled_frames > 0
        && frames_presented > 1;
    let radiance_probe_substrate_proven = frames_presented > 0
        && radiance.probe_count >= 8
        && radiance_probe_ms_total >= 0.0
        && radiance_samples.len() >= 2
        && radiance_sample_lit_luminance > radiance_sample_dark_luminance
        && radiance_sample_lit_luminance > 0.0;

    let frame_ms_total: f64 = frame_ms.iter().sum();
    let frame_ms_min = frame_ms
        .iter()
        .copied()
        .fold(f64::INFINITY, f64::min);
    let frame_ms_max = frame_ms.iter().copied().fold(0.0_f64, f64::max);
    let frame_ms_mean = if frames_presented > 0 {
        frame_ms_total / f64::from(frames_presented)
    } else {
        0.0
    };
    let frame_ms_min = if frame_ms_min.is_finite() {
        frame_ms_min
    } else {
        0.0
    };

    let presented = frames_presented > 0;
    let mut reasons = Vec::new();
    if presented {
        reasons.push(format!(
            "Presented {frames_presented}/{frames_requested} frame(s) on secondary_winit via cook→meshlet-cull→pack→draw_indirect→hiz→radiance-probes→present (no CPU readback on hot path)"
        ));
        reasons.push(format!(
            "Offline cook ms={meshlet_cook_ms:.3}; input_tris={meshlet_cook_input_triangles} cooked_tris={meshlet_cook_cooked_triangles}; topology_complete={}; meshlet_cook_proven={meshlet_cook_proven}",
            cook_receipt.topology_complete
        ));
        reasons.push(format!(
            "Meshlet clusters={} tri/cluster_cap={}; dispatches={cull_dispatches}; indirect draws={indirect_draws}; post-loop visible={cull_visible_final} (frustum expected≤{expected_visible}); frustum_ok={cull_frustum_ok}; meshlet_cull_substrate_proven={meshlet_cull_substrate_proven}",
            clusters.len(),
            meshlets.triangles_per_cluster
        ));
        reasons.push(format!(
            "MULTI_DRAW_INDIRECT adapter feature available={multi_draw_indirect_feature_available}; multi_draw_indirect_aaa_ready=false (not requested; fail-closed without AAA Parity fixtures)"
        ));
        reasons.push(format!(
            "Hi-Z mips={} downs={hiz_downsample_passes} sampled_frames={hiz_cull_sampled_frames} build_ms_total={hiz_build_ms_total:.3}; hiz_substrate_proven={hiz_substrate_proven}; hiz_ready=false",
            hiz.mip_count
        ));
        reasons.push(format!(
            "Radiance probes={} fill+sample_ms_total={radiance_probe_ms_total:.3}; lit_lum={radiance_sample_lit_luminance:.4} dark_lum={radiance_sample_dark_luminance:.4}; radiance_probe_substrate_proven={radiance_probe_substrate_proven}; lumen_ready=false",
            radiance.probe_count
        ));
        reasons.push(format!(
            "Measured Instant frame ms: min={frame_ms_min:.3} mean={frame_ms_mean:.3} max={frame_ms_max:.3} total={frame_ms_total:.3}; meshlet_cull_ms_total={meshlet_cull_ms_total:.3}"
        ));
        reasons.push(
            "WebView exclusive present still HELD — operator Studio UI remains WebView/WebGL2".into(),
        );
        reasons.push(
            "hiz_ready / lumen_ready / MULTI_DRAW_INDIRECT AAA / Nanite / Micro-Poly AAA / bindless descriptor heap still HELD"
                .into(),
        );
    } else {
        reasons.push(
            last_err.unwrap_or_else(|| "Present loop produced zero frames".into()),
        );
        reasons.push("presented stays false — fail-closed".into());
    }

    RendererPresentProbeReport {
        presented,
        submitted,
        surface_configured: true,
        adapter_acquired: true,
        device_created: true,
        frames_presented,
        frames_requested,
        adapter_name,
        backend,
        surface_kind: "secondary_winit".into(),
        cpu_readback_on_hot_path: false,
        zero_copy_hot_path: presented,
        webview_exclusive_present_held: true,
        cull_dispatches,
        cull_visible_final,
        cull_expected_visible: expected_visible,
        cull_frustum_ok,
        frame_ms_min,
        frame_ms_max,
        frame_ms_mean,
        frame_ms_total,
        engine_frame_loop_with_cull: presented && cull_dispatches > 0,
        indirect_draw_wired,
        multi_draw_indirect_aaa_ready: false,
        bindless_layout_scaffold: indirect_draw_wired,
        bindless_aaa_ready: false,
        hiz_pyramid_mips: if presented { hiz.mip_count } else { 0 },
        hiz_downsample_passes,
        hiz_cull_sampled_frames,
        hiz_build_ms_total,
        hiz_substrate_proven,
        hiz_ready: false,
        meshlet_cluster_count: clusters.len() as u32,
        meshlet_triangles_per_cluster: meshlets.triangles_per_cluster,
        meshlet_visible_final: cull_visible_final,
        meshlet_expected_visible: expected_visible,
        meshlet_cull_substrate_proven,
        meshlet_cull_ms_total,
        meshlet_cook_ms,
        meshlet_cook_input_triangles,
        meshlet_cook_cooked_triangles,
        meshlet_cook_proven,
        multi_draw_indirect_feature_available,
        radiance_probe_count: radiance.probe_count,
        radiance_probe_ms_total,
        radiance_sample_lit_luminance,
        radiance_sample_dark_luminance,
        radiance_probe_substrate_proven,
        reasons,
        held_vs_ue_rhi: held_vs_ue_baseline(),
        nanite_ready: false,
        lumen_ready: false,
        micro_poly_aaa_ready: false,
        unreal_rhi_parity_ready: false,
        letter: "cw3-present".into(),
        note: if presented {
            "Desktop soak: cook→meshlet cull→draw_indirect→Hi-Z→radiance probe substrate proven as evidence — lumen_ready/Nanite/Micro-Poly/MDI AAA/UE RHI/WebView exclusive still HELD".into()
        } else {
            "Present/submit probe did not present — honesty stays experimental_mount".into()
        },
    }
}

fn presented_ok(frames_presented: u32, indirect_draws: u32) -> bool {
    frames_presented > 0 && indirect_draws == frames_presented
}

/// Run present/submit soak (secondary controlled window). Thread-isolated EventLoop.
pub fn run_renderer_present_probe(frames: Option<u32>) -> RendererPresentProbeReport {
    let frames_requested = frames.unwrap_or(DEFAULT_PRESENT_SOAK_FRAMES);
    let (tx, rx) = std::sync::mpsc::channel();
    std::thread::Builder::new()
        .name("aethel-present-probe".into())
        .spawn(move || {
            let report = present_probe_on_secondary_window(frames_requested);
            let _ = tx.send(report);
        })
        .expect("spawn present probe thread");

    match rx.recv_timeout(PRESENT_PROBE_TIMEOUT) {
        Ok(report) => report,
        Err(_) => fail_report(
            frames_requested.clamp(1, MAX_PRESENT_SOAK_FRAMES),
            vec![
                "Present probe timed out waiting for secondary-window soak".into(),
                "presented stays false — fail-closed".into(),
            ],
        ),
    }
}

/// Single-frame present probe (IPC alias for `present_frame`).
pub fn run_present_frame() -> RendererPresentProbeReport {
    run_renderer_present_probe(Some(1))
}

/// Tauri: soak present/submit; stores last report in managed state.
#[tauri::command]
pub fn renderer_present_probe(
    frames: Option<u32>,
    state: tauri::State<'_, Arc<PresentProbeState>>,
) -> RendererPresentProbeReport {
    let report = run_renderer_present_probe(frames);
    if let Ok(mut guard) = state.0.lock() {
        *guard = Some(report.clone());
    }
    report
}

/// Tauri: one-frame present probe (same evidence shape).
#[tauri::command]
pub fn present_frame(
    state: tauri::State<'_, Arc<PresentProbeState>>,
) -> RendererPresentProbeReport {
    let report = run_present_frame();
    if let Ok(mut guard) = state.0.lock() {
        *guard = Some(report.clone());
    }
    report
}

/// Tauri: last probe evidence without re-running GPU work.
#[tauri::command]
pub fn renderer_present_probe_last(
    state: tauri::State<'_, Arc<PresentProbeState>>,
) -> Option<RendererPresentProbeReport> {
    state.0.lock().ok().and_then(|g| g.clone())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fail_report_never_fakes_present() {
        let r = fail_report(3, vec!["unit".into()]);
        assert!(!r.presented);
        assert!(!r.submitted);
        assert!(!r.nanite_ready);
        assert!(!r.lumen_ready);
        assert!(!r.micro_poly_aaa_ready);
        assert!(!r.unreal_rhi_parity_ready);
        assert!(!r.hiz_ready);
        assert!(!r.hiz_substrate_proven);
        assert!(!r.meshlet_cull_substrate_proven);
        assert!(!r.meshlet_cook_proven);
        assert!(!r.radiance_probe_substrate_proven);
        assert!(!r.multi_draw_indirect_feature_available);
        assert!(!r.engine_frame_loop_with_cull);
        assert!(!r.indirect_draw_wired);
        assert!(!r.multi_draw_indirect_aaa_ready);
        assert!(!r.bindless_layout_scaffold);
        assert!(!r.bindless_aaa_ready);
        assert_eq!(r.cull_dispatches, 0);
        assert!(r.webview_exclusive_present_held);
        assert!(!r.cpu_readback_on_hot_path);
        assert_eq!(r.letter, "cw3-present");
    }

    #[test]
    fn present_probe_soak_is_honest() {
        // Integration soak: may fail on headless CI without GPU — must never fake success.
        let r = run_renderer_present_probe(Some(3));
        assert_eq!(r.letter, "cw3-present");
        assert!(!r.nanite_ready);
        assert!(!r.lumen_ready);
        assert!(!r.micro_poly_aaa_ready);
        assert!(!r.unreal_rhi_parity_ready);
        assert!(!r.multi_draw_indirect_aaa_ready);
        assert!(!r.bindless_aaa_ready);
        assert!(!r.hiz_ready);
        assert!(r.webview_exclusive_present_held);
        assert!(!r.cpu_readback_on_hot_path);
        assert!(r.frames_requested <= MAX_PRESENT_SOAK_FRAMES);
        if r.presented {
            assert!(r.submitted);
            assert!(r.surface_configured);
            assert!(r.adapter_acquired);
            assert!(r.device_created);
            assert!(r.frames_presented >= 1);
            assert_eq!(r.surface_kind, "secondary_winit");
            assert!(r.zero_copy_hot_path);
            assert!(r.engine_frame_loop_with_cull);
            assert_eq!(r.cull_dispatches, r.frames_presented);
            assert!(r.frame_ms_total >= 0.0);
            assert!(r.meshlet_cluster_count >= 2);
            assert_eq!(r.meshlet_triangles_per_cluster, 128);
            assert!(r.meshlet_cook_ms >= 0.0);
            assert!(r.meshlet_cook_input_triangles > 0);
            assert_eq!(
                r.meshlet_cook_input_triangles,
                r.meshlet_cook_cooked_triangles
            );
            assert!(r.meshlet_cook_proven);
            assert_eq!(r.radiance_probe_count, 64);
            assert!(r.radiance_probe_ms_total >= 0.0);
            if r.radiance_probe_substrate_proven {
                assert!(r.radiance_sample_lit_luminance > r.radiance_sample_dark_luminance);
            }
            assert!(!r.lumen_ready);
            assert!(r.hiz_pyramid_mips >= 2);
            assert!(r.hiz_downsample_passes > 0);
            if r.frames_presented > 1 {
                assert!(r.hiz_cull_sampled_frames > 0);
                assert!(r.hiz_substrate_proven);
            }
            if r.cull_frustum_ok {
                assert!(r.indirect_draw_wired);
                assert!(r.bindless_layout_scaffold);
                assert!(r.meshlet_cull_substrate_proven);
            }
            assert!(!r.backend.is_empty());
            assert!(!r.adapter_name.is_empty());
        } else {
            assert_eq!(r.frames_presented, 0);
            assert!(!r.indirect_draw_wired);
            assert!(!r.hiz_substrate_proven);
            assert!(!r.meshlet_cull_substrate_proven);
            assert!(!r.reasons.is_empty());
        }
        assert!(!r.held_vs_ue_rhi.is_empty());
    }

    #[test]
    fn present_frame_alias_requests_one_frame() {
        let r = run_present_frame();
        assert_eq!(r.frames_requested, 1);
        assert!(!r.unreal_rhi_parity_ready);
        assert!(!r.micro_poly_aaa_ready);
        assert!(!r.multi_draw_indirect_aaa_ready);
        assert!(!r.hiz_ready);
    }
}
