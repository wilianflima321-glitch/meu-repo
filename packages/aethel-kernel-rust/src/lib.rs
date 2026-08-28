// Law XI clippy gate (crate-wide, documented style trade-offs — not correctness suppressions):
// - `too_many_arguments`: soak/evidence-fingerprint functions intentionally take one bool/f32
//   per physical invariant checked; collapsing them into config structs would only add
//   indirection across ~80 call sites for zero behavioral or readability gain.
// - `unusual_byte_groupings`: many literals are FNV/FourCC/hash magic constants where digit
//   grouping conveys no semantic meaning (grouping by nibble vs. byte is arbitrary either way).
// - `field_reassign_with_default`: the repeated `let mut x = T::default(); x.field = v;` pattern
//   here always assigns disjoint, independently-computed fields (often derived via `.clamp()`/
//   `.max()` on function params) — safe and clearer than folding every call arg into one literal.
// - `needless_range_loop`: numeric SoA kernels frequently index 2+ parallel arrays by the same
//   loop variable; rewriting every site to `zip()`/`enumerate()` chains risks subtle indexing
//   regressions in soak-tested physics code for a purely cosmetic win.
// - `doc_lazy_continuation`: rustdoc misreads leading `+`/`-` prose characters (e.g. "O(n) + "),
//   not actual markdown lists, across dozens of module doc-comments.
#![allow(
    clippy::too_many_arguments,
    clippy::unusual_byte_groupings,
    clippy::field_reassign_with_default,
    clippy::needless_range_loop,
    clippy::doc_lazy_continuation
)]

