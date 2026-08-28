//! PP-02-era input contract — MPSC command channel from the UI layer into the
//! render substrates (VSM page budget / radiance intensity / entropy impulse
//! radius). Low-frequency user commands flow through `std::sync::mpsc`
//! (multi-producer, single-consumer); the render thread drains with
//! `try_recv` — never blocking the tick loop — and publishes into lock-free
//! atomics the substrates read at their own cadence. This is the documented
//! backend contract the WebView overlay will use when PP-02 lands; it carries
//! NO UI today.
//!
//! Fail-closed: unknown command kinds and out-of-range values are rejected,
//! never silently applied.

use std::sync::atomic::{AtomicU32, AtomicU64, Ordering};
use std::sync::mpsc::{self, Receiver, Sender};
use std::sync::{Arc, Mutex, OnceLock};

/// Command kinds accepted from the UI layer.
pub const PRESENT_COMMAND_KINDS: [&str; 4] = [
    "vsm_page_budget",
    "radiance_intensity",
    "entropy_impulse_radius",
    "audio_impact_strength",
];

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum PresentCommand {
    VsmPageBudget(u32),
    RadianceIntensity(f32),
    EntropyImpulseRadius(f32),
    /// Audio→render cue (sound-physics kb events): 0..=1 impact strength that
    /// drives the visible shake in the upscale — the cinematic link between
    /// the audio pillar and the render pillar.
    AudioImpactStrength(f32),
}

/// Lock-free parameter publication (bit-cast f32 into AtomicU32).
#[derive(Debug, Default)]
pub struct PresentCommandParams {
    pub vsm_page_budget: AtomicU32,
    pub radiance_intensity_bits: AtomicU32,
    pub entropy_impulse_radius_bits: AtomicU32,
    pub audio_impact_strength_bits: AtomicU32,
}

impl PresentCommandParams {
    pub fn radiance_intensity(&self) -> f32 {
        f32::from_bits(self.radiance_intensity_bits.load(Ordering::Relaxed))
    }

    pub fn entropy_impulse_radius(&self) -> f32 {
        f32::from_bits(self.entropy_impulse_radius_bits.load(Ordering::Relaxed))
    }

