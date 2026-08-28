//! Skin-Tension Wrinkle Map — letter **kd**.
//!
//! The wrinkle / rhytide layer of the AV/Render supremacy audit (Founder
//! "A Sincronia Áudio-Visual e a Qualidade de Renderização", claim 1
//! sub-surface): repeated skin deformation under tension builds fold lines
//! in high-curvature creases, gated by a per-region wrinkle mask, and every
//! fold groove occludes ambient light. This kernel **extends the real
//! published [`strain_aware_texturing`] substrate (gs)** — it calls the real
//! [`StrainAwareTexturing::evaluate`] to obtain the genuine combined strain
//! and albedo whitening, then derives the wrinkle map from that real strain.
//! Zero substrate edits, zero JSON in the hot path.
//!
//! Real, not mock (Zero-MVP / Anti-Mock). The physical model:
//! - **Crease curvature → wrinkle density.** Deep creases (negative mean
//!   curvature = skin buckling / fold compression) accumulate more fold
//!   lines per unit length — the crow's-feet and forehead lines of real
//!   skin. [`SkinWrinkleMap::density_from_drive`] maps the crease fold-drive
//!   to a smooth density ∈ [0, 1].
//! - **Tension strain → wrinkle strength.** The **real** gs
//!   [`StrainAwareTexturing::evaluate`] combined strain (curvature strain +
//!   UV-jacobian stretch strain) measures how hard the dermis is being
//!   pulled; repeated stretch remodels collagen into deeper, more contrasted
//!   folds. Higher tension raises both fold accumulation and fold depth
//!   (strength) — proven by the soak (`higher_tension_more_wrinkles`).
//! - **Region mask.** `region_weight` is the per-region wrinkle mask
//!   (forehead / crow's-feet / cheek / lip): `0` keeps the region smooth no
//!   matter how hard it is strained (e.g. hydrated mid-cheek), `1` lets
//!   tension build full wrinkles. Invalid regions fail closed (no wrinkles).
//! - **Groove ambient occlusion.** Each wrinkle groove occludes ambient
//!   light: `occlusion = density·strength·AO_DEPTH_MAX`, and
//!   `ambient_occlusion = 1 − occlusion`. Deeper / denser wrinkles darken
//!   the groove AO — proven by `occlusion_darkens_grooves`.
//!
//! Soak-gated honesty: [`run_skin_wrinkle_map_soak`] proves higher tension
//! produces more and stronger wrinkles, the region mask is respected
//! (masked regions stay smooth and un-occluded), groove AO darkens with
//! wrinkle intensity, the substrate strain is the **real** gs output, every
//! value is finite and in unit range, and same seed → same fingerprint —
//! then flips `skin_wrinkle_map_ready`. `evidence_fingerprint` (seed
//! `0x6B64_5F73_6B69_6E` = `kd_skin`) is **distinct** from gs and from
//! ej / jx / ka / kb / kc / ex / ei / ef / gw / gv / ew.
//!
//! **HELD (fail-closed, `false`):** full MetaHuman-class wrinkle AAA
//! (`wrinkle_aaa_ready`), full ray-traced skin AO AAA (`ao_aaa_ready`) ·
//! Coins / Agones / Nanite / DLSS / Quic. **STOP** J.11/J.12.

use crate::strain_aware_texturing::{StrainAwareTexturing, StrainParams};
use serde::{Deserialize, Serialize};

/// Facial wrinkle regions (deterministic masks).
pub const REGION_FOREHEAD: u8 = 0;
pub const REGION_CROWS_FEET: u8 = 1;
pub const REGION_CHEEK: u8 = 2;
pub const REGION_LIP: u8 = 3;
pub const REGION_COUNT: u8 = 4;

