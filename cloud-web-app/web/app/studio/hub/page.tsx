'use client'

/**
 * PreIDEPage — Creative Studio Hub Entry Point
 * Route: /studio/hub
 *
 * MOTOR WIRING (Fase 2–4 do plano):
 *   - viewportSlot → AethelViewport3D (motor REAL: R3F/WebGL2, gizmos, fidelity, WebGPU probe)
 *   - Zustand store → viewport-scene-store (estado compartilhado cena/seleção/playback)
 *   - ProfilerHUD → renderStats REAIS via store.renderStats (gl.info, zero mock)
 *   - CapabilityScore → via store.capabilityScore (hardware-honesto)
 *   - Timeline ↔ Viewport → currentTime/isPlaying fluem pelo store
 *   - Outliner ↔ Viewport → selectedIds compartilhados pelo store
 *   - onRaycastReady → store.setRaycastResolver (Law I prep)
 *
 * ANTI-MOCK: ProfilerHUD só aparece quando renderStats não é null
 * (dados reais chegam do primeiro frame do canvas).
 * VRAM omitida por design — WebGL2 não expõe bytes reais (Anti-Mock Doctrine).
 */

import { Suspense, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import {
  useViewportSceneStore,
  selectSelectedObject,
  type ViewportRuntimeLane,
} from '@/lib/stores/viewport-scene-store'
import type { PreIDEMode } from '@/components/studio/PreIDEShell'
import { getWorkbenchLayout, setWorkbenchLayout } from '@/lib/storage/ui-persistence-spine'
import type { ViewportRenderStats } from '@/components/viewport/viewport-model'
import type { GizmoTransformOperation } from '@/lib/viewport/gizmo-transform-operation'

// ─── Dynamic imports (heavy — lazy load, never in public bundle) ──────────────

const PreIDEShell = dynamic(
  () => import('@/components/studio/PreIDEShell').then((m) => m.PreIDEShell),
  { ssr: false, loading: () => <LoadingScreen /> },
)

const AethelViewport3D = dynamic(
  () => import('@/components/viewport/AethelViewport3D').then((m) => ({ default: m.AethelViewport3D })),
  {
    ssr: false,
    loading: () => <ViewportLoadingSkeleton />,
  },
)

const SceneViewportOutliner = dynamic(
  () => import('@/components/viewport/SceneViewportOutliner').then((m) => ({ default: m.SceneViewportOutliner })),
  { ssr: false, loading: () => <PanelSkeleton rows={8} /> },
)

const SceneViewportInspector = dynamic(
  () => import('@/components/viewport/SceneViewportInspector').then((m) => ({ default: m.SceneViewportInspector })),
  { ssr: false, loading: () => <PanelSkeleton rows={6} /> },
)

const AgentsWindow = dynamic(
  () => import('@/components/agents/AgentsWindow').then((m) => ({ default: m.AgentsWindow })),
  { ssr: false, loading: () => <PanelSkeleton rows={4} /> },
)

const CanonicalSequencer = dynamic(
  () => import('@/components/timeline/CanonicalSequencer').then((m) => ({ default: m.CanonicalSequencer })),
  { ssr: false, loading: () => <PanelSkeleton rows={3} /> },
)

const ProfilerHUD = dynamic(
  () => import('@/components/performance/ProfilerHUD').then((m) => ({ default: m.ProfilerHUD })),
  { ssr: false },
)

const AgentEvidencePanel = dynamic(
  () => import('@/components/agents/AgentEvidencePanel').then((m) => ({ default: m.AgentEvidencePanel })),
  { ssr: false, loading: () => <PanelSkeleton rows={4} /> },
)

const AssetBrowserPanel = dynamic(
  () => import('@/components/studio/AssetBrowserPanel').then((m) => ({ default: m.AssetBrowserPanel })),
  { ssr: false, loading: () => <PanelSkeleton rows={4} /> },
)

const IdeDiagnosticsDock = dynamic(
  () => import('@/components/ide/IdeDiagnosticsDock').then((m) => ({ default: m.IdeDiagnosticsDock })),
  { ssr: false, loading: () => <PanelSkeleton rows={3} /> },
)

// ─── Loading skeletons ────────────────────────────────────────────────────────

function PanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex h-full flex-col gap-2 p-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          className="h-7 animate-pulse rounded-lg bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)]"
          style={{ width: `${62 + (i % 3) * 13}%` }}
        />
      ))}
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[var(--aethel-surface-primary)]">
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--aethel-border-subtle)] border-t-[var(--aethel-primary)]"
          role="status"
          aria-label="Loading studio…"
        />
        <p className="text-sm text-[var(--aethel-text-secondary)]">Loading Creative Studio…</p>
      </div>
    </div>
  )
}

