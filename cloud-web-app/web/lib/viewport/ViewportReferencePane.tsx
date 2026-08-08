'use client'

// @aethel-heavy-async-boundary: loaded only inside the dynamic viewport scene canvas, and only
// when Quad View is toggled on.

import { useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { Grid } from '@react-three/drei'
import type { ViewportCameraPreset } from '@/components/viewport/viewport-camera-presets'
import type { ViewportSceneObject } from '@/components/viewport/AethelViewport3D'
import { SceneObjectMesh } from '@/components/viewport/ViewportSceneObjectMesh'
import { CameraPresetApplier } from '@/lib/viewport/ViewportCameraPresetApplier'

const NOOP_TRANSFORM_CHANGE = () => {}

/**
 * Phase 4 (AAA Studio Deepening Sweep) — quad-view reference pane.
 *
 * A real, independently-rendered orthographic-style Canvas (its own
 * `WebGLRenderer` context) showing the live scene from a fixed Top/Front/Side
 * axis, reusing the exact camera math already shipped for the single-view
 * camera preset dropdown (`CameraPresetApplier`). Selection is shared with
 * the main viewport so clicking an object here highlights it everywhere;
 * these panes stay non-interactive for transform (no gizmo, no orbit) since
 * they are reference views, not a second editable camera.
 */
export function ViewportReferencePane({
  label,
  preset,
  objects,
  selectedIds,
  onSelectionChange,
}: {
  label: string
  preset: Extract<ViewportCameraPreset, 'top' | 'front' | 'side'>
  objects: ViewportSceneObject[]
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
}) {
  const handleSelect = useCallback((id: string, additive: boolean) => {
    if (additive) {
      onSelectionChange(selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id])
      return
    }
    onSelectionChange([id])
  }, [onSelectionChange, selectedIds])

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-lg border border-[var(--aethel-border-subtle)] bg-[var(--aethel-reference-pane-bg)]"
      data-viewport-quad-pane={preset}
    >
      <span className="pointer-events-none absolute left-2 top-2 z-10 rounded bg-[var(--aethel-editor-diff-pill-bg)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
        {label}
      </span>
      <Canvas
        dpr={[1, 1]}
        camera={{ fov: 40 }}
        onPointerMissed={() => onSelectionChange([])}
        className="h-full w-full"
        data-aethel-pipeline="r3f-webgl2-reference"
      >
        <CameraPresetApplier preset={preset} focusTarget={null} focusNonce={0} />
        <color attach="background" args={[0x0b1220]} />
        <ambientLight intensity={0.85} />
        <directionalLight position={[5, 6, 4]} intensity={0.9} />
        <Grid args={[28, 28]} cellSize={0.5} cellThickness={0.4} sectionSize={2} sectionThickness={0.9} fadeDistance={32} />
        {objects.map((object) => (
          <SceneObjectMesh
            key={object.id}
            object={object}
            isSelected={selectedIds.includes(object.id)}
            primarySelected={false}
            transformMode="translate"
            transformSpace="world"
            gizmoConstraint="free"
            gizmoPivotMode="median"
            snapEnabled={false}
            onTransformChange={NOOP_TRANSFORM_CHANGE}
            onSelect={handleSelect}
          />
        ))}
      </Canvas>
    </div>
  )
}
