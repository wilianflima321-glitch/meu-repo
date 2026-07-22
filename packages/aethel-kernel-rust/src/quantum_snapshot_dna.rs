//! Genomic mutation log — packed MutEvent DNA (letter **dc**).
//! Seed + binary change-log; deterministic replay. No `Vec<String>`.

use crate::ecs_core::SceneGraph;
use std::io::{Cursor, Read, Write};

#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MutOp {
    SetTimescale = 1,
    SetPosition = 2,
    SetActive = 3,
    InjectForceY = 4,
}

impl MutOp {
    fn from_u8(v: u8) -> Option<Self> {
        match v {
            1 => Some(Self::SetTimescale),
            2 => Some(Self::SetPosition),
            3 => Some(Self::SetActive),
            4 => Some(Self::InjectForceY),
            _ => None,
        }
    }
}

#[repr(C)]
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct MutEvent {
    pub op: MutOp,
    pub entity: u32,
    pub a: f32,
    pub b: f32,
    pub c: f32,
}

pub struct QuantumSnapshotDna;

impl QuantumSnapshotDna {
    /// Serialize `seed` + packed events → bytes. Deterministic, no UTF-8 heap events.
    pub fn serialize_universe_genomic_log(base_seed: u64, events: &[MutEvent]) -> Vec<u8> {
        let mut out = Vec::with_capacity(16 + events.len() * 17);
        out.extend_from_slice(b"ADNA"); // magic
        out.extend_from_slice(&1u16.to_le_bytes()); // version
        out.extend_from_slice(&base_seed.to_le_bytes());
        out.extend_from_slice(&(events.len() as u32).to_le_bytes());
        for e in events {
            out.push(e.op as u8);
            out.extend_from_slice(&e.entity.to_le_bytes());
            out.extend_from_slice(&e.a.to_le_bytes());
            out.extend_from_slice(&e.b.to_le_bytes());
            out.extend_from_slice(&e.c.to_le_bytes());
        }
        out
    }

    /// Legacy stub signature — refuse String logs (fail-closed empty).
    pub fn serialize_universe_genomic_log_strings(
        _base_seed: u64,
        _mutation_events: Vec<String>,
    ) -> Vec<u8> {
        Vec::new()
    }

    pub fn parse_seed(bytes: &[u8]) -> Option<u64> {
        if bytes.len() < 14 || &bytes[0..4] != b"ADNA" {
            return None;
        }
        let mut cur = Cursor::new(&bytes[6..14]);
        let mut seed = [0u8; 8];
        cur.read_exact(&mut seed).ok()?;
        Some(u64::from_le_bytes(seed))
    }

    pub fn parse_events(bytes: &[u8]) -> Option<Vec<MutEvent>> {
        if bytes.len() < 18 || &bytes[0..4] != b"ADNA" {
            return None;
        }
        let count = u32::from_le_bytes(bytes[14..18].try_into().ok()?) as usize;
        let mut events = Vec::with_capacity(count);
        let mut off = 18;
        for _ in 0..count {
            if off + 17 > bytes.len() {
                return None;
            }
            let op = MutOp::from_u8(bytes[off])?;
            let entity = u32::from_le_bytes(bytes[off + 1..off + 5].try_into().ok()?);
            let a = f32::from_le_bytes(bytes[off + 5..off + 9].try_into().ok()?);
            let b = f32::from_le_bytes(bytes[off + 9..off + 13].try_into().ok()?);
            let c = f32::from_le_bytes(bytes[off + 13..off + 17].try_into().ok()?);
            events.push(MutEvent {
                op,
                entity,
                a,
                b,
                c,
            });
            off += 17;
        }
        Some(events)
    }

    /// Replay packed DNA onto a WorldSoA (deterministic).
    pub fn replay(scene: &mut SceneGraph, bytes: &[u8]) -> bool {
        let Some(events) = Self::parse_events(bytes) else {
            return false;
        };
        for e in events {
            let i = e.entity as usize;
            if i >= scene.capacity {
                continue;
            }
            // Extend logical len if needed (slots pre-allocated).
            if i >= scene.len {
                scene.len = i + 1;
            }
            match e.op {
                MutOp::SetTimescale => scene.timescale[i] = e.a,
                MutOp::SetPosition => {
                    scene.pos_x[i] = e.a;
                    scene.pos_y[i] = e.b;
                    scene.pos_z[i] = e.c;
                    scene.set_active(i, true);
                }
                MutOp::SetActive => scene.set_active(i, e.a > 0.5),
                MutOp::InjectForceY => scene.pos_y[i] += e.a,
            }
        }
        true
    }
}

/// Helper to append a single event into an existing buffer (tests / streaming).
pub fn append_mut_event(buf: &mut Vec<u8>, e: &MutEvent) {
    let _ = buf.write_all(&[e.op as u8]);
    let _ = buf.write_all(&e.entity.to_le_bytes());
    let _ = buf.write_all(&e.a.to_le_bytes());
    let _ = buf.write_all(&e.b.to_le_bytes());
    let _ = buf.write_all(&e.c.to_le_bytes());
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_replay_deterministic() {
        let events = [
            MutEvent {
                op: MutOp::SetPosition,
                entity: 0,
                a: 1.0,
                b: 2.0,
                c: 3.0,
            },
            MutEvent {
                op: MutOp::SetTimescale,
                entity: 0,
                a: 0.5,
                b: 0.0,
                c: 0.0,
            },
        ];
        let bytes = QuantumSnapshotDna::serialize_universe_genomic_log(0xDEAD_BEEF, &events);
        assert_eq!(QuantumSnapshotDna::parse_seed(&bytes), Some(0xDEAD_BEEF));

        let mut a = SceneGraph::with_capacity(8);
        let mut b = SceneGraph::with_capacity(8);
        assert!(QuantumSnapshotDna::replay(&mut a, &bytes));
        assert!(QuantumSnapshotDna::replay(&mut b, &bytes));
        assert!((a.pos_x[0] - 1.0).abs() < 1e-6);
        assert!((a.timescale[0] - 0.5).abs() < 1e-6);
        assert_eq!(a.pos_y[0], b.pos_y[0]);
    }

    #[test]
    fn string_api_fail_closed() {
        let empty = QuantumSnapshotDna::serialize_universe_genomic_log_strings(
            1,
            vec!["spawn".into()],
        );
        assert!(empty.is_empty());
    }
}
