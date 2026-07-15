'use client'

import { useEffect, useState } from 'react'

import {
  buildDeviceCapabilityProfile,
  type DeviceCapabilityProfile,
  type RawDeviceCapabilitySignals,
} from '@/lib/device/device-capability-profile'

type NavigatorConnectionLike = {
  saveData?: boolean
  effectiveType?: string
}

type NavigatorWithCapabilitySignals = Navigator & {
  deviceMemory?: number
  gpu?: unknown
  ml?: unknown
  connection?: NavigatorConnectionLike
}

const UNKNOWN_SIGNALS: RawDeviceCapabilitySignals = {
  webgpuAvailable: false,
  webnnAvailable: false,
  saveData: false,
  prefersReducedMotion: false,
}

function bytesToGb(bytes?: number): number | undefined {
  if (!bytes || !Number.isFinite(bytes)) return undefined
  return Math.round((bytes / 1024 ** 3) * 10) / 10
}

async function readStorageEstimate(): Promise<Pick<RawDeviceCapabilitySignals, 'storageQuotaGb' | 'storageUsageGb'>> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return {}
  }

  try {
    const estimate = await navigator.storage.estimate()
    return {
      storageQuotaGb: bytesToGb(estimate.quota),
      storageUsageGb: bytesToGb(estimate.usage),
    }
  } catch {
    return {}
  }
}

async function readDeviceSignals(): Promise<RawDeviceCapabilitySignals> {
  if (typeof navigator === 'undefined') {
    return UNKNOWN_SIGNALS
  }

  const nav = navigator as NavigatorWithCapabilitySignals
  const storage = await readStorageEstimate()

  return {
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemoryGb: nav.deviceMemory,
    webgpuAvailable: Boolean(nav.gpu),
    webnnAvailable: Boolean(nav.ml),
    saveData: Boolean(nav.connection?.saveData),
    effectiveConnectionType: nav.connection?.effectiveType,
    prefersReducedMotion:
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false,
    ...storage,
  }
}

export function useDeviceCapabilityProfile(): DeviceCapabilityProfile {
  const [profile, setProfile] = useState<DeviceCapabilityProfile>(() =>
    buildDeviceCapabilityProfile(UNKNOWN_SIGNALS)
  )

  useEffect(() => {
    let active = true

    void readDeviceSignals().then((signals) => {
      if (active) {
        setProfile(buildDeviceCapabilityProfile(signals))
      }
    })

    return () => {
      active = false
    }
  }, [])

  return profile
}
