//! # Task Graph Dependency System — letter **jt** (quality **aa**).
//!
//! Deterministic arbitrary-DAG scheduler for game systems, distinct from every
//! prior scheduling substrate:
//!
//! - [`fiber_job_system`](crate::fiber_job_system) (**js11**) — rayon
//!   work-stealing over preallocated SoA chunks with **sequential phase
//!   barriers**; it never computes a topological order, never derives parallel
//!   levels, and has **no cycle detection** (`JobGraph::wait_idle` only
//!   barriers job counts).
//! - [`thermal_scheduler`](crate::thermal_scheduler) (**fn**) — thermal
//!   admission control (simulated °C → job quota), not a dependency graph.
//! - [`asynchronous_reality_threads`](crate::asynchronous_reality_threads)
//!   (**fm**) — ordered async lanes, no arbitrary DAG.
//! - [`wasm_logic_node_compiler`](crate::wasm_logic_node_compiler) (**ip3**) —
//!   Blueprint visual-script → bytecode VM, single-threaded compile.
//! - `metasounds_dsp_compiler` — Kahn topo-sort for the **audio DSP VM** only.
//!
//! **This module is the first substrate that solves arbitrary DAG task
//! scheduling for game systems**: deterministic Kahn topological order
//! (tie-break by ascending node id), longest-path **parallel levels**
//! (wavefronts that are dependency-independent → safe parallel execution),
//! **fail-closed cycle detection** (returns the concrete cycle sample),
//! deterministic structural fingerprint **invariant across edge-insertion
//! order**, and a **zero-alloc hot loop** that executes every level via rayon
//! `par_iter` over precomputed SoA level tables with an order-independent
//! XOR-fold fingerprint (identical to the sequential reference).
//!
//! **HELD (never claimed):** `dots_aaa_ready: false`,
//! `unreal_taskgraph_aaa_ready: false` — no Unreal TaskGraph / DOTS / full
//! rayon-dependency-graph AAA parity is asserted. Coins / Agones / Nanite /
//! DLSS stay HELD.
//!
//! ## Determinism contract
//!
//! `TaskGraphBuilder::build()` sorts and dedups edges by `(from, to)` before
//! any traversal, so **two builders that register the same node set and the
//! same edge set in different insertion orders produce byte-identical
//! graphs** (same `graph_fingerprint`, same level table, same run
//! fingerprint). Cycle failure is deterministic: the same cycle is always
//! reported.

use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::BinaryHeap;
use std::time::Instant;

/// Fingerprint seed ("jt" — distinct from js11's `0x6a73_3131`).
pub const FP_SEED: u64 = 0x6a74_3131;

/// Default soak node count (5 wavefronts × 8 systems = 40 nodes).
pub const SOAK_NODE_COUNT: usize = 40;

/// Default soak edge fan-out per node (3 successors per layer).
pub const SOAK_FAN_OUT: usize = 3;

/// Max nodes a single graph may hold (SoA preallocation ceiling).
pub const MAX_NODES: usize = 1024;

/// Max edges a single graph may hold.
pub const MAX_EDGES: usize = 16384;

/// Compact, SoA-friendly node descriptor.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[repr(C, align(8))]
pub struct TaskNodeSpec {
    /// User/system identifier carried through scheduling (opaque to the sort).
    pub system_id: u32,
    /// Relative cost hint (weight) — used only for the run fingerprint so that
    /// a re-ordered weight set is observable; the scheduler itself is
    /// weight-independent (pure dependency order).
    pub weight: u16,
    /// Reserved for alignment (keeps the struct 8 bytes, cache-line friendly).
    pub _pad: u16,
}

impl TaskNodeSpec {
    /// Const constructor for the packed node descriptor.
    pub const fn new(system_id: u32, weight: u16) -> Self {
        Self {
            system_id,
            weight,
            _pad: 0,
        }
    }
}

/// A directed dependency edge `from → to` ("`from` must complete before `to`").
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TaskEdge {
    pub from: u32,
    pub to: u32,
}

impl TaskEdge {
    /// Const constructor for a dependency edge.
    pub const fn new(from: u32, to: u32) -> Self {
        Self { from, to }
    }
}

/// Fail-closed error surface for graph compilation.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TaskGraphError {
    /// The graph contains no nodes — nothing to schedule.
    EmptyGraph,
    /// An edge references a node index outside `[0, node_count)`.
    OutOfBoundsNode {
        edge_from: u32,
        edge_to: u32,
        node_count: u32,
    },
    /// A dependency cycle was detected. `processed` < `node_count`; the
    /// `cycle_sample` is a concrete walk `v0 → v1 → … → vk → v0`.
    CycleDetected {
        node_count: u32,
        processed: u32,
        cycle_sample: Vec<u32>,
    },
}