pub mod validator;
pub mod metabolic_jit;
pub mod quantum_provenance;
pub mod ecs_core;
pub mod sdf_sculptor;
pub mod live_cache_manager;
pub mod poetic_error_handler;
pub mod luxel_radiance;
pub mod acoustic_synthesis;
pub mod temporal_entropy;
pub mod shadow_maestro;
pub mod negative_latent_space;
pub mod state_sync_protocol;
pub mod task_graph_scheduler;
pub mod tauri_bridge;
pub mod lockfree_ring_buffer;
pub mod metabolic_memory;
pub mod matter_logos;
pub mod quantum_overlap;
pub mod wgpu_framegraph;
pub mod gpu_radix_sort;
pub mod metasounds_dsp_compiler;
pub mod acoustic_raytracing_solver;
pub mod dynamic_physics_dsl;
pub mod law_mutation_engine;
pub mod hydra_mesh_node;
pub mod distributed_ecs_shard;
pub mod atomic_intelligence;
pub mod geometric_watermark;
pub mod thermal_scheduler;
pub mod bitstream_reality_sync;
pub mod parasitic_refactor_daemon;
pub mod hybrid_geometry_svo;
pub mod simd_pool_allocator;
pub mod procedural_blueprint_interpreter;
pub mod atomic_thread_sync;
pub mod usd_importer_bridge;
pub mod msl_wgsl_compiler;
pub mod fluid_ninja_compute;
pub mod acoustic_reverb_geometry;
pub mod crdt_quantum_sync;
pub mod mmap_ecs_pager;
pub mod local_burn_inference;
pub mod unified_field_theory;
pub mod synthetic_audio_synapse;
pub mod npu_wgpu_offloader;
pub mod dss_quic_network;
pub mod ghost_state_predictor;
pub mod fm_additive_synthesis;
pub mod sdf_audio_raymarching;
pub mod neural_harmonic_tuning;
pub mod audible_network_telemetry;
pub mod slab_allocator_mmap;
pub mod neural_radiance_diffusion;
pub mod quantum_ghost_auditor;
pub mod digital_pressure_chamber;
pub mod distributed_edge_hosting;
pub mod continuous_lifecycle_autonomy;
pub mod universal_asset_retopologizer;
pub mod human_intent_watermark;
pub mod silent_hub_compiler;
pub mod linear_frame_allocator;
pub mod spherical_harmonic_neural_fields;
pub mod radiance_flow_field;
pub mod formal_logic_verifier;
pub mod cpu_affinity_micro_workers;
pub mod neural_content_addressable_storage;
pub mod micro_displacement_noise;
pub mod radiance_cascades_gi;
pub mod neural_triplanar_synthesis;
pub mod asset_color_appearance;
pub mod asset_quality_gate;
pub mod asset_spectral_radiance;
pub mod scalable_fidelity;
pub mod spectral_light_pipeline;
pub mod gaze_foveated_reprojection;
pub mod infinite_anti_aliasing;
pub mod wgsl_surface_noise_kernel;
pub mod neural_gi_irradiance;
pub mod aces_cinematic_tonemapper;
pub mod atmospheric_spine_particles;
pub mod sdf_depth_illumination_sss;
pub mod strain_aware_texturing;
pub mod semantic_light_leak;
pub mod svo_depth_lod;
pub mod particulate_neural_field;
pub mod optical_adversarial_discriminator;
pub mod hdr_32bit_float_pipeline;
pub mod genomic_seed_library;
pub mod position_based_dynamics;
pub mod voronoi_destruction_3d;
pub mod usd_universal_exporter;
pub mod geometric_scale_constraints;
pub mod quantum_branching_vcs;
pub mod hierarchical_streaming_cache;
pub mod sdf_octree_hashing;
pub mod wasm_shared_memory_buffer;
pub mod wasm_logic_node_compiler;
pub mod svo_terrain_world_partition;
pub mod nanite_micropolygon_compute_rasterizer;
pub mod gpu_culling_compute;
pub mod rollback_netcode_engine;
pub mod virtual_shadow_maps_vsm;
pub mod volumetric_softbody_muscle_pbd;
pub mod systemic_imperfection_chaos;
pub mod dynamic_shader_rewriter;
pub mod delta_seed_synchronization;
pub mod blue_noise_dithering_relaxer;
pub mod anisotropic_neural_microfacets;
pub mod voxel_cone_radiosity;
pub mod sparse_seed_instancing;
pub mod recursive_fractal_enhancement;
pub mod sdf_motion_vector_buffer;
pub mod microfacet_brdf_neural;
pub mod sdf_adaptive_cascades;
pub mod neural_radiance_fields_lnf;
pub mod velocity_buffer_ecs;
pub mod aesthetica_adaptive_pipeline;
pub mod simd_clay_math;
pub mod atmospheric_scattering_godrays;
pub mod hermite_sharp_features;
pub mod stochastic_virtual_sdf;
pub mod internal_voxel_density;
pub mod alexa_cinematic_optics;
pub mod asynchronous_reality_threads;
pub mod baremetal_memory_manager;
pub mod symmetric_vector_algebra;
pub mod jit_reality_compiler;
pub mod finite_element_analysis_kernel;
pub mod genomic_seed_transmitter;
pub mod tactile_proprioception_feedback;
pub mod spectral_dispersion_caustics;
pub mod aerodynamic_navier_stokes;
pub mod matter_thermodynamics_sph;
pub mod acoustic_raytracing_echo;
pub mod reversible_quantum_undo;
pub mod chromatic_glass_refraction;
pub mod hybrid_cluster_shading_vsvm;
pub mod neural_supersampling_upscaler;
pub mod molecular_texture_synthesis;
pub mod preintegrated_sss_transmittance;
pub mod visual_grammar_zod_auditor;
pub mod binary_seed_streamer;
pub mod direct_canvas_texture_injector;
pub mod holographic_light_field_rendering;
pub mod neural_radiance_cascades_nrc;
pub mod neural_deformation_fields_ndf;
pub mod lattice_boltzmann_fluid_solver;
pub mod aethel_semantic_hash_ash;
pub mod gaze_foveated_ui_collapse;
pub mod usd_gltf_autotopology_exporter;
pub mod lux_spectral_raymarched;
pub mod metabolic_octree_evolution;
pub mod quantum_state_entanglement;
pub mod hermite_duality_grid;
pub mod thermal_spectral_gi;
pub mod zero_copy_vram_prediction;
pub mod dynamic_matter_entropy;
pub mod ghost_seed_intent_stream;
pub mod perceptual_hygiene_subsampling;
pub mod universal_logarithmic_scale;
pub mod contextual_physics_override;
pub mod volumetric_extinction_medium;
pub mod neural_power_synthesizer;
pub mod hybrid_eulerian_lagrangian_pbd;
pub mod mnemonic_matter_entropy;
pub mod synesthetic_sensory_remap;
pub mod autonomous_conflict_generator;
pub mod universal_seed_inversion;
pub mod four_dimensional_time_sdf;
pub mod philosophical_physics_narrator;
pub mod lattice_boltzmann_gas_fluid;
pub mod spectral_participating_media;
pub mod fractal_energy_perturbation;
pub mod non_euclidean_curved_raymarcher;
pub mod shadow_kernel_time_reversal;
pub mod atmospheric_physical_damping;
pub mod unified_field_network;
pub mod recursive_state_branching;
pub mod autonomous_entropy_corrector;
pub mod sonic_impedance_protocol;
pub mod quantum_snapshot_dna;
pub mod kernel_honesty;
pub mod substrate_deterministic_replay;
pub mod risk_envelope;
pub mod desktop_soak;
pub mod raymarching_volumetric_renderer;
pub mod self_healing_runtime_daemon;
pub mod neural_biomechanics_npia;
pub mod neural_procedural_texture_function;
pub mod aethel_sentinel_gameplay_anticheat;
pub mod decentralized_asset_provenance_contract;
pub mod hardware_intrinsic_self_compiler;
pub mod dna_shuffler;
pub mod muscle_sim_rig;
pub mod spectral_particle_field;
pub mod ai_divergence_auditor;
pub mod kernel_polymorph;
pub mod bio_cognitive_flow_tether;
pub mod spatial_neuro_link_interface;
pub mod decentralized_royalty_ledger;
pub mod adversarial_chaos_monkey;
pub mod vocal_muscle_resolver;
pub mod mass_inertia_locomotion;
pub mod environmental_context_choreographer;
pub mod lux_facial_subsurface_occlusion;
pub mod emotion_micro_saccade_engine;
pub mod infinity_core_folded_geometry;
pub mod agent_tycoon_executive_producer;
pub mod aethel_synapse_link_haptics;
pub mod metamorphic_core_engine;
pub mod reality_mirror_auditor;
pub mod zero_copy_webgpu_pipeline_bridge;
pub mod predictive_force_locomotion;
pub mod aesthetic_profiler_auditor;
pub mod dynamic_kernel_mode_hotswap;
pub mod bio_kernel_homeostasis;
pub mod vision_to_reality_orchestrator;
pub mod edge_engine_hybrid_split;
pub mod quantum_ip_watermark;
pub mod collective_network_effect;
pub mod temporal_fold_predictor;
pub mod universal_abstract_instruction_layer;
pub mod agent_tycoon_royalty_oracle;
pub mod cognitive_interlace_studio;
pub mod neural_speech_synthesis;
pub mod lux_neural_midi_orchestrator;
pub mod repo_mind_dependency_graph;
pub mod live_auto_profiler_telepathic_terminal;
pub mod spectral_vocoder_upsampler;
pub mod audio_compute_scheduler;
pub mod predictive_vocal_chords_sync;
pub mod audio_hardware_watcher_swarm;
pub mod internal_refiner;
pub mod master_bridge;
pub mod accuracy_engine;
pub mod implicit_neural_sdf_surface;
pub mod layered_spectral_skin_sss;
pub mod non_euclidean_thin_film_magic;
pub mod micro_voxel_gaseous_fsi;
pub mod cinematic_quality_vision_auditor;
pub mod universal_entity_chromatic_fluid;
pub mod adaptive_aesthetic_shading_pipeline;
pub mod hardware_safe_topological_lod;
pub mod aethel_inker_painter_npr;
pub mod spectral_lens_post_processing;
pub mod in_engine_compositor_zero_loss;
/// Letter **ju** Non-Linear Timeline Sequencing (S-3 Sequencing tool backend —
/// R1.5): **composes the real** [`in_engine_compositor_zero_loss`] substrate with
/// zero substrate edits — deterministic timeline/keyframe evaluator (Step /
/// Linear / uniform Catmull-Rom), fail-closed validation (unsorted/duplicate/NaN
/// keyframes rejected), range clamping, and whole-frame composition through the
/// real `InEngineCompositorZeroLoss::process_timeline_compositor_frame`. Soak-gated
/// `sequencing_timeline_ready`; fingerprint seed **ju** (`0x6A75_5348`) distinct
/// from io/hs/fw/ip4/s17/jt; `sequencer_aaa_ready` / `after_effects_aaa_ready` /
/// `nuke_aaa_ready` HELD fail-closed.
pub mod sequencing_timeline;
pub mod agentic_cinematographer_director;
pub mod multilingual_lipsync_bridge;
pub mod gameplay_to_cinematic_seamless_bridge;
pub mod anchor_geometric_latent_constraint;
pub mod temporal_cohesion_solver_4d;
pub mod artistic_soul_cinematography;
pub mod persistent_material_memory;
pub mod self_critique_aesthetic_pipeline;
pub mod quantum_rollback_netcode;
pub mod neural_micro_fracture_destruction;
pub mod infinite_spatial_octree_streamer;
pub mod ecosystem_wildlife_homeostasis;
pub mod self_healing_metamorphic_compiler;
pub mod sentinel_kernel_zero_supervisor;
pub mod virtual_vram_neural_pager;
pub mod hybrid_goap_llm_ai;
/// Letter **kp** .aet Asset Format (Armadura Pesada, "Formato .aet"):
/// formato binário proprietário mmap zero-copy que espelha o layout de RAM
/// dos structs do kernel (header SoA fixo de 96 bytes, tabela de colunas,
/// colunas compactadas e blob arena) com **relocação base-independente**
/// (offsets relativos, Law XV / doctrine #73): o mesmo buffer pode ser
/// mapeado em qualquer base de memória e as views continuam válidas.
/// Fail-closed: `AetAssetView::new` rejeita magic/versão/tamanhos inválidos
/// e buffers truncados → `None`. Soak-gated `aet_asset_ready`; fingerprint
/// seed `0xDEAD_BEEF_0000_0004`; `aet_asset_aaa_ready` HELD fail-closed.
pub mod aet_asset_format;
/// Letter **kq** SDF Contact Blending (R2-A / Vanguarda P1): pure, deterministic
/// contact-blend backend — exact sphere/rounded-box/plane SDFs, polynomial
/// [`smooth_min`] (Iñigo Quílez) that equals `min` far apart and rounds the
/// field inside the blend radius, smoothstep `contact_factor` between the two
/// nearest surfaces (1 at contact, 0 far), UE5-style soft contact shadow
/// (`res = min(res, K*d/t)` ray march) and a deterministic 2D contact map of
/// the blend pocket. Soak-gated `sdf_contact_blending_ready` measured from real
/// scene invariants; fingerprint seed `0x6B71_5143_0000_0001` distinct from
/// io/hs/fw/ip4/s17/jt/hg/ju; `sdf_contact_blending_aaa_ready` /
/// `ue5_contact_shadow_aaa_ready` / `nanite_ready` / `dlss_ready` HELD fail-closed.
pub mod sdf_contact_blending;
/// Letter **kr** Micro-shadows & Bent Normals (R2-B / Vanguarda P1): closed-form
/// ray/sphere occlusion, cosine-weighted stratified hemisphere sampling with
/// deterministic in-cell hash jitter, `micro_visibility` bounded
/// `[1 - MICRO_SHADOW_STRENGTH, 1]` and monotonic in hit distance, `bent_normal`
/// accumulated over the visible (vis > 0.5) samples with geometric-normal
/// fail-closed fallback (never fabricated), plus a bounded `BentNormalGrid`
/// (≤ 4096 cells) of bend/visibility statistics. Soak-gated
/// `micro_shadow_bent_normals_ready` measured from real scene invariants;
/// fingerprint seed `0x6B72_4D53_0000_0002` distinct from
/// kq/io/fw/ip4/s17/jt/hg/ju; `micro_shadow_aaa_ready` /
/// `ue5_rt_shadows_aaa_ready` / `nanite_ready` / `dlss_ready` HELD fail-closed.
pub mod micro_shadow_bent_normals;
/// Letter **ks** Dynamic Surface Deformation (R2-C / Vanguarda P2): a
/// volume-conserving 2D Laplacian-of-Gaussian (LoG) impact kernel whose plane
/// integral is exactly zero by the divergence theorem — every dent is paired
/// with an equal rim bulge — layered on an SoA height/velocity/permanent field
/// with plasticity past the yield strain and a monotone spring-damper
/// (exponential damping, total energy never increases). Fixed 120 Hz timestep,
/// zero-allocation hot loop, bit-deterministic replay. Soak-gated
/// `dynamic_surface_deformation_ready` measured from real replay invariants
/// (net height-sum ≈ 0, dent+rim present, permanent crater persists, elastic
/// recovery, monotone energy dissipation, bounded displacement); fingerprint
/// seed `0x4B53_0000_0000_0003` distinct from kq/kr/io/fw/ip4/s17/jt/hg/ju;
/// `dynamic_surface_aaa_ready` / `ue5_chaos_softbody_aaa_ready` /
/// `world_shatter_aaa_ready` / `nanite_ready` / `dlss_ready` HELD fail-closed.
pub mod dynamic_surface_deformation;
/// Letter **kt** Async Compute Scheduler (R2-D / Vanguarda P3): a
/// dependency-aware asynchronous GPU compute scheduling substrate that assigns
/// every job the wave `1 + max(wave[prereq])` via longest-path relaxation
/// (dependency monotonicity `wave[to] > wave[from]`, cycles fail closed),
/// builds a gap-free per-wave fence timeline (`waves_used == critical_path`),
/// detects engine overlap (compute/transfer in the same wave) for GPU overlap
/// submission, and backs compute buffers from a deterministic ring with a
/// hard `bytes_resident <= bytes_capacity` budget (peak concurrency must fit
/// the pool). Preallocated SoA slabs keep `submit_frame` zero-allocating and
/// bit-deterministic. Soak-gated `async_compute_scheduler_ready` measured from
/// real replay invariants (dependency monotonicity, contiguous fence timeline,
/// genuine engine overlap, bounded backing, zero-alloc preserved); fingerprint
/// seed `0x4B54_0000_0000_0004` distinct from kq/kr/ks/io/fw/ip4/s17/jt/hg/ju;
/// `async_compute_aaa_ready` / `vulkan_async_compute_aaa_ready` /
/// `dx12_async_compute_aaa_ready` / `metal_aaa_ready` / `nanite_ready` /
/// `dlss_ready` HELD fail-closed.
pub mod async_compute_scheduler;
pub mod cloud_edge_attribute_streamer;
pub mod democratized_ai_lod_deployer;
pub mod hardware_stress_mocking_resilience;
pub mod full_system_soak_audit;
pub mod gemini_specter_cold_execution;
pub mod context_hydration_summary_graph;
pub mod pilar100_audit_sanity_loop;
pub mod ai_fusion_moa_orchestrator;
pub mod gaussian_splatting_3d_renderer;
pub mod volumetric_atmosphere_cloud_solver;
pub mod skeletal_rig_ragdoll_xpbd;
/// Letter **kb** Sound-Physics Duplex (AV/Render supremacy audit claim 2 —
/// sound-as-force): couples acoustic blast energy from ka/ex/ei/jx into a
/// radial shockwave (spherical spreading `I=E/4πr²`, `p=√(I·Z)`, Friedlander
/// positive phase, TOA `r/c`) that perturbs the real muscle PD
/// ([`MuscleSimRig`]), entrains dust in the real
/// [`LatticeBoltzmannFluidGrid`], and pulses the real Beer–Lambert
/// [`VolumetricExtinctionMedium`]. Soak-gated `sound_physics_duplex_ready`;
/// fingerprint seed `kb_sound` distinct from ka/ei/ef/ex/jx/ej/gw/gv/ew/gj;
/// `shockwave_aaa_ready` / `muscle_aaa_ready` / `dust_fluid_aaa_ready` /
/// `vdb_volumetric_aaa_ready` HELD fail-closed.
pub mod sound_physics_duplex;
/// Letter **kc** Facial Performance (AV/Render supremacy audit claim 1 —
/// phoneme → face): unifies the **real** vocal-muscle
/// ([`vocal_muscle_resolver`]), multilingual lip-sync
/// ([`multilingual_lipsync_bridge`]), micro-saccade/blink
/// ([`emotion_micro_saccade_engine`]) and subsurface skin
/// ([`lux_facial_subsurface_occlusion`]) substrate kernels into one
/// deterministic audio → face driver with zero substrate edits. Real
/// articulatory phoneme classification (F1/F2 vowel quadrilateral + silence
/// fail-closed) → viseme weights → muscle blend → gaze (20-80 Hz micro-tremor
/// rate scales with emotional arousal, binocular divergence, 3.5 s blink,
/// speech eyebrow tremor) → tension-driven SSS → JP14/FR18 retarget. Soak-gated
/// `facial_performance_ready`; fingerprint seed `kc_facia` distinct from
/// ej/jx/ka/kb/ex/ei/ef/gw/gv/ew; `facial_aaa_ready` / `lipsync_aaa_ready` /
/// `gaze_aaa_ready` / `sss_aaa_ready` HELD fail-closed.
pub mod facial_performance;
/// Letter **kd** Skin-Tension Wrinkle Map (AV/Render supremacy audit claim 1
/// sub-surface — rhytides): **extends the real** [`strain_aware_texturing`]
/// (gs) substrate — real combined strain + whitening drive crease-curvature
/// wrinkle density, tension-deepened strength, a per-region mask
/// (forehead/crow's-feet/cheek/lip; masked regions stay smooth) and groove
/// ambient occlusion. Soak-gated `skin_wrinkle_map_ready`; fingerprint seed
/// `kd_skin` (`0x6B64_5F73_6B69_6E`) distinct from gs + ej/jx/ka/kb/kc/ex/ei/
/// ef/gw/gv/ew; `wrinkle_aaa_ready` / `ao_aaa_ready` HELD fail-closed.
pub mod skin_wrinkle_map;
/// Letter **ke** Facial Micro-Fluids (AV/Render supremacy audit claim 1
/// surface — tears/saliva): **composes the real**
/// [`matter_thermodynamics_sph`] SPH substrate + the real
/// [`volumetric_softbody_muscle_pbd`] eyelid-tetra anchor with zero substrate
/// edits. Pendant-drop capillary physics (tear V_crit ≈ 1.71 µL, saliva ≈
/// 1.13 µL from partial contact-line adhesion) — gland → meniscus → drip at
/// V_crit → gravity fall → cheek catch, real-SPH droplet cohesion
/// (velocity-delta coupling, fail-closed speed cap), evaporation
/// shrink/removal and seed-jittered emission. Soak-gated
/// `facial_micro_fluids_ready` (tear volume grows on cry + drip under gravity
/// + evaporation shrinks + same seed → same); fingerprint seed `ke_micro`
/// (`0x6B65_5F6D_6963_726F`) distinct from matter SPH + PBD + gs +
/// ej/jx/ka/kb/kc/kd/ex/ei/ef/gw/gv/ew; `microfluid_aaa_ready` /
/// `tear_film_aaa_ready` HELD fail-closed.
pub mod facial_micro_fluids;
/// Letter **kf** GPU Strand Grooming (AV/Render supremacy audit claim 1 —
/// hair): **honesty-corrects** the [`strand_hair_subsurface_skin`] (ip12)
/// doc over-claim — real engine truth is 2048 two-point CPU plain-gravity
/// strands, NOT "100,000+ GPU XPBD curvature". This kernel composes the real
/// [`position_based_dynamics`] XPBD substrate with zero substrate edits:
/// multi-segment Verlet integration (8 particles/strand, roots inv_mass = 0),
/// stretch on the real `solve_xpbd_precolored`, plus native analytic-gradient
/// XPBD bend (discrete second-difference curvature), dihedral twist (exact
/// chain-rule gradient verified against central finite differences in unit
/// tests) and root-tangent styling. Real CPU capacity
/// `MAX_GROOMED_STRANDS = 4096` (> TOY 2048, honest vs the 100k over-claim);
/// the GPU dimension is modeled as a pure compute dispatch plan toward
/// `GPU_TARGET_STRANDS = 100_000` (800 000 particles → 12 500 workgroups @ 64
/// threads) with `gpu_execution_verified` / `gpu_100k_claimed` /
/// `hair_gpu_aaa_ready` / `hair_xpbd_aaa_ready` HELD fail-closed. Soak-gated
/// `gpu_strand_grooming_ready` (bend resists, twist resists, stretch holds
/// under gravity, roots pinned, 16 384-particle scale, same seed → same, all
/// finite); fingerprint seed `kf_groom` (`0x6B66_5F67_726F_6F6D`) distinct
/// from PBD + hair TOY + gs + ej/jx/ka/kb/kc/kd/ke/ex/ei/ef/gw/gv/ew.
pub mod gpu_strand_grooming;
/// Letter **kg** Spatio-Temporal Denoiser (AV/Render supremacy audit claim 2 —
/// denoising): **honesty-corrects** the [`path_traced_radiance_cascades`]
/// (ip10) Tensor-Core theater — its module doc claimed "Tensor Core neural
/// spatio-temporal denoising", "zero-lag path tracing on RTX 3060 / 4090" and
/// "supremacy over UE5.5 Lumen" while the code only hardcodes
/// `denoise_confidence[i] = 0.99` (no actual denoising). This kernel composes
/// the REAL render substrates with zero substrate edits: motion-vector history
/// reprojection + `OOB_SENTINEL = -1.0` bilinear history sampling
/// ([`neural_supersampling_upscaler`] **nu** pattern), 3×3 neighborhood
/// history clamp ([`infinite_anti_aliasing`] **gi** `temporal_step` pattern),
/// and gaze-foveated temporal-blend semantics ([`gaze_foveated_reprojection`]
/// **gt**). Adds SVGF first-moment variance-adaptive temporal blend α (high
/// variance → more history), depth-aware disocclusion rejection (anti-ghosting:
/// reprojected history depth vs current depth mismatch > 0.2 relative → temporal
/// weight 0, spatial-only) and an edge-avoiding cross-bilateral spatial pass
/// (depth + normal + luminance edge-stopping, separable 5×5 two-pass).
/// Soak-gated `spatio_temporal_denoiser_ready` (ghosting reduces on
/// disocclusion, history clamp engages + cuts max deviation, variance guides α,
/// temporal accumulation converges over 24 frames, spatial filter reduces
/// variance, same seed → same, all finite, in [0,1]); fingerprint seed `kg_dns`
/// (`0x6B67_5F64_6E73`) distinct from gt/gi/nu + kf + ej/jx/ka/kb/kc/kd/ke/
/// ex/ei/ef/gw/gv/ew. `neural_upscale_aaa_ready` / `full_restit_class_denoiser_aaa_ready`
/// / `gpu_execution_verified` HELD fail-closed (CPU SVGF/BMFR-lite ≠ shipped
/// GPU/ML denoiser; the ip10 Tensor-Core claim is corrected, not inherited).
pub mod spatio_temporal_denoiser;
pub mod spectral_hrtf_audio_raytracer;
pub mod ocean_fourier_spectral_waves;
pub mod demo_game_realm_spectrum;
pub mod path_traced_radiance_cascades;
pub mod vulkan_bindless_ray_tracer;
pub mod strand_hair_subsurface_skin;
pub mod distributed_gpu_cluster_sync;
pub mod binary_netcode_serializer;
pub mod tree_sitter_ast_indexer;
pub mod async_bvh_ray_tracer;
pub mod heterogeneous_hardware_fallback_matrix;
/// R20 orphan-compile resolution (2026-08-11): genuine kernel modules wired into
/// the crate so the orphan-prune gate (CW7) stops flagging them. `gpu_compute` is
/// gated on the optional `wgpu-bridge` feature (wgpu 30 off by default so
/// studio-local builds against wgpu 0.20 without a version clash).
pub mod gpu_submit_path;
pub mod materialx_bridge;
pub mod openvdb_bridge;
#[cfg(feature = "wgpu-bridge")]
pub mod gpu_compute;


