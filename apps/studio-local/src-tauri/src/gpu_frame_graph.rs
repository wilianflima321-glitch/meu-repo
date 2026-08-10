//! Secondary_winit ScalableRenderGraph-*style* frame graph (Law XV honesty).
//!
//! # What this proves
//! - An **explicit ordered pass list** drives the secondary soak instead of an
//!   ad-hoc call chain: meshlet cull → pack → draw_indirect+depth → Hi-Z →
//!   radiance → micro-poly → VSM → FSR → entropy → submit → present.
//! - Each pass records **Instant** wall time into a per-frame metrics bag.
//! - Fail-closed: if any listed pass does not complete, the frame Result is
//!   `Err` and `frame_graph_substrate_proven` stays false.
//!
//! # What this does **not** prove
//! - Product WebView exclusive present (Chromium owns the Tauri HWND —
//!   see [`WEBVIEW_EXCLUSIVE_PRESENT_HELD_REASON`]).
//! - UE RHI / full ScalableRenderGraph product wire (`frame_graph_aaa_ready`
//!   / `scalable_render_graph_product_ready` stay **false**).
//! - Fabricated FPS — timings are Instant ms only; no FPS field is invented.

use serde::{Deserialize, Serialize};

use crate::gpu_entropy_destruction::EntropyDestructionScaffold;
use crate::gpu_fsr::FsrTemporalUpsample;
use crate::gpu_hiz::DepthPyramidHiz;
use crate::gpu_meshlet_cull::MeshletCullScaffold;
use crate::gpu_micropoly_raster::MicropolyRasterScaffold;
use crate::gpu_radiance_probes::RadianceProbeVolume;
use crate::gpu_vsm::VsmShadowAtlas;

/// Canonical secondary pass order (only substrates that exist today).
pub const SECONDARY_FRAME_GRAPH_PASS_ORDER: &[&str] = &[
    "meshlet_cull",
    "meshlet_pack",
    "draw_indirect_depth",
    "hiz",
    "radiance",
    "micro_poly",
    "vsm",
    "fsr",
    "entropy",
    "submit",
    "present",
];

/// Binding honesty: Tauri Studio UI is Chromium WebView-composited.
pub const WEBVIEW_EXCLUSIVE_PRESENT_HELD_REASON: &str = "\
WebView exclusive present remains HELD: the Tauri main window HWND is owned by \
Chromium's compositor. Mounting a wgpu surface without exclusive ownership is \
identity-only and must never be marketed as product viewport replacement. \
Maximum proven path is secondary_winit ScalableRenderGraph-style execute → \
SurfaceTexture::present.";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FrameGraphPassTiming {
    pub pass_id: String,
    pub order_index: u32,
    /// Instant wall ms for this pass encode (never fabricated).
    pub ms: f64,
    pub completed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct FrameGraphFrameMetrics {
    pub passes: Vec<FrameGraphPassTiming>,
    /// Sum of Instant pass ms for this frame (encode + submit + present).
    pub frame_ms_total: f64,
    pub passes_expected: u32,
    pub passes_completed: u32,
    pub hiz_downs: u32,
    pub all_passes_completed: bool,
}

impl FrameGraphFrameMetrics {
    pub fn pass_ms(&self, id: &str) -> f64 {
        self.passes
            .iter()
            .find(|p| p.pass_id == id)
            .map(|p| p.ms)
            .unwrap_or(0.0)
    }
}

/// IPC-facing timings report (no FPS — Instant ms only).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FrameGraphTimingsReport {
    pub available: bool,
    pub surface_kind: String,
    pub webview_exclusive_present_held: bool,
    pub webview_held_reason: String,
    pub pass_order: Vec<String>,
    pub last_frame_passes: Vec<FrameGraphPassTiming>,
    pub last_frame_ms_total: f64,
    pub soak_pass_ms_totals: Vec<FrameGraphPassTiming>,
    pub frames_presented: u32,
    /// Always false — never invent FPS from Instant bag.
    pub fabricated_fps: bool,
    /// Always false — secondary graph ≠ product SRG / UE RHI.
    pub frame_graph_aaa_ready: bool,
    pub scalable_render_graph_product_ready: bool,
    pub note: String,
}

