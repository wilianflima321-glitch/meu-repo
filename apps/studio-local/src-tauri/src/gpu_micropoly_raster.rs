//! Software micro-poly / cluster soft-raster substrate (secondary_winit).
//!
//! # Honesty
//! - Proves: cooked meshlet triangle soup → GPU visibility gate from
//!   `gpu_meshlet_cull` → compute soft-raster into a small depth/vis buffer
//!   with Instant metrics + fragment coverage evidence.
//! - Projection is data-driven: the legacy fixed-view affine (`xy/25`, `z/50`)
//!   is the default (byte-identical to the historical substrate), and a real
//!   perspective camera can be supplied via [`MicropolyCamera::perspective`]
//!   so the soft-raster scales beyond the 64² toy ceiling at product extents.
//! - Does **not** prove: Nanite virtualized geometry, hardware micro-poly AAA,
//!   UE visibility-buffer parity, or product WebView path.
//!   `nanite_ready` / `micro_poly_aaa_ready` stay **false**.

use bytemuck::{Pod, Zeroable};
use aethel_kernel_rust::asset_color_appearance::{AssetColorAppearance, AssetColorParams};

fn srgb_to_linear(c: f32) -> f32 {
    if c <= 0.04045 {
        c / 12.92
    } else {
        ((c + 0.055) / 1.055).powf(2.4)
    }
}
use wgpu::util::DeviceExt;

use crate::gpu_meshlet_cull::MeshletCullScaffold;

/// Soft-raster target resolution default (substrate — CapScore soak overrides).
#[allow(dead_code)]
pub const MICROPOLY_WIDTH: u32 = 64;
#[allow(dead_code)]
pub const MICROPOLY_HEIGHT: u32 = 64;
// Legacy toy default must stay inside the CapScore ladder budget.
const _: () = assert!(MICROPOLY_WIDTH <= crate::gpu_soak_scale::MICROPOLY_SOFT_RASTER_MAX_EDGE);

/// One cooked triangle tagged with owning meshlet (48 bytes, 16-aligned).
#[repr(C)]
#[derive(Debug, Clone, Copy, Pod, Zeroable)]
pub struct MicropolyTri {
    pub v0: [f32; 3],
    pub meshlet_id: u32,
    pub v1: [f32; 3],
    pub tri_id: u32,
    pub v2: [f32; 3],
    pub _pad: u32,
}

/// 4x4 column-major matrix matching the WGSL `mat4x4<f32>` layout (64 bytes).
#[repr(C)]
#[derive(Debug, Clone, Copy, Pod, Zeroable)]
pub struct Mat4 {
    /// `cols[c][r]` = element at row `r`, column `c` (column-major).
    pub cols: [[f32; 4]; 4],
}

#[allow(dead_code)]
impl Mat4 {
    /// Identity matrix.
    pub const fn identity() -> Self {
        Self {
            cols: [
                [1.0, 0.0, 0.0, 0.0],
                [0.0, 1.0, 0.0, 0.0],
                [0.0, 0.0, 1.0, 0.0],
                [0.0, 0.0, 0.0, 1.0],
            ],
        }
    }

    /// `a * b` (column-major composition: apply `b` first, then `a`).
    pub fn mul(a: Self, b: Self) -> Self {
        let mut out = [[0.0f32; 4]; 4];
        for (c, out_col) in out.iter_mut().enumerate() {
            for (r, out_el) in out_col.iter_mut().enumerate() {
                *out_el = a.cols[0][r] * b.cols[c][0]
                    + a.cols[1][r] * b.cols[c][1]
                    + a.cols[2][r] * b.cols[c][2]
                    + a.cols[3][r] * b.cols[c][3];
            }
        }
        Self { cols: out }
    }

    /// Legacy fixed-view affine used by `new`/`new_with_extent`:
    /// `clip = (x/25, y/25, 0.5 + z/50, 1)` — byte-identical to the historical
    /// `xy/25, z/50` substrate convention under `projection_mode == 0`.
    pub const fn legacy_affine() -> Self {
        Self {
            cols: [
                [0.04, 0.0, 0.0, 0.0],
                [0.0, 0.04, 0.0, 0.0],
                [0.0, 0.0, 0.02, 0.0],
                [0.0, 0.0, 0.5, 1.0],
            ],
        }
    }

    /// Right-handed perspective projection (OpenGL NDC z ∈ [-1, 1]; view looks
    /// down −z). In-front points (z_view < 0) yield `w > 0`.
    pub fn perspective(aspect: f32, fov_y_radians: f32, near: f32, far: f32) -> Self {
        let f = 1.0 / (fov_y_radians * 0.5).tan();
        let range_inv = 1.0 / (near - far);
        Self {
            cols: [
                [f / aspect.max(1e-6), 0.0, 0.0, 0.0],
                [0.0, f, 0.0, 0.0],
                [0.0, 0.0, (far + near) * range_inv, -1.0],
                [0.0, 0.0, 2.0 * far * near * range_inv, 0.0],
            ],
        }
    }

    /// Right-handed `look_at` view matrix (column-major).
    pub fn look_at(eye: [f32; 3], center: [f32; 3], up: [f32; 3]) -> Self {
        let f = normalize3(sub3(center, eye));
        let s = normalize3(cross3(f, up));
        let u = cross3(s, f);
        Self {
            cols: [
                [s[0], u[0], -f[0], 0.0],
                [s[1], u[1], -f[1], 0.0],
                [s[2], u[2], -f[2], 0.0],
                [-dot3(s, eye), -dot3(u, eye), dot3(f, eye), 1.0],
            ],
        }
    }
}

/// Camera parameterization for the soft-raster (default = legacy fixed view).
#[repr(C)]
#[derive(Debug, Clone, Copy, Pod, Zeroable)]
pub struct MicropolyCamera {
    pub view_proj: Mat4,
    /// `0` = legacy affine (`clip = affine * p`, `z = 0.5 + p.z / 50`);
    /// `1` = perspective (`ndc = clip.xy / clip.w`, `z = ndc_z * 0.5 + 0.5`).
    pub projection_mode: u32,
}

#[allow(dead_code)]
impl MicropolyCamera {
    /// Legacy fixed view — reproduces the historical substrate exactly.
    pub fn legacy() -> Self {
        Self {
            view_proj: Mat4::legacy_affine(),
            projection_mode: 0,
        }
    }

    /// Real perspective camera: `view_proj = projection * view`.
    pub fn perspective(
        view: Mat4,
        aspect: f32,
        fov_y_radians: f32,
        near: f32,
        far: f32,
    ) -> Self {
        Self {
            view_proj: Mat4::mul(Mat4::perspective(aspect, fov_y_radians, near, far), view),
            projection_mode: 1,
        }
    }
}

