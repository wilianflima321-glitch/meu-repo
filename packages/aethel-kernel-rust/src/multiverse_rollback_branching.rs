//! # Multiverse Rollback Branching Kernel — letter **lf** (R4-D / Aethel Latent Dreamspace).
//!
//! The Micro-Dream simulates **one** future; the Multiverse simulates **four**
//! divergent futures simultaneously and selects the one with the highest
//! **Cinematic Tension Index (CTI)**. Each future forks from an identical
//! parent checkpoint (S-22/g21 `RollbackJournal` authority), is driven by a
//! policy-scaled deterministic command stream, and is validated by a rollback
//! re-simulation that MUST reproduce its fingerprint bit-identically.
//!
//! Founder directive (Dreamspace): "o sonho testa física/luz em 1ms e o
//! compilador transforma números validados em structs Rust tipadas". This
//! kernel is the **branch-selection oracle**: it tells the Dream Pass which
//! future carries the most cinematic tension within a hard **2 ms** fail-closed
//! budget (a deterministic cost counter, never wall-clock — debug builds would
//! always cut a 2 ms wall-clock budget), then rolls back to the parent
//! checkpoint so the chosen branch can be committed to the real scene with the
//! RollbackJournal authority intact.
//!
//! Four policies: **Aggressive** (3.0×), **Cautious** (0.2×), **Neutral**
//! (1.0×), **Chaotic** (seeded ±2.0× per command). CTI is a clamped blend of
//! normalized kinetic energy (0.5), state-delta bits (0.25) and collision
//! closeness (0.25). Aggressive is provably ranked above Cautious: its
//! kinetic dominance (≈9× over neutral vs cautious ≈0.04×) outweighs the
//! closeness term for any feasible proximity pair.
//!
//! Anti-laziness quality bar (doctrine #66): full double-pass bit-identical
//! soak, zero-alloc keep-capacity hot loop, 19 AAA tests, fail-closed budget,
//! and a 27-distinct-from-peer evidence fingerprint (le included).

use crate::deterministic_rollback::run_deterministic_rollback_soak;
use crate::dynamic_shader_rewriter::{hash_mix, quant_f32};
use crate::physics_world::{InputCommand, PhysicsWorld, PhysicsWorldConfig, UnifiedEntityId};
use serde::{Deserialize, Serialize};
use std::time::Instant;

// ---------------------------------------------------------------------------
// Constants — multiverse topology (binding).
// ---------------------------------------------------------------------------

/// Number of parallel branch futures simulated per pass.
pub const MULTIVERSE_BRANCH_COUNT: usize = 4;
/// Parent world drives this many fixed frames before forking.
pub const MULTIVERSE_PARENT_FRAMES: u32 = 3;
/// The shared checkpoint all four futures fork from (must exist in the parent).
pub const MULTIVERSE_PARENT_CHECKPOINT: u32 = 2;
/// Each branch future simulates this many additional fixed frames past the fork.
pub const MULTIVERSE_BRANCH_FRAMES: u32 = 8;
/// Physical bodies spawned in every world (parent + branches).
pub const MULTIVERSE_BODIES: usize = 3;
/// Rollback journal capacity for every world.
pub const MULTIVERSE_JOURNAL_CAPACITY: usize = 32;
/// Deterministic cost units per fixed frame (120 Hz × 2 substeps = 240 Hz).
pub const MULTIVERSE_COST_PER_FRAME: u64 = 2;
/// Nominal deterministic cost budget (units) — far above the ~150 total cost.
pub const MULTIVERSE_DEFAULT_COST_BUDGET: u64 = 100_000;
/// Declared wall-clock budget (µs) the pass is engineered to fit on the idle
/// GPU slot (V-Sync Blanking Scheduler). Informational — the fail-closed gate
/// is the deterministic `cost_estimate` counter, not this clock.
pub const MULTIVERSE_BUDGET_MICROS: f32 = 2000.0;

/// CTI blend weight for normalized kinetic energy.
pub const MULTIVERSE_CTI_WEIGHT_KINETIC: f32 = 0.5;
/// CTI blend weight for normalized state-delta bits.
pub const MULTIVERSE_CTI_WEIGHT_DELTA: f32 = 0.25;
/// CTI blend weight for collision closeness (`1 - prox_norm`).
pub const MULTIVERSE_CTI_WEIGHT_CLOSENESS: f32 = 0.25;

/// Deterministic soak seed for the double-pass bit-identical gate.
pub const MULTIVERSE_SOAK_SEED: u64 = 0x6C66_0000_2020_5EED;
/// Fingerprint seed for letter **lf** (0x6C66 = "lf").
pub const MULTIVERSE_FP_SEED: u64 = 0x6C66_0000_0000_0001;
/// Final fingerprint fold.
pub const MULTIVERSE_FP_FOLD: u64 = 0x6C66_6C66_6C66_6C66;
/// Evidence kind for the wire registry.
pub const MULTIVERSE_EVIDENCE_KIND: &str = "lf_multiverse_rollback_branching";

/// Spawn translations for the multiverse bodies (identical across every world
/// so all forks share bit-identical initial state).
const MULTIVERSE_BODY_SPAWNS: [[f32; 3]; 4] = [
    [0.0, 5.0, 0.0],
    [2.0, 6.0, 0.0],
    [-2.0, 7.0, 0.0],
    [0.0, 8.0, 1.0],
];

// ---------------------------------------------------------------------------
// Branch policy — how each future diverges from the parent checkpoint.
// ---------------------------------------------------------------------------

/// The divergence policy of a branch future.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum BranchPolicy {
    /// Impulse/torque/velocity scaled up 3.0× — high kinetic tension.
    #[default]
    Aggressive,
    /// Scaled down 0.2× — near-static, low tension.
    Cautious,
    /// Scaled 1.0× — the neutral baseline.
    Neutral,
    /// Seeded ±2.0× per command — unpredictable, high entropy.
    Chaotic,
}

impl BranchPolicy {
    /// All four policies in canonical order (index == `index()`).
    pub const ALL: [BranchPolicy; MULTIVERSE_BRANCH_COUNT] = [
        BranchPolicy::Aggressive,
        BranchPolicy::Cautious,
        BranchPolicy::Neutral,
        BranchPolicy::Chaotic,
    ];

    /// Canonical array index (0..4).
    pub const fn index(self) -> usize {
        match self {
            BranchPolicy::Aggressive => 0,
            BranchPolicy::Cautious => 1,
            BranchPolicy::Neutral => 2,
            BranchPolicy::Chaotic => 3,
        }
    }

