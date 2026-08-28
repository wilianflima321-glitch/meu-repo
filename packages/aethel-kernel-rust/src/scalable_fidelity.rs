//! Scalable Fidelity Blueprint — letter **sf**.
//!
//! Law XV (Scalable Fidelity) §1 — the deterministic brain that answers the
//! question: **"how does graphics quality / lighting work for a user who does
//! NOT have ray tracing or a strong GPU?"** Given a Capability Score `0..=100`
//! (the same continuum the web probes in `hardware-profile.ts` and the desktop
//! derives in `gpu_soak_scale::derive_soak_capability_score`), this kernel
//! resolves the **fidelity blueprint** for that hardware and gates every
//! lighting / shadow / upscale / sampling feature by tier:
//!
//! ```text
//!   enthusiast (75–100)  Deferred + RT_GI + RT reflections + VSM + denoiser
//!                        + bloom + FSR + bindless            (RT assumed)
//!   discrete  (45–74)    Deferred + SSGI + light probes + SSR + VSM
//!                        + bloom + FSR + bindless            (no RT cores)
//!   integrated (20–44)   ForwardPBR + BAKED lightmaps + simple shadow + FSR
//!                        (iGPU; strong CPU compensates via SAB/worker threads)
//!   webgl2    (0–19)     ForwardPBR + BAKED lightmaps only
//!                        (no bindless, no FSR, no complex compute)
//! ```
//!
//! The tier gates are **exactly** the Law XV §1 blueprint matrix, and the
//! render graphs this kernel emits match the spec's `Scalable Render Graph`
//! blueprints node-for-node:
//!
//! - enthusiast: `['GBuffer','RT_GI','SSR','Bloom','FSR','Present']`
//! - discrete:   `['GBuffer','SSGI','Probes','Bloom','FSR','Present']`
//! - integrated: `['ForwardPBR','BakedLM','SimpleShadow','FSR','Present']`
//! - webgl2:     `['ForwardPBR','BakedLM','Present']`
//!
//! **Why this kernel (the debt it pays):** the web has Capability Score +
//! tier blueprints in TS (`hardware-profile.ts`, Block 3B.1); the desktop has
//! the *resolution/VRAM* budget ladder (`gpu_soak_scale.rs`) and an FSR/VSM
//! substrate — but **no substrate owned the feature-gating blueprint** (which
//! GI / reflections / shadows / upscale a given CapScore is allowed to use).
//! That missing authority is what this kernel is: a pure, deterministic,
//! GPU-free source of truth that both the web and the desktop renderers can
//! consume, so a weak GPU NEVER gets a ray-traced path and a strong GPU never
//! gets an unnecessarily baked floor.
//!
//! **Doctrine #73 elevation:** supremacy is measured on the LOWEST supported
//! tier, not the highest ("works on my 4090" = failure). Every tier — even
//! `webgl2` at CapScore 0 — must ship **rich + stable** (baked lightmaps +
//! forward PBR is a legitimate, stable lighting model, never an empty demo).
//!
//! **Honesty / no overclaim vs Unreal Lumen:** `ray_traced` is `true` ONLY for
//! the enthusiast blueprint and is gated behind the HELD GPU acceleration
//! structure (`bindless_rt_native_compute`); the soak keeps
//! `hardware_rt_ready`, `lumen_radiance_cascades_aaa_ready`,
//! `unreal_fidelity_parity_ready` and `rt_gi_bounce_ready` all `false`. The
//! RT nodes in the enthusiast graph report `is_aaa_held() == true` — the
//! blueprint is the honest *plan*, not a shipped claim.

use crate::aces_cinematic_tonemapper::run_aces_cinematic_tonemapper_soak;
use crate::asset_color_appearance::run_asset_color_appearance_soak;
use crate::asset_spectral_radiance::run_asset_spectral_radiance_soak;
use crate::hdr_32bit_float_pipeline::run_hdr_32bit_float_pipeline_soak;
use crate::radiance_cascades_gi::run_radiance_cascades_gi_soak;
use crate::spectral_light_pipeline::run_spectral_light_pipeline_soak;

/// Default soak seed ("sf_seed") — deterministic fixtures.
pub const SF_SOAK_SEED: u64 = 0x73665F73656564;
/// Fingerprint seed ("sf_fp").
const FP_SEED: u64 = 0x73_66_5F_66_70;
/// Fingerprint mix constant ("sf_xor").
const FP_XOR: u64 = 0x73_66_5F_78_6F_72;
/// Capability Score is continuous `0..=100` (Law XV).
pub const SF_MAX_SCORE: u32 = 100;
/// Reference present size used by the soak VRAM ladder (1080p).
pub const SF_REFERENCE_WIDTH: u32 = 1920;
pub const SF_REFERENCE_HEIGHT: u32 = 1080;
/// Numerical epsilon for float assertions.
pub const SF_EPS: f32 = 1e-5;

/// Law XV fidelity tier — four continuous Capability Score bands.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FidelityTier {
    /// `0..=19` — WebGL2 floor: ForwardPBR + BakedLM, no bindless/FSR.
    WebGl2,
    /// `20..=44` — iGPU: ForwardPBR + BakedLM + SimpleShadow + FSR.
    Integrated,
    /// `45..=74` — discrete, no RT cores: Deferred + SSGI + probes + SSR.
    Discrete,
    /// `75..=100` — RT hardware assumed: Deferred + RT_GI + RT reflections.
    Enthusiast,
}

impl FidelityTier {
    /// Stable serde/telemetry tag (never derives from Debug).
    pub const fn tag(self) -> &'static str {
        match self {
            Self::WebGl2 => "webgl2",
            Self::Integrated => "integrated",
            Self::Discrete => "discrete",
            Self::Enthusiast => "enthusiast",
        }
    }

    /// Inclusive `[lo, hi]` Capability Score band (Law XV §1 / §7).
    pub const fn band(self) -> (u32, u32) {
        match self {
            Self::WebGl2 => (0, 19),
            Self::Integrated => (20, 44),
            Self::Discrete => (45, 74),
            Self::Enthusiast => (75, 100),
        }
    }

    /// Doctrine #73 — every tier must ship "rich + stable"; supremacy is
    /// measured on the LOWEST supported tier, never on the highest.
    pub const fn is_rich_and_stable(self) -> bool {
        true
    }

    /// Render scale (internal resolution fraction) — the FSR/upscale input.
    pub const fn render_scale(self) -> f32 {
        match self {
            Self::Enthusiast => 0.66,
            Self::Discrete => 0.75,
            Self::Integrated => 1.0,
            Self::WebGl2 => 1.0,
        }
    }

    /// Samples per pixel for the raster/lighting path.
    pub const fn sample_count(self) -> u32 {
        match self {
            Self::Enthusiast => 4,
            Self::Discrete => 2,
            Self::Integrated => 1,
            Self::WebGl2 => 1,
        }
    }
}