/// Default soak seed — `0x6B64_5F73_6B69_6E` = `kd_skin` (8 ASCII bytes),
/// distinct from `kc_facia` and every prior kernel seed.
pub const SOAK_SEED: u64 = 0x6B64_5F73_6B69_6E;
/// Absolute epsilon for soak compares.
pub const SOAK_EPS: f32 = 1e-5;
/// Curvature fold-drive onset (buckling below this stays smooth).
pub const WRINKLE_CURVATURE_ONSET: f32 = 0.30;
/// Curvature fold-drive saturation (above this the region is fully wrinkled).
pub const WRINKLE_CURVATURE_SATURATION: f32 = 1.20;
/// How much real gs tension contributes to fold accumulation (beyond crease).
pub const TENSION_FOLD_WEIGHT: f32 = 0.5;
/// Tension share of wrinkle strength (fold depth).
pub const STRENGTH_TENSION_WEIGHT: f32 = 0.5;
/// Density share of wrinkle strength (fold contrast from fold count).
pub const STRENGTH_DENSITY_WEIGHT: f32 = 0.5;
/// Max groove ambient-occlusion depth (occlusion = density·strength·this).
pub const AO_DEPTH_MAX: f32 = 0.45;

/// Evidence identifier for the soak / probe (letter kd).
pub const SKIN_WRINKLE_MAP_EVIDENCE_KIND: &str = "skin_wrinkle_map_curvature_strain_region_ao";

/// Per-region wrinkle input — mask + crease geometry.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct WrinkleRegionParams {
    /// Region id (see `REGION_*`). Invalid regions fail closed (no wrinkles).
    pub region: u8,
    /// Regional wrinkle mask ∈ [0, 1]; `0` = smooth skin, `1` = fully
    /// responsive to crease + tension.
    pub region_weight: f32,
    /// |negative mean curvature| — crease / buckling depth driving fold
    /// density (crow's-feet and forehead lines).
    pub crease_curvature: f32,
}

/// One region → wrinkle map evaluation.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct WrinkleMapSample {
    pub region: u8,
    /// Effective mask applied (invalid regions collapse to 0).
    pub region_weight: f32,
    /// Wrinkle density ∈ [0, 1] — fold lines per unit length.
    pub wrinkle_density: f32,
    /// Wrinkle strength ∈ [0, 1] — fold depth / contrast.
    pub wrinkle_strength: f32,
    /// Ambient occlusion ∈ [0, 1]; 1 = no occlusion, lower = darker grooves.
    pub ambient_occlusion: f32,
    /// Occlusion amount = 1 − ambient_occlusion.
    pub occlusion: f32,
    /// Real gs combined strain (curvature strain + stretch strain).
    pub substrate_strain: f32,
    /// Real gs albedo whitening (substrate).
    pub substrate_whitening: f32,
    pub outputs_finite: bool,
    pub in_unit_range: bool,
}

/// Stateless facade — skin-tension wrinkle map.
#[derive(Debug, Default, Clone, Copy)]
pub struct SkinWrinkleMap;

impl SkinWrinkleMap {
    /// Map the combined fold-drive (crease + tension) to wrinkle density
    /// via a smoothstep in the physical wrinkle band.
    #[inline]
    pub fn density_from_drive(fold_drive: f32) -> f32 {
        let t = ((fold_drive - WRINKLE_CURVATURE_ONSET)
            / (WRINKLE_CURVATURE_SATURATION - WRINKLE_CURVATURE_ONSET))
        .clamp(0.0, 1.0);
        t * t * (3.0 - 2.0 * t)
    }

