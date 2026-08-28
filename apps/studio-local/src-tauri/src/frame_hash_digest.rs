//! # GF-PARITY-3B2-001 — Engine-owned frame hash digest (engine-owned parity acceptance)
//!
//! Closes the honesty gap of the web `frame-parity-harness-3b2.ts` ingest: the harness
//! reads `desktopFrameHash` / `engineFrameHash` query params but, before this module, no
//! Rust command ever produced a real digest — the web side ran fail-open-measured because
//! the engine never generated the actual `contentHash`. This module is the engine-owned
//! producer: a deterministic SHA-256 (FIPS 180-4, NIST-vector-tested, pure Rust — zero
//! `Cargo.toml` churn) over **real measured frame scalars** taken from
//! [`PersistentPresentLiveMetrics`](crate::engine_owned_present_loop::PersistentPresentLiveMetrics).
//!
//! ## Anti-hallucination / anti-theater contract
//!
//! - `contentHash` is **empty** when the live snapshot is not evidence-worthy
//!   (fail-closed): `frames_presented == 0`, `loop_dropped`, or the secondary frame
//!   graph did not run to completion. The web ingest already fail-closes on empty /
//!   short / theater hashes, so an empty engine hash degrades to `HELD` — never to a
//!   fabricated win.
//! - `soak_wall_ms`, `note`, `critic_checklist` text are **excluded** from the digest
//!   (frame-content purity). `hash_duration_ms` and `captured_at` are audit metadata and
//!   also excluded, so identical measured metrics always yield the **same** `contentHash`.
//! - `scene_id` is the fixed non-theater tag `gf-parity-engine-owned-present` (does not
//!   match the web THEATER_RE theater pattern).
//! - Honesty flags are never invented: they mirror the `live_snapshot()` honesty
//!   defaults (`product_present_ready=false`, `webview_exclusive_present_ready=false`,
//!   `pp02_webview_carveout_held=true`) plus `fabricated_fps=false` — the engine never
//!   fabricates FPS; `soak_wall_ms` is wall-clock and every scalar is measured.
//!
//! ## IPC surface
//!
//! Exposes the single Tauri command `renderer_frame_hash_last` (Public, Gpu, non-hot-path:
//! SHA-256 compute is not a 60 Hz zero-copy SAB path). It reads the live snapshot from
//! [`PersistentPresentLoopState`](crate::engine_owned_present_loop::PersistentPresentLoopState)
//! managed in `main.rs`.

use std::sync::Arc;
use std::time::{Instant, SystemTime, UNIX_EPOCH};

use crate::engine_owned_present_loop::{PersistentPresentLiveMetrics, PersistentPresentLoopState};

/// Fixed non-theater scene id for GF-PARITY-3B2-001 (must not match the web THEATER_RE).
pub const PARITY_SCENE_ID: &str = "gf-parity-engine-owned-present";

/// Domain separator — any future format change MUST bump this to invalidate old digests.
pub const FRAME_HASH_DOMAIN: &str = "aethel-engine-frame-hash-v1";

/// Surface tag mirrored by the web ingest (`surface: 'desktop_present'`).
pub const SURFACE_DESKTOP_PRESENT: &str = "desktop_present";

/// SHA-256 round constants (FIPS 180-4 §4.2.2).
const SHA256_K: [u32; 64] = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

