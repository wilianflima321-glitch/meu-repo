// O Tratador de Erros Poéticos (Amortecedor de Sanidade)
// Aritmética Autolimpante: Se a matemática quebrar (NaN, DivZero), a geometria se desfaz em Névoa Volumétrica.

pub struct PoeticErrorHandler;

impl PoeticErrorHandler {
    /// Intercepta distâncias SDF corrompidas (NaN, Infinito).
    /// Em vez de travar a GPU, o Kernel relaxa as equações, convertendo
    /// a singularidade em um Campo de Nevoeiro Volumétrico Dinâmico.
    #[inline(always)]
    pub fn intercept_sdf_anomaly(raw_distance: f32, p: [f32; 3]) -> f32 {
        if raw_distance.is_nan() || raw_distance.is_infinite() {
            // Amortecedor de Sanidade (Sanity Damper)
            // Cria um gradiente suave baseado em ruído temporal para ser renderizado via Raymarching
            // como um gás/nevoeiro, indicando instabilidade espacial.
            let volumetric_fog_boundary = (p[0].sin() * p[1].cos() * p[2].sin()) * 2.0;
            return volumetric_fog_boundary.abs(); // Sempre positivo, impedindo superfície dura
        }
        
        raw_distance
    }
}
