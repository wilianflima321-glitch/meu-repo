import {
  requiresHumanApprovalForLane,
  resolveSafeRuntimeTarget,
  STUDIO_LOCAL_CONTRACT_VERSION,
  type LocalRuntimeProbeReport,
  type RuntimeExecutionTarget,
  type RuntimeJobLane,
} from '@/lib/runtime/runtime-contracts-bridge';

export type PlaytestJobRequest = {
  projectId: string;
  missionId?: string;
  title?: string;
  probe?: Partial<LocalRuntimeProbeReport>;
};

export type PlaytestJobPlan = {
  version: typeof STUDIO_LOCAL_CONTRACT_VERSION;
  lane: RuntimeJobLane;
  target: RuntimeExecutionTarget;
  requiresHumanApproval: boolean;
  evidenceRequired: string[];
  scopeLock: {
    mode: 'read-only';
    allowedPaths: string[];
    deniedPaths: string[];
    reason: string;
  };
};

export function buildPlaytestJobPlan(input: PlaytestJobRequest): PlaytestJobPlan {
  const probe: LocalRuntimeProbeReport = {
    version: STUDIO_LOCAL_CONTRACT_VERSION,
    generatedAt: new Date().toISOString(),
    deviceId: input.probe?.deviceId ?? 'cloud-web',
    os: input.probe?.os ?? 'web',
    arch: input.probe?.arch ?? 'wasm',
    cpuLogicalCores: input.probe?.cpuLogicalCores ?? 4,
    totalMemoryMb: input.probe?.totalMemoryMb ?? null,
    availableMemoryMb: input.probe?.availableMemoryMb ?? 4096,
    storageFreeMb: input.probe?.storageFreeMb ?? null,
    gpuAvailable: input.probe?.gpuAvailable ?? true,
    gpuName: input.probe?.gpuName ?? 'WebGL/WebGPU',
    webGpuAvailable: input.probe?.webGpuAvailable ?? false,
    webNnAvailable: input.probe?.webNnAvailable ?? false,
    npuAvailable: input.probe?.npuAvailable ?? false,
    windowsMlAvailable: input.probe?.windowsMlAvailable ?? false,
    directMlAvailable: input.probe?.directMlAvailable ?? false,
    onnxRuntimeAvailable: input.probe?.onnxRuntimeAvailable ?? false,
    ffmpegAvailable: input.probe?.ffmpegAvailable ?? false,
    rapierAvailable: input.probe?.rapierAvailable ?? true,
    browserAutomationAvailable: input.probe?.browserAutomationAvailable ?? false,
    thermalState: input.probe?.thermalState ?? 'nominal',
    storagePressure: input.probe?.storagePressure ?? 'ok',
    preferredExecutor: input.probe?.preferredExecutor ?? 'cloud-sandbox',
    signature: input.probe?.signature ?? 'unsigned-cloud-probe',
  };

  const lane: RuntimeJobLane = 'playtest';
  const target = resolveSafeRuntimeTarget({ lane, probe });
  const requiresHumanApproval = requiresHumanApprovalForLane(lane);

  return {
    version: STUDIO_LOCAL_CONTRACT_VERSION,
    lane,
    target,
    requiresHumanApproval,
    evidenceRequired: ['test-log', 'screenshot', 'video', 'playtest'],
    scopeLock: {
      mode: 'read-only',
      allowedPaths: [`projects/${input.projectId}/playtest/**`],
      deniedPaths: ['**/production/**', '**/billing/**'],
      reason: 'Playtest lane stays read-only until human approval promotes artifacts.',
    },
  };
}