/// Pure Rust SHA-256 over the concatenation of `parts`. Deterministic, allocation-bounded,
/// NIST FIPS 180-4 verified in `mod tests`. Returns 64 lowercase hex chars.
pub fn sha256_hex(parts: &[&[u8]]) -> String {
    let mut data: Vec<u8> = Vec::with_capacity(64);
    for part in parts {
        data.extend_from_slice(part);
    }

    // Padding: 0x80, zero bytes until 56 mod 64, then big-endian u64 bit length.
    let msg_len_bits = (data.len() as u64).wrapping_mul(8);
    data.push(0x80);
    while data.len() % 64 != 56 {
        data.push(0x00);
    }
    data.extend_from_slice(&msg_len_bits.to_be_bytes());

    // Initial hash values (FIPS 180-4 §5.3.3): fractional parts of sqrt of first 8 primes.
    let mut h: [u32; 8] = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ];

    for chunk in data.chunks_exact(64) {
        let mut w = [0u32; 64];
        for (i, word) in w.iter_mut().take(16).enumerate() {
            *word = u32::from_be_bytes([
                chunk[i * 4],
                chunk[i * 4 + 1],
                chunk[i * 4 + 2],
                chunk[i * 4 + 3],
            ]);
        }
        for i in 16..64 {
            let s0 = w[i - 15].rotate_right(7) ^ w[i - 15].rotate_right(18) ^ (w[i - 15] >> 3);
            let s1 = w[i - 2].rotate_right(17) ^ w[i - 2].rotate_right(19) ^ (w[i - 2] >> 10);
            w[i] = w[i - 16]
                .wrapping_add(s0)
                .wrapping_add(w[i - 7])
                .wrapping_add(s1);
        }

        let [mut a, mut b, mut c, mut d, mut e, mut f, mut g, mut hh] = h;

        for i in 0..64 {
            let s1 = e.rotate_right(6) ^ e.rotate_right(11) ^ e.rotate_right(25);
            let ch = (e & f) ^ (!e & g);
            let temp1 = hh
                .wrapping_add(s1)
                .wrapping_add(ch)
                .wrapping_add(SHA256_K[i])
                .wrapping_add(w[i]);
            let s0 = a.rotate_right(2) ^ a.rotate_right(13) ^ a.rotate_right(22);
            let maj = (a & b) ^ (a & c) ^ (b & c);
            let temp2 = s0.wrapping_add(maj);

            hh = g;
            g = f;
            f = e;
            e = d.wrapping_add(temp1);
            d = c;
            c = b;
            b = a;
            a = temp1.wrapping_add(temp2);
        }

        h[0] = h[0].wrapping_add(a);
        h[1] = h[1].wrapping_add(b);
        h[2] = h[2].wrapping_add(c);
        h[3] = h[3].wrapping_add(d);
        h[4] = h[4].wrapping_add(e);
        h[5] = h[5].wrapping_add(f);
        h[6] = h[6].wrapping_add(g);
        h[7] = h[7].wrapping_add(hh);
    }

    h.iter().map(|v| format!("{v:08x}")).collect()
}

/// Engine-owned frame fingerprint — camelCase-matches the web
/// `EngineDesktopFrameFingerprintInput` contract (extra honesty fields are additive and
/// tolerated by the fail-closed web ingest, which only reads known keys).
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EngineFrameHashEvidence {
    /// 64 lowercase hex chars over measured scalars; **empty when fail-closed**.
    pub content_hash: String,
    pub width: u32,
    pub height: u32,
    /// Fixed non-theater tag `gf-parity-engine-owned-present`.
    pub scene_id: String,
    /// Last presented frame index (= `frames_presented`).
    pub frame_index: u32,
    /// First 16 hex of `content_hash`; empty when fail-closed.
    pub evidence_fingerprint: String,
    /// Wall-clock ms spent computing the digest (audit; excluded from `content_hash`).
    pub hash_duration_ms: f64,
    /// ISO-8601 UTC (`civil_from_days`); audit; excluded from `content_hash`.
    pub captured_at: String,
    /// Real measured presented-frame count (0 means the loop never presented).
    pub frames_presented: u32,
    /// True when `content_hash` was withheld (fail-closed evidence not met).
    pub fail_closed: bool,
    /// Empty when `!fail_closed`; one of the fail-closed reason tags otherwise.
    pub reason: String,
    /// Honesty: always false (Studio product viewport is still a WebView).
    pub product_present_ready: bool,
    /// Honesty: always false (PP-02 webview-exclusive carveout not shipped).
    pub webview_exclusive_present_ready: bool,
    /// Honesty: always true until PP-02 ships (mirrors `live_snapshot` default).
    pub pp02_webview_carveout_held: bool,
    /// Honesty: the engine never fabricates FPS — `soak_wall_ms` is wall-clock.
    pub fabricated_fps: bool,
    /// Mirrors the web ingest surface tag (`desktop_present`).
    pub surface: String,
    /// Measured loop health (true when a frame-graph pass dropped / present Err).
    pub loop_dropped: bool,
    pub persistent_loop_proven: bool,
    pub soak_60s_passed: bool,
}

/// Howard Hinnant `civil_from_days` — days since 1970-01-01 to `(year, month, day)`.
/// Verified: day 0 → (1970, 1, 1).
fn civil_from_days(z: i64) -> (i64, u32, u32) {
    let z = z + 719_468;
    let era = (if z >= 0 { z } else { z - 146_096 }) / 146_097;
    let doe = z - era * 146_097; // [0, 146096]
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365; // [0, 399]
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100); // [0, 365]
    let mp = (5 * doy + 2) / 153; // [0, 11]
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32; // [1, 31]
    let m = (if mp < 10 { mp + 3 } else { mp - 9 }) as u32; // [1, 12]
    let y = if m <= 2 { y + 1 } else { y };
    (y, m, d)
}