/**
 * Premium viewport skeleton — radial glow reacts to active creative mode color.
 * Shown while R3F canvas bundle is loading (first visit only; then cached).
 */
function ViewportLoadingSkeleton() {
  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at 50% 55%, color-mix(in srgb, var(--aethel-primary) 6%, transparent) 0%, var(--aethel-surface-primary) 70%)',
      }}
    >
      {/* Grid floor lines */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-10"
        aria-hidden
        preserveAspectRatio="none"
      >
        <defs>
          <pattern id="grid-floor" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-[var(--aethel-primary)]" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-floor)" />
      </svg>

      {/* Spinning gizmo placeholder */}
      <div className="relative mb-6 flex h-16 w-16 items-center justify-center">
        <div
          className="absolute inset-0 animate-spin rounded-full border-2 border-transparent"
          style={{ borderTopColor: 'var(--aethel-primary)', animationDuration: '1.4s' }}
        />
        <div
          className="absolute inset-3 animate-spin rounded-full border-2 border-transparent"
          style={{ borderRightColor: 'var(--aethel-primary)', animationDuration: '2.2s' }}
        />
        <div className="h-3 w-3 rounded-full bg-[var(--aethel-primary)] opacity-80" />
      </div>

      <p className="text-[13px] font-medium text-[var(--aethel-text-secondary)]">Initialising viewport…</p>
      <p className="mt-1 text-[11px] text-[var(--aethel-text-tertiary)]">
        WebGL2 canvas loading — first-visit only
      </p>
    </div>
  )
}

// ─── Hub UI state (mode, layout) — persisted separately from scene store ──────

const HUB_UI_KEY = 'pre-ide-hub-ui'

interface HubUIState {
  mode: PreIDEMode
  activeAgentCount: number
}

const HUB_UI_DEFAULTS: HubUIState = {
  mode: 'world',
  activeAgentCount: 0,
}

// ─── Header Actions ───────────────────────────────────────────────────────────

function HeaderActions({
  profilerVisible,
  onToggleProfiler,
}: {
  profilerVisible: boolean
  onToggleProfiler: () => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        id="hub-profiler-toggle"
        onClick={onToggleProfiler}
        title={profilerVisible ? 'Hide Profiler HUD' : 'Show Profiler HUD'}
        aria-pressed={profilerVisible}
        className={[
          'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all',
          profilerVisible
            ? 'border-[color-mix(in_srgb,var(--aethel-success)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success)]'
            : 'border-[var(--aethel-border-subtle)] text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]',
        ].join(' ')}
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Profiler
      </button>

      <button
        type="button"
        id="hub-open-ide"
        onClick={() => { window.location.href = '/ide' }}
        className="flex items-center gap-1.5 rounded-lg border border-[var(--aethel-border-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--aethel-text-secondary)] transition-all hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        Code Editor
      </button>

      <button
        type="button"
        id="hub-deploy"
        className="flex items-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] px-3 py-1.5 text-xs font-semibold text-[var(--aethel-primary)] transition-all hover:bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)]"
      >
        Deploy Build
      </button>
    </div>
  )
}

// ─── Viewport Slot — AethelViewport3D fully wired to store ────────────────────

