// ECS Distribuído (Estilhaçamento Quântico)
// Load-balancing Descentralizado. O Desktop calcula a física bruta, 
// o Browser no notebook do colega apenas renderiza o resultado e calcula as partículas simples.

use crate::hydra_mesh_node::HydraMeshNode;

pub struct DistributedEcsShard {
    pub local_entity_range: (u32, u32), // Range de entidades que ESTA máquina deve processar
    pub total_entities: u32,
}

impl DistributedEcsShard {
    pub fn new(total_entities: u32) -> Self {
        Self {
            local_entity_range: (0, total_entities),
            total_entities,
        }
    }

    /// Analisa o ecossistema P2P. Se um nó Desktop entra na sala de um Web Node,
    /// a Aethel Engine transfere a carga de simulação pesada matematicamente para o Desktop.
    pub fn calculate_metabolic_balance(&mut self, mesh: &HydraMeshNode, is_local_desktop: bool) {
        if mesh.peers.is_empty() {
            self.local_entity_range = (0, self.total_entities);
            return;
        }

        // Simulação de Estilhaçamento:
        // Se eu sou Desktop, eu pego de 0 a 80%. O meu amigo na Web pega de 80% a 100%.
        if is_local_desktop {
            let compute_ceiling = (self.total_entities as f32 * 0.8) as u32;
            self.local_entity_range = (0, compute_ceiling);
            println!("[ECS Distribuído] Nó Desktop assumiu 80% do processamento físico.");
        } else {
            let compute_floor = (self.total_entities as f32 * 0.8) as u32;
            self.local_entity_range = (compute_floor, self.total_entities);
            println!("[ECS Distribuído] Nó Web assumiu 20% do processamento físico.");
        }
    }

    /// Impede que o Hot Loop local calcule voxels que pertencem ao outro PC.
    #[inline(always)]
    pub fn is_my_responsibility(&self, entity_id: u32) -> bool {
        entity_id >= self.local_entity_range.0 && entity_id < self.local_entity_range.1
    }
}
