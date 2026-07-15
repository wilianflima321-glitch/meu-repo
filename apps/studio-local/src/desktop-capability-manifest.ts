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
  /** Electron runtime-templates/ are quarantined — never a product ship path. */
  runtimeTemplatesPolicy: 'quarantined-not-ship-path'
  updateChannels: ['stable', 'beta', 'nightly']
  capabilities: StudioLocalDesktopCapability[]
  prohibitedClaims: string[]
}

export const STUDIO_LOCAL_DESKTOP_MANIFEST: StudioLocalDesktopManifest = {
  version: 1,
  target: 'tauri-web-shell',
  shell: 'index.html',
  bridge: 'src/desktop-bridge/createDesktopAdapter.ts',
  runtimeTemplatesPolicy: 'quarantined-not-ship-path',
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
      evidenceRefs: ['src-tauri/src/sidecars.rs', '../../runtime-templates/QUARANTINED.md'],
      nextAction:
        'Sidecar install/update remains human-reviewed (SIDECAR-001). Electron templates are quarantined — do not treat runtime-templates/ as ship evidence.',
    },
    {
      id: 'native-pty',
      state: 'available',
      evidenceRefs: ['src-tauri/src/desktop_commands.rs', 'src/panels/TerminalPanel.tsx'],
      nextAction: 'Keep portable-pty sessions sandboxed to project root; agents must not host PTY (Law #48).',
    },
    {
      id: 'filesystem-watch',
      state: 'available',
      evidenceRefs: ['src-tauri/src/desktop_commands.rs'],
      nextAction:
        'Emit path live (`fs_event`); attach <500ms latency samples via fs-watch-latency helper before marketing the budget.',
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
  prohibitedClaims: [
    'desktop ready',
    'native renderer ready',
    'signed installer',
    'Unreal-grade',
    'releaseReady=true',
    'electron ship path',
    'local shell via cloud node-pty',
  ],
}
