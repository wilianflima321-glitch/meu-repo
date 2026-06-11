import type { AgenticProductionState } from './agentic-production-state'
import { buildAgentHandoffPacket, type AgentHandoffPacketStatus } from './agent-handoff-packet'
import type { AgentWorkLane, AgentScopeMode } from './parallel-agent-work-contract'
import type { RepositoryCartographyManifest } from './repository-cartography'
import { buildAgentSurfaceLockSnapshot, type AgentSurfaceLock, type AgentSurfaceLockSnapshot } from './agent-surface-locks'

export const AGENT_FLEET_SETTINGS_KEY = 'aethelAgentFleetPreferences'

export type AgentFleetMode = 'coordinator-first' | 'selected-agent' | 'review-only'
export type AgentFleetMemberStatus = 'ready' | 'attention' | 'blocked' | 'paused'
export type AgentFleetControlAction = 'pause' | 'resume' | 'takeover' | 'stop'

export interface AgentFleetControlReceipt {
  action: AgentFleetControlAction
  status: 'available' | 'human_review_required'
  recordedAt: string
  label: string
  detail: string
}

export interface AgentFleetCostReceipt {
  status: 'available' | 'held'
  sessionCostCents?: number
  budgetRemainingCents?: number
  label: string
  detail: string
}

export interface AgentFleetPreferences {
  version: 1
  centralAgent: string
  enabledAgents: string[]
  paused: boolean
  mode: AgentFleetMode
  updatedAt: string
  lastControlReceipt?: AgentFleetControlReceipt
}

export interface AgentFleetMemberSnapshot {
  agent: string
  role: 'senior-coordinator' | 'specialist'
  lane: AgentWorkLane
  status: AgentFleetMemberStatus
  handoffStatus: AgentHandoffPacketStatus
  scopeMode: AgentScopeMode
  ownedSurfaceCount: number
  activeLockCount: number
  lockedSurfacePreview: string[]
  staleSurfaceCount: number
  staleSurfacePreview: string[]
  nextAction: string
  blockedUntil: string[]
  approvalRequiredFor: string[]
  canRunInParallelWith: string[]
}

export interface AgentFleetSnapshot {
  version: 1
  projectId: string
  mode: AgentFleetMode
  paused: boolean
  hasManifest: boolean
  centralAgent: string
  summary: string
  composer: {
    primaryMode: string
    secondaryModes: string[]
    switcherHint: string
  }
  controls: string[]
  costReceipt: AgentFleetCostReceipt
  lastControlReceipt?: AgentFleetControlReceipt
  members: AgentFleetMemberSnapshot[]
  blockers: string[]
  activeLockCount: number
  staleSurfaceCount: number
  lockCoordination: AgentSurfaceLockSnapshot
  nextAction: string
}

export type AgentFleetPreferencesPatch = Partial<{
  centralAgent: string
  enabledAgents: string[]
  paused: boolean
  mode: AgentFleetMode
  action: AgentFleetControlAction
}>

const DEFAULT_CENTRAL_AGENT = 'Producer Agent'
const fallbackAgents = [
  'Producer Agent',
  'Research Agent',
  'Software Engineer Agent',
  'Asset Librarian Agent',
  'Technical Artist Agent',
  'Gameplay Engineer Agent',
  'Cinematic Editor Agent',
  'Story Agent',
  'QA Agent',
  'Performance Agent',
  'Release Agent',
  'Browser Operator Agent',
]
const modes: AgentFleetMode[] = ['coordinator-first', 'selected-agent', 'review-only']

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)))
}

function isoNow(now?: string): string {
  return now ?? new Date().toISOString()
}

function normalizeAgentName(value: unknown, fallback = DEFAULT_CENTRAL_AGENT): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

function normalizeEnabledAgents(value: unknown, centralAgent: string): string[] {
  const agents = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : fallbackAgents
  return unique([centralAgent, ...agents]).slice(0, 12)
}

function normalizeMode(value: unknown, fallback: AgentFleetMode): AgentFleetMode {
  return typeof value === 'string' && modes.includes(value as AgentFleetMode) ? (value as AgentFleetMode) : fallback
}

function normalizeControlAction(value: unknown): AgentFleetControlAction | undefined {
  return value === 'pause' || value === 'resume' || value === 'takeover' || value === 'stop' ? value : undefined
}

