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
//!   **explicit ScalableRenderGraph-style frame graph** (meshlet cull →
//!   pack → draw_indirect+depth → Hi-Z → radiance → micro-poly → VSM →
//!   FSR → entropy → submit → present) with Instant per-pass metrics bag
//!   and fail-closed if any listed pass drops. Final substrate stats may
//!   be read **after** the loop.
//! - `hiz_ready` / `nanite_ready` / `micro_poly_aaa_ready` /
//!   `multi_draw_indirect_aaa_ready` / `lumen_ready` / `vsm_aaa_ready` /
//!   `fsr_aaa_ready` / `entropy_aaa_ready` / `chaos_aaa_ready` /
//!   `frame_graph_aaa_ready` stay **false** — substrate ≠ AAA Parity.
//! - WebView exclusive present remains **HELD** (Chromium owns HWND) —
//!   see `gpu_frame_graph::WEBVIEW_EXCLUSIVE_PRESENT_HELD_REASON`.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::{WebviewWindow, Wry};
use winit::dpi::PhysicalSize;
use winit::event_loop::EventLoopBuilder;
use winit::window::WindowBuilder;

use crate::gpu_culling::identity_frustum;
use crate::gpu_hiz::DepthPyramidHiz;
use crate::gpu_meshlet_cook::{cook_soak_meshlets, soak_cook_input_mesh};
use crate::gpu_meshlet_cull::MeshletCullScaffold;
use crate::gpu_micropoly_raster::MicropolyRasterScaffold;
use crate::gpu_radiance_probes::{soak_probe_volume_params, RadianceProbeVolume};
use crate::gpu_entropy_destruction::EntropyDestructionScaffold;
use crate::gpu_frame_graph::{
    empty_timings_report, execute_secondary_frame_graph, timings_from_soak,
    FrameGraphFrameMetrics, FrameGraphPassTiming, FrameGraphTimingsReport,
    SECONDARY_FRAME_GRAPH_PASS_ORDER, WEBVIEW_EXCLUSIVE_PRESENT_HELD_REASON,
};
use crate::gpu_fsr::FsrTemporalUpsample;
use crate::gpu_soak_scale::{select_soak_scale_budget, SoakFidelityTier, SoakScaleBudget};
use crate::gpu_vsm::VsmShadowAtlas;
use crate::gpu_culling::GpuCullingPipeline;

