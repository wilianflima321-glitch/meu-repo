"use client";

import React, { useCallback, useRef, useState } from "react";
import {
  Camera,
  Diamond,
  Eye,
  EyeOff,
  Layers,
  Lightbulb,
  Lock,
  Music,
  Move,
  Trash2,
  Unlock,
  Volume2,
  VolumeX,
} from "lucide-react";
import type {
  TimelineKeyframe,
  TimelineTrack,
  TrackType,
} from "./SequencerTimeline.types";

// ============================================================================
// STYLES
// ============================================================================

export const colors = {
  bg: "var(--aethel-surface-primary)",
  surface: "var(--aethel-surface-secondary)",
  surfaceHover: "var(--aethel-surface-tertiary)",
  surfaceActive: "var(--aethel-surface-quaternary)",
  border: "var(--aethel-border-primary)",
  borderLight: "var(--aethel-border-secondary)",
  text: "var(--aethel-text-primary)",
  textMuted: "var(--aethel-text-tertiary)",
  textDim: "var(--aethel-text-quaternary)",
  primary: "var(--aethel-primary)",
  primaryHover: "var(--aethel-primary-light)",
  success: "var(--aethel-success)",
  warning: "var(--aethel-warning)",
  error: "var(--aethel-error)",
  // Track colors
  camera: "var(--aethel-warning)",
  transform: "var(--aethel-success)",
  light: "var(--aethel-warning-light)",
  audio: "var(--aethel-info)",
  event: "var(--aethel-accent)",
  material: "var(--aethel-secondary)",
  visibility: "var(--aethel-text-tertiary)",
};

const trackTypeIcons: Record<TrackType, typeof Camera> = {
  camera: Camera,
  transform: Move,
  light: Lightbulb,
  audio: Music,
  event: Diamond,
  material: Layers,
  visibility: Eye,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function formatTime(seconds: number, frameRate: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const frames = Math.floor((seconds % 1) * frameRate);
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
}

export function formatAbsoluteFrame(seconds: number, frameRate: number): number {
  return Math.floor(seconds * frameRate);
}

export function timeToPixels(time: number, pixelsPerSecond: number): number {
  return time * pixelsPerSecond;
}

export function pixelsToTime(pixels: number, pixelsPerSecond: number): number {
  return pixels / pixelsPerSecond;
}

// ============================================================================
// PLAYHEAD COMPONENT
// ============================================================================

export const Playhead: React.FC<{
  time: number;
  pixelsPerSecond: number;
  height: number;
  onDrag: (newTime: number) => void;
}> = ({ time, pixelsPerSecond, height, onDrag }) => {
  const x = timeToPixels(time, pixelsPerSecond);
  const isDragging = useRef(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      isDragging.current = true;

      const handleMove = (e: MouseEvent) => {
        if (!isDragging.current) return;
        const rect = (e.target as HTMLElement)
          .closest(".timeline-tracks")
          ?.getBoundingClientRect();
        if (!rect) return;
        const newTime = Math.max(
          0,
          pixelsToTime(e.clientX - rect.left, pixelsPerSecond),
        );
        onDrag(newTime);
      };

      const handleUp = () => {
        isDragging.current = false;
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleUp);
      };

      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleUp);
    },
    [pixelsPerSecond, onDrag],
  );

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: "absolute",
        left: `${x}px`,
        top: 0,
        bottom: 0,
        width: "2px",
        background: colors.error,
        cursor: "ew-resize",
        zIndex: 100,
      }}
    >
      {/* Head */}
      <div
        style={{
          position: "absolute",
          top: "-4px",
          left: "-6px",
          width: "14px",
          height: "14px",
          background: colors.error,
          borderRadius: "2px",
          transform: "rotate(45deg)",
        }}
      />
    </div>
  );
};

// ============================================================================
// KEYFRAME DOT
// ============================================================================

