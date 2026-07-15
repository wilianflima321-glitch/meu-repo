import type { EasingType, Keyframe, KeyframeTrack } from './KeyframeSystem.model';
import { evaluateEasing } from './KeyframeSystem.model';
import { TIMELINE_DRAW_OVERSCAN, type TimelineRow, type VisibleTimelineRange } from './KeyframeSystem.view';

export type KeyframePalette = {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryAlpha: string;
  error: string;
  border: string;
  surfaceBase: string;
  surfaceMid: string;
  surfaceStrong: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textMuted: string;
  textQuaternary: string;
};

interface RenderTimelineOptions {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  currentTime: number;
  duration: number;
  pixelsPerSecond: number;
  selectedKeyframeIds: Set<string>;
  hoveredKeyframe: string | null;
  headerWidth: number;
  propertyHeight: number;
  trackHeight: number;
  keyframeSize: number;
  palette: KeyframePalette;
  sortedKeyframesByProperty: Map<string, Keyframe[]>;
  timelineRows: TimelineRow[];
  visibleTimelineRange: VisibleTimelineRange;
}

interface HitTestOptions {
  canvas: HTMLCanvasElement;
  clientX: number;
  clientY: number;
  timelineRows: TimelineRow[];
  sortedKeyframesByProperty: Map<string, Keyframe[]>;
  pixelsPerSecond: number;
  headerWidth: number;
  keyframeSize: number;
  propertyHeight: number;
}

function drawKeyframe(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  selected: boolean,
  hovered: boolean,
  easing: EasingType,
  keyframeSize: number,
  palette: KeyframePalette,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);

  const size = keyframeSize / 2;

  if (selected || hovered) {
    ctx.shadowColor = selected ? palette.primaryLight : palette.textMuted;
    ctx.shadowBlur = 6;
  }

  ctx.fillStyle = selected ? palette.primary : hovered ? palette.primaryLight : palette.textMuted;
  ctx.fillRect(-size, -size, size * 2, size * 2);

  ctx.strokeStyle = selected ? palette.primaryDark : palette.textQuaternary;
  ctx.lineWidth = 1;
  ctx.strokeRect(-size, -size, size * 2, size * 2);

  ctx.shadowBlur = 0;
  if (easing !== 'linear') {
    ctx.fillStyle = palette.textPrimary;
    ctx.font = '6px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const iconByEasing: Partial<Record<EasingType, string>> = {
      easeIn: 'I',
      easeOut: 'O',
      easeInOut: 'S',
      hold: '=',
      bezier: 'B',
      bounce: '~',
      elastic: 'E',
    };

    ctx.rotate(-Math.PI / 4);
    ctx.fillText(iconByEasing[easing] ?? '', 0, 0);
  }

  ctx.restore();
}

function drawEasingCurve(
  ctx: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  y: number,
  easing: EasingType,
  palette: KeyframePalette,
  bezierIn?: { x: number; y: number },
  bezierOut?: { x: number; y: number },
) {
  ctx.beginPath();
  ctx.moveTo(x1, y);

  const steps = 20;
  const curveHeight = 6;

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const easedT = evaluateEasing(easing, t, bezierIn, bezierOut);
    const yOffset = (0.5 - easedT) * curveHeight;
    ctx.lineTo(x, y + yOffset);
  }

  ctx.strokeStyle = palette.primaryAlpha;
  ctx.lineWidth = 1;
  ctx.stroke();
}

