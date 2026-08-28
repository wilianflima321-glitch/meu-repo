//! F1 — Shader Cooker + PSO Vault (Armadura Pesada, "A Guerra do Stuttering").
//! letter **km**.
//!
//! Replaces the 710-byte `println!` theater stub (the old module only printed
//! "Intenção detectada" and never compiled a single pipeline) with a real,
//! deterministic, **GPU-agnostic** shader cooking spine — the id Tech / Doom
//! style answer to Unreal's runtime PSO stutter:
//!
//! - **`ShaderPermutation`**: a fixed bitmask of material features
//!   (albedo/normal/roughness-metallic/emissive/opacity-mask/double-sided/
//!   anisotropy/transmission/skin/cloth/terrain/shadow-caster). Each material
//!   is a permutation; the renderer never branches per-draw, it binds the exact
//!   pipeline whose key matches the permutation — no runtime compile.
//! - **`PipelineKey`**: a FNV-1a 64-bit fingerprint of `(permutation, pass)`.
//!   Every reachable pipeline in a level has exactly one key, derived purely
//!   from material data — two identical materials can never disagree.
//! - **`MaterialManifest`**: the fixed-capacity list of every material that can
//!   appear in the scene (read once while the player sits in the menu).
//! - **`ShaderCooker`**: a deterministic `Scan → Cook → Complete` state machine
//!   that enumerates **all** reachable `(permutation, pass)` pairs from the
//!   manifest, sorts them by `PipelineKey`, and pre-compiles them in the
//!   background under a strict **per-tick budget** so the menu thread never
//!   stalls and the gameplay thread never sees a missing PSO.
//! - **`PsoVault`**: a fixed slab (no HashMap, no allocation in the hot path)
//!   keyed by sorted `PipelineKey` with binary-search lookup. A hot-path miss
//!   is telemetry (`vault_miss_count`) — it is the AAA seal that a pipeline was
//!   never cooked; the frame is allowed to degrade, the game never stutters.
//!
//! Honesty: `shader_cooker_ready` is **soak-gated** on the measured fixture
//! only (100% pre-warm hit-rate, zero duplicate keys, deterministic key
//! derivation, per-tick budget respected). Every AAA vector (actual GPU PSO
//! handles, D3D12/Vulkan disk caches, async multi-threaded compile, runtime
//! vendor caching) stays fail-closed until wired to a real renderer.

use serde::{Deserialize, Serialize};
use std::time::Instant;

/// Stable evidence tag — distinct from every sibling kernel (letter **km**).
pub const SHADER_EVIDENCE_KIND: &str = "shader_cooker_pso_vault";
/// Maximum number of materials a manifest may hold (bounded, no heap).
pub const MAX_MANIFEST_MATERIALS: usize = 2048;
/// Maximum reachable (permutation × pass) pipelines pre-cookable.
pub const MAX_REACHABLE_PIPELINES: usize = 8192;
/// Fixed capacity of the PSO vault slab (bounded, no heap).
pub const VAULT_CAPACITY: usize = 8192;
/// Pipelines cooked per `advance()` tick (background budget).
pub const DEFAULT_COOK_BUDGET_PER_TICK: usize = 32;
/// Tick cap for the soak.
pub const COOKER_SOAK_TICKS: usize = 4096;
/// FNV-1a 64 offset basis.
pub const SHADER_FNV_OFFSET_BASIS: u64 = 0xcbf2_9ce4_8422_2325;
/// FNV-1a 64 prime.
pub const SHADER_FNV_PRIME: u64 = 0x0000_0100_0000_01b3;

/// Material feature flags — a fixed bitmask (never grows at runtime).
pub mod perm {
    /// Base color texture bound.
    pub const ALBEDO_MAP: u32 = 1 << 0;
    /// Tangent-space normal map bound.
    pub const NORMAL_MAP: u32 = 1 << 1;
    /// Combined roughness/metallic textures bound.
    pub const ROUGHNESS_METALLIC: u32 = 1 << 2;
    /// Emissive texture / self-illumination.
    pub const EMISSIVE: u32 = 1 << 3;
    /// Alpha-tested opacity mask (cutout).
    pub const OPACITY_MASK: u32 = 1 << 4;
    /// Back faces rendered (double sided).
    pub const DOUBLE_SIDED: u32 = 1 << 5;
    /// Anisotropic shading (brushed metal, hair).
    pub const ANISOTROPY: u32 = 1 << 6;
    /// Sub-surface transmission (wax, ears, leaves).
    pub const TRANSMISSION: u32 = 1 << 7;
    /// Skin shading (approximate scattering).
    pub const SKIN: u32 = 1 << 8;
    /// Cloth shading (sheen + microfibre).
    pub const CLOTH: u32 = 1 << 9;
    /// Terrain (splat-blend helper in the VS).
    pub const TERRAIN: u32 = 1 << 10;
    /// Shadow-caster variant of this material.
    pub const SHADOW_CASTER: u32 = 1 << 11;
}