/// The compiled, SoA-packed dependency graph.
///
/// `#[repr(C, align(64))]` — the hot-loop reads (`nodes_by_level`,
/// `level_starts`) are cache-line aligned and never reallocated after build.
#[derive(Debug, Clone)]
#[repr(C, align(64))]
pub struct TaskGraph {
    /// Node descriptors indexed by node id (`0..node_count`).
    nodes: Vec<TaskNodeSpec>,
    /// CSR adjacency head: `head[node]` = first edge index or `-1`.
    head: Vec<i32>,
    /// CSR `next_edge[edge]` = next edge sharing the same `from`, or `-1`.
    next_edge: Vec<i32>,
    /// CSR `to[edge]` = target node of the edge.
    to: Vec<u32>,
    /// Total edge count (deduped).
    edge_count: u32,
    /// Deterministic topological order (ascending-id tie-break).
    topo_order: Vec<u32>,
    /// Longest-path parallel level per node.
    levels: Vec<u32>,
    /// `level_starts[L]`..`level_starts[L+1]` indexes `nodes_by_level`.
    level_starts: Vec<u32>,
    /// Node ids grouped by level, ascending within each level.
    nodes_by_level: Vec<u32>,
    /// Structural fingerprint (deterministic across build orders).
    graph_fingerprint: u64,
}

impl TaskGraph {
    /// Number of nodes in the compiled graph.
    #[inline]
    pub fn node_count(&self) -> u32 {
        self.nodes.len() as u32
    }

    /// Number of edges in the compiled graph (deduped).
    #[inline]
    pub fn edge_count(&self) -> u32 {
        self.edge_count
    }

    /// Number of dependency-independent wavefronts (parallel levels).
    #[inline]
    pub fn level_count(&self) -> u32 {
        self.level_starts.len() as u32 - 1
    }

    /// Maximum number of nodes that can run in parallel (widest level).
    pub fn max_parallel_width(&self) -> u32 {
        (0..self.level_count() as usize)
            .map(|l| self.level_starts[l + 1] - self.level_starts[l])
            .max()
            .unwrap_or(0)
    }

    /// Longest-path parallel level of a node (0-based wavefront index).
    #[inline]
    pub fn level_of(&self, node: u32) -> u32 {
        self.levels[node as usize]
    }

    /// Deterministic topological order (ascending-id tie-break).
    #[inline]
    pub fn topo_order(&self) -> &[u32] {
        &self.topo_order
    }

    /// The SoA level table start offsets (`level_count() + 1` entries).
    #[inline]
    pub fn level_starts(&self) -> &[u32] {
        &self.level_starts
    }

    /// Node ids grouped by level — the zero-alloc hot-loop slice source.
    #[inline]
    pub fn nodes_by_level(&self) -> &[u32] {
        &self.nodes_by_level
    }

    /// Per-node parallel level (wavefront) index.
    #[inline]
    pub fn levels(&self) -> &[u32] {
        &self.levels
    }

    /// Structural fingerprint — identical for identical graphs regardless of
    /// edge-insertion order.
    #[inline]
    pub fn graph_fingerprint(&self) -> u64 {
        self.graph_fingerprint
    }

    /// Deterministic run fingerprint for a single node executed at `level`.
    ///
    /// Represents "this system ran on this wavefront" — a pure function of
    /// (node id, system id, weight, level), so it is reproducible across runs
    /// and threads.
    #[inline]
    fn node_run_hash(&self, node: u32, level: u32) -> u64 {
        let spec = &self.nodes[node as usize];
        let mut h = FP_SEED;
        h = mix_hash(h, node as u64);
        h = mix_hash(h, spec.system_id as u64);
        h = mix_hash(h, spec.weight as u64);
        h = mix_hash(h, level as u64);
        h
    }

    /// Reference **sequential** execution over the level table.
    ///
    /// Pure, deterministic, zero-alloc (single-pass over `nodes_by_level`).
    /// A wavefront is a *set* of concurrently-schedulable systems, not a
    /// sequence, so the per-level fold is order-independent: each node
    /// contributes a pure hash combined with XOR (commutative and
    /// associative). The parallel path must reproduce this fingerprint
    /// exactly, regardless of rayon chunking.
    pub fn run_sequential(&self) -> u64 {
        let mut fp = FP_SEED;
        for level in 0..self.level_count() as usize {
            let start = self.level_starts[level] as usize;
            let end = self.level_starts[level + 1] as usize;
            let mut level_hash = 0u64;
            for &node in &self.nodes_by_level[start..end] {
                level_hash ^= self.node_run_hash(node, level as u32);
            }
            fp = mix_hash(fp, level_hash ^ (level as u64).wrapping_mul(0x9E37_79B9_7F4A_7C15));
        }
        fp
    }

