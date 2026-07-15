import type { WebGPUComputeLane } from './webgpu-compute-readiness'

export type WebGPUComputeShaderId =
  | 'meshlet-frustum-cull-v1'
  | 'tiled-light-list-v1'
  | 'material-pbr-preflight-v1'
  | 'dual-quaternion-skin-v1'
  | 'navmesh-heightfield-walkable-v1'
  | 'ocean-fft-displacement-v1'
  | 'entropy-fracture-debris-v1'
  | 'mass-ecs-agent-step-v1'

export type WebGPUComputeShaderSpec = {
  id: WebGPUComputeShaderId
  lane: WebGPUComputeLane
  label: string
  workgroupSize: number
  status: 'spec-ready' | 'held'
  requiredEvidence: string[]
  wgsl: string
}

export type WebGPUComputeShaderLibraryValidation = {
  valid: boolean
  shaderCount: number
  lanes: WebGPUComputeLane[]
  failures: string[]
}

export const AETHEL_WEBGPU_COMPUTE_SHADER_LIBRARY: WebGPUComputeShaderSpec[] = [
  {
    id: 'meshlet-frustum-cull-v1',
    lane: 'meshlet-culling-preview',
    label: 'Meshlet frustum culling preview',
    workgroupSize: 64,
    status: 'spec-ready',
    requiredEvidence: ['GPUDevice', 'GPUSupportedLimits', 'WGSL shader validation', 'viewport performance trace'],
    wgsl: `
struct Meshlet {
  center_radius: vec4<f32>,
  lod_and_triangles: vec4<u32>,
};

struct Camera {
  frustum: array<vec4<f32>, 6>,
};

@group(0) @binding(0) var<storage, read> meshlets: array<Meshlet>;
@group(0) @binding(1) var<storage, read_write> visibleMeshlets: array<u32>;
@group(0) @binding(2) var<storage, read_write> visibleCount: atomic<u32>;
@group(0) @binding(3) var<uniform> camera: Camera;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let meshletIndex = global_id.x;
  if (meshletIndex >= arrayLength(&meshlets)) {
    return;
  }

  let sphere = meshlets[meshletIndex].center_radius;
  var visible = true;
  for (var planeIndex: u32 = 0u; planeIndex < 6u; planeIndex = planeIndex + 1u) {
    let plane = camera.frustum[planeIndex];
    let distance = dot(plane.xyz, sphere.xyz) + plane.w;
    if (distance + sphere.w < 0.0) {
      visible = false;
      break;
    }
  }

  if (visible) {
    let outputIndex = atomicAdd(&visibleCount, 1u);
    visibleMeshlets[outputIndex] = meshletIndex;
  }
}
`,
  },
  {
    id: 'tiled-light-list-v1',
    lane: 'light-culling-preview',
    label: 'Tiled light list preview',
    workgroupSize: 64,
    status: 'spec-ready',
    requiredEvidence: ['GPUDevice', 'storage buffer limits', 'lighting validation capture', 'viewport performance trace'],
    wgsl: `
struct Light {
  position_radius: vec4<f32>,
  color_intensity: vec4<f32>,
};

struct Tile {
  min_xy: vec2<f32>,
  max_xy: vec2<f32>,
};

@group(0) @binding(0) var<storage, read> lights: array<Light>;
@group(0) @binding(1) var<storage, read> tiles: array<Tile>;
@group(0) @binding(2) var<storage, read_write> tileLightCounts: array<atomic<u32>>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let lightIndex = global_id.x;
  let tileIndex = global_id.y;
  if (lightIndex >= arrayLength(&lights) || tileIndex >= arrayLength(&tiles)) {
    return;
  }

  let light = lights[lightIndex].position_radius;
  let tile = tiles[tileIndex];
  let clamped = clamp(light.xy, tile.min_xy, tile.max_xy);
  let delta = light.xy - clamped;
  if (dot(delta, delta) <= light.w * light.w) {
    _ = atomicAdd(&tileLightCounts[tileIndex], 1u);
  }
}
`,
  },
  {
    id: 'material-pbr-preflight-v1',
    lane: 'material-preflight',
    label: 'PBR material preflight preview',
    workgroupSize: 64,
    status: 'spec-ready',
    requiredEvidence: ['GPUDevice', 'texture metadata', 'PBR validation report', 'human material review'],
    wgsl: `
struct MaterialStats {
  baseColorAssigned: u32,
  normalAssigned: u32,
  metallicRoughnessAssigned: u32,
  emissiveAssigned: u32,
};

@group(0) @binding(0) var<storage, read> materialStats: array<MaterialStats>;
@group(0) @binding(1) var<storage, read_write> issueCounts: array<atomic<u32>>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let materialIndex = global_id.x;
  if (materialIndex >= arrayLength(&materialStats)) {
    return;
  }

  let stats = materialStats[materialIndex];
  if (stats.baseColorAssigned == 0u) {
    _ = atomicAdd(&issueCounts[0], 1u);
  }
  if (stats.normalAssigned == 0u) {
    _ = atomicAdd(&issueCounts[1], 1u);
  }
  if (stats.metallicRoughnessAssigned == 0u) {
    _ = atomicAdd(&issueCounts[2], 1u);
  }
}
`,
  },
  {
    id: 'dual-quaternion-skin-v1',
    lane: 'dual-quaternion-skinning-preview',
    label: 'Dual-quaternion skinning preview',
    workgroupSize: 64,
    status: 'spec-ready',
    requiredEvidence: [
      'GPUDevice',
      'Motion Matching bone DQ storage buffer',
      'WGSL shader validation',
      'viewport performance trace',
    ],
    wgsl: `
struct DualQuat {
  real: vec4<f32>,
  dual: vec4<f32>,
};

struct SkinVertex {
  position: vec4<f32>,
  normal: vec4<f32>,
  bone_indices: vec4<u32>,
  bone_weights: vec4<f32>,
};

struct SkinnedVertex {
  position: vec4<f32>,
  normal: vec4<f32>,
};

fn quat_mul(a: vec4<f32>, b: vec4<f32>) -> vec4<f32> {
  return vec4<f32>(
    a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z
  );
}

fn dq_normalize(dq: DualQuat) -> DualQuat {
  let inv = 1.0 / max(length(dq.real), 1e-8);
  return DualQuat(dq.real * inv, dq.dual * inv);
}

fn transform_point_dq(dq: DualQuat, p: vec3<f32>) -> vec3<f32> {
  let q0 = dq.real;
  let qe = dq.dual;
  let d0 = vec3<f32>(q0.x, q0.y, q0.z);
  let de = vec3<f32>(qe.x, qe.y, qe.z);
  let rotated = p + 2.0 * cross(d0, cross(d0, p) + q0.w * p);
  let translation = 2.0 * (q0.w * de - qe.w * d0 + cross(d0, de));
  return rotated + translation;
}

fn transform_normal_dq(dq: DualQuat, n: vec3<f32>) -> vec3<f32> {
  let q0 = dq.real;
  let d0 = vec3<f32>(q0.x, q0.y, q0.z);
  return n + 2.0 * cross(d0, cross(d0, n) + q0.w * n);
}

@group(0) @binding(0) var<storage, read> bone_dqs: array<DualQuat>;
@group(0) @binding(1) var<storage, read> vertices: array<SkinVertex>;
@group(0) @binding(2) var<storage, read_write> skinned: array<SkinnedVertex>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let vertex_index = global_id.x;
  if (vertex_index >= arrayLength(&vertices)) {
    return;
  }

  let v = vertices[vertex_index];
  var blended = DualQuat(vec4<f32>(0.0), vec4<f32>(0.0));
  var has_bone = false;

  for (var i: u32 = 0u; i < 4u; i = i + 1u) {
    let w = v.bone_weights[i];
    if (w <= 0.0) {
      continue;
    }
    var bone = bone_dqs[v.bone_indices[i]];
    if (has_bone && dot(blended.real, bone.real) < 0.0) {
      bone = DualQuat(-bone.real, -bone.dual);
    }
    blended = DualQuat(blended.real + bone.real * w, blended.dual + bone.dual * w);
    has_bone = true;
  }

  if (!has_bone) {
    blended = DualQuat(vec4<f32>(0.0, 0.0, 0.0, 1.0), vec4<f32>(0.0));
  } else {
    blended = dq_normalize(blended);
  }

  let pos = transform_point_dq(blended, v.position.xyz);
  let nrm = normalize(transform_normal_dq(blended, v.normal.xyz));
  skinned[vertex_index] = SkinnedVertex(vec4<f32>(pos, 1.0), vec4<f32>(nrm, 0.0));
}
`,
  },
  {
    id: 'navmesh-heightfield-walkable-v1',
    lane: 'navmesh-heightfield-walkable-preview',
    label: 'NavMesh heightfield → walkable preview (GPU Recast soak)',
    workgroupSize: 64,
    status: 'spec-ready',
    requiredEvidence: [
      'GPUDevice',
      'heightfield storage buffer',
      'WGSL shader validation',
      'navmesh soak dispatch evidence',
    ],
    wgsl: `
struct NavParams {
  resolution: u32,
  height_res: u32,
  width_meters: f32,
  depth_meters: f32,
  max_height: f32,
  max_slope: f32,
  abyss_max: f32,
  _pad: f32,
};

@group(0) @binding(0) var<storage, read> heights: array<f32>;
@group(0) @binding(1) var<uniform> params: NavParams;
@group(0) @binding(2) var<storage, read_write> walkable: array<u32>;
@group(0) @binding(3) var<storage, read_write> out_heights: array<f32>;

fn sample_height(u: f32, v: f32) -> f32 {
  let res = f32(params.height_res);
  let x = clamp(u, 0.0, 1.0) * (res - 1.0);
  let z = clamp(v, 0.0, 1.0) * (res - 1.0);
  let x0 = u32(floor(x));
  let z0 = u32(floor(z));
  let x1 = min(params.height_res - 1u, x0 + 1u);
  let z1 = min(params.height_res - 1u, z0 + 1u);
  let tx = x - f32(x0);
  let tz = z - f32(z0);
  let h00 = heights[z0 * params.height_res + x0];
  let h10 = heights[z0 * params.height_res + x1];
  let h01 = heights[z1 * params.height_res + x0];
  let h11 = heights[z1 * params.height_res + x1];
  return mix(mix(h00, h10, tx), mix(h01, h11, tx), tz);
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let cell_index = global_id.x;
  let res = params.resolution;
  if (cell_index >= res * res) {
    return;
  }

  let x = cell_index % res;
  let z = cell_index / res;
  let u = (f32(x) + 0.5) / f32(res);
  let v = (f32(z) + 0.5) / f32(res);
  let h = sample_height(u, v);
  let hx = sample_height(min(1.0, u + 1.0 / f32(res)), v);
  let hz = sample_height(u, min(1.0, v + 1.0 / f32(res)));
  let cell_w = params.width_meters / f32(res);
  let cell_d = params.depth_meters / f32(res);
  let slope_x = abs(hx - h) / max(1e-4, cell_w / params.max_height);
  let slope_z = abs(hz - h) / max(1e-4, cell_d / params.max_height);
  let slope = max(slope_x, slope_z);
  let is_walkable = h >= params.abyss_max && slope <= params.max_slope;
  walkable[cell_index] = select(0u, 1u, is_walkable);
  out_heights[cell_index] = h * params.max_height;
}
`,
  },
  {
    id: 'ocean-fft-displacement-v1',
    lane: 'ocean-fft-displacement-preview',
    label: 'Ocean FFT displacement preview (GPU inverse DFT)',
    workgroupSize: 64,
    status: 'spec-ready',
    requiredEvidence: [
      'GPUDevice',
      'ocean spectrum storage buffer',
      'WGSL shader validation',
      'ocean GPU FFT soak dispatch evidence',
    ],
    wgsl: `
struct OceanFftParams {
  resolution: u32,
  _pad0: u32,
  _pad1: u32,
  _pad2: u32,
  wind_speed: f32,
  wind_angle: f32,
  amplitude: f32,
  seed: f32,
};

@group(0) @binding(0) var<storage, read> spectrum: array<vec2<f32>>;
@group(0) @binding(1) var<uniform> params: OceanFftParams;
@group(0) @binding(2) var<storage, read_write> heights: array<f32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let n = params.resolution;
  let out_index = global_id.x;
  if (out_index >= n * n) {
    return;
  }

  let x = out_index % n;
  let y = out_index / n;
  var sum_re = 0.0;
  let inv_n = 1.0 / f32(n);
  let two_pi = 6.28318530718;

  for (var ky: u32 = 0u; ky < n; ky = ky + 1u) {
    for (var kx: u32 = 0u; kx < n; kx = kx + 1u) {
      let spec = spectrum[ky * n + kx];
      let ang = two_pi * inv_n * (f32(kx) * f32(x) + f32(ky) * f32(y));
      let c = cos(ang);
      let s = sin(ang);
      // Inverse DFT real part (CPU fft2d inverse divides by n per axis → /n²).
      sum_re = sum_re + (spec.x * c - spec.y * s) * inv_n * inv_n;
    }
  }

  heights[out_index] = sum_re;
}
`,
  },
  {
    id: 'entropy-fracture-debris-v1',
    lane: 'entropy-fracture-debris-preview',
    label: 'Entropy hierarchical fracture debris integrate (GPU)',
    workgroupSize: 64,
    status: 'spec-ready',
    requiredEvidence: [
      'GPUDevice',
      'fracture debris SoA storage buffer',
      'WGSL shader validation',
      'GPU fracture soak dispatch evidence',
    ],
    wgsl: `
struct FractureParams {
  count: u32,
  dt: f32,
  gravity: f32,
  damping: f32,
};

@group(0) @binding(0) var<storage, read_write> positions: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read_write> velocities: array<vec4<f32>>;
@group(0) @binding(2) var<uniform> params: FractureParams;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let i = global_id.x;
  if (i >= params.count) {
    return;
  }
  var p = positions[i];
  var v = velocities[i];
  // Heavy debris particle integrate — CPU must not sim 10k fragments.
  v.y = v.y + params.gravity * params.dt;
  v = v * (1.0 - params.damping * params.dt);
  p = p + vec4<f32>(v.xyz * params.dt, 0.0);
  // Ground plane bounce (chaos-killer posture — simple, GPU-only)
  if (p.y < 0.0) {
    p.y = 0.0;
    v.y = abs(v.y) * 0.35;
  }
  positions[i] = p;
  velocities[i] = v;
}
`,
  },
  {
    id: 'mass-ecs-agent-step-v1',
    lane: 'mass-ecs-agent-step-preview',
    label: 'GPU Mass ECS agent step (pos/vel/state SoA)',
    workgroupSize: 64,
    status: 'spec-ready',
    requiredEvidence: [
      'GPUDevice',
      'Mass ECS SoA storage buffer',
      'WGSL shader validation',
      'GPU Mass ECS soak dispatch evidence',
    ],
    wgsl: `
struct MassParams {
  count: u32,
  dt: f32,
  seek_gain: f32,
  max_speed: f32,
};

@group(0) @binding(0) var<storage, read_write> positions: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read_write> velocities: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read_write> states: array<u32>;
@group(0) @binding(3) var<uniform> params: MassParams;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let i = global_id.x;
  if (i >= params.count) {
    return;
  }
  // One compute formula — no per-NPC JS Update scripts.
  let st = states[i];
  if (st == 0u) {
    return; // inactive
  }
  var p = positions[i];
  var v = velocities[i];
  // Seek toward origin lane with capped speed (crowd wander formula)
  let to_origin = -p.xyz;
  let dist = length(to_origin) + 1e-5;
  let desired = (to_origin / dist) * params.max_speed * params.seek_gain;
  v = vec4<f32>(mix(v.xyz, desired, clamp(params.dt * 2.0, 0.0, 1.0)), v.w);
  let speed = length(v.xyz);
  if (speed > params.max_speed) {
    v = vec4<f32>(v.xyz * (params.max_speed / speed), v.w);
  }
  p = vec4<f32>(p.xyz + v.xyz * params.dt, p.w);
  positions[i] = p;
  velocities[i] = v;
}
`,
  },
]

