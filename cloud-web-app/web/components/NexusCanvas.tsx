'use client'

import type * as THREE from 'three'
import NexusCanvasV2 from '@/components/nexus/NexusCanvasV2'

type NexusCanvasProps = {
  mode: '3d' | 'ui' | 'code'
  onSelectElement?: (elementId: string, position: THREE.Vector3) => void
  isAIPainting?: boolean
  content?: unknown
}

/**
 * Compatibility wrapper.
 * Canonical runtime implementation is `components/nexus/NexusCanvasV2.tsx`.
 */
export default function NexusCanvas({ mode, isAIPainting = false, content }: NexusCanvasProps) {
  const renderMode = mode === '3d' && !isAIPainting ? 'draft' : 'cinematic'
  const paintingProgress = isAIPainting ? 75 : 0 // Simulação de progresso
  return <NexusCanvasV2 renderMode={renderMode} isAIPainting={isAIPainting} paintingProgress={paintingProgress} />
}