export function renderKeyframeTimeline(options: RenderTimelineOptions) {
  const {
    ctx,
    width,
    height,
    currentTime,
    duration,
    pixelsPerSecond,
    selectedKeyframeIds,
    hoveredKeyframe,
    headerWidth,
    propertyHeight,
    trackHeight,
    keyframeSize,
    palette,
    sortedKeyframesByProperty,
    timelineRows,
    visibleTimelineRange,
  } = options;

  const visibleTop = Math.max(0, visibleTimelineRange.top - TIMELINE_DRAW_OVERSCAN);
  const visibleLeft = Math.max(0, visibleTimelineRange.left - TIMELINE_DRAW_OVERSCAN);
  const visibleBottom = Math.min(height, visibleTimelineRange.top + visibleTimelineRange.height + TIMELINE_DRAW_OVERSCAN);
  const visibleRight = Math.min(width, visibleTimelineRange.left + visibleTimelineRange.width + TIMELINE_DRAW_OVERSCAN);
  const visibleWidth = Math.max(1, visibleRight - visibleLeft);
  const visibleHeight = Math.max(1, visibleBottom - visibleTop);

  ctx.fillStyle = palette.surfaceBase;
  ctx.fillRect(visibleLeft, visibleTop, visibleWidth, visibleHeight);

  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 1;

  const secondWidth = Math.max(1, pixelsPerSecond);
  const firstVisibleSecond = Math.max(0, Math.floor((visibleLeft - headerWidth) / secondWidth));
  const lastVisibleSecond = Math.min(duration, Math.ceil((visibleRight - headerWidth) / secondWidth));
  for (let s = firstVisibleSecond; s <= lastVisibleSecond; s++) {
    const x = headerWidth + s * secondWidth;
    ctx.beginPath();
    ctx.moveTo(x, visibleTop);
    ctx.lineTo(x, visibleBottom);
    ctx.stroke();
  }

  for (const row of timelineRows) {
    if (row.y + row.height < visibleTop || row.y > visibleBottom) continue;

    if (row.kind === 'track') {
      const { track, y } = row;
      ctx.fillStyle = palette.surfaceMid;
      ctx.fillRect(0, y, headerWidth, trackHeight);

      ctx.fillStyle = palette.textSecondary;
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(track.clipId.slice(0, 20), 24, y + trackHeight / 2);

      ctx.fillStyle = palette.textQuaternary;
      ctx.font = '10px system-ui';
      ctx.fillText(track.expanded ? 'v' : '>', 8, y + trackHeight / 2);

      ctx.fillStyle = palette.surfaceStrong;
      ctx.fillRect(headerWidth, y, width - headerWidth, trackHeight);
      continue;
    }

    const { property, trackId, propertyId, y } = row;
    ctx.fillStyle = palette.surfaceMid;
    ctx.fillRect(0, y, headerWidth, propertyHeight);

    ctx.fillStyle = palette.textTertiary;
    ctx.font = '10px system-ui';
    ctx.fillText(`  ${property.name}`, 24, y + propertyHeight / 2);

    ctx.fillStyle = palette.surfaceBase;
    ctx.fillRect(headerWidth, y, width - headerWidth, propertyHeight);

    const sorted = sortedKeyframesByProperty.get(`${trackId}:${propertyId}`) ?? [];
    const centerY = y + propertyHeight / 2;

    for (let i = 0; i < sorted.length; i++) {
      const kf = sorted[i];
      const x = headerWidth + kf.time * pixelsPerSecond;

      if (i < sorted.length - 1) {
        const nextKf = sorted[i + 1];
        const nextX = headerWidth + nextKf.time * pixelsPerSecond;
        const segmentRight = Math.max(x, nextX);
        const segmentLeft = Math.min(x, nextX);

        if (segmentRight >= visibleLeft && segmentLeft <= visibleRight) {
          drawEasingCurve(ctx, x, nextX, centerY, kf.easing, palette, kf.bezierOut, nextKf.bezierIn);
        }
      }

      if (x < visibleLeft || x > visibleRight) continue;
      drawKeyframe(ctx, x, centerY, selectedKeyframeIds.has(kf.id), hoveredKeyframe === kf.id, kf.easing, keyframeSize, palette);
    }
  }

  const playheadX = headerWidth + currentTime * pixelsPerSecond;
  if (playheadX >= visibleLeft && playheadX <= visibleRight) {
    ctx.strokeStyle = palette.error;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, visibleTop);
    ctx.lineTo(playheadX, visibleBottom);
    ctx.stroke();

    ctx.fillStyle = palette.error;
    ctx.beginPath();
    ctx.moveTo(playheadX - 6, Math.max(0, visibleTop));
    ctx.lineTo(playheadX + 6, Math.max(0, visibleTop));
    ctx.lineTo(playheadX, Math.max(8, visibleTop + 8));
    ctx.closePath();
    ctx.fill();
  }
}

export function hitTestKeyframeAt(options: HitTestOptions): {
  trackId: string;
  propertyId: string;
  keyframe: Keyframe;
} | null {
  const { canvas, clientX, clientY, timelineRows, sortedKeyframesByProperty, pixelsPerSecond, headerWidth, keyframeSize, propertyHeight } = options;
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  for (const row of timelineRows) {
    if (row.kind !== 'property') continue;
    if (y < row.y || y > row.y + row.height) continue;

    const centerY = row.y + propertyHeight / 2;
    const sorted = sortedKeyframesByProperty.get(`${row.trackId}:${row.propertyId}`) ?? row.property.keyframes;

    for (const kf of sorted) {
      const kfX = headerWidth + kf.time * pixelsPerSecond;
      const dist = Math.sqrt((x - kfX) ** 2 + (y - centerY) ** 2);

      if (dist <= keyframeSize) {
        return {
          trackId: row.trackId,
          propertyId: row.propertyId,
          keyframe: kf,
        };
      }
    }
  }

  return null;
}