impl Default for MicropolyCamera {
    fn default() -> Self {
        Self::legacy()
    }
}

#[repr(C, align(16))]
#[derive(Debug, Clone, Copy, Pod, Zeroable)]
struct RasterParams {
    view_proj: Mat4,
    width: u32,
    height: u32,
    tri_count: u32,
    projection_mode: u32,
    _pad: [u32; 4],
}

/// Resolve uniform (32 bytes, 16-aligned): target extent + key light.
#[repr(C, align(16))]
#[derive(Debug, Clone, Copy, Pod, Zeroable)]
struct ResolveParams {
    width: u32,
    height: u32,
    /// Temporal accumulation blend toward history (0 = off — first frame
    /// stays raw so pinned goldens hold; 0.15 afterwards = anti-shimmer).
    history_blend: f32,
    _pad1: u32,
    light_dir: [f32; 3],
    _pad2: u32,
}

/// Temporal history blend after the first frame (anti-shimmer accumulation).
pub const MICROPOLY_HISTORY_BLEND: f32 = 0.15;

#[repr(C)]
#[derive(Debug, Clone, Copy, Pod, Zeroable)]
pub struct MicropolyRasterStats {
    pub triangles_considered: u32,
    pub triangles_visible: u32,
    pub fragments_written: u32,
    pub depth_tests_passed: u32,
    /// Pixels shaded by the material resolve pass (0 → resolve failed).
    pub resolve_pixels_written: u32,
}

/// One material lane per meshlet (64 bytes, WGSL-layout-exact). The base
/// color, emission and specular response are the KERNEL-composed spectral
/// appearance (letter ac: CIE illuminant chroma → anisotropic microfacet GGX
/// → HDR → white-balance → ACES display) baked CPU-side — single source of
/// truth, the shader never re-implements the chain. `ao` carries a
/// deterministic per-meshlet ambient-occlusion factor.
#[repr(C, align(16))]
#[derive(Debug, Clone, Copy, PartialEq, Pod, Zeroable)]
pub struct MicropolyMaterial {
    pub base_color: [f32; 3],
    pub _pad0: f32,
    pub emissive_rgb: [f32; 3],
    pub _pad1: f32,
    pub specular_rgb: [f32; 3],
    pub _pad2: f32,
    pub metallic: f32,
    pub roughness: f32,
    pub ao: f32,
    pub _pad3: f32,
}

/// Per-soup-triangle geometric normal (16 bytes) for the resolve pass.
#[repr(C)]
#[derive(Debug, Clone, Copy, Pod, Zeroable)]
pub struct MicropolyTriNormal {
    pub n: [f32; 3],
    pub _pad: f32,
}

/// Deterministic 8-slot evidence palette — distinct material identities, never
/// a `meshlet_id → RGB` debug mapping.
pub const MICROPOLY_PALETTE: [[f32; 3]; 8] = [
    [0.78, 0.16, 0.18], // crimson clay
    [0.85, 0.62, 0.20], // ochre metal
    [0.22, 0.64, 0.38], // emerald moss
    [0.24, 0.45, 0.78], // azure ceramic
    [0.62, 0.34, 0.74], // violet lacquer
    [0.90, 0.45, 0.22], // terracotta
    [0.20, 0.62, 0.66], // teal patina
    [0.55, 0.58, 0.62], // slate stone
];

fn fnv1a(v: u32) -> u32 {
    let mut h: u32 = 0x811c_9dc5;
    for b in v.to_le_bytes() {
        h ^= u32::from(b);
        h = h.wrapping_mul(0x0100_0193);
    }
    h
}

/// Deterministic per-meshlet material table indexed by `meshlet_id`. The
/// palette supplies the linear albedo; the KERNEL asset-color chain (ac:
/// spectral diffuse + anisotropic GGX + HDR + white-balance + ACES) composes
/// the final display color — the engine render consumes the real kernel
/// appearance, never a re-implemented approximation. Holes (ids never used by
/// any triangle) receive the palette default.
pub fn build_materials(tris: &[MicropolyTri]) -> Vec<MicropolyMaterial> {
    let max_id = tris.iter().map(|t| t.meshlet_id).max().unwrap_or(0);
    let mut out = Vec::with_capacity(max_id as usize + 1);
    for id in 0..=max_id {
        let h = fnv1a(id);
        let palette_srgb = MICROPOLY_PALETTE[(h % 8) as usize];
        let linear_albedo = [
            srgb_to_linear(palette_srgb[0]),
            srgb_to_linear(palette_srgb[1]),
            srgb_to_linear(palette_srgb[2]),
        ];
        let metallic = (h >> 3) % 100;
        let roughness = 0.25 + ((h >> 9) % 60) as f32 / 100.0;
        let emissive_strength = if h.is_multiple_of(64) { 0.08 } else { 0.0 };
        let ao = 0.72 + ((h >> 5) % 28) as f32 / 100.0;
        let sample = AssetColorAppearance::resolve(&AssetColorParams {
            linear_albedo,
            metallic: metallic as f32 / 100.0,
            roughness,
            emissive_kelvin: 3200.0,
            emissive_strength,
            illuminant_kelvin: 6500.0,
            seed: u64::from(h),
        });
        out.push(MicropolyMaterial {
            base_color: sample.ldr_rgb,
            _pad0: 0.0,
            emissive_rgb: sample.emissive_rgb,
            _pad1: 0.0,
            specular_rgb: sample.specular_rgb,
            _pad2: 0.0,
            metallic: metallic as f32 / 100.0,
            roughness,
            ao,
            _pad3: 0.0,
        });
    }
    out
}

/// Geometric per-triangle normals from the soup vertices (degenerate triangles
/// fail closed to +Z, mirroring the raster's zero-area early-out).
pub fn build_tri_normals(tris: &[MicropolyTri]) -> Vec<MicropolyTriNormal> {
    tris.iter()
        .map(|t| {
            let e1 = sub3(t.v1, t.v0);
            let e2 = sub3(t.v2, t.v0);
            let n = cross3(e1, e2);
            let len = dot3(n, n).sqrt();
            let unit = if len <= 1e-12 { [0.0, 0.0, 1.0] } else {
                [n[0] / len, n[1] / len, n[2] / len]
            };
            MicropolyTriNormal { n: unit, _pad: 0.0 }
        })
        .collect()
}

const CLEAR_SHADER: &str = r#"
struct RasterParams {
    view_proj: mat4x4<f32>,
    width: u32,
    height: u32,
    tri_count: u32,
    projection_mode: u32,
    _pad0: u32,
    _pad1: u32,
    _pad2: u32,
    _pad3: u32,
};

