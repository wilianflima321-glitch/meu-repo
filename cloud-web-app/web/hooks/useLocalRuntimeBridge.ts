'use client'

import { useCallback, useSyncExternalStore } from 'react'

import {
  buildLocalRuntimeBridgeState,
  LOCAL_RUNTIME_CAPABILITY_EVENT,
  LOCAL_RUNTIME_CAPABILITY_REQUEST_EVENT,
  LOCAL_RUNTIME_CAPABILITY_STORAGE_KEY,
  sanitizeLocalRuntimeCapabilityReport,
  type LocalRuntimeBridgeState,
  type LocalRuntimeCapabilityReport,
} from '@/lib/device/local-runtime-bridge'

type LocalRuntimeMessageEnvelope = {
  type?: string
  payload?: unknown
}

let currentReport: LocalRuntimeCapabilityReport | null = null
let listenersAttached = false
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

function emitChange() {
  subscribers.forEach((subscriber) => subscriber())
}

function updateCurrentReport(nextReport: LocalRuntimeCapabilityReport | null) {
  currentReport = nextReport
  emitChange()
}

function dispatchLocalRuntimeCapabilityRequest() {
  if (typeof window === 'undefined') return

  window.dispatchEvent(new CustomEvent(LOCAL_RUNTIME_CAPABILITY_REQUEST_EVENT))
  window.postMessage({ type: LOCAL_RUNTIME_CAPABILITY_REQUEST_EVENT }, window.location.origin)
}

function handleIncomingReport(incoming: unknown) {
  const nextReport = sanitizeLocalRuntimeCapabilityReport(incoming)
  if (!nextReport) return
  persistLocalRuntimeReport(nextReport)
  updateCurrentReport(nextReport)
}

function ensureBridgeListeners() {
  if (typeof window === 'undefined' || listenersAttached) {
    return
  }

  listenersAttached = true
  currentReport = readStoredLocalRuntimeReport()

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

  window.addEventListener(LOCAL_RUNTIME_CAPABILITY_EVENT, handleCustomEvent as EventListener)
  window.addEventListener('message', handleMessage)
  dispatchLocalRuntimeCapabilityRequest()
}

function subscribe(onStoreChange: () => void) {
  ensureBridgeListeners()
  subscribers.add(onStoreChange)

  return () => {
    subscribers.delete(onStoreChange)
  }
}

function getSnapshot(): LocalRuntimeBridgeState {
  return buildLocalRuntimeBridgeState(currentReport)
}

export interface LocalRuntimeBridgeHookState extends LocalRuntimeBridgeState {
  requestCapabilities: () => void
}

export function useLocalRuntimeBridge(): LocalRuntimeBridgeHookState {
  const bridgeState = useSyncExternalStore(subscribe, getSnapshot, () =>
    buildLocalRuntimeBridgeState(null)
  )

  const requestCapabilities = useCallback(() => {
    const stored = readStoredLocalRuntimeReport()
    if (stored) {
      updateCurrentReport(stored)
    }
    dispatchLocalRuntimeCapabilityRequest()
  }, [])

  return {
    ...bridgeState,
    requestCapabilities,
  }
}

export default useLocalRuntimeBridge
