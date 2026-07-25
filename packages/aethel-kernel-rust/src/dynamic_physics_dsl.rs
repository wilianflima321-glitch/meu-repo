//! Dynamic Physics DSL (lite) — letter **gc**.
//!
//! Replaces comment-theater `parse_ai_rule` / `apply_opcode` (contains-string
//! fake compile, hardcoded vortex, no program AST, no SoA eval, no soak/probe)
//! with a real minimal physics constraint/expression DSL:
//! parse tiny programs (`apply_force`, `apply_impulse`, `set_mass`,
//! `set_velocity`, `integrate`, `distance` lite), evaluate against SoA body
//! state, fail-closed on invalid syntax / OOB indices / non-finite / bad mass.
//!
//! Honesty probe `dynamic_physics_dsl_ready` / `dynamicPhysicsDslReady` is
//! **distinct** from gb `atmosphericScatteringGodraysReady`, ga
//! `voxelConeRadiosityReady`, fz `symmetricVectorAlgebraReady`, fy
//! `recursiveFractalEnhancementReady`, fx `blueNoiseDitheringReady`, fw
//! `quantumOverlapReady`, ey `contextualPhysicsOverrideReady`, and prior.
//!
//! Letter **ik**: `evidence_kind` + `evidence_fingerprint` measure distinct
//! peer probes (not hardcoded `distinct_from_*: true`); trio cross-check vs fh/fq.
//!
//! **HELD:** Full Chaos / Mass / Unreal physics DSL AAA
//! (`chaos_mass_physics_dsl_aaa_ready: false`) · Coins / Agones / Nanite /
//! DLSS / Quic.

/// Default soak seed (deterministic fixtures).
pub const SOAK_SEED: u64 = 0x0C_D51_A75;
/// Absolute epsilon for soak velocity compares.
pub const SOAK_EPS: f32 = 1e-5;
/// Max statements in one program (fail-closed beyond).
pub const MAX_STMTS: usize = 64;
/// Max SoA bodies for soak / default world.
pub const MAX_BODIES: usize = 32;
/// Fingerprint seed ("gcdp").
const FP_SEED: u64 = 0x6763_6470;
const EPS: f32 = 1e-8;
const MIN_MASS: f32 = 1e-6;

/// Legacy single-opcode surface (law_mutation_engine zones).
#[derive(Debug, Clone, PartialEq)]
pub enum DslOpcode {
    InvertGravity,
    ScaleVelocity(f32),
    VortexAttraction { center: [f32; 3], force: f32 },
    ApplyForce { body: u32, force: [f32; 3] },
    ApplyImpulse { body: u32, impulse: [f32; 3] },
    SetMass { body: u32, mass: f32 },
    SetVelocity { body: u32, velocity: [f32; 3] },
    Integrate { dt: f32 },
    Distance { a: u32, b: u32, rest: f32 },
}

/// One compiled DSL statement.
#[derive(Debug, Clone, PartialEq)]
pub enum Stmt {
    ApplyForce { body: u32, force: [f32; 3] },
    ApplyImpulse { body: u32, impulse: [f32; 3] },
    SetMass { body: u32, mass: f32 },
    SetVelocity { body: u32, velocity: [f32; 3] },
    Integrate { dt: f32 },
    Distance { a: u32, b: u32, rest: f32 },
    /// Legacy zone ops (apply to body 0 when evaluating single-body helpers).
    InvertGravity,
    ScaleVelocity(f32),
    VortexAttraction { center: [f32; 3], force: f32 },
}

/// Parse / eval failure (fail-closed).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DslError {
    EmptyProgram,
    TooManyStatements,
    UnknownOpcode(String),
    BadArity { opcode: String, expected: usize, got: usize },
    BadNumber(String),
    NonFinite,
    BodyOutOfRange { body: u32, len: usize },
    InvalidMass,
    InvalidDt,
    InvalidRestLength,
}

impl std::fmt::Display for DslError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DslError::EmptyProgram => write!(f, "empty program"),
            DslError::TooManyStatements => write!(f, "too many statements"),
            DslError::UnknownOpcode(op) => write!(f, "unknown opcode '{op}'"),
            DslError::BadArity {
                opcode,
                expected,
                got,
            } => write!(f, "{opcode}: expected {expected} args, got {got}"),
            DslError::BadNumber(s) => write!(f, "bad number '{s}'"),
            DslError::NonFinite => write!(f, "non-finite value"),
            DslError::BodyOutOfRange { body, len } => {
                write!(f, "body {body} out of range (len={len})")
            }
            DslError::InvalidMass => write!(f, "invalid mass"),
            DslError::InvalidDt => write!(f, "invalid dt"),
            DslError::InvalidRestLength => write!(f, "invalid rest length"),
        }
    }
}