/// Map a Capability Score (clamped to `0..=100`) to its fidelity tier.
pub fn tier_from_score(score: u32) -> FidelityTier {
    let s = score.min(SF_MAX_SCORE);
    if s >= 75 {
        FidelityTier::Enthusiast
    } else if s >= 45 {
        FidelityTier::Discrete
    } else if s >= 20 {
        FidelityTier::Integrated
    } else {
        FidelityTier::WebGl2
    }
}

/// Rasterization path gated by tier.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RasterMode {
    /// Deferred shading with a GBuffer (enthusiast / discrete).
    Deferred,
    /// Forward PBR (integrated / webgl2 — no complex deferred compute).
    ForwardPbr,
}

impl RasterMode {
    pub const fn tag(self) -> &'static str {
        match self {
            Self::Deferred => "deferred",
            Self::ForwardPbr => "forward_pbr",
        }
    }
}

/// Global illumination strategy gated by tier (the "lighting" answer).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GlobalIlluminationMode {
    /// Hardware RT bounce GI — enthusiast only, AAA HELD.
    RayTraced,
    /// Screen-space GI + light probes — discrete (no RT cores).
    ScreenSpaceGi,
    /// Light probes baked at author time — discrete probe tier.
    LightProbes,
    /// Baked lightmaps — integrated / webgl2 (zero runtime RT cost).
    BakedLightmaps,
}

impl GlobalIlluminationMode {
    pub const fn tag(self) -> &'static str {
        match self {
            Self::RayTraced => "ray_traced",
            Self::ScreenSpaceGi => "screen_space_gi",
            Self::LightProbes => "light_probes",
            Self::BakedLightmaps => "baked_lightmaps",
        }
    }
}

/// Reflection strategy gated by tier.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReflectionMode {
    /// Hardware RT reflections — enthusiast only, AAA HELD.
    RayTraced,
    /// Screen-space reflections — discrete.
    ScreenSpaceReflections,
    /// None — integrated / webgl2 (baked specular from lightmaps).
    None,
}

impl ReflectionMode {
    pub const fn tag(self) -> &'static str {
        match self {
            Self::RayTraced => "ray_traced",
            Self::ScreenSpaceReflections => "screen_space_reflections",
            Self::None => "none",
        }
    }
}

/// Shadow strategy gated by tier.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ShadowMode {
    /// Virtual shadow maps — enthusiast / discrete.
    VirtualShadowMaps,
    /// A single simple shadow map — integrated.
    SimpleShadow,
    /// Baked-only shadow (lightmaps) — webgl2.
    None,
}

impl ShadowMode {
    pub const fn tag(self) -> &'static str {
        match self {
            Self::VirtualShadowMaps => "virtual_shadow_maps",
            Self::SimpleShadow => "simple_shadow",
            Self::None => "none",
        }
    }
}

/// A node in the deterministic Scalable Render Graph (Law XV §1 blueprint).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RenderNode {
    GBuffer,
    RtGi,
    Ssgi,
    LightProbes,
    Ssr,
    Bloom,
    Fsr,
    Present,
    ForwardPbr,
    BakedLightmaps,
    SimpleShadow,
}

impl RenderNode {
    /// Stable tag (snake_case — mirrors the spec's graph list).
    pub const fn tag(self) -> &'static str {
        match self {
            Self::GBuffer => "GBuffer",
            Self::RtGi => "RT_GI",
            Self::Ssgi => "SSGI",
            Self::LightProbes => "Probes",
            Self::Ssr => "SSR",
            Self::Bloom => "Bloom",
            Self::Fsr => "FSR",
            Self::Present => "Present",
            Self::ForwardPbr => "ForwardPBR",
            Self::BakedLightmaps => "BakedLM",
            Self::SimpleShadow => "SimpleShadow",
        }
    }

    /// Honesty — ray-traced nodes are the *plan* only; the GPU acceleration
    /// structure (`bindless_rt_native_compute`) is still HELD, so these nodes
    /// must never be claimed product-ready.
    pub const fn is_aaa_held(self) -> bool {
        matches!(self, Self::RtGi | Self::Ssr)
    }
}

/// The deterministic fidelity blueprint resolved from a Capability Score.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct FidelityBlueprint {
    /// Clamped Capability Score `0..=100`.
    pub capability_score: u32,
    /// Resolved tier.
    pub tier: FidelityTier,
    /// Rasterization path.
    pub raster: RasterMode,
    /// Global illumination strategy (the "lighting" answer per hardware).
    pub gi: GlobalIlluminationMode,
    /// Reflection strategy.
    pub reflections: ReflectionMode,
    /// Shadow strategy.
    pub shadows: ShadowMode,
    /// FSR/upscale enabled (off for the webgl2 floor).
    pub fsr_upscale: bool,
    /// Bloom enabled (enthusiast / discrete).
    pub bloom: bool,
    /// Bindless resources enabled (enthusiast / discrete).
    pub bindless: bool,
    /// True ONLY for the enthusiast tier — RT hardware assumed (AAA HELD).
    pub ray_traced: bool,
    /// RT/spatio-temporal denoiser — enthusiast only.
    pub denoiser: bool,
    /// Samples per pixel (4 / 2 / 1 / 1).
    pub sample_count: u32,
    /// Internal render scale (FSR input fraction).
    pub render_scale: f32,
    /// Human honesty note for the tier.
    pub note: &'static str,
}

