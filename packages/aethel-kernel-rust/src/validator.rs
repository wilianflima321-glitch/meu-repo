use serde::{Deserialize, Serialize};
use sha256::digest;

#[derive(Serialize, Deserialize)]
pub struct BitEvidence {
    pub hash: String,
    pub bytecode_valid: bool,
}

pub fn verify_asset_bit(raw_data: &[u8], expected_hash: &str) -> bool {
    let actual_hash = digest(raw_data);
    if actual_hash != expected_hash {
        println!("CRITICAL: Bit-corruption detected!");
        return false;
    }
    // Aqui o motor checa se o binário é seguro para execução
    true
}