pub mod physics_kernel;
/// S-17..S-22 Kernel Physics Supremacy (doctrine #73): `PhysicsWorld` owns Rapier+
/// Euphoria `PhysicsKernel`, `SimulationClock` (120Hz x2 substeps = 240Hz, spiral-
/// protected), `RollbackJournal` (real-Rapier per-body checkpoint capture/restore)
/// and deterministic input-replay rollback feeding P2 GAS/Physics of Launch Hard
/// Gate #72. Unified entity-id space (S-20) bridges Physics/GAS/World domains.
pub mod physics_world;
/// R2-F — S-17 capture-point (Pratt) balance authority (doctrine #73 — Kernel
/// Physics Supremacy): a deterministic, zero-allocation balance controller for
/// the Euphoria active-ragdoll path of `PhysicsWorld`. Closes the roadmap gaps
/// "Dynamic balance — missing | Balance controller (CoM tracking, foot placement
/// correction, fall recovery)" and "Hit reaction — missing | Impulse → muscle
/// activation → balance recovery". `PhysicsWorld` feeds the live Rapier body
/// state each substep and applies the corrective impulse; AAA flags stay HELD
/// until acceptance on real hardware.
pub mod euphoria_balance_controller;
/// R2-G — Vanguarda P3/P1: World Forge densification authority composed OVER the
/// R1.4 `spatial_partition_hibernation::UniformSpatialGrid` (zero substrate edits).
/// Deterministic seed-driven placement of vegetation/rock instances over the
/// ground cell sweep (cy = 0), min-spacing rejection, kind-based radii/stiffness,
/// zero-alloc preallocated SoA build. Edges: R2-G→R1.4 (broadphase parity via
/// `UniformSpatialGrid`/`cell_of`/`brute_force_cell_pairs`), R2-G→R2-A (composed
/// `SdfScene` contact via `sdf_contact_blending` — overlapped pairs raise
/// `contact()` toward 1.0, far-field reads 0.0), R2-G→R2-H (per-instance rest
/// `BendPayload` the wind field will bend). Soak-gated
/// `world_forge_densification_ready`; AAA flags HELD until acceptance on real
/// hardware.
pub mod world_forge_densification;
/// R2-H — Vanguarda P2: wind field dynamics authority composed OVER the R2-G
/// `world_forge_densification` substrate (zero substrate edits). A deterministic
/// wind-field grid (trilinear spatial sampling, gust envelope, turbulence clamp)
/// bends R2-G per-instance rest geometry via `BendPayload` — the R2-G→R2-H edge —
/// with compliance derived from kind stiffness (grass soft, rock rigid), a CFL-
/// guarded semi-Lagrangian scalar advection field, and an HRTF-ready wind audio
/// envelope (parameter producer only; `wind_audio_aaa_ready` /
/// `audio_hrir_aaa_ready` HELD until acceptance on real hardware). Soak-gated
/// `wind_field_dynamics_ready`; 13-peer evidence distinctness against every R2
/// sibling substrate.
pub mod wind_field_dynamics;
/// R2-I — Vanguarda P4: auto-photography director authority — a deterministic
/// cinematography rule engine (letter **kw**) composed OVER the R1.5
/// `sequencing_timeline` substrate via `compose_cinema_frame` (the R2-I→ju edge —
/// zero substrate edits). Six closed-form cinematography rules (Rule of Thirds,
/// Headroom, Lead Room, Rule 180, Lens Focal Length, Camera Height) pull a
/// `SceneInterest` subject into a compliant `DirectedCameraShot` with normalized
/// weights summing to 1.0. **Law XVI lock:** every RuleBook mutation and every
/// `direct()`/`configure()`/`set_rule()` requires an open
/// `CreativeFusionTransaction` (fail-closed Rust-side mirror of the web Trava —
/// begin/commit/rollback; mutations after commit or rollback rejected). Soak-
/// gated `auto_photography_director_ready`; AAA flags
/// (`auto_photography`/`cinematography_ai`/`virtual_production`) HELD until
/// acceptance on real hardware; 15-peer evidence distinctness against every R2
/// sibling substrate.
pub mod auto_photography_director;
/// R2-J — Cinema Frame-Graph Depth Composition (Vanguarda P4/P1, letter **kx**):
/// consolidates the R2-I `AutoPhotographyDirector` lens/placed shot INTO the real
/// `WgpuFramegraph` with zero substrate edits — Depth→Circle-of-Confusion→LensDof
/// (real ACES cinematic lens buffer)→ACES tonemap (real RRT/ODT on HIGH_LUM)→
/// Composite passes plus one intentionally-unused pass (proving backward-DCE
/// culling). **VERIFY DEPTH:** the depth resource survives compile-culling, the CoC
/// is finite/bounded/zero-at-focal/monotonic in |depth−focal| on both sides, the
/// measured composition depth equals the live pass count (executed==live==4), and
/// the unused pass is culled. **Law XVI lock:** `compose()` requires an open
/// `CreativeFusionTransaction` (reuses the R2-I transaction; mutations after
/// commit rejected). Soak-gated `cinema_frame_graph_composition_ready`; AAA flags
/// (`cinema_frame_graph`/`depth_of_field`/`prores_export`) HELD until acceptance on
/// real hardware; 16-peer evidence distinctness (15 R2 siblings + kw auto-photography).
pub mod cinema_frame_graph_composition;
/// R2-K — Cinema Hot-Loop Native Composition (Vanguarda P1/P3, letter **ky**):
/// binds the R2-E `PsoVault`/`ShaderCooker` (km) to the R2-J cinema composition
/// (kx) inside a 60/120 Hz hot-loop driver: pre-cooks ALL reachable composition
/// pipeline keys (DepthToCoc→LensDof→AcesTonemap→Composite + one culled Unused)
/// into a `ShaderCooker`/`PsoVault`, then runs 4096 simulated frames with **zero
/// PSO misses** (`vault_miss_count == 0`, `hit_rate() == 1.0`, `probe_shader_cooker`
/// resident per stage) and drives `AutoPhotographyDirector` + `ComposeCinemaFrameGraph`
/// (Law XVI via `CreativeFusionTransaction`, commit fail-closed). Soak-gated
/// `cinema_hot_loop_composition_ready`; AAA flags (`gpu_pso_prewarm`,
/// `pso_stutter_free`, `async_compile`, `disk_cache`) HELD until acceptance on real
/// hardware; 17-peer evidence distinctness (16 R2 siblings incl. kx + km rewriter).
pub mod cinema_hot_loop_composition;
/// R4 — S-17 solver-bank authority: wires every soak-gated solver substrate
/// (PBD / XPBD / SPH / SPH-hash / FEA / NS / LBM / softbody) into one shared
/// `SimulationClock` cadence (240 Hz) with bit-identical live==golden parity
/// (espelho da autoridade CW3 `PhysicsWorld`). Fail-closed `*_wired_ready`.
pub mod physics_world_solvers;
/// R6 — S-20 kernel GAS Entity Authority (doctrine #73 — Kernel Physics
/// Supremacy): closes the GAS↔Rapier id-gap at kernel authority level. A single
/// `WorldSoaSpaceAllocator` feeds BOTH the Gas domain and the Physics (Rapier)
/// domain, so spawned GAS entities and physics handles provably derive from one
/// shared sequence (the studio `GasWorld` u32 counter becomes a view, not a third
/// id authority). Dense `GasEntityRegistry` (fail-closed cross-domain / reserved /
/// duplicate rejection), S-19 fused 240 Hz cadence via `tick_gas`, deterministic
/// `fingerprint` and an evidence soak with fail-closed AAA flags HELD false.
pub mod gas_entity_authority;
/// R7 — S-22 kernel Deterministic Rollback Authority (doctrine #73 — Kernel
/// Physics Supremacy): a fail-closed authority composed OVER the real
/// `PhysicsWorld` substrate (`RollbackJournal` ring + input-replay `rollback_to`)
/// with zero substrate edits. Proves golden determinism (every checkpoint),
/// divergence detection, bit-identical pre-divergence checkpoint, rollback re-sim
/// reproducing the divergent fingerprint, corrected-replay repair convergence,
/// ring-eviction fail-closed bounds and exact 240 Hz clock cadence. Evidence soak
/// with AAA / product / S-27 cross-domain duplex readiness HELD false.
pub mod deterministic_rollback;
pub mod fiber_job_system;
pub mod entropy_rapier_bridge;
/// S-11 Kernel Wire Registry (doctrine #73 — Kernel Physics Supremacy; R0 round
/// of the Aethel internal-debt execution plan): the declarative, machine-readable
/// register of every `kernel_*_wire` module (115 on disk, 1:1 compiled in
/// studio-local), its kernel substrate, letter, status (ACTIVE/WIRE/HELD) and
/// `reachable_from` command surface. Locks the measured gap reality — only 5
/// wires / 6 commands are reachable via `tauri::generate_handler!`; the 111
/// compiled-but-unreachable orphans are the P2g disconnection debt that R1's
/// `xtask wire-check` will enforce fail-closed against this register.
pub mod kernel_registry;
/// S-15 Wire-Reachability runtime telemetry (doctrine #73, round R3): classifica
/// cada wire ACTIVE contra um predicado de superfície injetado pelo host — feed
/// do registro S-01/S-11 tornando o gap compile-vs-reachable observável em runtime.
pub mod wire_reachability;
/// S-23 Aethel Matter Model (doctrine #73): phase-aware unified matter sim with
/// per-domain **real** solvers — SPH melt/flow (`MatterThermodynamicsSph`), LBM
/// gas buoyancy (`LatticeBoltzmannGasFluid`), XPBD solid/soft (`PositionBasedDynamics`),
/// FEA stress (`FiniteElementAnalysisKernel`) and Voronoi fracture → simulated
/// Rapier debris (the `entropy_rapier_bridge` pattern). Temperature-driven
/// hysteresis Solid↔Soft↔Fluid↔Gas (soften/melt/boil/condense/freeze/re-soften),
/// soak-gated `MATTER_EVIDENCE_KIND` with fail-closed AAA (`MATTER_EVIDENCE_KIND`).
pub mod aethel_matter_model;
/// Round **kh** Composite Fracture + Rebar Bending (doctrine #73 / Launch Hard
/// Gate #72 P2-GAS physics spine): a reinforced-concrete composite authority
/// composed from four REAL substrates with zero substrate edits — (1) rebar-cage
/// FEA ([`finite_element_analysis_kernel`] `TrussMesh2D`, 6-node plane truss, 4
/// free DOF, bottom-chord tension + top-chord compression + stirrups + shear
/// diagonals) under a mid-span impact; (2) rebar yield → plastic hinge (per-bar
/// axial stress vs structural-steel yield, degraded EA, re-solve → load
/// redistribution); (3) concrete crack gate (`(F − steel_resisted)/A_c` rising
/// past `3·DEFAULT_YIELD_STRESS`); (4) Voronoi 8³ = 512-chunk fracture
/// ([`voronoi_destruction_3d`]) → Rapier debris via
/// [`entropy_rapier_bridge::spawn_entropy_chunks_into_rapier`] + 45 gravity
/// ticks (the [`aethel_matter_model`] jv chain). Soak-gated
/// `composite_fracture_ready`: rebar bends (FEA), yields, hinge sheds load,
/// concrete cracks only on overload (stress-gated), 512 ≥ 256-chunk floor,
/// debris COM drops + mass conserved, same seed → same, all finite. Evidence
/// seed `kh_cmps` (`0x6B68_5F63_6D70_73`) distinct from jv + erpb + voronoi +
/// fea + kf/kg + prior. `chaos_destruction_aaa_ready` /
/// `unreal_chaos_parity_ready` / `gpu_voronoi_ready` HELD fail-closed.
pub mod composite_fracture_kernel;
pub mod rollback_netcode_snapshot;
pub mod ipc_zero_copy_ws;
#[cfg(feature = "wgpu-bridge")]
pub mod nanite_wgpu_bridge;
#[cfg(feature = "wgpu-bridge")]
pub mod radiance_cascades_wgpu_bridge;
/// S-21 GPU Physics Compute Unification (doctrine #73): a single wgpu-30 compute
/// spine with **real staging readback** offloads the CPU LBM D2Q9 collide+stream
/// onto the GPU and verifies bounded CPU↔GPU parity (`GPU_LBM_EVIDENCE_KIND`).
/// The same bind-group/pipeline scaffolding is the unified substrate for the
/// future SPH/NS GPU passes (`gpu_fluid_unification_ready` stays `false`).
#[cfg(feature = "wgpu-bridge")]
pub mod gpu_fluid_compute_bridge;
/// S-24 Procedural Muscle Locomotion (doctrine #73 — Law III Euphoria): a real
/// tendon + muscle-activation locomotion engine with **zero animation assets**.
/// An IK-free biped gait emerges from a CPG phase oscillator, muscle activation
/// impulse chains (flex contraction + lift / extension support + toe-off) and
/// the real XPBD tendon substrate (`PositionBasedDynamics::solve_xpbd_precolored`),
/// with stance-feet stiction and a foot-placement reflex — no joint-angle IK,
/// no keyframes. Two-pass deterministic soak (`LOC_EVIDENCE_KIND` = letter **jw**)
/// gates `procedural_muscle_locomotion_ready` on measured gait only; AAA vectors
/// (chaos muscle / full Euphoria / GPU muscle / neural physics) stay fail-closed.
pub mod procedural_muscle_locomotion;
/// S-25 Living-Sky Fluid + Ocean Buoyancy (doctrine #73 — Law V Fluid + Law III):
/// a real bidirectional living-sky kernel that couples the spectral ocean
/// (`ocean_fourier_spectral_waves`, letter **ip13**) and the aerodynamic
/// Navier–Stokes wind field (`aerodynamic_navier_stokes`, letter **gv**) to
/// `WorldSoA` rigid bodies: Archimedes buoyancy from submerged volume, wave-slope
/// advection, vertical skin drag, quadratic air drag on the exposed cross-section,
/// plus body→ocean persistent self-decaying wakes and body→wind momentum kicks.
/// Three-pass deterministic soak (`SKY_EVIDENCE_KIND` = letter **jy**) gates
/// `living_sky_ready` on measured buoyancy/drag/wake criteria only; AAA vectors
/// (full-SPH ocean / GPU ocean / full-spectrum FFT / Chaos ocean / live surface /
/// neural physics) stay fail-closed.
pub mod living_sky_fluid_ocean_buoyancy;
/// S-26 Neural-Physics Co-Simulation + SDF Collision (doctrine #73 — Kernel
/// Physics Supremacy). letter **jz**. First register that runs a deterministic
/// local ML model **inside the physics step** (Master Map §0.2 line 69): a
/// soak-trained contact/muscle predictor ([`NeuralContactNet`]) whose weights
/// are learned by real SGD against an analytic impulse teacher (no generative
/// call in the hot loop — Doutrina Determinística). Real SDF collision wiring:
/// [`SdfCollisionQuery`] consumes the real [`StochasticVirtualSdfField`]
/// (letter **eo**), closing the "present, unwired" gap of
/// `neural_biomechanics_npia` + `stochastic_virtual_sdf` + `sdf_sculptor`.
/// Law XV: Capability Score tiers model width + SDF strata (Low 12/4, Mid
/// 20/8, High 32/10). Three-pass deterministic soak (`NEURAL_EVIDENCE_KIND`)
/// gates `neural_physics_co_sim_ready`; the S-26-owned measured vector
/// `neural_physics_aaa_ready` flips true here only, while online deep-net /
/// GPU neural / neural terrain / full-neural-rig stay fail-closed.
pub mod neural_physics_co_sim;
/// S-27 Latent Audio Adaptation (doctrine #74 — the 3 Leis da Adaptação
/// Universal / Aethel Fusion). letter **ki**. The first composition kernel of
/// the "Paradigma do Áudio Latente (MetaSounds Supremacy)" that morphs a single
/// audio node across the **Sólido vs Metamorfo** spectrum (Zero Imposição) by
/// fusing real closed substrates: S1 Biomechanical Foley
/// (`procedural_muscle_locomotion` cadence → `metasounds_dsp_compiler`
/// granular + WOOD modal), S2 Helmholtz cavity resonance
/// (`aerodynamic_navier_stokes` jet ↔ Lighthill + GLASS modal ring), S3
/// physical Kelly–Lochbaum vocal effort (fatigue → breathless NPC formant/
/// breath telemetry), S4 SDF acoustic edge diffraction
/// (`sdf_audio_raymarching` blocked sphere + clear-path proof + Keller split +
/// `poetic_error_handler` sanity portão) and S5 Synesthetic Matrix
/// (`synesthetic_sensory_remap` → `aethel_synapse_link_haptics` haptic mask +
/// screen-shake + chromatic). Three-pass deterministic soak
/// (`KI_EVIDENCE_KIND` = `latent_audio_adaptation`, FP seeds "KI_LAT"/"LATA")
/// gates `latent_audio_ready` on measured invariants only; the AAA vectors stay
/// fail-closed (Zero-MVP / Anti-Mock) and 7 distinct `*_ready` fields prove
/// independence from jx/jw/gv/ex/dx/kh/haptics.
pub mod latent_audio_adaptation;
/// S-27b Microfracture Acoustic Degradation (doctrine #73/#74 — the Paradigma
/// do Áudio Latente, P2-GAS physics spine of Launch Hard Gate #72). letter
/// **kj**. A composition kernel that fuses three REAL closed substrates with
/// zero substrate edits: (1) Voronoi 6³ = 216-chunk fracture topology
/// ([`voronoi_destruction_3d`], letter ip2) whose bisector count densities
/// drive the acoustic model; (2) the jx [`metasounds_dsp_compiler`]
/// `ModalSynthesizer` (CONCRETE, Euler–Bernoulli modes) + `RbjBiquad` LowPass,
/// coupling fracture-trigger energy → modal ring and microfracture density →
/// timbre degradation on the **Sólido vs Metamorfo** spectrum (Zero Imposição:
/// `Solid` = bit-exact identity passthrough, `Fluid` = energy-loss + 4 kHz→800 Hz
/// low-pass muffling); (3) [`entropy_rapier_bridge`] debris → Rapier bodies → 45
/// gravity ticks → secondary impact re-trigger ring. Soak-gated
/// `microfracture_acoustic_ready` (fractured, density measured, chunk scale
/// beyond 64, mass conserved, solid identity, fluid morphing active, modal
/// coupling, ring decays, high band muffled, debris moved, re-trigger, same seed
/// → same, all finite); fingerprint seed `kj_mfrc` (`0x4B4A_5F4D_4943`) distinct
/// from ip2/erpb/kh/jx/ki. `chaos_destruction_aaa_ready` /
/// `unreal_chaos_parity_ready` / `gpu_voronoi_ready` /
/// `physical_audio_aaa_ready` / `microfracture_acoustic_aaa_ready` HELD
/// fail-closed.
pub mod microfracture_acoustic;
/// S-27c Mach-1 Sonic Boom Signature (doctrine #73/#74 — P2-GAS physics spine
/// of Launch Hard Gate #72, audio-graph law IV + aeroacoustic law). letter
/// **kk**. A composition kernel that fuses two REAL closed substrates with
/// zero substrate edits: (1) the gv [`aerodynamic_navier_stokes`] stable-fluids
/// grid forced with a CFL-safe disturbance jet that exists *only for a
/// supersonic passage* (`jet = KK_JET_SCALE·(M−1)`, zero for M ≤ 1), with the
/// jx [`metasounds_dsp_compiler`] `AeroAcoustic::lighthill_source_strength`
/// quadrupole proxy measured zero-copy over the live grid; (2) the closed-form
/// far-field N-wave overpressure law `Δp = p_ref·K·(M²−1)` (zero for M ≤ 1,
/// monotonic in M) rendering the canonical bilinear signature: finite rise →
/// linear decay → rarefaction phase → recovery. **Sólido vs Metamorfo** (Zero
/// Imposição): `Solid` = pure N-wave identity passthrough; `Fluid` = AM-morph
/// by the measured aeroacoustic turbulence — bit-identical to Solid when the
/// grid carries no source (M ≤ 1). The Mach passage is honest kernel-input
/// telemetry (the normalized grid is CFL-constrained; actual supersonic m/s is
/// not simulated). Soak-gated `sonic_boom_signature_ready` (supersonic
/// detected, flow response measured, Lighthill measured, N-wave overpressure +
/// energy + rarefaction + bilinear shape, overpressure scales with Mach,
/// subsonic no-shock, Solid identity, Fluid morphing only under a source, same
/// seed → same, all finite); fingerprint seed `kk_sbm` (`0x4B4B_5F53_424D`)
/// distinct from gv/jx/ki/kj. `sonic_boom_aaa_ready` /
/// `full_cfd_aaa_ready` / `gpu_cfd_aaa_ready` / `physical_audio_aaa_ready` /
/// `supersonic_aeroacoustics_aaa_ready` HELD fail-closed.
pub mod mach1_sonic_boom_signature;

