//! CapScore/tier-gated GPU soak resolution budgets (Law XV honesty).
//!
//! Raises engine-owned present + frame-graph substrate targets from toy
//! 32²/64² toward meaningful 720p/1080p budgets when adapter limits allow.
//! Fail-closed on estimated OOM — never flips AAA / product_present_ready.

use serde::{Deserialize, Serialize};
use wgpu::{Adapter, AdapterInfo, DeviceType, Limits};

/// Env override for soak CapScore proxy (0–100). Web CapScore remains separate.
pub const SOAK_CAP_SCORE_ENV: &str = "AETHEL_SOAK_CAP_SCORE";

/// Soft-raster pixel cap — storage-buffer soft raster is not a product viewport.
pub const MICROPOLY_SOFT_RASTER_MAX_EDGE: u32 = 512;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SoakFidelityTier {
    /// CapScore &lt; 25 or CPU/Virtual — 640×360.
    Low,
    /// CapScore &lt; 50 — 1280×720.
    Mid,
    /// CapScore ≥ 50 — 1920×1080 when VRAM allows.
    High,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SoakScaleBudget {
    pub capability_score: u32,
    pub tier: SoakFidelityTier,
    pub present_width: u32,
    pub present_height: u32,
    pub micro_poly_width: u32,
    pub micro_poly_height: u32,
    pub fsr_input_edge: u32,
    pub fsr_output_edge: u32,
    pub fsr_scale: u32,
    pub max_texture_dimension_2d: u32,
    pub max_buffer_size: u64,
    pub estimated_vram_bytes: u64,
    pub vram_budget_bytes: u64,
    /// True when even the lowest tier exceeds estimated budget (fail-closed).
    pub oom_refused: bool,
    pub adapter_device_type: String,
    pub note: String,
}

fn tier_present(tier: SoakFidelityTier) -> (u32, u32) {
    match tier {
        SoakFidelityTier::Low => (640, 360),
        SoakFidelityTier::Mid => (1280, 720),
        SoakFidelityTier::High => (1920, 1080),
    }
}

fn tier_vram_budget_bytes(tier: SoakFidelityTier) -> u64 {
    match tier {
        SoakFidelityTier::Low => 256 * 1024 * 1024,
        SoakFidelityTier::Mid => 768 * 1024 * 1024,
        SoakFidelityTier::High => 1536 * 1024 * 1024,
    }
}

fn tier_from_score(score: u32) -> SoakFidelityTier {
    if score >= 50 {
        SoakFidelityTier::High
    } else if score >= 25 {
        SoakFidelityTier::Mid
    } else {
        SoakFidelityTier::Low
    }
}

/// Desktop soak CapScore proxy from adapter identity + limits (not web hardware-profile).
pub fn derive_soak_capability_score(info: &AdapterInfo, limits: &Limits) -> u32 {
    if let Ok(raw) = std::env::var(SOAK_CAP_SCORE_ENV) {
        if let Ok(v) = raw.trim().parse::<u32>() {
            return v.min(100);
        }
    }
    let mut score: u32 = match info.device_type {
        DeviceType::DiscreteGpu => 70,
        DeviceType::IntegratedGpu => 35,
        DeviceType::VirtualGpu => 22,
        DeviceType::Cpu => 12,
        DeviceType::Other => 20,
    };
    if limits.max_texture_dimension_2d >= 8192 {
        score = score.saturating_add(15);
    } else if limits.max_texture_dimension_2d >= 4096 {
        score = score.saturating_add(5);
    }
    if limits.max_buffer_size >= 2 * 1024 * 1024 * 1024 {
        score = score.saturating_add(5);
    }
    score.min(100)
}

fn estimate_vram_bytes(
    present_w: u32,
    present_h: u32,
    micro_w: u32,
    micro_h: u32,
    fsr_in: u32,
    fsr_out: u32,
) -> u64 {
    let present = u64::from(present_w) * u64::from(present_h);
    // Color RT + depth + Hi-Z pyramid ≈ 2.5× RGBA8 footprint.
    let present_stack = present.saturating_mul(4).saturating_mul(5) / 2;
    let micropoly = u64::from(micro_w)
        .saturating_mul(u64::from(micro_h))
        .saturating_mul(8); // depth u32 + vis u32
    let fsr_in_b = u64::from(fsr_in)
        .saturating_mul(u64::from(fsr_in))
        .saturating_mul(16);
    let fsr_out_b = u64::from(fsr_out)
        .saturating_mul(u64::from(fsr_out))
        .saturating_mul(16)
        .saturating_mul(3); // history + output + reactive≈f32
    // VSM atlas stays substrate-scale (~64k floats) — fixed overhead.
    let vsm = 16u64 * 32 * 32 * 4;
    present_stack
        .saturating_add(micropoly)
        .saturating_add(fsr_in_b)
        .saturating_add(fsr_out_b)
        .saturating_add(vsm)
}

fn clamp_present(w: u32, h: u32, max_dim: u32) -> (u32, u32) {
    let max_dim = max_dim.max(64);
    let mut w = w.max(64).min(max_dim);
    let mut h = h.max(64).min(max_dim);
    // Keep aspect if both exceed — scale uniformly.
    if w > max_dim || h > max_dim {
        let scale = (max_dim as f64 / w.max(h) as f64).min(1.0);
        w = ((w as f64) * scale).floor().max(64.0) as u32;
        h = ((h as f64) * scale).floor().max(64.0) as u32;
    }
    (w, h)
}

fn micro_extent(present_w: u32, present_h: u32) -> (u32, u32) {
    let edge = present_w.min(present_h) / 2;
    let edge = edge.clamp(128, MICROPOLY_SOFT_RASTER_MAX_EDGE);
    // Prefer 16-aligned for dispatch friendliness.
    let edge = (edge / 16).max(8) * 16;
    (edge, edge)
}

fn fsr_edges(present_w: u32, present_h: u32) -> (u32, u32, u32) {
    let scale = 2u32;
    let out = present_w.min(present_h);
    // Keep even, ≥64; align to 8 for FSR workgroups.
    let out = ((out / 8).max(8) * 8).max(64);
    let input = (out / scale).max(32);
    let input = (input / 8).max(4) * 8;
    let out = input * scale;
    (input, out, scale)
}

fn build_candidate(
    score: u32,
    tier: SoakFidelityTier,
    limits: &Limits,
    device_type: &str,
) -> SoakScaleBudget {
    let (pw, ph) = tier_present(tier);
    let (pw, ph) = clamp_present(pw, ph, limits.max_texture_dimension_2d);
    let (mw, mh) = micro_extent(pw, ph);
    let (fsr_in, fsr_out, fsr_scale) = fsr_edges(pw, ph);
    let estimated = estimate_vram_bytes(pw, ph, mw, mh, fsr_in, fsr_out);
    let vram_budget = tier_vram_budget_bytes(tier).min(limits.max_buffer_size.saturating_mul(4));
    // Largest single FSR buffer must fit max_buffer_size.
    let largest_fsr = u64::from(fsr_out)
        .saturating_mul(u64::from(fsr_out))
        .saturating_mul(16);
    let single_ok = largest_fsr <= limits.max_buffer_size;
    let oom = !single_ok || estimated > vram_budget;
    SoakScaleBudget {
        capability_score: score,
        tier,
        present_width: pw,
        present_height: ph,
        micro_poly_width: mw,
        micro_poly_height: mh,
        fsr_input_edge: fsr_in,
        fsr_output_edge: fsr_out,
        fsr_scale,
        max_texture_dimension_2d: limits.max_texture_dimension_2d,
        max_buffer_size: limits.max_buffer_size,
        estimated_vram_bytes: estimated,
        vram_budget_bytes: vram_budget,
        oom_refused: oom,
        adapter_device_type: device_type.into(),
        note: if oom {
            format!(
                "Soak budget OOM fail-closed — estimated {} bytes > budget {} (or buffer > max_buffer_size); tier={tier:?}",
                estimated, vram_budget
            )
        } else {
            format!(
                "CapScore {score} → tier {tier:?} present {pw}x{ph}; FSR {fsr_in}→{fsr_out}; micro-poly {mw}x{mh}; est VRAM {estimated} / budget {vram_budget}"
            )
        },
    }
}

/// Select the highest fitting soak budget for this adapter (fail-closed OOM).
pub fn select_soak_scale_budget(adapter: &Adapter) -> SoakScaleBudget {
    let info = adapter.get_info();
    let limits = adapter.limits();
    select_soak_scale_budget_from_info(&info, &limits)
}

pub fn select_soak_scale_budget_from_info(info: &AdapterInfo, limits: &Limits) -> SoakScaleBudget {
    let score = derive_soak_capability_score(info, limits);
    let device_type = format!("{:?}", info.device_type);
    let preferred = tier_from_score(score);
    let ladder = match preferred {
        SoakFidelityTier::High => [
            SoakFidelityTier::High,
            SoakFidelityTier::Mid,
            SoakFidelityTier::Low,
        ],
        SoakFidelityTier::Mid => [
            SoakFidelityTier::Mid,
            SoakFidelityTier::Low,
            SoakFidelityTier::Low,
        ],
        SoakFidelityTier::Low => [
            SoakFidelityTier::Low,
            SoakFidelityTier::Low,
            SoakFidelityTier::Low,
        ],
    };
    let mut last = build_candidate(score, preferred, limits, &device_type);
    for tier in ladder {
        let cand = build_candidate(score, tier, limits, &device_type);
        if !cand.oom_refused {
            return cand;
        }
        last = cand;
    }
    last.oom_refused = true;
    last.note = format!(
        "All soak tiers OOM fail-closed vs adapter limits (max_tex={} max_buf={}); {}",
        limits.max_texture_dimension_2d, limits.max_buffer_size, last.note
    );
    last
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fake_limits(max_tex: u32, max_buf: u64) -> Limits {
        Limits {
            max_texture_dimension_2d: max_tex,
            max_buffer_size: max_buf,
            ..Limits::default()
        }
    }

    fn fake_info(device_type: DeviceType) -> AdapterInfo {
        AdapterInfo {
            name: "test".into(),
            vendor: 0,
            device: 0,
            device_type,
            driver: String::new(),
            driver_info: String::new(),
            backend: wgpu::Backend::Vulkan,
        }
    }

    #[test]
    fn discrete_high_prefers_1080p_when_vram_allows() {
        let info = fake_info(DeviceType::DiscreteGpu);
        let limits = fake_limits(16384, 2 * 1024 * 1024 * 1024);
        let b = select_soak_scale_budget_from_info(&info, &limits);
        assert!(!b.oom_refused);
        assert_eq!(b.tier, SoakFidelityTier::High);
        assert_eq!((b.present_width, b.present_height), (1920, 1080));
        assert!(b.fsr_output_edge >= 1024);
        assert!(b.micro_poly_width >= 128);
        assert!(b.micro_poly_width <= MICROPOLY_SOFT_RASTER_MAX_EDGE);
        assert!(b.capability_score >= 50);
    }

    #[test]
    fn weak_cpu_stays_low_tier() {
        let info = fake_info(DeviceType::Cpu);
        let limits = fake_limits(4096, 256 * 1024 * 1024);
        let b = select_soak_scale_budget_from_info(&info, &limits);
        assert!(!b.oom_refused);
        assert_eq!(b.tier, SoakFidelityTier::Low);
        assert_eq!((b.present_width, b.present_height), (640, 360));
    }

    #[test]
    fn tiny_buffer_limit_fail_closed_oom() {
        let info = fake_info(DeviceType::DiscreteGpu);
        let limits = fake_limits(16384, 1024); // absurdly small single buffer
        let b = select_soak_scale_budget_from_info(&info, &limits);
        assert!(b.oom_refused);
    }

    #[test]
    fn estimate_scales_with_resolution() {
        let small = estimate_vram_bytes(640, 360, 128, 128, 320, 640);
        let large = estimate_vram_bytes(1920, 1080, 512, 512, 960, 1920);
        assert!(large > small);
    }
}