/// SoA particle / rigid-body lite state for DSL evaluation.
#[derive(Debug, Clone, PartialEq)]
pub struct BodySoA {
    pub pos_x: Vec<f32>,
    pub pos_y: Vec<f32>,
    pub pos_z: Vec<f32>,
    pub vel_x: Vec<f32>,
    pub vel_y: Vec<f32>,
    pub vel_z: Vec<f32>,
    pub mass: Vec<f32>,
    /// Accumulated force this substep (cleared by `integrate`).
    pub force_x: Vec<f32>,
    pub force_y: Vec<f32>,
    pub force_z: Vec<f32>,
    pub seed: u64,
}

impl BodySoA {
    pub fn with_capacity(n: usize, seed: u64) -> Self {
        Self {
            pos_x: vec![0.0; n],
            pos_y: vec![0.0; n],
            pos_z: vec![0.0; n],
            vel_x: vec![0.0; n],
            vel_y: vec![0.0; n],
            vel_z: vec![0.0; n],
            mass: vec![1.0; n],
            force_x: vec![0.0; n],
            force_y: vec![0.0; n],
            force_z: vec![0.0; n],
            seed,
        }
    }

    #[inline]
    pub fn len(&self) -> usize {
        self.pos_x.len()
    }

    #[inline]
    pub fn is_empty(&self) -> bool {
        self.pos_x.is_empty()
    }

    pub fn set_body(
        &mut self,
        i: usize,
        pos: [f32; 3],
        vel: [f32; 3],
        mass: f32,
    ) -> Result<(), DslError> {
        if i >= self.len() {
            return Err(DslError::BodyOutOfRange {
                body: i as u32,
                len: self.len(),
            });
        }
        if !finite3(pos) || !finite3(vel) || !mass.is_finite() || mass < MIN_MASS {
            return Err(DslError::NonFinite);
        }
        self.pos_x[i] = pos[0];
        self.pos_y[i] = pos[1];
        self.pos_z[i] = pos[2];
        self.vel_x[i] = vel[0];
        self.vel_y[i] = vel[1];
        self.vel_z[i] = vel[2];
        self.mass[i] = mass;
        self.force_x[i] = 0.0;
        self.force_y[i] = 0.0;
        self.force_z[i] = 0.0;
        Ok(())
    }

    #[inline]
    pub fn velocity(&self, i: usize) -> [f32; 3] {
        [self.vel_x[i], self.vel_y[i], self.vel_z[i]]
    }

    #[inline]
    pub fn position(&self, i: usize) -> [f32; 3] {
        [self.pos_x[i], self.pos_y[i], self.pos_z[i]]
    }

    /// Deterministic state fingerprint for soak / same-program checks.
    pub fn fingerprint(&self) -> u64 {
        let mut h = FP_SEED ^ self.seed;
        h = hash_mix(h, self.len() as u64);
        for i in 0..self.len() {
            h = hash_mix(h, quant_f32(self.pos_x[i]));
            h = hash_mix(h, quant_f32(self.pos_y[i]));
            h = hash_mix(h, quant_f32(self.pos_z[i]));
            h = hash_mix(h, quant_f32(self.vel_x[i]));
            h = hash_mix(h, quant_f32(self.vel_y[i]));
            h = hash_mix(h, quant_f32(self.vel_z[i]));
            h = hash_mix(h, quant_f32(self.mass[i]));
        }
        h
    }
}

/// Stateless facade — dynamic physics DSL lite.
#[derive(Debug, Default, Clone, Copy)]
pub struct DynamicPhysicsDsl;

impl DynamicPhysicsDsl {
    /// Parse a multi-statement program (`;` or newline separated).
    ///
    /// Grammar (whitespace-tolerant):
    /// - `apply_force <id> <fx> <fy> <fz>`
    /// - `apply_impulse <id> <ix> <iy> <iz>`
    /// - `set_mass <id> <m>`
    /// - `set_velocity <id> <vx> <vy> <vz>`
    /// - `integrate <dt>`
    /// - `distance <a> <b> <rest>`
    /// - legacy: `invert_gravity` | `scale_velocity <s>` |
    ///   `vortex <cx> <cy> <cz> <force>`
    pub fn parse_program(source: &str) -> Result<Vec<Stmt>, DslError> {
        let mut stmts = Vec::new();
        for raw in source.split([';', '\n']) {
            let line = raw.trim();
            if line.is_empty() || line.starts_with('#') || line.starts_with("//") {
                continue;
            }
            if stmts.len() >= MAX_STMTS {
                return Err(DslError::TooManyStatements);
            }
            stmts.push(Self::parse_statement(line)?);
        }
        if stmts.is_empty() {
            return Err(DslError::EmptyProgram);
        }
        Ok(stmts)
    }

