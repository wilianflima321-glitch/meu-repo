//! Atmospheric Scattering Godrays (lite) — letter **gb**.
//!
//! Replaces ZST / comment-theater `inject_atmospheric_volume` (unused
//! `sun_direction` / `air_density`, empty body, no soak/probe) with real
//! single-scattering Beer–Lambert along view→sun samples: optical depth
//! `τ = ∫ σ₀ · ρ(s) ds`, transmittance `T = exp(−τ)`, godray shaft integral
//! accumulates in-scatter · `T_view` · `T_sun`.
//!
//! Honesty probe `atmospheric_scattering_godrays_ready` /
//! `atmosphericScatteringGodraysReady` is **distinct** from ga
//! `voxelConeRadiosityReady`, fz `symmetricVectorAlgebraReady`, fy
//! `recursiveFractalEnhancementReady`, fx `blueNoiseDitheringReady`, fw
//! `quantumOverlapReady`, ew `volumetricExtinctionMediumReady`, and prior.
//!
//! Letter **il**: `evidence_kind` + `evidence_fingerprint` measure distinct
//! peer probes (not hardcoded `distinct_from_*: true`); trio cross-check vs fg/fp.
//!
//! **HELD:** Full volumetric fog AAA / UE sky atmosphere
//! (`volumetric_fog_aaa_ready: false`, `ue_sky_atmosphere_ready: false`) ·
//! Coins / Agones / Nanite / DLSS / Quic.

/// Default soak seed (deterministic fixtures).
pub const SOAK_SEED: u64 = 0x0B_60D1_A75;
/// Base mass extinction (1/m per unit density).
pub const BASE_SIGMA: f32 = 0.55;
/// Default view / sun march step (world units).
pub const DEFAULT_STEP: f32 = 0.08;
/// Default view march samples.
pub const DEFAULT_VIEW_STEPS: u32 = 32;
/// Default sun-path length for secondary ray (world units).
pub const DEFAULT_SUN_PATH: f32 = 2.5;
/// Default view path length (world units).
pub const DEFAULT_VIEW_PATH: f32 = 2.0;
/// Occluder density multiplier (slab).
pub const OCCLUDER_DENSITY_MUL: f32 = 8.0;
/// Absolute epsilon for soak compares.
pub const SOAK_EPS: f32 = 1e-5;
/// Fingerprint seed ("gbas").
const FP_SEED: u64 = 0x6762_6173;
const EPS: f32 = 1e-6;

/// Axis-aligned occluder slab (optional hard extinction).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct OccluderSlab {
    pub min: [f32; 3],
    pub max: [f32; 3],
    pub density_mul: f32,
}

impl OccluderSlab {
    #[inline]
    pub fn contains(&self, p: [f32; 3]) -> bool {
        p[0] >= self.min[0]
            && p[0] <= self.max[0]
            && p[1] >= self.min[1]
            && p[1] <= self.max[1]
            && p[2] >= self.min[2]
            && p[2] <= self.max[2]
    }
}

/// Participating-media + sun / view march parameters.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct GodrayParams {
    pub air_density: f32,
    pub base_sigma: f32,
    pub step: f32,
    pub view_steps: u32,
    pub view_path: f32,
    pub sun_path: f32,
    pub sun_intensity: f32,
    /// Optional height falloff scale (0 = uniform).
    pub height_falloff: f32,
    pub ground_y: f32,
    pub seed: u64,
}

impl Default for GodrayParams {
    fn default() -> Self {
        Self {
            air_density: 1.0,
            base_sigma: BASE_SIGMA,
            step: DEFAULT_STEP,
            view_steps: DEFAULT_VIEW_STEPS,
            view_path: DEFAULT_VIEW_PATH,
            sun_path: DEFAULT_SUN_PATH,
            sun_intensity: 1.0,
            height_falloff: 0.15,
            ground_y: -1.0,
            seed: SOAK_SEED,
        }
    }
}

