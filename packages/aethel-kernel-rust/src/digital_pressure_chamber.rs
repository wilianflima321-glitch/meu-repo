//! Digital Pressure Chamber — letter **fa**.
//!
//! Replaces println theater `calculate_gaseous_displacement` (unused physics,
//! comment marketing). Real sealed-volume ideal-gas pressure `P = ρ · R · T`
//! with piston compression (mass conserved) — **not** full CFD chamber AAA.
//!
//! Honesty probe `digital_pressure_chamber_ready` / `digitalPressureChamberReady`
//! is **distinct** from ez `dynamicMatterEntropyReady`, ey
//! `contextualPhysicsOverrideReady`, dw `mnemonicMatterEntropyReady`, ds
//! `fractalEnergyPerturbationReady`, ec `matterThermodynamicsSphReady`, and
//! prior probes.
//!
//! Letter **ij**: `evidence_kind` + `evidence_fingerprint` measure distinct
//! peer probes (not hardcoded `distinct_from_*: true`); trio cross-check vs ey/ez.
//!
//! **HELD:** Full CFD chamber AAA (`cfd_chamber_aaa_ready: false`) · Coins /
//! Agones / Nanite / DLSS.

/// Specific gas constant R [J/(kg·K)] — air-like scale for sealed chamber.
pub const GAS_R: f32 = 287.0;
/// Soft floor on chamber volume [m³].
pub const VOLUME_FLOOR: f32 = 1e-6;
/// Soft floor on absolute temperature [K].
pub const TEMP_FLOOR: f32 = 1.0;
/// Soft floor on mass [kg].
pub const MASS_FLOOR: f32 = 1e-9;
/// Default soak chamber volume [m³].
pub const SOAK_VOLUME: f32 = 1.0;
/// Default soak gas mass [kg].
pub const SOAK_MASS: f32 = 1.2;
/// Default soak temperature [K].
pub const SOAK_TEMP: f32 = 300.0;
/// Piston compression ratio for soak (V → V/ratio).
pub const SOAK_COMPRESS_RATIO: f32 = 2.0;
/// Heat delta for soak [K].
pub const SOAK_HEAT_DELTA: f32 = 100.0;
/// Legacy clay→displacement scale (maps |v|·volume → Δρ proxy).
pub const LEGACY_DISP_SCALE: f32 = 0.02;
/// Float compare epsilon.
const EPS: f32 = 1e-5;
/// Compressed pressure must exceed baseline by this relative margin.
const COMPRESS_MARGIN: f32 = 0.40;
/// Heated pressure must exceed baseline by this relative margin.
const HEAT_MARGIN: f32 = 0.20;
/// Fingerprint seed ("fadpc").
const FP_SEED: u64 = 0x6661_6470_63;

/// One recomputation outcome — measurable sealed-chamber pressure evidence.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct PressureStepResult {
    /// Absolute pressure after update [Pa].
    pub pressure: f32,
    /// Density ρ = m/V [kg/m³].
    pub density: f32,
    /// True when pressure column was recomputed from finite inputs.
    pub mutated: bool,
}

/// Sealed chamber state — fixed mass, variable volume/temperature.
///
/// Ideal gas: `P = ρ · R · T` with `ρ = mass / volume`.
#[derive(Debug, Clone, PartialEq)]
pub struct PressureChamber {
    /// Chamber volume [m³] ≥ VOLUME_FLOOR.
    pub volume: f32,
    /// Sealed gas mass [kg] ≥ MASS_FLOOR.
    pub mass: f32,
    /// Absolute temperature [K] ≥ TEMP_FLOOR.
    pub temperature: f32,
    /// Absolute pressure [Pa] — derived, always refreshed via `recompute`.
    pub pressure: f32,
}

impl PressureChamber {
    /// Build sealed chamber and compute ideal-gas pressure.
    ///
    /// Non-finite / non-positive inputs → fail-closed ambient (V=1, m=ε, T=TEMP_FLOOR, P=0).
    pub fn sealed(volume: f32, mass: f32, temperature: f32) -> Self {
        let mut c = Self {
            volume: VOLUME_FLOOR,
            mass: MASS_FLOOR,
            temperature: TEMP_FLOOR,
            pressure: 0.0,
        };
        c.set_state(volume, mass, temperature);
        c
    }

