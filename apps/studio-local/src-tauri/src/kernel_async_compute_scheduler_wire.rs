//! R2-D — Async Compute Scheduler parity wire (Vanguarda P3, letter kt).
//!
//! Expõe o substrate [`aethel_kernel_rust::async_compute_scheduler`] na
//! superfície IPC do Studio Local — probe honesto (medido, nunca hardcoded) +
//! soak determinístico de 256 frames do hot loop. `wire_on_surface` é um
//! self-check real: `true` somente quando ambos os comandos desta wire existem
//! no `IPC_ACL_REGISTRY` (`probe_async_compute_scheduler_cmd` +
//! `run_kernel_async_compute_scheduler_soak_cmd`). Flags
//! `async_compute_aaa_ready` / `vulkan_async_compute_aaa_ready` /
//! `dx12_async_compute_aaa_ready` / `metal_aaa_ready` sempre HELD — esta wire
//! prova o agendamento de compute com dependências (waves, fence timeline,
//! engine overlap, backing ring), não um shipment Vulkan/DX12/Metal.

use aethel_kernel_rust::async_compute_scheduler::{
    probe_async_compute_scheduler, run_async_compute_scheduler_soak,
    AsyncComputeSchedulerSoakReport,
};
use serde::Serialize;

/// Reporte da wire — espelha o soak do kernel em camelCase + `wire_on_surface`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KernelAsyncComputeSchedulerWireReport {
    pub async_compute_scheduler_ready: bool,
    pub total_jobs: u32,
    pub critical_path: u32,
    pub waves_used: u32,
    pub overlap_waves: u32,
    pub overlap_jobs: u32,
    pub overlap_ratio: f32,
    pub peak_wave_width: u32,
    pub dependency_edges_checked: u32,
    pub dependency_edges_violated: u32,
    pub fence_timeline_contiguous: bool,
    pub compute_peak_inflight: u32,
    pub transfer_peak_inflight: u32,
    pub bytes_resident: u64,
    pub bytes_capacity: u64,
    pub buffer_reuse_jobs: u32,
    pub frames_submitted: u32,
    pub zero_alloc_preserved: bool,
    pub deterministic: bool,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub async_compute_aaa_ready: bool,
    pub vulkan_async_compute_aaa_ready: bool,
    pub dx12_async_compute_aaa_ready: bool,
    pub metal_aaa_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
    pub wire_on_surface: bool,
}

fn to_report(
    r: AsyncComputeSchedulerSoakReport,
    wire_on_surface: bool,
) -> KernelAsyncComputeSchedulerWireReport {
    KernelAsyncComputeSchedulerWireReport {
        async_compute_scheduler_ready: r.async_compute_scheduler_ready,
        total_jobs: r.total_jobs,
        critical_path: r.critical_path,
        waves_used: r.waves_used,
        overlap_waves: r.overlap_waves,
        overlap_jobs: r.overlap_jobs,
        overlap_ratio: r.overlap_ratio,
        peak_wave_width: r.peak_wave_width,
        dependency_edges_checked: r.dependency_edges_checked,
        dependency_edges_violated: r.dependency_edges_violated,
        fence_timeline_contiguous: r.fence_timeline_contiguous,
        compute_peak_inflight: r.compute_peak_inflight,
        transfer_peak_inflight: r.transfer_peak_inflight,
        bytes_resident: r.bytes_resident,
        bytes_capacity: r.bytes_capacity,
        buffer_reuse_jobs: r.buffer_reuse_jobs,
        frames_submitted: r.frames_submitted,
        zero_alloc_preserved: r.zero_alloc_preserved,
        deterministic: r.deterministic,
        evidence_kind: r.evidence_kind.to_string(),
        evidence_fingerprint: r.evidence_fingerprint,
        async_compute_aaa_ready: r.async_compute_aaa_ready,
        vulkan_async_compute_aaa_ready: r.vulkan_async_compute_aaa_ready,
        dx12_async_compute_aaa_ready: r.dx12_async_compute_aaa_ready,
        metal_aaa_ready: r.metal_aaa_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        quic_ready: r.quic_ready,
        wire_on_surface,
    }
}

/// Probe honesto — `wire_on_surface` é medido contra o `IPC_ACL_REGISTRY` real.
pub fn probe_async_compute_scheduler_wire() -> KernelAsyncComputeSchedulerWireReport {
    let wire_on_surface =
        crate::ipc_surface::acl_for("probe_async_compute_scheduler_cmd").is_some()
            && crate::ipc_surface::acl_for("run_kernel_async_compute_scheduler_soak_cmd").is_some();
    to_report(probe_async_compute_scheduler(), wire_on_surface)
}

/// Comando Tauri do probe (Public, non hot-path — via `register_commands!`).
#[tauri::command]
pub fn probe_async_compute_scheduler_cmd() -> KernelAsyncComputeSchedulerWireReport {
    probe_async_compute_scheduler_wire()
}

