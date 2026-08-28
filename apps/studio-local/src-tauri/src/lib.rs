pub mod ambient_sensor_kernel;
pub mod auto_retopology_worker;
pub mod contracts;
pub mod daemon;
/// Unified SoA from `aethel-kernel-rust` (letter dc).
pub mod ecs_core;
/// Kernel foundation honesty IPC (letter dc — agents/tools probe).
pub mod kernel_foundation_honesty_wire;
pub mod ecs_parallel;
pub mod gameplay_ability_system;
/// GAS SAB byte-frame slot ring + binary 60Hz zero-copy IPC (Law I — no JSON in tick).
pub mod ipc;
/// S-12 Unified IPC surface — declarative ACL registry + single registration macro (round R2).
pub mod ipc_surface;
pub mod geometry_clusterizer;
pub mod gi_sdf;
pub mod jobs;
/// Kernel foundation IPC (letter dc surface; letter do web bridge).
/// WorldSoA + LBM desktop soak wire (letter de).
/// MutDNA + FrameArena desktop soak wire (letter df).
/// Timescale + Beer–Lambert + sonic desktop soak wire (letter dg).
/// WorldSoA SAB layout header wire (letter dh).
pub mod kernel_world_soa_sab_wire;
/// mmap ECS pager wire (letter di).
pub mod kernel_mmap_ecs_pager_wire;
/// SIMD clay math wire (letter dj).
pub mod kernel_simd_clay_math_wire;
/// SIMD → WorldSoA hot-path wire (letter dk).
/// BareMetalMemoryManager wire (letter dl).
pub mod kernel_baremetal_memory_manager_wire;
/// Slab allocator mmap wire (letter dm).
pub mod kernel_slab_allocator_mmap_wire;
/// Unified Field Network wire (letter dq).
pub mod kernel_unified_field_network_wire;
/// Autonomous Entropy Corrector wire (letter dr).
pub mod kernel_autonomous_entropy_corrector_wire;
/// Fractal Energy Perturbation wire (letter ds).
pub mod kernel_fractal_energy_perturbation_wire;
/// Non-Euclidean Curved Raymarcher wire (letter dt).
pub mod kernel_curved_raymarcher_wire;
/// Shadow Kernel Time Reversal wire (letter du).
pub mod kernel_shadow_time_reversal_wire;
/// Four-Dimensional Time SDF wire (letter dv).
pub mod kernel_four_dimensional_time_sdf_wire;
/// Mnemonic Matter Entropy wire (letter dw).
pub mod kernel_mnemonic_matter_entropy_wire;
/// Synesthetic Sensory Remap wire (letter dx).
pub mod kernel_synesthetic_sensory_remap_wire;
/// Autonomous Conflict Generator wire (letter dy).
pub mod kernel_autonomous_conflict_generator_wire;
/// Atmospheric Physical Damping wire (letter dz).
pub mod kernel_atmospheric_physical_damping_wire;
/// Position-Based Dynamics wire (letter ea).
pub mod kernel_position_based_dynamics_wire;
/// Hybrid Eulerian–Lagrangian PBD wire (letter eb).
pub mod kernel_hybrid_eulerian_lagrangian_pbd_wire;
/// Matter Thermodynamics SPH wire (letter ec).
pub mod kernel_matter_thermodynamics_sph_wire;
/// Aerodynamic Navier–Stokes wire (letter gv).
pub mod kernel_aerodynamic_navier_stokes_wire;
/// Lattice-Boltzmann fluid solver wire (letter ee).
pub mod kernel_lattice_boltzmann_gas_fluid_wire;
/// Acoustic Raytracing Echo wire (letter ef).
pub mod kernel_acoustic_raytracing_echo_wire;
/// Finite Element Analysis wire (letter eh).
pub mod kernel_finite_element_analysis_wire;
/// Acoustic Reverb Geometry wire (letter ei).
pub mod kernel_acoustic_reverb_geometry_wire;
/// FM / Additive Synthesis wire (letter ej).
pub mod kernel_fm_additive_synthesis_wire;
/// MetaSounds DSP Graph Compiler wire (letter jx).
pub mod kernel_metasounds_dsp_compiler_wire;
/// Acoustic Raytracing Solver wire (letter ka).
pub mod kernel_acoustic_raytracing_solver_wire;
/// Sound-Physics Duplex wire (letter kb) — AV/Render supremacy audit claim 2
/// (sound-as-force): blast energy -> radial overpressure -> real muscle PD
/// torque + real LBM dust entrainment + real Beer–Lambert extinction pulse.
pub mod kernel_sound_physics_duplex_wire;
/// Facial Performance wire (letter kc) — AV/Render supremacy audit claim 1
/// (character facial performance): spectral frame -> real articulatory phoneme
/// (F1/F2) -> viseme weights -> real vocal-muscle state -> real micro-saccade
/// gaze (20-80 Hz tremor, binocular divergence, blink, eyebrow) + real Lux SSS
/// + real multilingual retarget (JP14/FR18). Soak-gated `facialPerformanceReady`
/// distinct from ej/jx/ka/kb/ex/ei/ef/gw/gv/ew; facial_aaa_ready HELD. Substrate
/// 2026-08-14kc: missing 2π in the micro-tremor phase corrected with TAU.
pub mod kernel_facial_performance_wire;
/// Skin-Tension Wrinkle Map wire (letter kd) — AV/Render supremacy audit
/// claim 1 sub-surface (rhytides): extends the real strain_aware_texturing
/// (gs) substrate — real combined strain + whitening drive crease-curvature
/// wrinkle density, tension-deepened strength, a per-region mask
/// (forehead/crow's-feet/cheek/lip) and groove ambient occlusion. Soak-gated
/// `skinWrinkleMapReady` distinct from gs strainAwareTexturingReady +
/// ej/jx/ka/kb/kc/ex/ei/ef/gw/gv/ew; wrinkle_aaa_ready / ao_aaa_ready HELD.
pub mod kernel_skin_wrinkle_map_wire;
/// Facial Micro-Fluids wire (letter ke) — AV/Render supremacy audit claim 1
/// (character facial micro-fluids): real SPH tear-droplet pack on the real
/// matter_thermodynamics_sph substrate (Poly6 density incl. self-term,
/// pressure, viscosity, heat) anchored to a real PBD eyelid tetra
/// (volumetric_softbody_muscle_pbd); surface-tension-grade cohesion via
/// adhesion springs + DROPLET_REST_DENSITY 1.8071 (analytic natural packing,
/// neutral buoyancy) + DROPLET_PRESSURE_STIFFNESS 1.0 — the 2026-08-14ke fix
/// for the substrate's inverted-sign pressure vs its gas-default k=50. Soak
/// drops 5 drips under gravity (2.69 m/s, physical), holds adhesion at 0.061
/// < 0.5, evaporates dry film, preserves humid. Soak-gated
/// `facialMicroFluidsReady` distinct from matter SPH + PBD + gs/kd/kc/kb/ka/
/// ej/jx/ex/ei/ef/gw/gv/ew; microfluid_aaa_ready / tear_film_aaa_ready HELD.
pub mod kernel_facial_micro_fluids_wire;
/// GPU Strand Grooming wire (letter kf) — AV/Render supremacy audit (character
/// hair): real XPBD strand grooming on a real CPU strand substrate — stretch
/// composed on the real PositionBasedDynamics precolored XPBD substrate, bend =
/// exact discrete-curvature second-difference, twist = exact dihedral
/// plane-normal with chain-rule gradient, root-tangent pinned to the groomed
/// scalp normal; roots inv_mass-0 pinned, Verlet integration. Solver-stability
/// 2026-08-14kf: SOLVE_RELAX=0.7 position-update under-relaxation on bend/twist
/// only kills the overlapping-joint zigzag divergence (twist-only once drove
/// bend 0.0306→7.34; now bend 0.0062<0.0153 and twist 0.1085<0.2833). Soak-gated
/// `gpuStrandGroomingReady` distinct from hair TOY + PBD + gs/kd/kc/ke/kb/ka/
/// ej/jx/ex/ei/ef/gw/gv/ew; gpu_execution_verified / hair_gpu_aaa_ready /
/// hair_xpbd_aaa_ready / gpu_100k_claimed HELD.
pub mod kernel_gpu_strand_grooming_wire;
/// Spatio-Temporal Denoiser wire (letter kg) — AV/Render supremacy audit
/// (temporal stability & anti-ghosting): real SVGF/BMFR-lite that
/// honesty-corrects the path_traced_radiance_cascades (ip10) Tensor-Core
/// theater — temporal accumulation with motion-vector reprojection (nu
/// OOB_SENTINEL=-1.0 bilerp history sampling), SVGF first-moment
/// variance-adaptive blend alpha, depth-aware disocclusion rejection
/// (anti-ghosting), 3x3 neighborhood history clamp (gi pattern), edge-avoiding
/// cross-bilateral spatial pass; composes the real gt/gi/nu substrates with
/// zero substrate edits. RNG honesty 2026-08-14kg: LCG was returning [0,0.5)
/// (>>33 then /2^32) making soak noise biased (mean -amp/2); >>32 restored [0,1)
/// zero-mean noise and the fixture genuinely converges (mad 0.050->0.020 over
/// 24 frames). Soak-gated `spatioTemporalDenoiserReady` distinct from
/// gt/gi/nu/kf; neural_upscale_aaa_ready / full_restit_class_denoiser_aaa_ready
/// / gpu_execution_verified / dlss_ready / nanite_ready HELD.
pub mod kernel_spatio_temporal_denoiser_wire;
/// Composite Fracture + Rebar Bending wire (letter kh) — AV/Render supremacy
/// audit (destruction & structural physics): real reinforced-concrete beam =
/// rebar cage TrussMesh2D static FEA (finite_element_analysis_kernel eh) +
/// Voronoi 3D concrete fracture (voronoi_destruction_3d ip2, 8^3=512 chunks)
/// + Rapier debris (entropy_rapier_bridge erpb), composed on the real
/// substrates with zero substrate edits. Physics honest (root-caused across
/// three mesh redesigns, no gate weakened): top-node impact load (flexural
/// couple), asymmetric free bay (breaks the ux=0 mid-span symmetry that
/// nulled the bottom-chord strain — the bow-string failure), over-strong web
/// (anti-brittle-shear RC — bottom chord is the sole ductile fuse). Soak:
/// service elastic, overload yields the bottom chord, plastic hinge (EA x 0.2)
/// sheds 7.02e6->4.12e6 N, concrete crack (F - steel)/A_c 9.4e6 > 3e6 Pa
/// (3.1x margin), 512 Rapier debris bodies, COM 3.0->0.52 m, deterministic
/// replay. Soak-gated `compositeFractureReady` distinct from jv/erpb/ip2/eh;
/// chaos_destruction_aaa_ready / unreal_chaos_parity_ready / gpu_voronoi_ready
/// HELD.
pub mod kernel_composite_fracture_wire;
/// Latent Audio Adaptation wire (letter ki) — Passo 2 of the "Paradigma do
/// Áudio Latente (MetaSounds Supremacy)" + "A Sincronia Áudio-Visual" under the
/// Zero-MVP/Anti-Mock mandate: one cohesive kernel composing the closed real
/// substrates (jx/jw/gv/ex/dx/haptics/poetic) with zero substrate edits,
/// everything on the Espectro "Sólido vs Metamorfo" (Zero Imposição — the 3
/// Leis da Adaptação Universal, Doctrine #74 / S-27). S1 Foley Biomecânico
/// (jw gait cadence -> granular density + WOOD modal), S2 Ressonância de
/// Cavidade Helmholtz (analytic [80,400] Hz + gv neck-jet ns_step -> jx
/// lighthill_source_strength zero-copy -> GLASS ring; ns_active is honest
/// telemetry, not a ki gate — a coarse hot jet legitimately exceeds gv's
/// divergence bound while staying finite), S3 Trato Vocal Kelly–Lochbaum
/// (fatigue -> f0 117.19->93.75 Hz + breath 0.0114->0.0600), S4 Difração
/// Acústica SDF (ex blocked-sphere trans 0.0035 < 0.05, clear-path proof 1.0,
/// Keller split low/high 0.00325/0.000317 + poetic Portão de Sanidade), S5
/// Matriz Sinestésica (Fluid LOW -> FEET mask 0x01 + shake 0.3528, HIGH ->
/// HANDS mask 0x04 + chrom 0.591; Solid = identity passthrough). Soak-gated
/// `latentAudioReady` distinct from jx/jw/gv/ex/dx/kg/kh (single measured d,
/// evidence kind latent_audio_adaptation, seed KI_LAT/XOR LATA);
/// metasounds_full_aaa_ready / hrtf_aaa_ready / voice_synthesis_aaa_ready /
/// spatial_audio_aaa_ready / haptics_full_aaa_ready /
/// adaptive_morphing_aaa_ready / neural_physics_aaa_ready / gpu_audio_aaa_ready
/// HELD. J.11/J.12 STOPPED, backend only.
pub mod kernel_latent_audio_adaptation_wire;
/// Microfracture Acoustic Degradation wire (letter kj) — Passo 2 of the
/// "Paradigma do Áudio Latente (MetaSounds Supremacy)" + P2-GAS physics spine of
/// Launch Hard Gate #72: one cohesive kernel composing the closed real
/// substrates (ip2 voronoi_destruction_3d + jx ModalSynthesizer/RbjBiquad + erpb
/// entropy_rapier_bridge) with zero substrate edits, everything on the Espectro
/// "Sólido vs Metamorfo" (Zero Imposição — the 3 Leis da Adaptação Universal,
/// Doctrine #74 / S-27). Voronoi 6³ = 216 chunks (bisector count → microfracture
/// density ≈ 2025 m⁻³, beyond 64-chunk GPU toy floor, mass conserved) → fracture
/// ejection energy (23.04 m/s → trigger 0.795) strikes the CONCRETE modal
/// (early RMS 0.550 ≫ late 0.231, ring decays) → Solid = bit-exact identity
/// passthrough, Fluid = energy loss + 4000→800 Hz LowPass muffling (fresh RMS
/// 0.388 → 0.114, high-band 0.0527 → 0.0127) → debris → Rapier → 45 gravity
/// ticks (COM 3.0 → −0.43 m) → secondary impact re-trigger ring (0.602 ≫ 0).
/// Soak-gated `microfractureAcousticReady` distinct from ip2/erpb/kh/jx/ki
/// (evidence kind microfracture_acoustic_degradation, seed 0x4B4A_5F4D_4943);
/// chaos_destruction_aaa_ready / unreal_chaos_parity_ready / gpu_voronoi_ready /
/// physical_audio_aaa_ready / microfracture_acoustic_aaa_ready HELD.
/// J.11/J.12 STOPPED, backend only.
pub mod kernel_microfracture_acoustic_wire;
/// Mach-1 Sonic Boom Signature wire (letter kk) — Passo 2 of the
/// "Paradigma do Áudio Latente (MetaSounds Supremacy)" + P2-GAS physics spine of
/// Launch Hard Gate #72: one cohesive kernel composing the closed real
/// substrates (gv aerodynamic_navier_stokes + jx AeroAcoustic Lighthill
/// quadrupole proxy) with zero substrate edits, everything on the Espectro
/// "Sólido vs Metamorfo" (Zero Imposição — the 3 Leis da Adaptação Universal,
/// Doctrine #74 / S-27). Mach is input telemetry (no fake CFD — the gv
/// normalized grid cannot host real supersonic m/s under CFL); the CFL-safe
/// disturbance jet (u-step + v-shear scaled by M−1) runs at the substrate's
/// proven DEFAULT_* operating point (viscosity ON) — main grid_max_speed 0.719,
/// fast 1.78 (monotonic in Mach), anti-blowup `flow_response_bounded` gate.
/// Lighthill mean quadrupole proxy main 0.058 → fast 0.358. N-wave overpressure
/// closed form Δp = p_ref·K·(M²−1): main 891.66 Pa, fast 2533.13 Pa, subsonic
/// exactly 0; bilinear shock (finite rise → decay → −0.7Δp rarefaction →
/// recovery), positive RMS. Solid = bit-exact identity passthrough (no source
/// → Fluid == Solid), Fluid = AM morphing under Lighthill (gain
/// 1 + 0.6·lhill_norm·|turb|). Soak-gated `sonicBoomSignatureReady` distinct
/// from gv/jx/ki/kj (evidence kind mach1_sonic_boom_signature, seed
/// 0x4B4B_5F53_424D); sonic_boom_aaa_ready / full_cfd_aaa_ready /
/// gpu_cfd_aaa_ready / physical_audio_aaa_ready / supersonic_aeroacoustics_aaa_ready
/// HELD. J.11/J.12 STOPPED, backend only.
pub mod kernel_mach1_sonic_boom_signature_wire;
/// Subsurface Acoustic Scattering wire (letter kl) — Passo 2 of the
/// "Paradigma do Áudio Latente (MetaSounds Supremacy)" + P2-GAS physics spine of
/// Launch Hard Gate #72: one cohesive kernel composing the closed real
/// substrates (ex sdf_audio_raymarching SDF volumetric occlusion + ip12
/// strand_hair_subsurface_skin SSS mean-free-path → tissue acoustic opacity +
/// hair fringe + kd skin_wrinkle_map surface diffuse scatter on gs strain + jx
/// WOOD modal — soft-organic tissue resonance proxy) with zero substrate edits,
/// everything on the Espectro "Sólido vs Metamorfo" (Zero Imposição — the 3
/// Leis da Adaptação Universal, Doctrine #74 / S-27). Coherent transmission =
/// transmission·exp(−(σ/MFP)·path): dense tissue (MFP 0.4 mm) opaque vs
/// translucent (MFP 2.5 mm); wrinkle scatter only when wrinkled; hair-fringe
/// damp only with hair; jx modal rings only on a struck tissue volume
/// (solid_path > 0 && direct > 0.02), silent on a clear path. Solid =
/// deterministic band-limited strike identity; Fluid = direct·s + diffuse·
/// scatter through a gain-driven lowpass + jx modal ring — bit-identical to
/// Solid when the SDF path is clear (direct 1, diffuse 0, lowpass 1, modal
/// untriggered). Soak-gated `subsurfaceAcousticScatteringReady` distinct from
/// ip12/kd/ex/jx/kj/kk (evidence kind subsurface_acoustic_scattering, seed
/// 0x4B4C_5F53_5343); physical_audio / tissue_acoustics / meta_human_audio /
/// strand_hair_subsurface_skin / wrinkle / sdf_occlusion *_aaa_ready HELD.
/// J.11/J.12 STOPPED, backend only.
pub mod kernel_subsurface_acoustic_scattering_wire;
/// Hermite Duality Grid wire (letter ek).
pub mod kernel_hermite_duality_grid_wire;
/// Hermite Sharp Features wire (letter el).
pub mod kernel_hermite_sharp_features_wire;
/// SDF Sculptor wire (letter em).
pub mod kernel_sdf_sculptor_wire;
/// SDF Adaptive Cascades wire (letter en).
pub mod kernel_sdf_adaptive_cascades_wire;
/// Stochastic Virtual SDF wire (letter eo).
pub mod kernel_stochastic_virtual_sdf_wire;
/// SDF Octree Hashing wire (letter ep).
pub mod kernel_sdf_octree_hashing_wire;
/// SDF Motion Vector Buffer wire (letter eq).
pub mod kernel_sdf_motion_vector_buffer_wire;
/// Velocity Buffer ECS wire (letter er).
pub mod kernel_velocity_buffer_ecs_wire;
/// Hybrid Geometry SVO wire (letter es).
pub mod kernel_hybrid_geometry_svo_wire;
/// SVO Depth LOD wire (letter et).
pub mod kernel_svo_depth_lod_wire;
/// Internal Voxel Density wire (letter eu).
pub mod kernel_internal_voxel_density_wire;
/// Micro Displacement Noise wire (letter ev).
pub mod kernel_micro_displacement_noise_wire;
/// Volumetric Extinction Medium wire (letter ew).
pub mod kernel_volumetric_extinction_medium_wire;
/// SDF Audio Raymarching wire (letter ex).
pub mod kernel_sdf_audio_raymarching_wire;
/// Contextual Physics Override wire (letter ey).
pub mod kernel_contextual_physics_override_wire;
/// Dynamic Matter Entropy wire (letter ez).
pub mod kernel_dynamic_matter_entropy_wire;
/// Digital Pressure Chamber wire (letter fa).
pub mod kernel_digital_pressure_chamber_wire;
/// Geometric Scale Constraints wire (letter fb).
pub mod kernel_geometric_scale_constraints_wire;
/// Universal Logarithmic Scale wire (letter fc).
pub mod kernel_universal_logarithmic_scale_wire;
/// Sparse Seed Instancing wire (letter fd).
pub mod kernel_sparse_seed_instancing_wire;
/// Lock-free Ring Buffer wire (letter fe).
pub mod kernel_lockfree_ring_buffer_wire;
/// Atomic Thread Sync wire (letter ff).
pub mod kernel_atomic_thread_sync_wire;
/// CRDT Quantum Sync wire (letter fg).
pub mod kernel_crdt_quantum_sync_wire;
/// Delta Seed Synchronization wire (letter fh).
pub mod kernel_delta_seed_synchronization_wire;
/// State Sync Protocol wire (letter fi).
pub mod kernel_state_sync_protocol_wire;
/// Bitstream Reality Sync wire (letter fj).
pub mod kernel_bitstream_reality_sync_wire;
/// Binary Seed Streamer wire (letter fk).
pub mod kernel_binary_seed_streamer_wire;
pub mod kernel_cpu_affinity_micro_workers_wire;
/// Asynchronous Reality Threads wire (letter fm).
pub mod kernel_asynchronous_reality_threads_wire;
/// Thermal Scheduler wire (letter fn).
pub mod kernel_thermal_scheduler_wire;
/// Live Cache Manager wire (letter fo).
pub mod kernel_live_cache_manager_wire;
/// Hierarchical Streaming Cache wire (letter fp).
pub mod kernel_hierarchical_streaming_cache_wire;
/// Metabolic Memory wire (letter fq).
pub mod kernel_metabolic_memory_wire;
pub mod kernel_ghost_state_predictor_wire;
pub mod kernel_reversible_quantum_undo_wire;
/// Genomic Seed Library wire (letter ft).
pub mod kernel_genomic_seed_library_wire;
/// Genomic Seed Transmitter wire (letter fu).
pub mod kernel_genomic_seed_transmitter_wire;
/// Formal Logic Verifier wire (letter fv).
pub mod kernel_formal_logic_verifier_wire;
pub mod kernel_quantum_overlap_wire;
/// Blue Noise Dithering Relaxer wire (letter fx).
pub mod kernel_blue_noise_dithering_wire;
pub mod kernel_recursive_fractal_enhancement_wire;
/// Symmetric Vector Algebra wire (letter fz).
pub mod kernel_symmetric_vector_algebra_wire;
/// Voxel Cone Radiosity wire (letter ga).
pub mod kernel_voxel_cone_radiosity_wire;
/// Atmospheric Scattering Godrays wire (letter gb).
pub mod kernel_atmospheric_scattering_godrays_wire;
/// Dynamic Physics DSL wire (letter gc).
pub mod kernel_dynamic_physics_dsl_wire;
/// Chromatic Glass Refraction wire (letter gd).
pub mod kernel_chromatic_glass_refraction_wire;
/// Preintegrated SSS Transmittance wire (letter ge).
pub mod kernel_preintegrated_sss_transmittance_wire;
/// ACES Cinematic Tonemapper wire (letter gf).
pub mod kernel_aces_cinematic_tonemapper_wire;
/// Fluid Ninja Compute wire (letter gg).
pub mod kernel_fluid_ninja_compute_wire;
/// WGSL Surface Noise Kernel wire (letter gh).
pub mod kernel_wgsl_surface_noise_kernel_wire;
/// Infinite Anti-Aliasing wire (letter gi).
pub mod kernel_infinite_anti_aliasing_wire;
/// Spectral Dispersion Caustics wire (letter gj).
pub mod kernel_spectral_dispersion_caustics_wire;
/// Hybrid Cluster Shading VSVM wire (letter gk).
pub mod kernel_hybrid_cluster_shading_vsvm_wire;
/// Atmospheric Spine Particles wire (letter gl).
pub mod kernel_atmospheric_spine_particles_wire;
/// Radiance Cascades GI wire (letter gm).
pub mod kernel_radiance_cascades_gi_wire;
/// Alexa Cinematic Optics wire (letter gn).
pub mod kernel_alexa_cinematic_optics_wire;
/// Spectral Light Pipeline wire (letter go).
pub mod kernel_spectral_light_pipeline_wire;
/// Asset Color Appearance wire (letter ac) — composed spectral→PBR→WB→Planckian→ACES
/// over go × brdf × gr × ha × gf; probe `assetColorAppearanceReady` (compiled-only wire).
pub mod kernel_asset_color_appearance_wire;
/// Asset Spectral Radiance wire (letter lk) — unified final-display color authority:
/// ac direct + radiance-cascades GI + display WB + ACES; RT limitations vs Lumen owned
/// honestly; probe `assetSpectralRadianceReady` (compiled-only wire).
pub mod kernel_asset_spectral_radiance_wire;
/// Scalable Fidelity Blueprint wire (letter sf) — Law XV §1 feature-gating:
/// deterministic CapScore 0–100 → webgl2/integrated/discrete/enthusiast with
/// exact render graphs (how lighting works WITHOUT RT / on weak hardware);
/// probe `scalableFidelityReady` (compiled-only wire).
pub mod kernel_scalable_fidelity_wire;
/// Asset Quality Gate wire (letter bw) — autoridade determinística de QUALIDADE
/// MÁXIMA para assets gerados por IA (diretiva do Fundador: superior a
/// Meshy/Tripo/Unreal em qualidade topológica): manifesto completo por tier
/// (triângulos/VRAM KTX2 vs RGBA8/LoD/proxies/texels/proveniência) + grade de
/// topologia 0–100 (mínimos 60/80/90/95); probe `assetQualityGateReady`
/// (compiled-only wire).
pub mod kernel_asset_quality_gate_wire;
/// MSL → WGSL compiler wire (letter gp).
pub mod kernel_msl_wgsl_compiler_wire;
/// USD Importer Bridge wire (letter gq).
pub mod kernel_usd_importer_bridge_wire;
/// HDR 32-bit float pipeline wire (letter gr).
pub mod kernel_hdr_32bit_float_pipeline_wire;
/// Strain-Aware Texturing wire (letter gs).
pub mod kernel_strain_aware_texturing_wire;
/// Gaze-Foveated Reprojection wire (letter gt).
pub mod kernel_gaze_foveated_reprojection_wire;
/// wgpu WGSL device load wire (letter gu) — gp emit → create_shader_module.
pub mod kernel_wgpu_wgsl_device_load_wire;
/// SVO Terrain World Partition desktop wire (letter ip4) — camera-driven
/// identity-based hydrate/evict streaming, stateful per-frame tick command.
pub mod kernel_svo_terrain_world_partition_wire;
pub mod kernel_skeletal_rig_ragdoll_xpbd_wire;
pub mod kernel_voronoi_destruction_3d_wire;
pub mod kernel_micro_poly_cull_wire;
/// N5 — risk envelope IPC (drawdown / leverage / kill-switch; live trading hard-disabled).
pub mod kernel_risk_envelope_wire;
/// R3 — wire-reachability runtime telemetry (S-15): classifica cada wire ACTIVE
/// contra a superfície IPC real (`ipc_surface::acl_for`) — feed do registro S-01/S-11.
pub mod kernel_wire_reachability_wire;
/// R4 — PhysicsWorld solver-bank parity (S-17, letter s17): oito solvers
/// (PBD/XPBD/SPH/SPH-hash/FEA/NS/LBM/softbody) sob o SimulationClock 240 Hz
/// compartilhado, soak fail-closed de paridade golden×live espelhado da
/// autoridade CW3 — flags Chaos/GGPO/Euphoria AAA sempre HELD.
pub mod kernel_physics_world_solvers_wire;
/// R1.3 — Task Graph Dependency System parity (S-3 Sequencing backend substrate,
/// letter jt): DAG de dependências de sistemas de jogo — topo-sort Kahn
/// determinístico (tie-break por id ascendente), wavefronts paralelos de
/// longest-path (`level_count` / `max_parallel_width` exatos), detecção de ciclo
/// fail-closed devolvendo a amostra concreta, dedup de arestas invariante à
/// ordem de inserção e hot loop zero-alloc (rayon + XOR-fold de hashes puros)
/// com fingerprint paralelo×sequencial bit-idêntico; soak fail-closed espelhado
/// da autoridade do kernel — flags DOTS/Unreal TaskGraph AAA sempre HELD.
pub mod kernel_task_graph_scheduler_wire;
/// R1.4 — Spatial Partition + Cell Hibernation Broadphase parity (S-11/S-15
/// backend substrate, letter hg): grid 3D uniforme determinístico (spatial hash
/// open-addressing, célula única por body via centro de AABB) com hibernação de
/// células — bodies lentos dormem após o limiar, célula dorme quando todos
/// dormem, wake-on-demand + wake-on-contact (contador real de reacendimento),
/// pares emitidos só das células acordadas bit-idênticos ao brute-force em frame
/// 0 colapsando para {(2,3)} em frame 30 e reexpandindo pós wake_body(0); hot
/// loop zero-alloc; soak fail-closed espelhado da autoridade do kernel — flags
/// Chaos/PhysX-Sleeping/GPU-broadphase AAA sempre HELD.
pub mod kernel_spatial_partition_hibernation_wire;
/// R1.5 — Non-Linear Timeline Sequencing parity (S-3 Sequencing tool backend,
/// letter ju): avaliador determinístico de timeline não-linear (tracks,
/// keyframes, interpolação Step / Linear / Catmull-Rom uniforme) com validação
/// fail-closed (keyframes desordenados/duplicados/NaN rejeitados), clamp fora do
/// intervalo autorado e composição real através do in-engine zero-loss compositor
/// (ProRes 4444 / EXR 16-bit float / spectral stream); replay de 241 frames com
/// spot-checks closed-form; soak fail-closed espelhado da autoridade do kernel —
/// flags Sequencer/After Effects/Nuke AAA sempre HELD.
pub mod kernel_sequencing_timeline_wire;
/// R2-A — SDF Contact Blending parity (S-11/S-15 backend substrate, letter kq):
/// contato suave determinístico — smooth_min polinomial (Quílez), contact factor
/// smoothstep dos dois signed distances mais próximos, soft contact shadow
/// estilo UE5 (K*d/t) com marcher degenerado fail-closed e ContactMap2D
/// determinístico (≤4096 células); soak de 64 ticks medido espelhando a
/// autoridade do kernel — flags Chaos/UE5-contact-shadow/Nanite AAA sempre HELD.
pub mod kernel_sdf_contact_blending_wire;
/// R2-B — Micro-shadows & Bent Normals parity (S-11/S-15 backend substrate,
/// letter kr): oclusão micro-shadow por ray/sphere closed-form (vis bounded
/// `[1-STRENGTH, 1]` monotônico em t, self-shadow removido), bent normal por
/// amostragem hemisférica cosine-weighted estratificada com jitter hash
/// determinístico por célula e fallback geométrico fail-closed, BentNormalGrid
/// (≤4096 células) de estatísticas bend/visibility; soak de 64 ticks medido
/// espelhando a autoridade do kernel — flags micro-shadow/UE5-RT/Nanite AAA
/// sempre HELD.
pub mod kernel_micro_shadow_bent_normals_wire;
/// R2-C — Dynamic Surface Deformation parity (S-11/S-15 backend substrate,
/// letter ks): deformação de superfície volume-conservante por kernel LoG 2D
/// (Laplaciano de Gaussiano — integral de plano exatamente zero por teorema da
/// divergência, dent pareada com rim de igual magnitude), campo SoA
/// height/velocity/permanent com plasticidade pós-yield e spring-damper
/// monotônico (amortecimento exponencial, energia total nunca cresce); soak de
/// 480 ticks medido espelhando a autoridade do kernel — flags
/// dynamic-surface/Chaos-softbody/World-Shatter/Nanite AAA sempre HELD.
pub mod kernel_dynamic_surface_deformation_wire;
/// R2-D — Async Compute Scheduler parity (S-11/S-15 backend substrate, letter
/// kt): escalonador de compute async com atribuição de waves por caminho
/// crítico (relaxação longest-path, monotonia de dependência wave[to] >
/// wave[from], ciclos/profundidade > max_waves falham fail-closed), timeline
/// de fences contígua e gap-free, overlap medido de engines (compute 0 +
/// transfer 1 na mesma wave), backing por anel de buffers determinístico
/// (bytes_resident <= bytes_capacity), hot loop zero-alloc em slabs SoA
/// pré-alocados; soak de 256 submits espelhando a autoridade do kernel — flags
/// async-compute/Vulkan/DX12/Metal/Nanite AAA sempre HELD.
pub mod kernel_async_compute_scheduler_wire;
/// R2-I — Auto Photography Director parity (S-11/S-15 backend substrate, letter
/// kw): diretor de cinematografia determinístico — rule engine com 6 regras de
/// forma fechada (Rule of Thirds, Headroom, Lead Room, Rule 180, Lens Focal
/// Length, Camera Height) que posiciona o sujeito em `DirectedCameraShot`
/// compliant (pesos normalizados somando 1.0), composto sobre o R1.5
/// `sequencing_timeline` (`compose_cinema_frame` — edge R2-I→ju). **Trava Lei
/// XVI:** toda mutação de `RuleBook` e todo `direct`/`configure`/`set_rule`
/// exigem `CreativeFusionTransaction` aberta (begin/commit/rollback fail-closed,
/// espelho Rust da Trava web) — soak determinístico espelhando a autoridade do
/// kernel — flags auto-photography/cinematography-AI/virtual-production AAA
/// sempre HELD.
pub mod kernel_auto_photography_director_wire;
/// R2-J — Cinema Frame-Graph Depth Composition parity (S-11/S-15 backend
/// substrate, letter kx): consolida lente/cinema DENTRO do `WgpuFramegraph` real
/// com zero edits — shot do diretor R2-I (distância focal) → passes
/// Depth→CoC→LensDof(ACES)→AcesTonemap→Composite + 1 pass não-usada; VERIFY
/// DEPTH (profundidade viva pós-culling, CoC finito/limitado/zero-no-focal/
/// monotônico, executed==live==4, pass não-usada culled); Trava Lei XVI (reusa a
/// `CreativeFusionTransaction` do R2-I) — flags cinema-frame-graph/DOF/prores-export
/// AAA sempre HELD.
pub mod kernel_cinema_frame_graph_composition_wire;
/// R2-K — Cinema Hot-Loop Composition parity (S-11/S-15 backend substrate, letter
/// ky): composição render-graph wgpu desktop no hot loop nativo — pré-cozinha
/// determinística de 5 keys de composição cinema (DepthToCoc→LensDof→AcesTonemap→
/// Composite + 1 pass culled `Unused`) no PSO Vault do R2-E (km); hot loop 4096×4
/// com **zero PSO misses** (`vault_miss_count == 0`, hit-rate 1.0); compõe via
/// `ComposeCinemaFrameGraph` (R2-J kx) com Trava Lei XVI; soak determinístico
/// espelhando a autoridade do kernel — flags PSO prewarm/stutter-free/async-compile/
/// disk-cache + cinema AAA sempre HELD.
pub mod kernel_cinema_hot_loop_composition_wire;
/// R2-E — Dynamic Shader Rewriter PSO Vault parity (S-11/S-15 backend substrate,
/// letter km): cozinha determinística de PSOs (pipeline-state cache) com
/// enumeração de permutações 12-bit, vault ordenado de 8192 slots com hit-rate
/// medida e soak espelhando a autoridade do kernel — flags
/// pso-stutter-free/async-compile/disk-pipeline-cache/Nanite AAA sempre HELD.
pub mod kernel_dynamic_shader_rewriter_wire;
/// R2-F — Euphoria Balance Controller parity (S-11/S-15 backend substrate, letter
/// ko): capture-point (Pratt) wired no `PhysicsWorld::step` — CoM sync 1:1 com a
/// massa física (75 kg), hand-plant, fall recovery, foot placement e soak
/// determinístico espelhando a autoridade do kernel — flags
/// euphoria-full/UE5-active-ragdoll/Chaos-physics/Nanite AAA sempre HELD.
pub mod kernel_euphoria_balance_controller_wire;
/// R2-G — World Forge Densification parity (S-11/S-15 backend substrate, letter
/// ku): densificação determinística de World Forge composta sobre o grid R1.4
/// (`spatial_partition_hibernation`) como autoridade — sweep de células de chão
/// com PRNG derivado de semente, rejeição por min-spacing, raios/stiffness por
/// kind (grass/bush/tree/rock), build zero-alloc SoA pré-alocado; edges
/// R2-G→R1.4 (paridade de broadphase) e R2-G→R2-A (contato SDF composto) e
/// R2-G→R2-H (payload de rest para wind field) — flags nanite-density/PCG-GPU/
/// World-Forge/Nanite AAA sempre HELD.
pub mod kernel_world_forge_densification_wire;
/// R2-H — Wind Field Dynamics parity (S-11/S-15 backend substrate, letter kv):
/// dinâmica de vento determinística (grid trilinear, gust envelope, turbulência
/// clampada) que dobra a vegetação/grama do R2-G via `BendPayload` (edge
/// R2-G→R2-H), advecção escalar semi-Lagrangiana CFL-guarded e envelope de vento
/// HRTF-ready (parameter producer) — flags wind-simulation/gust-wave/advection/
/// audio-HRIR/wind-audio/chaos/live-weather AAA sempre HELD.
pub mod kernel_wind_field_dynamics_wire;
/// R8 — Aethel Matter Model parity (S-23, letter jv): modelo unificado de
/// matéria fase-consciente (SPH melt/flow, LBM gas buoyancy, XPBD solid/soft,
/// FEA stress, Voronoi fracture → Rapier debris) com histerese direcional,
/// soak fail-closed espelhado da autoridade do kernel — flags Chaos/phase-field/
/// MD/GPU AAA sempre HELD.
pub mod kernel_aethel_matter_model_wire;
/// R9 — Living-Sky Fluid + Ocean Buoyancy parity (S-25, letter jy): acoplamento
/// bidirecional céu/oceano — grid espectral de ondas SoA 32×16, Archimedes
/// buoyancy, wave-slope advection, vertical skin drag, wakes bidirecionais;
/// soak fail-closed espelhado da autoridade do kernel — flags full-SPH ocean/
/// GPU ocean/FFT/Chaos/neural AAA sempre HELD.
pub mod kernel_living_sky_fluid_ocean_buoyancy_wire;
/// R10 — Procedural Muscle Locomotion parity (S-24, letter jw): gaita bipedal
/// IK-free emergente de CPG phase oscillator + cadeias de impulso de ativação
/// muscular + substrato XPBD de tendão real (Law III — Euphoria); soak
/// fail-closed espelhado da autoridade do kernel — flags IK/GA/Euphoria/GPU
/// AAA sempre HELD.
pub mod kernel_procedural_muscle_locomotion_wire;
/// R3-A — Vehicle Chassis Dynamics parity (S-17 spine, letter kz): chassis
/// veicular flexível (não car-only — suporta monstros/cavalos/qualquer montaria)
/// — suspensão spring-damper + anti-roll bar, diferencial aberto/torque-vectoring,
/// Ackermann inner/outer, frenagem bounded, terreno irregular rastreado, hot loop
/// zero-alloc keep-capacity e rollback replay bit-idêntico no spine S-17
/// determinístico; soak fail-closed espelhado da autoridade do kernel — flags
/// chassis-ragdoll/tire-grip/wheel-suspension/drift-model AAA sempre HELD.
pub mod kernel_vehicle_chassis_dynamics_wire;
/// R3-B — Flight Aerodynamics parity (S-17 spine, letter la): aerodinâmica
/// configurável (AerofoilConfig/AircraftConfig — flexível para qualquer corpo
/// voador) — lift/drag polar parabólico, stall peak-and-falloff, ISA atmosphere,
/// trim angle-of-attack, momentos de superfície de controle (elevador/aileron/
/// leme), acoplamento de vento (tailwind/headwind), hot loop zero-alloc
/// keep-capacity e rollback replay bit-idêntico no spine S-17 determinístico;
/// soak fail-closed espelhado da autoridade do kernel — flags
/// aerobatics/propwash/control-authority/stall-spin AAA sempre HELD.
pub mod kernel_flight_aerodynamics_wire;
/// R3-C — Celestial Orbital Dynamics parity (S-17 spine, letter lb): dinâmica
/// orbital/celeste configurável (BodyTable de corpos, Kepler universal variable)
/// — propagação universal-variable, elementos↔estado round-trip lossless, SOI
/// (patched conic), microgravidade sem thrust, impulso RCS delta-v exato, escape
/// positivo/hiperbólico, hot loop zero-alloc keep-capacity e rollback replay
/// bit-idêntico no spine S-17 determinístico; soak fail-closed espelhado da
/// autoridade do kernel — flags rcs/orbital-maneuver/n-body/atmosphere-drag AAA
/// sempre HELD.
pub mod kernel_celestial_orbital_dynamics_wire;
/// R4 — Latent Dreamspace Spatial Bytecode `.asbc` wire (letter lc): entidades
/// de 32 bytes zero-copy, quantização f16, spatial hash FNV-1a, decode
/// fail-closed, hot loop zero-alloc keep-capacity — flags
/// bytecode-gpu/network/compression/ai-driven AAA sempre HELD.
pub mod kernel_latent_dreamspace_bytecode_wire;
/// R4 — Micro-Dream GPU Pass wire (letter ld): grid SDF 64³ (tier High 128³),
/// composição kq/EO/DV, physics/camera/light/impact previews determinísticos,
/// budget-cut overflow fail-closed — flags dream-gpu-async/physics/lighting/
/// ai-driven AAA sempre HELD.
pub mod kernel_micro_dream_gpu_pass_wire;
/// R4 — Holographic Scene Tensor wire (letter le): tensor 512B/64-align, 5
/// famílias somando exatamente 256 valores u16, tensão/oclusão/similaridade
/// determinísticas, zero-copy round-trip — flags tensor-condensation/reduction/
/// similarity/serialization AAA sempre HELD.
pub mod kernel_holographic_scene_tensor_wire;
/// R4 — Multiverse Rollback Branching wire (letter lf): 4 branches sobre
/// checkpoint pai compartilhado, CTI ordering, budget-cut, re-sim rollback
/// bit-idêntico — flags multiverse-rollback/selection/cti/re-sim AAA sempre HELD.
pub mod kernel_multiverse_rollback_branching_wire;
/// R4 — Synesthetic Resonance Matrix wire (letter lg): matriz 3×3 canais
/// audio/light/matter × bandas low/mid/high, envelope determinístico, ganhos em
/// unidade — flags matrix-resonance/cross-modal-metal/live-chromesthesia AAA
/// sempre HELD.
pub mod kernel_synesthetic_resonance_matrix_wire;
/// R4 — Gaze & Intent Anticipation wire (letter lh): look-ahead ≤300ms,
/// classificação saccade/fixação fail-closed, focal hint e ui-collapse
/// determinísticos — flags gaze-anticipation/intent-classification/focal-hint/
/// ui-collapse AAA sempre HELD.
pub mod kernel_gaze_intent_anticipation_wire;
/// R4 — Narrative Tension Clock wire (letter li): oscilador 0.1Hz com phase
/// machine calmaria→antecipação→clímax→resolução, impulsos de tensão com decay
/// exponencial, acoplamento CTI/Dream — flags narrative-clock/tension-phase-
/// machine/tension-impulse/tension-coupling AAA sempre HELD.
pub mod kernel_narrative_tension_clock_wire;
/// R4 — Matter Memory & Scarring wire (letter lj): ScarMap persistente
/// fail-closed, decay sem regeneração, composição dw/kh/ip2, binary round-trip
/// bit-idêntico — flags matter-memory/scar-map/persistence AAA sempre HELD.
pub mod kernel_matter_memory_scarring_wire;
/// R20 orphan-compile resolution (2026-08-11): 9 kernel desktop wires wired into
/// the library crate so the orphan-prune gate (CW7) stops flagging them. All 9
/// are backed by `aethel-kernel-rust` modules (7 pre-declared; materialx_bridge
/// + openvdb_bridge newly wired into the kernel crate in the same pass).
pub mod kernel_anisotropic_neural_microfacets_wire;
pub mod kernel_materialx_bridge_wire;
pub mod kernel_nanite_micropolygon_compute_rasterizer_wire;
pub mod kernel_neural_physics_co_sim_wire;
pub mod kernel_openvdb_bridge_wire;
pub mod kernel_rollback_netcode_engine_wire;
pub mod kernel_semantic_light_leak_wire;
pub mod kernel_thermal_spectral_gi_wire;
pub mod kernel_usd_universal_exporter_wire;
pub mod kernel_virtual_shadow_maps_vsm_wire;
pub mod native_kernel;
pub mod onnx_native_gen;
pub mod physics_kernel;
/// Plugin sandbox IPC — fail-closed HELD (P2b BLOCKER 12). No fake telemetry.
pub mod plugin_sandbox;
pub mod wasm_shield;
pub mod rendering_quarantine;
pub mod policy;
pub mod probe;
pub mod runtime_engine;
pub mod sidecars;

