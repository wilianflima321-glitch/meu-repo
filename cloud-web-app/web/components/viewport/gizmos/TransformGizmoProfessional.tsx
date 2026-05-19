'use client'

import { TransformControls } from '@react-three/drei'
import type { ReactElement } from 'react'
import { MathUtils } from 'three'
import {
  getGizmoConstraintAxes,
  getGizmoPivotLabel,
  type GizmoAxisPlaneConstraint,
  type GizmoPivotMode,
} from '@/lib/viewport/gizmo-elite-controls'

type TransformMode = 'translate' | 'rotate' | 'scale'
type TransformSpace = 'world' | 'local'

type TransformGizmoProfessionalProps = {
  mode: TransformMode
  space?: TransformSpace
  constraint?: GizmoAxisPlaneConstraint
  pivotMode?: GizmoPivotMode
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
  constraint = 'free',
  pivotMode = 'median',
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
  const axes = getGizmoConstraintAxes(constraint)
  const pivotLabel = getGizmoPivotLabel(pivotMode)

  return (
    <TransformControls
      enabled={enabled}
      mode={mode}
      space={space}
      size={size}
      showX={axes.showX}
      showY={axes.showY}
      showZ={axes.showZ}
      translationSnap={snapEnabled && mode === 'translate' ? translationSnap : undefined}
      rotationSnap={snapEnabled && mode === 'rotate' ? MathUtils.degToRad(rotationSnapDegrees) : undefined}
      scaleSnap={snapEnabled && mode === 'scale' ? scaleSnap : undefined}
      userData={{
        aethelConstraint: constraint,
        aethelConstraintHint: axes.hint,
        aethelPivotMode: pivotMode,
        aethelPivotLabel: pivotLabel,
      }}
      onMouseDown={() => onDragStateChange?.(true)}
      onMouseUp={() => onDragStateChange?.(false)}
      onObjectChange={() => onObjectChange?.()}
    >
      {children}
    </TransformControls>
  )
}
