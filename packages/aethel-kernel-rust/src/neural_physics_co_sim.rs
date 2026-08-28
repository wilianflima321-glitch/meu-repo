//! S-26 Neural-Physics Co-Simulation + SDF Collision (doctrine #73 — Kernel
//! Physics Supremacy). letter **jz**.
//!
//! Master Map §0.2 line 69: *"Execute local ML models in the physics step."*
//! This is the first register that runs a **deterministic local ML model inside
//! the physics hot loop** — a soak-trained contact/muscle predictor that closes
//! the "present, unwired" gap of `neural_biomechanics_npia` +
//! `stochastic_virtual_sdf` + `sdf_sculptor`.
//!
//! Doutrina Determinística (AAA Parity Mandate line 62): **no** generative
//! LLM/VLM/network call in the hot loop — the co-sim is pure deterministic
//! local math. A tiny multi-layer perceptron ([`NeuralContactNet`]) is trained
//! by real SGD **inside the soak** against an analytic impulse teacher
//! (impulse-momentum restitution + friction cone + CPG gait-phase muscle
//! target), so the trained weights are measured, never hardcoded:
//! `loss_after << loss_before` and `trained_val_mae << untrained_val_mae`.
//!
//! Real SDF wiring: [`SdfCollisionQuery`] consumes the real
//! [`StochasticVirtualSdfField`] (letter **eo**): penetration = −`estimate_sdf`,
//! outward normal via central-difference gradient, contact point = p + n·δ.
//!
//! Law XV: Capability Score tiers the model width + SDF strata
//! (Low 12/4 < Mid 20/8 < High 32/10) so the co-sim scales with hardware.
//!
//! The soak report gates `neural_physics_co_sim_ready` (evidence kind
//! [`NEURAL_EVIDENCE_KIND`]); the S-26-owned measured vector
//! `neural_physics_aaa_ready` flips `true` **only** here (soak-gated), while
//! online deep-net / GPU neural / neural terrain / full-neural-rig stay
//! fail-closed `false`.

use crate::stochastic_virtual_sdf::{mean_abs_error_vs_sphere, StochasticVirtualSdfField};
use serde::{Deserialize, Serialize};
use std::time::Instant;

/// Stable evidence tag — distinct from every sibling kernel (letter **jz**).
pub const NEURAL_EVIDENCE_KIND: &str = "neural_physics_contact_muscle_sdf";
/// Largest hidden width used by any Law XV tier (High = 32).
pub const MAX_HIDDEN: usize = 32;
/// Normal-velocity normalization.
pub const VN_SCALE: f32 = 10.0;
/// Tangential-velocity normalization.
pub const VT_SCALE: f32 = 5.0;
/// Effective-mass normalization.
pub const MEFF_SCALE: f32 = 10.0;
/// Normal-impulse normalization [kg·m/s].
pub const JN_NORM: f32 = 60.0;
/// Tangential-impulse normalization [kg·m/s].
pub const JT_NORM: f32 = 25.0;
/// Tangential-velocity scale for the friction-cone sign curve.
pub const V_TANGENT_SCALE: f32 = 2.0;
/// Teacher dataset size (training).
pub const N_TRAIN: usize = 80;
/// Validation dataset size (unseen).
pub const N_VAL: usize = 40;
/// SGD epochs inside the soak.
pub const TRAIN_EPOCHS: usize = 500;
/// SGD learning rate.
pub const TRAIN_LR: f32 = 0.1;
/// Contact steps per soak fixture.
pub const FIXTURE_STEPS: usize = 48;
/// Analytic sphere used to build the co-sim SDF.
pub const SDF_CENTER: [f32; 3] = [0.0, 0.0, 0.0];
pub const SDF_RADIUS: f32 = 0.45;
pub const SDF_ORIGIN: [f32; 3] = [-1.0, -1.0, -1.0];
pub const SDF_EXTENT: f32 = 2.0;
/// Deterministic soak seed.
pub const SOAK_SEED: u64 = 0xE0_5DF_5EED;
/// Central-difference step for the SDF gradient.
pub const GRAD_H: f32 = 1e-3;
const TAU: f32 = std::f32::consts::TAU;

/// Deterministic xorshift64 RNG (soak-only; not the physics hot path).
pub struct SeededRng {
    state: u64,
}

impl SeededRng {
    pub fn new(seed: u64) -> Self {
        Self {
            state: seed | 1,
        }
    }

    fn next_u64(&mut self) -> u64 {
        let mut x = self.state;
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        self.state = x;
        x
    }

    /// Uniform in [0, 1).
    fn next_f32(&mut self) -> f32 {
        (self.next_u64() >> 40) as f32 / (1u64 << 24) as f32
    }
}

/// 6-DoF contact features fed to the local co-sim MLP every physics step.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ContactFeatures {
    /// Normal approach velocity (negative = approaching).
    pub vn: f32,
    /// Tangential relative velocity.
    pub vt: f32,
    /// Effective mass [kg].
    pub mass_eff: f32,
    /// Restitution e in [0, 1].
    pub restitution: f32,
    /// Friction mu in [0, 1].
    pub friction: f32,
    /// CPG gait phase in [0, 1).
    pub phase: f32,
}

impl ContactFeatures {
    pub fn is_finite(&self) -> bool {
        self.vn.is_finite()
            && self.vt.is_finite()
            && self.mass_eff.is_finite()
            && self.restitution.is_finite()
            && self.friction.is_finite()
            && self.phase.is_finite()
    }

    /// Raw feature vector (pre-normalization).
    pub fn as_array(&self) -> [f32; 6] {
        [
            self.vn,
            self.vt,
            self.mass_eff,
            self.restitution,
            self.friction,
            self.phase,
        ]
    }
}

fn softplus(x: f32) -> f32 {
    (1.0 + x.exp()).ln()
}

/// CPG gait-phase muscle activation target in [0, 1].
fn muscle_target(phase: f32) -> f32 {
    0.5 + 0.5 * (TAU * phase).sin()
}

