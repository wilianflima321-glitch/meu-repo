//! Kernel honesty probes — letter **dc**.
//! Soak-gated ready flags for shipped foundation; Unreal/AAA parity stays HELD.

use crate::ecs_core::SceneGraph;
use crate::lattice_boltzmann_gas_fluid::LatticeBoltzmannGasFluid;
use crate::linear_frame_allocator::LinearFrameAllocator;
use crate::quantum_snapshot_dna::{MutEvent, MutOp, QuantumSnapshotDna};
use crate::recursive_state_branching::RecursiveStateBranching;
use crate::sonic_impedance_protocol::SonicImpedanceProtocol;
use crate::spectral_participating_media::SpectralParticipatingMedia;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KernelHonestyReport {
    pub world_soa_ready: bool,
    pub frame_arena_ready: bool,
    pub lbm_kernel_ready: bool,
    pub mut_dna_ready: bool,
    pub timescale_ready: bool,
    pub beer_lambert_ready: bool,
    pub sonic_impedance_ready: bool,
    /// Marketing / competitor parity — always false until evidence.
    pub chaos_parity_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
}

impl KernelHonestyReport {
    pub fn foundation_closed(&self) -> bool {
        self.world_soa_ready
            && self.frame_arena_ready
            && self.lbm_kernel_ready
            && self.mut_dna_ready
            && self.timescale_ready
            && self.beer_lambert_ready
            && self.sonic_impedance_ready
    }
}

/// Run synthetic soak; flip foundation probes only on pass.
pub fn probe_kernel_foundation() -> KernelHonestyReport {
    let mut report = KernelHonestyReport {
        world_soa_ready: false,
        frame_arena_ready: false,
        lbm_kernel_ready: false,
        mut_dna_ready: false,
        timescale_ready: false,
        beer_lambert_ready: false,
        sonic_impedance_ready: false,
        chaos_parity_ready: false,
        unreal_mass_100k_ready: false,
        mmap_sab_production_ready: false,
        avx512_kernel_ready: false,
        gr_raymarch_ready: false,
        dual_timeline_240_ready: false,
    };

    // WorldSoA
    let mut world = SceneGraph::with_capacity(64);
    if world.add_entity(0.0, 1.0, 0.0).is_some() {
        world.tick_physics(0.016);
        report.world_soa_ready = world.entity_count() == 1;
    }

    // Frame arena bump
    if let Some(mut arena) = LinearFrameAllocator::with_capacity(4096) {
        let p0 = arena.allocate_frame_burst(64);
        let used = arena.bytes_used();
        arena.flush_frame();
        report.frame_arena_ready = p0.is_some() && used == 64 && arena.bytes_used() == 0;
    }

    // LBM mass conservation
    let mut lbm = LatticeBoltzmannGasFluid::new(16, 16);
    let m0 = lbm.total_mass();
    for _ in 0..8 {
        lbm.step();
    }
    let drift = ((lbm.total_mass() - m0) / m0).abs();
    report.lbm_kernel_ready = drift < 1e-3;

    // Mut DNA roundtrip
    let events = [MutEvent {
        op: MutOp::SetPosition,
        entity: 0,
        a: 4.0,
        b: 5.0,
        c: 6.0,
    }];
    let bytes = QuantumSnapshotDna::serialize_universe_genomic_log(42, &events);
    let mut replay_world = SceneGraph::with_capacity(8);
    report.mut_dna_ready = QuantumSnapshotDna::replay(&mut replay_world, &bytes)
        && (replay_world.pos_x[0] - 4.0).abs() < 1e-5;

    // Timescale
    let mut slow = SceneGraph::with_capacity(4);
    let id = slow.add_entity(0.0, 10.0, 0.0).unwrap();
    RecursiveStateBranching::execute_local_time_dilation(&mut slow, id.0 as u64, 0.5);
    report.timescale_ready = (slow.timescale[id.0 as usize] - 0.5).abs() < 1e-6;

    // Beer–Lambert
    let shallow = SpectralParticipatingMedia::compute_beer_lambert_extinction(1.0, 1.33);
    let deep = SpectralParticipatingMedia::compute_beer_lambert_extinction(50.0, 1.33);
    report.beer_lambert_ready = deep[0] < shallow[0] && deep[2] > deep[0];

    // Sonic
    let air = SonicImpedanceProtocol::trace_acoustic_ray(5.0, 0.0);
    let rock = SonicImpedanceProtocol::trace_acoustic_ray(5.0, 1.0);
    report.sonic_impedance_ready = air > rock;

    report
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn foundation_soak_passes_parity_held() {
        let r = probe_kernel_foundation();
        assert!(r.foundation_closed(), "{r:?}");
        assert!(!r.chaos_parity_ready);
        assert!(!r.unreal_mass_100k_ready);
        assert!(!r.mmap_sab_production_ready);
        assert!(!r.avx512_kernel_ready);
        assert!(!r.gr_raymarch_ready);
        assert!(!r.dual_timeline_240_ready);
    }
}
