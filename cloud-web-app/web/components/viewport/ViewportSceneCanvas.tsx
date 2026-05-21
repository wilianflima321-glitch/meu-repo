'use client'

// @aethel-heavy-async-boundary: loaded by AethelViewport3D only when Browser runtime is selected.

import { Suspense, useCallback, useMemo, useRef } from 'react'
import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { Environment, GizmoHelper, GizmoViewport, Grid, Html as DreiHtml, Line, OrbitControls } from '@react-three/drei'
import { EffectComposer, Outline, Select, Selection } from '@react-three/postprocessing'
import * as THREE from 'three'
import TransformGizmoProfessional from '@/components/viewport/gizmos/TransformGizmoProfessional'
import { CameraPresetApplier } from '@/components/viewport/ViewportCameraPresetApplier'
import type { ViewportCameraPreset } from '@/components/viewport/viewport-camera-presets'
import type {
  AethelViewport3DProps,
  ViewportSceneObject,
  ViewportTransformMode,
  ViewportTransformSpace,
} from '@/components/viewport/AethelViewport3D'
import { sampleTrajectory } from '@/lib/three/physics'
import { buildGizmoTransformOperation, type GizmoTransformOperation } from '@/lib/viewport/gizmo-transform-operation'
import type { GizmoAxisPlaneConstraint, GizmoPivotMode } from '@/lib/viewport/gizmo-elite-controls'

type SceneObjectMeshProps = {
  object: ViewportSceneObject
  isSelected: boolean
  primarySelected: boolean
  transformMode: ViewportTransformMode
  transformSpace: ViewportTransformSpace
  gizmoConstraint: GizmoAxisPlaneConstraint
  gizmoPivotMode: GizmoPivotMode
  snapEnabled: boolean
  onTransformChange: (id: string, patch: Partial<ViewportSceneObject>) => void
  onTransformOperation?: (operation: GizmoTransformOperation) => void
  onSelect: (id: string, additive: boolean) => void
}

function clampScale(scale: [number, number, number]): [number, number, number] {
  return [
    Math.max(0.1, scale[0]),
    Math.max(0.1, scale[1]),
    Math.max(0.1, scale[2]),
  ]
}

function GeometryForObject({ object, isSelected }: { object: ViewportSceneObject; isSelected: boolean }) {
  if (object.type === 'camera') {
    return (
      <>
        <mesh>
          <coneGeometry args={[0.24, 0.55, 4]} />
          <meshStandardMaterial color={isSelected ? 0xc4b5fd : object.color} wireframe />
        </mesh>
        <mesh position={[0, 0, -0.22]}>
          <boxGeometry args={[0.24, 0.18, 0.22]} />
          <meshStandardMaterial color={isSelected ? 0xc4b5fd : 0x1f2937} />
        </mesh>
      </>
    )
  }

  if (object.type === 'light') {
    return (
      <>
        <pointLight intensity={isSelected ? 1.9 : 1.5} distance={8} color={object.color} />
        <mesh>
          <sphereGeometry args={[0.18, 24, 24]} />
          <meshStandardMaterial emissive={object.color} emissiveIntensity={isSelected ? 1.8 : 1.2} color={object.color} />
        </mesh>
      </>
    )
  }

  switch (object.geometry) {
    case 'sphere':
      return (
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.6, 32, 32]} />
          <meshStandardMaterial color={object.color} metalness={0.5} roughness={0.28} emissive={isSelected ? 0x1d4ed8 : 0x000000} emissiveIntensity={isSelected ? 0.4 : 0} />
        </mesh>
      )
    case 'capsule':
      return (
        <mesh castShadow receiveShadow>
          <capsuleGeometry args={[0.4, 0.9, 6, 12]} />
          <meshStandardMaterial color={object.color} metalness={0.35} roughness={0.3} emissive={isSelected ? 0x0f766e : 0x000000} emissiveIntensity={isSelected ? 0.35 : 0} />
        </mesh>
      )
    case 'cylinder':
      return (
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.42, 0.55, 1.2, 24]} />
          <meshStandardMaterial color={object.color} metalness={0.55} roughness={0.24} emissive={isSelected ? 0xf97316 : 0x000000} emissiveIntensity={isSelected ? 0.35 : 0} />
        </mesh>
      )
    case 'plane':
      return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[1.6, 1.6]} />
          <meshStandardMaterial color={object.color} side={THREE.DoubleSide} />
        </mesh>
      )
    default:
      return (
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.4, 1, 1]} />
          <meshStandardMaterial color={object.color} metalness={0.62} roughness={0.22} emissive={isSelected ? 0x2563eb : 0x000000} emissiveIntensity={isSelected ? 0.3 : 0} />
        </mesh>
      )
  }
}

