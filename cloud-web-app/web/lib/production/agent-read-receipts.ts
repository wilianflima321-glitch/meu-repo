import type { AgenticProductionState, MissionLedgerEntry } from './agentic-production-state'
import { mergeAgenticProductionState } from './agentic-production-state'
import type { RepositoryCartographyManifest, RepositorySurface } from './repository-cartography'
import type { ResearchIntelligencePacket } from './research-intelligence-bridge'

export const AGENT_READ_RECEIPTS_SETTINGS_KEY = 'aethelAgentReadReceipts'

export type AgentReadReceiptKind =
  | 'repository-cartography'
  | 'research-intelligence'
  | 'repo-surface'
  | 'mission-ledger'
  | 'browser-replay'
  | 'external-tool-plan'

export interface AgentReadReceiptInput {
  id?: string
  agent: string
  kind: AgentReadReceiptKind
  ref: string
  path?: string
  readAt?: string
  evidenceRefs?: string[]
  note?: string
}

export interface AgentReadReceipt {
  id: string
  agent: string
  kind: AgentReadReceiptKind
  ref: string
  path: string | null
  readAt: string
  evidenceRefs: string[]
  note: string | null
}

export interface AgentReadReceiptState {
  version: 1
  projectId: string
  updatedAt: string
  receipts: AgentReadReceipt[]
}

export type AgentReadinessDecision =
  | {
      allowed: true
      enforcement: 'skipped' | 'passed'
      reason: string
      metadata: AgentReadinessMetadata
    }
  | {
      allowed: false
      code:
        | 'AGENT_READ_RECEIPTS_REQUIRED'
        | 'AGENT_READ_RECEIPTS_CARTOGRAPHY_REQUIRED'
        | 'AGENT_READ_RECEIPTS_CARTOGRAPHY_UNREAD'
        | 'AGENT_READ_RECEIPTS_RESEARCH_UNREAD'
        | 'AGENT_READ_RECEIPTS_SURFACE_UNREAD'
        | 'AGENT_READ_RECEIPTS_RESEARCH_BLOCKED'
      status: number
      message: string
      metadata: AgentReadinessMetadata
    }

export interface AgentReadinessMetadata {
  agent: string
  targetPaths: string[]
  manifestId: string | null
  researchPacketId: string | null
  missing: string[]
  stale: string[]
  acceptedReceiptIds: string[]
  blockers: string[]
}

export interface EvaluateAgentReadinessInput {
  agent: string
  targetPaths: string[]
  enforceReadReceipts: boolean
  manifest: RepositoryCartographyManifest | null
  researchPacket?: ResearchIntelligencePacket | null
  receiptState?: AgentReadReceiptState | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function compact(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '').replace(/\/+/g, '/').trim()
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)
  return slug || 'receipt'
}

function unique(values: string[], limit = 80): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).slice(0, limit)
}

function isoNow(now?: string): string {
  return now ?? new Date().toISOString()
}

function toTime(value: string | null | undefined): number | null {
  if (!value) return null
  const time = Date.parse(value)
  return Number.isFinite(time) ? time : null
}

function normalizeAgent(value: string): string {
  return value.trim().toLowerCase()
}

function agentMatches(receipt: AgentReadReceipt, agent: string): boolean {
  const receiptAgent = normalizeAgent(receipt.agent)
  const targetAgent = normalizeAgent(agent)
  return receiptAgent === targetAgent || receiptAgent === 'producer agent' || receiptAgent === 'senior coordinator agent'
}

function normalizeReceipt(input: AgentReadReceiptInput, now: string): AgentReadReceipt {
  const agent = compact(input.agent) ?? 'Producer Agent'
  const ref = compact(input.ref) ?? 'unknown'
  const kind = input.kind
  const path = compact(input.path)
  const id = compact(input.id) ?? `read-receipt-${slugify(`${agent}-${kind}-${ref}-${path ?? ''}`)}`
  return {
    id,
    agent,
    kind,
    ref,
    path: path ? normalizePath(path) : null,
    readAt: compact(input.readAt) ?? now,
    evidenceRefs: unique(input.evidenceRefs ?? [], 40),
    note: compact(input.note) ?? null,
  }
}

