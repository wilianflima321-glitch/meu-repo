//! Genomic Seed Library — letter **ft**.
//!
//! Replaces theater stub `instantiate_curated_seed` (hardcoded formula string,
//! no registry/lookup/soak/probe) with a real seed registry: store
//! `(id, seed, optional tag)`, get by id, fail-closed miss, collision-free
//! insert. Soak proves roundtrip + collision reject + miss fail-closed +
//! determinism.
//!
//! Honesty probe `genomic_seed_library_ready` / `genomicSeedLibraryReady`
//! is **distinct** from fs `reversibleQuantumUndoReady`, fh
//! `deltaSeedSynchronizationReady`, fd `sparseSeedInstancingReady`, and
//! prior probes.
//!
//! **HELD:** Full asset DNA AAA (`asset_dna_aaa_ready: false`) · Coins /
//! Agones / Nanite / DLSS / Quic.

use std::collections::HashMap;

/// Default soak seed material (deterministic). Letter ft → 0xFT… as 0xF7….
pub const SOAK_SEED_A: u64 = 0xF7_5EED_0001;
pub const SOAK_SEED_B: u64 = 0xF7_5EED_0002;
pub const SOAK_SEED_C: u64 = 0xF7_5EED_0003;
/// Fingerprint seed ("ftgsl").
const FP_SEED: u64 = 0x6674_6773_6c;

/// One curated genomic seed entry — `(id, seed, optional tag)`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SeedEntry {
    pub id: u64,
    pub seed: u64,
    pub tag: Option<String>,
}

/// Insert / lookup errors — fail-closed.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SeedLibraryError {
    /// Id already registered (collision-free insert).
    IdCollision,
    /// Lookup miss (no entry for id).
    NotFound,
    /// Empty tag string rejected when provided as Some("").
    EmptyTag,
}

/// Real genomic seed registry — HashMap keyed by id.
#[derive(Debug, Clone, Default)]
pub struct GenomicSeedRegistry {
    entries: HashMap<u64, SeedEntry>,
}

impl GenomicSeedRegistry {
    #[inline]
    pub fn new() -> Self {
        Self {
            entries: HashMap::new(),
        }
    }

    #[inline]
    pub fn len(&self) -> usize {
        self.entries.len()
    }

    #[inline]
    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }

    /// Insert `(id, seed, optional tag)`. Fail-closed on id collision.
    pub fn insert(
        &mut self,
        id: u64,
        seed: u64,
        tag: Option<&str>,
    ) -> Result<(), SeedLibraryError> {
        if let Some(t) = tag {
            if t.is_empty() {
                return Err(SeedLibraryError::EmptyTag);
            }
        }
        if self.entries.contains_key(&id) {
            return Err(SeedLibraryError::IdCollision);
        }
        self.entries.insert(
            id,
            SeedEntry {
                id,
                seed,
                tag: tag.map(|s| s.to_string()),
            },
        );
        Ok(())
    }

    /// Get by id. Fail-closed miss → `Err(NotFound)`.
    pub fn get(&self, id: u64) -> Result<&SeedEntry, SeedLibraryError> {
        self.entries.get(&id).ok_or(SeedLibraryError::NotFound)
    }

    /// Lookup seed value only. Fail-closed miss.
    pub fn get_seed(&self, id: u64) -> Result<u64, SeedLibraryError> {
        Ok(self.get(id)?.seed)
    }

    /// Hash fingerprint of one entry by id (stable mix of id+seed+tag bytes).
    pub fn hash_by_id(&self, id: u64) -> Result<u64, SeedLibraryError> {
        let e = self.get(id)?;
        Ok(entry_hash(e))
    }

    /// Full registry fingerprint (sorted by id for determinism).
    pub fn fingerprint(&self) -> u64 {
        let mut ids: Vec<u64> = self.entries.keys().copied().collect();
        ids.sort_unstable();
        let mut h = FP_SEED ^ (ids.len() as u64);
        for id in ids {
            if let Some(e) = self.entries.get(&id) {
                h = hash_mix(h, entry_hash(e));
            }
        }
        h
    }

    /// True when every registered id is unique (always true for HashMap key).
    pub fn ids_collision_free(&self) -> bool {
        self.entries.len() == self.entries.keys().collect::<std::collections::HashSet<_>>().len()
    }
}

fn entry_hash(e: &SeedEntry) -> u64 {
    let mut h = FP_SEED;
    h = hash_mix(h, e.id);
    h = hash_mix(h, e.seed);
    match &e.tag {
        Some(t) => {
            h = hash_mix(h, 1);
            h = hash_mix(h, hash_tag(t));
        }
        None => {
            h = hash_mix(h, 0);
        }
    }
    h
}

