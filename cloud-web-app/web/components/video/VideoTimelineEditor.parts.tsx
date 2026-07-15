"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { TimelineClip, Track } from "./video-timeline-editor.types";

interface TrackHeaderProps {
  track: Track;
  onToggleVisible: () => void;
  onToggleLock: () => void;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onVolumeChange: (volume: number) => void;
}
export function TrackHeader({
  track,
  onToggleVisible,
  onToggleLock,
  onToggleMute,
  onToggleSolo,
  onVolumeChange,
}: TrackHeaderProps) {
  return (
    <div
      style={{
        width: "200px",
        height: `${track.height}px`,
        background: "var(--aethel-surface-primary)",
        borderBottom: "1px solid var(--aethel-surface-tertiary)",
        display: "flex",
        alignItems: "center",
        padding: "0 8px",
        gap: "8px",
      }}
    >
      {/* Track color indicator */}
      <div
        style={{
          width: "4px",
          height: "60%",
          background: track.color,
          borderRadius: "2px",
        }}
      />
      {/* Track name */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            color: "var(--aethel-text-primary)",
            fontSize: "12px",
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {track.name}
        </div>
        <div
          style={{ color: "var(--aethel-text-quaternary)", fontSize: "10px" }}
        >
          {track.type.toUpperCase()}
        </div>
      </div>
      {/* Track controls */}
      <div style={{ display: "flex", gap: "4px" }}>
        <button
          type="button"
          onClick={onToggleVisible}
          style={{
            width: "20px",
            height: "20px",
            background: track.visible
              ? "var(--aethel-border-primary)"
              : "var(--aethel-surface-tertiary)",
            border: "none",
            borderRadius: "2px",
            color: track.visible
              ? "var(--aethel-text-primary)"
              : "var(--aethel-text-quaternary)",
            cursor: "pointer",
            fontSize: "10px",
          }}
          title="Visibility"
        ></button>
        <button
          type="button"
          onClick={onToggleMute}
          style={{
            width: "20px",
            height: "20px",
            background: track.muted
              ? "var(--aethel-error)"
              : "var(--aethel-surface-tertiary)",
            border: "none",
            borderRadius: "2px",
            color: "var(--aethel-text-primary)",
            cursor: "pointer",
            fontSize: "10px",
          }}
          title="Mute"
        >
          M
        </button>
        {track.type === "audio" && (
          <button
            type="button"
            onClick={onToggleSolo}
            style={{
              width: "20px",
              height: "20px",
              background: track.solo
                ? "var(--aethel-warning)"
                : "var(--aethel-surface-tertiary)",
              border: "none",
              borderRadius: "2px",
              color: "var(--aethel-text-primary)",
              cursor: "pointer",
              fontSize: "10px",
            }}
            title="Solo"
          >
            S
          </button>
        )}
        <button
          type="button"
          onClick={onToggleLock}
          style={{
            width: "20px",
            height: "20px",
            background: track.locked
              ? "var(--aethel-primary)"
              : "var(--aethel-surface-tertiary)",
            border: "none",
            borderRadius: "2px",
            color: "var(--aethel-text-primary)",
            cursor: "pointer",
            fontSize: "10px",
          }}
          title="Lock"
        ></button>
      </div>
    </div>
  );
}
interface TimelineClipComponentProps {
  clip: TimelineClip;
  track: Track;
  zoom: number;
  scrollX: number;
  isSelected: boolean;
  onSelect: () => void;
  onMove: (newStart: number) => void;
  onTrimStart: (newIn: number) => void;
  onTrimEnd: (newOut: number) => void;
}
function TimelineClipComponent({
  clip,
  track,
  zoom,
  scrollX,
  isSelected,
  onSelect,
  onMove,
  onTrimStart,
  onTrimEnd,
}: TimelineClipComponentProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<
    "move" | "trim-start" | "trim-end" | null
  >(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [originalStart, setOriginalStart] = useState(0);
  const [originalDuration, setOriginalDuration] = useState(0);
  const pixelsPerSecond = 100 * zoom;
  const clipLeft = clip.startTime * pixelsPerSecond - scrollX;
  const clipWidth = clip.duration * pixelsPerSecond;
  const handleMouseDown = (
    e: React.MouseEvent,
    type: "move" | "trim-start" | "trim-end",
  ) => {
    e.stopPropagation();
    if (track.locked || clip.locked) return;
    setIsDragging(true);
    setDragType(type);
    setDragStartX(e.clientX);
    setOriginalStart(clip.startTime);
    setOriginalDuration(clip.duration);
    onSelect();
  };
  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartX;
      const deltaTime = deltaX / pixelsPerSecond;
      if (dragType === "move") {
        onMove(Math.max(0, originalStart + deltaTime));
      } else if (dragType === "trim-start") {
        const newIn = Math.max(0, clip.sourceIn + deltaTime);
        if (newIn < clip.sourceOut) {
          onTrimStart(newIn);
        }
      } else if (dragType === "trim-end") {
        const newDuration = Math.max(0.1, originalDuration + deltaTime);
        onTrimEnd(newDuration);
      }
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      setDragType(null);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isDragging,
    dragType,
    dragStartX,
    originalStart,
    originalDuration,
    pixelsPerSecond,
    clip,
    onMove,
    onTrimStart,
    onTrimEnd,
  ]);
  return (
    <div
      style={{
        position: "absolute",
        left: `${clipLeft}px`,
        width: `${clipWidth}px`,
        top: "4px",
        bottom: "4px",
        background: clip.color,
        borderRadius: "4px",
        border: isSelected
          ? "2px solid var(--aethel-text-primary)"
          : "1px solid color-mix(in_srgb,var(--aethel-border-primary)_20%,transparent)",
        overflow: "hidden",
        cursor: track.locked ? "not-allowed" : "pointer",
        opacity: clip.muted ? 0.5 : 1,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Trim handles */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "8px",
          cursor: track.locked ? "not-allowed" : "ew-resize",
          background: isSelected
            ? "color-mix(in_srgb,var(--aethel-text-primary)_30%,transparent)"
            : "transparent",
        }}
        onMouseDown={(e) => handleMouseDown(e, "trim-start")}
      />
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: "8px",
          cursor: track.locked ? "not-allowed" : "ew-resize",
          background: isSelected
            ? "color-mix(in_srgb,var(--aethel-text-primary)_30%,transparent)"
            : "transparent",
        }}
        onMouseDown={(e) => handleMouseDown(e, "trim-end")}
      />
      {/* Clip content */}
      <div
        style={{
          padding: "4px 12px",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          cursor: track.locked ? "not-allowed" : "move",
        }}
        onMouseDown={(e) => handleMouseDown(e, "move")}
      >
        {/* Thumbnail for video clips */}
        {clip.type === "video" && clip.thumbnail && clipWidth > 60 && (
          <div
            style={{
              position: "absolute",
              left: "4px",
              top: "4px",
              bottom: "4px",
              width: "40px",
              background: `url(${clip.thumbnail}) center/cover`,
              borderRadius: "2px",
            }}
          />
        )}
        {/* Clip name */}
        <div
          style={{
            color: "var(--aethel-text-primary)",
            fontSize: "11px",
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginLeft:
              clip.type === "video" && clip.thumbnail && clipWidth > 60
                ? "48px"
                : 0,
          }}
        >
          {clip.name}
        </div>
        {/* Duration */}
        {clipWidth > 100 && (
          <div
            style={{
              color:
                "color-mix(in_srgb,var(--aethel-text-primary)_70%,transparent)",
              fontSize: "9px",
              marginLeft:
                clip.type === "video" && clip.thumbnail && clipWidth > 60
                  ? "48px"
                  : 0,
            }}
          >
            {clip.duration.toFixed(2)}s
          </div>
        )}
        {/* Waveform for audio */}
        {clip.type === "audio" && (
          <div
            style={{
              position: "absolute",
              left: "8px",
              right: "8px",
              bottom: "4px",
              height: "20px",
              display: "flex",
              alignItems: "flex-end",
              gap: "1px",
              opacity: 0.5,
            }}
          >
            {Array.from({
              length: Math.min(50, Math.floor(clipWidth / 4)),
            }).map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${20 + Math.random() * 80}%`,
                  background: "var(--aethel-text-primary)",
                  borderRadius: "1px",
                }}
              />
            ))}
          </div>
        )}
        {/* Keyframe indicators */}
        {clip.keyframes.length > 0 && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "2px",
              height: "4px",
              display: "flex",
            }}
          >
            {clip.keyframes.map((kf) => (
              <div
                key={kf.id}
                style={{
                  position: "absolute",
                  left: `${(kf.time / clip.duration) * 100}%`,
                  width: "4px",
                  height: "4px",
                  background: "var(--aethel-warning)",
                  borderRadius: "50%",
                  transform: "translateX(-50%)",
                }}
              />
            ))}
          </div>
        )}
        {/* Lock indicator */}
        {clip.locked && (
          <div
            style={{
              position: "absolute",
              right: "4px",
              top: "4px",
              fontSize: "10px",
            }}
          ></div>
        )}
      </div>
    </div>
  );
}
interface TrackContentProps {
  track: Track;
  clips: TimelineClip[];
  zoom: number;
  scrollX: number;
  selectedClipId: string | null;
  onSelectClip: (clipId: string) => void;
  onClipChange: (clip: TimelineClip) => void;
}
export function TrackContent({
  track,
  clips,
  zoom,
  scrollX,
  selectedClipId,
  onSelectClip,
  onClipChange,
}: TrackContentProps) {
  const trackClips = clips.filter((c) => c.trackId === track.id);
  return (
    <div
      style={{
        flex: 1,
        height: `${track.height}px`,
        background: track.visible
          ? "var(--aethel-surface-tertiary)"
          : "var(--aethel-surface-primary)",
        borderBottom: "1px solid var(--aethel-border-primary)",
        position: "relative",
      }}
    >
      {trackClips.map((clip) => (
        <TimelineClipComponent
          key={clip.id}
          clip={clip}
          track={track}
          zoom={zoom}
          scrollX={scrollX}
          isSelected={selectedClipId === clip.id}
          onSelect={() => onSelectClip(clip.id)}
          onMove={(newStart) => onClipChange({ ...clip, startTime: newStart })}
          onTrimStart={(newIn) => {
            const delta = newIn - clip.sourceIn;
            onClipChange({
              ...clip,
              sourceIn: newIn,
              startTime: clip.startTime + delta,
              duration: clip.duration - delta,
            });
          }}
          onTrimEnd={(newDuration) =>
            onClipChange({ ...clip, duration: newDuration })
          }
        />
      ))}
    </div>
  );
}
interface PlaybackControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  frameRate: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onGoToStart: () => void;
  onGoToEnd: () => void;
}
export function PlaybackControls({
  isPlaying,
  currentTime,
  duration,
  frameRate,
  onPlay,
  onPause,
  onSeek,
  onStepForward,
  onStepBackward,
  onGoToStart,
  onGoToEnd,
}: PlaybackControlsProps) {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * frameRate);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}:${frames.toString().padStart(2, "0")}`;
  };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "8px 16px",
        background: "var(--aethel-surface-primary)",
        borderBottom: "1px solid var(--aethel-surface-tertiary)",
      }}
    >
      {/* Time display */}
      <div
        style={{
          fontFamily: "monospace",
          fontSize: "14px",
          color: "var(--aethel-text-primary)",
          background: "var(--aethel-surface-tertiary)",
          padding: "4px 8px",
          borderRadius: "4px",
          minWidth: "100px",
          textAlign: "center",
        }}
      >
        {formatTime(currentTime)}
      </div>
      {/* Transport controls */}
      <div style={{ display: "flex", gap: "4px" }}>
        <button
          type="button"
          onClick={onGoToStart}
          style={{
            width: "32px",
            height: "32px",
            background: "var(--aethel-surface-tertiary)",
            border: "none",
            borderRadius: "4px",
            color: "var(--aethel-text-primary)",
            cursor: "pointer",
            fontSize: "14px",
          }}
          title="Go to Start"
        ></button>
        <button
          type="button"
          onClick={onStepBackward}
          style={{
            width: "32px",
            height: "32px",
            background: "var(--aethel-surface-tertiary)",
            border: "none",
            borderRadius: "4px",
            color: "var(--aethel-text-primary)",
            cursor: "pointer",
            fontSize: "14px",
          }}
          title="Step Back"
        ></button>
        <button
          type="button"
          onClick={isPlaying ? onPause : onPlay}
          style={{
            width: "40px",
            height: "32px",
            background: isPlaying
              ? "var(--aethel-error)"
              : "var(--aethel-success)",
            border: "none",
            borderRadius: "4px",
            color: "var(--aethel-text-primary)",
            cursor: "pointer",
            fontSize: "14px",
          }}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? "" : ""}
        </button>
        <button
          type="button"
          onClick={onStepForward}
          style={{
            width: "32px",
            height: "32px",
            background: "var(--aethel-surface-tertiary)",
            border: "none",
            borderRadius: "4px",
            color: "var(--aethel-text-primary)",
            cursor: "pointer",
            fontSize: "14px",
          }}
          title="Step Forward"
        ></button>
        <button
          type="button"
          onClick={onGoToEnd}
          style={{
            width: "32px",
            height: "32px",
            background: "var(--aethel-surface-tertiary)",
            border: "none",
            borderRadius: "4px",
            color: "var(--aethel-text-primary)",
            cursor: "pointer",
            fontSize: "14px",
          }}
          title="Go to End"
        ></button>
      </div>
      {/* Duration display */}
      <div style={{ color: "var(--aethel-text-quaternary)", fontSize: "12px" }}>
        / {formatTime(duration)}
      </div>
    </div>
  );
}
