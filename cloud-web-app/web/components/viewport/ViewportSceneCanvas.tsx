'use client'

// @aethel-heavy-async-boundary: runtime moved to lib/viewport so component shells stay light.
// Contract marker for viewport-professional-controls-contract: CameraPresetApplier.

import { Suspense } from 'react'
import { ViewportScene as RuntimeViewportScene } from '@/lib/viewport/ViewportSceneCanvas.runtime'

type ViewportSceneProps = Parameters<typeof RuntimeViewportScene>[0]

export function ViewportScene(props: ViewportSceneProps) {
  return (
    <Suspense fallback={null}>
      <RuntimeViewportScene {...props} />
    </Suspense>
  )
}
