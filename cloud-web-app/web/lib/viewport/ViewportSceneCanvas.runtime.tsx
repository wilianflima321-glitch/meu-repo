'use client'

// @aethel-heavy-async-boundary: loaded by AethelViewport3D only when Browser runtime is selected.

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Environment, GizmoHelper, GizmoViewport, Grid, Line, OrbitControls } from '@react-three/drei'
import { EffectComposer, Outline, Selection } from '@react-three/postprocessing'
import { CameraPresetApplier } from '@/components/viewport/ViewportCameraPresetApplier'
import type { ViewportCameraPreset } from '@/components/viewport/viewport-camera-presets'
import type {
  AethelViewport3DProps,
  ViewportRenderStats,
  ViewportSceneObject,
} from '@/components/viewport/AethelViewport3D'
import { sampleTrajectory } from '@/lib/three/physics'
import type { GizmoAxisPlaneConstraint, GizmoPivotMode } from '@/lib/viewport/gizmo-elite-controls'
import { SceneObjectMesh } from '@/components/viewport/ViewportSceneObjectMesh'
import type { ViewportFidelityParams } from '@/lib/production/viewport-fidelity'
import type { ViewportFrameloopMode } from '@/lib/viewport/use-viewport-render-activity'
import { TerrainHeightfieldLiveLayer } from '@/components/preview/TerrainHeightfieldLiveLayer'
import { RadianceStudioViewportBridge } from '@/lib/viewport/RadianceStudioViewportBridge'

const ALLOW_EXTERNAL_HDRI = process.env.NEXT_PUBLIC_AETHEL_EXTERNAL_HDRI === '1'

/**
 * FASE 3.4 — Drag-and-Drop 3D Absolute: exposes a synchronous "what object
 * is under this screen point" resolver to the DOM layer outside the Canvas
 * (`SceneViewportStage.handleDrop`), by walking up each intersected mesh's
 * `userData.aethelObjectId` (set in `ViewportSceneObjectMesh.tsx`). Renders
 * nothing — this is a pure imperative bridge, registered once via
 * `onRaycastReady` and re-registered if the Canvas remounts.
 */
function AssetDropRaycastBridge({ onReady }: { onReady?: (resolve: (clientX: number, clientY: number) => string | null) => void }) {
  const { camera, scene, gl } = useThree()
  const raycaster = useMemo(() => new THREE.Raycaster(), [])

  useEffect(() => {
    if (!onReady) return
    const resolve = (clientX: number, clientY: number): string | null => {
      const rect = gl.domElement.getBoundingClientRect()
      const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1
      const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera)
      const intersections = raycaster.intersectObjects(scene.children, true)
      for (const hit of intersections) {
        let node: THREE.Object3D | null = hit.object
        while (node) {
          const objectId = node.userData?.aethelObjectId
          if (typeof objectId === 'string') return objectId
          node = node.parent
        }
      }
      return null
    }
    onReady(resolve)
  }, [onReady, camera, scene, gl, raycaster])

  return null
}

/**
 * Anti-Mock fix (Phase 3, AAA Studio Deepening Sweep) — samples the real
 * `THREE.WebGLRenderer.info` counters every frame and reports a throttled,
 * EMA-smoothed snapshot to the DOM-level Stat FPS overlay in
 * `ViewportTopToolbar`. Previously that overlay hardcoded `60.0 FPS`,
 * `42 calls`, `412 MB VRAM` regardless of actual scene load. VRAM is
 * intentionally never fabricated here — WebGL2 does not expose real GPU
 * byte allocation to page JS, only live geometry/texture object counts.
 */
function RenderStatsProbe({
  pipelineLabel,
  onStats,
}: {
  pipelineLabel: string
  onStats?: (stats: ViewportRenderStats) => void
}) {
  const { gl } = useThree()
  const emaFrameTimeMs = useRef(16.6)
  const lastSampleAt = useRef(0)

  useFrame((_, delta) => {
    if (!onStats) return
    const frameTimeMs = delta * 1000
    emaFrameTimeMs.current = emaFrameTimeMs.current * 0.9 + frameTimeMs * 0.1
    const now = typeof performance !== 'undefined' ? performance.now() : lastSampleAt.current + 500
    if (now - lastSampleAt.current < 400) return
    lastSampleAt.current = now
    const info = gl.info
    onStats({
      fps: emaFrameTimeMs.current > 0 ? 1000 / emaFrameTimeMs.current : 0,
      frameTimeMs: emaFrameTimeMs.current,
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      pipelineLabel,
    })
  })

  return null
}

