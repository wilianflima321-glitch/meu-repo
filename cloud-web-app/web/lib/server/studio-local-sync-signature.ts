import { createHmac, timingSafeEqual } from 'node:crypto'

export const STUDIO_LOCAL_SYNC_SIGNATURE_SECRET_ENV = 'AETHEL_STUDIO_LOCAL_SYNC_SECRET'
export const STUDIO_LOCAL_SYNC_SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000

export type StudioLocalSyncSignatureResult =
  | {
      ok: true
      required: boolean
      verified: boolean
    }
  | {
      ok: false
      required: boolean
      code:
        | 'STUDIO_LOCAL_SYNC_SIGNATURE_REQUIRED'
        | 'STUDIO_LOCAL_SYNC_SIGNATURE_STALE'
        | 'STUDIO_LOCAL_SYNC_SIGNATURE_INVALID'
      status: 400 | 401
    }

export interface StudioLocalSyncSigningPayload {
  userId: string
  deviceId: string
  signedAt: string
  nonce: string
  report: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function stableJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableJsonValue)
  }

  if (!isRecord(value)) {
    return value === undefined ? null : value
  }

  const sorted: Record<string, unknown> = {}
  for (const key of Object.keys(value).sort()) {
    sorted[key] = stableJsonValue(value[key])
  }
  return sorted
}

export function stableStringifyStudioLocalSync(value: unknown): string {
  return JSON.stringify(stableJsonValue(value))
}

export function isStudioLocalRuntimeKernelReport(report: unknown): boolean {
  if (!isRecord(report)) return false
  return typeof report.generatedAt === 'string' || 'cpuLogicalCores' in report || 'storagePressure' in report
}

export function shouldRequireStudioLocalSyncSignature(input: {
  source: 'native-bridge' | 'api-sync'
  report: unknown
}): boolean {
  return input.source === 'api-sync' || isStudioLocalRuntimeKernelReport(input.report)
}

export function buildStudioLocalSyncSigningPayload(input: StudioLocalSyncSigningPayload): string {
  return stableStringifyStudioLocalSync({
    version: 1,
    userId: input.userId,
    deviceId: input.deviceId,
    signedAt: input.signedAt,
    nonce: input.nonce,
    report: input.report,
  })
}

export function signStudioLocalSyncPayload(
  input: StudioLocalSyncSigningPayload,
  secret = process.env[STUDIO_LOCAL_SYNC_SIGNATURE_SECRET_ENV]
): string {
  if (!secret) {
    throw new Error('STUDIO_LOCAL_SYNC_SECRET_MISSING')
  }

  return createHmac('sha256', secret).update(buildStudioLocalSyncSigningPayload(input)).digest('hex')
}

function secureCompareHex(left: string, right: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(left) || !/^[a-f0-9]{64}$/i.test(right)) {
    return false
  }

  const leftBuffer = Buffer.from(left, 'hex')
  const rightBuffer = Buffer.from(right, 'hex')
  if (leftBuffer.byteLength !== rightBuffer.byteLength) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}

export function verifyStudioLocalSyncSignature(input: {
  payload: StudioLocalSyncSigningPayload
  signature?: string | null
  required: boolean
  now?: number
  secret?: string
}): StudioLocalSyncSignatureResult {
  const secret = input.secret ?? process.env[STUDIO_LOCAL_SYNC_SIGNATURE_SECRET_ENV]
  if (!input.required || !secret) {
    return { ok: true, required: Boolean(input.required && secret), verified: false }
  }

  if (!input.signature || !input.payload.nonce || !input.payload.signedAt) {
    return { ok: false, required: true, code: 'STUDIO_LOCAL_SYNC_SIGNATURE_REQUIRED', status: 401 }
  }

  const signedAtMs = Date.parse(input.payload.signedAt)
  const now = input.now ?? Date.now()
  if (!Number.isFinite(signedAtMs) || Math.abs(now - signedAtMs) > STUDIO_LOCAL_SYNC_SIGNATURE_MAX_AGE_MS) {
    return { ok: false, required: true, code: 'STUDIO_LOCAL_SYNC_SIGNATURE_STALE', status: 401 }
  }

  const expected = signStudioLocalSyncPayload(input.payload, secret)
  if (!secureCompareHex(expected, input.signature)) {
    return { ok: false, required: true, code: 'STUDIO_LOCAL_SYNC_SIGNATURE_INVALID', status: 401 }
  }

  return { ok: true, required: true, verified: true }
}