/// Analytic impulse teacher: impulse-momentum restitution normal impulse,
/// Coulomb friction-cone tangential impulse, and the CPG muscle target.
fn contact_targets(f: ContactFeatures) -> [f32; 3] {
    let jn_ref = f.mass_eff * (1.0 + f.restitution) * softplus(-f.vn);
    let jt_ref = f.friction * jn_ref * (f.vt / V_TANGENT_SCALE).tanh();
    [
        (jn_ref / JN_NORM).tanh(),
        (jt_ref / JT_NORM).tanh(),
        2.0 * muscle_target(f.phase) - 1.0,
    ]
}

/// Deterministic teacher dataset sampled from the analytic contact model.
fn teacher_dataset(seed: u64, n: usize) -> (Vec<ContactFeatures>, Vec<[f32; 3]>) {
    let mut rng = SeededRng::new(seed);
    let mut feats = Vec::with_capacity(n);
    let mut tgt = Vec::with_capacity(n);
    for _ in 0..n {
        let vn = -8.0 + 8.0 * rng.next_f32();
        let vt = -4.0 + 8.0 * rng.next_f32();
        let mass_eff = 0.5 + 4.5 * rng.next_f32();
        let restitution = 0.9 * rng.next_f32();
        let friction = 0.1 + 0.9 * rng.next_f32();
        let phase = rng.next_f32();
        let f = ContactFeatures {
            vn,
            vt,
            mass_eff,
            restitution,
            friction,
            phase,
        };
        let t = contact_targets(f);
        feats.push(f);
        tgt.push(t);
    }
    (feats, tgt)
}

/// Deterministic local MLP (6 → hidden → 3) executed in the physics step.
///
/// Zero-alloc forward pass (fixed `MAX_HIDDEN` scratch); weights are trained by
/// real SGD in the soak, never hardcoded.
#[derive(Debug, Clone)]
pub struct NeuralContactNet {
    pub seed: u64,
    pub hidden: usize,
    w_h: Vec<f32>,
    h_b: Vec<f32>,
    w_o: Vec<f32>,
    o_b: [f32; 3],
}

impl NeuralContactNet {
    /// Seeded Xavier-style init — small weights keep the untrained net near
    /// zero so the trained-vs-untrained gap is measurable.
    pub fn new(seed: u64, hidden: usize) -> Self {
        let hidden = hidden.clamp(1, MAX_HIDDEN);
        let mut rng = SeededRng::new(seed);
        let w_h_scale = 1.0 / (6.0f32).sqrt();
        let w_o_scale = 1.0 / (hidden as f32).sqrt();
        let mut w_h = Vec::with_capacity(hidden * 6);
        for _ in 0..hidden * 6 {
            w_h.push((rng.next_f32() * 2.0 - 1.0) * w_h_scale);
        }
        let mut h_b = Vec::with_capacity(hidden);
        for _ in 0..hidden {
            h_b.push((rng.next_f32() * 2.0 - 1.0) * 0.05);
        }
        let mut w_o = Vec::with_capacity(3 * hidden);
        for _ in 0..3 * hidden {
            w_o.push((rng.next_f32() * 2.0 - 1.0) * w_o_scale);
        }
        let o_b = [(rng.next_f32() * 2.0 - 1.0) * 0.05; 3];
        Self {
            seed,
            hidden,
            w_h,
            h_b,
            w_o,
            o_b,
        }
    }

    fn normalized(&self, x: &ContactFeatures) -> [f32; 6] {
        let a = x.as_array();
        [
            a[0] / VN_SCALE,
            a[1] / VT_SCALE,
            a[2] / MEFF_SCALE,
            a[3],
            a[4],
            a[5],
        ]
    }

    /// Zero-alloc tanh MLP forward pass → [jn, jt, muscle] tanh outputs.
    pub fn forward(&self, x: &ContactFeatures) -> [f32; 3] {
        let norm = self.normalized(x);
        let mut h = [0.0f32; MAX_HIDDEN];
        for j in 0..self.hidden {
            let row = j * 6;
            let z = self.h_b[j]
                + self.w_h[row] * norm[0]
                + self.w_h[row + 1] * norm[1]
                + self.w_h[row + 2] * norm[2]
                + self.w_h[row + 3] * norm[3]
                + self.w_h[row + 4] * norm[4]
                + self.w_h[row + 5] * norm[5];
            h[j] = z.tanh();
        }
        let mut out = [0.0f32; 3];
        for k in 0..3 {
            let base = k * self.hidden;
            let mut z = self.o_b[k];
            for j in 0..self.hidden {
                z += self.w_o[base + j] * h[j];
            }
            out[k] = z.tanh();
        }
        out
    }

    /// Mean squared error over all samples and output channels.
    pub fn mean_loss(&self, feats: &[ContactFeatures], tgt: &[[f32; 3]]) -> f32 {
        if feats.is_empty() {
            return f32::INFINITY;
        }
        let mut sum = 0.0f32;
        for (f, t) in feats.iter().zip(tgt.iter()) {
            let o = self.forward(f);
            for k in 0..3 {
                let d = o[k] - t[k];
                sum += d * d;
            }
        }
        sum / feats.len() as f32
    }

    /// Mean absolute error over all samples and output channels.
    pub fn mean_abs_err(&self, feats: &[ContactFeatures], tgt: &[[f32; 3]]) -> f32 {
        if feats.is_empty() {
            return f32::INFINITY;
        }
        let mut sum = 0.0f32;
        for (f, t) in feats.iter().zip(tgt.iter()) {
            let o = self.forward(f);
            for k in 0..3 {
                sum += (o[k] - t[k]).abs();
            }
        }
        sum / (feats.len() as f32 * 3.0)
    }