function normalizeControlReceipt(value: unknown): AgentFleetControlReceipt | undefined {
  if (!isRecord(value)) return undefined
  const action = normalizeControlAction(value.action)
  const recordedAt = typeof value.recordedAt === 'string' ? value.recordedAt : null
  const label = typeof value.label === 'string' ? value.label : null
  const detail = typeof value.detail === 'string' ? value.detail : null
  const status = value.status === 'human_review_required' ? 'human_review_required' : value.status === 'available' ? 'available' : null
  if (!action || !recordedAt || !label || !detail || !status) return undefined
  return { action, status, recordedAt, label, detail }
}

export function buildAgentFleetControlReceipt(action: AgentFleetControlAction, now?: string): AgentFleetControlReceipt {
  const recordedAt = isoNow(now)
  if (action === 'resume') {
    return {
      action,
      status: 'available',
      recordedAt,
      label: 'Fleet resumed',
      detail: 'New agent work may continue under the current mode and evidence gates.',
    }
  }
  if (action === 'pause') {
    return {
      action,
      status: 'human_review_required',
      recordedAt,
      label: 'Fleet paused',
      detail: 'New agent work is held until a human resumes the fleet.',
    }
  }
  if (action === 'takeover') {
    return {
      action,
      status: 'human_review_required',
      recordedAt,
      label: 'Human takeover',
      detail: 'New agent work is held and the workspace is in review mode.',
    }
  }
  return {
    action,
    status: 'human_review_required',
    recordedAt,
    label: 'Stop requested',
    detail: 'New agent work is stopped; already-applied changes still require evidence review.',
  }
}

export function buildDefaultAgentFleetPreferences(now?: string): AgentFleetPreferences {
  return {
    version: 1,
    centralAgent: DEFAULT_CENTRAL_AGENT,
    enabledAgents: fallbackAgents,
    paused: false,
    mode: 'coordinator-first',
    updatedAt: isoNow(now),
  }
}

export function readAgentFleetPreferencesFromSettings(settings: unknown): AgentFleetPreferences | null {
  if (!isRecord(settings)) return null
  const raw = settings[AGENT_FLEET_SETTINGS_KEY]
  if (!isRecord(raw)) return null

  const centralAgent = normalizeAgentName(raw.centralAgent)
  return {
    version: 1,
    centralAgent,
    enabledAgents: normalizeEnabledAgents(raw.enabledAgents, centralAgent),
    paused: raw.paused === true,
    mode: normalizeMode(raw.mode, 'coordinator-first'),
    updatedAt: normalizeAgentName(raw.updatedAt, isoNow()),
    lastControlReceipt: normalizeControlReceipt(raw.lastControlReceipt),
  }
}

export function writeAgentFleetPreferencesToSettings(
  settings: unknown,
  preferences: AgentFleetPreferences
): Record<string, unknown> {
  return {
    ...(isRecord(settings) ? settings : {}),
    [AGENT_FLEET_SETTINGS_KEY]: preferences,
  }
}

export function mergeAgentFleetPreferences(
  current: AgentFleetPreferences,
  patch: AgentFleetPreferencesPatch,
  now?: string
): AgentFleetPreferences {
  const centralAgent = normalizeAgentName(patch.centralAgent, current.centralAgent)
  const action = normalizeControlAction(patch.action)
  const actionDrivenPatch: Partial<Pick<AgentFleetPreferences, 'paused' | 'mode' | 'lastControlReceipt'>> =
    action === 'resume'
      ? { paused: false, mode: current.mode, lastControlReceipt: buildAgentFleetControlReceipt(action, now) }
      : action === 'pause'
        ? { paused: true, mode: current.mode, lastControlReceipt: buildAgentFleetControlReceipt(action, now) }
        : action === 'takeover' || action === 'stop'
          ? { paused: true, mode: 'review-only' as AgentFleetMode, lastControlReceipt: buildAgentFleetControlReceipt(action, now) }
          : {}
  return {
    version: 1,
    centralAgent,
    enabledAgents: normalizeEnabledAgents(patch.enabledAgents ?? current.enabledAgents, centralAgent),
    paused: actionDrivenPatch.paused ?? (typeof patch.paused === 'boolean' ? patch.paused : current.paused),
    mode: actionDrivenPatch.mode ?? normalizeMode(patch.mode, current.mode),
    updatedAt: isoNow(now),
    lastControlReceipt: actionDrivenPatch.lastControlReceipt ?? current.lastControlReceipt,
  }
}

function buildHeldCostReceipt(): AgentFleetCostReceipt {
  return {
    status: 'held',
    label: 'Cost pending',
    detail: 'Fleet-level cost is held until the metering ledger is attached to this snapshot.',
  }
}

