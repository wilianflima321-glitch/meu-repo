//! WASM Shield — sandbox instantiate + Law #48 host-PTY deny (Onda M deepen).
//!
//! Real `wasmtime` compile+instantiate of a fixed ABI fixture module, Instant-
//! measured soak, and fail-closed agent host-PTY evidence. Marketplace / V8+winit
//! product distribution stays **HELD**.
//!
//! **Does not** flip `GAS_60HZ_BINARY_IPC_READY` or claim Unreal WASM sandbox AAA.

use serde::{Deserialize, Serialize};
use std::time::Instant;
use wasmtime::{Engine, Linker, Module, Store};

/// Law #48 deny code — parity with `desktop/agent_shell_acl.rs` / web shield.
pub const AGENT_HOST_PTY_DENY_CODE: &str = "AGENT_HOST_PTY_DENIED";
pub const LAW_AGENT_SHELL_POLICY: u32 = 48;
/// Stable ABI tag for fixture negotiation evidence.
pub const AETHEL_WASM_SHIELD_ABI: &str = "aethel-wasm-shield/1";

/// Minimal WASM: `(module (func (export "run") (result i32) i32.const 42))`
pub const SHIELD_FIXTURE_WASM: &[u8] = &[
    0x00, 0x61, 0x73, 0x6d, // \0asm
    0x01, 0x00, 0x00, 0x00, // version 1
    0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7f, // typesection: () -> i32
    0x03, 0x02, 0x01, 0x00, // function section
    0x07, 0x07, 0x01, 0x03, 0x72, 0x75, 0x6e, 0x00, 0x00, // export "run"
    0x0a, 0x06, 0x01, 0x04, 0x00, 0x41, 0x2a, 0x0b, // code: i32.const 42; end
];

const FP_SEED: u64 = 0x7773_6864; // "wshd"

