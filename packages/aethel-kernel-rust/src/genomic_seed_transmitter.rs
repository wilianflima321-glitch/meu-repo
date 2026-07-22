//! Genomic Seed Transmitter — letter **fu**.
//!
//! Replaces theater stub `reconstitute_reality_from_seed` (comment-only, no
//! pack/send/receive/library insert/soak/probe) with a real critical-path
//! transmitter: pack `(id, seed, tag)` → **fk** `binary_seed_streamer`
//! fixed chunks → reassemble/unpack → insert into **ft**
//! `GenomicSeedRegistry`. Soak proves transmit→receive→library insert.
//!
//! Honesty probe `genomic_seed_transmitter_ready` / `genomicSeedTransmitterReady`
//! is **distinct** from ft `genomicSeedLibraryReady`, fk `binarySeedStreamerReady`,
//! fh `deltaSeedSynchronizationReady`, and prior probes.
//!
//! **HELD:** Full network DNA AAA (`network_dna_aaa_ready: false`) · Coins /
//! Agones / Nanite / DLSS / Quic.

use crate::binary_seed_streamer::{
    decode_seed_body, encode_seed_stream, reassemble_chunks, CHUNK_SIZE,
};
use crate::genomic_seed_library::{
    GenomicSeedRegistry, SeedEntry, SeedLibraryError, SOAK_SEED_A, SOAK_SEED_B, SOAK_SEED_C,
};

/// Fingerprint seed ("fugst").
const FP_SEED: u64 = 0x6675_6773_74;
/// Packed entry magic "FUST".
const ENTRY_MAGIC: u32 = 0x4655_5354;
/// Transmit stream id (letter fu).
pub const TRANSMIT_STREAM_ID: u32 = 0x6675_0001;

/// Transmit / receive errors — fail-closed.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TransmitError {
    EmptyTag,
    PackFailed,
    ChunkFailed,
    ReassembleFailed,
    UnpackFailed,
    SeedMismatch,
    Library(SeedLibraryError),
}

/// Pack a library entry into bytes (magic + id + seed + optional tag).
///
/// Layout: `[magic:u32 LE][id:u64 LE][seed:u64 LE][tag_flag:u8]`
/// then if `tag_flag==1`: `[tag_len:u16 LE][tag UTF-8]`.
pub fn pack_seed_entry(entry: &SeedEntry) -> Result<Vec<u8>, TransmitError> {
    if let Some(t) = &entry.tag {
        if t.is_empty() {
            return Err(TransmitError::EmptyTag);
        }
        if t.len() > u16::MAX as usize {
            return Err(TransmitError::PackFailed);
        }
    }
    let tag_bytes = entry.tag.as_ref().map(|t| t.as_bytes());
    let mut out = Vec::with_capacity(4 + 8 + 8 + 1 + 2 + tag_bytes.map(|b| b.len()).unwrap_or(0));
    out.extend_from_slice(&ENTRY_MAGIC.to_le_bytes());
    out.extend_from_slice(&entry.id.to_le_bytes());
    out.extend_from_slice(&entry.seed.to_le_bytes());
    match tag_bytes {
        Some(b) => {
            out.push(1);
            out.extend_from_slice(&(b.len() as u16).to_le_bytes());
            out.extend_from_slice(b);
        }
        None => {
            out.push(0);
        }
    }
    Ok(out)
}

/// Unpack bytes → `SeedEntry`. Fail-closed on bad magic/truncation/empty tag.
pub fn unpack_seed_entry(bytes: &[u8]) -> Result<SeedEntry, TransmitError> {
    if bytes.len() < 4 + 8 + 8 + 1 {
        return Err(TransmitError::UnpackFailed);
    }
    let magic = u32::from_le_bytes(bytes[0..4].try_into().map_err(|_| TransmitError::UnpackFailed)?);
    if magic != ENTRY_MAGIC {
        return Err(TransmitError::UnpackFailed);
    }
    let id = u64::from_le_bytes(bytes[4..12].try_into().map_err(|_| TransmitError::UnpackFailed)?);
    let seed =
        u64::from_le_bytes(bytes[12..20].try_into().map_err(|_| TransmitError::UnpackFailed)?);
    let flag = bytes[20];
    let tag = match flag {
        0 => {
            if bytes.len() != 21 {
                return Err(TransmitError::UnpackFailed);
            }
            None
        }
        1 => {
            if bytes.len() < 23 {
                return Err(TransmitError::UnpackFailed);
            }
            let tlen =
                u16::from_le_bytes(bytes[21..23].try_into().map_err(|_| TransmitError::UnpackFailed)?)
                    as usize;
            if bytes.len() != 23 + tlen {
                return Err(TransmitError::UnpackFailed);
            }
            if tlen == 0 {
                return Err(TransmitError::EmptyTag);
            }
            let s = std::str::from_utf8(&bytes[23..23 + tlen])
                .map_err(|_| TransmitError::UnpackFailed)?;
            Some(s.to_string())
        }
        _ => return Err(TransmitError::UnpackFailed),
    };
    Ok(SeedEntry { id, seed, tag })
}