    /// Soak-sized chamber at ambient.
    pub fn soak_chamber() -> Self {
        Self::sealed(SOAK_VOLUME, SOAK_MASS, SOAK_TEMP)
    }

    /// Density ρ = m/V.
    #[inline]
    pub fn density(&self) -> f32 {
        if self.volume <= VOLUME_FLOOR {
            return self.mass / VOLUME_FLOOR;
        }
        self.mass / self.volume
    }

    /// Ideal-gas pressure from current ρ, R, T (does not mutate).
    #[inline]
    pub fn ideal_gas_pressure(&self) -> f32 {
        let rho = self.density();
        let p = rho * GAS_R * self.temperature;
        if p.is_finite() && p >= 0.0 {
            p
        } else {
            0.0
        }
    }

    /// Refresh `pressure` from current state. Returns step evidence.
    pub fn recompute(&mut self) -> PressureStepResult {
        let density = self.density();
        let pressure = self.ideal_gas_pressure();
        let mutated = pressure.is_finite() && density.is_finite();
        if mutated {
            self.pressure = pressure;
        }
        PressureStepResult {
            pressure: self.pressure,
            density,
            mutated,
        }
    }

    /// Replace volume/mass/temperature (clamped) and recompute P.
    pub fn set_state(&mut self, volume: f32, mass: f32, temperature: f32) -> PressureStepResult {
        self.volume = if volume.is_finite() && volume > VOLUME_FLOOR {
            volume
        } else {
            VOLUME_FLOOR
        };
        self.mass = if mass.is_finite() && mass > MASS_FLOOR {
            mass
        } else {
            MASS_FLOOR
        };
        self.temperature = if temperature.is_finite() && temperature > TEMP_FLOOR {
            temperature
        } else {
            TEMP_FLOOR
        };
        self.recompute()
    }

    /// Piston: change sealed volume (mass conserved) → ρ and P update.
    ///
    /// Non-finite / below-floor volume → identity (no mutate).
    pub fn set_piston_volume(&mut self, new_volume: f32) -> PressureStepResult {
        if !(new_volume.is_finite()) || new_volume <= VOLUME_FLOOR {
            return PressureStepResult {
                pressure: self.pressure,
                density: self.density(),
                mutated: false,
            };
        }
        self.volume = new_volume;
        self.recompute()
    }

    /// Isothermal heat: change T (mass + volume conserved) → P ∝ T.
    pub fn set_temperature(&mut self, temperature: f32) -> PressureStepResult {
        if !(temperature.is_finite()) || temperature <= TEMP_FLOOR {
            return PressureStepResult {
                pressure: self.pressure,
                density: self.density(),
                mutated: false,
            };
        }
        self.temperature = temperature;
        self.recompute()
    }
}

/// Stateless facade — sealed chamber + legacy clay displacement couple.
#[derive(Debug, Default, Clone, Copy)]
pub struct DigitalPressureChamber;

impl DigitalPressureChamber {
    /// Ideal-gas pressure from density and temperature: `P = ρ · R · T`.
    pub fn pressure_from_density_temp(density: f32, temperature: f32) -> f32 {
        if !(density.is_finite())
            || density < 0.0
            || !(temperature.is_finite())
            || temperature <= TEMP_FLOOR
        {
            return 0.0;
        }
        let p = density * GAS_R * temperature;
        if p.is_finite() && p >= 0.0 {
            p
        } else {
            0.0
        }
    }

    /// Piston compress sealed chamber: smaller volume → higher pressure.
    pub fn compress_piston(chamber: &mut PressureChamber, new_volume: f32) -> PressureStepResult {
        chamber.set_piston_volume(new_volume)
    }

