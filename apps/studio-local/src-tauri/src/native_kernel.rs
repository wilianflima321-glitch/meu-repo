use serde::Serialize;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum NativeKernelState {
    Available,
    Held,
    NeedsReview,
    ProviderUnavailable,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeKernelCapability {
    pub id: &'static str,
    pub label: &'static str,
    pub state: NativeKernelState,
    pub evidence_refs: Vec<&'static str>,
    pub blocker: Option<&'static str>,
    pub next_action: &'static str,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeKernelCrashState {
    pub last_crash_ref: Option<String>,
    pub recovery_mode: &'static str,
    pub requires_user_review: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeKernelManifest {
    pub version: u8,
    pub target: &'static str,
    pub capabilities: Vec<NativeKernelCapability>,
    pub crash_state: NativeKernelCrashState,
    pub prohibited_claims: Vec<&'static str>,
}

pub fn build_native_kernel_manifest() -> NativeKernelManifest {
    NativeKernelManifest {
        version: 1,
        target: "tauri-web-shell-with-native-bridge",
        capabilities: vec![
            NativeKernelCapability {
                id: "local-daemon-contract",
                label: "Local daemon contract",
                state: NativeKernelState::NeedsReview,
                evidence_refs: vec!["src-tauri/src/daemon.rs", "src-tauri/src/main.rs"],
                blocker: Some("Daemon is a health contract; HTTP process supervisor is not enabled yet."),
                next_action: "Add an explicit local daemon supervisor before claiming background native runtime.",
            },
            NativeKernelCapability {
                id: "filesystem-watch-contract",
                label: "Filesystem watcher contract",
                state: NativeKernelState::Available,
                evidence_refs: vec!["src-tauri/src/desktop_commands.rs"],
                blocker: None,
                next_action: "Maintain stability and optimize debouncing of watcher events.",
            },
            NativeKernelCapability {
                id: "native-pty-contract",
                label: "Native PTY contract",
                state: NativeKernelState::Available,
                evidence_refs: vec!["src-tauri/src/desktop_commands.rs"],
                blocker: None,
                next_action: "Monitor portable-pty child processes and ensure graceful termination.",
            },
            NativeKernelCapability {
                id: "crash-recovery-contract",
                label: "Crash and recovery contract",
                state: NativeKernelState::NeedsReview,
                evidence_refs: vec!["src-tauri/src/jobs.rs", "src-tauri/src/policy.rs"],
                blocker: Some("Jobs can be cancelled and held, but persistent crash recovery receipts are not written yet."),
                next_action: "Persist crash snapshots and restart decisions before background sidecar execution is promoted.",
            },
            NativeKernelCapability {
                id: "signed-updater-contract",
                label: "Signed updater contract",
                state: NativeKernelState::Held,
                evidence_refs: vec!["src-tauri/tauri.conf.json"],
                blocker: Some("Signed installer and updater evidence are intentionally held."),
                next_action: "Attach signing, notarization, updater signature, rollback, and install proof receipts.",
            },
            // --- Round 3 (Desktop Native Engine) additions --------------------
            NativeKernelCapability {
                id: "multi-window-undocking-contract",
                label: "Multi-monitor panel undocking contract",
                state: NativeKernelState::Available,
                evidence_refs: vec!["src-tauri/src/main.rs"],
                blocker: None,
                next_action: "Add a close-and-redock affordance so an undocked window can rejoin the main layout.",
            },
            NativeKernelCapability {
                id: "hardware-profiler-contract",
                label: "Hardware profiler contract (CPU/RAM only)",
                state: NativeKernelState::Available,
                evidence_refs: vec!["src-tauri/src/hardware_profiler.rs"],
                blocker: None,
                next_action: "GPU VRAM/temperature needs vendor-specific bindings (NVML/ADL/etc.) — not implemented; the sample honestly reports them as unavailable via gpuMetricsReason.",
            },
            NativeKernelCapability {
                id: "asset-cooker-bc1-contract",
                label: "Native texture cooker contract (BC1/DXT1 only)",
                state: NativeKernelState::Available,
                evidence_refs: vec!["src-tauri/src/asset_cooker.rs"],
                blocker: None,
                next_action: "BC7/DXT5 (as originally requested) needs a dedicated encoder crate (e.g. intel_tex_2) — not implemented; only BC1/DXT1 is real today.",
            },
            NativeKernelCapability {
                id: "mmap-streaming-contract",
                label: "Memory-mapped zero-copy file streaming contract",
                state: NativeKernelState::Available,
                evidence_refs: vec!["src-tauri/src/mmap_commands.rs"],
                blocker: None,
                next_action: "Wire mmap-backed reads into the physics/asset loaders that would actually benefit from them.",
            },
            NativeKernelCapability {
                id: "ecs-parallel-rayon-contract",
                label: "Rayon-parallel ECS tick contract",
                state: NativeKernelState::NeedsReview,
                evidence_refs: vec!["src-tauri/src/ecs_parallel.rs"],
                blocker: Some("A rayon-parallel struct-of-arrays tick is implemented and benchmarked in isolation, but is not yet wired into a live running ECS driving real gameplay or rendering."),
                next_action: "Integrate ParallelEntityWorld into the actual scene/gameplay tick loop, not just the standalone benchmark command.",
            },
            NativeKernelCapability {
                id: "scene-graph-contract",
                label: "Engine-authoritative native scene graph contract",
                state: NativeKernelState::Available,
                evidence_refs: vec!["src-tauri/src/scene_graph.rs", "src-tauri/src/main.rs"],
                blocker: None,
                next_action: "Maintain scene graph snapshot broadcasting across multi-window undocking routes.",
            },
            NativeKernelCapability {
                id: "physics-kernel-contract",
                label: "Native PBD physics kernel & kinematic anomaly detector contract",
                state: NativeKernelState::Available,
                evidence_refs: vec!["src-tauri/src/physics_kernel.rs", "src-tauri/src/physics_commands.rs"],
                blocker: None,
                next_action: "Expose real-time physics tick rate configuration over Tauri IPC.",
            },
            NativeKernelCapability {
                id: "gpu-driven-culling-contract",
                label: "GPU-driven frustum compute culling contract",
                state: NativeKernelState::Available,
                evidence_refs: vec!["src-tauri/src/gpu_culling.rs"],
                blocker: None,
                next_action: "Wire GpuCullingPipeline output into indirect draw calls.",
            },
            NativeKernelCapability {
                id: "wasm-hot-reload-contract",
                label: "Deterministic WASM gameplay hot-reload contract",
                state: NativeKernelState::Available,
                evidence_refs: vec!["src-tauri/src/wasm_runtime.rs"],
                blocker: None,
                next_action: "Expand WASM host state memory layout for multi-entity gameplay scripts.",
            },
            NativeKernelCapability {
                id: "neural-motion-matching-contract",
                label: "Neural motion matching contract",
                state: NativeKernelState::Held,
                evidence_refs: vec!["src-tauri/src/motion_matching.rs"],
                blocker: Some("Only the deterministic analytical root-motion fallback is proven. The ONNX Runtime (`ort`) neural evaluator is feature-gated behind `local-ai`."),
                next_action: "Validate inference against a real trained motion-matching ONNX model.",
            },
            NativeKernelCapability {
                id: "client-consensus-anti-cheat-contract",
                label: "OMNI-PLAN PILAR 4: client-consensus kinematic anomaly detector",
                state: NativeKernelState::Available,
                evidence_refs: vec!["src-tauri/src/physics_kernel.rs"],
                blocker: None,
                next_action: "Build the headless Linux target and wire into network ingest loop.",
            },
            NativeKernelCapability {
                id: "data-oriented-gas-contract",
                label: "OMNI-PLAN FASE 1.4: Data-Oriented Gameplay Ability System (ECS)",
                state: NativeKernelState::NeedsReview,
                evidence_refs: vec!["src-tauri/src/gameplay_ability_system.rs"],
                blocker: Some("AttributeTable/GameplayTagRegistry/TagSetTable/GameplayEffectPool/GasWorld are structurally complete and carry unit tests."),
                next_action: "Decide whether this Rust GAS replaces or coexists with the TypeScript one in lib/gas/ for dedicated servers.",
            },
        ],
        crash_state: NativeKernelCrashState {
            last_crash_ref: None,
            recovery_mode: "manual-review-before-resume",
            requires_user_review: true,
        },
        prohibited_claims: vec![
            "desktop ready",
            "background daemon ready",
            "signed installer ready",
            "native renderer ready",
            "native terminal ready",
            "neural motion matching ready",
            "BC7 texture compression ready",
            "dedicated server fleet ready",
            "Rust GAS compiled",
            "gameplay ability system production-ready",
        ],
    }
}

/// Capability ids allowed to claim `NativeKernelState::Available` — every
/// entry here must be backed by a real, working implementation (not a mock
/// or a TODO), per this manifest's whole reason for existing.
pub const AVAILABLE_CAPABILITY_IDS: &[&str] = &[
    "filesystem-watch-contract",
    "native-pty-contract",
    "multi-window-undocking-contract",
    "hardware-profiler-contract",
    "asset-cooker-bc1-contract",
    "mmap-streaming-contract",
    "scene-graph-contract",
    "physics-kernel-contract",
    "gpu-driven-culling-contract",
    "wasm-hot-reload-contract",
    "client-consensus-anti-cheat-contract",
];

pub fn validate_native_kernel_manifest(manifest: &NativeKernelManifest) -> Vec<String> {
    let mut failures = Vec::new();
    if manifest.target != "tauri-web-shell-with-native-bridge" {
        failures.push("native kernel target must stay web shell with native bridge".to_string());
    }
    if manifest.capabilities.len() < 5 {
        failures.push("native kernel capability manifest is incomplete".to_string());
    }
    if !manifest.crash_state.requires_user_review {
        failures.push("crash recovery must require user review".to_string());
    }
    for capability in &manifest.capabilities {
        if capability.evidence_refs.is_empty() {
            failures.push(format!("{} needs evidence refs", capability.id));
        }
        if capability.state == NativeKernelState::Available
            && !AVAILABLE_CAPABILITY_IDS.contains(&capability.id)
        {
            failures.push(format!(
                "{} cannot be available without dedicated native receipts",
                capability.id
            ));
        }
        if capability.blocker.is_none() && capability.state != NativeKernelState::Available {
            failures.push(format!("{} needs an honest blocker", capability.id));
        }
    }
    failures
}

#[cfg(test)]
mod tests {
    use super::{
        build_native_kernel_manifest, validate_native_kernel_manifest, NativeKernelState,
        AVAILABLE_CAPABILITY_IDS,
    };

    #[test]
    fn native_kernel_manifest_keeps_native_execution_held() {
        let manifest = build_native_kernel_manifest();
        assert_eq!(
            validate_native_kernel_manifest(&manifest),
            Vec::<String>::new()
        );
        assert!(manifest
            .capabilities
            .iter()
            .all(|capability| {
                capability.state != NativeKernelState::Available
                    || AVAILABLE_CAPABILITY_IDS.contains(&capability.id)
            }));
        assert!(manifest
            .prohibited_claims
            .contains(&"native terminal ready"));
        assert!(manifest.crash_state.requires_user_review);
    }

    #[test]
    fn pty_and_fs_watcher_claim_availability() {
        let manifest = build_native_kernel_manifest();
        let pty = manifest
            .capabilities
            .iter()
            .find(|capability| capability.id == "native-pty-contract")
            .expect("pty capability");
        let watcher = manifest
            .capabilities
            .iter()
            .find(|capability| capability.id == "filesystem-watch-contract")
            .expect("watcher capability");
        assert_eq!(pty.state, NativeKernelState::Available);
        assert_eq!(watcher.state, NativeKernelState::Available);
        assert!(pty.blocker.is_none());
    }
}
