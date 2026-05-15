import type { LocalRuntimeCapabilityReport } from '@/lib/device/local-runtime-bridge'
import type { ViewportRenderJobContract } from '@/lib/viewport/viewport-render-contract'

export type RuntimeEngineExecutionTarget = 'browser-preview' | 'local-native' | 'cloud-sandbox' | 'held'
export type RuntimeEngineBackendKind = 'three-r3f-preview' | 'three-webgpu-preview' | 'wgpu-native' | 'cloud-renderer' | 'none'
export type RuntimeEngineStatus = 'ready' | 'review' | 'fallback' | 'held'
export type RuntimeEngineToolCategory =
  | 'asset'
  | 'media'
  | 'shader'
  | 'renderer'
  | 'dcc'
  | 'navmesh'
  | 'physics'
  | 'animation'
  | 'export'
export type RuntimeEngineToolchainStatus = 'optional' | 'required-for-final' | 'detected' | 'missing'
export type RuntimeEngineAssetStage =
  | 'metadata'
  | 'license'
  | 'thumbnail'
  | 'proxy'
  | 'lod'
  | 'compression'
  | 'budget'
  | 'read-receipt'

export interface RuntimeEngineToolchainProbe {
  command: string
  args: string[]
  expectedExitCode: 0
}

export interface RuntimeEngineToolchainEntry {
  id: string
  label: string
  category: RuntimeEngineToolCategory
  executable: string
  homepage: string
  license: string
  licenseUrl: string
  probe: RuntimeEngineToolchainProbe
  versionArgs: string[]
  checksumPolicy: 'sha256-required-before-execution'
  downloadPolicy: 'manual-consent-only'
  status: RuntimeEngineToolchainStatus
  provides: string[]
}

export interface RuntimeEngineRenderBackendContract {
  version: 1
  contractId: string
  quality: ViewportRenderJobContract['quality']
  renderMode: ViewportRenderJobContract['renderMode']
  target: RuntimeEngineExecutionTarget
  backendKind: RuntimeEngineBackendKind
  status: RuntimeEngineStatus
  isolation: 'outside-browser-main-thread'
  neverMainThread: true
  requiresBackendEvidence: boolean
  requiredEvidence: string[]
  blockers: string[]
  notes: string[]
}

export interface RuntimeEngineAssetPipelineContract {
  version: 1
  assetId: string
  fileName: string
  format: string
  sizeBytes: number
  status: 'ready' | 'requires-preflight' | 'held'
  mayDownloadOriginal: boolean
  requiredStages: RuntimeEngineAssetStage[]
  requiredTools: string[]
  requiredEvidence: string[]
  blockers: string[]
}

export interface RuntimeBudgetGateInput {
  lane: 'viewport-render' | 'asset-optimize' | 'shader-compile' | 'memory-indexing' | 'browser-operator' | 'ai-inference'
  requestedTarget: RuntimeEngineExecutionTarget | 'local-main-safe'
  estimatedMemoryMb?: number
  estimatedVramMb?: number
  localRuntime?: LocalRuntimeCapabilityReport | null
  userActive?: boolean
}

export interface RuntimeBudgetGateDecision {
  canStart: boolean
  target: RuntimeEngineExecutionTarget
  status: RuntimeEngineStatus
  blockers: string[]
  notes: string[]
}

export type RuntimeEngineExportTarget = 'unreal' | 'unity' | 'godot' | 'web'

export interface GameRuntimeToolchainPlan {
  version: 1
  requiredTools: string[]
  optionalTools: string[]
  exportTargets: RuntimeEngineExportTarget[]
  requiredEvidence: string[]
  blockers: string[]
  notes: string[]
}