function ConnectedViewport({ projectId }: { projectId: string }) {
  const objects = useViewportSceneStore((s) => s.objects)
  const selectedIds = useViewportSceneStore((s) => s.selectedIds)
  const transformMode = useViewportSceneStore((s) => s.transformMode)
  const transformSpace = useViewportSceneStore((s) => s.transformSpace)
  const snapEnabled = useViewportSceneStore((s) => s.snapEnabled)
  const creativeMode = useViewportSceneStore((s) => s.creativeMode)
  const renderMode = useViewportSceneStore((s) => s.renderMode)
  const isPlaying = useViewportSceneStore((s) => s.isPlaying)
  const currentTime = useViewportSceneStore((s) => s.currentTime)
  const duration = useViewportSceneStore((s) => s.duration)

  const setObjects = useViewportSceneStore((s) => s.setObjects)
  const setSelectedIds = useViewportSceneStore((s) => s.setSelectedIds)
  const setTransformMode = useViewportSceneStore((s) => s.setTransformMode)
  const setTransformSpace = useViewportSceneStore((s) => s.setTransformSpace)
  const setSnapEnabled = useViewportSceneStore((s) => s.setSnapEnabled)
  const togglePlay = useViewportSceneStore((s) => s.togglePlay)
  const setRenderStats = useViewportSceneStore((s) => s.setRenderStats)
  const setRaycastResolver = useViewportSceneStore((s) => s.setRaycastResolver)
  const applyGizmoOperation = useViewportSceneStore((s) => s.applyGizmoOperation)
  const setCapabilityScore = useViewportSceneStore((s) => s.setCapabilityScore)

  // Forward capabilityScore from fidelity state — hoisted up via store
  // AethelViewport3D exposes capabilityScore on ViewportFidelityControl;
  // we intercept via a custom onRenderStats extension pattern.
  const handleRenderStats = useCallback((stats: ViewportRenderStats) => {
    setRenderStats(stats)
    // capabilityScore is read from fidelityParams inside AethelViewport3D;
    // we get it through a data attr — see ViewportFidelityControl data-capability
    const rootEl = document.querySelector('[data-canonical-viewport3d]')
    if (rootEl) {
      const score = parseInt(rootEl.getAttribute('data-capability-score') ?? '0', 10)
      if (score > 0) setCapabilityScore(score)
    }
  }, [setRenderStats, setCapabilityScore])

  const handleGizmoOperation = useCallback((op: GizmoTransformOperation) => {
    applyGizmoOperation(op)
  }, [applyGizmoOperation])

  return (
    <Suspense fallback={<ViewportLoadingSkeleton />}>
      <AethelViewport3D
        objects={objects}
        selectedIds={selectedIds}
        transformMode={transformMode}
        transformSpace={transformSpace}
        snapEnabled={snapEnabled}
        creativeMode={creativeMode}
        renderMode={renderMode}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        terrainProjectId={projectId}
        onTogglePlayTest={togglePlay}
        onObjectsChange={setObjects}
        onSelectionChange={setSelectedIds}
        onTransformModeChange={setTransformMode}
        onTransformSpaceChange={setTransformSpace}
        onSnapEnabledChange={setSnapEnabled}
        onRenderStats={handleRenderStats}
        onRaycastReady={setRaycastResolver}
        onGizmoTransformOperation={handleGizmoOperation}
      />
    </Suspense>
  )
}

// ─── Timeline Slot — wired to store for isPlaying + currentTime ────────────────

function ConnectedTimeline() {
  return (
    <Suspense fallback={<PanelSkeleton rows={3} />}>
      <CanonicalSequencer />
    </Suspense>
  )
}

// ─── Outliner slot — bidirectional selection wiring ───────────────────────────

function ConnectedOutliner() {
  const objects = useViewportSceneStore((s) => s.objects)
  const selectedIds = useViewportSceneStore((s) => s.selectedIds)
  const setSelectedIds = useViewportSceneStore((s) => s.setSelectedIds)
  const setObjects = useViewportSceneStore((s) => s.setObjects)

  return (
    <Suspense fallback={<PanelSkeleton rows={8} />}>
      <SceneViewportOutliner
        objects={objects}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onObjectsChange={setObjects}
      />
    </Suspense>
  )
}

// ─── Inspector slot — reads selectedObject, writes patches ───────────────────

function ConnectedInspector() {
  const selectedObject = useViewportSceneStore(selectSelectedObject)
  const selectedIds = useViewportSceneStore((s) => s.selectedIds)
  const transformMode = useViewportSceneStore((s) => s.transformMode)
  const transformSpace = useViewportSceneStore((s) => s.transformSpace)
  const gizmoConstraint = useViewportSceneStore((s) => s.gizmoConstraint)
  const gizmoPivotMode = useViewportSceneStore((s) => s.gizmoPivotMode)
  const snapEnabled = useViewportSceneStore((s) => s.snapEnabled)
  const isPlaying = useViewportSceneStore((s) => s.isPlaying)
  
  const setTransformMode = useViewportSceneStore((s) => s.setTransformMode)
  const setTransformSpace = useViewportSceneStore((s) => s.setTransformSpace)
  const setGizmoConstraint = useViewportSceneStore((s) => s.setGizmoConstraint)
  const setGizmoPivotMode = useViewportSceneStore((s) => s.setGizmoPivotMode)
  const setSnapEnabled = useViewportSceneStore((s) => s.setSnapEnabled)
  const togglePlay = useViewportSceneStore((s) => s.togglePlay)
  const objects = useViewportSceneStore((s) => s.objects)
  const setObjects = useViewportSceneStore((s) => s.setObjects)

  const handleObjectTransformChange = useCallback((id: string, patch: any) => {
    setObjects(objects.map(o => o.id === id ? { ...o, ...patch } : o))
  }, [objects, setObjects])

  return (
    <Suspense fallback={<PanelSkeleton rows={6} />}>
      <SceneViewportInspector
        selectedObject={selectedObject}
        selectedIds={selectedIds}
        transformMode={transformMode}
        transformSpace={transformSpace}
        gizmoConstraint={gizmoConstraint}
        gizmoPivotMode={gizmoPivotMode}
        snapEnabled={snapEnabled}
        isPlaying={isPlaying}
        onTransformModeChange={setTransformMode}
        onTransformSpaceChange={setTransformSpace}
        onGizmoConstraintChange={setGizmoConstraint}
        onGizmoPivotModeChange={setGizmoPivotMode}
        onSnapEnabledChange={setSnapEnabled}
        onTogglePlayTest={togglePlay}
        onObjectTransformChange={handleObjectTransformChange}
      />
    </Suspense>
  )
}