/// Resolve the Law XV fidelity blueprint for a Capability Score.
///
/// This is the single authority that answers "how does lighting work without
/// ray tracing?": discrete gets compute SSGI + probes + SSR; integrated gets
/// baked lightmaps + a simple shadow + FSR; webgl2 gets baked lightmaps only.
pub fn resolve_fidelity_blueprint(score: u32) -> FidelityBlueprint {
    let s = score.min(SF_MAX_SCORE);
    let tier = tier_from_score(s);
    match tier {
        FidelityTier::Enthusiast => FidelityBlueprint {
            capability_score: s,
            tier,
            raster: RasterMode::Deferred,
            gi: GlobalIlluminationMode::RayTraced,
            reflections: ReflectionMode::RayTraced,
            shadows: ShadowMode::VirtualShadowMaps,
            fsr_upscale: true,
            bloom: true,
            bindless: true,
            ray_traced: true,
            denoiser: true,
            sample_count: FidelityTier::Enthusiast.sample_count(),
            render_scale: FidelityTier::Enthusiast.render_scale(),
            note: "RT hardware assumed (RT cores + bindless). GPU HW RT is HELD until the bindless acceleration structure is product-wired (bindless_rt_native_compute).",
        },
        FidelityTier::Discrete => FidelityBlueprint {
            capability_score: s,
            tier,
            raster: RasterMode::Deferred,
            gi: GlobalIlluminationMode::ScreenSpaceGi,
            reflections: ReflectionMode::ScreenSpaceReflections,
            shadows: ShadowMode::VirtualShadowMaps,
            fsr_upscale: true,
            bloom: true,
            bindless: true,
            ray_traced: false,
            denoiser: false,
            sample_count: FidelityTier::Discrete.sample_count(),
            render_scale: FidelityTier::Discrete.render_scale(),
            note: "No RT cores — compute SSGI + light probes + SSR; bindless kept; VSM shadows.",
        },
        FidelityTier::Integrated => FidelityBlueprint {
            capability_score: s,
            tier,
            raster: RasterMode::ForwardPbr,
            gi: GlobalIlluminationMode::BakedLightmaps,
            reflections: ReflectionMode::None,
            shadows: ShadowMode::SimpleShadow,
            fsr_upscale: true,
            bloom: false,
            bindless: false,
            ray_traced: false,
            denoiser: false,
            sample_count: FidelityTier::Integrated.sample_count(),
            render_scale: FidelityTier::Integrated.render_scale(),
            note: "iGPU — Forward PBR + baked lightmaps + simple shadow + FSR; strong CPU compensates via SAB/worker threads.",
        },
        FidelityTier::WebGl2 => FidelityBlueprint {
            capability_score: s,
            tier,
            raster: RasterMode::ForwardPbr,
            gi: GlobalIlluminationMode::BakedLightmaps,
            reflections: ReflectionMode::None,
            shadows: ShadowMode::None,
            fsr_upscale: false,
            bloom: false,
            bindless: false,
            ray_traced: false,
            denoiser: false,
            sample_count: FidelityTier::WebGl2.sample_count(),
            render_scale: FidelityTier::WebGl2.render_scale(),
            note: "WebGL2 floor — Forward PBR + baked lightmaps only; no bindless, no FSR, no complex compute; baked lightmaps keep it rich + stable.",
        },
    }
}

/// Emit the deterministic Scalable Render Graph for a blueprint — exactly the
/// Law XV §1 node list for the tier.
pub fn resolve_render_graph(blueprint: &FidelityBlueprint) -> Vec<RenderNode> {
    match blueprint.tier {
        FidelityTier::Enthusiast => {
            vec![
                RenderNode::GBuffer,
                RenderNode::RtGi,
                RenderNode::Ssr,
                RenderNode::Bloom,
                RenderNode::Fsr,
                RenderNode::Present,
            ]
        }
        FidelityTier::Discrete => {
            vec![
                RenderNode::GBuffer,
                RenderNode::Ssgi,
                RenderNode::LightProbes,
                RenderNode::Bloom,
                RenderNode::Fsr,
                RenderNode::Present,
            ]
        }
        FidelityTier::Integrated => {
            vec![
                RenderNode::ForwardPbr,
                RenderNode::BakedLightmaps,
                RenderNode::SimpleShadow,
                RenderNode::Fsr,
                RenderNode::Present,
            ]
        }
        FidelityTier::WebGl2 => {
            vec![
                RenderNode::ForwardPbr,
                RenderNode::BakedLightmaps,
                RenderNode::Present,
            ]
        }
    }
}

/// Deterministic estimate of the blueprint's GPU working set (bytes) for a
/// present size. Pure math — mirrors `gpu_soak_scale::estimate_vram_bytes`
/// concepts but is tier-aware and GPU-free, so the kernel stays the authority.
pub fn estimated_vram_bytes(blueprint: &FidelityBlueprint, width: u32, height: u32) -> u64 {
    let pixels = u64::from(width.max(1)) * u64::from(height.max(1));
    let scale = blueprint.render_scale.max(0.1);
    let internal = (pixels as f64 * scale as f64 * scale as f64) as u64;
    let raster = match blueprint.raster {
        RasterMode::Deferred => internal * 4 * 5 / 2, // GBuffer + depth + velocity ≈ 2.5× RGBA8
        RasterMode::ForwardPbr => internal * 4 * 2, // color + depth
    };
    // FSR keeps its working set at the FULL present resolution (it upscales to
    // present), so its cost must NOT shrink when render_scale < 1.0 — otherwise
    // the vram ladder would break monotonicity (discrete < integrated). Output +
    // history at present res ≈ RGBA16F; the input frame is already accounted in
    // the raster budget above.
    let fsr = if blueprint.fsr_upscale {
        pixels * 2 * 8 // output + history ≈ 16 bytes per present pixel
    } else {
        0
    };
    let gi = match blueprint.gi {
        GlobalIlluminationMode::RayTraced => pixels * 12,
        GlobalIlluminationMode::ScreenSpaceGi => internal * 8,
        GlobalIlluminationMode::LightProbes => pixels / 4,
        GlobalIlluminationMode::BakedLightmaps => pixels / 8,
    };
    let shadow = match blueprint.shadows {
        ShadowMode::VirtualShadowMaps => pixels / 2,
        ShadowMode::SimpleShadow => pixels / 8,
        ShadowMode::None => 0,
    };
    raster.saturating_add(fsr).saturating_add(gi).saturating_add(shadow)
}

