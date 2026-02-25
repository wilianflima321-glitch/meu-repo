export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const frames = Math.floor((seconds % 1) * 30)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames
    .toString()
    .padStart(2, '0')}`
}

export function formatTimecode(seconds: number, fps: number = 30): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const f = Math.floor((seconds % 1) * fps)

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${f
      .toString()
      .padStart(2, '0')}`
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${f
    .toString()
    .padStart(2, '0')}`
}
