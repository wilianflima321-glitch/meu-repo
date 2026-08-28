//! PP-04 / 3B.2 backend — async screenshot gate. End-of-composition capture:
//! the composited resolve color buffer is copied GPU-side
//! (`copy_buffer_to_buffer`), mapped asynchronously (`map_async` callback on
//! the wgpu thread — the tick loop never waits), and validated on a dedicated
//! thread against the PINNED GPU golden hash (FNV-1a 64 over RGBA bytes).
//!
//! Doctrine-aligned: `screenshot_gate_proven` flips ONLY on a measured match;
//! `product_present_ready` and `g3_percent_claimed` are NOT touched here —
//! the band review owns those (G.% stays 15).

use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::mpsc::{self, Sender};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use serde::Serialize;

use crate::gf_mesh_001_fixture::{
    build_gf_mesh_001_dogfood_mesh, cook_gf_mesh_001_meshlets, golden_camera,
    GF_MESH_001_RASTER_EDGE,
};
use crate::gpu_culling::identity_frustum;
use crate::gpu_hiz::DepthPyramidHiz;
use crate::gpu_meshlet_cull::{MeshletCluster, MeshletCullScaffold};
use crate::gpu_micropoly_raster::{MicropolyRasterScaffold, MicropolyTri};

/// Pinned GPU golden for the composited resolve output (RGBA bytes FNV-1a 64,
/// GF-MESH-001 dogfood @ 256², Vulkan/RTX-class device). Captured on the first
/// real-device run and pinned by the test — cross-GPU tolerance is documented,
/// not claimed.
pub const PRODUCT_SCREENSHOT_GATE_GOLDEN_HASH: u64 = 0xdcd5_bd43_2165_4736;

fn fnv1a64(bytes: &[u8]) -> u64 {
    let mut h: u64 = 0xcbf2_9ce4_8422_2325;
    for &b in bytes {
        h ^= u64::from(b);
        h = h.wrapping_mul(0x0000_0100_0000_01b3);
    }
    h
}

#[derive(Debug, Clone, Default)]
struct ScreenshotGateInner {
    completions: u64,
    matches: u64,
    last_hash: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct ScreenshotGateMetrics {
    pub requests: u64,
    pub completions: u64,
    pub matches: u64,
    pub last_hash: String,
    pub screenshot_gate_proven: bool,
}

/// Async screenshot gate: producer side enqueues device copies; a dedicated
/// validator thread hashes the bytes and compares against the pinned golden.
pub struct ProductScreenshotGate {
    tx: Sender<Vec<u8>>,
    requests: Arc<AtomicU64>,
    inner: Arc<Mutex<ScreenshotGateInner>>,
}

impl Default for ProductScreenshotGate {
    fn default() -> Self {
        Self::new()
    }
}

impl ProductScreenshotGate {
    pub fn new() -> Self {
        let (tx, rx) = mpsc::channel::<Vec<u8>>();
        let requests = Arc::new(AtomicU64::new(0));
        let inner = Arc::new(Mutex::new(ScreenshotGateInner::default()));
        let validator_requests = requests.clone();
        let validator_inner = inner.clone();
        std::thread::Builder::new()
            .name("aethel-screenshot-validator".into())
            .spawn(move || {
                while let Ok(bytes) = rx.recv() {
                    let hash = fnv1a64(&bytes);
                    let matched = PRODUCT_SCREENSHOT_GATE_GOLDEN_HASH != 0
                        && hash == PRODUCT_SCREENSHOT_GATE_GOLDEN_HASH;
                    if let Ok(mut state) = validator_inner.lock() {
                        state.completions += 1;
                        state.last_hash = hash;
                        if matched {
                            state.matches += 1;
                        }
                    }
                    let _ = validator_requests.load(Ordering::Relaxed);
                }
            })
            .expect("validator thread spawn");
        Self {
            tx,
            requests,
            inner,
        }
    }