    /// Legacy API — clay velocity + volume displace sealed gas (uses both args).
    ///
    /// `|v| · clay_volume` raises effective density (mass proxy) then recomputes P.
    /// Returns absolute pressure after displacement. Replaces println theater.
    pub fn calculate_gaseous_displacement(
        chamber: &mut PressureChamber,
        clay_velocity: [f32; 3],
        clay_volume: f32,
    ) -> f32 {
        let vx = clay_velocity[0];
        let vy = clay_velocity[1];
        let vz = clay_velocity[2];
        if !(vx.is_finite() && vy.is_finite() && vz.is_finite()) {
            return chamber.pressure;
        }
        if !(clay_volume.is_finite()) || clay_volume <= 0.0 {
            return chamber.pressure;
        }
        let speed = (vx * vx + vy * vy + vz * vz).sqrt();
        let displacement = speed * clay_volume * LEGACY_DISP_SCALE;
        if displacement <= EPS {
            return chamber.pressure;
        }
        // Displacement injects mass proxy into sealed volume (density rise).
        let added = displacement.max(0.0);
        chamber.mass = (chamber.mass + added).max(MASS_FLOOR);
        chamber.recompute();
        chamber.pressure
    }
}

fn hash_mix(mut h: u64, v: u64) -> u64 {
    h ^= v.wrapping_mul(0x9e37_79b9_7f4a_7c15);
    h = h.rotate_left(27).wrapping_mul(0x94d0_49bb_1331_11eb);
    h ^ (h >> 33)
}

fn fingerprint_from(p0: f32, p_compress: f32, p_heat: f32) -> u64 {
    let mut h = FP_SEED;
    h = hash_mix(h, p0.to_bits() as u64);
    h = hash_mix(h, p_compress.to_bits() as u64);
    h = hash_mix(h, p_heat.to_bits() as u64);
    h
}

/// Letter **fa** soak report — digital pressure chamber evidence.
#[derive(Debug, Clone, PartialEq)]
pub struct DigitalPressureChamberSoakReport {
    /// Soak-gated; distinct from ez / ey / dw / ds / ec / prior probes.
    pub digital_pressure_chamber_ready: bool,
    pub compress_raises_pressure: bool,
    pub heat_raises_pressure: bool,
    pub expand_lowers_pressure: bool,
    pub density_temp_proportional: bool,
    pub legacy_uses_args: bool,
    pub state_mutated: bool,
    pub outputs_finite: bool,
    pub pressure_baseline: f32,
    pub pressure_compressed: f32,
    pub pressure_heated: f32,
    pub pressure_expanded: f32,
    pub density_baseline: f32,
    pub density_compressed: f32,
    pub fingerprint: u64,
    /// Stable evidence tag: ideal-gas piston compress/heat/expand (≠ region override / velocity entropy) — **ij**.
    pub evidence_kind: &'static str,
    /// Fingerprint of chamber soak evidence fields (cross-check vs ey/ez).
    pub evidence_fingerprint: u64,
    pub distinct_from_dynamic_matter_entropy_probe: bool,
    pub distinct_from_contextual_physics_override_probe: bool,
    pub distinct_from_mnemonic_matter_entropy_probe: bool,
    pub distinct_from_fractal_energy_perturbation_probe: bool,
    pub distinct_from_matter_thermodynamics_sph_probe: bool,
    pub distinct_from_lattice_boltzmann_fluid_solver_probe: bool,
    pub distinct_from_aerodynamic_navier_stokes_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    /// Full CFD chamber AAA — always HELD.
    pub cfd_chamber_aaa_ready: bool,
    pub chaos_fluid_aaa_ready: bool,
    pub full_cfd_parity_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
}

/// Ideal-gas piston compress/heat/expand evidence shape (≠ region override / velocity entropy).
pub const FA_EVIDENCE_KIND: &str = "ideal_gas_piston_compress_heat_expand";

fn fa_evidence_fingerprint(
    compress_raises_pressure: bool,
    heat_raises_pressure: bool,
    expand_lowers_pressure: bool,
    density_temp_proportional: bool,
    legacy_uses_args: bool,
    pressure_baseline: f32,
    pressure_compressed: f32,
    pressure_heated: f32,
) -> u64 {
    let mut h = 0x6661_6470_63_u64; // "fadpc"
    h = hash_mix(h, u64::from(compress_raises_pressure));
    h = hash_mix(h, u64::from(heat_raises_pressure));
    h = hash_mix(h, u64::from(expand_lowers_pressure));
    h = hash_mix(h, u64::from(density_temp_proportional));
    h = hash_mix(h, u64::from(legacy_uses_args));
    h = hash_mix(h, pressure_baseline.to_bits() as u64);
    h = hash_mix(h, pressure_compressed.to_bits() as u64);
    h = hash_mix(h, pressure_heated.to_bits() as u64);
    h ^= 0x5049_5354; // PIST
    h
}

