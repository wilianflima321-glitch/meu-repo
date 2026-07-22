//! Spectral participating media — real Beer–Lambert extinction (letter **dc**).

pub struct SpectralParticipatingMedia;

impl SpectralParticipatingMedia {
    /// Remaining RGB transmittance after path length `depth_m`.
    /// `I = I0 * exp(-σ * depth)`; σ derived from medium refraction proxy.
    ///
    /// `medium_refraction_idx`: ~1.0 air, ~1.33 water, higher → denser extinction.
    pub fn compute_beer_lambert_extinction(depth_m: f32, medium_refraction_idx: f32) -> [f32; 3] {
        let depth = depth_m.max(0.0);
        let n = medium_refraction_idx.max(1.0);
        // Spectral extinction coefficients (1/m) biased by (n - 1).
        let dens = (n - 1.0).max(0.0);
        let sigma = [
            0.04 + dens * 0.35, // R — water absorbs red first
            0.02 + dens * 0.12, // G
            0.01 + dens * 0.04, // B — penetrates deepest
        ];
        let i0 = [1.0f32, 1.0, 1.0];
        [
            i0[0] * (-sigma[0] * depth).exp(),
            i0[1] * (-sigma[1] * depth).exp(),
            i0[2] * (-sigma[2] * depth).exp(),
        ]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deeper_is_darker() {
        let shallow = SpectralParticipatingMedia::compute_beer_lambert_extinction(1.0, 1.33);
        let deep = SpectralParticipatingMedia::compute_beer_lambert_extinction(40.0, 1.33);
        assert!(deep[0] < shallow[0]);
        assert!(deep[2] > deep[0]); // blue remains more than red
    }

    #[test]
    fn air_barely_extincts() {
        let t = SpectralParticipatingMedia::compute_beer_lambert_extinction(10.0, 1.0);
        assert!(t[0] > 0.6);
    }

    #[test]
    fn args_not_ignored() {
        let a = SpectralParticipatingMedia::compute_beer_lambert_extinction(5.0, 1.0);
        let b = SpectralParticipatingMedia::compute_beer_lambert_extinction(5.0, 1.5);
        assert!(b[0] < a[0]);
    }
}