export const RUNTIME_ENGINE_TOOLCHAIN_REGISTRY: RuntimeEngineToolchainEntry[] = [
  {
    id: 'gltf-transform',
    label: 'glTF Transform',
    category: 'asset',
    executable: 'gltf-transform',
    homepage: 'https://gltf-transform.dev/',
    license: 'MIT',
    licenseUrl: 'https://github.com/donmccurdy/glTF-Transform/blob/main/LICENSE',
    probe: { command: 'gltf-transform', args: ['--version'], expectedExitCode: 0 },
    versionArgs: ['--version'],
    checksumPolicy: 'sha256-required-before-execution',
    downloadPolicy: 'manual-consent-only',
    status: 'optional',
    provides: ['gltf-inspect', 'gltf-optimize', 'gltf-lod', 'meshopt', 'texture-transform'],
  },
  {
    id: 'meshoptimizer',
    label: 'meshoptimizer',
    category: 'asset',
    executable: 'meshopt',
    homepage: 'https://github.com/zeux/meshoptimizer',
    license: 'MIT',
    licenseUrl: 'https://github.com/zeux/meshoptimizer/blob/master/LICENSE.md',
    probe: { command: 'meshopt', args: ['--help'], expectedExitCode: 0 },
    versionArgs: ['--help'],
    checksumPolicy: 'sha256-required-before-execution',
    downloadPolicy: 'manual-consent-only',
    status: 'optional',
    provides: ['mesh-simplify', 'mesh-compress', 'vertex-cache-optimize'],
  },
  {
    id: 'ktx-software-basisu',
    label: 'KTX-Software / Basis Universal',
    category: 'asset',
    executable: 'toktx',
    homepage: 'https://github.com/KhronosGroup/KTX-Software',
    license: 'Apache-2.0',
    licenseUrl: 'https://github.com/KhronosGroup/KTX-Software/blob/main/LICENSE.md',
    probe: { command: 'toktx', args: ['--version'], expectedExitCode: 0 },
    versionArgs: ['--version'],
    checksumPolicy: 'sha256-required-before-execution',
    downloadPolicy: 'manual-consent-only',
    status: 'optional',
    provides: ['ktx2', 'basisu', 'gpu-texture-compression'],
  },
  {
    id: 'ffmpeg',
    label: 'FFmpeg / FFprobe',
    category: 'media',
    executable: 'ffmpeg',
    homepage: 'https://ffmpeg.org/',
    license: 'LGPL/GPL build dependent',
    licenseUrl: 'https://ffmpeg.org/legal.html',
    probe: { command: 'ffmpeg', args: ['-version'], expectedExitCode: 0 },
    versionArgs: ['-version'],
    checksumPolicy: 'sha256-required-before-execution',
    downloadPolicy: 'manual-consent-only',
    status: 'required-for-final',
    provides: ['video-transcode', 'audio-mux', 'frame-extract', 'ffprobe'],
  },
  {
    id: 'openusd-tools',
    label: 'OpenUSD tools',
    category: 'dcc',
    executable: 'usdcat',
    homepage: 'https://openusd.org/',
    license: 'Apache-2.0',
    licenseUrl: 'https://github.com/PixarAnimationStudios/OpenUSD/blob/release/LICENSE.txt',
    probe: { command: 'usdcat', args: ['--help'], expectedExitCode: 0 },
    versionArgs: ['--help'],
    checksumPolicy: 'sha256-required-before-execution',
    downloadPolicy: 'manual-consent-only',
    status: 'optional',
    provides: ['usd-metadata', 'usd-layer-inspect', 'usd-scene-flatten-preview'],
  },
  {
    id: 'blender-headless',
    label: 'Blender headless',
    category: 'renderer',
    executable: 'blender',
    homepage: 'https://www.blender.org/',
    license: 'GPL-3.0-or-later',
    licenseUrl: 'https://www.blender.org/about/license/',
    probe: { command: 'blender', args: ['--version'], expectedExitCode: 0 },
    versionArgs: ['--version'],
    checksumPolicy: 'sha256-required-before-execution',
    downloadPolicy: 'manual-consent-only',
    status: 'optional',
    provides: ['offline-render', 'thumbnail-render', 'asset-convert'],
  },
  {
    id: 'recast-detour',
    label: 'Recast / Detour navmesh adapter',
    category: 'navmesh',
    executable: 'recast-cli',
    homepage: 'https://github.com/recastnavigation/recastnavigation',
    license: 'Zlib',
    licenseUrl: 'https://github.com/recastnavigation/recastnavigation/blob/main/License.txt',
    probe: { command: 'recast-cli', args: ['--version'], expectedExitCode: 0 },
    versionArgs: ['--version'],
    checksumPolicy: 'sha256-required-before-execution',
    downloadPolicy: 'manual-consent-only',
    status: 'optional',
    provides: ['navmesh-build', 'pathfinding-query', 'crowd-navigation'],
  },
  {
    id: 'rapier-physics',
    label: 'Rapier physics adapter',
    category: 'physics',
    executable: 'rapier',
    homepage: 'https://rapier.rs/',
    license: 'Apache-2.0',
    licenseUrl: 'https://github.com/dimforge/rapier/blob/master/LICENSE',
    probe: { command: 'rapier', args: ['--version'], expectedExitCode: 0 },
    versionArgs: ['--version'],
    checksumPolicy: 'sha256-required-before-execution',
    downloadPolicy: 'manual-consent-only',
    status: 'optional',
    provides: ['rigid-body-physics', 'collider-validation', 'playtest-physics-replay'],
  },
  {
    id: 'ozz-animation',
    label: 'Ozz Animation runtime adapter',
    category: 'animation',
    executable: 'ozz-animation-adapter',
    homepage: 'https://github.com/guillaumeblanc/ozz-animation',
    license: 'MIT',
    licenseUrl: 'https://github.com/guillaumeblanc/ozz-animation/blob/master/LICENSE.md',
    probe: { command: 'ozz-animation-adapter', args: ['--version'], expectedExitCode: 0 },
    versionArgs: ['--version'],
    checksumPolicy: 'sha256-required-before-execution',
    downloadPolicy: 'manual-consent-only',
    status: 'optional',
    provides: ['skeleton-runtime', 'animation-retarget', 'clip-validation'],
  },
  {
    id: 'unreal-export-bridge',
    label: 'Unreal export bridge',
    category: 'export',
    executable: 'aethel-unreal-bridge',
    homepage: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/exporting-unreal-engine-content-to-gltf',
    license: 'Engine/EULA dependent',
    licenseUrl: 'https://www.unrealengine.com/en-US/eula/unreal',
    probe: { command: 'aethel-unreal-bridge', args: ['--version'], expectedExitCode: 0 },
    versionArgs: ['--version'],
    checksumPolicy: 'sha256-required-before-execution',
    downloadPolicy: 'manual-consent-only',
    status: 'optional',
    provides: ['unreal-gltf-export', 'unreal-python-bridge', 'unreal-import-manifest'],
  },
  {
    id: 'unity-export-bridge',
    label: 'Unity export bridge',
    category: 'export',
    executable: 'aethel-unity-bridge',
    homepage: 'https://github.com/atteneder/glTFast',
    license: 'Apache-2.0 bridge / Unity license dependent',
    licenseUrl: 'https://github.com/atteneder/glTFast/blob/main/LICENSE.md',
    probe: { command: 'aethel-unity-bridge', args: ['--version'], expectedExitCode: 0 },
    versionArgs: ['--version'],
    checksumPolicy: 'sha256-required-before-execution',
    downloadPolicy: 'manual-consent-only',
    status: 'optional',
    provides: ['unity-gltf-export', 'unity-import-manifest', 'material-variant-report'],
  },
  {
    id: 'godot-export-bridge',
    label: 'Godot export bridge',
    category: 'export',
    executable: 'godot',
    homepage: 'https://docs.godotengine.org/en/stable/tutorials/assets_pipeline/exporting_3d_scenes.html',
    license: 'MIT',
    licenseUrl: 'https://github.com/godotengine/godot/blob/master/LICENSE.txt',
    probe: { command: 'godot', args: ['--version'], expectedExitCode: 0 },
    versionArgs: ['--version'],
    checksumPolicy: 'sha256-required-before-execution',
    downloadPolicy: 'manual-consent-only',
    status: 'optional',
    provides: ['godot-glb-export', 'godot-import-manifest', 'scene-roundtrip-check'],
  },
]

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}

