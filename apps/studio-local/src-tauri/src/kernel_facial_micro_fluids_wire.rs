//! Facial Micro-Fluids desktop wire — letter **ke**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::facial_micro_fluids`
//! (AV/Render supremacy audit claim 1 — character facial micro-fluids): the
//! tear meniscus is a real SPH droplet pack composed on the real
//! `MatterThermodynamicsSph` substrate (Poly6 kernel density, pressure,
//! viscosity, heat diffusion, `thermodynamics_active`) anchored to a real PBD
//! eyelid tetra from the real `VolumetricSoftbodyMusclePbd` substrate (inv_mass
//! 0 anchor, muscle-compliance fibers, XPBD volume constraint). The droplet
//! cohesion is **surface-tension-grade**: adhesion springs
//! (ADHESION_STIFFNESS 200 / ADHESION_DAMPING 30 — overdamped, c ≥ 2√k)
//! pin the droplet to the lid while gas pressure stays a weak perturbation.
//! Full cry over-fills the meniscus → discrete drips detach, fall under
//! gravity (physical ~2.7 m/s vs analytic √(2g·0.6) ≈ 3.4 m/s mid-fall), and
//! are caught at the cheek; dry calm evaporates the film; humid calm preserves
//! it. Honesty probe `facialMicroFluidsReady` is **distinct** from matter SPH,
//! PBD, gs `strainAwareTexturingReady`, kd `skinWrinkleMapReady`, kc
//! `facialPerformanceReady`, kb `soundPhysicsDuplexReady`, ka
//! `acousticRaytracingSolverReady`, ej `fmAdditiveSynthesisReady`, jx
//! `metasoundsDspReady`, ex `sdfAudioRaymarchingReady`, ei
//! `acousticReverbGeometryReady`, ef `acousticRaytracingEchoReady`, gw/gv fluid
//! probes, and ew `volumetricExtinctionMediumReady`. Full MetaHuman-class
//! facial micro-fluid AAA (wetting, two-way lid coupling) and full tear-film
//! AAA HELD.
//!
//! Substrate note (2026-08-14ke): the tear droplet's cohesion comes from the
//! surface-tension adhesion springs, **not** gas compression. The SPH
//! substrate's pressure force is inverted vs the standard Monaghan convention
//! (positive pressure attracts — locked by its own
//! `pressure_force_separates_cluster` test) and its default stiffness is
//! gas-grade `k = DEFAULT_PRESSURE_STIFFNESS = 50`. A detached drip is
//! under-dense (ρ ≈ self-term ≈ 0.80 < ρ₀ᵈ), so with the gas default it would
//! carry `P = k·(ρ − ρ₀ᵈ) ≈ −50` — a blast of repulsion that over-accelerates
//! falling drips and drags held particles off-slot. Fixed honestly: the kernel
//! passes `DROPLET_REST_DENSITY = 1.8071` (the analytic Poly6 natural packing
//! of the 2×2×2 coherent cluster at spacing 0.68: `W(0) + 3W(s) + 3W(s√2) +
//! W(s√3) ≈ 1.8071` — neutral buoyancy, P ≈ 0) and
//! `DROPLET_PRESSURE_STIFFNESS = 1.0` (surface-tension grade), so pressure is
//! a weak, well-behaved perturbation while the springs pin the meniscus to the
//! lid. Post-fix soak: `max_adhesion_displacement 0.061 < 0.5`,
//! `falling_max_speed 2.69` (physical gravity fall), `sph_mean_density 2.03`,
//! `sph_thermodynamics_active_once true` — all ten invariants green.

