"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  categoryColors,
  TARGET_FRAME_TIME,
  WARNING_FRAME_TIME,
} from "./advanced-profiler-models";
import type {
  MemoryStats,
  ProfilerFrame,
  ProfilerMarker,
} from "./advanced-profiler-models";

// ============================================================================
// FRAME TIMELINE COMPONENT
// ============================================================================

interface FrameTimelineProps {
  frames: ProfilerFrame[];
  selectedFrame: number | null;
  onSelectFrame: (frameId: number) => void;
  viewRange: { start: number; end: number };
  onViewRangeChange: (range: { start: number; end: number }) => void;
}

export function FrameTimeline({
  frames,
  selectedFrame,
  onSelectFrame,
  viewRange,
  onViewRangeChange,
}: FrameTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);

  const visibleFrames = useMemo(() => {
    return frames.slice(viewRange.start, viewRange.end);
  }, [frames, viewRange]);

  const maxFrameTime = useMemo(() => {
    return Math.max(
      ...visibleFrames.map((f) => f.duration),
      TARGET_FRAME_TIME * 2,
    );
  }, [visibleFrames]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart(e.clientX);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const delta = (e.clientX - dragStart) / containerRef.current.clientWidth;
      const frameCount = frames.length;
      const viewSize = viewRange.end - viewRange.start;
      const shift = Math.round(delta * viewSize);

      if (shift !== 0) {
        const newStart = Math.max(
          0,
          Math.min(frameCount - viewSize, viewRange.start - shift),
        );
        const newEnd = newStart + viewSize;
        onViewRangeChange({ start: newStart, end: newEnd });
        setDragStart(e.clientX);
      }
    },
    [isDragging, dragStart, frames.length, viewRange, onViewRangeChange],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.2 : 0.8;
    const viewSize = viewRange.end - viewRange.start;
    const newSize = Math.max(
      20,
      Math.min(frames.length, Math.round(viewSize * zoomFactor)),
    );
    const center = (viewRange.start + viewRange.end) / 2;
    const newStart = Math.max(0, Math.round(center - newSize / 2));
    const newEnd = Math.min(frames.length, newStart + newSize);
    onViewRangeChange({ start: newStart, end: newEnd });
  };

  return (
    <div style={{ marginBottom: "16px" }}>
      <h3 style={{ color: "white", fontSize: "14px", marginBottom: "8px" }}>
        Frame Timeline
      </h3>

      {/* Timeline view */}
      <div
        ref={containerRef}
        style={{
          height: "120px",
          background: "var(--aethel-surface-primary)",
          borderRadius: "8px",
          position: "relative",
          overflow: "hidden",
          cursor: isDragging ? "grabbing" : "grab",
        }}
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
      >
        {/* Target line (60 FPS) */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: `${(TARGET_FRAME_TIME / maxFrameTime) * 100}%`,
            height: "1px",
            background: "var(--aethel-success)",
            opacity: 0.5,
            zIndex: 1,
          }}
        />

        {/* Warning line (30 FPS) */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: `${(WARNING_FRAME_TIME / maxFrameTime) * 100}%`,
            height: "1px",
            background: "var(--aethel-warning)",
            opacity: 0.5,
            zIndex: 1,
          }}
        />

        {/* Frame bars */}
        <div
          style={{
            display: "flex",
            height: "100%",
            alignItems: "flex-end",
            padding: "4px",
          }}
        >
          {visibleFrames.map((frame, index) => {
            const height = (frame.duration / maxFrameTime) * 100;
            const isSelected = frame.frameId === selectedFrame;
            const isSlow = frame.duration > WARNING_FRAME_TIME;
            const isWarning = frame.duration > TARGET_FRAME_TIME && !isSlow;

            return (
              <div
                key={frame.frameId}
                onClick={() => onSelectFrame(frame.frameId)}
                style={{
                  flex: 1,
                  maxWidth: "10px",
                  height: `${Math.min(100, height)}%`,
                  background: isSlow
                    ? "var(--aethel-error)"
                    : isWarning
                      ? "var(--aethel-warning)"
                      : "var(--aethel-primary)",
                  borderRadius: "2px 2px 0 0",
                  cursor: "pointer",
                  opacity: isSelected ? 1 : 0.7,
                  border: isSelected ? "2px solid white" : "none",
                  marginRight: "1px",
                  transition: "opacity 0.1s",
                }}
                title={`Frame ${frame.frameId}: ${frame.duration.toFixed(2)}ms`}
              />
            );
          })}
        </div>

        {/* Labels */}
        <div
          style={{
            position: "absolute",
            right: "8px",
            top: "8px",
            fontSize: "10px",
            color: "var(--aethel-text-muted)",
          }}
        >
          {(1000 / maxFrameTime).toFixed(0)} FPS
        </div>
      </div>

      {/* Scroll bar */}
      <div
        style={{
          height: "8px",
          background: "var(--aethel-surface-tertiary)",
          borderRadius: "4px",
          marginTop: "4px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: `${(viewRange.start / frames.length) * 100}%`,
            width: `${((viewRange.end - viewRange.start) / frames.length) * 100}%`,
            height: "100%",
            background: "var(--aethel-primary)",
            borderRadius: "4px",
          }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// FLAME GRAPH COMPONENT
// ============================================================================

interface FlameGraphProps {
  markers: ProfilerMarker[];
  frameTime: number;
  type: "cpu" | "gpu";
}

export function FlameGraph({ markers, frameTime, type }: FlameGraphProps) {
  const [hoveredMarker, setHoveredMarker] = useState<ProfilerMarker | null>(
    null,
  );
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const flattenMarkers = useCallback(
    (
      markers: ProfilerMarker[],
      depth = 0,
    ): (ProfilerMarker & { depth: number })[] => {
      const result: (ProfilerMarker & { depth: number })[] = [];

      for (const marker of markers) {
        result.push({ ...marker, depth });
        if (marker.children) {
          result.push(...flattenMarkers(marker.children, depth + 1));
        }
      }

      return result;
    },
    [],
  );

  const flatMarkers = useMemo(
    () => flattenMarkers(markers),
    [markers, flattenMarkers],
  );
  const maxDepth = useMemo(
    () => Math.max(...flatMarkers.map((m) => m.depth), 0) + 1,
    [flatMarkers],
  );

  const handleMouseMove = (e: React.MouseEvent, marker: ProfilerMarker) => {
    setHoveredMarker(marker);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  return (
    <div style={{ marginBottom: "16px" }}>
      <h3 style={{ color: "white", fontSize: "14px", marginBottom: "8px" }}>
        {type === "cpu" ? "CPU" : "GPU"} Flame Graph
      </h3>

      <div
        style={{
          background: "var(--aethel-surface-primary)",
          borderRadius: "8px",
          padding: "8px",
          position: "relative",
          minHeight: `${maxDepth * 24 + 16}px`,
        }}
      >
        {flatMarkers.map((marker) => {
          const left = (marker.startTime / frameTime) * 100;
          const width = Math.max(0.5, (marker.duration / frameTime) * 100);

          return (
            <div
              key={marker.id}
              style={{
                position: "absolute",
                left: `${left}%`,
                width: `${width}%`,
                top: `${marker.depth * 24 + 8}px`,
                height: "20px",
                background: categoryColors[marker.category] || marker.color,
                borderRadius: "2px",
                display: "flex",
                alignItems: "center",
                padding: "0 4px",
                cursor: "pointer",
                overflow: "hidden",
                border:
                  hoveredMarker?.id === marker.id ? "1px solid white" : "none",
              }}
              onMouseMove={(e) => handleMouseMove(e, marker)}
              onMouseLeave={() => setHoveredMarker(null)}
            >
              <span
                style={{
                  fontSize: "10px",
                  color: "white",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {marker.name}
              </span>
            </div>
          );
        })}

        {/* Time scale */}
        <div
          style={{
            position: "absolute",
            bottom: "4px",
            left: "8px",
            right: "8px",
            display: "flex",
            justifyContent: "space-between",
            fontSize: "9px",
            color: "var(--aethel-text-muted)",
          }}
        >
          <span>0ms</span>
          <span>{(frameTime / 4).toFixed(1)}ms</span>
          <span>{(frameTime / 2).toFixed(1)}ms</span>
          <span>{((frameTime * 3) / 4).toFixed(1)}ms</span>
          <span>{frameTime.toFixed(1)}ms</span>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredMarker && (
        <div
          style={{
            position: "fixed",
            left: tooltipPos.x + 10,
            top: tooltipPos.y + 10,
            background: "var(--aethel-surface-tertiary)",
            border: "1px solid var(--aethel-border-primary)",
            borderRadius: "6px",
            padding: "8px 12px",
            zIndex: 1000,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              color: "white",
              fontSize: "12px",
              fontWeight: "bold",
              marginBottom: "4px",
            }}
          >
            {hoveredMarker.name}
          </div>
          <div
            style={{ color: "var(--aethel-text-tertiary)", fontSize: "11px" }}
          >
            Duration: {hoveredMarker.duration.toFixed(3)}ms
          </div>
          <div style={{ color: "var(--aethel-text-muted)", fontSize: "10px" }}>
            Category: {hoveredMarker.category}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MEMORY PANEL COMPONENT
// ============================================================================

interface MemoryPanelProps {
  stats: MemoryStats;
  history: MemoryStats[];
}

export function MemoryPanel({ stats, history }: MemoryPanelProps) {
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const usagePercent = (stats.usedHeap / stats.totalHeap) * 100;

  return (
    <div
      style={{
        padding: "12px",
        background: "var(--aethel-surface-primary)",
        borderRadius: "8px",
      }}
    >
      <h3 style={{ color: "white", fontSize: "14px", marginBottom: "12px" }}>
        Memory
      </h3>

      {/* Heap usage bar */}
      <div style={{ marginBottom: "12px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "4px",
          }}
        >
          <span
            style={{ color: "var(--aethel-text-tertiary)", fontSize: "12px" }}
          >
            Heap Usage
          </span>
          <span style={{ color: "var(--aethel-text-muted)", fontSize: "11px" }}>
            {formatBytes(stats.usedHeap)} / {formatBytes(stats.totalHeap)}
          </span>
        </div>
        <div
          style={{
            height: "8px",
            background: "var(--aethel-surface-tertiary)",
            borderRadius: "4px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${usagePercent}%`,
              height: "100%",
              background:
                usagePercent > 80
                  ? "var(--aethel-error)"
                  : usagePercent > 60
                    ? "var(--aethel-warning)"
                    : "var(--aethel-success)",
              transition: "width 0.3s",
            }}
          />
        </div>
      </div>

      {/* Memory breakdown */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}
      >
        <div
          style={{
            padding: "8px",
            background: "var(--aethel-surface-tertiary)",
            borderRadius: "4px",
          }}
        >
          <div style={{ color: "var(--aethel-text-muted)", fontSize: "10px" }}>
            Textures
          </div>
          <div style={{ color: "white", fontSize: "14px", fontWeight: "bold" }}>
            {formatBytes(stats.textures)}
          </div>
        </div>

        <div
          style={{
            padding: "8px",
            background: "var(--aethel-surface-tertiary)",
            borderRadius: "4px",
          }}
        >
          <div style={{ color: "var(--aethel-text-muted)", fontSize: "10px" }}>
            Geometries
          </div>
          <div style={{ color: "white", fontSize: "14px", fontWeight: "bold" }}>
            {formatBytes(stats.geometries)}
          </div>
        </div>

        <div
          style={{
            padding: "8px",
            background: "var(--aethel-surface-tertiary)",
            borderRadius: "4px",
          }}
        >
          <div style={{ color: "var(--aethel-text-muted)", fontSize: "10px" }}>
            Materials
          </div>
          <div style={{ color: "white", fontSize: "14px", fontWeight: "bold" }}>
            {formatBytes(stats.materials)}
          </div>
        </div>

        <div
          style={{
            padding: "8px",
            background: "var(--aethel-surface-tertiary)",
            borderRadius: "4px",
          }}
        >
          <div style={{ color: "var(--aethel-text-muted)", fontSize: "10px" }}>
            Shaders
          </div>
          <div style={{ color: "white", fontSize: "14px", fontWeight: "bold" }}>
            {formatBytes(stats.shaders)}
          </div>
        </div>
      </div>

      {/* Memory graph */}
      <div style={{ marginTop: "12px" }}>
        <div
          style={{
            color: "var(--aethel-text-muted)",
            fontSize: "11px",
            marginBottom: "4px",
          }}
        >
          History
        </div>
        <div
          style={{
            height: "50px",
            background: "var(--aethel-surface-tertiary)",
            borderRadius: "4px",
            display: "flex",
            alignItems: "flex-end",
            padding: "4px",
            gap: "1px",
          }}
        >
          {history.slice(-50).map((h, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${(h.usedHeap / h.totalHeap) * 100}%`,
                background: "var(--aethel-primary)",
                borderRadius: "1px",
                minWidth: "2px",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export { CategoryBreakdown, StatsPanel } from "./AdvancedProfiler.stats";
