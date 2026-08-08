/**
 * Persist / hydrate SequencerTimeline documents as project `*.timeline.json`.
 * Authoring UI can wait — this closes the store→disk gap for Timeline3D real data.
 */

import type { SequencerTimeline } from '@/lib/sequencer/core/types'
import {
  parseSequencerTimelineEnvelope,
  serializeSequencerTimeline,
  type SequencerJsonEnvelope,
} from '@/lib/sequencer/io/timeline-json'
import {
  getProjectTimeline,
  getProjectTimelineBinding,
  setProjectTimeline,
  timelineHasSequenceContent,
} from '@/lib/sequencer/project-timeline-store'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('timeline-project-persist')

/** Canonical default relative path inside a project workspace. */
export const DEFAULT_PROJECT_TIMELINE_PATH = 'cinematics/main.timeline.json'

export type TimelinePersistResult =
  | { ok: true; path: string; bytes: number }
  | { ok: false; reason: 'unbound' | 'demo_blocked' | 'empty' | 'serialize_error' | 'io_error'; message: string }

export type TimelineHydrateResult =
  | { ok: true; path: string; timeline: SequencerTimeline }
  | { ok: false; reason: 'not_found' | 'parse_error' | 'io_error'; message: string }

export interface TimelineFileIO {
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
}

/** Serialize a timeline to pretty JSON for project storage. */
export function encodeTimelineProjectDocument(timeline: SequencerTimeline): string {
  const envelope = serializeSequencerTimeline(timeline)
  // Use live export timestamp (serializeSequencerTimeline pins Date(0) for deterministic tests).
  const live: SequencerJsonEnvelope = {
    ...envelope,
    exportedAt: new Date().toISOString(),
  }
  return `${JSON.stringify(live, null, 2)}\n`
}

export function decodeTimelineProjectDocument(raw: string): SequencerTimeline {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    throw new Error(
      `Invalid timeline JSON: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid timeline JSON: expected object envelope')
  }
  const envelope = parsed as SequencerJsonEnvelope
  return parseSequencerTimelineEnvelope(envelope)
}

/**
 * Write the in-memory project timeline to `*.timeline.json` via the IDE file service.
 * Demo bindings are blocked (never persist fixture theater as project content).
 */
export async function persistProjectTimelineToFile(input: {
  projectId: string
  io: TimelineFileIO
  relativePath?: string
  /** When true, allow persisting empty tracks (scaffold document). Default false. */
  allowEmpty?: boolean
}): Promise<TimelinePersistResult> {
  const path = (input.relativePath ?? DEFAULT_PROJECT_TIMELINE_PATH).replace(/\\/g, '/')
  if (!path.endsWith('.timeline.json')) {
    return {
      ok: false,
      reason: 'serialize_error',
      message: `Timeline path must end with .timeline.json (got ${path})`,
    }
  }

  const bindingResult = getProjectTimelineBinding(input.projectId)
  if (!bindingResult) {
    return { ok: false, reason: 'unbound', message: `No timeline bound for project ${input.projectId}` }
  }
  if (bindingResult.isDemo) {
    return {
      ok: false,
      reason: 'demo_blocked',
      message: 'Demo/fixture timelines must not be persisted as project content.',
    }
  }
  if (!input.allowEmpty && !timelineHasSequenceContent(bindingResult.timeline)) {
    return {
      ok: false,
      reason: 'empty',
      message: 'Refusing to persist an empty timeline (no clips). Author content or pass allowEmpty.',
    }
  }

  try {
    const content = encodeTimelineProjectDocument(bindingResult.timeline)
    await input.io.writeFile(path, content)
    log.info('timeline_persisted', { projectId: input.projectId, path, bytes: content.length })
    return { ok: true, path, bytes: content.length }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error('timeline_persist_failed', { projectId: input.projectId, path, err: message })
    return { ok: false, reason: 'io_error', message }
  }
}

/** Load `*.timeline.json` from the project and bind it into the in-memory store. */
export async function hydrateProjectTimelineFromFile(input: {
  projectId: string
  io: TimelineFileIO
  relativePath?: string
}): Promise<TimelineHydrateResult> {
  const path = (input.relativePath ?? DEFAULT_PROJECT_TIMELINE_PATH).replace(/\\/g, '/')
  try {
    const raw = await input.io.readFile(path)
    if (!raw || !raw.trim()) {
      return { ok: false, reason: 'not_found', message: `Empty or missing timeline at ${path}` }
    }
    const timeline = decodeTimelineProjectDocument(raw)
    setProjectTimeline(input.projectId, timeline, { isDemo: false })
    log.info('timeline_hydrated', { projectId: input.projectId, path, tracks: timeline.tracks.length })
    return { ok: true, path, timeline }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (/not found|ENOENT|404|Failed to read/i.test(message)) {
      return { ok: false, reason: 'not_found', message }
    }
    if (/Invalid timeline|Unsupported timeline|JSON/i.test(message)) {
      return { ok: false, reason: 'parse_error', message }
    }
    log.error('timeline_hydrate_failed', { projectId: input.projectId, path, err: message })
    return { ok: false, reason: 'io_error', message }
  }
}

/** Sync helper for tests — peek whether a project currently has a persistable bind. */
export function projectTimelineIsPersistable(projectId: string): boolean {
  const timeline = getProjectTimeline(projectId)
  return timeline != null && timelineHasSequenceContent(timeline)
}
