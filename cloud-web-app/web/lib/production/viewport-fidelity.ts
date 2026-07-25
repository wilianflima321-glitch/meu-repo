/**
 * Block 3A.5 — Single viewport Fidelity control (Engine Critique §3.3).
 * Maps to real R3F / Three.js preview knobs — never Nanite/Lumen/deferred labels.
 */

import {
  getViewportFidelityPreference,
  setViewportFidelityPreference,
  UI_PERSISTENCE_LEGACY_KEYS,
} from '@/lib/storage/ui-persistence-spine'

export const VIEWPORT_FIDELITY_STORAGE_KEY = UI_PERSISTENCE_LEGACY_KEYS.viewportFidelity
export const VIEWPORT_FIDELITY_SETTING_ID = 'engine.viewport.fidelity'

export type ViewportFidelityLevel =
  | 'auto'
  | 'performance'
  | 'balanced'
  | 'quality'
  | 'ultra'

export const VIEWPORT_FIDELITY_OPTIONS: ReadonlyArray<{
  value: ViewportFidelityLevel
  label: string
  description: string
}> = [
  { value: 'auto', label: 'Auto', description: 'Balanced preview; adapts when battery/low-end heuristics apply' },
  { value: 'performance', label: 'Performance', description: 'Low shadows, no post FX — max editor FPS' },
  { value: 'balanced', label: 'Balanced', description: 'Default WebGL2 blueprint preview' },
  { value: 'quality', label: 'Quality', description: 'Higher shadows + outline FX' },
  { value: 'ultra', label: 'Ultra', description: 'Max preview shadows/FX — still not final AAA render' },
]

export interface ViewportFidelityParams {
  level: ViewportFidelityLevel
  /** Honest pipeline label for chrome — never deferred/forwardPlus fiction */
  pipelineLabel: 'r3f-webgl2'
  shadows: boolean
  shadowMapSize: number
  ambientIntensity: number
  directionalIntensity: number
  postFx: boolean
  postMultisampling: number
  dprMax: number
  /** Preview-only; final offline/native remains HELD */
  finalRenderSafe: false
  notes: string[]
}

const PARAMS: Record<Exclude<ViewportFidelityLevel, 'auto'>, Omit<ViewportFidelityParams, 'level'>> = {
  performance: {
    pipelineLabel: 'r3f-webgl2',
    shadows: false,
    shadowMapSize: 512,
    ambientIntensity: 0.85,
    directionalIntensity: 0.9,
    postFx: false,
    postMultisampling: 0,
    dprMax: 1,
    finalRenderSafe: false,
    notes: ['Performance preview — shadows/post off'],
  },
  balanced: {
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
  },
  quality: {
    pipelineLabel: 'r3f-webgl2',
    shadows: true,
    shadowMapSize: 2048,
    ambientIntensity: 0.55,
    directionalIntensity: 1.6,
    postFx: true,
    postMultisampling: 4,
    dprMax: 2,
    finalRenderSafe: false,
    notes: ['Quality preview — still not Nanite/Lumen/final'],
  },
  ultra: {
    pipelineLabel: 'r3f-webgl2',
    shadows: true,
    shadowMapSize: 4096,
    ambientIntensity: 0.45,
    directionalIntensity: 1.8,
    postFx: true,
    postMultisampling: 4,
    dprMax: 2,
    finalRenderSafe: false,
    notes: ['Ultra preview knobs — finalRenderSafe remains false until native/desktop path'],
  },
}

export function isViewportFidelityLevel(value: unknown): value is ViewportFidelityLevel {
  return (
    value === 'auto' ||
    value === 'performance' ||
    value === 'balanced' ||
    value === 'quality' ||
    value === 'ultra'
  )
}

export function resolveAutoFidelity(input: {
  webgpuAvailable?: boolean
  hardwareConcurrency?: number
  deviceMemoryGb?: number
  /** Law XV Capability Score 0–100 — preferred when present (3B.1) */
  capabilityScore?: number
}): Exclude<ViewportFidelityLevel, 'auto'> {
  if (typeof input.capabilityScore === 'number' && Number.isFinite(input.capabilityScore)) {
    // Inline band map to avoid circular import at module init in some bundlers
    const s = Math.max(0, Math.min(100, Math.round(input.capabilityScore)))
    if (s < 25) return 'performance'
    if (s < 45) return 'balanced'
    if (s < 62) return 'quality'
    return 'ultra'
  }
  const cores = input.hardwareConcurrency ?? 4
  const mem = input.deviceMemoryGb ?? 4
  if (cores <= 4 || mem <= 4) return 'performance'
  if (input.webgpuAvailable && cores >= 8 && mem >= 8) return 'quality'
  return 'balanced'
}

/** User selection + resolved knobs for the live R3F canvas. */
export function getViewportFidelityParams(
  selection: ViewportFidelityLevel,
  autoProbe?: Parameters<typeof resolveAutoFidelity>[0]
): ViewportFidelityParams & { resolvedLevel: Exclude<ViewportFidelityLevel, 'auto'> } {
  const resolvedLevel = selection === 'auto' ? resolveAutoFidelity(autoProbe ?? {}) : selection
  return {
    level: selection,
    resolvedLevel,
    ...PARAMS[resolvedLevel],
  }
}

export function readStoredViewportFidelity(): ViewportFidelityLevel {
  if (typeof window === 'undefined') return 'balanced'
  try {
    const fromSpine = getViewportFidelityPreference()
    if (isViewportFidelityLevel(fromSpine)) return fromSpine
    // Migrate from settings bag if present
    const bag = window.localStorage.getItem('settings')
    if (bag) {
      const parsed = JSON.parse(bag) as Record<string, unknown>
      if (isViewportFidelityLevel(parsed[VIEWPORT_FIDELITY_SETTING_ID])) {
        return parsed[VIEWPORT_FIDELITY_SETTING_ID]
      }
    }
  } catch {
    /* ignore */
  }
  return 'balanced'
}

export function writeStoredViewportFidelity(level: ViewportFidelityLevel): void {
  if (typeof window === 'undefined') return
  setViewportFidelityPreference(level)
  try {
    const bagRaw = window.localStorage.getItem('settings')
    const bag = bagRaw ? (JSON.parse(bagRaw) as Record<string, unknown>) : {}
    bag[VIEWPORT_FIDELITY_SETTING_ID] = level
    // Strip placebo keys if still present
    delete bag['engine.nanite.viewport']
    delete bag['engine.raytracing.enabled']
    window.localStorage.setItem('settings', JSON.stringify(bag))
  } catch {
    /* ignore */
  }
}
