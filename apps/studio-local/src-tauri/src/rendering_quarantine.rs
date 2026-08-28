//! Orphan `rendering/` quarantine honesty — G.% ladder top-10 #10.
//!
//! `apps/studio-local/src-tauri/src/rendering/` (PBR forward, Nanite compute,
//! bindless RT, shadow, skybox, gltf_loader, …) exists on disk but is **not**
//! `pub mod`-wired into `lib.rs` / product present. Dual stack vs secondary_winit
//! substrates must not be marketed as compiled AAA RHI.
//!
//! This module is the explicit fail-closed quarantine certificate:
//! - Documents orphan paths + compile status
//! - Never flips Nanite/Lumen/bindless/PBR AAA flags
//! - Does **not** `pub mod rendering` (would imply product wire without present path)
//!
//! **HELD:** `rendering_product_wired` · Nanite/Lumen/bindless AAA · WebView exclusive.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::time::Instant;

/// Canonical relative paths under `src-tauri/src/rendering/` (quarantine inventory).
pub const ORPHAN_RENDERING_ENTRIES: &[&str] = &[
    "rendering/mod.rs",
    "rendering/pbr_graphics.rs",
    "rendering/pbr_forward.wgsl",
    "rendering/shadow_pass.rs",
    "rendering/shadow.wgsl",
    "rendering/skybox.rs",
    "rendering/skybox.wgsl",
    "rendering/mesh.rs",
    "rendering/mesh_registry.rs",
    "rendering/gltf_loader.rs",
    "rendering/camera.rs",
    "rendering/light.rs",
    "rendering/texture.rs",
    "rendering/nanite_native_compute.rs",
    "rendering/nanite_compute.wgsl",
    "rendering/bindless_rt_native_compute.rs",
    "rendering/bindless_rt_compute.wgsl",
];

pub const RENDERING_QUARANTINE_REASON: &str =
    "src/rendering/* is orphaned: present on disk but not pub-mod-wired into lib.rs or product present; secondary_winit substrates are a separate stack — do not claim compiled AAA RHI";

const FP_SEED: u64 = 0x7271_7561; // "rqua"

fn hash_mix(mut h: u64, x: u64) -> u64 {
    h ^= x.wrapping_mul(0x9E37_79B9_7F4A_7C15);
    h = h.rotate_left(27).wrapping_mul(0x517C_C1B7_2722_0A95);
    h
}

/// Fail-closed honesty report for orphan rendering quarantine.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenderingQuarantineReport {
    /// True when inventory was scanned and quarantine policy asserted (not product wire).
    pub rendering_quarantine_documented: bool,
    /// Always false — orphan tree is not `pub mod` compiled into the lib.
    pub rendering_compile_wired: bool,
    /// Always false — no product present path owns this tree.
    pub rendering_product_wired: bool,
    pub orphan_entry_count: u32,
    pub orphan_entries_present: u32,
    pub orphan_entries_missing: u32,
    pub quarantine_reason: &'static str,
    pub soak_elapsed_ns: u128,
    pub evidence_kind: &'static str,
    pub evidence_fingerprint: u64,
    /// Fail-closed AAA / marketing.
    pub nanite_ready: bool,
    pub lumen_ready: bool,
    pub bindless_aaa_ready: bool,
    pub pbr_forward_aaa_ready: bool,
    pub unreal_rhi_parity_ready: bool,
    pub g3_code_depth_percent: u32,
}

pub const RQ_EVIDENCE_KIND: &str = "orphan_rendering_tree_quarantine_honesty";

fn studio_src_root() -> PathBuf {
    // Crate manifest dir is apps/studio-local/src-tauri
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("src")
}

fn count_orphan_presence(root: &Path) -> (u32, u32) {
    let mut present = 0u32;
    let mut missing = 0u32;
    for rel in ORPHAN_RENDERING_ENTRIES {
        let p = root.join(rel);
        if p.is_file() {
            present = present.saturating_add(1);
        } else {
            missing = missing.saturating_add(1);
        }
    }
    (present, missing)
}

/// Scan orphan `rendering/` inventory and emit fail-closed quarantine report.
///
/// Does **not** compile-wire the tree or claim AAA RHI.
pub fn run_rendering_quarantine_soak() -> RenderingQuarantineReport {
    let t0 = Instant::now();
    let root = studio_src_root();
    let (present, missing) = count_orphan_presence(&root);
    let total = ORPHAN_RENDERING_ENTRIES.len() as u32;
    let elapsed = t0.elapsed().as_nanos();

    // Quarantine is "documented" when we know the inventory and assert unwired.
    // Prefer present>0 (tree on disk) but still document if cleaned — fail-closed either way.
    let documented = total > 0 && elapsed > 0;
    let compile_wired = false;
    let product_wired = false;

    let mut fp = FP_SEED;
    fp = hash_mix(fp, u64::from(present));
    fp = hash_mix(fp, u64::from(missing));
    fp = hash_mix(fp, u64::from(compile_wired));
    fp = hash_mix(fp, u64::from(documented));

    RenderingQuarantineReport {
        rendering_quarantine_documented: documented,
        rendering_compile_wired: compile_wired,
        rendering_product_wired: product_wired,
        orphan_entry_count: total,
        orphan_entries_present: present,
        orphan_entries_missing: missing,
        quarantine_reason: RENDERING_QUARANTINE_REASON,
        soak_elapsed_ns: elapsed,
        evidence_kind: RQ_EVIDENCE_KIND,
        evidence_fingerprint: fp,
        nanite_ready: false,
        lumen_ready: false,
        bindless_aaa_ready: false,
        pbr_forward_aaa_ready: false,
        unreal_rhi_parity_ready: false,
        g3_code_depth_percent: 15,
    }
}

pub fn probe_rendering_quarantine() -> RenderingQuarantineReport {
    run_rendering_quarantine_soak()
}

/// Tauri IPC — orphan rendering quarantine honesty (no AAA flip).
#[tauri::command]
pub fn probe_rendering_quarantine_cmd() -> RenderingQuarantineReport {
    let mut r = run_rendering_quarantine_soak();
    r.rendering_compile_wired = false;
    r.rendering_product_wired = false;
    r.nanite_ready = false;
    r.lumen_ready = false;
    r.bindless_aaa_ready = false;
    r.pbr_forward_aaa_ready = false;
    r.unreal_rhi_parity_ready = false;
    r.g3_code_depth_percent = 15;
    r
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn quarantine_documents_orphan_tree_aaa_held() {
        let r = run_rendering_quarantine_soak();
        assert!(r.rendering_quarantine_documented);
        assert!(!r.rendering_compile_wired);
        assert!(!r.rendering_product_wired);
        assert_eq!(r.orphan_entry_count, ORPHAN_RENDERING_ENTRIES.len() as u32);
        // Tree should exist on disk in this workspace.
        assert!(r.orphan_entries_present > 0, "{r:?}");
        assert!(!r.nanite_ready);
        assert!(!r.lumen_ready);
        assert!(!r.bindless_aaa_ready);
        assert!(!r.pbr_forward_aaa_ready);
        assert!(!r.unreal_rhi_parity_ready);
        assert_eq!(r.g3_code_depth_percent, 15);
        assert_eq!(r.evidence_kind, RQ_EVIDENCE_KIND);
        assert_eq!(r.quarantine_reason, RENDERING_QUARANTINE_REASON);
    }

    #[test]
    fn probe_never_claims_product_wire() {
        let r = probe_rendering_quarantine();
        assert!(!r.rendering_product_wired);
        assert!(!r.rendering_compile_wired);
    }
}
