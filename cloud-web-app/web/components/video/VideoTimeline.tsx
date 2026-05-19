"use client";

/**
 * Video Timeline - Timeline PROFISSIONAL de edição de vídeo
 *
 * Recursos: Snap, marcadores, lâmina, ripple, multi-seleção
 * Usa Canvas para renderizar trilhas e clips.
 * Integra com HTMLVideoElement para prévia.
 *
 * Nível: Adobe Premiere Pro / DaVinci Resolve
 */
import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  formatTime,
  formatTimecode,
  useVideoTimelineKeyboardShortcuts,
  VideoPreview,
  VideoTimelineToolbar,
  VideoTrackHeaders,
} from "./VideoTimeline.parts";

// ============================================================================
// TYPES
// ============================================================================

export interface VideoClip {
  id: string;
  name: string;
  src: string;
  startTime: number; // Posicao na timeline (segundos)
  duration: number; // Duracao do clip (segundos)
  inPoint: number; // Trim inicio (segundos no source)
  outPoint: number; // Trim fim (segundos no source)
  trackIndex: number;
  type: "video" | "audio" | "image";
  peaks?: number[]; // Peaks (0..1) para waveform real em clips de audio
  color?: string; // Cor customizada do clip
  locked?: boolean; // Clip travado
  disabled?: boolean; // Clip desabilitado (nao renderiza)
}

export interface TimelineMarker {
  id: string;
  time: number;
  name: string;
  color: string;
  type: "marker" | "chapter" | "comment";
}

export interface TimelineTrack {
  id: string;
  name: string;
  type: "video" | "audio";
  muted: boolean;
  locked: boolean;
  height: number;
  solo?: boolean;
  color?: string;
}

export type TimelineTool =
  | "select"
  | "razor"
  | "slip"
  | "slide"
  | "ripple"
  | "roll";

export interface TimelineProps {
  tracks: TimelineTrack[];
  clips: VideoClip[];
  duration: number; // Duracao total da timeline
  currentTime: number;
  zoom: number; // Pixels por segundo
  onTimeChange: (time: number) => void;
  onClipMove?: (clipId: string, startTime: number, trackIndex: number) => void;
  onClipTrim?: (clipId: string, inPoint: number, outPoint: number) => void;
  onClipSelect?: (clipId: string | null) => void;
  onClipSplit?: (clipId: string, splitTime: number) => void;
  onClipDelete?: (clipId: string) => void;
  onRippleDelete?: (clipId: string) => void;
  selectedClipId?: string | null;
  selectedClipIds?: string[];
  markers?: TimelineMarker[];
  onMarkerAdd?: (marker: TimelineMarker) => void;
  onMarkerRemove?: (markerId: string) => void;
  snapEnabled?: boolean;
  snapThreshold?: number;
  tool?: TimelineTool;
  onToolChange?: (tool: TimelineTool) => void;
}

// ============================================================================
// TIMELINE COMPONENT
// ============================================================================

