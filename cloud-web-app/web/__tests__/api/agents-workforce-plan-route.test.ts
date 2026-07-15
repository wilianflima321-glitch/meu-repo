import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const authMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
}))

const entitlementMocks = vi.hoisted(() => ({
  requireEntitlementsForUser: vi.fn(),
}))

vi.mock('@/lib/auth-server', () => authMocks)
vi.mock('@/lib/entitlements', () => entitlementMocks)

import { GET, POST } from '@/app/api/agents/workforce/plan/route'

function request(path: string, body?: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method: body ? 'POST' : 'GET',
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'content-type': 'application/json' } : undefined,
  })
}

describe('api/agents/workforce/plan route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.requireAuth.mockReturnValue({ userId: 'user-1', email: 'agent@example.com' })
    entitlementMocks.requireEntitlementsForUser.mockResolvedValue({
      plan: {
        id: 'pro',
        limits: { concurrent: 12 },
      },
    })
  })

  it('returns compact workforce topology and readiness for authenticated users', async () => {
    const response = await GET(request('/api/agents/workforce/plan'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.capability).toBe('agent_workforce_planning')
    expect(payload.capabilityStatus).toBe('READY')
    expect(payload.topology.squads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'game-production' }),
        expect.objectContaining({ id: 'research-intelligence' }),
        expect.objectContaining({ id: 'financial-account-safety' }),
      ])
    )
    expect(payload.readiness.ready).toBe(true)
    expect(payload.limits.maxAgentsForPlan).toBe(12)
  })

  it('plans AAA game missions through game production evidence and runtime blockers', async () => {
    const response = await POST(
      request('/api/agents/workforce/plan', {
        mission: 'Create a Resident Evil quality survival horror game with assets, rendering, playtest and release',
        missionType: 'game-production',
        requiresWrites: true,
        requiresHeavyRuntime: true,
        requiresRelease: true,
        itemCount: 40,
        maxCostUsd: 8,
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.plan.missionType).toBe('game-production')
    expect(payload.plan.selectedSquads).toEqual(expect.arrayContaining(['game-production', 'release-trust']))
    expect(payload.plan.selectedAgents).toEqual(expect.arrayContaining(['gameplay-engineer', 'asset-pipeline', 'performance-engineer']))
    expect(payload.plan.requiredEvidence.join(' ')).toContain('playtest replay')
    expect(payload.plan.blockers.join(' ')).toContain('Runtime Budget Gate')
  })

  it('keeps investment/browser missions human-held with signed approval requirements', async () => {
    const response = await POST(
      request('/api/agents/workforce/plan', {
        mission: 'Use Chrome to invest in stocks from the user brokerage account',
        requiresBrowser: true,
        requiresExternalAccounts: true,
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.plan.missionType).toBe('financial-investment')
    expect(payload.plan.executionMode).toBe('human-held')
    expect(payload.plan.requiredApprovals.join(' ')).toContain('signed human approval')
    expect(payload.plan.selectedSquads).toEqual(expect.arrayContaining(['browser-operations', 'financial-account-safety']))
  })

  it('rejects empty missions before creating a plan', async () => {
    const response = await POST(request('/api/agents/workforce/plan', { mission: '   ' }))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe('INVALID_MISSION')
  })

  it('keeps auth failures explicit', async () => {
    authMocks.requireAuth.mockImplementation(() => {
      throw new Error('Unauthorized')
    })

    const response = await GET(request('/api/agents/workforce/plan'))
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.error).toBe('Unauthorized')
  })
})
