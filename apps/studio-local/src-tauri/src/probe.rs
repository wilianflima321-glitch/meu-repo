use std::env;
use std::process::Command;
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::contracts::{
    LocalRuntimeProbeReport, RuntimeExecutionTarget, StoragePressure, ThermalState,
    STUDIO_LOCAL_CONTRACT_VERSION,
};

fn command_exists(command: &str) -> bool {
    Command::new(command)
        .arg("--version")
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

fn now_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}

fn signature_for(device_id: &str, generated_at: &str) -> String {
    format!("local-probe-v1:{device_id}:{generated_at}")
}

pub fn build_probe_from_signals(
    device_id: &str,
    gpu_available: bool,
    npu_available: bool,
    available_memory_mb: u64,
    thermal_state: ThermalState,
    storage_pressure: StoragePressure,
) -> LocalRuntimeProbeReport {
    let generated_at = format!("{}", now_millis());
    let preferred_executor = if thermal_state == ThermalState::Critical || storage_pressure == StoragePressure::Critical {
        RuntimeExecutionTarget::Held
    } else if npu_available || gpu_available {
        RuntimeExecutionTarget::LocalNative
    } else if available_memory_mb >= 4_096 {
        RuntimeExecutionTarget::LocalWorker
    } else {
        RuntimeExecutionTarget::CloudSandbox
    };

    LocalRuntimeProbeReport {
        version: STUDIO_LOCAL_CONTRACT_VERSION,
        generated_at: generated_at.clone(),
        device_id: device_id.to_string(),
        os: env::consts::OS.to_string(),
        arch: env::consts::ARCH.to_string(),
        cpu_logical_cores: thread::available_parallelism().map(|cores| cores.get()).unwrap_or(1),
        total_memory_mb: None,
        available_memory_mb: Some(available_memory_mb),
        storage_free_mb: None,
        gpu_available,
        gpu_name: None,
        web_gpu_available: false,
        web_nn_available: false,
        npu_available,
        windows_ml_available: cfg!(target_os = "windows") && npu_available,
        direct_ml_available: cfg!(target_os = "windows") && (gpu_available || npu_available),
        onnx_runtime_available: command_exists("onnxruntime") || command_exists("ort"),
        ffmpeg_available: command_exists("ffmpeg"),
        rapier_available: true,
        browser_automation_available: command_exists("chrome") || command_exists("chromium") || command_exists("msedge"),
        thermal_state,
        storage_pressure,
        preferred_executor,
        signature: signature_for(device_id, &generated_at),
    }
}

pub fn collect_local_probe(device_id: &str) -> LocalRuntimeProbeReport {
    let gpu_available = env::var("AETHEL_LOCAL_GPU_AVAILABLE").map(|value| value == "1").unwrap_or(false);
    let npu_available = env::var("AETHEL_LOCAL_NPU_AVAILABLE").map(|value| value == "1").unwrap_or(false);
    let available_memory_mb = env::var("AETHEL_LOCAL_AVAILABLE_MEMORY_MB")
        .ok()
        .and_then(|value| value.parse::<u64>().ok())
        .unwrap_or(0);

    build_probe_from_signals(
        device_id,
        gpu_available,
        npu_available,
        available_memory_mb,
        ThermalState::Unknown,
        StoragePressure::Unknown,
    )
}