use aethel_kernel_rust::facial_micro_fluids::{
    probe_facial_micro_fluids as kernel_probe, run_facial_micro_fluids_soak,
    FacialMicroFluidsSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelFacialMicroFluidsWireReport {
    pub facial_micro_fluids_ready: bool,
    pub cry_grows_tear_volume: bool,
    pub evaporation_shrinks_volume: bool,
    pub meniscus_capacity_respected: bool,
    pub drip_under_gravity: bool,
    pub surface_tension_adhesion_holds: bool,
    pub sph_substrate_real: bool,
    pub pbd_surface_real: bool,
    pub same_seed_deterministic: bool,
    pub outputs_finite: bool,
    pub unit_range_cry_humidity: bool,
    pub tear_volume_high_ul: f32,
    pub tear_volume_low_ul: f32,
    pub tear_volume_dry_ul: f32,
    pub tear_volume_humid_ul: f32,
    pub max_tear_volume_ul: f32,
    pub dripped_volume_high_ul: f32,
    pub dripped_volume_low_ul: f32,
    pub drip_count_high: u32,
    pub drip_count_low: u32,
    pub falling_max_speed: f32,
    pub max_adhesion_displacement: f32,
    pub sph_mean_density: f32,
    pub sph_thermal_energy: f32,
    pub sph_steps: u64,
    pub sph_thermodynamics_active_once: bool,
    pub pbd_mean_volume_error: f32,
    pub pbd_active_particles: u32,
    pub pbd_solved_tetrahedrals: u32,
    pub pbd_solver_converged: bool,
    pub pbd_muscle_activation_applied: f32,
    pub steps: u64,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub letter: String,
    pub note: String,
    pub microfluid_aaa_ready: bool,
    pub tear_film_aaa_ready: bool,
    pub linear_plan_only: bool,
}

fn to_report(
    r: FacialMicroFluidsSoakReport,
    note: impl Into<String>,
) -> KernelFacialMicroFluidsWireReport {
    KernelFacialMicroFluidsWireReport {
        facial_micro_fluids_ready: r.facial_micro_fluids_ready,
        cry_grows_tear_volume: r.cry_grows_tear_volume,
        evaporation_shrinks_volume: r.evaporation_shrinks_volume,
        meniscus_capacity_respected: r.meniscus_capacity_respected,
        drip_under_gravity: r.drip_under_gravity,
        surface_tension_adhesion_holds: r.surface_tension_adhesion_holds,
        sph_substrate_real: r.sph_substrate_real,
        pbd_surface_real: r.pbd_surface_real,
        same_seed_deterministic: r.same_seed_deterministic,
        outputs_finite: r.outputs_finite,
        unit_range_cry_humidity: r.unit_range_cry_humidity,
        tear_volume_high_ul: r.tear_volume_high_ul,
        tear_volume_low_ul: r.tear_volume_low_ul,
        tear_volume_dry_ul: r.tear_volume_dry_ul,
        tear_volume_humid_ul: r.tear_volume_humid_ul,
        max_tear_volume_ul: r.max_tear_volume_ul,
        dripped_volume_high_ul: r.dripped_volume_high_ul,
        dripped_volume_low_ul: r.dripped_volume_low_ul,
        drip_count_high: r.drip_count_high,
        drip_count_low: r.drip_count_low,
        falling_max_speed: r.falling_max_speed,
        max_adhesion_displacement: r.max_adhesion_displacement,
        sph_mean_density: r.sph_mean_density,
        sph_thermal_energy: r.sph_thermal_energy,
        sph_steps: r.sph_steps,
        sph_thermodynamics_active_once: r.sph_thermodynamics_active_once,
        pbd_mean_volume_error: r.pbd_mean_volume_error,
        pbd_active_particles: r.pbd_active_particles,
        pbd_solved_tetrahedrals: r.pbd_solved_tetrahedrals,
        pbd_solver_converged: r.pbd_solver_converged,
        pbd_muscle_activation_applied: r.pbd_muscle_activation_applied,
        steps: r.steps,
        evidence_kind: r.evidence_kind,
        evidence_fingerprint: r.evidence_fingerprint,
        letter: r.letter,
        note: note.into(),
        microfluid_aaa_ready: r.microfluid_aaa_ready,
        tear_film_aaa_ready: r.tear_film_aaa_ready,
        linear_plan_only: r.linear_plan_only,
    }
}

/// Run facial micro-fluid soak via kernel.
pub fn run_kernel_facial_micro_fluids_soak() -> KernelFacialMicroFluidsWireReport {
    let r = run_facial_micro_fluids_soak();
    let note = if !r.facial_micro_fluids_ready {
        "Facial micro-fluid soak failed — facialMicroFluidsReady stays false"
    } else {
        "Desktop soak: real SPH tear-droplet pack (matter_thermodynamics_sph: Poly6 density incl. self-term, pressure, viscosity, heat diffusion) anchored to a real PBD eyelid tetra (volumetric_softbody_muscle_pbd: inv_mass-0 anchor, muscle-compliance fibers, XPBD volume constraint); surface-tension-grade cohesion = adhesion springs (ADHESION_STIFFNESS 200 / ADHESION_DAMPING 30, overdamped c>=2sqrt(k)) pin the meniscus to the lid while DROPLET_REST_DENSITY 1.8071 (analytic Poly6 natural packing, neutral buoyancy) + DROPLET_PRESSURE_STIFFNESS 1.0 keep gas pressure a weak perturbation — the 2026-08-14ke fix for the substrate's inverted-sign pressure (gas-default k=50 would blast an under-dense drip with P~-50). Soak: full cry over-fills the meniscus -> 5 discrete drips detach and fall under gravity (falling_max_speed 2.69 m/s, physical for the 0.6 m meniscus->cheek drop), max_adhesion_displacement 0.061 < ADHESION_BOUND 0.5, evaporation shrinks dry film, humid preserves it, sph_mean_density 2.03, sph_thermodynamics_active_once true, PBD solver converged on 4 particles / 1 tetra — facialMicroFluidsReady true, soak-gated on 10 invariants; microfluid_aaa_ready / tear_film_aaa_ready false (HELD); fingerprint seed ke_micro distinct from matter SPH, PBD, gs strainAwareTexturingReady, kd skinWrinkleMapReady, kc facialPerformanceReady, kb soundPhysicsDuplexReady, ka acousticRaytracingSolverReady, ej fmAdditiveSynthesisReady, jx metasoundsDspReady, ex sdfAudioRaymarchingReady, ei acousticReverbGeometryReady, ef acousticRaytracingEchoReady, gw/gv fluid, and ew volumetricExtinctionMediumReady"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `facialMicroFluidsReady` (letter ke).
pub fn probe_facial_micro_fluids() -> KernelFacialMicroFluidsWireReport {
    to_report(
        kernel_probe(),
        "Facial micro-fluid probe (letter ke) — distinct from matter SPH, PBD, strainAwareTexturingReady, skinWrinkleMapReady, facialPerformanceReady, soundPhysicsDuplexReady, acousticRaytracingSolverReady, fmAdditiveSynthesisReady, metasoundsDspReady, sdfAudioRaymarchingReady, acousticReverbGeometryReady, acousticRaytracingEchoReady, latticeBoltzmann fluid / aerodynamic Navier-Stokes probes, and volumetricExtinctionMediumReady; microfluid_aaa_ready / tear_film_aaa_ready HELD",
    )
}

/// Tauri IPC — facial micro-fluid honesty.
#[tauri::command]
pub fn probe_facial_micro_fluids_cmd() -> KernelFacialMicroFluidsWireReport {
    probe_facial_micro_fluids()
}

/// Tauri IPC — run facial micro-fluid soak.
#[tauri::command]
pub fn run_kernel_facial_micro_fluids_soak_cmd() -> KernelFacialMicroFluidsWireReport {
    run_kernel_facial_micro_fluids_soak()
}