/// **S-27d — Subsurface Acoustic Scattering** (letter **kl**): Phase 2 kernel
/// composing four real closed substrates — ex SDF raymarch (geometric
/// volumetric occlusion), ip12 SSS mean-free-path (tissue acoustic opacity +
/// hair fringe), kd wrinkle map on gs strain (surface diffuse scatter), jx
/// ModalSynthesizer (soft-organic tissue modal resonance). Transmission through
/// a tissue volume: `direct = transmission · exp(-abs·path)` with
/// `abs = σ / MFP`; wrinkle intensity mutes highs; hair fringe damps highs.
/// **Sólido vs Metamorfo** (Zero Imposição): `Solid` = deterministic
/// band-limited strike identity; `Fluid` = direct·s + diffuse·scatter through a
/// lowpass + jx modal ring — bit-identical to Solid when the SDF path is clear
/// (no tissue volume). Soak-gated `subsurface_acoustic_scattering_ready`
/// (tissue transmission measured, MFP→absorption, clear-path identity, Solid
/// passthrough, Fluid morphing, wrinkle scatter, hair damp, SDF occlusion,
/// diffuse scatter, modal resonance, deterministic replay, all finite,
/// transmission bounded); fingerprint seed `kl_SSC` (`0x4B4C_5F53_5343`)
/// distinct from ex/ip12/kd/jx. `physical_audio_aaa_ready` /
/// `tissue_acoustics_aaa_ready` / `meta_human_audio_aaa_ready` /
/// `strand_hair_subsurface_skin_aaa_ready` / `wrinkle_aaa_ready` /
/// `sdf_occlusion_aaa_ready` HELD fail-closed.
pub mod subsurface_acoustic_scattering;

