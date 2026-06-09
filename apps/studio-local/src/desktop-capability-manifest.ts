export type DesktopCapabilityState = 'available' | 'held' | 'needs-review' | 'provider_unavailable'

export interface StudioLocalDesktopCapability {
  id: string
  state: DesktopCapabilityState
  evidenceRefs: string[]
  nextAction: string
}

export interface StudioLocalDesktopManifest {
  version: 1
  target: 'tauri-web-shell'
  shell: 'index.html'
  bridge: 'src/desktop-bridge/createDesktopAdapter.ts'
  runtimeTemplatesPolicy: 'absorbed-by-studio-local'
  updateChannels: ['stable', 'beta', 'nightly']
  capabilities: StudioLocalDesktopCapability[]
  prohibitedClaims: string[]
}

export const STUDIO_LOCAL_DESKTOP_MANIFEST: StudioLocalDesktopManifest = {
  version: 1,
  target: 'tauri-web-shell',
  shell: 'index.html',
  bridge: 'src/desktop-bridge/createDesktopAdapter.ts',
  runtimeTemplatesPolicy: 'absorbed-by-studio-local',
  updateChannels: ['stable', 'beta', 'nightly'],
  capabilities: [
    {
      id: 'machine-probe',
      state: 'available',
      evidenceRefs: ['src-tauri/src/probe.rs', 'src-tauri/src/policy.rs'],
      nextAction: 'Render probe results in the desktop shell and persist them per machine.',
    },
    {
      id: 'sidecar-manager',
      state: 'needs-review',
      evidenceRefs: ['src-tauri/src/sidecars.rs', '../../runtime-templates/linux', '../../runtime-templates/macos', '../../runtime-templates/windows'],
      nextAction: 'Turn OS templates into versioned sidecar install/update manifests.',
    },
    {
      id: 'native-renderer',
      state: 'held',
      evidenceRefs: ['src-tauri/src/runtime_engine.rs'],
      nextAction: 'Attach renderer receipts and performance traces before native renderer claims.',
    },
    {
      id: 'signed-installer',
      state: 'held',
      evidenceRefs: ['src-tauri/tauri.conf.json'],
      nextAction: 'Keep signed installer claims held until certificates, updater signatures, and release receipts exist.',
    },
  ],
  prohibitedClaims: ['desktop ready', 'native renderer ready', 'signed installer', 'Unreal-grade', 'releaseReady=true'],
}