function extensionOf(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? 'unknown'
  return ext === fileName.toLowerCase() ? 'unknown' : ext
}

function hasNativeWgpuRuntime(report: LocalRuntimeCapabilityReport | null | undefined): boolean {
  if (!report) return false
  const backends = report.rendererBackends ?? []
  const nativeBackends = report.nativeGraphicsBackends ?? []
  return (
    report.preferredExecutor === 'local-native' &&
    report.thermalState !== 'critical' &&
    report.supportsOffscreenRender === true &&
    (backends.includes('wgpu-native') || nativeBackends.some((backend) => ['vulkan', 'directx12', 'metal'].includes(backend)))
  )
}

function isWeakDevice(report: LocalRuntimeCapabilityReport | null | undefined): boolean {
  if (!report) return false
  if (report.preferredExecutor === 'held' || report.thermalState === 'critical') return true
  if ((report.memoryGb ?? 99) < 6) return true
  if ((report.freeStorageGb ?? 99) < 2) return true
  if ((report.maxVramMb ?? 4096) < 2048) return true
  return false
}

export function buildRenderBackendContract(input: {
  contract: ViewportRenderJobContract
  localRuntime?: LocalRuntimeCapabilityReport | null
  cloudRendererConfigured?: boolean
  webGpuPreviewEnabled?: boolean
}): RuntimeEngineRenderBackendContract {
  const { contract } = input
  const requiredEvidence = unique([
    'render backend contract',
    'runtime budget',
    'artifact ownership validation',
    'performance report',
    'validation report',
  ])
  const blockers: string[] = []
  const notes: string[] = ['Browser rendering is preview-only; heavy render/compute must stay outside the IDE main thread.']
  const nativeReady = hasNativeWgpuRuntime(input.localRuntime)
  const weakDevice = isWeakDevice(input.localRuntime)
  const cloudReady = input.cloudRendererConfigured === true
  const finalOrReview = contract.quality !== 'draft'

  let target: RuntimeEngineExecutionTarget = 'browser-preview'
  let backendKind: RuntimeEngineBackendKind = input.webGpuPreviewEnabled ? 'three-webgpu-preview' : 'three-r3f-preview'
  let status: RuntimeEngineStatus = 'ready'

  if (finalOrReview || weakDevice) {
    if (nativeReady && !weakDevice) {
      target = 'local-native'
      backendKind = 'wgpu-native'
      status = finalOrReview ? 'review' : 'ready'
      notes.push('Native wgpu runtime can execute this job through Vulkan, Metal, or DirectX 12 without blocking the browser shell.')
    } else if (cloudReady) {
      target = 'cloud-sandbox'
      backendKind = 'cloud-renderer'
      status = weakDevice ? 'fallback' : 'review'
      notes.push('Cloud sandbox is selected because final/review renders require playback evidence outside browser preview.')
    } else {
      target = 'held'
      backendKind = 'none'
      status = 'held'
      blockers.push('A real renderer backend is required for review/final render evidence; manifest-only output cannot be marked done.')
    }
  }

  if (weakDevice && target === 'browser-preview') {
    target = cloudReady ? 'cloud-sandbox' : 'held'
    backendKind = cloudReady ? 'cloud-renderer' : 'none'
    status = cloudReady ? 'fallback' : 'held'
    blockers.push('Weak-device policy forbids heavy rendering in the browser preview lane.')
  }

  if (finalOrReview && target === 'browser-preview') {
    target = 'held'
    backendKind = 'none'
    status = 'held'
    blockers.push('Review/final renders cannot run as browser-preview jobs.')
  }

  return {
    version: 1,
    contractId: contract.id,
    quality: contract.quality,
    renderMode: contract.renderMode,
    target,
    backendKind,
    status,
    isolation: 'outside-browser-main-thread',
    neverMainThread: true,
    requiresBackendEvidence: finalOrReview,
    requiredEvidence,
    blockers: unique(blockers),
    notes: unique(notes),
  }
}