/// Spatial Partition Hibernation — uniform 3D spatial-hash broadphase + cell
/// hibernation (R1.4, doctrine #73 — Kernel Physics Supremacy). letter **hg**.
/// A deterministic uniform-grid broadphase with real cell hibernation: bodies
/// whose squared speed stays below a threshold for `hibernate_after_frames`
/// frames fall asleep, a cell sleeps only when every occupant sleeps, and
/// wake-on-contact / impulse-wake / wake-on-demand re-activate deterministically.
/// Pairs are emitted only from awake cells (amortized O(awake) per step) and the
/// AABB-par output is normalized (min,max), tie-broken by id, sorted and deduped
/// so it matches [`brute_force_cell_pairs`] EXACTLY — the zero-alloc hot loop
/// (all buffers preallocated in `new`) keeps every capacity stable across steps.
/// Distinctness vs the broadphase peers: io ([`matter_thermodynamics_sph`]
/// `sph_evidence_fingerprint`), hs ([`unified_field_network`]
/// `evidence_fingerprint`), fw ([`quantum_overlap`] `fingerprint`), ip4
/// ([`svo_terrain_world_partition`] `fingerprint`) and s17 ([`physics_world`]
/// `evidence_fingerprint`). Soak-gated `spatial_partition_hibernation_ready`
/// (frame 0 = 4 pairs, frame 30 = 1 pair, wake-on-demand re-activates,
/// deterministic replay, zero-alloc capacities); `chaos_broadphase_aaa_ready` /
/// `physx_sleeping_aaa_ready` / `gpu_broadphase_aaa_ready` HELD fail-closed.
pub mod spatial_partition_hibernation;