#[cfg(test)]
mod tests {
    use std::fs;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    use crate::contracts::RuntimeJobRequest;
    use crate::contracts::{
        LocalRuntimeAssetTool, LocalRuntimeMediaTool, LocalRuntimeRendererBackend,
        LocalRuntimeShaderTool, LocalRuntimeToolchainFeature, RuntimeExecutionTarget,
        RuntimeJobLane, RuntimeJobState, StoragePressure, ThermalState,
    };
    use crate::jobs::RuntimeJobStore;
    use crate::native_kernel::{
        build_native_kernel_manifest, validate_native_kernel_manifest, NativeKernelState,
        AVAILABLE_CAPABILITY_IDS,
    };
    use crate::policy::resolve_runtime_target;
    use crate::probe::build_probe_from_signals;
    use crate::runtime_engine::{
        build_local_wgpu_probe_contract, build_local_wgpu_render_contract,
    };
    use crate::sidecars::{build_sidecar_capability_manifest, missing_required_sidecars};

    #[test]
    fn strong_device_routes_heavy_jobs_to_local_native() {
        let probe = build_probe_from_signals(
            "test-device",
            true,
            true,
            16_384,
            ThermalState::Nominal,
            StoragePressure::Ok,
        );
        let decision = resolve_runtime_target(&probe, RuntimeJobLane::ViewportRender);
        assert_eq!(decision.target, RuntimeExecutionTarget::LocalNative);
        assert!(decision.can_start);
    }

