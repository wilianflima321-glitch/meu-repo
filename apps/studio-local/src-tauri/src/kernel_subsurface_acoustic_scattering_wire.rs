//! Subsurface Acoustic Scattering desktop wire — letter **kl**.
//!
//! Thin studio-local IPC over
//! `aethel_kernel_rust::subsurface_acoustic_scattering` (Passo 2, round kl — the
//! volumetric tissue-transmission lane of the "Paradigma do Áudio Latente
//! (MetaSounds Supremacy)" + P2-GAS physics spine of Launch Hard Gate #72): one
//! cohesive kernel that **composes the closed, already shipped real substrates
//! with zero substrate edits** (kh precedent), everything on the **Espectro
//! "Sólido vs Metamorfo"** (Zero Imposição — the 3 Leis da Adaptação Universal,
//! Doctrine #74 / S-27):
//! - **SDF volumetric occlusion (ex):** `SdfAudioRaymarching::march_occlusion`
//!   walks the tissue volume (sphere radius 0.25 m on the X-axis listener
//!   −1.2 m → source +1.2 m path) and reports the traversed solid path. A clear
//!   path (Empty field) yields `solid_path = 0` → identity;
//! - **SSS mean-free-path → tissue acoustic opacity (ip12):** absorption
//!   `abs = σ / MFP` with `σ = 0.9` — dense tissue (MFP 0.4 mm) is opaque
//!   (2.25 1/m), translucent tissue (MFP 2.5 mm) is transparent (0.36 1/m).
//!   Coherent transmission `direct = transmission · exp(−abs·path)`; hair
//!   fringe (512 strands) damps the highs;
//! - **Wrinkle surface scatter (kd on gs):** the real kd wrinkle map evaluated
//!   on gs strain (crease 0.9, strain 0.9, UV stretch 1.4) scatters the
//!   broadband transient only when the surface is wrinkled (smooth → ~0);
//! - **jx tissue modal:** the jx WOOD modal (soft-organic resonance proxy —
//!   honest, not claimed as a measured tissue IR) rings only when the tissue
//!   volume is struck (`solid_path > 0 && direct > 0.02`), silent on a clear
//!   path.
//!
//! **Espectro Sólido vs Metamorfo (Zero Imposição):** `Solid` = deterministic
//! band-limited strike identity; `Fluid` = `direct·s + diffuse·scatter` through
//! a gain-driven one-pole lowpass + jx modal ring — **bit-identical to Solid
//! when the SDF path is clear** (no tissue volume → direct = 1, diffuse = 0,
//! lowpass = 1, modal untriggered). The engine decides, never forces morphology.
//!
//! Soak chain (all honest, measured): tissue transmission measured + MFP couples
//! absorption + clear-path identity + Solid passthrough + Fluid morphing active +
//! wrinkle surface scatter measured + hair-fringe absorption measured + SDF
//! volumetric occlusion measured + diffuse scatter measured + tissue modal
//! resonance measured + deterministic replay + outputs finite + transmission
//! bounded → `subsurface_acoustic_scattering_ready` true, soak-gated.
//!
//! Honesty probe `subsurface_acoustic_scattering_ready` is soak-gated on
//! measured physical invariants and is **distinct** (single measured `d`, no
//! hard-coded `true`) from ip12 `strandHairSubsurfaceSkinReady`, kd
//! `skinWrinkleMapReady`, ex `sdfAudioRaymarchingReady`, jx `metasoundsDspReady`,
//! kj `microfractureAcousticReady` and kk `sonicBoomSignatureReady` (evidence
//! kind "subsurface_acoustic_scattering", FP seed `0x4B4C_5F53_5343` / XOR
//! `0x5353_43`). All `*_aaa_ready` flags false (**HELD** — a CPU composition of
//! a geometric SDF march + SSS MFP absorption + wrinkle scatter + WOOD modal is
//! not a shipped physical tissue acoustics / MetaHuman audio / full SSS AAA
//! system). J.11/J.12 STOPPED, backend only.

