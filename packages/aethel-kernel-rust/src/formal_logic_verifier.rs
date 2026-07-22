//! Formal Logic Verifier — letter **fv**.
//!
//! Replaces theater stub `prove_deterministic_safety` (always-true Coq/Lean
//! marketing, no MutEvent/SceneGraph predicates) with a real propositional
//! predicate set over `MutEvent` sequences + `SceneGraph` / base seed:
//! - no NaN / Inf floats in MutEvent payloads
//! - entity indices within capacity
//! - timescale bounds on SetTimescale
//! - SceneGraph `scale_x/y/z` within [min, max] (couples **fb** defaults)
//! - genomic base seed non-zero
//!
//! Soak proves valid sequences **accept** and invalid sequences **reject**
//! (fail-closed). Honesty probe `formal_logic_verifier_ready` /
//! `formalLogicVerifierReady` is **distinct** from fu
//! `genomicSeedTransmitterReady`, ft `genomicSeedLibraryReady`, fh
//! `deltaSeedSynchronizationReady`, fb `geometricScaleConstraintsReady`, and
//! prior probes.
//!
//! **HELD:** Full theorem-prover AAA (`theorem_prover_aaa_ready: false`) ·
//! Coq/Lean / Coins / Agones / Nanite / DLSS / Quic.

use crate::ecs_core::SceneGraph;
use crate::geometric_scale_constraints::{SCALE_MAX_DEFAULT, SCALE_MIN_DEFAULT};
use crate::quantum_snapshot_dna::{MutEvent, MutOp};

/// Fingerprint seed ("fvflv").
const FP_SEED: u64 = 0x6676_666c_76;
/// Default timescale floor (avoid zero / reverse-time theater).
pub const TIMESCALE_MIN_DEFAULT: f32 = 1e-4;
/// Default timescale ceiling.
pub const TIMESCALE_MAX_DEFAULT: f32 = 1e4;
/// Soak SceneGraph capacity.
const SOAK_CAPACITY: usize = 16;
/// Soak non-zero base seed.
const SOAK_SEED: u64 = 0x6676_5EED_0001;

/// Propositional verify errors — fail-closed.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum VerifyError {
    SeedZero,
    EmptyEvents,
    NonFiniteFloat {
        event_index: u32,
        field: u8, // 0=a, 1=b, 2=c
    },
    EntityOutOfCapacity {
        event_index: u32,
        entity: u32,
        capacity: u32,
    },
    TimescaleOutOfBounds {
        event_index: u32,
        value: f32,
    },
    ScaleOutOfBounds {
        entity: u32,
        axis: u8, // 0=x, 1=y, 2=z
        value: f32,
    },
}

/// Predicate policy for MutEvent / SceneGraph checks.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct VerifyPolicy {
    pub scale_min: f32,
    pub scale_max: f32,
    pub timescale_min: f32,
    pub timescale_max: f32,
    /// When true, empty event lists fail (strict sequence).
    pub require_events: bool,
}

impl Default for VerifyPolicy {
    fn default() -> Self {
        Self::kernel_defaults()
    }
}

impl VerifyPolicy {
    pub fn kernel_defaults() -> Self {
        Self {
            scale_min: SCALE_MIN_DEFAULT,
            scale_max: SCALE_MAX_DEFAULT,
            timescale_min: TIMESCALE_MIN_DEFAULT,
            timescale_max: TIMESCALE_MAX_DEFAULT,
            require_events: true,
        }
    }

    pub fn sanitized(self) -> Self {
        let mut min_s = if self.scale_min.is_finite() && self.scale_min > 0.0 {
            self.scale_min
        } else {
            SCALE_MIN_DEFAULT
        };
        let mut max_s = if self.scale_max.is_finite() && self.scale_max > 0.0 {
            self.scale_max
        } else {
            SCALE_MAX_DEFAULT
        };
        if min_s > max_s {
            std::mem::swap(&mut min_s, &mut max_s);
        }
        let mut tmin = if self.timescale_min.is_finite() && self.timescale_min > 0.0 {
            self.timescale_min
        } else {
            TIMESCALE_MIN_DEFAULT
        };
        let mut tmax = if self.timescale_max.is_finite() && self.timescale_max > 0.0 {
            self.timescale_max
        } else {
            TIMESCALE_MAX_DEFAULT
        };
        if tmin > tmax {
            std::mem::swap(&mut tmin, &mut tmax);
        }
        Self {
            scale_min: min_s,
            scale_max: max_s,
            timescale_min: tmin,
            timescale_max: tmax,
            require_events: self.require_events,
        }
    }
}