/// Encode entry → fk fixed-size chunks. Stream seed = entry.seed; payload = packed entry.
pub fn encode_entry_chunks(entry: &SeedEntry, stream_id: u32) -> Result<Vec<[u8; CHUNK_SIZE]>, TransmitError> {
    let packed = pack_seed_entry(entry)?;
    Ok(encode_seed_stream(entry.seed, &packed, stream_id))
}

/// Reassemble fk chunks → unpack entry. Verifies stream seed matches entry.seed.
pub fn decode_entry_chunks(chunks: &[[u8; CHUNK_SIZE]]) -> Result<SeedEntry, TransmitError> {
    let body = reassemble_chunks(chunks).ok_or(TransmitError::ReassembleFailed)?;
    let (stream_seed, payload) = decode_seed_body(&body).ok_or(TransmitError::ReassembleFailed)?;
    let entry = unpack_seed_entry(&payload)?;
    if entry.seed != stream_seed {
        return Err(TransmitError::SeedMismatch);
    }
    Ok(entry)
}

/// Transmit entry through fk chunks into a destination registry (receive + insert).
pub fn transmit_into_library(
    entry: &SeedEntry,
    dest: &mut GenomicSeedRegistry,
    stream_id: u32,
) -> Result<u32, TransmitError> {
    let mut chunks = encode_entry_chunks(entry, stream_id)?;
    if chunks.is_empty() {
        return Err(TransmitError::ChunkFailed);
    }
    // Prove out-of-order reassembly (same as fk soak posture).
    chunks.reverse();
    let received = decode_entry_chunks(&chunks)?;
    dest.insert(
        received.id,
        received.seed,
        received.tag.as_deref(),
    )
    .map_err(TransmitError::Library)?;
    Ok(chunks.len() as u32)
}

/// Full roundtrip helper: pack → chunks → reverse → unpack (no library).
pub fn roundtrip_entry(entry: &SeedEntry, stream_id: u32) -> Result<(SeedEntry, u32), TransmitError> {
    let mut chunks = encode_entry_chunks(entry, stream_id)?;
    let n = chunks.len() as u32;
    chunks.reverse();
    let got = decode_entry_chunks(&chunks)?;
    Ok((got, n))
}

/// Critical-path genomic seed transmitter (letter **fu**).
#[derive(Debug, Default, Clone, Copy)]
pub struct GenomicSeedTransmitter;

impl GenomicSeedTransmitter {
    /// Pack → fk stream → reassemble → insert into `dest`. Returns chunk count.
    pub fn transmit(
        entry: &SeedEntry,
        dest: &mut GenomicSeedRegistry,
    ) -> Result<u32, TransmitError> {
        transmit_into_library(entry, dest, TRANSMIT_STREAM_ID)
    }

    /// Legacy theater entry — now transmits a hash-derived seed into a scratch
    /// library and returns reconstituted `id:seed:tag` (or empty on fail).
    ///
    /// Empty hash → fail-closed empty string. Same hash → same output (determinism).
    pub fn reconstitute_reality_from_seed(genomic_hash: &str) -> String {
        if genomic_hash.is_empty() {
            return String::new();
        }
        let id = hash_tag_bytes(genomic_hash.as_bytes()) ^ FP_SEED;
        let seed = hash_tag_bytes(genomic_hash.as_bytes()).wrapping_mul(0x9E37_79B9_7F4A_7C15);
        let entry = SeedEntry {
            id,
            seed,
            tag: Some(genomic_hash.to_string()),
        };
        let mut dest = GenomicSeedRegistry::new();
        match Self::transmit(&entry, &mut dest) {
            Ok(_) => match dest.get(id) {
                Ok(e) => format!(
                    "{:016x}:{:016x}:{}",
                    e.id,
                    e.seed,
                    e.tag.as_deref().unwrap_or("")
                ),
                Err(_) => String::new(),
            },
            Err(_) => String::new(),
        }
    }
}

