//! wgpu WGSL device load — letter **gu**.
//!
//! First real Rust↔GPU step after gp: emit WGSL via
//! `aethel_kernel_rust::msl_wgsl_compiler` (Physical Intent fixture), then
//! headless wgpu Instance/Adapter/Device → `create_shader_module`.
//!
//! Soak proves: module creates on device when adapter available; invalid WGSL
//! fail-closed; same intent → same module label/hash. Honesty probe
//! `wgpuWgslDeviceLoadReady` is **distinct** from gp `mslWgslCompilerReady`
//! (never flip that probe). If no adapter: `wgpu_adapter_available: false` and
//! ready stays false — never fake success.
//!
//! **HELD:** full WebGPU product path · Metal/SPIR-V AAA · device submit/draw ·
//! Coins / Agones / Nanite / DLSS / Quic. J.11/J.12 STOPPED.

use aethel_kernel_rust::msl_wgsl_compiler::{CompileResult, MslWgslCompiler, ShaderIntent};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;

/// Fingerprint mix seed ("guwg").
const FP_SEED: u64 = 0x6775_7767;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelWgpuWgslDeviceLoadWireReport {
    /// Soak-gated honesty probe — **distinct** from `mslWgslCompilerReady`.
    pub wgpu_wgsl_device_load_ready: bool,
    /// True only when a real wgpu adapter was obtained (never invented).
    pub wgpu_adapter_available: bool,
    pub device_created: bool,
    pub intent_wgsl_emit_ok: bool,
    pub module_created: bool,
    pub invalid_wgsl_fail_closed: bool,
    pub same_intent_same_label: bool,
    pub same_intent_same_hash: bool,
    pub deterministic: bool,
    pub module_label: String,
    pub module_hash: u64,
    pub wgsl_len: u32,
    pub adapter_name: String,
    pub adapter_backend: String,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    /// Always false — create_shader_module ≠ product WebGPU path.
    pub full_webgpu_product_path_ready: bool,
    /// Always false — Metal/SPIR-V AAA remains HELD (gp honesty).
    pub full_metal_spirv_compiler_aaa_ready: bool,
    /// Always false — no queue submit / draw claimed.
    pub gpu_device_submit_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn fail_report(note: impl Into<String>) -> KernelWgpuWgslDeviceLoadWireReport {
    KernelWgpuWgslDeviceLoadWireReport {
        wgpu_wgsl_device_load_ready: false,
        wgpu_adapter_available: false,
        device_created: false,
        intent_wgsl_emit_ok: false,
        module_created: false,
        invalid_wgsl_fail_closed: false,
        same_intent_same_label: false,
        same_intent_same_hash: false,
        deterministic: false,
        module_label: String::new(),
        module_hash: 0,
        wgsl_len: 0,
        adapter_name: String::new(),
        adapter_backend: String::new(),
        distinct_from_peers_note: "distinct".into(),
        letter: "gu".into(),
        note: note.into(),
        full_webgpu_product_path_ready: false,
        full_metal_spirv_compiler_aaa_ready: false,
        gpu_device_submit_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        quic_ready: false,
    }
}

fn module_label_for(fingerprint: u64) -> String {
    format!("aethel-gu-gp-{fingerprint:016x}")
}

fn mix_hash(parts: &[u64]) -> u64 {
    let mut h = FP_SEED;
    for &p in parts {
        h ^= p.wrapping_mul(0x9E37_79B9_7F4A_7C15);
        h = h.rotate_left(17).wrapping_add(0xC2B2_AE3D_27D4_EB4F);
    }
    h
}

struct HeadlessGpu {
    device: wgpu::Device,
    adapter_name: String,
    adapter_backend: String,
}

fn try_request_headless_gpu() -> Option<HeadlessGpu> {
    let instance = wgpu::Instance::new(wgpu::InstanceDescriptor {
        backends: wgpu::Backends::all(),
        ..Default::default()
    });

    let adapter = pollster::block_on(async {
        if let Some(a) = instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::HighPerformance,
                compatible_surface: None,
                force_fallback_adapter: false,
            })
            .await
        {
            return Some(a);
        }
        if let Some(a) = instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::LowPower,
                compatible_surface: None,
                force_fallback_adapter: false,
            })
            .await
        {
            return Some(a);
        }
        instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::LowPower,
                compatible_surface: None,
                force_fallback_adapter: true,
            })
            .await
    })?;

    let info = adapter.get_info();
    let (device, _queue) = pollster::block_on(adapter.request_device(
        &wgpu::DeviceDescriptor {
            label: Some("Aethel gu headless WGSL load"),
            required_features: wgpu::Features::empty(),
            required_limits: wgpu::Limits::downlevel_webgl2_defaults()
                .using_resolution(adapter.limits()),
        },
        None,
    ))
    .ok()?;

    Some(HeadlessGpu {
        device,
        adapter_name: info.name,
        adapter_backend: format!("{:?}", info.backend),
    })
}