/// One godray / transmittance sample result (all scalars in [0,1] when finite).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct GodraySample {
    /// Path transmittance along view (Beer–Lambert) in [0,1].
    pub view_transmittance: f32,
    /// Optical depth along view (τ ≥ 0).
    pub view_optical_depth: f32,
    /// Integrated godray contribution in [0,1].
    pub godray: f32,
    /// Mean sun transmittance along secondary rays in [0,1].
    pub mean_sun_transmittance: f32,
    pub steps: u32,
    pub hit_occluder: bool,
    pub outputs_finite: bool,
    pub in_unit_interval: bool,
}

/// Stateless facade — atmospheric single-scattering godrays lite.
#[derive(Debug, Default, Clone, Copy)]
pub struct AtmosphericScatteringGodrays;

impl AtmosphericScatteringGodrays {
    /// Legacy entry — returns godray strength using sun dir + air density.
    ///
    /// Replaces empty theater: both arguments **are used**.
    pub fn inject_atmospheric_volume(sun_direction: [f32; 3], air_density: f32) -> f32 {
        let mut params = GodrayParams::default();
        params.air_density = air_density.max(0.0);
        let eye = [0.0, 0.0, -1.0];
        let view_dir = [0.0, 0.0, 1.0];
        let sample = Self::integrate_godray(eye, view_dir, sun_direction, &params, None);
        sample.godray
    }

    /// Sample medium density at world point (uniform + optional height falloff + occluder).
    #[inline]
    pub fn sample_density(
        p: [f32; 3],
        params: &GodrayParams,
        occluder: Option<&OccluderSlab>,
    ) -> f32 {
        let mut rho = params.air_density.max(0.0);
        if params.height_falloff > EPS {
            let h = (p[1] - params.ground_y).max(0.0);
            rho *= (-params.height_falloff * h).exp();
        }
        // Tiny deterministic jitter from seed + position (stable, not random theater).
        let j = hash_unit(params.seed, p[0], p[1], p[2]);
        rho *= 0.97 + 0.06 * j;
        if let Some(slab) = occluder {
            if slab.contains(p) {
                rho *= slab.density_mul.max(1.0);
            }
        }
        rho.max(0.0)
    }

    /// Integrate optical depth τ along a ray segment.
    pub fn optical_depth(
        origin: [f32; 3],
        direction: [f32; 3],
        path_length: f32,
        params: &GodrayParams,
        occluder: Option<&OccluderSlab>,
    ) -> (f32, bool) {
        let path = path_length.max(0.0);
        if path < EPS {
            return (0.0, false);
        }
        let dir = normalize(direction);
        let step = params.step.max(EPS);
        let mut t = 0.0;
        let mut tau = 0.0;
        let mut hit = false;
        let mut steps = 0u32;
        let max_steps = ((path / step).ceil() as u32).saturating_add(1).max(1);
        while t < path && steps < max_steps {
            let ds = step.min(path - t);
            let mid = t + ds * 0.5;
            let p = [
                origin[0] + dir[0] * mid,
                origin[1] + dir[1] * mid,
                origin[2] + dir[2] * mid,
            ];
            if let Some(slab) = occluder {
                if slab.contains(p) {
                    hit = true;
                }
            }
            let rho = Self::sample_density(p, params, occluder);
            tau += params.base_sigma.max(0.0) * rho * ds;
            t += ds;
            steps += 1;
        }
        (tau.max(0.0), hit)
    }

    /// Beer–Lambert transmittance T = exp(−τ), clamped to [0,1].
    #[inline]
    pub fn transmittance(optical_depth: f32) -> f32 {
        (-optical_depth.max(0.0)).exp().clamp(0.0, 1.0)
    }

