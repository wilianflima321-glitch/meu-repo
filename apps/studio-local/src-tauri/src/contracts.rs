use serde::{Deserialize, Serialize};

pub const STUDIO_LOCAL_CONTRACT_VERSION: u8 = 1;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum RuntimeExecutionTarget {
    LocalNative,
    LocalWorker,
    LocalMainSafe,
    CloudSandbox,
    Held,
}

impl RuntimeExecutionTarget {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::LocalNative => "local-native",
            Self::LocalWorker => "local-worker",
            Self::LocalMainSafe => "local-main-safe",
            Self::CloudSandbox => "cloud-sandbox",
            Self::Held => "held",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum RuntimeJobLane {
    AiLocalInference,
    MemoryIndexing,
    AssetImport,
    ViewportRender,
    BuildExport,
    BrowserOperator,
    FileSync,
    Playtest,
    RenderQueue,
}

impl RuntimeJobLane {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::AiLocalInference => "ai-local-inference",
            Self::MemoryIndexing => "memory-indexing",
            Self::AssetImport => "asset-import",
            Self::ViewportRender => "viewport-render",
            Self::BuildExport => "build-export",
            Self::BrowserOperator => "browser-operator",
            Self::FileSync => "file-sync",
            Self::Playtest => "playtest",
            Self::RenderQueue => "render-queue",
        }
    }

    pub fn is_heavy(self) -> bool {
        !matches!(self, Self::FileSync)
    }

    pub fn requires_human_approval(self) -> bool {
        matches!(self, Self::BrowserOperator | Self::BuildExport | Self::RenderQueue)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ThermalState {
    Unknown,
    Nominal,
    Warm,
    Critical,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum StoragePressure {
    Unknown,
    Ok,
    LowSpace,
    Critical,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum NativeGraphicsBackend {
    Vulkan,
    DirectX12,
    Metal,
    WebGpu,
    OpenGl,
}

impl NativeGraphicsBackend {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Vulkan => "vulkan",
            Self::DirectX12 => "directx12",
            Self::Metal => "metal",
            Self::WebGpu => "webgpu",
            Self::OpenGl => "opengl",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum NativeAiExecutionProvider {
    Cpu,
    Cuda,
    TensorRt,
    DirectMl,
    CoreMl,
    OpenVino,
    Qnn,
    Xnnpack,
    WebGpu,
    WebNn,
}

impl NativeAiExecutionProvider {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Cpu => "cpu",
            Self::Cuda => "cuda",
            Self::TensorRt => "tensorrt",
            Self::DirectMl => "directml",
            Self::CoreMl => "coreml",
            Self::OpenVino => "openvino",
            Self::Qnn => "qnn",
            Self::Xnnpack => "xnnpack",
            Self::WebGpu => "webgpu",
            Self::WebNn => "webnn",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum LocalRuntimeToolchainFeature {
    Ffmpeg,
    Ffprobe,
    Rapier,
    BrowserAutomation,
    AssetOptimizer,
    ShaderCompiler,
}

impl LocalRuntimeToolchainFeature {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Ffmpeg => "ffmpeg",
            Self::Ffprobe => "ffprobe",
            Self::Rapier => "rapier",
            Self::BrowserAutomation => "browser-automation",
            Self::AssetOptimizer => "asset-optimizer",
            Self::ShaderCompiler => "shader-compiler",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LocalRuntimeProbeReport {
    pub version: u8,
    pub generated_at: String,
    pub device_id: String,
    pub os: String,
    pub arch: String,
    pub cpu_logical_cores: usize,
    pub total_memory_mb: Option<u64>,
    pub available_memory_mb: Option<u64>,
    pub storage_free_mb: Option<u64>,
    pub gpu_available: bool,
    pub gpu_name: Option<String>,
    pub web_gpu_available: bool,
    pub web_nn_available: bool,
    pub npu_available: bool,
    pub windows_ml_available: bool,
    pub direct_ml_available: bool,
    pub onnx_runtime_available: bool,
    pub ffmpeg_available: bool,
    pub rapier_available: bool,
    pub browser_automation_available: bool,
    pub native_graphics_backends: Vec<NativeGraphicsBackend>,
    pub ai_execution_providers: Vec<NativeAiExecutionProvider>,
    pub local_toolchain: Vec<LocalRuntimeToolchainFeature>,
    pub thermal_state: ThermalState,
    pub storage_pressure: StoragePressure,
    pub preferred_executor: RuntimeExecutionTarget,
    pub signature: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RuntimeExecutionDecision {
    pub lane: RuntimeJobLane,
    pub target: RuntimeExecutionTarget,
    pub can_start: bool,
    pub requires_human_approval: bool,
    pub reason: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RuntimeJobRequest {
    pub version: u8,
    pub project_id: String,
    pub mission_id: String,
    pub lane: RuntimeJobLane,
    pub requested_target: RuntimeExecutionTarget,
    pub title: String,
    pub owner_agent: String,
    pub allowed_paths: Vec<String>,
    pub denied_paths: Vec<String>,
    pub evidence_required: Vec<String>,
    pub rollback_plan: String,
    pub max_cost_usd: f64,
    pub requires_human_approval: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum RuntimeJobState {
    Queued,
    Running,
    Held,
    NeedsApproval,
    Complete,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RuntimeJobStatus {
    pub version: u8,
    pub id: String,
    pub request: RuntimeJobRequest,
    pub state: RuntimeJobState,
    pub target: RuntimeExecutionTarget,
    pub progress: u8,
    pub compact_log: Vec<String>,
    pub evidence_refs: Vec<String>,
    pub blocker: Option<String>,
}