struct Stats {
    triangles_considered: atomic<u32>,
    triangles_visible: atomic<u32>,
    fragments_written: atomic<u32>,
    depth_tests_passed: atomic<u32>,
    resolve_pixels_written: atomic<u32>,
};

@group(0) @binding(0) var<uniform> params: RasterParams;
@group(0) @binding(1) var<storage, read_write> depth: array<atomic<u32>>;
@group(0) @binding(2) var<storage, read_write> vis: array<u32>;
@group(0) @binding(3) var<storage, read_write> stats: Stats;

@compute @workgroup_size(64)
fn clear_main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let pix = gid.x;
    let n = params.width * params.height;
    if (pix < n) {
        // Far depth as ordered u32 bits of 1.0f.
        atomicStore(&depth[pix], 0x3f800000u);
        vis[pix] = 0xffffffffu;
    }
    if (pix == 0u) {
        atomicStore(&stats.triangles_considered, 0u);
        atomicStore(&stats.triangles_visible, 0u);
        atomicStore(&stats.fragments_written, 0u);
        atomicStore(&stats.depth_tests_passed, 0u);
        atomicStore(&stats.resolve_pixels_written, 0u);
    }
}
"#;

const RASTER_SHADER: &str = r#"
struct MicropolyTri {
    v0: vec3<f32>,
    meshlet_id: u32,
    v1: vec3<f32>,
    tri_id: u32,
    v2: vec3<f32>,
    _pad: u32,
};

struct RasterParams {
    view_proj: mat4x4<f32>,
    width: u32,
    height: u32,
    tri_count: u32,
    projection_mode: u32,
    _pad0: u32,
    _pad1: u32,
    _pad2: u32,
    _pad3: u32,
};

struct Stats {
    triangles_considered: atomic<u32>,
    triangles_visible: atomic<u32>,
    fragments_written: atomic<u32>,
    depth_tests_passed: atomic<u32>,
    resolve_pixels_written: atomic<u32>,
};

@group(0) @binding(0) var<uniform> params: RasterParams;
@group(0) @binding(1) var<storage, read> tris: array<MicropolyTri>;
@group(0) @binding(2) var<storage, read> visible_indices: array<u32>;
@group(0) @binding(3) var<storage, read> visible_count: u32;
@group(0) @binding(4) var<storage, read_write> depth: array<atomic<u32>>;
@group(0) @binding(5) var<storage, read_write> vis: array<u32>;
@group(0) @binding(6) var<storage, read_write> stats: Stats;

fn meshlet_visible(mid: u32) -> bool {
    let n = visible_count;
    for (var i = 0u; i < n; i = i + 1u) {
        if (visible_indices[i] == mid) {
            return true;
        }
    }
    return false;
}

fn project(p: vec3<f32>) -> vec3<f32> {
    // Data-driven projection: mode 0 reproduces the historical meshlet proxy
    // NDC convention (xy/25, z from world); mode 1 uses a real perspective
    // camera (view_proj) so the soft-raster scales beyond the 64² toy ceiling.
    let clip = params.view_proj * vec4<f32>(p, 1.0);
    var ndc_xy: vec2<f32>;
    var z: f32;
    if (params.projection_mode == 1u) {
        if (clip.w <= 0.0) {
            return vec3<f32>(clip.x, clip.y, 0.99);
        }
        let inv_w = 1.0 / clip.w;
        ndc_xy = clip.xy * inv_w;
        z = clamp(clip.z * inv_w * 0.5 + 0.5, 0.0, 1.0);
    } else {
        ndc_xy = clip.xy;
        z = clamp(clip.z, 0.01, 0.99);
    }
    return vec3<f32>(ndc_xy, z);
}

fn to_pixel(ndc: vec2<f32>) -> vec2<f32> {
    return vec2<f32>(
        (ndc.x * 0.5 + 0.5) * f32(params.width),
        (1.0 - (ndc.y * 0.5 + 0.5)) * f32(params.height),
    );
}

fn edge(a: vec2<f32>, b: vec2<f32>, p: vec2<f32>) -> f32 {
    return (p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x);
}

@compute @workgroup_size(64)
fn raster_main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let tid = gid.x;
    if (tid >= params.tri_count) {
        return;
    }
    atomicAdd(&stats.triangles_considered, 1u);
    let tri = tris[tid];
    if (!meshlet_visible(tri.meshlet_id)) {
        return;
    }
    atomicAdd(&stats.triangles_visible, 1u);

    let p0 = project(tri.v0);
    let p1 = project(tri.v1);
    let p2 = project(tri.v2);
    let s0 = to_pixel(p0.xy);
    let s1 = to_pixel(p1.xy);
    let s2 = to_pixel(p2.xy);

    var min_x = i32(floor(min(s0.x, min(s1.x, s2.x))));
    var max_x = i32(ceil(max(s0.x, max(s1.x, s2.x))));
    var min_y = i32(floor(min(s0.y, min(s1.y, s2.y))));
    var max_y = i32(ceil(max(s0.y, max(s1.y, s2.y))));
    // Substrate invariant: per-triangle raster budget of 128 px per side keeps
    // the bbox scan bounded at CapScore extents (up to 1024²). Screen-spanning
    // triangles clamp to a 128 px window around the bbox center instead of
    // serializing a whole workgroup through ~1M pixel iterations.
    if (max_x - min_x > 128) {
        let cx = (min_x + max_x) / 2;
        min_x = max(min_x, cx - 64);
        max_x = min(max_x, cx + 64);
    }
    if (max_y - min_y > 128) {
        let cy = (min_y + max_y) / 2;
        min_y = max(min_y, cy - 64);
        max_y = min(max_y, cy + 64);
    }
    let x0 = clamp(min_x, 0, i32(params.width) - 1);
    let x1 = clamp(max_x, 0, i32(params.width) - 1);
    let y0 = clamp(min_y, 0, i32(params.height) - 1);
    let y1 = clamp(max_y, 0, i32(params.height) - 1);

    let area = edge(s0, s1, s2);
    if (abs(area) < 1e-5) {
        return;
    }

    for (var y = y0; y <= y1; y = y + 1) {
        for (var x = x0; x <= x1; x = x + 1) {
            let p = vec2<f32>(f32(x) + 0.5, f32(y) + 0.5);
            let w0 = edge(s1, s2, p) / area;
            let w1 = edge(s2, s0, p) / area;
            let w2 = edge(s0, s1, p) / area;
            if (w0 < 0.0 || w1 < 0.0 || w2 < 0.0) {
                continue;
            }
            let z = w0 * p0.z + w1 * p1.z + w2 * p2.z;
            let zbits = bitcast<u32>(z);
            let pix = u32(y) * params.width + u32(x);
            let old = atomicMin(&depth[pix], zbits);
            if (zbits <= old) {
                atomicAdd(&stats.depth_tests_passed, 1u);
                vis[pix] = (tri.meshlet_id << 16u) | (tri.tri_id & 0xffffu);
                atomicAdd(&stats.fragments_written, 1u);
            }
        }
    }
}
"#;