    /// One region wrinkle-map evaluation, composed on the **real** gs
    /// substrate strain + whitening.
    pub fn evaluate(
        region: &WrinkleRegionParams,
        strain_params: &StrainParams,
    ) -> WrinkleMapSample {
        // Fail closed: unknown regions never wrinkle.
        let effective_weight = if region.region >= REGION_COUNT {
            0.0
        } else {
            region.region_weight.clamp(0.0, 1.0)
        };

        // Real gs substrate — combined strain + whitening from the published
        // strain-aware texturing kernel.
        let gs = StrainAwareTexturing::evaluate(strain_params);
        let tension = gs.strain.clamp(0.0, 1.0);

        let crease = region.crease_curvature.max(0.0);
        let fold_drive = crease + TENSION_FOLD_WEIGHT * tension;
        let raw_density = Self::density_from_drive(fold_drive);
        let density = raw_density * effective_weight;

        // Fold depth: tension deepens folds, density adds fold contrast.
        let raw_strength =
            STRENGTH_TENSION_WEIGHT * tension + STRENGTH_DENSITY_WEIGHT * raw_density;
        let strength = raw_strength * effective_weight;

        // Groove ambient occlusion — deeper / denser folds occlude more light.
        let wrinkle_intensity = density * strength;
        let occlusion = (wrinkle_intensity * AO_DEPTH_MAX).clamp(0.0, 1.0);
        let ambient_occlusion = 1.0 - occlusion;

        let outputs_finite = density.is_finite()
            && strength.is_finite()
            && wrinkle_intensity.is_finite()
            && occlusion.is_finite()
            && ambient_occlusion.is_finite()
            && gs.strain.is_finite()
            && gs.whitening.is_finite();
        let in_unit_range = (0.0..=1.0).contains(&density)
            && (0.0..=1.0).contains(&strength)
            && (0.0..=1.0).contains(&occlusion)
            && (0.0..=1.0).contains(&ambient_occlusion);

        WrinkleMapSample {
            region: region.region,
            region_weight: effective_weight,
            wrinkle_density: density,
            wrinkle_strength: strength,
            ambient_occlusion,
            occlusion,
            substrate_strain: gs.strain,
            substrate_whitening: gs.whitening,
            outputs_finite,
            in_unit_range,
        }
    }
}

fn hash_mix(mut h: u64, v: u64) -> u64 {
    h = h.wrapping_mul(0x9E37_79B9_7F4A_7C15);
    h ^= v;
    h = h.rotate_left(31);
    h
}

/// Letter **kd** evidence fingerprint — deterministic hash of the measured
/// wrinkle-map metrics. Seed `0x6B64_5F73_6B69_6E` (`kd_skin`), distinct from
/// every prior kernel seed.
fn kd_evidence_fingerprint(
    density_high: f32,
    density_low: f32,
    strength_high: f32,
    strength_low: f32,
    intensity_high: f32,
    intensity_low: f32,
    occlusion_high: f32,
    occlusion_low: f32,
    ao_high: f32,
    ao_low: f32,
    masked_density: f32,
    masked_strength: f32,
    masked_occlusion: f32,
    substrate_strain_high: f32,
    substrate_strain_low: f32,
    substrate_whitening_high: f32,
    substrate_whitening_low: f32,
) -> u64 {
    let mut h = 0x6B64_5F73_6B69_6E_u64;
    for v in [
        density_high.to_bits() as u64,
        density_low.to_bits() as u64,
        strength_high.to_bits() as u64,
        strength_low.to_bits() as u64,
        intensity_high.to_bits() as u64,
        intensity_low.to_bits() as u64,
        occlusion_high.to_bits() as u64,
        occlusion_low.to_bits() as u64,
        ao_high.to_bits() as u64,
        ao_low.to_bits() as u64,
        masked_density.to_bits() as u64,
        masked_strength.to_bits() as u64,
        masked_occlusion.to_bits() as u64,
        substrate_strain_high.to_bits() as u64,
        substrate_strain_low.to_bits() as u64,
        substrate_whitening_high.to_bits() as u64,
        substrate_whitening_low.to_bits() as u64,
    ] {
        h = hash_mix(h, v);
    }
    h
}