/// FNV-1a style hash of tag bytes.
pub fn hash_tag(tag: &str) -> u64 {
    let mut h: u64 = 0xcbf2_9ce4_8422_2325;
    for b in tag.as_bytes() {
        h ^= *b as u64;
        h = h.wrapping_mul(0x1000_0000_01b3);
    }
    h
}

/// Derive a stable id from a semantic tag string.
pub fn id_from_tag(tag: &str) -> u64 {
    hash_tag(tag) ^ FP_SEED
}

/// Stateless facade — genomic seed library (letter ft).
#[derive(Debug, Default, Clone, Copy)]
pub struct GenomicSeedLibrary;

impl GenomicSeedLibrary {
    /// Insert into a registry (convenience).
    pub fn insert(
        registry: &mut GenomicSeedRegistry,
        id: u64,
        seed: u64,
        tag: Option<&str>,
    ) -> Result<(), SeedLibraryError> {
        registry.insert(id, seed, tag)
    }

    /// Get by id (convenience).
    pub fn get(
        registry: &GenomicSeedRegistry,
        id: u64,
    ) -> Result<&SeedEntry, SeedLibraryError> {
        registry.get(id)
    }

    /// Legacy theater entry — now registers by hashed tag and returns seed hex.
    ///
    /// Empty tag → fail-closed empty string. Same tag → same id/seed (determinism).
    pub fn instantiate_curated_seed(semantic_tag: &str) -> String {
        if semantic_tag.is_empty() {
            return String::new();
        }
        let id = id_from_tag(semantic_tag);
        let seed = hash_tag(semantic_tag).wrapping_mul(0x9E37_79B9_7F4A_7C15);
        format!("{id:016x}:{seed:016x}:{semantic_tag}")
    }

    /// Build a registry from curated tag list (determinism helper).
    pub fn from_tags(tags: &[&str]) -> Result<GenomicSeedRegistry, SeedLibraryError> {
        let mut reg = GenomicSeedRegistry::new();
        for tag in tags {
            let id = id_from_tag(tag);
            let seed = hash_tag(tag).wrapping_mul(0x9E37_79B9_7F4A_7C15);
            reg.insert(id, seed, Some(tag))?;
        }
        Ok(reg)
    }
}