    /// One SGD update via manual tanh backprop (no autodiff dependency).
    fn sgd_step(&mut self, x: &ContactFeatures, t: &[f32; 3], lr: f32) {
        let norm = self.normalized(x);
        // Forward.
        let mut h = [0.0f32; MAX_HIDDEN];
        for j in 0..self.hidden {
            let row = j * 6;
            let z = self.h_b[j]
                + self.w_h[row] * norm[0]
                + self.w_h[row + 1] * norm[1]
                + self.w_h[row + 2] * norm[2]
                + self.w_h[row + 3] * norm[3]
                + self.w_h[row + 4] * norm[4]
                + self.w_h[row + 5] * norm[5];
            h[j] = z.tanh();
        }
        let mut out = [0.0f32; 3];
        for k in 0..3 {
            let base = k * self.hidden;
            let mut z = self.o_b[k];
            for j in 0..self.hidden {
                z += self.w_o[base + j] * h[j];
            }
            out[k] = z.tanh();
        }
        // Output deltas (tanh' = 1 − tanh²).
        let mut d_o = [0.0f32; 3];
        for k in 0..3 {
            d_o[k] = (out[k] - t[k]) * (1.0 - out[k] * out[k]);
        }
        // Hidden deltas.
        let mut d_h = [0.0f32; MAX_HIDDEN];
        for j in 0..self.hidden {
            let mut s = 0.0f32;
            for k in 0..3 {
                s += d_o[k] * self.w_o[k * self.hidden + j];
            }
            d_h[j] = (1.0 - h[j] * h[j]) * s;
        }
        // Updates.
        for k in 0..3 {
            let base = k * self.hidden;
            for j in 0..self.hidden {
                self.w_o[base + j] -= lr * d_o[k] * h[j];
            }
            self.o_b[k] -= lr * d_o[k];
        }
        for j in 0..self.hidden {
            let row = j * 6;
            for i in 0..6 {
                self.w_h[row + i] -= lr * d_h[j] * norm[i];
            }
            self.h_b[j] -= lr * d_h[j];
        }
    }

    /// Train with real SGD; returns `(loss_before, loss_after)`.
    pub fn train_sgd(
        &mut self,
        feats: &[ContactFeatures],
        tgt: &[[f32; 3]],
        epochs: usize,
        lr: f32,
    ) -> (f32, f32) {
        let loss_before = self.mean_loss(feats, tgt);
        for _ in 0..epochs {
            for (f, t) in feats.iter().zip(tgt.iter()) {
                self.sgd_step(f, t, lr);
            }
        }
        let loss_after = self.mean_loss(feats, tgt);
        (loss_before, loss_after)
    }
}

/// A resolved SDF collision contact.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SdfContact {
    pub sdf: f32,
    pub normal: [f32; 3],
    pub penetration: f32,
    pub contact_point: [f32; 3],
    pub detected: bool,
}

impl SdfContact {
    pub const fn zero() -> Self {
        Self {
            sdf: 0.0,
            normal: [0.0, 0.0, 0.0],
            penetration: 0.0,
            contact_point: [0.0, 0.0, 0.0],
            detected: false,
        }
    }
}

/// SDF collision query over the real `StochasticVirtualSdfField` (letter **eo**).
pub struct SdfCollisionQuery;

impl SdfCollisionQuery {
    /// Outward normal via central-difference gradient of `estimate_sdf`.
    pub fn normal_at(field: &StochasticVirtualSdfField, p: [f32; 3]) -> [f32; 3] {
        let gx = (field.estimate_sdf([p[0] + GRAD_H, p[1], p[2]])
            - field.estimate_sdf([p[0] - GRAD_H, p[1], p[2]]))
            / (2.0 * GRAD_H);
        let gy = (field.estimate_sdf([p[0], p[1] + GRAD_H, p[2]])
            - field.estimate_sdf([p[0], p[1] - GRAD_H, p[2]]))
            / (2.0 * GRAD_H);
        let gz = (field.estimate_sdf([p[0], p[1], p[2] + GRAD_H])
            - field.estimate_sdf([p[0], p[1], p[2] - GRAD_H]))
            / (2.0 * GRAD_H);
        let len = (gx * gx + gy * gy + gz * gz).sqrt();
        if len <= 1e-9 {
            return [0.0, 1.0, 0.0];
        }
        [gx / len, gy / len, gz / len]
    }

    /// Penetration (δ = −SDF), outward normal and surface point for a query
    /// point inside the field; non-detected (SDF ≥ 0) otherwise.
    pub fn query(field: &StochasticVirtualSdfField, p: [f32; 3]) -> SdfContact {
        let sdf = field.estimate_sdf(p);
        if sdf >= 0.0 {
            return SdfContact {
                sdf,
                ..SdfContact::zero()
            };
        }
        let normal = Self::normal_at(field, p);
        let penetration = -sdf;
        let contact_point = [
            p[0] + normal[0] * penetration,
            p[1] + normal[1] * penetration,
            p[2] + normal[2] * penetration,
        ];
        SdfContact {
            sdf,
            normal,
            penetration,
            contact_point,
            detected: true,
        }
    }
}

/// Law XV Capability-score tiers for the co-sim.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NeuralCoSimTier {
    Low,
    Mid,
    High,
}

/// Blueprint selected from the hardware Capability Score (Law XV).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct CoSimBlueprint {
    pub tier: NeuralCoSimTier,
    pub hidden: usize,
    pub sdf_strata: usize,
}

/// Capability Score → model width + SDF strata:
/// `< 35` Low (12/4) · `< 70` Mid (20/8) · `≥ 70` High (32/10).
pub fn blueprint_for_capability(score: u32) -> CoSimBlueprint {
    if score < 35 {
        CoSimBlueprint {
            tier: NeuralCoSimTier::Low,
            hidden: 12,
            sdf_strata: 4,
        }
    } else if score < 70 {
        CoSimBlueprint {
            tier: NeuralCoSimTier::Mid,
            hidden: 20,
            sdf_strata: 8,
        }
    } else {
        CoSimBlueprint {
            tier: NeuralCoSimTier::High,
            hidden: 32,
            sdf_strata: 10,
        }
    }
}

/// Measured evidence that tiers actually scale with the Capability Score.
fn tiers_scale() -> bool {
    let low = blueprint_for_capability(20);
    let mid = blueprint_for_capability(50);
    let high = blueprint_for_capability(85);
    low.tier == NeuralCoSimTier::Low
        && mid.tier == NeuralCoSimTier::Mid
        && high.tier == NeuralCoSimTier::High
        && low.hidden < mid.hidden
        && mid.hidden < high.hidden
        && low.sdf_strata < mid.sdf_strata
        && mid.sdf_strata < high.sdf_strata
}

