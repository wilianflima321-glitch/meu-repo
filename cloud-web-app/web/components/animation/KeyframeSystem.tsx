"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// ============================================================================
// TYPES - Professional Keyframe System (Premiere/After Effects style)
// ============================================================================

import {
  interpolateValue,
  type AnimatedProperty,
  type EasingType,
  type Keyframe,
  type KeyframeEditorProps,
  type KeyframeTrack,
  type KeyframeValue,
} from "./KeyframeSystem.model";
export {
  createDefaultAnimatedProperties,
  interpolateValue,
} from "./KeyframeSystem.model";
export type {
  AnimatedProperty,
  EasingType,
  Keyframe,
  KeyframeEditorProps,
  KeyframeTrack,
  KeyframeValue,
} from "./KeyframeSystem.model";

export { KeyframeControls } from "./KeyframeSystem.controls";
export type { KeyframeControlsProps } from "./KeyframeSystem.controls";

import { DEFAULT_VISIBLE_TIMELINE_RANGE, KEYFRAME_TIMELINE_LAYOUT } from "./KeyframeSystem.constants";
import { KeyframeContextMenu, type KeyframeContextMenuState } from "./KeyframeSystem.context-menu";
import {
  createKeyframePalette,
  findScrollableParent,
  type TimelineRow,
  type VisibleTimelineRange,
} from "./KeyframeSystem.view";
import { hitTestKeyframeAt, renderKeyframeTimeline } from "./KeyframeSystem.canvas";

