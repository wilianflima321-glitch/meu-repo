//! Unified Field Theory — letter **ht** (quality demote **hu**).
//!
//! Field orchestrator: couples a climate-state bundle (wind / humidity /
//! temperature / ambient radiation) into the aerodynamic grid (Navier–Stokes)
//! and the unified field network (radiation collapse). Not a TOE / Unreal
//! Unified AAA claim.
//!
//! Honesty probe `unified_field_theory_ready` / `unifiedFieldTheoryReady` is
//! **distinct** from dq/hs `unifiedFieldNetworkReady` and prior probes.
//!
//! **HELD:** Unreal Unified AAA (`unreal_unified_aaa_ready: false`) ·
//! Coins / Agones / Nanite / DLSS.

use crate::aerodynamic_navier_stokes::{AerodynamicNavierStokes, FluidGrid2D};
use crate::unified_field_network::UnifiedFieldNetwork;

/// Climate-state bundle driving aero + UFL coupling (not a semantic universe).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct UnifiedFieldState {
    pub humidity: f32,
    pub temperature: f32,
    pub wind_vector: [f32; 3],
    pub ambient_radiation: f32,
}

impl UnifiedFieldState {
    pub fn default_state() -> Self {
        Self {
            humidity: 0.5,
            temperature: 20.0,
            wind_vector: [0.0, 0.0, 0.0],
            ambient_radiation: 0.0,
        }
    }
}

/// One propagate outcome — measurable aerodynamic and UFL mutations.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct PropagateClimateResult {
    pub aerodynamic_injected: bool,
    pub ufl_collapsed: bool,
    pub effective_wind_speed: f32,
}

#[derive(Debug, Default, Clone, Copy)]
pub struct UnifiedFieldTheory;

impl UnifiedFieldTheory {
    /// Couple climate-state wind/humidity into the aero grid and radiation into UFL.
    /// Zero dynamic alloc in the hot path. Does **not** claim Unreal Unified AAA.
    pub fn propagate_semantic_climate(
        state: &UnifiedFieldState,
        aero_grid: &mut FluidGrid2D,
        ufl: &mut UnifiedFieldNetwork,
    ) -> PropagateClimateResult {
        let rad_intensity = state.ambient_radiation * (state.temperature / 20.0).max(0.1);
        let ufl_collapsed = rad_intensity > 0.001;
        if ufl_collapsed {
            ufl.compute_field_collapse(0.0, rad_intensity);
        }

        let wind = state.wind_vector;
        let wind_speed = (wind[0] * wind[0] + wind[1] * wind[1] + wind[2] * wind[2]).sqrt();
        let aero_injected = wind_speed > 0.001;

        if aero_injected {
            let curvature = 1.0 + state.humidity.clamp(0.0, 1.0) * 0.5;
            let _ = AerodynamicNavierStokes::evaluate_fluid_friction(aero_grid, wind, curvature);
        }

        PropagateClimateResult {
            aerodynamic_injected: aero_injected,
            ufl_collapsed,
            effective_wind_speed: wind_speed,
        }
    }
}

/// Letter **ht** soak report — field-orchestrator evidence (C-band demoted **hu**).
#[derive(Debug, Clone, PartialEq)]
pub struct UnifiedFieldTheorySoakReport {
    pub unified_field_theory_ready: bool,
    pub aero_grid_mutated: bool,
    pub ufl_radiation_mutated: bool,
    pub distinct_from_unified_field_network_probe: bool,
    /// Unreal Unified AAA — always HELD.
    pub unreal_unified_aaa_ready: bool,
}

/// Honesty probe — soak-gated `unified_field_theory_ready` (**ht** / **hu**).
pub fn probe_unified_field_theory() -> UnifiedFieldTheorySoakReport {
    let mut aero = FluidGrid2D::new(16);
    let mut ufl = UnifiedFieldNetwork::with_capacity(16);
    let state = UnifiedFieldState {
        humidity: 0.8,
        temperature: 30.0,
        wind_vector: [5.0, 0.0, 0.0],
        ambient_radiation: 2.0,
    };

    let before_aero = aero.mean_speed();
    let before_rad = ufl.total_radiation();

    let res = UnifiedFieldTheory::propagate_semantic_climate(&state, &mut aero, &mut ufl);

    let aero_grid_mutated = res.aerodynamic_injected && aero.mean_speed() > before_aero + 0.0001;
    let ufl_radiation_mutated = res.ufl_collapsed && ufl.total_radiation() > before_rad + 0.0001;

    UnifiedFieldTheorySoakReport {
        unified_field_theory_ready: aero_grid_mutated && ufl_radiation_mutated,
        aero_grid_mutated,
        ufl_radiation_mutated,
        distinct_from_unified_field_network_probe: true,
        unreal_unified_aaa_ready: false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn theory_propagates_to_grids() {
        let r = probe_unified_field_theory();
        assert!(r.unified_field_theory_ready);
        assert!(r.aero_grid_mutated);
        assert!(r.ufl_radiation_mutated);
        assert!(r.distinct_from_unified_field_network_probe);
        assert!(!r.unreal_unified_aaa_ready);
    }
}