    /// Enqueue an async capture: GPU copy + `map_async` callback hands the
    /// bytes to the validator without ever blocking the caller's tick loop.
    pub fn request_async_capture(
        &self,
        device: &wgpu::Device,
        queue: &wgpu::Queue,
        source: &wgpu::Buffer,
        width: u32,
        height: u32,
    ) {
        let byte_len = u64::from(width) * u64::from(height) * 16;
        let readback = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Aethel Screenshot Gate Readback"),
            size: byte_len,
            usage: wgpu::BufferUsages::MAP_READ | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });
        let mut encoder = device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
            label: Some("Aethel Screenshot Gate Encoder"),
        });
        encoder.copy_buffer_to_buffer(source, 0, &readback, 0, byte_len);
        queue.submit(Some(encoder.finish()));
        let rb = Arc::new(readback);
        let rb_cb = rb.clone();
        let tx = self.tx.clone();
        self.requests.fetch_add(1, Ordering::Relaxed);
        // Map on a slice of the Arc'd buffer; the callback owns a clone of the
        // Arc ('static) and re-slices inside once the map completes — the map
        // state lives on the buffer, so any slice can read the mapped bytes.
        rb.slice(..).map_async(wgpu::MapMode::Read, move |_| {
            let bytes = rb_cb.slice(..).get_mapped_range().to_vec();
            let _ = tx.send(bytes);
        });
    }

    pub fn metrics(&self) -> ScreenshotGateMetrics {
        let state = self.inner.lock().map(|s| s.clone()).unwrap_or_default();
        ScreenshotGateMetrics {
            requests: self.requests.load(Ordering::Relaxed),
            completions: state.completions,
            matches: state.matches,
            last_hash: format!("{:016x}", state.last_hash),
            screenshot_gate_proven: state.completions > 0 && state.matches > 0,
        }
    }

    /// Wait for at least one completed capture (device.poll must run for the
    /// map callback to fire — callers poll in their loop or before waiting).
    pub fn wait_for_result(&self, timeout: Duration) -> ScreenshotGateMetrics {
        let start = Instant::now();
        loop {
            let metrics = self.metrics();
            if metrics.completions > 0 || start.elapsed() >= timeout {
                return metrics;
            }
            std::thread::sleep(Duration::from_millis(4));
        }
    }
}

fn build_gf_mesh_001_gpu_soup() -> (Vec<MicropolyTri>, Vec<MeshletCluster>) {
    let (positions, indices) = build_gf_mesh_001_dogfood_mesh();
    let cook = cook_gf_mesh_001_meshlets(&positions, &indices);
    let tris: Vec<MicropolyTri> = indices
        .iter()
        .enumerate()
        .map(|(i, tri)| MicropolyTri {
            v0: positions[tri[0] as usize],
            meshlet_id: cook.tri_meshlet[i],
            v1: positions[tri[1] as usize],
            tri_id: i as u32,
            v2: positions[tri[2] as usize],
            _pad: 0,
        })
        .collect();
    let clusters: Vec<MeshletCluster> = cook
        .clusters
        .iter()
        .enumerate()
        .map(|(i, c)| MeshletCluster {
            center: c.center,
            radius: c.radius,
            cone_axis: [0.0, 0.0, 1.0],
            cone_cutoff: -2.0,
            lod_error: 0.0,
            triangle_count: 0,
            cluster_id: i as u32,
            _pad: 0,
        })
        .collect();
    (tris, clusters)
}

