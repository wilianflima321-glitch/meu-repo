export type V29OperationalState =
  | 'available'
  | 'held'
  | 'blocked'
  | 'needs-review'
  | 'provider_unavailable'
  | 'human_review_required'

export type V29RouteClass = 'core' | 'secondary' | 'admin' | 'studio' | 'legacy' | 'hidden'
export type V29PrismaCoverageStatus = 'public-flow' | 'admin-flow' | 'internal-only' | 'held' | 'candidate-for-removal'

export interface V29BaselineInventory {
  version: 1
  sourceAudit: 'AUDITORIA_V29_ESPINHA_INTERNA_PARIDADE_UNREAL_CURSOR_2026-06-05'
  measuredAt: string
  routeCounts: {
    pages: number
    apiRoutes: number
    adminPages: number
    studioPages: number
  }
  codeCounts: {
    componentTsxFiles: number
    libTsFiles: number
    storyFiles: number
    testFiles: number
    filesOver500Lines: number
    filesOver800Lines: number
  }
  riskCounts: {
    ptBrMatches: number
    placeholderMatches: number
    todoMatches: number
    deprecatedMatches: number
  }
  shellCandidates: string[]
  routeClasses: Record<V29RouteClass, string[]>
}

export interface V29SubsystemOwnership {
  subsystem: string
  owner: string
  canonicalEntrypoint: string
  userSurface: string
  gates: string[]
  status: V29OperationalState
  nextAction: string
}

export interface WorkbenchConvergenceReport {
  version: 1
  canonicalShell: 'ModernIDEShell'
  canonicalShellPath: string
  legacyShells: Array<{
    name: string
    path: string
    policy: 'redirect-or-bridge-only' | 'delete-after-zero-imports'
  }>
  canonicalSystems: {
    commandRegistry: string
    taskLane: string
    agentLane: string
    previewRuntimePane: string
    diffReviewCenter: string
  }
  noNewShellRule: string
  blockers: string[]
}

export interface DesktopSidecarCapability {
  id: string
  label: string
  os: 'all' | 'windows' | 'macos' | 'linux'
  state: V29OperationalState
  evidenceRefs: string[]
  nextAction: string
}

export interface DesktopCapabilityManifest {
  version: 1
  desktopTarget: 'tauri-web-shell'
  canonicalShell: 'apps/studio-local/src/index.html'
  bridgeEntrypoint: 'apps/studio-local/src/desktop-bridge/createDesktopAdapter.ts'
  runtimeTemplatesPolicy: 'absorb-into-studio-local'
  updateChannels: ['stable', 'beta', 'nightly']
  capabilities: DesktopSidecarCapability[]
  prohibitedClaims: string[]
}

export interface V29DesktopBridgeCommandContract {
  version: 1
  rustEntrypoint: 'apps/studio-local/src-tauri/src/main.rs'
  adapterEntrypoint: 'apps/studio-local/src/desktop-bridge/createDesktopAdapter.ts'
  sharedRuntimeTypes: 'packages/aethel-ide-shared/src/runtime-adapter/types.ts'
  commands: Array<{
    command: string
    purpose: string
    state: V29OperationalState
    evidenceRefs: string[]
  }>
  routePolicy: 'held-targets-stay-held'
  prohibitedFallback: string
}

export interface CreativeToolchainContract {
  version: 1
  canonicalShell: string
  canonicalWorkbenchShell: string
  chrome: string
  inspector: string
  outliner: string
  timeline: string
  assetBrowser: string
  importQueue: string
  renderQueue: string
  reviewEvidence: string
  publishPolicy: 'human-review-required'
  prohibitedClaims: string[]
}
export interface PrismaModelCoverageRule {
  status: V29PrismaCoverageStatus
  owner: string
  requiredEvidence: string[]
}
export interface PrismaModelCoverageMatrix {
  version: 1
  totalModels: number
  coveredModels: number
  models: Array<{
    model: string
    status: V29PrismaCoverageStatus
    owner: string
    routeHint: string
    testHint: string
  }>
  unknownModels: string[]
}

export interface V29ProductSurfaceConvergence {
  version: 1
  canonicalRegistry: 'cloud-web-app/web/lib/routes/product-surface-registry.ts'
  canonicalRegistryToken: 'PRODUCT_SURFACE_REGISTRY'
  publicRouteConsolidation: 'cloud-web-app/web/lib/navigation/public-route-consolidation.ts'
  workbenchConvergence: 'cloud-web-app/web/lib/routes/workbench-convergence.ts'
  requiredSurfaces: ['home', 'workspace', 'ide', 'canvas', 'research', 'evidence']
  publicCompatibilityRoutes: Array<{
    route: string
    canonicalSurface: string
    preserveUrl: false
  }>
  hiddenRoutePolicy: 'redirect-or-drawer-only'
  routeBudgets: {
    publicPrimaryMax: number
    dashboardPrimaryTabs: 3
    adminVisibleAreas: 6
    studioVisibleGroups: 5
  }
}

