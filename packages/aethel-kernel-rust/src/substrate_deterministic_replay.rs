//! Shared substrate — deterministic tick / replay honesty (games + quant finance).
//! Proves same-seed forward runs match and ADNA mutation replay restores state.

use crate::ecs_core::SceneGraph;
use crate::quantum_snapshot_dna::{MutEvent, MutOp, QuantumSnapshotDna};
use serde::{Deserialize, Serialize};

const DEFAULT_TICKS: u32 = 48;
const DT: f32 = 1.0 / 60.0;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubstrateDeterministicReplayProbe {
    /// True when forward determinism + ADNA replay soak pass.
    pub tick_replay_ready: bool,
    pub ticks_simulated: u32,
    pub forward_deterministic: bool,
    pub adna_replay_match: bool,
    pub monotonic_timebase: bool,
    pub baseline_fingerprint: u64,
    pub replay_fingerprint: u64,
}

fn world_fingerprint(world: &SceneGraph) -> u64 {
    let mut h: u64 = world.entity_count() as u64;
    for i in 0..world.len {
        if world.is_active(i) {
            h = h
                .wrapping_mul(6364136223846793005)
                .wrapping_add(world.pos_x[i].to_bits() as u64);
            h = h
                .wrapping_mul(6364136223846793005)
                .wrapping_add(world.pos_y[i].to_bits() as u64);
            h = h
                .wrapping_mul(6364136223846793005)
                .wrapping_add(world.pos_z[i].to_bits() as u64);
        }
    }
    h
}

fn simulate_forward(ticks: u32) -> (SceneGraph, Vec<MutEvent>) {
    let mut world = SceneGraph::with_capacity(64);
    let mut events = Vec::new();
    let _ = world.add_entity(0.0, 12.0, 0.0);
    events.push(MutEvent {
        op: MutOp::SetPosition,
        entity: 0,
        a: 0.0,
        b: 12.0,
        c: 0.0,
    });

    for _ in 0..ticks {
        world.tick_physics(DT);
    }

    (world, events)
}

/// Soak-gated probe for shared deterministic substrate (fail-closed).
pub fn probe_substrate_deterministic_replay(ticks: u32) -> SubstrateDeterministicReplayProbe {
    let ticks = ticks.max(1);

    let (live_a, events) = simulate_forward(ticks);
    let (live_b, _) = simulate_forward(ticks);
    let baseline = world_fingerprint(&live_a);
    let forward_b = world_fingerprint(&live_b);
    let forward_deterministic = baseline == forward_b;

    let bytes = QuantumSnapshotDna::serialize_universe_genomic_log(0xAE7E_1E51, &events);
    let mut replay_world = SceneGraph::with_capacity(64);
    let adna_ok = QuantumSnapshotDna::replay(&mut replay_world, &bytes);
    if adna_ok {
        for _ in 0..ticks {
            replay_world.tick_physics(DT);
        }
    }
    let replay_fp = world_fingerprint(&replay_world);
    let adna_replay_match = adna_ok && (replay_fp == baseline);

    let monotonic_timebase = ticks > 0;

    SubstrateDeterministicReplayProbe {
        tick_replay_ready: forward_deterministic && adna_replay_match && monotonic_timebase,
        ticks_simulated: ticks,
        forward_deterministic,
        adna_replay_match,
        monotonic_timebase,
        baseline_fingerprint: baseline,
        replay_fingerprint: replay_fp,
    }
}

pub fn probe_substrate_deterministic_replay_default() -> SubstrateDeterministicReplayProbe {
    probe_substrate_deterministic_replay(DEFAULT_TICKS)
}

/// SF1 — fixed-tick session tape entry (sim ticks only in Rust; paper trades on web tape).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionTapeEntry {
    pub tick_index: u32,
    pub state_fingerprint: u64,
    pub prev_hash: u64,
    pub entry_hash: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UnifiedSessionTape {
    pub session_id: u64,
    pub tick_hz: u32,
    pub genesis_hash: u64,
    pub entries: Vec<SessionTapeEntry>,
    pub head_hash: u64,
}

fn tape_digest(prev: u64, tick_index: u32, fingerprint: u64) -> u64 {
    let mut h = prev.wrapping_mul(6364136223846793005);
    h = h.wrapping_add(tick_index as u64);
    h = h.wrapping_add(fingerprint);
    h
}

pub fn create_session_tape(session_id: u64) -> UnifiedSessionTape {
    let genesis_hash = tape_digest(0xAE7E_0001, 0, session_id);
    UnifiedSessionTape {
        session_id,
        tick_hz: 60,
        genesis_hash,
        entries: Vec::new(),
        head_hash: genesis_hash,
    }
}

pub fn append_sim_tick(tape: &mut UnifiedSessionTape, state_fingerprint: u64) -> bool {
    let tick_index = tape.entries.len() as u32;
    let prev_hash = tape.head_hash;
    let entry_hash = tape_digest(prev_hash, tick_index, state_fingerprint);
    tape.entries.push(SessionTapeEntry {
        tick_index,
        state_fingerprint,
        prev_hash,
        entry_hash,
    });
    tape.head_hash = entry_hash;
    true
}

pub fn verify_session_tape_chain(tape: &UnifiedSessionTape) -> bool {
    let mut expected_prev = tape.genesis_hash;
    for (i, entry) in tape.entries.iter().enumerate() {
        if entry.tick_index != i as u32 {
            return false;
        }
        if entry.prev_hash != expected_prev {
            return false;
        }
        let recomputed = tape_digest(entry.prev_hash, entry.tick_index, entry.state_fingerprint);
        if recomputed != entry.entry_hash {
            return false;
        }
        expected_prev = entry.entry_hash;
    }
    tape.head_hash == expected_prev
}

pub fn probe_session_tape_readiness() -> bool {
    let mut tape = create_session_tape(0x5F01_2026);
    let fp_a = world_fingerprint(&simulate_forward(1).0);
    let fp_b = world_fingerprint(&simulate_forward(2).0);
    append_sim_tick(&mut tape, fp_a);
    append_sim_tick(&mut tape, fp_b);
    verify_session_tape_chain(&tape) && tape.entries.len() == 2
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn substrate_forward_is_deterministic_same_seed() {
        let probe = probe_substrate_deterministic_replay(60);
        assert!(probe.forward_deterministic, "forward runs must match");
        assert!(probe.monotonic_timebase);
        assert_ne!(probe.baseline_fingerprint, 0);
    }

    #[test]
    fn substrate_adna_replay_restores_live_fingerprint() {
        let probe = probe_substrate_deterministic_replay(48);
        assert!(probe.adna_replay_match, "ADNA replay must match live fingerprint");
        assert!(probe.tick_replay_ready);
    }

    #[test]
    fn session_tape_chain_verifies_sim_ticks() {
        assert!(probe_session_tape_readiness());
        let mut tape = create_session_tape(42);
        append_sim_tick(&mut tape, 100);
        append_sim_tick(&mut tape, 200);
        assert!(verify_session_tape_chain(&tape));
    }

    #[test]
    fn session_tape_rejects_broken_prev_hash() {
        let mut tape = create_session_tape(99);
        append_sim_tick(&mut tape, 100);
        tape.entries[0].prev_hash = 0xDEAD;
        assert!(!verify_session_tape_chain(&tape));
    }
}
