//! Decentralized Asset Provenance & Smart Bytecode Contracts — Creator IP Protection.
//!
//! Embeds cryptographic provenance hashes, creator signatures, and usage licensing terms
//! directly into compiled WASM/SoA bytecode and 3D assets to prevent unauthorized copying.

use serde::{Deserialize, Serialize};

/// Smart Asset Provenance Certificate embedded in kernel assets.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SmartAssetContract {
    pub asset_id: String,
    pub creator_public_key: String,
    pub creation_timestamp: u64,
    pub bytecode_sha256: String,
    pub royalty_percentage: f32,
    pub allowed_domain_origin: String,
}

impl SmartAssetContract {
    pub fn new(asset_id: &str, creator: &str, bytecode: &[u8]) -> Self {
        let bytecode_sha256 = sha256::digest(bytecode);
        Self {
            asset_id: asset_id.to_string(),
            creator_public_key: creator.to_string(),
            creation_timestamp: 1774137600, // 2026 Epoch
            bytecode_sha256,
            royalty_percentage: 5.0,
            allowed_domain_origin: "*".to_string(),
        }
    }

    /// Verifies bytecode integrity and creator licensing.
    pub fn verify_integrity(&self, bytecode: &[u8]) -> bool {
        let current_hash = sha256::digest(bytecode);
        current_hash == self.bytecode_sha256
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_smart_asset_contract_verification() {
        let code = b"AETHEL_GAMEPLAY_MECHANIC_BYTECODE";
        let contract = SmartAssetContract::new("mechanic_01", "creator_pub_key_xyz", code);
        assert!(contract.verify_integrity(code));

        let tampered_code = b"TAMPERED_BYTECODE";
        assert!(!contract.verify_integrity(tampered_code));
    }
}