export const V29_BASELINE_LIMITS = {
  pagesMax: 58,
  adminPagesMax: 7,
  studioPagesMax: 6,
  apiRoutesMax: 379,
  filesOver500Max: 218,
  storyFilesMin: 30,
  testFilesMin: 206,
} as const

export const V29_SUBSYSTEM_OWNERSHIP: V29SubsystemOwnership[] = [
  {
    subsystem: 'ide-workbench',
    owner: 'workbench owner',
    canonicalEntrypoint: 'cloud-web-app/web/components/ide/ModernIDEShell.tsx',
    userSurface: '/ide',
    gates: ['qa:v29-workbench-convergence', 'qa:ide-product-experience-spine', 'qa:command-registry-spine'],
    status: 'needs-review',
    nextAction: 'Keep ModernIDEShell canonical and route legacy shells through bridge/redirect only.',
  },
  {
    subsystem: 'agents-execution',
    owner: 'agent runtime owner',
    canonicalEntrypoint: 'cloud-web-app/web/lib/agents/agent-execution-evidence-package.ts',
    userSurface: '/ide agents sidecar',
    gates: ['qa:agent-runtime-spine', 'qa:agent-execution-evidence-package'],
    status: 'available',
    nextAction: 'Require read receipts, tool receipts, sandbox/replay evidence, and human approval before apply claims.',
  },
  {
    subsystem: 'research-evidence',
    owner: 'research owner',
    canonicalEntrypoint: 'cloud-web-app/web/lib/research/research-evidence-package.ts',
    userSurface: '/research workspace',
    gates: ['qa:research-runtime-spine', 'qa:research-evidence-package'],
    status: 'available',
    nextAction: 'Keep final research claims held until sources, replay, artifacts, cost, and human review are attached.',
  },
  {
    subsystem: 'runtime-production',
    owner: 'runtime/platform owner',
    canonicalEntrypoint: 'cloud-web-app/web/lib/production/runtime-execution-evidence-package.ts',
    userSurface: '/evidence',
    gates: ['qa:runtime-execution-evidence-package', 'qa:runtime-engine-spine'],
    status: 'available',
    nextAction: 'Package runtime receipts and release manifests while keeping releaseReady false until approval.',
  },
  {
    subsystem: 'desktop-studio-local',
    owner: 'runtime/native owner',
    canonicalEntrypoint: 'apps/studio-local/src/index.html',
    userSurface: 'Aethel Studio Local',
    gates: ['qa:v29-desktop-capability-manifest', 'qa:v29-desktop-bridge-commands', 'qa:studio-local-release-readiness'],
    status: 'held',
    nextAction: 'Use Tauri web shell v1, absorb runtime templates, persist machine capability manifest, and avoid signed/native renderer claims.',
  },
  {
    subsystem: 'creative-tools',
    owner: 'creative tools owner',
    canonicalEntrypoint: 'cloud-web-app/web/components/studio/CreativeWorkbenchShell.tsx',
    userSurface: '/studio',
    gates: ['qa:v29-creative-toolchain-contract', 'qa:engine-spine-modules'],
    status: 'needs-review',
    nextAction: 'Unify editor chrome, inspector, outliner, timeline, asset browser, import, render, review, and publish evidence.',
  },
  {
    subsystem: 'data-prisma-tenancy',
    owner: 'backend/product ops owner',
    canonicalEntrypoint: 'cloud-web-app/web/prisma/schema.prisma',
    userSurface: 'admin, billing, projects, support, collaboration',
    gates: ['qa:v29-prisma-model-coverage'],
    status: 'needs-review',
    nextAction: 'Every Prisma model must map to a route class, owner, test hint, and lifecycle status.',
  },
  {
    subsystem: 'qa-observability',
    owner: 'qa/platform owner',
    canonicalEntrypoint: 'cloud-web-app/web/scripts',
    userSurface: 'CI and evidence reports',
    gates: ['qa:v29-baseline-inventory', 'qa:v28-total-spine', 'qa:internal-runtime-priority-gate'],
    status: 'available',
    nextAction: 'Keep V29 gates tied to measurable product surfaces instead of docs-only policy.',
  },
]