/// **R3-A — Vehicle Chassis Dynamics** (letter **kz**, doctrine #73 / Launch Hard
/// Gate #72 P2-GAS physics spine — R3 audit: vehicles were ZERO). A real,
/// deterministic 4-wheel vehicle chassis solver on the S-17 rollback spine:
/// per-wheel spring-damper suspension + hard-floor contact (tanh Coulomb
/// friction — avoids the R2-I `f32::signum(+0.0)=1.0` zero-bias bug), Ackermann
/// steering (inner > outer always), differential modes (open / locked /
/// torque-vectoring) with provable axle-split, an anti-roll bar acting as a pure
/// couple across each axle, body-frame inertia integration via quaternion
/// rotation and semi-implicit Euler with 4 fixed substeps. Rollback replay is
/// bit-identical (snapshot/restore + deterministic fingerprint) and the 60 Hz
/// hot loop is zero-alloc (`keep_capacity`). Soak-gated
/// `vehicle_chassis_ready` (static equilibrium, Ackermann, differential split,
/// rollback replay, zero-alloc hot loop, braking bounded, all finite); AAA
/// vectors (`chassis_ragdoll_aaa_ready` / `tire_grip_aaa_ready` /
/// `wheel_suspension_aaa_ready` / `drift_model_aaa_ready` / `coins_ready` /
/// `agones_ready` / `quic_ready`) stay fail-closed. 21-peer evidence distinctness
/// (17 R2/R1.4 siblings incl. s17 `physics_world` + ky `cinema_hot_loop` + gv NS
/// + ip PBD + jy living-sky). Fingerprint seed `kz_vhc` (`0x6B7A_5F56_4843`).
pub mod vehicle_chassis_dynamics;

/// **R3-B — Flight Aerodynamics** (letter **la**, doctrine #73 / Launch Hard
/// Gate #72 P2-GAS physics spine — R3 audit: flight was ZERO). A real,
/// deterministic analytical aircraft flight model on the S-17 rollback spine:
/// ISA standard atmosphere (T/p/ρ/a with exponent 5.2558), dynamic pressure
/// `q = ½ρv²`, lift `CL(α)` linear→stall→post-stall falloff with the Prandtl
/// finite-wing slope correction, parabolic drag polar `CD = CD0 + k·CL²`,
/// control surfaces (elevator/aileron/rudder) with moment arms, stability rate
/// damping, wind coupling via relative airspeed `v_air = v − wind` (a headwind
/// **increases** q — the plan's line-63 wording was an error, corrected here
/// and proven), and a level-flight trim solver `α` for `L = W`. Body-frame
/// convention matches kz (`+x` forward / `+y` up / `+z` right; roll about x,
/// yaw about y, pitch about z). Semi-implicit Euler with 4 fixed substeps,
/// rollback replay bit-identical (snapshot/restore + deterministic
/// fingerprint), zero-alloc hot loop. Soak-gated `flight_aerodynamics_ready`
/// (trim L=W, q monotonic, stall peak, drag polar, elevator sign, determinism,
/// rollback, zero-alloc, finite/bounded, headwind/tailwind q coupling); AAA
/// vectors (`aerobatics_aaa_ready` / `propwash_aaa_ready` /
/// `control_authority_aaa_ready` / `stall_spin_aaa_ready` / `coins_ready` /
/// `agones_ready` / `quic_ready`) stay fail-closed. Distinct from the CFD fluid
/// solver [`aerodynamic_navier_stokes`] (`gv`) — this is the analytic
/// rigid-aircraft model, `gv` the grid/NS wind detail. 22-peer evidence
/// distinctness (21 prior incl. kz `vehicle_chassis_dynamics`).
pub mod flight_aerodynamics;

/// **R3-C — Celestial / Orbital Dynamics** (letter **lb**, doctrine #73 /
/// Launch Hard Gate #72 P2-GAS physics spine — R3 audit: space/microgravity
/// was ZERO). A real, deterministic two-body orbital engine on the S-17
/// rollback spine: **universal-variable Kepler propagation** (Vallado
/// Algorithm 5) with the Stumpff series `C(z)`/`S(z)` and a bounded Newton
/// solve of the universal Kepler equation
/// `F(χ) = χ³S(z) + (r₀·v₀/√μ)χ²C(z) + r₀χ(1−zS(z)) − √μ·Δt = 0` — analytic
/// **exact** conic propagation (zero integration error, multi-revolution
/// safe), no semi-implicit Euler drift. Classical orbital elements
/// `a, e, i, Ω, ω, ν, M` ↔ ECI state round-trip (perifocal 3-1-3 rotation),
/// Kepler's equation solved by Newton with `e=0 → M=E`, vis-viva / escape /
/// specific energy closed forms, orbital period. **Patched conic** SOI
/// resolution (Laplace `r_soi = a(1−e)(μ_sec/μ_pri)^(2/5)`) with a single-step
/// primary mu-switch (re-bases position/velocity into the new primary frame
/// only when strictly closer to it), microgravity (`μ=0` → straight-line
/// ballistic with constant velocity) and RCS `Δv` as an exact instantaneous
/// velocity add. Configurable [`BodyTable`](celestial_orbital_dynamics::BodyTable)
/// (Earth/Moon/Mars presets + custom bodies, fixed capacity, fail-closed push)
/// — satisfies the Founder flexibility mandate (any generated world, not
/// car-only). Rollback replay is bit-identical (snapshot/restore +
/// deterministic fingerprint) and the hot loop is zero-alloc
/// (`keep_capacity`). Soak-gated `celestial_orbital_dynamics_ready` (Kepler
/// e=0, elliptic residual, circular period return, vis-viva conservation,
/// elements↔state round-trip, SOI mu-switch, microgravity constant velocity,
/// RCS exact Δv, escape positive energy, determinism, rollback, zero-alloc,
/// finite/bounded); AAA vectors (`rcs_aaa_ready` / `orbital_maneuver_aaa_ready`
/// / `n_body_aaa_ready` / `atmosphere_drag_aaa_ready` / `coins_ready` /
/// `agones_ready` / `quic_ready`) stay fail-closed — this is 2-body +
/// patched-conic only, NOT N-body/J2/drag/finite-burn. Distinct from kz
/// `vehicle_chassis_dynamics` (ground) and la `flight_aerodynamics`
/// (atmospheric rigid-aircraft). 23-peer evidence distinctness (22 prior
/// incl. kz and la). Fingerprint seed `lb_orb` (`0x6C62_0000_0000_0001`).
pub mod celestial_orbital_dynamics;

/// **R4-A — Aethel Latent Dreamspace · Protocolo de Bytecode Espacial `.asbc`**
/// (letter **lc**, doctrine #73 / Absolute Supremacy register S-20+ — R4
/// directive: latent dreamspace brain). A real, deterministic **32-byte binary
/// spatial-communication protocol** replacing text/JSON agent-world chat with a
/// zero-copy FFI bytecode on the S-17 spine: `#[repr(C, align(32))]`
/// [`SpatialBytecodeEntity`](latent_dreamspace_bytecode::SpatialBytecodeEntity)
/// = `entity_id u32` + `position_fp16 [u16;3]` + `rotation_quat [u16;4]` +
/// `velocity_fp16 [u16;3]` + `matter_id u16` + `semantic_tag_flags u16` +
/// `spatial_hash u32` (field-order resolution documented in-module: the
/// semantic tag field is a 16-bit mask so the whole entity is exactly 32
/// bytes / 10,000 entities ≈ 320 KiB, 0.1 ms budget `ASBC_BUDGET_MICROS`).
/// Manual IEEE-754 **binary16** quantization (round-to-nearest-even, ±10 km
/// position / ±1 km/s velocity domains, clamped, quaternion `w≥0`
/// double-cover stable) and a **FNV-1a spatial hash computed over the DECODED
/// (quantized) position** so encode→decode→hash is always self-consistent and
/// cell-local (`spatial_cell` 2 m). Transport is the 32-byte
/// [`AsbcHeader`](latent_dreamspace_bytecode::AsbcHeader) container (magic
/// `ASBC`, version 1, entity count, FNV-1a checksum over payload) —
/// fail-closed on magic/version/count/checksum/truncation/misalignment.
/// Zero-copy FFI (`entity_bytes_slice` / `entities_from_bytes`, the
/// SharedArrayBuffer/memmap2 contract, fail-closed on `len % 32` and base
/// 32-alignment) plus unaligned-safe `decode_one` for transport copies.
/// Soak-gated `latent_dreamspace_bytecode_ready` (32-byte layout + exact field
/// offsets, f16 round-trip tolerance, position/velocity quantization error
/// bounds, batch 10k = 320 KiB zero-copy round-trip, `.asbc` frame round-trip
/// + checksum, fail-closed corruption, deterministic cell-local hash, domain
/// clamping, tag masking, self-consistent hashes, zero-alloc hot loop with
/// `keep_capacity`, finite/bounded); AAA vectors (`bytecode_gpu_aaa_ready` /
/// `bytecode_network_aaa_ready` / `bytecode_compression_aaa_ready` /
/// `bytecode_ai_driven_aaa_ready` / `coins_ready` / `agones_ready` /
/// `quic_ready`) stay fail-closed. The wall-clock `measured_batch_read_micros`
/// is informational only and is **excluded** from the evidence fingerprint
/// (determinism honesty, documented in-module). 24-peer evidence distinctness
/// (23 prior incl. lb `celestial_orbital_dynamics`). Fingerprint seed
/// `lc_asbc` (`0x6C63_0000_0000_0001`).
pub mod latent_dreamspace_bytecode;