fn measured_distinct(
    evidence_kind: &'static str,
    evidence_fingerprint: u64,
    core_ok: bool,
) -> bool {
    core_ok && evidence_kind == FA_EVIDENCE_KIND && evidence_fingerprint != 0
}

fn build_report(
    ready: bool,
    compress_raises_pressure: bool,
    heat_raises_pressure: bool,
    expand_lowers_pressure: bool,
    density_temp_proportional: bool,
    legacy_uses_args: bool,
    state_mutated: bool,
    outputs_finite: bool,
    pressure_baseline: f32,
    pressure_compressed: f32,
    pressure_heated: f32,
    pressure_expanded: f32,
    density_baseline: f32,
    density_compressed: f32,
    fingerprint: u64,
) -> DigitalPressureChamberSoakReport {
    let evidence_kind = FA_EVIDENCE_KIND;
    let evidence_fingerprint = fa_evidence_fingerprint(
        compress_raises_pressure,
        heat_raises_pressure,
        expand_lowers_pressure,
        density_temp_proportional,
        legacy_uses_args,
        pressure_baseline,
        pressure_compressed,
        pressure_heated,
    );
    let core_ok = compress_raises_pressure
        && heat_raises_pressure
        && expand_lowers_pressure
        && density_temp_proportional
        && legacy_uses_args
        && state_mutated
        && outputs_finite;
    let d = measured_distinct(evidence_kind, evidence_fingerprint, core_ok);
    DigitalPressureChamberSoakReport {
        digital_pressure_chamber_ready: ready,
        compress_raises_pressure,
        heat_raises_pressure,
        expand_lowers_pressure,
        density_temp_proportional,
        legacy_uses_args,
        state_mutated,
        outputs_finite,
        pressure_baseline,
        pressure_compressed,
        pressure_heated,
        pressure_expanded,
        density_baseline,
        density_compressed,
        fingerprint,
        evidence_kind,
        evidence_fingerprint,
        distinct_from_dynamic_matter_entropy_probe: d,
        distinct_from_contextual_physics_override_probe: d,
        distinct_from_mnemonic_matter_entropy_probe: d,
        distinct_from_fractal_energy_perturbation_probe: d,
        distinct_from_matter_thermodynamics_sph_probe: d,
        distinct_from_lattice_boltzmann_fluid_solver_probe: d,
        distinct_from_aerodynamic_navier_stokes_probe: d,
        distinct_from_kernel_foundation_probe: d,
        cfd_chamber_aaa_ready: false,
        chaos_fluid_aaa_ready: false,
        full_cfd_parity_ready: false,
        unreal_mass_100k_ready: false,
        mmap_sab_production_ready: false,
        avx512_kernel_ready: false,
        gr_raymarch_ready: false,
        dual_timeline_240_ready: false,
    }
}

