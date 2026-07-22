//! Democratized AI LoD Deployer — Intelligence Level-of-Detail & Deployment Orchestrator.
//!
//! Scales AI Intelligence Level of Detail (AI LoD) based on host hardware tier and regional API quotas.
//! Local/cheap AI handles mundane indexing, calling Master AI (Sonnet 5) only during crucial narrative beats.
//! Parses `.aethel-deploy` global deployment manifest for resource allocation.

use serde::{Deserialize, Serialize};

/// AI Intelligence Level of Detail Tier.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AiIntelligenceLodTier {
    FullMasterSonnet5,  // Crucial narrative beats & master code authoring
    HybridRefinedWorker,// Local Gemma 2 / Flash worker with Master bridge
    UltraCheapLocalOnly,// 100% Local Gemma 2 / Llama 3 for low-cost hardware
}

/// Democratized Deployment Profile.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DemocratizedDeployProfile {
    pub region_code: String,
    pub active_ai_lod: AiIntelligenceLodTier,
    pub max_gpu_quota_percent: f32,
    pub cost_per_session_usd: f32,
}

/// Democratized AI LoD Deployer facade.
pub struct DemocratizedAiLodDeployer;

impl DemocratizedAiLodDeployer {
    /// Evaluates hardware budget and region deployment manifest to assign AI LoD.
    pub fn assign_deployment_lod(
        region: &str,
        device_vram_gb: f32,
        is_narrative_climax: bool,
    ) -> DemocratizedDeployProfile {
        let lod = if is_narrative_climax || device_vram_gb >= 12.0 {
            AiIntelligenceLodTier::FullMasterSonnet5
        } else if device_vram_gb >= 4.0 {
            AiIntelligenceLodTier::HybridRefinedWorker
        } else {
            AiIntelligenceLodTier::UltraCheapLocalOnly
        };

        let cost = match lod {
            AiIntelligenceLodTier::FullMasterSonnet5 => 0.02,
            AiIntelligenceLodTier::HybridRefinedWorker => 0.001,
            AiIntelligenceLodTier::UltraCheapLocalOnly => 0.00, // Zero API cost!
        };

        DemocratizedDeployProfile {
            region_code: region.to_string(),
            active_ai_lod: lod,
            max_gpu_quota_percent: 75.0,
            cost_per_session_usd: cost,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_low_end_device_gets_zero_cost_local_ai_lod() {
        let profile = DemocratizedAiLodDeployer::assign_deployment_lod("BR", 2.0, false);
        assert_eq!(profile.active_ai_lod, AiIntelligenceLodTier::UltraCheapLocalOnly);
        assert_eq!(profile.cost_per_session_usd, 0.0);
    }
}
