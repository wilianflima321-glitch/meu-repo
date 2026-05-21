"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

function resolveCssVarColor(varName: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  return value || fallback;
}

function withAlpha(color: string, alpha: number): string {
  if (color.startsWith("rgb(")) {
    return `rgba(${color.slice(4, -1)}, ${alpha})`;
  }
  if (color.startsWith("rgba(")) {
    const parts = color
      .slice(5, -1)
      .split(",")
      .map((p) => p.trim());
    return `rgba(${parts.slice(0, 3).join(", ")}, ${alpha})`;
  }
  return color;
}

function resolveCssVarRgba(
  varName: string,
  alpha: number,
  fallback: string,
): string {
  const base = resolveCssVarColor(varName, fallback);
  return withAlpha(base, alpha);
}

// ============================================================================
// TYPES - Professional Keyframe System (Premiere/After Effects style)
// ============================================================================

import {
  evaluateEasing,
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
  evaluateEasing,
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

type TimelineRow =
  | {
      kind: "track";
      trackId: string;
      track: KeyframeTrack;
      y: number;
      height: number;
    }
  | {
      kind: "property";
      trackId: string;
      track: KeyframeTrack;
      propertyId: string;
      property: AnimatedProperty;
      y: number;
      height: number;
    };

interface VisibleTimelineRange {
  top: number;
  left: number;
  width: number;
  height: number;
}

const TIMELINE_DRAW_OVERSCAN = 160;

function findScrollableParent(element: HTMLElement): HTMLElement | Window {
  let current: HTMLElement | null = element.parentElement;

  while (current) {
    const style = window.getComputedStyle(current);
    const overflow = `${style.overflow}${style.overflowY}${style.overflowX}`;
    if (/(auto|scroll|overlay)/.test(overflow)) {
      return current;
    }
    current = current.parentElement;
  }

  return window;
}

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
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    trackId: string;
    propertyId: string;
    keyframeId: string;
  } | null>(null);
  const [visibleTimelineRange, setVisibleTimelineRange] =
    useState<VisibleTimelineRange>({
      top: 0,
      left: 0,
      width: 1200,
      height: 640,
    });

  const trackHeight = 24;
  const propertyHeight = 20;
  const headerWidth = 200;
  const keyframeSize = 10;
  const palette = useMemo(
    () => ({
      primary: resolveCssVarColor("--aethel-primary", "rgb(99, 102, 241)"),
      primaryLight: resolveCssVarColor(
        "--aethel-primary-light",
        "rgb(129, 140, 248)",
      ),
      primaryDark: resolveCssVarColor(
        "--aethel-primary-dark",
        "rgb(79, 70, 229)",
      ),
      surfaceBase: resolveCssVarColor(
        "--aethel-surface-primary",
        "rgb(10, 10, 15)",
      ),
      surfaceMid: resolveCssVarColor(
        "--aethel-surface-secondary",
        "rgb(17, 17, 24)",
      ),
      surfaceStrong: resolveCssVarColor(
        "--aethel-surface-tertiary",
        "rgb(26, 26, 36)",
      ),
      surfaceDeep: resolveCssVarColor(
        "--aethel-surface-quaternary",
        "rgb(37, 37, 50)",
      ),
      textPrimary: resolveCssVarColor(
        "--aethel-text-primary",
        "rgb(248, 250, 252)",
      ),
      textSecondary: resolveCssVarColor(
        "--aethel-text-secondary",
        "rgb(226, 232, 240)",
      ),
      textTertiary: resolveCssVarColor(
        "--aethel-text-tertiary",
        "rgb(148, 163, 184)",
      ),
      textQuaternary: resolveCssVarColor(
        "--aethel-text-quaternary",
        "rgb(100, 116, 139)",
      ),
      textMuted: resolveCssVarColor("--aethel-text-muted", "rgb(71, 85, 105)"),
      border: resolveCssVarColor(
        "--aethel-border-primary",
        "rgba(255, 255, 255, 0.12)",
      ),
      error: resolveCssVarColor("--aethel-error", "rgb(239, 68, 68)"),
      primaryAlpha: resolveCssVarRgba(
        "--aethel-primary",
        0.5,
        "rgb(99, 102, 241)",
      ),
    }),
    [],
  );

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

  // Draw keyframe diamonds
  const drawKeyframe = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      selected: boolean,
      hovered: boolean,
      easing: EasingType,
    ) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);

      const size = keyframeSize / 2;

      // Shadow for depth
      if (selected || hovered) {
        ctx.shadowColor = selected ? palette.primaryLight : palette.textMuted;
        ctx.shadowBlur = 6;
      }

      // Fill based on state
      if (selected) {
        ctx.fillStyle = palette.primary;
      } else if (hovered) {
        ctx.fillStyle = palette.primaryLight;
      } else {
        ctx.fillStyle = palette.textMuted;
      }

      ctx.fillRect(-size, -size, size * 2, size * 2);

      // Border
      ctx.strokeStyle = selected ? palette.primaryDark : palette.textQuaternary;
      ctx.lineWidth = 1;
      ctx.strokeRect(-size, -size, size * 2, size * 2);

      // Easing indicator (small icon inside)
      ctx.shadowBlur = 0;
      if (easing !== "linear") {
        ctx.fillStyle = palette.textPrimary;
        ctx.font = "6px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        let icon = "";
        switch (easing) {
          case "easeIn":
            icon = "I";
            break;
          case "easeOut":
            icon = "O";
            break;
          case "easeInOut":
            icon = "S";
            break;
          case "hold":
            icon = "=";
            break;
          case "bezier":
            icon = "B";
            break;
          case "bounce":
            icon = "~";
            break;
          case "elastic":
            icon = "E";
            break;
        }

        ctx.rotate(-Math.PI / 4);
        ctx.fillText(icon, 0, 0);
      }

      ctx.restore();
    },
    [keyframeSize, palette],
  );

  // Draw easing curve preview between keyframes
  const drawEasingCurve = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      x1: number,
      x2: number,
      y: number,
      easing: EasingType,
      bezierIn?: { x: number; y: number },
      bezierOut?: { x: number; y: number },
    ) => {
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
    },
    [palette],
  );

  // Main render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const visibleTop = Math.max(0, visibleTimelineRange.top - TIMELINE_DRAW_OVERSCAN);
    const visibleLeft = Math.max(0, visibleTimelineRange.left - TIMELINE_DRAW_OVERSCAN);
    const visibleBottom = Math.min(
      height,
      visibleTimelineRange.top + visibleTimelineRange.height + TIMELINE_DRAW_OVERSCAN,
    );
    const visibleRight = Math.min(
      width,
      visibleTimelineRange.left + visibleTimelineRange.width + TIMELINE_DRAW_OVERSCAN,
    );
    const visibleWidth = Math.max(1, visibleRight - visibleLeft);
    const visibleHeight = Math.max(1, visibleBottom - visibleTop);

    // Clear
    ctx.fillStyle = palette.surfaceBase;
    ctx.fillRect(visibleLeft, visibleTop, visibleWidth, visibleHeight);

    // Draw timeline grid
    ctx.strokeStyle = palette.border;
    ctx.lineWidth = 1;

    const secondWidth = Math.max(1, pixelsPerSecond);
    const firstVisibleSecond = Math.max(
      0,
      Math.floor((visibleLeft - headerWidth) / secondWidth),
    );
    const lastVisibleSecond = Math.min(
      duration,
      Math.ceil((visibleRight - headerWidth) / secondWidth),
    );
    for (let s = firstVisibleSecond; s <= lastVisibleSecond; s++) {
      const x = headerWidth + s * secondWidth;
      ctx.beginPath();
      ctx.moveTo(x, visibleTop);
      ctx.lineTo(x, visibleBottom);
      ctx.stroke();
    }

    // Draw tracks and keyframes
    for (const row of timelineRows) {
      if (row.y + row.height < visibleTop || row.y > visibleBottom) continue;

      if (row.kind === "track") {
        const { track, y } = row;
        // Track header background
        ctx.fillStyle = palette.surfaceMid;
        ctx.fillRect(0, y, headerWidth, trackHeight);

        // Track label
        ctx.fillStyle = palette.textSecondary;
        ctx.font = "bold 11px system-ui";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(track.clipId.slice(0, 20), 24, y + trackHeight / 2);

        // Expand/collapse button
        ctx.fillStyle = palette.textQuaternary;
        ctx.font = "10px system-ui";
        ctx.fillText(track.expanded ? "v" : ">", 8, y + trackHeight / 2);

        // Track background
        ctx.fillStyle = palette.surfaceStrong;
        ctx.fillRect(headerWidth, y, width - headerWidth, trackHeight);
        continue;
      }

      const { property, trackId, propertyId, y } = row;
      // Property row background
      ctx.fillStyle = palette.surfaceMid;
      ctx.fillRect(0, y, headerWidth, propertyHeight);

      // Property label
      ctx.fillStyle = palette.textTertiary;
      ctx.font = "10px system-ui";
      ctx.fillText(`  ${property.name}`, 24, y + propertyHeight / 2);

      // Property timeline background
      ctx.fillStyle = palette.surfaceBase;
      ctx.fillRect(headerWidth, y, width - headerWidth, propertyHeight);

      const sorted =
        sortedKeyframesByProperty.get(`${trackId}:${propertyId}`) ?? [];
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
            drawEasingCurve(
              ctx,
              x,
              nextX,
              centerY,
              kf.easing,
              kf.bezierOut,
              nextKf.bezierIn,
            );
          }
        }

        if (x < visibleLeft || x > visibleRight) continue;

        drawKeyframe(
          ctx,
          x,
          centerY,
          selectedKeyframeIds.has(kf.id),
          hoveredKeyframe === kf.id,
          kf.easing,
        );
      }
    }

    // Draw playhead
    const playheadX = headerWidth + currentTime * pixelsPerSecond;
    if (playheadX >= visibleLeft && playheadX <= visibleRight) {
      ctx.strokeStyle = palette.error;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, visibleTop);
      ctx.lineTo(playheadX, visibleBottom);
      ctx.stroke();

      // Playhead head
      ctx.fillStyle = palette.error;
      ctx.beginPath();
      ctx.moveTo(playheadX - 6, Math.max(0, visibleTop));
      ctx.lineTo(playheadX + 6, Math.max(0, visibleTop));
      ctx.lineTo(playheadX, Math.max(8, visibleTop + 8));
      ctx.closePath();
      ctx.fill();
    }
  }, [
    currentTime,
    duration,
    pixelsPerSecond,
    selectedKeyframeIds,
    hoveredKeyframe,
    drawKeyframe,
    drawEasingCurve,
    headerWidth,
    palette,
    propertyHeight,
    sortedKeyframesByProperty,
    timelineRows,
    trackHeight,
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

      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      for (const row of timelineRows) {
        if (row.kind !== "property") continue;
        if (y < row.y || y > row.y + row.height) continue;

        const centerY = row.y + propertyHeight / 2;
        const sorted =
          sortedKeyframesByProperty.get(`${row.trackId}:${row.propertyId}`) ??
          row.property.keyframes;

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
  const renderContextMenu = () => {
    if (!contextMenu) return null;

    const handleEasingChange = (easing: EasingType) => {
      onKeyframeUpdate(
        contextMenu.trackId,
        contextMenu.propertyId,
        contextMenu.keyframeId,
        { easing },
      );
      setContextMenu(null);
    };

    const handleDelete = () => {
      onKeyframeDelete(
        contextMenu.trackId,
        contextMenu.propertyId,
        contextMenu.keyframeId,
      );
      setContextMenu(null);
    };

    return (
      <div
        style={{
          position: "fixed",
          left: contextMenu.x,
          top: contextMenu.y,
          background: palette.surfaceStrong,
          border: `1px solid ${palette.border}`,
          borderRadius: 4,
          padding: 4,
          zIndex: 1000,
          minWidth: 150,
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        }}
        onClick={() => setContextMenu(null)}
      >
        <div
          style={{
            padding: "4px 8px",
            color: palette.textTertiary,
            fontSize: 10,
            borderBottom: `1px solid ${palette.border}`,
          }}
        >
          Easing
        </div>
        {(
          [
            "linear",
            "easeIn",
            "easeOut",
            "easeInOut",
            "hold",
            "bounce",
            "elastic",
            "bezier",
          ] as EasingType[]
        ).map((easing) => (
          <div
            key={easing}
            onClick={() => handleEasingChange(easing)}
            style={{
              padding: "6px 8px",
              cursor: "pointer",
              color: palette.textSecondary,
              fontSize: 11,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = palette.surfaceDeep)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <span style={{ width: 16 }}>
              {easing === "linear" && "-"}
              {easing === "easeIn" && "I"}
              {easing === "easeOut" && "O"}
              {easing === "easeInOut" && "S"}
              {easing === "hold" && "="}
              {easing === "bounce" && "~"}
              {easing === "elastic" && "E"}
              {easing === "bezier" && "B"}
            </span>
            {easing.charAt(0).toUpperCase() + easing.slice(1)}
          </div>
        ))}
        <div
          style={{
            borderTop: `1px solid ${palette.border}`,
            marginTop: 4,
            paddingTop: 4,
          }}
        >
          <div
            onClick={handleDelete}
            style={{
              padding: "6px 8px",
              cursor: "pointer",
              color: palette.error,
              fontSize: 11,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = palette.surfaceDeep)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            [x] Delete keyframe
          </div>
        </div>
      </div>
    );
  };

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
      {renderContextMenu()}
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
