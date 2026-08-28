'use client'

import React, { useState } from 'react'
import {
  Sun,
  Cloud,
  Layers,
  Compass,
  Palette,
  RotateCcw,
  Camera,
  Wind,
  Globe,
  Sparkles,
  Check,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// DATA TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────

export interface DirectionalSunSettings {
  enabled: boolean
  intensityLux: number
  colorTemperatureKelvin: number
  sunColor: string
  azimuthDeg: number
  elevationDeg: number
  sourceAngleDeg: number
  castShadows: boolean
  csmDistanceMeters: number
  csmCascadesCount: 2 | 3 | 4
  lightShaftsEnabled: boolean
  lightShaftsOcclusion: number
  lightShaftsBloomScale: number
}

export interface SkyAtmosphereSettings {
  enabled: boolean
  rayleighScatteringScale: number
  rayleighColor: string
  mieScatteringScale: number
  mieAnisotropy: number
  mieAbsorptionScale: number
  absorptionOzoneScale: number
  groundAlbedoColor: string
  aerialPerspectiveDistanceScale: number
  multiScatteringLuminance: number
}

export interface VolumetricCloudSettings {
  enabled: boolean
  altitudeBottomKm: number
  altitudeTopKm: number
  coverage: number
  densityScale: number
  windDirectionDeg: number
  windSpeedMps: number
  albedoColor: string
  extinctionScale: number
  powderEffectScale: number
}

export interface ExponentialHeightFogSettings {
  enabled: boolean
  fogDensity: number
  fogHeightFalloff: number
  fogInscatteringColor: string
  directionalInscatteringExponent: number
  directionalInscatteringColor: string
  directionalInscatteringStartDistance: number
  volumetricFogEnabled: boolean
  volumetricFogScatteringDistribution: number
  volumetricFogAlbedo: string
  volumetricFogExtinctionScale: number
  volumetricFogDistance: number
}

export interface PostProcessVolumeSettings {
  enabled: boolean
  exposureMode: 'auto-histogram' | 'auto-luminance' | 'manual'
  exposureCompensationEv: number
  minEv100: number
  maxEv100: number
  bloomIntensity: number
  bloomThreshold: number
  bloomStreakAnamorphic: number
  bloomStreakColor: string
  ssaoIntensity: number
  ssaoRadiusMeters: number
  ssrQuality: 'low' | 'medium' | 'high' | 'ultra' | 'off'
  ssrRoughnessThreshold: number
  chromaticAberrationIntensity: number
  vignetteIntensity: number
  filmGrainIntensity: number
  motionBlurAmount: number
  depthOfFieldEnabled: boolean
  focalDistanceMeters: number
  fStop: number
}

export interface EnvironmentAtmospherePreset {
  id: string
  name: string
  description: string
  sun: DirectionalSunSettings
  sky: SkyAtmosphereSettings
  clouds: VolumetricCloudSettings
  fog: ExponentialHeightFogSettings
  postProcess: PostProcessVolumeSettings
}

// ─────────────────────────────────────────────────────────────
// PRESETS
// ─────────────────────────────────────────────────────────────

const PRESETS: EnvironmentAtmospherePreset[] = [
  {
    id: 'daylight-epic',
    name: 'Epic Daylight (ACES HDR)',
    description: 'High Noon clear sky with sharp directional shadows, crisp atmospheric Rayleigh blue and balanced exposure.',
    sun: {
      enabled: true,
      intensityLux: 110000,
      colorTemperatureKelvin: 5600,
      sunColor: 'rgb(255, 248, 230)',
      azimuthDeg: 215,
      elevationDeg: 58,
      sourceAngleDeg: 0.53,
      castShadows: true,
      csmDistanceMeters: 250,
      csmCascadesCount: 4,
      lightShaftsEnabled: true,
      lightShaftsOcclusion: 0.8,
      lightShaftsBloomScale: 1.2,
    },
    sky: {
      enabled: true,
      rayleighScatteringScale: 1.0,
      rayleighColor: 'rgb(58, 125, 255)',
      mieScatteringScale: 1.0,
      mieAnisotropy: 0.76,
      mieAbsorptionScale: 1.0,
      absorptionOzoneScale: 1.0,
      groundAlbedoColor: 'rgb(40, 50, 40)',
      aerialPerspectiveDistanceScale: 1.0,
      multiScatteringLuminance: 1.0,
    },
    clouds: {
      enabled: true,
      altitudeBottomKm: 2.5,
      altitudeTopKm: 6.0,
      coverage: 0.35,
      densityScale: 1.0,
      windDirectionDeg: 45,
      windSpeedMps: 8.5,
      albedoColor: 'rgb(255, 255, 255)',
      extinctionScale: 1.0,
      powderEffectScale: 1.0,
    },
    fog: {
      enabled: true,
      fogDensity: 0.002,
      fogHeightFalloff: 0.02,
      fogInscatteringColor: 'rgb(180, 210, 240)',
      directionalInscatteringExponent: 16,
      directionalInscatteringColor: 'rgb(255, 240, 200)',
      directionalInscatteringStartDistance: 500,
      volumetricFogEnabled: true,
      volumetricFogScatteringDistribution: 0.6,
      volumetricFogAlbedo: 'rgb(240, 245, 255)',
      volumetricFogExtinctionScale: 1.0,
      volumetricFogDistance: 6000,
    },
    postProcess: {
      enabled: true,
      exposureMode: 'auto-histogram',
      exposureCompensationEv: 0.0,
      minEv100: -2,
      maxEv100: 16,
      bloomIntensity: 0.65,
      bloomThreshold: 1.1,
      bloomStreakAnamorphic: 0.0,
      bloomStreakColor: 'rgb(255, 255, 255)',
      ssaoIntensity: 1.2,
      ssaoRadiusMeters: 0.8,
      ssrQuality: 'high',
      ssrRoughnessThreshold: 0.5,
      chromaticAberrationIntensity: 0.05,
      vignetteIntensity: 0.15,
      filmGrainIntensity: 0.05,
      motionBlurAmount: 0.5,
      depthOfFieldEnabled: false,
      focalDistanceMeters: 10,
      fStop: 5.6,
    },
  },
  {
    id: 'golden-sunset',
    name: 'Golden Hour Sunset',
    description: 'Warm, low-angle solar illumination with rich amber inscattering and dramatic volumetric godrays.',
    sun: {
      enabled: true,
      intensityLux: 45000,
      colorTemperatureKelvin: 2800,
      sunColor: 'rgb(255, 145, 50)',
      azimuthDeg: 260,
      elevationDeg: 12,
      sourceAngleDeg: 1.2,
      castShadows: true,
      csmDistanceMeters: 350,
      csmCascadesCount: 4,
      lightShaftsEnabled: true,
      lightShaftsOcclusion: 0.95,
      lightShaftsBloomScale: 2.8,
    },
    sky: {
      enabled: true,
      rayleighScatteringScale: 1.4,
      rayleighColor: 'rgb(255, 100, 40)',
      mieScatteringScale: 2.2,
      mieAnisotropy: 0.85,
      mieAbsorptionScale: 1.2,
      absorptionOzoneScale: 1.5,
      groundAlbedoColor: 'rgb(80, 40, 20)',
      aerialPerspectiveDistanceScale: 1.5,
      multiScatteringLuminance: 1.3,
    },
    clouds: {
      enabled: true,
      altitudeBottomKm: 2.0,
      altitudeTopKm: 5.5,
      coverage: 0.55,
      densityScale: 1.3,
      windDirectionDeg: 90,
      windSpeedMps: 12.0,
      albedoColor: 'rgb(255, 190, 140)',
      extinctionScale: 1.2,
      powderEffectScale: 1.4,
    },
    fog: {
      enabled: true,
      fogDensity: 0.005,
      fogHeightFalloff: 0.035,
      fogInscatteringColor: 'rgb(240, 120, 60)',
      directionalInscatteringExponent: 8,
      directionalInscatteringColor: 'rgb(255, 180, 80)',
      directionalInscatteringStartDistance: 200,
      volumetricFogEnabled: true,
      volumetricFogScatteringDistribution: 0.8,
      volumetricFogAlbedo: 'rgb(255, 160, 100)',
      volumetricFogExtinctionScale: 1.5,
      volumetricFogDistance: 4500,
    },
    postProcess: {
      enabled: true,
      exposureMode: 'auto-histogram',
      exposureCompensationEv: 0.5,
      minEv100: -4,
      maxEv100: 14,
      bloomIntensity: 1.4,
      bloomThreshold: 0.9,
      bloomStreakAnamorphic: 0.35,
      bloomStreakColor: 'rgb(255, 170, 80)',
      ssaoIntensity: 1.5,
      ssaoRadiusMeters: 0.9,
      ssrQuality: 'ultra',
      ssrRoughnessThreshold: 0.6,
      chromaticAberrationIntensity: 0.15,
      vignetteIntensity: 0.35,
      filmGrainIntensity: 0.12,
      motionBlurAmount: 0.5,
      depthOfFieldEnabled: true,
      focalDistanceMeters: 8,
      fStop: 2.8,
    },
  },
  {
    id: 'cyberpunk-neon-night',
    name: 'Cyberpunk Neon Nocturne',
    description: 'Deep nocturnal blue sky with dense low-altitude urban mist, reflective wet surfaces and bloom streak anamorphic flares.',
    sun: {
      enabled: true,
      intensityLux: 350,
      colorTemperatureKelvin: 8500,
      sunColor: 'rgb(80, 140, 255)',
      azimuthDeg: 45,
      elevationDeg: 75,
      sourceAngleDeg: 2.0,
      castShadows: true,
      csmDistanceMeters: 100,
      csmCascadesCount: 3,
      lightShaftsEnabled: false,
      lightShaftsOcclusion: 0.2,
      lightShaftsBloomScale: 0.5,
    },
    sky: {
      enabled: true,
      rayleighScatteringScale: 0.3,
      rayleighColor: 'rgb(10, 20, 50)',
      mieScatteringScale: 3.5,
      mieAnisotropy: 0.4,
      mieAbsorptionScale: 2.0,
      absorptionOzoneScale: 0.5,
      groundAlbedoColor: 'rgb(10, 15, 25)',
      aerialPerspectiveDistanceScale: 0.8,
      multiScatteringLuminance: 0.6,
    },
    clouds: {
      enabled: true,
      altitudeBottomKm: 1.2,
      altitudeTopKm: 3.8,
      coverage: 0.85,
      densityScale: 2.0,
      windDirectionDeg: 180,
      windSpeedMps: 4.0,
      albedoColor: 'rgb(30, 45, 75)',
      extinctionScale: 2.5,
      powderEffectScale: 0.8,
    },
    fog: {
      enabled: true,
      fogDensity: 0.012,
      fogHeightFalloff: 0.05,
      fogInscatteringColor: 'rgb(15, 30, 60)',
      directionalInscatteringExponent: 32,
      directionalInscatteringColor: 'rgb(40, 100, 200)',
      directionalInscatteringStartDistance: 50,
      volumetricFogEnabled: true,
      volumetricFogScatteringDistribution: 0.4,
      volumetricFogAlbedo: 'rgb(20, 50, 90)',
      volumetricFogExtinctionScale: 2.5,
      volumetricFogDistance: 2500,
    },
    postProcess: {
      enabled: true,
      exposureMode: 'manual',
      exposureCompensationEv: 1.8,
      minEv100: -8,
      maxEv100: 8,
      bloomIntensity: 2.2,
      bloomThreshold: 0.65,
      bloomStreakAnamorphic: 0.85,
      bloomStreakColor: 'rgb(0, 230, 255)',
      ssaoIntensity: 1.8,
      ssaoRadiusMeters: 1.2,
      ssrQuality: 'ultra',
      ssrRoughnessThreshold: 0.85,
      chromaticAberrationIntensity: 0.25,
      vignetteIntensity: 0.45,
      filmGrainIntensity: 0.2,
      motionBlurAmount: 0.65,
      depthOfFieldEnabled: true,
      focalDistanceMeters: 5,
      fStop: 1.8,
    },
  },
]

type ActiveTab = 'sun' | 'sky' | 'clouds' | 'fog' | 'postprocess' | 'presets'

export default function EnvironmentLightMixer() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('sun')
  const [activePresetId, setActivePresetId] = useState<string>('daylight-epic')

  // Live Editable State
  const [sun, setSun] = useState<DirectionalSunSettings>(PRESETS[0].sun)
  const [sky, setSky] = useState<SkyAtmosphereSettings>(PRESETS[0].sky)
  const [clouds, setClouds] = useState<VolumetricCloudSettings>(PRESETS[0].clouds)
  const [fog, setFog] = useState<ExponentialHeightFogSettings>(PRESETS[0].fog)
  const [postProcess, setPostProcess] = useState<PostProcessVolumeSettings>(PRESETS[0].postProcess)

  const applyPreset = (preset: EnvironmentAtmospherePreset) => {
    setActivePresetId(preset.id)
    setSun(preset.sun)
    setSky(preset.sky)
    setClouds(preset.clouds)
    setFog(preset.fog)
    setPostProcess(preset.postProcess)
  }

  return (
    <div className="flex h-full w-full flex-col bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)] select-none">
      {/* ── Top Header Toolbar ── */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Sun className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[var(--aethel-text-primary)]">
              Environment Light Mixer & Atmosphere Studio
            </h1>
            <p className="text-[11px] text-[var(--aethel-text-tertiary)]">
              Lumen Sky Atmosphere, Volumetric Clouds, Fog & ACES Post-Process Volumes
            </p>
          </div>
        </div>

        {/* Global Preset Pill */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[var(--aethel-text-tertiary)]">Active Preset:</span>
          <select
            className="h-7 rounded-md border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] px-2.5 text-xs text-[var(--aethel-text-primary)] focus:border-amber-500/60 focus:outline-none"
            value={activePresetId}
            onChange={(e) => {
              const selected = PRESETS.find((p) => p.id === e.target.value)
              if (selected) applyPreset(selected)
            }}
          >
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              const base = PRESETS.find((p) => p.id === activePresetId) || PRESETS[0]
              applyPreset(base)
            }}
            className="flex h-7 items-center gap-1.5 rounded-md border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] px-2.5 text-xs font-medium text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-quaternary)] hover:text-[var(--aethel-text-primary)]"
            title="Reset to Preset Defaults"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>
      </header>

      {/* ── Sub-navigation Tab Bar ── */}
      <div className="flex h-10 shrink-0 border-b border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)]/60 px-4">
        <div className="flex gap-1 overflow-x-auto py-1">
          <button
            onClick={() => setActiveTab('sun')}
            className={`flex items-center gap-2 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              activeTab === 'sun'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)]'
            }`}
          >
            <Sun className="h-3.5 w-3.5" />
            <span>Directional Sun</span>
            {sun.enabled && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
          </button>

          <button
            onClick={() => setActiveTab('sky')}
            className={`flex items-center gap-2 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              activeTab === 'sky'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)]'
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Sky Atmosphere</span>
            {sky.enabled && <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />}
          </button>

          <button
            onClick={() => setActiveTab('clouds')}
            className={`flex items-center gap-2 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              activeTab === 'clouds'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)]'
            }`}
          >
            <Cloud className="h-3.5 w-3.5" />
            <span>Volumetric Clouds</span>
            {clouds.enabled && <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />}
          </button>

          <button
            onClick={() => setActiveTab('fog')}
            className={`flex items-center gap-2 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              activeTab === 'fog'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                : 'text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)]'
            }`}
          >
            <Wind className="h-3.5 w-3.5" />
            <span>Volumetric Fog</span>
            {fog.enabled && <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />}
          </button>

          <button
            onClick={() => setActiveTab('postprocess')}
            className={`flex items-center gap-2 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              activeTab === 'postprocess'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)]'
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            <span>Post-Process Volume</span>
            {postProcess.enabled && <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />}
          </button>

          <button
            onClick={() => setActiveTab('presets')}
            className={`flex items-center gap-2 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              activeTab === 'presets'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)]'
            }`}
          >
            <Palette className="h-3.5 w-3.5" />
            <span>Atmosphere Library</span>
          </button>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Control Panels (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: DIRECTIONAL SUN */}
          {activeTab === 'sun' && (
            <div className="space-y-6 max-w-4xl">
              <div className="flex items-center justify-between border-b border-[var(--aethel-border-subtle)] pb-3">
                <div>
                  <h2 className="text-base font-semibold text-[var(--aethel-text-primary)]">
                    Directional Sunlight (Primary Celestial Authority)
                  </h2>
                  <p className="text-xs text-[var(--aethel-text-tertiary)]">
                    Configures physical solar illuminance, color temperature, cascaded shadow maps (CSM) and light shafts.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[var(--aethel-text-secondary)]">
                  <input
                    type="checkbox"
                    checked={sun.enabled}
                    onChange={(e) => setSun((s) => ({ ...s, enabled: e.target.checked }))}
                    className="rounded border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] text-amber-500 focus:ring-0"
                  />
                  <span>Sun Enabled</span>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Solar Orientation */}
                <div className="space-y-4 rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Compass className="h-3.5 w-3.5" /> Solar Coordinates & Angles
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--aethel-text-secondary)]">Azimuth (Heading)</span>
                        <span className="font-mono text-[var(--aethel-text-primary)]">{sun.azimuthDeg}°</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        value={sun.azimuthDeg}
                        onChange={(e) => setSun((s) => ({ ...s, azimuthDeg: Number(e.target.value) }))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--aethel-text-secondary)]">Elevation (Altitude)</span>
                        <span className="font-mono text-[var(--aethel-text-primary)]">{sun.elevationDeg}°</span>
                      </div>
                      <input
                        type="range"
                        min="-10"
                        max="90"
                        value={sun.elevationDeg}
                        onChange={(e) => setSun((s) => ({ ...s, elevationDeg: Number(e.target.value) }))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--aethel-text-secondary)]">Source Angle (Soft Penumbra)</span>
                        <span className="font-mono text-[var(--aethel-text-primary)]">{sun.sourceAngleDeg}°</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="5.0"
                        step="0.05"
                        value={sun.sourceAngleDeg}
                        onChange={(e) => setSun((s) => ({ ...s, sourceAngleDeg: Number(e.target.value) }))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Illuminance & Photometrics */}
                <div className="space-y-4 rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Sun className="h-3.5 w-3.5" /> Photometrics & Radiance
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--aethel-text-secondary)]">Intensity (Illuminance)</span>
                        <span className="font-mono text-[var(--aethel-text-primary)]">
                          {sun.intensityLux.toLocaleString()} Lux
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="150000"
                        step="1000"
                        value={sun.intensityLux}
                        onChange={(e) => setSun((s) => ({ ...s, intensityLux: Number(e.target.value) }))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--aethel-text-secondary)]">Color Temperature (Kelvin)</span>
                        <span className="font-mono text-[var(--aethel-text-primary)]">{sun.colorTemperatureKelvin} K</span>
                      </div>
                      <input
                        type="range"
                        min="2000"
                        max="12000"
                        step="100"
                        value={sun.colorTemperatureKelvin}
                        onChange={(e) => setSun((s) => ({ ...s, colorTemperatureKelvin: Number(e.target.value) }))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-[var(--aethel-text-secondary)]">Light Shafts (Godrays)</span>
                      <input
                        type="checkbox"
                        checked={sun.lightShaftsEnabled}
                        onChange={(e) => setSun((s) => ({ ...s, lightShaftsEnabled: e.target.checked }))}
                        className="rounded border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] text-amber-500 focus:ring-0"
                      />
                    </div>
                  </div>
                </div>

                {/* Cascaded Shadow Maps (CSM) */}
                <div className="space-y-4 rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] p-4 md:col-span-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" /> Cascaded Shadow Maps (CSM) & Occlusion
                  </h3>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <span className="text-xs text-[var(--aethel-text-secondary)] block mb-1">CSM Distance</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="50"
                          max="1000"
                          step="10"
                          value={sun.csmDistanceMeters}
                          onChange={(e) => setSun((s) => ({ ...s, csmDistanceMeters: Number(e.target.value) }))}
                          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                        <span className="font-mono text-xs text-[var(--aethel-text-primary)] w-14">
                          {sun.csmDistanceMeters}m
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-xs text-[var(--aethel-text-secondary)] block mb-1">Cascade Splits</span>
                      <div className="flex gap-2">
                        {([2, 3, 4] as const).map((count) => (
                          <button
                            key={count}
                            onClick={() => setSun((s) => ({ ...s, csmCascadesCount: count }))}
                            className={`flex-1 rounded-md py-1 text-xs font-mono font-medium border ${
                              sun.csmCascadesCount === count
                                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                                : 'border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-secondary)]'
                            }`}
                          >
                            {count} Splits
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4">
                      <span className="text-xs text-[var(--aethel-text-secondary)]">Dynamic Ray-Traced Contact Shadows</span>
                      <input
                        type="checkbox"
                        checked={sun.castShadows}
                        onChange={(e) => setSun((s) => ({ ...s, castShadows: e.target.checked }))}
                        className="rounded border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] text-amber-500 focus:ring-0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SKY ATMOSPHERE */}
          {activeTab === 'sky' && (
            <div className="space-y-6 max-w-4xl">
              <div className="flex items-center justify-between border-b border-[var(--aethel-border-subtle)] pb-3">
                <div>
                  <h2 className="text-base font-semibold text-[var(--aethel-text-primary)]">
                    Sky Atmosphere (Rayleigh & Mie Scattering Model)
                  </h2>
                  <p className="text-xs text-[var(--aethel-text-tertiary)]">
                    Physically based planetary scattering, Henyey-Greenstein phase function, ozone absorption and aerial perspective.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[var(--aethel-text-secondary)]">
                  <input
                    type="checkbox"
                    checked={sky.enabled}
                    onChange={(e) => setSky((s) => ({ ...s, enabled: e.target.checked }))}
                    className="rounded border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] text-sky-500 focus:ring-0"
                  />
                  <span>Atmosphere Enabled</span>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Rayleigh Air Scattering */}
                <div className="space-y-4 rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" /> Rayleigh Scattering (Air Molecules)
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--aethel-text-secondary)]">Rayleigh Scattering Scale</span>
                        <span className="font-mono text-[var(--aethel-text-primary)]">{sky.rayleighScatteringScale.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="5"
                        step="0.05"
                        value={sky.rayleighScatteringScale}
                        onChange={(e) => setSky((s) => ({ ...s, rayleighScatteringScale: Number(e.target.value) }))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--aethel-text-secondary)]">Aerial Perspective Distance Scale</span>
                        <span className="font-mono text-[var(--aethel-text-primary)]">{sky.aerialPerspectiveDistanceScale.toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="10"
                        step="0.1"
                        value={sky.aerialPerspectiveDistanceScale}
                        onChange={(e) => setSky((s) => ({ ...s, aerialPerspectiveDistanceScale: Number(e.target.value) }))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Mie Aerosol & Haze Scattering */}
                <div className="space-y-4 rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                    <Wind className="h-3.5 w-3.5" /> Mie Scattering (Aerosols / Haze)
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--aethel-text-secondary)]">Mie Scattering Scale</span>
                        <span className="font-mono text-[var(--aethel-text-primary)]">{sky.mieScatteringScale.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="5"
                        step="0.05"
                        value={sky.mieScatteringScale}
                        onChange={(e) => setSky((s) => ({ ...s, mieScatteringScale: Number(e.target.value) }))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--aethel-text-secondary)]">Mie Anisotropy (g-factor)</span>
                        <span className="font-mono text-[var(--aethel-text-primary)]">{sky.mieAnisotropy.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="-0.9"
                        max="0.9"
                        step="0.02"
                        value={sky.mieAnisotropy}
                        onChange={(e) => setSky((s) => ({ ...s, mieAnisotropy: Number(e.target.value) }))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: VOLUMETRIC CLOUDS */}
          {activeTab === 'clouds' && (
            <div className="space-y-6 max-w-4xl">
              <div className="flex items-center justify-between border-b border-[var(--aethel-border-subtle)] pb-3">
                <div>
                  <h2 className="text-base font-semibold text-[var(--aethel-text-primary)]">
                    Volumetric Cloud Layer (Real-Time Raymarched)
                  </h2>
                  <p className="text-xs text-[var(--aethel-text-tertiary)]">
                    Multi-octave Worley-Perlin noise clouds with animated wind advection and powder scattering effects.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[var(--aethel-text-secondary)]">
                  <input
                    type="checkbox"
                    checked={clouds.enabled}
                    onChange={(e) => setClouds((c) => ({ ...c, enabled: e.target.checked }))}
                    className="rounded border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] text-cyan-500 focus:ring-0"
                  />
                  <span>Clouds Enabled</span>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-4 rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Cloud className="h-3.5 w-3.5" /> Cloud Altitudes & Density
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--aethel-text-secondary)]">Cloud Coverage</span>
                        <span className="font-mono text-[var(--aethel-text-primary)]">{(clouds.coverage * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.02"
                        value={clouds.coverage}
                        onChange={(e) => setClouds((c) => ({ ...c, coverage: Number(e.target.value) }))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--aethel-text-secondary)]">Base Altitude</span>
                        <span className="font-mono text-[var(--aethel-text-primary)]">{clouds.altitudeBottomKm.toFixed(1)} km</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="0.1"
                        value={clouds.altitudeBottomKm}
                        onChange={(e) => setClouds((c) => ({ ...c, altitudeBottomKm: Number(e.target.value) }))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Wind className="h-3.5 w-3.5" /> Wind Vector & Dynamics
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--aethel-text-secondary)]">Wind Direction</span>
                        <span className="font-mono text-[var(--aethel-text-primary)]">{clouds.windDirectionDeg}°</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        value={clouds.windDirectionDeg}
                        onChange={(e) => setClouds((c) => ({ ...c, windDirectionDeg: Number(e.target.value) }))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--aethel-text-secondary)]">Wind Speed</span>
                        <span className="font-mono text-[var(--aethel-text-primary)]">{clouds.windSpeedMps.toFixed(1)} m/s</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        step="0.5"
                        value={clouds.windSpeedMps}
                        onChange={(e) => setClouds((c) => ({ ...c, windSpeedMps: Number(e.target.value) }))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: VOLUMETRIC FOG */}
          {activeTab === 'fog' && (
            <div className="space-y-6 max-w-4xl">
              <div className="flex items-center justify-between border-b border-[var(--aethel-border-subtle)] pb-3">
                <div>
                  <h2 className="text-base font-semibold text-[var(--aethel-text-primary)]">
                    Exponential Height Fog & Volumetric Scattering
                  </h2>
                  <p className="text-xs text-[var(--aethel-text-tertiary)]">
                    Lumen-integrated 3D voxelized volumetric fog with directional inscattering and height falloff.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[var(--aethel-text-secondary)]">
                  <input
                    type="checkbox"
                    checked={fog.enabled}
                    onChange={(e) => setFog((f) => ({ ...f, enabled: e.target.checked }))}
                    className="rounded border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] text-blue-500 focus:ring-0"
                  />
                  <span>Fog Enabled</span>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-4 rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                    <Wind className="h-3.5 w-3.5" /> Fog Height & Density
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--aethel-text-secondary)]">Fog Density</span>
                        <span className="font-mono text-[var(--aethel-text-primary)]">{fog.fogDensity.toFixed(4)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="0.05"
                        step="0.0005"
                        value={fog.fogDensity}
                        onChange={(e) => setFog((f) => ({ ...f, fogDensity: Number(e.target.value) }))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--aethel-text-secondary)]">Height Falloff</span>
                        <span className="font-mono text-[var(--aethel-text-primary)]">{fog.fogHeightFalloff.toFixed(3)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.001"
                        max="0.2"
                        step="0.002"
                        value={fog.fogHeightFalloff}
                        onChange={(e) => setFog((f) => ({ ...f, fogHeightFalloff: Number(e.target.value) }))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> Volumetric Light Scattering
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--aethel-text-secondary)]">Volumetric Fog Voxel Grid</span>
                      <input
                        type="checkbox"
                        checked={fog.volumetricFogEnabled}
                        onChange={(e) => setFog((f) => ({ ...f, volumetricFogEnabled: e.target.checked }))}
                        className="rounded border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] text-blue-500 focus:ring-0"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--aethel-text-secondary)]">View Distance</span>
                        <span className="font-mono text-[var(--aethel-text-primary)]">{fog.volumetricFogDistance}m</span>
                      </div>
                      <input
                        type="range"
                        min="500"
                        max="20000"
                        step="500"
                        value={fog.volumetricFogDistance}
                        onChange={(e) => setFog((f) => ({ ...f, volumetricFogDistance: Number(e.target.value) }))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: POST-PROCESS VOLUME */}
          {activeTab === 'postprocess' && (
            <div className="space-y-6 max-w-4xl">
              <div className="flex items-center justify-between border-b border-[var(--aethel-border-subtle)] pb-3">
                <div>
                  <h2 className="text-base font-semibold text-[var(--aethel-text-primary)]">
                    Post-Processing Volume (ACES 1.3 HDR Pipeline)
                  </h2>
                  <p className="text-xs text-[var(--aethel-text-tertiary)]">
                    High-dynamic-range tonemapper, anamorphic bloom flare, screen-space reflections and lens optics.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[var(--aethel-text-secondary)]">
                  <input
                    type="checkbox"
                    checked={postProcess.enabled}
                    onChange={(e) => setPostProcess((p) => ({ ...p, enabled: e.target.checked }))}
                    className="rounded border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] text-cyan-500 focus:ring-0"
                  />
                  <span>Post-Process Active</span>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {/* Exposure */}
                <div className="space-y-4 rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5" /> Exposure (EV100)
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--aethel-text-secondary)]">Compensation</span>
                        <span className="font-mono text-[var(--aethel-text-primary)]">
                          {postProcess.exposureCompensationEv > 0 ? `+${postProcess.exposureCompensationEv.toFixed(1)}` : postProcess.exposureCompensationEv.toFixed(1)} EV
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-5"
                        max="5"
                        step="0.1"
                        value={postProcess.exposureCompensationEv}
                        onChange={(e) => setPostProcess((p) => ({ ...p, exposureCompensationEv: Number(e.target.value) }))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Bloom & Anamorphic */}
                <div className="space-y-4 rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> Bloom & Flares
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--aethel-text-secondary)]">Bloom Intensity</span>
                        <span className="font-mono text-[var(--aethel-text-primary)]">{postProcess.bloomIntensity.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="5"
                        step="0.05"
                        value={postProcess.bloomIntensity}
                        onChange={(e) => setPostProcess((p) => ({ ...p, bloomIntensity: Number(e.target.value) }))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--aethel-text-secondary)]">Anamorphic Flare</span>
                        <span className="font-mono text-[var(--aethel-text-primary)]">{postProcess.bloomStreakAnamorphic.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.05"
                        value={postProcess.bloomStreakAnamorphic}
                        onChange={(e) => setPostProcess((p) => ({ ...p, bloomStreakAnamorphic: Number(e.target.value) }))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                    </div>
                  </div>
                </div>

                {/* SSR & SSAO */}
                <div className="space-y-4 rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" /> SSR & Ambient Occlusion
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--aethel-text-secondary)]">SSAO Intensity</span>
                        <span className="font-mono text-[var(--aethel-text-primary)]">{postProcess.ssaoIntensity.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="3"
                        step="0.05"
                        value={postProcess.ssaoIntensity}
                        onChange={(e) => setPostProcess((p) => ({ ...p, ssaoIntensity: Number(e.target.value) }))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--aethel-text-secondary)]">Vignette Intensity</span>
                        <span className="font-mono text-[var(--aethel-text-primary)]">{postProcess.vignetteIntensity.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.02"
                        value={postProcess.vignetteIntensity}
                        onChange={(e) => setPostProcess((p) => ({ ...p, vignetteIntensity: Number(e.target.value) }))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: PRESETS LIBRARY */}
          {activeTab === 'presets' && (
            <div className="space-y-6 max-w-4xl">
              <div className="border-b border-[var(--aethel-border-subtle)] pb-3">
                <h2 className="text-base font-semibold text-[var(--aethel-text-primary)]">
                  Atmospheric Presets & Master Biomes
                </h2>
                <p className="text-xs text-[var(--aethel-text-tertiary)]">
                  One-click studio lighting and physical sky calibration profiles for high-fidelity production.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {PRESETS.map((preset) => (
                  <div
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className={`cursor-pointer rounded-xl border p-4 transition-all hover:border-amber-500/60 ${
                      activePresetId === preset.id
                        ? 'border-amber-500/80 bg-amber-950/20 shadow-lg shadow-amber-500/10'
                        : 'border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-[var(--aethel-text-primary)]">{preset.name}</h4>
                      {activePresetId === preset.id && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-xs">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--aethel-text-secondary)] leading-relaxed mb-4">
                      {preset.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5 text-[10px] font-mono text-[var(--aethel-text-tertiary)]">
                      <span className="rounded bg-slate-900 px-2 py-0.5 border border-slate-800">
                        {preset.sun.intensityLux.toLocaleString()} Lux
                      </span>
                      <span className="rounded bg-slate-900 px-2 py-0.5 border border-slate-800">
                        {preset.sun.colorTemperatureKelvin} K
                      </span>
                      <span className="rounded bg-slate-900 px-2 py-0.5 border border-slate-800">
                        Fog {(preset.fog.fogDensity * 1000).toFixed(1)}‰
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