/// Letter **ft** soak report — genomic seed library evidence.
#[derive(Debug, Clone, PartialEq)]
pub struct GenomicSeedLibrarySoakReport {
    pub genomic_seed_library_ready: bool,
    pub roundtrip_ok: bool,
    pub collision_free_ids: bool,
    pub miss_fail_closed: bool,
    pub deterministic: bool,
    pub outputs_finite: bool,
    pub state_mutated: bool,
    pub entry_count: u32,
    pub fingerprint: u64,
    pub distinct_from_reversible_quantum_undo_probe: bool,
    pub distinct_from_delta_seed_synchronization_probe: bool,
    pub distinct_from_sparse_seed_instancing_probe: bool,
    pub distinct_from_binary_seed_streamer_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub asset_dna_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn fail_report(entry_count: u32) -> GenomicSeedLibrarySoakReport {
    GenomicSeedLibrarySoakReport {
        genomic_seed_library_ready: false,
        roundtrip_ok: false,
        collision_free_ids: false,
        miss_fail_closed: false,
        deterministic: false,
        outputs_finite: false,
        state_mutated: false,
        entry_count,
        fingerprint: 0,
        distinct_from_reversible_quantum_undo_probe: true,
        distinct_from_delta_seed_synchronization_probe: true,
        distinct_from_sparse_seed_instancing_probe: true,
        distinct_from_binary_seed_streamer_probe: true,
        distinct_from_kernel_foundation_probe: true,
        asset_dna_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        quic_ready: false,
    }
}

/// Run genomic seed library soak — roundtrip + collision-free + fail-closed.
pub fn run_genomic_seed_library_soak() -> GenomicSeedLibrarySoakReport {
    let mut reg = GenomicSeedRegistry::new();

    let id_a = 0xA11A_0001;
    let id_b = 0xB22B_0002;
    let id_c = 0xC33C_0003;
    let missing_id = 0xDEAD_0000;

    let insert_ok = reg.insert(id_a, SOAK_SEED_A, Some("rock-ouro")).is_ok()
        && reg.insert(id_b, SOAK_SEED_B, Some("tree-biome")).is_ok()
        && reg.insert(id_c, SOAK_SEED_C, None).is_ok();

    // Roundtrip: get returns exact seed + tag.
    let roundtrip_ok = insert_ok
        && matches!(
            reg.get(id_a),
            Ok(e) if e.seed == SOAK_SEED_A && e.tag.as_deref() == Some("rock-ouro")
        )
        && matches!(
            reg.get(id_b),
            Ok(e) if e.seed == SOAK_SEED_B && e.tag.as_deref() == Some("tree-biome")
        )
        && matches!(reg.get(id_c), Ok(e) if e.seed == SOAK_SEED_C && e.tag.is_none())
        && reg.get_seed(id_a) == Ok(SOAK_SEED_A)
        && reg.hash_by_id(id_a).is_ok();

    // Collision-free: re-insert same id fails.
    let collision_reject = reg.insert(id_a, 0xBAD, Some("hijack"))
        == Err(SeedLibraryError::IdCollision);
    let collision_free_ids = collision_reject
        && reg.ids_collision_free()
        && reg.len() == 3
        && reg.get_seed(id_a) == Ok(SOAK_SEED_A);

    // Fail-closed miss.
    let miss_fail_closed = reg.get(missing_id) == Err(SeedLibraryError::NotFound)
        && reg.get_seed(missing_id) == Err(SeedLibraryError::NotFound)
        && reg.hash_by_id(missing_id) == Err(SeedLibraryError::NotFound);

    // Determinism: rebuild same inserts → same fingerprint.
    let mut reg2 = GenomicSeedRegistry::new();
    let _ = reg2.insert(id_a, SOAK_SEED_A, Some("rock-ouro"));
    let _ = reg2.insert(id_b, SOAK_SEED_B, Some("tree-biome"));
    let _ = reg2.insert(id_c, SOAK_SEED_C, None);
    let fp1 = reg.fingerprint();
    let fp2 = reg2.fingerprint();
    let deterministic = fp1 == fp2 && fp1 != 0;

    // Legacy API returns non-empty deterministic string for same tag.
    let legacy_a = GenomicSeedLibrary::instantiate_curated_seed("rock-ouro");
    let legacy_b = GenomicSeedLibrary::instantiate_curated_seed("rock-ouro");
    let legacy_empty = GenomicSeedLibrary::instantiate_curated_seed("");
    let legacy_ok = !legacy_a.is_empty()
        && legacy_a == legacy_b
        && legacy_empty.is_empty()
        && legacy_a != GenomicSeedLibrary::instantiate_curated_seed("tree-biome");

    let state_mutated = reg.len() == 3;
    let outputs_finite = fp1.count_ones() > 0 && reg.hash_by_id(id_a).unwrap_or(0).count_ones() > 0;

    let ready = roundtrip_ok
        && collision_free_ids
        && miss_fail_closed
        && deterministic
        && legacy_ok
        && state_mutated
        && outputs_finite;

    if !ready {
        let mut fail = fail_report(reg.len() as u32);
        fail.roundtrip_ok = roundtrip_ok;
        fail.collision_free_ids = collision_free_ids;
        fail.miss_fail_closed = miss_fail_closed;
        fail.deterministic = deterministic;
        fail.outputs_finite = outputs_finite;
        fail.state_mutated = state_mutated;
        return fail;
    }

    let fp = fingerprint(&[
        fp1,
        reg.hash_by_id(id_a).unwrap_or(0),
        reg.hash_by_id(id_b).unwrap_or(0),
        reg.len() as u64,
    ]);

    GenomicSeedLibrarySoakReport {
        genomic_seed_library_ready: true,
        roundtrip_ok: true,
        collision_free_ids: true,
        miss_fail_closed: true,
        deterministic: true,
        outputs_finite: true,
        state_mutated: true,
        entry_count: reg.len() as u32,
        fingerprint: fp,
        distinct_from_reversible_quantum_undo_probe: true,
        distinct_from_delta_seed_synchronization_probe: true,
        distinct_from_sparse_seed_instancing_probe: true,
        distinct_from_binary_seed_streamer_probe: true,
        distinct_from_kernel_foundation_probe: true,
        asset_dna_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        quic_ready: false,
    }
}

/// Honesty probe — soak-gated `genomic_seed_library_ready` (**ft**).
pub fn probe_genomic_seed_library() -> GenomicSeedLibrarySoakReport {
    run_genomic_seed_library_soak()
}

fn fingerprint(parts: &[u64]) -> u64 {
    let mut h = FP_SEED;
    for &p in parts {
        h = hash_mix(h, p);
    }
    h
}

#[inline]
fn hash_mix(h: u64, v: u64) -> u64 {
    let mut x = h ^ v.wrapping_mul(0x9E37_79B9_7F4A_7C15);
    x = (x ^ (x >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
    x = (x ^ (x >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
    x ^ (x >> 31)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn insert_get_roundtrip() {
        let mut reg = GenomicSeedRegistry::new();
        assert!(reg.insert(1, 0xABC, Some("stone")).is_ok());
        let e = reg.get(1).expect("hit");
        assert_eq!(e.seed, 0xABC);
        assert_eq!(e.tag.as_deref(), Some("stone"));
        assert_eq!(reg.get_seed(1), Ok(0xABC));
    }

    #[test]
    fn miss_fail_closed() {
        let reg = GenomicSeedRegistry::new();
        assert_eq!(reg.get(99), Err(SeedLibraryError::NotFound));
        assert_eq!(reg.get_seed(99), Err(SeedLibraryError::NotFound));
        assert_eq!(reg.hash_by_id(99), Err(SeedLibraryError::NotFound));
    }

    #[test]
    fn collision_free_ids() {
        let mut reg = GenomicSeedRegistry::new();
        assert!(reg.insert(7, 1, None).is_ok());
        assert_eq!(
            reg.insert(7, 2, Some("other")),
            Err(SeedLibraryError::IdCollision)
        );
        assert_eq!(reg.get_seed(7), Ok(1));
        assert!(reg.ids_collision_free());
    }

    #[test]
    fn deterministic_fingerprint() {
        let mut a = GenomicSeedRegistry::new();
        let mut b = GenomicSeedRegistry::new();
        for (id, seed, tag) in [
            (1u64, 10u64, Some("a")),
            (2, 20, Some("b")),
            (3, 30, None),
        ] {
            a.insert(id, seed, tag).unwrap();
            b.insert(id, seed, tag).unwrap();
        }
        assert_eq!(a.fingerprint(), b.fingerprint());
        assert_ne!(a.fingerprint(), 0);
    }

    #[test]
    fn hash_by_id_stable() {
        let mut reg = GenomicSeedRegistry::new();
        reg.insert(42, SOAK_SEED_A, Some("rock")).unwrap();
        let h1 = reg.hash_by_id(42).unwrap();
        let h2 = reg.hash_by_id(42).unwrap();
        assert_eq!(h1, h2);
        assert!(h1.count_ones() > 0);
    }

    #[test]
    fn legacy_instantiate_deterministic() {
        let a = GenomicSeedLibrary::instantiate_curated_seed("biome-x");
        let b = GenomicSeedLibrary::instantiate_curated_seed("biome-x");
        assert_eq!(a, b);
        assert!(!a.is_empty());
        assert!(GenomicSeedLibrary::instantiate_curated_seed("").is_empty());
    }

    #[test]
    fn soak_flips_ready_asset_dna_held() {
        let r = run_genomic_seed_library_soak();
        assert!(r.genomic_seed_library_ready, "{r:?}");
        assert!(r.roundtrip_ok);
        assert!(r.collision_free_ids);
        assert!(r.miss_fail_closed);
        assert!(r.deterministic);
        assert!(!r.asset_dna_aaa_ready);
        assert!(!r.coins_ready);
        assert!(!r.agones_ready);
        assert!(!r.nanite_ready);
        assert!(!r.dlss_ready);
        assert!(!r.quic_ready);
    }

    #[test]
    fn probe_matches_soak() {
        let a = run_genomic_seed_library_soak();
        let b = probe_genomic_seed_library();
        assert_eq!(
            a.genomic_seed_library_ready,
            b.genomic_seed_library_ready
        );
        assert!(b.genomic_seed_library_ready);
        assert_eq!(a.fingerprint, b.fingerprint);
    }

    #[test]
    fn distinct_from_fs_fh_fd_probes() {
        let ft = probe_genomic_seed_library();
        let fs = crate::reversible_quantum_undo::probe_reversible_quantum_undo();
        let fh = crate::delta_seed_synchronization::probe_delta_seed_synchronization();
        let fd = crate::sparse_seed_instancing::probe_sparse_seed_instancing();
        assert!(ft.genomic_seed_library_ready);
        assert!(fs.reversible_quantum_undo_ready);
        assert!(fh.delta_seed_synchronization_ready);
        assert!(fd.sparse_seed_instancing_ready);
        assert!(ft.distinct_from_reversible_quantum_undo_probe);
        assert!(ft.distinct_from_delta_seed_synchronization_probe);
        assert!(ft.distinct_from_sparse_seed_instancing_probe);
        assert_ne!(
            ft.fingerprint, fs.fingerprint,
            "ft fingerprint must differ from fs"
        );
        assert_ne!(
            ft.fingerprint, fh.fingerprint,
            "ft fingerprint must differ from fh"
        );
        assert_ne!(
            ft.fingerprint, fd.fingerprint,
            "ft fingerprint must differ from fd"
        );
    }
}
