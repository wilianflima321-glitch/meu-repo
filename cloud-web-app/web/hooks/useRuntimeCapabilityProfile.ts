'use client'

import { useMemo } from 'react'

import { useDeviceCapabilityProfile } from '@/hooks/useDeviceCapabilityProfile'
import { useLocalRuntimeBridge } from '@/hooks/useLocalRuntimeBridge'
import { mergeDeviceCapabilityProfileWithLocalRuntime } from '@/lib/device/local-runtime-bridge'

export function useRuntimeCapabilityProfile() {
  const browserProfile = useDeviceCapabilityProfile()
  const localBridge = useLocalRuntimeBridge()

  const profile = useMemo(
    () => mergeDeviceCapabilityProfileWithLocalRuntime(browserProfile, localBridge.report),
    [browserProfile, localBridge.report]
  )

  return {
    profile,
    browserProfile,
    localBridge,
  }
}

export default useRuntimeCapabilityProfile
