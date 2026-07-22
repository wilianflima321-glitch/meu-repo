// Cemitério Semântico (Negative Latent Space)
// A Morte do Delete: Objetos apagados não dão "free()". Eles são positivados como Dor Matemática 
// para imunizar a IA contra alucinações repetidas.

use std::collections::HashSet;

pub struct NegativeLatentSpace {
    /// Sementes Agênticas que o usuário rejeitou (Delete).
    pain_registry: HashSet<u64>,
}

impl NegativeLatentSpace {
    pub fn new() -> Self {
        Self {
            pain_registry: HashSet::new(),
        }
    }

    /// Executado quando o usuário aperta 'Delete'.
    /// O objeto some do ECS, mas sua Semente Genômica entra para o registro de dor.
    pub fn execute_semantic_delete(&mut self, rejected_agent_seed: u64) {
        self.pain_registry.insert(rejected_agent_seed);
        println!("[Negative Latent Space] Voxel deletado (Seed: {}). O Shadow Maestro foi penalizado.", rejected_agent_seed);
        
        // Através do FFI, esse u64 é enviado de volta pro Maestro. 
        // Na próxima geração de barro, o gerador de ruído usará isso como uma restrição 
        // topológica (Constraint), fisicamente impedindo a matéria de adotar aquela forma novamente.
    }
    
    /// Verifica se a Semente está banida.
    pub fn is_forbidden(&self, seed: u64) -> bool {
        self.pain_registry.contains(&seed)
    }
}