/// **R4-B — Aethel Latent Dreamspace · Micro-Sonho GPU Dream Pass** (letter
/// **ld**, doctrine #73 / Absolute Supremacy register S-20+ — R4 directive:
/// latent dreamspace brain). A real, deterministic **volumetric SDF dream
/// pass** that previews camera/light/impact composition on a 64³ (Standard) /
/// 128³ (High tier, Law XV `DREAM_TIER_HIGH_CAPABILITY=60`) grid BEFORE the
/// dream is applied to the live scene — the "dream before acting" substrate
/// that closes the latent-brain circuit (agent communicates by shared latent
/// geometry, not chat). The [`DreamScene`](micro_dream_gpu_pass::DreamScene)
/// **composes three real substrates with zero substrate editing**:
/// kq `sdf_contact_blending` solid distance + eo `stochastic_virtual_sdf`
/// analytic sphere (stochastic-field evidence via `mean_abs_error_vs_sphere`)
/// + dv `four_dimensional_time_sdf` time-morph (w-axis), fused with
/// `smooth_min(smooth_min(solid, meta), time)`. The pass runs under a
/// **deterministic cost budget** (`DREAM_DEFAULT_COST_BUDGET=300_000` nominal
/// 64³=262,144 cells fit; heavy 16-primitive scene overflows →
/// [`fill_into`](micro_dream_gpu_pass::fill_into) returns `budget_cut` and
/// `apply_dream_to_scene` is fail-closed — it NEVER applies a partial dream).
/// `elapsed_micros` is measured wall-clock but **excluded** from the evidence
/// fingerprint (determinism honesty, matching lc). A **real S-17 240 Hz
/// physics preview** (`PhysicsWorld::new` + `spawn_euphoria_torso_at` +
/// `step` ×10, double-run for bit-identical determinism via `fingerprint()`,
/// plus kinematic fall at `DEFAULT_FIXED_DT/DEFAULT_SUBSTEPS` = 1/240) and
/// camera/light/impact composition produce the impact preview — the 10 physics
/// ticks previewed before any real mutation. Soak-gated
/// `micro_dream_gpu_pass_ready` (64³ finite/bounded grid, kq+eo+dv scene
/// composition, budget fit/overflow fail-closed, physics-preview determinism
/// and stability, camera/light/impact finite, High tier = 128³, zero-alloc hot
/// loop with `keep_capacity`, soak determinism, probe match); AAA vectors
/// (`dream_culling_aaa_ready` / `dream_physics_aaa_ready` /
/// `dream_composition_aaa_ready` / `dream_network_aaa_ready` / `coins_ready` /
/// `agones_ready` / `quic_ready`) stay fail-closed. 25-peer evidence
/// distinctness (24 prior incl. lc `latent_dreamspace_bytecode`). Fingerprint
/// seed `ld_dream` (`0x6C64_0000_0000_0001`).
pub mod micro_dream_gpu_pass;

/// **R4-C — Aethel Latent Dreamspace · Tensor Holográfico de Cena** (letter
/// **le**, doctrine #73 / Absolute Supremacy register S-20+ — R4 directive:
/// latent dreamspace brain). Condenses a whole dream scene into a fixed-size
/// **256-value / 512-byte** `#[repr(C, align(64))]` latent vector that any
/// internal AI (Maestro / Fusion / Workforce) reads in **≤ 1 ms** with zero
/// deserialization — the **anti-laziness quality medium**: five deterministic
/// semantic families (Density / Tension / Occlusion / Light / Chaos) with
/// monotonic invariants (`tension` rises with energy, `occlusion` is monotonic
/// in density) mean a hollow scene fails the fitness gate and cannot commit;
/// [`similarity`](holographic_scene_tensor::HolographicSceneTensor::similarity)
/// is the market-grade comparison distance against the target tensor (Law XVI
/// Trava II fitness > 0.90 before any Yjs commit). Layout resolution
/// (documented in-module): the spec's "256 f32 / 512 bytes" is contradictory
/// (256 f32 = 1024 B), so the binding `size_of == 512 && align_of == 64` is
/// honored with **256 f16 values**, reusing the real
/// `latent_dreamspace_bytecode` `f32_to_f16`/`f16_to_f32` codec. Real
/// condensation via [`SceneSnapshot::from_dream_pass`](holographic_scene_tensor::SceneSnapshot::from_dream_pass)
/// composes the ld `micro_dream_gpu_pass` dream grid (`sample_nearest` /
/// `mean_dist` / `negative_ratio` / `cell_count`) with the kq `SdfScene` solid
/// spectrum — no mocks, no placeholder capsules. O(1) family reductions
/// (mean / max / RMS energy) allocate nothing; `as_bytes`/`from_bytes` give
/// zero-copy 512-byte FFI round-trips. Soak-gated
/// `holographic_scene_tensor_ready` (layout exact, five families sum to 256,
/// tension/occlusion monotonic, similarity self=0 / distinct>0, zero-copy
/// round trip, zero-alloc hot loop with `keep_capacity`, 1 ms read budget,
/// static/chaotic/live all finite, soak determinism, probe match); AAA vectors
/// (`tensor_condensation_aaa_ready` / `tensor_reduction_aaa_ready` /
/// `tensor_similarity_aaa_ready` / `tensor_serialization_aaa_ready` /
/// `coins_ready` / `agones_ready` / `quic_ready`) stay fail-closed. 26-peer
/// evidence distinctness (24 prior + lc `latent_dreamspace_bytecode` + ld
/// `micro_dream_gpu_pass`). Fingerprint seed `le_tensor`
/// (`0x6C65_0000_0000_0001`).
pub mod holographic_scene_tensor;

/// **R4-D — Aethel Latent Dreamspace · Multiverso Rollback Branching** (letter
/// **lf**, doctrine #73 / Absolute Supremacy register S-22+ — R4 directive:
/// latent dreamspace brain). The Dream Pass simulates **one** future; this
/// kernel simulates **four** divergent futures in parallel from an identical
/// S-22/g21 `RollbackJournal` parent checkpoint and selects the one with the
/// highest **Cinematic Tension Index (CTI)** — the branch-selection oracle for
/// the founder's "o sonho testa física/luz em 1ms" directive. Each future forks
/// from the same parent checkpoint (bit-identical body spawns + deterministic
/// drive), is driven by a policy-scaled command stream (Aggressive 3.0× /
/// Cautious 0.2× / Neutral 1.0× / Chaotic seeded ±2.0×), and is validated by a
/// rollback re-simulation that MUST reproduce its fingerprint bit-identically.
/// CTI = `clamp01(0.5·kin_norm + 0.25·delta_bits + 0.25·(1−prox_norm))` —
/// Aggressive is provably ranked above Cautious. Hard **2 ms** fail-closed
/// budget is a deterministic cost counter (never wall-clock — debug builds
/// would always cut a wall-clock 2 ms budget); overflow cuts future branches
/// honestly (fail-closed, no partial scan pretending to be complete). The
/// selected branch is committed after rolling back to the parent checkpoint so
/// the RollbackJournal authority stays intact. Soak-gated
/// `multiverse_rollback_branching_ready` (4/4 branches simulated, parent
/// checkpoint shared, rollback re-sim bit-identical, divergence detected,
/// outputs finite, CTI orders aggressive over cautious, budget respected,
/// parent rollback reproduces, g21 authority green, zero-alloc keep-capacity
/// hot loop, double-pass determinism, probe match); AAA vectors
/// (`multiverse_rollback_aaa_ready` / `multiverse_selection_aaa_ready` /
/// `multiverse_cti_aaa_ready` / `multiverse_re_sim_aaa_ready` / `coins_ready` /
/// `agones_ready` / `quic_ready`) stay fail-closed. 27-peer evidence
/// distinctness (24 prior + lc `latent_dreamspace_bytecode` + ld
/// `micro_dream_gpu_pass` + le `holographic_scene_tensor`). Fingerprint seed
/// `lf_multiverse` (`0x6C66_0000_0000_0001`).
pub mod multiverse_rollback_branching;

/// **R4-E — Aethel Latent Dreamspace · Synesthetic Resonance Matrix** (letter
/// **lg**, doctrine #73 / Absolute Supremacy register S-20+ — R4 directive:
/// latent dreamspace brain). The Dreamspace already carries **audio**, **light**
/// and **matter** as separate validated substrate soaks (dx
/// `synesthetic_sensory_remap` density→acoustic/radiation/tremor remap, jy
/// `living_sky_fluid_ocean_buoyancy` buoyancy/illumination, jv
/// `aethel_matter_model` fracture/debris); this kernel couples them through a
/// **3×3 cross-modal resonance matrix** — the cell
/// `gains[source][target][band]` says how much energy leaking from a source
/// channel resonantly elevates each frequency band (Low/Mid/High) of a target
/// channel (bass-heavy audio blooms light, an impact rings the acoustic sub,
/// mid-day light feeds thermal matter). 27 fixed deterministic coefficients;
/// a deterministic **attack/hold/release temporal envelope** (no wall-clock, no
/// RNG) shapes the injected energy; the resonance grid advances by
/// `clamp01(decay·prev + (1−decay)·env·Σ energies·gains)` — normalized form,
/// bounded steady state equal to the injected sum, single-source ordering
/// invariants (Audio→Light low-band dominance, Matter→Audio low-band
/// dominance, Light→Matter mid-band dominance) hold without saturation.
/// [`substrate_energies`](synesthetic_resonance_matrix::substrate_energies)
/// deterministically composes the three real soak reports into channel
/// energies (audio = acoustic gains, light = vacuum radiation + sky height,
/// matter = FEA failure + fracture debris) — no mocks. Soak-gated
/// `synesthetic_resonance_matrix_ready` (matrix cells stable, directional
/// structure, diagonal positive, off-diagonal coupling positive, envelope
/// deterministic/bounded/decaying, resonance drive bit-identical across runs,
/// non-finite energies fail-closed, substrate composition finite, zero-alloc
/// keep-capacity hot loop, peak bounded in unit, soak determinism, probe
/// match); AAA vectors (`matrix_resonance_aaa_ready` /
/// `cross_modal_metal_aaa_ready` / `live_chromesthesia_aaa_ready` /
/// `coins_ready` / `agones_ready` / `quic_ready`) stay fail-closed. 28-peer
/// evidence distinctness (24 prior + lc `latent_dreamspace_bytecode` + ld
/// `micro_dream_gpu_pass` + le `holographic_scene_tensor` + lf
/// `multiverse_rollback_branching`). Fingerprint seed `lg_synesthetic`
/// (`0x6C67_0000_0000_0001`).
pub mod synesthetic_resonance_matrix;

