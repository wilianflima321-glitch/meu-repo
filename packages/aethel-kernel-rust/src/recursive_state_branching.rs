//! Local time dilation via WorldSoA `timescale` column (letter **dc**).
//! Bucketized substeps — not dual 240fps timelines (those remain HELD).

use crate::ecs_core::SceneGraph;

pub struct RecursiveStateBranching;

impl RecursiveStateBranching {
    /// Set per-entity local timescale (1.0 = realtime, 0.25 = quarter-speed).
    pub fn execute_local_time_dilation(scene: &mut SceneGraph, entity_id: u64, local_timescale: f64) {
        let i = entity_id as usize;
        if i >= scene.len {
            return;
        }
        scene.timescale[i] = (local_timescale as f32).clamp(0.0, 64.0);
    }

    /// Quantize timescale into buckets for substep scheduling.
    /// Returns number of physics micro-steps to run this frame for `scale`
    /// given a base frame delta and target substep size.
    #[inline(always)]
    pub fn substeps_for_scale(scale: f32, base_dt: f32, substep_dt: f32) -> u32 {
        if scale <= 0.0 || substep_dt <= 0.0 {
            return 0;
        }
        let effective = base_dt * scale;
        ((effective / substep_dt).ceil() as u32).clamp(0, 64)
    }

    /// Tick physics using each entity's timescale (delegates to SceneGraph).
    pub fn tick_dilated(scene: &mut SceneGraph, base_dt: f32) {
        scene.tick_physics(base_dt);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ecs_core::SceneGraph;

    #[test]
    fn dilation_slows_fall() {
        let mut fast = SceneGraph::with_capacity(4);
        let mut slow = SceneGraph::with_capacity(4);
        let a = fast.add_entity(0.0, 10.0, 0.0).unwrap();
        let b = slow.add_entity(0.0, 10.0, 0.0).unwrap();
        RecursiveStateBranching::execute_local_time_dilation(&mut slow, b.0 as u64, 0.25);
        RecursiveStateBranching::tick_dilated(&mut fast, 1.0);
        RecursiveStateBranching::tick_dilated(&mut slow, 1.0);
        let dy_fast = 10.0 - fast.pos_y[a.0 as usize];
        let dy_slow = 10.0 - slow.pos_y[b.0 as usize];
        assert!(dy_slow < dy_fast);
        assert!((dy_slow / dy_fast - 0.25).abs() < 1e-4);
    }

    #[test]
    fn substeps_bucket() {
        assert_eq!(RecursiveStateBranching::substeps_for_scale(1.0, 1.0 / 60.0, 1.0 / 60.0), 1);
        assert!(RecursiveStateBranching::substeps_for_scale(4.0, 1.0 / 60.0, 1.0 / 60.0) >= 4);
    }
}