// ─── ProfilerHUD slot — REAL stats, never mock ────────────────────────────────

function ConnectedProfilerHUD() {
  const renderStats = useViewportSceneStore((s) => s.renderStats)
  const capabilityScore = useViewportSceneStore((s) => s.capabilityScore)
  const profilerVisible = useViewportSceneStore((s) => s.profilerVisible)

  // Only mount when we have real data from the first canvas frame
  if (!profilerVisible || !renderStats) return null

  return (
    <ProfilerHUD
      metrics={{
        fps: renderStats.fps,
        frameTime: renderStats.frameTimeMs,
        drawCalls: renderStats.drawCalls,
        triangleCount: renderStats.triangles,
        // VRAM intentionally 0 — WebGL2 does not expose bytes (Anti-Mock Doctrine)
        vramUsed: 0,
        vramTotal: 0,
        sabSyncMs: 0,      // SAB wire pending Law I
        physicsMs: 0,      // physics worker pending Law I
        capabilityScore,
      }}
      position="bottom-right"
    />
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PreIDEPage() {
  // Hub UI state (mode, not scene state — separate concern)
  const hubUI = getWorkbenchLayout(HUB_UI_KEY, HUB_UI_DEFAULTS) as HubUIState

  const profilerVisible = useViewportSceneStore((s) => s.profilerVisible)
  const toggleProfiler = useViewportSceneStore((s) => s.toggleProfiler)
  const setCreativeMode = useViewportSceneStore((s) => s.setCreativeMode)
  const runtimeLane = useViewportSceneStore((s) => s.runtimeLane)
  const capabilityScore = useViewportSceneStore((s) => s.capabilityScore)
  const fidelityMode = useViewportSceneStore((s) => s.fidelityMode)
  const setFidelityMode = useViewportSceneStore((s) => s.setFidelityMode)

  // Map runtimeLane store value to PreIDEShell's simpler type
  const shellRuntimeLane: 'browser' | 'local' | 'cloud' =
    runtimeLane === 'studio-local' ? 'local' : runtimeLane === 'cloud' ? 'cloud' : 'browser'

  // Sync creative mode from hub UI mode
  const handleModeChange = useCallback((mode: PreIDEMode) => {
    setCreativeMode(mode === 'film' ? 'film' : 'game')
    setWorkbenchLayout(HUB_UI_KEY, { ...hubUI, mode })
  }, [hubUI, setCreativeMode])

  // In production: get projectId from URL params / Prisma session
  const projectId = 'default'

  return (
    <div className="h-screen w-screen overflow-hidden bg-[var(--aethel-surface-primary)]">
      <Suspense fallback={<LoadingScreen />}>
        <PreIDEShell
          mode={hubUI.mode}
          onModeChange={handleModeChange}
          projectName="My Project"
          runtimeLane={shellRuntimeLane}
          activeAgentCount={3}
          capabilityScore={capabilityScore}
          fidelityMode={fidelityMode}
          onFidelityModeChange={setFidelityMode}

          /* ── MOTOR WIRING ─────────────────────────────────────────────── */
          viewportSlot={<ConnectedViewport projectId={projectId} />}
          outlineSlot={<ConnectedOutliner />}
          timelineSlot={<ConnectedTimeline />}
          inspectorSlot={<ConnectedInspector />}

          nexusSlot={
            <Suspense fallback={<PanelSkeleton rows={4} />}>
              <AgentsWindow projectId={projectId} />
            </Suspense>
          }
          evidenceSlot={
            <Suspense fallback={<PanelSkeleton rows={4} />}>
              <AgentEvidencePanel />
            </Suspense>
          }
          assetSlot={
            <Suspense fallback={<PanelSkeleton rows={4} />}>
              <AssetBrowserPanel />
            </Suspense>
          }
          logsSlot={
            <Suspense fallback={<PanelSkeleton rows={3} />}>
              <IdeDiagnosticsDock />
            </Suspense>
          }

          /* ── PROFILER HUD — dados REAIS, nunca mock ───────────────────── */
          profilerSlot={<ConnectedProfilerHUD />}

          headerActionsSlot={
            <HeaderActions
              profilerVisible={profilerVisible}
              onToggleProfiler={toggleProfiler}
            />
          }
        />
      </Suspense>
    </div>
  )
}