export function KeyframeEditor({
  tracks,
  currentTime,
  duration,
  pixelsPerSecond,
  onKeyframeAdd,
  onKeyframeUpdate,
  onKeyframeDelete,
  onKeyframeMove,
  onTrackToggle,
  selectedKeyframes = [],
  onSelectionChange,
}: KeyframeEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [dragging, setDragging] = useState<{
    trackId: string;
    propertyId: string;
    keyframeId: string;
    startX: number;
    startTime: number;
  } | null>(null);

  const [hoveredKeyframe, setHoveredKeyframe] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<KeyframeContextMenuState | null>(null);
  const [visibleTimelineRange, setVisibleTimelineRange] =
    useState<VisibleTimelineRange>(DEFAULT_VISIBLE_TIMELINE_RANGE);

  const { trackHeight, propertyHeight, headerWidth, keyframeSize } = KEYFRAME_TIMELINE_LAYOUT;
  const palette = useMemo(createKeyframePalette, []);

  const timelineRows = useMemo<TimelineRow[]>(() => {
    const rows: TimelineRow[] = [];
    let y = 0;

    for (const track of tracks) {
      rows.push({
        kind: "track",
        trackId: track.id,
        track,
        y,
        height: trackHeight,
      });
      y += trackHeight;

      if (track.expanded) {
        for (const property of track.properties) {
          rows.push({
            kind: "property",
            trackId: track.id,
            track,
            propertyId: property.id,
            property,
            y,
            height: propertyHeight,
          });
          y += propertyHeight;
        }
      }
    }

    return rows;
  }, [propertyHeight, trackHeight, tracks]);

  // Calculate total height
  const totalHeight = useMemo(() => {
    const lastRow = timelineRows[timelineRows.length - 1];
    return lastRow ? lastRow.y + lastRow.height : 0;
  }, [timelineRows]);

  const sortedKeyframesByProperty = useMemo(() => {
    const map = new Map<string, Keyframe[]>();

    for (const track of tracks) {
      for (const property of track.properties) {
        map.set(
          `${track.id}:${property.id}`,
          [...property.keyframes].sort((a, b) => a.time - b.time),
        );
      }
    }

    return map;
  }, [tracks]);

  const selectedKeyframeIds = useMemo(
    () => new Set(selectedKeyframes),
    [selectedKeyframes],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === "undefined") return;

    const scrollParent = findScrollableParent(canvas);
    let frameId = 0;

    const updateVisibleRange = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        const canvasRect = canvas.getBoundingClientRect();
        const parentRect =
          scrollParent === window
            ? {
                top: 0,
                left: 0,
                width: window.innerWidth,
                height: window.innerHeight,
              }
            : (scrollParent as HTMLElement).getBoundingClientRect();

        const nextRange = {
          top: Math.max(0, parentRect.top - canvasRect.top),
          left: Math.max(0, parentRect.left - canvasRect.left),
          width: Math.max(320, parentRect.width),
          height: Math.max(240, parentRect.height),
        };

        setVisibleTimelineRange((previous) =>
          previous.top === nextRange.top &&
          previous.left === nextRange.left &&
          previous.width === nextRange.width &&
          previous.height === nextRange.height
            ? previous
            : nextRange,
        );
      });
    };

    updateVisibleRange();

    const scrollTarget =
      scrollParent === window ? window : (scrollParent as HTMLElement);
    scrollTarget.addEventListener("scroll", updateVisibleRange, {
      passive: true,
    });
    window.addEventListener("resize", updateVisibleRange);

    return () => {
      cancelAnimationFrame(frameId);
      scrollTarget.removeEventListener("scroll", updateVisibleRange);
      window.removeEventListener("resize", updateVisibleRange);
    };
  }, [totalHeight, duration, pixelsPerSecond]);

  // Canvas render is isolated so this component stays focused on state and interaction.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    renderKeyframeTimeline({
      ctx,
      width: canvas.width,
      height: canvas.height,
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
    });
  }, [
    currentTime,
    duration,
    pixelsPerSecond,
    selectedKeyframeIds,
    hoveredKeyframe,
    headerWidth,
    palette,
    propertyHeight,
    sortedKeyframesByProperty,
    timelineRows,
    trackHeight,
    keyframeSize,
    visibleTimelineRange,
  ]);

  // Hit test for keyframe
  const hitTestKeyframe = useCallback(
    (
      clientX: number,
      clientY: number,
    ): {
      trackId: string;
      propertyId: string;
      keyframe: Keyframe;
    } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      return hitTestKeyframeAt({
        canvas,
        clientX,
        clientY,
        timelineRows,
        sortedKeyframesByProperty,
        pixelsPerSecond,
        headerWidth,
        keyframeSize,
        propertyHeight,
      });
    },
    [
      timelineRows,
      sortedKeyframesByProperty,
      pixelsPerSecond,
      headerWidth,
      keyframeSize,
      propertyHeight,
    ],
  );

  // Mouse handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const hit = hitTestKeyframe(e.clientX, e.clientY);

      if (hit) {
        // Start dragging keyframe
        setDragging({
          trackId: hit.trackId,
          propertyId: hit.propertyId,
          keyframeId: hit.keyframe.id,
          startX: e.clientX,
          startTime: hit.keyframe.time,
        });

        // Update selection
        if (e.shiftKey && onSelectionChange) {
          if (selectedKeyframes.includes(hit.keyframe.id)) {
            onSelectionChange(
              selectedKeyframes.filter((id) => id !== hit.keyframe.id),
            );
          } else {
            onSelectionChange([...selectedKeyframes, hit.keyframe.id]);
          }
        } else if (onSelectionChange) {
          onSelectionChange([hit.keyframe.id]);
        }
      } else {
        // Check for track header click
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (x < headerWidth) {
          const trackRow = timelineRows.find(
            (row) => row.kind === "track" && y >= row.y && y < row.y + row.height,
          );
          if (trackRow?.kind === "track") {
            onTrackToggle?.(trackRow.trackId);
            return;
          }
        } else if (e.detail === 2) {
          // Double-click to add keyframe
          const time = (x - headerWidth) / Math.max(1, pixelsPerSecond);

          const propertyRow = timelineRows.find(
            (row) =>
              row.kind === "property" && y >= row.y && y < row.y + row.height,
          );

          if (propertyRow?.kind === "property") {
            const currentValue = interpolateValue(
              propertyRow.property.keyframes,
              time,
              propertyRow.property.defaultValue,
            );
            onKeyframeAdd(
              propertyRow.trackId,
              propertyRow.propertyId,
              time,
              currentValue,
            );
            return;
          }
        }

        // Clear selection on empty click
        if (onSelectionChange) {
          onSelectionChange([]);
        }
      }
    },
    [
      hitTestKeyframe,
      selectedKeyframes,
      onSelectionChange,
      timelineRows,
      headerWidth,
      pixelsPerSecond,
      onKeyframeAdd,
      onTrackToggle,
    ],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const hit = hitTestKeyframe(e.clientX, e.clientY);
      setHoveredKeyframe(hit?.keyframe.id ?? null);

      if (dragging) {
        const dx = e.clientX - dragging.startX;
        const newTime = Math.max(
          0,
          Math.min(duration, dragging.startTime + dx / Math.max(1, pixelsPerSecond)),
        );
        onKeyframeMove(
          dragging.trackId,
          dragging.propertyId,
          dragging.keyframeId,
          newTime,
        );
      }
    },
    [hitTestKeyframe, dragging, duration, pixelsPerSecond, onKeyframeMove],
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();

      const hit = hitTestKeyframe(e.clientX, e.clientY);
      if (hit) {
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          trackId: hit.trackId,
          propertyId: hit.propertyId,
          keyframeId: hit.keyframe.id,
        });
      }
    },
    [hitTestKeyframe],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        // Delete selected keyframes
        for (const track of tracks) {
          for (const prop of track.properties) {
            for (const kf of prop.keyframes) {
              if (selectedKeyframeIds.has(kf.id)) {
                onKeyframeDelete(track.id, prop.id, kf.id);
              }
            }
          }
        }
        onSelectionChange?.([]);
      }
    },
    [tracks, selectedKeyframeIds, onKeyframeDelete, onSelectionChange],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Context menu UI
  const handleContextMenuEasingChange = useCallback(
    (easing: EasingType) => {
      if (!contextMenu) return;
      onKeyframeUpdate(
        contextMenu.trackId,
        contextMenu.propertyId,
        contextMenu.keyframeId,
        { easing },
      );
      setContextMenu(null);
    },
    [contextMenu, onKeyframeUpdate],
  );

  const handleContextMenuDelete = useCallback(() => {
    if (!contextMenu) return;
      onKeyframeDelete(
        contextMenu.trackId,
        contextMenu.propertyId,
        contextMenu.keyframeId,
      );
    setContextMenu(null);
  }, [contextMenu, onKeyframeDelete]);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <canvas
        ref={canvasRef}
        width={Math.max(600, headerWidth + duration * pixelsPerSecond + 100)}
        height={Math.max(100, totalHeight)}
        style={{
          background: palette.surfaceBase,
          borderRadius: 4,
          cursor: dragging
            ? "grabbing"
            : hoveredKeyframe
              ? "pointer"
              : "default",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
      />
      {contextMenu && (
        <KeyframeContextMenu
          menu={contextMenu}
          palette={palette}
          onEasingChange={handleContextMenuEasingChange}
          onDelete={handleContextMenuDelete}
          onClose={() => setContextMenu(null)}
        />
      )}
      {contextMenu && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 999 }}
          onClick={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

export default KeyframeEditor;
