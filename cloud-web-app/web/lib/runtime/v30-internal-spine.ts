export type V30OperationalState =
  | 'available'
  | 'held'
  | 'blocked'
  | 'needs-review'
  | 'provider_unavailable'
  | 'human_review_required'

export type V30SurfaceLifecycle =
  | 'canonical'
  | 'compatibility-redirect'
  | 'drawer-only'
  | 'internal-only'
  | 'candidate-for-removal'

export interface V30ExecutionLogEntry {
  version: 1
  date: string
  commitBefore: string
  scope: 'reproducibility' | 'route-ratchet' | 'ide' | 'agents' | 'creative' | 'desktop' | 'qa'
  completed: string[]
  blocked: string[]
  nextActions: string[]
  validation: string[]
}

export interface V30LockfileInventory {
  version: 1
  packageManager: 'npm'
  expectedLockfiles: [
    'package-lock.json',
    'cloud-web-app/web/package-lock.json',
    'apps/studio-local/package-lock.json',
    'apps/studio-local/src-tauri/Cargo.lock',
  ]
  removedRootDependencies: [
    '@theia/filesystem',
    'puppeteer-extra-plugin-stealth',
    'technicalindicators',
    'crypto-js',
    'reflect-metadata',
  ]
  preservedRootDependencies: ['ccxt', 'inversify']
  gate: 'qa:v30-lockfile-reproducibility'
}

export interface WorkbenchRegionDefinition {
  id: 'sidebar' | 'editor' | 'preview' | 'agents' | 'terminal' | 'problems'
  canonicalOwner: string
  skeleton: string
  errorBoundary: string
  commandGroup: string
  state: V30OperationalState
}

export interface WorkbenchRegionRegistry {
  version: 1
  canonicalShell: 'ModernIDEShell'
  shellPath: 'cloud-web-app/web/components/ide/ModernIDEShell.tsx'
  regions: WorkbenchRegionDefinition[]
  noParallelShellPolicy: 'no-new-shell-without-rfc'
  gate: 'qa:v29-workbench-convergence'
}

export interface AgentEvidenceReceipt {
  id: string
  agentId: string
  action: string
  state: V30OperationalState
  toolReceipts: string[]
  browserReplayRefs: string[]
  costLedgerRef: string
  humanApprovalRef?: string
  createdAt: string
}

export interface CreativeWorkbenchContract {
  version: 1
  shell: 'CreativeWorkbenchShell'
  shellPath: 'cloud-web-app/web/components/studio/CreativeWorkbenchShell.tsx'
  slots: [
    'viewport',
    'outliner',
    'inspector',
    'timeline',
    'asset-browser',
    'render-queue',
    'review-evidence',
  ]
  routeGroups: ['World', 'Character', 'FX', 'Film', 'Logic']
  publishPolicy: 'human_review_required'
  finalAssetPolicy: 'held-until-ledger-and-review'
  gate: 'qa:v29-creative-toolchain-contract'
}

export interface DesktopSidecarInstallReceipt {
  sidecarId: string
  os: 'windows' | 'macos' | 'linux'
  state: V30OperationalState
  version?: string
  checksum?: string
  signatureStatus: 'missing' | 'verified' | 'failed' | 'not-required'
  smokeStatus: 'not-run' | 'passed' | 'failed'
  rollbackRef?: string
}

export interface AssetQualityLedger {
  assetId: string
  state: V30OperationalState
  provenanceRef: string
  licenseRef: string
  pbrMaps: string[]
  lods: string[]
  rigRef?: string
  collisionRef?: string
  navmeshRef?: string
  perfTraceRef?: string
  playtestRef?: string
  humanReviewRef?: string
}

export interface V30QualityScorecard {
  version: 1
  minimumScore: 85
  currentScore: number
  dimensions: Array<{
    id: 'reproducibility' | 'route-convergence' | 'heavy-boundaries' | 'large-file-health' | 'tests-and-stories' | 'internal-contracts'
    points: number
    max: number
    nextAction: string
  }>
  gate: 'qa:v30-quality-scorecard'
}