export function validateWebGPUComputeShaderLibrary(
  shaders: WebGPUComputeShaderSpec[] = AETHEL_WEBGPU_COMPUTE_SHADER_LIBRARY,
): WebGPUComputeShaderLibraryValidation {
  const failures: string[] = []
  const lanes = Array.from(new Set(shaders.map((shader) => shader.lane)))

  for (const shader of shaders) {
    if (!shader.wgsl.includes('@compute')) failures.push(`${shader.id}: missing @compute entry`)
    if (!shader.wgsl.includes(`@workgroup_size(${shader.workgroupSize})`)) {
      failures.push(`${shader.id}: workgroup size does not match declared metadata`)
    }
    if (shader.requiredEvidence.length < 3) failures.push(`${shader.id}: evidence requirements are too shallow`)
    if (/todo|fake|placeholder/i.test(shader.wgsl)) failures.push(`${shader.id}: shader source contains non-production placeholder copy`)
    if (shader.status !== 'spec-ready') failures.push(`${shader.id}: shader is not spec-ready`)
  }

  for (const lane of [
    'meshlet-culling-preview',
    'light-culling-preview',
    'material-preflight',
    'dual-quaternion-skinning-preview',
    'navmesh-heightfield-walkable-preview',
    'ocean-fft-displacement-preview',
    'entropy-fracture-debris-preview',
    'mass-ecs-agent-step-preview',
  ] as WebGPUComputeLane[]) {
    if (!lanes.includes(lane)) failures.push(`${lane}: missing shader coverage`)
  }

  return {
    valid: failures.length === 0,
    shaderCount: shaders.length,
    lanes,
    failures,
  }
}
