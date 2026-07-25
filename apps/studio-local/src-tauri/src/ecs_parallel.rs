//! Missão Suprema 5 — ECS Multi-Threading Extremo (estilo Unity DOTS).
//!
//! A minimal, self-contained struct-of-arrays world demonstrating the real
//! technique DOTS-style engines use for bulk simulation: contiguous
//! component arrays updated via data-parallel iteration (`rayon`), not a
//! full archetype/query/scheduler ECS — that's a much larger, separate
//! effort. Race-condition freedom here isn't a runtime property being hoped
//! for at 3am: it is enforced *at compile time* by the borrow checker, since
//! `par_iter_mut` only type-checks when every parallel closure provably
//! touches a disjoint slice of memory.
use std::time::Instant;

use rayon::prelude::*;
use serde::Serialize;

#[derive(Clone, Copy, Default)]
pub struct Vec3 {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

/// Struct-of-arrays entity storage: every component lives in its own flat
/// `Vec`, so a system touching only `position`/`velocity` never has to walk
/// past unrelated component data — the same cache-friendly layout DOTS/ECS
/// engines rely on for throughput, independent of the parallelism on top.
pub struct ParallelEntityWorld {
    pub position: Vec<Vec3>,
    pub velocity: Vec<Vec3>,
    pub health: Vec<f32>,
}

impl ParallelEntityWorld {
    /// Deterministic spawn (golden-angle velocity spread) so benchmark runs
    /// are reproducible without pulling in an RNG dependency just for this.
    pub fn spawn(entity_count: usize) -> Self {
        const GOLDEN_ANGLE: f32 = 2.399_963_2;
        Self {
            position: vec![Vec3::default(); entity_count],
            velocity: (0..entity_count)
                .map(|index| {
                    let angle = index as f32 * GOLDEN_ANGLE;
                    Vec3 {
                        x: angle.cos(),
                        y: 0.0,
                        z: angle.sin(),
                    }
                })
                .collect(),
            health: vec![100.0; entity_count],
        }
    }

    pub fn len(&self) -> usize {
        self.position.len()
    }

    pub fn is_empty(&self) -> bool {
        self.position.is_empty()
    }

    /// Advances every entity's position by its velocity, distributed across
    /// every core rayon's global thread pool can see.
    pub fn tick_parallel(&mut self, dt: f32) {
        self.position
            .par_iter_mut()
            .zip(self.velocity.par_iter())
            .for_each(|(position, velocity)| {
                position.x += velocity.x * dt;
                position.y += velocity.y * dt;
                position.z += velocity.z * dt;
            });
    }

    /// Single-threaded twin of `tick_parallel`, kept only so the benchmark
    /// command and the correctness test below have an honest baseline to
    /// compare against.
    pub fn tick_serial(&mut self, dt: f32) {
        for (position, velocity) in self.position.iter_mut().zip(self.velocity.iter()) {
            position.x += velocity.x * dt;
            position.y += velocity.y * dt;
            position.z += velocity.z * dt;
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EcsBenchmarkReport {
    pub entity_count: usize,
    pub ticks: u32,
    pub parallel_ms: f64,
    pub serial_ms: f64,
    pub speedup: f64,
    pub worker_threads: usize,
}

/// Runs both a parallel and a serial simulation over the same entity count
/// and reports wall-clock timings — real, measured numbers (not a claimed
/// theoretical speedup), matching this codebase's evidence-first posture.
#[tauri::command]
pub fn ecs_benchmark(entity_count: usize, ticks: u32) -> EcsBenchmarkReport {
    let entity_count = entity_count.clamp(1, 2_000_000);
    let ticks = ticks.clamp(1, 10_000);
    let dt = 1.0 / 60.0;

    let mut parallel_world = ParallelEntityWorld::spawn(entity_count);
    let parallel_start = Instant::now();
    for _ in 0..ticks {
        parallel_world.tick_parallel(dt);
    }
    let parallel_ms = parallel_start.elapsed().as_secs_f64() * 1000.0;

    let mut serial_world = ParallelEntityWorld::spawn(entity_count);
    let serial_start = Instant::now();
    for _ in 0..ticks {
        serial_world.tick_serial(dt);
    }
    let serial_ms = serial_start.elapsed().as_secs_f64() * 1000.0;

    EcsBenchmarkReport {
        entity_count,
        ticks,
        parallel_ms,
        serial_ms,
        speedup: if parallel_ms > 0.0 { serial_ms / parallel_ms } else { 0.0 },
        worker_threads: rayon::current_num_threads(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parallel_and_serial_ticks_agree_on_the_result() {
        let mut parallel_world = ParallelEntityWorld::spawn(1_000);
        let mut serial_world = ParallelEntityWorld::spawn(1_000);

        parallel_world.tick_parallel(0.5);
        serial_world.tick_serial(0.5);

        for (parallel_position, serial_position) in parallel_world.position.iter().zip(serial_world.position.iter()) {
            assert!((parallel_position.x - serial_position.x).abs() < 1e-6);
            assert!((parallel_position.y - serial_position.y).abs() < 1e-6);
            assert!((parallel_position.z - serial_position.z).abs() < 1e-6);
        }
    }

    #[test]
    fn spawn_produces_the_requested_entity_count() {
        let world = ParallelEntityWorld::spawn(12_345);
        assert_eq!(world.len(), 12_345);
        assert_eq!(world.health.len(), 12_345);
    }

    #[test]
    fn benchmark_handles_the_100k_entity_target_without_panicking() {
        let report = ecs_benchmark(100_000, 5);
        assert_eq!(report.entity_count, 100_000);
        assert_eq!(report.ticks, 5);
        assert!(report.worker_threads >= 1);
    }
}