/// Default soak frames for present probe (bounded — not a product game loop).
const DEFAULT_PRESENT_SOAK_FRAMES: u32 = 3;
const MAX_PRESENT_SOAK_FRAMES: u32 = 8;
/// Higher-res CapScore soaks need headroom beyond the old 128² toy path.
const PRESENT_PROBE_TIMEOUT: Duration = Duration::from_secs(90);

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
    /// CapScore proxy used to gate soak resolution (desktop adapter — not web CapScore).
    pub soak_capability_score: u32,
    /// `low` | `mid` | `high` fidelity tier selected for this soak.
    pub soak_fidelity_tier: String,
    pub soak_present_width: u32,
    pub soak_present_height: u32,
    pub soak_estimated_vram_bytes: u64,
    pub soak_vram_budget_bytes: u64,
    pub soak_max_texture_dimension_2d: u32,
    pub soak_max_buffer_size: u64,
    /// True when CapScore ladder refused all tiers (fail-closed OOM).
    pub soak_oom_refused: bool,
    pub soak_scale_note: String,
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
    /// Cooked triangles fed to the software micro-poly soft-raster.
    pub micro_poly_triangle_count: u32,
    /// Soft-raster Instant ms (sum over frames).
    pub micro_poly_ms_total: f64,
    /// Post-loop soft-raster stats (visible tris / fragments).
    pub micro_poly_triangles_visible: u32,
    pub micro_poly_fragments_written: u32,
    /// True when soft-raster consumed cull visibility and wrote fragments.
    pub micro_poly_substrate_proven: bool,
    /// Virtual page count in the VSM substrate page table.
    pub vsm_virtual_pages: u32,
    /// Physical depth-atlas page pool capacity.
    pub vsm_physical_pool: u32,
    /// Cascade count tagged in this substrate (not UE clipmap product).
    pub vsm_cascade_count: u32,
    /// Instant ms spent in VSM clear+alloc+depth write (sum over frames).
    pub vsm_ms_total: f64,
    /// Post-loop pages that received at least one depth write.
    pub vsm_pages_allocated: u32,
    pub vsm_pages_depth_written: u32,
    pub vsm_texels_written: u32,
    /// True when allocated pages actually wrote depth into the atlas.
    pub vsm_substrate_proven: bool,
    /// Always false — UE5 VSM / 16k virtual maps not claimed.
    pub vsm_aaa_ready: bool,
    /// Low-res input edge for FSR temporal upsample substrate.
    pub fsr_input_edge: u32,
    /// High-res output edge after upsample.
    pub fsr_output_edge: u32,
    /// Integer upsample scale (Law XV internal-scale inverse).
    pub fsr_scale: u32,
    /// Instant ms spent in FSR fill+upsample (sum over frames).
    pub fsr_ms_total: f64,
    /// Post-loop FSR stats.
    pub fsr_output_texels_written: u32,
    pub fsr_history_samples_blended: u32,
    pub fsr_reactive_mask_texels: u32,
    /// True when history blend + upsample wrote real HR texels.
    pub fsr_substrate_proven: bool,
    /// Always false — AMD FSR3 / FidelityFX AAA not claimed.
    pub fsr_aaa_ready: bool,
    /// Fracture chunk count in the Entropy substrate buffer.
    pub entropy_chunk_count: u32,
    /// Instant ms spent in Entropy fracture+integrate (sum over frames).
    pub entropy_ms_total: f64,
    /// Post-loop Entropy stats.
    pub entropy_chunks_updated: u32,
    pub entropy_chunks_fractured: u32,
    pub entropy_debris_alive: u32,
    /// True when chunks actually simulated/updated on GPU.
    pub entropy_substrate_proven: bool,
    /// Always false — Niagara/Chaos Entropy AAA not claimed.
    pub entropy_aaa_ready: bool,
    /// Always false — Unreal Chaos destruction AAA not claimed.
    pub chaos_aaa_ready: bool,
    /// True when secondary ScalableRenderGraph-style pass list completed.
    pub frame_graph_executed: bool,
    /// Expected pass count from [`SECONDARY_FRAME_GRAPH_PASS_ORDER`].
    pub frame_graph_pass_count: u32,
    /// Instant ms sum for the last completed frame graph execute.
    pub frame_graph_ms_total: f64,
    /// Last-frame Instant per-pass timings (no fabricated FPS).
    pub frame_graph_pass_timings: Vec<FrameGraphPassTiming>,
    /// Soak-sum Instant per-pass timings across presented frames.
    pub frame_graph_soak_pass_ms_totals: Vec<FrameGraphPassTiming>,
    /// True when all listed passes completed on ≥1 presented frame.
    pub frame_graph_substrate_proven: bool,
    /// Always false — secondary graph ≠ product UE RHI / full SRG.
    pub frame_graph_aaa_ready: bool,
    /// Always false — product ScalableRenderGraph wire HELD (3B.2).
    pub scalable_render_graph_product_ready: bool,
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
        "Probe proves secondary_winit ScalableRenderGraph-style ordered pass list (cull→pack→draw→Hi-Z→radiance→micro-poly→VSM→FSR→entropy→submit→present)".into(),
        WEBVIEW_EXCLUSIVE_PRESENT_HELD_REASON.into(),
        "MULTI_DRAW_INDIRECT feature may be available but multi_draw_indirect_aaa_ready stays false".into(),
        "hiz_ready / nanite_ready / micro_poly_aaa_ready / lumen_ready / vsm_aaa_ready / fsr_aaa_ready / entropy_aaa_ready / chaos_aaa_ready / frame_graph_aaa_ready stay false — substrate ≠ AAA Parity".into(),
        "True Lumen / Nanite / Micro-Poly AAA / VSM AAA / FSR3 AAA / Chaos Entropy AAA / product SRG / MULTI_DRAW batch still HELD".into(),
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
        soak_capability_score: 0,
        soak_fidelity_tier: String::new(),
        soak_present_width: 0,
        soak_present_height: 0,
        soak_estimated_vram_bytes: 0,
        soak_vram_budget_bytes: 0,
        soak_max_texture_dimension_2d: 0,
        soak_max_buffer_size: 0,
        soak_oom_refused: false,
        soak_scale_note: String::new(),
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
        micro_poly_triangle_count: 0,
        micro_poly_ms_total: 0.0,
        micro_poly_triangles_visible: 0,
        micro_poly_fragments_written: 0,
        micro_poly_substrate_proven: false,
        vsm_virtual_pages: 0,
        vsm_physical_pool: 0,
        vsm_cascade_count: 0,
        vsm_ms_total: 0.0,
        vsm_pages_allocated: 0,
        vsm_pages_depth_written: 0,
        vsm_texels_written: 0,
        vsm_substrate_proven: false,
        vsm_aaa_ready: false,
        fsr_input_edge: 0,
        fsr_output_edge: 0,
        fsr_scale: 0,
        fsr_ms_total: 0.0,
        fsr_output_texels_written: 0,
        fsr_history_samples_blended: 0,
        fsr_reactive_mask_texels: 0,
        fsr_substrate_proven: false,
        fsr_aaa_ready: false,
        entropy_chunk_count: 0,
        entropy_ms_total: 0.0,
        entropy_chunks_updated: 0,
        entropy_chunks_fractured: 0,
        entropy_debris_alive: 0,
        entropy_substrate_proven: false,
        entropy_aaa_ready: false,
        chaos_aaa_ready: false,
        frame_graph_executed: false,
        frame_graph_pass_count: 0,
        frame_graph_ms_total: 0.0,
        frame_graph_pass_timings: Vec::new(),
        frame_graph_soak_pass_ms_totals: Vec::new(),
        frame_graph_substrate_proven: false,
        frame_graph_aaa_ready: false,
        scalable_render_graph_product_ready: false,
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
    graph: FrameGraphFrameMetrics,
}