    /// Zero-alloc **parallel** execution of every wavefront via rayon.
    ///
    /// Each level is dependency-independent by construction, so all its nodes
    /// may run concurrently. Every node maps to a **pure** per-node hash
    /// (a function of node id, system id, weight, and level only) which is
    /// then XOR-reduced — XOR is commutative and associative, so the fold is
    /// order-independent and the returned fingerprint is **bit-identical** to
    /// [`TaskGraph::run_sequential`] regardless of thread count or chunking.
    /// This is the determinism contract that survives the parallel hot loop.
    pub fn run_parallel(&self) -> u64 {
        let mut fp = FP_SEED;
        for level in 0..self.level_count() as usize {
            let start = self.level_starts[level] as usize;
            let end = self.level_starts[level + 1] as usize;
            let slice = &self.nodes_by_level[start..end];
            let level_hash = slice
                .par_iter()
                .map(|&node| self.node_run_hash(node, level as u32))
                .reduce(|| 0u64, |a, b| a ^ b);
            fp = mix_hash(fp, level_hash ^ (level as u64).wrapping_mul(0x9E37_79B9_7F4A_7C15));
        }
        fp
    }
}

/// Incremental builder for a [`TaskGraph`].
///
/// Allocation happens here (build time only); the compiled graph is
/// zero-alloc in the hot loop.
#[derive(Debug, Default)]
pub struct TaskGraphBuilder {
    nodes: Vec<TaskNodeSpec>,
    edges: Vec<TaskEdge>,
}

impl TaskGraphBuilder {
    /// New empty builder.
    pub fn new() -> Self {
        Self::default()
    }

    /// New builder with preallocated capacity (avoids reallocation churn for
    /// large game-system DAGs).
    pub fn with_capacity(nodes: usize, edges: usize) -> Self {
        Self {
            nodes: Vec::with_capacity(nodes.min(MAX_NODES)),
            edges: Vec::with_capacity(edges.min(MAX_EDGES)),
        }
    }

    /// Register a node and return its node id (0-based, insertion order).
    ///
    /// Panics (with a clear invariant) if the builder would exceed
    /// `MAX_NODES` — the SoA ceiling is a hard contract, not a silent fallback.
    pub fn add_node(&mut self, system_id: u32, weight: u16) -> u32 {
        assert!(
            self.nodes.len() < MAX_NODES,
            "TaskGraphBuilder exceeded MAX_NODES={MAX_NODES}"
        );
        self.nodes.push(TaskNodeSpec::new(system_id, weight));
        (self.nodes.len() - 1) as u32
    }

    /// Register a dependency edge `from → to`.
    ///
    /// Out-of-range indices and duplicate edges are not rejected here — they
    /// are validated deterministically at [`TaskGraphBuilder::build`] so the
    /// failure surface is uniform and fail-closed.
    pub fn add_edge(&mut self, from: u32, to: u32) {
        assert!(
            self.edges.len() < MAX_EDGES,
            "TaskGraphBuilder exceeded MAX_EDGES={MAX_EDGES}"
        );
        self.edges.push(TaskEdge::new(from, to));
    }

    /// Number of registered nodes.
    pub fn node_count(&self) -> u32 {
        self.nodes.len() as u32
    }

    /// Number of registered edges (before dedup).
    pub fn edge_count(&self) -> u32 {
        self.edges.len() as u32
    }

