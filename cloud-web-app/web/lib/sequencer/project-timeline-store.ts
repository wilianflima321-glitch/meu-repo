/**
 * Project-scoped sequence document store (aethel.timeline.v1).
 * Source of truth for Timeline3D / CanonicalSequencer live wiring.
 * Empty by default — never seeds DEMO_SEQUENCE or transform→fake keyframes.
 */

import type { SequencerTimeline } from '@/lib/sequencer/core/types'
import { createSequencerTimeline } from '@/lib/sequencer/core/timeline'
import { buildDemoCutsceneTimeline } from '@/lib/sequencer/sequencer-apply-deepen'

export type ProjectTimelineBinding = {
  timeline: SequencerTimeline
  /** Explicit demo/fixture path only (never implied for empty projects). */
  isDemo: boolean
}

type Listener = () => void

const bindings = new Map<string, ProjectTimelineBinding>()
const listeners = new Set<Listener>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function createEmptyProjectTimeline(projectId: string): SequencerTimeline {
  const id = projectId.trim() ? `timeline-${projectId}` : 'timeline-unbound'
  return createSequencerTimeline({
    id,
    label: 'Untitled Sequence',
    durationMs: 10_000,
    frameRate: 30,
    tracks: [],
    evidenceRefs: [],
  })
}

/** True when the timeline document contains real clips (with or without curve keyframes). */
export function timelineHasSequenceContent(timeline: SequencerTimeline | null | undefined): boolean {
  if (!timeline) return false
  return timeline.tracks.some((track) => track.clips.length > 0)
}

export function getProjectTimelineBinding(projectId: string): ProjectTimelineBinding | null {
  return bindings.get(projectId) ?? null
}

export function getProjectTimeline(projectId: string): SequencerTimeline | null {
  return bindings.get(projectId)?.timeline ?? null
}

export function setProjectTimeline(
  projectId: string,
  timeline: SequencerTimeline | null,
  options?: { isDemo?: boolean },
): void {
  if (!timeline) {
    bindings.delete(projectId)
    emit()
    return
  }
  bindings.set(projectId, {
    timeline,
    isDemo: options?.isDemo === true,
  })
  emit()
}

/** Explicit demo/fixture bind — labels must stay honest in UI. */
export function bindDemoProjectTimeline(projectId: string): SequencerTimeline {
  const timeline = buildDemoCutsceneTimeline()
  setProjectTimeline(projectId, timeline, { isDemo: true })
  return timeline
}

export function clearProjectTimeline(projectId: string): void {
  setProjectTimeline(projectId, null)
}

/**
 * Ensure a non-demo project timeline is bound. Does not invent tracks/clips —
 * empty shell only when unbound.
 */
export function ensureProjectTimelineBound(
  projectId: string,
  options?: { durationSec?: number },
): ProjectTimelineBinding {
  const existing = bindings.get(projectId)
  if (existing) return existing
  const timeline = createEmptyProjectTimeline(projectId)
  if (options?.durationSec != null && options.durationSec > 0) {
    const durationMs = Math.max(1000, Math.round(options.durationSec * 1000))
    timeline.durationMs = durationMs
    timeline.range = { startMs: 0, endMs: durationMs }
  }
  const binding: ProjectTimelineBinding = { timeline, isDemo: false }
  bindings.set(projectId, binding)
  emit()
  return binding
}

/** Replace bound timeline document (preserves isDemo unless overridden). */
export function updateProjectTimeline(
  projectId: string,
  timeline: SequencerTimeline,
  options?: { isDemo?: boolean },
): ProjectTimelineBinding | null {
  const existing = bindings.get(projectId)
  if (!existing && options?.isDemo == null) {
    setProjectTimeline(projectId, timeline, { isDemo: false })
    return bindings.get(projectId) ?? null
  }
  const isDemo = options?.isDemo ?? existing?.isDemo ?? false
  setProjectTimeline(projectId, timeline, { isDemo })
  return bindings.get(projectId) ?? null
}

export function subscribeProjectTimeline(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Test helper — wipe all project bindings. */
export function resetProjectTimelineStoreForTests(): void {
  bindings.clear()
  emit()
}
