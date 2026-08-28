//! # S-11 Kernel Wire Registry â€” the machine-readable gap table (round R0).
//!
//! Doctrine #73 (Absolute Supremacy) + doctrine #74 (AdaptaÃ§Ã£o Universal) â€”
//! **Zero Amnesia** sobre a superfÃ­cie de IPC do Studio Local.
//!
//! Este mÃ³dulo Ã© a **fonte Ãºnica de verdade** para cada `kernel_*_wire` que
//! conecta um solver do Aethel Kernel Ã  superfÃ­cie de comandos Tauri do Studio
//! Local. Nenhuma wire existe em disco sem uma entrada aqui; nenhuma entrada
//! aqui aponta para um mÃ³dulo fantasma. O `xtask wire-check` (round R1) lÃª esta
//! tabela e **falha o build fail-closed** quando a realidade do disco deriva
//! (wire nova sem entrada, `reachable_from` obsoleto, letra ausente em wire
//! ACTIVE, contagem divergente).
//!
//! ## Estado medido (NUNCA chutado â€” Anti-Hallucination Protocol)
//!
//! Auditado em disco em `2026-08-14` (round R0):
//!
//! | MÃ©trica | Valor |
//! |---------|-------|
//! | Wires `kernel_*_wire.rs` no disco (studio) | **115** |
//! | `pub mod kernel_*_wire;` compilados no `lib.rs` do studio | **115** (1:1 â€” nenhum Ã³rfÃ£o de compilaÃ§Ã£o) |
//! | MÃ³dulos wire alcanÃ§Ã¡veis via `generate_handler!` (`main.rs`) | **4** (5 comandos) |
//! | **Compiled-but-unreachable** (dÃ­vida P2g â€” S-11) | **111** |
//! | Wires sem letra documentada (dÃ­vida de completude S-11) | **3** (todas `Wire`; nenhuma `Active`) |
//! | Wires classificadas **Deep** (â‰¥300L + SoakReport + `mod tests`) | **109** |
//! | Wires classificadas **Medium** (â‰¥100L + soak ou tests) | **6** |
//! | Wires classificadas **Shallow** (<100L sem soak nem tests) | **0** |
//! | Wires em **STUB-RISK** (nÃ£o-`Active`, rasa, sem soak nem tests) | **0** |
//! | Substratos finos profundados em R0 (â‰¤100L â†’ â‰¥300L + soak) | **3** (anisotropic GGX BRDF, semantic light leak lattice, thermal ÏƒTâ´ Planckian) |
//!
//! **R11 (2026-08-16):** 121 wires no disco, **10** `Active` via `generate_handler!`
//! (novo `kernel_neural_physics_co_sim_wire`, letter `jz` â€” S-26
//! Neural-Physics Co-Sim + SDF Collision), 111 compiled-but-unreachable (121 âˆ’ 10),
//! 3 sem letra.
//! `REGISTRY_VERSION = "r11-2026-08-16"`.
//!
//! **R15 (2026-08-16):** 125 wires no disco, **14** `Active` (novo
//! `kernel_sdf_contact_blending_wire`, letter `kq` â€” R2-A SDF Contact Blending
//! + soft contact shadow), 111 compiled-but-unreachable (125 âˆ’ 14), 3 sem letra.
//! `REGISTRY_VERSION = "r15-2026-08-16"`.
//!
//! **R16 (2026-08-16):** 126 wires no disco, **15** `Active` (novo
//! `kernel_micro_shadow_bent_normals_wire`, letter `kr` â€” R2-B Micro-shadows
//! + Bent Normals), 111 compiled-but-unreachable (126 âˆ’ 15), 3 sem letra.
//! `REGISTRY_VERSION = "r16-2026-08-16"`.
//!
//! **R17 (2026-08-16):** 127 wires no disco, **16** `Active` (novo
//! `kernel_dynamic_surface_deformation_wire`, letter `ks` â€” R2-C Dynamic
//! Surface Deformation, volume-conserving LoG impact kernel + soft ground
//! deformation), 111 compiled-but-unreachable (127 âˆ’ 16), 3 sem letra.
//! `REGISTRY_VERSION = "r17-2026-08-16"`.
//!
//! **R18 (2026-08-16):** 128 wires no disco, **17** `Active` (novo
//! `kernel_async_compute_scheduler_wire`, letter `kt` â€” R2-D Async Compute
//! Scheduler, longest-path wave assignment + gap-free fence timeline + engine
//! overlap + deterministic ring-buffer backing), 111 compiled-but-unreachable
//! (128 âˆ’ 17), 3 sem letra.
//! `REGISTRY_VERSION = "r18-2026-08-16"`.
//!
//! **R19 (2026-08-16):** 129 wires no disco, **18** `Active` (novo
//! `kernel_dynamic_shader_rewriter_wire`, letter `km` â€” R2-E Dynamic Shader
//! Rewriter PSO Vault, deterministic pipeline-cook with 12-bit permutation
//! enumeration + 8192-slot ordered vault + measured hit-rate), 111
//! compiled-but-unreachable (129 âˆ’ 18), 3 sem letra.
//! `REGISTRY_VERSION = "r19-2026-08-16"`.
//!
//! **R20 (2026-08-16):** 130 wires no disco, **19** `Active` (novo
//! `kernel_euphoria_balance_controller_wire`, letter `ko` â€” R2-F Euphoria
//! Balance Controller, capture-point (Pratt) wired no `PhysicsWorld::step`
//! com massa 1:1 (75 kg) â€” CoM sync por sub-passo, hand-plant, fall recovery
//! e foot placement), 111 compiled-but-unreachable (130 âˆ’ 19), 3 sem letra.
//! `REGISTRY_VERSION = "r20-2026-08-16"`.
//!
//! **R21 (2026-08-17):** 131 wires no disco, **20** `Active` (novo
//! `kernel_world_forge_densification_wire`, letter `ku` â€” R2-G World Forge
//! Densification, sweep determinÃ­stico sobre o grid R1.4
//! (`spatial_partition_hibernation`) com paridade de broadphase
//! (`cell_of`/`brute_force_cell_pairs`), edge de contato SDF composto
//! (R2-Gâ†’R2-A) e payload de rest para wind field (R2-Gâ†’R2-H); build zero-alloc
//! SoA com fail-closed em overflow), 111 compiled-but-unreachable (131 âˆ’ 20),
//! 3 sem letra. `REGISTRY_VERSION = "r21-2026-08-17"`.
//!
//! **R22 (2026-08-17):** 132 wires no disco, **21** `Active` (novo
//! `kernel_wind_field_dynamics_wire`, letter `kv` â€” R2-H Wind Field Dynamics,
//! dinÃ¢mica de vento determinÃ­stica (grid trilinear, gust envelope, turbulÃªncia
//! clampada) que dobra a vegetaÃ§Ã£o/grama do R2-G via `BendPayload` (edge
//! R2-Gâ†’R2-H), advecÃ§Ã£o escalar semi-Lagrangiana CFL-guarded e envelope de vento
//! HRTF-ready (parameter producer)), 111 compiled-but-unreachable (132 âˆ’ 21),
//! 3 sem letra. `REGISTRY_VERSION = "r22-2026-08-17"`.
//!
//! **R23 (2026-08-17):** 133 wires no disco, **22** `Active` (novo
//! `kernel_auto_photography_director_wire`, letter `kw` â€” R2-I Auto Photography
//! Director, rule engine de cinematografia determinÃ­stico com 6 regras de forma
//! fechada (Rule of Thirds, Headroom, Lead Room, Rule 180, Lens Focal Length,
//! Camera Height) que posiciona o sujeito em `DirectedCameraShot` compliant,
//! composto sobre o R1.5 `sequencing_timeline` (`compose_cinema_frame` â€” edge
//! R2-Iâ†’ju); **Trava Lei XVI** via `CreativeFusionTransaction` fail-closed),
//! 111 compiled-but-unreachable (133 âˆ’ 22), 3 sem letra. `REGISTRY_VERSION =
//! "r23-2026-08-17"`.
//!
//! AlcanÃ§Ã¡veis por comando (status `Active`):
//! - `kernel_aethel_matter_model_wire` (`probe_aethel_matter_model_cmd` + `run_..._soak_cmd`)
//! - `kernel_async_compute_scheduler_wire` (`probe_async_compute_scheduler_cmd` + `run_..._soak_cmd`)
//! - `kernel_auto_photography_director_wire` (`probe_auto_photography_director_cmd` + `run_kernel_auto_photography_director_soak_cmd`)
//! - `kernel_dynamic_shader_rewriter_wire` (`probe_dynamic_shader_rewriter_cmd` + `run_..._soak_cmd`)
//! - `kernel_euphoria_balance_controller_wire` (`probe_euphoria_balance_controller_cmd` + `run_..._soak_cmd`)
//! - `kernel_foundation_honesty_wire` (`probe_kernel_foundation_cmd`)
//! - `kernel_living_sky_fluid_ocean_buoyancy_wire` (`probe_living_sky_fluid_ocean_buoyancy_cmd` + `run_..._soak_cmd`)
//! - `kernel_micro_poly_cull_wire` (`probe_micro_poly_cull_cmd`)
//! - `kernel_neural_physics_co_sim_wire` (`probe_neural_physics_co_sim_cmd` + `run_..._soak_cmd`)
//! - `kernel_physics_world_solvers_wire` (`probe_physics_world_solvers_cmd` + `run_..._soak_cmd`)
//! - `kernel_position_based_dynamics_wire` (`probe_..._cmd` + `run_..._soak_cmd`)
//! - `kernel_procedural_muscle_locomotion_wire` (`probe_procedural_muscle_locomotion_cmd` + `run_..._soak_cmd`)
//! - `kernel_risk_envelope_wire` (`probe_risk_envelope_cmd`)
//! - `kernel_wire_reachability_wire` (`probe_wire_reachability_cmd` + `run_..._soak_cmd`)
//! - `kernel_world_forge_densification_wire` (`probe_world_forge_densification_cmd` + `run_kernel_world_forge_densification_soak_cmd`)
//!
//! ObservaÃ§Ã£o de precisÃ£o: `kernel_svo_terrain_world_partition_wire` Ã© importado
//! por glob em `main.rs:82`, porÃ©m **nenhum comando seu estÃ¡ registrado** no
//! `generate_handler!` â€” por isso permanece `Wire` (a importaÃ§Ã£o por glob nÃ£o o
//! torna alcanÃ§Ã¡vel como superfÃ­cie de comando).
//!
//! ## SemÃ¢ntica de `status`
//!
//! - `Active` â€” wire registrada em `generate_handler!`, alcanÃ§Ã¡vel por comando.
//! - `Wire` â€” compilada com ponto de entrada probe/soak, porÃ©m **nÃ£o** alcanÃ§Ã¡vel
//!   por comando (dÃ­vida P2g; Onda G nÃ£o pode lanÃ§ar com 115 Ã³rfÃ£os em R30).
//! - `Held` â€” explicitamente gated (flag `*_AAA_READY = false` atÃ© soak provado);
//!   reservado para wires cuja flag de prontidÃ£o esteja documentada como HELD.
//!
//! ## DÃ­vidas capturadas (nÃ£o escondidas)
//!
//! 1. **115 wires compiladas mas inalcanÃ§Ã¡veis** â€” o `xtask wire-check` (R1)
//!    torna a deriva uma falha de build, e R2 (S-12 `ipc_surface`) reconecta o
//!    conjunto por ACL.
//! 2. **3 wires sem letra** â€” todas `Wire` (materialx_bridge, openvdb_bridge,
//!    usd_universal_exporter); `xtask wire-check` exige letra em toda wire
//!    ACTIVE e registra as WIRE sem letra como pendÃªncia. Em R0,
//!    `kernel_micro_poly_cull_wire` recebeu a letra `gz` (faixa de
//!    renderizaÃ§Ã£o GPU â€” P1/Onda G, Micro-Poly Foundation) e
//!    `kernel_anisotropic_neural_microfacets_wire` recebeu a letra `brdf`
//!    (BRDF anisotrÃ³pico â€” Onda G), fechando a dÃ­vida de letra nas wires
//!    ACTIVE e profundando 3 substrates finos (anisotropic GGX BRDF completo,
//!    semantic light leak lattice soak, thermal ÏƒTâ´ Planckian soak).

