'use client'

import { useCallback, useSyncExternalStore } from 'react'

import {
  buildLocalRuntimeBridgeState,
  LOCAL_RUNTIME_CAPABILITY_EVENT,
  LOCAL_RUNTIME_CAPABILITY_REQUEST_EVENT,
  LOCAL_RUNTIME_CAPABILITY_STORAGE_KEY,
  LOCAL_RUNTIME_DEVICE_ID_STORAGE_KEY,
  pickPreferredLocalRuntimeReport,
  sanitizeLocalRuntimeCapabilityReport,
  type LocalRuntimeBridgeState,
  type LocalRuntimeCapabilityReport,
} from '@/lib/device/local-runtime-bridge'

type LocalRuntimeMessageEnvelope = {
  type?: string
  payload?: unknown
}

type LocalRuntimeCloudSyncStatus = 'idle' | 'syncing' | 'synced' | 'error'

type LocalRuntimeCloudSnapshotResponse = {
  snapshot?: {
    deviceId?: string
    deviceLabel?: string | null
    source?: string
    syncedAt?: string
    report?: unknown
  } | null
}

let currentReport: LocalRuntimeCapabilityReport | null = null
let listenersAttached = false
let cloudHydrationStarted = false
let cloudSyncStatus: LocalRuntimeCloudSyncStatus = 'idle'
let cloudSyncError: string | null = null
let cloudSyncedAt: string | null = null
let localDeviceId: string | null = null
let lastSyncedSignature: string | null = null
let inflightSyncSignature: string | null = null
let queuedSyncSignature: string | null = null
const subscribers = new Set<() => void>()

function readStoredLocalRuntimeReport(): LocalRuntimeCapabilityReport | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(LOCAL_RUNTIME_CAPABILITY_STORAGE_KEY)
    if (!raw) return null
    return sanitizeLocalRuntimeCapabilityReport(JSON.parse(raw))
  } catch {
    return null
  }
}

function persistLocalRuntimeReport(report: LocalRuntimeCapabilityReport) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(LOCAL_RUNTIME_CAPABILITY_STORAGE_KEY, JSON.stringify(report))
  } catch {
    // Ignore storage failures; the in-memory state is enough for the current session.
  }
}

function readStoredLocalDeviceId(): string | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(LOCAL_RUNTIME_DEVICE_ID_STORAGE_KEY)
    return typeof raw === 'string' && raw.trim() ? raw : null
  } catch {
    return null
  }
}

function persistLocalDeviceId(deviceId: string) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(LOCAL_RUNTIME_DEVICE_ID_STORAGE_KEY, deviceId)
  } catch {
    // Ignore storage failures; the current tab can still keep the device id in memory.
  }
}

