import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const authMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
}))

const entitlementMocks = vi.hoisted(() => ({
  requireEntitlementsForUser: vi.fn(),
}))

const loggerMocks = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}))

vi.mock('@/lib/auth-server', () => authMocks)
vi.mock('@/lib/entitlements', () => entitlementMocks)
vi.mock('@/lib/observability/logger', () => ({
  createComponentLogger: vi.fn(() => loggerMocks),
}))

import { GET } from '@/app/api/research/navigation-mesh/route'

const ENV_KEYS = [
  'AETHEL_HEADLESS_BROWSER_WORKER_ENABLED',
  'AETHEL_CLOUD_BROWSER_ENABLED',
  'AETHEL_CLOUD_BROWSER_URL',
  'AETHEL_CHROME_EXTENSION_ENABLED',
  'AETHEL_CHROME_CDP_URL',
  'AETHEL_COMPUTER_USE_SANDBOX_URL',
  'AETHEL_MOBILE_COMPANION_ENABLED',
  'BROWSER_OPERATOR_REPLAY_ENABLED',
  'BROWSER_OPERATOR_SCREENSHOT_CAPTURE_ENABLED',
  'BROWSER_OPERATOR_DOM_SNAPSHOT_ENABLED',
  'BROWSER_OPERATOR_PAUSE_CONTROL_ENABLED',
  'BROWSER_OPERATOR_HUMAN_TAKEOVER_ENABLED',
  'AETHEL_CREDENTIAL_VAULT_ENABLED',
  'AETHEL_BROWSER_NETWORK_ISOLATION_ENABLED',
]
const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))

function restoreEnv() {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

describe('api/research/navigation-mesh route', () => {
  afterEach(() => {
    restoreEnv()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    restoreEnv()
    authMocks.requireAuth.mockReturnValue({ userId: 'user-1', email: 'researcher@example.com' })
    entitlementMocks.requireEntitlementsForUser.mockResolvedValue({ plan: { id: 'studio' } })
  })

  it('returns a protected navigation mesh without exposing connector env values', async () => {
    process.env.AETHEL_CLOUD_BROWSER_URL = 'wss://secret-cloud-browser.example.test'
    process.env.AETHEL_HEADLESS_BROWSER_WORKER_ENABLED = 'true'
    process.env.AETHEL_BROWSER_NETWORK_ISOLATION_ENABLED = 'true'
    process.env.BROWSER_OPERATOR_REPLAY_ENABLED = 'true'
    process.env.BROWSER_OPERATOR_SCREENSHOT_CAPTURE_ENABLED = 'true'
    process.env.BROWSER_OPERATOR_DOM_SNAPSHOT_ENABLED = 'true'
    process.env.BROWSER_OPERATOR_PAUSE_CONTROL_ENABLED = 'true'

    const response = await GET(
      new NextRequest(
        'http://localhost:3000/api/research/navigation-mesh?missionKind=advanced-research&targetUrl=https://docs.example.com&intendedAction=read%20public%20docs',
      ),
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('x-aethel-capability')).toBe('AETHEL_RESEARCH_NAVIGATION_MESH')
    expect(payload.recommendedLane).toBe('headless-browser-worker')
    expect(payload.capabilityStatus).toBe('available')
    expect(JSON.stringify(payload)).not.toContain('secret-cloud-browser')
    expect(entitlementMocks.requireEntitlementsForUser).toHaveBeenCalledWith('user-1')
  })

  it('keeps navigation held when no browser lane is configured', async () => {
    const response = await GET(new NextRequest('http://localhost:3000/api/research/navigation-mesh?missionKind=content-capture'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.capabilityStatus).toBe('held')
    expect(payload.recommendedLane).toBeNull()
    expect(response.headers.get('x-aethel-capability-status')).toBe('held')
  })
})