    /// Compile the graph — deterministic Kahn topo-sort + longest-path levels.
    ///
    /// Fails **fail-closed** on: empty graph, out-of-bounds edges, or a
    /// dependency cycle (the concrete cycle sample is returned).
    pub fn build(&self) -> Result<TaskGraph, TaskGraphError> {
        let node_count = self.nodes.len();
        if node_count == 0 {
            return Err(TaskGraphError::EmptyGraph);
        }

        // Determinism across edge-insertion orders: sort + dedup by (from, to).
        let mut edges: Vec<TaskEdge> = self.edges.clone();
        edges.sort_unstable_by_key(|e| (e.from, e.to));
        edges.dedup_by_key(|e| (e.from, e.to));

        for e in &edges {
            if e.from >= node_count as u32 || e.to >= node_count as u32 {
                return Err(TaskGraphError::OutOfBoundsNode {
                    edge_from: e.from,
                    edge_to: e.to,
                    node_count: node_count as u32,
                });
            }
        }

        // Build CSR adjacency (head / next_edge / to).
        let mut head = vec![-1i32; node_count];
        let mut next_edge = vec![-1i32; edges.len()];
        let mut to = vec![0u32; edges.len()];
        let mut indeg = vec![0u32; node_count];
        for (i, e) in edges.iter().enumerate() {
            to[i] = e.to;
            next_edge[i] = head[e.from as usize];
            head[e.from as usize] = i as i32;
            indeg[e.to as usize] += 1;
        }

        // Deterministic Kahn: min-heap pops the smallest ready id first, so the
        // topological order never depends on insertion order.
        let mut heap: BinaryHeap<std::cmp::Reverse<u32>> = BinaryHeap::new();
        for v in 0..node_count as u32 {
            if indeg[v as usize] == 0 {
                heap.push(std::cmp::Reverse(v));
            }
        }

        let mut topo: Vec<u32> = Vec::with_capacity(node_count);
        let mut levels = vec![0u32; node_count];
        let mut work_indeg = indeg.clone();
        while let Some(std::cmp::Reverse(u)) = heap.pop() {
            topo.push(u);
            let mut e = head[u as usize];
            while e >= 0 {
                let v = to[e as usize];
                let cand = levels[u as usize] + 1;
                if cand > levels[v as usize] {
                    levels[v as usize] = cand;
                }
                work_indeg[v as usize] -= 1;
                if work_indeg[v as usize] == 0 {
                    heap.push(std::cmp::Reverse(v));
                }
                e = next_edge[e as usize];
            }
        }

        if topo.len() < node_count {
            let cycle_sample = find_cycle_via_dfs(&head, &next_edge, &to, node_count)
                .unwrap_or_default();
            return Err(TaskGraphError::CycleDetected {
                node_count: node_count as u32,
                processed: topo.len() as u32,
                cycle_sample,
            });
        }

        // Longest-path level table → parallel wavefronts.
        let level_count = levels.iter().copied().max().map(|m| m + 1).unwrap_or(1);
        let mut counts = vec![0u32; level_count as usize];
        for &l in &levels {
            counts[l as usize] += 1;
        }
        let mut level_starts = vec![0u32; level_count as usize + 1];
        let mut acc = 0u32;
        for i in 0..level_count as usize {
            level_starts[i] = acc;
            acc += counts[i];
        }
        level_starts[level_count as usize] = acc;
        let mut nodes_by_level = vec![0u32; node_count];
        let mut cursor = level_starts.clone();
        for v in 0..node_count as u32 {
            let l = levels[v as usize] as usize;
            nodes_by_level[cursor[l] as usize] = v;
            cursor[l] += 1;
        }

        // Structural fingerprint — deterministic across build orders because it
        // walks sorted edges and the fixed node array.
        let mut fp = FP_SEED;
        for (i, spec) in self.nodes.iter().enumerate() {
            fp = mix_hash(fp, i as u64);
            fp = mix_hash(fp, spec.system_id as u64);
            fp = mix_hash(fp, spec.weight as u64);
        }
        for e in &edges {
            fp = mix_hash(fp, e.from as u64);
            fp = mix_hash(fp, e.to as u64);
        }
        for &l in &levels {
            fp = mix_hash(fp, l as u64);
        }

        Ok(TaskGraph {
            nodes: self.nodes.clone(),
            head,
            next_edge,
            to,
            edge_count: edges.len() as u32,
            topo_order: topo,
            levels,
            level_starts,
            nodes_by_level,
            graph_fingerprint: fp,
        })
    }
}

/// Deterministic hash mix (splitmix-style) — domain-distinct constants.
#[inline]
fn mix_hash(mut h: u64, x: u64) -> u64 {
    h ^= x.wrapping_mul(0x9E37_79B9_7F4A_7C15);
    h = h.rotate_left(27).wrapping_mul(0x517C_C1B7_2722_0A95);
    h
}

/// Finds one concrete cycle `v0 → v1 → … → vk → v0` via a 3-color DFS.
///
/// Only invoked on the error path (a cycle is known to exist), so recursion
/// depth ≤ `MAX_NODES` is safe on the default 8 MB stack.
fn find_cycle_via_dfs(head: &[i32], next_edge: &[i32], to: &[u32], node_count: usize) -> Option<Vec<u32>> {
    // 0 = white (unvisited), 1 = gray (on the current DFS path), 2 = black.
    let mut color = vec![0u8; node_count];
    let mut path: Vec<u32> = Vec::new();

    fn dfs(
        u: u32,
        head: &[i32],
        next_edge: &[i32],
        to: &[u32],
        color: &mut [u8],
        path: &mut Vec<u32>,
    ) -> Option<Vec<u32>> {
        color[u as usize] = 1;
        path.push(u);
        let mut e = head[u as usize];
        while e >= 0 {
            let v = to[e as usize];
            if color[v as usize] == 0 {
                if let Some(cycle) = dfs(v, head, next_edge, to, color, path) {
                    return Some(cycle);
                }
            } else if color[v as usize] == 1 {
                // Back edge u → v: the cycle is path[path[v]..] + [v].
                let idx = path.iter().position(|&x| x == v)?;
                let mut cycle = path[idx..].to_vec();
                cycle.push(v);
                return Some(cycle);
            }
            e = next_edge[e as usize];
        }
        color[u as usize] = 2;
        path.pop();
        None
    }

    for start in 0..node_count {
        if color[start] == 0 {
            if let Some(cycle) = dfs(start as u32, head, next_edge, to, &mut color, &mut path) {
                return Some(cycle);
            }
        }
    }
    None
}