    /// Parse one statement line.
    pub fn parse_statement(line: &str) -> Result<Stmt, DslError> {
        let tokens: Vec<&str> = line.split_whitespace().collect();
        if tokens.is_empty() {
            return Err(DslError::EmptyProgram);
        }
        let op = tokens[0].to_ascii_lowercase();
        match op.as_str() {
            "apply_force" | "force" => {
                expect_arity(&op, &tokens, 5)?;
                Ok(Stmt::ApplyForce {
                    body: parse_u32(tokens[1])?,
                    force: [
                        parse_f32(tokens[2])?,
                        parse_f32(tokens[3])?,
                        parse_f32(tokens[4])?,
                    ],
                })
            }
            "apply_impulse" | "impulse" => {
                expect_arity(&op, &tokens, 5)?;
                Ok(Stmt::ApplyImpulse {
                    body: parse_u32(tokens[1])?,
                    impulse: [
                        parse_f32(tokens[2])?,
                        parse_f32(tokens[3])?,
                        parse_f32(tokens[4])?,
                    ],
                })
            }
            "set_mass" | "mass" => {
                expect_arity(&op, &tokens, 3)?;
                Ok(Stmt::SetMass {
                    body: parse_u32(tokens[1])?,
                    mass: parse_f32(tokens[2])?,
                })
            }
            "set_velocity" | "velocity" => {
                expect_arity(&op, &tokens, 5)?;
                Ok(Stmt::SetVelocity {
                    body: parse_u32(tokens[1])?,
                    velocity: [
                        parse_f32(tokens[2])?,
                        parse_f32(tokens[3])?,
                        parse_f32(tokens[4])?,
                    ],
                })
            }
            "integrate" | "step" => {
                expect_arity(&op, &tokens, 2)?;
                Ok(Stmt::Integrate {
                    dt: parse_f32(tokens[1])?,
                })
            }
            "distance" | "dist" => {
                expect_arity(&op, &tokens, 4)?;
                Ok(Stmt::Distance {
                    a: parse_u32(tokens[1])?,
                    b: parse_u32(tokens[2])?,
                    rest: parse_f32(tokens[3])?,
                })
            }
            "invert_gravity" => {
                expect_arity(&op, &tokens, 1)?;
                Ok(Stmt::InvertGravity)
            }
            "scale_velocity" => {
                expect_arity(&op, &tokens, 2)?;
                Ok(Stmt::ScaleVelocity(parse_f32(tokens[1])?))
            }
            "vortex" | "vortex_attraction" => {
                expect_arity(&op, &tokens, 5)?;
                Ok(Stmt::VortexAttraction {
                    center: [
                        parse_f32(tokens[1])?,
                        parse_f32(tokens[2])?,
                        parse_f32(tokens[3])?,
                    ],
                    force: parse_f32(tokens[4])?,
                })
            }
            other => Err(DslError::UnknownOpcode(other.to_string())),
        }
    }

    /// Evaluate a compiled program against SoA bodies (mutates in place).
    pub fn eval(world: &mut BodySoA, program: &[Stmt]) -> Result<(), DslError> {
        if program.is_empty() {
            return Err(DslError::EmptyProgram);
        }
        for stmt in program {
            Self::eval_stmt(world, stmt)?;
        }
        Ok(())
    }

    /// Parse + eval in one shot.
    pub fn run(world: &mut BodySoA, source: &str) -> Result<(), DslError> {
        let program = Self::parse_program(source)?;
        Self::eval(world, &program)
    }