export function buildAssetPipelineContract(input: {
  assetId: string
  fileName: string
  sizeBytes: number
  hasUserConsentForOriginalDownload?: boolean
}): RuntimeEngineAssetPipelineContract {
  const format = extensionOf(input.fileName)
  const largeAsset = input.sizeBytes >= 50 * 1024 * 1024
  const dccFormat = ['usd', 'usda', 'usdc', 'fbx'].includes(format)
  const requiredStages: RuntimeEngineAssetStage[] = ['metadata', 'license', 'thumbnail', 'budget', 'read-receipt']
  const requiredTools = ['gltf-transform']
  const blockers: string[] = []

  if (largeAsset || dccFormat) {
    requiredStages.push('proxy', 'lod', 'compression')
    requiredTools.push('meshoptimizer', 'ktx-software-basisu')
  }
  if (format.startsWith('usd')) {
    requiredTools.push('openusd-tools')
  }

  const mayDownloadOriginal = Boolean(input.hasUserConsentForOriginalDownload) && !largeAsset
  if (largeAsset && !input.hasUserConsentForOriginalDownload) {
    blockers.push('Large asset originals require explicit user consent; use metadata/proxy first.')
  }
  if (!['glb', 'gltf', 'usd', 'usda', 'usdc', 'fbx', 'obj'].includes(format)) {
    blockers.push(`Unsupported asset format for runtime pipeline: ${format}.`)
  }

  return {
    version: 1,
    assetId: input.assetId,
    fileName: input.fileName,
    format,
    sizeBytes: input.sizeBytes,
    status: blockers.length > 0 ? 'held' : largeAsset || dccFormat ? 'requires-preflight' : 'ready',
    mayDownloadOriginal,
    requiredStages: unique(requiredStages),
    requiredTools: unique(requiredTools),
    requiredEvidence: unique(requiredStages.map((stage) => `${stage} evidence`)),
    blockers: unique(blockers),
  }
}