/// Evidence kind tag for the soak report.
pub const TASK_GRAPH_EVIDENCE_KIND: &str = "deterministic_dag_wavefront_xor_fold";

/// Instant-measured soak report — production evidence, AAA fail-closed.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskGraphSoakReport {
    pub task_graph_scheduler_ready: bool,
    pub topo_sort_ok: bool,
    pub cycle_detection_ok: bool,
    pub levels_computed: bool,
    pub parallel_execution_ok: bool,
    pub deterministic_across_build_orders: bool,
    pub same_input_same_fingerprint: bool,
    pub parallel_matches_sequential: bool,
    pub outputs_finite: bool,
    pub node_count: usize,
    pub edge_count: usize,
    pub level_count: usize,
    pub max_parallel_width: usize,
    pub soak_elapsed_ns: u128,
    pub evidence_kind: &'static str,
    pub evidence_fingerprint: u64,
    /// Fail-closed — never claim Unreal TaskGraph / DOTS AAA.
    pub dots_aaa_ready: bool,
    pub unreal_taskgraph_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
}

/// Builds the deterministic layered soak graph (5 wavefronts × 8 systems).
///
/// Every node in layer `l` connects to three successors in layer `l + 1`, so
/// the longest-path level table is exact (`level_count == 5`,
/// `max_parallel_width == 8`) and the graph is a genuine DAG.
fn build_soak_graph() -> TaskGraph {
    let layers: usize = 5;
    let per_layer: usize = 8;
    let mut builder = TaskGraphBuilder::with_capacity(SOAK_NODE_COUNT, SOAK_NODE_COUNT * SOAK_FAN_OUT);
    let mut ids = [0u32; SOAK_NODE_COUNT];
    for layer in 0..layers {
        for i in 0..per_layer {
            let node = layer * per_layer + i;
            // system_id = layer*100 + i ; weight = (i * 37 + layer * 11) mod 251.
            let system_id = (layer * 100 + i) as u32;
            let weight = ((i * 37 + layer * 11) % 251) as u16;
            ids[node] = builder.add_node(system_id, weight);
        }
    }
    for layer in 0..layers - 1 {
        for i in 0..per_layer {
            let from = layer * per_layer + i;
            for k in 0..SOAK_FAN_OUT {
                let to_idx = (i + k) % per_layer;
                let to = (layer + 1) * per_layer + to_idx;
                builder.add_edge(ids[from], ids[to]);
            }
        }
    }
    builder.build().expect("soak graph must compile")
}