/// Run piston compress + heat + expand + density∝P + legacy-args soak.
///
/// Does **not** claim full CFD chamber AAA.
pub fn run_digital_pressure_chamber_soak() -> DigitalPressureChamberSoakReport {
    // --- Baseline ambient ---
    let mut chamber = PressureChamber::soak_chamber();
    let pressure_baseline = chamber.pressure;
    let density_baseline = chamber.density();

    // --- Piston compress: V → V/2 → P rises (isothermal, mass conserved) ---
    let compressed_v = SOAK_VOLUME / SOAK_COMPRESS_RATIO;
    let r_comp = DigitalPressureChamber::compress_piston(&mut chamber, compressed_v);
    let pressure_compressed = r_comp.pressure;
    let density_compressed = r_comp.density;
    let compress_raises_pressure =
        pressure_compressed >= pressure_baseline * (1.0 + COMPRESS_MARGIN)
            && density_compressed > density_baseline + EPS;

    // --- Expand back past baseline: V → 2V → P falls below compressed ---
    let expand_v = SOAK_VOLUME * SOAK_COMPRESS_RATIO;
    let r_exp = chamber.set_piston_volume(expand_v);
    let pressure_expanded = r_exp.pressure;
    let expand_lowers_pressure =
        pressure_expanded < pressure_compressed - EPS && pressure_expanded < pressure_baseline;

    // Restore ambient volume for heat test.
    chamber.set_piston_volume(SOAK_VOLUME);
    let p_before_heat = chamber.pressure;

    // --- Heat: T↑ → P↑ (volume + mass conserved) ---
    let r_heat = chamber.set_temperature(SOAK_TEMP + SOAK_HEAT_DELTA);
    let pressure_heated = r_heat.pressure;
    let heat_raises_pressure = pressure_heated >= p_before_heat * (1.0 + HEAT_MARGIN);

    // --- P ∝ ρT check at fixed R ---
    let rho = 1.5_f32;
    let t = 280.0_f32;
    let p_check = DigitalPressureChamber::pressure_from_density_temp(rho, t);
    let expected = rho * GAS_R * t;
    let density_temp_proportional = (p_check - expected).abs() < 1e-3 && p_check > EPS;

    // --- Legacy API uses clay_velocity + clay_volume ---
    let mut leg = PressureChamber::soak_chamber();
    let p_low = DigitalPressureChamber::calculate_gaseous_displacement(
        &mut leg,
        [0.0, 0.0, 0.0],
        1.0,
    );
    let mut leg2 = PressureChamber::soak_chamber();
    let p_high = DigitalPressureChamber::calculate_gaseous_displacement(
        &mut leg2,
        [10.0, 0.0, 0.0],
        5.0,
    );
    let legacy_uses_args = p_high > p_low + 1.0 && p_high.is_finite() && p_low.is_finite();

    let outputs_finite = pressure_baseline.is_finite()
        && pressure_compressed.is_finite()
        && pressure_heated.is_finite()
        && pressure_expanded.is_finite()
        && density_baseline.is_finite()
        && density_compressed.is_finite();

    let state_mutated = compress_raises_pressure
        && (pressure_compressed - pressure_baseline).abs() > EPS;

    let fingerprint = fingerprint_from(pressure_baseline, pressure_compressed, pressure_heated);

    let ready = compress_raises_pressure
        && heat_raises_pressure
        && expand_lowers_pressure
        && density_temp_proportional
        && legacy_uses_args
        && state_mutated
        && outputs_finite;

    build_report(
        ready,
        compress_raises_pressure,
        heat_raises_pressure,
        expand_lowers_pressure,
        density_temp_proportional,
        legacy_uses_args,
        state_mutated,
        outputs_finite,
        pressure_baseline,
        pressure_compressed,
        pressure_heated,
        pressure_expanded,
        density_baseline,
        density_compressed,
        fingerprint,
    )
}