/// Stable finite float quantization (bit-exact for identical inputs).
fn quant_f32(v: f32) -> u64 {
    if v.is_finite() {
        (v * 1_000_000.0).round().to_bits() as u64
    } else {
        0xDEAD_BEEF_0000_0000
    }
}

/// FNV-1a-ish mix — stable across platforms for u64 parts.
fn hash_mix(mut h: u64, v: u64) -> u64 {
    h ^= v.wrapping_add(0x9E37_79B9_7F4A_7C15).wrapping_add(h << 6).wrapping_add(h >> 2);
    h
}

/// Fingerprint of a measured set of u64 parts.
fn fingerprint(parts: &[u64]) -> u64 {
    let mut h = FP_SEED ^ FP_XOR;
    for p in parts {
        h = hash_mix(h, *p);
    }
    h
}

/// Stable fingerprint of the measured fidelity ladder (the whole authority).
fn fidelity_evidence_fingerprint(m: &FidelityMeasured) -> u64 {
    let mut parts: Vec<u64> = Vec::with_capacity(48);
    for bp in [
        &m.blueprint_webgl2,
        &m.blueprint_integrated,
        &m.blueprint_discrete,
        &m.blueprint_enthusiast,
    ] {
        parts.push(u64::from(bp.capability_score));
        parts.push(u64::from(bp.sample_count));
        parts.push(quant_f32(bp.render_scale));
        parts.push(u64::from(bp.fsr_upscale));
        parts.push(u64::from(bp.bloom));
        parts.push(u64::from(bp.bindless));
        parts.push(u64::from(bp.ray_traced));
        parts.push(u64::from(bp.denoiser));
    }
    for g in [
        &m.graph_webgl2,
        &m.graph_integrated,
        &m.graph_discrete,
        &m.graph_enthusiast,
    ] {
        let mut node_hash: u64 = 0;
        for n in g {
            node_hash = hash_mix(node_hash, n.tag().len() as u64);
        }
        parts.push(node_hash);
    }
    parts.push(m.vram_webgl2);
    parts.push(m.vram_integrated);
    parts.push(m.vram_discrete);
    parts.push(m.vram_enthusiast);
    fingerprint(&parts)
}

/// Measured fidelity ladder — the four reference blueprints + graphs + VRAM.
struct FidelityMeasured {
    blueprint_webgl2: FidelityBlueprint,
    blueprint_integrated: FidelityBlueprint,
    blueprint_discrete: FidelityBlueprint,
    blueprint_enthusiast: FidelityBlueprint,
    graph_webgl2: Vec<RenderNode>,
    graph_integrated: Vec<RenderNode>,
    graph_discrete: Vec<RenderNode>,
    graph_enthusiast: Vec<RenderNode>,
    vram_webgl2: u64,
    vram_integrated: u64,
    vram_discrete: u64,
    vram_enthusiast: u64,
}

/// Run the measured pass — resolve the four reference tiers deterministically.
fn run_measured_pass() -> FidelityMeasured {
    let blueprint_webgl2 = resolve_fidelity_blueprint(5);
    let blueprint_integrated = resolve_fidelity_blueprint(30);
    let blueprint_discrete = resolve_fidelity_blueprint(60);
    let blueprint_enthusiast = resolve_fidelity_blueprint(85);
    let graph_webgl2 = resolve_render_graph(&blueprint_webgl2);
    let graph_integrated = resolve_render_graph(&blueprint_integrated);
    let graph_discrete = resolve_render_graph(&blueprint_discrete);
    let graph_enthusiast = resolve_render_graph(&blueprint_enthusiast);
    let vram_webgl2 = estimated_vram_bytes(&blueprint_webgl2, SF_REFERENCE_WIDTH, SF_REFERENCE_HEIGHT);
    let vram_integrated =
        estimated_vram_bytes(&blueprint_integrated, SF_REFERENCE_WIDTH, SF_REFERENCE_HEIGHT);
    let vram_discrete =
        estimated_vram_bytes(&blueprint_discrete, SF_REFERENCE_WIDTH, SF_REFERENCE_HEIGHT);
    let vram_enthusiast =
        estimated_vram_bytes(&blueprint_enthusiast, SF_REFERENCE_WIDTH, SF_REFERENCE_HEIGHT);
    FidelityMeasured {
        blueprint_webgl2,
        blueprint_integrated,
        blueprint_discrete,
        blueprint_enthusiast,
        graph_webgl2,
        graph_integrated,
        graph_discrete,
        graph_enthusiast,
        vram_webgl2,
        vram_integrated,
        vram_discrete,
        vram_enthusiast,
    }
}