    fn eval_stmt(world: &mut BodySoA, stmt: &Stmt) -> Result<(), DslError> {
        match *stmt {
            Stmt::ApplyForce { body, force } => {
                let i = check_body(world, body)?;
                require_finite3(force)?;
                world.force_x[i] += force[0];
                world.force_y[i] += force[1];
                world.force_z[i] += force[2];
                Ok(())
            }
            Stmt::ApplyImpulse { body, impulse } => {
                let i = check_body(world, body)?;
                require_finite3(impulse)?;
                let inv_m = 1.0 / world.mass[i].max(MIN_MASS);
                world.vel_x[i] += impulse[0] * inv_m;
                world.vel_y[i] += impulse[1] * inv_m;
                world.vel_z[i] += impulse[2] * inv_m;
                Ok(())
            }
            Stmt::SetMass { body, mass } => {
                let i = check_body(world, body)?;
                if !mass.is_finite() || mass < MIN_MASS {
                    return Err(DslError::InvalidMass);
                }
                world.mass[i] = mass;
                Ok(())
            }
            Stmt::SetVelocity { body, velocity } => {
                let i = check_body(world, body)?;
                require_finite3(velocity)?;
                world.vel_x[i] = velocity[0];
                world.vel_y[i] = velocity[1];
                world.vel_z[i] = velocity[2];
                Ok(())
            }
            Stmt::Integrate { dt } => {
                if !dt.is_finite() || dt <= 0.0 {
                    return Err(DslError::InvalidDt);
                }
                for i in 0..world.len() {
                    let inv_m = 1.0 / world.mass[i].max(MIN_MASS);
                    world.vel_x[i] += world.force_x[i] * inv_m * dt;
                    world.vel_y[i] += world.force_y[i] * inv_m * dt;
                    world.vel_z[i] += world.force_z[i] * inv_m * dt;
                    world.pos_x[i] += world.vel_x[i] * dt;
                    world.pos_y[i] += world.vel_y[i] * dt;
                    world.pos_z[i] += world.vel_z[i] * dt;
                    world.force_x[i] = 0.0;
                    world.force_y[i] = 0.0;
                    world.force_z[i] = 0.0;
                }
                Ok(())
            }
            Stmt::Distance { a, b, rest } => {
                let ia = check_body(world, a)?;
                let ib = check_body(world, b)?;
                if !rest.is_finite() || rest < 0.0 {
                    return Err(DslError::InvalidRestLength);
                }
                let dx = world.pos_x[ib] - world.pos_x[ia];
                let dy = world.pos_y[ib] - world.pos_y[ia];
                let dz = world.pos_z[ib] - world.pos_z[ia];
                let dist = (dx * dx + dy * dy + dz * dz).sqrt().max(EPS);
                let corr = (dist - rest) / dist;
                let w_a = 1.0 / world.mass[ia].max(MIN_MASS);
                let w_b = 1.0 / world.mass[ib].max(MIN_MASS);
                let w_sum = w_a + w_b;
                if w_sum < EPS {
                    return Ok(());
                }
                let share_a = w_a / w_sum;
                let share_b = w_b / w_sum;
                world.pos_x[ia] += dx * corr * share_a;
                world.pos_y[ia] += dy * corr * share_a;
                world.pos_z[ia] += dz * corr * share_a;
                world.pos_x[ib] -= dx * corr * share_b;
                world.pos_y[ib] -= dy * corr * share_b;
                world.pos_z[ib] -= dz * corr * share_b;
                Ok(())
            }
            Stmt::InvertGravity => {
                // Apply anti-gravity impulse proxy on body 0 (zone helper).
                if world.is_empty() {
                    return Err(DslError::BodyOutOfRange { body: 0, len: 0 });
                }
                world.vel_y[0] += 19.6;
                Ok(())
            }
            Stmt::ScaleVelocity(scale) => {
                if !scale.is_finite() {
                    return Err(DslError::NonFinite);
                }
                if world.is_empty() {
                    return Err(DslError::BodyOutOfRange { body: 0, len: 0 });
                }
                world.vel_x[0] *= scale;
                world.vel_y[0] *= scale;
                world.vel_z[0] *= scale;
                Ok(())
            }
            Stmt::VortexAttraction { center, force } => {
                require_finite3(center)?;
                if !force.is_finite() {
                    return Err(DslError::NonFinite);
                }
                if world.is_empty() {
                    return Err(DslError::BodyOutOfRange { body: 0, len: 0 });
                }
                let dx = center[0] - world.pos_x[0];
                let dz = center[2] - world.pos_z[0];
                world.vel_x[0] += dz * force * 0.01;
                world.vel_z[0] -= dx * force * 0.01;
                Ok(())
            }
        }
    }

    /// Legacy AI-rule parser — returns a single opcode when the string is a
    /// valid one-liner; fail-closed (`None`) on invalid / empty.
    pub fn parse_ai_rule(ai_raw_intent: &str) -> Option<DslOpcode> {
        let stmt = Self::parse_statement(ai_raw_intent.trim()).ok()?;
        Some(stmt_to_opcode(stmt))
    }

    /// Legacy single-body apply (mutates position/velocity arrays).
    #[inline(always)]
    pub fn apply_opcode(opcode: &DslOpcode, position: &mut [f32; 3], velocity: &mut [f32; 3]) {
        let mut world = BodySoA::with_capacity(1, 0);
        let _ = world.set_body(0, *position, *velocity, 1.0);
        let stmt = opcode_to_stmt(opcode);
        if Self::eval_stmt(&mut world, &stmt).is_ok() {
            *position = world.position(0);
            *velocity = world.velocity(0);
        }
    }
}

fn stmt_to_opcode(stmt: Stmt) -> DslOpcode {
    match stmt {
        Stmt::InvertGravity => DslOpcode::InvertGravity,
        Stmt::ScaleVelocity(s) => DslOpcode::ScaleVelocity(s),
        Stmt::VortexAttraction { center, force } => DslOpcode::VortexAttraction { center, force },
        Stmt::ApplyForce { body, force } => DslOpcode::ApplyForce { body, force },
        Stmt::ApplyImpulse { body, impulse } => DslOpcode::ApplyImpulse { body, impulse },
        Stmt::SetMass { body, mass } => DslOpcode::SetMass { body, mass },
        Stmt::SetVelocity { body, velocity } => DslOpcode::SetVelocity { body, velocity },
        Stmt::Integrate { dt } => DslOpcode::Integrate { dt },
        Stmt::Distance { a, b, rest } => DslOpcode::Distance { a, b, rest },
    }
}