const DEFAULT_FIDELITY: ViewportFidelityParams = {
  level: 'balanced',
  pipelineLabel: 'r3f-webgl2',
  shadows: true,
  shadowMapSize: 1024,
  ambientIntensity: 0.72,
  directionalIntensity: 1.3,
  postFx: true,
  postMultisampling: 2,
  dprMax: 1.5,
  finalRenderSafe: false,
  notes: ['Balanced WebGL2 blueprint preview'],
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
  focusTarget,
  focusNonce,
  onRaycastReady,
  onRenderStats,
  fidelity = DEFAULT_FIDELITY,
  frameloop = 'always',
  terrainProjectId = null,
  capabilityScore,
}: Omit<AethelViewport3DProps, 'onTogglePlayTest' | 'onTransformModeChange' | 'onTransformSpaceChange' | 'onSnapEnabledChange' | 'onAIAction'> & {
  cameraPreset: ViewportCameraPreset
  focusTarget?: [number, number, number] | null
  focusNonce?: number
  gizmoConstraint: GizmoAxisPlaneConstraint
  gizmoPivotMode: GizmoPivotMode
  fidelity?: ViewportFidelityParams
  frameloop?: ViewportFrameloopMode
  /** Law XV Capability Score - Radiance studio wire (cf). */
  capabilityScore?: number
}) {
  const [heightfieldLive, setHeightfieldLive] = useState(false)
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
  const ambient = renderMode === 'cinematic' ? Math.min(fidelity.ambientIntensity, 0.45) : fidelity.ambientIntensity
  const directional = renderMode === 'cinematic' ? Math.max(fidelity.directionalIntensity, 1.6) : fidelity.directionalIntensity

  return (
    <div className="relative h-full w-full" data-viewport-fidelity={fidelity.level} data-final-render-safe="false">
      <Canvas
        shadows={fidelity.shadows}
        dpr={[1, fidelity.dprMax]}
        frameloop={frameloop}
        camera={{ position: [3.8, 2.4, 4.8], fov: 46 }}
        onPointerMissed={() => onSelectionChange([])}
        className="h-full w-full"
        data-aethel-pipeline={fidelity.pipelineLabel}
      >
      <CameraPresetApplier
        preset={cameraPreset}
        focusTarget={focusTarget}
        focusNonce={focusNonce}
      />
      <AssetDropRaycastBridge onReady={onRaycastReady} />
      <RenderStatsProbe pipelineLabel={fidelity.pipelineLabel} onStats={onRenderStats} />
      <RadianceStudioViewportBridge capabilityScore={capabilityScore} />
      <color attach="background" args={[renderMode === 'cinematic' ? 0x070b12 : 0x0b1220]} />
      <fog attach="fog" args={[renderMode === 'cinematic' ? 0x070b12 : 0x0b1220, 10, 22]} />
      <ambientLight intensity={ambient} />
      <directionalLight
        position={[5, 6, 4]}
        intensity={directional}
        castShadow={fidelity.shadows}
        shadow-mapSize-width={fidelity.shadowMapSize}
        shadow-mapSize-height={fidelity.shadowMapSize}
      />
      <spotLight position={[-4, 4, 6]} angle={0.45} intensity={0.7} color={0x7dd3fc} />
      {ALLOW_EXTERNAL_HDRI ? (
        <Suspense fallback={null}>
          <Environment preset={renderMode === 'cinematic' ? 'city' : 'studio'} />
        </Suspense>
      ) : null}
      <Grid args={[28, 28]} cellSize={0.5} cellThickness={0.5} sectionSize={2} sectionThickness={1.1} fadeDistance={32} />
      {/* Flat placeholder ground is suppressed when A.1 durable heightfield is live */}
      {!heightfieldLive ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow={fidelity.shadows} position={[0, 0, 0]}>
          <planeGeometry args={[40, 40]} />
          <meshStandardMaterial color={0x111827} roughness={0.92} metalness={0.08} />
        </mesh>
      ) : null}
      <TerrainHeightfieldLiveLayer
        projectId={terrainProjectId}
        showPhysicsViz
        onLiveChange={setHeightfieldLive}
      />

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

        {fidelity.postFx ? (
          <EffectComposer autoClear={false} multisampling={fidelity.postMultisampling}>
            <Outline
              blur
              edgeStrength={2.6}
              pulseSpeed={0.35}
              visibleEdgeColor={0x7dd3fc}
              hiddenEdgeColor={0x1d4ed8}
            />
          </EffectComposer>
        ) : null}
      </Selection>

      {trajectoryPoints.length > 1 ? <Line points={trajectoryPoints} color={creativeMode === 'film' ? 0xf59e0b : 0x38bdf8} lineWidth={2.2} dashed dashSize={0.2} gapSize={0.12} /> : null}

      <OrbitControls makeDefault enableDamping dampingFactor={0.12} maxDistance={14} minDistance={1.8} />
      <GizmoHelper alignment="bottom-right" margin={[88, 88]}>
        <GizmoViewport axisColors={['red', 'lime', 'deepskyblue']} labelColor="white" />
      </GizmoHelper>
    </Canvas>
    </div>
  )
}
