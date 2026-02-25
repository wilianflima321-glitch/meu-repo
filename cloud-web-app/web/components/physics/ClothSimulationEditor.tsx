/**
 * CLOTH SIMULATION EDITOR - Aethel Engine
 *
 * Editor visual profissional para simulacao de tecidos.
 * Integrado ao runtime de cloth simulation com preview em tempo real.
 */

'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, GizmoHelper, GizmoViewport, Grid, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

import { ClothSimulation, type ClothCollider, type ClothConfig } from '@/lib/cloth-simulation'

import { type ClothEditorState, type ClothPreset } from './cloth-editor-controls'
import { ClothSettingsPanel, Toolbar } from './ClothSimulationEditor.controls'
import { ClothMesh3D, ColliderVisualizer, WindArrow } from './ClothSimulationEditor.viewport'
import type { ClothToolType } from './cloth-simulation-editor.types'

export interface ClothSimulationEditorProps {
  meshId?: string
  initialConfig?: Partial<ClothConfig>
  onSimulationUpdate?: (config: ClothConfig) => void
  onExport?: (data: { config: ClothConfig; pinnedVertices: number[] }) => void
}

export default function ClothSimulationEditor({
  meshId,
  initialConfig,
  onSimulationUpdate,
  onExport,
}: ClothSimulationEditorProps) {
  const [config, setConfig] = useState<ClothConfig>({
    width: 4,
    height: 4,
    segmentsX: 20,
    segmentsY: 20,
    mass: 0.5,
    stiffness: 0.8,
    damping: 0.05,
    gravity: new THREE.Vector3(0, -9.81, 0),
    wind: new THREE.Vector3(0, 0, 0),
    windVariation: 0.1,
    iterations: 12,
    tearThreshold: 1.5,
    selfCollision: false,
    groundPlane: true,
    groundHeight: -2,
    ...initialConfig,
  })

  const [editorState, setEditorState] = useState<ClothEditorState>({
    selectedVertices: new Set(),
    pinnedVertices: new Set([0, 1, 2, 3, 4]),
    isSimulating: false,
    showConstraints: false,
    showWireframe: false,
    showColliders: true,
    currentPreset: null,
  })

  const [selectedTool, setSelectedTool] = useState<ClothToolType>('select')
  const [showWindArrow, setShowWindArrow] = useState(true)
  const [colliders, setColliders] = useState<ClothCollider[]>([
    {
      type: 'sphere',
      position: new THREE.Vector3(0, 0, 0),
      radius: 0.5,
    },
  ])
  const [selectedCollider, setSelectedCollider] = useState<number | null>(null)
  const [simulation, setSimulation] = useState<ClothSimulation | null>(null)

  useEffect(() => {
    const sim = new ClothSimulation(config)

    for (const idx of editorState.pinnedVertices) {
      if (sim.particles[idx]) {
        sim.particles[idx].pinned = true
      }
    }

    sim.setColliders(colliders)
    setSimulation(sim)
  }, [config, colliders, editorState.pinnedVertices])

  useEffect(() => {
    if (!simulation) return

    simulation.updateConfig(config)
    simulation.setColliders(colliders)
    onSimulationUpdate?.(config)
  }, [simulation, config, colliders, onSimulationUpdate])

  const handleVertexClick = useCallback(
    (index: number, shiftKey: boolean) => {
      if (!simulation) return

      setEditorState((prev) => {
        const next = { ...prev }

        switch (selectedTool) {
          case 'select': {
            if (shiftKey) {
              const nextSelection = new Set(prev.selectedVertices)
              if (nextSelection.has(index)) {
                nextSelection.delete(index)
              } else {
                nextSelection.add(index)
              }
              next.selectedVertices = nextSelection
            } else {
              next.selectedVertices = new Set([index])
            }
            break
          }

          case 'pin': {
            const nextPinned = new Set(prev.pinnedVertices)
            nextPinned.add(index)
            next.pinnedVertices = nextPinned
            if (simulation.particles[index]) {
              simulation.particles[index].pinned = true
            }
            break
          }

          case 'unpin': {
            const nextPinned = new Set(prev.pinnedVertices)
            nextPinned.delete(index)
            next.pinnedVertices = nextPinned
            if (simulation.particles[index]) {
              simulation.particles[index].pinned = false
            }
            break
          }

          case 'tear': {
            for (const constraint of simulation.constraints) {
              if (constraint.p1 === index || constraint.p2 === index) {
                constraint.broken = true
              }
            }
            break
          }

          default:
            break
        }

        return next
      })
    },
    [simulation, selectedTool],
  )

  const applyPreset = useCallback((preset: ClothPreset) => {
    setConfig((prev) => ({
      ...prev,
      ...preset.config,
      gravity: prev.gravity,
      wind: prev.wind,
    }))

    setEditorState((prev) => ({
      ...prev,
      currentPreset: preset.id,
    }))
  }, [])

  const resetSimulation = useCallback(() => {
    const sim = new ClothSimulation(config)
    for (const idx of editorState.pinnedVertices) {
      if (sim.particles[idx]) {
        sim.particles[idx].pinned = true
      }
    }
    sim.setColliders(colliders)
    setSimulation(sim)
    setEditorState((prev) => ({ ...prev, isSimulating: false }))
  }, [config, editorState.pinnedVertices, colliders])

  const handleExport = useCallback(() => {
    onExport?.({
      config,
      pinnedVertices: Array.from(editorState.pinnedVertices),
    })
  }, [config, editorState.pinnedVertices, onExport])

  const addCollider = useCallback((type: ClothCollider['type']) => {
    const newCollider: ClothCollider = {
      type,
      position: new THREE.Vector3(0, -1, 0),
      ...(type === 'sphere' ? { radius: 0.5 } : {}),
      ...(type === 'plane' ? { normal: new THREE.Vector3(0, 1, 0) } : {}),
      ...(type === 'box' ? { size: new THREE.Vector3(1, 1, 1) } : {}),
    }

    setColliders((prev) => [...prev, newCollider])
  }, [])

  return (
    <div className="flex h-full w-full bg-slate-900 text-slate-200" data-mesh-id={meshId}>
      <div className="p-2">
        <Toolbar
          selectedTool={selectedTool}
          onToolChange={setSelectedTool}
          isSimulating={editorState.isSimulating}
          onToggleSimulation={() => setEditorState((prev) => ({ ...prev, isSimulating: !prev.isSimulating }))}
          onReset={resetSimulation}
        />
      </div>

      <div className="relative flex-1">
        <Canvas camera={{ position: [5, 5, 5], fov: 50 }}>
          <color attach="background" args={['#0f172a']} />

          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 10, 5]} intensity={1} castShadow />

          <ClothMesh3D
            simulation={simulation}
            config={config}
            editorState={editorState}
            onVertexClick={handleVertexClick}
            selectedTool={selectedTool}
          />

          <ColliderVisualizer
            colliders={colliders}
            showColliders={editorState.showColliders}
            onColliderSelect={setSelectedCollider}
            selectedCollider={selectedCollider}
          />

          <WindArrow
            direction={{ x: config.wind.x, y: config.wind.y, z: config.wind.z }}
            strength={config.wind.length()}
            visible={showWindArrow}
          />

          {config.groundPlane && (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, config.groundHeight, 0]}>
              <planeGeometry args={[20, 20]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
          )}

          <Grid infiniteGrid fadeDistance={50} />
          <OrbitControls makeDefault />
          <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
            <GizmoViewport />
          </GizmoHelper>
          <Environment preset="city" />
        </Canvas>

        <div className="absolute top-4 left-4 rounded bg-slate-900/80 p-2 text-xs">
          <div className="text-slate-400">Vertices: {simulation?.particles.length ?? 0}</div>
          <div className="text-slate-400">
            Constraints: {simulation?.constraints.filter((c) => !c.broken).length ?? 0}
          </div>
          <div className="text-slate-400">Pinned: {editorState.pinnedVertices.size}</div>
          {editorState.isSimulating && <div className="mt-1 text-green-400">Simulating</div>}
        </div>
      </div>

      <ClothSettingsPanel
        config={config}
        setConfig={setConfig}
        editorState={editorState}
        setEditorState={setEditorState}
        showWindArrow={showWindArrow}
        setShowWindArrow={setShowWindArrow}
        colliders={colliders}
        setColliders={setColliders}
        selectedCollider={selectedCollider}
        setSelectedCollider={setSelectedCollider}
        applyPreset={applyPreset}
        addCollider={addCollider}
        handleExport={handleExport}
      />
    </div>
  )
}