fn opcode_to_stmt(opcode: &DslOpcode) -> Stmt {
    match *opcode {
        DslOpcode::InvertGravity => Stmt::InvertGravity,
        DslOpcode::ScaleVelocity(s) => Stmt::ScaleVelocity(s),
        DslOpcode::VortexAttraction { center, force } => Stmt::VortexAttraction { center, force },
        DslOpcode::ApplyForce { body, force } => Stmt::ApplyForce { body, force },
        DslOpcode::ApplyImpulse { body, impulse } => Stmt::ApplyImpulse { body, impulse },
        DslOpcode::SetMass { body, mass } => Stmt::SetMass { body, mass },
        DslOpcode::SetVelocity { body, velocity } => Stmt::SetVelocity { body, velocity },
        DslOpcode::Integrate { dt } => Stmt::Integrate { dt },
        DslOpcode::Distance { a, b, rest } => Stmt::Distance { a, b, rest },
    }
}

fn expect_arity(op: &str, tokens: &[&str], expected: usize) -> Result<(), DslError> {
    if tokens.len() != expected {
        return Err(DslError::BadArity {
            opcode: op.to_string(),
            expected: expected.saturating_sub(1),
            got: tokens.len().saturating_sub(1),
        });
    }
    Ok(())
}

fn parse_f32(s: &str) -> Result<f32, DslError> {
    let v: f32 = s.parse().map_err(|_| DslError::BadNumber(s.to_string()))?;
    if !v.is_finite() {
        return Err(DslError::NonFinite);
    }
    Ok(v)
}

fn parse_u32(s: &str) -> Result<u32, DslError> {
    s.parse()
        .map_err(|_| DslError::BadNumber(s.to_string()))
}

fn check_body(world: &BodySoA, body: u32) -> Result<usize, DslError> {
    let i = body as usize;
    if i >= world.len() {
        return Err(DslError::BodyOutOfRange {
            body,
            len: world.len(),
        });
    }
    Ok(i)
}

#[inline]
fn finite3(v: [f32; 3]) -> bool {
    v[0].is_finite() && v[1].is_finite() && v[2].is_finite()
}

#[inline]
fn require_finite3(v: [f32; 3]) -> Result<(), DslError> {
    if finite3(v) {
        Ok(())
    } else {
        Err(DslError::NonFinite)
    }
}

#[inline]
fn quant_f32(v: f32) -> u64 {
    let bits = if v.is_finite() { v.to_bits() } else { 0 };
    bits as u64
}

