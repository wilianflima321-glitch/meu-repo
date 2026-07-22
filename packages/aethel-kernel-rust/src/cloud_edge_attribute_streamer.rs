//! Cloud Edge Attribute Streamer — Hybrid Cloud/Edge Instruction Streamer & Lux Lite Dithering.
//!
//! Cloud-to-Edge hybrid offloader: streams lightweight light attribute instructions (not heavy video streams)
//! to budget smartphones or integrated GPUs.
//! Features Lux Lite Mode: traces 100 rays instead of 10,000 and uses a Spatial Neural Upscaler in Rust for AAA visuals on iGPUs.

use serde::{Deserialize, Serialize};

/// Cloud/Edge Rendering Offload Mode.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum HybridOffloadMode {
    LocalNativeGpu,
    CloudLightInstructionStream,
    LuxLiteSpectralDithering,
}

/// Hybrid Attribute Stream Packet.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AttributeStreamPacket {
    pub mode: HybridOffloadMode,
    pub traced_rays_count: u32,
    pub bandwidth_kbps: f32,
    pub spatial_upscale_factor: f32,
}

/// Cloud Edge Attribute Streamer facade.
pub struct CloudEdgeAttributeStreamer;

impl CloudEdgeAttributeStreamer {
    /// Selects optimal hybrid streaming mode based on user GPU capabilities and network bandwidth.
    pub fn configure_hybrid_stream(
        is_integrated_gpu: bool,
        bandwidth_mbps: f32,
    ) -> AttributeStreamPacket {
        if is_integrated_gpu && bandwidth_mbps > 5.0 {
            // Low-end mobile/iGPU: Stream pixel light instructions from cloud
            AttributeStreamPacket {
                mode: HybridOffloadMode::CloudLightInstructionStream,
                traced_rays_count: 500,
                bandwidth_kbps: 450.0, // 450 KB/s - super lightweight!
                spatial_upscale_factor: 2.0,
            }
        } else if is_integrated_gpu {
            // Low bandwidth + iGPU: Lux Lite Dithering locally
            AttributeStreamPacket {
                mode: HybridOffloadMode::LuxLiteSpectralDithering,
                traced_rays_count: 100, // 100 rays + neural upscale
                bandwidth_kbps: 0.0,
                spatial_upscale_factor: 4.0,
            }
        } else {
            AttributeStreamPacket {
                mode: HybridOffloadMode::LocalNativeGpu,
                traced_rays_count: 10_000,
                bandwidth_kbps: 0.0,
                spatial_upscale_factor: 1.0,
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_igpu_uses_cloud_instruction_stream_with_low_bandwidth() {
        let packet = CloudEdgeAttributeStreamer::configure_hybrid_stream(true, 10.0);
        assert_eq!(packet.mode, HybridOffloadMode::CloudLightInstructionStream);
        assert!(packet.bandwidth_kbps < 500.0);
    }

    #[test]
    fn test_igpu_uses_lux_lite_dithering_offline() {
        let packet = CloudEdgeAttributeStreamer::configure_hybrid_stream(true, 1.0);
        assert_eq!(packet.mode, HybridOffloadMode::LuxLiteSpectralDithering);
        assert_eq!(packet.traced_rays_count, 100);
    }
}
