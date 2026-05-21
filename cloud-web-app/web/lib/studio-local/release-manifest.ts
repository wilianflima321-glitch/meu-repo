export type RuntimeReleaseStatus = 'available' | 'beta' | 'held' | 'planned'
export type StudioLocalPlatformId = 'windows' | 'mac' | 'linux'
export type StudioLocalReadinessId =
  | 'windows-installer'
  | 'macos-notarized-dmg'
  | 'linux-appimage-deb'
  | 'signed-installers'
  | 'auto-updater'
  | 'sidecar-health'
  | 'capability-probe'
  | 'cloud-stream-handoff'

export type StudioLocalPlatform = {
  id: StudioLocalPlatformId
  name: string
  artifact: string
  requirements: string
  command: string
  status: RuntimeReleaseStatus
  readiness: string
}

export type RuntimeTargetManifest = {
  label: string
  detail: string
  status: RuntimeReleaseStatus
  fallbackReason?: string
  costNote?: string
}

export type RuntimeSidecarManifest = {
  label: string
  status: RuntimeReleaseStatus
  evidence: string
}

export type StudioLocalReadinessItem = {
  id: StudioLocalReadinessId
  label: string
  status: RuntimeReleaseStatus
  owner: string
  evidence: string
  blocker?: string
  nextAction: string
}

export type RuntimeReleaseManifest = {
  releaseChannel: 'desktop-beta'
  signedInstallers: RuntimeReleaseStatus
  platforms: Record<StudioLocalPlatformId, StudioLocalPlatform>
  targets: RuntimeTargetManifest[]
  sidecars: RuntimeSidecarManifest[]
  releaseReadiness: StudioLocalReadinessItem[]
}

