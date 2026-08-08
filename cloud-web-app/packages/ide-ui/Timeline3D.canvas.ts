import {
  PANEL_BORDER,
  PANEL_SURFACE,
  RULER_HEIGHT,
  TEXT_INVERSE,
  TRACK_HEIGHT,
  canvasColorWithAlpha,
  canvasRgba,
  drawDiamond,
  formatTimecode,
  resolveCssColor,
  resolveToken,
  type TimelineTrackConfig,
} from './Timeline3D.styles'

export type CanvasKeyframe = {
  id: string
  time: number
  track: string
  value: unknown
}

export type DrawTimelineCanvasArgs = {
  canvas: HTMLCanvasElement
  wrapper: HTMLDivElement
  safeDuration: number
  fps: number
  drawTime: number
  trackList: string[]
  keyframes: CanvasKeyframe[]
  selectedTrack: string | null
  hoveredKfId: string | null
  selectedKfId: string | null
  resolveTrack: (track: string) => TimelineTrackConfig
}

export function drawTimelineCanvas({
  canvas,
  wrapper,
  safeDuration,
  fps,
  drawTime,
  trackList,
  keyframes,
  selectedTrack,
  hoveredKfId,
  selectedKfId,
  resolveTrack,
}: DrawTimelineCanvasArgs): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  const rect = wrapper.getBoundingClientRect()

  if (
    canvas.width !== Math.floor(rect.width * dpr) ||
    canvas.height !== Math.floor(rect.height * dpr)
  ) {
    canvas.width = Math.floor(rect.width * dpr)
    canvas.height = Math.floor(rect.height * dpr)
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`
  }

  ctx.save()
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, rect.width, rect.height)

  const panelFill = resolveCssColor(PANEL_SURFACE) || resolveToken('--aethel-panel-strong')
  const borderStroke = resolveCssColor(PANEL_BORDER) || resolveToken('--aethel-border-secondary')
  const inverse = resolveCssColor(TEXT_INVERSE)
  const playhead = resolveCssColor('var(--aethel-error)') || resolveToken('--aethel-error')
  const stripeDark =
    resolveCssColor('var(--aethel-brand-pure-black)') || resolveToken('--aethel-brand-pure-black')

  ctx.fillStyle = panelFill
  ctx.fillRect(0, 0, rect.width, RULER_HEIGHT)
  ctx.strokeStyle = borderStroke
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, RULER_HEIGHT)
  ctx.lineTo(rect.width, RULER_HEIGHT)
  ctx.stroke()

  ctx.font = '9px "SF Mono", "Cascadia Code", ui-monospace, monospace'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'

  const interval = safeDuration > 30 ? 5 : safeDuration > 15 ? 2 : 1
  const subInterval = interval / 4

  for (let t = 0; t <= safeDuration; t += subInterval) {
    const x = (t / safeDuration) * rect.width
    const isMajor = Math.abs(t % interval) < 0.001
    const isMinor = !isMajor && Math.abs(t % (subInterval * 2)) < 0.001

    ctx.beginPath()
    ctx.strokeStyle = canvasColorWithAlpha(inverse, isMajor ? 0.22 : 0.08)
    ctx.lineWidth = 1
    ctx.moveTo(x, RULER_HEIGHT - (isMajor ? 10 : isMinor ? 6 : 3))
    ctx.lineTo(x, RULER_HEIGHT)
    ctx.stroke()

    if (isMajor) {
      ctx.fillStyle = canvasColorWithAlpha(inverse, 0.45)
      ctx.fillText(formatTimecode(t, fps), x + 3, RULER_HEIGHT / 2)
    }
  }

  trackList.forEach((track, i) => {
    const y = RULER_HEIGHT + i * TRACK_HEIGHT
    const cfg = resolveTrack(track)
    const isSelected = selectedTrack === track
    const resolvedColor = resolveCssColor(cfg.color)
    const resolvedGlow = resolveCssColor(cfg.glow)

    ctx.fillStyle = isSelected
      ? canvasRgba(cfg.rgbVar, 0.06)
      : i % 2 === 0
        ? canvasColorWithAlpha(inverse, 0.012)
        : canvasColorWithAlpha(stripeDark || inverse, 0.1)
    ctx.fillRect(0, y, rect.width, TRACK_HEIGHT)

    ctx.strokeStyle = canvasColorWithAlpha(inverse, 0.05)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, y + TRACK_HEIGHT)
    ctx.lineTo(rect.width, y + TRACK_HEIGHT)
    ctx.stroke()

    const trackKfs = keyframes.filter(k => k.track === track)
    if (trackKfs.length >= 2) {
      const sorted = [...trackKfs].sort((a, b) => a.time - b.time)
      const x0 = (sorted[0].time / safeDuration) * rect.width
      const x1 = (sorted[sorted.length - 1].time / safeDuration) * rect.width
      ctx.fillStyle = canvasColorWithAlpha(resolvedColor, 0.15)
      ctx.fillRect(x0, y + TRACK_HEIGHT / 2 - 3, x1 - x0, 6)
    }

    trackKfs.forEach(kf => {
      const kfX = (kf.time / safeDuration) * rect.width
      const kfY = y + TRACK_HEIGHT / 2
      const isHovered = hoveredKfId === kf.id
      const isSelectedKf = selectedKfId === kf.id
      const size = isHovered ? 11 : isSelectedKf ? 10 : 8
      drawDiamond(ctx, kfX, kfY, size, resolvedColor, resolvedGlow, isHovered, isSelectedKf)
    })
  })

  const playheadX = (drawTime / safeDuration) * rect.width

  ctx.save()
  ctx.shadowColor = playhead
  ctx.shadowBlur = 12
  ctx.strokeStyle = playhead
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(playheadX, RULER_HEIGHT)
  ctx.lineTo(playheadX, rect.height)
  ctx.stroke()
  ctx.restore()

  ctx.save()
  ctx.shadowColor = playhead
  ctx.shadowBlur = 8
  ctx.fillStyle = playhead
  ctx.beginPath()
  ctx.moveTo(playheadX - 7, RULER_HEIGHT - 2)
  ctx.lineTo(playheadX + 7, RULER_HEIGHT - 2)
  ctx.lineTo(playheadX + 7, RULER_HEIGHT - 10)
  ctx.lineTo(playheadX, RULER_HEIGHT)
  ctx.lineTo(playheadX - 7, RULER_HEIGHT - 10)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  ctx.restore()
}