/// Create shader module; return Ok(()) only when validation error scope is empty.
fn try_create_shader_module(
    device: &wgpu::Device,
    label: &str,
    wgsl: &str,
) -> Result<(), String> {
    device.push_error_scope(wgpu::ErrorFilter::Validation);
    let _module = device.create_shader_module(wgpu::ShaderModuleDescriptor {
        label: Some(label),
        source: wgpu::ShaderSource::Wgsl(Cow::Borrowed(wgsl)),
    });
    match pollster::block_on(device.pop_error_scope()) {
        Some(err) => Err(err.to_string()),
        None => Ok(()),
    }
}

fn emit_fixture() -> Result<CompileResult, String> {
    MslWgslCompiler::compile_intent(ShaderIntent::FragmentAlbedo {
        r: 0.25,
        g: 0.50,
        b: 0.75,
    })
    .map_err(|e| e.to_string())
}

/// Run wgpu WGSL device-load soak (letter gu).
pub fn run_wgpu_wgsl_device_load_soak() -> KernelWgpuWgslDeviceLoadWireReport {
    let emit_a = match emit_fixture() {
        Ok(r) => r,
        Err(_) => {
            return fail_report(
                "gp intent→WGSL emit failed — wgpuWgslDeviceLoadReady stays false (distinct from the gp MSL/WGSL compiler's own ready field)",
            );
        }
    };
    let emit_b = match emit_fixture() {
        Ok(r) => r,
        Err(_) => {
            return fail_report(
                "gp intent→WGSL emit failed on second pass — wgpuWgslDeviceLoadReady stays false",
            );
        }
    };

    let intent_wgsl_emit_ok = !emit_a.wgsl.is_empty()
        && emit_a.wgsl.contains("@fragment")
        && emit_a.wgsl.contains("fn main");
    let same_intent_same_hash = emit_a.fingerprint == emit_b.fingerprint;
    let label_a = module_label_for(emit_a.fingerprint);
    let label_b = module_label_for(emit_b.fingerprint);
    let same_intent_same_label = label_a == label_b && !label_a.is_empty();
    let module_hash = mix_hash(&[emit_a.fingerprint, emit_a.wgsl.len() as u64]);

    let Some(gpu) = try_request_headless_gpu() else {
        // Honest skip: path shipped, device HELD when no adapter.
        return KernelWgpuWgslDeviceLoadWireReport {
            wgpu_wgsl_device_load_ready: false,
            wgpu_adapter_available: false,
            device_created: false,
            intent_wgsl_emit_ok,
            module_created: false,
            invalid_wgsl_fail_closed: false,
            same_intent_same_label,
            same_intent_same_hash,
            deterministic: same_intent_same_label && same_intent_same_hash,
            module_label: label_a,
            module_hash,
            wgsl_len: emit_a.wgsl.len() as u32,
            adapter_name: String::new(),
            adapter_backend: String::new(),
            letter: "gu".into(),
            note: "wgpu adapter unavailable — compile-from-string path shipped; device load HELD; wgpu_adapter_available false; wgpuWgslDeviceLoadReady stays false (never fake); distinct from the gp MSL/WGSL compiler's own ready field; full_webgpu_product_path_ready false; gpu_device_submit_ready false".into(),
            full_webgpu_product_path_ready: false,
            full_metal_spirv_compiler_aaa_ready: false,
            gpu_device_submit_ready: false,
            coins_ready: false,
            agones_ready: false,
            nanite_ready: false,
            dlss_ready: false,
            quic_ready: false,
            distinct_from_peers_note: "distinct".into(),
        };
    };

    let module_created = try_create_shader_module(&gpu.device, &label_a, &emit_a.wgsl).is_ok();
    // Second create with same label/hash path — deterministic label reuse.
    let module_b_ok = try_create_shader_module(&gpu.device, &label_b, &emit_b.wgsl).is_ok();

    let invalid_wgsl = "this is not valid wgsl @#$%";
    let invalid_wgsl_fail_closed =
        try_create_shader_module(&gpu.device, "aethel-gu-invalid", invalid_wgsl).is_err();

    let deterministic = same_intent_same_label && same_intent_same_hash && module_created && module_b_ok;
    let ready = intent_wgsl_emit_ok
        && module_created
        && module_b_ok
        && invalid_wgsl_fail_closed
        && same_intent_same_label
        && same_intent_same_hash
        && deterministic;

    let note = if ready {
        format!(
            "Desktop soak: gp Physical Intent→WGSL string → wgpu create_shader_module on headless device ({}/{}) — module ok + invalid WGSL fail-closed + same intent→same label/hash — wgpuWgslDeviceLoadReady true; wgpu_adapter_available true; full_webgpu_product_path_ready false; gpu_device_submit_ready false; distinct from the gp MSL/WGSL compiler's own ready field + gh wgslSurfaceNoiseKernelReady + gt gazeFoveatedReprojectionReady + gs strainAwareTexturingReady + prior probes",
            gpu.adapter_name, gpu.adapter_backend
        )
    } else {
        format!(
            "wgpu device present but soak failed (module_created={module_created} invalid_fail={invalid_wgsl_fail_closed} same_label={same_intent_same_label}) — wgpuWgslDeviceLoadReady stays false; adapter={}/{}",
            gpu.adapter_name, gpu.adapter_backend
        )
    };

    KernelWgpuWgslDeviceLoadWireReport {
        wgpu_wgsl_device_load_ready: ready,
        wgpu_adapter_available: true,
        device_created: true,
        intent_wgsl_emit_ok,
        module_created: module_created && module_b_ok,
        invalid_wgsl_fail_closed,
        same_intent_same_label,
        same_intent_same_hash,
        deterministic,
        module_label: label_a,
        module_hash,
        wgsl_len: emit_a.wgsl.len() as u32,
        adapter_name: gpu.adapter_name,
        adapter_backend: gpu.adapter_backend,
        letter: "gu".into(),
        note,
        full_webgpu_product_path_ready: false,
        full_metal_spirv_compiler_aaa_ready: false,
        gpu_device_submit_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        quic_ready: false,
            distinct_from_peers_note: "distinct".into(),
    }
}

