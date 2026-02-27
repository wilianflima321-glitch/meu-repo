'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

import {
  DEFAULT_GRADIENT,
  DEFAULT_REGIONS,
  HAIR_PRESETS,
} from './hair-fur-core'
import type {
  BrushSettings,
  BrushTool,
  ClumpingSettings,
  CurlSettings,
  GradientStop,
  HairData,
  HairPreset,
  HairRegion,
  LODSettings,
  PhysicsSettings,
} from './hair-fur-core'
import { GradientPicker, LODPreview, Slider } from './HairFurEditor.controls'
import { BrushPreview, HairStrands3D, HeadMesh } from './HairFurEditor.viewport'

export interface HairFurEditorProps {
  characterId: string
  onHairUpdate?: (hairData: HairData) => void
}

export default function HairFurEditor({ characterId, onHairUpdate }: HairFurEditorProps) {
  const [strandCount, setStrandCount] = useState(10000)
  const [regions, setRegions] = useState<HairRegion[]>(DEFAULT_REGIONS)
  const [clumping, setClumping] = useState<ClumpingSettings>({
    factor: 0.4,
    iterations: 3,
    noise: 0.15,
    tightness: 0.5,
  })
  const [curl, setCurl] = useState<CurlSettings>({
    intensity: 0.3,
    frequency: 2,
    randomness: 0.2,
    type: 'wave',
  })
  const [gradient, setGradient] = useState<GradientStop[]>(DEFAULT_GRADIENT)
  const [physics, setPhysics] = useState<PhysicsSettings>({
    gravity: 0.5,
    stiffness: 0.5,
    damping: 0.3,
    windStrength: 0.2,
    windTurbulence: 0.1,
  })
  const [lod, setLod] = useState<LODSettings>({
    strandDistance: 5,
    cardDistance: 15,
    cardCount: 500,
    enableLOD: true,
  })
  const [preset, setPreset] = useState<HairPreset>('wavy')
  const [brush, setBrush] = useState<BrushSettings>({
    tool: 'comb',
    size: 1,
    strength: 0.5,
  })
  const [brushActive, setBrushActive] = useState(false)
  const [animatePhysics, setAnimatePhysics] = useState(true)
  const [activeTab, setActiveTab] = useState<'general' | 'style' | 'physics' | 'lod' | 'brush'>('general')
  const [cameraDistance, setCameraDistance] = useState(3)

  const applyPreset = useCallback((presetName: HairPreset) => {
    setPreset(presetName)
    if (presetName === 'custom') return

    const presetData = HAIR_PRESETS[presetName]
    if (presetData.curl) setCurl((prev) => ({ ...prev, ...presetData.curl }))
    if (presetData.clumping) setClumping((prev) => ({ ...prev, ...presetData.clumping }))
  }, [])

  const hairData = useMemo<HairData>(
    () => ({
      strandCount,
      regions,
      clumping,
      curl,
      gradient,
      physics,
      lod,
      preset,
    }),
    [strandCount, regions, clumping, curl, gradient, physics, lod, preset],
  )

  useEffect(() => {
    onHairUpdate?.(hairData)
  }, [hairData, onHairUpdate])

  const updateRegion = useCallback((id: string, updates: Partial<HairRegion>) => {
    setRegions((prev) => prev.map((region) => (region.id === id ? { ...region, ...updates } : region)))
    setPreset('custom')
  }, [])

  const exportAsCards = useCallback(() => {
    const exportData = {
      type: 'hair_cards',
      characterId,
      ...hairData,
      cardCount: lod.cardCount,
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${characterId}_hair_cards.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }, [characterId, hairData, lod.cardCount])

  const exportAsStrands = useCallback(() => {
    const exportData = {
      type: 'hair_strands',
      characterId,
      ...hairData,
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${characterId}_hair_strands.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }, [characterId, hairData])

  const brushIcons: Record<BrushTool, string> = {
    comb: 'Comb',
    cut: 'Cut',
    add: 'Add',
    length: 'Length',
  }

  return (
    <div className="flex h-full min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="relative flex-1">
        <Canvas
          camera={{ position: [0, 1, 3], fov: 50 }}
          onPointerMissed={() => setBrushActive(false)}
          className="h-full w-full"
        >
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
          <directionalLight position={[-3, 3, -3]} intensity={0.3} />
          <pointLight position={[0, 2, 0]} intensity={0.5} color="#fff5e6" />

          <HeadMesh />
          <HairStrands3D
            strandCount={strandCount}
            regions={regions}
            clumping={clumping}
            curl={curl}
            gradient={gradient}
            physics={physics}
            animatePhysics={animatePhysics}
          />

          <BrushPreview brush={brush} active={brushActive} />

          <OrbitControls
            enablePan
            enableZoom
            minDistance={1}
            maxDistance={10}
            onChange={(event) => {
              if (!event?.target) return
              const dist = (event.target as { getDistance?: () => number }).getDistance?.() || 3
              setCameraDistance(dist)
            }}
          />

          <gridHelper args={[10, 10, '#334155', '#1e293b']} position={[0, -0.5, 0]} />
        </Canvas>

        <div className="absolute top-4 left-4 space-y-1 rounded-lg bg-slate-900/80 p-3 text-sm backdrop-blur-sm">
          <div className="text-slate-400">
            Strands: <span className="font-mono text-sky-400">{strandCount.toLocaleString()}</span>
          </div>
          <div className="text-slate-400">
            Preset: <span className="capitalize text-sky-400">{preset}</span>
          </div>
          <div className="text-slate-400">
            Physics:{' '}
            <span className={animatePhysics ? 'text-green-400' : 'text-red-400'}>
              {animatePhysics ? 'Running' : 'Paused'}
            </span>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 flex gap-2">
          <button
            onClick={() => setAnimatePhysics(!animatePhysics)}
            className={`rounded-lg px-4 py-2 font-medium transition-all ${
              animatePhysics
                ? 'bg-green-600 text-white hover:bg-green-500'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {animatePhysics ? 'Pause Physics' : 'Run Physics'}
          </button>
        </div>

        <div className="absolute right-4 bottom-4 w-64">
          <LODPreview lod={lod} currentDistance={cameraDistance} />
        </div>
      </div>

      <div className="flex w-96 flex-col overflow-hidden border-l border-slate-700 bg-slate-800/95 backdrop-blur-sm">
        <div className="border-b border-slate-700 p-4">
          <h2 className="flex items-center gap-2 text-xl font-bold text-white">Hair/Fur Editor</h2>
          <p className="mt-1 text-sm text-slate-400">Character: {characterId}</p>
        </div>

        <div className="border-b border-slate-700 p-4">
          <label className="mb-2 block text-sm font-medium text-slate-300">Presets</label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(HAIR_PRESETS) as HairPreset[]).map((entry) => (
              <button
                key={entry}
                onClick={() => applyPreset(entry)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  preset === entry
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {entry}
              </button>
            ))}
          </div>
        </div>

        <div className="flex border-b border-slate-700">
          {[
            { id: 'general', label: 'General' },
            { id: 'style', label: 'Style' },
            { id: 'physics', label: 'Physics' },
            { id: 'lod', label: 'LOD' },
            { id: 'brush', label: 'Brush' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 px-3 py-2.5 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'border-b-2 border-sky-500 bg-sky-600/20 text-sky-400'
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {activeTab === 'general' && (
            <>
              <Slider
                label="Strand Count"
                value={strandCount}
                min={1000}
                max={100000}
                step={1000}
                onChange={(value) => {
                  setStrandCount(value)
                  setPreset('custom')
                }}
              />

              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-300">Regions</label>
                {regions.map((region) => (
                  <div
                    key={region.id}
                    className={`rounded-lg border p-3 transition-all ${
                      region.enabled
                        ? 'border-slate-600 bg-slate-700/50'
                        : 'border-slate-700 bg-slate-800/50 opacity-60'
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-200">{region.name}</span>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={region.enabled}
                          onChange={(event) => updateRegion(region.id, { enabled: event.target.checked })}
                          className="h-4 w-4 rounded border-slate-500 bg-slate-700 text-sky-600 focus:ring-sky-500"
                        />
                      </label>
                    </div>
                    {region.enabled && (
                      <div className="space-y-2">
                        <Slider
                          label="Length"
                          value={region.length}
                          min={0.1}
                          max={1.5}
                          step={0.05}
                          onChange={(value) => updateRegion(region.id, { length: value })}
                        />
                        <Slider
                          label="Density"
                          value={region.density}
                          min={0.1}
                          max={1}
                          step={0.05}
                          onChange={(value) => updateRegion(region.id, { density: value })}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'style' && (
            <>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-sky-400">Clumping</h3>
                <Slider
                  label="Factor"
                  value={clumping.factor}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(value) => {
                    setClumping((prev) => ({ ...prev, factor: value }))
                    setPreset('custom')
                  }}
                />
                <Slider
                  label="Iterations"
                  value={clumping.iterations}
                  min={1}
                  max={10}
                  step={1}
                  onChange={(value) => {
                    setClumping((prev) => ({ ...prev, iterations: value }))
                    setPreset('custom')
                  }}
                />
                <Slider
                  label="Noise"
                  value={clumping.noise}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(value) => {
                    setClumping((prev) => ({ ...prev, noise: value }))
                    setPreset('custom')
                  }}
                />
                <Slider
                  label="Tightness"
                  value={clumping.tightness}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(value) => {
                    setClumping((prev) => ({ ...prev, tightness: value }))
                    setPreset('custom')
                  }}
                />
              </div>

              <div className="space-y-3 border-t border-slate-700 pt-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-sky-400">Curl</h3>
                <div>
                  <label className="mb-2 block text-sm text-slate-300">Type</label>
                  <div className="flex gap-2">
                    {(['wave', 'curl', 'coil'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => {
                          setCurl((prev) => ({ ...prev, type }))
                          setPreset('custom')
                        }}
                        className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                          curl.type === type
                            ? 'bg-sky-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <Slider
                  label="Intensity"
                  value={curl.intensity}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(value) => {
                    setCurl((prev) => ({ ...prev, intensity: value }))
                    setPreset('custom')
                  }}
                />
                <Slider
                  label="Frequency"
                  value={curl.frequency}
                  min={0}
                  max={10}
                  step={0.5}
                  onChange={(value) => {
                    setCurl((prev) => ({ ...prev, frequency: value }))
                    setPreset('custom')
                  }}
                />
                <Slider
                  label="Randomness"
                  value={curl.randomness}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(value) => {
                    setCurl((prev) => ({ ...prev, randomness: value }))
                    setPreset('custom')
                  }}
                />
              </div>

              <div className="space-y-3 border-t border-slate-700 pt-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-sky-400">Color</h3>
                <GradientPicker gradient={gradient} onChange={setGradient} />
              </div>
            </>
          )}

          {activeTab === 'physics' && (
            <>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-sky-400">Physics Simulation</h3>
                <Slider
                  label="Gravity"
                  value={physics.gravity}
                  min={0}
                  max={2}
                  step={0.1}
                  onChange={(value) => setPhysics((prev) => ({ ...prev, gravity: value }))}
                />
                <Slider
                  label="Stiffness"
                  value={physics.stiffness}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(value) => setPhysics((prev) => ({ ...prev, stiffness: value }))}
                />
                <Slider
                  label="Damping"
                  value={physics.damping}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(value) => setPhysics((prev) => ({ ...prev, damping: value }))}
                />
              </div>

              <div className="space-y-3 border-t border-slate-700 pt-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-sky-400">Wind</h3>
                <Slider
                  label="Wind Strength"
                  value={physics.windStrength}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(value) => setPhysics((prev) => ({ ...prev, windStrength: value }))}
                />
                <Slider
                  label="Turbulence"
                  value={physics.windTurbulence}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(value) => setPhysics((prev) => ({ ...prev, windTurbulence: value }))}
                />
              </div>
            </>
          )}

          {activeTab === 'lod' && (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-sky-400">Level of Detail</h3>
                  <label className="flex cursor-pointer items-center gap-2">
                    <span className="text-sm text-slate-400">Enabled</span>
                    <input
                      type="checkbox"
                      checked={lod.enableLOD}
                      onChange={(event) => setLod((prev) => ({ ...prev, enableLOD: event.target.checked }))}
                      className="h-4 w-4 rounded border-slate-500 bg-slate-700 text-sky-600 focus:ring-sky-500"
                    />
                  </label>
                </div>

                {lod.enableLOD && (
                  <>
                    <Slider
                      label="Strands Distance"
                      value={lod.strandDistance}
                      min={1}
                      max={20}
                      step={0.5}
                      unit="m"
                      onChange={(value) => setLod((prev) => ({ ...prev, strandDistance: value }))}
                    />
                    <Slider
                      label="Cards Distance"
                      value={lod.cardDistance}
                      min={5}
                      max={50}
                      step={1}
                      unit="m"
                      onChange={(value) => setLod((prev) => ({ ...prev, cardDistance: value }))}
                    />
                    <Slider
                      label="Card Count"
                      value={lod.cardCount}
                      min={100}
                      max={2000}
                      step={50}
                      onChange={(value) => setLod((prev) => ({ ...prev, cardCount: value }))}
                    />
                  </>
                )}
              </div>

              <div className="mt-4 space-y-2 rounded-lg bg-slate-700/30 p-4">
                <h4 className="text-sm font-medium text-slate-200">LOD Levels</h4>
                <div className="flex items-center gap-2 text-xs">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="text-slate-300">Strands: 0 - {lod.strandDistance}m</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <span className="text-slate-300">Cards: {lod.strandDistance} - {lod.cardDistance}m</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="text-slate-300">Billboard: &gt; {lod.cardDistance}m</span>
                </div>
              </div>
            </>
          )}

          {activeTab === 'brush' && (
            <>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-sky-400">Groom Tools</h3>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(brushIcons) as BrushTool[]).map((tool) => (
                    <button
                      key={tool}
                      onClick={() => setBrush((prev) => ({ ...prev, tool }))}
                      className={`flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-medium transition-all ${
                        brush.tool === tool
                          ? 'bg-sky-600 text-white ring-2 ring-sky-400'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      <span className="text-sm capitalize">{brushIcons[tool]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 border-t border-slate-700 pt-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-sky-400">Brush Settings</h3>
                <Slider
                  label="Size"
                  value={brush.size}
                  min={0.1}
                  max={5}
                  step={0.1}
                  onChange={(value) => setBrush((prev) => ({ ...prev, size: value }))}
                />
                <Slider
                  label="Strength"
                  value={brush.strength}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(value) => setBrush((prev) => ({ ...prev, strength: value }))}
                />
              </div>

              <div className="pt-4">
                <button
                  onClick={() => setBrushActive(!brushActive)}
                  className={`w-full rounded-lg py-3 font-medium transition-all ${
                    brushActive
                      ? 'bg-green-600 text-white hover:bg-green-500'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {brushActive ? 'Brush Active - Click Viewport' : 'Enable Brush'}
                </button>
              </div>

              <div className="mt-4 rounded-lg border border-amber-700/50 bg-amber-900/30 p-4">
                <p className="text-sm text-amber-200">
                  Tip: with brush enabled, click and drag in the 3D viewport to apply the selected grooming tool.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="space-y-3 border-t border-slate-700 p-4">
          <h3 className="text-sm font-semibold text-slate-300">Export for Runtime</h3>
          <div className="flex gap-2">
            <button
              onClick={exportAsCards}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-amber-500"
            >
              <span>Cards</span>
            </button>
            <button
              onClick={exportAsStrands}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-sky-500"
            >
              <span>Strands</span>
            </button>
          </div>
          <p className="text-center text-xs text-slate-500">Cards: better performance | Strands: higher quality</p>
        </div>
      </div>
    </div>
  )
}

export { BrushPreview, GradientPicker, HairStrands3D, LODPreview }
export type {
  BrushSettings,
  ClumpingSettings,
  CurlSettings,
  HairData,
  HairRegion,
  LODSettings,
  PhysicsSettings,
}