function agentsFromStateAndManifest(
  state: AgenticProductionState,
  manifest: RepositoryCartographyManifest | null | undefined,
  preferences: AgentFleetPreferences
): string[] {
  const graphAgents = Object.values(state.graphs).flatMap((nodes) => nodes.map((node) => node.ownerAgent))
  const handoffAgents = manifest?.agentHandoffs.map((handoff) => handoff.agent) ?? []
  return unique([preferences.centralAgent, ...preferences.enabledAgents, ...handoffAgents, ...graphAgents, ...fallbackAgents])
}

function memberStatus(input: {
  paused: boolean
  handoffStatus: AgentHandoffPacketStatus
  scopeMode: AgentScopeMode
  blockedUntil: string[]
}): AgentFleetMemberStatus {
  if (input.paused) return 'paused'
  if (input.handoffStatus === 'blocked' || input.blockedUntil.length > 0) return 'blocked'
  if (input.handoffStatus === 'needs-review' || input.scopeMode === 'read-only') return 'attention'
  return 'ready'
}

function buildSummary(input: {
  hasManifest: boolean
  centralAgent: string
  readyCount: number
  blockedCount: number
  totalCount: number
}): string {
  if (!input.hasManifest) {
    return `${input.centralAgent} is holding the fleet in planning mode until Repository Cartography maps the project.`
  }
  if (input.blockedCount > 0) {
    return `${input.centralAgent} is coordinating ${input.totalCount} agents with ${input.blockedCount} blocked lanes that need review.`
  }
  return `${input.centralAgent} is coordinating ${input.readyCount}/${input.totalCount} ready lanes with scoped ownership and evidence gates.`
}

function buildComposer(input: { mode: AgentFleetMode; centralAgent: string; paused: boolean; hasManifest: boolean }) {
  if (input.paused) {
    return {
      primaryMode: 'Review paused fleet',
      secondaryModes: ['Resume after evidence review', 'Open Mission Ledger'],
      switcherHint: 'Fleet is paused; keep chat in review mode until a human resumes work.',
    }
  }

  if (!input.hasManifest) {
    return {
      primaryMode: 'Ask coordinator to map context',
      secondaryModes: ['Run Repository Cartography', 'Add Project Brain details'],
      switcherHint: 'Do not delegate broad edits until the project is mapped.',
    }
  }

  if (input.mode === 'selected-agent') {
    return {
      primaryMode: 'Talk to selected specialist',
      secondaryModes: [`Escalate to ${input.centralAgent}`, 'Review evidence'],
      switcherHint: 'Use specialist mode for scoped implementation; escalate conflicts to the senior coordinator.',
    }
  }

  if (input.mode === 'review-only') {
    return {
      primaryMode: 'Review evidence and approvals',
      secondaryModes: [`Ask ${input.centralAgent}`, 'Open diffs'],
      switcherHint: 'Review-only mode prevents new work from hiding risk behind chat velocity.',
    }
  }

  return {
    primaryMode: `Ask ${input.centralAgent}`,
    secondaryModes: ['Delegate to specialist', 'Review evidence', 'Approve or pause'],
    switcherHint: 'Coordinator-first mode keeps parallel agents aligned without turning the UI into a noisy control room.',
  }
}

function normalizePath(input: string): string {
  return input.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+/g, '/').trim()
}

