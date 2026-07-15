export type GovernedRuntimeState =
  | 'available'
  | 'held'
  | 'blocked'
  | 'needs-review'
  | 'provider_unavailable'
  | 'human_review_required'

export type WorkspaceBlueprintMode = 'app' | 'research' | 'game' | 'film' | 'cloud' | 'general'

export type WorkspaceJourneyStageId =
  | 'prompt'
  | 'blueprint'
  | 'workspace'
  | 'preview'
  | 'annotate'
  | 'code'
  | 'publish-evidence'

export type PreviewAnnotation = {
  id: string
  surface: 'runtime' | 'device' | 'canvas' | 'viewport3d'
  target: string
  note: string
  state: GovernedRuntimeState
  createdAt: number
}

export type AgentEvidenceReceipt = {
  id: string
  agentRole: string
  action: string
  state: GovernedRuntimeState
  costUsd: number
  evidenceRef: string
  createdAt: number
}

export type ResearchArtifact = {
  id: string
  title: string
  sources: string[]
  confidence: 'low' | 'medium' | 'high'
  state: GovernedRuntimeState
}

export type RuntimeCapability = {
  id: 'browser-preview' | 'studio-local' | 'cloud-stream' | 'webgpu-preview' | 'signed-desktop'
  label: string
  state: GovernedRuntimeState
  reason: string
  nextAction: string
}

export type ContextPackBudget = {
  maxTokens: number
  reservedForUserIntent: number
  reservedForEvidence: number
  reservedForToolResults: number
  overflowPolicy: 'summarize' | 'retrieve-on-demand' | 'block'
}

export type AssetQualityLedger = {
  state: GovernedRuntimeState
  requiredEvidence: readonly [
    'provenance',
    'license',
    'lods',
    'pbr-maps',
    'rig-or-skeleton',
    'collision',
    'navmesh',
    'performance-trace',
    'playtest',
    'human-approval',
  ]
  releaseHoldReason: string
}

export type WorkspaceJourneyStage = {
  id: WorkspaceJourneyStageId
  label: string
  state: GovernedRuntimeState
  owner: 'user' | 'copilot' | 'ide' | 'preview' | 'studio-local' | 'evidence'
  proof: string
  nextAction: string
}

export type WorkspaceBlueprint = {
  id: string
  mission: string
  mode: WorkspaceBlueprintMode
  createdAt: number
  stages: WorkspaceJourneyStage[]
  runtimeCapabilities: RuntimeCapability[]
  contextBudget: ContextPackBudget
  annotations: PreviewAnnotation[]
  evidenceReceipts: AgentEvidenceReceipt[]
  researchArtifacts: ResearchArtifact[]
  assetQualityLedger: AssetQualityLedger
}

const DEFAULT_CONTEXT_BUDGET: ContextPackBudget = {
  maxTokens: 64_000,
  reservedForUserIntent: 4_000,
  reservedForEvidence: 12_000,
  reservedForToolResults: 20_000,
  overflowPolicy: 'retrieve-on-demand',
}

const ASSET_QUALITY_REQUIRED_EVIDENCE: AssetQualityLedger['requiredEvidence'] = [
  'provenance',
  'license',
  'lods',
  'pbr-maps',
  'rig-or-skeleton',
  'collision',
  'navmesh',
  'performance-trace',
  'playtest',
  'human-approval',
]

function inferMode(mission: string): WorkspaceBlueprintMode {
  const normalized = mission.toLowerCase()
  if (/\b(research|market|competitor|fontes|pesquisa|manus)\b/.test(normalized)) return 'research'
  if (/\b(game|jogo|moba|rpg|fps|level|quest|boss)\b/.test(normalized)) return 'game'
  if (/\b(film|filme|cinematic|cutscene|video|scene)\b/.test(normalized)) return 'film'
  if (/\b(domain|deploy|cloud|infra|devops|vercel|cloudflare)\b/.test(normalized)) return 'cloud'
  if (/\b(app|site|landing|dashboard|auth|billing)\b/.test(normalized)) return 'app'
  return 'general'
}

function stableBlueprintId(mission: string, createdAt: number): string {
  const slug = mission
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'mission'
  return `workspace-blueprint-${slug}-${createdAt.toString(36)}`
}