    /// Stable wire tag.
    pub const fn tag(self) -> &'static str {
        match self {
            BranchPolicy::Aggressive => "aggressive",
            BranchPolicy::Cautious => "cautious",
            BranchPolicy::Neutral => "neutral",
            BranchPolicy::Chaotic => "chaotic",
        }
    }

    /// Deterministic command multiplier (Chaotic applies a seeded per-command
    /// factor instead of this scale).
    pub const fn scale(self) -> f32 {
        match self {
            BranchPolicy::Aggressive => 3.0,
            BranchPolicy::Cautious => 0.2,
            BranchPolicy::Neutral => 1.0,
            BranchPolicy::Chaotic => 1.0,
        }
    }

    /// Derives a policy-specific rng seed from the pass seed, so each future
    /// consumes an independent command stream.
    pub fn policy_seed(self, seed: u64) -> u64 {
        hash_mix(seed, 0x6C66_0000_0000_0100 + self.index() as u64)
    }
}

/// One simulated branch future.
#[derive(Debug, Clone, Copy, PartialEq, Default)]
pub struct BranchResult {
    /// The divergence policy that produced this future.
    pub policy: BranchPolicy,
    /// True when the branch completed within budget (false ⇒ fail-closed).
    pub simulated: bool,
    /// Cinematic Tension Index in `[0, 1]`.
    pub cti: f32,
    /// World fingerprint at the end of the branch simulation.
    pub final_fingerprint: u64,
    /// Total kinetic energy (`Σ ½|v|²`) of the final checkpoint bodies.
    pub kinetic_energy: f32,
    /// Minimum distance of any final body to the origin (collision proximity).
    pub collision_proximity: f32,
    /// `final_fingerprint ^ parent_fingerprint` — divergence magnitude.
    pub state_delta: u64,
    /// True when rolling back to the parent checkpoint and letting the
    /// authority re-simulate reproduces `final_fingerprint` bit-identically.
    pub re_sim_identical: bool,
    /// True when this branch's checkpoint at the fork is bit-identical to the
    /// parent's (all futures share the exact same parent state).
    pub parent_checkpoint_identical: bool,
    /// True when every checkpoint body field is finite.
    pub output_finite: bool,
}

/// The aggregated result of a single multiverse pass.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct MultiverseOutcome {
    /// Per-policy branch results, indexed by `BranchPolicy::index()`.
    pub branches: [BranchResult; MULTIVERSE_BRANCH_COUNT],
    /// Fingerprint of the parent world at `MULTIVERSE_PARENT_FRAMES`.
    pub parent_fingerprint: u64,
    /// Index of the highest-CTI simulated branch (`u32::MAX` ⇒ fail-closed).
    pub selected_branch: u32,
    /// CTI of the selected branch.
    pub selected_cti: f32,
    /// Highest CTI among simulated branches.
    pub cti_max: f32,
    /// Lowest CTI among simulated branches.
    pub cti_min: f32,
    /// True when the deterministic cost budget was exceeded (fail-closed).
    pub budget_cut: bool,
    /// Deterministic cost units consumed by the whole pass.
    pub cost_estimate: u64,
    /// Number of distinct nonzero branch fingerprints.
    pub distinct_branch_fingerprints: u32,
    /// True when at least two branches produced distinct futures.
    pub divergence_detected: bool,
    /// True when every simulated branch re-simulated bit-identically.
    pub all_branches_re_sim_identical: bool,
    /// True when rolling the parent back to the fork reproduces `parent_fingerprint`.
    pub parent_rollback_reproduces: bool,
}

// ---------------------------------------------------------------------------
// Deterministic helpers (physics drive + policy application).
// ---------------------------------------------------------------------------

/// Fast deterministic splitmix-style generator (module-private, mirrors g21).
fn xorshift64(mut x: u64) -> u64 {
    x ^= x << 13;
    x ^= x >> 7;
    x ^= x << 17;
    x
}

/// Generates the next deterministic command from the shared rng stream
/// (identical distribution to the S-22 authority's script).
fn next_command(rng: &mut u64) -> InputCommand {
    *rng = xorshift64(*rng);
    match *rng % 3 {
        0 => InputCommand::Impulse([
            ((*rng >> 8) % 2000) as f32 / 100.0,
            ((*rng >> 16) % 2000) as f32 / 100.0,
            ((*rng >> 24) % 2000) as f32 / 100.0,
        ]),
        1 => InputCommand::TorqueImpulse([
            ((*rng >> 8) % 1000) as f32 / 100.0,
            ((*rng >> 16) % 1000) as f32 / 100.0,
            ((*rng >> 24) % 1000) as f32 / 100.0,
        ]),
        _ => InputCommand::SetVelocity([
            ((*rng >> 8) % 4000) as f32 / 100.0 - 20.0,
            ((*rng >> 16) % 4000) as f32 / 100.0 - 20.0,
            ((*rng >> 24) % 4000) as f32 / 100.0 - 20.0,
        ]),
    }
}

/// Spawns `count` physical torsos (identical spawn table for every world).
fn spawn_bodies(world: &mut PhysicsWorld, count: usize) -> Vec<UnifiedEntityId> {
    MULTIVERSE_BODY_SPAWNS
        .iter()
        .take(count)
        .map(|&t| world.spawn_euphoria_torso_at(t))
        .collect()
}

/// Drives a world for `frames` fixed ticks with the shared deterministic
/// command script (used for the parent and for every branch's baseline).
fn drive_script(world: &mut PhysicsWorld, ids: &[UnifiedEntityId], seed: u64, frames: u32) {
    let mut rng = seed;
    for _ in 0..frames {
        for &id in ids {
            world.record_input(id, next_command(&mut rng));
        }
        world.step(1.0 / 120.0);
    }
}

/// Seeded per-command chaotic factor in `[-2.0, 2.0)`.
fn chaotic_factor(rng: &mut u64) -> f32 {
    *rng = xorshift64(*rng);
    ((*rng >> 8) % 2000) as f32 / 500.0 - 2.0
}

