import fs from 'node:fs/promises'
import path from 'node:path'

import {
  pickPreferredLocalRuntimeReport,
  sanitizeLocalRuntimeCapabilityReport,
  type LocalRuntimeCapabilityReport,
} from '@/lib/device/local-runtime-bridge'

export type LocalRuntimeCapabilitySource = 'native-bridge' | 'api-sync'

export interface LocalRuntimeCapabilitySnapshot {
  userId: string
  deviceId: string
  deviceLabel: string | null
  source: LocalRuntimeCapabilitySource
  syncedAt: string
  report: LocalRuntimeCapabilityReport
}

export interface LocalRuntimeCapabilityEnvelope {
  userId: string
  updatedAt: string
  latestDeviceId: string | null
  devices: LocalRuntimeCapabilitySnapshot[]
}

const MAX_RUNTIME_DEVICES = 6

function getRuntimeCapabilityRoot(): string {
  return (
    process.env.AETHEL_LOCAL_RUNTIME_STORE_ROOT ??
    path.join(process.cwd(), '.aethel', 'runtime', 'local-capabilities')
  )
}

function getRuntimeCapabilityPath(userId: string): string {
  return path.join(getRuntimeCapabilityRoot(), `${userId}.json`)
}

function sanitizeDeviceLabel(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, 120) : null
}

function buildSnapshotTimestamp(snapshot: LocalRuntimeCapabilitySnapshot): number {
  const reportTimestamp = Date.parse(snapshot.report.receivedAt)
  if (Number.isFinite(reportTimestamp)) {
    return reportTimestamp
  }

  const syncedTimestamp = Date.parse(snapshot.syncedAt)
  return Number.isFinite(syncedTimestamp) ? syncedTimestamp : 0
}

function sortSnapshotsDescending(
  snapshots: LocalRuntimeCapabilitySnapshot[]
): LocalRuntimeCapabilitySnapshot[] {
  return [...snapshots].sort((left, right) => buildSnapshotTimestamp(right) - buildSnapshotTimestamp(left))
}

function sanitizeEnvelope(candidate: unknown, userId: string): LocalRuntimeCapabilityEnvelope | null {
  if (!candidate || typeof candidate !== 'object') return null

  const raw = candidate as Record<string, unknown>
  if (raw.userId !== userId || !Array.isArray(raw.devices)) {
    return null
  }

  const devices: LocalRuntimeCapabilitySnapshot[] = []
  for (const entry of raw.devices) {
    if (!entry || typeof entry !== 'object') continue
    const rawSnapshot = entry as Record<string, unknown>
    if (rawSnapshot.userId !== userId || typeof rawSnapshot.deviceId !== 'string') continue
    const report = sanitizeLocalRuntimeCapabilityReport(rawSnapshot.report)
    if (!report) continue

    devices.push({
      userId,
      deviceId: rawSnapshot.deviceId,
      deviceLabel: sanitizeDeviceLabel(
        typeof rawSnapshot.deviceLabel === 'string' ? rawSnapshot.deviceLabel : null
      ),
      source: rawSnapshot.source === 'api-sync' ? 'api-sync' : 'native-bridge',
      syncedAt:
        typeof rawSnapshot.syncedAt === 'string' && !Number.isNaN(Date.parse(rawSnapshot.syncedAt))
          ? rawSnapshot.syncedAt
          : report.receivedAt,
      report,
    })
  }

  const sortedDevices = sortSnapshotsDescending(devices).slice(0, MAX_RUNTIME_DEVICES)
  const latestDeviceId =
    typeof raw.latestDeviceId === 'string' &&
    sortedDevices.some((snapshot) => snapshot.deviceId === raw.latestDeviceId)
      ? raw.latestDeviceId
      : sortedDevices[0]?.deviceId ?? null

  return {
    userId,
    updatedAt:
      typeof raw.updatedAt === 'string' && !Number.isNaN(Date.parse(raw.updatedAt))
        ? raw.updatedAt
        : sortedDevices[0]?.syncedAt ?? new Date(0).toISOString(),
    latestDeviceId,
    devices: sortedDevices,
  }
}

export async function loadLocalRuntimeCapabilityEnvelope(
  userId: string
): Promise<LocalRuntimeCapabilityEnvelope | null> {
  try {
    const raw = await fs.readFile(getRuntimeCapabilityPath(userId), 'utf8')
    return sanitizeEnvelope(JSON.parse(raw), userId)
  } catch {
    return null
  }
}

export async function loadLatestLocalRuntimeCapabilitySnapshot(
  userId: string
): Promise<LocalRuntimeCapabilitySnapshot | null> {
  const envelope = await loadLocalRuntimeCapabilityEnvelope(userId)
  if (!envelope) return null

  const latestById = envelope.latestDeviceId
    ? envelope.devices.find((snapshot) => snapshot.deviceId === envelope.latestDeviceId) ?? null
    : null

  return latestById ?? envelope.devices[0] ?? null
}

export async function saveLocalRuntimeCapabilitySnapshot(params: {
  userId: string
  deviceId: string
  deviceLabel?: string | null
  source?: LocalRuntimeCapabilitySource
  report: LocalRuntimeCapabilityReport
}): Promise<LocalRuntimeCapabilitySnapshot> {
  const report = sanitizeLocalRuntimeCapabilityReport(params.report)
  if (!report) {
    throw new Error('INVALID_LOCAL_RUNTIME_REPORT')
  }

  const nowIso = new Date().toISOString()
  const snapshot: LocalRuntimeCapabilitySnapshot = {
    userId: params.userId,
    deviceId: params.deviceId,
    deviceLabel: sanitizeDeviceLabel(params.deviceLabel ?? report.machineName),
    source: params.source ?? 'native-bridge',
    syncedAt: nowIso,
    report,
  }

  const existing = (await loadLocalRuntimeCapabilityEnvelope(params.userId))?.devices ?? []
  const mergedSnapshots = existing.filter((entry) => entry.deviceId !== params.deviceId)
  mergedSnapshots.push(snapshot)

  const sortedSnapshots = sortSnapshotsDescending(mergedSnapshots).slice(0, MAX_RUNTIME_DEVICES)
  const latestSnapshot =
    sortedSnapshots.reduce<LocalRuntimeCapabilitySnapshot | null>((winner, candidate) => {
      if (!winner) return candidate
      const preferredReport = pickPreferredLocalRuntimeReport(winner.report, candidate.report)
      return preferredReport === candidate.report ? candidate : winner
    }, null) ?? snapshot

  const envelope: LocalRuntimeCapabilityEnvelope = {
    userId: params.userId,
    updatedAt: nowIso,
    latestDeviceId: latestSnapshot.deviceId,
    devices: sortedSnapshots,
  }

  await fs.mkdir(getRuntimeCapabilityRoot(), { recursive: true })
  await fs.writeFile(getRuntimeCapabilityPath(params.userId), JSON.stringify(envelope, null, 2), 'utf8')

  return latestSnapshot.deviceId === snapshot.deviceId
    ? snapshot
    : sortedSnapshots.find((entry) => entry.deviceId === params.deviceId) ?? snapshot
}
