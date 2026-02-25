export const sequencerColors = {
  bg: '#0d0d12',
  surface: '#14141c',
  surfaceHover: '#1a1a26',
  surfaceActive: '#222232',
  border: '#2a2a3c',
  borderLight: '#3a3a4c',
  text: '#e4e4eb',
  textMuted: '#8b8b9e',
  textDim: '#5a5a6e',
  primary: '#6366f1',
  primaryHover: '#7c7ff2',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  camera: '#f59e0b',
  transform: '#22c55e',
  light: '#eab308',
  audio: '#06b6d4',
  event: '#a855f7',
  material: '#ec4899',
  visibility: '#8b8b9e',
}

export function formatSequencerTime(seconds: number, frameRate: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const frames = Math.floor((seconds % 1) * frameRate)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames
    .toString()
    .padStart(2, '0')}`
}

export function timeToPixels(time: number, pixelsPerSecond: number): number {
  return time * pixelsPerSecond
}

export function pixelsToTime(pixels: number, pixelsPerSecond: number): number {
  return pixels / pixelsPerSecond
}