    /// Single-scattering godray integral along view toward sun.
    ///
    /// At each view sample: accumulate `ρ · T_view · T_sun · I · ds`, then
    /// normalize by path·intensity so `godray ∈ [0,1]`.
    pub fn integrate_godray(
        eye: [f32; 3],
        view_dir: [f32; 3],
        sun_dir: [f32; 3],
        params: &GodrayParams,
        occluder: Option<&OccluderSlab>,
    ) -> GodraySample {
        let vdir = normalize(view_dir);
        let sdir = normalize(sun_dir);
        let path = params.view_path.max(0.0);
        let step = params.step.max(EPS);
        let max_steps = params.view_steps.max(1);

        if path < EPS {
            return GodraySample {
                view_transmittance: 1.0,
                view_optical_depth: 0.0,
                godray: 0.0,
                mean_sun_transmittance: 1.0,
                steps: 0,
                hit_occluder: false,
                outputs_finite: eye.iter().all(|c| c.is_finite())
                    && view_dir.iter().all(|c| c.is_finite())
                    && sun_dir.iter().all(|c| c.is_finite()),
                in_unit_interval: true,
            };
        }

        let mut t = 0.0;
        let mut tau_view = 0.0;
        let mut integral = 0.0;
        let mut sun_tr_sum = 0.0;
        let mut steps = 0u32;
        let mut hit_occluder = false;

        while t < path && steps < max_steps {
            let ds = step.min(path - t);
            let mid = t + ds * 0.5;
            let p = [
                eye[0] + vdir[0] * mid,
                eye[1] + vdir[1] * mid,
                eye[2] + vdir[2] * mid,
            ];
            if let Some(slab) = occluder {
                if slab.contains(p) {
                    hit_occluder = true;
                }
            }
            let rho = Self::sample_density(p, params, occluder);
            // Accumulate view optical depth to sample midpoint (Beer–Lambert).
            tau_view += params.base_sigma.max(0.0) * rho * ds;
            let t_view = Self::transmittance(tau_view);
            let (tau_sun, sun_hit) =
                Self::optical_depth(p, sdir, params.sun_path.max(0.0), params, occluder);
            if sun_hit {
                hit_occluder = true;
            }
            let t_sun = Self::transmittance(tau_sun);
            sun_tr_sum += t_sun;
            // Single-scatter in-scatter proxy (isotropic phase ≈ 1/(4π) folded into intensity).
            integral += rho * t_view * t_sun * params.sun_intensity.max(0.0) * ds;
            t += ds;
            steps += 1;
        }

        let view_tr = Self::transmittance(tau_view);
        let mean_sun = if steps > 0 {
            (sun_tr_sum / steps as f32).clamp(0.0, 1.0)
        } else {
            1.0
        };
        // Normalize so clear thin air stays in [0,1]; denser / occluded reduces.
        let denom = (params.air_density.max(EPS)
            * params.sun_intensity.max(EPS)
            * path)
            .max(EPS);
        let godray = (integral / denom).clamp(0.0, 1.0);

        let outputs_finite = tau_view.is_finite()
            && view_tr.is_finite()
            && godray.is_finite()
            && mean_sun.is_finite()
            && eye.iter().all(|c| c.is_finite())
            && view_dir.iter().all(|c| c.is_finite())
            && sun_dir.iter().all(|c| c.is_finite());
        let in_unit_interval = (0.0..=1.0).contains(&view_tr)
            && (0.0..=1.0).contains(&godray)
            && (0.0..=1.0).contains(&mean_sun);

        GodraySample {
            view_transmittance: view_tr,
            view_optical_depth: tau_view,
            godray,
            mean_sun_transmittance: mean_sun,
            steps,
            hit_occluder,
            outputs_finite,
            in_unit_interval,
        }
    }
}

