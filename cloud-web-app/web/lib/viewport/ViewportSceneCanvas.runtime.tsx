'use client'

// @aethel-heavy-async-boundary: loaded by AethelViewport3D only when Browser runtime is selected.

import { Suspense, useCallback, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, GizmoHelper, GizmoViewport, Grid, Line, OrbitControls } from '@react-three/drei'
import { EffectComposer, Outline, Selection } from '@react-three/postprocessing'
import { CameraPresetApplier } from '@/components/viewport/ViewportCameraPresetApplier'
import type { ViewportCameraPreset } from '@/components/viewport/viewport-camera-presets'
import type {
  AethelViewport3DProps,
  ViewportSceneObject,
} from '@/components/viewport/AethelViewport3D'
import { sampleTrajectory } from '@/lib/three/physics'
import type { GizmoAxisPlaneConstraint, GizmoPivotMode } from '@/lib/viewport/gizmo-elite-controls'
import { SceneObjectMesh } from '@/components/viewport/ViewportSceneObjectMesh'

const ALLOW_EXTERNAL_HDRI = process.env.NEXT_PUBLIC_AETHEL_EXTERNAL_HDRI === '1'

export function ViewportScene({
  objects,
  selectedIds,
  transformMode,
  transformSpace,
  gizmoConstraint,
  gizmoPivotMode,
  snapEnabled,
  creativeMode,
  renderMode = 'draft',
  isPlaying,
  currentTime,
  duration,
  vfxGlowIntensity = 0,
  abilityAccentColor,
  facialExpressionIntensity = 0,
  hairHighlightColor,
  hairVolumeIntensity = 0,
  onObjectsChange,
  onSelectionChange,
  onGizmoTransformOperation,
  cameraPreset,
  focusTarget,
  focusNonce,
}: Omit<AethelViewport3DProps, 'onTogglePlayTest' | 'onTransformModeChange' | 'onTransformSpaceChange' | 'onSnapEnabledChange' | 'onAIAction'> & {
  cameraPreset: ViewportCameraPreset
  focusTarget?: [number, number, number] | null
  focusNonce?: number
  gizmoConstraint: GizmoAxisPlaneConstraint
  gizmoPivotMode: GizmoPivotMode
}) {
  const primarySelectedId = selectedIds[0] ?? null
  const selectedObject = objects.find((object) => object.id === primarySelectedId) ?? null

  const trajectoryPoints = useMemo(() => {
    if (!isPlaying || !selectedObject) return []
    const points = sampleTrajectory(8, 42, 9.81, 48, { dragCoef: 0.06, mass: 1.2, dt: 0.06 })
    const normalizedDuration = Math.max(duration, 0.1)
    const visibleCount = Math.max(2, Math.min(points.length, Math.round((currentTime / normalizedDuration) * points.length)))
    return points
      .slice(0, visibleCount)
      .map((point) => [selectedObject.position[0] + point.x / 4, selectedObject.position[1] + point.y / 4, selectedObject.position[2]] as [number, number, number])
  }, [currentTime, duration, isPlaying, selectedObject])

  const handleSelect = useCallback((id: string, additive: boolean) => {
    if (additive) {
      onSelectionChange(selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id])
      return
    }
    onSelectionChange([id])
  }, [onSelectionChange, selectedIds])

  const handleTransformChange = useCallback((id: string, patch: Partial<ViewportSceneObject>) => {
    onObjectsChange(objects.map((object) => (object.id === id ? { ...object, ...patch } : object)))
  }, [objects, onObjectsChange])

  const cinematicGlowIntensity = creativeMode === 'film' ? 0.28 : 0.16

  return (
    <Canvas
      shadows
      camera={{ position: [3.8, 2.4, 4.8], fov: 46 }}
      onPointerMissed={() => onSelectionChange([])}
      className="h-full w-full"
    >
      <CameraPresetApplier
        preset={cameraPreset}
        focusTarget={focusTarget}
        focusNonce={focusNonce}
      />
      <color attach="background" args={[renderMode === 'cinematic' ? 0x070b12 : 0x0b1220]} />
      <fog attach="fog" args={[renderMode === 'cinematic' ? 0x070b12 : 0x0b1220, 10, 22]} />
      <ambientLight intensity={renderMode === 'cinematic' ? 0.45 : 0.72} />
      <directionalLight
        position={[5, 6, 4]}
        intensity={renderMode === 'cinematic' ? 1.8 : 1.3}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <spotLight position={[-4, 4, 6]} angle={0.45} intensity={0.7} color={0x7dd3fc} />
      {ALLOW_EXTERNAL_HDRI ? (
        <Suspense fallback={null}>
          <Environment preset={renderMode === 'cinematic' ? 'city' : 'studio'} />
        </Suspense>
      ) : null}
      <Grid args={[28, 28]} cellSize={0.5} cellThickness={0.5} sectionSize={2} sectionThickness={1.1} fadeDistance={32} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color={0x111827} roughness={0.92} metalness={0.08} />
      </mesh>

      <Selection>
        {objects.map((object) => (
          <SceneObjectMesh
            key={object.id}
            object={object}
            isSelected={selectedIds.includes(object.id)}
            primarySelected={primarySelectedId === object.id}
            transformMode={transformMode}
            transformSpace={transformSpace}
            gizmoConstraint={gizmoConstraint}
            gizmoPivotMode={gizmoPivotMode}
            snapEnabled={snapEnabled}
            visualGlowColor={selectedIds.includes(object.id) ? abilityAccentColor ?? 0x60a5fa : undefined}
            visualGlowIntensity={selectedIds.includes(object.id) ? vfxGlowIntensity + cinematicGlowIntensity : 0}
            facialExpressionIntensity={selectedIds.includes(object.id) ? facialExpressionIntensity : 0}
            hairHighlightColor={selectedIds.includes(object.id) ? hairHighlightColor : undefined}
            hairVolumeIntensity={selectedIds.includes(object.id) ? hairVolumeIntensity : 0}
            onTransformChange={handleTransformChange}
            onTransformOperation={onGizmoTransformOperation}
            onSelect={handleSelect}
          />
        ))}

        <EffectComposer autoClear={false} multisampling={4}>
          <Outline
            blur
            edgeStrength={2.6}
            pulseSpeed={0.35}
            visibleEdgeColor={0x7dd3fc}
            hiddenEdgeColor={0x1d4ed8}
          />
        </EffectComposer>
      </Selection>

      {trajectoryPoints.length > 1 ? <Line points={trajectoryPoints} color={creativeMode === 'film' ? 0xf59e0b : 0x38bdf8} lineWidth={2.2} dashed dashSize={0.2} gapSize={0.12} /> : null}

      <OrbitControls makeDefault enableDamping dampingFactor={0.12} maxDistance={14} minDistance={1.8} />
      <GizmoHelper alignment="bottom-right" margin={[88, 88]}>
        <GizmoViewport axisColors={['red', 'lime', 'deepskyblue']} labelColor="white" />
      </GizmoHelper>
    </Canvas>
  )
}
