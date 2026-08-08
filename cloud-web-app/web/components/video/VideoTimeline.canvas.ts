import { resolveCssColor } from '@/lib/design-system/resolveCssColor';
import { formatTime, formatTimecode } from './VideoTimeline.parts';
import type { TimelineMarker, TimelineTool, TimelineTrack, VideoClip } from './VideoTimeline.types';

function paint(tokenOrColor: string): string {
  return resolveCssColor(
    tokenOrColor.startsWith('var(') || tokenOrColor.startsWith('#') || tokenOrColor.startsWith('rgb')
      ? tokenOrColor
      : `var(${tokenOrColor})`,
    tokenOrColor,
  );
}

type TimelinePoint = { x: number; y: number };

export interface DrawVideoTimelineCanvasOptions {
  ctx: CanvasRenderingContext2D;
  tracks: TimelineTrack[];
  clips: VideoClip[];
  duration: number;
  currentTime: number;
  zoom: number;
  canvasWidth: number;
  canvasHeight: number;
  selectedClipId?: string | null;
  selectedClipIds: string[];
  hoveredClipId: string | null;
  markers: TimelineMarker[];
  multiSelectStart: TimelinePoint | null;
  multiSelectEnd: TimelinePoint | null;
  isDragging: boolean;
  dragClipId: string | null;
  snapPoints: number[];
  snapThreshold: number;
  tool: TimelineTool;
  trackHeight: number;
  rulerHeight: number;
}

