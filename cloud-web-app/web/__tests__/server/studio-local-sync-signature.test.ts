import { describe, expect, it } from 'vitest'

import {
  buildStudioLocalSyncSigningPayload,
  signStudioLocalSyncPayload,
  stableStringifyStudioLocalSync,
  verifyStudioLocalSyncSignature,
} from '@/lib/server/studio-local-sync-signature'

describe('studio local sync signature', () => {
  const report = {
    version: 1,
    generatedAt: '2026-05-09T12:00:00.000Z',
    cpuLogicalCores: 12,
    storagePressure: 'ok',
    preferredExecutor: 'local-native',
  }

  it('builds deterministic payloads independent of object key order', () => {
    const left = stableStringifyStudioLocalSync({ b: 2, a: { y: 1, x: 0 } })
    const right = stableStringifyStudioLocalSync({ a: { x: 0, y: 1 }, b: 2 })

    expect(left).toBe(right)
  })

  it('signs and verifies a fresh Studio Local sync payload', () => {
    const signedAt = new Date().toISOString()
    const payload = {
      userId: 'user-1',
      deviceId: 'studio-local-device',
      signedAt,
      nonce: 'nonce-123456',
      report,
    }
    const signature = signStudioLocalSyncPayload(payload, 'test-secret')

    expect(buildStudioLocalSyncSigningPayload(payload)).toContain('studio-local-device')
    expect(
      verifyStudioLocalSyncSignature({
        payload,
        signature,
        required: true,
        secret: 'test-secret',
      })
    ).toEqual({ ok: true, required: true, verified: true })
  })

  it('rejects stale or tampered signatures', () => {
    const payload = {
      userId: 'user-1',
      deviceId: 'studio-local-device',
      signedAt: '2026-05-09T12:00:00.000Z',
      nonce: 'nonce-123456',
      report,
    }
    const signature = signStudioLocalSyncPayload(payload, 'test-secret')

    expect(
      verifyStudioLocalSyncSignature({
        payload: { ...payload, report: { ...report, preferredExecutor: 'cloud-sandbox' } },
        signature,
        required: true,
        secret: 'test-secret',
        now: Date.parse(payload.signedAt),
      })
    ).toMatchObject({ ok: false, code: 'STUDIO_LOCAL_SYNC_SIGNATURE_INVALID' })

    expect(
      verifyStudioLocalSyncSignature({
        payload,
        signature,
        required: true,
        secret: 'test-secret',
        now: Date.parse(payload.signedAt) + 10 * 60 * 1000,
      })
    ).toMatchObject({ ok: false, code: 'STUDIO_LOCAL_SYNC_SIGNATURE_STALE' })
  })
})
