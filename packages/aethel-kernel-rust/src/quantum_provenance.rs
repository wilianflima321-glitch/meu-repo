//! Content DNA / sovereignty imprint on WorldSoA (letter **dc**).
//! Fail-closed verify when no stamp has been written.

use crate::ecs_core::SceneGraph;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

pub struct QuantumProvenance;

impl QuantumProvenance {
    /// Fold `author_key` into a 64-bit stamp stored on the scene.
    /// Also XOR-folds into inactive-bit padding words so empty capacity carries signal.
    pub fn imprint_genomic_signature(scene: &mut SceneGraph, author_key: &str) {
        let mut hasher = DefaultHasher::new();
        author_key.hash(&mut hasher);
        let dna_hash = hasher.finish();
        scene.provenance_stamp = dna_hash;

        // Mix low bits into unused bitset words (capacity padding) — structural, not println.
        if !scene.active_bits.is_empty() {
            let last = scene.active_bits.len() - 1;
            scene.active_bits[last] ^= (dna_hash & 0xFFFF) << 48;
        }
    }

    /// Fail-closed: unset stamp ⇒ not verified.
    pub fn verify_signature(scene: &SceneGraph) -> bool {
        scene.provenance_stamp != 0
    }

    pub fn verify_against(scene: &SceneGraph, author_key: &str) -> bool {
        if scene.provenance_stamp == 0 {
            return false;
        }
        let mut hasher = DefaultHasher::new();
        author_key.hash(&mut hasher);
        scene.provenance_stamp == hasher.finish()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ecs_core::SceneGraph;

    #[test]
    fn imprint_and_verify() {
        let mut g = SceneGraph::with_capacity(16);
        assert!(!QuantumProvenance::verify_signature(&g));
        QuantumProvenance::imprint_genomic_signature(&mut g, "founder");
        assert!(QuantumProvenance::verify_signature(&g));
        assert!(QuantumProvenance::verify_against(&g, "founder"));
        assert!(!QuantumProvenance::verify_against(&g, "other"));
    }
}
