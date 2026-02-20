'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { VideoPreview, VideoTimeline, type TimelineTrack, type VideoClip } from '../video/VideoTimeline'
import { ImageEditor } from '../image/ImageEditor'
import WaveformRenderer, { MixerChannel } from '../audio/AudioEngine'
import type { ClipEffect, TimelineClip } from '../../lib/video-encoder-real'
import {
  applyEffectsToContext,
  clamp01,
  computeAudioPeaksFromUrl,
  computeTransitionFades,
  computeVisualAlphaAtTime,
  decodeAudioBuffer,
  drawFitContain,
  formatTime,
  getEffectValue,
  inferMediaKindFromPath,
  resolveSrcFromWorkspacePath,
  timelineToRendererClips,
  upsertEffect,
  type MediaAsset,
  type MediaKind,
  type MediaProject,
  type Props,
  type TransitionType,
} from './MediaStudio.utils'
export default function MediaStudio({ path }: Props) {
  const initialProject = useMemo<MediaProject>(() => {
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
  }, [])

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

    // Cache de buffers
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

      // valor inicial no momento em que este source começa
      const startTimelineT = Math.max(timelineTime, c.startTime)
      gainNode.gain.setValueAtTime(baseGain * computeVisualAlphaAtTime(c, startTimelineT, fades), clipStartAt)

      // Fade-in / hold (transições por overlap)
      if (typeof fade.inHoldUntil === 'number' && fade.inHoldUntil > timelineTime) {
        scheduleSet(fade.inHoldUntil, 0)
      }
      if (typeof fade.inStart === 'number' && typeof fade.inEnd === 'number' && fade.inEnd > timelineTime) {
        const startT = Math.max(timelineTime, fade.inStart)
        scheduleSet(startT, baseGain * computeVisualAlphaAtTime(c, startT, fades))
        const endT = Math.min(fade.inEnd, timelinePlaybackEnd)
        if (endT > startT + 0.0001) scheduleRamp(endT, baseGain)
      }

      // Fade-out / hold
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
    // Clip de vídeo que contém o playhead (prioriza track de vídeo)
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

  // Auto-import do arquivo aberto pelo IDE
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

      // adiciona um clip inicial (fluxo rápido)
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

  // Seleciona asset/clip inicial automaticamente
  useEffect(() => {
    if (!selectedAssetId && project.assets.length > 0) {
      setSelectedAssetId(project.assets[project.assets.length - 1].id)
    }
    if (!selectedClipId && project.clips.length > 0) {
      setSelectedClipId(project.clips[project.clips.length - 1].id)
    }
  }, [project.assets, project.clips, selectedAssetId, selectedClipId])

  // Peaks reais para clips de áudio (sem mock)
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

    // tenta sincronizar seleção de asset com clip
    const asset = project.assets.find(a => a.src === clip.src)
    if (asset) setSelectedAssetId(asset.id)
  }, [project.assets, project.clips])

  // Playback sincronizado com WebAudio (clock estável)
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
      // Canvas para render
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

      // Pré-carregar fontes (imagens e vídeos)
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
        // força metadata
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

      // Áudio: mix real via WebAudio + MediaStreamDestination
      setExportStatus('Preparando áudio...')
      const audioContext = new AudioContext()
      const destination = audioContext.createMediaStreamDestination()
      const masterGain = audioContext.createGain()
      masterGain.gain.value = 1
      masterGain.connect(destination)

      const exportFades = computeTransitionFades(project.clips)

      // decodifica buffers (apenas os clips de áudio)
      const audioClips = project.clips.filter(c => c.type === 'audio')
      const audioBuffers = new Map<string, AudioBuffer>()
      for (const c of audioClips) {
        audioBuffers.set(c.id, await decodeAudioBuffer(audioContext, c.src))
      }

      // Stream combinado
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

        // valor inicial no início deste clip
        scheduleSet(timelinePlaybackStart, baseGain * computeVisualAlphaAtTime(c, timelinePlaybackStart, exportFades))

        // Fade-in / hold (transições por overlap)
        if (typeof fade.inHoldUntil === 'number') {
          scheduleSet(fade.inHoldUntil, 0)
        }
        if (typeof fade.inStart === 'number' && typeof fade.inEnd === 'number') {
          scheduleSet(fade.inStart, baseGain * computeVisualAlphaAtTime(c, fade.inStart, exportFades))
          scheduleRamp(fade.inEnd, baseGain)
        }

        // Fade-out / hold
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

      // Render loop em tempo real
      await new Promise<void>((resolve) => {
        const tick = async () => {
          const elapsed = (performance.now() - started) / 1000
          const t = Math.min(total, elapsed)

          // fundo
          ctx.save()
          ctx.filter = 'none'
          ctx.globalAlpha = 1
          ctx.fillStyle = '#000000'
          ctx.fillRect(0, 0, width, height)

          // desenha clips ativos por track (ordem por track e start)
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
                // seek best-effort
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
        // ignore
      }
    } catch (err) {
      console.error(err)
      setExportStatus('Erro no export')
    } finally {
      setExporting(false)
      setTimeout(() => setExportStatus(''), 1500)
    }
  }, [exporting, project.clips, project.duration])

  // Áudio preview quando selecionado
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

  // Start/stop de áudio conforme play/pause
  useEffect(() => {
    if (isPlaying) {
      stopScheduledAudio()
      scheduleAudioFromTime(currentTime)
    } else {
      stopScheduledAudio()
    }
  }, [isPlaying, currentTime, scheduleAudioFromTime, stopScheduledAudio])

  const selectedClip = activeClip

  const inspector = useMemo(() => {
    if (!selectedClip) return null

    const isAudio = selectedClip.type === 'audio'
    const isVisual = selectedClip.type === 'video' || selectedClip.type === 'image'

    return (
      <div className="p-3 space-y-3">
        <div className="text-sm font-semibold text-slate-200">Inspector</div>

        <div className="space-y-1">
          <div className="text-xs text-slate-400">Clip</div>
          <div className="text-sm text-slate-200 truncate">{selectedClip.name}</div>
          <div className="text-xs text-slate-500">{selectedClip.type.toUpperCase()}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-slate-400">
            Start
            <input
              className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
              type="number"
              step="0.1"
              value={selectedClip.startTime}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                setProject(prev => ({
                  ...prev,
                  clips: prev.clips.map(c => (c.id === selectedClip.id ? { ...c, startTime: Number.isFinite(v) ? v : c.startTime } : c)),
                }))
              }}
            />
          </label>

          <label className="text-xs text-slate-400">
            Duration
            <input
              className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
              type="number"
              step="0.1"
              value={selectedClip.duration}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                setProject(prev => ({
                  ...prev,
                  clips: prev.clips.map(c => (c.id === selectedClip.id ? { ...c, duration: Number.isFinite(v) ? v : c.duration, outPoint: Number.isFinite(v) ? c.inPoint + v : c.outPoint } : c)),
                }))
              }}
            />
          </label>

          <label className="text-xs text-slate-400">
            In
            <input
              className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
              type="number"
              step="0.1"
              value={selectedClip.inPoint}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                setProject(prev => ({
                  ...prev,
                  clips: prev.clips.map(c => (c.id === selectedClip.id ? { ...c, inPoint: Number.isFinite(v) ? v : c.inPoint } : c)),
                }))
              }}
            />
          </label>

          <label className="text-xs text-slate-400">
            Out
            <input
              className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
              type="number"
              step="0.1"
              value={selectedClip.outPoint}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                setProject(prev => ({
                  ...prev,
                  clips: prev.clips.map(c => (c.id === selectedClip.id ? { ...c, outPoint: Number.isFinite(v) ? v : c.outPoint } : c)),
                }))
              }}
            />
          </label>

          {isAudio && (
            <label className="col-span-2 text-xs text-slate-400">
              Gain
              <input
                className="mt-1 w-full"
                type="range"
                min="0"
                max="2"
                step="0.01"
                value={selectedClip.gain ?? 1}
                onChange={(e) => {
                  const v = parseFloat(e.target.value)
                  setProject(prev => ({
                    ...prev,
                    clips: prev.clips.map(c => (c.id === selectedClip.id ? { ...c, gain: Number.isFinite(v) ? v : (c.gain ?? 1) } : c)),
                  }))
                }}
              />
            </label>
          )}

          <label className="col-span-2 text-xs text-slate-400">
            Transition (overlap)
            <select
              className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
              value={selectedClip.transition ?? 'crossfade'}
              onChange={(e) => {
                const v = e.target.value as TransitionType
                setProject(prev => ({
                  ...prev,
                  clips: prev.clips.map(c => (c.id === selectedClip.id ? { ...c, transition: v } : c)),
                }))
              }}
            >
              <option value="crossfade">Crossfade</option>
              <option value="dipToBlack">Dip to Black</option>
            </select>
          </label>

          <label className="col-span-2 text-xs text-slate-400">
            Crossfade (overlap)
            <input
              className="mt-1 w-full"
              type="range"
              min="0"
              max="5"
              step="0.05"
              value={selectedClip.crossfade ?? 0.5}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                setProject(prev => ({
                  ...prev,
                  clips: prev.clips.map(c => (c.id === selectedClip.id ? { ...c, crossfade: Number.isFinite(v) ? v : (c.crossfade ?? 0.5) } : c)),
                }))
              }}
            />
          </label>

          {isVisual && (
            <label className="col-span-2 text-xs text-slate-400">
              Opacity
              <input
                className="mt-1 w-full"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={getEffectValue(selectedClip.effects, 'opacity', 1)}
                onChange={(e) => {
                  const v = parseFloat(e.target.value)
                  setProject(prev => ({
                    ...prev,
                    clips: prev.clips.map(c => (c.id === selectedClip.id
                      ? { ...c, effects: upsertEffect(c.effects, { type: 'opacity', value: Number.isFinite(v) ? v : 1 }) }
                      : c
                    )),
                  }))
                }}
              />
            </label>
          )}

          {isVisual && (
            <label className="col-span-2 text-xs text-slate-400">
              Color (Brightness / Contrast / Saturation)
              <div className="mt-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-16 text-[11px] text-slate-500">Bright</span>
                  <input
                    className="flex-1"
                    type="range"
                    min="0"
                    max="2"
                    step="0.01"
                    value={getEffectValue(selectedClip.effects, 'brightness', 1)}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value)
                      setProject(prev => ({
                        ...prev,
                        clips: prev.clips.map(c => (c.id === selectedClip.id
                          ? { ...c, effects: upsertEffect(c.effects, { type: 'brightness', value: Number.isFinite(v) ? v : 1 }) }
                          : c
                        )),
                      }))
                    }}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-16 text-[11px] text-slate-500">Contrast</span>
                  <input
                    className="flex-1"
                    type="range"
                    min="0"
                    max="2"
                    step="0.01"
                    value={getEffectValue(selectedClip.effects, 'contrast', 1)}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value)
                      setProject(prev => ({
                        ...prev,
                        clips: prev.clips.map(c => (c.id === selectedClip.id
                          ? { ...c, effects: upsertEffect(c.effects, { type: 'contrast', value: Number.isFinite(v) ? v : 1 }) }
                          : c
                        )),
                      }))
                    }}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-16 text-[11px] text-slate-500">Saturate</span>
                  <input
                    className="flex-1"
                    type="range"
                    min="0"
                    max="3"
                    step="0.01"
                    value={getEffectValue(selectedClip.effects, 'saturation', 1)}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value)
                      setProject(prev => ({
                        ...prev,
                        clips: prev.clips.map(c => (c.id === selectedClip.id
                          ? { ...c, effects: upsertEffect(c.effects, { type: 'saturation', value: Number.isFinite(v) ? v : 1 }) }
                          : c
                        )),
                      }))
                    }}
                  />
                </div>
              </div>
            </label>
          )}

          {isVisual && (
            <label className="col-span-2 text-xs text-slate-400">
              Blur / Grayscale
              <div className="mt-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-16 text-[11px] text-slate-500">Blur</span>
                  <input
                    className="flex-1"
                    type="range"
                    min="0"
                    max="16"
                    step="0.1"
                    value={getEffectValue(selectedClip.effects, 'blur', 0)}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value)
                      setProject(prev => ({
                        ...prev,
                        clips: prev.clips.map(c => (c.id === selectedClip.id
                          ? { ...c, effects: upsertEffect(c.effects, { type: 'blur', value: Number.isFinite(v) ? v : 0 }) }
                          : c
                        )),
                      }))
                    }}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-16 text-[11px] text-slate-500">Gray</span>
                  <input
                    className="flex-1"
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={getEffectValue(selectedClip.effects, 'grayscale', 0)}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value)
                      setProject(prev => ({
                        ...prev,
                        clips: prev.clips.map(c => (c.id === selectedClip.id
                          ? { ...c, effects: upsertEffect(c.effects, { type: 'grayscale', value: Number.isFinite(v) ? v : 0 }) }
                          : c
                        )),
                      }))
                    }}
                  />
                </div>
              </div>
            </label>
          )}
        </div>

        <div className="text-xs text-slate-500 font-mono">Playhead: {formatTime(currentTime)}</div>
      </div>
    )
  }, [selectedClip, currentTime])

  const mixer = useMemo(() => {
    const audioClips = project.clips.filter(c => c.type === 'audio')
    if (audioClips.length === 0) return null

    return (
      <div className="p-3">
        <div className="text-sm font-semibold text-slate-200 mb-2">Mixer</div>
        <div className="flex gap-2 overflow-x-auto">
          {audioClips.map((c) => (
            <MixerChannel
              key={c.id}
              name={c.name}
              volume={Math.min(1, Math.max(0, (c.gain ?? 1) / 2))}
              pan={0}
              muted={false}
              solo={false}
              peakLevel={0}
              onVolumeChange={(vol) => {
                const gain = vol * 2
                setProject(prev => ({
                  ...prev,
                  clips: prev.clips.map(cc => (cc.id === c.id ? { ...cc, gain } : cc)),
                }))
              }}
              onPanChange={() => {}}
              onMuteToggle={() => {}}
              onSoloToggle={() => {}}
            />
          ))}
        </div>
      </div>
    )
  }, [project.clips])

  return (
    <div className="h-full w-full flex flex-col bg-slate-900">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800 bg-slate-900">
        <div className="text-sm font-semibold text-slate-200">Media Studio</div>

        <button
          className="ml-3 px-3 py-1 rounded bg-slate-800 text-slate-200 text-sm hover:bg-slate-700"
          onClick={togglePlay}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          className="px-3 py-1 rounded bg-slate-800 text-slate-200 text-sm hover:bg-slate-700"
          onClick={stop}
        >
          Stop
        </button>

        <button
          className="px-3 py-1 rounded bg-slate-800 text-slate-200 text-sm hover:bg-slate-700 disabled:opacity-50"
          onClick={exportWebM}
          disabled={exporting}
        >
          {exporting ? 'Exportando...' : 'Exportar WebM'}
        </button>

        {exportStatus && (
          <div className="text-xs text-slate-400">{exportStatus}</div>
        )}

        <div className="ml-3 text-xs text-slate-400 font-mono">
          {formatTime(currentTime)} / {formatTime(project.duration)}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <label className="text-xs text-slate-400 flex items-center gap-2">
            Zoom
            <input
              type="range"
              min={20}
              max={200}
              value={zoom}
              onChange={(e) => setZoom(parseInt(e.target.value, 10))}
            />
          </label>

          <label className="px-3 py-1 rounded bg-slate-800 text-slate-200 text-sm hover:bg-slate-700 cursor-pointer">
            Importar
            <input
              className="hidden"
              type="file"
              accept="audio/*,video/*,image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                handleImportLocal(file)
                e.currentTarget.value = ''
              }}
            />
          </label>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="w-64 border-r border-slate-800 bg-slate-950/30">
          <div className="px-3 py-2 text-xs text-slate-400 border-b border-slate-800">Assets</div>
          <div className="p-2 space-y-1 overflow-auto h-full">
            {project.assets.length === 0 ? (
              <div className="text-sm text-slate-500 p-2">
                Importe um arquivo de mídia (imagem/áudio/vídeo) para começar.
              </div>
            ) : (
              project.assets.map(a => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAssetId(a.id)}
                  className={
                    'w-full text-left px-2 py-1.5 rounded border ' +
                    (selectedAssetId === a.id
                      ? 'bg-slate-800 border-slate-700 text-slate-100'
                      : 'bg-transparent border-transparent hover:bg-slate-800/50 text-slate-300')
                  }
                >
                  <div className="text-sm truncate">{a.name}</div>
                  <div className="text-xs text-slate-500">{a.kind.toUpperCase()}</div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 min-h-0 p-3">
            <div className="h-full bg-slate-950/30 border border-slate-800 rounded">
              {preview.kind === 'video' ? (
                <div className="p-3">
                  <VideoPreview
                    src={preview.src}
                    currentTime={previewVideoTime}
                    isPlaying={isPlaying}
                    onTimeUpdate={(videoTime) => {
                      if (!activeTimelineVideoClip) return
                      const timelineT = activeTimelineVideoClip.startTime + (videoTime - activeTimelineVideoClip.inPoint)
                      setCurrentTime(Math.max(0, Math.min(project.duration, timelineT)))
                    }}
                  />
                </div>
              ) : preview.kind === 'image' ? (
                <div className="h-full">
                  <ImageEditor width={980} height={640} initialImage={preview.src} />
                </div>
              ) : preview.kind === 'audio' ? (
                <div className="p-3">
                  <WaveformRenderer
                    audioUrl={preview.src}
                    width={900}
                    height={180}
                    progress={audioProgress}
                    onSeek={(pos) => {
                      const el = audioElRef.current
                      if (!el || !el.duration) return
                      el.currentTime = el.duration * pos
                    }}
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      className="px-3 py-1 rounded bg-slate-800 text-slate-200 text-sm hover:bg-slate-700"
                      onClick={() => {
                        const el = audioElRef.current
                        if (!el) return
                        el.play()
                      }}
                    >
                      Play Audio
                    </button>
                    <button
                      className="px-3 py-1 rounded bg-slate-800 text-slate-200 text-sm hover:bg-slate-700"
                      onClick={() => {
                        const el = audioElRef.current
                        if (!el) return
                        el.pause()
                      }}
                    >
                      Pause Audio
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500">
                  Selecione um asset ou clip para visualizar.
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-800 p-3 bg-slate-950/20">
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

        <div className="w-80 border-l border-slate-800 bg-slate-950/30 overflow-auto">
          {inspector}
          {mixer}
        </div>
      </div>
    </div>
  )
}
