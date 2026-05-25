import { createHmac, timingSafeEqual } from 'node:crypto'

import {
  buildStudioLocalCookQueuePlan,
  coerceStudioLocalCookJobRequest,
  type StudioLocalCookJobRequest,
  type StudioLocalCookQueuePlan,
} from '@/lib/production/studio-local-cook-queue'
import { buildRuntimeJobRequest, type RuntimeJobRequest } from '@/lib/production/governed-runtime-jobs'

export interface StudioLocalDispatchApproval {
  version: 1
  nonce: string
  signedAt: string
  expiresAt: string
  signedByUserId: string
  signature: string
}

export interface StudioLocalCookDispatchRequest {
  cookRequest: StudioLocalCookJobRequest
  approval: StudioLocalDispatchApproval
}

export interface StudioLocalCookDispatchDecision {
  version: 1
  dispatch: 'studio-local-cook-dispatch'
  dispatchAllowed: boolean
  executionAllowed: boolean
  state: 'queued' | 'held' | 'blocked'
  blockers: string[]
  approvalEvidenceRefs: string[]
  governedJob: RuntimeJobRequest
  queuePlan: StudioLocalCookQueuePlan
  queueNote:
    | 'Studio Local cook dispatch accepted. Native daemon may queue the job, but release remains held for captured evidence and human review.'
    | 'Studio Local cook dispatch held. Resolve missing tools, evidence, capability, or approval before daemon execution.'
  nextAction: string
}

export interface StudioLocalDispatchVerification {
  valid: boolean
  blockers: string[]
}

type DispatchPayloadInput = {
  projectId: string
  userId: string
  cookRequest: StudioLocalCookJobRequest
  approval: Omit<StudioLocalDispatchApproval, 'signature'> | StudioLocalDispatchApproval
}

