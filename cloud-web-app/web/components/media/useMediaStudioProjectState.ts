import { useCallback, useMemo, useState, type SetStateAction } from 'react'
import type { MediaProject } from './media-studio-core'

export type MediaStudioProjectStateProps = {
  project?: MediaProject
  onProjectChange?: (project: MediaProject) => void
  selectedAssetId?: string | null
  onSelectedAssetIdChange?: (assetId: string | null) => void
  selectedClipId?: string | null
  onSelectedClipIdChange?: (clipId: string | null) => void
}

export function createEmptyMediaProject(): MediaProject {
  const now = Date.now()
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

export function useMediaStudioProjectState({
  project: controlledProject,
  onProjectChange,
  selectedAssetId: controlledSelectedAssetId,
  onSelectedAssetIdChange,
  selectedClipId: controlledSelectedClipId,
  onSelectedClipIdChange,
}: MediaStudioProjectStateProps) {
  const initialProject = useMemo(createEmptyMediaProject, [])
  const [internalProject, setInternalProject] = useState<MediaProject>(initialProject)
  const [internalSelectedAssetId, setInternalSelectedAssetId] = useState<string | null>(null)
  const [internalSelectedClipId, setInternalSelectedClipId] = useState<string | null>(null)

  const project = controlledProject ?? internalProject
  const selectedAssetId = controlledSelectedAssetId ?? internalSelectedAssetId
  const selectedClipId = controlledSelectedClipId ?? internalSelectedClipId

  const setProject = useCallback((update: SetStateAction<MediaProject>) => {
    if (controlledProject && onProjectChange) {
      const nextProject = typeof update === 'function' ? update(controlledProject) : update
      onProjectChange(nextProject)
      return
    }
    setInternalProject(update)
  }, [controlledProject, onProjectChange])

  const setSelectedAssetId = useCallback((nextId: string | null) => {
    if (controlledSelectedAssetId !== undefined) {
      onSelectedAssetIdChange?.(nextId)
      return
    }
    setInternalSelectedAssetId(nextId)
  }, [controlledSelectedAssetId, onSelectedAssetIdChange])

  const setSelectedClipId = useCallback((nextId: string | null) => {
    if (controlledSelectedClipId !== undefined) {
      onSelectedClipIdChange?.(nextId)
      return
    }
    setInternalSelectedClipId(nextId)
  }, [controlledSelectedClipId, onSelectedClipIdChange])

  return {
    project,
    selectedAssetId,
    selectedClipId,
    setProject,
    setSelectedAssetId,
    setSelectedClipId,
  }
}