function isSameOrNestedPath(a: string, b: string): boolean {
  const left = normalizePath(a)
  const right = normalizePath(b)
  if (!left || !right) return false
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`)
}

function toTime(value: string | null | undefined): number | null {
  if (!value) return null
  const time = Date.parse(value)
  return Number.isFinite(time) ? time : null
}

function locksForMember(agent: string, ownedSurfaces: { path: string }[], locks: AgentSurfaceLock[]): AgentSurfaceLock[] {
  return locks.filter((lock) => {
    if (lock.agent === agent) return true
    return lock.paths.some((lockedPath) => ownedSurfaces.some((surface) => isSameOrNestedPath(lockedPath, surface.path)))
  })
}

function staleSurfacesForMember(
  manifest: RepositoryCartographyManifest | null | undefined,
  ownedSurfaces: { path: string; lastModified?: string }[]
): string[] {
  const manifestTime = toTime(manifest?.generatedAt)
  if (!manifestTime) return []

  return ownedSurfaces
    .filter((surface) => {
      const modifiedTime = toTime(surface.lastModified)
      return Boolean(modifiedTime && modifiedTime > manifestTime + 1_000)
    })
    .map((surface) => surface.path)
}

export function buildAgentFleetSnapshot(input: {
  projectId: string
  state: AgenticProductionState
  manifest?: RepositoryCartographyManifest | null
  preferences?: AgentFleetPreferences | null
  activeLocks?: AgentSurfaceLock[]
  now?: string
}): AgentFleetSnapshot {
  const preferences = input.preferences ?? buildDefaultAgentFleetPreferences(input.now)
  const hasManifest = Boolean(input.manifest)
  const candidateAgents = agentsFromStateAndManifest(input.state, input.manifest, preferences)
  const enabled = new Set(preferences.enabledAgents)
  const members = candidateAgents
    .filter((agent) => agent === preferences.centralAgent || enabled.has(agent))
    .map((agent): AgentFleetMemberSnapshot => {
      const packet = buildAgentHandoffPacket({
        projectId: input.projectId,
        agent,
        state: input.state,
        manifest: input.manifest,
        generatedAt: input.now,
      })
      const memberLocks = locksForMember(agent, packet.cartography.ownedSurfaces, input.activeLocks ?? [])
      const lockedSurfacePreview = unique(memberLocks.flatMap((lock) => lock.paths)).slice(0, 3)
      const staleSurfacePaths = staleSurfacesForMember(input.manifest, packet.cartography.ownedSurfaces)
      const isCentral = agent === preferences.centralAgent
      return {
        agent,
        role: isCentral ? 'senior-coordinator' : 'specialist',
        lane: packet.workContract.lane,
        status: memberStatus({
          paused: preferences.paused,
          handoffStatus: packet.status,
          scopeMode: packet.workContract.scopeLock.mode,
          blockedUntil: packet.workContract.blockedUntil,
        }),
        handoffStatus: packet.status,
        scopeMode: packet.workContract.scopeLock.mode,
        ownedSurfaceCount: packet.cartography.ownedSurfaces.length,
        activeLockCount: memberLocks.length,
        lockedSurfacePreview,
        staleSurfaceCount: staleSurfacePaths.length,
        staleSurfacePreview: staleSurfacePaths.slice(0, 3),
        nextAction: packet.nextActions[0] ?? packet.latestLedger.nextAction,
        blockedUntil: packet.workContract.blockedUntil,
        approvalRequiredFor: packet.workContract.approvalRequiredFor,
        canRunInParallelWith: packet.workContract.canRunInParallelWith,
      }
    })
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === 'senior-coordinator' ? -1 : 1
      const statusOrder: Record<AgentFleetMemberStatus, number> = { blocked: 4, attention: 3, paused: 2, ready: 1 }
      return statusOrder[b.status] - statusOrder[a.status] || b.ownedSurfaceCount - a.ownedSurfaceCount || a.agent.localeCompare(b.agent)
    })
    .slice(0, 12)

  const blockers = unique(members.flatMap((member) => member.blockedUntil)).slice(0, 8)
  const lockCoordination = buildAgentSurfaceLockSnapshot({
    projectId: input.projectId,
    locks: input.activeLocks ?? [],
    now: input.now,
  })
  const activeLockCount = lockCoordination.activeLockCount
  const staleSurfaceCount = unique(members.flatMap((member) => member.staleSurfacePreview)).length
  const readyCount = members.filter((member) => member.status === 'ready').length
  const blockedCount = members.filter((member) => member.status === 'blocked').length
  const central = members.find((member) => member.role === 'senior-coordinator')

  return {
    version: 1,
    projectId: input.projectId,
    mode: preferences.mode,
    paused: preferences.paused,
    hasManifest,
    centralAgent: preferences.centralAgent,
    summary: buildSummary({
      hasManifest,
      centralAgent: preferences.centralAgent,
      readyCount,
      blockedCount,
      totalCount: members.length,
    }),
    composer: buildComposer({
      mode: preferences.mode,
      centralAgent: preferences.centralAgent,
      paused: preferences.paused,
      hasManifest,
    }),
    controls: [
      'Change coordinator',
      'Pause all agents',
      'Approve selected work',
      'Review evidence',
      'Open Mission Ledger',
    ],
    costReceipt: buildHeldCostReceipt(),
    lastControlReceipt: preferences.lastControlReceipt,
    members,
    blockers,
    activeLockCount,
    staleSurfaceCount,
    lockCoordination,
    nextAction:
      central?.nextAction ??
      input.state.ledger[0]?.nextAction ??
      'Run Repository Cartography before parallel agent work.',
  }
}