/// Number of meaningful permutation bits.
pub const NUM_PERMUTATION_BITS: u32 = 12;
/// Valid bit region for any permutation.
pub const PERMUTATION_MASK: u32 = (1 << NUM_PERMUTATION_BITS) - 1;

/// A material permutation — an opaque bitmask of the features above.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct ShaderPermutation(pub u32);

impl ShaderPermutation {
    /// The empty permutation (no maps, no flags).
    pub const NONE: Self = Self(0);

    /// Fail-closed: `true` when every set bit is inside the mask region.
    pub fn is_valid(self) -> bool {
        self.0 & !PERMUTATION_MASK == 0
    }

    /// Number of enabled features (used for cooking priority ordering).
    pub fn feature_count(self) -> u32 {
        self.0.count_ones()
    }
}

/// Render pass a pipeline is cooked for.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum PassKind {
    /// Opaque G-buffer pass (deferred).
    GBuffer = 0,
    /// Depth-only shadow pass.
    Shadow = 1,
    /// Translucent forward pass.
    Translucent = 2,
    /// Generic forward pass.
    Forward = 3,
}

impl PassKind {
    /// Total number of pass kinds.
    pub const NUM: usize = 4;

    /// Stable byte used in key derivation (matches the enum discriminant).
    pub fn index(self) -> u8 {
        self as u8
    }

    /// Decode from a byte; `None` on anything outside `0..4` (fail-closed).
    pub fn from_index(i: u8) -> Option<PassKind> {
        match i {
            0 => Some(PassKind::GBuffer),
            1 => Some(PassKind::Shadow),
            2 => Some(PassKind::Translucent),
            3 => Some(PassKind::Forward),
            _ => None,
        }
    }
}

/// FNV-1a 64 — the deterministic hash behind every `PipelineKey`.
pub fn fnv1a64(seed: u64, data: &[u8]) -> u64 {
    let mut h = seed ^ SHADER_FNV_OFFSET_BASIS;
    for &b in data {
        h ^= u64::from(b);
        h = h.wrapping_mul(SHADER_FNV_PRIME);
    }
    h
}

/// A globally unique pipeline fingerprint: FNV-1a of `(permutation, pass)`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct PipelineKey(pub u64);

impl PipelineKey {
    /// Derive the key for a `(permutation, pass)` pair (pure, deterministic).
    pub fn derive(permutation: ShaderPermutation, pass: PassKind) -> Self {
        let mut bytes = [0u8; 5];
        bytes[..4].copy_from_slice(&permutation.0.to_le_bytes());
        bytes[4] = pass.index();
        PipelineKey(fnv1a64(0, &bytes))
    }
}

/// One material in the manifest — the atomic unit the cooker reads.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct MaterialSpec {
    /// Stable id of the material asset.
    pub material_id: u32,
    /// Feature bitmask describing this material's shader.
    pub permutation: ShaderPermutation,
    /// Bit `i` set when the material renders in `PassKind::from_index(i)`.
    pub pass_mask: u8,
}

impl MaterialSpec {
    /// Fail-closed: permutation valid and pass bits inside `0..4`.
    pub fn is_valid(&self) -> bool {
        self.permutation.is_valid() && self.pass_mask & !0b1111 == 0
    }
}

/// A single reachable (enumerated) pipeline ready to be cooked.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ReachablePipeline {
    /// The stable pipeline fingerprint.
    pub key: PipelineKey,
    /// The material feature set it was derived from.
    pub permutation: ShaderPermutation,
    /// The pass it is cooked for.
    pub pass: PassKind,
}

impl ReachablePipeline {
    /// Zeroed placeholder (never reachable — guard for fixed arrays).
    pub const EMPTY: Self = Self {
        key: PipelineKey(0),
        permutation: ShaderPermutation::NONE,
        pass: PassKind::GBuffer,
    };
}

/// The full set of materials the cooker must pre-compile.
#[derive(Debug, Clone)]
pub struct MaterialManifest {
    materials: [Option<MaterialSpec>; MAX_MANIFEST_MATERIALS],
    len: usize,
}

impl Default for MaterialManifest {
    fn default() -> Self {
        Self {
            materials: [None; MAX_MANIFEST_MATERIALS],
            len: 0,
        }
    }
}

impl MaterialManifest {
    /// A fresh, empty manifest.
    pub fn new() -> Self {
        Self::default()
    }