/// PP-04 probe: builds the composited scene on a real device, enqueues the
/// async capture and reports the measured gate state. Device-optional.
pub fn run_product_screenshot_gate() -> ProductScreenshotGateReport {
    let instance = wgpu::Instance::default();
    let adapter = match pollster::block_on(instance.request_adapter(&wgpu::RequestAdapterOptions {
        power_preference: wgpu::PowerPreference::HighPerformance,
        compatible_surface: None,
        force_fallback_adapter: false,
    })) {
        Some(a) => a,
        None => {
            return ProductScreenshotGateReport {
                gpu_available: false,
                device_created: false,
                captured: false,
                matched: false,
                last_hash: String::new(),
                screenshot_gate_proven: false,
                product_present_ready: false,
                g3_percent_claimed: 15,
                claim: "Screenshot gate not run: no adapter (honest skip)".into(),
            }
        }
    };
    let adapter_name = adapter.get_info().name.clone();
    let backend = format!("{:?}", adapter.get_info().backend);
    let (device, queue) = match pollster::block_on(adapter.request_device(
        &wgpu::DeviceDescriptor {
            label: Some("Aethel Screenshot Gate Device"),
            required_features: wgpu::Features::empty(),
            required_limits: wgpu::Limits::default(),
        },
        None,
    )) {
        Ok((d, q)) => (d, q),
        Err(e) => {
            return ProductScreenshotGateReport {
                gpu_available: true,
                device_created: false,
                captured: false,
                matched: false,
                last_hash: String::new(),
                screenshot_gate_proven: false,
                product_present_ready: false,
                g3_percent_claimed: 15,
                claim: format!("Screenshot gate not run: device request failed ({e})"),
            }
        }
    };

    let (tris, clusters) = build_gf_mesh_001_gpu_soup();
    let frustum = identity_frustum(clusters.len() as u32);
    let hiz = match DepthPyramidHiz::new(&device, 2, 2) {
        Ok(h) => h,
        Err(e) => {
            return ProductScreenshotGateReport {
                gpu_available: true,
                device_created: true,
                captured: false,
                matched: false,
                last_hash: String::new(),
                screenshot_gate_proven: false,
                product_present_ready: false,
                g3_percent_claimed: 15,
                claim: format!("Screenshot gate not run: Hi-Z init failed ({e})"),
            }
        }
    };
    let cull = match MeshletCullScaffold::new(
        &device,
        wgpu::TextureFormat::Rgba8UnormSrgb,
        &clusters,
        frustum,
        hiz.pyramid_view(),
    ) {
        Ok(c) => c,
        Err(e) => {
            return ProductScreenshotGateReport {
                gpu_available: true,
                device_created: true,
                captured: false,
                matched: false,
                last_hash: String::new(),
                screenshot_gate_proven: false,
                product_present_ready: false,
                g3_percent_claimed: 15,
                claim: format!("Screenshot gate not run: cull init failed ({e})"),
            }
        }
    };
    let raster = match MicropolyRasterScaffold::new_with_extent_and_camera(
        &device,
        &tris,
        &cull,
        GF_MESH_001_RASTER_EDGE,
        GF_MESH_001_RASTER_EDGE,
        golden_camera(),
    ) {
        Ok(r) => r,
        Err(e) => {
            return ProductScreenshotGateReport {
                gpu_available: true,
                device_created: true,
                captured: false,
                matched: false,
                last_hash: String::new(),
                screenshot_gate_proven: false,
                product_present_ready: false,
                g3_percent_claimed: 15,
                claim: format!("Screenshot gate not run: raster init failed ({e})"),
            }
        }
    };

    let gate = ProductScreenshotGate::new();
    let mut encoder = device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
        label: Some("Aethel Screenshot Gate Scene Encoder"),
    });
    cull.encode_cull(&queue, &mut encoder, false);
    raster.encode_raster(&queue, &mut encoder);
    queue.submit(Some(encoder.finish()));
    // Async capture of the composited resolve output — never blocks the tick.
    gate.request_async_capture(
        &device,
        &queue,
        raster.resolve_color_buffer(),
        GF_MESH_001_RASTER_EDGE,
        GF_MESH_001_RASTER_EDGE,
    );
    device.poll(wgpu::Maintain::Wait);
    let metrics = gate.wait_for_result(Duration::from_secs(5));

    ProductScreenshotGateReport {
        gpu_available: true,
        device_created: true,
        captured: metrics.completions > 0,
        matched: metrics.matches > 0,
        last_hash: metrics.last_hash.clone(),
        screenshot_gate_proven: metrics.screenshot_gate_proven,
        product_present_ready: false,
        g3_percent_claimed: 15,
        claim: if metrics.screenshot_gate_proven {
            format!(
                "PP-04 screenshot gate PASSED on {adapter_name}/{backend}: async end-of-composition capture matched the pinned golden (hash {}). product_present_ready stays false — band review owns the flip",
                metrics.last_hash
            )
        } else {
            "PP-04 screenshot gate NOT proven: capture did not match the pinned golden (evidence recorded, no claim)".into()
        },
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct ProductScreenshotGateReport {
    pub gpu_available: bool,
    pub device_created: bool,
    pub captured: bool,
    pub matched: bool,
    pub last_hash: String,
    pub screenshot_gate_proven: bool,
    pub product_present_ready: bool,
    pub g3_percent_claimed: u32,
    pub claim: String,
}

#[tauri::command]
pub fn run_product_screenshot_gate_cmd() -> ProductScreenshotGateReport {
    run_product_screenshot_gate()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn async_gate_never_fakes_without_device() {
        let r = run_product_screenshot_gate();
        assert!(!r.product_present_ready, "PP-04 must never flip product_present_ready");
        assert_eq!(r.g3_percent_claimed, 15, "G.% stays 15 — band review owns the bump");
        if r.gpu_available && r.device_created {
            assert!(r.captured, "async capture must complete on a real device: {r:?}");
            assert!(r.matched, "composited hash must match the pinned golden: {r:?}");
            assert!(r.screenshot_gate_proven);
        } else {
            assert!(!r.screenshot_gate_proven, "no device means no gate claim");
        }
    }
}
