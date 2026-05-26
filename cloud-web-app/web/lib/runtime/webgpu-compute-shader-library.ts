import type { WebGPUComputeLane } from './webgpu-compute-readiness'

export type WebGPUComputeShaderId =
  | 'meshlet-frustum-cull-v1'
  | 'tiled-light-list-v1'
  | 'material-pbr-preflight-v1'

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

  for (const lane of ['meshlet-culling-preview', 'light-culling-preview', 'material-preflight'] as WebGPUComputeLane[]) {
    if (!lanes.includes(lane)) failures.push(`${lane}: missing shader coverage`)
  }

  return {
    valid: failures.length === 0,
    shaderCount: shaders.length,
    lanes,
    failures,
  }
}