/// Status de alcanÃ§abilidade de uma wire no registro S-11.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WireStatus {
    /// Registrada em `generate_handler!` â€” alcanÃ§Ã¡vel por comando Tauri.
    Active,
    /// Compilada com probe/soak, porÃ©m sem comando registrado (dÃ­vida P2g).
    Wire,
    /// Explicitamente gated por flag de prontidÃ£o `*_AAA_READY = false`.
    Held,
}

impl WireStatus {
    /// Tag estÃ¡vel para telemetria / serde (nunca deriva de debug).
    pub const fn tag(self) -> &'static str {
        match self {
            WireStatus::Active => "active",
            WireStatus::Wire => "wire",
            WireStatus::Held => "held",
        }
    }

    /// `true` se a wire pode ser invocada da frente neste momento.
    pub const fn is_reachable(self) -> bool {
        matches!(self, WireStatus::Active)
    }
}

/// Uma entrada declarativa do registro S-11.
///
/// `reachable_from` Ã© **medido** (nome do ponto de registro real no `main.rs`),
/// nunca assumido. Letras vazias (`""`) sinalizam dÃ­vida de completude S-11.
#[derive(Debug, Clone, Copy)]
pub struct KernelWireEntry {
    /// MÃ³dulo da wire no Studio Local, ex.: `"kernel_position_based_dynamics_wire"`.
    pub wire_module: &'static str,
    /// MÃ³dulo solver no Aethel Kernel, ex.: `"position_based_dynamics"`.
    pub kernel_module: &'static str,
    /// Letra do sistema de nomenclatura (ex.: `"hj"`); `""` = dÃ­vida S-11.
    pub letter: &'static str,
    /// Status de alcanÃ§abilidade medido.
    pub status: WireStatus,
    /// Ponto de registro real (`tauri::generate_handler!`) ou nota da dÃ­vida.
    pub reachable_from: &'static str,
}

/// VersÃ£o deste registro (round + data da auditoria).
pub const REGISTRY_VERSION: &str = "r30-2026-08-20";

/// Contagem medida de wires compiladas (deve casar com o disco via xtask).
pub const WIRES_ON_DISK: usize = 150;

/// MÃ³dulos wire alcanÃ§Ã¡veis por comando (medido).
pub const REACHABLE_WIRE_COUNT: usize = 35;

