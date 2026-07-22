// Síntese Acústica por Ressonância
// O fim definitivo dos arquivos .wav gravados. O som é calculado matematicamente
// com base no Módulo de Young (Elasticidade) e no choque físico de geometrias.

use std::f32::consts::PI;

pub struct AcousticSynthesis;

impl AcousticSynthesis {
    /// O motor de colisão avisa o impacto. Em vez de tocar áudio, 
    /// o Rust processa e sintetiza a forma de onda do material "gemendo/vibrando".
    pub fn compute_resonance(impact_velocity: f32, youngs_modulus: f32, density: f32, time_ms: f32) -> f32 {
        if impact_velocity < 0.1 {
            return 0.0;
        }

        // Frequência fundamental baseada na rigidez (Módulo de Young) vs Massa (Densidade)
        let base_frequency = (youngs_modulus / density).sqrt() * 100.0; 
        
        // Decaimento exponencial da vibração molecular ao longo do tempo (Damping)
        let decay = (-time_ms * 0.05).exp();
        
        // Amplitude baseada puramente na força do impacto (Sem ganho artificial)
        let amplitude = impact_velocity * decay;

        // O buffer da placa de som WebAudio vai receber essa onda sinusoidal pura
        amplitude * (2.0 * PI * base_frequency * time_ms).sin()
    }
}
