'use client'

import { Suspense, useCallback, useMemo, useRef, useState } from 'react'
import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { Environment, GizmoHelper, GizmoViewport, Grid, Html, Line, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import {
  Box,
  Camera,
  Eye,
  EyeOff,
  Film,
  Move3D,
  RotateCw,
  Scale3D,
  Sparkles,
  Target,
  Wand2,
} from 'lucide-react'
import TransformGizmoProfessional from '@/components/viewport/gizmos/TransformGizmoProfessional'
import { sampleTrajectory } from '@/lib/three/physics'

export type ViewportTransformMode = 'translate' | 'rotate' | 'scale'
export type ViewportTransformSpace = 'world' | 'local'

export type ViewportSceneObject = {
  id: string
  name: string
  type: 'mesh' | 'light' | 'camera'
  geometry?: 'box' | 'sphere' | 'capsule' | 'cylinder' | 'plane'
  color: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  locked?: boolean
  visible?: boolean
}

type AethelViewport3DProps = {
  objects: ViewportSceneObject[]
  selectedIds: string[]
  transformMode: ViewportTransformMode
  transformSpace: ViewportTransformSpace
  snapEnabled: boolean
  renderMode?: 'draft' | 'cinematic'
  isPlaying: boolean
  onTogglePlayTest: () => void
  onObjectsChange: (objects: ViewportSceneObject[]) => void
  onSelectionChange: (ids: string[]) => void
  onTransformModeChange: (mode: ViewportTransformMode) => void
  onTransformSpaceChange: (space: ViewportTransformSpace) => void
  onSnapEnabledChange: (enabled: boolean) => void
  onAIAction?: (action: string) => void
}

type SceneObjectMeshProps = {
  object: ViewportSceneObject
  isSelected: boolean
  primarySelected: boolean
  transformMode: ViewportTransformMode
  transformSpace: ViewportTransformSpace
  snapEnabled: boolean
  onTransformChange: (id: string, patch: Partial<ViewportSceneObject>) => void
  onSelect: (id: string, additive: boolean) => void
}

const iconButton = 'inline-flex items-center justify-center rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_74%,transparent)] p-2 text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]'
const activeButton = 'inline-flex items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--aethel-primary)_32%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] p-2 text-[var(--aethel-primary-light)] transition hover:brightness-110'
const panelButton = 'inline-flex items-center gap-2 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_78%,transparent)] px-3 py-2 text-xs font-medium text-[var(--aethel-text-primary)] transition hover:border-[var(--aethel-border-secondary)]'

const defaultObjects: ViewportSceneObject[] = [
  {
    id: 'airlock-shell',
    name: 'Airlock Shell',
    type: 'mesh',
    geometry: 'box',
    color: '#7dd3fc',
    position: [0, 0.55, 0],
    rotation: [0, 0.35, 0],
    scale: [1.8, 1.1, 1.2],
    visible: true,
  },
  {
    id: 'camera-rig',
    name: 'Camera Rig',
    type: 'camera',
    color: '#a78bfa',
    position: [2.2, 1.5, 2.4],
    rotation: [-0.35, 0.72, 0],
    scale: [1, 1, 1],
    visible: true,
  },
  {
    id: 'key-light',
    name: 'Key Light',
    type: 'light',
    color: '#fbbf24',
    position: [1.6, 2.2, 1.8],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    visible: true,
  },
]

function clampScale(scale: [number, number, number]): [number, number, number] {
  return [
    Math.max(0.1, scale[0]),
    Math.max(0.1, scale[1]),
    Math.max(0.1, scale[2]),
  ]
}

function parseAiViewportCommand(command: string, object: ViewportSceneObject): Partial<ViewportSceneObject> | null {
  const normalized = command.toLowerCase()
  const parsedNumber = Number(normalized.match(/-?\d+(?:\.\d+)?/)?.[0] ?? '1')
  const amount = Number.isFinite(parsedNumber) && parsedNumber !== 0 ? parsedNumber : 1

  if (normalized.includes('up') || normalized.includes('cima')) {
    return { position: [object.position[0], object.position[1] + amount, object.position[2]] }
  }
  if (normalized.includes('down') || normalized.includes('baixo')) {
    return { position: [object.position[0], object.position[1] - amount, object.position[2]] }
  }
  if (normalized.includes('left') || normalized.includes('esquerda')) {
    return { position: [object.position[0] - amount, object.position[1], object.position[2]] }
  }
  if (normalized.includes('right') || normalized.includes('direita')) {
    return { position: [object.position[0] + amount, object.position[1], object.position[2]] }
  }
  if (normalized.includes('forward') || normalized.includes('frente')) {
    return { position: [object.position[0], object.position[1], object.position[2] - amount] }
  }
  if (normalized.includes('back') || normalized.includes('tras')) {
    return { position: [object.position[0], object.position[1], object.position[2] + amount] }
  }
  if (normalized.includes('rotate') || normalized.includes('rotacion')) {
    return { rotation: [object.rotation[0], object.rotation[1] + THREE.MathUtils.degToRad(amount), object.rotation[2]] }
  }
  if (normalized.includes('scale') || normalized.includes('bigger') || normalized.includes('maior')) {
    const factor = 1 + amount / 10
    return { scale: clampScale([object.scale[0] * factor, object.scale[1] * factor, object.scale[2] * factor]) }
  }
  if (normalized.includes('smaller') || normalized.includes('menor')) {
    const factor = Math.max(0.1, 1 - amount / 10)
    return { scale: clampScale([object.scale[0] * factor, object.scale[1] * factor, object.scale[2] * factor]) }
  }

  return null
}

function GeometryForObject({ object, isSelected }: { object: ViewportSceneObject; isSelected: boolean }) {
  if (object.type === 'camera') {
    return (
      <>
        <mesh>
          <coneGeometry args={[0.24, 0.55, 4]} />
          <meshStandardMaterial color={isSelected ? '#c4b5fd' : object.color} wireframe />
        </mesh>
        <mesh position={[0, 0, -0.22]}>
          <boxGeometry args={[0.24, 0.18, 0.22]} />
          <meshStandardMaterial color={isSelected ? '#c4b5fd' : '#1f2937'} />
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
          <meshStandardMaterial color={object.color} metalness={0.5} roughness={0.28} emissive={isSelected ? '#1d4ed8' : '#000000'} emissiveIntensity={isSelected ? 0.4 : 0} />
        </mesh>
      )
    case 'capsule':
      return (
        <mesh castShadow receiveShadow>
          <capsuleGeometry args={[0.4, 0.9, 6, 12]} />
          <meshStandardMaterial color={object.color} metalness={0.35} roughness={0.3} emissive={isSelected ? '#0f766e' : '#000000'} emissiveIntensity={isSelected ? 0.35 : 0} />
        </mesh>
      )
    case 'cylinder':
      return (
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.42, 0.55, 1.2, 24]} />
          <meshStandardMaterial color={object.color} metalness={0.55} roughness={0.24} emissive={isSelected ? '#f97316' : '#000000'} emissiveIntensity={isSelected ? 0.35 : 0} />
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
          <meshStandardMaterial color={object.color} metalness={0.62} roughness={0.22} emissive={isSelected ? '#2563eb' : '#000000'} emissiveIntensity={isSelected ? 0.3 : 0} />
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
  snapEnabled,
  onTransformChange,
  onSelect,
}: SceneObjectMeshProps) {
  const groupRef = useRef<THREE.Group>(null)

  const commitTransform = useCallback(() => {
    if (!groupRef.current) return
    onTransformChange(object.id, {
      position: [groupRef.current.position.x, groupRef.current.position.y, groupRef.current.position.z],
      rotation: [groupRef.current.rotation.x, groupRef.current.rotation.y, groupRef.current.rotation.z],
      scale: clampScale([groupRef.current.scale.x, groupRef.current.scale.y, groupRef.current.scale.z]),
    })
  }, [object.id, onTransformChange])

  const body = (
    <group
      ref={groupRef}
      position={object.position}
      rotation={object.rotation}
      scale={object.scale}
      visible={object.visible !== false}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation()
        onSelect(object.id, event.nativeEvent.shiftKey)
      }}
    >
      <GeometryForObject object={object} isSelected={isSelected} />
      {isSelected ? (
        <Html position={[0, 0.95, 0]} center>
          <div className="rounded-full border border-[color-mix(in_srgb,var(--aethel-primary)_35%,transparent)] bg-[rgba(6,10,18,0.84)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-primary)] shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
            {object.name}
          </div>
        </Html>
      ) : null}
    </group>
  )

  if (!primarySelected || object.locked) return body

  return (
    <TransformGizmoProfessional
      mode={transformMode}
      space={transformSpace}
      snapEnabled={snapEnabled}
      translationSnap={0.5}
      rotationSnapDegrees={15}
      scaleSnap={0.1}
      onObjectChange={commitTransform}
    >
      {body}
    </TransformGizmoProfessional>
  )
}