    #[test]
    fn weak_device_routes_heavy_jobs_to_cloud_sandbox() {
        let probe = build_probe_from_signals(
            "test-device",
            false,
            false,
            2_048,
            ThermalState::Nominal,
            StoragePressure::Ok,
        );
        let decision = resolve_runtime_target(&probe, RuntimeJobLane::RenderQueue);
        assert_eq!(decision.target, RuntimeExecutionTarget::CloudSandbox);
        assert!(decision.can_start);
    }

    #[test]
    fn critical_thermal_state_holds_work() {
        let probe = build_probe_from_signals(
            "test-device",
            true,
            true,
            32_768,
            ThermalState::Critical,
            StoragePressure::Ok,
        );
        let decision = resolve_runtime_target(&probe, RuntimeJobLane::AiLocalInference);
        assert_eq!(decision.target, RuntimeExecutionTarget::Held);
        assert!(!decision.can_start);
    }

    #[test]
    fn render_queue_without_ffmpeg_routes_to_cloud_sandbox() {
        let mut probe = build_probe_from_signals(
            "test-device",
            true,
            true,
            32_768,
            ThermalState::Nominal,
            StoragePressure::Ok,
        );
        probe.ffmpeg_available = false;
        probe
            .local_toolchain
            .retain(|feature| feature.as_str() != "ffmpeg");

        let decision = resolve_runtime_target(&probe, RuntimeJobLane::RenderQueue);

        assert_eq!(decision.target, RuntimeExecutionTarget::CloudSandbox);
        assert!(decision.requires_human_approval);
        assert!(decision.reason.contains("FFmpeg"));
    }

