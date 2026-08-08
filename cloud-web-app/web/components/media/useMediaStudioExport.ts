import { tokenColor } from '@/lib/design-system/DesignTokenSync'
'use client'

import { useCallback, useRef, useState } from 'react'
import { logger } from '@/lib/observability/logger'

import {
  applyEffectsToContext,
  clamp01,
  computeTransitionFades,
  computeVisualAlphaAtTime,
  decodeAudioBuffer,
  drawFitContain,
  getEffectValue,
  timelineToRendererClips,
  type MediaProject,
} from './media-studio-core'

type UseMediaStudioExportOptions = {
  project: MediaProject
}

export function useMediaStudioExport({ project }: UseMediaStudioExportOptions) {
  const [exporting, setExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<string>('')
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const exportWebM = useCallback(async () => {
    if (exporting) return
    setExporting(true)
    setExportStatus('Preparing export...')

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
      if (!ctx) throw new Error('Canvas 2D unavailable')

      setExportStatus('Loading media...')

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
          const onErr = () => reject(new Error('Failed to load video: ' + src))
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
          img.onerror = () => reject(new Error('Failed to load image: ' + src))
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

      setExportStatus('Preparing audio...')
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

      setExportStatus('Exporting in real time...')
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
          ctx.fillStyle = tokenColor('--aethel-brand-pure-black')
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

          setExportStatus(`Exporting... ${Math.floor((t / total) * 100)}%`)

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
        recorder.onerror = () => reject(new Error('MediaRecorder failed'))
      })

      setExportStatus('Finishing...')

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'export.webm'
      a.click()
      URL.revokeObjectURL(url)

      try {
        await audioContext.close()
      } catch {
      }
    } catch (err) {
      logger.error(err)
      setExportStatus('Export error')
    } finally {
      setExporting(false)
      setTimeout(() => setExportStatus(''), 1500)
    }
  }, [exporting, project.clips, project.duration])

  return { exporting, exportStatus, exportWebM }
}
