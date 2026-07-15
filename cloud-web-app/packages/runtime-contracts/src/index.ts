/**
 * Studio Local Runtime Contracts
 *
 * Shared, versioned contract between the cloud web runtime (browser/cloud-sandbox
 * execution) and the desktop Studio Local runtime (apps/studio-local, Tauri + Rust).
 * Both sides negotiate a safe execution target for a given job lane based on a
 * capability probe reported by the local device.
 *
 * This module intentionally contains no I/O: it is pure routing/validation logic
 * that both the web server and the desktop sidecar can import and agree on.
 */

export const STUDIO_LOCAL_CONTRACT_VERSION = 1 as const;

export const STUDIO_LOCAL_ENDPOINTS = {
  probe: '/api/runtime/probe',
  submitJob: '/api/runtime/jobs',
  jobStatus: '/api/runtime/jobs/:jobId',
} as const;

export const RUNTIME_JOB_LANES = ['playtest', 'export', 'build', 'simulation'] as const;
export type RuntimeJobLane = (typeof RUNTIME_JOB_LANES)[number];

/**
 * `held` is not a physical execution location: it means no target could be
 * safely auto-dispatched (heavy, approval-gated lane with an unmet sidecar
 * requirement) and the job must wait for a human to route it manually.
 */
export const RUNTIME_EXECUTION_TARGETS = ['cloud-sandbox', 'local-desktop', 'browser-wasm', 'held'] as const;
export type RuntimeExecutionTarget = (typeof RUNTIME_EXECUTION_TARGETS)[number];

export type RuntimeJobState =
  | 'queued'
  | 'awaiting-approval'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

export type RuntimeThermalState = 'nominal' | 'throttled' | 'critical';
export type RuntimeStoragePressure = 'ok' | 'low' | 'critical';

export interface LocalRuntimeProbeReport {
  version: typeof STUDIO_LOCAL_CONTRACT_VERSION;
  generatedAt: string;
  deviceId: string;
  os: string;
  arch: string;
  cpuLogicalCores: number;
  totalMemoryMb: number | null;
  availableMemoryMb: number;
  storageFreeMb: number | null;
  gpuAvailable: boolean;
  gpuName: string;
  webGpuAvailable: boolean;
  webNnAvailable: boolean;
  npuAvailable: boolean;
  windowsMlAvailable: boolean;
  directMlAvailable: boolean;
  onnxRuntimeAvailable: boolean;
  ffmpegAvailable: boolean;
  rapierAvailable: boolean;
  browserAutomationAvailable: boolean;
  thermalState: RuntimeThermalState;
  storagePressure: RuntimeStoragePressure;
  preferredExecutor: RuntimeExecutionTarget;
  signature: string;
}

export interface RuntimeJobRequest {
  lane: RuntimeJobLane;
  projectId: string;
  probe?: Partial<LocalRuntimeProbeReport>;
}

export interface RuntimeJobStatus {
  state: RuntimeJobState;
  lane: RuntimeJobLane;
  target: RuntimeExecutionTarget;
  updatedAt: string;
  message?: string;
}

/**
 * Capability flags on {@link LocalRuntimeProbeReport} required for each lane to be
 * eligible to run on `local-desktop`. An empty list means the lane has no hard
 * sidecar dependency and can run anywhere.
 */
export const RUNTIME_LANE_SIDECAR_REQUIREMENTS: Record<RuntimeJobLane, Array<keyof LocalRuntimeProbeReport>> = {
  playtest: ['browserAutomationAvailable'],
  export: ['ffmpegAvailable'],
  build: [],
  simulation: ['rapierAvailable'],
};

const HEAVY_RUNTIME_JOB_LANES = new Set<RuntimeJobLane>(['export', 'simulation']);
const APPROVAL_REQUIRED_LANES = new Set<RuntimeJobLane>(['playtest', 'export', 'simulation']);

export function isRuntimeJobLane(value: string): value is RuntimeJobLane {
  return (RUNTIME_JOB_LANES as readonly string[]).includes(value);
}

export function isRuntimeExecutionTarget(value: string): value is RuntimeExecutionTarget {
  return (RUNTIME_EXECUTION_TARGETS as readonly string[]).includes(value);
}

export function isHeavyRuntimeJobLane(lane: RuntimeJobLane): boolean {
  return HEAVY_RUNTIME_JOB_LANES.has(lane);
}

export function requiresHumanApprovalForLane(lane: RuntimeJobLane): boolean {
  return APPROVAL_REQUIRED_LANES.has(lane);
}

export function missingRuntimeSidecarsForLane(
  lane: RuntimeJobLane,
  probe: Pick<LocalRuntimeProbeReport, keyof LocalRuntimeProbeReport>
): string[] {
  const required = RUNTIME_LANE_SIDECAR_REQUIREMENTS[lane] ?? [];
  return required.filter((flag) => probe[flag] !== true);
}

/**
 * Chooses the safest execution target for a lane given a device capability probe.
 * Cloud sandbox is the default, conservative fallback whenever the local device is
 * thermally constrained, low on storage, or missing a required sidecar.
 */
export function resolveSafeRuntimeTarget(input: {
  lane: RuntimeJobLane;
  probe: LocalRuntimeProbeReport;
}): RuntimeExecutionTarget {
  const { lane, probe } = input;

  if (probe.thermalState === 'critical' || probe.storagePressure === 'critical') {
    return 'cloud-sandbox';
  }

  const missingSidecars = missingRuntimeSidecarsForLane(lane, probe).length > 0;
  if (missingSidecars) {
    if (isHeavyRuntimeJobLane(lane) && requiresHumanApprovalForLane(lane)) {
      return 'held';
    }
    return 'cloud-sandbox';
  }

  if (probe.preferredExecutor === 'local-desktop' && probe.os !== 'web') {
    return 'local-desktop';
  }

  if (probe.webGpuAvailable && probe.os === 'web') {
    return 'browser-wasm';
  }

  return 'cloud-sandbox';
}

/**
 * Builds the sidecar manifest a Studio Local install must satisfy to accept jobs
 * for every runtime lane. Consumed by the desktop installer/onboarding flow.
 */
export function buildRuntimeSidecarManifest(): Record<RuntimeJobLane, Array<keyof LocalRuntimeProbeReport>> {
  return { ...RUNTIME_LANE_SIDECAR_REQUIREMENTS };
}

/**
 * Builds the payload that Studio Local signs before syncing a job result back to
 * the cloud, binding the result to the exact contract version and probe signature
 * that produced it.
 */
export function buildRuntimeCloudSyncSigningPayload(
  status: RuntimeJobStatus,
  probe: Pick<LocalRuntimeProbeReport, 'deviceId' | 'signature'>
): {
  contractVersion: typeof STUDIO_LOCAL_CONTRACT_VERSION;
  deviceId: string;
  deviceSignature: string;
  lane: RuntimeJobLane;
  target: RuntimeExecutionTarget;
  state: RuntimeJobState;
  updatedAt: string;
} {
  return {
    contractVersion: STUDIO_LOCAL_CONTRACT_VERSION,
    deviceId: probe.deviceId,
    deviceSignature: probe.signature,
    lane: status.lane,
    target: status.target,
    state: status.state,
    updatedAt: status.updatedAt,
  };
}