    #[test]
    fn ai_local_inference_without_execution_provider_routes_to_cloud_sandbox() {
        let mut probe = build_probe_from_signals(
            "test-device",
            false,
            false,
            32_768,
            ThermalState::Nominal,
            StoragePressure::Ok,
        );
        probe.onnx_runtime_available = false;
        probe.direct_ml_available = false;
        probe.web_nn_available = false;
        probe.ai_execution_providers.clear();

        let decision = resolve_runtime_target(&probe, RuntimeJobLane::AiLocalInference);

        assert_eq!(decision.target, RuntimeExecutionTarget::CloudSandbox);
        assert!(decision.reason.contains("AI execution provider"));
    }

    #[test]
    fn viewport_render_without_native_graphics_routes_to_cloud_sandbox() {
        let mut probe = build_probe_from_signals(
            "test-device",
            false,
            false,
            32_768,
            ThermalState::Nominal,
            StoragePressure::Ok,
        );
        probe.gpu_available = false;
        probe.web_gpu_available = false;
        probe.native_graphics_backends.clear();

        let decision = resolve_runtime_target(&probe, RuntimeJobLane::ViewportRender);

        assert_eq!(decision.target, RuntimeExecutionTarget::CloudSandbox);
        assert!(decision.reason.contains("native graphics backend"));
    }