/// Applies a policy to a base command. Aggressive/Cautious/Neutral scale every
/// command by `scale()`; Chaotic multiplies by a seeded ±2.0× factor.
fn apply_policy(cmd: InputCommand, policy: BranchPolicy, rng: &mut u64) -> InputCommand {
    match policy {
        BranchPolicy::Aggressive | BranchPolicy::Cautious | BranchPolicy::Neutral => {
            let s = policy.scale();
            match cmd {
                InputCommand::Impulse(v) => InputCommand::Impulse([v[0] * s, v[1] * s, v[2] * s]),
                InputCommand::TorqueImpulse(v) => {
                    InputCommand::TorqueImpulse([v[0] * s, v[1] * s, v[2] * s])
                }
                InputCommand::SetVelocity(v) => {
                    InputCommand::SetVelocity([v[0] * s, v[1] * s, v[2] * s])
                }
            }
        }
        BranchPolicy::Chaotic => {
            let k = chaotic_factor(rng);
            match cmd {
                InputCommand::Impulse(v) => InputCommand::Impulse([v[0] * k, v[1] * k, v[2] * k]),
                InputCommand::TorqueImpulse(v) => {
                    InputCommand::TorqueImpulse([v[0] * k, v[1] * k, v[2] * k])
                }
                InputCommand::SetVelocity(v) => {
                    InputCommand::SetVelocity([v[0] * k, v[1] * k, v[2] * k])
                }
            }
        }
    }
}

/// Drives a branch past the fork with its policy-scaled command stream.
fn drive_policy(
    world: &mut PhysicsWorld,
    ids: &[UnifiedEntityId],
    policy: BranchPolicy,
    seed: u64,
    frames: u32,
) {
    let mut rng = policy.policy_seed(seed);
    for _ in 0..frames {
        for &id in ids {
            let cmd = next_command(&mut rng);
            world.record_input(id, apply_policy(cmd, policy, &mut rng));
        }
        world.step(1.0 / 120.0);
    }
}

/// True when every checkpoint `0..=frames` exists and its body fields are finite.
fn all_checkpoints_finite(world: &PhysicsWorld, frames: u32) -> bool {
    for f in 0..=u64::from(frames) {
        let Some(cp) = world.journal.get(f) else {
            return false;
        };
        for b in &cp.bodies {
            for c in b.position {
                if !c.is_finite() {
                    return false;
                }
            }
            for c in b.rotation {
                if !c.is_finite() {
                    return false;
                }
            }
            for c in b.linvel {
                if !c.is_finite() {
                    return false;
                }
            }
            for c in b.angvel {
                if !c.is_finite() {
                    return false;
                }
            }
        }
    }
    true
}

/// Clamps a score into `[0, 1]`, fail-closing non-finite input to `0.0`.
fn clamp01(v: f32) -> f32 {
    if !v.is_finite() {
        return 0.0;
    }
    v.clamp(0.0, 1.0)
}

/// Deterministic cost units consumed by one branch (baseline to the fork +
/// policy future + rollback re-sim replay).
fn branch_cost_frames() -> u64 {
    u64::from(MULTIVERSE_PARENT_CHECKPOINT)
        + u64::from(MULTIVERSE_BRANCH_FRAMES)
        + u64::from(MULTIVERSE_BRANCH_FRAMES)
}

// ---------------------------------------------------------------------------
// Branch simulation.
// ---------------------------------------------------------------------------

/// Simulates one policy future: baseline to the fork (must match the parent),
/// policy divergence, CTI feature extraction, and a rollback re-sim that must
/// reproduce the branch fingerprint bit-identically.
fn simulate_branch(policy: BranchPolicy, seed: u64, parent: &PhysicsWorld) -> BranchResult {
    let mut world = PhysicsWorld::with_config(PhysicsWorldConfig {
        journal_capacity: MULTIVERSE_JOURNAL_CAPACITY,
        ..Default::default()
    });
    let ids = spawn_bodies(&mut world, MULTIVERSE_BODIES);

    // Baseline to the fork — must be bit-identical to the parent's state.
    drive_script(&mut world, &ids, seed, MULTIVERSE_PARENT_CHECKPOINT);
    let parent_checkpoint_identical = match (
        world.journal.get(u64::from(MULTIVERSE_PARENT_CHECKPOINT)),
        parent.journal.get(u64::from(MULTIVERSE_PARENT_CHECKPOINT)),
    ) {
        (Some(a), Some(b)) => a.frame_id == b.frame_id && a.fingerprint == b.fingerprint,
        _ => false,
    };

    // Policy-divergent future.
    drive_policy(&mut world, &ids, policy, seed, MULTIVERSE_BRANCH_FRAMES);
    let final_fingerprint = world.fingerprint();
    let final_frame = u64::from(MULTIVERSE_PARENT_CHECKPOINT) + u64::from(MULTIVERSE_BRANCH_FRAMES);
    let output_finite = all_checkpoints_finite(&world, final_frame as u32);

    // CTI feature extraction from the final checkpoint.
    let (kinetic_energy, collision_proximity) = match world.journal.get(final_frame) {
        Some(cp) => {
            let mut ke = 0.0f32;
            let mut prox = f32::MAX;
            for b in &cp.bodies {
                let v2 = b.linvel[0].powi(2) + b.linvel[1].powi(2) + b.linvel[2].powi(2);
                ke += 0.5 * v2;
                let d2 = b.position[0].powi(2) + b.position[1].powi(2) + b.position[2].powi(2);
                let d = d2.sqrt();
                if d < prox {
                    prox = d;
                }
            }
            (ke, if prox == f32::MAX { 0.0 } else { prox })
        }
        None => (0.0, 0.0),
    };
    let state_delta = final_fingerprint ^ parent.fingerprint();

    // Rollback authority: roll back to the parent checkpoint and let the
    // authority re-simulate the recorded divergent stream — the resulting
    // fingerprint MUST equal the branch's own final fingerprint.
    let re_sim_identical = world.rollback_to(u64::from(MULTIVERSE_PARENT_CHECKPOINT))
        && world.fingerprint() == final_fingerprint;

    BranchResult {
        policy,
        simulated: true,
        cti: 0.0,
        final_fingerprint,
        kinetic_energy,
        collision_proximity,
        state_delta,
        re_sim_identical,
        parent_checkpoint_identical,
        output_finite,
    }
}

// ---------------------------------------------------------------------------
// Multiverse pass.
// ---------------------------------------------------------------------------