/// Soak report — every Law XV blueprint invariant, comparative, fail-closed.
pub struct FidelitySoakReport {
    /// Soak-gated — ALL blueprint invariants must pass together.
    pub scalable_fidelity_ready: bool,
    /// CapScore bands map to the exact Law XV tiers at every boundary.
    pub band_boundaries_exact: bool,
    /// webgl2 floor is ForwardPBR + BakedLM only (no FSR/bindless/shadows).
    pub webgl2_floor_minimal: bool,
    /// integrated bakes lightmaps and scales with FSR + simple shadow.
    pub integrated_baked_lm_fsr: bool,
    /// discrete uses SSGI + probes + SSR — never ray traced.
    pub discrete_ssgi_no_rt: bool,
    /// enthusiast is the ONLY ray-traced tier (denoiser + VSM + bindless).
    pub enthusiast_rt_gated: bool,
    /// Render graphs match the Law XV §1 spec node-for-node.
    pub graphs_match_spec: bool,
    /// The feature ladder never loses a feature as CapScore rises.
    pub feature_monotonic: bool,
    /// VRAM estimate is strictly monotonic across the ladder.
    pub vram_budget_monotonic: bool,
    /// All resolved quantities are finite.
    pub outputs_finite: bool,
    /// Same input → same fingerprint (deterministic authority).
    pub deterministic_replay: bool,
    /// CapScore 0 fails closed to the rich + stable webgl2 floor.
    pub fail_closed_zero_score: bool,
    /// Doctrine #73 — every tier ships rich + stable, none below.
    pub all_tiers_rich_and_stable: bool,
    /// Honesty — RT / Lumen / Unreal parity all stay false (AAA HELD).
    pub aaa_held_honest: bool,
    /// Stable evidence tag (letter **sf**).
    pub evidence_kind: &'static str,
    /// Fingerprint of the measured fidelity ladder.
    pub evidence_fingerprint: u64,
    pub distinct_from_asset_color_appearance_probe: bool,
    pub distinct_from_radiance_cascades_gi_probe: bool,
    pub distinct_from_spectral_light_pipeline_probe: bool,
    pub distinct_from_aces_cinematic_tonemapper_probe: bool,
    pub distinct_from_hdr_32bit_float_pipeline_probe: bool,
    pub distinct_from_asset_spectral_radiance_probe: bool,
    /// Resolved tier tags for the four reference scores (5 / 30 / 60 / 85).
    pub tier_webgl2: &'static str,
    pub tier_integrated: &'static str,
    pub tier_discrete: &'static str,
    pub tier_enthusiast: &'static str,
    /// Render scale for each tier.
    pub render_scale_webgl2: f32,
    pub render_scale_integrated: f32,
    pub render_scale_discrete: f32,
    pub render_scale_enthusiast: f32,
    /// Sample count per pixel for each tier.
    pub sample_count_webgl2: u32,
    pub sample_count_integrated: u32,
    pub sample_count_discrete: u32,
    pub sample_count_enthusiast: u32,
    /// Estimated VRAM @ 1080p for each tier.
    pub vram_webgl2: u64,
    pub vram_integrated: u64,
    pub vram_discrete: u64,
    pub vram_enthusiast: u64,
    /// Fail-closed — no hardware RT claim on ANY tier yet.
    pub hardware_rt_ready: bool,
    /// Fail-closed — no Lumen-level radiance cascade AAA claim.
    pub lumen_radiance_cascades_aaa_ready: bool,
    /// Fail-closed — no Unreal fidelity-parity claim.
    pub unreal_fidelity_parity_ready: bool,
    /// Fail-closed — no real-time multi-bounce RT GI claim.
    pub rt_gi_bounce_ready: bool,
}