/// Letter **kd** soak report — skin-tension wrinkle map evidence.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SkinWrinkleMapSoakReport {
    /// Soak-gated; distinct from gs + ej/jx/ka/kb/kc/ex/ei/ef/gw/gv/ew probes.
    pub skin_wrinkle_map_ready: bool,
    /// Higher real gs tension → more and stronger wrinkles.
    pub higher_tension_more_wrinkles: bool,
    /// The region mask is respected (masked regions stay smooth/un-occluded).
    pub region_mask_respected: bool,
    /// Groove AO darkens with wrinkle intensity.
    pub occlusion_darkens_grooves: bool,
    /// The wrinkle driver is the real gs substrate strain + whitening.
    pub substrate_strain_real: bool,
    /// Same seed → identical results.
    pub same_seed_same_results: bool,
    /// Alias of `same_seed_same_results` (deterministic soak).
    pub deterministic: bool,
    /// Every reported float is finite.
    pub outputs_finite: bool,
    /// Density / strength / occlusion / AO all stay in unit range.
    pub in_unit_range: bool,
    pub density_high: f32,
    pub density_low: f32,
    pub strength_high: f32,
    pub strength_low: f32,
    pub intensity_high: f32,
    pub intensity_low: f32,
    pub occlusion_high: f32,
    pub occlusion_low: f32,
    pub ao_high: f32,
    pub ao_low: f32,
    pub masked_density: f32,
    pub masked_strength: f32,
    pub masked_occlusion: f32,
    pub masked_ao: f32,
    pub substrate_strain_high: f32,
    pub substrate_strain_low: f32,
    pub substrate_whitening_high: f32,
    pub substrate_whitening_low: f32,
    pub sample_count: u32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub letter: String,
    pub note: String,
    /// HELD — full MetaHuman-class wrinkle AAA.
    pub wrinkle_aaa_ready: bool,
    /// HELD — full ray-traced skin AO AAA.
    pub ao_aaa_ready: bool,
    pub linear_plan_only: bool,
}

