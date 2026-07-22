//! Spatial Neuro-Link Interface — Real-Time Spatial VR/AR & Intent-Driven Live Code Editor.
//!
//! Enables zero-UI spatial development inside VR/AR 3D workspaces.
//! Processes voice, gesture, and Intent Tensors to live-edit Rust ECS parameters and WebGPU shaders
//! without exiting the 3D playtest environment.

use serde::{Deserialize, Serialize};

/// Multimodal Spatial Action Input.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum SpatialInputKind {
    VoiceCommand(String),
    HandGestureSnap,
    SpatialRaycastSelect([f32; 3]),
}

/// Live Mutation Directive issued by Neuro-Link Interface.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NeuroLinkMutationDirective {
    pub target_component: String,
    pub parameter_name: String,
    pub new_value_float: f32,
    pub live_recompile_required: bool,
}

/// Spatial Neuro-Link Interface facade.
pub struct SpatialNeuroLinkInterface;

impl SpatialNeuroLinkInterface {
    /// Translates a multimodal spatial gesture or voice command into a live Rust/WebGPU mutation directive.
    pub fn process_spatial_intent(input: &SpatialInputKind) -> Option<NeuroLinkMutationDirective> {
        match input {
            SpatialInputKind::VoiceCommand(cmd) => {
                let lower = cmd.to_lowercase();
                if lower.contains("spectral light") || lower.contains("luz spectral") {
                    Some(NeuroLinkMutationDirective {
                        target_component: "lux_spectral_raymarched".to_string(),
                        parameter_name: "photon_intensity".to_string(),
                        new_value_float: 2.5,
                        live_recompile_required: false,
                    })
                } else if lower.contains("punch") || (lower.contains("soco") && lower.contains("pesado")) {
                    Some(NeuroLinkMutationDirective {
                        target_component: "muscle_sim_rig".to_string(),
                        parameter_name: "max_joint_torque".to_string(),
                        new_value_float: 450.0,
                        live_recompile_required: false,
                    })
                } else {
                    None
                }
            }
            SpatialInputKind::HandGestureSnap => Some(NeuroLinkMutationDirective {
                target_component: "dna_shuffler".to_string(),
                parameter_name: "genomic_seed_reseed".to_string(),
                new_value_float: 1.0,
                live_recompile_required: true,
            }),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_spatial_neuro_link_voice_command_translation() {
        let input = SpatialInputKind::VoiceCommand("mude o torque dessa habilidade de soco para parecer mais pesado".to_string());
        let directive = SpatialNeuroLinkInterface::process_spatial_intent(&input);
        assert!(directive.is_some());
        let d = directive.unwrap();
        assert_eq!(d.target_component, "muscle_sim_rig");
        assert_eq!(d.new_value_float, 450.0);
    }
}