/// Secondary ScalableRenderGraph-style execute (ordered Instant pass bag).
#[allow(clippy::too_many_arguments)]
fn present_one_engine_frame(
    device: &wgpu::Device,
    queue: &wgpu::Queue,
    surface: &wgpu::Surface<'_>,
    meshlets: &MeshletCullScaffold,
    micropoly: &MicropolyRasterScaffold,
    vsm: &mut VsmShadowAtlas,
    fsr: &mut FsrTemporalUpsample,
    entropy: &mut EntropyDestructionScaffold,
    hiz: &DepthPyramidHiz,
    radiance: &RadianceProbeVolume,
    occlusion_enabled: bool,
) -> Result<EngineFrameOutcome, String> {
    let outcome = execute_secondary_frame_graph(
        device,
        queue,
        surface,
        meshlets,
        micropoly,
        vsm,
        fsr,
        entropy,
        hiz,
        radiance,
        occlusion_enabled,
    )?;
    Ok(EngineFrameOutcome {
        graph: outcome.metrics,
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

fn tier_label(tier: SoakFidelityTier) -> &'static str {
    match tier {
        SoakFidelityTier::Low => "low",
        SoakFidelityTier::Mid => "mid",
        SoakFidelityTier::High => "high",
    }
}

fn stamp_soak_budget(report: &mut RendererPresentProbeReport, budget: &SoakScaleBudget) {
    report.soak_capability_score = budget.capability_score;
    report.soak_fidelity_tier = tier_label(budget.tier).into();
    report.soak_present_width = budget.present_width;
    report.soak_present_height = budget.present_height;
    report.soak_estimated_vram_bytes = budget.estimated_vram_bytes;
    report.soak_vram_budget_bytes = budget.vram_budget_bytes;
    report.soak_max_texture_dimension_2d = budget.max_texture_dimension_2d;
    report.soak_max_buffer_size = budget.max_buffer_size;
    report.soak_oom_refused = budget.oom_refused;
    report.soak_scale_note = budget.note.clone();
}

/// Blocking present soak on a dedicated thread (owns its own winit EventLoop).
fn present_probe_on_secondary_window(frames_requested: u32) -> RendererPresentProbeReport {
    present_probe_on_secondary_window_ex(
        frames_requested,
        SecondaryPresentOptions {
            visible: false,
            title: "Aethel Present Probe",
            persistent: None,
        },
    )
}

struct SecondaryPresentOptions {
    visible: bool,
    title: &'static str,
    /// When set, loop until stop or max_frames (TICKET-PP-03 persistent).
    persistent: Option<PersistentPresentHooks>,
}

/// Hooks for every-frame persistent present (engine-owned surface).
pub struct PersistentPresentHooks {
    pub stop: Arc<AtomicBool>,
    pub live: Arc<Mutex<crate::engine_owned_present_loop::PersistentPresentLiveMetrics>>,
    pub max_frames: u32,
    pub prove_frames: u32,
}

/// Engine-owned persistent present — CapScore-gated; does not flip product_present_ready.
pub fn run_engine_owned_persistent_present(
    hooks: PersistentPresentHooks,
) -> RendererPresentProbeReport {
    let frames_cap = hooks.max_frames.clamp(1, hooks.max_frames.max(1));
    present_probe_on_secondary_window_ex(
        frames_cap,
        SecondaryPresentOptions {
            visible: true,
            title: "Aethel Engine — Persistent Present (PP-03; not WebView exclusive)",
            persistent: Some(hooks),
        },
    )
}

/// Engine-owned OS window present (visible) — still not WebView exclusive / product viewport.
pub fn run_engine_owned_os_window_present_probe(frames: Option<u32>) -> RendererPresentProbeReport {
    let frames_requested = frames.unwrap_or(DEFAULT_PRESENT_SOAK_FRAMES);
    let (tx, rx) = std::sync::mpsc::channel();
    std::thread::Builder::new()
        .name("aethel-engine-owned-present".into())
        .spawn(move || {
            let report = present_probe_on_secondary_window_ex(
                frames_requested.clamp(1, MAX_PRESENT_SOAK_FRAMES),
                SecondaryPresentOptions {
                    visible: true,
                    title: "Aethel Engine — Engine-Owned Present (not WebView exclusive)",
                    persistent: None,
                },
            );
            let _ = tx.send(report);
        })
        .expect("spawn engine-owned present thread");

    match rx.recv_timeout(PRESENT_PROBE_TIMEOUT) {
        Ok(report) => report,
        Err(_) => fail_report(
            frames_requested.clamp(1, MAX_PRESENT_SOAK_FRAMES),
            vec![
                "Engine-owned present probe timed out".into(),
                "presented stays false — fail-closed".into(),
            ],
        ),
    }
}

fn present_probe_on_secondary_window_ex(
    frames_requested: u32,
    opts: SecondaryPresentOptions,
) -> RendererPresentProbeReport {
    let is_persistent = opts.persistent.is_some();
    let frames_requested = if is_persistent {
        frames_requested.clamp(1, 8_000)
    } else {
        frames_requested.clamp(1, MAX_PRESENT_SOAK_FRAMES)
    };

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

    let instance = wgpu::Instance::new(wgpu::InstanceDescriptor {
        backends: wgpu::Backends::PRIMARY,
        ..Default::default()
    });

    let adapter_for_budget =
        match pollster::block_on(instance.request_adapter(&wgpu::RequestAdapterOptions {
            power_preference: wgpu::PowerPreference::HighPerformance,
            compatible_surface: None,
            force_fallback_adapter: false,
        })) {
            Some(a) => a,
            None => {
                return fail_report(
                    frames_requested,
                    vec!["No wgpu adapter for CapScore soak scale selection".into()],
                );
            }
        };

    let budget = select_soak_scale_budget(&adapter_for_budget);
    if let Some(hooks) = opts.persistent.as_ref() {
        if let Ok(mut live) = hooks.live.lock() {
            live.present_width = budget.present_width;
            live.present_height = budget.present_height;
            live.capability_score = budget.capability_score;
            live.fidelity_tier = tier_label(budget.tier).into();
            live.oom_refused = budget.oom_refused;
            live.frames_cap = hooks.max_frames;
            live.adapter_name = adapter_for_budget.get_info().name;
            live.backend = format!("{:?}", adapter_for_budget.get_info().backend);
            live.product_present_ready = false;
            live.webview_exclusive_present_ready = false;
            live.note = budget.note.clone();
        }
    }
    if budget.oom_refused {
        let mut r = fail_report(
            frames_requested,
            vec![
                budget.note.clone(),
                "Soak resolution OOM fail-closed — presented stays false".into(),
            ],
        );
        stamp_soak_budget(&mut r, &budget);
        r.adapter_acquired = true;
        let info = adapter_for_budget.get_info();
        r.adapter_name = info.name;
        r.backend = format!("{:?}", info.backend);
        return r;
    }

    let window = match WindowBuilder::new()
        .with_title(opts.title)
        .with_inner_size(PhysicalSize::new(
            budget.present_width,
            budget.present_height,
        ))
        .with_visible(opts.visible)
        .build(&event_loop)
    {
        Ok(w) => w,
        Err(e) => {
            let mut r = fail_report(
                frames_requested,
                vec![
                    format!("secondary winit window create failed: {e}"),
                    "Present soak HELD — no controlled surface".into(),
                ],
            );
            stamp_soak_budget(&mut r, &budget);
            return r;
        }
    };

    let surface = match instance.create_surface(&window) {
        Ok(s) => s,
        Err(e) => {
            let mut r = fail_report(
                frames_requested,
                vec![
                    format!("create_surface on secondary winit failed: {e}"),
                    "Present soak HELD — surface create failed".into(),
                ],
            );
            stamp_soak_budget(&mut r, &budget);
            return r;
        }
    };

    let adapter = match pollster::block_on(instance.request_adapter(&wgpu::RequestAdapterOptions {
        power_preference: wgpu::PowerPreference::HighPerformance,
        compatible_surface: Some(&surface),
        force_fallback_adapter: false,
    })) {
        Some(a) => a,
        None => adapter_for_budget,
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
            stamp_soak_budget(&mut r, &budget);
            r.adapter_acquired = true;
            r.adapter_name = adapter_name;
            r.backend = backend;
            r.surface_kind = "secondary_winit".into();
            r.multi_draw_indirect_feature_available = multi_draw_indirect_feature_available;
            return r;
        }
    };

    let present_w = budget.present_width;
    let present_h = budget.present_height;

    let surface_format = match configure_surface(&device, &adapter, &surface, present_w, present_h)
    {
        Ok(f) => f,
        Err(e) => {
            let mut r = fail_report(frames_requested, vec![e]);
            stamp_soak_budget(&mut r, &budget);
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

    let hiz = match DepthPyramidHiz::new(&device, present_w.max(2), present_h.max(2)) {
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

    let soft_tris = match cook_receipt.soft_triangles(&soak_cook_input_mesh().positions) {
        Ok(t) => t,
        Err(e) => {
            let mut r = fail_report(
                frames_requested,
                vec![format!("soft_triangles build failed: {e}")],
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

    let micropoly = match MicropolyRasterScaffold::new_with_extent(
        &device,
        &soft_tris,
        &meshlets,
        budget.micro_poly_width,
        budget.micro_poly_height,
    ) {
        Ok(m) => m,
        Err(e) => {
            let mut r = fail_report(
                frames_requested,
                vec![format!("MicropolyRasterScaffold init failed: {e}")],
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

    let mut vsm = match VsmShadowAtlas::new(&device) {
        Ok(v) => v,
        Err(e) => {
            let mut r = fail_report(
                frames_requested,
                vec![format!("VsmShadowAtlas init failed: {e}")],
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

    let mut fsr = match FsrTemporalUpsample::new_with_edges(
        &device,
        budget.fsr_input_edge,
        budget.fsr_scale,
    ) {
        Ok(f) => f,
        Err(e) => {
            let mut r = fail_report(
                frames_requested,
                vec![format!("FsrTemporalUpsample init failed: {e}")],
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

    let mut entropy = match EntropyDestructionScaffold::new(&device) {
        Ok(e) => e,
        Err(e) => {
            let mut r = fail_report(
                frames_requested,
                vec![format!("EntropyDestructionScaffold init failed: {e}")],
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
    let mut micro_poly_ms_total = 0.0_f64;
    let mut vsm_ms_total = 0.0_f64;
    let mut fsr_ms_total = 0.0_f64;
    let mut entropy_ms_total = 0.0_f64;
    let mut frame_graph_ms_total_last = 0.0_f64;
    let mut last_graph_metrics = FrameGraphFrameMetrics::default();
    let mut soak_pass_ms: Vec<f64> = vec![0.0; SECONDARY_FRAME_GRAPH_PASS_ORDER.len()];
    let mut submitted = false;
    let mut last_err: Option<String> = None;
    let mut frame_ms: Vec<f64> = Vec::with_capacity(frames_requested.min(512) as usize);
    let prove_frames = opts
        .persistent
        .as_ref()
        .map(|h| h.prove_frames)
        .unwrap_or(0);
    for frame_i in 0..frames_requested {
        if let Some(hooks) = opts.persistent.as_ref() {
            if hooks.stop.load(Ordering::SeqCst) {
                break;
            }
        }
        // Frame 0 builds pyramid with occlusion off; frame ≥1 samples prior Hi-Z.
        let occlusion_enabled = frame_i > 0;
        let t0 = std::time::Instant::now();
        match present_one_engine_frame(
            &device,
            &queue,
            &surface,
            &meshlets,
            &micropoly,
            &mut vsm,
            &mut fsr,
            &mut entropy,
            &hiz,
            &radiance,
            occlusion_enabled,
        ) {
            Ok(outcome) => {
                submitted = true;
                frames_presented = frames_presented.saturating_add(1);
                cull_dispatches = cull_dispatches.saturating_add(1);
                indirect_draws = indirect_draws.saturating_add(1);
                let g = &outcome.graph;
                hiz_downsample_passes =
                    hiz_downsample_passes.saturating_add(g.hiz_downs);
                hiz_build_ms_total += g.pass_ms("hiz");
                meshlet_cull_ms_total += g.pass_ms("meshlet_cull") + g.pass_ms("meshlet_pack");
                radiance_probe_ms_total += g.pass_ms("radiance");
                micro_poly_ms_total += g.pass_ms("micro_poly");
                vsm_ms_total += g.pass_ms("vsm");
                fsr_ms_total += g.pass_ms("fsr");
                entropy_ms_total += g.pass_ms("entropy");
                frame_graph_ms_total_last = g.frame_ms_total;
                for p in &g.passes {
                    let idx = p.order_index as usize;
                    if idx < soak_pass_ms.len() {
                        soak_pass_ms[idx] += p.ms;
                    }
                }
                last_graph_metrics = g.clone();
                if occlusion_enabled {
                    hiz_cull_sampled_frames = hiz_cull_sampled_frames.saturating_add(1);
                }
                let frame_elapsed_ms = t0.elapsed().as_secs_f64() * 1000.0;
                frame_ms.push(frame_elapsed_ms);
                if let Some(hooks) = opts.persistent.as_ref() {
                    if let Ok(mut live) = hooks.live.lock() {
                        live.running = true;
                        live.frames_presented = frames_presented;
                        live.last_frame_ms = frame_elapsed_ms;
                        live.frame_ms_total += frame_elapsed_ms;
                        live.frame_ms_min = if frames_presented == 1 {
                            frame_elapsed_ms
                        } else {
                            live.frame_ms_min.min(frame_elapsed_ms)
                        };
                        live.frame_ms_max = live.frame_ms_max.max(frame_elapsed_ms);
                        live.frame_ms_mean =
                            live.frame_ms_total / f64::from(frames_presented.max(1));
                        live.frame_graph_ms_last = g.frame_ms_total;
                        live.frame_graph_pass_timings = g.passes.clone();
                        live.present_width = budget.present_width;
                        live.present_height = budget.present_height;
                        live.capability_score = budget.capability_score;
                        live.fidelity_tier = tier_label(budget.tier).into();
                        live.persistent_loop_proven =
                            frames_presented >= prove_frames && g.all_passes_completed;
                        live.product_present_ready = false;
                        live.webview_exclusive_present_ready = false;
                        live.note = format!(
                            "Persistent present frame {frames_presented}/{} — CapScore {} {}x{}; product_present_ready=false",
                            hooks.max_frames,
                            budget.capability_score,
                            budget.present_width,
                            budget.present_height
                        );
                    }
                }
            }
            Err(e) => {
                last_err = Some(e.clone());
                if let Some(hooks) = opts.persistent.as_ref() {
                    if let Ok(mut live) = hooks.live.lock() {
                        live.last_error = e;
                        live.running = false;
                    }
                }
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
    let micro_stats = if frames_presented > 0 {
        micropoly.readback_stats(&device, &queue)
    } else {
        crate::gpu_micropoly_raster::MicropolyRasterStats {
            triangles_considered: 0,
            triangles_visible: 0,
            fragments_written: 0,
            depth_tests_passed: 0,
        }
    };
    let vsm_stats = if frames_presented > 0 {
        vsm.readback_stats(&device, &queue)
    } else {
        crate::gpu_vsm::VsmStats {
            pages_allocated: 0,
            pages_depth_written: 0,
            texels_written: 0,
            cascades_tagged: 0,
        }
    };
    let fsr_stats = if frames_presented > 0 {
        fsr.readback_stats(&device, &queue)
    } else {
        crate::gpu_fsr::FsrStats {
            input_texels_filled: 0,
            output_texels_written: 0,
            history_samples_blended: 0,
            reactive_mask_texels: 0,
        }
    };
    let entropy_stats = if frames_presented > 0 {
        entropy.readback_stats(&device, &queue)
    } else {
        crate::gpu_entropy_destruction::EntropyStats {
            chunks_active: 0,
            chunks_updated: 0,
            chunks_fractured: 0,
            debris_alive: 0,
        }
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
    let micro_poly_substrate_proven = frames_presented > 0
        && micropoly.triangle_count > 0
        && micro_stats.triangles_considered == micropoly.triangle_count
        && micro_stats.triangles_visible > 0
        && micro_stats.fragments_written > 0
        && cull_visible_final > 0;
    let vsm_substrate_proven = frames_presented > 0
        && vsm.virtual_pages > 0
        && vsm.physical_pool > 0
        && vsm.cascade_count >= 2
        && vsm_stats.pages_allocated > 0
        && vsm_stats.pages_depth_written > 0
        && vsm_stats.texels_written > 0;
    let expected_fsr_output = fsr.output_edge.saturating_mul(fsr.output_edge);
    let fsr_substrate_proven = frames_presented > 0
        && fsr.scale >= 2
        && fsr.input_edge > 0
        && fsr.output_edge == fsr.input_edge.saturating_mul(fsr.scale)
        && fsr_stats.input_texels_filled > 0
        && fsr_stats.output_texels_written == expected_fsr_output
        && fsr_stats.history_samples_blended > 0
        && fsr_stats.reactive_mask_texels > 0;
    let entropy_substrate_proven = frames_presented > 0
        && entropy.chunk_count > 0
        && entropy_stats.chunks_active == entropy.chunk_count
        && entropy_stats.chunks_updated > 0
        && (entropy_stats.chunks_fractured > 0 || entropy_stats.debris_alive > 0);
    let frame_graph_executed = frames_presented > 0 && last_graph_metrics.all_passes_completed;
    let frame_graph_substrate_proven = frame_graph_executed
        && last_graph_metrics.passes_completed == last_graph_metrics.passes_expected
        && last_graph_metrics.passes_expected
            == SECONDARY_FRAME_GRAPH_PASS_ORDER.len() as u32;
    let soak_pass_totals: Vec<FrameGraphPassTiming> = SECONDARY_FRAME_GRAPH_PASS_ORDER
        .iter()
        .enumerate()
        .map(|(i, id)| FrameGraphPassTiming {
            pass_id: (*id).into(),
            order_index: i as u32,
            ms: soak_pass_ms.get(i).copied().unwrap_or(0.0),
            completed: frames_presented > 0,
        })
        .collect();

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
            "Presented {frames_presented}/{frames_requested} frame(s) on secondary_winit via ScalableRenderGraph-style frame graph (no CPU readback on hot path)"
        ));
        reasons.push(format!(
            "Frame graph passes_expected={} completed={} last_frame_ms={frame_graph_ms_total_last:.3}; frame_graph_substrate_proven={frame_graph_substrate_proven}; frame_graph_aaa_ready=false; scalable_render_graph_product_ready=false",
            last_graph_metrics.passes_expected, last_graph_metrics.passes_completed
        ));
        reasons.push(WEBVIEW_EXCLUSIVE_PRESENT_HELD_REASON.into());
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
            "Micro-poly soft-raster tris={} considered={} visible={} fragments={} ms_total={micro_poly_ms_total:.3}; micro_poly_substrate_proven={micro_poly_substrate_proven}; micro_poly_aaa_ready=false",
            micropoly.triangle_count,
            micro_stats.triangles_considered,
            micro_stats.triangles_visible,
            micro_stats.fragments_written
        ));
        reasons.push(format!(
            "VSM virtual_pages={} physical_pool={} cascades={} pages_alloc={} pages_depth={} texels={} ms_total={vsm_ms_total:.3}; vsm_substrate_proven={vsm_substrate_proven}; vsm_aaa_ready=false",
            vsm.virtual_pages,
            vsm.physical_pool,
            vsm.cascade_count,
            vsm_stats.pages_allocated,
            vsm_stats.pages_depth_written,
            vsm_stats.texels_written
        ));
        reasons.push(format!(
            "FSR Law XV temporal upsample {}→{} (scale={}) output_texels={} history_blend={} reactive={} ms_total={fsr_ms_total:.3}; fsr_substrate_proven={fsr_substrate_proven}; fsr_aaa_ready=false",
            fsr.input_edge,
            fsr.output_edge,
            fsr.scale,
            fsr_stats.output_texels_written,
            fsr_stats.history_samples_blended,
            fsr_stats.reactive_mask_texels
        ));
        reasons.push(format!(
            "Entropy destruction chunks={} active={} updated={} fractured={} debris={} ms_total={entropy_ms_total:.3}; entropy_substrate_proven={entropy_substrate_proven}; entropy_aaa_ready=false; chaos_aaa_ready=false",
            entropy.chunk_count,
            entropy_stats.chunks_active,
            entropy_stats.chunks_updated,
            entropy_stats.chunks_fractured,
            entropy_stats.debris_alive
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
            "CapScore soak scale: score={} tier={} present={}x{} est_vram={} budget={} max_tex={} — {}",
            budget.capability_score,
            tier_label(budget.tier),
            budget.present_width,
            budget.present_height,
            budget.estimated_vram_bytes,
            budget.vram_budget_bytes,
            budget.max_texture_dimension_2d,
            budget.note
        ));
        reasons.push(format!(
            "Measured Instant frame ms: min={frame_ms_min:.3} mean={frame_ms_mean:.3} max={frame_ms_max:.3} total={frame_ms_total:.3}; meshlet_cull_ms_total={meshlet_cull_ms_total:.3}"
        ));
        reasons.push(
            "WebView exclusive present still HELD — operator Studio UI remains WebView/WebGL2".into(),
        );
        reasons.push(
            "hiz_ready / lumen_ready / micro_poly_aaa_ready / vsm_aaa_ready / fsr_aaa_ready / entropy_aaa_ready / chaos_aaa_ready / frame_graph_aaa_ready / MULTI_DRAW_INDIRECT AAA / Nanite / bindless descriptor heap still HELD"
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
        soak_capability_score: budget.capability_score,
        soak_fidelity_tier: tier_label(budget.tier).into(),
        soak_present_width: budget.present_width,
        soak_present_height: budget.present_height,
        soak_estimated_vram_bytes: budget.estimated_vram_bytes,
        soak_vram_budget_bytes: budget.vram_budget_bytes,
        soak_max_texture_dimension_2d: budget.max_texture_dimension_2d,
        soak_max_buffer_size: budget.max_buffer_size,
        soak_oom_refused: false,
        soak_scale_note: budget.note.clone(),
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
        micro_poly_triangle_count: micropoly.triangle_count,
        micro_poly_ms_total,
        micro_poly_triangles_visible: micro_stats.triangles_visible,
        micro_poly_fragments_written: micro_stats.fragments_written,
        micro_poly_substrate_proven,
        vsm_virtual_pages: vsm.virtual_pages,
        vsm_physical_pool: vsm.physical_pool,
        vsm_cascade_count: vsm.cascade_count,
        vsm_ms_total,
        vsm_pages_allocated: vsm_stats.pages_allocated,
        vsm_pages_depth_written: vsm_stats.pages_depth_written,
        vsm_texels_written: vsm_stats.texels_written,
        vsm_substrate_proven,
        vsm_aaa_ready: false,
        fsr_input_edge: fsr.input_edge,
        fsr_output_edge: fsr.output_edge,
        fsr_scale: fsr.scale,
        fsr_ms_total,
        fsr_output_texels_written: fsr_stats.output_texels_written,
        fsr_history_samples_blended: fsr_stats.history_samples_blended,
        fsr_reactive_mask_texels: fsr_stats.reactive_mask_texels,
        fsr_substrate_proven,
        fsr_aaa_ready: false,
        entropy_chunk_count: entropy.chunk_count,
        entropy_ms_total,
        entropy_chunks_updated: entropy_stats.chunks_updated,
        entropy_chunks_fractured: entropy_stats.chunks_fractured,
        entropy_debris_alive: entropy_stats.debris_alive,
        entropy_substrate_proven,
        entropy_aaa_ready: false,
        chaos_aaa_ready: false,
        frame_graph_executed,
        frame_graph_pass_count: last_graph_metrics.passes_expected,
        frame_graph_ms_total: frame_graph_ms_total_last,
        frame_graph_pass_timings: last_graph_metrics.passes.clone(),
        frame_graph_soak_pass_ms_totals: soak_pass_totals,
        frame_graph_substrate_proven,
        frame_graph_aaa_ready: false,
        scalable_render_graph_product_ready: false,
        reasons,
        held_vs_ue_rhi: held_vs_ue_baseline(),
        nanite_ready: false,
        lumen_ready: false,
        micro_poly_aaa_ready: false,
        unreal_rhi_parity_ready: false,
        letter: "cw3-present".into(),
        note: if presented {
            "Desktop soak: secondary_winit ScalableRenderGraph-style frame graph Instant pass bag proven as evidence — lumen/nanite/micro_poly_aaa/vsm_aaa/fsr_aaa/entropy_aaa/chaos_aaa/frame_graph_aaa/product SRG/MDI AAA/UE RHI/WebView exclusive still HELD; FPS not fabricated".into()
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

/// Tauri: Instant frame-graph pass timings from last present soak (no fabricated FPS).
#[tauri::command]
pub fn renderer_frame_graph_timings_last(
    state: tauri::State<'_, Arc<PresentProbeState>>,
) -> FrameGraphTimingsReport {
    let Some(report) = state.0.lock().ok().and_then(|g| g.clone()) else {
        return empty_timings_report(
            "No present probe stored — invoke renderer_present_probe first (fail-closed)",
        );
    };
    let last = FrameGraphFrameMetrics {
        passes: report.frame_graph_pass_timings.clone(),
        frame_ms_total: report.frame_graph_ms_total,
        passes_expected: report.frame_graph_pass_count,
        passes_completed: report
            .frame_graph_pass_timings
            .iter()
            .filter(|p| p.completed)
            .count() as u32,
        hiz_downs: report.hiz_downsample_passes,
        all_passes_completed: report.frame_graph_substrate_proven,
    };
    timings_from_soak(
        &last,
        &report.frame_graph_soak_pass_ms_totals,
        report.frames_presented,
        report.presented && report.frame_graph_executed,
    )
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
        assert!(!r.micro_poly_substrate_proven);
        assert!(!r.vsm_substrate_proven);
        assert!(!r.vsm_aaa_ready);
        assert!(!r.fsr_substrate_proven);
        assert!(!r.fsr_aaa_ready);
        assert!(!r.entropy_substrate_proven);
        assert!(!r.entropy_aaa_ready);
        assert!(!r.chaos_aaa_ready);
        assert!(!r.frame_graph_executed);
        assert!(!r.frame_graph_substrate_proven);
        assert!(!r.frame_graph_aaa_ready);
        assert!(!r.scalable_render_graph_product_ready);
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
            assert!(!r.micro_poly_aaa_ready);
            assert!(!r.nanite_ready);
            if r.micro_poly_substrate_proven {
                assert!(r.micro_poly_triangle_count > 0);
                assert!(r.micro_poly_fragments_written > 0);
                assert!(r.micro_poly_triangles_visible > 0);
            }
            assert!(!r.vsm_aaa_ready);
            if r.vsm_substrate_proven {
                assert!(r.vsm_virtual_pages > 0);
                assert!(r.vsm_pages_allocated > 0);
                assert!(r.vsm_pages_depth_written > 0);
                assert!(r.vsm_texels_written > 0);
                assert!(r.vsm_cascade_count >= 2);
            }
            assert!(!r.fsr_aaa_ready);
            if r.fsr_substrate_proven {
                assert!(r.fsr_scale >= 2);
                assert!(r.fsr_input_edge >= 32);
                assert!(r.fsr_output_edge >= 64);
                assert!(r.fsr_output_texels_written > 0);
                assert!(r.fsr_history_samples_blended > 0);
                assert!(r.fsr_reactive_mask_texels > 0);
            }
            assert!(!r.soak_oom_refused);
            assert!(r.soak_present_width >= 640);
            assert!(r.soak_present_height >= 360);
            assert!(!r.soak_fidelity_tier.is_empty());
            assert!(r.soak_capability_score > 0);
            assert!(!r.entropy_aaa_ready);
            assert!(!r.chaos_aaa_ready);
            if r.entropy_substrate_proven {
                assert!(r.entropy_chunk_count > 0);
                assert!(r.entropy_chunks_updated > 0);
            }
            assert!(!r.frame_graph_aaa_ready);
            assert!(!r.scalable_render_graph_product_ready);
            if r.frame_graph_substrate_proven {
                assert!(r.frame_graph_executed);
                assert_eq!(
                    r.frame_graph_pass_count,
                    SECONDARY_FRAME_GRAPH_PASS_ORDER.len() as u32
                );
                assert_eq!(
                    r.frame_graph_pass_timings.len(),
                    SECONDARY_FRAME_GRAPH_PASS_ORDER.len()
                );
                assert!(r.frame_graph_pass_timings.iter().all(|p| p.completed));
            }
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