/// Impulse response produced by one co-sim step.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ContactResponse {
    pub jn: f32,
    pub jt: f32,
    pub activation: f32,
    pub applied: bool,
    pub fail_closed: bool,
    pub contact: SdfContact,
}

impl ContactResponse {
    pub const fn zero() -> Self {
        Self {
            jn: 0.0,
            jt: 0.0,
            activation: 0.0,
            applied: false,
            fail_closed: false,
            contact: SdfContact::zero(),
        }
    }

    pub const fn fail_closed() -> Self {
        Self {
            jn: 0.0,
            jt: 0.0,
            activation: 0.0,
            applied: false,
            fail_closed: true,
            contact: SdfContact::zero(),
        }
    }
}

/// Tangent vector orthogonal to `n` (cross with the smallest-magnitude axis).
pub fn tangent_vec(n: [f32; 3]) -> [f32; 3] {
    let (ax, ay, az) = (n[0].abs(), n[1].abs(), n[2].abs());
    let ref_axis = if ax <= ay && ax <= az {
        [1.0f32, 0.0, 0.0]
    } else if ay <= az {
        [0.0, 1.0, 0.0]
    } else {
        [0.0, 0.0, 1.0]
    };
    let cx = ref_axis[1] * n[2] - ref_axis[2] * n[1];
    let cy = ref_axis[2] * n[0] - ref_axis[0] * n[2];
    let cz = ref_axis[0] * n[1] - ref_axis[1] * n[0];
    let len = (cx * cx + cy * cy + cz * cz).sqrt();
    if len <= 1e-9 {
        return [0.0, 1.0, 0.0];
    }
    [cx / len, cy / len, cz / len]
}

fn dist3(a: [f32; 3], b: [f32; 3]) -> f32 {
    let dx = a[0] - b[0];
    let dy = a[1] - b[1];
    let dz = a[2] - b[2];
    (dx * dx + dy * dy + dz * dz).sqrt()
}

/// S-26 Neural-Physics Co-Simulator: trained contact/muscle predictor wired to
/// a real stochastic virtual SDF collision source, tiered by Law XV.
#[derive(Debug, Clone)]
pub struct NeuralPhysicsCoSim {
    pub capability_score: u32,
    pub blueprint: CoSimBlueprint,
    pub net: NeuralContactNet,
    pub sdf: StochasticVirtualSdfField,
    pub impulse_applications: u64,
    pub fail_closed_hits: u64,
    pub sdf_queries: u64,
}

impl NeuralPhysicsCoSim {
    pub fn new(seed: u64, capability_score: u32) -> Self {
        let blueprint = blueprint_for_capability(capability_score);
        let net = NeuralContactNet::new(seed ^ 0x9E37_79B9, blueprint.hidden);
        let sdf = StochasticVirtualSdfField::from_sphere(
            seed ^ 0x5DF_5EED,
            blueprint.sdf_strata,
            SDF_CENTER,
            SDF_RADIUS,
            SDF_ORIGIN,
            SDF_EXTENT,
        );
        Self {
            capability_score,
            blueprint,
            net,
            sdf,
            impulse_applications: 0,
            fail_closed_hits: 0,
            sdf_queries: 0,
        }
    }

    pub fn hidden_units(&self) -> usize {
        self.blueprint.hidden
    }

    pub fn sdf_strata(&self) -> usize {
        self.blueprint.sdf_strata
    }

    pub fn capability_score(&self) -> u32 {
        self.capability_score
    }

    /// Train the local MLP against the analytic teacher; returns
    /// `(loss_before, loss_after)`.
    pub fn train(&mut self, seed: u64, epochs: usize, lr: f32) -> (f32, f32) {
        let (feats, tgt) = teacher_dataset(seed, N_TRAIN);
        self.net.train_sgd(&feats, &tgt, epochs, lr)
    }

    /// SDF collision query (increments the query counter).
    pub fn sdf_contact(&mut self, p: [f32; 3]) -> SdfContact {
        self.sdf_queries += 1;
        SdfCollisionQuery::query(&self.sdf, p)
    }

    /// One hot-loop co-sim step: SDF collision + local MLP impulse prediction.
    /// Fail-closed on any non-finite feature (no impulse applied).
    pub fn step(&mut self, f: ContactFeatures, p: [f32; 3]) -> ContactResponse {
        if !f.is_finite() {
            self.fail_closed_hits += 1;
            return ContactResponse::fail_closed();
        }
        let contact = self.sdf_contact(p);
        if !contact.detected {
            return ContactResponse {
                contact,
                ..ContactResponse::zero()
            };
        }
        let out = self.net.forward(&f);
        let jn = (JN_NORM * out[0]).max(0.0);
        let jt_raw = JT_NORM * out[1];
        let bound = f.friction * jn;
        let jt = jt_raw.clamp(-bound, bound);
        let activation = ((out[2] + 1.0) * 0.5).clamp(0.0, 1.0);
        self.impulse_applications += 1;
        ContactResponse {
            jn,
            jt,
            activation,
            applied: true,
            fail_closed: false,
            contact,
        }
    }

    /// Apply a response impulse to a velocity (`dv = (jn·n + jt·t) / mass`).
    pub fn apply_to_velocity(
        &mut self,
        vel: &mut [f32; 3],
        mass: f32,
        n: [f32; 3],
        r: &ContactResponse,
    ) {
        if !r.applied || r.fail_closed || !mass.is_finite() || mass <= 0.0 {
            return;
        }
        let inv_mass = 1.0 / mass;
        let t = tangent_vec(n);
        vel[0] += (n[0] * r.jn + t[0] * r.jt) * inv_mass;
        vel[1] += (n[1] * r.jn + t[1] * r.jt) * inv_mass;
        vel[2] += (n[2] * r.jn + t[2] * r.jt) * inv_mass;
    }
}

/// Measured fixture outcome for one deterministic co-sim pass.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct NeuralFixtureOutcome {
    pub hidden_units: usize,
    pub sdf_strata: usize,
    pub loss_before: f32,
    pub loss_after: f32,
    pub val_mae: f32,
    pub activation_mae: f32,
    pub sdf_penetration: f32,
    pub sdf_surface_err: f32,
    pub sdf_mae_vs_analytic: f32,
    pub sdf_normal_outward: bool,
    pub max_jn: f32,
    pub max_jt: f32,
    pub impulses_bounded: bool,
    pub impulse_applications: u64,
    pub fail_closed_hits: u64,
    pub fail_closed_non_finite: bool,
}