    #[test]
    fn browser_operator_without_browser_runtime_routes_to_approved_sandbox() {
        let mut probe = build_probe_from_signals(
            "test-device",
            true,
            true,
            32_768,
            ThermalState::Nominal,
            StoragePressure::Ok,
        );
        probe.browser_automation_available = false;
        probe
            .local_toolchain
            .retain(|feature| feature.as_str() != "browser-automation");

        let decision = resolve_runtime_target(&probe, RuntimeJobLane::BrowserOperator);

        assert_eq!(decision.target, RuntimeExecutionTarget::CloudSandbox);
        assert!(decision.requires_human_approval);
        assert!(decision.reason.contains("browser automation"));
    }

    #[test]
    fn sidecar_manifest_reports_renderer_and_physics_capabilities() {
        let probe = build_probe_from_signals(
            "test-device",
            true,
            true,
            32_768,
            ThermalState::Nominal,
            StoragePressure::Ok,
        );
        let manifest = build_sidecar_capability_manifest(&probe);

        assert!(manifest
            .iter()
            .any(|entry| entry.kind.as_str() == "wgpu-renderer" && entry.available));
        assert!(manifest
            .iter()
            .any(|entry| entry.kind.as_str() == "rapier-physics" && entry.available));
    }

    #[test]
    fn local_probe_reports_runtime_engine_spine_fields() {
        let probe = build_probe_from_signals(
            "test-device",
            true,
            true,
            32_768,
            ThermalState::Nominal,
            StoragePressure::Ok,
        );

        assert!(probe.supports_offscreen_render);
        assert!(probe
            .renderer_backends
            .contains(&LocalRuntimeRendererBackend::WgpuNative));
        assert!(probe.media_tools.iter().all(|tool| matches!(
            tool,
            LocalRuntimeMediaTool::Ffmpeg | LocalRuntimeMediaTool::Ffprobe
        )));
        assert!(probe.asset_tools.iter().all(|tool| matches!(
            tool,
            LocalRuntimeAssetTool::GltfTransform
                | LocalRuntimeAssetTool::Meshoptimizer
                | LocalRuntimeAssetTool::KtxSoftware
                | LocalRuntimeAssetTool::Basisu
                | LocalRuntimeAssetTool::OpenUsd
                | LocalRuntimeAssetTool::BlenderHeadless
                | LocalRuntimeAssetTool::RecastDetour
                | LocalRuntimeAssetTool::OzzAnimation
                | LocalRuntimeAssetTool::UnrealExportBridge
                | LocalRuntimeAssetTool::UnityExportBridge
                | LocalRuntimeAssetTool::GodotExportBridge
        )));
        assert!(probe.shader_tools.iter().all(|tool| matches!(
            tool,
            LocalRuntimeShaderTool::Naga
                | LocalRuntimeShaderTool::WgslValidator
                | LocalRuntimeShaderTool::Shaderc
                | LocalRuntimeShaderTool::Dxc
        )));
        assert!(probe.local_toolchain.iter().all(|tool| matches!(
            tool,
            LocalRuntimeToolchainFeature::Ffmpeg
                | LocalRuntimeToolchainFeature::Ffprobe
                | LocalRuntimeToolchainFeature::Rapier
                | LocalRuntimeToolchainFeature::BrowserAutomation
                | LocalRuntimeToolchainFeature::AssetOptimizer
                | LocalRuntimeToolchainFeature::ShaderCompiler
                | LocalRuntimeToolchainFeature::Meshoptimizer
                | LocalRuntimeToolchainFeature::KtxSoftware
                | LocalRuntimeToolchainFeature::Basisu
                | LocalRuntimeToolchainFeature::OpenUsd
                | LocalRuntimeToolchainFeature::BlenderHeadless
                | LocalRuntimeToolchainFeature::WgpuNative
                | LocalRuntimeToolchainFeature::RecastDetour
                | LocalRuntimeToolchainFeature::ZigToolchain
                | LocalRuntimeToolchainFeature::ZigCCompiler
                | LocalRuntimeToolchainFeature::OzzAnimation
                | LocalRuntimeToolchainFeature::UnrealExportBridge
                | LocalRuntimeToolchainFeature::UnityExportBridge
                | LocalRuntimeToolchainFeature::GodotExportBridge
        )));
    }