export const V29_WORKBENCH_CONVERGENCE: WorkbenchConvergenceReport = {
  version: 1,
  canonicalShell: 'ModernIDEShell',
  canonicalShellPath: 'cloud-web-app/web/components/ide/ModernIDEShell.tsx',
  legacyShells: [
    {
      name: 'FullscreenIDE',
      path: 'cloud-web-app/web/components/ide/FullscreenIDE.tsx',
      policy: 'redirect-or-bridge-only',
    },
    {
      name: 'WorkbenchRedirect',
      path: 'cloud-web-app/web/components/ide/WorkbenchRedirect.tsx',
      policy: 'redirect-or-bridge-only',
    },
    {
      name: 'IDELayout',
      path: 'cloud-web-app/web/components/ide/IDELayout.tsx',
      policy: 'delete-after-zero-imports',
    },
  ],
  canonicalSystems: {
    commandRegistry: 'cloud-web-app/web/lib/commands/command-registry.tsx',
    taskLane: 'cloud-web-app/web/components/ide/TaskOpsPanel.tsx',
    agentLane: 'cloud-web-app/web/components/ide/AIChatPanelPro.tsx',
    previewRuntimePane: 'cloud-web-app/web/components/ide/fullscreen/WorkbenchPreviewPane.tsx',
    diffReviewCenter: 'cloud-web-app/web/components/ide/IdeWorkbenchCommandExtras.tsx',
  },
  noNewShellRule: 'New IDE shells are blocked unless this report is updated and qa:v29-workbench-convergence passes.',
  blockers: ['Command aliases/hotkeys still need a premium EN-only registry audit.'],
}

export const V29_DESKTOP_CAPABILITY_MANIFEST: DesktopCapabilityManifest = {
  version: 1,
  desktopTarget: 'tauri-web-shell',
  canonicalShell: 'apps/studio-local/src/index.html',
  bridgeEntrypoint: 'apps/studio-local/src/desktop-bridge/createDesktopAdapter.ts',
  runtimeTemplatesPolicy: 'absorb-into-studio-local',
  updateChannels: ['stable', 'beta', 'nightly'],
  capabilities: [
    {
      id: 'machine-probe',
      label: 'Machine probe and runtime lanes',
      os: 'all',
      state: 'available',
      evidenceRefs: ['apps/studio-local/src-tauri/src/probe.rs', 'apps/studio-local/src-tauri/src/policy.rs'],
      nextAction: 'Expose probe output in the desktop shell and persist capability manifest per machine.',
    },
    {
      id: 'sidecar-manager',
      label: 'Sidecar manager',
      os: 'all',
      state: 'needs-review',
      evidenceRefs: ['apps/studio-local/src-tauri/src/sidecars.rs'],
      nextAction: 'Connect OS sidecar templates to signed download/update/recovery flow.',
    },
    {
      id: 'native-renderer',
      label: 'Native renderer lane',
      os: 'all',
      state: 'held',
      evidenceRefs: ['apps/studio-local/src-tauri/src/runtime_engine.rs'],
      nextAction: 'Keep native renderer claims held until real renderer receipts and performance traces exist.',
    },
  ],
  prohibitedClaims: ['desktop ready', 'native renderer ready', 'signed installer', 'Unreal-grade', 'releaseReady=true'],
}