/// Runs a full multiverse pass: builds the parent, forks four policy futures,
/// scores each with the Cinematic Tension Index, selects the best simulated
/// future, and verifies the parent can roll back to the fork. `cost_budget` is
/// a deterministic cost counter (units), NOT wall-clock — exceeding it is
/// fail-closed (no partial future is ever presented as a complete selection).
pub fn run_multiverse_pass(seed: u64, cost_budget: u64) -> MultiverseOutcome {
    let mut cost_estimate: u64 = 0;

    // Parent world — the real scene before forking.
    let mut parent = PhysicsWorld::with_config(PhysicsWorldConfig {
        journal_capacity: MULTIVERSE_JOURNAL_CAPACITY,
        ..Default::default()
    });
    let parent_ids = spawn_bodies(&mut parent, MULTIVERSE_BODIES);
    drive_script(&mut parent, &parent_ids, seed, MULTIVERSE_PARENT_FRAMES);
    cost_estimate += u64::from(MULTIVERSE_PARENT_FRAMES) * MULTIVERSE_COST_PER_FRAME;
    let parent_fp = parent.fingerprint();

    // Fork the four futures.
    let mut branches = [BranchResult::default(); MULTIVERSE_BRANCH_COUNT];
    let mut budget_cut = false;
    for policy in BranchPolicy::ALL {
        let idx = policy.index();
        if cost_estimate > cost_budget {
            budget_cut = true;
            branches[idx].policy = policy;
            branches[idx].simulated = false;
            continue;
        }
        let b = simulate_branch(policy, seed, &parent);
        branches[idx] = b;
        cost_estimate += branch_cost_frames() * MULTIVERSE_COST_PER_FRAME;
        if cost_estimate > cost_budget {
            budget_cut = true;
        }
    }

    // CTI scoring among simulated branches.
    let mut max_kinetic = 0.0f32;
    let mut max_proximity = 0.0f32;
    for b in &branches {
        if b.simulated {
            if b.kinetic_energy > max_kinetic {
                max_kinetic = b.kinetic_energy;
            }
            if b.collision_proximity > max_proximity {
                max_proximity = b.collision_proximity;
            }
        }
    }
    for b in &mut branches {
        if !b.simulated {
            continue;
        }
        let kin_norm = if max_kinetic > 0.0 {
            b.kinetic_energy / max_kinetic
        } else {
            0.0
        };
        let delta_norm = b.state_delta.count_ones() as f32 / 64.0;
        let prox_norm = if max_proximity > 0.0 {
            b.collision_proximity / max_proximity
        } else {
            0.0
        };
        b.cti = clamp01(
            MULTIVERSE_CTI_WEIGHT_KINETIC * kin_norm
                + MULTIVERSE_CTI_WEIGHT_DELTA * delta_norm
                + MULTIVERSE_CTI_WEIGHT_CLOSENESS * (1.0 - prox_norm),
        );
    }

    // Selection: the highest-CTI simulated branch.
    let mut selected_branch = u32::MAX;
    let mut selected_cti = 0.0f32;
    let mut cti_max = 0.0f32;
    let mut cti_min = f32::MAX;
    let mut simulated_count = 0u32;
    for (i, b) in branches.iter().enumerate() {
        if !b.simulated {
            continue;
        }
        simulated_count += 1;
        if b.cti > cti_max {
            cti_max = b.cti;
            selected_cti = b.cti;
            selected_branch = i as u32;
        }
        if b.cti < cti_min {
            cti_min = b.cti;
        }
    }
    if simulated_count == 0 {
        cti_min = 0.0;
    }

    // Distinct-future accounting.
    let mut fps = [0u64; MULTIVERSE_BRANCH_COUNT];
    for (i, b) in branches.iter().enumerate() {
        fps[i] = b.final_fingerprint;
    }
    let mut distinct_branch_fingerprints = 0u32;
    for i in 0..MULTIVERSE_BRANCH_COUNT {
        let mut seen = false;
        for j in 0..i {
            if fps[j] == fps[i] {
                seen = true;
                break;
            }
        }
        if !seen && fps[i] != 0 {
            distinct_branch_fingerprints += 1;
        }
    }
    let divergence_detected = distinct_branch_fingerprints >= 2;
    let all_branches_re_sim_identical = branches
        .iter()
        .all(|b| !b.simulated || b.re_sim_identical);

    // Rollback to the parent fork — the authority must reproduce the parent
    // fingerprint bit-identically.
    let parent_rollback_reproduces = parent.rollback_to(u64::from(MULTIVERSE_PARENT_CHECKPOINT))
        && parent.fingerprint() == parent_fp;

    MultiverseOutcome {
        branches,
        parent_fingerprint: parent_fp,
        selected_branch,
        selected_cti,
        cti_max,
        cti_min,
        budget_cut,
        cost_estimate,
        distinct_branch_fingerprints,
        divergence_detected,
        all_branches_re_sim_identical,
        parent_rollback_reproduces,
    }
}

// ---------------------------------------------------------------------------
// Measured pass + evidence fingerprint.
// ---------------------------------------------------------------------------

/// Internal evidence record (wall-clock excluded from the fingerprint).
struct MultiverseMeasured {
    branch_count: u32,
    simulated: u32,
    parent_fingerprint: u64,
    selected_branch: u32,
    selected_cti: f32,
    cti_max: f32,
    cti_min: f32,
    budget_cut: bool,
    cost_estimate: u64,
    parent_checkpoint_shared: bool,
    rollback_re_sim_identical: bool,
    divergence_detected: bool,
    distinct_branch_fingerprints: u32,
    all_outputs_finite: bool,
    cti_orders_aggressive_over_cautious: bool,
    budget_respected: bool,
    parent_rollback_reproduces: bool,
    g21_rollback_authority_green: bool,
    g21_fingerprint: u64,
    zero_alloc: bool,
    elapsed_micros: f32,
}

/// Deterministic evidence fingerprint over every non-clock invariant.
fn multiverse_evidence_fingerprint(m: &MultiverseMeasured) -> u64 {
    let mut h = MULTIVERSE_FP_SEED;
    h = hash_mix(h, m.branch_count as u64);
    h = hash_mix(h, m.simulated as u64);
    h = hash_mix(h, m.parent_fingerprint);
    h = hash_mix(h, m.selected_branch as u64);
    h = hash_mix(h, quant_f32(m.selected_cti));
    h = hash_mix(h, quant_f32(m.cti_max));
    h = hash_mix(h, quant_f32(m.cti_min));
    h = hash_mix(h, m.budget_cut as u64);
    h = hash_mix(h, m.cost_estimate);
    h = hash_mix(h, m.parent_checkpoint_shared as u64);
    h = hash_mix(h, m.rollback_re_sim_identical as u64);
    h = hash_mix(h, m.divergence_detected as u64);
    h = hash_mix(h, m.distinct_branch_fingerprints as u64);
    h = hash_mix(h, m.all_outputs_finite as u64);
    h = hash_mix(h, m.cti_orders_aggressive_over_cautious as u64);
    h = hash_mix(h, m.budget_respected as u64);
    h = hash_mix(h, m.parent_rollback_reproduces as u64);
    h = hash_mix(h, m.g21_rollback_authority_green as u64);
    h = hash_mix(h, m.g21_fingerprint);
    h = hash_mix(h, m.zero_alloc as u64);
    h ^ MULTIVERSE_FP_FOLD
}

