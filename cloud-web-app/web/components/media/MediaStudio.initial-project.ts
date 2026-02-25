'use client'

import type { MediaProject } from './MediaStudio.utils'

export function createMediaStudioInitialProject(now = Date.now()): MediaProject {
  return {
    id: `media-project-${now}`,
    name: 'Media Studio',
    assets: [],
    tracks: [
      { id: 't-video-1', name: 'V1', type: 'video', muted: false, locked: false, height: 60 },
      { id: 't-audio-1', name: 'A1', type: 'audio', muted: false, locked: false, height: 60 },
    ],
    clips: [],
    duration: 30,
  }
}