export const V29_DESKTOP_BRIDGE_COMMAND_CONTRACT: V29DesktopBridgeCommandContract = {
  version: 1,
  rustEntrypoint: 'apps/studio-local/src-tauri/src/main.rs',
  adapterEntrypoint: 'apps/studio-local/src/desktop-bridge/createDesktopAdapter.ts',
  sharedRuntimeTypes: 'packages/aethel-ide-shared/src/runtime-adapter/types.ts',
  routePolicy: 'held-targets-stay-held',
  prohibitedFallback: 'Desktop adapter must not coerce held/native runtime decisions into browser-preview success.',
  commands: [
    {
      command: 'fs_read',
      purpose: 'Read bounded UTF-8 files through the Studio Local native bridge with allowlisted roots only.',
      state: 'available',
      evidenceRefs: ['apps/studio-local/src-tauri/src/desktop_commands.rs', 'apps/studio-local/src/desktop-bridge/createDesktopAdapter.ts'],
    },
    {
      command: 'fs_write',
      purpose: 'Write bounded text payloads only inside allowed Studio Local workspace roots.',
      state: 'available',
      evidenceRefs: ['apps/studio-local/src-tauri/src/desktop_commands.rs', 'apps/studio-local/src/desktop-bridge/createDesktopAdapter.ts'],
    },
    {
      command: 'fs_list',
      purpose: 'List allowed workspace directories while hiding protected internals.',
      state: 'available',
      evidenceRefs: ['apps/studio-local/src-tauri/src/desktop_commands.rs', 'apps/studio-local/src/desktop-bridge/createDesktopAdapter.ts'],
    },
    {
      command: 'terminal_create',
      purpose: 'Create a held terminal session record without spawning a local shell process.',
      state: 'held',
      evidenceRefs: ['apps/studio-local/src-tauri/src/desktop_commands.rs', 'apps/studio-local/src/desktop-bridge/createDesktopAdapter.ts'],
    },
    {
      command: 'terminal_write',
      purpose: 'Record held terminal input while native shell execution remains blocked.',
      state: 'held',
      evidenceRefs: ['apps/studio-local/src-tauri/src/desktop_commands.rs', 'apps/studio-local/src/desktop-bridge/createDesktopAdapter.ts'],
    },
    {
      command: 'terminal_close',
      purpose: 'Close a held terminal session without terminating any spawned process.',
      state: 'held',
      evidenceRefs: ['apps/studio-local/src-tauri/src/desktop_commands.rs', 'apps/studio-local/src/desktop-bridge/createDesktopAdapter.ts'],
    },
    {
      command: 'ai_complete',
      purpose: 'Return provider_unavailable until a governed local model sidecar is approved.',
      state: 'provider_unavailable',
      evidenceRefs: ['apps/studio-local/src-tauri/src/desktop_commands.rs', 'apps/studio-local/src/desktop-bridge/createDesktopAdapter.ts'],
    },
    {
      command: 'notify_native',
      purpose: 'Return an honest provider_unavailable status until a native notification plugin is installed.',
      state: 'provider_unavailable',
      evidenceRefs: ['apps/studio-local/src-tauri/src/desktop_commands.rs', 'apps/studio-local/src/desktop-bridge/createDesktopAdapter.ts'],
    },
    {
      command: 'window_minimize',
      purpose: 'Expose native shell window minimization from the Tauri bridge.',
      state: 'available',
      evidenceRefs: ['apps/studio-local/src-tauri/src/desktop_commands.rs', 'apps/studio-local/src/desktop-bridge/createDesktopAdapter.ts'],
    },
    {
      command: 'window_toggle_maximize',
      purpose: 'Expose native shell maximize/unmaximize without custom browser-only chrome shims.',
      state: 'available',
      evidenceRefs: ['apps/studio-local/src-tauri/src/desktop_commands.rs', 'apps/studio-local/src/desktop-bridge/createDesktopAdapter.ts'],
    },
    {
      command: 'window_close',
      purpose: 'Expose native shell window close from the Tauri bridge.',
      state: 'available',
      evidenceRefs: ['apps/studio-local/src-tauri/src/desktop_commands.rs', 'apps/studio-local/src/desktop-bridge/createDesktopAdapter.ts'],
    },
    {
      command: 'local_runtime_probe',
      purpose: 'Compact runtime probe for the shared RuntimeAdapter.',
      state: 'available',
      evidenceRefs: ['apps/studio-local/src-tauri/src/main.rs', 'apps/studio-local/src-tauri/src/probe.rs'],
    },
    {
      command: 'local_runtime_probe_report',
      purpose: 'Full native probe report for evidence/debug surfaces.',
      state: 'available',
      evidenceRefs: ['apps/studio-local/src-tauri/src/main.rs', 'apps/studio-local/src-tauri/src/contracts.rs'],
    },
    {
      command: 'local_runtime_sidecars',
      purpose: 'Native sidecar capability manifest derived from the machine probe.',
      state: 'available',
      evidenceRefs: ['apps/studio-local/src-tauri/src/main.rs', 'apps/studio-local/src-tauri/src/sidecars.rs'],
    },
    {
      command: 'native_kernel_manifest', purpose: 'Expose the honest native kernel manifest for PTY, watcher, daemon, crash recovery, and updater readiness.',
      state: 'needs-review', evidenceRefs: ['apps/studio-local/src-tauri/src/main.rs', 'apps/studio-local/src-tauri/src/native_kernel.rs'],
    },
    {
      command: 'jobs_route',
      purpose: 'Route governed runtime jobs through Rust policy before work starts.',
      state: 'available',
      evidenceRefs: ['apps/studio-local/src-tauri/src/main.rs', 'apps/studio-local/src-tauri/src/policy.rs', 'apps/studio-local/src-tauri/src/jobs.rs'],
    },
    {
      command: 'jobs_list',
      purpose: 'Expose compact local runtime job state for recovery and receipts.',
      state: 'available',
      evidenceRefs: ['apps/studio-local/src-tauri/src/main.rs', 'apps/studio-local/src-tauri/src/jobs.rs'],
    },
    {
      command: 'jobs_cancel',
      purpose: 'Allow explicit user or policy cancellation of local runtime jobs.',
      state: 'available',
      evidenceRefs: ['apps/studio-local/src-tauri/src/main.rs', 'apps/studio-local/src-tauri/src/jobs.rs'],
    },
  ],
}