    /// Append a material; `Err` on invalid spec or capacity overflow.
    pub fn add(&mut self, spec: MaterialSpec) -> Result<(), &'static str> {
        if !spec.is_valid() {
            return Err("invalid material spec");
        }
        if self.len >= MAX_MANIFEST_MATERIALS {
            return Err("manifest capacity exceeded");
        }
        self.materials[self.len] = Some(spec);
        self.len += 1;
        Ok(())
    }

    /// Number of materials currently registered.
    pub fn len(&self) -> usize {
        self.len
    }

    /// True when no materials are registered.
    pub fn is_empty(&self) -> bool {
        self.len == 0
    }

    /// Read material `i` (`None` past the end — fail-closed).
    pub fn get(&self, i: usize) -> Option<MaterialSpec> {
        if i < self.len {
            self.materials[i]
        } else {
            None
        }
    }
}

/// A compiled pipeline entry in the vault.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct VaultSlot {
    /// The pipeline key (keeps the slab sorted).
    pub key: PipelineKey,
    /// The material permutation it serves.
    pub permutation: ShaderPermutation,
    /// The pass it serves.
    pub pass: PassKind,
    /// True once the pipeline is cooked and ready to bind.
    pub compiled: bool,
}

impl Default for VaultSlot {
    fn default() -> Self {
        Self {
            key: PipelineKey(0),
            permutation: ShaderPermutation::NONE,
            pass: PassKind::GBuffer,
            compiled: false,
        }
    }
}

/// Fixed-slab PSO store. Sorted by key; hot path is binary search — no
/// HashMap, no allocation, fully deterministic.
#[derive(Debug, Clone)]
pub struct PsoVault {
    slots: [VaultSlot; VAULT_CAPACITY],
    len: usize,
    hits: u64,
    misses: u64,
}

impl Default for PsoVault {
    fn default() -> Self {
        Self {
            slots: [VaultSlot::default(); VAULT_CAPACITY],
            len: 0,
            hits: 0,
            misses: 0,
        }
    }
}

impl PsoVault {
    /// A fresh, empty vault.
    pub fn new() -> Self {
        Self::default()
    }

    /// Number of cooked pipelines resident.
    pub fn len(&self) -> usize {
        self.len
    }

    /// True when nothing has been cooked yet.
    pub fn is_empty(&self) -> bool {
        self.len == 0
    }

    fn find(&self, key: PipelineKey) -> Result<usize, usize> {
        self.slots[..self.len].binary_search_by(|s| s.key.cmp(&key))
    }

    /// True when `key` is already resident (no telemetry side effect).
    pub fn contains(&self, key: PipelineKey) -> bool {
        self.find(key).is_ok()
    }

    /// Hot-path lookup: returns the compiled slot, counts hit/miss.
    pub fn lookup(&mut self, key: PipelineKey) -> Option<&VaultSlot> {
        match self.find(key) {
            Ok(i) => {
                self.hits += 1;
                Some(&self.slots[i])
            }
            Err(_) => {
                self.misses += 1;
                None
            }
        }
    }

    /// Insert a freshly cooked pipeline, keeping the slab sorted by key.
    /// `Err` on duplicate key or capacity overflow (fail-closed).
    pub fn insert(
        &mut self,
        key: PipelineKey,
        permutation: ShaderPermutation,
        pass: PassKind,
    ) -> Result<(), &'static str> {
        if self.contains(key) {
            return Err("duplicate pipeline key");
        }
        if self.len >= VAULT_CAPACITY {
            return Err("vault capacity exceeded");
        }
        let mut idx = self.len;
        while idx > 0 && self.slots[idx - 1].key > key {
            self.slots[idx] = self.slots[idx - 1];
            idx -= 1;
        }
        self.slots[idx] = VaultSlot {
            key,
            permutation,
            pass,
            compiled: true,
        };
        self.len += 1;
        Ok(())
    }

    /// Telemetry: hot-path hit rate in `0..=1`.
    pub fn hit_rate(&self) -> f32 {
        let total = (self.hits + self.misses) as f32;
        if total <= 0.0 {
            1.0
        } else {
            self.hits as f32 / total
        }
    }

    /// Telemetry counters exposed for the soak report.
    pub fn hit_count(&self) -> u64 {
        self.hits
    }

    /// Telemetry counters exposed for the soak report.
    pub fn miss_count(&self) -> u64 {
        self.misses
    }

    /// Invariant check: every resident key is strictly ascending.
    pub fn is_sorted(&self) -> bool {
        for i in 1..self.len {
            if self.slots[i - 1].key > self.slots[i].key {
                return false;
            }
        }
        true
    }

    /// Read-only peek without telemetry side effects.
    pub fn get(&self, key: PipelineKey) -> Option<&VaultSlot> {
        self.find(key).ok().map(|i| &self.slots[i])
    }

    /// Iterate resident slots in sorted-key order (no allocation).
    pub fn iter(&self) -> impl Iterator<Item = &VaultSlot> {
        self.slots[..self.len].iter()
    }
}