function SceneObjectMesh({
  object,
  isSelected,
  primarySelected,
  transformMode,
  transformSpace,
  gizmoConstraint,
  gizmoPivotMode,
  snapEnabled,
  visualGlowColor,
  visualGlowIntensity,
  facialExpressionIntensity = 0,
  hairHighlightColor,
  hairVolumeIntensity = 0,
  onTransformChange,
  onTransformOperation,
  onSelect,
}: SceneObjectMeshProps & {
  visualGlowColor?: THREE.ColorRepresentation
  visualGlowIntensity?: number
  facialExpressionIntensity?: number
  hairHighlightColor?: THREE.ColorRepresentation | null
  hairVolumeIntensity?: number
}) {
  const groupRef = useRef<THREE.Group>(null)
  const beforeTransformRef = useRef<ViewportSceneObject | null>(null)
  const displayScale: [number, number, number] = primarySelected
    ? [
        object.scale[0] + hairVolumeIntensity * 0.06,
        object.scale[1] + facialExpressionIntensity * 0.04 + hairVolumeIntensity * 0.1,
        object.scale[2] + hairVolumeIntensity * 0.06,
      ]
    : object.scale
  const displayRotation: [number, number, number] = primarySelected
    ? [
        object.rotation[0] + facialExpressionIntensity * 0.04,
        object.rotation[1],
        object.rotation[2],
      ]
    : object.rotation

  const readCommittedTransform = useCallback((): Partial<ViewportSceneObject> | null => {
    if (!groupRef.current) return null
    const expressionScaleOffset = primarySelected ? hairVolumeIntensity * 0.06 : 0
    const expressionHeightOffset = primarySelected ? facialExpressionIntensity * 0.04 + hairVolumeIntensity * 0.1 : 0
    const expressionRotationOffset = primarySelected ? facialExpressionIntensity * 0.04 : 0
    return {
      position: [groupRef.current.position.x, groupRef.current.position.y, groupRef.current.position.z],
      rotation: [groupRef.current.rotation.x - expressionRotationOffset, groupRef.current.rotation.y, groupRef.current.rotation.z],
      scale: clampScale([
        groupRef.current.scale.x - expressionScaleOffset,
        groupRef.current.scale.y - expressionHeightOffset,
        groupRef.current.scale.z - expressionScaleOffset,
      ]),
    }
  }, [facialExpressionIntensity, hairVolumeIntensity, primarySelected])

  const commitTransform = useCallback(() => {
    const patch = readCommittedTransform()
    if (!patch) return
    onTransformChange(object.id, patch)
  }, [object.id, onTransformChange, readCommittedTransform])

  const handleDragStateChange = useCallback((dragging: boolean) => {
    if (dragging) {
      beforeTransformRef.current = object
      return
    }

    const beforeObject = beforeTransformRef.current
    const patch = readCommittedTransform()
    beforeTransformRef.current = null

    if (!beforeObject || !patch) {
      return
    }

    const afterObject: ViewportSceneObject = { ...beforeObject, ...patch }
    onTransformOperation?.(buildGizmoTransformOperation({
      objectsBefore: [beforeObject],
      objectsAfter: [afterObject],
      mode: transformMode,
      space: transformSpace,
      snapEnabled,
      source: 'user',
      reason: `Viewport gizmo ${transformMode} on ${object.name}`,
      evidenceRefs: ['viewport:gizmo-transform'],
    }))

    onTransformChange(object.id, patch)
  }, [object, onTransformChange, onTransformOperation, readCommittedTransform, snapEnabled, transformMode, transformSpace])

  const body = (
    <Select enabled={isSelected}>
      <group
        ref={groupRef}
        position={object.position}
        rotation={displayRotation}
        scale={displayScale}
        visible={object.visible !== false}
        onClick={(event: ThreeEvent<MouseEvent>) => {
          event.stopPropagation()
          onSelect(object.id, event.nativeEvent.shiftKey)
        }}
      >
        <GeometryForObject object={object} isSelected={isSelected} />
        {visualGlowIntensity && visualGlowIntensity > 0 ? (
          <mesh scale={[1.08, 1.08, 1.08]}>
            <sphereGeometry args={[0.95, 20, 20]} />
            <meshBasicMaterial color={visualGlowColor ?? 0x60a5fa} transparent opacity={Math.min(0.18, visualGlowIntensity * 0.08)} />
          </mesh>
        ) : null}
        {primarySelected && hairVolumeIntensity > 0 ? (
          <mesh position={[0, 0.72 + hairVolumeIntensity * 0.08, 0]} scale={[1 + hairVolumeIntensity * 0.12, 0.18 + hairVolumeIntensity * 0.06, 1 + hairVolumeIntensity * 0.12]}>
            <sphereGeometry args={[0.5, 24, 24]} />
            <meshBasicMaterial color={hairHighlightColor ?? 0x6b3d22} transparent opacity={0.22} />
          </mesh>
        ) : null}
        {isSelected ? (
          <DreiHtml position={[0, 0.95, 0]} center>
            <div className="rounded-full border border-[color-mix(in_srgb,var(--aethel-primary)_35%,transparent)] bg-[rgba(6,10,18,0.84)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-primary)] shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
              {object.name}
              {object.asset ? <span className="ml-1 text-[var(--aethel-text-tertiary)]">.{object.asset.format}</span> : null}
            </div>
          </DreiHtml>
        ) : null}
      </group>
    </Select>
  )

  if (!primarySelected || object.locked) return body

  return (
    <TransformGizmoProfessional
      mode={transformMode}
      space={transformSpace}
      constraint={gizmoConstraint}
      pivotMode={gizmoPivotMode}
      snapEnabled={snapEnabled}
      translationSnap={0.5}
      rotationSnapDegrees={15}
      scaleSnap={0.1}
      onDragStateChange={handleDragStateChange}
      onObjectChange={commitTransform}
    >
      {body}
    </TransformGizmoProfessional>
  )
}

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
}: Omit<AethelViewport3DProps, 'onTogglePlayTest' | 'onTransformModeChange' | 'onTransformSpaceChange' | 'onSnapEnabledChange' | 'onAIAction'> & {
  cameraPreset: ViewportCameraPreset
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
      <CameraPresetApplier preset={cameraPreset} />
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
      <Suspense fallback={null}>
        <Environment preset={renderMode === 'cinematic' ? 'city' : 'studio'} />
      </Suspense>
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