/// Material resolve: visibility buffer → shaded material colors (evidence
/// Lambert + Blinn-Phong-lite). Proves the resolve path is material-driven,
/// not meshlet-ID debug colors. Background pixels resolve to opaque black.
const RESOLVE_SHADER: &str = r#"
struct ResolveParams {
    width: u32,
    height: u32,
    history_blend: f32,
    _pad1: u32,
    light_dir: vec3<f32>,
    _pad2: u32,
};

struct MicropolyMaterial {
    base_color: vec3<f32>,
    emissive_rgb: vec3<f32>,
    specular_rgb: vec3<f32>,
    metallic: f32,
    roughness: f32,
    ao: f32,
    _pad: f32,
};

struct TriNormal {
    n: vec3<f32>,
    _pad: f32,
};

struct Stats {
    triangles_considered: atomic<u32>,
    triangles_visible: atomic<u32>,
    fragments_written: atomic<u32>,
    depth_tests_passed: atomic<u32>,
    resolve_pixels_written: atomic<u32>,
};

@group(0) @binding(0) var<uniform> params: ResolveParams;
@group(0) @binding(1) var<storage, read> vis: array<u32>;
@group(0) @binding(2) var<storage, read> materials: array<MicropolyMaterial>;
@group(0) @binding(3) var<storage, read> normals: array<TriNormal>;
@group(0) @binding(4) var<storage, read_write> color_out: array<vec4<f32>>;
@group(0) @binding(5) var<storage, read_write> stats: Stats;
@group(0) @binding(6) var<storage, read_write> history: array<vec4<f32>>;

@compute @workgroup_size(64)
fn resolve_main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let pix = gid.x;
    if (pix >= params.width * params.height) {
        return;
    }
    let v = vis[pix];
    if (v == 0xffffffffu) {
        let prev = history[pix];
        color_out[pix] = mix(vec4<f32>(0.0, 0.0, 0.0, 1.0), prev, params.history_blend);
        history[pix] = color_out[pix];
        return;
    }
    let mid = v >> 16u;
    let tid = v & 0xffffu;
    let m = materials[mid];
    let n = normals[tid].n;
    let l = normalize(-params.light_dir);
    let ndl = max(dot(n, l), 0.0);
    let view = vec3<f32>(0.0, 0.0, 1.0);
    let h = normalize(l + view);
    // Roughness-shaped lobe over the KERNEL's anisotropic GGX specular color
    // (the chain computed it — the shader only applies the lobe).
    let shininess = 4.0 + m.roughness * 60.0;
    let spec = m.specular_rgb * pow(max(dot(n, h), 0.0), shininess);
    let col = m.base_color * (m.ao * 0.18 + 0.82 * ndl) + spec + m.emissive_rgb;
    // Temporal accumulation (anti-shimmer): blend toward the previous frame's
    // resolved color. First frame runs raw (blend = 0 → pinned goldens hold).
    let raw = vec4<f32>(clamp(col, vec3<f32>(0.0), vec3<f32>(1.0)), 1.0);
    let out = mix(raw, history[pix], params.history_blend);
    color_out[pix] = out;
    history[pix] = out;
    atomicAdd(&stats.resolve_pixels_written, 1u);
}
"#;

