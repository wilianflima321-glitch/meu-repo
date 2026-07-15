//! Missão Suprema 8 — Motion Matching Neural (Animação sem Transição).
//!
//! Two layers, deliberately kept separate:
//!
//! 1. [`MotionMatchingController`] — always compiled, zero dependencies
//!    beyond `serde`. A real, working analytical root-motion integrator
//!    (`root_motion_delta` from controller input + `dt`) that produces the
//!    exact same [`SkeletonPose`] shape a neural model would. This is the
//!    honest fallback every build ships with, and it's what a Blend-Tree
//!    replacement needs to slot into either way: a single `evaluate(input)
//!    -> pose` call.
//! 2. [`neural::NeuralMotionMatcher`] — gated behind the `local-ai` Cargo
//!    feature (already wired to the optional `ort` dependency in
//!    `Cargo.toml`), loading a real ONNX model via ONNX Runtime and running
//!    inference to fill the same `SkeletonPose`. This module is written
//!    against the `ort` 2.x session/value API as best-effort from
//!    documentation, but — like the rest of this pass — could not be
//!    verified against a working `cargo check --features local-ai` in this
//!    environment. It is deliberately isolated behind the feature flag so
//!    it cannot break the default build; treat its exact method names as a
//!    first draft to confirm the moment a Rust toolchain with the ONNX
//!    Runtime native libraries is available.
//!
//! Neither layer trains a model — bringing your own motion-capture-trained
//! ONNX network (the actual "GTA VI-style Motion Matching" AI) is a
//! separate, large ML project. What's real here is the *engine-side*
//! contract: how controller input becomes a pose every frame, and where a
//! trained network plugs into that contract without changing any call site.
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ControllerInput {
    pub move_x: f32,
    pub move_y: f32,
    pub speed: f32,
}

#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkeletonPose {
    /// Displacement to apply to the character's root this frame, in local
    /// space (x = strafe, y = vertical, z = forward).
    pub root_motion_delta: [f32; 3],
    /// Per-joint rotations as quaternions `[x, y, z, w]`, in skeleton bind
    /// order. Empty for the analytical fallback, which only drives root
    /// motion — a trained model is what actually fills in believable limb
    /// poses frame-to-frame instead of state-machine blend curves.
    pub joint_rotations: Vec<[f32; 4]>,
}

/// The always-available baseline: no blend trees, no neural network, just a
/// direct analytical mapping from stick input to root displacement. Real
/// code, not a stub — it's what runs whenever no ONNX model is loaded
/// (which is the common case until a studio brings its own trained model).
#[derive(Debug, Default)]
pub struct MotionMatchingController;

impl MotionMatchingController {
    pub fn evaluate(&self, input: ControllerInput, dt: f32) -> SkeletonPose {
        SkeletonPose {
            root_motion_delta: [
                input.move_x * input.speed * dt,
                0.0,
                input.move_y * input.speed * dt,
            ],
            joint_rotations: Vec::new(),
        }
    }
}

#[cfg(feature = "local-ai")]
pub mod neural {
    //! Best-effort `ort` 2.x integration — see the module-level doc comment
    //! above for the verification caveat. Kept intentionally small: one
    //! model in, one pose out, no batching, no async.
    use std::path::Path;
    use std::sync::Mutex;

    use ort::session::builder::GraphOptimizationLevel;
    use ort::session::Session;
    use ort::value::Value;

    use super::{ControllerInput, SkeletonPose};

    pub struct NeuralMotionMatcher {
        session: Mutex<Session>,
    }

    impl NeuralMotionMatcher {
        /// Loads a `.onnx` model expected to take a single `[1, 3]` float32
        /// input tensor (`move_x`, `move_y`, `speed`) and produce at least a
        /// `[1, 3]` float32 root-motion-delta output as its first output.
        pub fn load(model_path: &Path) -> Result<Self, String> {
            let session = Session::builder()
                .map_err(|error| format!("failed to create ONNX Runtime session builder: {error}"))?
                .with_optimization_level(GraphOptimizationLevel::Level3)
                .map_err(|error| format!("failed to configure ONNX Runtime optimization level: {error}"))?
                .commit_from_file(model_path)
                .map_err(|error| format!("failed to load motion matching ONNX model: {error}"))?;

            Ok(Self { session: Mutex::new(session) })
        }

        pub fn evaluate(&self, input: ControllerInput) -> Result<SkeletonPose, String> {
            let mut session = self
                .session
                .lock()
                .map_err(|_| "Studio Local motion matching session lock is poisoned.".to_string())?;

            let input_tensor = Value::from_array((
                [1usize, 3usize],
                vec![input.move_x, input.move_y, input.speed],
            ))
            .map_err(|error| format!("failed to build ONNX input tensor: {error}"))?;

            let outputs = session
                .run(ort::inputs!["controller_input" => input_tensor])
                .map_err(|error| format!("motion matching inference failed: {error}"))?;

            let (_shape, data) = outputs[0]
                .try_extract_tensor::<f32>()
                .map_err(|error| format!("failed to read ONNX output tensor: {error}"))?;

            Ok(SkeletonPose {
                root_motion_delta: [
                    data.first().copied().unwrap_or(0.0),
                    data.get(1).copied().unwrap_or(0.0),
                    data.get(2).copied().unwrap_or(0.0),
                ],
                joint_rotations: Vec::new(),
            })
        }
    }
}

#[tauri::command]
pub fn motion_matching_evaluate(input: ControllerInput, dt: f32) -> SkeletonPose {
    MotionMatchingController.evaluate(input, dt)
}

#[tauri::command]
pub fn motion_matching_status() -> bool {
    cfg!(feature = "local-ai")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn analytical_controller_scales_root_motion_by_speed_and_dt() {
        let pose = MotionMatchingController.evaluate(
            ControllerInput { move_x: 1.0, move_y: 0.5, speed: 4.0 },
            0.1,
        );
        assert!((pose.root_motion_delta[0] - 0.4).abs() < 1e-6);
        assert!((pose.root_motion_delta[2] - 0.2).abs() < 1e-6);
        assert_eq!(pose.root_motion_delta[1], 0.0);
        assert!(pose.joint_rotations.is_empty());
    }

    #[test]
    fn zero_input_produces_zero_root_motion() {
        let pose = MotionMatchingController.evaluate(ControllerInput::default(), 0.5);
        assert_eq!(pose.root_motion_delta, [0.0, 0.0, 0.0]);
    }
}