/// Unix epoch milliseconds → ISO-8601 UTC `YYYY-MM-DDTHH:MM:SS.mmmZ` (audit metadata).
fn unix_ms_to_iso8601(ms: u128) -> String {
    let total_secs = ms / 1000;
    let days = (total_secs / 86_400) as i64;
    let rem = total_secs % 86_400;
    let hh = rem / 3_600;
    let mm = (rem % 3_600) / 60;
    let ss = rem % 60;
    let millis = ms % 1_000;
    let (y, mo, d) = civil_from_days(days);
    format!("{y:04}-{mo:02}-{d:02}T{hh:02}:{mm:02}:{ss:02}.{millis:03}Z")
}

fn now_unix_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0)
}

/// Fail-closed gate: returns the reason tag when the live snapshot is not evidence-worthy.
/// A digest over a loop that never presented, dropped a frame, or ran an incomplete frame
/// graph would be theater — the engine withholds `content_hash` instead.
fn fail_closed_reason(m: &PersistentPresentLiveMetrics) -> Option<String> {
    if m.frames_presented == 0 {
        return Some("no_frames_presented".to_string());
    }
    if m.loop_dropped {
        return Some("loop_dropped".to_string());
    }
    let graph_complete = !m.frame_graph_pass_timings.is_empty()
        && m.frame_graph_pass_timings.iter().all(|p| p.completed);
    if !graph_complete {
        return Some("no_completed_frame_graph_passes".to_string());
    }
    None
}

/// Deterministic digest over **measured** frame scalars. IEEE-754 values are hashed via
/// their raw little-endian bit patterns (`to_bits`), guaranteeing identical metrics →
/// identical digest regardless of NaN/±0 edge encodings. Passes are hashed in their
/// recorded order with unit-separator field delimiters.
fn frame_hash_digest_hex(m: &PersistentPresentLiveMetrics) -> String {
    let mut buf: Vec<u8> = Vec::with_capacity(256);
    buf.extend_from_slice(FRAME_HASH_DOMAIN.as_bytes());
    buf.extend_from_slice(&m.frames_presented.to_le_bytes());
    buf.extend_from_slice(&m.present_width.to_le_bytes());
    buf.extend_from_slice(&m.present_height.to_le_bytes());
    buf.extend_from_slice(&m.capability_score.to_le_bytes());
    buf.extend_from_slice(&m.frame_ms_min.to_bits().to_le_bytes());
    buf.extend_from_slice(&m.frame_ms_mean.to_bits().to_le_bytes());
    buf.extend_from_slice(&m.frame_ms_max.to_bits().to_le_bytes());
    buf.extend_from_slice(&m.frame_ms_total.to_bits().to_le_bytes());
    buf.extend_from_slice(&m.frame_graph_ms_last.to_bits().to_le_bytes());
    buf.extend_from_slice(m.session_token.as_bytes());
    for pass in &m.frame_graph_pass_timings {
        buf.push(0xff); // pass separator
        buf.extend_from_slice(pass.pass_id.as_bytes());
        buf.push(0x1f); // field separator
        buf.extend_from_slice(&pass.order_index.to_le_bytes());
        buf.push(0x1f);
        buf.extend_from_slice(&pass.ms.to_bits().to_le_bytes());
        buf.push(0x1f);
        buf.push(if pass.completed { 1u8 } else { 0u8 });
    }
    sha256_hex(&[&buf])
}

/// Build the engine-owned frame hash evidence from a live snapshot.
///
/// Fail-closed: with no frames, a dropped loop, or an incomplete frame graph,
/// `content_hash`/`evidence_fingerprint` are empty and `fail_closed` is true — the web
/// harness degrades to `HELD` instead of recording a fabricated parity win.
pub fn frame_hash_from_live(
    m: &PersistentPresentLiveMetrics,
    captured_unix_ms: u128,
) -> EngineFrameHashEvidence {
    let started = Instant::now();
    let fail_reason = fail_closed_reason(m);
    let content_hash = match fail_reason {
        Some(_) => String::new(),
        None => frame_hash_digest_hex(m),
    };
    let hash_duration_ms = started.elapsed().as_secs_f64() * 1_000.0;
    let evidence_fingerprint = if content_hash.is_empty() {
        String::new()
    } else {
        content_hash.chars().take(16).collect()
    };
    let reason = fail_reason.unwrap_or_default();
    EngineFrameHashEvidence {
        content_hash,
        width: m.present_width,
        height: m.present_height,
        scene_id: PARITY_SCENE_ID.to_string(),
        frame_index: m.frames_presented,
        evidence_fingerprint,
        hash_duration_ms,
        captured_at: unix_ms_to_iso8601(captured_unix_ms),
        frames_presented: m.frames_presented,
        fail_closed: !reason.is_empty(),
        reason,
        product_present_ready: false,
        webview_exclusive_present_ready: false,
        pp02_webview_carveout_held: true,
        fabricated_fps: false,
        surface: SURFACE_DESKTOP_PRESENT.to_string(),
        loop_dropped: m.loop_dropped,
        persistent_loop_proven: m.persistent_loop_proven,
        soak_60s_passed: m.soak_60s_passed,
    }
}

