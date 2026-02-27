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
export default function NexusCanvas({ mode, isAIPainting = false }: NexusCanvasProps) {
  const renderMode = mode === '3d' && !isAIPainting ? 'draft' : 'cinematic'
  return <NexusCanvasV2 renderMode={renderMode} />
}