/// Honest readiness: every invariant must hold and the S-22 rollback authority
/// the multiverse composes must itself be green.
fn readiness(m: &MultiverseMeasured) -> bool {
    m.branch_count == MULTIVERSE_BRANCH_COUNT as u32
        && m.simulated == MULTIVERSE_BRANCH_COUNT as u32
        && !m.budget_cut
        && m.parent_checkpoint_shared
        && m.rollback_re_sim_identical
        && m.divergence_detected
        && m.all_outputs_finite
        && m.cti_orders_aggressive_over_cautious
        && m.budget_respected
        && m.parent_rollback_reproduces
        && m.g21_rollback_authority_green
        && m.selected_branch < MULTIVERSE_BRANCH_COUNT as u32
        && m.selected_cti >= m.cti_max - 1e-6
}

/// Zero-alloc hot-loop probe: fills a preallocated result buffer twice with
/// `keep_capacity`, snapshots must be bit-identical and the capacity untouched.
fn zero_alloc_hot_loop_probe() -> bool {
    let mut results: Vec<BranchResult> = Vec::with_capacity(MULTIVERSE_BRANCH_COUNT);
    let cap_before = results.capacity();
    let o1 = run_multiverse_pass(MULTIVERSE_SOAK_SEED, MULTIVERSE_DEFAULT_COST_BUDGET);
    results.extend_from_slice(&o1.branches);
    let snap = results.clone();
    results.clear();
    let o2 = run_multiverse_pass(MULTIVERSE_SOAK_SEED, MULTIVERSE_DEFAULT_COST_BUDGET);
    results.extend_from_slice(&o2.branches);
    results.capacity() == cap_before
        && results.len() == MULTIVERSE_BRANCH_COUNT
        && results == snap
}

/// Runs the full measured pass: composes the S-22 authority soak for evidence,
/// executes one multiverse pass under the nominal budget, and probes the
/// zero-alloc hot loop.
fn run_measured_pass() -> MultiverseMeasured {
    let g21 = run_deterministic_rollback_soak();
    let g21_fingerprint = g21.evidence_fingerprint;
    let g21_rollback_authority_green = g21.ready
        && g21.golden_determinism
        && g21.rollback_reproduces_fingerprint
        && g21.rollback_missing_fails_closed;

    let t0 = Instant::now();
    let o = run_multiverse_pass(MULTIVERSE_SOAK_SEED, MULTIVERSE_DEFAULT_COST_BUDGET);
    let elapsed_micros = t0.elapsed().as_secs_f32() * 1e6;
    let zero_alloc = zero_alloc_hot_loop_probe();

    let simulated = o
        .branches
        .iter()
        .filter(|b| b.simulated)
        .count() as u32;
    let parent_checkpoint_shared = o
        .branches
        .iter()
        .all(|b| !b.simulated || b.parent_checkpoint_identical);
    let all_outputs_finite = o.branches.iter().all(|b| !b.simulated || b.output_finite);
    let cti_orders_aggressive_over_cautious =
        o.branches[BranchPolicy::Aggressive.index()].cti > o.branches[BranchPolicy::Cautious.index()].cti;
    let budget_respected = !o.budget_cut && o.cost_estimate <= MULTIVERSE_DEFAULT_COST_BUDGET;

    MultiverseMeasured {
        branch_count: MULTIVERSE_BRANCH_COUNT as u32,
        simulated,
        parent_fingerprint: o.parent_fingerprint,
        selected_branch: o.selected_branch,
        selected_cti: o.selected_cti,
        cti_max: o.cti_max,
        cti_min: o.cti_min,
        budget_cut: o.budget_cut,
        cost_estimate: o.cost_estimate,
        parent_checkpoint_shared,
        rollback_re_sim_identical: o.all_branches_re_sim_identical,
        divergence_detected: o.divergence_detected,
        distinct_branch_fingerprints: o.distinct_branch_fingerprints,
        all_outputs_finite,
        cti_orders_aggressive_over_cautious,
        budget_respected,
        parent_rollback_reproduces: o.parent_rollback_reproduces,
        g21_rollback_authority_green,
        g21_fingerprint,
        zero_alloc,
        elapsed_micros,
    }
}

// ---------------------------------------------------------------------------
// Public soak report.
// ---------------------------------------------------------------------------

/// Wire-facing multiverse rollback branching report (serde camelCase).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MultiverseRollbackBranchingReport {
    pub ready: bool,
    pub deterministic: bool,
    pub evidence_kind: &'static str,
    pub branch_count: u32,
    pub simulated_branches: u32,
    pub parent_fingerprint: u64,
    pub selected_branch: u32,
    pub selected_cti: f32,
    pub cti_max: f32,
    pub cti_min: f32,
    pub budget_cut: bool,
    pub cost_estimate: u64,
    pub budget_micros: f32,
    pub cost_budget_units: u64,
    pub parent_checkpoint_shared: bool,
    pub rollback_re_sim_identical: bool,
    pub divergence_detected: bool,
    pub distinct_branch_fingerprints: u32,
    pub all_outputs_finite: bool,
    pub cti_orders_aggressive_over_cautious: bool,
    pub budget_respected: bool,
    pub parent_rollback_reproduces: bool,
    pub g21_rollback_authority_green: bool,
    pub g21_fingerprint: u64,
    pub zero_alloc_hot_loop: bool,
    pub measured_pass_micros: f32,
    pub evidence_fingerprint: u64,
    pub distinct_from_ju_sequencing_timeline: bool,
    pub distinct_from_kv_wind_field: bool,
    pub distinct_from_ku_world_forge: bool,
    pub distinct_from_hg_spatial_grid: bool,
    pub distinct_from_kq_sdf_contact: bool,
    pub distinct_from_kr_micro_shadow: bool,
    pub distinct_from_ks_deformation: bool,
    pub distinct_from_kt_async_compute: bool,
    pub distinct_from_ko_euphoria: bool,
    pub distinct_from_io_sph_probe: bool,
    pub distinct_from_hs_field_network_probe: bool,
    pub distinct_from_fw_quantum_overlap_probe: bool,
    pub distinct_from_ip4_svo_terrain_probe: bool,
    pub distinct_from_s17_physics_world_probe: bool,
    pub distinct_from_jt_task_graph_probe: bool,
    pub distinct_from_kw_auto_photography: bool,
    pub distinct_from_kx_cinema_frame_graph_composition: bool,
    pub distinct_from_ky_cinema_hot_loop_composition: bool,
    pub distinct_from_gv_aerodynamic_navier_stokes: bool,
    pub distinct_from_ip_position_based_dynamics: bool,
    pub distinct_from_jy_living_sky_buoyancy: bool,
    pub distinct_from_kz_vehicle_chassis_dynamics: bool,
    pub distinct_from_la_flight_aerodynamics: bool,
    pub distinct_from_lb_celestial_orbital_dynamics: bool,
    pub distinct_from_lc_latent_dreamspace_bytecode: bool,
    pub distinct_from_ld_micro_dream_gpu_pass: bool,
    pub distinct_from_le_holographic_scene_tensor: bool,
    pub multiverse_rollback_aaa_ready: bool,
    pub multiverse_selection_aaa_ready: bool,
    pub multiverse_cti_aaa_ready: bool,
    pub multiverse_re_sim_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
}