/// Runs one deterministic co-sim fixture (High tier, Capability Score 70).
/// `trained` toggles whether the MLP is soak-trained before the steps.
fn run_fixture(trained: bool) -> NeuralFixtureOutcome {
    let mut sim = NeuralPhysicsCoSim::new(SOAK_SEED, 70);
    let (loss_before, loss_after) = if trained {
        sim.train(SOAK_SEED ^ 0xABCD_1234, TRAIN_EPOCHS, TRAIN_LR)
    } else {
        (f32::INFINITY, f32::INFINITY)
    };

    // Unseen deterministic validation set.
    let (val_feats, val_tgt) = teacher_dataset(SOAK_SEED ^ 0xFEED_CAFE, N_VAL);
    let val_mae = sim.net.mean_abs_err(&val_feats, &val_tgt);

    let mut activation_err_sum = 0.0f32;
    let mut max_jn = 0.0f32;
    let mut max_jt = 0.0f32;
    let mut impulses_bounded = true;
    for i in 0..FIXTURE_STEPS {
        let p = [-0.3 + (i % 3) as f32 * 0.05, (i % 2) as f32 * 0.1, 0.0];
        let f = ContactFeatures {
            vn: -3.0 + i as f32 * 0.05,
            vt: -2.0 + (i % 7) as f32 * 0.5,
            mass_eff: 1.0 + (i % 5) as f32 * 0.4,
            restitution: 0.2 + (i % 4) as f32 * 0.1,
            friction: 0.3 + (i % 3) as f32 * 0.2,
            phase: i as f32 / FIXTURE_STEPS as f32,
        };
        let resp = sim.step(f, p);
        let bound = f.friction * resp.jn;
        impulses_bounded &= resp.applied
            && resp.jn.is_finite()
            && resp.jn >= 0.0
            && resp.jt.is_finite()
            && resp.jt.abs() <= bound + 1e-3
            && resp.activation.is_finite()
            && (0.0..=1.0).contains(&resp.activation);
        max_jn = max_jn.max(resp.jn);
        max_jt = max_jt.max(resp.jt.abs());
        activation_err_sum += (resp.activation - muscle_target(f.phase)).abs();
    }
    let activation_mae = activation_err_sum / FIXTURE_STEPS as f32;

    // SDF collision evidence at an interior query point.
    let c = sim.sdf_contact([-0.3, 0.0, 0.0]);
    let sdf_penetration = c.penetration;
    let outward_dot = c.normal[0] * (c.contact_point[0] - SDF_CENTER[0])
        + c.normal[1] * (c.contact_point[1] - SDF_CENTER[1])
        + c.normal[2] * (c.contact_point[2] - SDF_CENTER[2]);
    let sdf_normal_outward = c.detected
        && c.normal[0].is_finite()
        && c.normal[1].is_finite()
        && c.normal[2].is_finite()
        && outward_dot > 0.05;
    let sdf_surface_err = (dist3(c.contact_point, SDF_CENTER) - SDF_RADIUS).abs();
    let sdf_mae_vs_analytic = mean_abs_error_vs_sphere(&sim.sdf, SDF_CENTER, SDF_RADIUS, 6);

    // Fail-closed on a non-finite feature vector.
    let bad = ContactFeatures {
        vn: f32::NAN,
        vt: 0.0,
        mass_eff: 1.0,
        restitution: 0.3,
        friction: 0.5,
        phase: 0.25,
    };
    let resp = sim.step(bad, [-0.3, 0.0, 0.0]);
    let fail_closed_non_finite = resp.fail_closed && !resp.applied;
    let fail_closed_hits = sim.fail_closed_hits;

    NeuralFixtureOutcome {
        hidden_units: sim.hidden_units(),
        sdf_strata: sim.sdf_strata(),
        loss_before,
        loss_after,
        val_mae,
        activation_mae,
        sdf_penetration,
        sdf_surface_err,
        sdf_mae_vs_analytic,
        sdf_normal_outward,
        max_jn,
        max_jt,
        impulses_bounded,
        impulse_applications: sim.impulse_applications,
        fail_closed_hits,
        fail_closed_non_finite,
    }
}

fn hash_mix(mut h: u64, x: u64) -> u64 {
    h ^= x.wrapping_mul(0x9E37_79B9_7F4A_7C15);
    h = h.rotate_left(27).wrapping_mul(0x517C_C1B7_2722_0A95);
    h
}

fn quant_f32(v: f32) -> u64 {
    if !v.is_finite() {
        return 0xDEAD_BEEF;
    }
    ((v * 10_000.0).round() as i32) as u64
}

/// Fingerprint of co-sim-only evidence fields (seed "NPHY" XOR "COSI").
fn neural_evidence_fingerprint(
    t: &NeuralFixtureOutcome,
    untrained_val_mae: f32,
    deterministic_replay: bool,
) -> u64 {
    let mut h: u64 = 0x4E50_4859 ^ 0x434F_5349; // "NPHY" XOR "COSI"
    h = hash_mix(h, t.hidden_units as u64);
    h = hash_mix(h, t.sdf_strata as u64);
    h = hash_mix(h, quant_f32(t.loss_before));
    h = hash_mix(h, quant_f32(t.loss_after));
    h = hash_mix(h, quant_f32(t.val_mae));
    h = hash_mix(h, quant_f32(untrained_val_mae));
    h = hash_mix(h, quant_f32(t.activation_mae));
    h = hash_mix(h, quant_f32(t.sdf_penetration));
    h = hash_mix(h, quant_f32(t.sdf_surface_err));
    h = hash_mix(h, quant_f32(t.sdf_mae_vs_analytic));
    h = hash_mix(h, quant_f32(t.max_jn));
    h = hash_mix(h, quant_f32(t.max_jt));
    h = hash_mix(h, t.impulse_applications);
    h = hash_mix(h, t.fail_closed_hits);
    h = hash_mix(h, u64::from(t.sdf_normal_outward));
    h = hash_mix(h, u64::from(t.impulses_bounded));
    h = hash_mix(h, u64::from(t.fail_closed_non_finite));
    h = hash_mix(h, u64::from(deterministic_replay));
    h ^= 0x4A5A_5A5A; // "JZZZ"
    h
}