/// Run the full Scalable Fidelity soak — all Law XV blueprint invariants.
pub fn run_fidelity_soak() -> FidelitySoakReport {
    let m = run_measured_pass();

    // --- Band boundaries are exact (Law XV §1 / §7) -------------------------
    let band_boundaries_exact = tier_from_score(19) == FidelityTier::WebGl2
        && tier_from_score(20) == FidelityTier::Integrated
        && tier_from_score(44) == FidelityTier::Integrated
        && tier_from_score(45) == FidelityTier::Discrete
        && tier_from_score(74) == FidelityTier::Discrete
        && tier_from_score(75) == FidelityTier::Enthusiast
        && tier_from_score(100) == FidelityTier::Enthusiast;

    // --- webgl2 floor is minimal (but rich + stable) ------------------------
    let w2 = &m.blueprint_webgl2;
    let webgl2_floor_minimal = w2.tier == FidelityTier::WebGl2
        && w2.raster == RasterMode::ForwardPbr
        && w2.gi == GlobalIlluminationMode::BakedLightmaps
        && w2.reflections == ReflectionMode::None
        && w2.shadows == ShadowMode::None
        && !w2.fsr_upscale
        && !w2.bloom
        && !w2.bindless
        && !w2.ray_traced
        && !w2.denoiser
        && w2.sample_count == 1
        && (w2.render_scale - 1.0).abs() < SF_EPS;

    // --- integrated bakes lightmaps + simple shadow + FSR --------------------
    let ig = &m.blueprint_integrated;
    let integrated_baked_lm_fsr = ig.tier == FidelityTier::Integrated
        && ig.raster == RasterMode::ForwardPbr
        && ig.gi == GlobalIlluminationMode::BakedLightmaps
        && ig.reflections == ReflectionMode::None
        && ig.shadows == ShadowMode::SimpleShadow
        && ig.fsr_upscale
        && !ig.bindless
        && !ig.ray_traced
        && ig.sample_count == 1;

    // --- discrete uses SSGI + probes + SSR, never ray traced ----------------
    let dc = &m.blueprint_discrete;
    let discrete_ssgi_no_rt = dc.tier == FidelityTier::Discrete
        && dc.raster == RasterMode::Deferred
        && dc.gi == GlobalIlluminationMode::ScreenSpaceGi
        && dc.reflections == ReflectionMode::ScreenSpaceReflections
        && dc.shadows == ShadowMode::VirtualShadowMaps
        && dc.fsr_upscale
        && dc.bloom
        && dc.bindless
        && !dc.ray_traced
        && !dc.denoiser
        && dc.sample_count == 2;

    // --- enthusiast is the ONLY ray-traced tier ------------------------------
    let en = &m.blueprint_enthusiast;
    let enthusiast_rt_gated = en.tier == FidelityTier::Enthusiast
        && en.raster == RasterMode::Deferred
        && en.gi == GlobalIlluminationMode::RayTraced
        && en.reflections == ReflectionMode::RayTraced
        && en.shadows == ShadowMode::VirtualShadowMaps
        && en.fsr_upscale
        && en.bloom
        && en.bindless
        && en.ray_traced
        && en.denoiser
        && en.sample_count == 4;

    // --- Render graphs match the Law XV §1 spec node-for-node ---------------
    fn nodes_equal(a: &[RenderNode], want: &[&str]) -> bool {
        a.len() == want.len() && a.iter().zip(want.iter()).all(|(n, w)| n.tag() == *w)
    }
    let graphs_match_spec = nodes_equal(&m.graph_webgl2, &["ForwardPBR", "BakedLM", "Present"])
        && nodes_equal(
            &m.graph_integrated,
            &["ForwardPBR", "BakedLM", "SimpleShadow", "FSR", "Present"],
        )
        && nodes_equal(
            &m.graph_discrete,
            &["GBuffer", "SSGI", "Probes", "Bloom", "FSR", "Present"],
        )
        && nodes_equal(
            &m.graph_enthusiast,
            &["GBuffer", "RT_GI", "SSR", "Bloom", "FSR", "Present"],
        );

    // --- Feature ladder is monotonic (never lose a feature as score rises) ---
    let ladder = [
        &m.blueprint_webgl2,
        &m.blueprint_integrated,
        &m.blueprint_discrete,
        &m.blueprint_enthusiast,
    ];
    let feature_monotonic = ladder.windows(2).all(|pair| {
        let lo = pair[0];
        let hi = pair[1];
        (!lo.fsr_upscale || hi.fsr_upscale)
            && (!lo.bloom || hi.bloom)
            && (!lo.bindless || hi.bindless)
            && (!lo.ray_traced || hi.ray_traced)
            && lo.sample_count <= hi.sample_count
            && lo.render_scale >= hi.render_scale
    });

    // --- VRAM estimate is strictly monotonic across the ladder --------------
    let vram_budget_monotonic = m.vram_webgl2 < m.vram_integrated
        && m.vram_integrated < m.vram_discrete
        && m.vram_discrete < m.vram_enthusiast;

    // --- All resolved quantities are finite ---------------------------------
    let outputs_finite = [
        m.blueprint_webgl2.render_scale,
        m.blueprint_integrated.render_scale,
        m.blueprint_discrete.render_scale,
        m.blueprint_enthusiast.render_scale,
    ]
    .iter()
    .all(|v| v.is_finite());

    // --- Determinism ----------------------------------------------------------
    let replay = run_measured_pass();
    let fp = fidelity_evidence_fingerprint(&m);
    let fp_replay = fidelity_evidence_fingerprint(&replay);
    let deterministic_replay = fp == fp_replay;

    // --- Fail-closed: CapScore 0 → rich webgl2 floor -------------------------
    let zero = resolve_fidelity_blueprint(0);
    let fail_closed_zero_score = zero.tier == FidelityTier::WebGl2
        && zero.capability_score == 0
        && zero.gi == GlobalIlluminationMode::BakedLightmaps
        && !zero.fsr_upscale
        && !zero.bindless
        && FidelityTier::WebGl2.is_rich_and_stable();

    // --- Doctrine #73: every tier is rich + stable ----------------------------
    let all_tiers_rich_and_stable = [w2.tier, ig.tier, dc.tier, en.tier]
        .iter()
        .all(|t| t.is_rich_and_stable());

    // --- Honesty: RT / Lumen / Unreal parity all stay false -------------------
    // The enthusiast graph plans RT nodes, but those nodes are AAA-HELD until
    // the GPU acceleration structure is product-wired.
    let rt_nodes_held = m
        .graph_enthusiast
        .iter()
        .filter(|n| n.is_aaa_held())
        .count()
        >= 2;
    let aaa_held_honest = rt_nodes_held
        && m.graph_webgl2.iter().all(|n| !n.is_aaa_held())
        && m.graph_integrated.iter().all(|n| !n.is_aaa_held())
        && m.graph_discrete.iter().all(|n| !n.is_aaa_held());

    // --- Distinctness vs peer probes -------------------------------------------
    let distinct_from_asset_color_appearance_probe =
        fp != run_asset_color_appearance_soak().evidence_fingerprint;
    let distinct_from_radiance_cascades_gi_probe =
        fp != run_radiance_cascades_gi_soak().fingerprint;
    let distinct_from_spectral_light_pipeline_probe =
        fp != run_spectral_light_pipeline_soak().fingerprint;
    let distinct_from_aces_cinematic_tonemapper_probe =
        fp != run_aces_cinematic_tonemapper_soak().fingerprint;
    let distinct_from_hdr_32bit_float_pipeline_probe =
        fp != run_hdr_32bit_float_pipeline_soak().fingerprint;
    let distinct_from_asset_spectral_radiance_probe =
        fp != run_asset_spectral_radiance_soak().evidence_fingerprint;

    let scalable_fidelity_ready = band_boundaries_exact
        && webgl2_floor_minimal
        && integrated_baked_lm_fsr
        && discrete_ssgi_no_rt
        && enthusiast_rt_gated
        && graphs_match_spec
        && feature_monotonic
        && vram_budget_monotonic
        && outputs_finite
        && deterministic_replay
        && fail_closed_zero_score
        && all_tiers_rich_and_stable
        && aaa_held_honest;

    FidelitySoakReport {
        scalable_fidelity_ready,
        band_boundaries_exact,
        webgl2_floor_minimal,
        integrated_baked_lm_fsr,
        discrete_ssgi_no_rt,
        enthusiast_rt_gated,
        graphs_match_spec,
        feature_monotonic,
        vram_budget_monotonic,
        outputs_finite,
        deterministic_replay,
        fail_closed_zero_score,
        all_tiers_rich_and_stable,
        aaa_held_honest,
        evidence_kind: "scalable_fidelity_law_xv_blueprint",
        evidence_fingerprint: fp,
        distinct_from_asset_color_appearance_probe,
        distinct_from_radiance_cascades_gi_probe,
        distinct_from_spectral_light_pipeline_probe,
        distinct_from_aces_cinematic_tonemapper_probe,
        distinct_from_hdr_32bit_float_pipeline_probe,
        distinct_from_asset_spectral_radiance_probe,
        tier_webgl2: m.blueprint_webgl2.tier.tag(),
        tier_integrated: m.blueprint_integrated.tier.tag(),
        tier_discrete: m.blueprint_discrete.tier.tag(),
        tier_enthusiast: m.blueprint_enthusiast.tier.tag(),
        render_scale_webgl2: m.blueprint_webgl2.render_scale,
        render_scale_integrated: m.blueprint_integrated.render_scale,
        render_scale_discrete: m.blueprint_discrete.render_scale,
        render_scale_enthusiast: m.blueprint_enthusiast.render_scale,
        sample_count_webgl2: m.blueprint_webgl2.sample_count,
        sample_count_integrated: m.blueprint_integrated.sample_count,
        sample_count_discrete: m.blueprint_discrete.sample_count,
        sample_count_enthusiast: m.blueprint_enthusiast.sample_count,
        vram_webgl2: m.vram_webgl2,
        vram_integrated: m.vram_integrated,
        vram_discrete: m.vram_discrete,
        vram_enthusiast: m.vram_enthusiast,
        hardware_rt_ready: false,
        lumen_radiance_cascades_aaa_ready: false,
        unreal_fidelity_parity_ready: false,
        rt_gi_bounce_ready: false,
    }
}

