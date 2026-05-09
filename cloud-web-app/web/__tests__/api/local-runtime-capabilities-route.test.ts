import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const authMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
}))

const storeMocks = vi.hoisted(() => ({
  loadLatestLocalRuntimeCapabilitySnapshot: vi.fn(),
  saveLocalRuntimeCapabilitySnapshot: vi.fn(),
}))

vi.mock('@/lib/auth-server', () => authMocks)
vi.mock('@/lib/server/local-runtime-capability-store', () => storeMocks)

import { GET, POST } from '@/app/api/runtime/local-capabilities/route'
import {
  signStudioLocalSyncPayload,
  STUDIO_LOCAL_SYNC_SIGNATURE_SECRET_ENV,
} from '@/lib/server/studio-local-sync-signature'

const originalStudioLocalSyncSecret = process.env[STUDIO_LOCAL_SYNC_SIGNATURE_SECRET_ENV]

function buildStudioLocalProbe(generatedAt = '2026-05-04T14:04:00.000Z') {
  return {
    version: 1,
    generatedAt,
    deviceId: 'studio-local-device',
    os: 'Windows_NT',
    arch: 'x64',
    cpuLogicalCores: 12,
    totalMemoryMb: 32768,
    availableMemoryMb: 24576,
    storageFreeMb: 262144,
    gpuAvailable: true,
    gpuName: 'RTX Studio GPU',
    webGpuAvailable: true,
    webNnAvailable: false,
    npuAvailable: true,
    windowsMlAvailable: true,
    directMlAvailable: true,
    onnxRuntimeAvailable: true,
    ffmpegAvailable: true,
    rapierAvailable: true,
    browserAutomationAvailable: true,
    thermalState: 'nominal',
    storagePressure: 'ok',
    preferredExecutor: 'local-native',
    signature: 'probe-signature',
  }
}