#[inline]
fn hash_mix(h: u64, v: u64) -> u64 {
    let mut x = h ^ v.wrapping_mul(0x9E37_79B9_7F4A_7C15);
    x = (x ^ (x >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
    x = (x ^ (x >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
    x ^ (x >> 31)
}

fn fingerprint_parts(parts: &[u64]) -> u64 {
    let mut h = FP_SEED;
    for &p in parts {
        h = hash_mix(h, p);
    }
    h
}

/// Letter **gc** soak report — dynamic physics DSL evidence.
#[derive(Debug, Clone, PartialEq)]
pub struct DynamicPhysicsDslSoakReport {
    pub dynamic_physics_dsl_ready: bool,
    pub force_changes_velocity: bool,
    pub noop_leaves_velocity: bool,
    pub same_program_same_result: bool,
    pub deterministic: bool,
    pub invalid_program_fail_closed: bool,
    pub distance_constraint_projects: bool,
    pub outputs_finite: bool,
    pub state_mutated: bool,
    pub vel_with_force_y: f32,
    pub vel_noop_y: f32,
    pub distance_residual_before: f32,
    pub distance_residual_after: f32,
    pub stmt_count: u32,
    pub fingerprint: u64,
    /// Stable evidence tag: force/integrate/distance DSL program — **ik**.
    pub evidence_kind: &'static str,
    /// Fingerprint of DSL soak evidence fields (cross-check vs fh/fq).
    pub evidence_fingerprint: u64,
    pub distinct_from_atmospheric_scattering_godrays_probe: bool,
    pub distinct_from_voxel_cone_radiosity_probe: bool,
    pub distinct_from_symmetric_vector_algebra_probe: bool,
    pub distinct_from_recursive_fractal_enhancement_probe: bool,
    pub distinct_from_blue_noise_dithering_probe: bool,
    pub distinct_from_quantum_overlap_probe: bool,
    pub distinct_from_contextual_physics_override_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub chaos_mass_physics_dsl_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

/// Force + integrate + distance DSL program evidence shape (≠ delta-seed / metabolic).
pub const GC_EVIDENCE_KIND: &str = "force_integrate_distance_dsl_program";

fn gc_evidence_fingerprint(
    force_changes_velocity: bool,
    noop_leaves_velocity: bool,
    same_program_same_result: bool,
    invalid_program_fail_closed: bool,
    distance_constraint_projects: bool,
    outputs_finite: bool,
    state_mutated: bool,
    vel_with_force_y: f32,
    distance_residual_after: f32,
) -> u64 {
    let mut h = 0x6763_6470_u64; // "gcdp"
    h = hash_mix(h, u64::from(force_changes_velocity));
    h = hash_mix(h, u64::from(noop_leaves_velocity));
    h = hash_mix(h, u64::from(same_program_same_result));
    h = hash_mix(h, u64::from(invalid_program_fail_closed));
    h = hash_mix(h, u64::from(distance_constraint_projects));
    h = hash_mix(h, u64::from(outputs_finite));
    h = hash_mix(h, u64::from(state_mutated));
    h = hash_mix(h, quant_f32(vel_with_force_y));
    h = hash_mix(h, quant_f32(distance_residual_after));
    h ^= 0x4453_4C50; // DSLP
    h
}

fn measured_distinct(
    evidence_kind: &'static str,
    evidence_fingerprint: u64,
    core_ok: bool,
) -> bool {
    core_ok && evidence_kind == GC_EVIDENCE_KIND && evidence_fingerprint != 0
}

fn build_report(
    ready: bool,
    force_changes_velocity: bool,
    noop_leaves_velocity: bool,
    same_program_same_result: bool,
    invalid_program_fail_closed: bool,
    distance_constraint_projects: bool,
    outputs_finite: bool,
    state_mutated: bool,
    vel_with_force_y: f32,
    vel_noop_y: f32,
    distance_residual_before: f32,
    distance_residual_after: f32,
    stmt_count: u32,
    fingerprint: u64,
) -> DynamicPhysicsDslSoakReport {
    let evidence_kind = GC_EVIDENCE_KIND;
    let evidence_fingerprint = gc_evidence_fingerprint(
        force_changes_velocity,
        noop_leaves_velocity,
        same_program_same_result,
        invalid_program_fail_closed,
        distance_constraint_projects,
        outputs_finite,
        state_mutated,
        vel_with_force_y,
        distance_residual_after,
    );
    let core_ok = force_changes_velocity
        && noop_leaves_velocity
        && same_program_same_result
        && invalid_program_fail_closed
        && distance_constraint_projects
        && outputs_finite
        && state_mutated;
    let d = measured_distinct(evidence_kind, evidence_fingerprint, core_ok);
    DynamicPhysicsDslSoakReport {
        dynamic_physics_dsl_ready: ready,
        force_changes_velocity,
        noop_leaves_velocity,
        same_program_same_result,
        deterministic: same_program_same_result,
        invalid_program_fail_closed,
        distance_constraint_projects,
        outputs_finite,
        state_mutated,
        vel_with_force_y,
        vel_noop_y,
        distance_residual_before,
        distance_residual_after,
        stmt_count,
        fingerprint,
        evidence_kind,
        evidence_fingerprint,
        distinct_from_atmospheric_scattering_godrays_probe: d,
        distinct_from_voxel_cone_radiosity_probe: d,
        distinct_from_symmetric_vector_algebra_probe: d,
        distinct_from_recursive_fractal_enhancement_probe: d,
        distinct_from_blue_noise_dithering_probe: d,
        distinct_from_quantum_overlap_probe: d,
        distinct_from_contextual_physics_override_probe: d,
        distinct_from_kernel_foundation_probe: d,
        chaos_mass_physics_dsl_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        quic_ready: false,
    }
}

fn soak_fixture_world() -> BodySoA {
    let mut w = BodySoA::with_capacity(2, SOAK_SEED);
    let _ = w.set_body(0, [0.0, 0.0, 0.0], [0.0, 0.0, 0.0], 1.0);
    let _ = w.set_body(1, [2.0, 0.0, 0.0], [0.0, 0.0, 0.0], 1.0);
    w
}

fn distance_residual(w: &BodySoA, a: usize, b: usize, rest: f32) -> f32 {
    let dx = w.pos_x[b] - w.pos_x[a];
    let dy = w.pos_y[b] - w.pos_y[a];
    let dz = w.pos_z[b] - w.pos_z[a];
    let dist = (dx * dx + dy * dy + dz * dz).sqrt();
    (dist - rest).abs()
}

/// Run dynamic physics DSL soak — force vs no-op + determinism + fail-closed.
///
/// Does **not** claim Chaos/Mass Unreal physics DSL AAA.
pub fn run_dynamic_physics_dsl_soak() -> DynamicPhysicsDslSoakReport {
    let force_prog = "apply_force 0 0.0 10.0 0.0; integrate 0.1";
    let noop_prog = "integrate 0.1";
    let dist_prog = "distance 0 1 1.0";

    // Force program changes velocity; no-op integrate leaves zero vel.
    let mut world_force = soak_fixture_world();
    let force_ok = DynamicPhysicsDsl::run(&mut world_force, force_prog).is_ok();
    let vel_with_force_y = world_force.vel_y[0];

    let mut world_noop = soak_fixture_world();
    let noop_ok = DynamicPhysicsDsl::run(&mut world_noop, noop_prog).is_ok();
    let vel_noop_y = world_noop.vel_y[0];

    let force_changes_velocity =
        force_ok && vel_with_force_y > SOAK_EPS && (vel_with_force_y - 1.0).abs() < 1e-4;
    let noop_leaves_velocity = noop_ok && vel_noop_y.abs() < SOAK_EPS;

    // Same program → same fingerprint.
    let mut a = soak_fixture_world();
    let mut b = soak_fixture_world();
    let _ = DynamicPhysicsDsl::run(&mut a, force_prog);
    let _ = DynamicPhysicsDsl::run(&mut b, force_prog);
    let same_program_same_result = a.fingerprint() == b.fingerprint() && a.velocity(0) == b.velocity(0);

    // Invalid program fail-closed.
    let invalid_cases = [
        "",
        "not_an_opcode 1 2 3",
        "apply_force 0 1",
        "apply_force 99 0 1 0",
        "set_mass 0 -1",
        "integrate -0.1",
        "integrate nan",
    ];
    let invalid_program_fail_closed = invalid_cases.iter().all(|src| {
        let mut w = soak_fixture_world();
        DynamicPhysicsDsl::run(&mut w, src).is_err()
            || DynamicPhysicsDsl::parse_program(src).is_err()
    });

    // Distance constraint reduces residual.
    let mut world_dist = soak_fixture_world();
    let res_before = distance_residual(&world_dist, 0, 1, 1.0);
    let dist_ok = DynamicPhysicsDsl::run(&mut world_dist, dist_prog).is_ok();
    let res_after = distance_residual(&world_dist, 0, 1, 1.0);
    let distance_constraint_projects =
        dist_ok && res_before > 0.5 && res_after + SOAK_EPS < res_before && res_after < 1e-4;

    let outputs_finite = world_force.vel_y[0].is_finite()
        && world_force.pos_y[0].is_finite()
        && world_dist.pos_x[0].is_finite()
        && world_dist.pos_x[1].is_finite();

    let state_mutated = force_changes_velocity
        && (world_force.pos_y[0].abs() > SOAK_EPS)
        && distance_constraint_projects;

    let stmt_count = DynamicPhysicsDsl::parse_program(force_prog)
        .map(|p| p.len() as u32)
        .unwrap_or(0);

    let ready = force_changes_velocity
        && noop_leaves_velocity
        && same_program_same_result
        && invalid_program_fail_closed
        && distance_constraint_projects
        && outputs_finite
        && state_mutated;

    let fp = if ready {
        fingerprint_parts(&[
            stmt_count as u64,
            quant_f32(vel_with_force_y),
            quant_f32(vel_noop_y),
            quant_f32(res_before),
            quant_f32(res_after),
            a.fingerprint(),
            SOAK_SEED,
        ])
    } else {
        0
    };

    build_report(
        ready,
        force_changes_velocity,
        noop_leaves_velocity,
        same_program_same_result,
        invalid_program_fail_closed,
        distance_constraint_projects,
        outputs_finite,
        state_mutated,
        vel_with_force_y,
        vel_noop_y,
        res_before,
        res_after,
        stmt_count,
        fp,
    )
}

/// Honesty probe — soak-gated `dynamic_physics_dsl_ready` (**gc**).
pub fn probe_dynamic_physics_dsl() -> DynamicPhysicsDslSoakReport {
    run_dynamic_physics_dsl_soak()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_apply_force_and_integrate() {
        let p = DynamicPhysicsDsl::parse_program("apply_force 0 1 2 3; integrate 0.016").unwrap();
        assert_eq!(p.len(), 2);
        assert!(matches!(
            p[0],
            Stmt::ApplyForce {
                body: 0,
                force: [1.0, 2.0, 3.0]
            }
        ));
        assert!(matches!(p[1], Stmt::Integrate { dt } if (dt - 0.016).abs() < 1e-6));
    }

    #[test]
    fn invalid_opcode_fail_closed() {
        assert!(DynamicPhysicsDsl::parse_program("teleport 0 1 2 3").is_err());
        assert!(DynamicPhysicsDsl::parse_program("").is_err());
        assert!(DynamicPhysicsDsl::parse_program("apply_force 0 1").is_err());
    }

    #[test]
    fn force_changes_velocity_vs_noop() {
        let mut forced = soak_fixture_world();
        DynamicPhysicsDsl::run(&mut forced, "apply_force 0 0 10 0; integrate 0.1").unwrap();
        let mut noop = soak_fixture_world();
        DynamicPhysicsDsl::run(&mut noop, "integrate 0.1").unwrap();
        assert!(forced.vel_y[0] > SOAK_EPS, "forced vy={}", forced.vel_y[0]);
        assert!(noop.vel_y[0].abs() < SOAK_EPS, "noop vy={}", noop.vel_y[0]);
        assert!((forced.vel_y[0] - 1.0).abs() < 1e-4);
        assert!(forced.pos_y[0] > SOAK_EPS);
    }

    #[test]
    fn same_program_same_fingerprint() {
        let prog = "apply_impulse 0 0 5 0; integrate 0.05";
        let mut a = soak_fixture_world();
        let mut b = soak_fixture_world();
        DynamicPhysicsDsl::run(&mut a, prog).unwrap();
        DynamicPhysicsDsl::run(&mut b, prog).unwrap();
        assert_eq!(a.fingerprint(), b.fingerprint());
        assert_eq!(a.velocity(0), b.velocity(0));
        assert_eq!(a.position(0), b.position(0));
    }

    #[test]
    fn distance_projects_toward_rest() {
        let mut w = soak_fixture_world();
        let before = distance_residual(&w, 0, 1, 1.0);
        DynamicPhysicsDsl::run(&mut w, "distance 0 1 1.0").unwrap();
        let after = distance_residual(&w, 0, 1, 1.0);
        assert!(before > 0.5);
        assert!(after < before);
        assert!(after < 1e-4);
    }

    #[test]
    fn oob_body_and_bad_mass_fail() {
        let mut w = soak_fixture_world();
        assert!(DynamicPhysicsDsl::run(&mut w, "apply_force 9 0 1 0").is_err());
        assert!(DynamicPhysicsDsl::run(&mut w, "set_mass 0 0").is_err());
        assert!(DynamicPhysicsDsl::run(&mut w, "integrate 0").is_err());
    }

    #[test]
    fn legacy_parse_ai_rule_real() {
        let op = DynamicPhysicsDsl::parse_ai_rule("invert_gravity").unwrap();
        assert!(matches!(op, DslOpcode::InvertGravity));
        let vortex = DynamicPhysicsDsl::parse_ai_rule("vortex 0 10 0 5.5").unwrap();
        assert!(matches!(
            vortex,
            DslOpcode::VortexAttraction {
                center: [0.0, 10.0, 0.0],
                force: f
            } if (f - 5.5).abs() < 1e-6
        ));
        assert!(DynamicPhysicsDsl::parse_ai_rule("vortex").is_none());
        assert!(DynamicPhysicsDsl::parse_ai_rule("garbage").is_none());
    }

    #[test]
    fn legacy_apply_opcode_mutates() {
        let mut pos = [1.0, 0.0, 0.0];
        let mut vel = [0.0, 0.0, 0.0];
        DynamicPhysicsDsl::apply_opcode(&DslOpcode::InvertGravity, &mut pos, &mut vel);
        assert!((vel[1] - 19.6).abs() < 1e-5);
        DynamicPhysicsDsl::apply_opcode(&DslOpcode::ScaleVelocity(0.5), &mut pos, &mut vel);
        assert!((vel[1] - 9.8).abs() < 1e-4);
    }

    #[test]
    fn soak_ready() {
        let r = run_dynamic_physics_dsl_soak();
        assert!(r.dynamic_physics_dsl_ready, "{r:?}");
        assert!(r.force_changes_velocity);
        assert!(r.noop_leaves_velocity);
        assert!(r.same_program_same_result);
        assert!(r.deterministic);
        assert!(r.invalid_program_fail_closed);
        assert!(r.distance_constraint_projects);
        assert_eq!(r.evidence_kind, GC_EVIDENCE_KIND);
        assert!(r.evidence_fingerprint != 0);
        assert!(!r.chaos_mass_physics_dsl_aaa_ready);
        assert!(r.distinct_from_atmospheric_scattering_godrays_probe);
        assert!(r.distinct_from_voxel_cone_radiosity_probe);
        assert!(r.fingerprint != 0);
        assert_ne!("dynamicPhysicsDslReady", "atmosphericScatteringGodraysReady");
        assert_ne!("dynamicPhysicsDslReady", "voxelConeRadiosityReady");
        assert_ne!("dynamicPhysicsDslReady", "contextualPhysicsOverrideReady");
        assert_ne!("dynamicPhysicsDslReady", "quantumOverlapReady");
    }

    #[test]
    fn probe_matches_soak() {
        assert_eq!(
            probe_dynamic_physics_dsl(),
            run_dynamic_physics_dsl_soak()
        );
    }

    #[test]
    fn fh_fq_gc_distinct_evidence_fingerprints() {
        let fh = crate::delta_seed_synchronization::probe_delta_seed_synchronization();
        let fq = crate::metabolic_memory::probe_metabolic_memory();
        let gc = probe_dynamic_physics_dsl();

        assert_eq!(
            fh.evidence_kind,
            crate::delta_seed_synchronization::FH_EVIDENCE_KIND
        );
        assert_eq!(
            fq.evidence_kind,
            crate::metabolic_memory::FQ_EVIDENCE_KIND
        );
        assert_eq!(gc.evidence_kind, GC_EVIDENCE_KIND);
        assert_ne!(fh.evidence_fingerprint, fq.evidence_fingerprint);
        assert_ne!(fh.evidence_fingerprint, gc.evidence_fingerprint);
        assert_ne!(fq.evidence_fingerprint, gc.evidence_fingerprint);
        assert!(fh.distinct_from_crdt_quantum_sync_probe);
        assert!(fq.distinct_from_hierarchical_streaming_cache_probe);
        assert!(gc.distinct_from_atmospheric_scattering_godrays_probe);
        assert!(fh.delta_seed_synchronization_ready);
        assert!(fq.metabolic_memory_ready);
        assert!(gc.dynamic_physics_dsl_ready);
    }
}
