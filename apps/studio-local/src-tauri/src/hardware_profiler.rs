//! Missão Suprema 2 — Profiler de Hardware Real.
//!
//! CPU usage and system RAM come from `sysinfo`, which is genuinely
//! cross-platform and live — not a mock. GPU identity (adapter name +
//! backend, e.g. "NVIDIA GeForce RTX 4080" / "Vulkan") comes from the real
//! `wgpu::Adapter` `wgpu_renderer.rs` already opened against the OS window.
//!
//! GPU VRAM-used and GPU die temperature are intentionally reported as
//! `None`: there is no cross-vendor wgpu/Vulkan call that returns either —
//! getting real numbers requires vendor-specific bindings (NVML for NVIDIA,
//! ADLX for AMD, IGCL for Intel) that are not wired into this build.
//! Fabricating a plausible-looking number here would be exactly the kind of
//! fake claim `native_kernel.rs` exists to prevent, so the frontend receives
//! an honest `null` plus a `gpuMetricsReason` string instead of a lie.
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::Serialize;
use sysinfo::System;
use tauri::{AppHandle, Emitter, State};

pub const HARDWARE_SAMPLE_EVENT: &str = "hardware_sample";
const SAMPLE_INTERVAL: Duration = Duration::from_millis(500);
const GPU_METRICS_REASON: &str = "VRAM usage and GPU temperature require vendor-specific bindings (NVML/ADLX/IGCL) that are not wired into this build. CPU, RAM, and GPU adapter identity above are live native samples.";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HardwareSample {
    pub timestamp_unix_ms: u128,
    pub cpu_usage_percent: f32,
    pub cpu_per_core_percent: Vec<f32>,
    pub memory_used_mb: u64,
    pub memory_total_mb: u64,
    pub gpu_name: Option<String>,
    pub gpu_backend: Option<String>,
    pub gpu_vram_used_mb: Option<u64>,
    pub gpu_temperature_c: Option<f32>,
    pub gpu_metrics_reason: String,
}

/// Populated once from `main.rs`'s setup hook after `WgpuRenderer::mount_on_window`
/// succeeds, so the profiler reports the *real* adapter Studio Local is
/// actually rendering with instead of guessing.
#[derive(Default, Clone)]
pub struct GpuIdentity {
    pub name: Option<String>,
    pub backend: Option<String>,
}

#[derive(Default)]
pub struct GpuIdentityState(pub Mutex<GpuIdentity>);

fn current_gpu_identity(gpu_identity: &GpuIdentityState) -> GpuIdentity {
    gpu_identity
        .0
        .lock()
        .map(|guard| guard.clone())
        .unwrap_or_default()
}

fn sample_now(sys: &mut System, gpu: &GpuIdentity) -> HardwareSample {
    sys.refresh_all();

    let cpu_per_core_percent: Vec<f32> = sys.cpus().iter().map(|cpu| cpu.cpu_usage()).collect();
    let cpu_usage_percent = if cpu_per_core_percent.is_empty() {
        0.0
    } else {
        cpu_per_core_percent.iter().sum::<f32>() / cpu_per_core_percent.len() as f32
    };

    HardwareSample {
        timestamp_unix_ms: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_millis())
            .unwrap_or(0),
        cpu_usage_percent,
        cpu_per_core_percent,
        memory_used_mb: sys.used_memory() / 1024 / 1024,
        memory_total_mb: sys.total_memory() / 1024 / 1024,
        gpu_name: gpu.name.clone(),
        gpu_backend: gpu.backend.clone(),
        gpu_vram_used_mb: None,
        gpu_temperature_c: None,
        gpu_metrics_reason: GPU_METRICS_REASON.to_string(),
    }
}

/// One-shot pull for the frontend to paint an initial reading before the
/// first background-thread broadcast arrives.
#[tauri::command]
pub fn hardware_profiler_sample_once(gpu_identity: State<'_, Arc<GpuIdentityState>>) -> HardwareSample {
    let mut sys = System::new_all();
    sample_now(&mut sys, &current_gpu_identity(&gpu_identity))
}

/// Spawns a plain OS thread (deliberately not a Tauri async task, so
/// sampling keeps a steady 500ms cadence even if the webview's JS event loop
/// is busy) that emits `hardware_sample` for the lifetime of the process.
pub fn spawn_hardware_profiler(app_handle: AppHandle, gpu_identity: Arc<GpuIdentityState>) {
    thread::spawn(move || {
        let mut sys = System::new_all();
        loop {
            let payload = sample_now(&mut sys, &current_gpu_identity(&gpu_identity));
            let _ = app_handle.emit(HARDWARE_SAMPLE_EVENT, payload);
            thread::sleep(SAMPLE_INTERVAL);
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sample_reports_honest_gpu_metric_gaps() {
        let mut sys = System::new_all();
        let gpu = GpuIdentity {
            name: Some("Test Adapter".to_string()),
            backend: Some("Vulkan".to_string()),
        };
        let sample = sample_now(&mut sys, &gpu);

        assert!(sample.gpu_vram_used_mb.is_none());
        assert!(sample.gpu_temperature_c.is_none());
        assert!(!sample.gpu_metrics_reason.is_empty());
        assert_eq!(sample.gpu_name.as_deref(), Some("Test Adapter"));
        assert_eq!(sample.cpu_per_core_percent.len(), sys.cpus().len());
    }
}