/// **R4-F — Aethel Latent Dreamspace · Antecipação de Gaze & Intenção** (letter
/// **lh**, doctrine #73 / Absolute Supremacy register S-20+ — R4 directive:
/// latent dreamspace brain). The Dreamspace brain does not only *react* to the
/// player — it **anticipates**: this kernel predicts where the eye is heading
/// up to **300 ms ahead** so the renderer, the cinematics and the UI can
/// pre-warm the foveal region and collapse irrelevant chrome *before* the
/// saccade lands. A deterministic **parabolic projection**
/// `p + v·t + ½·a·t²` with `t = 0.3s·clamp01(speed/6.0)` (never beyond 300 ms,
/// never beyond the finite domain) produces the future focal point; a
/// **3-phase intent classifier** (Fixation / Saccade / Anticipation, driven by
/// the real velocity + acceleration thresholds `0.4`/`2.0` and `20.0`/`600.0`)
/// labels the behavior — ballistic saccades are **fail-closed** (no
/// extrapolation, low confidence), sustained smooth pursuit is classified
/// Anticipation and gets the full look-ahead. Real substrate composition with
/// gt `gaze_foveated_reprojection`: the gt soak's `fovea_mean`/`periph_mean`
/// drive `focal_hint = clamp01(0.7·confidence + 0.3·fovea_mean)` (foveal
/// rendering hint, proving fovea dominance over periphery) and
/// `substrate_ready` requires `gaze_foveated_reprojection_ready &&
/// fovea_higher_than_periph`. **Honesty note (Anti-Hype / Anti-Mock)**: the
/// legacy `gaze_foveated_ui_collapse` file is a 17-line THEATER (commented
/// `println!` placeholders, no soak/fingerprint/evidence) — this kernel does
/// NOT trust it as a substrate; it implements the real deterministic
/// `ui_collapse_hint` (flow-state hides UI, hesitation/saccade surfaces
/// semantic tools) with its own evidence. Non-finite gaze samples are
/// fail-closed (invalid prediction, no extrapolation). Soak-gated
/// `gaze_intent_anticipation_ready` (300 ms look-ahead bound, static gaze
/// identity, velocity advances focal point in direction, sustained velocity
/// classified Anticipation, ballistic saccade low-confidence + non-extrapolated,
/// invalid gaze fail-closed, prediction finite/bounded, focal + UI hints in
/// unit interval, hesitation-aware UI, deterministic bit-identical replay,
/// zero-alloc keep-capacity hot loop, gt substrate ready + fovea dominance,
/// soak determinism, probe match); AAA vectors (`gaze_anticipation_aaa_ready` /
/// `intent_classification_aaa_ready` / `focal_hint_aaa_ready` /
/// `ui_collapse_aaa_ready` / `coins_ready` / `agones_ready` / `quic_ready`)
/// stay fail-closed. 29-peer evidence distinctness (24 prior + lc
/// `latent_dreamspace_bytecode` + ld `micro_dream_gpu_pass` + le
/// `holographic_scene_tensor` + lf `multiverse_rollback_branching` + lg
/// `synesthetic_resonance_matrix`). Fingerprint seed `lh_gaze`
/// (`0x6C68_0000_0000_0001`).
pub mod gaze_intent_anticipation;

/// **R4-G — Aethel Latent Dreamspace · Relógio de Tensão Narrativa** (letter
/// **li**, doctrine #73 / Absolute Supremacy register S-20+ — R4 directive:
/// latent dreamspace brain). The Dreamspace brain must *pace the story*, not
/// just render it: this kernel is a deterministic **0.1 Hz / 10 s harmonic
/// tension oscillator** — `tension_base(t) = 0.5 + 0.5·cos(TAU·(cycle−6.25)/10)`
/// peaks at 1.0 on the climactic instant (6.25 s, exact center of the Climax
/// phase) and falls to 0.0 in the calm — over a **4-phase narrative machine**
/// (Calmaria → Antecipação → Clímax → Resolução), each phase occupying exactly
/// `TENSION_PHASE_DURATION_S = 2.5 s` of the 10 s cycle. `tension_at(t,
/// envelope)` layers a bounded **event envelope** (`clamp01` of any cinematic /
/// combat beat) on top of the harmonic base. A stateful
/// [`NarrativeTensionClock`](narrative_tension_clock::NarrativeTensionClock)
/// integrates game time with **exponential impulse decay**
/// (`*= exp(−dt / TENSION_IMPULSE_DECAY_S)`, decay constant 2.0 s) so a player
/// action spikes tension that then relaxes toward the harmonic baseline —
/// fail-closed on invalid `dt` (no-op) and invalid impulses (ignored, counter
/// untouched). Pure coupling functions expose the Dreamspace wiring without
/// substrate soaks: [`tension_impulse_from_cti`](narrative_tension_clock::tension_impulse_from_cti)
/// scales lf's `selected_cti` (Multiverso branch confidence) into a tension
/// beat, and [`tension_impulse_from_dream`](narrative_tension_clock::tension_impulse_from_dream)
/// scales ld's micro-dream energy into a beat — both clamped to the unit
/// interval, monotonic, and deterministic. Soak-gated `narrative_tension_clock_ready`
/// (exact 10 s period, cyclic phase sequence, tension bounded in unit across a
/// full cycle, peak at climax center ≥ 0.999, minimum in calm ≤ 0.001, impulse
/// elevates + clamps tension, exponential decay, CTI + dream coupling bounded
/// and monotonic, invalid time/dt/impulse fail-closed, clock stays finite after
/// long drive, deterministic bit-identical replay, zero-alloc keep-capacity hot
/// loop, soak determinism, probe match); AAA vectors
/// (`narrative_clock_aaa_ready` / `tension_phase_machine_aaa_ready` /
/// `tension_impulse_aaa_ready` / `tension_coupling_aaa_ready` /
/// `coins_ready` / `agones_ready` / `quic_ready`) stay fail-closed. 30-peer
/// evidence distinctness (24 prior + lc `latent_dreamspace_bytecode` + ld
/// `micro_dream_gpu_pass` + le `holographic_scene_tensor` + lf
/// `multiverse_rollback_branching` + lg `synesthetic_resonance_matrix` + lh
/// `gaze_intent_anticipation`). Fingerprint seed `li_tension`
/// (`0x6C69_0000_0000_0001`).
pub mod narrative_tension_clock;

/// **R4-H — Aethel Latent Dreamspace · Memória de Matéria & Cicatrizes** (letter
/// **lj**, doctrine #73 / Absolute Supremacy register S-20+ — R4 directive:
/// latent dreamspace brain). The destruction substrates exist (kh
/// `composite_fracture_kernel` fractures concrete, ip2 `voronoi_destruction_3d`
/// shatters meshes, dw `mnemonic_matter_entropy` collapses off-screen matter),
/// but **none of them keeps persistent scar memory** — the world forgets the
/// damage it took. This kernel is the memory layer: a fixed-capacity
/// [`ScarMap`](matter_memory_scarring::ScarMap) maps a 64-bit `cell_hash` to a
/// [`ScarCell`](matter_memory_scarring::ScarCell) holding `accumulated_damage`
/// (the permanent, monotonic-non-decreasing record — **NEVER regenerates**),
/// `last_impact_time`, `severity` (the visible scar, faded exponentially with
/// half-life `SCAR_DECAY_HALF_LIFE_S = 60 s` but never below the memory floor
/// `0.25·accumulated_damage` — the world remembers), and `impact_count`.
/// `apply_impact` registers a scar, `scar_query` reads severity, `decay_scars`
/// fades it over time, and `hot_step` is the zero-alloc keep-capacity `.asbc`
/// hot path. **Zero Amnesia persistence**: binary serialization
/// (`SCAR_MAGIC 0x6C6A_534D | version | count | entry*` — 24-byte entries,
/// little-endian, bit-identical save/reload round-trip, fail-closed on
/// corruption). Real substrate composition via
/// [`substrate_scar_sources`](matter_memory_scarring::substrate_scar_sources):
/// entropy = `clamp01(0.6·dw.offscreen_drop + 0.4·(1 − clamp01(dw.mean_coherence_offscreen_final)))`,
/// fracture = `clamp01(0.6·clamp01(kh.fracture_fragments/256) + 0.3·clamp01(kh.debris_bodies_spawned/256) + 0.1·clamp01(kh.tip_displacement/0.1))`,
/// voronoi = `if ip2.shard_count > 0 { clamp01(ip2.active_fragments/ip2.shard_count) } else { 0.0 }`.
/// Soak-gated `matter_memory_scarring_ready` (impact registers damage; damage
/// accumulates — 2 impacts > 1; accumulated damage is capped in unit; severity
/// bounded in unit; decay fades severity but never zeroes memory; accumulated
/// damage never regenerates under any decay; severity converges to memory
/// floor; invalid cell hash/damage/dt fail-closed; capacity respected; all
/// cells finite after long drive; deterministic bit-identical replay; zero-alloc
/// keep-capacity hot loop; binary round-trip bit-identical; deserialize fails on
/// corruption; persistence survives save→clear→reload; substrate composition
/// finite and bounded; soak determinism; probe match); AAA vectors
/// (`matter_memory_aaa_ready` / `scar_map_aaa_ready` /
/// `persistence_aaa_ready` / `coins_ready` / `agones_ready` / `quic_ready`)
/// stay fail-closed. 31-peer evidence distinctness (24 prior + lc
/// `latent_dreamspace_bytecode` + ld `micro_dream_gpu_pass` + le
/// `holographic_scene_tensor` + lf `multiverse_rollback_branching` + lg
/// `synesthetic_resonance_matrix` + lh `gaze_intent_anticipation` + li
/// `narrative_tension_clock`). Fingerprint seed `lj_scar`
/// (`0x6C6A_0000_0000_0001`).
pub mod matter_memory_scarring;
