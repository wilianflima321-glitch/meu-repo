export type RuntimeReleaseStatus = 'available' | 'beta' | 'held' | 'planned'
export type StudioLocalPlatformId = 'windows' | 'mac' | 'linux'

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

export type RuntimeReleaseManifest = {
  releaseChannel: 'desktop-beta'
  signedInstallers: RuntimeReleaseStatus
  platforms: Record<StudioLocalPlatformId, StudioLocalPlatform>
  targets: RuntimeTargetManifest[]
  sidecars: RuntimeSidecarManifest[]
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
}
