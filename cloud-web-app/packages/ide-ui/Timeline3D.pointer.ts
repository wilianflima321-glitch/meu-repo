/** Pointer hit-test + scrub / keyframe-drag helpers for Timeline3D canvas. */

import { RULER_HEIGHT, TRACK_HEIGHT } from './Timeline3D.styles'

export type TimelinePointerKeyframe = {
  id: string
  time: number
  track: string
}

export function hitTestKeyframe(
  x: number,
  y: number,
  width: number,
  safeDuration: number,
  trackList: string[],
  keyframes: TimelinePointerKeyframe[],
): TimelinePointerKeyframe | null {
  for (let i = trackList.length - 1; i >= 0; i--) {
    const track = trackList[i]
    const trackY = RULER_HEIGHT + i * TRACK_HEIGHT
    const trackKfs = keyframes.filter((k) => k.track === track)
    for (const kf of trackKfs) {
      const kfX = (kf.time / safeDuration) * width
      const kfY = trackY + TRACK_HEIGHT / 2
      if (Math.abs(x - kfX) < 10 && Math.abs(y - kfY) < 10) return kf
    }
  }
  return null
}

export function clientXToTime(clientX: number, left: number, width: number, safeDuration: number): number {
  const nx = Math.max(0, Math.min(clientX - left, width))
  return (nx / width) * safeDuration
}

export function attachPointerDrag(
  el: HTMLElement,
  onMove: (evt: PointerEvent) => void,
  onUp: () => void,
): void {
  const handleUp = () => {
    onUp()
    el.removeEventListener('pointermove', onMove)
    el.removeEventListener('pointerup', handleUp)
  }
  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerup', handleUp)
}
