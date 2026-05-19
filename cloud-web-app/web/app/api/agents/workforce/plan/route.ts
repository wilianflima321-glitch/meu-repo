import { NextRequest, NextResponse } from 'next/server'

import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { requireAuth } from '@/lib/auth-server'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { SUPPORTED_AGENT_TYPES } from '@/lib/agent-orchestrator'
import {
  buildAgentWorkforceTopology,
  evaluateAgentWorkforceTopologyReadiness,
  planAgentWorkforceForMission,
  type WorkforceMissionType,
  type WorkforceRiskLevel,
} from '@/lib/production/agent-workforce-topology'

export const runtime = 'nodejs'

type WorkforcePlanRequestBody = {
  mission?: unknown
  missionType?: unknown
  riskLevel?: unknown
  itemCount?: unknown
  maxCostUsd?: unknown
  requiresBrowser?: unknown
  requiresWrites?: unknown
  requiresRelease?: unknown
  requiresExternalAccounts?: unknown
  requiresHeavyRuntime?: unknown
}

const missionTypes: WorkforceMissionType[] = [
  'game-production',
  'app-platform',
  'research-development',
  'browser-operations',
  'financial-investment',
  'film-audio-production',
  'marketplace-commerce',
  'enterprise-release',
  'unknown',
]

const riskLevels: WorkforceRiskLevel[] = ['low', 'medium', 'high', 'critical']

function normalizeMissionType(value: unknown): WorkforceMissionType | undefined {
  return typeof value === 'string' && missionTypes.includes(value as WorkforceMissionType)
    ? (value as WorkforceMissionType)
    : undefined
}

function normalizeRiskLevel(value: unknown): WorkforceRiskLevel | undefined {
  return typeof value === 'string' && riskLevels.includes(value as WorkforceRiskLevel)
    ? (value as WorkforceRiskLevel)
    : undefined
}

function normalizeBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function normalizePositiveNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return value > 0 ? value : undefined
}

function maxAgentsForEntitlement(concurrentLimit: unknown): number {
  if (concurrentLimit === -1) return SUPPORTED_AGENT_TYPES.length
  if (typeof concurrentLimit !== 'number' || !Number.isFinite(concurrentLimit)) return 1
  return Math.max(1, Math.min(SUPPORTED_AGENT_TYPES.length, Math.floor(concurrentLimit)))
}

function compactTopology() {
  const topology = buildAgentWorkforceTopology()
  return {
    version: topology.version,
    tiers: topology.tiers.map((tier) => ({
      level: tier.level,
      label: tier.label,
      purpose: tier.purpose,
      agentCount: tier.agents.length,
    })),
    squads: topology.squads.map((squad) => ({
      id: squad.id,
      label: squad.label,
      coordinator: squad.coordinator,
      agentCount: squad.agents.length,
      defaultParallelWorkers: squad.defaultParallelWorkers,
      maxParallelWorkers: squad.maxParallelWorkers,
      runtimeLanes: squad.runtimeLanes,
    })),
    globalPolicies: topology.globalPolicies,
    highRiskActions: topology.highRiskActions,
    costPolicy: topology.costPolicy,
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = requireAuth(request)
    const entitlements = await requireEntitlementsForUser(auth.userId)
    const maxAgentsForPlan = maxAgentsForEntitlement(entitlements.plan.limits.concurrent)
    const topology = buildAgentWorkforceTopology()
    const readiness = evaluateAgentWorkforceTopologyReadiness(topology)

    return NextResponse.json({
      capability: 'agent_workforce_planning',
      capabilityStatus: readiness.ready ? 'READY' : 'PARTIAL',
      topology: compactTopology(),
      readiness,
      limits: {
        planId: entitlements.plan.id,
        maxAgentsForPlan,
        concurrentLimit: entitlements.plan.limits.concurrent,
      },
      timestamp: Date.now(),
    })
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError('Failed to get agent workforce topology', 500)
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = requireAuth(request)
    const entitlements = await requireEntitlementsForUser(auth.userId)
    const body = (await request.json().catch(() => null)) as WorkforcePlanRequestBody | null

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'INVALID_BODY', message: 'Body JSON invalido.' }, { status: 400 })
    }

    const mission = typeof body.mission === 'string' ? body.mission.trim() : ''
    if (!mission) {
      return NextResponse.json({ error: 'INVALID_MISSION', message: 'Mission obrigatoria.' }, { status: 400 })
    }

    const maxAgentsForPlan = maxAgentsForEntitlement(entitlements.plan.limits.concurrent)
    const topology = buildAgentWorkforceTopology()
    const readiness = evaluateAgentWorkforceTopologyReadiness(topology)
    const plan = planAgentWorkforceForMission({
      mission,
      missionType: normalizeMissionType(body.missionType),
      riskLevel: normalizeRiskLevel(body.riskLevel),
      itemCount: normalizePositiveNumber(body.itemCount),
      planConcurrencyLimit: maxAgentsForPlan,
      maxCostUsd: normalizePositiveNumber(body.maxCostUsd) ?? null,
      requiresBrowser: normalizeBoolean(body.requiresBrowser),
      requiresWrites: normalizeBoolean(body.requiresWrites),
      requiresRelease: normalizeBoolean(body.requiresRelease),
      requiresExternalAccounts: normalizeBoolean(body.requiresExternalAccounts),
      requiresHeavyRuntime: normalizeBoolean(body.requiresHeavyRuntime),
    })

    return NextResponse.json({
      capability: 'agent_workforce_planning',
      capabilityStatus: readiness.ready ? 'READY' : 'PARTIAL',
      plan,
      readiness,
      limits: {
        planId: entitlements.plan.id,
        maxAgentsForPlan,
        concurrentLimit: entitlements.plan.limits.concurrent,
      },
      timestamp: Date.now(),
    })
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError('Failed to plan agent workforce', 500)
  }
}
