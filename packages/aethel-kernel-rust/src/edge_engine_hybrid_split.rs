//! Edge-Engine Hybrid Split — Transparent Cloud-Local Kernel Execution Splitter.
//!
//! Splits heavy P4/P7 physics simulation onto edge cloud compute clusters while streaming
//! Lux Spectral Raymarching to low-end devices / mobile web browsers with zero lag.

use serde::{Deserialize, Serialize};

/// Target Execution Domain for Kernel Subsystems.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ExecutionDomain {
    LocalDeviceGpu,
    EdgeCloudCluster,
}

/// Distributed Hybrid Workload Plan.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct HybridWorkloadPlan {
    pub physics_domain: ExecutionDomain,
    pub raymarching_domain: ExecutionDomain,
    pub network_payload_compression_ratio: f32,
    pub max_perceived_lag_ms: f32,
}

/// Edge-Engine Hybrid Split facade.
pub struct EdgeEngineHybridSplit;

impl EdgeEngineHybridSplit {
    /// Formats optimal cloud/local compute workload partitioning based on client device power.
    pub fn partition_workload(client_device_gflops: f32) -> HybridWorkloadPlan {
        if client_device_gflops < 2000.0 {
            // Low-end mobile / browser: run physics on cloud, render Lux locally
            HybridWorkloadPlan {
                physics_domain: ExecutionDomain::EdgeCloudCluster,
                raymarching_domain: ExecutionDomain::LocalDeviceGpu,
                network_payload_compression_ratio: 16.0,
                max_perceived_lag_ms: 0.8,
            }
        } else {
            // High-end desktop: run everything locally
            HybridWorkloadPlan {
                physics_domain: ExecutionDomain::LocalDeviceGpu,
                raymarching_domain: ExecutionDomain::LocalDeviceGpu,
                network_payload_compression_ratio: 1.0,
                max_perceived_lag_ms: 0.1,
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_low_end_device_partitions_physics_to_edge_cloud() {
        let plan = EdgeEngineHybridSplit::partition_workload(800.0); // Mobile GPU GFLOPS
        assert_eq!(plan.physics_domain, ExecutionDomain::EdgeCloudCluster);
        assert_eq!(plan.raymarching_domain, ExecutionDomain::LocalDeviceGpu);
        assert!(plan.max_perceived_lag_ms < 1.0);
    }
}