use aethel_kernel_rust::subsurface_acoustic_scattering::{
    probe_subsurface_acoustic_scattering as kernel_probe,
    run_subsurface_acoustic_scattering_soak, SubsurfaceAcousticScatteringSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelSubsurfaceAcousticScatteringWireReport {
    // readiness
    pub subsurface_acoustic_scattering_ready: bool,
    // subsystem gates
    pub tissue_transmission_measured: bool,
    pub mfp_couples_absorption: bool,
    pub clear_path_identity: bool,
    pub solid_identity_passthrough: bool,
    pub fluid_morphing_active: bool,
    pub wrinkle_surface_scatter_measured: bool,
    pub hair_fringe_absorption_measured: bool,
    pub sdf_volumetric_occlusion_measured: bool,
    pub diffuse_scatter_measured: bool,
    pub tissue_modal_resonance_measured: bool,
    pub deterministic_replay: bool,
    pub outputs_finite: bool,
    pub transmission_bounded: bool,
    // observation only (NOT a gate)
    pub tissue_scatter_alters_highs: bool,
    // tissue telemetry
    pub sss_mfp_mm_dense: f32,
    pub sss_mfp_mm_light: f32,
    pub dense_direct_transmission: f32,
    pub dense_lowpass_gain: f32,
    pub dense_solid_path_m: f32,
    pub dense_sss_absorption_m: f32,
    pub dense_wrinkle_scatter: f32,
    pub dense_hair_fringe_damp: f32,
    pub dense_diffuse_scatter_gain: f32,
    pub dense_modal_ring_rms: f32,
    pub dense_solid_rms: f32,
    pub dense_fluid_rms: f32,
    pub dense_solid_high_band_fraction: f32,
    pub dense_fluid_high_band_fraction: f32,
    pub light_direct_transmission: f32,
    pub light_lowpass_gain: f32,
    pub light_sss_absorption_m: f32,
    pub light_wrinkle_scatter: f32,
    pub light_hair_fringe_damp: f32,
    pub light_diffuse_scatter_gain: f32,
    pub clear_direct_transmission: f32,
    pub clear_lowpass_gain: f32,
    pub sample_rate_hz: f32,
    pub soak_elapsed_ns: u128,
    // evidence
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_strand_hair_subsurface_skin_probe: bool,
    pub distinct_from_skin_wrinkle_map_probe: bool,
    pub distinct_from_sdf_audio_raymarching_probe: bool,
    pub distinct_from_metasounds_dsp_probe: bool,
    pub distinct_from_microfracture_acoustic_probe: bool,
    pub distinct_from_mach1_sonic_boom_probe: bool,
    // AAA held — always false (HELD)
    pub physical_audio_aaa_ready: bool,
    pub tissue_acoustics_aaa_ready: bool,
    pub meta_human_audio_aaa_ready: bool,
    pub strand_hair_subsurface_skin_aaa_ready: bool,
    pub wrinkle_aaa_ready: bool,
    pub sdf_occlusion_aaa_ready: bool,
    pub note: String,
}

fn to_report(
    r: SubsurfaceAcousticScatteringSoakReport,
    note: impl Into<String>,
) -> KernelSubsurfaceAcousticScatteringWireReport {
    KernelSubsurfaceAcousticScatteringWireReport {
        subsurface_acoustic_scattering_ready: r.subsurface_acoustic_scattering_ready,
        tissue_transmission_measured: r.tissue_transmission_measured,
        mfp_couples_absorption: r.mfp_couples_absorption,
        clear_path_identity: r.clear_path_identity,
        solid_identity_passthrough: r.solid_identity_passthrough,
        fluid_morphing_active: r.fluid_morphing_active,
        wrinkle_surface_scatter_measured: r.wrinkle_surface_scatter_measured,
        hair_fringe_absorption_measured: r.hair_fringe_absorption_measured,
        sdf_volumetric_occlusion_measured: r.sdf_volumetric_occlusion_measured,
        diffuse_scatter_measured: r.diffuse_scatter_measured,
        tissue_modal_resonance_measured: r.tissue_modal_resonance_measured,
        deterministic_replay: r.deterministic_replay,
        outputs_finite: r.outputs_finite,
        transmission_bounded: r.transmission_bounded,
        tissue_scatter_alters_highs: r.tissue_scatter_alters_highs,
        sss_mfp_mm_dense: r.sss_mfp_mm_dense,
        sss_mfp_mm_light: r.sss_mfp_mm_light,
        dense_direct_transmission: r.dense_direct_transmission,
        dense_lowpass_gain: r.dense_lowpass_gain,
        dense_solid_path_m: r.dense_solid_path_m,
        dense_sss_absorption_m: r.dense_sss_absorption_m,
        dense_wrinkle_scatter: r.dense_wrinkle_scatter,
        dense_hair_fringe_damp: r.dense_hair_fringe_damp,
        dense_diffuse_scatter_gain: r.dense_diffuse_scatter_gain,
        dense_modal_ring_rms: r.dense_modal_ring_rms,
        dense_solid_rms: r.dense_solid_rms,
        dense_fluid_rms: r.dense_fluid_rms,
        dense_solid_high_band_fraction: r.dense_solid_high_band_fraction,
        dense_fluid_high_band_fraction: r.dense_fluid_high_band_fraction,
        light_direct_transmission: r.light_direct_transmission,
        light_lowpass_gain: r.light_lowpass_gain,
        light_sss_absorption_m: r.light_sss_absorption_m,
        light_wrinkle_scatter: r.light_wrinkle_scatter,
        light_hair_fringe_damp: r.light_hair_fringe_damp,
        light_diffuse_scatter_gain: r.light_diffuse_scatter_gain,
        clear_direct_transmission: r.clear_direct_transmission,
        clear_lowpass_gain: r.clear_lowpass_gain,
        sample_rate_hz: r.sample_rate_hz,
        soak_elapsed_ns: r.soak_elapsed_ns,
        evidence_kind: r.evidence_kind.to_string(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_strand_hair_subsurface_skin_probe: r
            .distinct_from_strand_hair_subsurface_skin_probe,
        distinct_from_skin_wrinkle_map_probe: r.distinct_from_skin_wrinkle_map_probe,
        distinct_from_sdf_audio_raymarching_probe: r.distinct_from_sdf_audio_raymarching_probe,
        distinct_from_metasounds_dsp_probe: r.distinct_from_metasounds_dsp_probe,
        distinct_from_microfracture_acoustic_probe: r.distinct_from_microfracture_acoustic_probe,
        distinct_from_mach1_sonic_boom_probe: r.distinct_from_mach1_sonic_boom_probe,
        physical_audio_aaa_ready: r.physical_audio_aaa_ready,
        tissue_acoustics_aaa_ready: r.tissue_acoustics_aaa_ready,
        meta_human_audio_aaa_ready: r.meta_human_audio_aaa_ready,
        strand_hair_subsurface_skin_aaa_ready: r.strand_hair_subsurface_skin_aaa_ready,
        wrinkle_aaa_ready: r.wrinkle_aaa_ready,
        sdf_occlusion_aaa_ready: r.sdf_occlusion_aaa_ready,
        note: note.into(),
    }
}

/// Run subsurface acoustic scattering soak via kernel.
pub fn run_kernel_subsurface_acoustic_scattering_soak() -> KernelSubsurfaceAcousticScatteringWireReport {
    let r = run_subsurface_acoustic_scattering_soak();
    let note = if !r.subsurface_acoustic_scattering_ready {
        "Subsurface acoustic scattering soak failed — subsurfaceAcousticScatteringReady stays false"
    } else {
        "Desktop soak: one cohesive kernel composing the closed real substrates with zero substrate edits (kh precedent), everything on the Espectro Sólido vs Metamorfo (Zero Imposição — the 3 Leis da Adaptação Universal, Doctrine #74 / S-27). SDF volumetric occlusion (ex): SdfAudioRaymarching::march_occlusion walks the tissue volume (sphere radius 0.25 m on the X-axis listener -1.2 m -> source +1.2 m path) and reports the traversed solid path (clear path -> solid_path 0 -> identity). SSS mean-free-path -> tissue acoustic opacity (ip12): absorption = 0.9 / MFP — dense tissue (MFP 0.4 mm) opaque (2.25 1/m), translucent (MFP 2.5 mm) transparent (0.36 1/m); coherent transmission = transmission * exp(-abs*path); hair fringe (512 strands) damps highs. Wrinkle surface scatter (kd on gs): real kd wrinkle map on gs strain (crease 0.9, strain 0.9, UV stretch 1.4) scatters the broadband transient only when wrinkled (smooth -> ~0). jx tissue modal: WOOD modal (soft-organic resonance proxy — honest, not a measured tissue IR) rings only when the tissue volume is struck (solid_path > 0 && direct > 0.02), silent on a clear path. Espectro Sólido vs Metamorfo: Solid = deterministic band-limited strike identity; Fluid = direct*s + diffuse*scatter through a gain-driven one-pole lowpass + jx modal ring — bit-identical to Solid when the SDF path is clear (direct 1, diffuse 0, lowpass 1, modal untriggered). Deterministic replay, outputs finite, transmission bounded, subsurfaceAcousticScatteringReady true soak-gated; evidence kind subsurface_acoustic_scattering distinct from ip12/kd/ex/jx/kj/kk (single measured d, no hard-coded true); physical_audio / tissue_acoustics / meta_human_audio / strand_hair_subsurface_skin / wrinkle / sdf_occlusion *_aaa_ready HELD"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `subsurface_acoustic_scattering_ready` (letter kl).
pub fn probe_subsurface_acoustic_scattering() -> KernelSubsurfaceAcousticScatteringWireReport {
    to_report(
        kernel_probe(),
        "Subsurface acoustic scattering probe (letter kl) — composition kernel fusing the closed real substrates ex (sdf_audio_raymarching SDF volumetric occlusion), ip12 (strand_hair_subsurface_skin SSS mean-free-path -> tissue acoustic opacity + hair fringe), kd (skin_wrinkle_map surface diffuse scatter on real gs strain), jx (metasounds_dsp_compiler WOOD modal — soft-organic tissue resonance proxy) with zero substrate edits, on the Espectro Sólido vs Metamorfo (Zero Imposição — the 3 Leis da Adaptação Universal, Doctrine #74 / S-27): Solid = deterministic band-limited strike identity, Fluid = direct*s + diffuse*scatter through a gain-driven lowpass + jx modal ring — bit-identical to Solid when the SDF path is clear (direct 1, diffuse 0, lowpass 1, modal untriggered). Coherent transmission = transmission * exp(-(0.9/MFP)*path); dense tissue (MFP 0.4 mm) opaque vs translucent (MFP 2.5 mm); wrinkle scatter only when wrinkled; hair-fringe damp only with hair; modal rings only on a struck volume. subsurfaceAcousticScatteringReady true soak-gated; distinct from ip12 strandHairSubsurfaceSkinReady / kd skinWrinkleMapReady / ex sdfAudioRaymarchingReady / jx metasoundsDspReady / kj microfractureAcousticReady / kk sonicBoomSignatureReady; physical_audio / tissue_acoustics / meta_human_audio / strand_hair_subsurface_skin / wrinkle / sdf_occlusion *_aaa_ready HELD",
    )
}

/// Tauri IPC — subsurface acoustic scattering honesty.
#[tauri::command]
pub fn probe_subsurface_acoustic_scattering_cmd() -> KernelSubsurfaceAcousticScatteringWireReport {
    probe_subsurface_acoustic_scattering()
}

/// Tauri IPC — run subsurface acoustic scattering soak.
#[tauri::command]
pub fn run_kernel_subsurface_acoustic_scattering_soak_cmd() -> KernelSubsurfaceAcousticScatteringWireReport {
    run_kernel_subsurface_acoustic_scattering_soak()
}