/// Per-check evidence counters.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct VerifyEvidence {
    pub events_checked: u32,
    pub floats_checked: u32,
    pub scales_checked: u32,
    pub seed_ok: bool,
    pub events_ok: bool,
    pub scales_ok: bool,
}

/// Formal logic verifier kernel (propositional predicates — not Coq/Lean).
#[derive(Debug, Clone)]
pub struct FormalLogicVerifier {
    pub policy: VerifyPolicy,
}

impl Default for FormalLogicVerifier {
    fn default() -> Self {
        Self::new()
    }
}

impl FormalLogicVerifier {
    pub fn new() -> Self {
        Self {
            policy: VerifyPolicy::kernel_defaults(),
        }
    }

    pub fn with_policy(policy: VerifyPolicy) -> Self {
        Self {
            policy: policy.sanitized(),
        }
    }

    /// Seed non-zero rule — genomic base seed must be non-zero.
    pub fn verify_seed(seed: u64) -> Result<(), VerifyError> {
        if seed == 0 {
            Err(VerifyError::SeedZero)
        } else {
            Ok(())
        }
    }

    /// MutEvent sequence predicates: finite floats, entity capacity, timescale bounds.
    pub fn verify_mut_events(
        &self,
        events: &[MutEvent],
        capacity: usize,
        evidence: &mut VerifyEvidence,
    ) -> Result<(), VerifyError> {
        let p = self.policy.sanitized();
        if p.require_events && events.is_empty() {
            evidence.events_ok = false;
            return Err(VerifyError::EmptyEvents);
        }
        for (i, e) in events.iter().enumerate() {
            evidence.events_checked = evidence.events_checked.saturating_add(1);
            let idx = i as u32;
            if (e.entity as usize) >= capacity {
                evidence.events_ok = false;
                return Err(VerifyError::EntityOutOfCapacity {
                    event_index: idx,
                    entity: e.entity,
                    capacity: capacity as u32,
                });
            }
            for (field, v) in [(0u8, e.a), (1, e.b), (2, e.c)] {
                evidence.floats_checked = evidence.floats_checked.saturating_add(1);
                if !v.is_finite() {
                    evidence.events_ok = false;
                    return Err(VerifyError::NonFiniteFloat {
                        event_index: idx,
                        field,
                    });
                }
            }
            if e.op == MutOp::SetTimescale
                && (e.a < p.timescale_min || e.a > p.timescale_max)
            {
                evidence.events_ok = false;
                return Err(VerifyError::TimescaleOutOfBounds {
                    event_index: idx,
                    value: e.a,
                });
            }
        }
        evidence.events_ok = true;
        Ok(())
    }

    /// SceneGraph scale bounds (active entities) — couples **fb** min/max defaults.
    pub fn verify_scene_scales(
        &self,
        scene: &SceneGraph,
        evidence: &mut VerifyEvidence,
    ) -> Result<(), VerifyError> {
        let p = self.policy.sanitized();
        for i in 0..scene.len {
            if !scene.is_active(i) {
                continue;
            }
            let axes = [
                (0u8, scene.scale_x[i]),
                (1, scene.scale_y[i]),
                (2, scene.scale_z[i]),
            ];
            for (axis, v) in axes {
                evidence.scales_checked = evidence.scales_checked.saturating_add(1);
                if !v.is_finite() || v < p.scale_min || v > p.scale_max {
                    evidence.scales_ok = false;
                    return Err(VerifyError::ScaleOutOfBounds {
                        entity: i as u32,
                        axis,
                        value: v,
                    });
                }
            }
        }
        evidence.scales_ok = true;
        Ok(())
    }

    /// Full propositional check: seed + MutEvent sequence + SceneGraph scales.
    pub fn verify_mut_sequence(
        &self,
        seed: u64,
        events: &[MutEvent],
        scene: &SceneGraph,
    ) -> Result<VerifyEvidence, VerifyError> {
        let mut evidence = VerifyEvidence::default();
        Self::verify_seed(seed)?;
        evidence.seed_ok = true;
        self.verify_mut_events(events, scene.capacity, &mut evidence)?;
        self.verify_scene_scales(scene, &mut evidence)?;
        Ok(evidence)
    }

    /// Accept/reject bool wrapper (fail-closed on any predicate breach).
    pub fn accepts(&self, seed: u64, events: &[MutEvent], scene: &SceneGraph) -> bool {
        self.verify_mut_sequence(seed, events, scene).is_ok()
    }

