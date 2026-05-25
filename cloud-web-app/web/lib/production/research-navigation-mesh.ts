import {
  evaluateBrowserOperatorPolicy,
  type BrowserOperatorPolicyDecision,
} from '@/lib/production/browser-operator-safety'

export type AgentNavigationLaneId =
  | 'headless-browser-worker'
  | 'cloud-virtual-browser'
  | 'user-chrome-extension'
  | 'local-chrome-devtools'
  | 'desktop-computer-use'
  | 'mobile-companion'

export type AgentNavigationMissionKind =
  | 'advanced-research'
  | 'app-prototyping'
  | 'account-operations'
  | 'commerce'
  | 'devops'
  | 'content-capture'

export type AgentNavigationStatus = 'available' | 'held' | 'blocked' | 'needs-review'

export interface AgentNavigationCapabilityInput {
  missionKind?: AgentNavigationMissionKind
  targetUrl?: string
  intendedAction?: string
  pageText?: string | null
  allowedDomains?: string[]
  deniedDomains?: string[]
  amountUsd?: number | null
  hasCloudBrowser?: boolean
  hasChromeExtension?: boolean
  hasChromeDevTools?: boolean
  hasComputerUseSandbox?: boolean
  hasMobileCompanion?: boolean
  hasHeadlessBrowserWorker?: boolean
  hasReplayCapture?: boolean
  hasScreenshotCapture?: boolean
  hasDomSnapshot?: boolean
  hasPauseControl?: boolean
  hasHumanTakeover?: boolean
  hasHumanApproval?: boolean
  hasCredentialVault?: boolean
  hasNetworkIsolation?: boolean
}

export interface AgentNavigationLaneReadiness {
  laneId: AgentNavigationLaneId
  label: string
  status: AgentNavigationStatus
  bestFor: string[]
  missingCapabilities: string[]
  requiredEvidence: string[]
  blockers: string[]
  guardrails: string[]
  nextAction: string
}

export interface ResearchNavigationMesh {
  version: 1
  capability: 'AETHEL_RESEARCH_NAVIGATION_MESH'
  capabilityStatus: AgentNavigationStatus
  missionKind: AgentNavigationMissionKind
  recommendedLane: AgentNavigationLaneId | null
  lanes: AgentNavigationLaneReadiness[]
  policyDecision: BrowserOperatorPolicyDecision
  requiredEvidence: string[]
  marketParityCoverage: string[]
  limitations: string[]
  nextAction: string
}

interface LaneDefinition {
  laneId: AgentNavigationLaneId
  label: string
  capabilityKeys: Array<keyof AgentNavigationCapabilityInput>
  bestFor: string[]
  evidence: string[]
  guardrails: string[]
}

const DEFAULT_TARGET_URL = 'https://example.com'
const DEFAULT_ACTION = 'read and summarize public research sources'

const BASE_EVIDENCE = [
  'browser replay timeline',
  'screenshot before action',
  'DOM snapshot hash',
  'source URL and collected date',
  'confidence score',
  'contradiction check',
  'pause/takeover control',
]

