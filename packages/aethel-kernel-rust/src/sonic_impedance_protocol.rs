//! Acoustic impedance against density/porosity (letter **dc**).
//! Remaining amplitude after path: closed-form attenuation (not raymarch yet).

pub struct SonicImpedanceProtocol;

impl SonicImpedanceProtocol {
    /// Remaining sonic amplitude in [0, 1] after `distance` metres through
    /// material with bulk `obstacle_density` in [0, 1] (1 = solid rock).
    ///
    /// Model: α = α_air + dens * α_solid * (1 - porosity_proxy).
    /// Porosity proxy = (1 - density)^2 so foam transmits more than steel.
    pub fn trace_acoustic_ray(distance: f32, obstacle_density: f32) -> f32 {
        let d = distance.max(0.0);
        let dens = obstacle_density.clamp(0.0, 1.0);
        let porosity = (1.0 - dens) * (1.0 - dens);
        let alpha_air = 0.0015_f32;
        let alpha_solid = 0.85_f32;
        let alpha = alpha_air + dens * alpha_solid * (1.0 - porosity);
        (-alpha * d).exp().clamp(0.0, 1.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn denser_blocks_more() {
        let air = SonicImpedanceProtocol::trace_acoustic_ray(10.0, 0.0);
        let rock = SonicImpedanceProtocol::trace_acoustic_ray(10.0, 1.0);
        assert!(air > rock);
        assert!(rock < 0.01);
    }

    #[test]
    fn zero_distance_full() {
        let a = SonicImpedanceProtocol::trace_acoustic_ray(0.0, 1.0);
        assert!((a - 1.0).abs() < 1e-5);
    }
}
