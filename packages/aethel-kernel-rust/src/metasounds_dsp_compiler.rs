//! Linear DSP sample evaluator — letter **ds**.
//!
//! Evaluates a **linear** node list (sine oscillator → gain → mixer passthrough)
//! into f32 samples. This is a real numeric path for unit tests and scaffold
//! authoring — **not** MetaSounds / cpal / HRTF AAA.
//!
//! **Shipped now:** linear sine/gain evaluation + honesty probe.
//! **HELD:** full MetaSounds graph compile (topo sort, buses, wave tables),
//! OS audio thread / cpal, HRTF, generative audio AAA
//! (`metasounds_aaa_ready: false`).

use serde::{Deserialize, Serialize};

/// Represents a node in the DSP graph.
#[derive(Debug, Clone, PartialEq)]
pub enum DspNode {
    /// Generates a basic sine wave at a specific frequency.
    SineOscillator { frequency: f32 },
    /// Multiplies the signal by an amplitude factor.
    Gain { amount: f32 },
    /// Adds two signals together (linear plan: no-op until multi-input stack ships).
    Mixer,
}

/// A directed edge connecting two DSP nodes (Source -> Destination).
#[derive(Debug, Clone, PartialEq)]
pub struct DspEdge {
    pub source_node: usize,
    pub dest_node: usize,
}

/// The visual node graph created by the Sound Designer.
pub struct DspGraph {
    pub nodes: Vec<DspNode>,
    pub edges: Vec<DspEdge>,
}

/// Compiled linear evaluation plan (not a MetaSounds bytecode patch).
pub struct CompiledDspPatch {
    /// True when the linear plan was accepted (nodes non-empty).
    pub is_compiled: bool,
    /// Linear execution order — edges are recorded but not topologically sorted yet.
    pub operations: Vec<DspNode>,
    /// Honesty: full MetaSounds AAA remains HELD.
    pub metasounds_aaa_ready: bool,
}

impl CompiledDspPatch {
    /// Generates the next floating point audio sample (typically between -1.0 and 1.0).
    pub fn process_next_sample(&mut self, time: f32) -> f32 {
        if !self.is_compiled {
            return 0.0;
        }

        let mut signal = 0.0;

        // Linear evaluation plan (honest scaffold — not a MetaSounds graph VM).
        for op in &self.operations {
            match op {
                DspNode::SineOscillator { frequency } => {
                    signal += (time * frequency * std::f32::consts::TAU).sin();
                }
                DspNode::Gain { amount } => {
                    signal *= amount;
                }
                DspNode::Mixer => {
                    // Multi-input mixer stack HELD — passthrough until topo/stack ships.
                }
            }
        }

        signal
    }
}

pub struct MetaSoundsDspCompiler;

impl MetaSoundsDspCompiler {
    /// Accepts a node list as a **linear** evaluation plan.
    ///
    /// Edges are retained for future topo-sort; they do not reorder operations yet.
    /// Empty graphs fail closed (`is_compiled: false`).
    pub fn compile(graph: DspGraph) -> CompiledDspPatch {
        let is_compiled = !graph.nodes.is_empty();
        let _ = graph.edges; // recorded by callers; topo-sort HELD
        CompiledDspPatch {
            is_compiled,
            operations: graph.nodes,
            metasounds_aaa_ready: false,
        }
    }
}

/// Honesty probe structure for DSP Audio readiness.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DspAudioProbe {
    /// Linear evaluator accepted a non-empty plan.
    pub dsp_ready: bool,
    pub sample_rate: u32,
    pub compiled_nodes: usize,
    /// Always false until MetaSounds / cpal / HRTF ship.
    pub metasounds_aaa_ready: bool,
    /// True when evaluation is linear-list only (current path).
    pub linear_plan_only: bool,
}

pub fn probe_dsp_audio(patch: &CompiledDspPatch) -> DspAudioProbe {
    DspAudioProbe {
        dsp_ready: patch.is_compiled,
        sample_rate: 48_000,
        compiled_nodes: patch.operations.len(),
        metasounds_aaa_ready: patch.metasounds_aaa_ready,
        linear_plan_only: true,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_linear_dsp_compilation_and_playback() {
        let graph = DspGraph {
            nodes: vec![
                DspNode::SineOscillator { frequency: 440.0 },
                DspNode::Gain { amount: 0.5 },
            ],
            edges: vec![DspEdge {
                source_node: 0,
                dest_node: 1,
            }],
        };

        let mut patch = MetaSoundsDspCompiler::compile(graph);
        assert!(patch.is_compiled);
        assert!(!patch.metasounds_aaa_ready);

        let sample_0 = patch.process_next_sample(0.0);
        assert_eq!(sample_0, 0.0);

        let sample_1 = patch.process_next_sample(0.0005);
        assert!(sample_1 > 0.0);

        let probe = probe_dsp_audio(&patch);
        assert!(probe.dsp_ready);
        assert_eq!(probe.compiled_nodes, 2);
        assert!(!probe.metasounds_aaa_ready);
        assert!(probe.linear_plan_only);
    }

    #[test]
    fn empty_graph_fails_closed() {
        let patch = MetaSoundsDspCompiler::compile(DspGraph {
            nodes: vec![],
            edges: vec![],
        });
        assert!(!patch.is_compiled);
        let probe = probe_dsp_audio(&patch);
        assert!(!probe.dsp_ready);
        assert!(!probe.metasounds_aaa_ready);
    }
}