fn sub3(a: [f32; 3], b: [f32; 3]) -> [f32; 3] {
    [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

fn dot3(a: [f32; 3], b: [f32; 3]) -> f32 {
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

fn cross3(a: [f32; 3], b: [f32; 3]) -> [f32; 3] {
    [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ]
}

fn normalize3(v: [f32; 3]) -> [f32; 3] {
    let len = dot3(v, v).sqrt();
    if len <= 1e-12 {
        [0.0, 0.0, 0.0]
    } else {
        [v[0] / len, v[1] / len, v[2] / len]
    }
}

/// CPU reference of the WGSL `project()` — mirrors the shader exactly so golden
/// visibility fixtures can be computed deterministically off-GPU.
#[allow(dead_code)]
pub fn project_point(camera: &MicropolyCamera, p: [f32; 3]) -> [f32; 3] {
    let c = &camera.view_proj.cols;
    let x = c[0][0] * p[0] + c[1][0] * p[1] + c[2][0] * p[2] + c[3][0];
    let y = c[0][1] * p[0] + c[1][1] * p[1] + c[2][1] * p[2] + c[3][1];
    let z = c[0][2] * p[0] + c[1][2] * p[1] + c[2][2] * p[2] + c[3][2];
    let w = c[0][3] * p[0] + c[1][3] * p[1] + c[2][3] * p[2] + c[3][3];
    if camera.projection_mode == 1 {
        if w <= 0.0 {
            return [x, y, 0.99];
        }
        let inv_w = 1.0 / w;
        let nz = ((z * inv_w) * 0.5 + 0.5).clamp(0.0, 1.0);
        [x * inv_w, y * inv_w, nz]
    } else {
        [x, y, z.clamp(0.01, 0.99)]
    }
}

/// Persistent soft-raster scaffold bound to cull visibility buffers.
pub struct MicropolyRasterScaffold {
    params: RasterParams,
    params_buffer: wgpu::Buffer,
    #[allow(dead_code)]
    tris_buffer: wgpu::Buffer,
    #[allow(dead_code)]
    depth_buffer: wgpu::Buffer,
    #[allow(dead_code)]
    vis_buffer: wgpu::Buffer,
    stats_buffer: wgpu::Buffer,
    clear_pipeline: wgpu::ComputePipeline,
    clear_bind_group: wgpu::BindGroup,
    raster_pipeline: wgpu::ComputePipeline,
    raster_bind_group: wgpu::BindGroup,
    resolve_params: ResolveParams,
    resolve_params_buffer: wgpu::Buffer,
    color_buffer: wgpu::Buffer,
    resolve_pipeline: wgpu::ComputePipeline,
    resolve_bind_group: wgpu::BindGroup,
    /// Frames encoded so far (history blend starts after the first).
    encoded_frames: std::sync::atomic::AtomicU32,
    pub triangle_count: u32,
    pub material_count: u32,
    pub width: u32,
    pub height: u32,
}

/// Post-loop evidence of the material resolve: samples a grid of pixels from
/// the resolved color buffer and reports how many are shaded (non-background)
/// and the peak luminance — proving the resolve produced material colors, not
/// merely that the dispatch ran.
pub struct ResolvedEvidence {
    pub sampled_pixels: u32,
    pub shaded_pixels: u32,
    pub max_luminance: f32,
}

impl MicropolyRasterScaffold {
    /// Accessor for the composited resolve output (async screenshot gate /
    /// evidence readback) — buffer carries COPY_SRC.
    pub fn resolve_color_buffer(&self) -> &wgpu::Buffer {
        &self.color_buffer
    }

    /// Temporal history accumulation is active after the first encoded frame.
    pub fn history_accumulation_active(&self) -> bool {
        self.encoded_frames.load(std::sync::atomic::Ordering::Relaxed) > 1
    }

    /// Post-loop evidence only — readback of the device depth (u32 ordered
    /// bits of f32 z) and visibility buffers, for GPU-vs-CPU parity fixtures.
    pub fn readback_depth_vis(
        &self,
        device: &wgpu::Device,
        queue: &wgpu::Queue,
    ) -> (Vec<u32>, Vec<u32>) {
        let pix = (self.width * self.height) as u64;
        let byte_len = pix * 4;
        let depth_rb = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Aethel Micropoly Depth Readback"),
            size: byte_len,
            usage: wgpu::BufferUsages::MAP_READ | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });
        let vis_rb = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Aethel Micropoly Vis Readback"),
            size: byte_len,
            usage: wgpu::BufferUsages::MAP_READ | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });
        let mut encoder = device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
            label: Some("Aethel Micropoly DepthVis Readback Encoder"),
        });
        encoder.copy_buffer_to_buffer(&self.depth_buffer, 0, &depth_rb, 0, byte_len);
        encoder.copy_buffer_to_buffer(&self.vis_buffer, 0, &vis_rb, 0, byte_len);
        queue.submit(Some(encoder.finish()));
        let depth_slice = depth_rb.slice(..);
        let vis_slice = vis_rb.slice(..);
        depth_slice.map_async(wgpu::MapMode::Read, |_| {});
        vis_slice.map_async(wgpu::MapMode::Read, |_| {});
        device.poll(wgpu::Maintain::Wait);
        let depth: Vec<u32> = bytemuck::cast_slice(&depth_slice.get_mapped_range()).to_vec();
        let vis: Vec<u32> = bytemuck::cast_slice(&vis_slice.get_mapped_range()).to_vec();
        depth_rb.unmap();
        vis_rb.unmap();
        (depth, vis)
    }

    /// Post-loop evidence only (grid-sampled readback of the resolve color).
    pub fn readback_resolved_evidence(
        &self,
        device: &wgpu::Device,
        queue: &wgpu::Queue,
    ) -> ResolvedEvidence {
        let pix = (self.width * self.height) as u64;
        let byte_len = pix * 16;
        let readback = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Aethel Micropoly Resolve Readback"),
            size: byte_len,
            usage: wgpu::BufferUsages::MAP_READ | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });
        let mut encoder = device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
            label: Some("Aethel Micropoly Resolve Readback Encoder"),
        });
        encoder.copy_buffer_to_buffer(&self.color_buffer, 0, &readback, 0, byte_len);
        queue.submit(Some(encoder.finish()));
        let slice = readback.slice(..);
        slice.map_async(wgpu::MapMode::Read, |_| {});
        device.poll(wgpu::Maintain::Wait);
        let mut evidence = ResolvedEvidence {
            sampled_pixels: 0,
            shaded_pixels: 0,
            max_luminance: 0.0,
        };
        {
            let data = slice.get_mapped_range();
            let pixels: &[f32] = bytemuck::cast_slice(&data);
            let steps_x = 16u32;
            let steps_y = 16u32;
            for sy in 0..steps_y {
                for sx in 0..steps_x {
                    let x = sx * self.width / steps_x.max(1);
                    let y = sy * self.height / steps_y.max(1);
                    let idx = ((y * self.width + x) * 4) as usize;
                    if idx + 3 >= pixels.len() {
                        continue;
                    }
                    let lum = pixels[idx] * 0.2126 + pixels[idx + 1] * 0.7152 + pixels[idx + 2] * 0.0722;
                    evidence.sampled_pixels += 1;
                    if pixels[idx + 3] > 0.0 && lum > 0.0 {
                        evidence.shaded_pixels += 1;
                        evidence.max_luminance = evidence.max_luminance.max(lum);
                    }
                }
            }
        }
        readback.unmap();
        evidence
    }

    /// Default 64² soft-raster — CapScore soak uses [`Self::new_with_extent`].
    #[allow(dead_code)]
    pub fn new(
        device: &wgpu::Device,
        tris: &[MicropolyTri],
        cull: &MeshletCullScaffold,
    ) -> Result<Self, String> {
        Self::new_with_extent(device, tris, cull, MICROPOLY_WIDTH, MICROPOLY_HEIGHT)
    }

    /// Soft-raster at CapScore-gated soak extent (still not Micro-Poly AAA).
    pub fn new_with_extent(
        device: &wgpu::Device,
        tris: &[MicropolyTri],
        cull: &MeshletCullScaffold,
        width: u32,
        height: u32,
    ) -> Result<Self, String> {
        Self::new_with_extent_and_camera(
            device,
            tris,
            cull,
            width,
            height,
            MicropolyCamera::legacy(),
        )
    }

    /// Soft-raster at a CapScore-gated extent with an explicit camera. The legacy
    /// fixed-view (mode 0) reproduces the historical substrate byte-for-byte; a
    /// real perspective camera (mode 1) removes the toy-view limitation so the
    /// soft-raster can genuinely scale beyond the 64² ceiling. Still not
    /// Micro-Poly AAA — `micro_poly_aaa_ready` stays false.
    pub fn new_with_extent_and_camera(
        device: &wgpu::Device,
        tris: &[MicropolyTri],
        cull: &MeshletCullScaffold,
        width: u32,
        height: u32,
        camera: MicropolyCamera,
    ) -> Result<Self, String> {
        if tris.is_empty() {
            return Err("MicropolyRasterScaffold requires non-empty triangle soup".into());
        }
        let width = width.max(8);
        let height = height.max(8);
        let params = RasterParams {
            view_proj: camera.view_proj,
            width,
            height,
            tri_count: tris.len() as u32,
            projection_mode: camera.projection_mode,
            _pad: [0; 4],
        };
        let pix = (width * height) as usize;

        let clear_shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Aethel Micropoly Clear"),
            source: wgpu::ShaderSource::Wgsl(CLEAR_SHADER.into()),
        });
        let raster_shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Aethel Micropoly Raster"),
            source: wgpu::ShaderSource::Wgsl(RASTER_SHADER.into()),
        });

        let params_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel Micropoly Params"),
            contents: bytemuck::bytes_of(&params),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });
        let tris_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel Micropoly Tris"),
            contents: bytemuck::cast_slice(tris),
            usage: wgpu::BufferUsages::STORAGE,
        });
        let depth_init = vec![0x3f800000u32; pix];
        let depth_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel Micropoly Depth"),
            contents: bytemuck::cast_slice(&depth_init),
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_DST | wgpu::BufferUsages::COPY_SRC,
        });
        let vis_init = vec![0xffffffffu32; pix];
        let vis_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel Micropoly Vis"),
            contents: bytemuck::cast_slice(&vis_init),
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_DST | wgpu::BufferUsages::COPY_SRC,
        });
        let stats_zero = MicropolyRasterStats {
            triangles_considered: 0,
            triangles_visible: 0,
            fragments_written: 0,
            depth_tests_passed: 0,
            resolve_pixels_written: 0,
        };
        let stats_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel Micropoly Stats"),
            contents: bytemuck::bytes_of(&stats_zero),
            usage: wgpu::BufferUsages::STORAGE
                | wgpu::BufferUsages::COPY_SRC
                | wgpu::BufferUsages::COPY_DST,
        });

        let clear_bgl = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Aethel Micropoly Clear BGL"),
            entries: &[
                uniform_entry(0),
                storage_entry(1, false),
                storage_entry(2, false),
                storage_entry(3, false),
            ],
        });
        let clear_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Aethel Micropoly Clear Layout"),
            bind_group_layouts: &[&clear_bgl],
            push_constant_ranges: &[],
        });
        let clear_pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Aethel Micropoly Clear Pipeline"),
            layout: Some(&clear_layout),
            module: &clear_shader,
            entry_point: "clear_main",
            compilation_options: Default::default(),
        });
        let clear_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("Aethel Micropoly Clear BG"),
            layout: &clear_bgl,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: params_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: depth_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 2,
                    resource: vis_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 3,
                    resource: stats_buffer.as_entire_binding(),
                },
            ],
        });

        let raster_bgl = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Aethel Micropoly Raster BGL"),
            entries: &[
                uniform_entry(0),
                storage_entry(1, true),
                storage_entry(2, true),
                storage_entry(3, true),
                storage_entry(4, false),
                storage_entry(5, false),
                storage_entry(6, false),
            ],
        });
        let raster_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Aethel Micropoly Raster Layout"),
            bind_group_layouts: &[&raster_bgl],
            push_constant_ranges: &[],
        });
        let raster_pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Aethel Micropoly Raster Pipeline"),
            layout: Some(&raster_layout),
            module: &raster_shader,
            entry_point: "raster_main",
            compilation_options: Default::default(),
        });
        let raster_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("Aethel Micropoly Raster BG"),
            layout: &raster_bgl,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: params_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: tris_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 2,
                    resource: cull.visible_indices_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 3,
                    resource: cull.visible_count_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 4,
                    resource: depth_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 5,
                    resource: vis_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 6,
                    resource: stats_buffer.as_entire_binding(),
                },
            ],
        });

        // ---- Material resolve (evidence materials, not debug ID colors) ----
        let resolve_params = ResolveParams {
            width,
            height,
            history_blend: 0.0, // first frame raw (pinned goldens hold)
            _pad1: 0,
            light_dir: [0.3, -0.8, 0.5],
            _pad2: 0,
        };
        let materials = build_materials(tris);
        let normals = build_tri_normals(tris);
        let resolve_params_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel Micropoly Resolve Params"),
            contents: bytemuck::bytes_of(&resolve_params),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });
        let materials_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel Micropoly Materials"),
            contents: bytemuck::cast_slice(&materials),
            usage: wgpu::BufferUsages::STORAGE,
        });
        let normals_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel Micropoly Tri Normals"),
            contents: bytemuck::cast_slice(&normals),
            usage: wgpu::BufferUsages::STORAGE,
        });
        let color_init = vec![0.0f32; pix * 4];
        let color_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel Micropoly Resolve Color"),
            contents: bytemuck::cast_slice(&color_init),
            usage: wgpu::BufferUsages::STORAGE
                | wgpu::BufferUsages::COPY_DST
                | wgpu::BufferUsages::COPY_SRC,
        });
        // Temporal history (anti-shimmer): read_write per-pixel (each
        // invocation only touches its own pixel — no cross-pixel race).
        let history_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Aethel Micropoly Resolve History"),
            contents: bytemuck::cast_slice(&color_init),
            usage: wgpu::BufferUsages::STORAGE,
        });
        let resolve_shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Aethel Micropoly Material Resolve"),
            source: wgpu::ShaderSource::Wgsl(RESOLVE_SHADER.into()),
        });
        let resolve_bgl = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Aethel Micropoly Resolve BGL"),
            entries: &[
                uniform_entry(0),
                storage_entry(1, true),
                storage_entry(2, true),
                storage_entry(3, true),
                storage_entry(4, false),
                storage_entry(5, false),
                storage_entry(6, false),
            ],
        });
        let resolve_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Aethel Micropoly Resolve Layout"),
            bind_group_layouts: &[&resolve_bgl],
            push_constant_ranges: &[],
        });
        let resolve_pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Aethel Micropoly Material Resolve Pipeline"),
            layout: Some(&resolve_layout),
            module: &resolve_shader,
            entry_point: "resolve_main",
            compilation_options: Default::default(),
        });
        let resolve_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("Aethel Micropoly Resolve BG"),
            layout: &resolve_bgl,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: resolve_params_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: vis_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 2,
                    resource: materials_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 3,
                    resource: normals_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 4,
                    resource: color_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 5,
                    resource: stats_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 6,
                    resource: history_buffer.as_entire_binding(),
                },
            ],
        });

        Ok(Self {
            params,
            params_buffer,
            tris_buffer,
            depth_buffer,
            vis_buffer,
            stats_buffer,
            clear_pipeline,
            clear_bind_group,
            raster_pipeline,
            raster_bind_group,
            resolve_params,
            resolve_params_buffer,
            color_buffer,
            resolve_pipeline,
            resolve_bind_group,
            encoded_frames: std::sync::atomic::AtomicU32::new(0),
            triangle_count: params.tri_count,
            material_count: materials.len() as u32,
            width: params.width,
            height: params.height,
        })
    }

    /// Clear + soft-raster visible meshlet triangles + material resolve
    /// (no CPU readback on hot path).
    pub fn encode_raster(&self, queue: &wgpu::Queue, encoder: &mut wgpu::CommandEncoder) {
        queue.write_buffer(&self.params_buffer, 0, bytemuck::bytes_of(&self.params));
        // Temporal accumulation: first frame raw (blend 0 — pinned goldens
        // hold), subsequent frames blend toward history (anti-shimmer).
        let frames = self.encoded_frames.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        let mut resolve_params = self.resolve_params;
        resolve_params.history_blend = if frames == 0 { 0.0 } else { MICROPOLY_HISTORY_BLEND };
        queue.write_buffer(
            &self.resolve_params_buffer,
            0,
            bytemuck::bytes_of(&resolve_params),
        );
        let pix = self.width * self.height;
        {
            let mut pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
                label: Some("Aethel Micropoly Clear"),
                timestamp_writes: None,
            });
            pass.set_pipeline(&self.clear_pipeline);
            pass.set_bind_group(0, &self.clear_bind_group, &[]);
            pass.dispatch_workgroups(pix.div_ceil(64), 1, 1);
        }
        {
            let mut pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
                label: Some("Aethel Micropoly Soft Raster"),
                timestamp_writes: None,
            });
            pass.set_pipeline(&self.raster_pipeline);
            pass.set_bind_group(0, &self.raster_bind_group, &[]);
            pass.dispatch_workgroups(self.triangle_count.div_ceil(64), 1, 1);
        }
        {
            let mut pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
                label: Some("Aethel Micropoly Material Resolve"),
                timestamp_writes: None,
            });
            pass.set_pipeline(&self.resolve_pipeline);
            pass.set_bind_group(0, &self.resolve_bind_group, &[]);
            pass.dispatch_workgroups(pix.div_ceil(64), 1, 1);
        }
    }

    /// Post-loop evidence only.
    pub fn readback_stats(
        &self,
        device: &wgpu::Device,
        queue: &wgpu::Queue,
    ) -> MicropolyRasterStats {
        let readback = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Aethel Micropoly Stats Readback"),
            size: std::mem::size_of::<MicropolyRasterStats>() as u64,
            usage: wgpu::BufferUsages::MAP_READ | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });
        let mut encoder = device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
            label: Some("Aethel Micropoly Stats Readback Encoder"),
        });
        encoder.copy_buffer_to_buffer(
            &self.stats_buffer,
            0,
            &readback,
            0,
            std::mem::size_of::<MicropolyRasterStats>() as u64,
        );
        queue.submit(Some(encoder.finish()));
        let slice = readback.slice(..);
        slice.map_async(wgpu::MapMode::Read, |_| {});
        device.poll(wgpu::Maintain::Wait);
        let stats = {
            let data = slice.get_mapped_range();
            *bytemuck::from_bytes::<MicropolyRasterStats>(&data)
        };
        readback.unmap();
        stats
    }
}

