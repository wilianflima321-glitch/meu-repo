use std::env;
use std::process::Command;
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::contracts::{
    LocalRuntimeProbeReport, LocalRuntimeToolchainFeature, NativeAiExecutionProvider,
    NativeGraphicsBackend, RuntimeExecutionTarget, StoragePressure, ThermalState,
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

fn split_env_list(name: &str) -> Vec<String> {
    env::var(name)
        .map(|value| {
            value
                .split(',')
                .map(|entry| entry.trim().to_ascii_lowercase())
                .filter(|entry| !entry.is_empty())
                .collect()
        })
        .unwrap_or_default()
}

fn parse_graphics_backend(value: &str) -> Option<NativeGraphicsBackend> {
    match value {
        "vulkan" | "vk" => Some(NativeGraphicsBackend::Vulkan),
        "directx12" | "d3d12" | "dx12" => Some(NativeGraphicsBackend::DirectX12),
        "metal" => Some(NativeGraphicsBackend::Metal),
        "webgpu" | "wgpu" => Some(NativeGraphicsBackend::WebGpu),
        "opengl" | "gl" | "gles" => Some(NativeGraphicsBackend::OpenGl),
        _ => None,
    }
}

fn parse_ai_provider(value: &str) -> Option<NativeAiExecutionProvider> {
    match value {
        "cpu" => Some(NativeAiExecutionProvider::Cpu),
        "cuda" => Some(NativeAiExecutionProvider::Cuda),
        "tensorrt" | "tensor-rt" | "trt" => Some(NativeAiExecutionProvider::TensorRt),
        "directml" | "dml" => Some(NativeAiExecutionProvider::DirectMl),
        "coreml" => Some(NativeAiExecutionProvider::CoreMl),
        "openvino" => Some(NativeAiExecutionProvider::OpenVino),
        "qnn" | "qualcomm" => Some(NativeAiExecutionProvider::Qnn),
        "xnnpack" => Some(NativeAiExecutionProvider::Xnnpack),
        "webgpu" => Some(NativeAiExecutionProvider::WebGpu),
        "webnn" => Some(NativeAiExecutionProvider::WebNn),
        _ => None,
    }
}

fn parse_toolchain_feature(value: &str) -> Option<LocalRuntimeToolchainFeature> {
    match value {
        "ffmpeg" => Some(LocalRuntimeToolchainFeature::Ffmpeg),
        "ffprobe" => Some(LocalRuntimeToolchainFeature::Ffprobe),
        "rapier" => Some(LocalRuntimeToolchainFeature::Rapier),
        "browser-automation" | "browser" | "chrome" | "chromium" => Some(LocalRuntimeToolchainFeature::BrowserAutomation),
        "asset-optimizer" | "asset" | "meshopt" | "gltf-transform" => Some(LocalRuntimeToolchainFeature::AssetOptimizer),
        "shader-compiler" | "shader" | "dxc" | "naga" => Some(LocalRuntimeToolchainFeature::ShaderCompiler),
        _ => None,
    }
}

fn push_unique<T: Copy + PartialEq>(items: &mut Vec<T>, item: T) {
    if !items.contains(&item) {
        items.push(item);
    }
}

fn default_graphics_backends(gpu_available: bool) -> Vec<NativeGraphicsBackend> {
    let mut backends = split_env_list("AETHEL_LOCAL_GRAPHICS_BACKENDS")
        .iter()
        .filter_map(|entry| parse_graphics_backend(entry))
        .collect::<Vec<_>>();

    if gpu_available && backends.is_empty() {
        if cfg!(target_os = "windows") {
            backends.push(NativeGraphicsBackend::DirectX12);
        } else if cfg!(target_os = "macos") {
            backends.push(NativeGraphicsBackend::Metal);
        } else if cfg!(target_os = "linux") {
            backends.push(NativeGraphicsBackend::Vulkan);
        }
    }

    backends
}

fn default_ai_execution_providers(
    gpu_available: bool,
    npu_available: bool,
    onnx_runtime_available: bool,
) -> Vec<NativeAiExecutionProvider> {
    let mut providers = split_env_list("AETHEL_LOCAL_AI_EXECUTION_PROVIDERS")
        .iter()
        .filter_map(|entry| parse_ai_provider(entry))
        .collect::<Vec<_>>();

    if onnx_runtime_available {
        push_unique(&mut providers, NativeAiExecutionProvider::Cpu);
    }

    if cfg!(target_os = "windows") && (gpu_available || npu_available) {
        push_unique(&mut providers, NativeAiExecutionProvider::DirectMl);
    }

    if cfg!(target_os = "macos") && (gpu_available || npu_available) {
        push_unique(&mut providers, NativeAiExecutionProvider::CoreMl);
    }

    providers
}

fn default_toolchain(
    ffmpeg_available: bool,
    rapier_available: bool,
    browser_automation_available: bool,
) -> Vec<LocalRuntimeToolchainFeature> {
    let mut toolchain = split_env_list("AETHEL_LOCAL_TOOLCHAIN")
        .iter()
        .filter_map(|entry| parse_toolchain_feature(entry))
        .collect::<Vec<_>>();

    if ffmpeg_available {
        push_unique(&mut toolchain, LocalRuntimeToolchainFeature::Ffmpeg);
    }

    if command_exists("ffprobe") {
        push_unique(&mut toolchain, LocalRuntimeToolchainFeature::Ffprobe);
    }

    if rapier_available {
        push_unique(&mut toolchain, LocalRuntimeToolchainFeature::Rapier);
    }

    if browser_automation_available {
        push_unique(&mut toolchain, LocalRuntimeToolchainFeature::BrowserAutomation);
    }

    toolchain
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
    let onnx_runtime_available = command_exists("onnxruntime") || command_exists("ort");
    let ffmpeg_available = command_exists("ffmpeg");
    let rapier_available = true;
    let browser_automation_available = command_exists("chrome") || command_exists("chromium") || command_exists("msedge");
    let native_graphics_backends = default_graphics_backends(gpu_available);
    let ai_execution_providers = default_ai_execution_providers(gpu_available, npu_available, onnx_runtime_available);
    let local_toolchain = default_toolchain(ffmpeg_available, rapier_available, browser_automation_available);
    let preferred_executor = if thermal_state == ThermalState::Critical || storage_pressure == StoragePressure::Critical {
        RuntimeExecutionTarget::Held
    } else if !native_graphics_backends.is_empty() || !ai_execution_providers.is_empty() {
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
        web_gpu_available: native_graphics_backends.contains(&NativeGraphicsBackend::WebGpu),
        web_nn_available: false,
        npu_available,
        windows_ml_available: cfg!(target_os = "windows") && npu_available,
        direct_ml_available: cfg!(target_os = "windows") && (gpu_available || npu_available),
        onnx_runtime_available,
        ffmpeg_available,
        rapier_available,
        browser_automation_available,
        native_graphics_backends,
        ai_execution_providers,
        local_toolchain,
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