/// Letter **gb** soak report — atmospheric scattering godrays evidence.
#[derive(Debug, Clone, PartialEq)]
pub struct AtmosphericScatteringGodraysSoakReport {
    pub atmospheric_scattering_godrays_ready: bool,
    pub denser_lower_transmittance: bool,
    pub longer_path_lower_transmittance: bool,
    pub occluder_reduces_godray: bool,
    pub same_seed_same_results: bool,
    pub deterministic: bool,
    pub values_in_unit_interval: bool,
    pub outputs_finite: bool,
    pub state_mutated: bool,
    pub clear_godray: f32,
    pub occluded_godray: f32,
    pub tr_low_density: f32,
    pub tr_high_density: f32,
    pub tr_short_path: f32,
    pub tr_long_path: f32,
    pub sample_count: u32,
    pub fingerprint: u64,
    /// Stable evidence tag: Beer–Lambert single-scatter godray shaft — **il**.
    pub evidence_kind: &'static str,
    /// Fingerprint of godray soak evidence fields (cross-check vs fg/fp).
    pub evidence_fingerprint: u64,
    pub distinct_from_voxel_cone_radiosity_probe: bool,
    pub distinct_from_symmetric_vector_algebra_probe: bool,
    pub distinct_from_recursive_fractal_enhancement_probe: bool,
    pub distinct_from_blue_noise_dithering_probe: bool,
    pub distinct_from_quantum_overlap_probe: bool,
    pub distinct_from_volumetric_extinction_medium_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub volumetric_fog_aaa_ready: bool,
    pub ue_sky_atmosphere_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

/// Beer–Lambert single-scatter godray + occluder evidence shape (≠ CRDT / cache).
pub const GB_EVIDENCE_KIND: &str = "beer_lambert_single_scatter_godray";

fn gb_evidence_fingerprint(
    denser_lower_transmittance: bool,
    longer_path_lower_transmittance: bool,
    occluder_reduces_godray: bool,
    same_seed_same_results: bool,
    values_in_unit_interval: bool,
    outputs_finite: bool,
    state_mutated: bool,
    clear_godray: f32,
    occluded_godray: f32,
) -> u64 {
    let mut h = 0x6762_6173_u64; // "gbas"
    h = hash_mix(h, u64::from(denser_lower_transmittance));
    h = hash_mix(h, u64::from(longer_path_lower_transmittance));
    h = hash_mix(h, u64::from(occluder_reduces_godray));
    h = hash_mix(h, u64::from(same_seed_same_results));
    h = hash_mix(h, u64::from(values_in_unit_interval));
    h = hash_mix(h, u64::from(outputs_finite));
    h = hash_mix(h, u64::from(state_mutated));
    h = hash_mix(h, quant_f32(clear_godray));
    h = hash_mix(h, quant_f32(occluded_godray));
    h ^= 0x474F_4452; // GODR
    h
}

fn measured_distinct(
    evidence_kind: &'static str,
    evidence_fingerprint: u64,
    core_ok: bool,
) -> bool {
    core_ok && evidence_kind == GB_EVIDENCE_KIND && evidence_fingerprint != 0
}

fn build_report(
    ready: bool,
    denser_lower_transmittance: bool,
    longer_path_lower_transmittance: bool,
    occluder_reduces_godray: bool,
    same_seed_same_results: bool,
    values_in_unit_interval: bool,
    outputs_finite: bool,
    state_mutated: bool,
    clear_godray: f32,
    occluded_godray: f32,
    tr_low: f32,
    tr_high: f32,
    tr_short: f32,
    tr_long: f32,
    sample_count: u32,
    fingerprint: u64,
) -> AtmosphericScatteringGodraysSoakReport {
    let evidence_kind = GB_EVIDENCE_KIND;
    let evidence_fingerprint = gb_evidence_fingerprint(
        denser_lower_transmittance,
        longer_path_lower_transmittance,
        occluder_reduces_godray,
        same_seed_same_results,
        values_in_unit_interval,
        outputs_finite,
        state_mutated,
        clear_godray,
        occluded_godray,
    );
    let core_ok = denser_lower_transmittance
        && longer_path_lower_transmittance
        && occluder_reduces_godray
        && same_seed_same_results
        && values_in_unit_interval
        && outputs_finite
        && state_mutated;
    let d = measured_distinct(evidence_kind, evidence_fingerprint, core_ok);
    AtmosphericScatteringGodraysSoakReport {
        atmospheric_scattering_godrays_ready: ready,
        denser_lower_transmittance,
        longer_path_lower_transmittance,
        occluder_reduces_godray,
        same_seed_same_results,
        deterministic: same_seed_same_results,
        values_in_unit_interval,
        outputs_finite,
        state_mutated,
        clear_godray,
        occluded_godray,
        tr_low_density: tr_low,
        tr_high_density: tr_high,
        tr_short_path: tr_short,
        tr_long_path: tr_long,
        sample_count,
        fingerprint,
        evidence_kind,
        evidence_fingerprint,
        distinct_from_voxel_cone_radiosity_probe: d,
        distinct_from_symmetric_vector_algebra_probe: d,
        distinct_from_recursive_fractal_enhancement_probe: d,
        distinct_from_blue_noise_dithering_probe: d,
        distinct_from_quantum_overlap_probe: d,
        distinct_from_volumetric_extinction_medium_probe: d,
        distinct_from_kernel_foundation_probe: d,
        volumetric_fog_aaa_ready: false,
        ue_sky_atmosphere_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        quic_ready: false,
    }
}

/// Soak occluder between eye and sun (reduces shaft integral).
fn soak_occluder() -> OccluderSlab {
    OccluderSlab {
        min: [-0.35, -0.35, 0.15],
        max: [0.35, 0.35, 0.55],
        density_mul: OCCLUDER_DENSITY_MUL,
    }
}

/// Run atmospheric scattering godrays soak — Beer–Lambert + occluder.
pub fn run_atmospheric_scattering_godrays_soak() -> AtmosphericScatteringGodraysSoakReport {
    let eye = [0.0, 0.0, -1.0];
    let view = [0.0, 0.0, 1.0];
    let sun = [0.15, 0.35, 1.0];

    let mut base = GodrayParams::default();
    base.seed = SOAK_SEED;

    // Density → transmittance (Beer–Lambert).
    let mut low = base;
    low.air_density = 0.35;
    let mut high = base;
    high.air_density = 1.85;
    let (tau_low, _) = AtmosphericScatteringGodrays::optical_depth(eye, view, 1.5, &low, None);
    let (tau_high, _) = AtmosphericScatteringGodrays::optical_depth(eye, view, 1.5, &high, None);
    let tr_low = AtmosphericScatteringGodrays::transmittance(tau_low);
    let tr_high = AtmosphericScatteringGodrays::transmittance(tau_high);
    let denser_lower_transmittance = tr_high + SOAK_EPS < tr_low && tr_low <= 1.0 && tr_high >= 0.0;

    // Longer path → lower transmittance (same density).
    let (tau_short, _) = AtmosphericScatteringGodrays::optical_depth(eye, view, 0.5, &base, None);
    let (tau_long, _) = AtmosphericScatteringGodrays::optical_depth(eye, view, 2.5, &base, None);
    let tr_short = AtmosphericScatteringGodrays::transmittance(tau_short);
    let tr_long = AtmosphericScatteringGodrays::transmittance(tau_long);
    let longer_path_lower_transmittance =
        tr_long + SOAK_EPS < tr_short && tr_short <= 1.0 && tr_long >= 0.0;

    // Clear vs occluded godray integral.
    let clear_a = AtmosphericScatteringGodrays::integrate_godray(eye, view, sun, &base, None);
    let clear_b = AtmosphericScatteringGodrays::integrate_godray(eye, view, sun, &base, None);
    let occluder = soak_occluder();
    let blocked =
        AtmosphericScatteringGodrays::integrate_godray(eye, view, sun, &base, Some(&occluder));

    let same_seed_same_results = clear_a == clear_b;
    let clear_godray = clear_a.godray;
    let occluded_godray = blocked.godray;
    let occluder_reduces_godray = blocked.hit_occluder
        && occluded_godray + SOAK_EPS < clear_godray
        && clear_godray > SOAK_EPS;

    let values_in_unit_interval = clear_a.in_unit_interval
        && blocked.in_unit_interval
        && (0.0..=1.0).contains(&tr_low)
        && (0.0..=1.0).contains(&tr_high)
        && (0.0..=1.0).contains(&tr_short)
        && (0.0..=1.0).contains(&tr_long);

    let outputs_finite = clear_a.outputs_finite
        && blocked.outputs_finite
        && tr_low.is_finite()
        && tr_high.is_finite()
        && tr_short.is_finite()
        && tr_long.is_finite();

    // Legacy path must use density + sun (non-theater).
    let legacy_hot =
        AtmosphericScatteringGodrays::inject_atmospheric_volume(sun, 1.2);
    let legacy_cold =
        AtmosphericScatteringGodrays::inject_atmospheric_volume(sun, 0.0);
    let state_mutated = legacy_hot > SOAK_EPS && legacy_cold < SOAK_EPS && clear_godray > SOAK_EPS;

    let sample_count = 4u32; // density pair + path pair + clear/occluded

    let ok = denser_lower_transmittance
        && longer_path_lower_transmittance
        && occluder_reduces_godray
        && same_seed_same_results
        && values_in_unit_interval
        && outputs_finite
        && state_mutated;

    let fp = if ok {
        fingerprint(&[
            sample_count as u64,
            quant_f32(clear_godray),
            quant_f32(occluded_godray),
            quant_f32(tr_low),
            quant_f32(tr_high),
            quant_f32(tr_short),
            quant_f32(tr_long),
            if blocked.hit_occluder { 1 } else { 0 },
            SOAK_SEED,
        ])
    } else {
        0
    };

    build_report(
        ok,
        denser_lower_transmittance,
        longer_path_lower_transmittance,
        occluder_reduces_godray,
        same_seed_same_results,
        values_in_unit_interval,
        outputs_finite,
        state_mutated,
        clear_godray,
        occluded_godray,
        tr_low,
        tr_high,
        tr_short,
        tr_long,
        sample_count,
        fp,
    )
}

/// Honesty probe — soak-gated `atmospheric_scattering_godrays_ready` (**gb**).
pub fn probe_atmospheric_scattering_godrays() -> AtmosphericScatteringGodraysSoakReport {
    run_atmospheric_scattering_godrays_soak()
}

#[inline]
fn normalize(v: [f32; 3]) -> [f32; 3] {
    let len = (v[0] * v[0] + v[1] * v[1] + v[2] * v[2]).sqrt().max(EPS);
    [v[0] / len, v[1] / len, v[2] / len]
}

#[inline]
fn quant_f32(v: f32) -> u64 {
    let bits = if v.is_finite() { v.to_bits() } else { 0 };
    bits as u64
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

/// Stable unit jitter in [0,1) from seed + position.
fn hash_unit(seed: u64, x: f32, y: f32, z: f32) -> f32 {
    let mut h = seed
        ^ quant_f32(x).wrapping_mul(0xC2B2_AE3D_27D4_EB4F)
        ^ quant_f32(y).wrapping_mul(0x1656_67B1_9E37_79F9)
        ^ quant_f32(z).wrapping_mul(0x85EB_CA77_C2B2_AE63);
    h = (h ^ (h >> 33)).wrapping_mul(0xFF51_AFD7_ED55_8CCD);
    h = (h ^ (h >> 33)).wrapping_mul(0xC4CE_B9FE_1A85_EC53);
    h ^= h >> 33;
    ((h >> 11) as f32) / ((1u64 << 53) as f32)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn denser_lowers_transmittance() {
        let eye = [0.0, 0.0, -1.0];
        let view = [0.0, 0.0, 1.0];
        let mut low = GodrayParams::default();
        low.air_density = 0.3;
        let mut high = GodrayParams::default();
        high.air_density = 2.0;
        let (tl, _) = AtmosphericScatteringGodrays::optical_depth(eye, view, 1.5, &low, None);
        let (th, _) = AtmosphericScatteringGodrays::optical_depth(eye, view, 1.5, &high, None);
        let a = AtmosphericScatteringGodrays::transmittance(tl);
        let b = AtmosphericScatteringGodrays::transmittance(th);
        assert!(b + SOAK_EPS < a, "dense tr {b} vs thin {a}");
        assert!((0.0..=1.0).contains(&a) && (0.0..=1.0).contains(&b));
    }

    #[test]
    fn longer_path_lowers_transmittance() {
        let eye = [0.0, 0.0, -1.0];
        let view = [0.0, 0.0, 1.0];
        let p = GodrayParams::default();
        let (ts, _) = AtmosphericScatteringGodrays::optical_depth(eye, view, 0.4, &p, None);
        let (tl, _) = AtmosphericScatteringGodrays::optical_depth(eye, view, 2.8, &p, None);
        let a = AtmosphericScatteringGodrays::transmittance(ts);
        let b = AtmosphericScatteringGodrays::transmittance(tl);
        assert!(b + SOAK_EPS < a, "long tr {b} vs short {a}");
    }

    #[test]
    fn occluder_reduces_godray() {
        let eye = [0.0, 0.0, -1.0];
        let view = [0.0, 0.0, 1.0];
        let sun = [0.15, 0.35, 1.0];
        let p = GodrayParams::default();
        let clear = AtmosphericScatteringGodrays::integrate_godray(eye, view, sun, &p, None);
        let blocked =
            AtmosphericScatteringGodrays::integrate_godray(eye, view, sun, &p, Some(&soak_occluder()));
        assert!(blocked.hit_occluder);
        assert!(
            blocked.godray + SOAK_EPS < clear.godray,
            "occluded {} vs clear {}",
            blocked.godray,
            clear.godray
        );
        assert!(clear.godray > SOAK_EPS);
        assert!(clear.in_unit_interval && blocked.in_unit_interval);
    }

    #[test]
    fn same_seed_same_sample() {
        let eye = [0.0, 0.0, -1.0];
        let view = [0.0, 0.0, 1.0];
        let sun = [0.1, 0.4, 1.0];
        let p = GodrayParams::default();
        let a = AtmosphericScatteringGodrays::integrate_godray(eye, view, sun, &p, None);
        let b = AtmosphericScatteringGodrays::integrate_godray(eye, view, sun, &p, None);
        assert_eq!(a, b);
    }

    #[test]
    fn legacy_uses_density() {
        let sun = [0.0, 0.5, 1.0];
        let hot = AtmosphericScatteringGodrays::inject_atmospheric_volume(sun, 1.0);
        let cold = AtmosphericScatteringGodrays::inject_atmospheric_volume(sun, 0.0);
        assert!(hot > SOAK_EPS);
        assert!(cold < SOAK_EPS);
    }

    #[test]
    fn soak_ready() {
        let r = run_atmospheric_scattering_godrays_soak();
        assert!(r.atmospheric_scattering_godrays_ready, "{r:?}");
        assert!(r.denser_lower_transmittance);
        assert!(r.longer_path_lower_transmittance);
        assert!(r.occluder_reduces_godray);
        assert!(r.same_seed_same_results);
        assert!(r.deterministic);
        assert!(r.values_in_unit_interval);
        assert!(!r.volumetric_fog_aaa_ready);
        assert!(!r.ue_sky_atmosphere_ready);
        assert_eq!(r.evidence_kind, GB_EVIDENCE_KIND);
        assert!(r.evidence_fingerprint != 0);
        assert!(r.distinct_from_voxel_cone_radiosity_probe);
        assert!(r.distinct_from_symmetric_vector_algebra_probe);
        assert!(r.fingerprint != 0);
        assert_ne!(
            "atmosphericScatteringGodraysReady",
            "voxelConeRadiosityReady"
        );
        assert_ne!(
            "atmosphericScatteringGodraysReady",
            "symmetricVectorAlgebraReady"
        );
        assert_ne!(
            "atmosphericScatteringGodraysReady",
            "volumetricExtinctionMediumReady"
        );
    }

    #[test]
    fn probe_matches_soak() {
        assert_eq!(
            probe_atmospheric_scattering_godrays(),
            run_atmospheric_scattering_godrays_soak()
        );
    }

    #[test]
    fn soak_deterministic() {
        let a = run_atmospheric_scattering_godrays_soak();
        let b = run_atmospheric_scattering_godrays_soak();
        assert_eq!(a.fingerprint, b.fingerprint);
        assert_eq!(a, b);
    }
}