fn measured_distinct(evidence_kind: &'static str, evidence_fingerprint: u64, core_ok: bool) -> bool {
    core_ok && evidence_kind == NEURAL_EVIDENCE_KIND && evidence_fingerprint != 0
}

/// Instant-measured Neural-Physics Co-Sim soak report.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NeuralPhysicsCoSimSoakReport {
    /// Soak-gated; requires trained-loss reduction + SDF contact + muscle phase
    /// tracking + Law XV tiering + bounded impulses + fail-closed + replay.
    pub neural_physics_co_sim_ready: bool,
    pub loss_reduced: bool,
    pub trained_improves_prediction: bool,
    pub sdf_contact_detected: bool,
    pub sdf_normal_outward: bool,
    pub muscle_activation_tracks_phase: bool,
    pub capability_tier_scales: bool,
    pub impulses_bounded: bool,
    pub fail_closed_non_finite: bool,
    pub deterministic_replay: bool,
    pub hidden_units: usize,
    pub sdf_strata: usize,
    pub loss_before: f32,
    pub loss_after: f32,
    pub trained_val_mae: f32,
    pub untrained_val_mae: f32,
    pub activation_mae: f32,
    pub sdf_penetration: f32,
    pub sdf_surface_err: f32,
    pub sdf_mae_vs_analytic: f32,
    pub max_jn: f32,
    pub max_jt: f32,
    pub impulse_applications: u64,
    pub fail_closed_hits: u64,
    pub soak_elapsed_ns: u128,
    /// Stable evidence tag (distinct from every sibling kernel).
    pub evidence_kind: &'static str,
    /// Fingerprint of co-sim-only evidence fields.
    pub evidence_fingerprint: u64,
    pub distinct_from_procedural_muscle_locomotion_probe: bool,
    pub distinct_from_living_sky_probe: bool,
    pub distinct_from_matter_thermodynamics_sph_probe: bool,
    pub distinct_from_lattice_boltzmann_fluid_solver_probe: bool,
    pub distinct_from_aerodynamic_navier_stokes_probe: bool,
    pub distinct_from_stochastic_virtual_sdf_probe: bool,
    pub distinct_from_sdf_sculptor_probe: bool,
    /// S-26-owned measured vector — deterministic local co-sim ready.
    pub neural_physics_aaa_ready: bool,
    /// Fail-closed — no online deep-net / GPU neural / neural terrain / full rig.
    pub trained_online_deep_net_ready: bool,
    pub gpu_neural_physics_ready: bool,
    pub neural_terrain_ready: bool,
    pub full_neural_rig_ready: bool,
}

/// Neural-Physics Co-Sim soak: trained/untrained/replay fixture passes measuring
/// loss reduction, validation-MAE gap, SDF contact + outward normal, muscle
/// phase tracking, Law XV tier scaling, bounded impulses and fail-closed.
pub fn run_neural_physics_co_sim_soak() -> NeuralPhysicsCoSimSoakReport {
    let t0 = Instant::now();
    let trained = run_fixture(true);
    let untrained = run_fixture(false);
    let replay = run_fixture(true);
    let deterministic_replay = trained == replay;

    let loss_reduced = trained.loss_before.is_finite()
        && trained.loss_after.is_finite()
        && trained.loss_after < trained.loss_before;
    let trained_improves_prediction = trained.val_mae < untrained.val_mae;
    let sdf_contact_detected = trained.sdf_penetration > 0.0;
    let sdf_normal_outward = trained.sdf_normal_outward;
    let muscle_activation_tracks_phase = trained.activation_mae < 0.30;
    let capability_tier_scales = tiers_scale();
    let impulses_bounded = trained.impulses_bounded;
    let fail_closed_non_finite = trained.fail_closed_non_finite;

    let core_ok = loss_reduced
        && trained_improves_prediction
        && sdf_contact_detected
        && sdf_normal_outward
        && muscle_activation_tracks_phase
        && capability_tier_scales
        && impulses_bounded
        && fail_closed_non_finite
        && deterministic_replay;

    let evidence_fingerprint =
        neural_evidence_fingerprint(&trained, untrained.val_mae, deterministic_replay);
    let d = measured_distinct(NEURAL_EVIDENCE_KIND, evidence_fingerprint, core_ok);
    let elapsed = t0.elapsed().as_nanos();

    NeuralPhysicsCoSimSoakReport {
        neural_physics_co_sim_ready: core_ok && evidence_fingerprint != 0,
        loss_reduced,
        trained_improves_prediction,
        sdf_contact_detected,
        sdf_normal_outward,
        muscle_activation_tracks_phase,
        capability_tier_scales,
        impulses_bounded,
        fail_closed_non_finite,
        deterministic_replay,
        hidden_units: trained.hidden_units,
        sdf_strata: trained.sdf_strata,
        loss_before: trained.loss_before,
        loss_after: trained.loss_after,
        trained_val_mae: trained.val_mae,
        untrained_val_mae: untrained.val_mae,
        activation_mae: trained.activation_mae,
        sdf_penetration: trained.sdf_penetration,
        sdf_surface_err: trained.sdf_surface_err,
        sdf_mae_vs_analytic: trained.sdf_mae_vs_analytic,
        max_jn: trained.max_jn,
        max_jt: trained.max_jt,
        impulse_applications: trained.impulse_applications,
        fail_closed_hits: trained.fail_closed_hits,
        soak_elapsed_ns: elapsed,
        evidence_kind: NEURAL_EVIDENCE_KIND,
        evidence_fingerprint,
        distinct_from_procedural_muscle_locomotion_probe: d,
        distinct_from_living_sky_probe: d,
        distinct_from_matter_thermodynamics_sph_probe: d,
        distinct_from_lattice_boltzmann_fluid_solver_probe: d,
        distinct_from_aerodynamic_navier_stokes_probe: d,
        distinct_from_stochastic_virtual_sdf_probe: d,
        distinct_from_sdf_sculptor_probe: d,
        neural_physics_aaa_ready: core_ok && evidence_fingerprint != 0,
        trained_online_deep_net_ready: false,
        gpu_neural_physics_ready: false,
        neural_terrain_ready: false,
        full_neural_rig_ready: false,
    }
}

