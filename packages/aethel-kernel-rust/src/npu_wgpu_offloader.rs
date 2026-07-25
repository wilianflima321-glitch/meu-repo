//! NPU / WGPU Offloader — letter **hd**.
//!
//! Evaluates the computational graph and decides whether to offload tensor 
//! operations to the Neural Processing Unit (NPU) or WebGPU Compute shaders.

pub enum ComputeTarget {
    CPU,
    WebGPU,
    NPU,
}

pub struct OffloadHeuristic;

impl OffloadHeuristic {
    /// Decides the target based on FLOPs and tensor dimensions.
    pub fn route_tensor_workload(tensor_size: usize, flops_per_element: usize, has_npu: bool) -> ComputeTarget {
        let total_flops = tensor_size * flops_per_element;

        if total_flops < 10_000 {
            // Overhead of uploading to GPU/NPU is higher than CPU compute time
            ComputeTarget::CPU
        } else if has_npu && flops_per_element > 1000 {
            // High complexity per element (e.g., Matrix Multiply / Neural weights) -> NPU
            ComputeTarget::NPU
        } else {
            // Massive parallel simple operations (e.g., Physics SoA / Particles) -> WebGPU
            ComputeTarget::WebGPU
        }
    }
}

pub fn probe_npu_wgpu_offloader() -> bool {
    let target = OffloadHeuristic::route_tensor_workload(1_000_000, 10, false);
    matches!(target, ComputeTarget::WebGPU)
}

/// Real WGSL compute dispatch descriptor & buffer stage layout (letter **hd** / P6).
#[derive(Debug, Clone, PartialEq)]
pub struct WgslComputeDispatchPipeline {
    pub entry_point: String,
    pub workgroups: [u32; 3],
    pub buffer_bytes: usize,
    pub bind_group_index: u32,
    pub wgsl_source_code: String,
}

impl WgslComputeDispatchPipeline {
    pub fn new_particle_compute(particle_count: usize) -> Self {
        let workgroups = [particle_count.div_ceil(64) as u32, 1, 1];
        let buffer_bytes = particle_count * 32; // SoA position (vec4) + velocity (vec4)
        let wgsl = r#"
@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;

struct Particle {
    pos: vec4<f32>,
    vel: vec4<f32>,
};

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let idx = id.x;
    if (idx >= arrayLength(&particles)) { return; }
    particles[idx].pos += particles[idx].vel * 0.016;
}
"#.to_string();

        Self {
            entry_point: "main".to_string(),
            workgroups,
            buffer_bytes,
            bind_group_index: 0,
            wgsl_source_code: wgsl,
        }
    }

    pub fn validate_dispatch(&self) -> bool {
        self.buffer_bytes > 0
            && self.workgroups[0] > 0
            && !self.entry_point.is_empty()
            && self.wgsl_source_code.contains("@compute")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_wgsl_compute_pipeline_dispatch_p6() {
        let pipeline = WgslComputeDispatchPipeline::new_particle_compute(10_000);
        assert!(pipeline.validate_dispatch());
        assert_eq!(pipeline.workgroups[0], 157); // 10000 / 64 = 156.25 -> 157 workgroups
        assert_eq!(pipeline.buffer_bytes, 320_000); // 10000 * 32 bytes
        assert_eq!(pipeline.entry_point, "main");
    }
}
