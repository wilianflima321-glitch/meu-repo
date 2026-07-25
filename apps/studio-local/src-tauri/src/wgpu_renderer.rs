//! Console HAL desktop path (letter **bs**) + CW3 Path A present/submit deepen.
//!
//! wgpu documents Vulkan / DX12 / Metal via `wgpu::Backends` for studio-local.
//! Maps to TS `lib/immunity/console-hal.ts` negotiate (`webgpu` / `vulkan` / `dx12`).
//! **PS5 GNM always HELD** — no proprietary SDK; never claim `ps5GnmReady`.
//!
//! # Present honesty (CW3 Path A)
//! - Tauri main window hosts a Chromium WebView; exclusive native swapchain present
//!   on that HWND remains **HELD** (WebView owns the pixels).
//! - Maximum real path: controlled secondary `winit` window → surface configure →
//!   clear → `queue.submit` → `SurfaceTexture::present` with **no CPU readback**
//!   on the hot path.
//! - `live_present` in web honesty flips only when this probe returns
//!   `presented: true` **and** `submitted: true` (desktop honesty status stays fallback).
//! - Never Nanite/Lumen/UE-RHI parity marketing from mount or probe alone.

use std::sync::{Arc, Mutex};
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::Window;
use winit::dpi::PhysicalSize;
use winit::event_loop::EventLoopBuilder;
use winit::window::WindowBuilder;

use crate::gpu_culling::GpuCullingPipeline;

/// Default soak frames for present probe (bounded — not a product game loop).
const DEFAULT_PRESENT_SOAK_FRAMES: u32 = 3;
const MAX_PRESENT_SOAK_FRAMES: u32 = 8;
const PRESENT_PROBE_TIMEOUT: Duration = Duration::from_secs(45);

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
    /// Reasons (fail-closed or remaining HELD vs UE RHI).
    pub reasons: Vec<String>,
    pub held_vs_ue_rhi: Vec<String>,
    /// Always false — never flip marketing from present soak.
    pub nanite_ready: bool,
    pub lumen_ready: bool,
    pub unreal_rhi_parity_ready: bool,
    pub letter: String,
    pub note: String,
}

/// Last successful/failed probe for IPC pull without re-running GPU work.
#[derive(Default)]
pub struct PresentProbeState(pub Mutex<Option<RendererPresentProbeReport>>);

impl WgpuRenderer {
    /// Compiles and creates a Compute Pipeline from a raw WGSL shader string.
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
    pub async fn mount_on_window(window: Arc<Window>) -> Result<Self, String> {
        let instance = wgpu::Instance::new(wgpu::InstanceDescriptor {
            backends: wgpu::Backends::PRIMARY,
            ..Default::default()
        });

        // Safety: The Tauri Window must outlive the surface. We use Arc to ensure lifetime.
        let surface = unsafe { instance.create_surface(window.clone()) }
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
        "Probe proves secondary winit swapchain present only — not IDE viewport replacement".into(),
        "No Nanite/Lumen/virtualized geometry from this path".into(),
        "CPU texture readback / staging copies for capture remain HELD if needed later".into(),
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
        reasons,
        held_vs_ue_rhi: held_vs_ue_baseline(),
        nanite_ready: false,
        lumen_ready: false,
        unreal_rhi_parity_ready: false,
        letter: "cw3-present".into(),
        note: "Present/submit probe fail-closed — never invent presented:true".into(),
    }
}

/// Clear + submit + present one frame. No `map_async` / buffer readback.
fn present_one_frame(
    device: &wgpu::Device,
    queue: &wgpu::Queue,
    surface: &wgpu::Surface<'_>,
) -> Result<(), String> {
    let frame = surface
        .get_current_texture()
        .map_err(|e| format!("get_current_texture failed: {e}"))?;
    let view = frame
        .texture
        .create_view(&wgpu::TextureViewDescriptor::default());
    let mut encoder = device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
        label: Some("aethel-present-probe-encoder"),
    });
    {
        let _pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
            label: Some("aethel-present-probe-clear"),
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
            depth_stencil_attachment: None,
            occlusion_query_set: None,
            timestamp_writes: None,
        });
    }
    queue.submit(std::iter::once(encoder.finish()));
    frame.present();
    Ok(())
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
        .with_inner_size(PhysicalSize::new(64, 64))
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

    let (device, queue) = match pollster::block_on(adapter.request_device(
        &wgpu::DeviceDescriptor {
            label: Some("Aethel Present Probe Device"),
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
            return r;
        }
    };

    if let Err(e) = configure_surface(&device, &adapter, &surface, size.width, size.height) {
        let mut r = fail_report(frames_requested, vec![e]);
        r.adapter_acquired = true;
        r.device_created = true;
        r.adapter_name = adapter_name;
        r.backend = backend;
        r.surface_kind = "secondary_winit".into();
        return r;
    }

    let mut frames_presented = 0u32;
    let mut submitted = false;
    let mut last_err: Option<String> = None;
    for _ in 0..frames_requested {
        match present_one_frame(&device, &queue, &surface) {
            Ok(()) => {
                submitted = true;
                frames_presented = frames_presented.saturating_add(1);
            }
            Err(e) => {
                last_err = Some(e);
                break;
            }
        }
    }

    let presented = frames_presented > 0;
    let mut reasons = Vec::new();
    if presented {
        reasons.push(format!(
            "Presented {frames_presented}/{frames_requested} frame(s) on secondary_winit via wgpu submit+present (no CPU readback)"
        ));
        reasons.push(
            "WebView exclusive present still HELD — operator Studio UI remains WebView/WebGL2".into(),
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
        reasons,
        held_vs_ue_rhi: held_vs_ue_baseline(),
        nanite_ready: false,
        lumen_ready: false,
        unreal_rhi_parity_ready: false,
        letter: "cw3-present".into(),
        note: if presented {
            "Desktop soak: secondary winit swapchain present proven — live_present eligible for honesty role; UE RHI / WebView exclusive / Nanite/Lumen still HELD".into()
        } else {
            "Present/submit probe did not present — honesty stays experimental_mount".into()
        },
    }
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
        assert!(!r.unreal_rhi_parity_ready);
        assert!(r.webview_exclusive_present_held);
        assert!(!r.cpu_readback_on_hot_path);
        assert_eq!(r.letter, "cw3-present");
    }

    #[test]
    fn present_probe_soak_is_honest() {
        // Integration soak: may fail on headless CI without GPU — must never fake success.
        let r = run_renderer_present_probe(Some(2));
        assert_eq!(r.letter, "cw3-present");
        assert!(!r.nanite_ready);
        assert!(!r.lumen_ready);
        assert!(!r.unreal_rhi_parity_ready);
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
            assert!(!r.backend.is_empty());
            assert!(!r.adapter_name.is_empty());
        } else {
            assert_eq!(r.frames_presented, 0);
            assert!(!r.reasons.is_empty());
        }
        assert!(!r.held_vs_ue_rhi.is_empty());
    }

    #[test]
    fn present_frame_alias_requests_one_frame() {
        let r = run_present_frame();
        assert_eq!(r.frames_requested, 1);
        assert!(!r.unreal_rhi_parity_ready);
    }
}
