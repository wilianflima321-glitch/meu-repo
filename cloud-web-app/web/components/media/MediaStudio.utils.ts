import type { ClipEffect, TimelineClip } from '../../lib/video-encoder-real';
import type { TimelineTrack, VideoClip } from '../video/VideoTimeline';

export type MediaKind = 'video' | 'audio' | 'image'

export type TransitionType = 'crossfade' | 'dipToBlack'

export type MediaAsset = {
  id: string
  name: string
  kind: MediaKind
  src: string
  originPath?: string
}

export type MediaProject = {
  id: string
  name: string
  assets: MediaAsset[]
  tracks: TimelineTrack[]
  clips: Array<VideoClip & { peaks?: number[]; gain?: number; effects?: ClipEffect[]; crossfade?: number; transition?: TransitionType }>
  duration: number
}

export type Props = {
  path?: string
}

export function inferMediaKindFromPath(path: string): MediaKind | null {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tga', 'tiff', 'svg'].includes(ext)) return 'image'
  if (['wav', 'mp3', 'ogg', 'flac', 'm4a', 'aac'].includes(ext)) return 'audio'
  if (['mp4', 'webm', 'mov', 'mkv'].includes(ext)) return 'video'
  return null
}

export function resolveSrcFromWorkspacePath(path: string): string {
  // Quando o usuário abre algo em /public, o asset real é servido na raiz.
  if (path.startsWith('/public/')) return path.replace('/public', '')
  return path
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const frames = Math.floor((seconds % 1) * 30)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`
}

export async function computeAudioPeaksFromUrl(audioUrl: string, peakCount: number): Promise<number[] | null> {
  try {
    const response = await fetch(audioUrl)
    const arrayBuffer = await response.arrayBuffer()

    const audioContext = new AudioContext()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

    const channelData = audioBuffer.getChannelData(0)
    const samplesPerPeak = Math.max(1, Math.floor(channelData.length / peakCount))

    const peaks: number[] = []
    for (let i = 0; i < peakCount; i++) {
      const start = i * samplesPerPeak
      const end = Math.min(channelData.length, start + samplesPerPeak)
      let min = 0
      let max = 0
      for (let j = start; j < end; j++) {
        const s = channelData[j]
        if (s < min) min = s
        if (s > max) max = s
      }
      peaks.push(Math.max(Math.abs(min), Math.abs(max)))
    }

    // Boa prática: liberar recursos (não fecha o contexto global do app; este é local)
    try {
      await audioContext.close()
    } catch {
      // ignore
    }

    return peaks
  } catch (err) {
    console.error('Falha ao calcular peaks de áudio:', err)
    return null
  }
}

export function upsertEffect(effects: ClipEffect[] | undefined, next: ClipEffect): ClipEffect[] {
  const list = effects ? [...effects] : []
  const idx = list.findIndex(e => e.type === next.type)
  if (idx >= 0) list[idx] = { ...list[idx], ...next }
  else list.push(next)
  return list
}

export function getEffectValue(effects: ClipEffect[] | undefined, type: ClipEffect['type'], fallback: number): number {
  const v = effects?.find(e => e.type === type)?.value
  return typeof v === 'number' ? v : fallback
}

export async function decodeAudioBuffer(audioContext: AudioContext, url: string): Promise<AudioBuffer> {
  const response = await fetch(url)
  const arrayBuffer = await response.arrayBuffer()
  return audioContext.decodeAudioData(arrayBuffer)
}

export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

export type Overlap = {
  aId: string
  bId: string
  trackIndex: number
  start: number
  end: number
  duration: number
}

export function computeOverlapsByTrack(clips: MediaProject['clips']): Overlap[] {
  const overlaps: Overlap[] = []
  const byTrack = new Map<number, MediaProject['clips']>()

  for (const c of clips) {
    const list = byTrack.get(c.trackIndex) ?? []
    list.push(c)
    byTrack.set(c.trackIndex, list)
  }

  for (const [trackIndex, list] of byTrack.entries()) {
    const sorted = [...list].sort((x, y) => x.startTime - y.startTime)
    for (let i = 0; i < sorted.length; i++) {
      const a = sorted[i]
      const aEnd = a.startTime + a.duration
      for (let j = i + 1; j < sorted.length; j++) {
        const b = sorted[j]
        const bEnd = b.startTime + b.duration
        if (b.startTime >= aEnd) break

        const start = Math.max(a.startTime, b.startTime)
        const end = Math.min(aEnd, bEnd)
        const dur = end - start
        if (dur > 0.001) overlaps.push({ aId: a.id, bId: b.id, trackIndex, start, end, duration: dur })
      }
    }
  }

  return overlaps
}

export type ClipFade = {
  // tempos absolutos na timeline (segundos)
  inHoldUntil?: number
  inStart?: number
  inEnd?: number
  outStart?: number
  outEnd?: number
  outHoldFrom?: number
}

export function computeTransitionFades(clips: MediaProject['clips']): Map<string, ClipFade> {
  const fades = new Map<string, ClipFade>()
  for (const c of clips) fades.set(c.id, {})

  const overlaps = computeOverlapsByTrack(clips)
  for (const o of overlaps) {
    const a = clips.find(c => c.id === o.aId)
    const b = clips.find(c => c.id === o.bId)
    if (!a || !b) continue

    const transition: TransitionType = a.transition ?? 'crossfade'
    const desired = Math.min(a.crossfade ?? 0.5, b.crossfade ?? 0.5)
    const eff = Math.max(0, Math.min(desired, o.duration))
    if (eff <= 0.001) continue

    const aEnd = a.startTime + a.duration
    const aFade = fades.get(a.id) ?? {}
    const bFade = fades.get(b.id) ?? {}

    if (transition === 'crossfade') {
      // a: fade-out nos últimos `eff` segundos
      const nextOutStart = aEnd - eff
      if (typeof aFade.outStart !== 'number' || nextOutStart < aFade.outStart) {
        aFade.outStart = nextOutStart
        aFade.outEnd = aEnd
      }

      // b: fade-in nos primeiros `eff` segundos
      const nextInEnd = b.startTime + eff
      bFade.inStart = b.startTime
      if (typeof bFade.inEnd !== 'number' || nextInEnd > bFade.inEnd) {
        bFade.inEnd = nextInEnd
      }
    } else if (transition === 'dipToBlack') {
      // Dip to black no overlap (a some primeiro, b entra depois)
      const dipStart = o.start
      const dipMid = o.start + eff / 2
      const dipEnd = o.start + eff

      // a: 1 -> 0 até dipMid e fica 0 depois
      if (typeof aFade.outStart !== 'number' || dipStart > aFade.outStart) {
        aFade.outStart = dipStart
        aFade.outEnd = dipMid
        aFade.outHoldFrom = dipMid
      }

      // b: fica 0 até dipMid e 0 -> 1 até dipEnd
      bFade.inHoldUntil = typeof bFade.inHoldUntil === 'number' ? Math.min(bFade.inHoldUntil, dipMid) : dipMid
      bFade.inStart = dipMid
      if (typeof bFade.inEnd !== 'number' || dipEnd > bFade.inEnd) {
        bFade.inEnd = dipEnd
      }
    }

    fades.set(a.id, aFade)
    fades.set(b.id, bFade)
  }

  return fades
}

export function computeVisualAlphaAtTime(clip: MediaProject['clips'][number], t: number, fades: Map<string, ClipFade>): number {
  const f = fades.get(clip.id)
  if (!f) return 1

  const clipStart = clip.startTime
  const clipEnd = clip.startTime + clip.duration

  // fora do intervalo do clip, não contribui
  if (t < clipStart || t > clipEnd) return 0

  let alpha = 1

  if (typeof f.inHoldUntil === 'number' && t < f.inHoldUntil) {
    alpha *= 0
  }

  if (typeof f.inStart === 'number' && typeof f.inEnd === 'number' && f.inEnd > f.inStart) {
    if (t <= f.inStart) alpha *= 0
    else if (t < f.inEnd) alpha *= (t - f.inStart) / (f.inEnd - f.inStart)
  }

  if (typeof f.outHoldFrom === 'number' && t >= f.outHoldFrom) {
    alpha *= 0
  } else if (typeof f.outStart === 'number' && typeof f.outEnd === 'number' && f.outEnd > f.outStart) {
    if (t >= f.outEnd) alpha *= 0
    else if (t > f.outStart) alpha *= (f.outEnd - t) / (f.outEnd - f.outStart)
  }

  return clamp01(alpha)
}

export function timelineToRendererClips(clips: MediaProject['clips']): TimelineClip[] {
  return clips.map(c => ({
    id: c.id,
    source: c.src,
    startTime: c.startTime,
    duration: c.duration,
    inPoint: c.inPoint,
    outPoint: c.outPoint,
    track: c.trackIndex,
    effects: c.effects,
  }))
}

export function applyEffectsToContext(ctx: CanvasRenderingContext2D, effects?: ClipEffect[]) {
  const brightness = getEffectValue(effects, 'brightness', 1)
  const contrast = getEffectValue(effects, 'contrast', 1)
  const saturation = getEffectValue(effects, 'saturation', 1)
  const blur = getEffectValue(effects, 'blur', 0)
  const grayscale = getEffectValue(effects, 'grayscale', 0)

  // Canvas 2D filters
  ctx.filter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturation}) blur(${blur}px) grayscale(${grayscale})`
}

export function drawFitContain(ctx: CanvasRenderingContext2D, source: CanvasImageSource, w: number, h: number) {
  // tenta ler width/height do source
  // @ts-expect-error: CanvasImageSource é união; alguns membros têm width/height
  const sw = source.videoWidth ?? source.naturalWidth ?? source.width
  // @ts-expect-error idem
  const sh = source.videoHeight ?? source.naturalHeight ?? source.height

  if (!sw || !sh) {
    ctx.drawImage(source, 0, 0, w, h)
    return
  }

  const scale = Math.min(w / sw, h / sh)
  const dw = sw * scale
  const dh = sh * scale
  const dx = (w - dw) / 2
  const dy = (h - dh) / 2
  ctx.drawImage(source, dx, dy, dw, dh)
}

