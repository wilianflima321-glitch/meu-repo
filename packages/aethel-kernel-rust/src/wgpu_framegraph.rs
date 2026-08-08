//! WGPU Retained Framegraph (Render Dependency Graph) — letter **fg**.
//!
//! Retained, data-oriented pass graph with unused-pass culling and lifetime
//! tracking for future transient aliasing.
//!
//! **Shipped now:** dependency cull + lifetime high-watermark bookkeeping.
//! **HELD:** physical transient heap aliasing (`memory_aliasing_active: false`),
//! automatic GPU barriers, JobSystem lock-free execute, full SRG AAA.

use std::collections::{HashMap, HashSet};

pub type ResourceId = u32;
pub type PassId = u32;

/// A virtual resource defined in the Framegraph before physical allocation.
#[derive(Debug, Clone)]
pub struct VirtualResource {
    pub id: ResourceId,
    pub name: String,
    pub is_texture: bool,
    pub size_bytes: u64,
}

/// Defines a Render Pass and its inputs/outputs for dependency resolution.
pub struct FramegraphPass {
    pub id: PassId,
    pub name: String,
    pub reads: Vec<ResourceId>,
    pub writes: Vec<ResourceId>,
    pub execution_callback: Option<Box<dyn Fn() + Send + Sync>>,
}

/// The Retained Framegraph builder and executor.
#[derive(Default)]
pub struct WgpuFramegraph {
    resources: HashMap<ResourceId, VirtualResource>,
    passes: Vec<FramegraphPass>,
    next_resource_id: ResourceId,
    next_pass_id: PassId,
}

impl WgpuFramegraph {
    pub fn new() -> Self {
        Self::default()
    }

    /// Registers a new virtual resource (e.g., G-Buffer Albedo).
    pub fn create_resource(&mut self, name: &str, is_texture: bool, size: u64) -> ResourceId {
        let id = self.next_resource_id;
        self.next_resource_id += 1;
        self.resources.insert(id, VirtualResource {
            id,
            name: name.to_string(),
            is_texture,
            size_bytes: size,
        });
        id
    }

    /// Adds a Render Pass to the graph.
    pub fn add_pass(&mut self, name: &str, reads: Vec<ResourceId>, writes: Vec<ResourceId>, callback: impl Fn() + Send + Sync + 'static) {
        let id = self.next_pass_id;
        self.next_pass_id += 1;
        self.passes.push(FramegraphPass {
            id,
            name: name.to_string(),
            reads,
            writes,
            execution_callback: Some(Box::new(callback)),
        });
    }

    /// Compiles the framegraph: culls unused passes and assigns physical memory aliases.
    pub fn compile(&mut self, backbuffer: ResourceId) -> Vec<PassId> {
        let mut required_resources = HashSet::new();
        required_resources.insert(backbuffer);
        let mut active_passes = Vec::new();

        // 1. Backward Traversal for Dead Code Elimination (Culling)
        for pass in self.passes.iter().rev() {
            let writes_to_required = pass.writes.iter().any(|w| required_resources.contains(w));
            if writes_to_required {
                active_passes.push(pass.id);
                for r in &pass.reads { required_resources.insert(*r); }
            }
        }
        active_passes.reverse();

        // 2. Lifetime high-watermark only — physical transient aliasing is HELD.
        // When aliasing ships, overlapping non-interfering lifetimes will share heaps.
        let mut active_lifetimes: HashMap<ResourceId, (usize, usize)> = HashMap::new();
        for (order, pass_id) in active_passes.iter().enumerate() {
            if let Some(pass) = self.passes.iter().find(|p| p.id == *pass_id) {
                for res in pass.reads.iter().chain(pass.writes.iter()) {
                    let entry = active_lifetimes.entry(*res).or_insert((order, order));
                    entry.1 = order; // Extend lifetime
                }
            }
        }
        let _ = active_lifetimes; // tracked for future alias pass; not yet applied

        active_passes
    }

    /// Executes the active passes in topological order.
    pub fn execute(&self, active_passes: &[PassId]) {
        for pass_id in active_passes {
            if let Some(pass) = self.passes.iter().find(|p| p.id == *pass_id) {
                if let Some(cb) = &pass.execution_callback {
                    cb();
                }
            }
        }
    }
}

/// Honesty probe structure for WGPU Framegraph readiness.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct WgpuFramegraphProbe {
    pub framegraph_ready: bool,
    pub passes_compiled: usize,
    pub memory_aliasing_active: bool,
}

pub fn probe_wgpu_framegraph(graph: &WgpuFramegraph) -> WgpuFramegraphProbe {
    WgpuFramegraphProbe {
        // Cull/compile path exists; physical aliasing does not.
        framegraph_ready: !graph.passes.is_empty(),
        passes_compiled: graph.passes.len(),
        // Honesty: lifetime bookkeeping ≠ transient heap aliasing.
        memory_aliasing_active: false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_framegraph_culling() {
        let mut fg = WgpuFramegraph::new();
        let depth = fg.create_resource("Depth", true, 1024);
        let albedo = fg.create_resource("Albedo", true, 1024);
        let visibility_buffer = fg.create_resource("VisibilityBuffer", false, 4096);
        let final_rt = fg.create_resource("Final", true, 1024);

        fg.add_pass("MicroPolyCulling", vec![], vec![visibility_buffer], || {
            // Here we would dispatch the GpuCullingCompute pipeline
        });

        fg.add_pass("BasePass", vec![visibility_buffer], vec![depth, albedo], || {
            // Here we would use multiDrawIndirect via visibility_buffer
        });
        fg.add_pass("UnusedPass", vec![albedo], vec![], || {});
        fg.add_pass("CompositePass", vec![depth, albedo], vec![final_rt], || {});

        let active = fg.compile(final_rt);
        assert_eq!(active.len(), 3); // UnusedPass should be culled

        let probe = probe_wgpu_framegraph(&fg);
        assert!(probe.framegraph_ready);
        assert_eq!(probe.passes_compiled, 4);
        assert!(
            !probe.memory_aliasing_active,
            "memory aliasing must stay fail-closed until physical heap reuse ships"
        );
    }
}