export function evaluateRuntimeBudgetGate(input: RuntimeBudgetGateInput): RuntimeBudgetGateDecision {
  const blockers: string[] = []
  const notes = ['Runtime budget gate keeps heavy work away from the browser main thread.']
  const weakDevice = isWeakDevice(input.localRuntime)
  const heavyLane = ['viewport-render', 'asset-optimize', 'shader-compile', 'memory-indexing', 'browser-operator', 'ai-inference'].includes(input.lane)

  if (heavyLane && (input.requestedTarget === 'local-main-safe' || input.requestedTarget === 'browser-preview')) {
    blockers.push(`${input.lane} cannot run on the browser main thread.`)
  }
  if (input.userActive && ['asset-optimize', 'memory-indexing', 'ai-inference'].includes(input.lane)) {
    blockers.push(`${input.lane} must pause or move away while the user is actively editing.`)
  }
  if ((input.estimatedMemoryMb ?? 0) >= 4096 && input.requestedTarget !== 'cloud-sandbox' && input.requestedTarget !== 'local-native') {
    blockers.push('Estimated memory exceeds 4 GB and requires native/cloud isolation.')
  }
  if ((input.estimatedVramMb ?? 0) >= 3072 && input.requestedTarget !== 'cloud-sandbox' && input.requestedTarget !== 'local-native') {
    blockers.push('Estimated VRAM exceeds browser-safe budget and requires native/cloud isolation.')
  }
  if (weakDevice && input.requestedTarget !== 'cloud-sandbox' && input.requestedTarget !== 'held') {
    blockers.push('Weak-device policy requires cloud-sandbox or held execution.')
  }

  const target: RuntimeEngineExecutionTarget = blockers.length > 0
    ? weakDevice || input.requestedTarget === 'local-main-safe' || input.requestedTarget === 'browser-preview'
      ? 'held'
      : 'cloud-sandbox'
    : input.requestedTarget === 'local-main-safe'
      ? 'held'
      : input.requestedTarget

  return {
    canStart: blockers.length === 0,
    target,
    status: blockers.length > 0 ? 'held' : 'ready',
    blockers: unique(blockers),
    notes,
  }
}