/// Tauri command: last engine-owned frame hash evidence from the persistent present loop.
/// `hot_path=false` — SHA-256 digest compute is not a 60 Hz zero-copy SAB path.
#[tauri::command]
pub fn renderer_frame_hash_last(
    state: tauri::State<'_, Arc<PersistentPresentLoopState>>,
) -> EngineFrameHashEvidence {
    let snap = state.live_snapshot();
    frame_hash_from_live(&snap, now_unix_ms())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::engine_owned_present_loop::PersistentPresentLiveMetrics;
    use crate::gpu_frame_graph::FrameGraphPassTiming;

    /// A fully evidence-worthy synthetic live snapshot.
    fn sample_metrics() -> PersistentPresentLiveMetrics {
        PersistentPresentLiveMetrics {
            frames_presented: 240,
            present_width: 1920,
            present_height: 1080,
            capability_score: 64,
            frame_ms_min: 1.5,
            frame_ms_mean: 2.1,
            frame_ms_max: 4.0,
            frame_ms_total: 504.0,
            frame_graph_ms_last: 0.9,
            session_token: "soak-3b2-real".to_string(),
            frame_graph_pass_timings: vec![
                FrameGraphPassTiming {
                    pass_id: "meshlet_cull".to_string(),
                    order_index: 0,
                    ms: 0.10,
                    completed: true,
                },
                FrameGraphPassTiming {
                    pass_id: "radiance".to_string(),
                    order_index: 4,
                    ms: 0.22,
                    completed: true,
                },
                FrameGraphPassTiming {
                    pass_id: "present".to_string(),
                    order_index: 10,
                    ms: 0.08,
                    completed: true,
                },
            ],
            ..PersistentPresentLiveMetrics::default()
        }
    }

    #[test]
    fn sha256_nist_abc_vector() {
        let digest = sha256_hex(&[b"abc"]);
        assert_eq!(digest, "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
        assert_eq!(digest.len(), 64);
    }

    #[test]
    fn sha256_nist_empty_vector() {
        let digest = sha256_hex(&[]);
        assert_eq!(digest, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    }

    #[test]
    fn sha256_million_a_vector_is_stable_hex() {
        // FIPS 180-4 example: SHA-256 of 1,000,000 'a' chars.
        let million_a = "a".repeat(1_000_000);
        let digest = sha256_hex(&[million_a.as_bytes()]);
        assert_eq!(digest, "cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0");
    }

    #[test]
    fn hash_is_sha256_hex_and_scene_is_non_theater() {
        let evidence = frame_hash_from_live(&sample_metrics(), 1_771_000_000_000);
        assert_eq!(evidence.content_hash.len(), 64);
        assert!(evidence.content_hash.chars().all(|c| c.is_ascii_hexdigit()));
        // Scene id must NOT match the web THEATER_RE theater pattern.
        assert!(!evidence.scene_id.starts_with("mock"));
        assert!(!evidence.scene_id.contains("placeholder"));
        assert_eq!(evidence.scene_id, PARITY_SCENE_ID);
    }

    #[test]
    fn fail_closed_on_zero_frames() {
        let mut m = sample_metrics();
        m.frames_presented = 0;
        let evidence = frame_hash_from_live(&m, 1_771_000_000_000);
        assert!(evidence.fail_closed);
        assert_eq!(evidence.reason, "no_frames_presented");
        assert!(evidence.content_hash.is_empty());
        assert!(evidence.evidence_fingerprint.is_empty());
    }

    #[test]
    fn fail_closed_on_loop_dropped() {
        let mut m = sample_metrics();
        m.loop_dropped = true;
        let evidence = frame_hash_from_live(&m, 1_771_000_000_000);
        assert!(evidence.fail_closed);
        assert_eq!(evidence.reason, "loop_dropped");
        assert!(evidence.content_hash.is_empty());
    }

    #[test]
    fn fail_closed_when_frame_graph_not_complete() {
        // Empty pass list → incomplete frame graph.
        let mut m = sample_metrics();
        m.frame_graph_pass_timings = Vec::new();
        let evidence = frame_hash_from_live(&m, 1_771_000_000_000);
        assert!(evidence.fail_closed);
        assert_eq!(evidence.reason, "no_completed_frame_graph_passes");
        assert!(evidence.content_hash.is_empty());

        // One incomplete pass → still fail-closed (a partial graph is theater).
        let mut m2 = sample_metrics();
        m2.frame_graph_pass_timings[1].completed = false;
        let evidence2 = frame_hash_from_live(&m2, 1_771_000_000_000);
        assert!(evidence2.fail_closed);
        assert!(evidence2.content_hash.is_empty());
    }

    #[test]
    fn digest_changes_when_measured_metric_changes() {
        let base = frame_hash_from_live(&sample_metrics(), 1_771_000_000_000);
        let mut m = sample_metrics();
        m.frame_ms_mean = 2.9;
        let changed = frame_hash_from_live(&m, 1_771_000_000_000);
        assert_ne!(base.content_hash, changed.content_hash);
    }

    #[test]
    fn digest_binds_to_session_token() {
        let base = frame_hash_from_live(&sample_metrics(), 1_771_000_000_000);
        let mut m = sample_metrics();
        m.session_token = "other-session".to_string();
        let changed = frame_hash_from_live(&m, 1_771_000_000_000);
        assert_ne!(base.content_hash, changed.content_hash);
    }

    #[test]
    fn digest_deterministic_for_identical_metrics() {
        // Same measured metrics, different audit metadata → identical contentHash.
        let a = frame_hash_from_live(&sample_metrics(), 1_771_000_000_000);
        let b = frame_hash_from_live(&sample_metrics(), 1_771_000_999_999);
        assert_eq!(a.content_hash, b.content_hash);
        // Audit fields still differ (they are NOT part of the digest).
        assert_ne!(a.captured_at, b.captured_at);
    }

    #[test]
    fn honesty_flags_are_locked_fail_closed() {
        let evidence = frame_hash_from_live(&sample_metrics(), 1_771_000_000_000);
        assert!(!evidence.product_present_ready);
        assert!(!evidence.webview_exclusive_present_ready);
        assert!(evidence.pp02_webview_carveout_held);
        assert!(!evidence.fabricated_fps);
        assert_eq!(evidence.surface, SURFACE_DESKTOP_PRESENT);
        assert!(!evidence.fail_closed);
    }

    #[test]
    fn serde_json_emits_camel_case_contract_keys() {
        let evidence = frame_hash_from_live(&sample_metrics(), 1_771_000_000_000);
        let json = serde_json::to_value(&evidence).expect("serializable");
        let obj = json.as_object().expect("object");
        for key in [
            "contentHash",
            "sceneId",
            "evidenceFingerprint",
            "hashDurationMs",
            "capturedAt",
            "framesPresented",
            "productPresentReady",
            "webviewExclusivePresentReady",
            "pp02WebviewCarveoutHeld",
            "fabricatedFps",
            "surface",
            "loopDropped",
            "persistentLoopProven",
            "soak60sPassed",
        ] {
            assert!(obj.contains_key(key), "missing camelCase key {key}");
        }
        assert_eq!(obj["contentHash"], serde_json::json!(evidence.content_hash));
        assert_eq!(obj["sceneId"], serde_json::json!(PARITY_SCENE_ID));
        assert_eq!(obj["frameIndex"], serde_json::json!(evidence.frame_index));
    }

    #[test]
    fn epoch_ms_converts_to_expected_iso8601() {
        // 1970-01-01T00:00:00.000Z — epoch day 0.
        assert_eq!(unix_ms_to_iso8601(0), "1970-01-01T00:00:00.000Z");
        // 2020-01-01T00:00:00Z — well-known Unix timestamp (18_262 days from epoch).
        assert_eq!(unix_ms_to_iso8601(1_577_836_800_000), "2020-01-01T00:00:00.000Z");
        // 2026-08-19T00:00:00Z — 20_684 days from epoch (validated against
        // civil_from_days day count and the failing probe at day 20_672 = 2026-08-07).
        assert_eq!(unix_ms_to_iso8601(1_787_097_600_000), "2026-08-19T00:00:00.000Z");
        // Sub-second precision preserved.
        assert_eq!(unix_ms_to_iso8601(1_787_097_600_123), "2026-08-19T00:00:00.123Z");
    }
}