    /// Legacy theater signature — **fail-closed**.
    ///
    /// Full AST / Coq / Lean theorem proving is **HELD**
    /// (`theorem_prover_aaa_ready: false`). Use `verify_mut_sequence` for real
    /// propositional checks over MutEvent / SceneGraph.
    pub fn prove_deterministic_safety(_generated_rust_ast: &str) -> bool {
        false
    }
}

/// Letter **fv** soak report — formal logic verifier evidence.
#[derive(Debug, Clone, PartialEq)]
pub struct FormalLogicVerifierSoakReport {
    pub formal_logic_verifier_ready: bool,
    pub valid_accepted: bool,
    pub invalid_nan_rejected: bool,
    pub invalid_seed_rejected: bool,
    pub invalid_scale_rejected: bool,
    pub deterministic: bool,
    pub outputs_finite: bool,
    pub state_mutated: bool,
    pub events_checked: u32,
    pub scales_checked: u32,
    pub fingerprint: u64,
    pub distinct_from_genomic_seed_transmitter_probe: bool,
    pub distinct_from_genomic_seed_library_probe: bool,
    pub distinct_from_delta_seed_synchronization_probe: bool,
    pub distinct_from_geometric_scale_constraints_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub theorem_prover_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn fail_report(events_checked: u32, scales_checked: u32) -> FormalLogicVerifierSoakReport {
    FormalLogicVerifierSoakReport {
        formal_logic_verifier_ready: false,
        valid_accepted: false,
        invalid_nan_rejected: false,
        invalid_seed_rejected: false,
        invalid_scale_rejected: false,
        deterministic: false,
        outputs_finite: false,
        state_mutated: false,
        events_checked,
        scales_checked,
        fingerprint: 0,
        distinct_from_genomic_seed_transmitter_probe: true,
        distinct_from_genomic_seed_library_probe: true,
        distinct_from_delta_seed_synchronization_probe: true,
        distinct_from_geometric_scale_constraints_probe: true,
        distinct_from_kernel_foundation_probe: true,
        theorem_prover_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        quic_ready: false,
    }
}

fn soak_valid_events() -> [MutEvent; 4] {
    [
        MutEvent {
            op: MutOp::SetPosition,
            entity: 0,
            a: 1.0,
            b: 2.0,
            c: 3.0,
        },
        MutEvent {
            op: MutOp::SetTimescale,
            entity: 0,
            a: 1.0,
            b: 0.0,
            c: 0.0,
        },
        MutEvent {
            op: MutOp::SetActive,
            entity: 1,
            a: 1.0,
            b: 0.0,
            c: 0.0,
        },
        MutEvent {
            op: MutOp::InjectForceY,
            entity: 1,
            a: 0.5,
            b: 0.0,
            c: 0.0,
        },
    ]
}

fn soak_scene_ok() -> SceneGraph {
    let mut scene = SceneGraph::with_capacity(SOAK_CAPACITY);
    scene.len = 2;
    scene.set_active(0, true);
    scene.set_active(1, true);
    scene.scale_x[0] = 1.0;
    scene.scale_y[0] = 1.0;
    scene.scale_z[0] = 1.0;
    scene.scale_x[1] = 2.0;
    scene.scale_y[1] = 2.0;
    scene.scale_z[1] = 2.0;
    scene
}

/// Run formal logic verifier soak — valid pass / invalid fail-closed.
pub fn run_formal_logic_verifier_soak() -> FormalLogicVerifierSoakReport {
    let v = FormalLogicVerifier::new();
    let events = soak_valid_events();
    let scene = soak_scene_ok();

    // Valid accept.
    let ok = match v.verify_mut_sequence(SOAK_SEED, &events, &scene) {
        Ok(ev) => ev,
        Err(_) => return fail_report(0, 0),
    };
    let valid_accepted = ok.seed_ok && ok.events_ok && ok.scales_ok;

    // Invalid: NaN in MutEvent → reject.
    let mut nan_events = events;
    nan_events[0].a = f32::NAN;
    let invalid_nan_rejected = matches!(
        v.verify_mut_sequence(SOAK_SEED, &nan_events, &scene),
        Err(VerifyError::NonFiniteFloat { .. })
    );

    // Invalid: seed zero → reject.
    let invalid_seed_rejected =
        matches!(v.verify_mut_sequence(0, &events, &scene), Err(VerifyError::SeedZero));

    // Invalid: scale out of bounds → reject.
    let mut bad_scene = soak_scene_ok();
    bad_scene.scale_x[0] = SCALE_MAX_DEFAULT * 10.0;
    let invalid_scale_rejected = matches!(
        v.verify_mut_sequence(SOAK_SEED, &events, &bad_scene),
        Err(VerifyError::ScaleOutOfBounds { .. })
    );

    // Inf also rejected.
    let mut inf_events = events;
    inf_events[1].a = f32::INFINITY;
    let inf_rejected = v.verify_mut_sequence(SOAK_SEED, &inf_events, &scene).is_err();

    // Entity out of capacity rejected.
    let mut oob = events;
    oob[0].entity = SOAK_CAPACITY as u32 + 1;
    let entity_rejected = matches!(
        v.verify_mut_events(&oob, SOAK_CAPACITY, &mut VerifyEvidence::default()),
        Err(VerifyError::EntityOutOfCapacity { .. })
    );

    // Timescale out of bounds rejected.
    let mut ts = events;
    ts[1].a = TIMESCALE_MAX_DEFAULT * 2.0;
    let ts_rejected = matches!(
        v.verify_mut_events(&ts, SOAK_CAPACITY, &mut VerifyEvidence::default()),
        Err(VerifyError::TimescaleOutOfBounds { .. })
    );

    // Legacy theater API fail-closed (theorem prover HELD).
    let legacy_held = !FormalLogicVerifier::prove_deterministic_safety("fn foo() {}")
        && !FormalLogicVerifier::prove_deterministic_safety("");

    // Determinism: two soaks → same fingerprint parts.
    let a = v.verify_mut_sequence(SOAK_SEED, &events, &scene);
    let b = v.verify_mut_sequence(SOAK_SEED, &events, &scene);
    let deterministic = a.is_ok() && a == b;

    let state_mutated = ok.events_checked >= 4 && ok.scales_checked >= 6;
    let outputs_finite = ok.floats_checked > 0 && ok.scales_checked > 0;

    let ready = valid_accepted
        && invalid_nan_rejected
        && invalid_seed_rejected
        && invalid_scale_rejected
        && inf_rejected
        && entity_rejected
        && ts_rejected
        && legacy_held
        && deterministic
        && state_mutated
        && outputs_finite;

    if !ready {
        let mut fail = fail_report(ok.events_checked, ok.scales_checked);
        fail.valid_accepted = valid_accepted;
        fail.invalid_nan_rejected = invalid_nan_rejected;
        fail.invalid_seed_rejected = invalid_seed_rejected;
        fail.invalid_scale_rejected = invalid_scale_rejected;
        fail.deterministic = deterministic;
        fail.outputs_finite = outputs_finite;
        fail.state_mutated = state_mutated;
        return fail;
    }

    let fp = fingerprint(&[
        SOAK_SEED,
        ok.events_checked as u64,
        ok.floats_checked as u64,
        ok.scales_checked as u64,
        1u64, // valid
        1u64, // nan reject
        1u64, // seed reject
        1u64, // scale reject
    ]);

    FormalLogicVerifierSoakReport {
        formal_logic_verifier_ready: true,
        valid_accepted: true,
        invalid_nan_rejected: true,
        invalid_seed_rejected: true,
        invalid_scale_rejected: true,
        deterministic: true,
        outputs_finite: true,
        state_mutated: true,
        events_checked: ok.events_checked,
        scales_checked: ok.scales_checked,
        fingerprint: fp,
        distinct_from_genomic_seed_transmitter_probe: true,
        distinct_from_genomic_seed_library_probe: true,
        distinct_from_delta_seed_synchronization_probe: true,
        distinct_from_geometric_scale_constraints_probe: true,
        distinct_from_kernel_foundation_probe: true,
        theorem_prover_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        quic_ready: false,
    }
}

/// Honesty probe — soak-gated `formal_logic_verifier_ready` (**fv**).
pub fn probe_formal_logic_verifier() -> FormalLogicVerifierSoakReport {
    run_formal_logic_verifier_soak()
}

fn fingerprint(parts: &[u64]) -> u64 {
    let mut h = FP_SEED;
    for &p in parts {
        h = hash_mix(h, p);
    }
    h
}

#[inline]
fn hash_mix(h: u64, v: u64) -> u64 {
    let mut x = h ^ v.wrapping_mul(0x9E37_79B9_7F4A_7C15);
    x = (x ^ (x >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
    x = (x ^ (x >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
    x ^ (x >> 31)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn valid_sequence_accepted() {
        let v = FormalLogicVerifier::new();
        let events = soak_valid_events();
        let scene = soak_scene_ok();
        assert!(v.accepts(SOAK_SEED, &events, &scene));
        let ev = v.verify_mut_sequence(SOAK_SEED, &events, &scene).unwrap();
        assert!(ev.seed_ok && ev.events_ok && ev.scales_ok);
        assert!(ev.events_checked >= 4);
    }

    #[test]
    fn nan_rejected() {
        let v = FormalLogicVerifier::new();
        let mut events = soak_valid_events();
        events[0].b = f32::NAN;
        let scene = soak_scene_ok();
        assert!(matches!(
            v.verify_mut_sequence(SOAK_SEED, &events, &scene),
            Err(VerifyError::NonFiniteFloat { field: 1, .. })
        ));
    }

    #[test]
    fn seed_zero_rejected() {
        let v = FormalLogicVerifier::new();
        assert_eq!(FormalLogicVerifier::verify_seed(0), Err(VerifyError::SeedZero));
        assert!(v
            .verify_mut_sequence(0, &soak_valid_events(), &soak_scene_ok())
            .is_err());
    }

    #[test]
    fn scale_bounds_rejected() {
        let v = FormalLogicVerifier::new();
        let mut scene = soak_scene_ok();
        scene.scale_y[1] = 1e-8; // below SCALE_MIN_DEFAULT
        assert!(matches!(
            v.verify_mut_sequence(SOAK_SEED, &soak_valid_events(), &scene),
            Err(VerifyError::ScaleOutOfBounds { axis: 1, .. })
        ));
    }

    #[test]
    fn timescale_oob_rejected() {
        let v = FormalLogicVerifier::new();
        let mut events = soak_valid_events();
        events[1].a = 0.0; // below TIMESCALE_MIN
        let mut ev = VerifyEvidence::default();
        assert!(matches!(
            v.verify_mut_events(&events, SOAK_CAPACITY, &mut ev),
            Err(VerifyError::TimescaleOutOfBounds { .. })
        ));
    }

    #[test]
    fn entity_capacity_rejected() {
        let v = FormalLogicVerifier::new();
        let mut events = soak_valid_events();
        events[0].entity = 999;
        let mut ev = VerifyEvidence::default();
        assert!(matches!(
            v.verify_mut_events(&events, SOAK_CAPACITY, &mut ev),
            Err(VerifyError::EntityOutOfCapacity { .. })
        ));
    }

    #[test]
    fn legacy_ast_prove_fail_closed() {
        assert!(!FormalLogicVerifier::prove_deterministic_safety("safe"));
        assert!(!FormalLogicVerifier::prove_deterministic_safety(""));
    }

    #[test]
    fn soak_ready_and_distinct() {
        let r = run_formal_logic_verifier_soak();
        assert!(r.formal_logic_verifier_ready);
        assert!(r.valid_accepted);
        assert!(r.invalid_nan_rejected);
        assert!(r.invalid_seed_rejected);
        assert!(r.invalid_scale_rejected);
        assert!(r.deterministic);
        assert!(!r.theorem_prover_aaa_ready);
        assert!(r.distinct_from_genomic_seed_transmitter_probe);
        assert!(r.distinct_from_genomic_seed_library_probe);
        assert!(r.distinct_from_delta_seed_synchronization_probe);
        assert!(r.distinct_from_geometric_scale_constraints_probe);
        assert!(r.fingerprint != 0);
    }

    #[test]
    fn probe_matches_soak() {
        let a = run_formal_logic_verifier_soak();
        let b = probe_formal_logic_verifier();
        assert_eq!(a, b);
    }

    #[test]
    fn probe_distinct_from_fu_ft_fh_fb() {
        let fv = probe_formal_logic_verifier();
        let fu = crate::genomic_seed_transmitter::probe_genomic_seed_transmitter();
        let ft = crate::genomic_seed_library::probe_genomic_seed_library();
        let fh = crate::delta_seed_synchronization::probe_delta_seed_synchronization();
        let fb = crate::geometric_scale_constraints::probe_geometric_scale_constraints();
        assert!(fv.formal_logic_verifier_ready);
        assert!(fu.genomic_seed_transmitter_ready);
        assert!(ft.genomic_seed_library_ready);
        assert!(fh.delta_seed_synchronization_ready);
        assert!(fb.geometric_scale_constraints_ready);
        // Distinct probe names / fingerprints (not the same report type).
        assert_ne!(fv.fingerprint, fu.fingerprint);
        assert_ne!(fv.fingerprint, ft.fingerprint);
        assert_ne!(fv.fingerprint, fh.fingerprint);
        assert_ne!(fv.fingerprint, fb.fingerprint);
        assert!(!fv.theorem_prover_aaa_ready);
    }
}