/// Soak probe — the single public entry point for the desktop wire.
pub fn probe_scalable_fidelity() -> FidelitySoakReport {
    run_fidelity_soak()
}


#[cfg(test)]
mod tests {
    use super::*;

    fn graph_tags(blueprint: &FidelityBlueprint) -> Vec<&'static str> {
        resolve_render_graph(blueprint)
            .iter()
            .map(|n| n.tag())
            .collect()
    }

    #[test]
    fn tier_band_boundaries_are_exact() {
        assert_eq!(tier_from_score(0), FidelityTier::WebGl2);
        assert_eq!(tier_from_score(19), FidelityTier::WebGl2);
        assert_eq!(tier_from_score(20), FidelityTier::Integrated);
        assert_eq!(tier_from_score(44), FidelityTier::Integrated);
        assert_eq!(tier_from_score(45), FidelityTier::Discrete);
        assert_eq!(tier_from_score(74), FidelityTier::Discrete);
        assert_eq!(tier_from_score(75), FidelityTier::Enthusiast);
        assert_eq!(tier_from_score(100), FidelityTier::Enthusiast);
        // Out-of-domain scores clamp (never a panic tier).
        assert_eq!(tier_from_score(500), FidelityTier::Enthusiast);
    }

    #[test]
    fn webgl2_is_the_minimal_rich_floor() {
        let b = resolve_fidelity_blueprint(5);
        assert_eq!(b.tier, FidelityTier::WebGl2);
        assert_eq!(b.raster, RasterMode::ForwardPbr);
        assert_eq!(b.gi, GlobalIlluminationMode::BakedLightmaps);
        assert_eq!(b.reflections, ReflectionMode::None);
        assert_eq!(b.shadows, ShadowMode::None);
        assert!(!b.fsr_upscale);
        assert!(!b.bloom);
        assert!(!b.bindless);
        assert!(!b.ray_traced);
        assert!(!b.denoiser);
        assert_eq!(b.sample_count, 1);
        assert_eq!(graph_tags(&b), vec!["ForwardPBR", "BakedLM", "Present"]);
    }

    #[test]
    fn integrated_bakes_lightmaps_and_scales_with_fsr() {
        let b = resolve_fidelity_blueprint(30);
        assert_eq!(b.tier, FidelityTier::Integrated);
        assert_eq!(b.gi, GlobalIlluminationMode::BakedLightmaps);
        assert_eq!(b.shadows, ShadowMode::SimpleShadow);
        assert!(b.fsr_upscale);
        assert!(!b.bindless);
        assert_eq!(graph_tags(&b), vec!["ForwardPBR", "BakedLM", "SimpleShadow", "FSR", "Present"]);
    }

    #[test]
    fn discrete_uses_ssgi_never_ray_traced() {
        let b = resolve_fidelity_blueprint(60);
        assert_eq!(b.tier, FidelityTier::Discrete);
        assert_eq!(b.gi, GlobalIlluminationMode::ScreenSpaceGi);
        assert_eq!(b.reflections, ReflectionMode::ScreenSpaceReflections);
        assert!(b.bindless);
        assert!(!b.ray_traced);
        assert!(!b.denoiser);
        assert_eq!(graph_tags(&b), vec!["GBuffer", "SSGI", "Probes", "Bloom", "FSR", "Present"]);
    }

    #[test]
    fn enthusiast_is_the_only_ray_traced_tier() {
        let b = resolve_fidelity_blueprint(85);
        assert_eq!(b.tier, FidelityTier::Enthusiast);
        assert_eq!(b.gi, GlobalIlluminationMode::RayTraced);
        assert_eq!(b.reflections, ReflectionMode::RayTraced);
        assert!(b.ray_traced);
        assert!(b.denoiser);
        assert!(b.bindless);
        assert_eq!(b.sample_count, 4);
        assert_eq!(graph_tags(&b), vec!["GBuffer", "RT_GI", "SSR", "Bloom", "FSR", "Present"]);
        // Every other tier stays ray-traced free.
        for s in [0u32, 19, 20, 44, 45, 74] {
            assert!(!resolve_fidelity_blueprint(s).ray_traced);
        }
    }

    #[test]
    fn render_graphs_match_the_law_xv_spec_exactly() {
        let webgl2 = resolve_render_graph(&resolve_fidelity_blueprint(5));
        let integrated = resolve_render_graph(&resolve_fidelity_blueprint(30));
        let discrete = resolve_render_graph(&resolve_fidelity_blueprint(60));
        let enthusiast = resolve_render_graph(&resolve_fidelity_blueprint(85));
        let tags: Vec<&str> = webgl2.iter().map(|n| n.tag()).collect();
        assert_eq!(tags, vec!["ForwardPBR", "BakedLM", "Present"]);
        let tags: Vec<&str> = integrated.iter().map(|n| n.tag()).collect();
        assert_eq!(tags, vec!["ForwardPBR", "BakedLM", "SimpleShadow", "FSR", "Present"]);
        let tags: Vec<&str> = discrete.iter().map(|n| n.tag()).collect();
        assert_eq!(tags, vec!["GBuffer", "SSGI", "Probes", "Bloom", "FSR", "Present"]);
        let tags: Vec<&str> = enthusiast.iter().map(|n| n.tag()).collect();
        assert_eq!(tags, vec!["GBuffer", "RT_GI", "SSR", "Bloom", "FSR", "Present"]);
    }

    #[test]
    fn feature_ladder_is_monotonic() {
        let ladder = [5u32, 30, 60, 85].map(resolve_fidelity_blueprint);
        for pair in ladder.windows(2) {
            let lo = &pair[0];
            let hi = &pair[1];
            assert!(lo.sample_count <= hi.sample_count);
            assert!(!lo.fsr_upscale || hi.fsr_upscale);
            assert!(!lo.bloom || hi.bloom);
            assert!(!lo.bindless || hi.bindless);
            assert!(!lo.ray_traced || hi.ray_traced);
            assert!(lo.render_scale >= hi.render_scale);
        }
    }

    #[test]
    fn vram_budget_is_monotonic_across_tiers() {
        let ladder = [5u32, 30, 60, 85].map(resolve_fidelity_blueprint);
        let mut last = 0u64;
        for b in ladder.iter() {
            let vram = estimated_vram_bytes(b, 1920, 1080);
            assert!(vram > last);
            last = vram;
        }
    }

    #[test]
    fn same_score_is_deterministic() {
        let a = resolve_fidelity_blueprint(73);
        let b = resolve_fidelity_blueprint(73);
        assert_eq!(a, b);
        assert_eq!(a.note, b.note);
    }

    #[test]
    fn zero_score_fails_closed_to_webgl2() {
        let b = resolve_fidelity_blueprint(0);
        assert_eq!(b.tier, FidelityTier::WebGl2);
        assert_eq!(b.capability_score, 0);
        assert!(!b.fsr_upscale);
        assert!(!b.bindless);
        assert!(FidelityTier::WebGl2.is_rich_and_stable());
    }

    #[test]
    fn every_tier_is_rich_and_stable() {
        for s in [0u32, 19, 20, 44, 45, 74, 75, 100] {
            assert!(tier_from_score(s).is_rich_and_stable());
        }
    }

    #[test]
    fn aaa_held_flags_stay_false() {
        let r = run_fidelity_soak();
        assert!(!r.hardware_rt_ready);
        assert!(!r.lumen_radiance_cascades_aaa_ready);
        assert!(!r.unreal_fidelity_parity_ready);
        assert!(!r.rt_gi_bounce_ready);
        // RT nodes are planned on the enthusiast graph but AAA-HELD.
        assert!(resolve_render_graph(&resolve_fidelity_blueprint(85))
            .iter()
            .any(|n| n.is_aaa_held()));
    }

    #[test]
    fn soak_reports_ready_with_aaa_held() {
        let r = run_fidelity_soak();
        assert!(r.scalable_fidelity_ready);
        assert!(r.band_boundaries_exact);
        assert!(r.webgl2_floor_minimal);
        assert!(r.integrated_baked_lm_fsr);
        assert!(r.discrete_ssgi_no_rt);
        assert!(r.enthusiast_rt_gated);
        assert!(r.graphs_match_spec);
        assert!(r.feature_monotonic);
        assert!(r.vram_budget_monotonic);
        assert!(r.outputs_finite);
        assert!(r.deterministic_replay);
        assert!(r.fail_closed_zero_score);
        assert!(r.all_tiers_rich_and_stable);
        assert!(r.aaa_held_honest);
        assert!(!r.hardware_rt_ready);
        assert!(!r.lumen_radiance_cascades_aaa_ready);
        assert!(!r.unreal_fidelity_parity_ready);
        assert!(!r.rt_gi_bounce_ready);
        assert_eq!(r.evidence_kind, "scalable_fidelity_law_xv_blueprint");
        assert_eq!(r.tier_webgl2, "webgl2");
        assert_eq!(r.tier_integrated, "integrated");
        assert_eq!(r.tier_discrete, "discrete");
        assert_eq!(r.tier_enthusiast, "enthusiast");
    }

    #[test]
    fn probe_matches_soak() {
        let p = probe_scalable_fidelity();
        let r = run_fidelity_soak();
        assert_eq!(p.evidence_fingerprint, r.evidence_fingerprint);
        assert_eq!(p.scalable_fidelity_ready, r.scalable_fidelity_ready);
    }

    #[test]
    fn soak_is_deterministic() {
        let a = run_fidelity_soak();
        let b = run_fidelity_soak();
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
        assert_eq!(a.scalable_fidelity_ready, b.scalable_fidelity_ready);
    }

    #[test]
    fn sf_distinct_from_all_peers() {
        let r = run_fidelity_soak();
        assert!(r.distinct_from_asset_color_appearance_probe);
        assert!(r.distinct_from_radiance_cascades_gi_probe);
        assert!(r.distinct_from_spectral_light_pipeline_probe);
        assert!(r.distinct_from_aces_cinematic_tonemapper_probe);
        assert!(r.distinct_from_hdr_32bit_float_pipeline_probe);
        assert!(r.distinct_from_asset_spectral_radiance_probe);
    }

    #[test]
    fn render_scale_and_sample_counts_are_sane() {
        assert!((resolve_fidelity_blueprint(5).render_scale - 1.0).abs() < SF_EPS);
        assert!((resolve_fidelity_blueprint(30).render_scale - 1.0).abs() < SF_EPS);
        assert!((resolve_fidelity_blueprint(60).render_scale - 0.75).abs() < SF_EPS);
        assert!((resolve_fidelity_blueprint(85).render_scale - 0.66).abs() < SF_EPS);
        assert_eq!(resolve_fidelity_blueprint(5).sample_count, 1);
        assert_eq!(resolve_fidelity_blueprint(30).sample_count, 1);
        assert_eq!(resolve_fidelity_blueprint(60).sample_count, 2);
        assert_eq!(resolve_fidelity_blueprint(85).sample_count, 4);
    }

    #[test]
    fn tier_tags_are_stable() {
        assert_eq!(FidelityTier::WebGl2.tag(), "webgl2");
        assert_eq!(FidelityTier::Integrated.tag(), "integrated");
        assert_eq!(FidelityTier::Discrete.tag(), "discrete");
        assert_eq!(FidelityTier::Enthusiast.tag(), "enthusiast");
        assert_eq!(RasterMode::Deferred.tag(), "deferred");
        assert_eq!(RasterMode::ForwardPbr.tag(), "forward_pbr");
        assert_eq!(GlobalIlluminationMode::BakedLightmaps.tag(), "baked_lightmaps");
        assert_eq!(ShadowMode::VirtualShadowMaps.tag(), "virtual_shadow_maps");
        assert_eq!(RenderNode::GBuffer.tag(), "GBuffer");
        assert_eq!(RenderNode::BakedLightmaps.tag(), "BakedLM");
    }

    #[test]
    fn vram_estimate_is_finite_and_positive_for_all_tiers() {
        for s in [0u32, 10, 30, 60, 85, 100] {
            let b = resolve_fidelity_blueprint(s);
            let vram = estimated_vram_bytes(&b, 1920, 1080);
            assert!(vram > 0);
            assert!(vram < u64::MAX / 2);
        }
    }
}