/// Run the deterministic skin-tension wrinkle-map soak and return the evidence.
pub fn run_skin_wrinkle_map_soak() -> SkinWrinkleMapSoakReport {
    // --- Real gs substrate strain fixtures ---
    let mut low = StrainParams::default();
    low.seed = SOAK_SEED;
    low.sdf_curvature = 0.05; // below gs onset → curvature strain ≈ 0
    low.uv_def_u = 1.0;
    low.uv_def_v = 1.0; // rest stretch → stretch strain ≈ 0

    let mut high = low;
    high.sdf_curvature = 1.4; // above gs onset → curvature strain ≈ 1
    high.uv_def_u = 2.2;
    high.uv_def_v = 1.8; // stretch factor ≈ 3.96 → stretch strain ≈ 1

    let forehead = WrinkleRegionParams {
        region: REGION_FOREHEAD,
        region_weight: 1.0,
        crease_curvature: 0.9,
    };
    let masked = WrinkleRegionParams {
        region: REGION_CHEEK,
        region_weight: 0.0, // hydrated smooth cheek → no wrinkles
        crease_curvature: 0.9,
    };

    let hi = SkinWrinkleMap::evaluate(&forehead, &high);
    let lo = SkinWrinkleMap::evaluate(&forehead, &low);
    let masked_s = SkinWrinkleMap::evaluate(&masked, &high);

    let density_high = hi.wrinkle_density;
    let density_low = lo.wrinkle_density;
    let strength_high = hi.wrinkle_strength;
    let strength_low = lo.wrinkle_strength;
    let intensity_high = hi.wrinkle_density * hi.wrinkle_strength;
    let intensity_low = lo.wrinkle_density * lo.wrinkle_strength;
    let occlusion_high = hi.occlusion;
    let occlusion_low = lo.occlusion;
    let ao_high = hi.ambient_occlusion;
    let ao_low = lo.ambient_occlusion;
    let masked_density = masked_s.wrinkle_density;
    let masked_strength = masked_s.wrinkle_strength;
    let masked_occlusion = masked_s.occlusion;
    let masked_ao = masked_s.ambient_occlusion;
    let substrate_strain_high = hi.substrate_strain;
    let substrate_strain_low = lo.substrate_strain;
    let substrate_whitening_high = hi.substrate_whitening;
    let substrate_whitening_low = lo.substrate_whitening;

    let same_seed_same_results = SkinWrinkleMap::evaluate(&forehead, &high) == hi;

    let higher_tension_more_wrinkles = density_high > density_low + SOAK_EPS
        && strength_high > strength_low + SOAK_EPS
        && intensity_high > intensity_low + SOAK_EPS;

    let region_mask_respected = masked_density < SOAK_EPS
        && masked_strength < SOAK_EPS
        && masked_occlusion < SOAK_EPS
        && (1.0 - masked_ao) < SOAK_EPS
        && density_high > masked_density + SOAK_EPS;

    let occlusion_darkens_grooves =
        occlusion_high > occlusion_low + SOAK_EPS && ao_high < ao_low - SOAK_EPS;

    let substrate_strain_real = substrate_strain_high > substrate_strain_low + SOAK_EPS
        && substrate_whitening_high > substrate_whitening_low + SOAK_EPS
        && substrate_strain_high > 0.5;

    let outputs_finite = [
        density_high,
        density_low,
        strength_high,
        strength_low,
        intensity_high,
        intensity_low,
        occlusion_high,
        occlusion_low,
        ao_high,
        ao_low,
        masked_density,
        masked_strength,
        masked_occlusion,
        masked_ao,
        substrate_strain_high,
        substrate_strain_low,
        substrate_whitening_high,
        substrate_whitening_low,
    ]
    .iter()
    .all(|v| v.is_finite());

    let in_unit_range = [
        density_high,
        density_low,
        strength_high,
        strength_low,
        occlusion_high,
        occlusion_low,
        ao_high,
        ao_low,
        masked_ao,
    ]
    .iter()
    .all(|&v| (0.0..=1.0).contains(&v));

    let sample_count = 3u32;
    let ready = higher_tension_more_wrinkles
        && region_mask_respected
        && occlusion_darkens_grooves
        && substrate_strain_real
        && same_seed_same_results
        && outputs_finite
        && in_unit_range;

    let evidence_fingerprint = kd_evidence_fingerprint(
        density_high,
        density_low,
        strength_high,
        strength_low,
        intensity_high,
        intensity_low,
        occlusion_high,
        occlusion_low,
        ao_high,
        ao_low,
        masked_density,
        masked_strength,
        masked_occlusion,
        substrate_strain_high,
        substrate_strain_low,
        substrate_whitening_high,
        substrate_whitening_low,
    );

    SkinWrinkleMapSoakReport {
        skin_wrinkle_map_ready: ready,
        higher_tension_more_wrinkles,
        region_mask_respected,
        occlusion_darkens_grooves,
        substrate_strain_real,
        same_seed_same_results,
        deterministic: same_seed_same_results,
        outputs_finite,
        in_unit_range,
        density_high,
        density_low,
        strength_high,
        strength_low,
        intensity_high,
        intensity_low,
        occlusion_high,
        occlusion_low,
        ao_high,
        ao_low,
        masked_density,
        masked_strength,
        masked_occlusion,
        masked_ao,
        substrate_strain_high,
        substrate_strain_low,
        substrate_whitening_high,
        substrate_whitening_low,
        sample_count,
        evidence_kind: SKIN_WRINKLE_MAP_EVIDENCE_KIND.to_string(),
        evidence_fingerprint,
        letter: "kd".to_string(),
        note: "Skin-tension wrinkle map on the real gs substrate: crease curvature + real StrainAwareTexturing combined strain (curvature strain + UV-jacobian stretch strain) -> wrinkle density (smoothstep fold band) + tension-deepened strength, gated by a per-region mask (forehead/crow's-feet/cheek/lip; masked regions stay smooth) -> groove ambient occlusion (density*strength*AO_DEPTH_MAX, ao = 1 - occlusion). Soak proves higher tension -> more and stronger wrinkles, region mask respected, occlusion darkens grooves, substrate strain is the real gs output, all finite + in unit range; skinWrinkleMapReady soak-gated; wrinkle_aaa_ready / ao_aaa_ready HELD; fingerprint seed kd_skin distinct from gs + ej/jx/ka/kb/kc/ex/ei/ef/gw/gv/ew".to_string(),
        wrinkle_aaa_ready: false,
        ao_aaa_ready: false,
        linear_plan_only: false,
    }
}

