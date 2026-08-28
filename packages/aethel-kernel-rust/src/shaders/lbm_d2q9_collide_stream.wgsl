// GPU LBM D2Q9 collide + stream — race-free GATHER formulation.
//
// Mirrors `lattice_boltzmann_fluid_solver::LatticeBoltzmannFluidGrid::step()`
// (CPU PUSH streaming) exactly. The CPU pushes population q from a source cell
// to its neighbor — multiple sources may target the same destination, which
// would data-race on a GPU. This shader inverts to PULL per cell `i` and
// population `q`, so each thread writes ONLY its own cell:
//
//   f_new[q][i] =
//       direct stream from upstream s = (x - CX[q], y - CY[q])  if s in-bounds
//           AND s is fluid (solid sources take the copy branch, they never push)
//     + self bounce-back: if d = (x + CX[OPP[q]], y + CY[OPP[q]]) is
//           out-of-bounds OR solid, add f_in[OPP[q]][i]
//
// This is proven cell-by-cell equivalent to the CPU PUSH formulation, including
// the rest population (q = 0 stays f_in[0][i]) and wall-adjacent bounce-back.
//
// Solid-cell parity: the CPU post-stream macro refresh zeroes solid vx/vy but
// NEVER touches solid rho (it stays at its init value 1.0). This shader
// reproduces exactly that — solid rho is not written in `main_stream`.
//
// Two entry points share one module / one bind-group layout:
//   main_collide  (f -> f_tmp, BGK relax on fluid cells, copy on solids)
//   main_stream   (f_tmp -> f, race-free GATHER, then macro refresh)

struct Params {
    width: u32,
    height: u32,
    n: u32,
    omega: f32,
};

struct FArray {
    data: array<f32>,
};

struct U32Array {
    data: array<u32>,
};

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> f_in: FArray;
@group(0) @binding(2) var<storage, read_write> f_out: FArray;
@group(0) @binding(3) var<storage, read> solid: U32Array;
@group(0) @binding(4) var<storage, read_write> rho_out: FArray;
@group(0) @binding(5) var<storage, read_write> vx_out: FArray;
@group(0) @binding(6) var<storage, read_write> vy_out: FArray;

// D2Q9 discrete velocities (rest, E, N, W, S, NE, NW, SW, SE).
const CX: array<i32, 9> = array<i32, 9>(0, 1, 0, -1, 0, 1, -1, -1, 1);
const CY: array<i32, 9> = array<i32, 9>(0, 0, 1, 0, -1, 1, 1, -1, -1);
const W: array<f32, 9> = array<f32, 9>(
    4.0 / 9.0,
    1.0 / 9.0,
    1.0 / 9.0,
    1.0 / 9.0,
    1.0 / 9.0,
    1.0 / 36.0,
    1.0 / 36.0,
    1.0 / 36.0,
    1.0 / 36.0,
);
// Opposite direction for bounce-back.
const OPP: array<u32, 9> = array<u32, 9>(0, 3, 4, 1, 2, 7, 8, 5, 6);

// One BGK collide step (fluid cells only; solid cells copy f -> f_tmp).
// NOTE: deliberately does NOT write rho/vx/vy — the CPU collide does write them,
// but the post-stream macro refresh overwrites them, so only the stream refresh
// matters for post-step macro parity.
@compute @workgroup_size(64)
fn main_collide(@builtin(global_invocation_id) gid: vec3<u32>) {
    let i = gid.x;
    if (i >= params.n) {
        return;
    }
    if (solid.data[i] != 0u) {
        for (var q = 0u; q < 9u; q = q + 1u) {
            f_out.data[q * params.n + i] = f_in.data[q * params.n + i];
        }
        return;
    }
    var rho = 0.0;
    var ux = 0.0;
    var uy = 0.0;
    for (var q = 0u; q < 9u; q = q + 1u) {
        let fi = f_in.data[q * params.n + i];
        rho = rho + fi;
        ux = ux + f32(CX[q]) * fi;
        uy = uy + f32(CY[q]) * fi;
    }
    if (rho > 1e-8) {
        ux = ux / rho;
        uy = uy / rho;
    } else {
        ux = 0.0;
        uy = 0.0;
    }
    let usqr = ux * ux + uy * uy;
    for (var q = 0u; q < 9u; q = q + 1u) {
        let fi = f_in.data[q * params.n + i];
        let cu = f32(CX[q]) * ux + f32(CY[q]) * uy;
        let feq = W[q] * rho * (1.0 + 3.0 * cu + 4.5 * cu * cu - 1.5 * usqr);
        f_out.data[q * params.n + i] = fi - params.omega * (fi - feq);
    }
}

// Stream + bounce-back (race-free GATHER), then macro refresh.
// Each thread owns cell `i` and writes ONLY cell `i` (no atomics, no
// cross-thread writes). Two sequential passes (collide then stream) give an
// implicit barrier at the pass boundary, so f_tmp writes are visible here.
@compute @workgroup_size(64)
fn main_stream(@builtin(global_invocation_id) gid: vec3<u32>) {
    let i = gid.x;
    if (i >= params.n) {
        return;
    }
    let w = params.width;
    let h = params.height;
    let x = i % w;
    let y = i / w;

    if (solid.data[i] != 0u) {
        // Solid: copy populations back; zero velocity; rho untouched (CPU parity).
        for (var q = 0u; q < 9u; q = q + 1u) {
            f_out.data[q * params.n + i] = f_in.data[q * params.n + i];
        }
        vx_out.data[i] = 0.0;
        vy_out.data[i] = 0.0;
        return;
    }

    // Gather populations for cell i (PULL formulation).
    for (var q = 0u; q < 9u; q = q + 1u) {
        var acc = 0.0;
        // Direct stream from upstream source s = i - C[q].
        let sx = i32(x) - CX[q];
        let sy = i32(y) - CY[q];
        if (sx >= 0 && sy >= 0 && sx < i32(w) && sy < i32(h)) {
            let s = sy * i32(w) + sx;
            if (solid.data[u32(s)] == 0u) {
                acc = acc + f_in.data[q * params.n + u32(s)];
            }
        }
        // Self bounce-back: population OPP[q] whose destination d = i + C[OPP[q]]
        // is out-of-bounds or solid.
        let r = OPP[q];
        let dx = i32(x) + CX[r];
        let dy = i32(y) + CY[r];
        if (dx < 0 || dy < 0 || dx >= i32(w) || dy >= i32(h)) {
            acc = acc + f_in.data[r * params.n + i];
        } else {
            let d = dy * i32(w) + dx;
            if (solid.data[u32(d)] != 0u) {
                acc = acc + f_in.data[r * params.n + i];
            }
        }
        f_out.data[q * params.n + i] = acc;
    }

    // Final macro refresh (matches CPU stream refresh: solid rho untouched and
    // solid vx/vy zeroed — handled above; fluid recomputed here).
    var rho = 0.0;
    var ux = 0.0;
    var uy = 0.0;
    for (var q = 0u; q < 9u; q = q + 1u) {
        let fi = f_out.data[q * params.n + i];
        rho = rho + fi;
        ux = ux + f32(CX[q]) * fi;
        uy = uy + f32(CY[q]) * fi;
    }
    if (rho > 1e-8) {
        ux = ux / rho;
        uy = uy / rho;
    } else {
        ux = 0.0;
        uy = 0.0;
    }
    rho_out.data[i] = rho;
    vx_out.data[i] = ux;
    vy_out.data[i] = uy;
}