export function VideoTimeline({
  tracks,
  clips,
  duration,
  currentTime,
  zoom = 50,
  onTimeChange,
  onClipMove,
  onClipTrim,
  onClipSelect,
  onClipSplit,
  onClipDelete,
  onRippleDelete,
  selectedClipId,
  selectedClipIds = [],
  markers = [],
  onMarkerAdd,
  onMarkerRemove,
  snapEnabled = true,
  snapThreshold = 10,
  tool = "select",
  onToolChange,
}: TimelineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<
    "playhead" | "clip" | "trim-left" | "trim-right" | "multi-select" | null
  >(null);
  const [dragClipId, setDragClipId] = useState<string | null>(null);
  const [scrollX, setScrollX] = useState(0);
  const [multiSelectStart, setMultiSelectStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [multiSelectEnd, setMultiSelectEnd] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [hoveredClipId, setHoveredClipId] = useState<string | null>(null);
  const [cursorStyle, setCursorStyle] = useState<string>("default");

  const TRACK_HEIGHT = 60;
  const HEADER_HEIGHT = 30;
  const RULER_HEIGHT = 25;

  const canvasWidth = Math.max(duration * zoom + 200, 800);
  const canvasHeight = RULER_HEIGHT + tracks.length * TRACK_HEIGHT + 20;

  // Compute snap points from clips and markers
  const snapPoints = useMemo(() => {
    if (!snapEnabled) return [];
    const points: number[] = [0, duration];

    // Clip edges
    for (const clip of clips) {
      points.push(clip.startTime);
      points.push(clip.startTime + clip.duration);
    }

    // Markers
    for (const marker of markers) {
      points.push(marker.time);
    }

    // Playhead
    points.push(currentTime);

    return [...new Set(points)].sort((a, b) => a - b);
  }, [clips, markers, currentTime, duration, snapEnabled]);

  // Snap helper
  const snapToPoint = useCallback(
    (time: number): number => {
      if (!snapEnabled || snapPoints.length === 0) return time;

      const pixelThreshold = snapThreshold / zoom;
      let closest = time;
      let minDist = Infinity;

      for (const point of snapPoints) {
        const dist = Math.abs(point - time);
        if (dist < minDist && dist < pixelThreshold) {
          minDist = dist;
          closest = point;
        }
      }

      return closest;
    },
    [snapEnabled, snapPoints, snapThreshold, zoom],
  );

  // Renderizar timeline
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear
    ctx.fillStyle = "var(--aethel-surface-primary)";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Ruler
    ctx.fillStyle = "var(--aethel-surface-tertiary)";
    ctx.fillRect(0, 0, canvasWidth, RULER_HEIGHT);

    // Time markers
    ctx.fillStyle = "var(--aethel-text-quaternary)";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";

    const secondsPerMarker =
      zoom > 100 ? 0.5 : zoom > 50 ? 1 : zoom > 25 ? 2 : 5;
    for (let t = 0; t <= duration; t += secondsPerMarker) {
      const x = t * zoom;

      // Major tick
      if (t % (secondsPerMarker * 2) === 0) {
        ctx.strokeStyle = "var(--aethel-text-tertiary)";
        ctx.beginPath();
        ctx.moveTo(x, RULER_HEIGHT - 15);
        ctx.lineTo(x, RULER_HEIGHT);
        ctx.stroke();

        ctx.fillText(formatTime(t), x, RULER_HEIGHT - 18);
      } else {
        // Minor tick
        ctx.strokeStyle = "var(--aethel-border-primary)";
        ctx.beginPath();
        ctx.moveTo(x, RULER_HEIGHT - 8);
        ctx.lineTo(x, RULER_HEIGHT);
        ctx.stroke();
      }
    }

    // Tracks
    tracks.forEach((track, i) => {
      const y = RULER_HEIGHT + i * TRACK_HEIGHT;

      // Track background
      ctx.fillStyle =
        i % 2 === 0
          ? "var(--aethel-surface-tertiary)"
          : "var(--aethel-surface-secondary)";
      ctx.fillRect(0, y, canvasWidth, TRACK_HEIGHT);

      // Track separator
      ctx.strokeStyle = "var(--aethel-border-primary)";
      ctx.beginPath();
      ctx.moveTo(0, y + TRACK_HEIGHT);
      ctx.lineTo(canvasWidth, y + TRACK_HEIGHT);
      ctx.stroke();
    });

    // Clips
    clips.forEach((clip) => {
      const track = tracks[clip.trackIndex];
      if (!track) return;

      const x = clip.startTime * zoom;
      const y = RULER_HEIGHT + clip.trackIndex * TRACK_HEIGHT + 4;
      const width = clip.duration * zoom;
      const height = TRACK_HEIGHT - 8;

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
      ctx.fillStyle = baseColor;

      // Rounded corners
      const radius = 4;
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, radius);
      ctx.fill();

      // Hover highlight
      if (isHovered && !isSelected) {
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Selection border
      if (isSelected) {
        ctx.strokeStyle = "var(--aethel-text-primary)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.lineWidth = 1;
      }

      // Locked indicator
      if (clip.locked) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, radius);
        ctx.fill();

        // Lock icon
        ctx.fillStyle = "var(--aethel-text-primary)";
        ctx.font = "14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("", x + width / 2, y + height / 2 + 5);
      }

      // Clip name with better styling
      ctx.fillStyle = "var(--aethel-text-primary)";
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
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 2;
        ctx.fillText(clip.name, textX, y + 15);
        ctx.shadowBlur = 0;

        // Duration indicator
        ctx.font = "9px monospace";
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillText(formatTimecode(clip.duration), textX, y + height - 6);
        ctx.restore();
      }

      // Trim handles (se selecionado ou hovered)
      if (isSelected || isHovered) {
        // Left handle
        const handleGradient = ctx.createLinearGradient(x, y, x + 8, y);
        handleGradient.addColorStop(0, "rgba(255,255,255,0.9)");
        handleGradient.addColorStop(1, "rgba(255,255,255,0.3)");
        ctx.fillStyle = handleGradient;
        ctx.fillRect(x, y, 8, height);

        // Right handle
        const handleGradientR = ctx.createLinearGradient(
          x + width - 8,
          y,
          x + width,
          y,
        );
        handleGradientR.addColorStop(0, "rgba(255,255,255,0.3)");
        handleGradientR.addColorStop(1, "rgba(255,255,255,0.9)");
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
          waveGradient.addColorStop(0, "rgba(255,255,255,0.45)");
          waveGradient.addColorStop(0.5, "rgba(255,255,255,0.25)");
          waveGradient.addColorStop(1, "rgba(255,255,255,0.45)");
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
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(x + 4, y + 4, 32, 18);
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("", x + 20, y + 17);
      }
    });

    // Markers
    for (const marker of markers) {
      const mx = marker.time * zoom;

      // Marker line
      ctx.strokeStyle = marker.color || "var(--aethel-warning)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 2]);
      ctx.beginPath();
      ctx.moveTo(mx, RULER_HEIGHT);
      ctx.lineTo(mx, canvasHeight);
      ctx.stroke();
      ctx.setLineDash([]);

      // Marker flag
      ctx.fillStyle = marker.color || "var(--aethel-warning)";
      ctx.beginPath();
      ctx.moveTo(mx - 6, 0);
      ctx.lineTo(mx + 6, 0);
      ctx.lineTo(mx + 6, 16);
      ctx.lineTo(mx, 12);
      ctx.lineTo(mx - 6, 16);
      ctx.closePath();
      ctx.fill();

      // Marker type icon
      ctx.fillStyle = "var(--aethel-surface-primary)";
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

      ctx.fillStyle = "rgba(59, 130, 246, 0.2)";
      ctx.fillRect(sx, sy, sw, sh);
      ctx.strokeStyle = "var(--aethel-primary)";
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
            ctx.strokeStyle = "var(--aethel-success)";
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
    ctx.strokeStyle = "var(--aethel-error)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, canvasHeight);
    ctx.stroke();

    // Playhead head (triangle)
    ctx.fillStyle = "var(--aethel-error)";
    ctx.beginPath();
    ctx.moveTo(playheadX - 8, 0);
    ctx.lineTo(playheadX + 8, 0);
    ctx.lineTo(playheadX, 12);
    ctx.closePath();
    ctx.fill();

    // Tool indicator
    if (tool !== "select") {
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(canvasWidth - 80, canvasHeight - 24, 75, 20);
      ctx.fillStyle = "var(--aethel-text-primary)";
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
  }, [
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
  ]);

  // Handle mouse events
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left + scrollX;
      const y = e.clientY - rect.top;

      // Check if clicking on playhead area (ruler)
      if (y < RULER_HEIGHT) {
        // Double-click adds marker
        if (e.detail === 2 && onMarkerAdd) {
          const time = snapToPoint(Math.max(0, Math.min(duration, x / zoom)));
          onMarkerAdd({
            id: `marker-${Date.now()}`,
            time,
            name: `Marcador ${markers.length + 1}`,
            color: "var(--aethel-warning)",
            type: "marker",
          });
          return;
        }

        setIsDragging(true);
        setDragType("playhead");
        const time = snapToPoint(Math.max(0, Math.min(duration, x / zoom)));
        onTimeChange(time);
        return;
      }

      // Check if clicking on a clip
      const clickedClip = clips.find((clip) => {
        if (clip.locked) return false;
        const clipX = clip.startTime * zoom;
        const clipY = RULER_HEIGHT + clip.trackIndex * TRACK_HEIGHT + 4;
        const clipWidth = clip.duration * zoom;
        const clipHeight = TRACK_HEIGHT - 8;

        return (
          x >= clipX &&
          x <= clipX + clipWidth &&
          y >= clipY &&
          y <= clipY + clipHeight
        );
      });

      // Razor tool - split clip at click position
      if (tool === "razor" && clickedClip && onClipSplit) {
        const splitTime = Math.max(0, x / zoom);
        if (
          splitTime > clickedClip.startTime &&
          splitTime < clickedClip.startTime + clickedClip.duration
        ) {
          onClipSplit(clickedClip.id, splitTime);
        }
        return;
      }

      if (clickedClip) {
        // Multi-select with Shift
        if (e.shiftKey) {
          // Toggle selection
          if (selectedClipIds.includes(clickedClip.id)) {
            // Would need onMultiSelect callback
          }
        }

        onClipSelect?.(clickedClip.id);

        const clipX = clickedClip.startTime * zoom;
        const clipWidth = clickedClip.duration * zoom;

        // Check trim handles (wider hitbox)
        if (x < clipX + 12) {
          setDragType("trim-left");
          setCursorStyle("ew-resize");
        } else if (x > clipX + clipWidth - 12) {
          setDragType("trim-right");
          setCursorStyle("ew-resize");
        } else {
          setDragType("clip");
          setCursorStyle("grabbing");
        }

        setIsDragging(true);
        setDragClipId(clickedClip.id);
      } else {
        onClipSelect?.(null);

        // Start multi-select rectangle
        if (y > RULER_HEIGHT) {
          setMultiSelectStart({ x, y });
          setMultiSelectEnd({ x, y });
          setDragType("multi-select");
          setIsDragging(true);
        }
      }
    },
    [
      clips,
      duration,
      zoom,
      scrollX,
      onTimeChange,
      onClipSelect,
      onClipSplit,
      onMarkerAdd,
      tool,
      selectedClipIds,
      markers.length,
      snapToPoint,
    ],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left + scrollX;
      const y = e.clientY - rect.top;

      // Update hovered clip
      if (!isDragging) {
        const hovered = clips.find((clip) => {
          const clipX = clip.startTime * zoom;
          const clipY = RULER_HEIGHT + clip.trackIndex * TRACK_HEIGHT + 4;
          const clipWidth = clip.duration * zoom;
          const clipHeight = TRACK_HEIGHT - 8;
          return (
            x >= clipX &&
            x <= clipX + clipWidth &&
            y >= clipY &&
            y <= clipY + clipHeight
          );
        });
        setHoveredClipId(hovered?.id ?? null);

        // Update cursor based on position
        if (hovered && !hovered.locked) {
          const clipX = hovered.startTime * zoom;
          const clipWidth = hovered.duration * zoom;
          if (x < clipX + 12 || x > clipX + clipWidth - 12) {
            setCursorStyle("ew-resize");
          } else {
            setCursorStyle(tool === "razor" ? "crosshair" : "grab");
          }
        } else {
          setCursorStyle(tool === "razor" ? "crosshair" : "default");
        }
      }

      if (!isDragging) return;

      if (dragType === "playhead") {
        const time = snapToPoint(Math.max(0, Math.min(duration, x / zoom)));
        onTimeChange(time);
      } else if (dragType === "multi-select") {
        setMultiSelectEnd({ x, y });
      } else if (dragType === "clip" && dragClipId && onClipMove) {
        let time = Math.max(0, x / zoom);
        time = snapToPoint(time);
        const trackIndex = Math.max(
          0,
          Math.min(
            tracks.length - 1,
            Math.floor((y - RULER_HEIGHT) / TRACK_HEIGHT),
          ),
        );
        onClipMove(dragClipId, time, trackIndex);
      } else if (
        (dragType === "trim-left" || dragType === "trim-right") &&
        dragClipId &&
        onClipTrim
      ) {
        const clip = clips.find((c) => c.id === dragClipId);
        if (!clip) return;

        const minClipDuration = 0.1;
        let mouseTime = Math.max(0, x / zoom);
        mouseTime = snapToPoint(mouseTime);

        if (dragType === "trim-left") {
          // Trim esquerdo: move o inicio na timeline e ajusta inPoint no source
          const maxStart =
            clip.startTime +
            Math.max(minClipDuration, clip.duration) -
            minClipDuration;
          const newStartTime = Math.min(Math.max(0, mouseTime), maxStart);
          const delta = newStartTime - clip.startTime;

          const newInPoint = Math.max(0, clip.inPoint + delta);
          const newOutPoint = Math.max(
            newInPoint + minClipDuration,
            clip.outPoint,
          );

          // Atualiza startTime via onClipMove para manter o modelo consistente
          onClipMove?.(dragClipId, newStartTime, clip.trackIndex);
          onClipTrim(dragClipId, newInPoint, newOutPoint);
        } else {
          // Trim direito: mantem startTime e ajusta outPoint/duracao
          const minEnd = clip.startTime + minClipDuration;
          const newEndTime = Math.max(mouseTime, minEnd);
          const newDuration = Math.max(
            minClipDuration,
            newEndTime - clip.startTime,
          );
          const newOutPoint = Math.max(
            clip.inPoint + minClipDuration,
            clip.inPoint + newDuration,
          );
          onClipTrim(dragClipId, clip.inPoint, newOutPoint);
        }
      }
    },
    [
      isDragging,
      dragType,
      dragClipId,
      duration,
      zoom,
      scrollX,
      tracks.length,
      clips,
      onTimeChange,
      onClipMove,
      onClipTrim,
      tool,
      snapToPoint,
    ],
  );

  const handleMouseUp = useCallback(() => {
    // Handle multi-select completion
    if (dragType === "multi-select" && multiSelectStart && multiSelectEnd) {
      // Find clips within selection rectangle
      // This would need additional callback to set selectedClipIds
    }

    setIsDragging(false);
    setDragType(null);
    setDragClipId(null);
    setMultiSelectStart(null);
    setMultiSelectEnd(null);
    setCursorStyle("default");
  }, [dragType, multiSelectStart, multiSelectEnd]);

  useVideoTimelineKeyboardShortcuts({
    clips,
    currentTime,
    duration,
    markers,
    onClipDelete,
    onMarkerAdd,
    onRippleDelete,
    onTimeChange,
    onToolChange,
    selectedClipId,
  });

  return (
    <div className="flex flex-col bg-[var(--aethel-surface-primary)] rounded-lg overflow-hidden">
      <VideoTimelineToolbar
        tool={tool}
        onToolChange={onToolChange}
        snapEnabled={snapEnabled}
        currentTime={currentTime}
        duration={duration}
        zoom={zoom}
      />

      {/* Track headers + Timeline */}
      <div className="flex">
        <VideoTrackHeaders tracks={tracks} />

        {/* Timeline Canvas */}
        <div ref={containerRef} className="flex-1 overflow-x-auto">
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: cursorStyle }}
          />
        </div>
      </div>
    </div>
  );
}

export default VideoTimeline;
export { VideoPreview } from "./VideoTimeline.parts";
