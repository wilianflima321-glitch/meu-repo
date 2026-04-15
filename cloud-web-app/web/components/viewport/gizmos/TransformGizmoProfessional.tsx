'use client'

import { TransformControls } from '@react-three/drei'
import type { ReactElement } from 'react'
import { MathUtils } from 'three'

type TransformMode = 'translate' | 'rotate' | 'scale'
type TransformSpace = 'world' | 'local'

type TransformGizmoProfessionalProps = {
  mode: TransformMode
  space?: TransformSpace
  enabled?: boolean
  snapEnabled?: boolean
  translationSnap?: number
  rotationSnapDegrees?: number
  scaleSnap?: number
  size?: number
  onDragStateChange?: (dragging: boolean) => void
  onObjectChange?: () => void
  children: ReactElement
}

export default function TransformGizmoProfessional({
  mode,
  space = 'world',
  enabled = true,
  snapEnabled = true,
  translationSnap = 0.5,
  rotationSnapDegrees = 15,
  scaleSnap = 0.1,
  size = 1.05,
  onDragStateChange,
  onObjectChange,
  children,
}: TransformGizmoProfessionalProps) {
  return (
    <TransformControls
      enabled={enabled}
      mode={mode}
      space={space}
      size={size}
      showX
      showY
      showZ
      translationSnap={snapEnabled && mode === 'translate' ? translationSnap : undefined}
      rotationSnap={snapEnabled && mode === 'rotate' ? MathUtils.degToRad(rotationSnapDegrees) : undefined}
      scaleSnap={snapEnabled && mode === 'scale' ? scaleSnap : undefined}
      onMouseDown={() => onDragStateChange?.(true)}
      onMouseUp={() => onDragStateChange?.(false)}
      onObjectChange={() => onObjectChange?.()}
    >
      {children}
    </TransformControls>
  )
}
