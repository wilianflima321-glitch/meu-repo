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

import { GET } from '@/app/api/runtime/toolchain-readiness/route'

const ENV_KEYS = [
  'OPENAI_API_KEY',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'S3_BUCKET',
  'NEXT_PUBLIC_AETHEL_PIXEL_STREAM_URL',
  'AETHEL_RUNTIME_TOOL_IDS',
  'AETHEL_APPROVED_PROCESS_IDS',
]
const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))

function restoreEnv() {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

describe('api/runtime/toolchain-readiness route', () => {
  afterEach(() => {
    restoreEnv()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    restoreEnv()
    authMocks.requireAuth.mockReturnValue({ userId: 'user-1', email: 'producer@example.com' })
    entitlementMocks.requireEntitlementsForUser.mockResolvedValue({ plan: { id: 'studio' } })
  })

  it('returns a protected readiness snapshot for selected lanes without exposing env values', async () => {
    process.env.OPENAI_API_KEY = 'sk-secret-value'
    process.env.AWS_ACCESS_KEY_ID = 'asset-access'
    process.env.AWS_SECRET_ACCESS_KEY = 'asset-secret'
    process.env.S3_BUCKET = 'assets'
    process.env.NEXT_PUBLIC_AETHEL_PIXEL_STREAM_URL = 'wss://stream.example.test'

    const response = await GET(
      new NextRequest('http://localhost:3000/api/runtime/toolchain-readiness?lanes=game-vertical-slice,complete-game-plan'),
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('x-aethel-capability')).toBe('AETHEL_RUNTIME_TOOLCHAIN_READINESS')
    expect(payload.laneCount).toBe(2)
    expect(payload.environment.configuredServiceIds).toEqual(
      expect.arrayContaining(['ai-provider', 'object-storage', 'pixel-stream-url']),
    )
    expect(JSON.stringify(payload)).not.toContain('sk-secret-value')
    expect(JSON.stringify(payload)).not.toContain('asset-secret')
    expect(entitlementMocks.requireEntitlementsForUser).toHaveBeenCalledWith('user-1')
  })

  it('reports held capability when no tools or services are configured', async () => {
    for (const key of ENV_KEYS) delete process.env[key]

    const response = await GET(new NextRequest('http://localhost:3000/api/runtime/toolchain-readiness?lanes=asset-finalization'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.capabilityStatus).toBe('held')
    expect(payload.blockedLaneCount).toBe(1)
    expect(payload.matrix.lanes[0].blockers.join(' ')).toContain('AI-generated meshes stay draft')
    expect(response.headers.get('x-aethel-capability-status')).toBe('held')
  })
})
