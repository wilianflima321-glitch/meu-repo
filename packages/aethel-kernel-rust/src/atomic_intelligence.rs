// Inteligência Atômica (Distributed Component Intelligence)
// IAs comuns "grudam" um cérebro no osso. O Aethel faz o osso pensar. 
// Cada entidade Voxel possui um Tensor de Intenção Semântica.

pub struct IntentTensor {
    pub semantic_id: String, // ex: "arm_organic", "cog_metal"
    pub local_autonomy_level: f32, // O quanto essa parte tenta sobreviver/agir sem comando global
}

pub struct AtomicIntelligence;

impl AtomicIntelligence {
    /// Quando uma parte é "Arrancada" ou Desconectada, ela não vira Ragdoll (Física Burra).
    /// Ela acorda sua agência local usando o Tensor de Intenção.
    pub fn awaken_detached_matter(tensor: &IntentTensor, position: &mut [f32; 3], velocity: &mut [f32; 3]) {
        if tensor.local_autonomy_level > 0.5 {
            // A matéria reage organicamente ao dano estrutural.
            println!("[Atomic AI] Matéria isolada ({}) assumindo controle autônomo.", tensor.semantic_id);
            
            match tensor.semantic_id.as_str() {
                "arm_organic" | "flesh" => {
                    // Contração muscular matemática isolada (O braço se contrai e tenta buscar a origem)
                    velocity[1] += 5.0; // Pulo agonizante de física celular
                },
                "cog_metal" | "mechanical" => {
                    // Partes mecânicas dissipam energia tentando rodar antes de morrer
                    velocity[0] += 2.0; 
                    velocity[2] -= 2.0;
                },
                _ => {} // Matéria de baixa autonomia cai inerte
            }
        }
    }
}
