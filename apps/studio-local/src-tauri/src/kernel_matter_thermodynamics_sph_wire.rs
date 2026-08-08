//! Matter Thermodynamics SPH desktop wire — letters **hk** / deepen **io**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::matter_thermodynamics_sph`
//! (SoA SPH density + pressure + viscosity + heat + spatial-hash N≥2048 soak).
//! Honesty probes `matterThermodynamicsSphReady` +
//! `matterThermodynamicsSphHashReady` (**io**/CW2; hu–im taken). Full DualSPHysics /
//! Chaos fluid / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::matter_thermodynamics_sph::{
    probe_matter_thermodynamics_sph as kernel_probe, run_matter_thermodynamics_sph_hash_soak,
    run_matter_thermodynamics_sph_soak, MatterThermodynamicsSphSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelMatterThermodynamicsSphWireReport {
    pub matter_thermodynamics_sph_ready: bool,
    pub matter_thermodynamics_sph_hash_ready: bool,
    pub density_changed: bool,
    pub thermal_energy_changed: bool,
    pub pressure_force_active: bool,
    pub heat_diffusion_active: bool,
    pub viscosity_active: bool,
    pub mass_conserved: bool,
    pub outputs_finite: bool,
    pub sample_count: u32,
    pub mean_density_before: f32,
    pub mean_density_after: f32,
    pub thermal_energy_before: f32,
    pub thermal_energy_after: f32,
    pub max_speed: f32,
    pub melted_count: u32,
    pub particle_count: u32,
    pub neighbor_comparisons: u64,
    pub max_neighbors: u32,
    pub n_squared: u64,
    pub spatial_hash_subquadratic: bool,
    pub kinetic_energy_max: f32,
    pub kinetic_energy_bounded: bool,
    pub deterministic_replay: bool,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub dualsphysics_parity_ready: bool,
    pub chaos_fluid_aaa_ready: bool,
    pub flip_apic_parity_ready: bool,
    pub chaos_hybrid_fluid_ready: bool,
    pub chaos_pbd_parity_ready: bool,
    pub xpbd_cloth_aaa_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
}

fn to_report(
    r: MatterThermodynamicsSphSoakReport,
    note: impl Into<String>,
) -> KernelMatterThermodynamicsSphWireReport {
    KernelMatterThermodynamicsSphWireReport {
        matter_thermodynamics_sph_ready: r.matter_thermodynamics_sph_ready,
        matter_thermodynamics_sph_hash_ready: r.matter_thermodynamics_sph_hash_ready,
        density_changed: r.density_changed,
        thermal_energy_changed: r.thermal_energy_changed,
        pressure_force_active: r.pressure_force_active,
        heat_diffusion_active: r.heat_diffusion_active,
        viscosity_active: r.viscosity_active,
        mass_conserved: r.mass_conserved,
        outputs_finite: r.outputs_finite,
        sample_count: r.sample_count,
        mean_density_before: r.mean_density_before,
        mean_density_after: r.mean_density_after,
        thermal_energy_before: r.thermal_energy_before,
        thermal_energy_after: r.thermal_energy_after,
        max_speed: r.max_speed,
        melted_count: r.melted_count,
        particle_count: r.particle_count,
        neighbor_comparisons: r.neighbor_comparisons,
        max_neighbors: r.max_neighbors,
        n_squared: r.n_squared,
        spatial_hash_subquadratic: r.spatial_hash_subquadratic,
        kinetic_energy_max: r.kinetic_energy_max,
        kinetic_energy_bounded: r.kinetic_energy_bounded,
        deterministic_replay: r.deterministic_replay,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: "distinct".into(),
        letter: "io".into(),
        note: note.into(),
        dualsphysics_parity_ready: r.dualsphysics_parity_ready,
        chaos_fluid_aaa_ready: r.chaos_fluid_aaa_ready,
        flip_apic_parity_ready: r.flip_apic_parity_ready,
        chaos_hybrid_fluid_ready: r.chaos_hybrid_fluid_ready,
        chaos_pbd_parity_ready: r.chaos_pbd_parity_ready,
        xpbd_cloth_aaa_ready: r.xpbd_cloth_aaa_ready,
        unreal_mass_100k_ready: r.unreal_mass_100k_ready,
        mmap_sab_production_ready: r.mmap_sab_production_ready,
        avx512_kernel_ready: r.avx512_kernel_ready,
        gr_raymarch_ready: r.gr_raymarch_ready,
        dual_timeline_240_ready: r.dual_timeline_240_ready,
    }
}

/// Merge N≥2048 hash-soak fields into a small-soak report (desktop soak cmd).
fn merge_hash_fields(
    mut r: MatterThermodynamicsSphSoakReport,
    h: MatterThermodynamicsSphSoakReport,
) -> MatterThermodynamicsSphSoakReport {
    r.matter_thermodynamics_sph_hash_ready = h.matter_thermodynamics_sph_hash_ready;
    r.particle_count = h.particle_count;
    r.neighbor_comparisons = h.neighbor_comparisons;
    r.max_neighbors = h.max_neighbors;
    r.n_squared = h.n_squared;
    r.spatial_hash_subquadratic = h.spatial_hash_subquadratic;
    r.kinetic_energy_max = h.kinetic_energy_max;
    r.kinetic_energy_bounded = h.kinetic_energy_bounded;
    r.deterministic_replay = h.deterministic_replay;
    r
}

/// Run matter thermodynamics SPH soak via kernel — small soak + N≥2048 hash soak.
pub fn run_kernel_matter_thermodynamics_sph_soak() -> KernelMatterThermodynamicsSphWireReport {
    let r = merge_hash_fields(
        run_matter_thermodynamics_sph_soak(),
        run_matter_thermodynamics_sph_hash_soak(),
    );
    let note = if !r.matter_thermodynamics_sph_ready {
        "Matter Thermodynamics SPH soak failed — matterThermodynamicsSphReady stays false"
    } else if !r.matter_thermodynamics_sph_hash_ready {
        "Desktop soak: small SPH ready; letter io/CW2 N≥2048 spatial-hash deepen FAILED (subquad/locality/KE/replay) — matterThermodynamicsSphHashReady false; dualsphysics/chaos AAA HELD"
    } else {
        "Desktop soak: SoA SPH density + pressure + viscosity + heat + letter io/CW2 N≥2048 spatial-hash (avg C_step < N²/8, max_neighbors ≤ min(128,N/8), KE bounded, replay) — dualsphysics_parity_ready / chaos_fluid_aaa_ready false"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `matterThermodynamicsSphReady` + hash deepen **io**/CW2.
pub fn probe_matter_thermodynamics_sph() -> KernelMatterThermodynamicsSphWireReport {
    to_report(
        kernel_probe(),
        "Matter Thermodynamics SPH probe (letter io/CW2 deepen / hk base) — matterThermodynamicsSphReady + matterThermodynamicsSphHashReady (N≥2048, avg C_step < N²/8, max_neighbors ≤ min(128,N/8), KE bounded, replay); dualsphysics_parity_ready / chaos_fluid_aaa_ready HELD",
    )
}

/// Tauri IPC — matter thermodynamics SPH honesty.
#[tauri::command]
pub fn probe_matter_thermodynamics_sph_cmd() -> KernelMatterThermodynamicsSphWireReport {
    probe_matter_thermodynamics_sph()
}

/// Tauri IPC — run matter thermodynamics SPH soak.
#[tauri::command]
pub fn run_kernel_matter_thermodynamics_sph_soak_cmd() -> KernelMatterThermodynamicsSphWireReport {
    run_kernel_matter_thermodynamics_sph_soak()
}