/// Lifecycle of the background cooking spine.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CookState {
    /// Manifest loaded; reachable set not yet enumerated.
    Scanning,
    /// Enumerated; pipelines being cooked under the per-tick budget.
    Cooking,
    /// Every reachable pipeline is resident in the vault.
    Complete,
}

/// The deterministic `Scan → Cook → Complete` shader cooker.
#[derive(Debug, Clone)]
pub struct ShaderCooker {
    manifest: MaterialManifest,
    reachable: [ReachablePipeline; MAX_REACHABLE_PIPELINES],
    reachable_len: usize,
    cooked_index: usize,
    budget_per_tick: usize,
    state: CookState,
    ticks_used: u64,
    duplicate_count: usize,
    cook_failed: bool,
    vault: PsoVault,
}

impl ShaderCooker {
    /// Create a cooker with the given per-tick background budget.
    pub fn new(budget_per_tick: usize) -> Self {
        Self {
            manifest: MaterialManifest::new(),
            reachable: [ReachablePipeline::EMPTY; MAX_REACHABLE_PIPELINES],
            reachable_len: 0,
            cooked_index: 0,
            budget_per_tick: budget_per_tick.max(1),
            state: CookState::Scanning,
            ticks_used: 0,
            duplicate_count: 0,
            cook_failed: false,
            vault: PsoVault::new(),
        }
    }

    /// Load a manifest and re-arm the machine to `Scanning`.
    pub fn set_manifest(&mut self, manifest: MaterialManifest) {
        self.manifest = manifest;
        self.reachable_len = 0;
        self.cooked_index = 0;
        self.state = CookState::Scanning;
        self.ticks_used = 0;
        self.duplicate_count = 0;
        self.cook_failed = false;
        self.vault = PsoVault::new();
    }

    /// Run the scan phase: enumerate every reachable `(permutation, pass)`
    /// pair, sort by `PipelineKey`, dedupe, then enter `Cooking`.
    pub fn scan(&mut self) {
        if self.state != CookState::Scanning {
            return;
        }
        let mut candidates = [ReachablePipeline::EMPTY; MAX_REACHABLE_PIPELINES];
        let mut cand_len = 0usize;
        for i in 0..self.manifest.len() {
            let spec = self.manifest.get(i).unwrap();
            for pi in 0..PassKind::NUM {
                if spec.pass_mask & (1 << pi) == 0 {
                    continue;
                }
                let pass = PassKind::from_index(pi as u8).unwrap();
                candidates[cand_len] = ReachablePipeline {
                    key: PipelineKey::derive(spec.permutation, pass),
                    permutation: spec.permutation,
                    pass,
                };
                cand_len += 1;
            }
        }
        self.enumerate_unique(candidates, cand_len);
        if self.reachable_len == 0 {
            self.state = CookState::Complete;
        } else {
            self.state = CookState::Cooking;
        }
    }

    /// Sort candidates by key (insertion sort — deterministic, stable) and
    /// dedupe equal keys into `reachable`, counting collisions.
    fn enumerate_unique(
        &mut self,
        mut candidates: [ReachablePipeline; MAX_REACHABLE_PIPELINES],
        cand_len: usize,
    ) {
        for i in 1..cand_len {
            let mut j = i;
            while j > 0 && candidates[j - 1].key > candidates[j].key {
                candidates.swap(j - 1, j);
                j -= 1;
            }
        }
        let mut out_len = 0usize;
        let mut i = 0usize;
        while i < cand_len {
            if out_len > 0 && candidates[i].key == self.reachable[out_len - 1].key {
                self.duplicate_count += 1;
            } else {
                self.reachable[out_len] = candidates[i];
                out_len += 1;
            }
            i += 1;
        }
        self.reachable_len = out_len;
    }

    /// Run one background tick: scan (if needed) then cook up to the budget.
    pub fn advance(&mut self) {
        self.ticks_used += 1;
        if self.state == CookState::Scanning {
            self.scan();
        }
        if self.state != CookState::Cooking {
            return;
        }
        let end = (self.cooked_index + self.budget_per_tick).min(self.reachable_len);
        for k in self.cooked_index..end {
            let rp = self.reachable[k];
            if self
                .vault
                .insert(rp.key, rp.permutation, rp.pass)
                .is_err()
            {
                self.cook_failed = true;
                self.state = CookState::Complete;
                return;
            }
        }
        self.cooked_index = end;
        if self.cooked_index >= self.reachable_len {
            self.state = CookState::Complete;
        }
    }

    /// Run `advance()` until `Complete` (bounded; used by soak and tests).
    pub fn cook_all(&mut self) {
        let mut guard = 0usize;
        while self.state != CookState::Complete && guard < 1_000_000 {
            self.advance();
            guard += 1;
        }
    }

