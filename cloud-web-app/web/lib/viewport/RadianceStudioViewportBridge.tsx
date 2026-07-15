'use client'

/**
 * Letter cf — Studio R3F viewport → RadianceFrameWire (Zero-MVP).
 * Drives tickPre/tickPost on the live WebGL frame so RT/shadow/god-rays
 * composite when Law XV allows. Zero-UI when fail-closed — no chrome.
 */

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  enableRadianceOnGlContext,
  type RadianceViewportEnableResult,
} from '@/lib/radiance/radiance-viewport-enable'
import type { RadianceFrameWire } from '@/lib/radiance/radiance-frame-wire'

export type RadianceStudioViewportBridgeProps = {
  /** Law XV Capability Score from hardware-profile / fidelity probe. */
  capabilityScore?: number
  /** Default true — Zero-UI auto-wire. */
  radianceRequested?: boolean
}

/**
 * Imperative bridge inside R3F Canvas. Renders nothing (Zero-UI).
 * tickPre before default render; tickPost after EffectComposer (priority 2).
 */
export function RadianceStudioViewportBridge({
  capabilityScore,
  radianceRequested = true,
}: RadianceStudioViewportBridgeProps) {
  const { gl, scene, camera } = useThree()
  const wireRef = useRef<RadianceFrameWire | null>(null)
  const enableRef = useRef<RadianceViewportEnableResult | null>(null)

  useEffect(() => {
    wireRef.current?.dispose()
    wireRef.current = null
    enableRef.current = null

    const result = enableRadianceOnGlContext(gl, scene, camera, {
      capabilityScore,
      radianceRequested,
    })
    enableRef.current = result
    wireRef.current = result.wire

    return () => {
      wireRef.current?.dispose()
      wireRef.current = null
      enableRef.current = null
    }
  }, [gl, scene, camera, capabilityScore, radianceRequested])

  // Shadows + software RT before scene/composer.
  useFrame((_, dt) => {
    wireRef.current?.tickPre(dt)
  }, -1)

  // Clouds / god-rays / RT composite after @react-three/postprocessing (prio 1).
  useFrame((_, dt) => {
    wireRef.current?.tickPost(dt)
  }, 2)

  return null
}