function ViewportScene({
  objects,
  selectedIds,
  transformMode,
  transformSpace,
  snapEnabled,
  renderMode = 'draft',
  isPlaying,
  onObjectsChange,
  onSelectionChange,
}: Omit<AethelViewport3DProps, 'onTogglePlayTest' | 'onTransformModeChange' | 'onTransformSpaceChange' | 'onSnapEnabledChange' | 'onAIAction'>) {
  const primarySelectedId = selectedIds[0] ?? null
  const selectedObject = objects.find((object) => object.id === primarySelectedId) ?? null

  const trajectoryPoints = useMemo(() => {
    if (!isPlaying || !selectedObject) return []
    const points = sampleTrajectory(8, 42, 9.81, 48, { dragCoef: 0.06, mass: 1.2, dt: 0.06 })
    return points.map((point) => [selectedObject.position[0] + point.x / 4, selectedObject.position[1] + point.y / 4, selectedObject.position[2]] as [number, number, number])
  }, [isPlaying, selectedObject])

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

  return (
    <Canvas
      shadows
      camera={{ position: [3.8, 2.4, 4.8], fov: 46 }}
      onPointerMissed={() => onSelectionChange([])}
      className="h-full w-full"
    >
      <color attach="background" args={[renderMode === 'cinematic' ? '#070b12' : '#0b1220']} />
      <fog attach="fog" args={[renderMode === 'cinematic' ? '#070b12' : '#0b1220', 10, 22]} />
      <ambientLight intensity={renderMode === 'cinematic' ? 0.45 : 0.72} />
      <directionalLight
        position={[5, 6, 4]}
        intensity={renderMode === 'cinematic' ? 1.8 : 1.3}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <spotLight position={[-4, 4, 6]} angle={0.45} intensity={0.7} color="#7dd3fc" />
      <Suspense fallback={null}>
        <Environment preset={renderMode === 'cinematic' ? 'city' : 'studio'} />
      </Suspense>
      <Grid args={[28, 28]} cellSize={0.5} cellThickness={0.5} sectionSize={2} sectionThickness={1.1} fadeDistance={32} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#111827" roughness={0.92} metalness={0.08} />
      </mesh>

      {objects.map((object) => (
        <SceneObjectMesh
          key={object.id}
          object={object}
          isSelected={selectedIds.includes(object.id)}
          primarySelected={primarySelectedId === object.id}
          transformMode={transformMode}
          transformSpace={transformSpace}
          snapEnabled={snapEnabled}
          onTransformChange={handleTransformChange}
          onSelect={handleSelect}
        />
      ))}

      {trajectoryPoints.length > 1 ? <Line points={trajectoryPoints} color="#38bdf8" lineWidth={2.2} dashed dashSize={0.2} gapSize={0.12} /> : null}

      <OrbitControls makeDefault enableDamping dampingFactor={0.12} maxDistance={14} minDistance={1.8} />
      <GizmoHelper alignment="bottom-right" margin={[88, 88]}>
        <GizmoViewport axisColors={['#ff6b6b', '#4ade80', '#60a5fa']} labelColor="#ffffff" />
      </GizmoHelper>
    </Canvas>
  )
}