describe('api/runtime/local-capabilities route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    if (originalStudioLocalSyncSecret === undefined) {
      delete process.env[STUDIO_LOCAL_SYNC_SIGNATURE_SECRET_ENV]
    } else {
      process.env[STUDIO_LOCAL_SYNC_SIGNATURE_SECRET_ENV] = originalStudioLocalSyncSecret
    }
    authMocks.requireAuth.mockReturnValue({ userId: 'user-1' })
  })

  afterEach(() => {
    if (originalStudioLocalSyncSecret === undefined) {
      delete process.env[STUDIO_LOCAL_SYNC_SIGNATURE_SECRET_ENV]
    } else {
      process.env[STUDIO_LOCAL_SYNC_SIGNATURE_SECRET_ENV] = originalStudioLocalSyncSecret
    }
  })

  it('returns 401 when reading without authentication', async () => {
    authMocks.requireAuth.mockImplementation(() => {
      throw new Error('Unauthorized')
    })

    const response = await GET(new NextRequest('http://localhost:3000/api/runtime/local-capabilities'))
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload).toEqual({ error: 'Unauthorized' })
  })

  it('returns the latest stored snapshot for the authenticated user', async () => {
    storeMocks.loadLatestLocalRuntimeCapabilitySnapshot.mockResolvedValue({
      userId: 'user-1',
      deviceId: 'device-a',
      deviceLabel: 'Aethel Studio Local',
      source: 'native-bridge',
      syncedAt: '2026-05-02T16:02:00.000Z',
      report: {
        version: 1,
        hostKind: 'desktop-app',
        transport: 'custom-event',
        os: 'windows',
        receivedAt: '2026-05-02T16:01:00.000Z',
        preferredExecutor: 'local-native',
      },
    })

    const response = await GET(new NextRequest('http://localhost:3000/api/runtime/local-capabilities'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.snapshot).toMatchObject({
      deviceId: 'device-a',
      source: 'native-bridge',
      syncedAt: '2026-05-02T16:02:00.000Z',
    })
    expect(storeMocks.loadLatestLocalRuntimeCapabilitySnapshot).toHaveBeenCalledWith('user-1')
  })

  it('rejects malformed runtime reports', async () => {
    const request = new NextRequest('http://localhost:3000/api/runtime/local-capabilities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        deviceId: 'device-a',
        report: {
          hostKind: 'desktop-app',
        },
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe('INVALID_LOCAL_RUNTIME_REPORT')
    expect(storeMocks.saveLocalRuntimeCapabilitySnapshot).not.toHaveBeenCalled()
  })

  it('persists sanitized reports for authenticated users', async () => {
    storeMocks.saveLocalRuntimeCapabilitySnapshot.mockImplementation(async (input: {
      userId: string
      deviceId: string
      deviceLabel?: string | null
      source?: string
      report: Record<string, unknown>
    }) => ({
      userId: input.userId,
      deviceId: input.deviceId,
      deviceLabel: input.deviceLabel,
      source: input.source,
      syncedAt: '2026-05-02T16:05:00.000Z',
      report: input.report,
    }))

    const request = new NextRequest('http://localhost:3000/api/runtime/local-capabilities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        deviceId: 'device-a',
        deviceLabel: 'Aethel Studio Local',
        report: {
          version: 1,
          hostKind: 'desktop-app',
          transport: 'custom-event',
          os: 'windows',
          receivedAt: '2026-05-02T16:04:00.000Z',
          preferredExecutor: 'local-native',
          npuAvailable: true,
        },
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.ok).toBe(true)
    expect(payload.snapshot.deviceId).toBe('device-a')
    expect(storeMocks.saveLocalRuntimeCapabilitySnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        deviceId: 'device-a',
        deviceLabel: 'Aethel Studio Local',
      })
    )
  })

  it('accepts Studio Local Runtime Kernel probe payloads', async () => {
    storeMocks.saveLocalRuntimeCapabilitySnapshot.mockImplementation(async (input: {
      userId: string
      deviceId: string
      deviceLabel?: string | null
      source?: string
      report: Record<string, unknown>
    }) => ({
      userId: input.userId,
      deviceId: input.deviceId,
      deviceLabel: input.deviceLabel,
      source: input.source,
      syncedAt: '2026-05-05T14:05:00.000Z',
      report: input.report,
    }))

    const request = new NextRequest('http://localhost:3000/api/runtime/local-capabilities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        deviceId: 'studio-local-device',
        source: 'api-sync',
        report: buildStudioLocalProbe(),
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.ok).toBe(true)
    expect(storeMocks.saveLocalRuntimeCapabilitySnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        deviceId: 'studio-local-device',
        source: 'api-sync',
        report: expect.objectContaining({
          hostKind: 'native-daemon',
          transport: 'api-sync',
          preferredExecutor: 'local-native',
          maxLocalAgents: 4,
          localModelPolicy: 'allow-small-models',
        }),
      })
    )
  })

  it('rejects unsigned Studio Local api-sync probes when sync signing is configured', async () => {
    process.env[STUDIO_LOCAL_SYNC_SIGNATURE_SECRET_ENV] = 'test-secret'
    const request = new NextRequest('http://localhost:3000/api/runtime/local-capabilities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        deviceId: 'studio-local-device',
        source: 'api-sync',
        report: buildStudioLocalProbe(new Date().toISOString()),
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.error).toBe('STUDIO_LOCAL_SYNC_SIGNATURE_REQUIRED')
    expect(storeMocks.saveLocalRuntimeCapabilitySnapshot).not.toHaveBeenCalled()
  })

  it('accepts signed Studio Local api-sync probes when sync signing is configured', async () => {
    process.env[STUDIO_LOCAL_SYNC_SIGNATURE_SECRET_ENV] = 'test-secret'
    storeMocks.saveLocalRuntimeCapabilitySnapshot.mockImplementation(async (input: {
      userId: string
      deviceId: string
      deviceLabel?: string | null
      source?: string
      report: Record<string, unknown>
    }) => ({
      userId: input.userId,
      deviceId: input.deviceId,
      deviceLabel: input.deviceLabel,
      source: input.source,
      syncedAt: new Date().toISOString(),
      report: input.report,
    }))

    const signedAt = new Date().toISOString()
    const nonce = 'nonce-123456'
    const report = buildStudioLocalProbe(signedAt)
    const signature = signStudioLocalSyncPayload(
      {
        userId: 'user-1',
        deviceId: 'studio-local-device',
        signedAt,
        nonce,
        report,
      },
      'test-secret'
    )
    const request = new NextRequest('http://localhost:3000/api/runtime/local-capabilities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        deviceId: 'studio-local-device',
        source: 'api-sync',
        signedAt,
        nonce,
        signature,
        report,
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.syncSignature).toEqual({ required: true, verified: true })
    expect(storeMocks.saveLocalRuntimeCapabilitySnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'api-sync',
        report: expect.objectContaining({
          preferredExecutor: 'local-native',
          maxLocalAgents: 4,
        }),
      })
    )
  })
})