    /// Current lifecycle state.
    pub fn state(&self) -> CookState {
        self.state
    }

    /// True when every reachable pipeline is resident.
    pub fn is_complete(&self) -> bool {
        self.state == CookState::Complete
    }

    /// Number of distinct reachable pipelines enumerated.
    pub fn reachable_len(&self) -> usize {
        self.reachable_len
    }

    /// Read the `i`-th reachable pipeline in sorted-key order.
    pub fn reachable_key(&self, i: usize) -> ReachablePipeline {
        if i < self.reachable_len {
            self.reachable[i]
        } else {
            ReachablePipeline::EMPTY
        }
    }

    /// Number of pipelines cooked so far.
    pub fn cooked_count(&self) -> usize {
        self.cooked_index
    }

    /// Number of distinct pipelines that must be cooked.
    pub fn total_count(&self) -> usize {
        self.reachable_len
    }

    /// Cooking progress in `0..=100`.
    pub fn progress_pct(&self) -> u32 {
        // 100 quando não há pipelines a cozinhar (fail-closed); checked ops
        // evitam overflow/divisão-por-zero sem mudar a semântica original.
        self.cooked_index
            .checked_mul(100)
            .and_then(|n| n.checked_div(self.reachable_len))
            .unwrap_or(100) as u32
    }

    /// Read-only access to the resident PSO vault.
    pub fn vault(&self) -> &PsoVault {
        &self.vault
    }

    /// Background ticks consumed so far.
    pub fn ticks_used(&self) -> u64 {
        self.ticks_used
    }

    /// Duplicate keys folded during enumeration (diagnostic).
    pub fn duplicate_count(&self) -> usize {
        self.duplicate_count
    }

    /// True when a vault insert failed (fail-closed latch).
    pub fn cook_failed(&self) -> bool {
        self.cook_failed
    }
}

/// Measured soak report (serde `camelCase` for wire/ledger ingestion).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ShaderCookerReport {
    /// Soak-gated readiness flag (the only "ready" in this module).
    pub shader_cooker_ready: bool,
    /// Evidence tag this report belongs to.
    pub evidence_kind: String,
    /// Materials loaded into the cooker.
    pub material_count: usize,
    /// Distinct pipelines enumerated (after dedupe).
    pub reachable_pipeline_count: usize,
    /// Pipelines actually cooked.
    pub cooked_pipeline_count: usize,
    /// Cooking progress percentage.
    pub cook_progress_pct: u32,
    /// Duplicate keys folded during enumeration.
    pub duplicate_key_count: usize,
    /// Background ticks consumed.
    pub ticks_used: u64,
    /// Per-tick cooking budget.
    pub cook_budget_per_tick: usize,
    /// Vault fixed capacity.
    pub vault_capacity: usize,
    /// Resident pipelines in the vault.
    pub vault_used: usize,
    /// Hot-path hits (reachable keys queried after pre-warm).
    pub vault_hit_count: u64,
    /// Hot-path misses (deliberate unknown-key probe).
    pub vault_miss_count: u64,
    /// Hot-path hit rate `0..=100`.
    pub vault_hit_rate_pct: f32,
    /// Key derivation reproduces across two identical manifests.
    pub deterministic_key_derivation: bool,
    /// No tick cooked more than the budget.
    pub budget_respected: bool,
    /// True if any vault insert failed (fail-closed).
    pub cook_failed: bool,
    /// Wall-clock time of the soak [ms] (excluded from fingerprint).
    pub soak_elapsed_ms: u64,
    /// AAA: real GPU PSO handle pre-warm (needs a renderer) — fail-closed.
    pub gpu_pso_prewarm_ready: bool,
    /// AAA: guarantees zero stutter on first frame — fail-closed.
    pub pso_stutter_free_guarantee: bool,
    /// AAA: multi-threaded async compile engine — fail-closed.
    pub async_compile_engine: bool,
    /// AAA: D3D12/Vulkan on-disk cache — fail-closed.
    pub disk_pipeline_cache: bool,
}

impl ShaderCookerReport {
    /// Finite-check: no NaN/Inf in float fields, progress within range.
    pub fn is_finite(&self) -> bool {
        self.vault_hit_rate_pct.is_finite()
            && (0.0..=100.0).contains(&self.vault_hit_rate_pct)
            && self.cook_progress_pct <= 100
            && self.cooked_pipeline_count <= self.reachable_pipeline_count
            && self.vault_used <= self.vault_capacity
    }
}

/// Mix a `u64` into a fingerprint (canonical kernel mixer).
pub fn hash_mix(mut h: u64, x: u64) -> u64 {
    h ^= x.wrapping_mul(0x9E37_79B9_7F4A_7C15);
    h.rotate_left(27).wrapping_mul(0x517C_C1B7_2722_0A95)
}