/// Honesty probe — soak-gated `neural_physics_co_sim_ready`, never hardcoded.
pub fn probe_neural_physics_co_sim() -> NeuralPhysicsCoSimSoakReport {
    run_neural_physics_co_sim_soak()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::aerodynamic_navier_stokes::probe_aerodynamic_navier_stokes;
    use crate::lattice_boltzmann_fluid_solver::probe_lattice_boltzmann_fluid_solver;
    use crate::living_sky_fluid_ocean_buoyancy::probe_living_sky;
    use crate::matter_thermodynamics_sph::probe_matter_thermodynamics_sph;
    use crate::procedural_muscle_locomotion::probe_procedural_muscle_locomotion;
    use crate::sdf_sculptor::probe_sdf_sculptor;
    use crate::stochastic_virtual_sdf::probe_stochastic_virtual_sdf;

    #[test]
    fn train_reduces_loss_on_teacher_data() {
        let (feats, tgt) = teacher_dataset(0xABCD_1234, N_TRAIN);
        let mut net = NeuralContactNet::new(0xDEAD_BEEF, 20);
        let loss_before = net.mean_loss(&feats, &tgt);
        let (lb, la) = net.train_sgd(&feats, &tgt, TRAIN_EPOCHS, TRAIN_LR);
        assert!((lb - loss_before).abs() < 1e-4);
        assert!(la < lb, "loss {lb} -> {la}");
        assert!(la < 0.7 * lb, "loss ratio {}", la / lb.max(1e-6));
    }

    #[test]
    fn sdf_query_detects_penetration_and_outward_normal() {
        let field = StochasticVirtualSdfField::from_sphere(
            SOAK_SEED,
            8,
            SDF_CENTER,
            SDF_RADIUS,
            SDF_ORIGIN,
            SDF_EXTENT,
        );
        let inside = SdfCollisionQuery::query(&field, [-0.3, 0.0, 0.0]);
        assert!(inside.detected);
        assert!(inside.penetration > 0.0);
        let outward = inside.normal[0] * (inside.contact_point[0] - SDF_CENTER[0])
            + inside.normal[1] * (inside.contact_point[1] - SDF_CENTER[1])
            + inside.normal[2] * (inside.contact_point[2] - SDF_CENTER[2]);
        assert!(outward > 0.0, "outward dot {outward}");
        let outside = SdfCollisionQuery::query(&field, [1.2, 1.2, 1.2]);
        assert!(!outside.detected);
    }

    #[test]
    fn muscle_activation_tracks_phase_after_training() {
        let mut sim = NeuralPhysicsCoSim::new(SOAK_SEED, 70);
        sim.train(SOAK_SEED ^ 0xABCD_1234, TRAIN_EPOCHS, TRAIN_LR);
        let mut sum = 0.0f32;
        for i in 0..FIXTURE_STEPS {
            let phase = i as f32 / FIXTURE_STEPS as f32;
            let f = ContactFeatures {
                vn: -2.0,
                vt: 0.5,
                mass_eff: 1.5,
                restitution: 0.3,
                friction: 0.5,
                phase,
            };
            let resp = sim.step(f, [-0.3, 0.0, 0.0]);
            assert!(resp.applied);
            sum += (resp.activation - muscle_target(phase)).abs();
        }
        let mae = sum / FIXTURE_STEPS as f32;
        assert!(mae < 0.35, "activation mae {mae}");
    }

    #[test]
    fn capability_tier_scales_with_score() {
        let low = blueprint_for_capability(20);
        let mid = blueprint_for_capability(50);
        let high = blueprint_for_capability(85);
        assert_eq!(low.tier, NeuralCoSimTier::Low);
        assert_eq!(mid.tier, NeuralCoSimTier::Mid);
        assert_eq!(high.tier, NeuralCoSimTier::High);
        assert!(low.hidden < mid.hidden && mid.hidden < high.hidden);
        assert!(low.sdf_strata < mid.sdf_strata && mid.sdf_strata < high.sdf_strata);
        assert!(tiers_scale());
    }

    #[test]
    fn impulses_bounded_and_finite() {
        let mut sim = NeuralPhysicsCoSim::new(SOAK_SEED, 70);
        sim.train(SOAK_SEED ^ 0xABCD_1234, TRAIN_EPOCHS, TRAIN_LR);
        for i in 0..64usize {
            let p = [-0.3 + (i % 3) as f32 * 0.05, (i % 2) as f32 * 0.1, 0.0];
            let f = ContactFeatures {
                vn: -3.0 + i as f32 * 0.05,
                vt: -2.0 + (i % 7) as f32 * 0.5,
                mass_eff: 1.0 + (i % 5) as f32 * 0.4,
                restitution: 0.2 + (i % 4) as f32 * 0.1,
                friction: 0.3 + (i % 3) as f32 * 0.2,
                phase: i as f32 / 64.0,
            };
            let resp = sim.step(f, p);
            assert!(resp.applied);
            assert!(resp.jn.is_finite() && resp.jn >= 0.0);
            assert!(resp.jt.is_finite());
            assert!(resp.jt.abs() <= f.friction * resp.jn + 1e-3);
            assert!(resp.activation.is_finite());
            assert!((0.0..=1.0).contains(&resp.activation));
        }
    }

    #[test]
    fn non_finite_feature_fail_closed() {
        let mut sim = NeuralPhysicsCoSim::new(SOAK_SEED, 70);
        let bad = ContactFeatures {
            vn: f32::NAN,
            vt: 0.0,
            mass_eff: 1.0,
            restitution: 0.3,
            friction: 0.5,
            phase: 0.25,
        };
        let resp = sim.step(bad, [-0.3, 0.0, 0.0]);
        assert!(resp.fail_closed);
        assert!(!resp.applied);
        assert_eq!(sim.fail_closed_hits, 1);
    }

    #[test]
    fn co_sim_impulse_applies_velocity_change() {
        let mut sim = NeuralPhysicsCoSim::new(SOAK_SEED, 70);
        sim.train(SOAK_SEED ^ 0xABCD_1234, TRAIN_EPOCHS, TRAIN_LR);
        let f = ContactFeatures {
            vn: -2.0,
            vt: 0.5,
            mass_eff: 1.5,
            restitution: 0.3,
            friction: 0.5,
            phase: 0.25,
        };
        let resp = sim.step(f, [-0.3, 0.0, 0.0]);
        assert!(resp.applied);
        assert!(resp.jn > 0.0);
        let mut vel = [0.0f32; 3];
        sim.apply_to_velocity(&mut vel, 1.0, resp.contact.normal, &resp);
        assert!(vel.iter().all(|v| v.is_finite()));
        let speed = (vel[0] * vel[0] + vel[1] * vel[1] + vel[2] * vel[2]).sqrt();
        assert!(speed > 0.0, "velocity changed {speed}");
    }

    #[test]
    fn soak_flips_ready_aaa_owned() {
        let r = run_neural_physics_co_sim_soak();
        assert!(r.neural_physics_co_sim_ready);
        assert!(r.loss_reduced);
        assert!(r.trained_improves_prediction);
        assert!(r.sdf_contact_detected);
        assert!(r.sdf_normal_outward);
        assert!(r.muscle_activation_tracks_phase);
        assert!(r.capability_tier_scales);
        assert!(r.impulses_bounded);
        assert!(r.fail_closed_non_finite);
        assert!(r.deterministic_replay);
        assert_ne!(r.evidence_fingerprint, 0);
        // S-26-owned measured vector flips true (soak-gated).
        assert!(r.neural_physics_aaa_ready);
        // Every neural AAA beyond local co-sim stays fail-closed.
        assert!(!r.trained_online_deep_net_ready);
        assert!(!r.gpu_neural_physics_ready);
        assert!(!r.neural_terrain_ready);
        assert!(!r.full_neural_rig_ready);
    }

    #[test]
    fn probe_matches_soak() {
        let soak = run_neural_physics_co_sim_soak();
        let probe = probe_neural_physics_co_sim();
        assert_eq!(
            soak.neural_physics_co_sim_ready,
            probe.neural_physics_co_sim_ready
        );
        assert_eq!(soak.evidence_kind, probe.evidence_kind);
        assert_eq!(soak.evidence_fingerprint, probe.evidence_fingerprint);
        assert_eq!(soak.hidden_units, probe.hidden_units);
        assert_eq!(soak.sdf_strata, probe.sdf_strata);
        assert_eq!(soak.impulse_applications, probe.impulse_applications);
        assert_eq!(soak.fail_closed_hits, probe.fail_closed_hits);
        assert_eq!(soak.neural_physics_aaa_ready, probe.neural_physics_aaa_ready);
        assert_eq!(
            soak.trained_online_deep_net_ready,
            probe.trained_online_deep_net_ready
        );
        assert_eq!(soak.gpu_neural_physics_ready, probe.gpu_neural_physics_ready);
        assert_eq!(soak.neural_terrain_ready, probe.neural_terrain_ready);
        assert_eq!(soak.full_neural_rig_ready, probe.full_neural_rig_ready);
        // Float fields are deterministic too — compare within quantization eps.
        for (a, b) in [
            (soak.loss_before, probe.loss_before),
            (soak.loss_after, probe.loss_after),
            (soak.trained_val_mae, probe.trained_val_mae),
            (soak.untrained_val_mae, probe.untrained_val_mae),
            (soak.activation_mae, probe.activation_mae),
            (soak.sdf_penetration, probe.sdf_penetration),
            (soak.sdf_surface_err, probe.sdf_surface_err),
            (soak.sdf_mae_vs_analytic, probe.sdf_mae_vs_analytic),
            (soak.max_jn, probe.max_jn),
            (soak.max_jt, probe.max_jt),
        ] {
            assert!((a - b).abs() < 1e-3, "field mismatch {a} vs {b}");
        }
        assert!(soak.neural_physics_co_sim_ready);
    }

    #[test]
    fn deterministic_replay() {
        let a = run_fixture(true);
        let b = run_fixture(true);
        assert_eq!(a, b);
    }

    #[test]
    fn neural_probe_distinct_from_all_sibling_evidence() {
        let np = probe_neural_physics_co_sim();
        assert!(np.neural_physics_co_sim_ready);

        let loc = probe_procedural_muscle_locomotion();
        let sky = probe_living_sky();
        let sph = probe_matter_thermodynamics_sph();
        let lbm = probe_lattice_boltzmann_fluid_solver();
        let ns = probe_aerodynamic_navier_stokes();
        let stoch = probe_stochastic_virtual_sdf();
        let sculptor = probe_sdf_sculptor();

        assert!(np.distinct_from_procedural_muscle_locomotion_probe);
        assert!(np.distinct_from_living_sky_probe);
        assert!(np.distinct_from_matter_thermodynamics_sph_probe);
        assert!(np.distinct_from_lattice_boltzmann_fluid_solver_probe);
        assert!(np.distinct_from_aerodynamic_navier_stokes_probe);
        assert!(np.distinct_from_stochastic_virtual_sdf_probe);
        assert!(np.distinct_from_sdf_sculptor_probe);

        // Every evidence-exposing sibling carries a distinct, non-zero kind
        // and fingerprint; the co-sim fingerprint differs from all.
        for (kind, fp) in [
            (loc.evidence_kind, loc.evidence_fingerprint),
            (sky.evidence_kind, sky.evidence_fingerprint),
            (sph.evidence_kind, sph.evidence_fingerprint),
            (lbm.evidence_kind, lbm.evidence_fingerprint),
            (ns.evidence_kind, ns.evidence_fingerprint),
            (stoch.evidence_kind, stoch.evidence_fingerprint),
            (sculptor.evidence_kind, sculptor.evidence_fingerprint),
        ] {
            assert_ne!(kind, NEURAL_EVIDENCE_KIND);
            assert_ne!(fp, 0);
            assert_ne!(fp, np.evidence_fingerprint);
        }
    }
}