export const STUDIO_LOCAL_RELEASE_MANIFEST: RuntimeReleaseManifest = {
  releaseChannel: 'desktop-beta',
  signedInstallers: 'held',
  platforms: {
    windows: {
      id: 'windows',
      name: 'Windows',
      artifact: 'Aethel-Studio-Local-Setup.exe',
      requirements: 'Windows 10+ x64, WebView2, Node 20+, optional NVIDIA/AMD GPU',
      command: 'powershell -ExecutionPolicy Bypass -File installers/windows/install-aethel.ps1',
      status: 'beta',
      readiness: 'Installer flow exists; signed public artifact is held until release signing is complete.',
    },
    mac: {
      id: 'mac',
      name: 'macOS',
      artifact: 'Aethel-Studio-Local-universal.dmg',
      requirements: 'macOS 12+, Apple Silicon or Intel, Metal-capable GPU',
      command: 'cargo tauri build --target universal-apple-darwin',
      status: 'beta',
      readiness: 'Universal build target is modeled; notarized DMG remains held until signing evidence lands.',
    },
    linux: {
      id: 'linux',
      name: 'Linux',
      artifact: 'aethel-studio-local.AppImage',
      requirements: 'Ubuntu 22.04+, Fedora 39+, Arch, Vulkan-capable GPU recommended',
      command: 'bash installers/linux/install-aethel.sh --user',
      status: 'beta',
      readiness: 'Install script exists; distro packaging is beta until AppImage/deb release assets are signed.',
    },
  },
  targets: [
    {
      label: 'Browser preview',
      detail: 'WebGPU/WebGL2 for fast iteration, share links, and lightweight reviews.',
      status: 'available',
      costNote: 'Included in normal workspace usage.',
    },
    {
      label: 'Studio Local',
      detail: 'Tauri native runtime with hardware probe, job recovery, sidecar policy, and local/cloud routing.',
      status: 'beta',
      fallbackReason: 'Falls back to Browser when native probe is unavailable or user has not installed the desktop app.',
      costNote: 'Local execution is governed by device capability, not cloud GPU spend.',
    },
    {
      label: 'Cloud Stream',
      detail: 'Pixel Streaming path for final demos when local hardware is not enough.',
      status: 'held',
      fallbackReason: 'Held unless NEXT_PUBLIC_AETHEL_PIXEL_STREAM_URL and governed backend session manager are configured.',
      costNote: 'GPU streaming must show per-minute cost before launch.',
    },
  ],
  sidecars: [
    { label: 'FFmpeg media export', status: 'available', evidence: 'Curated runtime toolchain lane.' },
    { label: 'ONNX local inference', status: 'beta', evidence: 'Reported by Studio Local capability probe when present.' },
    { label: 'WGPU native renderer', status: 'beta', evidence: 'Bounded sidecar contract; no main-thread execution.' },
    { label: 'Rapier physics', status: 'available', evidence: 'Optional physics adapter modeled in runtime spine.' },
    { label: 'Shader compiler', status: 'beta', evidence: 'Sidecar capability, held when compiler evidence is missing.' },
    { label: 'Asset optimizer', status: 'available', evidence: 'glTF Transform and meshoptimizer are curated tools.' },
  ],
  releaseReadiness: [
    {
      id: 'windows-installer',
      label: 'Windows installer',
      status: 'beta',
      owner: 'release-manager',
      evidence: 'Windows installer script exists and CI can produce a tagged build artifact.',
      blocker: 'Public release remains held until trusted signing evidence exists.',
      nextAction: 'Attach Azure Trusted Signing or EV certificate evidence before public download.',
    },
    {
      id: 'macos-notarized-dmg',
      label: 'macOS notarized DMG',
      status: 'held',
      owner: 'release-manager',
      evidence: 'Universal target is modeled for Apple Silicon and Intel.',
      blocker: 'Notarization and Apple Developer signing evidence are not present.',
      nextAction: 'Add notarization workflow, staple check, and downloadable DMG checksum.',
    },
    {
      id: 'linux-appimage-deb',
      label: 'Linux AppImage/deb',
      status: 'beta',
      owner: 'release-manager',
      evidence: 'Linux installer script exists and package target is modeled.',
      blocker: 'Signed AppImage/deb release assets and checksum publication are still pending.',
      nextAction: 'Publish signed AppImage/deb artifacts with SHA256 and install smoke test.',
    },
    {
      id: 'signed-installers',
      label: 'Signed installers',
      status: 'held',
      owner: 'trust',
      evidence: 'Manifest intentionally keeps signedInstallers held.',
      blocker: 'No public signed artifact evidence in this repository yet.',
      nextAction: 'Collect Windows signing, macOS notarization, Linux checksum, and CI artifact evidence.',
    },
    {
      id: 'auto-updater',
      label: 'Auto-updater',
      status: 'planned',
      owner: 'platform',
      evidence: 'Release channel is declared, but updater feed is not public.',
      blocker: 'No signed updater manifest or rollback channel has been published.',
      nextAction: 'Add Tauri updater feed, rollback policy, staged rollout, and signature verification evidence.',
    },
    {
      id: 'sidecar-health',
      label: 'Sidecar health',
      status: 'beta',
      owner: 'runtime',
      evidence: 'FFmpeg, WGPU, ONNX, Rapier, shader compiler, and asset optimizer are disclosed as capability lanes.',
      blocker: 'Some sidecars remain beta and must be probed per device before heavy execution.',
      nextAction: 'Keep sidecar execution capability-gated and visible in Studio before enabling heavy jobs.',
    },
    {
      id: 'capability-probe',
      label: 'Capability probe',
      status: 'available',
      owner: 'runtime',
      evidence: 'Studio Local Rust probe models GPU, thermal, storage, AI accelerators, and local toolchain.',
      nextAction: 'Continue requiring fresh probe evidence before routing native-side work.',
    },
    {
      id: 'cloud-stream-handoff',
      label: 'Cloud Stream handoff',
      status: 'held',
      owner: 'platform',
      evidence: 'Runtime target is modeled and Pixel Streaming client is split.',
      blocker: 'NEXT_PUBLIC_AETHEL_PIXEL_STREAM_URL and backend session manager must exist before selection.',
      nextAction: 'Keep Cloud Stream disabled until signaling, cost, idle teardown, and GPU session evidence exist.',
    },
  ],
}

export function getStudioLocalReleaseReadinessSummary(manifest: RuntimeReleaseManifest = STUDIO_LOCAL_RELEASE_MANIFEST) {
  const counts = manifest.releaseReadiness.reduce<Record<RuntimeReleaseStatus, number>>(
    (acc, item) => {
      acc[item.status] += 1
      return acc
    },
    { available: 0, beta: 0, held: 0, planned: 0 },
  )
  const blockers = manifest.releaseReadiness
    .filter((item) => item.status === 'held' || item.status === 'planned')
    .map((item) => item.blocker ?? `${item.label} is not release-ready.`)

  return {
    total: manifest.releaseReadiness.length,
    counts,
    publicDownloadReady: manifest.signedInstallers === 'available' && counts.held === 0 && counts.planned === 0,
    releaseBlocked: manifest.signedInstallers !== 'available' || counts.held > 0 || counts.planned > 0,
    blockers,
    nextAction:
      blockers.length > 0
        ? 'Keep Request desktop beta as the CTA and collect signing, updater, sidecar, and Cloud Stream evidence before public downloads.'
        : 'Publish signed installers with checksums, updater feed, rollback path, and support docs.',
  }
}