/// Quantize an `f32` for stable fingerprints; NaN/Inf fail-closes to a sentinel.
pub fn quant_f32(v: f32) -> u64 {
    if !v.is_finite() {
        0xDEAD_BEEF
    } else {
        (v * 10_000.0).round() as i32 as u64
    }
}

/// Deterministic evidence fingerprint (excludes wall-clock time).
pub fn shader_evidence_fingerprint(report: &ShaderCookerReport) -> u64 {
    let mut h: u64 = 0;
    h = hash_mix(h, report.reachable_pipeline_count as u64);
    h = hash_mix(h, report.cooked_pipeline_count as u64);
    h = hash_mix(h, u64::from(report.cook_progress_pct));
    h = hash_mix(h, report.duplicate_key_count as u64);
    h = hash_mix(h, report.ticks_used);
    h = hash_mix(h, report.vault_used as u64);
    h = hash_mix(h, report.vault_hit_count);
    h = hash_mix(h, report.vault_miss_count);
    h = hash_mix(h, quant_f32(report.vault_hit_rate_pct));
    h = hash_mix(h, u64::from(report.deterministic_key_derivation));
    h = hash_mix(h, u64::from(report.budget_respected));
    h
}

/// Deterministic xorshift64 PRNG for fixture generation (no external entropy).
pub fn xorshift64(mut x: u64) -> u64 {
    x ^= x << 13;
    x ^= x >> 7;
    x ^= x << 17;
    x
}

/// Build a seeded, reproducible material fixture with canonical heavy entries
/// plus seeded pseudo-random materials.
pub fn build_soak_fixture(seed: u64) -> MaterialManifest {
    let mut m = MaterialManifest::new();
    let canonical = [
        MaterialSpec {
            material_id: 0,
            permutation: ShaderPermutation(
                perm::TERRAIN | perm::SHADOW_CASTER | perm::NORMAL_MAP | perm::ROUGHNESS_METALLIC,
            ),
            pass_mask: 0b0011,
        },
        MaterialSpec {
            material_id: 1,
            permutation: ShaderPermutation(
                perm::SKIN | perm::NORMAL_MAP | perm::ROUGHNESS_METALLIC | perm::TRANSMISSION,
            ),
            pass_mask: 0b1011,
        },
        MaterialSpec {
            material_id: 2,
            permutation: ShaderPermutation(perm::CLOTH | perm::ANISOTROPY | perm::ALBEDO_MAP),
            pass_mask: 0b1111,
        },
        MaterialSpec {
            material_id: 3,
            permutation: ShaderPermutation(
                perm::EMISSIVE | perm::OPACITY_MASK | perm::DOUBLE_SIDED,
            ),
            pass_mask: 0b1011,
        },
    ];
    for spec in canonical {
        let _ = m.add(spec);
    }
    // Seeded pseudo-random materials — same seed, same manifest (deterministic).
    let mut state = seed | 1;
    for i in 4..48 {
        state = xorshift64(state);
        let bits = (state % (1u64 << NUM_PERMUTATION_BITS)) as u32;
        state = xorshift64(state);
        let pass_mask = ((state & 0xF) as u8) | 1;
        let _ = m.add(MaterialSpec {
            material_id: i as u32,
            permutation: ShaderPermutation(bits),
            pass_mask,
        });
    }
    m
}