pub struct SecondaryFrameGraphOutcome {
    pub metrics: FrameGraphFrameMetrics,
}

struct PassRecorder<'a> {
    metrics: &'a mut FrameGraphFrameMetrics,
}

impl<'a> PassRecorder<'a> {
    fn run<F>(&mut self, pass_id: &str, order_index: u32, f: F) -> Result<(), String>
    where
        F: FnOnce() -> Result<(), String>,
    {
        let t0 = std::time::Instant::now();
        match f() {
            Ok(()) => {
                let ms = t0.elapsed().as_secs_f64() * 1000.0;
                self.metrics.passes.push(FrameGraphPassTiming {
                    pass_id: pass_id.into(),
                    order_index,
                    ms,
                    completed: true,
                });
                self.metrics.passes_completed =
                    self.metrics.passes_completed.saturating_add(1);
                self.metrics.frame_ms_total += ms;
                Ok(())
            }
            Err(e) => {
                let ms = t0.elapsed().as_secs_f64() * 1000.0;
                self.metrics.passes.push(FrameGraphPassTiming {
                    pass_id: pass_id.into(),
                    order_index,
                    ms,
                    completed: false,
                });
                self.metrics.frame_ms_total += ms;
                Err(format!("frame-graph pass `{pass_id}` dropped: {e}"))
            }
        }
    }
}

/// Execute the secondary ScalableRenderGraph-style pass list into one encoder.
#[allow(clippy::too_many_arguments)]
pub fn execute_secondary_frame_graph(
    _device: &wgpu::Device,
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
) -> Result<SecondaryFrameGraphOutcome, String> {
    let mut metrics = FrameGraphFrameMetrics {
        passes: Vec::with_capacity(SECONDARY_FRAME_GRAPH_PASS_ORDER.len()),
        frame_ms_total: 0.0,
        passes_expected: SECONDARY_FRAME_GRAPH_PASS_ORDER.len() as u32,
        passes_completed: 0,
        hiz_downs: 0,
        all_passes_completed: false,
    };

    let frame = surface
        .get_current_texture()
        .map_err(|e| format!("get_current_texture failed: {e}"))?;
    let view = frame
        .texture
        .create_view(&wgpu::TextureViewDescriptor::default());
    let mut encoder = device_encoder_for_graph(_device)?;

    let mut hiz_downs = 0u32;
    {
        let mut rec = PassRecorder {
            metrics: &mut metrics,
        };
        let mut order = 0u32;

        rec.run("meshlet_cull", order, || {
            meshlets.encode_cull(queue, &mut encoder, occlusion_enabled);
            Ok(())
        })?;
        order += 1;

        rec.run("meshlet_pack", order, || {
            meshlets.encode_pack(&mut encoder);
            Ok(())
        })?;
        order += 1;

        rec.run("draw_indirect_depth", order, || {
            let mut rpass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("aethel-frame-graph-draw-indirect-depth"),
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
            Ok(())
        })?;
        order += 1;

        rec.run("hiz", order, || {
            hiz_downs = hiz.encode_build(&mut encoder);
            if hiz_downs == 0 {
                return Err("Hi-Z encode produced zero downsample passes".into());
            }
            Ok(())
        })?;
        order += 1;

        rec.run("radiance", order, || {
            radiance.encode_fill_and_sample(queue, &mut encoder);
            Ok(())
        })?;
        order += 1;

        rec.run("micro_poly", order, || {
            micropoly.encode_raster(queue, &mut encoder);
            Ok(())
        })?;
        order += 1;

        rec.run("vsm", order, || {
            vsm.encode_update(queue, &mut encoder);
            Ok(())
        })?;
        order += 1;

        rec.run("fsr", order, || {
            fsr.encode_upsample(queue, &mut encoder);
            Ok(())
        })?;
        order += 1;

        rec.run("entropy", order, || {
            entropy.encode_simulate(queue, &mut encoder);
            Ok(())
        })?;
        order += 1;

        // Consume encoder on submit — must be last encode step before present.
        rec.run("submit", order, || {
            queue.submit(std::iter::once(encoder.finish()));
            Ok(())
        })?;
        order += 1;

        rec.run("present", order, || {
            frame.present();
            Ok(())
        })?;
    }

    metrics.hiz_downs = hiz_downs;
    metrics.all_passes_completed =
        metrics.passes_completed == metrics.passes_expected
            && metrics.passes.iter().all(|p| p.completed);

    if !metrics.all_passes_completed {
        return Err(format!(
            "frame-graph incomplete: {}/{} passes completed",
            metrics.passes_completed, metrics.passes_expected
        ));
    }

    Ok(SecondaryFrameGraphOutcome { metrics })
}