const LANE_DEFINITIONS: LaneDefinition[] = [
  {
    laneId: 'headless-browser-worker',
    label: 'Headless browser worker',
    capabilityKeys: ['hasHeadlessBrowserWorker', 'hasNetworkIsolation', 'hasReplayCapture', 'hasScreenshotCapture', 'hasDomSnapshot'],
    bestFor: ['public research', 'source collection', 'market scans', 'docs verification'],
    evidence: ['network isolation receipt', 'request log digest'],
    guardrails: ['Read-only by default; never use for logged-in account actions or credential entry.'],
  },
  {
    laneId: 'cloud-virtual-browser',
    label: 'Cloud virtual browser',
    capabilityKeys: ['hasCloudBrowser', 'hasReplayCapture', 'hasScreenshotCapture', 'hasDomSnapshot', 'hasPauseControl'],
    bestFor: ['Manus-style observable execution', 'long-running research', 'public app validation', 'browser replay'],
    evidence: ['cloud session id', 'teardown receipt'],
    guardrails: ['Run consequence-bearing actions only after explicit human approval.'],
  },
  {
    laneId: 'user-chrome-extension',
    label: 'User Chrome extension',
    capabilityKeys: ['hasChromeExtension', 'hasReplayCapture', 'hasScreenshotCapture', 'hasDomSnapshot', 'hasPauseControl', 'hasHumanTakeover'],
    bestFor: ['logged-in user workflows', 'private SaaS navigation', 'manual takeover', 'real browser context'],
    evidence: ['extension permission manifest', 'takeover event log'],
    guardrails: ['Never read credentials directly; use human handoff or a credential vault gate.'],
  },
  {
    laneId: 'local-chrome-devtools',
    label: 'Local Chrome DevTools connector',
    capabilityKeys: ['hasChromeDevTools', 'hasReplayCapture', 'hasScreenshotCapture', 'hasDomSnapshot', 'hasHumanTakeover'],
    bestFor: ['local web app debugging', 'console/network evidence', 'performance traces', 'developer-supervised browsing'],
    evidence: ['CDP target id', 'console/network trace digest'],
    guardrails: ['Requires local consent and must stay tied to the active project/session.'],
  },
  {
    laneId: 'desktop-computer-use',
    label: 'Desktop computer-use sandbox',
    capabilityKeys: ['hasComputerUseSandbox', 'hasReplayCapture', 'hasScreenshotCapture', 'hasPauseControl', 'hasHumanTakeover'],
    bestFor: ['native desktop workflows', 'files plus browser tasks', 'Studio Local checks', 'manual fallback automation'],
    evidence: ['sandbox session id', 'window/action timeline'],
    guardrails: ['No destructive filesystem/app action without approval and rollback evidence.'],
  },
  {
    laneId: 'mobile-companion',
    label: 'Mobile companion browser',
    capabilityKeys: ['hasMobileCompanion', 'hasReplayCapture', 'hasScreenshotCapture', 'hasPauseControl', 'hasHumanTakeover'],
    bestFor: ['mobile-only flows', 'camera/location permission review', 'responsive QA', 'device-specific browser tasks'],
    evidence: ['device profile', 'mobile screenshot sequence'],
    guardrails: ['Mobile permissions require visible user consent before access.'],
  },
]

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function missionKindFor(input: AgentNavigationCapabilityInput): AgentNavigationMissionKind {
  if (input.missionKind) return input.missionKind
  const action = input.intendedAction?.toLowerCase() ?? ''
  if (action.includes('buy') || action.includes('purchase') || action.includes('checkout')) return 'commerce'
  if (action.includes('deploy') || action.includes('domain') || action.includes('dns')) return 'devops'
  if (action.includes('login') || action.includes('account') || action.includes('settings')) return 'account-operations'
  if (action.includes('screenshot') || action.includes('capture')) return 'content-capture'
  if (action.includes('prototype') || action.includes('app')) return 'app-prototyping'
  return 'advanced-research'
}

function missingCapabilities(definition: LaneDefinition, input: AgentNavigationCapabilityInput): string[] {
  return definition.capabilityKeys.filter((key) => input[key] !== true)
}

function statusForLane(input: {
  definition: LaneDefinition
  missing: string[]
  policy: BrowserOperatorPolicyDecision
  capability: AgentNavigationCapabilityInput
}): AgentNavigationStatus {
  if (input.policy.status === 'blocked') return 'blocked'
  if (input.missing.length > 0) return 'held'
  if (input.policy.status === 'approval-required') return 'needs-review'
  if (
    input.definition.laneId === 'user-chrome-extension' &&
    input.capability.hasCredentialVault !== true &&
    input.policy.requiresPauseOrTakeover
  ) {
    return 'needs-review'
  }
  return 'available'
}

function laneNextAction(status: AgentNavigationStatus, missing: string[], lane: LaneDefinition): string {
  if (status === 'blocked') return `${lane.label} is blocked by page/domain risk. Stop and route to human review.`
  if (missing.length > 0) return `Connect ${missing[0]} before using ${lane.label}. Keep the lane held.`
  if (status === 'needs-review') return `${lane.label} can prepare evidence, but human approval/takeover is required before submit.`
  return `${lane.label} can run read-only navigation with replay, screenshots, DOM hash, and source capture.`
}