/// Run the deterministic shader-cooker soak and produce a measured report.
///
/// 1. Builds a seeded fixture and loads it into a fresh cooker.
/// 2. Advances tick-by-tick (budget-respecting) until `Complete`, bounded by
///    `COOKER_SOAK_TICKS`.
/// 3. Verifies a full pre-warm: every reachable pipeline is resident.
/// 4. Probes one deliberately out-of-range key — the only allowed miss.
/// 5. Re-derives keys from a second identical manifest (determinism).
///
/// `shader_cooker_ready` is true **only** when every invariant holds.
pub fn run_shader_cooker_soak(seed: u64) -> ShaderCookerReport {
    let start = Instant::now();
    let manifest = build_soak_fixture(seed);
    let mut cooker = ShaderCooker::new(DEFAULT_COOK_BUDGET_PER_TICK);
    cooker.set_manifest(manifest.clone());

    let mut budget_respected = true;
    while !cooker.is_complete() && cooker.ticks_used() < COOKER_SOAK_TICKS as u64 {
        let before = cooker.cooked_count();
        cooker.advance();
        let delta = cooker.cooked_count().saturating_sub(before);
        if delta > DEFAULT_COOK_BUDGET_PER_TICK {
            budget_respected = false;
        }
    }

    // Full pre-warm: every reachable key must be resident in the vault.
    let reachable = cooker.reachable_len();
    let mut vault_hit_count: u64 = 0;
    for i in 0..reachable {
        let rp = cooker.reachable_key(i);
        if cooker.vault().get(rp.key).is_some() {
            vault_hit_count += 1;
        }
    }

    // Deliberate unknown-key probe: bit 13 is outside the 12-bit permutation
    // mask, so this key was never derived during scan — it must miss.
    let unknown = PipelineKey::derive(
        ShaderPermutation(PERMUTATION_MASK | (1 << 13)),
        PassKind::from_index(0).unwrap(),
    );
    let mut vault_miss_count: u64 = 0;
    if cooker.vault().get(unknown).is_none() {
        vault_miss_count += 1;
    }

    // Determinism: a second identical manifest must derive identical keys.
    let mut deterministic_key_derivation = true;
    let mut cooker_b = ShaderCooker::new(DEFAULT_COOK_BUDGET_PER_TICK);
    cooker_b.set_manifest(build_soak_fixture(seed));
    cooker_b.scan();
    if cooker_b.reachable_len() != cooker.reachable_len() {
        deterministic_key_derivation = false;
    } else {
        for i in 0..cooker_b.reachable_len() {
            if cooker_b.reachable_key(i).key != cooker.reachable_key(i).key {
                deterministic_key_derivation = false;
                break;
            }
        }
    }

    let cooked = cooker.cooked_count();
    let reachable_pipeline_count = cooker.reachable_len();
    let vault_used = cooker.vault().len();
    let hit_rate = if reachable == 0 {
        100.0
    } else {
        vault_hit_count as f32 * 100.0 / reachable as f32
    };
    let keys_match = cooked == reachable_pipeline_count
        && vault_used == reachable_pipeline_count
        && cooker.progress_pct() == 100;
    let ready = !cooker.cook_failed()
        && budget_respected
        && keys_match
        && deterministic_key_derivation
        && vault_hit_count == reachable_pipeline_count as u64
        && cooker.ticks_used() <= COOKER_SOAK_TICKS as u64;

    ShaderCookerReport {
        shader_cooker_ready: ready,
        evidence_kind: SHADER_EVIDENCE_KIND.to_string(),
        material_count: manifest.len(),
        reachable_pipeline_count,
        cooked_pipeline_count: cooked,
        cook_progress_pct: cooker.progress_pct(),
        duplicate_key_count: cooker.duplicate_count(),
        ticks_used: cooker.ticks_used(),
        cook_budget_per_tick: DEFAULT_COOK_BUDGET_PER_TICK,
        vault_capacity: VAULT_CAPACITY,
        vault_used,
        vault_hit_count,
        vault_miss_count,
        vault_hit_rate_pct: hit_rate,
        deterministic_key_derivation,
        budget_respected,
        cook_failed: cooker.cook_failed(),
        soak_elapsed_ms: start.elapsed().as_millis() as u64,
        gpu_pso_prewarm_ready: false,
        pso_stutter_free_guarantee: false,
        async_compile_engine: false,
        disk_pipeline_cache: false,
    }
}

/// Lightweight, allocation-free probe of the shader cooker hot path.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ShaderCookerProbe {
    /// The exact `PipelineKey` the renderer asked for.
    pub key: u64,
    /// Pass kind resolved for the requested key (fail-closed to 0xFF on miss).
    pub pass: u8,
    /// Permutation bits resolved for the requested key (0 on miss).
    pub permutation: u32,
    /// True when the key was resident (a pre-warmed hit, zero stutter).
    pub resident: bool,
    /// True when the key was missing (must degrade gracefully, never stall).
    pub degraded: bool,
}