export const V30_LOCKFILE_INVENTORY: V30LockfileInventory = {
  version: 1,
  packageManager: 'npm',
  expectedLockfiles: [
    'package-lock.json',
    'cloud-web-app/web/package-lock.json',
    'apps/studio-local/package-lock.json',
    'apps/studio-local/src-tauri/Cargo.lock',
  ],
  removedRootDependencies: [
    '@theia/filesystem',
    'puppeteer-extra-plugin-stealth',
    'technicalindicators',
    'crypto-js',
    'reflect-metadata',
  ],
  preservedRootDependencies: ['ccxt', 'inversify'],
  gate: 'qa:v30-lockfile-reproducibility',
}

export const V30_ROUTE_SURFACE_RATCHETS = {
  pagesMax: 58,
  adminSubroutesMax: 6,
  studioSubroutesMax: 5,
  shellEntrypointsMax: 8,
  filesOver500Max: 218,
  filesOver800Max: 0,
} as const

export const V30_QUALITY_SCORECARD_POLICY = {
  version: 1,
  minimumScore: 85,
  marketTargets: {
    filesOver500: 160,
    storyFiles: 80,
    storyFilesRatchet: 39,
    tests: 230,
    shellEntrypoints: 8,
  },
  gate: 'qa:v30-quality-scorecard',
} as const

export const V30_WORKBENCH_REGION_REGISTRY: WorkbenchRegionRegistry = {
  version: 1,
  canonicalShell: 'ModernIDEShell',
  shellPath: 'cloud-web-app/web/components/ide/ModernIDEShell.tsx',
  noParallelShellPolicy: 'no-new-shell-without-rfc',
  gate: 'qa:v29-workbench-convergence',
  regions: [
    {
      id: 'sidebar',
      canonicalOwner: 'workbench navigation',
      skeleton: 'WorkbenchSidebarSkeleton',
      errorBoundary: 'WorkbenchRegionBoundary',
      commandGroup: 'workspace',
      state: 'needs-review',
    },
    {
      id: 'editor',
      canonicalOwner: 'editor runtime',
      skeleton: 'EditorRegionSkeleton',
      errorBoundary: 'WorkbenchRegionBoundary',
      commandGroup: 'editor',
      state: 'needs-review',
    },
    {
      id: 'preview',
      canonicalOwner: 'preview runtime',
      skeleton: 'PreviewRegionSkeleton',
      errorBoundary: 'WorkbenchRegionBoundary',
      commandGroup: 'preview',
      state: 'needs-review',
    },
    {
      id: 'agents',
      canonicalOwner: 'agent workspace',
      skeleton: 'AgentsRegionSkeleton',
      errorBoundary: 'WorkbenchRegionBoundary',
      commandGroup: 'agents',
      state: 'needs-review',
    },
    {
      id: 'terminal',
      canonicalOwner: 'terminal runtime',
      skeleton: 'TerminalRegionSkeleton',
      errorBoundary: 'WorkbenchRegionBoundary',
      commandGroup: 'terminal',
      state: 'held',
    },
    {
      id: 'problems',
      canonicalOwner: 'diagnostics runtime',
      skeleton: 'ProblemsRegionSkeleton',
      errorBoundary: 'WorkbenchRegionBoundary',
      commandGroup: 'diagnostics',
      state: 'needs-review',
    },
  ],
}

export const V30_CREATIVE_WORKBENCH_CONTRACT: CreativeWorkbenchContract = {
  version: 1,
  shell: 'CreativeWorkbenchShell',
  shellPath: 'cloud-web-app/web/components/studio/CreativeWorkbenchShell.tsx',
  slots: ['viewport', 'outliner', 'inspector', 'timeline', 'asset-browser', 'render-queue', 'review-evidence'],
  routeGroups: ['World', 'Character', 'FX', 'Film', 'Logic'],
  publishPolicy: 'human_review_required',
  finalAssetPolicy: 'held-until-ledger-and-review',
  gate: 'qa:v29-creative-toolchain-contract',
}