/// Registro declarativo completo â€” **150 entradas**, ordenadas alfabeticamente
/// por `wire_module` para diffs determinÃ­sticos. R30: +1 Wire compiled-only
/// `kernel_asset_quality_gate_wire` (letter `bw` â€” Asset Quality Gate: autoridade
/// determinÃ­stica de QUALIDADE MÃXIMA para assets gerados por IA â€” tiers
/// ai-draft/curated-marketplace/studio-local-optimized/cloud-render-grade com
/// budgets de triÃ¢ngulos / VRAM (KTX2 vs RGBA8) / LoD / proxies colisÃ£o-navmesh /
/// texels-per-meter / provenance + dimensÃ£o NOVA de qualidade topolÃ³gica
/// (grade 0â€“100 vs mÃ­nimos 60/80/90/95 â€” superior a Meshy/Tripo/Unreal)) â€”
/// 149â†’150 wires no disco; 35 alcanÃ§Ã¡veis; Ã³rfÃ£os 150âˆ’35=115 (invariante
/// preservado: +1 Ã³rfÃ£o compilado, dÃ­vida P2g).
pub const KERNEL_WIRE_REGISTRY: &[KernelWireEntry] = &[
    KernelWireEntry {
        wire_module: "kernel_aces_cinematic_tonemapper_wire",
        kernel_module: "aces_cinematic_tonemapper",
        letter: "gf",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_acoustic_raytracing_echo_wire",
        kernel_module: "acoustic_raytracing_echo",
        letter: "ef",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_acoustic_raytracing_solver_wire",
        kernel_module: "acoustic_raytracing_solver",
        letter: "ka",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_acoustic_reverb_geometry_wire",
        kernel_module: "acoustic_reverb_geometry",
        letter: "ei",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_aerodynamic_navier_stokes_wire",
        kernel_module: "aerodynamic_navier_stokes",
        letter: "gv",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_aethel_matter_model_wire",
        kernel_module: "aethel_matter_model",
        letter: "jv",
        status: WireStatus::Active,
        reachable_from: "tauri::generate_handler! (main.rs) â€” probe_aethel_matter_model_cmd + run_kernel_aethel_matter_model_soak_cmd",
    },
    KernelWireEntry {
        wire_module: "kernel_alexa_cinematic_optics_wire",
        kernel_module: "alexa_cinematic_optics",
        letter: "gn",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_anisotropic_neural_microfacets_wire",
        kernel_module: "anisotropic_neural_microfacets",
        letter: "brdf",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_asset_color_appearance_wire",
        kernel_module: "asset_color_appearance",
        letter: "ac",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_asset_quality_gate_wire",
        kernel_module: "asset_quality_gate",
        letter: "bw",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_asset_spectral_radiance_wire",
        kernel_module: "asset_spectral_radiance",
        letter: "lk",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_async_compute_scheduler_wire",
        kernel_module: "async_compute_scheduler",
        letter: "kt",
        status: WireStatus::Active,
        reachable_from: "tauri::generate_handler! (main.rs) â€” probe_async_compute_scheduler_cmd + run_kernel_async_compute_scheduler_soak_cmd",
    },
    KernelWireEntry {
        wire_module: "kernel_asynchronous_reality_threads_wire",
        kernel_module: "asynchronous_reality_threads",
        letter: "fm",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_atmospheric_physical_damping_wire",
        kernel_module: "atmospheric_physical_damping",
        letter: "hl",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_atmospheric_scattering_godrays_wire",
        kernel_module: "atmospheric_scattering_godrays",
        letter: "gb",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_atmospheric_spine_particles_wire",
        kernel_module: "atmospheric_spine_particles",
        letter: "gl",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_atomic_thread_sync_wire",
        kernel_module: "atomic_thread_sync",
        letter: "ff",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_auto_photography_director_wire",
        kernel_module: "auto_photography_director",
        letter: "kw",
        status: WireStatus::Active,
        reachable_from: "tauri::generate_handler! (main.rs) â€” probe_auto_photography_director_cmd + run_kernel_auto_photography_director_soak_cmd",
    },
    KernelWireEntry {
        wire_module: "kernel_autonomous_conflict_generator_wire",
        kernel_module: "autonomous_conflict_generator",
        letter: "hm",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_autonomous_entropy_corrector_wire",
        kernel_module: "autonomous_entropy_corrector",
        letter: "dr",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_baremetal_memory_manager_wire",
        kernel_module: "baremetal_memory_manager",
        letter: "dl",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_binary_seed_streamer_wire",
        kernel_module: "binary_seed_streamer",
        letter: "fk",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_bitstream_reality_sync_wire",
        kernel_module: "bitstream_reality_sync",
        letter: "fj",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_blue_noise_dithering_wire",
        kernel_module: "blue_noise_dithering_relaxer",
        letter: "fx",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_celestial_orbital_dynamics_wire",
        kernel_module: "celestial_orbital_dynamics",
        letter: "lb",
        status: WireStatus::Active,
        reachable_from: "tauri::generate_handler! (main.rs) â€” probe_celestial_orbital_dynamics_cmd + run_kernel_celestial_orbital_dynamics_soak_cmd",
    },
    KernelWireEntry {
        wire_module: "kernel_chromatic_glass_refraction_wire",
        kernel_module: "chromatic_glass_refraction",
        letter: "gd",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_cinema_frame_graph_composition_wire",
        kernel_module: "cinema_frame_graph_composition",
        letter: "kx",
        status: WireStatus::Active,
        reachable_from: "tauri::generate_handler! (main.rs) â€” probe_cinema_frame_graph_composition_cmd + run_kernel_cinema_frame_graph_composition_soak_cmd",
    },
    KernelWireEntry {
        wire_module: "kernel_cinema_hot_loop_composition_wire",
        kernel_module: "cinema_hot_loop_composition",
        letter: "ky",
        status: WireStatus::Active,
        reachable_from: "tauri::generate_handler! (main.rs) â€” probe_cinema_hot_loop_composition_cmd + run_kernel_cinema_hot_loop_composition_soak_cmd",
    },
    KernelWireEntry {
        wire_module: "kernel_composite_fracture_wire",
        kernel_module: "composite_fracture_kernel",
        letter: "kh",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_contextual_physics_override_wire",
        kernel_module: "contextual_physics_override",
        letter: "ey",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_cpu_affinity_micro_workers_wire",
        kernel_module: "cpu_affinity_micro_workers",
        letter: "fl",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_crdt_quantum_sync_wire",
        kernel_module: "crdt_quantum_sync",
        letter: "fg",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_curved_raymarcher_wire",
        kernel_module: "non_euclidean_curved_raymarcher",
        letter: "dt",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_delta_seed_synchronization_wire",
        kernel_module: "delta_seed_synchronization",
        letter: "fh",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_digital_pressure_chamber_wire",
        kernel_module: "digital_pressure_chamber",
        letter: "fa",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_dynamic_matter_entropy_wire",
        kernel_module: "dynamic_matter_entropy",
        letter: "hp",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_dynamic_physics_dsl_wire",
        kernel_module: "dynamic_physics_dsl",
        letter: "gc",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_dynamic_shader_rewriter_wire",
        kernel_module: "dynamic_shader_rewriter",
        letter: "km",
        status: WireStatus::Active,
        reachable_from: "tauri::generate_handler! (main.rs) â€” probe_dynamic_shader_rewriter_cmd + run_kernel_dynamic_shader_rewriter_soak_cmd",
    },
    KernelWireEntry {
        wire_module: "kernel_dynamic_surface_deformation_wire",
        kernel_module: "dynamic_surface_deformation",
        letter: "ks",
        status: WireStatus::Active,
        reachable_from: "tauri::generate_handler! (main.rs) â€” probe_dynamic_surface_deformation_cmd + run_kernel_dynamic_surface_deformation_soak_cmd",
    },
    KernelWireEntry {
        wire_module: "kernel_euphoria_balance_controller_wire",
        kernel_module: "euphoria_balance_controller",
        letter: "ko",
        status: WireStatus::Active,
        reachable_from: "tauri::generate_handler! (main.rs) â€” probe_euphoria_balance_controller_cmd + run_kernel_euphoria_balance_controller_soak_cmd",
    },
    KernelWireEntry {
        wire_module: "kernel_facial_micro_fluids_wire",
        kernel_module: "facial_micro_fluids",
        letter: "ke",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_facial_performance_wire",
        kernel_module: "facial_performance",
        letter: "kc",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_finite_element_analysis_wire",
        kernel_module: "finite_element_analysis_kernel",
        letter: "eh",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_flight_aerodynamics_wire",
        kernel_module: "flight_aerodynamics",
        letter: "la",
        status: WireStatus::Active,
        reachable_from: "tauri::generate_handler! (main.rs) â€” probe_flight_aerodynamics_cmd + run_kernel_flight_aerodynamics_soak_cmd",
    },
    KernelWireEntry {
        wire_module: "kernel_fluid_ninja_compute_wire",
        kernel_module: "fluid_ninja_compute",
        letter: "gg",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_fm_additive_synthesis_wire",
        kernel_module: "fm_additive_synthesis",
        letter: "ej",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_formal_logic_verifier_wire",
        kernel_module: "formal_logic_verifier",
        letter: "fv",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_foundation_honesty_wire",
        kernel_module: "kernel_honesty",
        letter: "dc",
        status: WireStatus::Active,
        reachable_from: "tauri::generate_handler! (main.rs) â€” probe_kernel_foundation_cmd",
    },
    KernelWireEntry {
        wire_module: "kernel_four_dimensional_time_sdf_wire",
        kernel_module: "four_dimensional_time_sdf",
        letter: "dv",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_fractal_energy_perturbation_wire",
        kernel_module: "fractal_energy_perturbation",
        letter: "ds",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_gaze_foveated_reprojection_wire",
        kernel_module: "gaze_foveated_reprojection",
        letter: "gt",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_gaze_intent_anticipation_wire",
        kernel_module: "gaze_intent_anticipation",
        letter: "lh",
        status: WireStatus::Active,
        reachable_from: "tauri::generate_handler! (main.rs) â€” probe_gaze_intent_anticipation_cmd + run_kernel_gaze_intent_anticipation_soak_cmd",
    },
    KernelWireEntry {
        wire_module: "kernel_genomic_seed_library_wire",
        kernel_module: "genomic_seed_library",
        letter: "ft",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_genomic_seed_transmitter_wire",
        kernel_module: "genomic_seed_transmitter",
        letter: "fu",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_geometric_scale_constraints_wire",
        kernel_module: "geometric_scale_constraints",
        letter: "fb",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_ghost_state_predictor_wire",
        kernel_module: "ghost_state_predictor",
        letter: "fr",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_gpu_strand_grooming_wire",
        kernel_module: "gpu_strand_grooming",
        letter: "kf",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_hdr_32bit_float_pipeline_wire",
        kernel_module: "hdr_32bit_float_pipeline",
        letter: "gr",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_hermite_duality_grid_wire",
        kernel_module: "hermite_duality_grid",
        letter: "ek",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_hermite_sharp_features_wire",
        kernel_module: "hermite_sharp_features",
        letter: "el",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_hierarchical_streaming_cache_wire",
        kernel_module: "hierarchical_streaming_cache",
        letter: "fp",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_holographic_scene_tensor_wire",
        kernel_module: "holographic_scene_tensor",
        letter: "le",
        status: WireStatus::Active,
        reachable_from: "tauri::generate_handler! (main.rs) â€” probe_holographic_scene_tensor_cmd + run_kernel_holographic_scene_tensor_soak_cmd",
    },
    KernelWireEntry {
        wire_module: "kernel_hybrid_cluster_shading_vsvm_wire",
        kernel_module: "hybrid_cluster_shading_vsvm",
        letter: "gk",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_hybrid_eulerian_lagrangian_pbd_wire",
        kernel_module: "hybrid_eulerian_lagrangian_pbd",
        letter: "gy",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_hybrid_geometry_svo_wire",
        kernel_module: "hybrid_geometry_svo",
        letter: "es",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_infinite_anti_aliasing_wire",
        kernel_module: "infinite_anti_aliasing",
        letter: "gi",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_internal_voxel_density_wire",
        kernel_module: "internal_voxel_density",
        letter: "eu",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_latent_audio_adaptation_wire",
        kernel_module: "latent_audio_adaptation",
        letter: "ki",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_latent_dreamspace_bytecode_wire",
        kernel_module: "latent_dreamspace_bytecode",
        letter: "lc",
        status: WireStatus::Active,
        reachable_from: "tauri::generate_handler! (main.rs) â€” probe_latent_dreamspace_bytecode_cmd + run_kernel_latent_dreamspace_bytecode_soak_cmd",
    },
    KernelWireEntry {
        wire_module: "kernel_lattice_boltzmann_gas_fluid_wire",
        kernel_module: "lattice_boltzmann_gas_fluid",
        letter: "gx",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_live_cache_manager_wire",
        kernel_module: "live_cache_manager",
        letter: "fo",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_living_sky_fluid_ocean_buoyancy_wire",
        kernel_module: "living_sky_fluid_ocean_buoyancy",
        letter: "jy",
        status: WireStatus::Active,
        reachable_from: "tauri::generate_handler! (main.rs) â€” probe_living_sky_fluid_ocean_buoyancy_cmd + run_kernel_living_sky_fluid_ocean_buoyancy_soak_cmd",
    },
    KernelWireEntry {
        wire_module: "kernel_lockfree_ring_buffer_wire",
        kernel_module: "lockfree_ring_buffer",
        letter: "fe",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_mach1_sonic_boom_signature_wire",
        kernel_module: "mach1_sonic_boom_signature",
        letter: "kk",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_materialx_bridge_wire",
        kernel_module: "materialx_bridge",
        letter: "",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_matter_memory_scarring_wire",
        kernel_module: "matter_memory_scarring",
        letter: "lj",
        status: WireStatus::Active,
        reachable_from: "tauri::generate_handler! (main.rs) â€” probe_matter_memory_scarring_cmd + run_kernel_matter_memory_scarring_soak_cmd",
    },
    KernelWireEntry {
        wire_module: "kernel_matter_thermodynamics_sph_wire",
        kernel_module: "matter_thermodynamics_sph",
        letter: "hk",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_metabolic_memory_wire",
        kernel_module: "metabolic_memory",
        letter: "fq",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_metasounds_dsp_compiler_wire",
        kernel_module: "metasounds_dsp_compiler",
        letter: "jx",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_micro_displacement_noise_wire",
        kernel_module: "micro_displacement_noise",
        letter: "ev",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_micro_dream_gpu_pass_wire",
        kernel_module: "micro_dream_gpu_pass",
        letter: "ld",
        status: WireStatus::Active,
        reachable_from: "tauri::generate_handler! (main.rs) â€” probe_micro_dream_gpu_pass_cmd + run_kernel_micro_dream_gpu_pass_soak_cmd",
    },
    KernelWireEntry {
        wire_module: "kernel_micro_poly_cull_wire",
        kernel_module: "gpu_culling_compute",
        letter: "gz",
        status: WireStatus::Active,
        reachable_from: "tauri::generate_handler! (main.rs) â€” probe_micro_poly_cull_cmd",
    },
    KernelWireEntry {
        wire_module: "kernel_micro_shadow_bent_normals_wire",
        kernel_module: "micro_shadow_bent_normals",
        letter: "kr",
        status: WireStatus::Active,
        reachable_from: "tauri::generate_handler! (main.rs) â€” probe_micro_shadow_bent_normals_cmd + run_kernel_micro_shadow_bent_normals_soak_cmd",
    },
    KernelWireEntry {
        wire_module: "kernel_microfracture_acoustic_wire",
        kernel_module: "microfracture_acoustic",
        letter: "kj",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_mmap_ecs_pager_wire",
        kernel_module: "mmap_ecs_pager",
        letter: "di",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_mnemonic_matter_entropy_wire",
        kernel_module: "mnemonic_matter_entropy",
        letter: "dw",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_msl_wgsl_compiler_wire",
        kernel_module: "msl_wgsl_compiler",
        letter: "gp",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_multiverse_rollback_branching_wire",
        kernel_module: "multiverse_rollback_branching",
        letter: "lf",
        status: WireStatus::Active,
        reachable_from: "tauri::generate_handler! (main.rs) â€” probe_multiverse_rollback_branching_cmd + run_kernel_multiverse_rollback_branching_soak_cmd",
    },
    KernelWireEntry {
        wire_module: "kernel_nanite_micropolygon_compute_rasterizer_wire",
        kernel_module: "nanite_micropolygon_compute_rasterizer",
        letter: "ip5",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_narrative_tension_clock_wire",
        kernel_module: "narrative_tension_clock",
        letter: "li",
        status: WireStatus::Active,
        reachable_from: "tauri::generate_handler! (main.rs) â€” probe_narrative_tension_clock_cmd + run_kernel_narrative_tension_clock_soak_cmd",
    },
    KernelWireEntry {
        wire_module: "kernel_neural_physics_co_sim_wire",
        kernel_module: "neural_physics_co_sim",
        letter: "jz",
        status: WireStatus::Active,
        reachable_from: "tauri::generate_handler! (main.rs) â€” probe_neural_physics_co_sim_cmd + run_kernel_neural_physics_co_sim_soak_cmd",
    },
    KernelWireEntry {
        wire_module: "kernel_openvdb_bridge_wire",
        kernel_module: "openvdb_bridge",
        letter: "",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_physics_world_solvers_wire",
        kernel_module: "physics_world_solvers",
        letter: "s17",
        status: WireStatus::Active,
        reachable_from: "tauri::generate_handler! (main.rs) â€” probe_physics_world_solvers_cmd + run_kernel_physics_world_solvers_soak_cmd",
    },
    KernelWireEntry {
        wire_module: "kernel_position_based_dynamics_wire",
        kernel_module: "position_based_dynamics",
        letter: "hj",
        status: WireStatus::Active,
        reachable_from: "tauri::generate_handler! (apps/studio-local/src-tauri/src/main.rs) â€” probe_position_based_dynamics_cmd / run_position_based_dynamics_soak_cmd",
    },
    KernelWireEntry {
        wire_module: "kernel_preintegrated_sss_transmittance_wire",
        kernel_module: "preintegrated_sss_transmittance",
        letter: "ge",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_procedural_muscle_locomotion_wire",
        kernel_module: "procedural_muscle_locomotion",
        letter: "jw",
        status: WireStatus::Active,
        reachable_from: "tauri::generate_handler! (main.rs) â€” probe_procedural_muscle_locomotion_cmd + run_kernel_procedural_muscle_locomotion_soak_cmd",
    },
    KernelWireEntry {
        wire_module: "kernel_quantum_overlap_wire",
        kernel_module: "quantum_overlap",
        letter: "fw",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_radiance_cascades_gi_wire",
        kernel_module: "radiance_cascades_gi",
        letter: "gm",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_recursive_fractal_enhancement_wire",
        kernel_module: "recursive_fractal_enhancement",
        letter: "fy",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_reversible_quantum_undo_wire",
        kernel_module: "reversible_quantum_undo",
        letter: "fs",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_risk_envelope_wire",
        kernel_module: "risk_envelope",
        letter: "n5",
        status: WireStatus::Active,
        reachable_from: "tauri::generate_handler! (main.rs) â€” probe_risk_envelope_cmd",
    },
    KernelWireEntry {
        wire_module: "kernel_rollback_netcode_engine_wire",
        kernel_module: "rollback_netcode_engine",
        letter: "ip6",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_scalable_fidelity_wire",
        kernel_module: "scalable_fidelity",
        letter: "sf",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_sdf_adaptive_cascades_wire",
        kernel_module: "sdf_adaptive_cascades",
        letter: "en",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_sdf_audio_raymarching_wire",
        kernel_module: "sdf_audio_raymarching",
        letter: "ex",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_sdf_contact_blending_wire",
        kernel_module: "sdf_contact_blending",
        letter: "kq",
        status: WireStatus::Active,
        reachable_from: "tauri::generate_handler! (main.rs) â€” probe_sdf_contact_blending_cmd + run_kernel_sdf_contact_blending_soak_cmd",
    },
    KernelWireEntry {
        wire_module: "kernel_sdf_motion_vector_buffer_wire",
        kernel_module: "sdf_motion_vector_buffer",
        letter: "eq",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_sdf_octree_hashing_wire",
        kernel_module: "sdf_octree_hashing",
        letter: "ep",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_sdf_sculptor_wire",
        kernel_module: "sdf_sculptor",
        letter: "em",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_semantic_light_leak_wire",
        kernel_module: "semantic_light_leak",
        letter: "hb",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_sequencing_timeline_wire",
        kernel_module: "sequencing_timeline",
        letter: "ju",
        status: WireStatus::Active,
        reachable_from: "tauri::generate_handler! (main.rs) â€” probe_sequencing_timeline_cmd + run_kernel_sequencing_timeline_soak_cmd",
    },
    KernelWireEntry {
        wire_module: "kernel_shadow_time_reversal_wire",
        kernel_module: "shadow_kernel_time_reversal",
        letter: "du",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_simd_clay_math_wire",
        kernel_module: "simd_clay_math",
        letter: "dj",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_skeletal_rig_ragdoll_xpbd_wire",
        kernel_module: "skeletal_rig_ragdoll_xpbd",
        letter: "ip11",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_skin_wrinkle_map_wire",
        kernel_module: "skin_wrinkle_map",
        letter: "kd",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_slab_allocator_mmap_wire",
        kernel_module: "slab_allocator_mmap",
        letter: "dm",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_sound_physics_duplex_wire",
        kernel_module: "sound_physics_duplex",
        letter: "kb",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_sparse_seed_instancing_wire",
        kernel_module: "sparse_seed_instancing",
        letter: "fd",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_spatial_partition_hibernation_wire",
        kernel_module: "spatial_partition_hibernation",
        letter: "hg",
        status: WireStatus::Active,
        reachable_from: "tauri::generate_handler! (main.rs) â€” probe_spatial_partition_hibernation_cmd + run_kernel_spatial_partition_hibernation_soak_cmd",
    },
    KernelWireEntry {
        wire_module: "kernel_spatio_temporal_denoiser_wire",
        kernel_module: "spatio_temporal_denoiser",
        letter: "kg",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_spectral_dispersion_caustics_wire",
        kernel_module: "spectral_dispersion_caustics",
        letter: "gj",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_spectral_light_pipeline_wire",
        kernel_module: "spectral_light_pipeline",
        letter: "go",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_state_sync_protocol_wire",
        kernel_module: "state_sync_protocol",
        letter: "fi",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_stochastic_virtual_sdf_wire",
        kernel_module: "stochastic_virtual_sdf",
        letter: "eo",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_strain_aware_texturing_wire",
        kernel_module: "strain_aware_texturing",
        letter: "gs",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_subsurface_acoustic_scattering_wire",
        kernel_module: "subsurface_acoustic_scattering",
        letter: "kl",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_svo_depth_lod_wire",
        kernel_module: "svo_depth_lod",
        letter: "et",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_svo_terrain_world_partition_wire",
        kernel_module: "svo_terrain_world_partition",
        letter: "ip4",
        status: WireStatus::Wire,
        reachable_from: "main.rs:82 glob import â€” no command registered (S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_symmetric_vector_algebra_wire",
        kernel_module: "symmetric_vector_algebra",
        letter: "fz",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_synesthetic_resonance_matrix_wire",
        kernel_module: "synesthetic_resonance_matrix",
        letter: "lg",
        status: WireStatus::Active,
        reachable_from: "tauri::generate_handler! (main.rs) â€” probe_synesthetic_resonance_matrix_cmd + run_kernel_synesthetic_resonance_matrix_soak_cmd",
    },
    KernelWireEntry {
        wire_module: "kernel_synesthetic_sensory_remap_wire",
        kernel_module: "synesthetic_sensory_remap",
        letter: "dx",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_task_graph_scheduler_wire",
        kernel_module: "task_graph_scheduler",
        letter: "jt",
        status: WireStatus::Active,
        reachable_from: "tauri::generate_handler! (main.rs) â€” probe_task_graph_scheduler_cmd + run_kernel_task_graph_scheduler_soak_cmd",
    },
    KernelWireEntry {
        wire_module: "kernel_thermal_scheduler_wire",
        kernel_module: "thermal_scheduler",
        letter: "fn",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_thermal_spectral_gi_wire",
        kernel_module: "thermal_spectral_gi",
        letter: "ha",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_unified_field_network_wire",
        kernel_module: "unified_field_network",
        letter: "dq",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_universal_logarithmic_scale_wire",
        kernel_module: "universal_logarithmic_scale",
        letter: "fc",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_usd_importer_bridge_wire",
        kernel_module: "usd_importer_bridge",
        letter: "gq",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_usd_universal_exporter_wire",
        kernel_module: "usd_universal_exporter",
        letter: "",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_vehicle_chassis_dynamics_wire",
        kernel_module: "vehicle_chassis_dynamics",
        letter: "kz",
        status: WireStatus::Active,
        reachable_from: "tauri::generate_handler! (main.rs) â€” probe_vehicle_chassis_dynamics_cmd + run_kernel_vehicle_chassis_dynamics_soak_cmd",
    },
    KernelWireEntry {
        wire_module: "kernel_velocity_buffer_ecs_wire",
        kernel_module: "velocity_buffer_ecs",
        letter: "er",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_virtual_shadow_maps_vsm_wire",
        kernel_module: "virtual_shadow_maps_vsm",
        letter: "ip7",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_volumetric_extinction_medium_wire",
        kernel_module: "volumetric_extinction_medium",
        letter: "ew",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_voronoi_destruction_3d_wire",
        kernel_module: "voronoi_destruction_3d",
        letter: "ip2",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_voxel_cone_radiosity_wire",
        kernel_module: "voxel_cone_radiosity",
        letter: "ga",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_wgpu_wgsl_device_load_wire",
        kernel_module: "msl_wgsl_compiler",
        letter: "gu",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_wgsl_surface_noise_kernel_wire",
        kernel_module: "wgsl_surface_noise_kernel",
        letter: "gh",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
    KernelWireEntry {
        wire_module: "kernel_wind_field_dynamics_wire",
        kernel_module: "wind_field_dynamics",
        letter: "kv",
        status: WireStatus::Active,
        reachable_from: "tauri::generate_handler! (main.rs) â€” probe_wind_field_dynamics_cmd + run_kernel_wind_field_dynamics_soak_cmd",
    },
    KernelWireEntry {
        wire_module: "kernel_wire_reachability_wire",
        kernel_module: "wire_reachability",
        letter: "s15",
        status: WireStatus::Active,
        reachable_from: "tauri::generate_handler! (main.rs) â€” probe_wire_reachability_cmd + run_kernel_wire_reachability_soak_cmd",
    },
    KernelWireEntry {
        wire_module: "kernel_world_forge_densification_wire",
        kernel_module: "world_forge_densification",
        letter: "ku",
        status: WireStatus::Active,
        reachable_from: "tauri::generate_handler! (main.rs) â€” probe_world_forge_densification_cmd + run_kernel_world_forge_densification_soak_cmd",
    },
    KernelWireEntry {
        wire_module: "kernel_world_soa_sab_wire",
        kernel_module: "wasm_shared_memory_buffer",
        letter: "dh",
        status: WireStatus::Wire,
        reachable_from: "unreachable (compiled-only â€” P2g disconnection, S-11 debt)",
    },
];

/// Total de entradas do registro (deve casar com `WIRES_ON_DISK`).
pub const fn registry_total() -> usize {
    KERNEL_WIRE_REGISTRY.len()
}

/// Quantidade de wires alcanÃ§Ã¡veis por comando (status `Active`).
pub fn reachable_wires() -> usize {
    KERNEL_WIRE_REGISTRY
        .iter()
        .filter(|e| e.status.is_reachable())
        .count()
}

/// Quantidade de wires compiladas porÃ©m inalcanÃ§Ã¡veis (dÃ­vida P2g).
pub fn orphan_wires() -> usize {
    KERNEL_WIRE_REGISTRY
        .iter()
        .filter(|e| !e.status.is_reachable())
        .count()
}

/// Busca declarativa por nome de wire (ex.: `"kernel_micro_poly_cull_wire"`).
pub fn entry_by_wire_module(wire_module: &str) -> Option<&'static KernelWireEntry> {
    KERNEL_WIRE_REGISTRY
        .iter()
        .find(|e| e.wire_module == wire_module)
}