fn device_encoder_for_graph(device: &wgpu::Device) -> Result<wgpu::CommandEncoder, String> {
    Ok(device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
        label: Some("aethel-secondary-frame-graph-encoder"),
    }))
}

pub fn empty_timings_report(note: impl Into<String>) -> FrameGraphTimingsReport {
    FrameGraphTimingsReport {
        available: false,
        surface_kind: "none".into(),
        webview_exclusive_present_held: true,
        webview_held_reason: WEBVIEW_EXCLUSIVE_PRESENT_HELD_REASON.into(),
        pass_order: SECONDARY_FRAME_GRAPH_PASS_ORDER
            .iter()
            .map(|s| (*s).to_string())
            .collect(),
        last_frame_passes: Vec::new(),
        last_frame_ms_total: 0.0,
        soak_pass_ms_totals: Vec::new(),
        frames_presented: 0,
        fabricated_fps: false,
        frame_graph_aaa_ready: false,
        scalable_render_graph_product_ready: false,
        note: note.into(),
    }
}

pub fn timings_from_soak(
    last: &FrameGraphFrameMetrics,
    soak_totals: &[FrameGraphPassTiming],
    frames_presented: u32,
    presented: bool,
) -> FrameGraphTimingsReport {
    FrameGraphTimingsReport {
        available: presented && last.all_passes_completed,
        surface_kind: if presented {
            "secondary_winit".into()
        } else {
            "none".into()
        },
        webview_exclusive_present_held: true,
        webview_held_reason: WEBVIEW_EXCLUSIVE_PRESENT_HELD_REASON.into(),
        pass_order: SECONDARY_FRAME_GRAPH_PASS_ORDER
            .iter()
            .map(|s| (*s).to_string())
            .collect(),
        last_frame_passes: last.passes.clone(),
        last_frame_ms_total: last.frame_ms_total,
        soak_pass_ms_totals: soak_totals.to_vec(),
        frames_presented,
        fabricated_fps: false,
        frame_graph_aaa_ready: false,
        scalable_render_graph_product_ready: false,
        note: if presented {
            "Secondary_winit ScalableRenderGraph-style Instant pass timings — product WebView exclusive + SRG AAA HELD; FPS not fabricated".into()
        } else {
            "No presented frame — timings unavailable (fail-closed)".into()
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn secondary_pass_order_is_complete() {
        assert_eq!(SECONDARY_FRAME_GRAPH_PASS_ORDER.len(), 11);
        assert_eq!(SECONDARY_FRAME_GRAPH_PASS_ORDER[0], "meshlet_cull");
        assert_eq!(SECONDARY_FRAME_GRAPH_PASS_ORDER[3], "hiz");
        assert_eq!(SECONDARY_FRAME_GRAPH_PASS_ORDER[8], "entropy");
        assert_eq!(SECONDARY_FRAME_GRAPH_PASS_ORDER[10], "present");
    }

    #[test]
    fn empty_timings_never_fakes_fps_or_aaa() {
        let r = empty_timings_report("unit");
        assert!(!r.available);
        assert!(!r.fabricated_fps);
        assert!(!r.frame_graph_aaa_ready);
        assert!(!r.scalable_render_graph_product_ready);
        assert!(r.webview_exclusive_present_held);
        assert!(r.webview_held_reason.contains("Chromium"));
    }
}