function chooseLane(lanes: AgentNavigationLaneReadiness[], missionKind: AgentNavigationMissionKind): AgentNavigationLaneId | null {
  const preferredByMission: Record<AgentNavigationMissionKind, AgentNavigationLaneId[]> = {
    'advanced-research': ['headless-browser-worker', 'cloud-virtual-browser', 'user-chrome-extension'],
    'app-prototyping': ['cloud-virtual-browser', 'local-chrome-devtools', 'user-chrome-extension'],
    'account-operations': ['user-chrome-extension', 'desktop-computer-use', 'cloud-virtual-browser'],
    commerce: ['user-chrome-extension', 'desktop-computer-use', 'cloud-virtual-browser'],
    devops: ['local-chrome-devtools', 'user-chrome-extension', 'cloud-virtual-browser'],
    'content-capture': ['cloud-virtual-browser', 'user-chrome-extension', 'mobile-companion'],
  }
  const preferred = preferredByMission[missionKind]
  const usable = lanes.filter((lane) => lane.status === 'available' || lane.status === 'needs-review')
  for (const laneId of preferred) {
    if (usable.some((lane) => lane.laneId === laneId)) return laneId
  }
  return usable[0]?.laneId ?? null
}

export function buildResearchNavigationMesh(input: AgentNavigationCapabilityInput = {}): ResearchNavigationMesh {
  const missionKind = missionKindFor(input)
  const policyDecision = evaluateBrowserOperatorPolicy({
    targetUrl: input.targetUrl ?? DEFAULT_TARGET_URL,
    intendedAction: input.intendedAction ?? DEFAULT_ACTION,
    pageText: input.pageText,
    allowedDomains: input.allowedDomains,
    deniedDomains: input.deniedDomains,
    amountUsd: input.amountUsd,
    hasReplayCapture: input.hasReplayCapture,
    hasScreenshotCapture: input.hasScreenshotCapture,
    hasDomSnapshot: input.hasDomSnapshot,
    hasPauseControl: input.hasPauseControl,
    hasHumanApproval: input.hasHumanApproval,
  })

  const lanes = LANE_DEFINITIONS.map((definition) => {
    const missing = missingCapabilities(definition, input)
    const status = statusForLane({ definition, missing, policy: policyDecision, capability: input })
    const requiredEvidence = unique([...BASE_EVIDENCE, ...definition.evidence, ...policyDecision.requiredEvidence])
    const blockers = unique([
      ...policyDecision.blockers,
      ...missing.map((capability) => `Missing capability: ${capability}`),
      ...(status === 'needs-review' ? ['Human approval or takeover required before consequence-bearing action.'] : []),
    ])

    return {
      laneId: definition.laneId,
      label: definition.label,
      status,
      bestFor: definition.bestFor,
      missingCapabilities: missing,
      requiredEvidence,
      blockers,
      guardrails: definition.guardrails,
      nextAction: laneNextAction(status, missing, definition),
    }
  })

  const recommendedLane = chooseLane(lanes, missionKind)
  const recommended = lanes.find((lane) => lane.laneId === recommendedLane)
  const capabilityStatus: AgentNavigationStatus =
    policyDecision.status === 'blocked'
      ? 'blocked'
      : recommended?.status ?? (lanes.some((lane) => lane.status === 'held') ? 'held' : 'blocked')

  return {
    version: 1,
    capability: 'AETHEL_RESEARCH_NAVIGATION_MESH',
    capabilityStatus,
    missionKind,
    recommendedLane,
    lanes,
    policyDecision,
    requiredEvidence: unique(lanes.flatMap((lane) => lane.requiredEvidence)),
    marketParityCoverage: [
      'observable browser replay',
      'pause/takeover before consequence-bearing actions',
      'cloud browser lane for long-running work',
      'local Chrome lane for user-device context',
      'source-grounded research evidence',
    ],
    limitations: [
      'No autonomous credential entry without human takeover or vault gate.',
      'No purchase, account change, deployment, or message send without approval evidence.',
      'Prompt-injection pages block navigation until reviewed.',
      'Headless workers are read-only and must not impersonate a signed-in user.',
    ],
    nextAction:
      recommended?.nextAction ??
      'Connect a governed browser lane with replay, screenshot, DOM hash, pause/takeover, and source evidence before agent navigation.',
  }
}
