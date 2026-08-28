/**
 * viewport-scene-store.ts — Zustand store centralizado para a cena do motor
 *
 * PROPÓSITO:
 *   Elimina prop-drilling entre PreIDEShell slots. Todos os painéis
 *   (Outliner, Inspector, Timeline, Viewport, ProfilerHUD) compartilham
 *   este store como source-of-truth da cena 3D ativa.
 *
 * WIRING:
 *   - AethelViewport3D → lê objects/selectedIds/transformMode/isPlaying/currentTime
 *                      → escreve via onObjectsChange/onSelectionChange/onRenderStats
 *   - SceneViewportOutliner → lê objects/selectedIds; escreve selectedIds
 *   - SceneViewportInspector → lê selectedObject; escreve objects (patch)
 *   - CanonicalSequencer → lê isPlaying/currentTime/duration; escreve via setIsPlaying/setCurrentTime
 *   - ProfilerHUD → lê renderStats/capabilityScore (nunca mock)
 *
 * ANTI-MOCK (Art. III):
 *   renderStats vem de onRenderStats do AethelViewport3D (gl.info real).
 *   Não há campos fabricados — VRAM omitida pois WebGL2 não expõe bytes reais.
 *
 * Law I (SAB/COOP): quando physics SAB worker estiver ativo, este store
 *   receberá o pose buffer via Atomics.waitAsync; por agora apenas
 *   reserva os campos (onRaycastReady).
 */

import { create } from 'zustand'
import { subscribeWithSelector, persist } from 'zustand/middleware'
import type {
  ViewportSceneObject,
  ViewportTransformMode,
  ViewportTransformSpace,
  ViewportRenderStats,
  ViewportCreativeMode,
} from '@/components/viewport/viewport-model'
import type { GizmoAxisPlaneConstraint, GizmoPivotMode } from '@/lib/viewport/gizmo-elite-controls'
import type { GizmoTransformOperation } from '@/lib/viewport/gizmo-transform-operation'
import { viewportSeedObjects } from '@/components/viewport/viewport-model'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ViewportRuntimeLane = 'browser' | 'studio-local' | 'cloud'

export interface CameraBookmark {
  id: number
  label: string
  position: [number, number, number]
  target: [number, number, number]
  fov?: number
  savedAt: number
}

export interface ViewportSceneState {
  // ── Scene ──
  objects: ViewportSceneObject[]
  selectedIds: string[]

  // ── Camera Bookmarks (Ctrl+1..9 like Unreal / Blender) ──
  cameraBookmarks: Record<number, CameraBookmark>
  activeBookmarkId: number | null
  cameraJumpRequest: { slot: number; timestamp: number } | null

  // ── Gizmo / Transform ──
  transformMode: ViewportTransformMode
  transformSpace: ViewportTransformSpace
  snapEnabled: boolean
  gizmoConstraint: GizmoAxisPlaneConstraint
  gizmoPivotMode: GizmoPivotMode

  // ── Creative mode ──
  creativeMode: ViewportCreativeMode
  renderMode: 'draft' | 'cinematic'

  // ── Playback (Timeline ↔ Viewport sync) ──
  isPlaying: boolean
  currentTime: number
  duration: number

  // ── Performance (real — from gl.info, no fabrication) ──
  renderStats: ViewportRenderStats | null
  capabilityScore: number   // 0–100 from useViewportFidelityState
  runtimeLane: ViewportRuntimeLane

  // ── Raycast resolver (Law I — physics worker hook) ──
  raycastResolver: ((clientX: number, clientY: number) => string | null) | null

  // ── UI state ──
  profilerVisible: boolean
  fidelityMode: 'auto' | 'performance' | 'quality' | 'ultra'

  // ─── Actions ──────────────────────────────────────────────────────────────
  setObjects: (objects: ViewportSceneObject[]) => void
  addObject: (obj: ViewportSceneObject) => void
  patchObject: (id: string, patch: Partial<ViewportSceneObject>) => void
  deleteObjects: (ids: string[]) => void
  setSelectedIds: (ids: string[]) => void
  selectObject: (id: string, additive?: boolean) => void
  clearSelection: () => void

  saveCameraBookmark: (slot: number, position: [number, number, number], target: [number, number, number], fov?: number, label?: string) => void
  recallCameraBookmark: (slot: number) => void
  clearCameraBookmark: (slot: number) => void

  setTransformMode: (mode: ViewportTransformMode) => void
  setTransformSpace: (space: ViewportTransformSpace) => void
  setSnapEnabled: (enabled: boolean) => void
  setGizmoConstraint: (c: GizmoAxisPlaneConstraint) => void
  setGizmoPivotMode: (m: GizmoPivotMode) => void
  applyGizmoOperation: (op: GizmoTransformOperation) => void

  setCreativeMode: (mode: ViewportCreativeMode) => void
  setRenderMode: (mode: 'draft' | 'cinematic') => void

  setIsPlaying: (playing: boolean) => void
  togglePlay: () => void
  setCurrentTime: (t: number) => void
  setDuration: (d: number) => void