    pub fn audio_impact_strength(&self) -> f32 {
        f32::from_bits(self.audio_impact_strength_bits.load(Ordering::Relaxed))
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum PresentCommandApply {
    Applied,
    Rejected(&'static str),
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct PresentCommandChannelReport {
    pub queued: u64,
    pub applied: u64,
    pub rejected: u64,
    pub last_kind: String,
    pub vsm_page_budget: u32,
    pub radiance_intensity: f32,
    pub entropy_impulse_radius: f32,
    pub audio_impact_strength: f32,
    pub kinds: Vec<&'static str>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct PresentCommandSendResult {
    pub ok: bool,
    pub queued: u64,
    pub reason: String,
}

pub struct PresentCommandChannel {
    tx: Sender<PresentCommand>,
    rx: Mutex<Receiver<PresentCommand>>,
    params: Arc<PresentCommandParams>,
    queued: Arc<AtomicU64>,
    applied: Arc<AtomicU64>,
    rejected: Arc<AtomicU64>,
    last_kind: Arc<Mutex<String>>,
}

impl Default for PresentCommandChannel {
    fn default() -> Self {
        Self::new()
    }
}

impl PresentCommandChannel {
    pub fn new() -> Self {
        let (tx, rx) = mpsc::channel::<PresentCommand>();
        Self {
            tx,
            rx: Mutex::new(rx),
            params: Arc::new(PresentCommandParams {
                vsm_page_budget: AtomicU32::new(256),
                radiance_intensity_bits: AtomicU32::new(2.0f32.to_bits()),
                entropy_impulse_radius_bits: AtomicU32::new(2.5f32.to_bits()),
                audio_impact_strength_bits: AtomicU32::new(0.0f32.to_bits()),
            }),
            queued: Arc::new(AtomicU64::new(0)),
            applied: Arc::new(AtomicU64::new(0)),
            rejected: Arc::new(AtomicU64::new(0)),
            last_kind: Arc::new(Mutex::new(String::new())),
        }
    }

    /// Non-blocking producer side (UI/any thread).
    pub fn send_command(&self, command: PresentCommand) -> u64 {
        let _ = self.tx.send(command);
        self.queued.fetch_add(1, Ordering::Relaxed) + 1
    }

    /// Render-thread drain: `try_recv` (never blocks), applies valid commands
    /// to the lock-free params, rejects invalid ones. Returns applied commands.
    pub fn drain_pending(&self) -> Vec<(PresentCommand, PresentCommandApply)> {
        let mut out = Vec::new();
        loop {
            let next = match self.rx.lock() {
                Ok(rx) => rx.try_recv(),
                Err(_) => break,
            };
            let command = match next {
                Ok(command) => command,
                Err(mpsc::TryRecvError::Empty | mpsc::TryRecvError::Disconnected) => break,
            };
            let apply = self.apply_to_params(&command);
            match apply {
                PresentCommandApply::Applied => {
                    self.applied.fetch_add(1, Ordering::Relaxed);
                }
                PresentCommandApply::Rejected(_) => {
                    self.rejected.fetch_add(1, Ordering::Relaxed);
                }
            }
            if let Ok(mut last) = self.last_kind.lock() {
                *last = match command {
                    PresentCommand::VsmPageBudget(_) => "vsm_page_budget",
                    PresentCommand::RadianceIntensity(_) => "radiance_intensity",
                    PresentCommand::EntropyImpulseRadius(_) => "entropy_impulse_radius",
                    PresentCommand::AudioImpactStrength(_) => "audio_impact_strength",
                }
                .into();
            }
            out.push((command, apply));
        }
        out
    }

    fn apply_to_params(&self, command: &PresentCommand) -> PresentCommandApply {
        match command {
            PresentCommand::VsmPageBudget(pages) => {
                if !(16..=256).contains(pages) {
                    return PresentCommandApply::Rejected("vsm_page_budget out of range [16, 256]");
                }
                self.params.vsm_page_budget.store(*pages, Ordering::Relaxed);
                PresentCommandApply::Applied
            }
            PresentCommand::RadianceIntensity(intensity) => {
                if !(0.1..=10.0).contains(intensity) || !intensity.is_finite() {
                    return PresentCommandApply::Rejected("radiance_intensity out of range [0.1, 10.0]");
                }
                self.params
                    .radiance_intensity_bits
                    .store(intensity.to_bits(), Ordering::Relaxed);
                PresentCommandApply::Applied
            }
            PresentCommand::EntropyImpulseRadius(radius) => {
                if !(0.5..=8.0).contains(radius) || !radius.is_finite() {
                    return PresentCommandApply::Rejected("entropy_impulse_radius out of range [0.5, 8.0]");
                }
                self.params
                    .entropy_impulse_radius_bits
                    .store(radius.to_bits(), Ordering::Relaxed);
                PresentCommandApply::Applied
            }
            PresentCommand::AudioImpactStrength(strength) => {
                if !(0.0..=1.0).contains(strength) || !strength.is_finite() {
                    return PresentCommandApply::Rejected("audio_impact_strength out of range [0.0, 1.0]");
                }
                self.params
                    .audio_impact_strength_bits
                    .store(strength.to_bits(), Ordering::Relaxed);
                PresentCommandApply::Applied
            }
        }
    }

    /// Raw params access for substrate wiring (documented read surface).
    pub fn params(&self) -> &Arc<PresentCommandParams> {
        &self.params
    }

    /// Render-thread read surface: substrates consume the lock-free params at
    /// their own cadence (wired when PP-02 lands).
    #[allow(dead_code)]
    pub fn snapshot_params(&self) -> (u32, f32, f32) {
        (
            self.params.vsm_page_budget.load(Ordering::Relaxed),
            self.params.radiance_intensity(),
            self.params.entropy_impulse_radius(),
        )
    }

    pub fn report(&self) -> PresentCommandChannelReport {
        PresentCommandChannelReport {
            queued: self.queued.load(Ordering::Relaxed),
            applied: self.applied.load(Ordering::Relaxed),
            rejected: self.rejected.load(Ordering::Relaxed),
            last_kind: self.last_kind.lock().map(|k| k.clone()).unwrap_or_default(),
            vsm_page_budget: self.params.vsm_page_budget.load(Ordering::Relaxed),
            radiance_intensity: self.params.radiance_intensity(),
            entropy_impulse_radius: self.params.entropy_impulse_radius(),
            audio_impact_strength: self.params.audio_impact_strength(),
            kinds: PRESENT_COMMAND_KINDS.to_vec(),
        }
    }
}

fn global_channel() -> &'static PresentCommandChannel {
    static CHANNEL: OnceLock<PresentCommandChannel> = OnceLock::new();
    CHANNEL.get_or_init(PresentCommandChannel::new)
}

/// Render-thread drain: applies every pending command to the lock-free params
/// without ever blocking (try_recv semantics). Returns the applied count.
pub fn drain_global_pending() -> u64 {
    global_channel().drain_pending().len() as u64
}

/// Lock-free snapshot for the render loop: (vsm page budget, radiance
/// intensity, entropy impulse strength).
pub fn snapshot_params() -> (u32, f32, f32) {
    let p = global_channel().params();
    (
        p.vsm_page_budget.load(Ordering::Relaxed),
        p.radiance_intensity(),
        p.entropy_impulse_radius(),
    )
}

/// Audio→render cue strength (sound-physics kb events → visible shake).
pub fn audio_impact_strength() -> f32 {
    global_channel().params().audio_impact_strength()
}

/// UI-layer send entry point (Public/Gpu, non-hot-path). Kind + value are
/// validated fail-closed; the render thread applies on its next drain.
#[tauri::command]
pub fn present_command_send_cmd(kind: String, value: f64) -> PresentCommandSendResult {
    let command = match kind.as_str() {
        "vsm_page_budget" => PresentCommand::VsmPageBudget(value as u32),
        "radiance_intensity" => PresentCommand::RadianceIntensity(value as f32),
        "entropy_impulse_radius" => PresentCommand::EntropyImpulseRadius(value as f32),
        "audio_impact_strength" => PresentCommand::AudioImpactStrength(value as f32),
        other => {
            return PresentCommandSendResult {
                ok: false,
                queued: 0,
                reason: format!("unknown kind '{other}' — accepted: {PRESENT_COMMAND_KINDS:?}"),
            }
        }
    };
    let queued = global_channel().send_command(command);
    PresentCommandSendResult {
        ok: true,
        queued,
        reason: "queued; render thread applies on next drain".into(),
    }
}

#[tauri::command]
pub fn probe_present_command_channel_cmd() -> PresentCommandChannelReport {
    global_channel().report()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mpsc_multi_producer_drains_without_blocking() {
        let channel = PresentCommandChannel::new();
        let mut handles = Vec::new();
        for producer in 0..4 {
            let sender = channel.tx.clone();
            let queued = channel.queued.clone();
            handles.push(std::thread::spawn(move || {
                for i in 0..100u32 {
                    let cmd = if producer % 2 == 0 {
                        PresentCommand::VsmPageBudget(32 + i % 64)
                    } else {
                        PresentCommand::RadianceIntensity(1.0 + i as f32 * 0.01)
                    };
                    sender.send(cmd).expect("channel open");
                    queued.fetch_add(1, Ordering::Relaxed);
                }
            }));
        }
        for handle in handles {
            handle.join().expect("producer thread");
        }
        // Drain never blocks: two drains consume all 400, a third returns
        // immediately even when empty (try_recv semantics, no waiting).
        let first = channel.drain_pending();
        let second = channel.drain_pending();
        assert!(first.len() + second.len() == 400, "all 400 commands must be applied exactly once");
        assert!(channel.drain_pending().is_empty(), "drain on empty channel must return immediately");
        assert_eq!(channel.applied.load(Ordering::Relaxed), 400);
        assert_eq!(channel.rejected.load(Ordering::Relaxed), 0);
    }

    #[test]
    fn invalid_values_are_rejected_fail_closed() {
        let channel = PresentCommandChannel::new();
        channel.send_command(PresentCommand::VsmPageBudget(4));
        channel.send_command(PresentCommand::RadianceIntensity(f32::NAN));
        channel.send_command(PresentCommand::EntropyImpulseRadius(99.0));
        let drained = channel.drain_pending();
        assert_eq!(drained.len(), 3);
        assert!(drained.iter().all(|(_, a)| matches!(a, PresentCommandApply::Rejected(_))));
        assert_eq!(channel.rejected.load(Ordering::Relaxed), 3);
        assert_eq!(channel.applied.load(Ordering::Relaxed), 0);
        // Params unchanged by rejected commands.
        assert_eq!(channel.params().vsm_page_budget.load(Ordering::Relaxed), 256);
        assert_eq!(channel.params().radiance_intensity(), 2.0);
        assert_eq!(channel.params().entropy_impulse_radius(), 2.5);
    }

    #[test]
    fn valid_commands_publish_to_lock_free_params() {
        let channel = PresentCommandChannel::new();
        channel.send_command(PresentCommand::VsmPageBudget(64));
        channel.send_command(PresentCommand::RadianceIntensity(4.5));
        channel.send_command(PresentCommand::EntropyImpulseRadius(3.0));
        channel.drain_pending();
        assert_eq!(channel.params().vsm_page_budget.load(Ordering::Relaxed), 64);
        assert_eq!(channel.params().radiance_intensity(), 4.5);
        assert_eq!(channel.params().entropy_impulse_radius(), 3.0);
        let report = channel.report();
        assert_eq!(report.applied, 3);
        assert_eq!(report.last_kind, "entropy_impulse_radius");
    }
}