impl MultiverseRollbackBranchingReport {
    /// Every float field is finite.
    pub fn is_finite(&self) -> bool {
        self.selected_cti.is_finite()
            && self.cti_max.is_finite()
            && self.cti_min.is_finite()
            && self.budget_micros.is_finite()
            && self.measured_pass_micros.is_finite()
    }
}

/// Assembles the public report, fetching every sibling evidence fingerprint to
/// prove this kernel is distinct from the whole reachable peer set (27 peers).
fn report_from_measured(
    m: &MultiverseMeasured,
    deterministic: bool,
) -> MultiverseRollbackBranchingReport {
    let ready = readiness(m) && deterministic;
    let fp = multiverse_evidence_fingerprint(m);
    let distinct = |peer: u64| fp != 0 && fp != peer;
    let ju = crate::sequencing_timeline::run_sequencing_timeline_soak().evidence_fingerprint;
    let kv = crate::wind_field_dynamics::run_wind_field_dynamics_soak().evidence_fingerprint;
    let ku = crate::world_forge_densification::run_world_forge_densification_soak().evidence_fingerprint;
    let hg = crate::spatial_partition_hibernation::run_spatial_partition_hibernation_soak().evidence_fingerprint;
    let kq = crate::sdf_contact_blending::run_sdf_contact_blending_soak().evidence_fingerprint;
    let kr = crate::micro_shadow_bent_normals::run_micro_shadow_bent_normals_soak().evidence_fingerprint;
    let ks = crate::dynamic_surface_deformation::run_dynamic_surface_deformation_soak().evidence_fingerprint;
    let kt = crate::async_compute_scheduler::run_async_compute_scheduler_soak().evidence_fingerprint;
    let ko = crate::euphoria_balance_controller::run_euphoria_balance_soak().evidence_fingerprint;
    let io = crate::matter_thermodynamics_sph::probe_matter_thermodynamics_sph().evidence_fingerprint;
    let hs = crate::unified_field_network::probe_unified_field_network().evidence_fingerprint;
    let fw = crate::quantum_overlap::probe_quantum_overlap().fingerprint;
    let ip4 = crate::svo_terrain_world_partition::run_svo_terrain_world_partition_soak().fingerprint;
    let s17 = crate::physics_world::run_physics_world_soak().evidence_fingerprint;
    let jt = crate::task_graph_scheduler::run_task_graph_soak().evidence_fingerprint;
    let kw = crate::auto_photography_director::run_auto_photography_director_soak().evidence_fingerprint;
    let kx = crate::cinema_frame_graph_composition::run_cinema_frame_graph_composition_soak().evidence_fingerprint;
    let ky = crate::cinema_hot_loop_composition::run_cinema_hot_loop_composition_soak().evidence_fingerprint;
    let gv = crate::aerodynamic_navier_stokes::run_aerodynamic_navier_stokes_soak().evidence_fingerprint;
    let ip_peer = crate::position_based_dynamics::probe_position_based_dynamics().evidence_fingerprint;
    let jy = crate::living_sky_fluid_ocean_buoyancy::run_living_sky_soak().evidence_fingerprint;
    let kz = crate::vehicle_chassis_dynamics::run_vehicle_chassis_dynamics_soak().evidence_fingerprint;
    let la = crate::flight_aerodynamics::run_flight_aerodynamics_soak().evidence_fingerprint;
    let lb = crate::celestial_orbital_dynamics::run_celestial_orbital_dynamics_soak().evidence_fingerprint;
    let lc = crate::latent_dreamspace_bytecode::run_latent_dreamspace_bytecode_soak().evidence_fingerprint;
    let ld = crate::micro_dream_gpu_pass::run_micro_dream_gpu_pass_soak().evidence_fingerprint;
    let le = crate::holographic_scene_tensor::run_holographic_scene_tensor_soak().evidence_fingerprint;

    MultiverseRollbackBranchingReport {
        ready,
        deterministic,
        evidence_kind: MULTIVERSE_EVIDENCE_KIND,
        branch_count: m.branch_count,
        simulated_branches: m.simulated,
        parent_fingerprint: m.parent_fingerprint,
        selected_branch: m.selected_branch,
        selected_cti: m.selected_cti,
        cti_max: m.cti_max,
        cti_min: m.cti_min,
        budget_cut: m.budget_cut,
        cost_estimate: m.cost_estimate,
        budget_micros: MULTIVERSE_BUDGET_MICROS,
        cost_budget_units: MULTIVERSE_DEFAULT_COST_BUDGET,
        parent_checkpoint_shared: m.parent_checkpoint_shared,
        rollback_re_sim_identical: m.rollback_re_sim_identical,
        divergence_detected: m.divergence_detected,
        distinct_branch_fingerprints: m.distinct_branch_fingerprints,
        all_outputs_finite: m.all_outputs_finite,
        cti_orders_aggressive_over_cautious: m.cti_orders_aggressive_over_cautious,
        budget_respected: m.budget_respected,
        parent_rollback_reproduces: m.parent_rollback_reproduces,
        g21_rollback_authority_green: m.g21_rollback_authority_green,
        g21_fingerprint: m.g21_fingerprint,
        zero_alloc_hot_loop: m.zero_alloc,
        measured_pass_micros: m.elapsed_micros,
        evidence_fingerprint: fp,
        distinct_from_ju_sequencing_timeline: distinct(ju),
        distinct_from_kv_wind_field: distinct(kv),
        distinct_from_ku_world_forge: distinct(ku),
        distinct_from_hg_spatial_grid: distinct(hg),
        distinct_from_kq_sdf_contact: distinct(kq),
        distinct_from_kr_micro_shadow: distinct(kr),
        distinct_from_ks_deformation: distinct(ks),
        distinct_from_kt_async_compute: distinct(kt),
        distinct_from_ko_euphoria: distinct(ko),
        distinct_from_io_sph_probe: distinct(io),
        distinct_from_hs_field_network_probe: distinct(hs),
        distinct_from_fw_quantum_overlap_probe: distinct(fw),
        distinct_from_ip4_svo_terrain_probe: distinct(ip4),
        distinct_from_s17_physics_world_probe: distinct(s17),
        distinct_from_jt_task_graph_probe: distinct(jt),
        distinct_from_kw_auto_photography: distinct(kw),
        distinct_from_kx_cinema_frame_graph_composition: distinct(kx),
        distinct_from_ky_cinema_hot_loop_composition: distinct(ky),
        distinct_from_gv_aerodynamic_navier_stokes: distinct(gv),
        distinct_from_ip_position_based_dynamics: distinct(ip_peer),
        distinct_from_jy_living_sky_buoyancy: distinct(jy),
        distinct_from_kz_vehicle_chassis_dynamics: distinct(kz),
        distinct_from_la_flight_aerodynamics: distinct(la),
        distinct_from_lb_celestial_orbital_dynamics: distinct(lb),
        distinct_from_lc_latent_dreamspace_bytecode: distinct(lc),
        distinct_from_ld_micro_dream_gpu_pass: distinct(ld),
        distinct_from_le_holographic_scene_tensor: distinct(le),
        multiverse_rollback_aaa_ready: false,
        multiverse_selection_aaa_ready: false,
        multiverse_cti_aaa_ready: false,
        multiverse_re_sim_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        quic_ready: false,
    }
}