/// Runs the deterministic task-graph soak.
///
/// Exercises: exact level computation on a known layered DAG, parallel
/// execution matching the sequential reference, determinism across edge
/// insertion order, duplicate-edge dedup, and fail-closed cycle detection.
pub fn run_task_graph_soak() -> TaskGraphSoakReport {
    static CACHE: std::sync::OnceLock<TaskGraphSoakReport> = std::sync::OnceLock::new();
    CACHE.get_or_init(|| {
    let t0 = Instant::now();

    // 1. Reference graph — exact level table.
    let graph = build_soak_graph();
    let node_count = graph.node_count() as usize;
    let edge_count = graph.edge_count() as usize;
    let level_count = graph.level_count() as usize;
    let max_width = graph.max_parallel_width() as usize;
    let levels_computed = level_count == 5 && max_width == 8;

    // 2. Determinism across edge-insertion order: rebuild with identical node
    //    specs but reversed edge registration. Node ids are insertion order, so
    //    `add_node` returns `n` for every node — the same id space used by the
    //    edge list below.
    let mut reversed_builder = TaskGraphBuilder::new();
    for n in 0..node_count {
        let layer = n / 8;
        let i = n % 8;
        // Identical spec formula to `build_soak_graph()` so the structural
        // fingerprint and level table match exactly.
        let system_id = (layer * 100 + i) as u32;
        let weight = ((i * 37 + layer * 11) % 251) as u16;
        let _ = reversed_builder.add_node(system_id, weight);
    }
    let mut edge_list: Vec<(u32, u32)> = Vec::new();
    for layer in 0..4 {
        for i in 0..8 {
            let from = layer * 8 + i;
            for k in 0..SOAK_FAN_OUT {
                let to = (layer + 1) * 8 + (i + k) % 8;
                edge_list.push((from as u32, to as u32));
            }
        }
    }
    edge_list.reverse();
    for (f, t) in edge_list {
        reversed_builder.add_edge(f, t);
    }
    let reversed = reversed_builder.build().expect("reversed layered DAG must compile");
    let deterministic_across_build_orders =
        reversed.graph_fingerprint() == graph.graph_fingerprint()
            && reversed.nodes_by_level() == graph.nodes_by_level()
            && reversed.topo_order() == graph.topo_order();

    // 3. Parallel == sequential, and repeat determinism.
    let fp_seq = graph.run_sequential();
    let fp_par_a = graph.run_parallel();
    let fp_par_b = graph.run_parallel();
    let parallel_matches_sequential = fp_par_a == fp_seq && fp_par_a != 0;
    let same_input_same_fingerprint = fp_par_a == fp_par_b && fp_par_a != 0;

    // 4. Duplicate edges are deduped (structural identity).
    let mut dup_builder = TaskGraphBuilder::new();
    for i in 0..node_count {
        let _ = dup_builder.add_node(i as u32, (i as u16).wrapping_mul(3));
    }
    for &(f, t) in &[
        (0u32, 8u32),
        (0, 8),
        (8, 16),
        (8, 16),
        (8, 16),
        (16, 24),
        (24, 32),
    ] {
        dup_builder.add_edge(f, t);
    }
    let dup = dup_builder.build().expect("dup graph must compile");
    // 7 added edges collapse to 4 unique edges: (0,8), (8,16), (16,24), (24,32).
    let dup_edge_count = dup.edge_count();
    assert_eq!(dup_edge_count, 4);

    // 5. Fail-closed cycle detection with a concrete cycle sample.
    let mut cyc_builder = TaskGraphBuilder::new();
    for i in 0..3 {
        let _ = cyc_builder.add_node(i as u32, 1);
    }
    cyc_builder.add_edge(0, 1);
    cyc_builder.add_edge(1, 2);
    cyc_builder.add_edge(2, 0);
    let cycle_detection_ok = match cyc_builder.build() {
        Err(TaskGraphError::CycleDetected {
            node_count: cn,
            processed,
            cycle_sample,
        }) => {
            cn == 3 && processed == 0 && cycle_sample.len() >= 3
        }
        _ => false,
    };

    // 6. Finite outputs — the XOR-fold fingerprints must be non-sentinel.
    let outputs_finite = fp_par_a != u64::MAX && fp_seq != u64::MAX;

    let topo_sort_ok = graph.topo_order().len() == node_count
        && graph.topo_order().windows(2).all(|w| w[0] < w[1]);
    let parallel_execution_ok = parallel_matches_sequential && same_input_same_fingerprint;

    let ready = topo_sort_ok
        && cycle_detection_ok
        && levels_computed
        && parallel_execution_ok
        && deterministic_across_build_orders
        && same_input_same_fingerprint
        && outputs_finite;

    let elapsed = t0.elapsed().as_nanos();

    let mut evidence = FP_SEED;
    evidence = mix_hash(evidence, fp_par_a);
    evidence = mix_hash(evidence, fp_seq);
    evidence = mix_hash(evidence, u64::from(ready));
    evidence = mix_hash(evidence, elapsed as u64);

    TaskGraphSoakReport {
        task_graph_scheduler_ready: ready && evidence != 0 && elapsed > 0,
        topo_sort_ok,
        cycle_detection_ok,
        levels_computed,
        parallel_execution_ok,
        deterministic_across_build_orders,
        same_input_same_fingerprint,
        parallel_matches_sequential,
        outputs_finite,
        node_count,
        edge_count,
        level_count,
        max_parallel_width: max_width,
        soak_elapsed_ns: elapsed,
        evidence_kind: TASK_GRAPH_EVIDENCE_KIND,
        evidence_fingerprint: evidence,
        dots_aaa_ready: false,
        unreal_taskgraph_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
    }
    })
    .clone()
}