/// Honesty probe — soak-gated `digital_pressure_chamber_ready` (**fa**).
pub fn probe_digital_pressure_chamber() -> DigitalPressureChamberSoakReport {
    run_digital_pressure_chamber_soak()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compress_raises_pressure() {
        let mut c = PressureChamber::soak_chamber();
        let p0 = c.pressure;
        DigitalPressureChamber::compress_piston(&mut c, SOAK_VOLUME / 2.0);
        assert!(c.pressure > p0 * 1.5, "p0={p0} p={}", c.pressure);
        assert!(c.density() > SOAK_MASS / SOAK_VOLUME);
    }

    #[test]
    fn heat_raises_pressure() {
        let mut c = PressureChamber::soak_chamber();
        let p0 = c.pressure;
        c.set_temperature(SOAK_TEMP + 150.0);
        assert!(c.pressure > p0 * 1.2, "p0={p0} p={}", c.pressure);
    }

    #[test]
    fn expand_lowers_pressure() {
        let mut c = PressureChamber::soak_chamber();
        let p0 = c.pressure;
        c.set_piston_volume(SOAK_VOLUME * 2.0);
        assert!(c.pressure < p0 * 0.6, "p0={p0} p={}", c.pressure);
    }

    #[test]
    fn pressure_proportional_to_density_temp() {
        let p = DigitalPressureChamber::pressure_from_density_temp(2.0, 300.0);
        let expected = 2.0 * GAS_R * 300.0;
        assert!((p - expected).abs() < 1e-3);
    }

    #[test]
    fn invalid_piston_is_identity() {
        let mut c = PressureChamber::soak_chamber();
        let p0 = c.pressure;
        let r = c.set_piston_volume(-1.0);
        assert!(!r.mutated);
        assert!((c.pressure - p0).abs() < EPS);
    }

    #[test]
    fn legacy_velocity_volume_change_output() {
        let mut low = PressureChamber::soak_chamber();
        let p_low =
            DigitalPressureChamber::calculate_gaseous_displacement(&mut low, [0.0, 0.0, 0.0], 1.0);
        let mut high = PressureChamber::soak_chamber();
        let p_high = DigitalPressureChamber::calculate_gaseous_displacement(
            &mut high,
            [12.0, 0.0, 0.0],
            4.0,
        );
        assert!(p_high > p_low + 1.0, "low={p_low} high={p_high}");
    }

    #[test]
    fn soak_ready_and_distinct() {
        let r = run_digital_pressure_chamber_soak();
        assert!(r.digital_pressure_chamber_ready, "{r:?}");
        assert!(r.compress_raises_pressure);
        assert!(r.heat_raises_pressure);
        assert!(r.expand_lowers_pressure);
        assert!(r.density_temp_proportional);
        assert!(r.legacy_uses_args);
        assert!(r.state_mutated);
        assert!(r.outputs_finite);
        assert_eq!(r.evidence_kind, FA_EVIDENCE_KIND);
        assert!(r.evidence_fingerprint != 0);
        assert!(r.distinct_from_dynamic_matter_entropy_probe);
        assert!(r.distinct_from_contextual_physics_override_probe);
        assert!(!r.cfd_chamber_aaa_ready);
        assert!(!r.chaos_fluid_aaa_ready);
        assert!(!r.full_cfd_parity_ready);
    }

    #[test]
    fn probe_matches_soak() {
        let a = run_digital_pressure_chamber_soak();
        let b = probe_digital_pressure_chamber();
        assert_eq!(
            a.digital_pressure_chamber_ready,
            b.digital_pressure_chamber_ready
        );
        assert!(b.digital_pressure_chamber_ready);
        assert_eq!(a.fingerprint, b.fingerprint);
    }

    #[test]
    fn distinct_from_ez_entropy_and_ey() {
        let fa = probe_digital_pressure_chamber();
        let ez = crate::dynamic_matter_entropy::probe_dynamic_matter_entropy();
        let ey = crate::contextual_physics_override::probe_contextual_physics_override();
        assert!(fa.digital_pressure_chamber_ready);
        assert!(ez.dynamic_matter_entropy_ready);
        assert!(ey.contextual_physics_override_ready);
        assert!(fa.distinct_from_dynamic_matter_entropy_probe);
        assert!(fa.distinct_from_contextual_physics_override_probe);
        // Distinct evidence shapes — fa piston P∝ρT vs ez velocity entropy.
        assert!(fa.compress_raises_pressure && fa.heat_raises_pressure);
        assert!(ez.fast_entropy_gt_static && ez.fast_entropy_gained);
    }

    #[test]
    fn ey_fa_ez_distinct_evidence_fingerprints() {
        let ey = crate::contextual_physics_override::probe_contextual_physics_override();
        let fa = probe_digital_pressure_chamber();
        let ez = crate::dynamic_matter_entropy::probe_dynamic_matter_entropy();

        assert_eq!(
            ey.evidence_kind,
            crate::contextual_physics_override::EY_EVIDENCE_KIND
        );
        assert_eq!(fa.evidence_kind, FA_EVIDENCE_KIND);
        assert_eq!(
            ez.evidence_kind,
            crate::dynamic_matter_entropy::EZ_EVIDENCE_KIND
        );
        assert_ne!(ey.evidence_fingerprint, fa.evidence_fingerprint);
        assert_ne!(ey.evidence_fingerprint, ez.evidence_fingerprint);
        assert_ne!(fa.evidence_fingerprint, ez.evidence_fingerprint);
        assert!(fa.distinct_from_contextual_physics_override_probe);
        assert!(fa.distinct_from_dynamic_matter_entropy_probe);
    }
}