/// Honesty probe — soak-gated `wgpuWgslDeviceLoadReady` (letter gu).
pub fn probe_wgpu_wgsl_device_load() -> KernelWgpuWgslDeviceLoadWireReport {
    let mut r = run_wgpu_wgsl_device_load_soak();
    if r.wgpu_adapter_available && r.wgpu_wgsl_device_load_ready {
        r.note = "wgpu WGSL device load probe (letter gu) — distinct from the gp MSL/WGSL compiler's own ready field, wgslSurfaceNoiseKernelReady, gazeFoveatedReprojectionReady, strainAwareTexturingReady, and probe_kernel_foundation; full_webgpu_product_path_ready HELD; gpu_device_submit_ready HELD".into();
    } else if !r.wgpu_adapter_available {
        r.note = "wgpu WGSL device load probe (letter gu) — adapter unavailable; wgpuWgslDeviceLoadReady false (honest); distinct from the gp MSL/WGSL compiler's own ready field; device HELD".into();
    } else {
        r.note = "wgpu WGSL device load probe (letter gu) — soak failed; wgpuWgslDeviceLoadReady false; distinct from the gp MSL/WGSL compiler's own ready field".into();
    }
    r
}

/// Tauri IPC — wgpu WGSL device load honesty.
#[tauri::command]
pub fn probe_wgpu_wgsl_device_load_cmd() -> KernelWgpuWgslDeviceLoadWireReport {
    probe_wgpu_wgsl_device_load()
}

/// Tauri IPC — run wgpu WGSL device load soak.
#[tauri::command]
pub fn run_kernel_wgpu_wgsl_device_load_soak_cmd() -> KernelWgpuWgslDeviceLoadWireReport {
    run_wgpu_wgsl_device_load_soak()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn soak_never_fakes_ready_without_adapter() {
        let r = run_wgpu_wgsl_device_load_soak();
        if !r.wgpu_adapter_available {
            assert!(!r.wgpu_wgsl_device_load_ready, "{r:?}");
            assert!(!r.module_created, "{r:?}");
            assert!(!r.device_created, "{r:?}");
        }
    }

    #[test]
    fn soak_gates_ready_only_when_device_path_proves() {
        let r = run_wgpu_wgsl_device_load_soak();
        assert!(!r.full_webgpu_product_path_ready);
        assert!(!r.gpu_device_submit_ready);
        assert!(!r.full_metal_spirv_compiler_aaa_ready);
        assert_eq!(r.letter, "gu");
        if r.wgpu_adapter_available {
            assert!(r.intent_wgsl_emit_ok, "{r:?}");
            assert!(r.same_intent_same_label, "{r:?}");
            assert!(r.same_intent_same_hash, "{r:?}");
            // Ready requires full soak; if adapter exists but validation fails, stay false.
            if r.wgpu_wgsl_device_load_ready {
                assert!(r.module_created, "{r:?}");
                assert!(r.invalid_wgsl_fail_closed, "{r:?}");
                assert!(r.device_created, "{r:?}");
            }
        } else {
            assert!(!r.wgpu_wgsl_device_load_ready, "{r:?}");
        }
    }

    #[test]
    fn probe_distinct_from_msl_wgsl_compiler_ready_field() {
        let r = probe_wgpu_wgsl_device_load();
        // Field name / probe identity must not be mslWgslCompilerReady.
        let json = serde_json::to_string(&r).expect("serialize");
        assert!(json.contains("wgpuWgslDeviceLoadReady"));
        assert!(!json.contains("mslWgslCompilerReady"));
    }

    #[test]
    fn module_label_deterministic_from_fingerprint() {
        let a = module_label_for(0xAABB_CCDD_EEFF_0011);
        let b = module_label_for(0xAABB_CCDD_EEFF_0011);
        assert_eq!(a, b);
        assert!(a.starts_with("aethel-gu-gp-"));
    }
}