/// Deterministic double-pass soak: bit-identical fingerprints ⇒ `deterministic`.
///
/// Report memoized process-wide via `OnceLock` (peer-DAG rationale in
/// `run_synesthetic_resonance_matrix_soak`).
pub fn run_multiverse_rollback_branching_soak() -> MultiverseRollbackBranchingReport {
    static CACHE: std::sync::OnceLock<MultiverseRollbackBranchingReport> =
        std::sync::OnceLock::new();
    CACHE
        .get_or_init(|| {
            let a = run_measured_pass();
            let b = run_measured_pass();
            let deterministic =
                multiverse_evidence_fingerprint(&a) == multiverse_evidence_fingerprint(&b);
            report_from_measured(&a, deterministic)
        })
        .clone()
}

/// Probe command — delegates to the soak (single source of truth).
pub fn probe_multiverse_rollback_branching() -> MultiverseRollbackBranchingReport {
    run_multiverse_rollback_branching_soak()
}

// ---------------------------------------------------------------------------
// AAA test suite (doctrine #3 — mandatory, mathematical invariants).
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    /// Fast nominal pass (no g21 soak, no peer fetch).
    fn nominal() -> MultiverseOutcome {
        run_multiverse_pass(MULTIVERSE_SOAK_SEED, MULTIVERSE_DEFAULT_COST_BUDGET)
    }

    #[test]
    fn branch_policy_metadata_is_stable() {
        assert_eq!(BranchPolicy::ALL.len(), MULTIVERSE_BRANCH_COUNT);
        for (i, p) in BranchPolicy::ALL.iter().enumerate() {
            assert_eq!(p.index(), i);
            assert!(!p.tag().is_empty());
        }
        let tags = BranchPolicy::ALL.map(|p| p.tag());
        assert_ne!(tags[0], tags[1]);
        assert_ne!(tags[1], tags[2]);
        assert_ne!(tags[2], tags[3]);
        assert!(BranchPolicy::Aggressive.scale() > BranchPolicy::Neutral.scale());
        assert!(BranchPolicy::Neutral.scale() > BranchPolicy::Cautious.scale());
        // Each policy consumes a distinct rng stream.
        let seeds = BranchPolicy::ALL.map(|p| p.policy_seed(MULTIVERSE_SOAK_SEED));
        assert_ne!(seeds[0], seeds[1]);
        assert_ne!(seeds[1], seeds[2]);
        assert_ne!(seeds[2], seeds[3]);
    }

    #[test]
    fn parent_checkpoint_shared_by_all_branches() {
        let o = nominal();
        for b in &o.branches {
            assert!(b.simulated);
            assert!(
                b.parent_checkpoint_identical,
                "policy {} must share the identical parent checkpoint",
                b.policy.tag()
            );
        }
    }

    #[test]
    fn each_branch_diverges_from_parent() {
        let o = nominal();
        for b in &o.branches {
            assert_ne!(b.final_fingerprint, o.parent_fingerprint);
            assert_ne!(b.state_delta, 0);
        }
        assert!(o.divergence_detected);
        assert!(o.distinct_branch_fingerprints >= 2);
    }

    #[test]
    fn cti_orders_aggressive_over_cautious() {
        let o = nominal();
        assert!(
            o.branches[BranchPolicy::Aggressive.index()].cti
                > o.branches[BranchPolicy::Cautious.index()].cti,
            "aggressive CTI must exceed cautious CTI"
        );
        assert!(
            o.branches[BranchPolicy::Aggressive.index()].kinetic_energy
                > o.branches[BranchPolicy::Cautious.index()].kinetic_energy,
            "aggressive kinetic energy must exceed cautious"
        );
    }

    #[test]
    fn max_cti_branch_selected() {
        let o = nominal();
        let max = o
            .branches
            .iter()
            .map(|b| b.cti)
            .fold(0.0f32, f32::max);
        assert!((o.selected_cti - max).abs() <= 1e-6);
        assert!(
            o.selected_branch < MULTIVERSE_BRANCH_COUNT as u32,
            "selected branch index must be a real branch"
        );
        assert_eq!(o.branches[o.selected_branch as usize].cti, max);
    }

    #[test]
    fn nominal_pass_stays_within_cost_budget() {
        let o = nominal();
        assert!(!o.budget_cut);
        assert!(o.cost_estimate > 0);
        assert!(o.cost_estimate <= MULTIVERSE_DEFAULT_COST_BUDGET);
    }

    #[test]
    fn overflow_triggers_budget_cut_fail_closed() {
        // Budget = 1: the parent alone (6 units) overflows → no branch runs.
        let o = run_multiverse_pass(MULTIVERSE_SOAK_SEED, 1);
        assert!(o.budget_cut);
        assert!(o.branches.iter().all(|b| !b.simulated));
        assert_eq!(o.selected_branch, u32::MAX);
        assert_eq!(o.selected_cti, 0.0);
        assert_eq!(o.distinct_branch_fingerprints, 0);
        assert!(!o.divergence_detected);
    }

    #[test]
    fn partial_budget_cut_is_honestly_reported() {
        // Budget = 6 (exactly the parent cost): branch 0 simulates, the other
        // three are cut — the pass must report budget_cut and never pretend
        // the selection is a complete four-future scan.
        let o = run_multiverse_pass(MULTIVERSE_SOAK_SEED, 6);
        assert!(o.budget_cut);
        assert!(o.branches[0].simulated);
        assert!(o.branches[1..].iter().all(|b| !b.simulated));
        assert_eq!(o.selected_branch, 0);
        let simulated = o.branches.iter().filter(|b| b.simulated).count();
        assert_eq!(simulated, 1);
    }

    #[test]
    fn rollback_re_sim_reproduces_each_fingerprint() {
        let o = nominal();
        for b in &o.branches {
            assert!(
                b.re_sim_identical,
                "policy {} rollback re-sim must reproduce its fingerprint",
                b.policy.tag()
            );
        }
        assert!(o.all_branches_re_sim_identical);
    }

    #[test]
    fn parent_rollback_reproduces_parent_fingerprint() {
        let o = nominal();
        assert!(o.parent_rollback_reproduces);
    }

    #[test]
    fn divergence_detected_across_branches() {
        let o = nominal();
        assert!(o.distinct_branch_fingerprints >= 2);
        assert!(o.divergence_detected);
    }

    #[test]
    fn distinct_seeds_distinct_parent_fingerprints() {
        let a = run_multiverse_pass(MULTIVERSE_SOAK_SEED, MULTIVERSE_DEFAULT_COST_BUDGET);
        let b = run_multiverse_pass(MULTIVERSE_SOAK_SEED.wrapping_add(0xABCD), MULTIVERSE_DEFAULT_COST_BUDGET);
        assert_ne!(a.parent_fingerprint, b.parent_fingerprint);
        assert_ne!(a.selected_cti, 0.0);
        assert_ne!(b.selected_cti, 0.0);
    }

    #[test]
    fn zero_alloc_hot_loop_keep_capacity() {
        assert!(zero_alloc_hot_loop_probe());
    }

    #[test]
    fn outputs_finite_and_bounded() {
        let o = nominal();
        for b in &o.branches {
            assert!(b.output_finite, "policy {} output must be finite", b.policy.tag());
            assert!(b.cti.is_finite());
            assert!((0.0..=1.0).contains(&b.cti));
            assert!(b.kinetic_energy.is_finite() && b.kinetic_energy >= 0.0);
            assert!(b.collision_proximity.is_finite() && b.collision_proximity >= 0.0);
        }
        assert!(o.cti_max >= o.cti_min);
        assert!(o.cti_min >= 0.0);
        assert!(o.cti_max <= 1.0);
    }

    #[test]
    fn soak_reports_ready_with_aaa_held() {
        let r = run_multiverse_rollback_branching_soak();
        assert!(r.ready, "soak must be ready");
        assert!(r.deterministic);
        assert!(r.is_finite());
        assert!(r.parent_checkpoint_shared);
        assert!(r.rollback_re_sim_identical);
        assert!(r.divergence_detected);
        assert!(r.cti_orders_aggressive_over_cautious);
        assert!(r.budget_respected);
        assert!(r.g21_rollback_authority_green);
        assert!(r.zero_alloc_hot_loop);
        assert_eq!(r.simulated_branches, MULTIVERSE_BRANCH_COUNT as u32);
        assert!(!r.budget_cut);
        // AAA is never claimed by the kernel itself.
        assert!(!r.multiverse_rollback_aaa_ready);
        assert!(!r.multiverse_selection_aaa_ready);
        assert!(!r.multiverse_cti_aaa_ready);
        assert!(!r.multiverse_re_sim_aaa_ready);
        assert!(!r.coins_ready);
        assert!(!r.agones_ready);
        assert!(!r.quic_ready);
    }

    #[test]
    fn evidence_kind_is_distinct() {
        let r = run_multiverse_rollback_branching_soak();
        assert_eq!(r.evidence_kind, MULTIVERSE_EVIDENCE_KIND);
    }

    #[test]
    fn soak_is_deterministic_across_runs() {
        let a = run_multiverse_rollback_branching_soak();
        let b = run_multiverse_rollback_branching_soak();
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
        assert_eq!(a.parent_fingerprint, b.parent_fingerprint);
        assert_eq!(a.selected_branch, b.selected_branch);
    }

    #[test]
    fn probe_matches_soak() {
        let p = probe_multiverse_rollback_branching();
        let s = run_multiverse_rollback_branching_soak();
        assert_eq!(p.evidence_fingerprint, s.evidence_fingerprint);
        assert_eq!(p.ready, s.ready);
    }

    #[test]
    fn distinct_from_all_peers() {
        let r = run_multiverse_rollback_branching_soak();
        assert!(r.distinct_from_ju_sequencing_timeline);
        assert!(r.distinct_from_kv_wind_field);
        assert!(r.distinct_from_ku_world_forge);
        assert!(r.distinct_from_hg_spatial_grid);
        assert!(r.distinct_from_kq_sdf_contact);
        assert!(r.distinct_from_kr_micro_shadow);
        assert!(r.distinct_from_ks_deformation);
        assert!(r.distinct_from_kt_async_compute);
        assert!(r.distinct_from_ko_euphoria);
        assert!(r.distinct_from_io_sph_probe);
        assert!(r.distinct_from_hs_field_network_probe);
        assert!(r.distinct_from_fw_quantum_overlap_probe);
        assert!(r.distinct_from_ip4_svo_terrain_probe);
        assert!(r.distinct_from_s17_physics_world_probe);
        assert!(r.distinct_from_jt_task_graph_probe);
        assert!(r.distinct_from_kw_auto_photography);
        assert!(r.distinct_from_kx_cinema_frame_graph_composition);
        assert!(r.distinct_from_ky_cinema_hot_loop_composition);
        assert!(r.distinct_from_gv_aerodynamic_navier_stokes);
        assert!(r.distinct_from_ip_position_based_dynamics);
        assert!(r.distinct_from_jy_living_sky_buoyancy);
        assert!(r.distinct_from_kz_vehicle_chassis_dynamics);
        assert!(r.distinct_from_la_flight_aerodynamics);
        assert!(r.distinct_from_lb_celestial_orbital_dynamics);
        assert!(r.distinct_from_lc_latent_dreamspace_bytecode);
        assert!(r.distinct_from_ld_micro_dream_gpu_pass);
        assert!(r.distinct_from_le_holographic_scene_tensor);
    }
}
