import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const authMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
}))

const entitlementMocks = vi.hoisted(() => ({
  requireFeatureForUser: vi.fn(),
}))

const deployMocks = vi.hoisted(() => ({
  checkDeployReadiness: vi.fn(),
  createDeployment: vi.fn(),
  getDeploymentStatus: vi.fn(),
  listDeployments: vi.fn(),
}))

const qaGateMocks = vi.hoisted(() => ({
  runQaGate: vi.fn(),
}))

vi.mock('@/lib/auth-server', () => authMocks)
vi.mock('@/lib/entitlements', () => entitlementMocks)
vi.mock('@/lib/deploy/vercel-deploy', () => deployMocks)
vi.mock('@/lib/server/qa-gate', () => qaGateMocks)

import { GET, POST } from '@/app/api/deploy/route'

describe('api/deploy route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.requireAuth.mockReturnValue({ userId: 'user-1' })
    entitlementMocks.requireFeatureForUser.mockResolvedValue({
      plan: { id: 'pro' },
      source: 'subscription',
    })
    qaGateMocks.runQaGate.mockResolvedValue({
      ok: true,
      durationMs: 1200,
      checks: [],
    })
  })

  it('returns 401 when creating deploy without authentication', async () => {
    authMocks.requireAuth.mockImplementation(() => {
      throw new Error('Unauthorized')
    })

    const req = new NextRequest('http://localhost:3000/api/deploy', {
      method: 'POST',
      body: JSON.stringify({ projectName: 'demo-project' }),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(req)
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload).toEqual({ error: 'Unauthorized' })
    expect(deployMocks.createDeployment).not.toHaveBeenCalled()
  })

  it('redacts deploy readiness details for the client', async () => {
    deployMocks.checkDeployReadiness.mockReturnValue({
      configured: false,
      tokenPresent: false,
      teamConfigured: false,
      canDeploy: false,
      missing: ['VERCEL_TOKEN', 'VERCEL_TEAM_ID'],
    })

    const req = new NextRequest('http://localhost:3000/api/deploy?readiness=true')
    const response = await GET(req)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.canDeploy).toBe(false)
    expect(payload.missing).toEqual(['deployment configuration'])
    expect(entitlementMocks.requireFeatureForUser).toHaveBeenCalledWith('user-1', 'build')
    expect(qaGateMocks.runQaGate).not.toHaveBeenCalled()
  })

  it('surfaces qa gate blockers in readiness mode', async () => {
    deployMocks.checkDeployReadiness.mockReturnValue({
      configured: true,
      tokenPresent: true,
      teamConfigured: true,
      canDeploy: true,
      missing: [],
    })
    qaGateMocks.runQaGate.mockResolvedValue({
      ok: false,
      durationMs: 980,
      checks: [
        { id: 'button-types', ok: false, stdout: '', stderr: 'bad buttons' },
        { id: 'hardcoded-colors', ok: true, stdout: '', stderr: '' },
      ],
      error: 'QA_GATE_BLOCKED',
    })

    const req = new NextRequest('http://localhost:3000/api/deploy?readiness=true')
    const response = await GET(req)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.canDeploy).toBe(false)
    expect(payload.missing).toEqual(['quality gate'])
    expect(payload.qaGate).toEqual({
      ok: false,
      blockers: ['button-types'],
      durationMs: 980,
    })
  })

  it('returns 503 when deploy runtime is not configured', async () => {
    deployMocks.checkDeployReadiness.mockReturnValue({
      configured: false,
      tokenPresent: false,
      teamConfigured: false,
      canDeploy: false,
      missing: ['VERCEL_TOKEN'],
    })

    const req = new NextRequest('http://localhost:3000/api/deploy', {
      method: 'POST',
      body: JSON.stringify({ projectName: 'demo-project' }),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(req)
    const payload = await response.json()

    expect(response.status).toBe(503)
    expect(payload.error).toBe('DEPLOY_NOT_CONFIGURED')
    expect(payload.missing).toEqual(['deployment configuration'])
    expect(deployMocks.createDeployment).not.toHaveBeenCalled()
  })

  it('creates a deployment for an entitled authenticated user', async () => {
    deployMocks.checkDeployReadiness.mockReturnValue({
      configured: true,
      tokenPresent: true,
      teamConfigured: true,
      canDeploy: true,
      missing: [],
    })
    deployMocks.createDeployment.mockResolvedValue({
      id: 'dep_123',
      url: 'https://demo.vercel.app',
      status: 'building',
    })

    const req = new NextRequest('http://localhost:3000/api/deploy', {
      method: 'POST',
      body: JSON.stringify({ projectName: 'demo-project' }),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(req)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.id).toBe('dep_123')
    expect(entitlementMocks.requireFeatureForUser).toHaveBeenCalledWith('user-1', 'build')
    expect(deployMocks.createDeployment).toHaveBeenCalledWith(
      expect.objectContaining({ projectName: 'demo-project' })
    )
  })

  it('blocks deploy creation when the qa gate fails', async () => {
    deployMocks.checkDeployReadiness.mockReturnValue({
      configured: true,
      tokenPresent: true,
      teamConfigured: true,
      canDeploy: true,
      missing: [],
    })
    qaGateMocks.runQaGate.mockResolvedValue({
      ok: false,
      durationMs: 1100,
      checks: [
        { id: 'button-types', ok: false, stdout: '', stderr: 'bad buttons' },
      ],
      error: 'QA_GATE_BLOCKED',
    })

    const req = new NextRequest('http://localhost:3000/api/deploy', {
      method: 'POST',
      body: JSON.stringify({ projectName: 'demo-project' }),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(req)
    const payload = await response.json()

    expect(response.status).toBe(412)
    expect(payload.error).toBe('DEPLOY_QA_GATE_BLOCKED')
    expect(payload.missing).toEqual(['quality gate'])
    expect(payload.qaGate).toEqual({
      ok: false,
      blockers: ['button-types'],
      durationMs: 1100,
    })
    expect(deployMocks.createDeployment).not.toHaveBeenCalled()
  })
})