fn hash_mix(mut h: u64, x: u64) -> u64 {
    h ^= x.wrapping_mul(0x9E37_79B9_7F4A_7C15);
    h = h.rotate_left(27).wrapping_mul(0x517C_C1B7_2722_0A95);
    h
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WasmShieldCallerMeta {
    pub caller_kind: Option<String>,
    pub agent_tool: Option<String>,
    pub agent_id: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WasmShieldCallerKind {
    User,
    Agent,
}

pub fn detect_wasm_shield_caller(meta: &WasmShieldCallerMeta) -> WasmShieldCallerKind {
    let kind = meta
        .caller_kind
        .as_deref()
        .map(str::trim)
        .map(str::to_ascii_lowercase)
        .unwrap_or_default();
    if kind == "agent" {
        return WasmShieldCallerKind::Agent;
    }
    if meta
        .agent_tool
        .as_deref()
        .map(str::trim)
        .is_some_and(|v| !v.is_empty())
    {
        return WasmShieldCallerKind::Agent;
    }
    if meta
        .agent_id
        .as_deref()
        .map(str::trim)
        .is_some_and(|v| !v.is_empty())
    {
        return WasmShieldCallerKind::Agent;
    }
    WasmShieldCallerKind::User
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WasmShieldPtyDenyEvidence {
    pub allowed: bool,
    pub status: &'static str,
    pub law: u32,
    pub code: &'static str,
    pub caller_kind: &'static str,
    pub requested_target: &'static str,
    pub reason: &'static str,
    pub placebo_forbidden: bool,
}

impl WasmShieldPtyDenyEvidence {
    pub fn agent_host_pty_blocked() -> Self {
        Self {
            allowed: false,
            status: "blocked",
            law: LAW_AGENT_SHELL_POLICY,
            code: AGENT_HOST_PTY_DENY_CODE,
            caller_kind: "agent",
            requested_target: "desktop-native-pty",
            reason: "Law #48 AgentShellPolicy: agents must never spawn host OS PTY; WASM Shield sandbox only.",
            placebo_forbidden: true,
        }
    }
}

/// Fail-closed host PTY for agent callers (sandbox instantiate path only).
pub fn enforce_wasm_shield_no_host_pty(
    meta: &WasmShieldCallerMeta,
) -> Result<(), WasmShieldPtyDenyEvidence> {
    match detect_wasm_shield_caller(meta) {
        WasmShieldCallerKind::User => Ok(()),
        WasmShieldCallerKind::Agent => Err(WasmShieldPtyDenyEvidence::agent_host_pty_blocked()),
    }
}

/// Result of one real wasmtime instantiate + `run` export call.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WasmShieldInstantiateEvidence {
    pub compiled: bool,
    pub instantiated: bool,
    pub export_called: bool,
    pub export_value: i32,
    pub abi: &'static str,
    pub module_bytes: usize,
    pub compile_ns: u128,
    pub instantiate_ns: u128,
    pub call_ns: u128,
}

/// Compile + instantiate fixture + call `run` → 42.
pub fn instantiate_shield_fixture() -> Result<WasmShieldInstantiateEvidence, String> {
    let engine = Engine::default();
    let t_compile = Instant::now();
    let module = Module::new(&engine, SHIELD_FIXTURE_WASM)
        .map_err(|e| format!("wasm shield compile failed: {e}"))?;
    let compile_ns = t_compile.elapsed().as_nanos();

    let linker: Linker<()> = Linker::new(&engine);
    let mut store = Store::new(&engine, ());
    let t_inst = Instant::now();
    let instance = linker
        .instantiate(&mut store, &module)
        .map_err(|e| format!("wasm shield instantiate failed: {e}"))?;
    let instantiate_ns = t_inst.elapsed().as_nanos();

    let t_call = Instant::now();
    let run = instance
        .get_typed_func::<(), i32>(&mut store, "run")
        .map_err(|e| format!("wasm shield missing export run: {e}"))?;
    let value = run
        .call(&mut store, ())
        .map_err(|e| format!("wasm shield run() trapped: {e}"))?;
    let call_ns = t_call.elapsed().as_nanos();

    if value != 42 {
        return Err(format!("wasm shield ABI mismatch: expected 42, got {value}"));
    }

    Ok(WasmShieldInstantiateEvidence {
        compiled: true,
        instantiated: true,
        export_called: true,
        export_value: value,
        abi: AETHEL_WASM_SHIELD_ABI,
        module_bytes: SHIELD_FIXTURE_WASM.len(),
        compile_ns,
        instantiate_ns,
        call_ns,
    })
}

/// Instant-measured WASM Shield soak report.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WasmShieldSoakReport {
    pub wasm_shield_instantiate_ready: bool,
    pub abi_export_ok: bool,
    pub agent_host_pty_denied: bool,
    pub user_lane_ok: bool,
    pub soak_elapsed_ns: u128,
    pub compile_ns: u128,
    pub instantiate_ns: u128,
    pub call_ns: u128,
    pub export_value: i32,
    pub evidence_kind: &'static str,
    pub evidence_fingerprint: u64,
    /// Fail-closed product / marketplace claims.
    pub marketplace_ready: bool,
    pub v8_winit_host_ready: bool,
    pub wasm_sandbox_aaa_ready: bool,
    pub gas_60hz_binary_ipc_ready: bool,
}

pub const WSHIELD_EVIDENCE_KIND: &str = "wasmtime_fixture_instantiate_abi_pty_deny";

/// Run Instant soak: real instantiate + Law #48 agent PTY deny evidence.
pub fn run_wasm_shield_soak() -> WasmShieldSoakReport {
    let t0 = Instant::now();
    let inst = instantiate_shield_fixture();
    let agent_denied = enforce_wasm_shield_no_host_pty(&WasmShieldCallerMeta {
        caller_kind: Some("agent".into()),
        agent_tool: Some("fusion.tool".into()),
        agent_id: Some("run-1".into()),
    })
    .is_err();
    let user_ok = enforce_wasm_shield_no_host_pty(&WasmShieldCallerMeta {
        caller_kind: Some("user".into()),
        ..Default::default()
    })
    .is_ok();

    let elapsed = t0.elapsed().as_nanos();
    match inst {
        Ok(ev) => {
            let abi_ok = ev.export_called && ev.export_value == 42 && ev.instantiated;
            let ready = abi_ok && agent_denied && user_ok && elapsed > 0;
            let mut fp = FP_SEED;
            fp = hash_mix(fp, ev.export_value as u64);
            fp = hash_mix(fp, ev.compile_ns as u64);
            fp = hash_mix(fp, u64::from(agent_denied));
            fp = hash_mix(fp, u64::from(ready));
            WasmShieldSoakReport {
                wasm_shield_instantiate_ready: ready,
                abi_export_ok: abi_ok,
                agent_host_pty_denied: agent_denied,
                user_lane_ok: user_ok,
                soak_elapsed_ns: elapsed,
                compile_ns: ev.compile_ns,
                instantiate_ns: ev.instantiate_ns,
                call_ns: ev.call_ns,
                export_value: ev.export_value,
                evidence_kind: WSHIELD_EVIDENCE_KIND,
                evidence_fingerprint: fp,
                marketplace_ready: false,
                v8_winit_host_ready: false,
                wasm_sandbox_aaa_ready: false,
                gas_60hz_binary_ipc_ready: false,
            }
        }
        Err(_) => WasmShieldSoakReport {
            wasm_shield_instantiate_ready: false,
            abi_export_ok: false,
            agent_host_pty_denied: agent_denied,
            user_lane_ok: user_ok,
            soak_elapsed_ns: elapsed,
            compile_ns: 0,
            instantiate_ns: 0,
            call_ns: 0,
            export_value: 0,
            evidence_kind: WSHIELD_EVIDENCE_KIND,
            evidence_fingerprint: FP_SEED,
            marketplace_ready: false,
            v8_winit_host_ready: false,
            wasm_sandbox_aaa_ready: false,
            gas_60hz_binary_ipc_ready: false,
        },
    }
}

pub fn probe_wasm_shield() -> WasmShieldSoakReport {
    run_wasm_shield_soak()
}

/// Tauri IPC — Instant WASM Shield soak (marketplace / V8 still HELD).
#[tauri::command]
pub fn probe_wasm_shield_cmd() -> WasmShieldSoakReport {
    run_wasm_shield_soak()
}

/// Tauri IPC — agent host-PTY deny probe (Law #48 evidence).
#[tauri::command]
pub fn wasm_shield_agent_pty_deny_cmd(meta: WasmShieldCallerMeta) -> Result<(), String> {
    enforce_wasm_shield_no_host_pty(&meta).map_err(|e| {
        serde_json::to_string(&e).unwrap_or_else(|_| AGENT_HOST_PTY_DENY_CODE.to_string())
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fixture_instantiates_and_returns_42() {
        let ev = instantiate_shield_fixture().expect("instantiate");
        assert!(ev.compiled && ev.instantiated && ev.export_called);
        assert_eq!(ev.export_value, 42);
        assert_eq!(ev.abi, AETHEL_WASM_SHIELD_ABI);
        assert_eq!(ev.module_bytes, SHIELD_FIXTURE_WASM.len());
    }

    #[test]
    fn agent_host_pty_denied_user_allowed() {
        let agent = WasmShieldCallerMeta {
            caller_kind: Some("agent".into()),
            ..Default::default()
        };
        let err = enforce_wasm_shield_no_host_pty(&agent).unwrap_err();
        assert_eq!(err.code, AGENT_HOST_PTY_DENY_CODE);
        assert!(!err.allowed);
        assert!(enforce_wasm_shield_no_host_pty(&WasmShieldCallerMeta::default()).is_ok());
    }

    #[test]
    fn soak_ready_marketplace_held() {
        let r = run_wasm_shield_soak();
        assert!(r.wasm_shield_instantiate_ready, "{r:?}");
        assert!(r.abi_export_ok);
        assert!(r.agent_host_pty_denied);
        assert!(r.user_lane_ok);
        assert!(!r.marketplace_ready);
        assert!(!r.v8_winit_host_ready);
        assert!(!r.wasm_sandbox_aaa_ready);
        assert!(!r.gas_60hz_binary_ipc_ready);
        assert_eq!(r.evidence_kind, WSHIELD_EVIDENCE_KIND);
    }
}