    #[test]
    fn viewport_render_without_offscreen_support_routes_to_cloud_sandbox() {
        let mut probe = build_probe_from_signals(
            "test-device",
            true,
            true,
            32_768,
            ThermalState::Nominal,
            StoragePressure::Ok,
        );
        probe.supports_offscreen_render = false;
        probe.renderer_backends.clear();

        let decision = resolve_runtime_target(&probe, RuntimeJobLane::ViewportRender);

        assert_eq!(decision.target, RuntimeExecutionTarget::CloudSandbox);
        assert!(decision.reason.contains("native graphics backend"));
    }

    #[test]
    fn local_wgpu_contracts_are_bounded_and_evidence_first() {
        let probe_contract = build_local_wgpu_probe_contract();
        assert_eq!(probe_contract.kind, "aethel.wgpu.probe");
        assert!(probe_contract.no_downloads);
        assert!(probe_contract.no_main_thread);
        assert!(probe_contract.manual_consent_only);
        assert!(probe_contract.benchmark_max_duration_ms <= 750);

        let render_contract = build_local_wgpu_render_contract(
            "project-native-render",
            "render-final-a",
            "2026-05-14T14:00:00.000Z",
            60,
        );
        assert_eq!(render_contract.kind, "aethel.wgpu.render");
        assert_eq!(
            render_contract.idempotency_key,
            "project-native-render:render-final-a:2026-05-14T14:00:00.000Z"
        );
        assert!(render_contract
            .accepted_targets
            .contains(&"local-native".to_string()));
        assert_eq!(render_contract.browser_role, "preview-only");
        assert!(render_contract.require_offscreen_render);
        assert!(render_contract.require_performance_report_artifact);
        assert!(render_contract.require_validation_report_artifact);
        assert!(render_contract.never_auto_release);
        assert_eq!(render_contract.max_render_time_ms, 60_000);
    }