function getOrCreateLocalDeviceId(): string | null {
  if (typeof window === 'undefined') return null
  if (localDeviceId) return localDeviceId

  const stored = readStoredLocalDeviceId()
  if (stored) {
    localDeviceId = stored
    return localDeviceId
  }

  const fallbackId =
    typeof window.crypto?.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : `runtime-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

  localDeviceId = fallbackId
  persistLocalDeviceId(fallbackId)
  return localDeviceId
}

function getReportSignature(report: LocalRuntimeCapabilityReport | null | undefined): string {
  return report ? JSON.stringify(report) : 'null'
}

function emitChange() {
  subscribers.forEach((subscriber) => subscriber())
}

function setCloudSyncState(
  nextStatus: LocalRuntimeCloudSyncStatus,
  options?: { error?: string | null; syncedAt?: string | null; silent?: boolean }
) {
  cloudSyncStatus = nextStatus
  cloudSyncError = options?.error ?? null
  cloudSyncedAt = options?.syncedAt ?? cloudSyncedAt
  if (!options?.silent) {
    emitChange()
  }
}

async function syncLocalRuntimeReportToCloud(report: LocalRuntimeCapabilityReport | null | undefined) {
  if (typeof window === 'undefined' || !report) return

  const deviceId = getOrCreateLocalDeviceId()
  if (!deviceId) return

  const signature = `${deviceId}:${getReportSignature(report)}`
  if (signature === lastSyncedSignature || signature === inflightSyncSignature) {
    return
  }

  if (cloudSyncStatus === 'syncing') {
    queuedSyncSignature = signature
    return
  }

  inflightSyncSignature = signature
  queuedSyncSignature = null

  setCloudSyncState('syncing')

  try {
    const response = await fetch('/api/runtime/local-capabilities', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      credentials: 'same-origin',
      cache: 'no-store',
      body: JSON.stringify({
        deviceId,
        deviceLabel: report.machineName ?? null,
        source: 'native-bridge',
        report,
      }),
    })

    if (response.status === 401) {
      setCloudSyncState('idle', { syncedAt: null })
      return
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null
      throw new Error(payload?.error || 'Failed to sync local runtime capability snapshot.')
    }

    const payload = (await response.json()) as LocalRuntimeCloudSnapshotResponse & { ok?: boolean }
    const syncedReport = sanitizeLocalRuntimeCapabilityReport(payload.snapshot?.report)
    const preferredReport = pickPreferredLocalRuntimeReport(report, syncedReport)
    if (preferredReport && preferredReport !== currentReport) {
      persistLocalRuntimeReport(preferredReport)
      currentReport = preferredReport
    }

    lastSyncedSignature = signature
    setCloudSyncState('synced', { syncedAt: payload.snapshot?.syncedAt ?? new Date().toISOString() })
  } catch (error) {
    setCloudSyncState('error', {
      error: error instanceof Error ? error.message : 'Failed to sync local runtime capability snapshot.',
    })
  } finally {
    inflightSyncSignature = null
    const latestSignature =
      currentReport && deviceId ? `${deviceId}:${getReportSignature(currentReport)}` : null
    if (
      latestSignature &&
      latestSignature !== lastSyncedSignature &&
      latestSignature !== inflightSyncSignature &&
      queuedSyncSignature === latestSignature
    ) {
      queuedSyncSignature = null
      void syncLocalRuntimeReportToCloud(currentReport)
    }
  }
}

async function hydrateLocalRuntimeReportFromCloud(force = false) {
  if (typeof window === 'undefined' || (cloudHydrationStarted && !force)) {
    return
  }

  cloudHydrationStarted = true
  getOrCreateLocalDeviceId()

  try {
    const response = await fetch('/api/runtime/local-capabilities', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    })

    if (response.status === 401) {
      return
    }

    if (!response.ok) {
      throw new Error('Failed to load local runtime capability snapshot.')
    }

    const payload = (await response.json()) as LocalRuntimeCloudSnapshotResponse
    const cloudReport = sanitizeLocalRuntimeCapabilityReport(payload.snapshot?.report)
    const preferredReport = pickPreferredLocalRuntimeReport(currentReport, cloudReport)
    if (preferredReport) {
      persistLocalRuntimeReport(preferredReport)
    }
    currentReport = preferredReport

    if (cloudReport) {
      const snapshotDeviceId = typeof payload.snapshot?.deviceId === 'string' ? payload.snapshot.deviceId : 'cloud'
      lastSyncedSignature = `${snapshotDeviceId}:${getReportSignature(cloudReport)}`
      setCloudSyncState('synced', {
        syncedAt: payload.snapshot?.syncedAt ?? cloudReport.receivedAt,
      })
    }
  } catch (error) {
    setCloudSyncState('error', {
      error: error instanceof Error ? error.message : 'Failed to hydrate local runtime capability snapshot.',
    })
  } finally {
    emitChange()
  }
}

function updateCurrentReport(
  nextReport: LocalRuntimeCapabilityReport | null,
  options?: { persist?: boolean; sync?: boolean }
) {
  const nextSignature = getReportSignature(nextReport)
  const currentSignature = getReportSignature(currentReport)
  const shouldPersist = options?.persist !== false
  const shouldSync = options?.sync !== false

  if (nextSignature === currentSignature) {
    if (nextReport && shouldSync) {
      void syncLocalRuntimeReportToCloud(nextReport)
    }
    return
  }

  currentReport = nextReport
  if (nextReport && shouldPersist) {
    persistLocalRuntimeReport(nextReport)
  }
  emitChange()

  if (nextReport && shouldSync) {
    void syncLocalRuntimeReportToCloud(nextReport)
  }
}

function dispatchLocalRuntimeCapabilityRequest() {
  if (typeof window === 'undefined') return

  window.dispatchEvent(new CustomEvent(LOCAL_RUNTIME_CAPABILITY_REQUEST_EVENT))
  window.postMessage({ type: LOCAL_RUNTIME_CAPABILITY_REQUEST_EVENT }, window.location.origin)
}

function handleIncomingReport(incoming: unknown) {
  const nextReport = sanitizeLocalRuntimeCapabilityReport(incoming)
  if (!nextReport) return
  updateCurrentReport(nextReport)
}

function ensureBridgeListeners() {
  if (typeof window === 'undefined' || listenersAttached) {
    return
  }

  listenersAttached = true
  currentReport = readStoredLocalRuntimeReport()
  localDeviceId = readStoredLocalDeviceId()

  const handleCustomEvent = (event: Event) => {
    handleIncomingReport((event as CustomEvent<unknown>).detail)
  }

  const handleMessage = (event: MessageEvent<unknown>) => {
    const envelope =
      event.data && typeof event.data === 'object'
        ? (event.data as LocalRuntimeMessageEnvelope)
        : null
    if (!envelope || envelope.type !== LOCAL_RUNTIME_CAPABILITY_EVENT) {
      return
    }

    handleIncomingReport(envelope.payload)
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === LOCAL_RUNTIME_CAPABILITY_STORAGE_KEY) {
      if (!event.newValue) {
        updateCurrentReport(null, { persist: false, sync: false })
        return
      }

      try {
        handleIncomingReport(JSON.parse(event.newValue))
      } catch {
        // Ignore malformed cross-tab payloads.
      }
      return
    }

    if (event.key === LOCAL_RUNTIME_DEVICE_ID_STORAGE_KEY && event.newValue) {
      localDeviceId = event.newValue
    }
  }

  window.addEventListener(LOCAL_RUNTIME_CAPABILITY_EVENT, handleCustomEvent as EventListener)
  window.addEventListener('message', handleMessage)
  window.addEventListener('storage', handleStorage)
  dispatchLocalRuntimeCapabilityRequest()
  void hydrateLocalRuntimeReportFromCloud()
}

function subscribe(onStoreChange: () => void) {
  ensureBridgeListeners()
  subscribers.add(onStoreChange)

  return () => {
    subscribers.delete(onStoreChange)
  }
}

function getSnapshot(): LocalRuntimeBridgeHookSnapshot {
  return {
    ...buildLocalRuntimeBridgeState(currentReport),
    cloudSyncStatus,
    cloudSyncError,
    cloudSyncedAt,
    deviceId: localDeviceId,
  }
}

export interface LocalRuntimeBridgeHookSnapshot extends LocalRuntimeBridgeState {
  cloudSyncStatus: LocalRuntimeCloudSyncStatus
  cloudSyncError: string | null
  cloudSyncedAt: string | null
  deviceId: string | null
}

export interface LocalRuntimeBridgeHookState extends LocalRuntimeBridgeState {
  requestCapabilities: () => void
  cloudSyncStatus: LocalRuntimeCloudSyncStatus
  cloudSyncError: string | null
  cloudSyncedAt: string | null
  deviceId: string | null
}

export function useLocalRuntimeBridge(): LocalRuntimeBridgeHookState {
  const bridgeState = useSyncExternalStore(subscribe, getSnapshot, () =>
    ({
      ...buildLocalRuntimeBridgeState(null),
      cloudSyncStatus: 'idle' as const,
      cloudSyncError: null,
      cloudSyncedAt: null,
      deviceId: null,
    })
  )

  const requestCapabilities = useCallback(() => {
    const stored = readStoredLocalRuntimeReport()
    if (stored) {
      updateCurrentReport(stored, { sync: false })
    }
    dispatchLocalRuntimeCapabilityRequest()
    void hydrateLocalRuntimeReportFromCloud(true)
  }, [])

  return {
    ...bridgeState,
    requestCapabilities,
  }
}

export default useLocalRuntimeBridge
