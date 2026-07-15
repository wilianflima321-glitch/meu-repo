"use client";

/**
 * Video Timeline - professional video editing timeline
 *
 * Features: snap, markers, razor, ripple, multi-select.
 * Canvas-rendered tracks/clips with HTMLVideoElement preview hooks.
 * Target feel: Adobe Premiere Pro / DaVinci Resolve-grade editing affordances.
 */
import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  useVideoTimelineKeyboardShortcuts,
  VideoPreview,
  VideoTimelineToolbar,
  VideoTrackHeaders,
} from "./VideoTimeline.parts";
import { drawVideoTimelineCanvas } from './VideoTimeline.canvas';

// ============================================================================
// TYPES
// ============================================================================
import type { TimelineMarker, TimelineProps, TimelineTool, TimelineTrack, VideoClip } from './VideoTimeline.types';

export type { TimelineMarker, TimelineProps, TimelineTool, TimelineTrack, VideoClip } from './VideoTimeline.types';

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

  // Render timeline
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawVideoTimelineCanvas({
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
      trackHeight: TRACK_HEIGHT,
      rulerHeight: RULER_HEIGHT,
    });
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
