//! Neural Triplanar Synthesis — letter **he**.
//!
//! Replaces the stub with actual Triplanar projection blending logic for SDFs.

#[derive(Debug, Clone, Copy)]
pub struct Vec3 {
    pub x: f32, pub y: f32, pub z: f32
}

pub struct TriplanarSynthesizer;

impl TriplanarSynthesizer {
    /// Computes triplanar blend weights based on surface normal.
    pub fn compute_blend_weights(normal: Vec3, sharpness: f32) -> Vec3 {
        let mut weights = Vec3 {
            x: normal.x.abs().powf(sharpness),
            y: normal.y.abs().powf(sharpness),
            z: normal.z.abs().powf(sharpness),
        };
        
        let sum = weights.x + weights.y + weights.z;
        // Normalize to 1.0
        weights.x /= sum;
        weights.y /= sum;
        weights.z /= sum;
        
        weights
    }
}

pub fn probe_neural_triplanar_synthesis() -> bool {
    let normal = Vec3 { x: 0.577, y: 0.577, z: 0.577 }; // 45 deg
    let weights = TriplanarSynthesizer::compute_blend_weights(normal, 4.0);
    (weights.x + weights.y + weights.z - 1.0).abs() < 1e-5
}
