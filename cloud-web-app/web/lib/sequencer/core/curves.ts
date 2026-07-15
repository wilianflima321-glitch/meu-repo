import type { SequencerCurve, SequencerKeyframe } from '@/lib/sequencer/core/types'

function sortKeyframes(keyframes: SequencerKeyframe[]): SequencerKeyframe[] {
  return [...keyframes].sort((a, b) => a.timeMs - b.timeMs)
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}

function ease(t: number, mode: SequencerKeyframe['interpolation']): number {
  if (mode === 'ease-in') return t * t
  if (mode === 'ease-out') return 1 - (1 - t) * (1 - t)
  if (mode === 'ease-in-out' || mode === 'cubic-bezier') return smoothstep(t)
  return t
}

export function evaluateSequencerCurve(curve: SequencerCurve, timeMs: number, fallback = 0): number {
  const keys = sortKeyframes(curve.keyframes)
  if (keys.length === 0) return fallback
  if (timeMs <= keys[0].timeMs) return keys[0].value
  if (timeMs >= keys[keys.length - 1].timeMs) return keys[keys.length - 1].value

  for (let index = 0; index < keys.length - 1; index += 1) {
    const left = keys[index]
    const right = keys[index + 1]
    if (timeMs < left.timeMs || timeMs > right.timeMs) continue
    if (left.interpolation === 'step') return left.value
    const span = Math.max(1, right.timeMs - left.timeMs)
    const t = ease((timeMs - left.timeMs) / span, left.interpolation)
    return left.value + (right.value - left.value) * t
  }

  return fallback
}

export function normalizeSequencerCurve(curve: SequencerCurve): SequencerCurve {
  return {
    ...curve,
    keyframes: sortKeyframes(curve.keyframes).map((keyframe) => ({
      ...keyframe,
      timeMs: Math.max(0, Math.round(keyframe.timeMs)),
    })),
  }
}