export function buildAgentReadReceiptState(input: {
  projectId: string
  previous?: AgentReadReceiptState | null
  receipts?: AgentReadReceiptInput[]
  now?: string
}): AgentReadReceiptState {
  const now = isoNow(input.now)
  const previousReceipts = input.previous?.projectId === input.projectId ? input.previous.receipts : []
  const incoming = (input.receipts ?? []).map((receipt) => normalizeReceipt(receipt, now))
  const byId = new Map<string, AgentReadReceipt>()
  for (const receipt of [...previousReceipts, ...incoming]) {
    byId.set(receipt.id, receipt)
  }
  const receipts = Array.from(byId.values()).sort((left, right) => Date.parse(right.readAt) - Date.parse(left.readAt))

  return {
    version: 1,
    projectId: input.projectId,
    updatedAt: now,
    receipts,
  }
}

function findSurfaceForPath(path: string, surfaces: RepositorySurface[]): RepositorySurface | null {
  const normalizedPath = normalizePath(path)
  return (
    surfaces
      .filter((surface) => {
        const surfacePath = normalizePath(surface.path)
        return normalizedPath === surfacePath || normalizedPath.startsWith(`${surfacePath}/`) || surfacePath.endsWith(normalizedPath)
      })
      .sort((a, b) => normalizePath(b.path).length - normalizePath(a.path).length)[0] ?? null
  )
}

function receiptIsFresh(receipt: AgentReadReceipt | undefined, generatedAt: string | null | undefined): boolean {
  if (!receipt) return false
  const receiptTime = toTime(receipt.readAt)
  const generatedTime = toTime(generatedAt ?? null)
  if (!receiptTime) return false
  if (!generatedTime) return true
  return receiptTime + 1_000 >= generatedTime
}

function findReceipt(input: {
  receipts: AgentReadReceipt[]
  agent: string
  kind: AgentReadReceiptKind
  ref?: string
  path?: string
  generatedAt?: string | null
}): AgentReadReceipt | undefined {
  const normalizedPath = input.path ? normalizePath(input.path) : null
  return input.receipts.find((receipt) => {
    if (receipt.kind !== input.kind) return false
    if (!agentMatches(receipt, input.agent)) return false
    if (input.ref && receipt.ref !== input.ref) return false
    if (normalizedPath && receipt.path !== normalizedPath && receipt.ref !== normalizedPath) return false
    return receiptIsFresh(receipt, input.generatedAt)
  })
}

function baseMetadata(input: EvaluateAgentReadinessInput): AgentReadinessMetadata {
  return {
    agent: input.agent,
    targetPaths: input.targetPaths.map(normalizePath).filter(Boolean),
    manifestId: input.manifest?.id ?? null,
    researchPacketId: input.researchPacket?.id ?? null,
    missing: [],
    stale: [],
    acceptedReceiptIds: [],
    blockers: [],
  }
}

function researchHasOperationalWeight(packet: ResearchIntelligencePacket | null | undefined): boolean {
  return Boolean(packet && (packet.claims.length > 0 || packet.risks.length > 0 || packet.externalToolPlan.length > 0))
}