  setRenderStats: (stats: ViewportRenderStats) => void
  setCapabilityScore: (score: number) => void
  setRuntimeLane: (lane: ViewportRuntimeLane) => void
  setRaycastResolver: (fn: ((clientX: number, clientY: number) => string | null) | null) => void
  setProfilerVisible: (v: boolean) => void
  toggleProfiler: () => void
  setFidelityMode: (mode: 'auto' | 'performance' | 'quality' | 'ultra') => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useViewportSceneStore = create<ViewportSceneState>()(
  persist(
    subscribeWithSelector((set, get) => ({
      // ── Initial state ──
      objects: viewportSeedObjects,
      selectedIds: [],

      cameraBookmarks: {},
      activeBookmarkId: null,
      cameraJumpRequest: null,

      transformMode: 'translate',
      transformSpace: 'world',
      snapEnabled: false,
      gizmoConstraint: 'free',
      gizmoPivotMode: 'median',

      creativeMode: 'game',
      renderMode: 'draft',

      isPlaying: false,
      currentTime: 0,
      duration: 30,

      renderStats: null,
      capabilityScore: 0,
      runtimeLane: 'browser',

      raycastResolver: null,
      profilerVisible: false,
      fidelityMode: 'auto',

      // ── Scene actions ──
      setObjects: (objects) => set({ objects }),

      addObject: (obj) =>
        set((s) => ({
          objects: [...s.objects, obj],
          selectedIds: [obj.id],
        })),

      deleteObjects: (ids) =>
        set((s) => ({
          objects: s.objects.filter((o) => !ids.includes(o.id)),
          selectedIds: s.selectedIds.filter((id) => !ids.includes(id)),
        })),

      saveCameraBookmark: (slot, position, target, fov = 50, label) =>
        set((s) => ({
          cameraBookmarks: {
            ...s.cameraBookmarks,
            [slot]: {
              id: slot,
              label: label ?? `Bookmark ${slot}`,
              position,
              target,
              fov,
              savedAt: Date.now(),
            },
          },
          activeBookmarkId: slot,
        })),

      recallCameraBookmark: (slot) => {
        const { cameraBookmarks } = get()
        if (cameraBookmarks[slot]) {
          set({ activeBookmarkId: slot, cameraJumpRequest: { slot, timestamp: Date.now() } })
        }
      },

      clearCameraBookmark: (slot) =>
        set((s) => {
          const next = { ...s.cameraBookmarks }
          delete next[slot]
          return { cameraBookmarks: next, activeBookmarkId: s.activeBookmarkId === slot ? null : s.activeBookmarkId }
        }),

      patchObject: (id, patch) =>
        set((s) => ({
          objects: s.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)),
        })),

      setSelectedIds: (selectedIds) => set({ selectedIds }),

      selectObject: (id, additive = false) =>
        set((s) => ({
          selectedIds: additive
            ? s.selectedIds.includes(id)
              ? s.selectedIds.filter((x) => x !== id)
              : [...s.selectedIds, id]
            : [id],
        })),

      clearSelection: () => set({ selectedIds: [] }),

      // ── Gizmo / Transform ──
      setTransformMode: (transformMode) => set({ transformMode }),
      setTransformSpace: (transformSpace) => set({ transformSpace }),
      setSnapEnabled: (snapEnabled) => set({ snapEnabled }),
      setGizmoConstraint: (gizmoConstraint) => set({ gizmoConstraint }),
      setGizmoPivotMode: (gizmoPivotMode) => set({ gizmoPivotMode }),

      applyGizmoOperation: (op) => {
        const { objects } = get()
        set({
          objects: objects.map((o) => {
            const snapshot = op.after[o.id]
            if (snapshot) {
              return {
                ...o,
                position: [snapshot.position.x, snapshot.position.y, snapshot.position.z],
                rotation: [snapshot.rotation.x, snapshot.rotation.y, snapshot.rotation.z],
                scale: [snapshot.scale.x, snapshot.scale.y, snapshot.scale.z],
              }
            }
            return o
          }),
        })
      },

      // ── Creative / Render ──
      setCreativeMode: (creativeMode) => set({ creativeMode }),
      setRenderMode: (renderMode) => set({ renderMode }),

      // ── Playback ──
      setIsPlaying: (isPlaying) => set({ isPlaying }),
      togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
      setCurrentTime: (currentTime) => set({ currentTime }),
      setDuration: (duration) => set({ duration }),

      // ── Performance (real data only) ──
      setRenderStats: (renderStats) => set({ renderStats }),
      setCapabilityScore: (capabilityScore) => set({ capabilityScore }),
      setRuntimeLane: (runtimeLane) => set({ runtimeLane }),

      // ── Law I — Raycast hook ──
      setRaycastResolver: (raycastResolver) => set({ raycastResolver }),

      // ── UI ──
      setProfilerVisible: (profilerVisible) => set({ profilerVisible }),
      toggleProfiler: () => set((s) => ({ profilerVisible: !s.profilerVisible })),
      setFidelityMode: (fidelityMode) => set({ fidelityMode }),
    })),
    {
      name: 'aethel-viewport-ui-storage',
      partialize: (state) => ({
        profilerVisible: state.profilerVisible,
        fidelityMode: state.fidelityMode,
      }),
    }
  )
)

// ─── Selector helpers (memoized, stable references) ───────────────────────────

export const selectSelectedObject = (s: ViewportSceneState) =>
  s.objects.find((o) => o.id === s.selectedIds[0]) ?? null

export const selectSceneObjectCount = (s: ViewportSceneState) => s.objects.length

export const selectHasSelection = (s: ViewportSceneState) => s.selectedIds.length > 0

export const selectRealFps = (s: ViewportSceneState) => s.renderStats?.fps ?? null

export const selectDrawCalls = (s: ViewportSceneState) => s.renderStats?.drawCalls ?? null