const DISPATCH_REQUIRED_EVIDENCE = [
  'signed Studio Local daemon dispatch',
  'fresh Studio Local capability probe',
  'human art-direction approval',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function pickString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

function parseTime(value: string): number | null {
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

function hmacHex(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

function safeEqualHex(left: string, right: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(left) || !/^[a-f0-9]{64}$/i.test(right)) return false
  const leftBuffer = Buffer.from(left, 'hex')
  const rightBuffer = Buffer.from(right, 'hex')
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

export function coerceStudioLocalDispatchApproval(input: unknown): StudioLocalDispatchApproval | null {
  if (!isRecord(input)) return null
  const nonce = pickString(input.nonce)
  const signedAt = pickString(input.signedAt)
  const expiresAt = pickString(input.expiresAt)
  const signedByUserId = pickString(input.signedByUserId)
  const signature = pickString(input.signature)
  if (input.version !== 1 || !nonce || !signedAt || !expiresAt || !signedByUserId || !signature) return null

  return {
    version: 1,
    nonce,
    signedAt,
    expiresAt,
    signedByUserId,
    signature,
  }
}

export function coerceStudioLocalCookDispatchRequest(input: unknown): StudioLocalCookDispatchRequest | null {
  if (!isRecord(input)) return null
  const cookRequest = coerceStudioLocalCookJobRequest(input.cookRequest)
  const approval = coerceStudioLocalDispatchApproval(input.approval)
  if (!cookRequest || !approval) return null
  return { cookRequest, approval }
}

export function canonicalStudioLocalCookDispatchPayload(input: DispatchPayloadInput): string {
  return stableJson({
    version: 1,
    projectId: input.projectId,
    userId: input.userId,
    assetId: input.cookRequest.assetId,
    sourceSha256: input.cookRequest.sourceSha256,
    targetTier: input.cookRequest.targetTier,
    estimatedCostUsd: input.cookRequest.estimatedCostUsd,
    estimatedMinutes: input.cookRequest.estimatedMinutes,
    nonce: input.approval.nonce,
    signedAt: input.approval.signedAt,
    expiresAt: input.approval.expiresAt,
    signedByUserId: input.approval.signedByUserId,
  })
}

export function createStudioLocalCookDispatchSignature(input: DispatchPayloadInput, secret: string): string {
  return hmacHex(canonicalStudioLocalCookDispatchPayload(input), secret)
}

export function verifyStudioLocalCookDispatchApproval(input: {
  projectId: string
  userId: string
  cookRequest: StudioLocalCookJobRequest
  approval: StudioLocalDispatchApproval
  secret: string
  now?: string
}): StudioLocalDispatchVerification {
  const blockers: string[] = []
  const nowMs = parseTime(input.now ?? new Date().toISOString()) ?? Date.now()
  const signedAtMs = parseTime(input.approval.signedAt)
  const expiresAtMs = parseTime(input.approval.expiresAt)

  if (!input.secret || input.secret.trim().length < 16) blockers.push('Studio Local dispatch signing secret is not configured.')
  if (input.approval.version !== 1) blockers.push('Studio Local dispatch approval version is unsupported.')
  if (input.approval.nonce.length < 12) blockers.push('Studio Local dispatch nonce is too short.')
  if (input.approval.signedByUserId !== input.userId) blockers.push('Studio Local dispatch approval signer does not match the authenticated user.')
  if (signedAtMs === null) blockers.push('Studio Local dispatch signedAt timestamp is invalid.')
  if (expiresAtMs === null) blockers.push('Studio Local dispatch expiresAt timestamp is invalid.')
  if (signedAtMs !== null && signedAtMs > nowMs + 5 * 60 * 1000) blockers.push('Studio Local dispatch approval is signed too far in the future.')
  if (expiresAtMs !== null && expiresAtMs <= nowMs) blockers.push('Studio Local dispatch approval is expired.')
  if (signedAtMs !== null && expiresAtMs !== null && expiresAtMs <= signedAtMs) blockers.push('Studio Local dispatch approval expires before it becomes valid.')

  if (blockers.length === 0) {
    const expected = createStudioLocalCookDispatchSignature(input, input.secret)
    if (!safeEqualHex(input.approval.signature, expected)) blockers.push('Studio Local dispatch signature is invalid.')
  }

  return {
    valid: blockers.length === 0,
    blockers,
  }
}

function queueBlockersFor(plan: StudioLocalCookQueuePlan): string[] {
  return unique([
    ...plan.blockers,
    ...plan.missingTools.map((tool) => `Missing Studio Local cook tool: ${tool}`),
    ...plan.missingEvidence.map((item) => `Missing cook evidence: ${item}`),
  ])
}

export function buildStudioLocalCookDispatchDecision(input: {
  request: StudioLocalCookDispatchRequest
  projectId: string
  userId: string
  secret: string
  now?: string
}): StudioLocalCookDispatchDecision {
  const queuePlan = buildStudioLocalCookQueuePlan({
    request: input.request.cookRequest,
    projectId: input.projectId,
    now: input.now,
  })
  const approval = verifyStudioLocalCookDispatchApproval({
    projectId: input.projectId,
    userId: input.userId,
    cookRequest: input.request.cookRequest,
    approval: input.request.approval,
    secret: input.secret,
    now: input.now,
  })
  const queueBlockers = queueBlockersFor(queuePlan)
  const blockers = unique([...queueBlockers, ...approval.blockers])
  const dispatchAllowed = blockers.length === 0
  const approvalEvidenceRefs = unique([
    ...input.request.cookRequest.evidenceRefs,
    `studio-local-dispatch:${input.request.approval.nonce}`,
    `human approval:${input.userId}`,
    `signed-dispatch:${input.request.cookRequest.assetId}`,
  ])
  const state: StudioLocalCookDispatchDecision['state'] = dispatchAllowed
    ? 'queued'
    : queuePlan.state === 'held'
      ? 'held'
      : 'blocked'

  const governedJob = buildRuntimeJobRequest({
    id: `studio-local-cook-dispatch-${input.request.cookRequest.assetId}-${input.now ?? new Date().toISOString()}`,
    kind: 'asset-import',
    projectId: input.projectId,
    requestedRuntimeTarget: 'local-native',
    runtimeCapabilityStatus: dispatchAllowed ? 'available' : state === 'held' ? 'held' : 'blocked',
    requestedByAgent: input.request.cookRequest.requestedByAgent,
    reason: `Signed Studio Local daemon dispatch for ${input.request.cookRequest.assetName}: ${input.request.cookRequest.goal}`,
    requiredCapabilities: queuePlan.governedJob.requiredCapabilities,
    requiredEvidence: unique([...queuePlan.requiredEvidence, ...DISPATCH_REQUIRED_EVIDENCE, 'runtime execution evidence', 'human release approval']),
    evidenceRefs: approvalEvidenceRefs,
    blockers,
    estimatedCostUsd: input.request.cookRequest.estimatedCostUsd,
    estimatedMinutes: input.request.cookRequest.estimatedMinutes,
    rollbackPlan: `Stop the daemon cook for ${input.request.cookRequest.assetName}, keep the previous approved bundle, and preserve the signed dispatch evidence for audit.`,
    approvedForQueue: dispatchAllowed,
    now: input.now,
  })

  return {
    version: 1,
    dispatch: 'studio-local-cook-dispatch',
    dispatchAllowed,
    executionAllowed: dispatchAllowed && governedJob.executionAllowed,
    state,
    blockers,
    approvalEvidenceRefs,
    governedJob,
    queuePlan,
    queueNote: dispatchAllowed
      ? 'Studio Local cook dispatch accepted. Native daemon may queue the job, but release remains held for captured evidence and human review.'
      : 'Studio Local cook dispatch held. Resolve missing tools, evidence, capability, or approval before daemon execution.',
    nextAction: dispatchAllowed
      ? 'Send the signed job to the Studio Local daemon, capture runtime execution evidence, then hold release for human review.'
      : 'Resolve queue blockers and request a fresh signed Studio Local daemon dispatch.',
  }
}
