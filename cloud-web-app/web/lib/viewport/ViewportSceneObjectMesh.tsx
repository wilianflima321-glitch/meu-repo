'use client'

// @aethel-heavy-async-boundary: mounted only through the canonical viewport scene canvas.
import { useCallback, useMemo, useRef } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { Html as DreiHtml } from '@react-three/drei'
import { Select } from '@react-three/postprocessing'
import * as THREE from 'three'

import TransformGizmoProfessional from '@/lib/viewport/gizmos/TransformGizmoProfessional'
import { ViewportImportedAssetMesh } from '@/lib/viewport/ViewportImportedAssetMesh'
import type {
  ViewportPBRTextureMaps,
  ViewportSceneObject,
  ViewportTransformMode,
  ViewportTransformSpace,
} from '@/components/viewport/AethelViewport3D'
import {
  buildGizmoTransformOperation,
  type GizmoTransformOperation,
} from '@/lib/viewport/gizmo-transform-operation'
import type {
  GizmoAxisPlaneConstraint,
  GizmoPivotMode,
} from '@/lib/viewport/gizmo-elite-controls'

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

/** Loads the four procedurally-generated PBR maps (see `lib/viewport/procedural-pbr.ts`) as Three.js textures. */
function usePBRTextures(textureMaps?: ViewportPBRTextureMaps) {
  return useMemo(() => {
    if (!textureMaps) return null
    const loader = new THREE.TextureLoader()
    const albedoMap = loader.load(textureMaps.albedo)
    albedoMap.colorSpace = THREE.SRGBColorSpace
    return {
      map: albedoMap,
      normalMap: loader.load(textureMaps.normal),
      roughnessMap: loader.load(textureMaps.roughness),
      displacementMap: loader.load(textureMaps.displacement),
    }
  }, [textureMaps])
}

function GeometryForObject({ object, isSelected }: { object: ViewportSceneObject; isSelected: boolean }) {
  const pbrTextures = usePBRTextures(object.textureMaps)
  // Phase 4 (AAA Studio Deepening Sweep) — inspector PBR slots apply to any
  // mesh shape, not just imported planes. Displacement is intentionally
  // plane-only below: box/sphere/capsule/cylinder primitives here don't carry
  // enough subdivisions for a displacement map to read as anything but noise.
  const solidTextureProps = pbrTextures
    ? { map: pbrTextures.map, normalMap: pbrTextures.normalMap, roughnessMap: pbrTextures.roughnessMap }
    : {}
  const solidColor = pbrTextures ? 0xffffff : object.color
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

  if (object.meshUrl && object.asset?.format && object.asset.viewerStatus !== 'held') {
    return (
      <ViewportImportedAssetMesh
        url={object.meshUrl}
        format={object.asset.format}
        isSelected={isSelected}
      />
    )
  }

  switch (object.geometry) {
    case 'sphere':
      return (
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.6, 32, 32]} />
          <meshStandardMaterial color={solidColor} metalness={pbrTextures ? 0.1 : 0.5} roughness={pbrTextures ? 1 : 0.28} emissive={isSelected ? 0x1d4ed8 : 0x000000} emissiveIntensity={isSelected ? 0.4 : 0} {...solidTextureProps} />
        </mesh>
      )
    case 'capsule':
      return (
        <mesh castShadow receiveShadow>
          <capsuleGeometry args={[0.4, 0.9, 6, 12]} />
          <meshStandardMaterial color={solidColor} metalness={pbrTextures ? 0.1 : 0.35} roughness={pbrTextures ? 1 : 0.3} emissive={isSelected ? 0x0f766e : 0x000000} emissiveIntensity={isSelected ? 0.35 : 0} {...solidTextureProps} />
        </mesh>
      )
    case 'cylinder':
      return (
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.42, 0.55, 1.2, 24]} />
          <meshStandardMaterial color={solidColor} metalness={pbrTextures ? 0.1 : 0.55} roughness={pbrTextures ? 1 : 0.24} emissive={isSelected ? 0xf97316 : 0x000000} emissiveIntensity={isSelected ? 0.35 : 0} {...solidTextureProps} />
        </mesh>
      )
    case 'plane':
      return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[1.6, 1.6, 64, 64]} />
          {pbrTextures ? (
            <meshStandardMaterial
              map={pbrTextures.map}
              normalMap={pbrTextures.normalMap}
              roughnessMap={pbrTextures.roughnessMap}
              displacementMap={pbrTextures.displacementMap}
              displacementScale={0.08}
              side={THREE.DoubleSide}
            />
          ) : (
            <meshStandardMaterial color={object.color} side={THREE.DoubleSide} />
          )}
        </mesh>
      )
    default:
      return (
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.4, 1, 1]} />
          <meshStandardMaterial color={solidColor} metalness={pbrTextures ? 0.1 : 0.62} roughness={pbrTextures ? 1 : 0.22} emissive={isSelected ? 0x2563eb : 0x000000} emissiveIntensity={isSelected ? 0.3 : 0} {...solidTextureProps} />
        </mesh>
      )
  }
}

export function SceneObjectMesh({
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
        userData={{ aethelObjectId: object.id }}
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