    #[test]
    fn playtest_missing_renderer_sidecar_falls_back_to_cloud() {
        let mut probe = build_probe_from_signals(
            "test-device",
            false,
            false,
            32_768,
            ThermalState::Nominal,
            StoragePressure::Ok,
        );
        probe.gpu_available = false;
        probe.web_gpu_available = false;
        probe.native_graphics_backends.clear();

        let missing = missing_required_sidecars(&probe, RuntimeJobLane::Playtest);
        let decision = resolve_runtime_target(&probe, RuntimeJobLane::Playtest);

        assert!(missing.iter().any(|kind| kind.as_str() == "wgpu-renderer"));
        assert_eq!(decision.target, RuntimeExecutionTarget::CloudSandbox);
        assert!(decision.reason.contains("sidecars"));
    }

    #[test]
    fn asset_import_requires_optimizer_and_media_probe_sidecars() {
        let mut probe = build_probe_from_signals(
            "test-device",
            true,
            true,
            32_768,
            ThermalState::Nominal,
            StoragePressure::Ok,
        );
        probe.local_toolchain.clear();
        probe.asset_tools.clear();
        probe.media_tools.clear();

        let missing = missing_required_sidecars(&probe, RuntimeJobLane::AssetImport);
        let decision = resolve_runtime_target(&probe, RuntimeJobLane::AssetImport);

        assert!(missing
            .iter()
            .any(|kind| kind.as_str() == "asset-optimizer"));
        assert!(missing.iter().any(|kind| kind.as_str() == "ffprobe"));
        assert_eq!(decision.target, RuntimeExecutionTarget::CloudSandbox);
    }