/// Honesty probe — soak-gated `skin_wrinkle_map_ready` (letter kd).
pub fn probe_skin_wrinkle_map() -> SkinWrinkleMapSoakReport {
    run_skin_wrinkle_map_soak()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn higher_tension_accumulates_more_and_stronger_wrinkles() {
        let mut low = StrainParams::default();
        low.seed = SOAK_SEED;
        low.sdf_curvature = 0.05;
        low.uv_def_u = 1.0;
        low.uv_def_v = 1.0;

        let mut high = low;
        high.sdf_curvature = 1.4;
        high.uv_def_u = 2.2;
        high.uv_def_v = 1.8;

        let region = WrinkleRegionParams {
            region: REGION_FOREHEAD,
            region_weight: 1.0,
            crease_curvature: 0.9,
        };
        let hi = SkinWrinkleMap::evaluate(&region, &high);
        let lo = SkinWrinkleMap::evaluate(&region, &low);

        assert!(hi.wrinkle_density > lo.wrinkle_density + SOAK_EPS);
        assert!(hi.wrinkle_strength > lo.wrinkle_strength + SOAK_EPS);
        assert!(hi.substrate_strain > lo.substrate_strain + SOAK_EPS);
        assert!(hi.wrinkle_density <= 1.0 && lo.wrinkle_density <= 1.0);
    }

    #[test]
    fn region_mask_zeroes_wrinkles_and_occlusion() {
        let mut high = StrainParams::default();
        high.seed = SOAK_SEED;
        high.sdf_curvature = 1.4;
        high.uv_def_u = 2.2;
        high.uv_def_v = 1.8;

        let smooth = WrinkleRegionParams {
            region: REGION_CHEEK,
            region_weight: 0.0,
            crease_curvature: 0.9,
        };
        let s = SkinWrinkleMap::evaluate(&smooth, &high);
        assert_eq!(s.wrinkle_density, 0.0);
        assert_eq!(s.wrinkle_strength, 0.0);
        assert_eq!(s.occlusion, 0.0);
        assert_eq!(s.ambient_occlusion, 1.0);

        // Invalid region fails closed (no wrinkles).
        let bogus = WrinkleRegionParams {
            region: 42,
            region_weight: 1.0,
            crease_curvature: 0.9,
        };
        let b = SkinWrinkleMap::evaluate(&bogus, &high);
        assert_eq!(b.region_weight, 0.0);
        assert_eq!(b.wrinkle_density, 0.0);
        assert_eq!(b.ambient_occlusion, 1.0);
    }

    #[test]
    fn occlusion_darkens_with_wrinkle_intensity() {
        let mut low = StrainParams::default();
        low.seed = SOAK_SEED;
        low.sdf_curvature = 0.05;
        low.uv_def_u = 1.0;
        low.uv_def_v = 1.0;

        let mut high = low;
        high.sdf_curvature = 1.4;
        high.uv_def_u = 2.2;
        high.uv_def_v = 1.8;

        let region = WrinkleRegionParams {
            region: REGION_LIP,
            region_weight: 1.0,
            crease_curvature: 0.9,
        };
        let hi = SkinWrinkleMap::evaluate(&region, &high);
        let lo = SkinWrinkleMap::evaluate(&region, &low);
        assert!(hi.occlusion > lo.occlusion + SOAK_EPS);
        assert!(hi.ambient_occlusion < lo.ambient_occlusion - SOAK_EPS);
        assert!((0.0..=1.0).contains(&hi.ambient_occlusion));
    }

    #[test]
    fn soak_ready_and_held_flags() {
        let r = probe_skin_wrinkle_map();
        assert!(r.skin_wrinkle_map_ready, "{r:?}");
        assert!(r.higher_tension_more_wrinkles);
        assert!(r.region_mask_respected);
        assert!(r.occlusion_darkens_grooves);
        assert!(r.substrate_strain_real);
        assert!(r.outputs_finite);
        assert!(r.in_unit_range);
        assert_eq!(r.evidence_kind, SKIN_WRINKLE_MAP_EVIDENCE_KIND);
        assert!(r.evidence_fingerprint != 0);
        assert_eq!(r.letter, "kd");
        // Honesty: every AAA vector stays fail-closed.
        assert!(!r.wrinkle_aaa_ready);
        assert!(!r.ao_aaa_ready);
        assert!(!r.linear_plan_only);
    }

    #[test]
    fn probe_matches_soak() {
        let a = run_skin_wrinkle_map_soak();
        let b = probe_skin_wrinkle_map();
        assert_eq!(a, b);
    }

    #[test]
    fn soak_is_deterministic_and_distinct() {
        let a = run_skin_wrinkle_map_soak();
        let b = run_skin_wrinkle_map_soak();
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
        assert_ne!(a.evidence_fingerprint, 0);

        // The gs substrate (this kernel composes it) — distinct fingerprint.
        let gs = crate::strain_aware_texturing::probe_strain_aware_texturing();
        assert_ne!(a.evidence_fingerprint, gs.fingerprint);

        // Distinct evidence_kind + fingerprint from every coupled / prior peer.
        let kc = crate::facial_performance::probe_facial_performance();
        let ej = crate::fm_additive_synthesis::probe_fm_additive_synthesis();
        let jx = crate::metasounds_dsp_compiler::probe_metasounds_dsp();
        let ka = crate::acoustic_raytracing_solver::probe_acoustic_raytracing_solver();
        let kb = crate::sound_physics_duplex::probe_sound_physics_duplex();
        let ex = crate::sdf_audio_raymarching::probe_sdf_audio_raymarching();
        let ei = crate::acoustic_reverb_geometry::probe_acoustic_reverb_geometry();
        let ef = crate::acoustic_raytracing_echo::probe_acoustic_raytracing_echo();
        let gw = crate::lattice_boltzmann_fluid_solver::probe_lattice_boltzmann_fluid_solver();
        let gv = crate::aerodynamic_navier_stokes::probe_aerodynamic_navier_stokes();
        let ew = crate::volumetric_extinction_medium::probe_volumetric_extinction_medium();

        // Each peer has its own report struct type, so assert per-peer.
        assert_ne!(a.evidence_kind, kc.evidence_kind);
        assert_ne!(a.evidence_kind, ej.evidence_kind);
        assert_ne!(a.evidence_kind, jx.evidence_kind);
        assert_ne!(a.evidence_kind, ka.evidence_kind);
        assert_ne!(a.evidence_kind, kb.evidence_kind);
        assert_ne!(a.evidence_kind, ex.evidence_kind);
        assert_ne!(a.evidence_kind, ei.evidence_kind);
        assert_ne!(a.evidence_kind, ef.evidence_kind);
        assert_ne!(a.evidence_kind, gw.evidence_kind);
        assert_ne!(a.evidence_kind, gv.evidence_kind);
        assert_ne!(a.evidence_kind, ew.evidence_kind);

        assert_ne!(a.evidence_fingerprint, kc.evidence_fingerprint);
        assert_ne!(a.evidence_fingerprint, ej.evidence_fingerprint);
        assert_ne!(a.evidence_fingerprint, jx.evidence_fingerprint);
        assert_ne!(a.evidence_fingerprint, ka.evidence_fingerprint);
        assert_ne!(a.evidence_fingerprint, kb.evidence_fingerprint);
        assert_ne!(a.evidence_fingerprint, ex.evidence_fingerprint);
        assert_ne!(a.evidence_fingerprint, ei.evidence_fingerprint);
        assert_ne!(a.evidence_fingerprint, ef.evidence_fingerprint);
        assert_ne!(a.evidence_fingerprint, gw.evidence_fingerprint);
        assert_ne!(a.evidence_fingerprint, gv.evidence_fingerprint);
        assert_ne!(a.evidence_fingerprint, ew.evidence_fingerprint);
    }
}