export function drawVideoTimelineCanvas({
  ctx,
  tracks,
  clips,
  duration,
  currentTime,
  zoom,
  canvasWidth,
  canvasHeight,
  selectedClipId,
  selectedClipIds,
  hoveredClipId,
  markers,
  multiSelectStart,
  multiSelectEnd,
  isDragging,
  dragClipId,
  snapPoints,
  snapThreshold,
  tool,
  trackHeight,
  rulerHeight,
}: DrawVideoTimelineCanvasOptions) {
    // Clear
    ctx.fillStyle = paint("var(--aethel-surface-primary)");
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Ruler
    ctx.fillStyle = paint("var(--aethel-surface-tertiary)");
    ctx.fillRect(0, 0, canvasWidth, rulerHeight);

    // Time markers
    ctx.fillStyle = paint("var(--aethel-text-quaternary)");
    ctx.font = "10px monospace";
    ctx.textAlign = "center";

    const secondsPerMarker =
      zoom > 100 ? 0.5 : zoom > 50 ? 1 : zoom > 25 ? 2 : 5;
    for (let t = 0; t <= duration; t += secondsPerMarker) {
      const x = t * zoom;

      // Major tick
      if (t % (secondsPerMarker * 2) === 0) {
        ctx.strokeStyle = paint("var(--aethel-text-tertiary)");
        ctx.beginPath();
        ctx.moveTo(x, rulerHeight - 15);
        ctx.lineTo(x, rulerHeight);
        ctx.stroke();

        ctx.fillText(formatTime(t), x, rulerHeight - 18);
      } else {
        // Minor tick
        ctx.strokeStyle = paint("var(--aethel-border-primary)");
        ctx.beginPath();
        ctx.moveTo(x, rulerHeight - 8);
        ctx.lineTo(x, rulerHeight);
        ctx.stroke();
      }
    }

    // Tracks
    tracks.forEach((track, i) => {
      const y = rulerHeight + i * trackHeight;

      // Track background
      ctx.fillStyle = paint(
        i % 2 === 0
          ? "var(--aethel-surface-tertiary)"
          : "var(--aethel-surface-secondary)",
      );
      ctx.fillRect(0, y, canvasWidth, trackHeight);

      // Track separator
      ctx.strokeStyle = paint("var(--aethel-border-primary)");
      ctx.beginPath();
      ctx.moveTo(0, y + trackHeight);
      ctx.lineTo(canvasWidth, y + trackHeight);
      ctx.stroke();
    });

    // Clips
    clips.forEach((clip) => {
      const track = tracks[clip.trackIndex];
      if (!track) return;

      const x = clip.startTime * zoom;
      const y = rulerHeight + clip.trackIndex * trackHeight + 4;
      const width = clip.duration * zoom;
      const height = trackHeight - 8;

      // Skip disabled clips (render with opacity)
      if (clip.disabled) {
        ctx.globalAlpha = 0.3;
      }

      // Clip background with custom color support
      const isSelected =
        clip.id === selectedClipId || selectedClipIds.includes(clip.id);
      const isHovered = clip.id === hoveredClipId;
      const baseColor =
        clip.color ||
        (clip.type === "video"
          ? "var(--aethel-primary)"
          : clip.type === "audio"
            ? "var(--aethel-success)"
            : "var(--aethel-warning)");
      ctx.fillStyle = paint(baseColor);

      // Rounded corners
      const radius = 4;
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, radius);
      ctx.fill();

      // Hover highlight
      if (isHovered && !isSelected) {
        ctx.strokeStyle = paint("var(--aethel-video-white-50)");
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Selection border
      if (isSelected) {
        ctx.strokeStyle = paint("var(--aethel-text-primary)");
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.lineWidth = 1;
      }

      // Locked indicator
      if (clip.locked) {
        ctx.fillStyle = paint("var(--aethel-video-black-50)");
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, radius);
        ctx.fill();

        // Lock icon
        ctx.fillStyle = paint("var(--aethel-text-primary)");
        ctx.font = "14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("", x + width / 2, y + height / 2 + 5);
      }

      // Clip name with better styling
      ctx.fillStyle = paint("var(--aethel-text-primary)");
      ctx.font = "11px Inter, system-ui, sans-serif";
      ctx.textAlign = "left";
      const textX = x + 8;
      const maxTextWidth = width - 16;
      if (maxTextWidth > 30 && !clip.locked) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, width, height);
        ctx.clip();

        // Text shadow for readability
        ctx.shadowColor = paint("var(--aethel-video-black-50)");
        ctx.shadowBlur = 2;
        ctx.fillText(clip.name, textX, y + 15);
        ctx.shadowBlur = 0;

        // Duration indicator
        ctx.font = "9px monospace";
        ctx.fillStyle = paint("var(--aethel-video-white-70)");
        ctx.fillText(formatTimecode(clip.duration), textX, y + height - 6);
        ctx.restore();
      }

      // Trim handles (se selecionado ou hovered)
      if (isSelected || isHovered) {
        // Left handle
        const handleGradient = ctx.createLinearGradient(x, y, x + 8, y);
        handleGradient.addColorStop(0, paint("var(--aethel-video-white-90)"));
        handleGradient.addColorStop(1, paint("var(--aethel-video-white-30)"));
        ctx.fillStyle = handleGradient;
        ctx.fillRect(x, y, 8, height);

        // Right handle
        const handleGradientR = ctx.createLinearGradient(
          x + width - 8,
          y,
          x + width,
          y,
        );
        handleGradientR.addColorStop(0, paint("var(--aethel-video-white-30)"));
        handleGradientR.addColorStop(1, paint("var(--aethel-video-white-90)"));
        ctx.fillStyle = handleGradientR;
        ctx.fillRect(x + width - 8, y, 8, height);
      }

      ctx.globalAlpha = 1;

      // Waveform REAL para audio (quando houver peaks)
      if (clip.type === "audio" && !clip.locked) {
        const centerY = y + height / 2;
        const maxAmp = height * 0.38;
        const left = x + 10;
        const right = x + width - 10;

        if (clip.peaks && clip.peaks.length > 0 && right - left > 4) {
          // Gradient fill for waveform
          const waveGradient = ctx.createLinearGradient(
            0,
            centerY - maxAmp,
            0,
            centerY + maxAmp,
          );
          waveGradient.addColorStop(0, paint("var(--aethel-video-white-45)"));
          waveGradient.addColorStop(0.5, paint("var(--aethel-video-white-25)"));
          waveGradient.addColorStop(1, paint("var(--aethel-video-white-45)"));
          ctx.fillStyle = waveGradient;

          ctx.beginPath();
          ctx.moveTo(left, centerY);

          // Top half
          for (let px = left; px < right; px += 1) {
            const normX = (px - left) / Math.max(1, right - left);
            const idx = Math.min(
              clip.peaks.length - 1,
              Math.floor(normX * clip.peaks.length),
            );
            const peak = Math.max(0, Math.min(1, clip.peaks[idx] ?? 0));
            ctx.lineTo(px, centerY - peak * maxAmp);
          }

          // Bottom half (mirror)
          for (let px = right - 1; px >= left; px -= 1) {
            const normX = (px - left) / Math.max(1, right - left);
            const idx = Math.min(
              clip.peaks.length - 1,
              Math.floor(normX * clip.peaks.length),
            );
            const peak = Math.max(0, Math.min(1, clip.peaks[idx] ?? 0));
            ctx.lineTo(px, centerY + peak * maxAmp);
          }

          ctx.closePath();
          ctx.fill();
        }
      }

      // Video thumbnail indicator (primeira frame)
      if (clip.type === "video" && width > 60 && !clip.locked) {
        ctx.fillStyle = paint("var(--aethel-video-black-30)");
        ctx.fillRect(x + 4, y + 4, 32, 18);
        ctx.fillStyle = paint("var(--aethel-video-white-50)");
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("", x + 20, y + 17);
      }
    });

    // Markers
    for (const marker of markers) {
      const mx = marker.time * zoom;

      // Marker line
      ctx.strokeStyle = paint(marker.color || "var(--aethel-warning)");
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 2]);
      ctx.beginPath();
      ctx.moveTo(mx, rulerHeight);
      ctx.lineTo(mx, canvasHeight);
      ctx.stroke();
      ctx.setLineDash([]);

      // Marker flag
      ctx.fillStyle = paint(marker.color || "var(--aethel-warning)");
      ctx.beginPath();
      ctx.moveTo(mx - 6, 0);
      ctx.lineTo(mx + 6, 0);
      ctx.lineTo(mx + 6, 16);
      ctx.lineTo(mx, 12);
      ctx.lineTo(mx - 6, 16);
      ctx.closePath();
      ctx.fill();

      // Marker type icon
      ctx.fillStyle = paint("var(--aethel-surface-primary)");
      ctx.font = "8px sans-serif";
      ctx.textAlign = "center";
      const icon =
        marker.type === "chapter" ? "C" : marker.type === "comment" ? "" : "M";
      ctx.fillText(icon, mx, 10);
    }

    // Multi-select rectangle
    if (multiSelectStart && multiSelectEnd) {
      const sx = Math.min(multiSelectStart.x, multiSelectEnd.x);
      const sy = Math.min(multiSelectStart.y, multiSelectEnd.y);
      const sw = Math.abs(multiSelectEnd.x - multiSelectStart.x);
      const sh = Math.abs(multiSelectEnd.y - multiSelectStart.y);

      ctx.fillStyle = paint("var(--aethel-video-select-fill)");
      ctx.fillRect(sx, sy, sw, sh);
      ctx.strokeStyle = paint("var(--aethel-primary)");
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, sy, sw, sh);
    }

    // Snap lines (vertical guides when dragging)
    if (isDragging && dragClipId) {
      const draggedClip = clips.find((c) => c.id === dragClipId);
      if (draggedClip) {
        for (const snapPoint of snapPoints) {
          const snapX = snapPoint * zoom;
          const clipStart = draggedClip.startTime * zoom;
          const clipEnd = (draggedClip.startTime + draggedClip.duration) * zoom;

          if (
            Math.abs(snapX - clipStart) < snapThreshold ||
            Math.abs(snapX - clipEnd) < snapThreshold
          ) {
            ctx.strokeStyle = paint("var(--aethel-success)");
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.moveTo(snapX, 0);
            ctx.lineTo(snapX, canvasHeight);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }
    }

    // Playhead
    const playheadX = currentTime * zoom;
    ctx.strokeStyle = paint("var(--aethel-error)");
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, canvasHeight);
    ctx.stroke();

    // Playhead head (triangle)
    ctx.fillStyle = paint("var(--aethel-error)");
    ctx.beginPath();
    ctx.moveTo(playheadX - 8, 0);
    ctx.lineTo(playheadX + 8, 0);
    ctx.lineTo(playheadX, 12);
    ctx.closePath();
    ctx.fill();

    // Tool indicator
    if (tool !== "select") {
      ctx.fillStyle = paint("var(--aethel-video-black-70)");
      ctx.fillRect(canvasWidth - 80, canvasHeight - 24, 75, 20);
      ctx.fillStyle = paint("var(--aethel-text-primary)");
      ctx.font = "10px sans-serif";
      ctx.textAlign = "right";
      const toolNames: Record<TimelineTool, string> = {
        select: "Selection",
        razor: "Razor (C)",
        slip: "Slip (Y)",
        slide: "Slide (U)",
        ripple: "Ripple (B)",
        roll: "Roll (N)",
      };
      ctx.fillText(toolNames[tool], canvasWidth - 10, canvasHeight - 10);
    }
}