export const V29_CREATIVE_TOOLCHAIN_CONTRACT: CreativeToolchainContract = {
  version: 1,
  canonicalShell: 'cloud-web-app/web/app/studio/CreativeStudioShell.tsx',
  canonicalWorkbenchShell: 'cloud-web-app/web/components/studio/CreativeWorkbenchShell.tsx',
  chrome: 'cloud-web-app/web/components/viewport/ViewportChrome.tsx',
  inspector: 'cloud-web-app/web/components/viewport/SceneViewportInspector.tsx',
  outliner: 'cloud-web-app/web/components/viewport/SceneViewportOutliner.tsx',
  timeline: 'cloud-web-app/web/components/viewport/TimelineOverlay.tsx',
  assetBrowser: 'cloud-web-app/web/components/engine/EngineContentBrowser.tsx',
  importQueue: 'cloud-web-app/web/lib/production/asset-quality-job-runner.ts',
  renderQueue: 'cloud-web-app/web/lib/production/studio-local-cook-queue.ts',
  reviewEvidence: 'cloud-web-app/web/lib/production/release-evidence-readiness.ts',
  publishPolicy: 'human-review-required',
  prohibitedClaims: ['final asset', 'Unreal-grade', 'production ready', 'releaseReady=true'],
}

export const V29_PRISMA_MODEL_COVERAGE_POLICY: Record<V29PrismaCoverageStatus, PrismaModelCoverageRule> = {
  'public-flow': {
    status: 'public-flow',
    owner: 'product surface owner',
    requiredEvidence: ['route or page', 'user-facing flow', 'test or QA gate'],
  },
  'admin-flow': {
    status: 'admin-flow',
    owner: 'admin/trust owner',
    requiredEvidence: ['admin hub route', 'privacy-aware UI', 'test or QA gate'],
  },
  'internal-only': {
    status: 'internal-only',
    owner: 'platform owner',
    requiredEvidence: ['server route or worker', 'telemetry/audit event', 'test or QA gate'],
  },
  held: {
    status: 'held',
    owner: 'product ops owner',
    requiredEvidence: ['reason for hold', 'next action', 'no public claim'],
  },
  'candidate-for-removal': {
    status: 'candidate-for-removal',
    owner: 'backend/product ops owner',
    requiredEvidence: ['zero usage scan', 'migration plan', 'delete gate'],
  },
}

export const V29_PRODUCT_SURFACE_CONVERGENCE: V29ProductSurfaceConvergence = {
  version: 1,
  canonicalRegistry: 'cloud-web-app/web/lib/routes/product-surface-registry.ts',
  canonicalRegistryToken: 'PRODUCT_SURFACE_REGISTRY',
  publicRouteConsolidation: 'cloud-web-app/web/lib/navigation/public-route-consolidation.ts',
  workbenchConvergence: 'cloud-web-app/web/lib/routes/workbench-convergence.ts',
  requiredSurfaces: ['home', 'workspace', 'ide', 'canvas', 'research', 'evidence'],
  publicCompatibilityRoutes: [
    { route: '/contact', canonicalSurface: '/help', preserveUrl: false },
    { route: '/customers', canonicalSurface: '/trust', preserveUrl: false },
    { route: '/roadmap', canonicalSurface: '/docs/changelog', preserveUrl: false },
    { route: '/security-acknowledgments', canonicalSurface: '/security-policy', preserveUrl: false },
  ],
  hiddenRoutePolicy: 'redirect-or-drawer-only',
  routeBudgets: {
    publicPrimaryMax: 6,
    dashboardPrimaryTabs: 3,
    adminVisibleAreas: 6,
    studioVisibleGroups: 5,
  },
}

export function validateV29SubsystemOwnership(items: V29SubsystemOwnership[] = V29_SUBSYSTEM_OWNERSHIP): string[] {
  const required = ['ide-workbench', 'agents-execution', 'research-evidence', 'runtime-production', 'desktop-studio-local', 'creative-tools', 'data-prisma-tenancy', 'qa-observability']
  const seen = new Set(items.map((item) => item.subsystem))
  return required.filter((subsystem) => !seen.has(subsystem)).map((subsystem) => `Missing V29 subsystem: ${subsystem}`)
}
