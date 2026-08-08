/**
 * Timeline persist `*.timeline.json` → project file store (authoring UI can wait).
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createSequencerTimeline } from '@/lib/sequencer/core/timeline'
import {
  bindDemoProjectTimeline,
  clearProjectTimeline,
  createEmptyProjectTimeline,
  getProjectTimeline,
  resetProjectTimelineStoreForTests,
  setProjectTimeline,
} from '@/lib/sequencer/project-timeline-store'
import {
  DEFAULT_PROJECT_TIMELINE_PATH,
  decodeTimelineProjectDocument,
  encodeTimelineProjectDocument,
  hydrateProjectTimelineFromFile,
  persistProjectTimelineToFile,
} from '@/lib/sequencer/timeline-project-persist'

function validPersistableTimeline() {
  return createSequencerTimeline({
    id: 'tl-persist-1',
    label: 'Persist Shot',
    durationMs: 5000,
    frameRate: 30,
    tracks: [
      {
        id: 'video-1',
        label: 'Camera A',
        kind: 'video',
        muted: false,
        locked: false,
        clips: [
          {
            id: 'clip-1',
            trackId: 'video-1',
            label: 'Establishing',
            sourceRef: 'asset://shot-persist',
            startMs: 0,
            endMs: 4000,
            speed: 1,
            opacity: 1,
            blendMode: 'replace',
          },
        ],
      },
    ],
  })
}

function memoryIo(seed?: Record<string, string>) {
  const files = new Map<string, string>(Object.entries(seed ?? {}))
  return {
    files,
    io: {
      async readFile(path: string) {
        const v = files.get(path)
        if (v === undefined) throw new Error(`Failed to read ${path} (404)`)
        return v
      },
      async writeFile(path: string, content: string) {
        files.set(path, content)
      },
    },
  }
}

describe('timeline-project-persist', () => {
  beforeEach(() => {
    resetProjectTimelineStoreForTests()
  })

  it('round-trips SequencerTimeline through *.timeline.json envelope', () => {
    const timeline = validPersistableTimeline()
    const raw = encodeTimelineProjectDocument(timeline)
    expect(raw).toContain('aethel.timeline-json.v1')
    const restored = decodeTimelineProjectDocument(raw)
    expect(restored.id).toBe(timeline.id)
    expect(restored.tracks.length).toBe(1)
    expect(restored.tracks[0]?.clips[0]?.id).toBe('clip-1')
  })

  it('persists bound non-demo timeline to default cinematics/main.timeline.json', async () => {
    const timeline = validPersistableTimeline()
    setProjectTimeline('proj-persist', timeline, { isDemo: false })
    const { io, files } = memoryIo()
    const result = await persistProjectTimelineToFile({ projectId: 'proj-persist', io })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.path).toBe(DEFAULT_PROJECT_TIMELINE_PATH)
    expect(files.get(DEFAULT_PROJECT_TIMELINE_PATH)).toContain(timeline.id)
  })

  it('blocks demo fixture persistence (Zero-MVP)', async () => {
    bindDemoProjectTimeline('proj-demo')
    const { io } = memoryIo()
    const result = await persistProjectTimelineToFile({ projectId: 'proj-demo', io })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('demo_blocked')
  })

  it('refuses empty timeline without allowEmpty', async () => {
    setProjectTimeline('proj-empty', createEmptyProjectTimeline('proj-empty'), { isDemo: false })
    const { io } = memoryIo()
    const result = await persistProjectTimelineToFile({ projectId: 'proj-empty', io })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('empty')
  })

  it('hydrates project store from *.timeline.json', async () => {
    const timeline = validPersistableTimeline()
    const raw = encodeTimelineProjectDocument(timeline)
    const { io } = memoryIo({ [DEFAULT_PROJECT_TIMELINE_PATH]: raw })
    clearProjectTimeline('proj-hydrate')
    const result = await hydrateProjectTimelineFromFile({ projectId: 'proj-hydrate', io })
    expect(result.ok).toBe(true)
    const bound = getProjectTimeline('proj-hydrate')
    expect(bound?.id).toBe(timeline.id)
    expect(bound?.tracks.length).toBe(1)
  })
})