export function evaluateAgentReadinessForApply(input: EvaluateAgentReadinessInput): AgentReadinessDecision {
  const metadata = baseMetadata(input)
  const receipts = input.receiptState?.receipts ?? []

  if (!input.enforceReadReceipts) {
    return {
      allowed: true,
      enforcement: 'skipped',
      reason: 'Read receipt enforcement was not requested for this apply.',
      metadata,
    }
  }

  if (!input.manifest) {
    metadata.missing.push('repository-cartography')
    return {
      allowed: false,
      code: 'AGENT_READ_RECEIPTS_CARTOGRAPHY_REQUIRED',
      status: 428,
      message: 'Agent apply requires Repository Cartography before read receipts can be validated.',
      metadata,
    }
  }

  const blockerRisks = input.researchPacket?.risks.filter((risk) => risk.severity === 'blocker') ?? []
  if (blockerRisks.length > 0) {
    metadata.blockers.push(...blockerRisks.map((risk) => risk.title))
    return {
      allowed: false,
      code: 'AGENT_READ_RECEIPTS_RESEARCH_BLOCKED',
      status: 409,
      message: 'Research intelligence has blocker risks. Reconcile claims before agent apply.',
      metadata,
    }
  }

  const cartographyReceipt = findReceipt({
    receipts,
    agent: input.agent,
    kind: 'repository-cartography',
    ref: input.manifest.id,
    generatedAt: input.manifest.generatedAt,
  })
  if (!cartographyReceipt) {
    metadata.missing.push(`repository-cartography:${input.manifest.id}`)
    return {
      allowed: false,
      code: 'AGENT_READ_RECEIPTS_CARTOGRAPHY_UNREAD',
      status: 428,
      message: 'Agent must acknowledge the current Repository Cartography manifest before applying changes.',
      metadata,
    }
  }
  metadata.acceptedReceiptIds.push(cartographyReceipt.id)

  if (researchHasOperationalWeight(input.researchPacket)) {
    const researchReceipt = findReceipt({
      receipts,
      agent: input.agent,
      kind: 'research-intelligence',
      ref: input.researchPacket!.id,
      generatedAt: input.researchPacket!.generatedAt,
    })
    if (!researchReceipt) {
      metadata.missing.push(`research-intelligence:${input.researchPacket!.id}`)
      return {
        allowed: false,
        code: 'AGENT_READ_RECEIPTS_RESEARCH_UNREAD',
        status: 428,
        message: 'Agent must acknowledge current Research Intelligence before applying research-derived changes.',
        metadata,
      }
    }
    metadata.acceptedReceiptIds.push(researchReceipt.id)
  }

  const targetPaths = metadata.targetPaths
  for (const path of targetPaths) {
    const surface = findSurfaceForPath(path, input.manifest.surfaces)
    const surfaceReceipt = surface
      ? findReceipt({
          receipts,
          agent: input.agent,
          kind: 'repo-surface',
          ref: surface.id,
          generatedAt: input.manifest.generatedAt,
        }) ??
        findReceipt({
          receipts,
          agent: input.agent,
          kind: 'repo-surface',
          path: surface.path,
          generatedAt: input.manifest.generatedAt,
        })
      : findReceipt({
          receipts,
          agent: input.agent,
          kind: 'repo-surface',
          path,
          generatedAt: input.manifest.generatedAt,
        })

    if (!surfaceReceipt) {
      metadata.missing.push(surface ? `repo-surface:${surface.path}` : `repo-surface:${path}`)
      return {
        allowed: false,
        code: 'AGENT_READ_RECEIPTS_SURFACE_UNREAD',
        status: 428,
        message: 'Agent must acknowledge each target repository surface before applying changes.',
        metadata,
      }
    }
    metadata.acceptedReceiptIds.push(surfaceReceipt.id)
  }

  return {
    allowed: true,
    enforcement: 'passed',
    reason: 'Agent read receipts cover cartography, research, and target surfaces.',
    metadata: {
      ...metadata,
      acceptedReceiptIds: unique(metadata.acceptedReceiptIds, 80),
    },
  }
}

export function mergeAgentReadReceiptsIntoProductionState(
  state: AgenticProductionState,
  receiptState: AgentReadReceiptState
): AgenticProductionState {
  const latest = receiptState.receipts[0]
  const ledgerEntry: MissionLedgerEntry = {
    id: 'agent-read-receipts',
    phase: 'Agent read receipts',
    ownerAgent: 'Producer Agent',
    state: receiptState.receipts.length > 0 ? 'running' : 'planned',
    summary: `Captured ${receiptState.receipts.length} read receipts for agent context coverage.`,
    acceptance: [
      'Repository Cartography acknowledged',
      'Research Intelligence acknowledged when present',
      'Target repo surfaces acknowledged before apply',
    ],
    evidenceRefs: latest ? [`agent-read-receipt:${latest.id}`] : [],
    rollbackPlan: 'Remove stale read receipts and require agents to reread cartography/research before editing.',
    nextAction: 'Evaluate apply gates with read receipt enforcement enabled.',
    estimatedCostUsd: 0,
    updatedAt: receiptState.updatedAt,
  }

  return mergeAgenticProductionState(
    state,
    {
      brain: {
        technicalBible: {
          ...state.brain.technicalBible,
          constraints: unique([
            ...state.brain.technicalBible.constraints,
            'Agent applies require read receipts for cartography, research, and target surfaces when enforcement is enabled.',
          ], 80),
        },
      },
      ledger: [ledgerEntry, ...state.ledger.filter((entry) => entry.id !== ledgerEntry.id)],
    },
    receiptState.updatedAt
  )
}

export function readAgentReadReceiptStateFromSettings(settings: unknown): AgentReadReceiptState | null {
  if (!isRecord(settings)) return null
  const candidate = settings[AGENT_READ_RECEIPTS_SETTINGS_KEY]
  if (!isRecord(candidate)) return null
  if (candidate.version !== 1) return null
  if (typeof candidate.projectId !== 'string' || typeof candidate.updatedAt !== 'string' || !Array.isArray(candidate.receipts)) {
    return null
  }
  return candidate as unknown as AgentReadReceiptState
}

export function writeAgentReadReceiptStateToSettings(
  settings: unknown,
  receiptState: AgentReadReceiptState
): Record<string, unknown> {
  return {
    ...(isRecord(settings) ? settings : {}),
    [AGENT_READ_RECEIPTS_SETTINGS_KEY]: receiptState,
  }
}