const KeyframeDot: React.FC<{
  keyframe: TimelineKeyframe;
  trackColor: string;
  pixelsPerSecond: number;
  onSelect: () => void;
  onDrag: (newTime: number) => void;
  onEasingChange?: (easing: TimelineKeyframe["easing"]) => void;
  onDelete?: () => void;
}> = ({
  keyframe,
  trackColor,
  pixelsPerSecond,
  onSelect,
  onDrag,
  onEasingChange,
  onDelete,
}) => {
  const x = timeToPixels(keyframe.time, pixelsPerSecond);
  const isDragging = useRef(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 2) return; // ignore right click for drag
      e.stopPropagation();
      onSelect();
      setShowMenu(false);
      isDragging.current = true;

      const startX = e.clientX;
      const startTime = keyframe.time;

      const handleMove = (e: MouseEvent) => {
        if (!isDragging.current) return;
        const deltaX = e.clientX - startX;
        const deltaTime = pixelsToTime(deltaX, pixelsPerSecond);
        onDrag(Math.max(0, startTime + deltaTime));
      };

      const handleUp = () => {
        isDragging.current = false;
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleUp);
      };

      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleUp);
    },
    [keyframe.time, pixelsPerSecond, onSelect, onDrag],
  );

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    setShowMenu((prev) => !prev);
  };

  return (
    <div
      style={{
        position: "absolute",
        left: `${x}px`,
        top: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: showMenu ? 50 : 10,
      }}
    >
      <div
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
        title={`Keyframe at ${keyframe.time.toFixed(2)}s (${keyframe.easing}) — Right-click for easing`}
        style={{
          width: "10px",
          height: "10px",
          transform: "rotate(45deg)",
          background: keyframe.selected
            ? "var(--aethel-text-primary)"
            : trackColor,
          border: `2px solid ${keyframe.selected ? colors.primary : trackColor}`,
          borderRadius: "2px",
          cursor: "pointer",
          boxShadow: keyframe.selected ? `0 0 0 2px ${colors.primary}40` : "none",
        }}
      />

      {showMenu && (
        <div
          className="absolute z-50 rounded-lg border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-primary)] p-1 shadow-2xl text-[10px] min-w-[120px]"
          style={{ top: "14px", left: "50%", transform: "translateX(-50%)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2 py-1 font-semibold text-[var(--aethel-text-tertiary)] uppercase tracking-wider text-[9px]">
            Easing: {keyframe.easing}
          </div>
          {(
            ["linear", "easeIn", "easeOut", "easeInOut", "hold", "bezier"] as const
          ).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                onEasingChange?.(mode);
                setShowMenu(false);
              }}
              className={`w-full text-left px-2 py-1 rounded transition-colors ${
                keyframe.easing === mode
                  ? "bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)] font-medium"
                  : "text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)]"
              }`}
            >
              {mode === "easeIn"
                ? "Ease In"
                : mode === "easeOut"
                  ? "Ease Out"
                  : mode === "easeInOut"
                    ? "Ease In/Out"
                    : mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
          {onDelete && (
            <button
              type="button"
              onClick={() => {
                onDelete();
                setShowMenu(false);
              }}
              className="w-full text-left px-2 py-1 mt-0.5 rounded text-[var(--aethel-error)] hover:bg-[color-mix(in_srgb,var(--aethel-error)_15%,transparent)] font-medium flex items-center gap-1.5"
            >
              <Trash2 size={10} />
              Delete Keyframe
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// TRACK ROW
// ============================================================================
export const TrackRow: React.FC<{
  track: TimelineTrack;
  pixelsPerSecond: number;
  onKeyframeSelect: (keyframeId: string) => void;
  onKeyframeDrag: (keyframeId: string, newTime: number) => void;
  onKeyframeEasingChange?: (
    keyframeId: string,
    easing: TimelineKeyframe["easing"],
  ) => void;
  onKeyframeDelete?: (keyframeId: string) => void;
  onToggleLock: () => void;
  onToggleVisible: () => void;
  onToggleMute: () => void;
  onAddKeyframe: (time: number) => void;
}> = ({
  track,
  pixelsPerSecond,
  onKeyframeSelect,
  onKeyframeDrag,
  onKeyframeEasingChange,
  onKeyframeDelete,
  onToggleLock,
  onToggleVisible,
  onToggleMute,
  onAddKeyframe,
}) => {
  const Icon = trackTypeIcons[track.type];
  const trackColor = track.color || colors[track.type] || colors.textMuted;

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (track.locked) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const time = pixelsToTime(x, pixelsPerSecond);
      onAddKeyframe(time);
    },
    [track.locked, pixelsPerSecond, onAddKeyframe],
  );

  return (
    <div
      style={{
        display: "flex",
        borderBottom: `1px solid ${colors.border}`,
        background: colors.surface,
        opacity: track.muted ? 0.5 : 1,
      }}
    >
      {/* Track Info */}
      <div
        style={{
          width: "240px",
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          borderRight: `1px solid ${colors.border}`,
          background: colors.bg,
        }}
      >
        <Icon size={14} color={trackColor} />
        <span
          style={{
            flex: 1,
            fontSize: "12px",
            color: colors.text,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {track.name}
        </span>
        <span style={{ fontSize: "10px", color: colors.textDim }}>
          {track.property}
        </span>

        {/* Controls */}
        <div style={{ display: "flex", gap: "4px" }}>
          <button
            type="button"
            onClick={onToggleLock}
            aria-label={track.locked ? "Unlock track" : "Lock track"}
            aria-pressed={track.locked}
            style={{
              background: "transparent",
              border: "none",
              padding: "2px",
              cursor: "pointer",
              color: track.locked ? colors.warning : colors.textDim,
            }}
          >
            {track.locked ? <Lock size={12} /> : <Unlock size={12} />}
          </button>
          <button
            type="button"
            onClick={onToggleVisible}
            aria-label={track.visible === false ? "Show track" : "Hide track"}
            aria-pressed={track.visible === false}
            style={{
              background: "transparent",
              border: "none",
              padding: "2px",
              cursor: "pointer",
              color:
                track.visible === false ? colors.textDim : colors.textMuted,
            }}
          >
            {track.visible === false ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={track.muted ? "Unmute track audio" : "Mute track"}
            aria-pressed={track.muted}
            style={{
              background: "transparent",
              border: "none",
              padding: "2px",
              cursor: "pointer",
              color: track.muted ? colors.error : colors.textDim,
            }}
          >
            {track.muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
          </button>
        </div>
      </div>

      {/* Keyframes Area */}
      <div
        onDoubleClick={handleDoubleClick}
        style={{
          flex: 1,
          height: "32px",
          position: "relative",
          background: colors.surface,
          cursor: track.locked ? "not-allowed" : "crosshair",
        }}
      >
        {track.keyframes.map((kf) => (
          <KeyframeDot
            key={kf.id}
            keyframe={kf}
            trackColor={trackColor}
            pixelsPerSecond={pixelsPerSecond}
            onSelect={() => onKeyframeSelect(kf.id)}
            onDrag={(newTime) => onKeyframeDrag(kf.id, newTime)}
            onEasingChange={(easing) => onKeyframeEasingChange?.(kf.id, easing)}
            onDelete={() => onKeyframeDelete?.(kf.id)}
          />
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// RULER / TIME RULER
// ============================================================================

export const TimeRuler: React.FC<{
  duration: number;
  pixelsPerSecond: number;
  frameRate: number;
  currentTime: number;
  onTimeClick: (time: number) => void;
}> = ({ duration, pixelsPerSecond, frameRate, currentTime, onTimeClick }) => {
  const width = timeToPixels(duration, pixelsPerSecond);
  const majorInterval = pixelsPerSecond >= 100 ? 1 : 5; // Seconds between major marks
  const minorInterval = majorInterval / 4;

  const marks: { time: number; major: boolean }[] = [];
  for (let t = 0; t <= duration; t += minorInterval) {
    marks.push({ time: t, major: t % majorInterval === 0 });
  }

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const time = Math.max(
        0,
        Math.min(duration, pixelsToTime(x, pixelsPerSecond)),
      );
      onTimeClick(time);
    },
    [duration, pixelsPerSecond, onTimeClick],
  );

  return (
    <div
      onClick={handleClick}
      style={{
        height: "28px",
        background: colors.bg,
        borderBottom: `1px solid ${colors.border}`,
        position: "relative",
        cursor: "pointer",
        overflow: "hidden",
      }}
    >
      {marks.map((mark, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${timeToPixels(mark.time, pixelsPerSecond)}px`,
            bottom: 0,
            width: "1px",
            height: mark.major ? "12px" : "6px",
            background: mark.major ? colors.textMuted : colors.textDim,
          }}
        />
      ))}
      {marks
        .filter((m) => m.major)
        .map((mark, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              left: `${timeToPixels(mark.time, pixelsPerSecond)}px`,
              top: "2px",
              fontSize: "9px",
              color: colors.textDim,
              transform: "translateX(-50%)",
            }}
          >
            {formatTime(mark.time, frameRate)}
          </span>
        ))}
    </div>
  );
};