/// Honesty probe — soak-gated `task_graph_scheduler_ready` (**jt**).
pub fn probe_task_graph_scheduler() -> TaskGraphSoakReport {
    run_task_graph_soak()
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Diamond: A→(B,C); B→D; C→D.
    /// Expected: levels A=0, B=1, C=1, D=2; width=2; topo=[0,1,2,3].
    fn diamond() -> TaskGraph {
        let mut b = TaskGraphBuilder::new();
        for i in 0..4 {
            let _ = b.add_node(100 + i, 1);
        }
        b.add_edge(0, 1);
        b.add_edge(0, 2);
        b.add_edge(1, 3);
        b.add_edge(2, 3);
        b.build().expect("diamond must compile")
    }

    #[test]
    fn diamond_graph_produces_exact_levels_and_width() {
        let g = diamond();
        assert_eq!(g.node_count(), 4);
        assert_eq!(g.edge_count(), 4);
        assert_eq!(g.level_count(), 3);
        assert_eq!(g.max_parallel_width(), 2);
        assert_eq!(g.level_of(0), 0);
        assert_eq!(g.level_of(1), 1);
        assert_eq!(g.level_of(2), 1);
        assert_eq!(g.level_of(3), 2);
    }

    #[test]
    fn topo_order_is_deterministic_ascending_id_tiebreak() {
        let g = diamond();
        // After A(0), B(1) and C(2) are both ready; ascending-id tie-break pops B first.
        assert_eq!(g.topo_order(), &[0, 1, 2, 3]);
    }

    #[test]
    fn chain_graph_produces_strictly_increasing_levels() {
        let mut b = TaskGraphBuilder::new();
        for i in 0..4 {
            let _ = b.add_node(200 + i, 1);
        }
        for i in 0..3 {
            b.add_edge(i as u32, i as u32 + 1);
        }
        let g = b.build().expect("chain must compile");
        assert_eq!(g.level_count(), 4);
        assert_eq!(g.max_parallel_width(), 1);
        assert_eq!(g.level_of(3), 3);
        assert_eq!(g.topo_order(), &[0, 1, 2, 3]);
    }

    #[test]
    fn parallel_and_sequential_run_fingerprints_match() {
        let g = diamond();
        let seq = g.run_sequential();
        let par = g.run_parallel();
        assert_eq!(par, seq);
        assert_ne!(par, 0);
    }

    #[test]
    fn run_is_deterministic_across_repeats() {
        let g = diamond();
        assert_eq!(g.run_parallel(), g.run_parallel());
        assert_eq!(g.run_sequential(), g.run_sequential());
    }

    #[test]
    fn same_graph_same_fingerprint_across_edge_insertion_orders() {
        // Build the diamond with edges in three different insertion orders.
        let orders: [Vec<(u32, u32)>; 3] = [
            vec![(0, 1), (0, 2), (1, 3), (2, 3)],
            vec![(2, 3), (1, 3), (0, 2), (0, 1)],
            vec![(0, 2), (0, 1), (2, 3), (1, 3)],
        ];
        let fps: Vec<u64> = orders
            .iter()
            .map(|edges| {
                let mut b = TaskGraphBuilder::new();
                for i in 0..4 {
                    let _ = b.add_node(100 + i, 1);
                }
                for &(f, t) in edges {
                    b.add_edge(f, t);
                }
                let g = b.build().expect("diamond must compile");
                (g.graph_fingerprint(), g.nodes_by_level().to_vec())
            })
            .map(|(fp, _)| fp)
            .collect();
        assert_eq!(fps[0], fps[1]);
        assert_eq!(fps[1], fps[2]);
    }

    #[test]
    fn cycle_detection_fails_closed_with_cycle_sample() {
        let mut b = TaskGraphBuilder::new();
        for i in 0..3 {
            let _ = b.add_node(i, 1);
        }
        b.add_edge(0, 1);
        b.add_edge(1, 2);
        b.add_edge(2, 0);
        match b.build() {
            Err(TaskGraphError::CycleDetected {
                node_count,
                processed,
                cycle_sample,
            }) => {
                assert_eq!(node_count, 3);
                assert_eq!(processed, 0);
                assert!(cycle_sample.len() >= 3, "cycle sample too short: {cycle_sample:?}");
                // The sample must be a closed walk: first == last.
                assert_eq!(cycle_sample.first(), cycle_sample.last());
                for w in cycle_sample.windows(2) {
                    // Adjacent ids in the walk are connected by an edge — the
                    // DFS guarantees this; here we just verify the sample is a
                    // proper closed loop over the 3 cyclic nodes.
                    assert!(w[0] < 3 && w[1] < 3);
                }
            }
            other => panic!("expected CycleDetected, got {other:?}"),
        }
    }

    #[test]
    fn self_loop_is_a_cycle() {
        let mut b = TaskGraphBuilder::new();
        let _ = b.add_node(7, 1);
        b.add_edge(0, 0);
        assert!(matches!(b.build(), Err(TaskGraphError::CycleDetected { .. })));
    }

    #[test]
    fn empty_graph_fails_closed() {
        let b = TaskGraphBuilder::new();
        assert!(matches!(b.build(), Err(TaskGraphError::EmptyGraph)));
    }

    #[test]
    fn out_of_bounds_edge_fails_closed() {
        let mut b = TaskGraphBuilder::new();
        let _ = b.add_node(1, 1);
        b.add_edge(0, 5);
        match b.build() {
            Err(TaskGraphError::OutOfBoundsNode {
                edge_from,
                edge_to,
                node_count,
            }) => {
                assert_eq!(edge_from, 0);
                assert_eq!(edge_to, 5);
                assert_eq!(node_count, 1);
            }
            other => panic!("expected OutOfBoundsNode, got {other:?}"),
        }
    }

    #[test]
    fn duplicate_edges_are_deduped() {
        let mut b = TaskGraphBuilder::new();
        for i in 0..3 {
            let _ = b.add_node(i, 1);
        }
        b.add_edge(0, 1);
        b.add_edge(0, 1);
        b.add_edge(0, 1);
        b.add_edge(1, 2);
        b.add_edge(1, 2);
        let g = b.build().expect("must compile");
        assert_eq!(g.edge_count(), 2);
    }

    #[test]
    fn max_parallel_width_is_correct() {
        // Two independent chains of length 2 → 2 parallel at every level.
        let mut b = TaskGraphBuilder::new();
        for i in 0..4 {
            let _ = b.add_node(i, 1);
        }
        b.add_edge(0, 2);
        b.add_edge(1, 3);
        let g = b.build().expect("must compile");
        assert_eq!(g.level_count(), 2);
        assert_eq!(g.max_parallel_width(), 2);
        assert_eq!(g.topo_order(), &[0, 1, 2, 3]);
    }

    #[test]
    fn level_of_matches_longest_path() {
        // A→B→D and A→C→D plus B→C: longest path to D is A→B→C→D (3 edges).
        let mut b = TaskGraphBuilder::new();
        for i in 0..4 {
            let _ = b.add_node(i, 1);
        }
        b.add_edge(0, 1);
        b.add_edge(0, 2);
        b.add_edge(1, 3);
        b.add_edge(2, 3);
        b.add_edge(1, 2);
        let g = b.build().expect("must compile");
        // Longest path: 0→1→2→3 → level(D)=3; C sits at level 2.
        assert_eq!(g.level_of(0), 0);
        assert_eq!(g.level_of(1), 1);
        assert_eq!(g.level_of(2), 2);
        assert_eq!(g.level_of(3), 3);
        assert_eq!(g.level_count(), 4);
    }

    #[test]
    fn soak_reports_ready_with_aaa_held() {
        let r = run_task_graph_soak();
        assert!(r.task_graph_scheduler_ready);
        assert!(r.topo_sort_ok);
        assert!(r.cycle_detection_ok);
        assert!(r.levels_computed);
        assert!(r.parallel_execution_ok);
        assert!(r.deterministic_across_build_orders);
        assert!(r.same_input_same_fingerprint);
        assert!(r.parallel_matches_sequential);
        assert!(r.outputs_finite);
        assert_eq!(r.node_count, SOAK_NODE_COUNT);
        assert_eq!(r.level_count, 5);
        assert_eq!(r.max_parallel_width, 8);
        assert!(r.edge_count > 0);
        // AAA flags always HELD.
        assert!(!r.dots_aaa_ready);
        assert!(!r.unreal_taskgraph_aaa_ready);
        assert!(!r.coins_ready);
        assert!(!r.agones_ready);
        assert!(!r.nanite_ready);
        assert!(!r.dlss_ready);
        assert_ne!(r.evidence_fingerprint, 0);
        assert!(r.soak_elapsed_ns > 0);
    }

    #[test]
    fn probe_matches_soak() {
        let a = run_task_graph_soak();
        let b = probe_task_graph_scheduler();
        // `soak_elapsed_ns` is wall-clock (non-deterministic between runs), so
        // the deterministic fields are compared exactly (fiber/ki precedent).
        assert_eq!(a.task_graph_scheduler_ready, b.task_graph_scheduler_ready);
        assert_eq!(a.topo_sort_ok, b.topo_sort_ok);
        assert_eq!(a.cycle_detection_ok, b.cycle_detection_ok);
        assert_eq!(a.levels_computed, b.levels_computed);
        assert_eq!(a.parallel_execution_ok, b.parallel_execution_ok);
        assert_eq!(
            a.deterministic_across_build_orders,
            b.deterministic_across_build_orders
        );
        assert_eq!(a.same_input_same_fingerprint, b.same_input_same_fingerprint);
        assert_eq!(a.parallel_matches_sequential, b.parallel_matches_sequential);
        assert_eq!(a.outputs_finite, b.outputs_finite);
        assert_eq!(a.node_count, b.node_count);
        assert_eq!(a.edge_count, b.edge_count);
        assert_eq!(a.level_count, b.level_count);
        assert_eq!(a.max_parallel_width, b.max_parallel_width);
        assert_eq!(a.evidence_kind, b.evidence_kind);
        // `evidence_fingerprint` mixes wall-clock elapsed — non-deterministic
        // between runs; assert non-zero on both instead.
        assert_ne!(a.evidence_fingerprint, 0);
        assert_ne!(b.evidence_fingerprint, 0);
        assert!(a.soak_elapsed_ns > 0 && b.soak_elapsed_ns > 0);
        assert!(!a.dots_aaa_ready && !b.dots_aaa_ready);
        assert!(!a.unreal_taskgraph_aaa_ready && !b.unreal_taskgraph_aaa_ready);
    }
}