/// Reporte do soak — sem `wire_on_surface` (puro do kernel).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KernelAsyncComputeSchedulerSoakWireReport {
    pub async_compute_scheduler_ready: bool,
    pub total_jobs: u32,
    pub critical_path: u32,
    pub waves_used: u32,
    pub overlap_waves: u32,
    pub overlap_jobs: u32,
    pub overlap_ratio: f32,
    pub peak_wave_width: u32,
    pub dependency_edges_checked: u32,
    pub dependency_edges_violated: u32,
    pub fence_timeline_contiguous: bool,
    pub compute_peak_inflight: u32,
    pub transfer_peak_inflight: u32,
    pub bytes_resident: u64,
    pub bytes_capacity: u64,
    pub buffer_reuse_jobs: u32,
    pub frames_submitted: u32,
    pub zero_alloc_preserved: bool,
    pub deterministic: bool,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub async_compute_aaa_ready: bool,
    pub vulkan_async_compute_aaa_ready: bool,
    pub dx12_async_compute_aaa_ready: bool,
    pub metal_aaa_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
}

fn soak_to_wire(r: AsyncComputeSchedulerSoakReport) -> KernelAsyncComputeSchedulerSoakWireReport {
    KernelAsyncComputeSchedulerSoakWireReport {
        async_compute_scheduler_ready: r.async_compute_scheduler_ready,
        total_jobs: r.total_jobs,
        critical_path: r.critical_path,
        waves_used: r.waves_used,
        overlap_waves: r.overlap_waves,
        overlap_jobs: r.overlap_jobs,
        overlap_ratio: r.overlap_ratio,
        peak_wave_width: r.peak_wave_width,
        dependency_edges_checked: r.dependency_edges_checked,
        dependency_edges_violated: r.dependency_edges_violated,
        fence_timeline_contiguous: r.fence_timeline_contiguous,
        compute_peak_inflight: r.compute_peak_inflight,
        transfer_peak_inflight: r.transfer_peak_inflight,
        bytes_resident: r.bytes_resident,
        bytes_capacity: r.bytes_capacity,
        buffer_reuse_jobs: r.buffer_reuse_jobs,
        frames_submitted: r.frames_submitted,
        zero_alloc_preserved: r.zero_alloc_preserved,
        deterministic: r.deterministic,
        evidence_kind: r.evidence_kind.to_string(),
        evidence_fingerprint: r.evidence_fingerprint,
        async_compute_aaa_ready: r.async_compute_aaa_ready,
        vulkan_async_compute_aaa_ready: r.vulkan_async_compute_aaa_ready,
        dx12_async_compute_aaa_ready: r.dx12_async_compute_aaa_ready,
        metal_aaa_ready: r.metal_aaa_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        quic_ready: r.quic_ready,
    }
}

/// Comando Tauri do soak determinístico (256 frames do hot loop).
#[tauri::command]
pub fn run_kernel_async_compute_scheduler_soak_cmd(
) -> KernelAsyncComputeSchedulerSoakWireReport {
    soak_to_wire(run_async_compute_scheduler_soak())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_probe_reports_live_async_compute_scheduler_honestly() {
        let r = probe_async_compute_scheduler_wire();
        // Honest self-check: os dois comandos desta wire estão no IPC_ACL_REGISTRY.
        assert!(r.wire_on_surface, "probe + soak cmds must be on the IPC surface");
        // O readiness é medido do substrate real, nunca hardcoded.
        assert_eq!(
            r.async_compute_scheduler_ready,
            probe_async_compute_scheduler().async_compute_scheduler_ready
        );
        assert_eq!(
            r.evidence_fingerprint,
            probe_async_compute_scheduler().evidence_fingerprint
        );
        assert_eq!(
            r.critical_path,
            probe_async_compute_scheduler().critical_path
        );
    }

    #[test]
    fn wire_probe_never_claims_aaa_readiness() {
        let r = probe_async_compute_scheduler_wire();
        assert!(
            !r.async_compute_aaa_ready
                && !r.vulkan_async_compute_aaa_ready
                && !r.dx12_async_compute_aaa_ready
                && !r.metal_aaa_ready,
            "AAA flags must stay HELD"
        );
        assert!(!r.nanite_ready && !r.dlss_ready && !r.coins_ready && !r.agones_ready && !r.quic_ready);
    }

    #[test]
    fn wire_soak_delegates_to_kernel_report() {
        let soak = soak_to_wire(run_async_compute_scheduler_soak());
        let kernel = run_async_compute_scheduler_soak();
        assert_eq!(soak.evidence_fingerprint, kernel.evidence_fingerprint);
        assert_eq!(
            soak.async_compute_scheduler_ready,
            kernel.async_compute_scheduler_ready
        );
        assert_eq!(soak.critical_path, kernel.critical_path);
        assert_eq!(soak.overlap_ratio, kernel.overlap_ratio);
        assert_eq!(soak.frames_submitted, kernel.frames_submitted);
        assert!(
            !soak.async_compute_aaa_ready
                && !soak.vulkan_async_compute_aaa_ready
                && !soak.dx12_async_compute_aaa_ready
                && !soak.metal_aaa_ready,
            "soak wire report keeps AAA flags HELD"
        );
    }
}