    #[test]
    fn build_export_requires_native_compiler_sidecar() {
        let mut probe = build_probe_from_signals(
            "test-device",
            true,
            true,
            32_768,
            ThermalState::Nominal,
            StoragePressure::Ok,
        );
        probe.local_toolchain.retain(|feature| {
            !matches!(
                feature,
                LocalRuntimeToolchainFeature::ZigToolchain
                    | LocalRuntimeToolchainFeature::ZigCCompiler
            )
        });

        let missing = missing_required_sidecars(&probe, RuntimeJobLane::BuildExport);
        let decision = resolve_runtime_target(&probe, RuntimeJobLane::BuildExport);

        assert!(missing
            .iter()
            .any(|kind| kind.as_str() == "native-compiler"));
        assert_eq!(decision.target, RuntimeExecutionTarget::CloudSandbox);
        assert!(decision.reason.contains("native-compiler"));
    }

    #[test]
    fn native_kernel_manifest_blocks_unproven_native_claims() {
        let manifest = build_native_kernel_manifest();
        assert_eq!(
            validate_native_kernel_manifest(&manifest),
            Vec::<String>::new()
        );
        assert!(manifest
            .capabilities
            .iter()
            .all(|capability| {
                capability.state != NativeKernelState::Available
                    || AVAILABLE_CAPABILITY_IDS.contains(&capability.id)
            }));
        assert!(manifest
            .prohibited_claims
            .contains(&"signed installer ready"));
        assert!(manifest.crash_state.requires_user_review);
    }

    #[test]
    fn held_job_is_stored_with_blocker() {
        let probe = build_probe_from_signals(
            "test-device",
            true,
            true,
            32_768,
            ThermalState::Critical,
            StoragePressure::Ok,
        );
        let decision = resolve_runtime_target(&probe, RuntimeJobLane::BrowserOperator);
        let mut store = RuntimeJobStore::default();
        let status = store.create(
            RuntimeJobRequest::fixture(RuntimeJobLane::BrowserOperator),
            decision,
        );
        assert_eq!(status.target, RuntimeExecutionTarget::Held);
        assert!(status.blocker.is_some());
    }

    fn temp_snapshot_path(test_name: &str) -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_nanos())
            .unwrap_or(0);
        std::env::temp_dir().join(format!("aethel-studio-local-{test_name}-{nonce}.json"))
    }

    #[test]
    fn persisted_running_jobs_recover_as_held_after_restart() {
        let path = temp_snapshot_path("recover-running");
        let job_id = {
            let probe = build_probe_from_signals(
                "test-device",
                true,
                true,
                32_768,
                ThermalState::Nominal,
                StoragePressure::Ok,
            );
            let decision = resolve_runtime_target(&probe, RuntimeJobLane::MemoryIndexing);
            let mut store =
                RuntimeJobStore::from_persistence_path(&path).expect("create persistent job store");
            let status = store.create(
                RuntimeJobRequest::fixture(RuntimeJobLane::MemoryIndexing),
                decision,
            );
            assert_eq!(status.state, RuntimeJobState::Running);
            assert!(path.exists());
            status.id
        };

        let recovered =
            RuntimeJobStore::from_persistence_path(&path).expect("recover persistent job store");
        let status = recovered.get(&job_id).expect("recovered job exists");
        assert_eq!(status.state, RuntimeJobState::Held);
        assert!(status
            .blocker
            .as_deref()
            .unwrap_or_default()
            .contains("Recovered after Studio Local restart"));
        assert!(status
            .compact_log
            .iter()
            .any(|line| line.contains("Recovered after Studio Local restart")));
        assert!(recovered.last_persistence_error().is_none());

        let _ = fs::remove_file(path);
    }

    #[test]
    fn persisted_cancelled_jobs_stay_cancelled_after_restart() {
        let path = temp_snapshot_path("recover-cancelled");
        let job_id = {
            let probe = build_probe_from_signals(
                "test-device",
                true,
                true,
                32_768,
                ThermalState::Nominal,
                StoragePressure::Ok,
            );
            let decision = resolve_runtime_target(&probe, RuntimeJobLane::MemoryIndexing);
            let mut store =
                RuntimeJobStore::from_persistence_path(&path).expect("create persistent job store");
            let status = store.create(
                RuntimeJobRequest::fixture(RuntimeJobLane::MemoryIndexing),
                decision,
            );
            store.cancel(&status.id).expect("cancel job");
            status.id
        };

        let recovered =
            RuntimeJobStore::from_persistence_path(&path).expect("recover persistent job store");
        let status = recovered.get(&job_id).expect("recovered job exists");
        assert_eq!(status.state, RuntimeJobState::Cancelled);
        assert!(!status
            .compact_log
            .iter()
            .any(|line| line.contains("Recovered after Studio Local restart")));

        let _ = fs::remove_file(path);
    }
}

// Domain 1 gz: Position-based dynamics real kernel.