function buildStages(mode: WorkspaceBlueprintMode): WorkspaceJourneyStage[] {
  const blueprintState: GovernedRuntimeState = mode === 'research' ? 'needs-review' : 'available'
  const previewState: GovernedRuntimeState = mode === 'game' || mode === 'film' ? 'needs-review' : 'available'
  return [
    {
      id: 'prompt',
      label: 'Mission captured',
      state: 'available',
      owner: 'user',
      proof: 'The user intent is stored as the source of truth for Copilot and IDE handoff.',
      nextAction: 'Convert the mission into a bounded workspace plan.',
    },
    {
      id: 'blueprint',
      label: 'Blueprint generated',
      state: blueprintState,
      owner: 'copilot',
      proof: 'Blueprint must expose scope, assumptions, evidence needs, runtime limits, and cost posture.',
      nextAction: blueprintState === 'needs-review' ? 'Review sources and confidence before execution.' : 'Open the workspace.',
    },
    {
      id: 'workspace',
      label: 'Workspace opened',
      state: 'available',
      owner: 'ide',
      proof: 'Files, agents, commands, preview, terminal, and evidence share the same mission context.',
      nextAction: 'Select the active surface and keep changes proposal-based.',
    },
    {
      id: 'preview',
      label: 'Preview attached',
      state: previewState,
      owner: 'preview',
      proof: 'Runtime preview, device preview, canvas, Viewport 3D, and logs route through the canonical registry.',
      nextAction: previewState === 'needs-review' ? 'Keep heavy rendering in preview/review until runtime evidence exists.' : 'Annotate the target area.',
    },
    {
      id: 'annotate',
      label: 'Select and annotate',
      state: 'available',
      owner: 'preview',
      proof: 'Annotations are contextual actions hidden behind the preview drawer/toolbars.',
      nextAction: 'Ask Copilot for a scoped proposal with diff and rollback.',
    },
    {
      id: 'code',
      label: 'Apply proposal',
      state: 'needs-review',
      owner: 'copilot',
      proof: 'Code edits require diff, validation output, cost receipt, and rollback path.',
      nextAction: 'Run validation before claiming the work is done.',
    },
    {
      id: 'publish-evidence',
      label: 'Publish evidence',
      state: 'human_review_required',
      owner: 'evidence',
      proof: 'Release requires evidence receipts, privacy-safe screenshots, costs, runtime state, and human approval.',
      nextAction: 'Approve or hold release based on evidence.',
    },
  ]
}

function buildRuntimeCapabilities(mode: WorkspaceBlueprintMode): RuntimeCapability[] {
  return [
    {
      id: 'browser-preview',
      label: 'Browser preview',
      state: 'available',
      reason: 'Safe for review, annotation, device checks, and lightweight runtime verification.',
      nextAction: 'Use it as the default surface for fast feedback.',
    },
    {
      id: 'studio-local',
      label: 'Studio Local',
      state: 'held',
      reason: 'Heavy jobs require a daemon capability handshake and signed job receipt.',
      nextAction: 'Connect the local daemon before optimization, cooking, or native GPU work.',
    },
    {
      id: 'cloud-stream',
      label: 'Cloud Stream',
      state: 'held',
      reason: 'Cloud GPU streaming needs a session URL, teardown policy, and minute-level cost cap.',
      nextAction: 'Provision a governed stream session only when the task needs it.',
    },
    {
      id: 'webgpu-preview',
      label: 'WebGPU preview',
      state: mode === 'game' || mode === 'film' ? 'needs-review' : 'held',
      reason: 'WebGPU is a browser preview path, not a native cinematic-runtime promise.',
      nextAction: 'Capture adapter, limits, performance trace, and fallback before promotion.',
    },
    {
      id: 'signed-desktop',
      label: 'Signed desktop installer',
      state: 'held',
      reason: 'Desktop signing remains held until certificates and updater signatures are present.',
      nextAction: 'Keep installer copy honest until signing evidence exists.',
    },
  ]
}

export function buildWorkspaceBlueprint(params: {
  mission: string
  createdAt?: number
  mode?: WorkspaceBlueprintMode
}): WorkspaceBlueprint {
  const mission = params.mission.trim()
  const createdAt = params.createdAt ?? Date.now()
  const mode = params.mode ?? inferMode(mission)
  return {
    id: stableBlueprintId(mission, createdAt),
    mission,
    mode,
    createdAt,
    stages: buildStages(mode),
    runtimeCapabilities: buildRuntimeCapabilities(mode),
    contextBudget: DEFAULT_CONTEXT_BUDGET,
    annotations: [],
    evidenceReceipts: [],
    researchArtifacts: [],
    assetQualityLedger: {
      state: mode === 'game' || mode === 'film' ? 'human_review_required' : 'held',
      requiredEvidence: ASSET_QUALITY_REQUIRED_EVIDENCE,
      releaseHoldReason:
        'No generated asset can be promoted without provenance, license, LOD/PBR, rig/collision/navmesh, performance, playtest, and human approval evidence.',
    },
  }
}

export function summarizeWorkspaceBlueprint(blueprint: WorkspaceBlueprint): string {
  const activeStages = blueprint.stages
    .map((stage) => `${stage.label}: ${stage.state}`)
    .join(', ')
  const heldRuntime = blueprint.runtimeCapabilities
    .filter((capability) => capability.state !== 'available')
    .map((capability) => `${capability.label}=${capability.state}`)
    .join(', ')
  return [
    `Blueprint: ${blueprint.id}`,
    `Mode: ${blueprint.mode}`,
    `Journey: ${activeStages}`,
    `Runtime: ${heldRuntime || 'browser preview available'}`,
    `Context budget: ${blueprint.contextBudget.maxTokens} tokens, overflow=${blueprint.contextBudget.overflowPolicy}`,
    `Asset quality: ${blueprint.assetQualityLedger.state}`,
  ].join('\n')
}

export function buildWorkspaceJourneyChecklist(blueprint: WorkspaceBlueprint): string[] {
  return blueprint.stages.map((stage) => `${stage.id}: ${stage.nextAction}`)
}
