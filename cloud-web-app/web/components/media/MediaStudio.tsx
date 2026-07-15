'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { VideoTimeline, type VideoClip } from '../video/VideoTimeline'
import type { ClipEffect } from '../../lib/video-encoder-real'

import {
  computeAudioPeaksFromUrl,
  computeTransitionFades,
  computeVisualAlphaAtTime,
  decodeAudioBuffer,
  inferMediaKindFromPath,
  resolveSrcFromWorkspacePath,
  type MediaAsset,
  type MediaKind,
  type TransitionType,
} from './media-studio-core'
import {
  MediaStudioAssetBin,
  MediaStudioInspectorPanel,
  MediaStudioMixerPanel,
  MediaStudioPreviewPanel,
  MediaStudioToolbar,
} from './MediaStudioPanels'
import {
  useMediaStudioProjectState,
  type MediaStudioProjectStateProps,
} from './useMediaStudioProjectState'
import { useMediaStudioExport } from './useMediaStudioExport'

type Props = MediaStudioProjectStateProps & {
  path?: string
}

export default function MediaStudio({
  path,
  ...projectStateProps
}: Props) {
  const {
    project,
    selectedAssetId,
    selectedClipId,
    setProject,
    setSelectedAssetId,
    setSelectedClipId,
  } = useMediaStudioProjectState(projectStateProps)

  const [currentTime, setCurrentTime] = useState(0)
  const [zoom, setZoom] = useState(80)
  const [isPlaying, setIsPlaying] = useState(false)

  const [audioProgress, setAudioProgress] = useState(0)
  const audioElRef = useRef<HTMLAudioElement | null>(null)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const audioMasterRef = useRef<GainNode | null>(null)
  const audioBuffersRef = useRef<Map<string, AudioBuffer>>(new Map())
  const playingSourcesRef = useRef<Map<string, AudioBufferSourceNode>>(new Map())
  const playbackRef = useRef<{ startCtxTime: number; startTimelineTime: number } | null>(null)

  const { exporting, exportStatus, exportWebM } = useMediaStudioExport({ project })

  const activeClip = useMemo(() => {
    if (!selectedClipId) return null
    return project.clips.find(c => c.id === selectedClipId) ?? null
  }, [project.clips, selectedClipId])

  const fades = useMemo(() => computeTransitionFades(project.clips), [project.clips])

  const ensureAudioContext = useCallback(async () => {
    if (audioCtxRef.current) return audioCtxRef.current
    const ctx = new AudioContext()
    const master = ctx.createGain()
    master.gain.value = 1
    master.connect(ctx.destination)
    audioCtxRef.current = ctx
    audioMasterRef.current = master
    return ctx
  }, [])

  const stopScheduledAudio = useCallback(() => {
    for (const [, src] of playingSourcesRef.current.entries()) {
      try { src.stop() } catch { /* ignore */ }
      try { src.disconnect() } catch { /* ignore */ }
    }
    playingSourcesRef.current.clear()
    playbackRef.current = null
  }, [])

  const scheduleAudioFromTime = useCallback(async (timelineTime: number) => {
    const ctx = await ensureAudioContext()
    await ctx.resume()
    const master = audioMasterRef.current
    if (!master) return

    for (const c of project.clips) {
      if (c.type !== 'audio') continue
      if (audioBuffersRef.current.has(c.id)) continue
      audioBuffersRef.current.set(c.id, await decodeAudioBuffer(ctx, c.src))
    }

    const startAt = ctx.currentTime + 0.05
    playbackRef.current = { startCtxTime: startAt, startTimelineTime: timelineTime }

    for (const c of project.clips) {
      if (c.type !== 'audio') continue
      const clipEnd = c.startTime + c.duration
      if (clipEnd <= timelineTime) continue

      const buf = audioBuffersRef.current.get(c.id)
      if (!buf) continue

      const fade = fades.get(c.id) ?? {}

      const src = ctx.createBufferSource()
      src.buffer = buf

      const gainNode = ctx.createGain()
      const baseGain = Math.max(0, c.gain ?? 1)
      gainNode.gain.setValueAtTime(baseGain, startAt)

      const relativeStart = Math.max(0, timelineTime - c.startTime)
      const offset = Math.max(0, c.inPoint + relativeStart)
      const remaining = Math.max(0.05, c.duration - relativeStart)
      const maxPlayable = Math.max(0.05, buf.duration - offset)
      const playDur = Math.min(remaining, maxPlayable)

      const clipStartAt = startAt + Math.max(0, c.startTime - timelineTime)

      const timelinePlaybackEnd = timelineTime + playDur
      const toCtx = (tt: number) => startAt + (tt - timelineTime)
      const scheduleSet = (tt: number, v: number) => {
        if (tt < timelineTime || tt > timelinePlaybackEnd) return
        gainNode.gain.setValueAtTime(v, toCtx(tt))
      }
      const scheduleRamp = (tt: number, v: number) => {
        if (tt < timelineTime || tt > timelinePlaybackEnd) return
        gainNode.gain.linearRampToValueAtTime(v, toCtx(tt))
      }

      const startTimelineT = Math.max(timelineTime, c.startTime)
      gainNode.gain.setValueAtTime(baseGain * computeVisualAlphaAtTime(c, startTimelineT, fades), clipStartAt)

      if (typeof fade.inHoldUntil === 'number' && fade.inHoldUntil > timelineTime) {
        scheduleSet(fade.inHoldUntil, 0)
      }
      if (typeof fade.inStart === 'number' && typeof fade.inEnd === 'number' && fade.inEnd > timelineTime) {
        const startT = Math.max(timelineTime, fade.inStart)
        scheduleSet(startT, baseGain * computeVisualAlphaAtTime(c, startT, fades))
        const endT = Math.min(fade.inEnd, timelinePlaybackEnd)
        if (endT > startT + 0.0001) scheduleRamp(endT, baseGain)
      }

      if (typeof fade.outStart === 'number' && typeof fade.outEnd === 'number' && fade.outEnd > timelineTime) {
        const startT = Math.max(timelineTime, fade.outStart)
        scheduleSet(startT, baseGain * computeVisualAlphaAtTime(c, startT, fades))
        const endT = Math.min(fade.outEnd, timelinePlaybackEnd)
        if (endT > startT + 0.0001) scheduleRamp(endT, 0)
      }
      if (typeof fade.outHoldFrom === 'number' && fade.outHoldFrom > timelineTime) {
        scheduleSet(fade.outHoldFrom, 0)
      }

      src.connect(gainNode)
      gainNode.connect(master)
      src.start(clipStartAt, offset, playDur)

      playingSourcesRef.current.set(c.id, src)
    }
  }, [ensureAudioContext, fades, project.clips])

  const activeTimelineVideoClip = useMemo(() => {
    const videoClips = project.clips
      .filter(c => c.type === 'video')
      .sort((a, b) => a.startTime - b.startTime)

    return (
      videoClips.find(c => currentTime >= c.startTime && currentTime <= c.startTime + c.duration) ??
      (selectedClipId ? project.clips.find(c => c.id === selectedClipId && c.type === 'video') ?? null : null)
    )
  }, [project.clips, currentTime, selectedClipId])

  const preview = useMemo(() => {
    if (!selectedAssetId && !activeTimelineVideoClip && !activeClip) return { kind: null as MediaKind | null, src: undefined as string | undefined }

    const asset = selectedAssetId ? project.assets.find(a => a.id === selectedAssetId) : undefined

    if (activeTimelineVideoClip) return { kind: 'video' as const, src: activeTimelineVideoClip.src }
    if (activeClip?.type === 'audio') return { kind: 'audio' as const, src: activeClip.src }
    if (activeClip?.type === 'image') return { kind: 'image' as const, src: activeClip.src }

    return { kind: asset?.kind ?? null, src: asset?.src }
  }, [project.assets, selectedAssetId, activeTimelineVideoClip, activeClip])

  const previewVideoTime = useMemo(() => {
    if (!activeTimelineVideoClip) return 0
    const t = activeTimelineVideoClip.inPoint + (currentTime - activeTimelineVideoClip.startTime)
    return Math.max(activeTimelineVideoClip.inPoint, Math.min(activeTimelineVideoClip.outPoint, t))
  }, [activeTimelineVideoClip, currentTime])

  useEffect(() => {
    if (!path) return

    const kind = inferMediaKindFromPath(path)
    if (!kind) return

    const src = resolveSrcFromWorkspacePath(path)
    const name = path.split('/').pop() || 'asset'

    setProject(prev => {
      const already = prev.assets.some(a => a.originPath === path)
      if (already) return prev

      const assetId = `asset-${Date.now()}`
      const asset: MediaAsset = { id: assetId, name, kind, src, originPath: path }

      const clipId = `clip-${Date.now()}`
      const clipBase: VideoClip & { peaks?: number[]; gain?: number; effects?: ClipEffect[]; crossfade?: number; transition?: TransitionType } = {
        id: clipId,
        name,
        src,
        startTime: 0,
        duration: kind === 'image' ? 5 : 10,
        inPoint: 0,
        outPoint: kind === 'image' ? 5 : 10,
        trackIndex: kind === 'audio' ? 1 : 0,
        type: kind,
        gain: 1,
        effects: [{ type: 'opacity', value: 1 }],
        crossfade: 0.5,
        transition: 'crossfade',
      }

      const next = {
        ...prev,
        assets: [...prev.assets, asset],
        clips: [...prev.clips, clipBase],
        duration: Math.max(prev.duration, clipBase.startTime + clipBase.duration + 1),
      }

      return next
    })
  }, [path, setProject])

  useEffect(() => {
    if (!selectedAssetId && project.assets.length > 0) {
      setSelectedAssetId(project.assets[project.assets.length - 1].id)
    }
    if (!selectedClipId && project.clips.length > 0) {
      setSelectedClipId(project.clips[project.clips.length - 1].id)
    }
  }, [project.assets, project.clips, selectedAssetId, selectedClipId, setSelectedAssetId, setSelectedClipId])

  useEffect(() => {
    const audioClipsWithoutPeaks = project.clips.filter(c => c.type === 'audio' && !c.peaks)
    if (audioClipsWithoutPeaks.length === 0) return

    let cancelled = false

    ;(async () => {
      for (const clip of audioClipsWithoutPeaks) {
        const peaks = await computeAudioPeaksFromUrl(clip.src, 1200)
        if (cancelled) return
        if (!peaks) continue

        setProject(prev => ({
          ...prev,
          clips: prev.clips.map(c => (c.id === clip.id ? { ...c, peaks } : c)),
        }))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [project.clips, setProject])

  const handleImportLocal = useCallback((file: File) => {
    const kind = inferMediaKindFromPath(file.name)
    if (!kind) return

    const src = URL.createObjectURL(file)
    const name = file.name

    setProject(prev => {
      const assetId = `asset-${Date.now()}`
      const asset: MediaAsset = { id: assetId, name, kind, src }

      const clipId = `clip-${Date.now()}`
      const clip: VideoClip & { peaks?: number[]; gain?: number; effects?: ClipEffect[]; crossfade?: number; transition?: TransitionType } = {
        id: clipId,
        name,
        src,
        startTime: 0,
        duration: kind === 'image' ? 5 : 10,
        inPoint: 0,
        outPoint: kind === 'image' ? 5 : 10,
        trackIndex: kind === 'audio' ? 1 : 0,
        type: kind,
        gain: 1,
        effects: [{ type: 'opacity', value: 1 }],
        crossfade: 0.5,
        transition: 'crossfade',
      }

      return {
        ...prev,
        assets: [...prev.assets, asset],
        clips: [...prev.clips, clip],
        duration: Math.max(prev.duration, clip.startTime + clip.duration + 1),
      }
    })
  }, [setProject])

  const handleClipMove = useCallback((clipId: string, startTime: number, trackIndex: number) => {
    setProject(prev => {
      const clips = prev.clips.map(c => (c.id === clipId ? { ...c, startTime, trackIndex } : c))
      const newDuration = clips.reduce((max, c) => Math.max(max, c.startTime + c.duration), 0)
      return { ...prev, clips, duration: Math.max(prev.duration, newDuration + 1) }
    })
  }, [setProject])

  const handleClipTrim = useCallback((clipId: string, inPoint: number, outPoint: number) => {
    setProject(prev => {
      const clips = prev.clips.map(c => {
        if (c.id !== clipId) return c
        const newDuration = Math.max(0.1, outPoint - inPoint)
        return { ...c, inPoint, outPoint, duration: newDuration }
      })
      const newDuration = clips.reduce((max, c) => Math.max(max, c.startTime + c.duration), 0)
      return { ...prev, clips, duration: Math.max(prev.duration, newDuration + 1) }
    })
  }, [setProject])

  const handleClipSelect = useCallback((clipId: string | null) => {
    setSelectedClipId(clipId)
    if (!clipId) return

    const clip = project.clips.find(c => c.id === clipId)
    if (!clip) return

    const asset = project.assets.find(a => a.src === clip.src)
    if (asset) setSelectedAssetId(asset.id)
  }, [project.assets, project.clips, setSelectedAssetId, setSelectedClipId])

  useEffect(() => {
    if (!isPlaying) return

    let raf = 0
    const tick = () => {
      const ctx = audioCtxRef.current
      const ref = playbackRef.current
      if (ctx && ref) {
        const t = ref.startTimelineTime + Math.max(0, ctx.currentTime - ref.startCtxTime)
        setCurrentTime(() => {
          const next = Math.min(project.duration, t)
          if (next >= project.duration) {
            setIsPlaying(false)
            stopScheduledAudio()
          }
          return next
        })
      }
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isPlaying, project.duration, stopScheduledAudio])


  useEffect(() => {
    if (preview.kind !== 'audio' || !preview.src) return

    if (!audioElRef.current) {
      audioElRef.current = new Audio()
    }

    const el = audioElRef.current
    el.src = preview.src

    const onTime = () => {
      const p = el.duration ? el.currentTime / el.duration : 0
      setAudioProgress(p)
    }

    el.addEventListener('timeupdate', onTime)
    return () => el.removeEventListener('timeupdate', onTime)
  }, [preview.kind, preview.src])

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev)
  }, [])

  const stop = useCallback(() => {
    setIsPlaying(false)
    setCurrentTime(0)
    stopScheduledAudio()
  }, [stopScheduledAudio])

  useEffect(() => {
    if (isPlaying) {
      stopScheduledAudio()
      scheduleAudioFromTime(currentTime)
    } else {
      stopScheduledAudio()
    }
  }, [isPlaying, currentTime, scheduleAudioFromTime, stopScheduledAudio])

  const selectedClip = activeClip


  return (
    <div className="h-full w-full flex flex-col bg-[var(--aethel-surface-primary)]">
      <MediaStudioToolbar
        currentTime={currentTime}
        duration={project.duration}
        exporting={exporting}
        exportStatus={exportStatus}
        isPlaying={isPlaying}
        zoom={zoom}
        onExport={exportWebM}
        onImport={handleImportLocal}
        onSetZoom={setZoom}
        onStop={stop}
        onTogglePlay={togglePlay}
      />

      <div className="flex-1 flex min-h-0">
        <MediaStudioAssetBin
          assets={project.assets}
          selectedAssetId={selectedAssetId}
          onSelectAsset={setSelectedAssetId}
        />

        <div className="flex-1 flex flex-col min-h-0">
          <MediaStudioPreviewPanel
            activeTimelineVideoClip={activeTimelineVideoClip}
            audioProgress={audioProgress}
            currentTime={currentTime}
            duration={project.duration}
            isPlaying={isPlaying}
            onAudioPause={() => audioElRef.current?.pause()}
            onAudioPlay={() => { void audioElRef.current?.play() }}
            onAudioSeek={(position) => {
              const el = audioElRef.current
              if (!el || !el.duration) return
              el.currentTime = el.duration * position
            }}
            onSetCurrentTime={setCurrentTime}
            preview={preview}
            previewVideoTime={previewVideoTime}
          />

          <div className="border-t border-[var(--aethel-border-primary)] p-3 bg-[color-mix(in_srgb,var(--aethel-surface-primary)_70%,transparent)]">
            <VideoTimeline
              tracks={project.tracks}
              clips={project.clips}
              duration={project.duration}
              currentTime={currentTime}
              zoom={zoom}
              onTimeChange={setCurrentTime}
              onClipMove={handleClipMove}
              onClipTrim={handleClipTrim}
              onClipSelect={handleClipSelect}
              selectedClipId={selectedClipId}
            />
          </div>
        </div>

        <div className="w-80 border-l border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] overflow-auto">
          <MediaStudioInspectorPanel
            currentTime={currentTime}
            selectedClip={selectedClip}
            setProject={setProject}
          />
          <MediaStudioMixerPanel clips={project.clips} setProject={setProject} />
        </div>
      </div>
    </div>
  )
}