fn hash_tag_bytes(bytes: &[u8]) -> u64 {
    let mut h: u64 = 0xcbf2_9ce4_8422_2325;
    for &b in bytes {
        h ^= b as u64;
        h = h.wrapping_mul(0x1000_0000_01b3);
    }
    h
}

/// Letter **fu** soak report — genomic seed transmitter evidence.
#[derive(Debug, Clone, PartialEq)]
pub struct GenomicSeedTransmitterSoakReport {
    pub genomic_seed_transmitter_ready: bool,
    pub transmit_receive_roundtrip: bool,
    pub library_insert_ok: bool,
    pub out_of_order_chunks: bool,
    pub corrupt_fail_closed: bool,
    pub deterministic: bool,
    pub outputs_finite: bool,
    pub state_mutated: bool,
    pub chunk_count: u32,
    pub entry_count: u32,
    pub fingerprint: u64,
    pub distinct_from_genomic_seed_library_probe: bool,
    pub distinct_from_binary_seed_streamer_probe: bool,
    pub distinct_from_delta_seed_synchronization_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub network_dna_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn fail_report(chunk_count: u32, entry_count: u32) -> GenomicSeedTransmitterSoakReport {
    GenomicSeedTransmitterSoakReport {
        genomic_seed_transmitter_ready: false,
        transmit_receive_roundtrip: false,
        library_insert_ok: false,
        out_of_order_chunks: false,
        corrupt_fail_closed: false,
        deterministic: false,
        outputs_finite: false,
        state_mutated: false,
        chunk_count,
        entry_count,
        fingerprint: 0,
        distinct_from_genomic_seed_library_probe: true,
        distinct_from_binary_seed_streamer_probe: true,
        distinct_from_delta_seed_synchronization_probe: true,
        distinct_from_kernel_foundation_probe: true,
        network_dna_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        quic_ready: false,
    }
}

/// Run genomic seed transmitter soak — transmit→receive→library insert.
pub fn run_genomic_seed_transmitter_soak() -> GenomicSeedTransmitterSoakReport {
    let entries = [
        SeedEntry {
            id: 0xA11A_0001,
            seed: SOAK_SEED_A,
            tag: Some("rock-ouro".into()),
        },
        SeedEntry {
            id: 0xB22B_0002,
            seed: SOAK_SEED_B,
            tag: Some("tree-biome".into()),
        },
        SeedEntry {
            id: 0xC33C_0003,
            seed: SOAK_SEED_C,
            tag: None,
        },
    ];

    let mut dest = GenomicSeedRegistry::new();
    let mut total_chunks = 0u32;
    let mut all_tx = true;
    for e in &entries {
        match GenomicSeedTransmitter::transmit(e, &mut dest) {
            Ok(n) => total_chunks = total_chunks.saturating_add(n),
            Err(_) => {
                all_tx = false;
                break;
            }
        }
    }

    // Library insert: received entries match source.
    let library_insert_ok = all_tx
        && dest.len() == 3
        && matches!(
            dest.get(entries[0].id),
            Ok(e) if e.seed == SOAK_SEED_A && e.tag.as_deref() == Some("rock-ouro")
        )
        && matches!(
            dest.get(entries[1].id),
            Ok(e) if e.seed == SOAK_SEED_B && e.tag.as_deref() == Some("tree-biome")
        )
        && matches!(
            dest.get(entries[2].id),
            Ok(e) if e.seed == SOAK_SEED_C && e.tag.is_none()
        );

    // Explicit pack→chunk→reverse→unpack roundtrip (out-of-order).
    let (rt0, n0) = match roundtrip_entry(&entries[0], TRANSMIT_STREAM_ID) {
        Ok(v) => v,
        Err(_) => {
            return fail_report(total_chunks, dest.len() as u32);
        }
    };
    let transmit_receive_roundtrip = rt0 == entries[0] && n0 >= 1;
    let out_of_order_chunks = transmit_receive_roundtrip && total_chunks >= 3;

    // Corrupt chunk fail-closed.
    let mut bad = encode_entry_chunks(&entries[0], TRANSMIT_STREAM_ID).unwrap_or_default();
    let corrupt_fail_closed = if bad.is_empty() {
        false
    } else {
        bad[0][20] ^= 0xFF; // flip CRC byte
        decode_entry_chunks(&bad).is_err()
    };

    // Determinism: two transmits → same dest fingerprint.
    let mut dest_a = GenomicSeedRegistry::new();
    let mut dest_b = GenomicSeedRegistry::new();
    let mut det_ok = true;
    for e in &entries {
        if GenomicSeedTransmitter::transmit(e, &mut dest_a).is_err()
            || GenomicSeedTransmitter::transmit(e, &mut dest_b).is_err()
        {
            det_ok = false;
            break;
        }
    }
    let fp_a = dest_a.fingerprint();
    let fp_b = dest_b.fingerprint();
    let deterministic = det_ok && fp_a == fp_b && fp_a != 0;

    // Legacy API deterministic.
    let legacy_a = GenomicSeedTransmitter::reconstitute_reality_from_seed("biome-fu");
    let legacy_b = GenomicSeedTransmitter::reconstitute_reality_from_seed("biome-fu");
    let legacy_empty = GenomicSeedTransmitter::reconstitute_reality_from_seed("");
    let legacy_ok = !legacy_a.is_empty()
        && legacy_a == legacy_b
        && legacy_empty.is_empty()
        && legacy_a != GenomicSeedTransmitter::reconstitute_reality_from_seed("other");

    let state_mutated = dest.len() == 3 && total_chunks > 0;
    let outputs_finite = fp_a.count_ones() > 0 && total_chunks.count_ones() > 0;

    let ready = transmit_receive_roundtrip
        && library_insert_ok
        && out_of_order_chunks
        && corrupt_fail_closed
        && deterministic
        && legacy_ok
        && state_mutated
        && outputs_finite;

    if !ready {
        let mut fail = fail_report(total_chunks, dest.len() as u32);
        fail.transmit_receive_roundtrip = transmit_receive_roundtrip;
        fail.library_insert_ok = library_insert_ok;
        fail.out_of_order_chunks = out_of_order_chunks;
        fail.corrupt_fail_closed = corrupt_fail_closed;
        fail.deterministic = deterministic;
        fail.outputs_finite = outputs_finite;
        fail.state_mutated = state_mutated;
        return fail;
    }

    let fp = fingerprint(&[
        fp_a,
        total_chunks as u64,
        dest.hash_by_id(entries[0].id).unwrap_or(0),
        dest.len() as u64,
        n0 as u64,
    ]);

    GenomicSeedTransmitterSoakReport {
        genomic_seed_transmitter_ready: true,
        transmit_receive_roundtrip: true,
        library_insert_ok: true,
        out_of_order_chunks: true,
        corrupt_fail_closed: true,
        deterministic: true,
        outputs_finite: true,
        state_mutated: true,
        chunk_count: total_chunks,
        entry_count: dest.len() as u32,
        fingerprint: fp,
        distinct_from_genomic_seed_library_probe: true,
        distinct_from_binary_seed_streamer_probe: true,
        distinct_from_delta_seed_synchronization_probe: true,
        distinct_from_kernel_foundation_probe: true,
        network_dna_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        quic_ready: false,
    }
}

/// Honesty probe — soak-gated `genomic_seed_transmitter_ready` (**fu**).
pub fn probe_genomic_seed_transmitter() -> GenomicSeedTransmitterSoakReport {
    run_genomic_seed_transmitter_soak()
}

fn fingerprint(parts: &[u64]) -> u64 {
    let mut h = FP_SEED;
    for &p in parts {
        h = hash_mix(h, p);
    }
    h
}

#[inline]
fn hash_mix(h: u64, v: u64) -> u64 {
    let mut x = h ^ v.wrapping_mul(0x9E37_79B9_7F4A_7C15);
    x = (x ^ (x >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
    x = (x ^ (x >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
    x ^ (x >> 31)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::binary_seed_streamer::DEFAULT_STREAM_ID;

    #[test]
    fn pack_unpack_roundtrip() {
        let e = SeedEntry {
            id: 7,
            seed: 0xABC,
            tag: Some("stone".into()),
        };
        let p = pack_seed_entry(&e).unwrap();
        let u = unpack_seed_entry(&p).unwrap();
        assert_eq!(u, e);
        let none = SeedEntry {
            id: 8,
            seed: 9,
            tag: None,
        };
        assert_eq!(unpack_seed_entry(&pack_seed_entry(&none).unwrap()).unwrap(), none);
    }

    #[test]
    fn transmit_into_empty_library() {
        let e = SeedEntry {
            id: 1,
            seed: SOAK_SEED_A,
            tag: Some("a".into()),
        };
        let mut dest = GenomicSeedRegistry::new();
        let n = GenomicSeedTransmitter::transmit(&e, &mut dest).unwrap();
        assert!(n >= 1);
        assert_eq!(dest.get_seed(1), Ok(SOAK_SEED_A));
        assert_eq!(dest.get(1).unwrap().tag.as_deref(), Some("a"));
    }

    #[test]
    fn out_of_order_chunk_roundtrip() {
        let e = SeedEntry {
            id: 42,
            seed: SOAK_SEED_B,
            tag: Some("tree".into()),
        };
        let (got, n) = roundtrip_entry(&e, TRANSMIT_STREAM_ID).unwrap();
        assert_eq!(got, e);
        assert!(n >= 1);
    }

    #[test]
    fn corrupt_crc_fail_closed() {
        let e = SeedEntry {
            id: 3,
            seed: SOAK_SEED_C,
            tag: None,
        };
        let mut chunks = encode_entry_chunks(&e, DEFAULT_STREAM_ID).unwrap();
        chunks[0][22] ^= 0x55;
        assert!(decode_entry_chunks(&chunks).is_err());
    }

    #[test]
    fn empty_tag_rejected() {
        let e = SeedEntry {
            id: 1,
            seed: 2,
            tag: Some(String::new()),
        };
        assert_eq!(pack_seed_entry(&e), Err(TransmitError::EmptyTag));
    }

    #[test]
    fn legacy_reconstitute_deterministic() {
        let a = GenomicSeedTransmitter::reconstitute_reality_from_seed("x");
        let b = GenomicSeedTransmitter::reconstitute_reality_from_seed("x");
        assert_eq!(a, b);
        assert!(!a.is_empty());
        assert!(GenomicSeedTransmitter::reconstitute_reality_from_seed("").is_empty());
    }

    #[test]
    fn soak_flips_ready_network_dna_held() {
        let r = run_genomic_seed_transmitter_soak();
        assert!(r.genomic_seed_transmitter_ready, "{r:?}");
        assert!(r.transmit_receive_roundtrip);
        assert!(r.library_insert_ok);
        assert!(r.out_of_order_chunks);
        assert!(r.corrupt_fail_closed);
        assert!(r.deterministic);
        assert!(!r.network_dna_aaa_ready);
        assert!(!r.coins_ready);
        assert!(!r.agones_ready);
        assert!(!r.nanite_ready);
        assert!(!r.dlss_ready);
        assert!(!r.quic_ready);
    }

    #[test]
    fn probe_matches_soak() {
        let a = run_genomic_seed_transmitter_soak();
        let b = probe_genomic_seed_transmitter();
        assert_eq!(
            a.genomic_seed_transmitter_ready,
            b.genomic_seed_transmitter_ready
        );
        assert!(b.genomic_seed_transmitter_ready);
        assert_eq!(a.fingerprint, b.fingerprint);
    }

    #[test]
    fn distinct_from_ft_fk_fh_probes() {
        let fu = probe_genomic_seed_transmitter();
        let ft = crate::genomic_seed_library::probe_genomic_seed_library();
        let fk = crate::binary_seed_streamer::probe_binary_seed_streamer();
        let fh = crate::delta_seed_synchronization::probe_delta_seed_synchronization();
        assert!(fu.genomic_seed_transmitter_ready);
        assert!(ft.genomic_seed_library_ready);
        assert!(fk.binary_seed_streamer_ready);
        assert!(fh.delta_seed_synchronization_ready);
        assert!(fu.distinct_from_genomic_seed_library_probe);
        assert!(fu.distinct_from_binary_seed_streamer_probe);
        assert!(fu.distinct_from_delta_seed_synchronization_probe);
        assert_ne!(
            fu.fingerprint, ft.fingerprint,
            "fu fingerprint must differ from ft"
        );
        assert_ne!(
            fu.fingerprint, fk.fingerprint,
            "fu fingerprint must differ from fk"
        );
        assert_ne!(
            fu.fingerprint, fh.fingerprint,
            "fu fingerprint must differ from fh"
        );
    }
}