export function SceneViewportOutliner({
  objects,
  selectedIds,
  onSelectionChange,
  onObjectsChange,
}: {
  objects: ViewportSceneObject[]
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  onObjectsChange: (objects: ViewportSceneObject[]) => void
}) {
  return (
    <div className="flex h-full flex-col bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)]">
      <div className="border-b border-[var(--aethel-border-primary)] px-3 py-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">Hierarchy</p>
            <p className="mt-1 text-xs text-[var(--aethel-text-quaternary)]">Cena, câmeras e luzes conectadas ao viewport.</p>
          </div>
          <span className="rounded-full border border-[var(--aethel-border-subtle)] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
            {objects.length} itens
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-auto px-2 py-2">
        {objects.map((object) => {
          const active = selectedIds.includes(object.id)
          const Icon = object.type === 'light' ? Sparkles : object.type === 'camera' ? Camera : Box
          return (
            <div key={object.id} className="mb-1 rounded-xl border border-transparent bg-transparent p-1 hover:border-[var(--aethel-border-subtle)]">
              <div className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition ${active ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_16%,transparent)] text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_55%,transparent)]'}`}>
                <button
                  type="button"
                  aria-label={`Selecionar ${object.name}`}
                  onClick={() => onSelectionChange([object.id])}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <Icon className="h-4 w-4" />
                  <span className="truncate">{object.name}</span>
                </button>
                <button
                  type="button"
                  aria-label={`${object.visible === false ? 'Mostrar' : 'Ocultar'} ${object.name}`}
                  onClick={() => onObjectsChange(objects.map((item) => item.id === object.id ? { ...item, visible: item.visible === false } : item))}
                  className="rounded-md p-1 text-[var(--aethel-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_75%,transparent)] hover:text-[var(--aethel-text-primary)]"
                >
                  {object.visible === false ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function SceneViewportInspector({
  selectedObject,
  transformMode,
  transformSpace,
  snapEnabled,
  isPlaying,
  onTransformModeChange,
  onTransformSpaceChange,
  onSnapEnabledChange,
  onTogglePlayTest,
}: {
  selectedObject: ViewportSceneObject | null
  transformMode: ViewportTransformMode
  transformSpace: ViewportTransformSpace
  snapEnabled: boolean
  isPlaying: boolean
  onTransformModeChange: (mode: ViewportTransformMode) => void
  onTransformSpaceChange: (space: ViewportTransformSpace) => void
  onSnapEnabledChange: (enabled: boolean) => void
  onTogglePlayTest: () => void
}) {
  const formatter = useCallback((value: number) => value.toFixed(2), [])

  return (
    <div className="flex h-full flex-col bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_52%,transparent)]">
      <div className="border-b border-[var(--aethel-border-primary)] px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">Inspector</p>
        <h3 className="mt-2 text-sm font-semibold text-[var(--aethel-text-primary)]">{selectedObject?.name ?? 'Nenhum objeto selecionado'}</h3>
        <p className="mt-1 text-xs text-[var(--aethel-text-quaternary)]">Transform, snapping e play test conectados ao viewport soberano.</p>
      </div>
      <div className="flex-1 space-y-4 overflow-auto px-4 py-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">Gizmo</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'translate' as const, icon: Move3D, label: 'Move' },
              { id: 'rotate' as const, icon: RotateCw, label: 'Rotate' },
              { id: 'scale' as const, icon: Scale3D, label: 'Scale' },
            ].map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`Ativar modo ${item.label}`}
                  onClick={() => onTransformModeChange(item.id)}
                  className={transformMode === item.id ? activeButton : iconButton}
                >
                  <Icon className="h-4 w-4" />
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">Precision</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-label={`Usar espaço ${transformSpace === 'world' ? 'local' : 'world'}`}
              onClick={() => onTransformSpaceChange(transformSpace === 'world' ? 'local' : 'world')}
              className={panelButton}
            >
              <Target className="h-4 w-4" />
              {transformSpace === 'world' ? 'World' : 'Local'}
            </button>
            <button
              type="button"
              aria-label={`${snapEnabled ? 'Desativar' : 'Ativar'} snapping`}
              onClick={() => onSnapEnabledChange(!snapEnabled)}
              className={panelButton}
            >
              <Film className="h-4 w-4" />
              {snapEnabled ? 'Snap 0.5' : 'Free'}
            </button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">AI + Simulation</p>
          <div className="space-y-2">
            <button type="button" aria-label="Executar play test" onClick={onTogglePlayTest} className={panelButton}>
              <Wand2 className="h-4 w-4" />
              {isPlaying ? 'Stop Play Test' : 'Play Test'}
            </button>
            <div className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-3">
              <p className="text-xs font-medium text-[var(--aethel-text-primary)]">Text to action</p>
              <p className="mt-1 text-xs text-[var(--aethel-text-quaternary)]">“move este objeto 2 para cima”, “rotate 15”, “scale 2”.</p>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">Transform</p>
          {selectedObject ? (
            <div className="space-y-3 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-3 text-xs text-[var(--aethel-text-secondary)]">
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-quaternary)]">Position</p>
                <p>{selectedObject.position.map(formatter).join(' · ')}</p>
              </div>
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-quaternary)]">Rotation</p>
                <p>{selectedObject.rotation.map((value) => formatter(THREE.MathUtils.radToDeg(value))).join('° · ')}°</p>
              </div>
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-quaternary)]">Scale</p>
                <p>{selectedObject.scale.map(formatter).join(' · ')}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--aethel-border-subtle)] px-4 py-6 text-center text-xs text-[var(--aethel-text-quaternary)]">
              Selecione um objeto no viewport ou na hierarchy para editar com gizmo profissional.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function AethelViewport3D({
  objects,
  selectedIds,
  transformMode,
  transformSpace,
  snapEnabled,
  renderMode = 'draft',
  isPlaying,
  onTogglePlayTest,
  onObjectsChange,
  onSelectionChange,
  onTransformModeChange,
  onTransformSpaceChange,
  onSnapEnabledChange,
  onAIAction,
}: AethelViewport3DProps) {
  const [aiCommand, setAiCommand] = useState('move this object 2 up')
  const selectedObject = objects.find((object) => object.id === selectedIds[0]) ?? null

  const applyAiCommand = useCallback(() => {
    if (!selectedObject) return
    const patch = parseAiViewportCommand(aiCommand, selectedObject)
    if (!patch) return
    onObjectsChange(objects.map((object) => (object.id === selectedObject.id ? { ...object, ...patch } : object)))
    onAIAction?.(aiCommand)
  }, [aiCommand, objects, onAIAction, onObjectsChange, selectedObject])

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden">
      <div className="absolute left-4 top-4 z-20 flex flex-wrap items-center gap-2">
        <button type="button" aria-label="Ativar modo mover" onClick={() => onTransformModeChange('translate')} className={transformMode === 'translate' ? activeButton : iconButton}>
          <Move3D className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Ativar modo rotacionar" onClick={() => onTransformModeChange('rotate')} className={transformMode === 'rotate' ? activeButton : iconButton}>
          <RotateCw className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Ativar modo escalar" onClick={() => onTransformModeChange('scale')} className={transformMode === 'scale' ? activeButton : iconButton}>
          <Scale3D className="h-4 w-4" />
        </button>
        <button type="button" aria-label={`${snapEnabled ? 'Desativar' : 'Ativar'} snapping ao grid`} onClick={() => onSnapEnabledChange(!snapEnabled)} className={snapEnabled ? activeButton : iconButton}>
          <Target className="h-4 w-4" />
        </button>
        <button type="button" aria-label={`Trocar para espaço ${transformSpace === 'world' ? 'local' : 'world'}`} onClick={() => onTransformSpaceChange(transformSpace === 'world' ? 'local' : 'world')} className={transformSpace === 'local' ? activeButton : iconButton}>
          <Film className="h-4 w-4" />
        </button>
      </div>

      <div className="absolute right-4 top-4 z-20 w-[340px] rounded-2xl border border-[var(--aethel-border-subtle)] bg-[rgba(7,12,20,0.86)] p-3 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-md">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">Informative AI</p>
            <p className="mt-1 text-sm font-medium text-[var(--aethel-text-primary)]">Aplique comandos diretamente no gizmo</p>
          </div>
          <button type="button" aria-label={isPlaying ? 'Parar play test do viewport' : 'Executar play test do viewport'} onClick={onTogglePlayTest} className={panelButton}>
            <Sparkles className="h-4 w-4" />
            {isPlaying ? 'Stop' : 'Play'}
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={aiCommand}
            onChange={(event) => setAiCommand(event.target.value)}
            aria-label="Comando de IA para transformar objeto selecionado"
            className="flex-1 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_78%,transparent)] px-3 py-2 text-sm text-[var(--aethel-text-primary)] outline-none"
          />
          <button type="button" aria-label="Aplicar comando de IA ao objeto selecionado" onClick={applyAiCommand} className={panelButton}>
            <Wand2 className="h-4 w-4" />
            Apply
          </button>
        </div>
        <p className="mt-2 text-xs text-[var(--aethel-text-quaternary)]">Multi-select já funciona via Shift+Click. O gizmo principal ancora no primeiro item selecionado.</p>
      </div>

      <ViewportScene
        objects={objects.length > 0 ? objects : defaultObjects}
        selectedIds={selectedIds}
        transformMode={transformMode}
        transformSpace={transformSpace}
        snapEnabled={snapEnabled}
        renderMode={renderMode}
        isPlaying={isPlaying}
        onObjectsChange={onObjectsChange}
        onSelectionChange={onSelectionChange}
      />
    </div>
  )
}

export const viewportSeedObjects = defaultObjects