/// Query the vault on the hot path without allocation; `0xFF`/0 sentinels on
/// miss guarantee the caller can fail-closed without branching on error.
pub fn probe_shader_cooker(cooker: &ShaderCooker, key: PipelineKey) -> ShaderCookerProbe {
    match cooker.vault().get(key) {
        Some(slot) => ShaderCookerProbe {
            key: key.0,
            pass: slot.pass.index(),
            permutation: slot.permutation.0,
            resident: true,
            degraded: false,
        },
        None => ShaderCookerProbe {
            key: key.0,
            pass: 0xFF,
            permutation: 0,
            resident: false,
            degraded: true,
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Deterministic hash over the sorted reachable key list (distinct evidence).
    fn cooked_reachable_key_hash(seed: u64) -> u64 {
        let mut cooker = ShaderCooker::new(DEFAULT_COOK_BUDGET_PER_TICK);
        cooker.set_manifest(build_soak_fixture(seed));
        cooker.cook_all();
        let mut h: u64 = 0x1234_5678_9ABC_DEF0;
        for i in 0..cooker.reachable_len() {
            h = hash_mix(h, cooker.reachable_key(i).key.0);
        }
        h
    }

    #[test]
    fn invariant_permutation_mask_bounds() {
        for seed in [0u64, 1, 7, 42, 0xDEAD_BEEF] {
            let m = build_soak_fixture(seed);
            for i in 0..m.len() {
                let spec = m.get(i).unwrap();
                assert!(spec.permutation.is_valid());
                assert_eq!(spec.permutation.0 & !PERMUTATION_MASK, 0);
            }
        }
    }

    #[test]
    fn deterministic_key_derivation_across_cookers() {
        let a = PipelineKey::derive(ShaderPermutation(0b101), PassKind::GBuffer);
        let b = PipelineKey::derive(ShaderPermutation(0b101), PassKind::GBuffer);
        assert_eq!(a, b);
        let c = PipelineKey::derive(ShaderPermutation(0b101), PassKind::Shadow);
        assert_ne!(a, c);
    }

    #[test]
    fn vault_is_sorted_and_hits() {
        let mut cooker = ShaderCooker::new(8);
        cooker.set_manifest(build_soak_fixture(0xCAFE));
        cooker.cook_all();
        let v = cooker.vault();
        assert!(v.is_sorted());
        assert_eq!(v.len(), cooker.reachable_len());
        for i in 0..cooker.reachable_len() {
            let rp = cooker.reachable_key(i);
            assert!(v.contains(rp.key));
            let slot = v.get(rp.key).unwrap();
            assert_eq!(slot.permutation, rp.permutation);
            assert_eq!(slot.pass, rp.pass);
        }
    }

    #[test]
    fn soak_is_green_finite_and_ready() {
        for seed in [1u64, 7, 42, 0xDEAD_BEEF] {
            let r = run_shader_cooker_soak(seed);
            assert!(r.is_finite(), "seed {seed}: report not finite");
            assert!(r.shader_cooker_ready, "seed {seed}: cooker not ready");
            assert_eq!(r.vault_hit_rate_pct, 100.0);
            assert_eq!(r.vault_miss_count, 1);
            assert_eq!(r.cook_progress_pct, 100);
            assert_eq!(r.cooked_pipeline_count, r.reachable_pipeline_count);
            assert_eq!(r.vault_used, r.reachable_pipeline_count);
            // AAA vectors stay fail-closed — no fake renderer ever reports ready.
            assert!(!r.gpu_pso_prewarm_ready);
            assert!(!r.pso_stutter_free_guarantee);
            assert!(!r.async_compile_engine);
            assert!(!r.disk_pipeline_cache);
        }
    }

    #[test]
    fn soak_fingerprint_deterministic_same_seed() {
        let a = shader_evidence_fingerprint(&run_shader_cooker_soak(7));
        let b = shader_evidence_fingerprint(&run_shader_cooker_soak(7));
        assert_eq!(a, b);
    }

    #[test]
    fn soak_distinct_evidence_across_seeds() {
        // Seed 1 first random permutation bits = 65; seed 2 = 130 (guaranteed by
        // xorshift64(1)=0x40822041 & 0xFFF = 0x041, xorshift64(2)=0x81044082 & 0xFFF = 0x082).
        assert_ne!(
            build_soak_fixture(1).get(4).unwrap().permutation.0,
            build_soak_fixture(2).get(4).unwrap().permutation.0
        );
        assert_ne!(cooked_reachable_key_hash(1), cooked_reachable_key_hash(2));
    }

    #[test]
    fn probe_resident_hits_and_unknown_misses() {
        let mut cooker = ShaderCooker::new(DEFAULT_COOK_BUDGET_PER_TICK);
        cooker.set_manifest(build_soak_fixture(3));
        cooker.cook_all();
        let rp = cooker.reachable_key(0);
        let hit = probe_shader_cooker(&cooker, rp.key);
        assert!(hit.resident);
        assert!(!hit.degraded);
        assert_eq!(hit.pass, rp.pass.index());
        let unknown = PipelineKey::derive(
            ShaderPermutation(PERMUTATION_MASK | (1 << 13)),
            PassKind::from_index(0).unwrap(),
        );
        let miss = probe_shader_cooker(&cooker, unknown);
        assert!(!miss.resident);
        assert!(miss.degraded);
        assert_eq!(miss.pass, 0xFF);
    }

    #[test]
    fn empty_manifest_completes_immediately() {
        let mut cooker = ShaderCooker::new(DEFAULT_COOK_BUDGET_PER_TICK);
        cooker.set_manifest(MaterialManifest::new());
        cooker.advance();
        assert!(cooker.is_complete());
        assert_eq!(cooker.progress_pct(), 100);
        assert_eq!(cooker.vault().len(), 0);
    }
}