/// Busca declarativa por letra (ex.: `"hj"`).
pub fn entry_by_letter(letter: &str) -> Option<&'static KernelWireEntry> {
    KERNEL_WIRE_REGISTRY.iter().find(|e| e.letter == letter)
}

/// Wires com letra ausente (dÃ­vida de completude S-11 â€” medida).
pub fn wires_missing_letter() -> Vec<&'static KernelWireEntry> {
    KERNEL_WIRE_REGISTRY
        .iter()
        .filter(|e| e.letter.is_empty())
        .collect()
}

/// Nomes dos 35 wires ACTIVE (R30) (ponto de referÃªncia da telemetria R3..R24).
pub const ACTIVE_WIRE_MODULES: &[&str] = &[
    "kernel_aethel_matter_model_wire",
    "kernel_async_compute_scheduler_wire",
    "kernel_auto_photography_director_wire",
    "kernel_celestial_orbital_dynamics_wire",
    "kernel_cinema_frame_graph_composition_wire",
    "kernel_cinema_hot_loop_composition_wire",
    "kernel_dynamic_shader_rewriter_wire",
    "kernel_dynamic_surface_deformation_wire",
    "kernel_euphoria_balance_controller_wire",
    "kernel_flight_aerodynamics_wire",
    "kernel_foundation_honesty_wire",
    "kernel_gaze_intent_anticipation_wire",
    "kernel_holographic_scene_tensor_wire",
    "kernel_latent_dreamspace_bytecode_wire",
    "kernel_living_sky_fluid_ocean_buoyancy_wire",
    "kernel_matter_memory_scarring_wire",
    "kernel_micro_dream_gpu_pass_wire",
    "kernel_micro_poly_cull_wire",
    "kernel_micro_shadow_bent_normals_wire",
    "kernel_multiverse_rollback_branching_wire",
    "kernel_narrative_tension_clock_wire",
    "kernel_neural_physics_co_sim_wire",
    "kernel_physics_world_solvers_wire",
    "kernel_position_based_dynamics_wire",
    "kernel_procedural_muscle_locomotion_wire",
    "kernel_risk_envelope_wire",
    "kernel_sdf_contact_blending_wire",
    "kernel_sequencing_timeline_wire",
    "kernel_spatial_partition_hibernation_wire",
    "kernel_synesthetic_resonance_matrix_wire",
    "kernel_task_graph_scheduler_wire",
    "kernel_vehicle_chassis_dynamics_wire",
    "kernel_wind_field_dynamics_wire",
    "kernel_wire_reachability_wire",
    "kernel_world_forge_densification_wire",
];

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn registry_has_exactly_the_measured_disk_count() {
        // R30 audit 2026-08-20: 150 wires on disk, 150 pub mod in studio lib.rs
        // (+ kernel_asset_color_appearance_wire, ac,
        //  kernel_asset_quality_gate_wire, bw,
        //  kernel_asset_spectral_radiance_wire, lk, and
        //  kernel_scalable_fidelity_wire, sf, compiled-only).
        assert_eq!(registry_total(), 150, "must match WIRES_ON_DISK");
        assert_eq!(registry_total(), WIRES_ON_DISK);
    }

    #[test]
    fn reachable_count_matches_generate_handler_surface() {
        // main.rs registers exactly 9 kernel-wire modules by command (R10 +1);
        // R11 +1 â†’ 10 (kernel_neural_physics_co_sim_wire); R12 +1 â†’ 11
        // (kernel_task_graph_scheduler_wire, R1.3); R13 +1 â†’ 12
        // (kernel_spatial_partition_hibernation_wire, R1.4); R14 +1 â†’ 13
        // (kernel_sequencing_timeline_wire, R1.5); R15 +1 â†’ 14
        // (kernel_sdf_contact_blending_wire, R2-A); R16 +1 â†’ 15
        // (kernel_micro_shadow_bent_normals_wire, R2-B); R17 +1 â†’ 16
        // (kernel_dynamic_surface_deformation_wire, R2-C); R18 +1 â†’ 17
        // (kernel_async_compute_scheduler_wire, R2-D); R19 +1 â†’ 18
        // (kernel_dynamic_shader_rewriter_wire, R2-E); R20 +1 â†’ 19
        // (kernel_euphoria_balance_controller_wire, R2-F); R21 +1 â†’ 20
        // (kernel_world_forge_densification_wire, R2-G); R22 +1 â†’ 21
        // (kernel_wind_field_dynamics_wire, R2-H); R23 +1 â†’ 22
        // (kernel_auto_photography_director_wire, R2-I); R24 +1 â†’ 23
        // (kernel_cinema_frame_graph_composition_wire, R2-J); R25 +1 â†’ 24
        // (kernel_cinema_hot_loop_composition_wire, R2-K); R3-A +1 â†’ 25
        // (kernel_vehicle_chassis_dynamics_wire, R3-A â€” chassis/roda/diferencial);
        // R3-B +1 â†’ 26 (kernel_flight_aerodynamics_wire, R3-B â€” voo/aerodinÃ¢mica);
        // R3-C +1 â†’ 27 (kernel_celestial_orbital_dynamics_wire, R3-C â€” orbital);
        // R4-A..H +8 â†’ 35 (R4 Latent Dreamspace lcâ†’lj: lc=latent_dreamspace_bytecode,
        // ld=micro_dream_gpu_pass, le=holographic_scene_tensor, lf=multiverse_rollback_branching,
        // lg=synesthetic_resonance_matrix, lh=gaze_intent_anticipation,
        // li=narrative_tension_clock, lj=matter_memory_scarring).
        assert_eq!(reachable_wires(), 35);
        assert_eq!(reachable_wires(), REACHABLE_WIRE_COUNT);
    }

    #[test]
    fn orphan_count_is_measured_115() {
        // R30: +4 compiled-only orphans (kernel_asset_color_appearance_wire, ac;
        // kernel_asset_quality_gate_wire, bw;
        // kernel_asset_spectral_radiance_wire, lk;
        // kernel_scalable_fidelity_wire, sf).
        assert_eq!(orphan_wires(), 115);
    }

    #[test]
    fn active_wire_modules_are_exactly_the_reachable_set() {
        let active: Vec<&str> = KERNEL_WIRE_REGISTRY
            .iter()
            .filter(|e| e.status == WireStatus::Active)
            .map(|e| e.wire_module)
            .collect();
        assert_eq!(active.len(), ACTIVE_WIRE_MODULES.len());
        for expected in ACTIVE_WIRE_MODULES {
            assert!(
                active.contains(expected),
                "ACTIVE wire {expected} missing from measured reachable set"
            );
        }
    }

    #[test]
    fn svo_glob_import_alone_does_not_make_a_wire_reachable() {
        // Precision guard: svo is glob-imported in main.rs:82 but has no command.
        let svo = entry_by_wire_module("kernel_svo_terrain_world_partition_wire")
            .expect("svo wire must be registered");
        assert!(!svo.status.is_reachable());
        assert_eq!(svo.letter, "ip4");
    }

    #[test]
    fn no_duplicate_wire_modules_and_no_duplicate_letters() {
        for (i, e) in KERNEL_WIRE_REGISTRY.iter().enumerate() {
            for (j, f) in KERNEL_WIRE_REGISTRY.iter().enumerate() {
                if i != j {
                    assert_ne!(
                        e.wire_module, f.wire_module,
                        "duplicate wire_module {}",
                        e.wire_module
                    );
                }
            }
        }
        let mut letters: Vec<&str> = KERNEL_WIRE_REGISTRY
            .iter()
            .filter(|e| !e.letter.is_empty())
            .map(|e| e.letter)
            .collect();
        letters.sort_unstable();
        for w in letters.windows(2) {
            assert_ne!(w[0], w[1], "duplicate letter {}", w[0]);
        }
    }

    #[test]
    fn every_entry_has_non_empty_wire_and_kernel_module() {
        for e in KERNEL_WIRE_REGISTRY {
            assert!(!e.wire_module.is_empty(), "empty wire_module");
            assert!(!e.kernel_module.is_empty(), "empty kernel_module for {}", e.wire_module);
            assert!(
                e.wire_module.starts_with("kernel_") && e.wire_module.ends_with("_wire"),
                "wire_module naming contract violated: {}",
                e.wire_module
            );
        }
    }

    #[test]
    fn every_active_wire_has_a_letter_and_a_real_registration_point() {
        for e in KERNEL_WIRE_REGISTRY {
            if e.status == WireStatus::Active {
                assert!(!e.letter.is_empty(), "ACTIVE {} missing letter (S-11 debt)", e.wire_module);
                assert!(
                    e.reachable_from.starts_with("tauri::generate_handler!"),
                    "ACTIVE {} must cite its generate_handler registration, got: {}",
                    e.wire_module,
                    e.reachable_from
                );
            }
        }
    }

    #[test]
    fn letter_hygiene_debt_is_measured_exactly_3() {
        // Known S-11 completeness debt (measured): 3 wires lack a documented
        // letter. micro_poly_cull gained its letter `gz` in R0 (Micro-Poly
        // Foundation, P1/Onda G) and anisotropic_neural_microfacets gained
        // `brdf` (anisotropic GGX BRDF) â€” the debt is now 3, all WIRE (never
        // ACTIVE).
        let missing = wires_missing_letter();
        assert_eq!(missing.len(), 3, "letter-debt count drifted from measured 3");
        for e in &missing {
            assert!(
                !matches!(e.status, WireStatus::Active),
                "{} is ACTIVE and MUST get a letter before R1 lands",
                e.wire_module
            );
        }
    }

    #[test]
    fn active_letter_resolutions_are_correct() {
        // Guards for the letter system (measured from disk headers).
        assert_eq!(
            entry_by_wire_module("kernel_position_based_dynamics_wire")
                .unwrap()
                .letter,
            "hj"
        );
        assert_eq!(
            entry_by_wire_module("kernel_risk_envelope_wire").unwrap().letter,
            "n5"
        );
        assert_eq!(
            entry_by_wire_module("kernel_foundation_honesty_wire").unwrap().letter,
            "dc"
        );
        assert_eq!(
            entry_by_wire_module("kernel_skeletal_rig_ragdoll_xpbd_wire")
                .unwrap()
                .letter,
            "ip11"
        );
        assert_eq!(
            entry_by_wire_module("kernel_matter_thermodynamics_sph_wire")
                .unwrap()
                .letter,
            "hk"
        );
        assert_eq!(
            entry_by_wire_module("kernel_voronoi_destruction_3d_wire")
                .unwrap()
                .letter,
            "ip2"
        );
        // R0: anisotropic_neural_microfacets (Wire) locked to `brdf` â€” the
        // anisotropic GGX BRDF domain (letter hygiene debt 4â†’3).
        assert_eq!(
            entry_by_wire_module("kernel_anisotropic_neural_microfacets_wire")
                .unwrap()
                .letter,
            "brdf"
        );
        // R0: micro_poly_cull (Active) locked to `gz` â€” the last free letter in
        // the GPU rendering range (ga..gy taken, gu = wgpu_wgsl_device_load).
        assert_eq!(
            entry_by_wire_module("kernel_micro_poly_cull_wire")
                .unwrap()
                .letter,
            "gz"
        );
        // R8: aethel_matter_model (Active) locked to `jv` â€” the unified matter
        // domain letter (S-23 Kernel Physics Supremacy).
        assert_eq!(
            entry_by_wire_module("kernel_aethel_matter_model_wire")
                .unwrap()
                .letter,
            "jv"
        );
        // R9: living_sky_fluid_ocean_buoyancy (Active) locked to `jy` â€” the
        // sky/ocean coupling domain letter (S-25 Kernel Physics Supremacy).
        assert_eq!(
            entry_by_wire_module("kernel_living_sky_fluid_ocean_buoyancy_wire")
                .unwrap()
                .letter,
            "jy"
        );
        // R10: procedural_muscle_locomotion (Active) locked to `jw` â€” the
        // procedural muscle/tendon locomotion domain letter (S-24).
        assert_eq!(
            entry_by_wire_module("kernel_procedural_muscle_locomotion_wire")
                .unwrap()
                .letter,
            "jw"
        );
        // R11: neural_physics_co_sim (Active) locked to `jz` â€” the
        // neural-contact + SDF collision co-sim domain letter (S-26).
        assert_eq!(
            entry_by_wire_module("kernel_neural_physics_co_sim_wire")
                .unwrap()
                .letter,
            "jz"
        );
        // R12: task_graph_scheduler (Active) locked to `jt` â€” the deterministic
        // DAG dependency scheduler domain letter (R1.3 / S-3 Sequencing backend).
        assert_eq!(
            entry_by_wire_module("kernel_task_graph_scheduler_wire")
                .unwrap()
                .letter,
            "jt"
        );
        // R13: spatial_partition_hibernation (Active) locked to `hg` â€” the
        // uniform-grid + cell-hibernation broadphase domain letter (R1.4 /
        // S-11/S-15 backend substrate).
        assert_eq!(
            entry_by_wire_module("kernel_spatial_partition_hibernation_wire")
                .unwrap()
                .letter,
            "hg"
        );
        // R14: sequencing_timeline (Active) locked to `ju` â€” the non-linear
        // timeline/keyframe deterministic evaluator domain letter (R1.5 / S-3
        // Sequencing tool backend).
        assert_eq!(
            entry_by_wire_module("kernel_sequencing_timeline_wire")
                .unwrap()
                .letter,
            "ju"
        );
        // R15: sdf_contact_blending (Active) locked to `kq` â€” the SDF contact
        // blending + soft contact shadow domain letter (R2-A / Vanguarda P1).
        assert_eq!(
            entry_by_wire_module("kernel_sdf_contact_blending_wire")
                .unwrap()
                .letter,
            "kq"
        );
        // R2-E: dynamic_shader_rewriter (Active) locked to `km` â€” the PSO vault
        // deterministic pipeline-cook domain letter (R2-E / Vanguarda P3).
        assert_eq!(
            entry_by_wire_module("kernel_dynamic_shader_rewriter_wire")
                .unwrap()
                .letter,
            "km"
        );
        // R2-F: euphoria_balance_controller (Active) locked to `ko` â€” the
        // capture-point balance-controller domain letter (R2-F / Vanguarda P2).
        assert_eq!(
            entry_by_wire_module("kernel_euphoria_balance_controller_wire")
                .unwrap()
                .letter,
            "ko"
        );
        // R2-G: world_forge_densification (Active) locked to `ku` â€” the World
        // Forge densification domain letter (R2-G / Vanguarda P3-P1).
        assert_eq!(
            entry_by_wire_module("kernel_world_forge_densification_wire")
                .unwrap()
                .letter,
            "ku"
        );
        // R2-H: wind_field_dynamics (Active) locked to `kv` â€” the wind field
        // dynamics domain letter (R2-H / Vanguarda P2).
        assert_eq!(
            entry_by_wire_module("kernel_wind_field_dynamics_wire")
                .unwrap()
                .letter,
            "kv"
        );
        // R2-I: auto_photography_director (Active) locked to `kw` â€” the
        // auto-photography director domain letter (R2-I / Vanguarda P4).
        assert_eq!(
            entry_by_wire_module("kernel_auto_photography_director_wire")
                .unwrap()
                .letter,
            "kw"
        );
        // R2-K: cinema_hot_loop_composition (Active) locked to `ky` â€” the
        // native hot-loop composition domain letter (R2-K / Vanguarda P1-P3).
        assert_eq!(
            entry_by_wire_module("kernel_cinema_hot_loop_composition_wire")
                .unwrap()
                .letter,
            "ky"
        );
        // R3-A: vehicle_chassis_dynamics (Active) locked to `kz` â€” the
        // chassis/suspension/wheel/differential vehicle domain letter (R3-A /
        // S-17 Kernel Physics Supremacy â€” R3 audit: vehicles were ZERO).
        assert_eq!(
            entry_by_wire_module("kernel_vehicle_chassis_dynamics_wire")
                .unwrap()
                .letter,
            "kz"
        );
        // R3-B: flight_aerodynamics (Active) locked to `la` â€” the lift/drag/
        // wing/ISA-atmosphere flight domain letter (R3-B / S-17 â€” R3 audit:
        // flight was ZERO).
        assert_eq!(
            entry_by_wire_module("kernel_flight_aerodynamics_wire")
                .unwrap()
                .letter,
            "la"
        );
        // R3-C: celestial_orbital_dynamics (Active) locked to `lb` â€” the
        // Kepler two-body / patched-conic / microgravity orbital domain letter
        // (R3-C / S-17 â€” R3 audit: space/microgravity was ZERO).
        assert_eq!(
            entry_by_wire_module("kernel_celestial_orbital_dynamics_wire")
                .unwrap()
                .letter,
            "lb"
        );
    }

    #[test]
    fn kernel_module_naming_is_conventional_except_gpu_culling() {
        // `kernel_X_wire` â†” kernel `X`, with one documented exception:
        // micro_poly_cull wire bridges kernel `gpu_culling_compute`.
        assert_eq!(
            entry_by_wire_module("kernel_micro_poly_cull_wire")
                .unwrap()
                .kernel_module,
            "gpu_culling_compute"
        );
        assert_eq!(
            entry_by_wire_module("kernel_composite_fracture_wire")
                .unwrap()
                .kernel_module,
            "composite_fracture_kernel"
        );
        // Spot-check a conventional mapping.
        assert_eq!(
            entry_by_wire_module("kernel_aerodynamic_navier_stokes_wire")
                .unwrap()
                .kernel_module,
            "aerodynamic_navier_stokes"
        );
    }

    #[test]
    fn lookup_helpers_are_total() {
        assert!(entry_by_wire_module("kernel_does_not_exist_wire").is_none());
        assert!(entry_by_letter("zz-not-a-real-letter").is_none());
        assert!(entry_by_letter("hj").is_some());
        assert_eq!(
            entry_by_letter("hj").unwrap().wire_module,
            "kernel_position_based_dynamics_wire"
        );
        // Active wires are a subset of the reachable-command set (all 4).
        for active in ACTIVE_WIRE_MODULES {
            assert!(entry_by_wire_module(active).is_some());
        }
    }

    #[test]
    fn registry_is_sorted_for_deterministic_diffs() {
        let names: Vec<&str> = KERNEL_WIRE_REGISTRY
            .iter()
            .map(|e| e.wire_module)
            .collect();
        let mut sorted = names.clone();
        sorted.sort_unstable();
        assert_eq!(names, sorted, "registry must stay alphabetically sorted");
    }

    #[test]
    fn reachable_from_never_claims_false_reachability() {
        // Honesty: only ACTIVE wires cite generate_handler; WIRE cites the debt.
        for e in KERNEL_WIRE_REGISTRY {
            if e.status == WireStatus::Active {
                assert!(e.reachable_from.starts_with("tauri::generate_handler!"));
            } else if e.status == WireStatus::Wire {
                assert!(
                    e.reachable_from.starts_with("unreachable")
                        || e.reachable_from.contains("no command registered"),
                    "WIRE {} must not claim reachability: {}",
                    e.wire_module,
                    e.reachable_from
                );
            }
        }
    }
}