fn storage_entry(binding: u32, read_only: bool) -> wgpu::BindGroupLayoutEntry {
    wgpu::BindGroupLayoutEntry {
        binding,
        visibility: wgpu::ShaderStages::COMPUTE,
        ty: wgpu::BindingType::Buffer {
            ty: wgpu::BufferBindingType::Storage { read_only },
            has_dynamic_offset: false,
            min_binding_size: None,
        },
        count: None,
    }
}

fn uniform_entry(binding: u32) -> wgpu::BindGroupLayoutEntry {
    wgpu::BindGroupLayoutEntry {
        binding,
        visibility: wgpu::ShaderStages::COMPUTE,
        ty: wgpu::BindingType::Buffer {
            ty: wgpu::BufferBindingType::Uniform,
            has_dynamic_offset: false,
            min_binding_size: None,
        },
        count: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn assert_close(a: f32, b: f32, eps: f32) {
        assert!((a - b).abs() <= eps, "expected {a} ≈ {b} (±{eps})");
    }

    /// Applies a 4x4 transform to a point without clipping, w-division, or depth
    /// clamping — used to assert raw view-space invariants of the `look_at` basis.
    fn view_transform(m: &Mat4, p: [f32; 3]) -> [f32; 3] {
        let c = &m.cols;
        [
            c[0][0] * p[0] + c[1][0] * p[1] + c[2][0] * p[2] + c[3][0],
            c[0][1] * p[0] + c[1][1] * p[1] + c[2][1] * p[2] + c[3][1],
            c[0][2] * p[0] + c[1][2] * p[1] + c[2][2] * p[2] + c[3][2],
        ]
    }

    #[test]
    fn micropoly_tri_is_48_bytes() {
        assert_eq!(std::mem::size_of::<MicropolyTri>(), 48);
        assert_eq!(std::mem::size_of::<MicropolyRasterStats>(), 20);
        assert_eq!(std::mem::size_of::<MicropolyMaterial>(), 64);
        assert_eq!(std::mem::size_of::<MicropolyTriNormal>(), 16);
    }

    #[test]
    fn resolve_params_layout_is_32_bytes_aligned() {
        assert_eq!(std::mem::size_of::<ResolveParams>(), 32);
        assert_eq!(std::mem::align_of::<ResolveParams>(), 16);
    }

    #[test]
    fn materials_are_indexed_deterministic_and_kernel_composed() {
        let tris = vec![
            MicropolyTri {
                v0: [0.0, 0.0, 0.0],
                meshlet_id: 0,
                v1: [1.0, 0.0, 0.0],
                tri_id: 0,
                v2: [0.0, 1.0, 0.0],
                _pad: 0,
            },
            MicropolyTri {
                v0: [0.0, 0.0, 0.0],
                meshlet_id: 3,
                v1: [1.0, 0.0, 0.0],
                tri_id: 1,
                v2: [0.0, 1.0, 0.0],
                _pad: 0,
            },
        ];
        let a = build_materials(&tris);
        let b = build_materials(&tris);
        assert_eq!(a.len(), 4, "table indexes meshlet_id 0..=3");
        assert_eq!(a, b, "deterministic across builds");
        assert_ne!(a[0].base_color, a[3].base_color);
        assert!((0.0..=1.0).contains(&a[0].metallic));
        assert!((0.0..=1.0).contains(&a[0].roughness));
        assert!((0.5..=1.0).contains(&a[0].ao), "AO must stay in the ambient-factor range");
        // Kernel-composition contract (anti-drift): the baked base color must
        // equal the kernel ac chain's ACES display output for the SAME inputs —
        // single source of truth, no re-implementation.
        for id in 0..4u32 {
            let h = fnv1a(id);
            let palette_srgb = MICROPOLY_PALETTE[(h % 8) as usize];
            let linear = [
                srgb_to_linear(palette_srgb[0]),
                srgb_to_linear(palette_srgb[1]),
                srgb_to_linear(palette_srgb[2]),
            ];
            let reference = AssetColorAppearance::resolve(&AssetColorParams {
                linear_albedo: linear,
                metallic: ((h >> 3) % 100) as f32 / 100.0,
                roughness: 0.25 + ((h >> 9) % 60) as f32 / 100.0,
                emissive_kelvin: 3200.0,
                emissive_strength: if h.is_multiple_of(64) { 0.08 } else { 0.0 },
                illuminant_kelvin: 6500.0,
                seed: u64::from(h),
            });
            assert_eq!(
                a[id as usize].base_color, reference.ldr_rgb,
                "baked base color must be the kernel ACES output for id {id}"
            );
            assert_eq!(
                a[id as usize].emissive_rgb, reference.emissive_rgb,
                "baked emission must be the kernel Planckian output for id {id}"
            );
            assert_eq!(
                a[id as usize].specular_rgb, reference.specular_rgb,
                "baked specular must be the kernel anisotropic GGX output for id {id}"
            );
        }
    }

    #[test]
    fn tri_normals_are_unit_and_degenerate_fail_closed() {
        let tris = vec![
            MicropolyTri {
                v0: [0.0, 0.0, 0.0],
                meshlet_id: 0,
                v1: [1.0, 0.0, 0.0],
                tri_id: 0,
                v2: [0.0, 1.0, 0.0],
                _pad: 0,
            },
            MicropolyTri {
                v0: [1.0, 1.0, 1.0],
                meshlet_id: 0,
                v1: [1.0, 1.0, 1.0],
                tri_id: 1,
                v2: [1.0, 1.0, 1.0],
                _pad: 0,
            },
        ];
        let norms = build_tri_normals(&tris);
        assert_eq!(norms.len(), 2);
        let n0 = norms[0].n;
        let len = dot3(n0, n0).sqrt();
        assert_close(len, 1.0, 1e-5);
        assert_close(n0[2], 1.0, 1e-5);
        let n1 = norms[1].n;
        let len1 = dot3(n1, n1).sqrt();
        assert_close(len1, 1.0, 1e-5);
        assert_close(n1[2], 1.0, 1e-5); // degenerate → +Z fail-closed
    }

    #[test]
    fn raster_params_layout_is_pod_and_96_bytes() {
        assert_eq!(std::mem::size_of::<RasterParams>(), 96);
        assert_eq!(std::mem::align_of::<RasterParams>(), 16);
        assert_eq!(std::mem::size_of::<Mat4>(), 64);
    }

    #[test]
    fn identity_matrix_maps_point_unchanged() {
        let out = project_point(
            &MicropolyCamera {
                view_proj: Mat4::identity(),
                projection_mode: 1,
            },
            [3.0, -2.0, -5.0],
        );
        assert_close(out[0], 3.0, 1e-5);
        assert_close(out[1], -2.0, 1e-5);
    }

    #[test]
    fn legacy_affine_reproduces_fixed_view_exactly() {
        let cam = MicropolyCamera::legacy();
        let out = project_point(&cam, [10.0, 10.0, 10.0]);
        assert_close(out[0], 0.4, 1e-6); // 10/25
        assert_close(out[1], 0.4, 1e-6); // 10/25
        assert_close(out[2], 0.7, 1e-6); // 0.5 + 10/50
        let far = project_point(&cam, [0.0, 0.0, 50.0]);
        assert_close(far[2], 0.99, 1e-6); // clamped far
    }

    #[test]
    fn perspective_maps_near_to_zero_and_far_to_one() {
        let cam = MicropolyCamera {
            view_proj: Mat4::perspective(1.0, std::f32::consts::FRAC_PI_2, 0.1, 100.0),
            projection_mode: 1,
        };
        let near = project_point(&cam, [0.0, 0.0, -0.1]);
        assert_close(near[2], 0.0, 1e-4);
        let far = project_point(&cam, [0.0, 0.0, -100.0]);
        assert_close(far[2], 1.0, 1e-4);
    }

    #[test]
    fn perspective_keeps_in_front_positive_w() {
        let cam = MicropolyCamera {
            view_proj: Mat4::perspective(1.0, std::f32::consts::FRAC_PI_2, 0.1, 100.0),
            projection_mode: 1,
        };
        let out = project_point(&cam, [0.0, 0.0, -5.0]);
        assert!(out[2] > 0.0 && out[2] < 1.0, "in-front depth {out:?}");
        let behind = project_point(&cam, [0.0, 0.0, 5.0]);
        assert_close(behind[2], 0.99, 1e-6); // fail-closed far
    }

    #[test]
    fn look_at_basis_is_orthonormal_and_looks_down_minus_z() {
        let view = Mat4::look_at([0.0, 0.0, 0.0], [0.0, 0.0, -1.0], [0.0, 1.0, 0.0]);
        // Basis vectors packed into columns 0..2: s (right), u (up), -f (back).
        let s = [view.cols[0][0], view.cols[0][1], view.cols[0][2]];
        let u = [view.cols[1][0], view.cols[1][1], view.cols[1][2]];
        let nf = [view.cols[2][0], view.cols[2][1], view.cols[2][2]];
        // Pairwise orthonormality: every pair is perpendicular, every axis unit.
        assert_close(dot3(s, u), 0.0, 1e-5);
        assert_close(dot3(u, nf), 0.0, 1e-5);
        assert_close(dot3(nf, s), 0.0, 1e-5);
        assert_close(dot3(s, s), 1.0, 1e-5);
        assert_close(dot3(u, u), 1.0, 1e-5);
        assert_close(dot3(nf, nf), 1.0, 1e-5);
        // The camera looks down −z: column 2 of the view matrix must be [0, 0, 1].
        assert_close(nf[0], 0.0, 1e-5);
        assert_close(nf[1], 0.0, 1e-5);
        assert_close(nf[2], 1.0, 1e-5);
        // The eye maps to the view origin; one unit ahead maps to view z = -1.
        let eye_view = view_transform(&view, [0.0, 0.0, 0.0]);
        assert_close(eye_view[0], 0.0, 1e-5);
        assert_close(eye_view[1], 0.0, 1e-5);
        assert_close(eye_view[2], 0.0, 1e-5);
        let fwd_view = view_transform(&view, [0.0, 0.0, -1.0]);
        assert_close(fwd_view[0], 0.0, 1e-5);
        assert_close(fwd_view[1], 0.0, 1e-5);
        assert_close(fwd_view[2], -1.0, 1e-5);
    }

    #[test]
    fn mat4_mul_compiles_perspective_view_proj() {
        let view = Mat4::look_at([2.0, 3.0, 5.0], [0.0, 0.0, 0.0], [0.0, 1.0, 0.0]);
        let cam =
            MicropolyCamera::perspective(view, 16.0 / 9.0, std::f32::consts::FRAC_PI_3, 0.05, 500.0);
        let proj = Mat4::perspective(16.0 / 9.0, std::f32::consts::FRAC_PI_3, 0.05, 500.0);
        let expected = Mat4::mul(proj, view);
        for c in 0..4 {
            for r in 0..4 {
                assert_close(cam.view_proj.cols[c][r], expected.cols[c][r], 1e-6);
            }
        }
    }
}
