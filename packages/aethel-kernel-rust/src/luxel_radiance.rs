// Radiância Térmica Inerente (Luxel DNA)
// A luz deixa de ser um "Shader Externo" ou Ray-Tracing estéril. 
// A luz nasce de dentro da matéria através da termodinâmica programável.

pub struct LuxelRadiance;

impl LuxelRadiance {
    /// Calcula a emissividade da luz com base apenas no estado térmico molecular do objeto.
    /// Retorna um vetor RGB de Radiância [R, G, B].
    #[inline(always)]
    pub fn compute_luxel_emission(temperature: f32, _density: f32) -> [f32; 3] {
        // Lei de Planck simplificada para Radiância de Corpo Negro (Black-body radiation).
        // Se a temperatura do SDF (Barro) passar de 500 graus, ele emite luz avermelhada.
        // A 10.000 graus, emite luz azul-branca. Zero Light Bakes.
        if temperature < 500.0 {
            return [0.0, 0.0, 0.0]; // Matéria fria, luz ambiente apenas
        }

        let temp_k = temperature / 1000.0;
        let red = (temp_k).clamp(0.0, 1.0);
        let green = (temp_k * 0.5).clamp(0.0, 1.0);
        let blue = (temp_k * 0.1).clamp(0.0, 1.0);

        [red, green, blue]
    }
}
