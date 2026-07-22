// Entropia Temporal Procedimental
// Matéria programável que envelhece. A engine Aethel é um organismo biológico inorgânico.

pub struct TemporalEntropy;

impl TemporalEntropy {
    /// Modifica o Campo de Distância Assinado (SDF) ao longo do vetor de tempo.
    /// Exemplo: Erosão contínua da rocha por vento e umidade ausente.
    pub fn apply_erosion(base_distance: f32, p: [f32; 3], time_vector_days: f32) -> f32 {
        if time_vector_days <= 0.0 {
            return base_distance;
        }

        // Ruído que corrói o volume. 
        // Com o passar dos 'dias' simulados na cena, o objeto seca e perde massa.
        let erosion_factor = (time_vector_days * 0.01).min(0.5); // Cap de 50% de erosão
        let fractal_noise = (p[0] * 5.0).sin() * (p[2] * 5.0).cos();
        
        // Subtrai massa geométrica do SDF
        base_distance + (fractal_noise * erosion_factor)
    }
}