export function buildGameRuntimeToolchainPlan(input: {
  requiresNavmesh?: boolean
  requiresPhysics?: boolean
  requiresAnimationRuntime?: boolean
  exportTargets?: RuntimeEngineExportTarget[]
  hasUserConsentForExternalEngineBridge?: boolean
}): GameRuntimeToolchainPlan {
  const requiredTools = ['gltf-transform', 'meshoptimizer', 'ktx-software-basisu']
  const optionalTools = ['blender-headless', 'openusd-tools']
  const requiredEvidence = [
    'toolchain license review',
    'sha256 digest before execution',
    'manual consent receipt',
    'asset graph',
    'validation graph',
  ]
  const blockers: string[] = []
  const notes = [
    'Toolchain adapters are optional and never downloaded automatically.',
    'Browser preview remains separate from native/cloud final production jobs.',
  ]
  const exportTargets = unique(input.exportTargets ?? [])

  if (input.requiresNavmesh) {
    requiredTools.push('recast-detour')
    requiredEvidence.push('navmesh bake report', 'navigation validation replay')
  }
  if (input.requiresPhysics) {
    requiredTools.push('rapier-physics')
    requiredEvidence.push('physics replay', 'collider validation report')
  }
  if (input.requiresAnimationRuntime) {
    requiredTools.push('ozz-animation')
    requiredEvidence.push('skeleton retarget report', 'animation clip validation')
  }
  if (exportTargets.includes('unreal')) requiredTools.push('unreal-export-bridge')
  if (exportTargets.includes('unity')) requiredTools.push('unity-export-bridge')
  if (exportTargets.includes('godot')) requiredTools.push('godot-export-bridge')

  if (exportTargets.length > 0 && !input.hasUserConsentForExternalEngineBridge) {
    blockers.push('External engine export bridges require explicit user consent and target-engine license confirmation.')
  }

  return {
    version: 1,
    requiredTools: unique(requiredTools),
    optionalTools: unique(optionalTools),
    exportTargets,
    requiredEvidence: unique(requiredEvidence),
    blockers: unique(blockers),
    notes,
  }
}

export function validateRuntimeEngineToolchainRegistry(
  registry: RuntimeEngineToolchainEntry[] = RUNTIME_ENGINE_TOOLCHAIN_REGISTRY
): string[] {
  const failures: string[] = []
  const seen = new Set<string>()
  for (const entry of registry) {
    if (seen.has(entry.id)) failures.push(`${entry.id}: duplicate toolchain id`)
    seen.add(entry.id)
    if (!entry.homepage.startsWith('https://')) failures.push(`${entry.id}: homepage must be HTTPS`)
    if (!entry.license || !entry.licenseUrl.startsWith('https://')) failures.push(`${entry.id}: license metadata is required`)
    if (!entry.probe.command || entry.probe.expectedExitCode !== 0) failures.push(`${entry.id}: probe command is required`)
    if (entry.checksumPolicy !== 'sha256-required-before-execution') failures.push(`${entry.id}: sha256 checksum policy is required`)
    if (entry.downloadPolicy !== 'manual-consent-only') failures.push(`${entry.id}: downloads must require manual consent`)
    if (entry.provides.length === 0) failures.push(`${entry.id}: provided capabilities are required`)
  }
  return failures
}

export function buildRuntimeEngineToolchainSnapshot() {
  const failures = validateRuntimeEngineToolchainRegistry()
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    valid: failures.length === 0,
    failures,
    tools: RUNTIME_ENGINE_TOOLCHAIN_REGISTRY.map((tool) => ({
      id: tool.id,
      category: tool.category,
      status: tool.status,
      downloadPolicy: tool.downloadPolicy,
      checksumPolicy: tool.checksumPolicy,
      provides: tool.provides,
    })),
  }
}
