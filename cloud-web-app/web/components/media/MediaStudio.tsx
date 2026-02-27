'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type VideoClip } from '../video/VideoTimeline'
import type { ClipEffect, TimelineClip } from '../../lib/video-encoder-real'
import { MediaStudioWorkspace } from './MediaStudioWorkspace'
import { MediaStudioInspector, MediaStudioMixer } from './MediaStudio.sidebar'
import { createMediaStudioInitialProject } from './MediaStudio.initial-project'
import {
  applyEffectsToContext,
  clamp01,
  computeAudioPeaksFromUrl,
  computeTransitionFades,
  computeVisualAlphaAtTime,
  decodeAudioBuffer,
  drawFitContain,
  formatTime,
  inferMediaKindFromPath,
  resolveSrcFromWorkspacePath,
  timelineToRendererClips,
  type MediaAsset,
  type MediaKind,
  type MediaProject,
  type Props,
  type TransitionType,
} from './MediaStudio.utils'
export default function MediaStudio({ path }: Props) {
  const initialProject = useMemo<MediaProject>(() => createMediaStudioInitialProject(), [])
  const [project, setProject] = useState<MediaProject>(initialProject)
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null)
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
  const [exporting, setExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<string>('')
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null)

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
  }, [path])

  useEffect(() => {
    if (!selectedAssetId && project.assets.length > 0) {
      setSelectedAssetId(project.assets[project.assets.length - 1].id)
    }
    if (!selectedClipId && project.clips.length > 0) {
      setSelectedClipId(project.clips[project.clips.length - 1].id)
    }
  }, [project.assets, project.clips, selectedAssetId, selectedClipId])

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
  }, [project.clips])

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
  }, [])

  const handleClipMove = useCallback((clipId: string, startTime: number, trackIndex: number) => {
    setProject(prev => {
      const clips = prev.clips.map(c => (c.id === clipId ? { ...c, startTime, trackIndex } : c))
      const newDuration = clips.reduce((max, c) => Math.max(max, c.startTime + c.duration), 0)
      return { ...prev, clips, duration: Math.max(prev.duration, newDuration + 1) }
    })
  }, [])

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
  }, [])

  const handleClipSelect = useCallback((clipId: string | null) => {
    setSelectedClipId(clipId)
    if (!clipId) return

    const clip = project.clips.find(c => c.id === clipId)
    if (!clip) return

    const asset = project.assets.find(a => a.src === clip.src)
    if (asset) setSelectedAssetId(asset.id)
  }, [project.assets, project.clips])

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

  const exportWebM = useCallback(async () => {
    if (exporting) return
    setExporting(true)
    setExportStatus('Preparando export...')

    const fps = 30
    const width = 1280
    const height = 720

    try {
      if (!exportCanvasRef.current) {
        const c = document.createElement('canvas')
        c.width = width
        c.height = height
        exportCanvasRef.current = c
      }
      const canvas = exportCanvasRef.current
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas 2D indisponível')

      setExportStatus('Carregando mídia...')

      const rendererClips = timelineToRendererClips(project.clips)
      const imageBitmaps = new Map<string, ImageBitmap>()
      const videoEls = new Map<string, HTMLVideoElement>()

      const ensureVideoEl = async (src: string) => {
        if (videoEls.has(src)) return videoEls.get(src)!
        const v = document.createElement('video')
        v.src = src
        v.crossOrigin = 'anonymous'
        v.muted = true
        v.playsInline = true
        await new Promise<void>((resolve, reject) => {
          const onLoaded = () => resolve()
          const onErr = () => reject(new Error('Falha ao carregar vídeo: ' + src))
          v.addEventListener('loadedmetadata', onLoaded, { once: true })
          v.addEventListener('error', onErr, { once: true })
        })
        videoEls.set(src, v)
        return v
      }

      const ensureImage = async (src: string) => {
        if (imageBitmaps.has(src)) return imageBitmaps.get(src)!
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.src = src
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve()
          img.onerror = () => reject(new Error('Falha ao carregar imagem: ' + src))
        })
        const bitmap = await createImageBitmap(img)
        imageBitmaps.set(src, bitmap)
        return bitmap
      }

      for (const c of rendererClips) {
        const kind = project.clips.find(cc => cc.id === c.id)?.type
        if (kind === 'image') await ensureImage(c.source as string)
        if (kind === 'video') await ensureVideoEl(c.source as string)
      }

      setExportStatus('Preparando áudio...')
      const audioContext = new AudioContext()
      const destination = audioContext.createMediaStreamDestination()
      const masterGain = audioContext.createGain()
      masterGain.gain.value = 1
      masterGain.connect(destination)

      const exportFades = computeTransitionFades(project.clips)

      const audioClips = project.clips.filter(c => c.type === 'audio')
      const audioBuffers = new Map<string, AudioBuffer>()
      for (const c of audioClips) {
        audioBuffers.set(c.id, await decodeAudioBuffer(audioContext, c.src))
      }

      const stream = canvas.captureStream(fps)
      const mixed = new MediaStream([
        ...stream.getVideoTracks(),
        ...destination.stream.getAudioTracks(),
      ])

      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ]
      const chosen = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) || 'video/webm'

      const recorder = new MediaRecorder(mixed, {
        mimeType: chosen,
        videoBitsPerSecond: 8_000_000,
        audioBitsPerSecond: 192_000,
      })

      const chunks: Blob[] = []
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data)
      }

      const startAt = audioContext.currentTime + 0.25
      for (const c of audioClips) {
        const buf = audioBuffers.get(c.id)
        if (!buf) continue

        const fade = exportFades.get(c.id) ?? {}

        const gain = audioContext.createGain()
        const baseGain = Math.max(0, c.gain ?? 1)
        gain.gain.value = baseGain
        gain.connect(masterGain)

        const src = audioContext.createBufferSource()
        src.buffer = buf
        src.connect(gain)

        const clipStart = startAt + c.startTime
        const offset = Math.max(0, c.inPoint)
        const dur = Math.max(0.05, c.duration)

        const playDur = Math.min(dur, Math.max(0.05, buf.duration - offset))

        const timelinePlaybackStart = c.startTime
        const timelinePlaybackEnd = c.startTime + playDur
        const toCtx = (tt: number) => startAt + tt
        const scheduleSet = (tt: number, v: number) => {
          if (tt < timelinePlaybackStart || tt > timelinePlaybackEnd) return
          gain.gain.setValueAtTime(v, toCtx(tt))
        }
        const scheduleRamp = (tt: number, v: number) => {
          if (tt < timelinePlaybackStart || tt > timelinePlaybackEnd) return
          gain.gain.linearRampToValueAtTime(v, toCtx(tt))
        }

        scheduleSet(timelinePlaybackStart, baseGain * computeVisualAlphaAtTime(c, timelinePlaybackStart, exportFades))

        if (typeof fade.inHoldUntil === 'number') {
          scheduleSet(fade.inHoldUntil, 0)
        }
        if (typeof fade.inStart === 'number' && typeof fade.inEnd === 'number') {
          scheduleSet(fade.inStart, baseGain * computeVisualAlphaAtTime(c, fade.inStart, exportFades))
          scheduleRamp(fade.inEnd, baseGain)
        }

        if (typeof fade.outStart === 'number' && typeof fade.outEnd === 'number') {
          scheduleSet(fade.outStart, baseGain * computeVisualAlphaAtTime(c, fade.outStart, exportFades))
          scheduleRamp(fade.outEnd, 0)
        }
        if (typeof fade.outHoldFrom === 'number') {
          scheduleSet(fade.outHoldFrom, 0)
        }

        src.start(clipStart, offset, playDur)
      }

      setExportStatus('Exportando (tempo real)...')
      recorder.start(250)

      const started = performance.now()
      const total = project.duration

      const visualFades = exportFades

      await new Promise<void>((resolve) => {
        const tick = async () => {
          const elapsed = (performance.now() - started) / 1000
          const t = Math.min(total, elapsed)

          ctx.save()
          ctx.filter = 'none'
          ctx.globalAlpha = 1
          ctx.fillStyle = '#000000'
          ctx.fillRect(0, 0, width, height)

          const active = project.clips
            .filter(c => t >= c.startTime && t <= c.startTime + c.duration)
            .sort((a, b) => (a.trackIndex - b.trackIndex) || (a.startTime - b.startTime))

          for (const clip of active) {
            if (clip.type === 'audio') continue

            const baseOpacity = clamp01(getEffectValue(clip.effects, 'opacity', 1))
            const fadeAlpha = computeVisualAlphaAtTime(clip, t, visualFades)
            ctx.globalAlpha = baseOpacity * fadeAlpha
            applyEffectsToContext(ctx, clip.effects)

            if (clip.type === 'image') {
              const bmp = imageBitmaps.get(clip.src)
              if (bmp) drawFitContain(ctx, bmp, width, height)
            } else if (clip.type === 'video') {
              const v = videoEls.get(clip.src)
              if (v) {
                const local = clip.inPoint + (t - clip.startTime)
                if (Math.abs(v.currentTime - local) > 0.08) {
                  try { v.currentTime = local } catch { /* ignore */ }
                }
                drawFitContain(ctx, v, width, height)
              }
            }
          }

          ctx.restore()

          setExportStatus(`Exportando... ${Math.floor((t / total) * 100)}%`)

          if (t >= total) {
            resolve()
            return
          }

          setTimeout(tick, 1000 / fps)
        }

        tick()
      })

      recorder.stop()

      const blob = await new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: chosen }))
        recorder.onerror = () => reject(new Error('Falha no MediaRecorder'))
      })

      setExportStatus('Finalizando...')

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'aethel-export.webm'
      a.click()
      URL.revokeObjectURL(url)

      try {
        await audioContext.close()
      } catch {
      }
    } catch (err) {
      console.error(err)
      setExportStatus('Erro no export')
    } finally {
      setExporting(false)
      setTimeout(() => setExportStatus(''), 1500)
    }
  }, [exporting, project.clips, project.duration])

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

  const inspector = (
    <MediaStudioInspector
      selectedClip={selectedClip}
      currentTime={currentTime}
      setProject={setProject}
    />
  )

  const mixer = (
    <MediaStudioMixer
      clips={project.clips}
      setProject={setProject}
    />
  )

  return (
    <MediaStudioWorkspace
      project={project}
      currentTime={currentTime}
      zoom={zoom}
      exporting={exporting}
      exportStatus={exportStatus}
      isPlaying={isPlaying}
      selectedAssetId={selectedAssetId}
      preview={preview}
      previewVideoTime={previewVideoTime}
      activeTimelineVideoClip={activeTimelineVideoClip}
      audioProgress={audioProgress}
      audioElRef={audioElRef}
      inspector={inspector}
      mixer={mixer}
      onTogglePlay={togglePlay}
      onStop={stop}
      onExportWebM={exportWebM}
      onZoomChange={setZoom}
      onImportLocal={handleImportLocal}
      onSelectAsset={setSelectedAssetId}
      onTimeChange={setCurrentTime}
      onClipMove={handleClipMove}
      onClipTrim={handleClipTrim}
      onClipSelect={handleClipSelect}
      selectedClipId={selectedClipId}
      formatTime={formatTime}
    />
  )
}
