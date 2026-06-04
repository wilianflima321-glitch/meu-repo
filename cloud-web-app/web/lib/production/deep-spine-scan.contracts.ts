import type {
  ProductionGraphKey,
} from './agentic-production-state'
import type { ProjectMemoryRuntimeProbe } from './multi-resolution-project-memory'
import type { CartographySourceKind, RepositoryArtifactInput } from './repository-cartography'
import type { ResearchIntelligencePacket } from './research-intelligence-bridge'

export type DeepSpineScanMode = 'quick' | 'deep' | 'aaa' | 'external'

export type DeepSpineFindingSeverity = 'blocker' | 'high' | 'medium' | 'low'

export type DeepSpineFindingCategory =
  | 'context-budget'
  | 'large-file'
  | 'external-provenance'
  | 'dead-code'
  | 'rendering'
  | 'game-production'
  | 'i18n'
  | 'god-file'
  | 'runtime-budget'
  | 'toolchain'

export interface DeepSpineScanBudget {
  maxFiles: number
  maxBytes: number
  maxHashBytes: number
  maxTimeMs: number
  maxFindings: number
  allowCloudIndexing: boolean
}

export interface DeepSpineScanScope {
  paths: string[]
  sourceKind: CartographySourceKind | 'mixed'
  description: string
}

export interface DeepSpineScanSurfaceSignal {
  path: string
  lineCount?: number
  importerCount?: number
  hardcodedCopyMatches?: number
  hasWebGpuReference?: boolean
  hasAaaRendererEvidence?: boolean
  hasLicenseEvidence?: boolean
  hasChecksumEvidence?: boolean
}

export interface DeepSpineFinding {
  id: string
  severity: DeepSpineFindingSeverity
  category: DeepSpineFindingCategory
  path: string
  line: number | null
  evidence: string[]
  recommendation: string
  confidence: number
  safeAutofix: false
  requiresHumanReview: boolean
}

export interface DeepSpineWorkPacket {
  id: string
  title: string
  ownerAgent: string
  targetPaths: string[]
  blockedUntil: string[]
  evidenceRequired: string[]
}

export interface DeepSpineScanManifest {
  version: 1
  scanId: string
  projectId: string
  mode: DeepSpineScanMode
  generatedAt: string
  scope: DeepSpineScanScope
  budget: DeepSpineScanBudget
  sourceRefs: string[]
  filesScanned: number
  bytesScanned: number
  bytesSkipped: number
  budgetExhausted: boolean
  findings: DeepSpineFinding[]
  readReceipts: string[]
  evidenceRefs: string[]
  nextActions: string[]
  blockedActions: string[]
  workPackets: DeepSpineWorkPacket[]
  handoffPrompt: string
}

export interface DeepSpineScanInput {
  projectId: string
  mode: DeepSpineScanMode
  artifacts: RepositoryArtifactInput[]
  scope?: Partial<DeepSpineScanScope>
  budget?: Partial<DeepSpineScanBudget>
  surfaceSignals?: DeepSpineScanSurfaceSignal[]
  researchPacket?: ResearchIntelligencePacket | null
  runtime?: ProjectMemoryRuntimeProbe
  generatedAt?: string
}

export interface DeepSpineScanReadiness {
  ready: boolean
  blockers: string[]
  missingEvidence: string[]
  nextAction: string
}

export const DEEP_SPINE_SCAN_SETTINGS_KEY = 'aethelDeepSpineScanManifest'

export const DEFAULT_BUDGET: DeepSpineScanBudget = {
  maxFiles: 5_000,
  maxBytes: 512 * 1024 * 1024,
  maxHashBytes: 8 * 1024 * 1024,
  maxTimeMs: 240_000,
  maxFindings: 80,
  allowCloudIndexing: false,
}

export const DEFAULT_RUNTIME: ProjectMemoryRuntimeProbe = {
  availableRamBytes: 4_000_000_000,
  availableDiskBytes: 16_000_000_000,
  thermalState: 'unknown',
  cpuLoadPercent: 50,
  localCacheBytes: 0,
  webGpuAvailable: false,
  browserOperatorReplayAvailable: false,
}

export const ENGINE_LIB_TARGETS = new Map<string, { agent: string; recommendation: string }>([
  [
    'world-partition.ts',
    {
      agent: 'Gameplay Engineer Agent',
      recommendation: 'Wire world partition through a lightweight streaming adapter before claiming open-world readiness.',
    },
  ],
  [
    'behavior-tree.ts',
    {
      agent: 'Gameplay Engineer Agent',
      recommendation: 'Create a behavior-tree editor/runtime adapter and require NPC validation evidence.',
    },
  ],
  [
    'skeletal-animation.ts',
    {
      agent: 'Technical Artist Agent',
      recommendation: 'Connect skeletal animation to rig/animation surfaces through AnimationMixer evidence.',
    },
  ],
  [
    'vfx-graph-editor.ts',
    {
      agent: 'Technical Artist Agent',
      recommendation: 'Wire VFX graph data into Niagara-style VFX validation and render evidence.',
    },
  ],
  [
    'hair-fur-system.ts',
    {
      agent: 'Technical Artist Agent',
      recommendation: 'Expose hair/fur cards, LOD, and material evidence in the Hair/Fur studio surface.',
    },
  ],
  [
    'navigation-ai.ts',
    {
      agent: 'Gameplay Engineer Agent',
      recommendation: 'Add pathfinding/navmesh adapter with Recast-style metadata and playtest evidence.',
    },
  ],
  [
    'particle-system.ts',
    {
      agent: 'Technical Artist Agent',
      recommendation: 'Connect particle runtime to VFX graph and viewport validation.',
    },
  ],
  [
    'post-processing-system.ts',
    {
      agent: 'Performance Agent',
      recommendation: 'Wire post-processing to the viewport with performance budget evidence.',
    },
  ],
  [
    'sequencer-cinematics.ts',
    {
      agent: 'Cinematic Editor Agent',
      recommendation: 'Attach sequencer runtime to Director Mode and render queue evidence.',
    },
  ],
])
