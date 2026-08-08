struct Particle {
    pos: vec4<f32>,
    prev_pos: vec4<f32>,
    vel: vec4<f32>,
    inv_mass: f32,
    _pad: vec3<f32>,
};

struct Constraint {
    i: u32,
    j: u32,
    rest_length: f32,
    compliance: f32,
};

struct SimulationParams {
    dt: f32,
    gravity: vec3<f32>,
    num_particles: u32,
    num_constraints: u32,
};

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<storage, read> constraints: array<Constraint>;
@group(0) @binding(2) var<uniform> params: SimulationParams;

// Step 1: Predict positions
@compute @workgroup_size(256)
fn predict_positions(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let id = global_id.x;
    if (id >= params.num_particles) {
        return;
    }

    var p = particles[id];
    if (p.inv_mass > 0.0) {
        p.vel = p.vel + vec4<f32>(params.gravity, 0.0) * params.dt;
        p.prev_pos = p.pos;
        p.pos = p.pos + p.vel * params.dt;
        particles[id] = p;
    }
}

// Step 2: Solve distance constraints (XPBD)
// Note: In a real AAA implementation, graph coloring is needed to avoid race conditions.
// We assume constraints are dispatched in non-overlapping batches (colors).
@compute @workgroup_size(256)
fn solve_constraints(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let id = global_id.x;
    if (id >= params.num_constraints) {
        return;
    }

    let c = constraints[id];
    var p0 = particles[c.i];
    var p1 = particles[c.j];

    let w0 = p0.inv_mass;
    let w1 = p1.inv_mass;
    let w = w0 + w1;
    if (w == 0.0) {
        return;
    }

    let dir = p0.pos.xyz - p1.pos.xyz;
    let len = length(dir);
    if (len < 0.0001) {
        return;
    }

    let diff = len - c.rest_length;
    let alpha_tilde = c.compliance / (params.dt * params.dt);
    
    // lambda update
    let dlambda = -diff / (w + alpha_tilde);
    let dp = (dir / len) * dlambda;

    if (w0 > 0.0) {
        p0.pos = p0.pos + vec4<f32>(dp * w0, 0.0);
        particles[c.i] = p0;
    }
    if (w1 > 0.0) {
        p1.pos = p1.pos - vec4<f32>(dp * w1, 0.0);
        particles[c.j] = p1;
    }
}

// Step 3: Update velocities
@compute @workgroup_size(256)
fn update_velocities(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let id = global_id.x;
    if (id >= params.num_particles) {
        return;
    }

    var p = particles[id];
    if (p.inv_mass > 0.0) {
        p.vel = (p.pos - p.prev_pos) / params.dt;
        particles[id] = p;
    }
}
