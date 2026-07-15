"use client";

import React, { useEffect, useRef } from "react";
import type {
  TimelineMarker,
  TimelineTool,
  TimelineTrack,
  VideoClip,
} from "./VideoTimeline";

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const frames = Math.floor((seconds % 1) * 30);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}:${frames.toString().padStart(2, "0")}`;
}

export function formatTimecode(seconds: number, fps: number = 30): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const f = Math.floor((seconds % 1) * fps);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}:${f.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}:${f.toString().padStart(2, "0")}`;
}

interface VideoTimelineKeyboardShortcutOptions {
  clips: VideoClip[];
  currentTime: number;
  duration: number;
  markers: TimelineMarker[];
  onClipDelete?: (clipId: string) => void;
  onMarkerAdd?: (marker: TimelineMarker) => void;
  onRippleDelete?: (clipId: string) => void;
  onTimeChange: (time: number) => void;
  onToolChange?: (tool: TimelineTool) => void;
  selectedClipId?: string | null;
}

export function useVideoTimelineKeyboardShortcuts({
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
}: VideoTimelineKeyboardShortcutOptions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (onToolChange) {
        if (event.key === "v" || event.key === "V") onToolChange("select");
        if (event.key === "c" || event.key === "C") onToolChange("razor");
        if (event.key === "y" || event.key === "Y") onToolChange("slip");
        if (event.key === "u" || event.key === "U") onToolChange("slide");
        if (event.key === "b" || event.key === "B") onToolChange("ripple");
        if (event.key === "n" || event.key === "N") onToolChange("roll");
      }

      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selectedClipId
      ) {
        if (event.shiftKey && onRippleDelete) {
          onRippleDelete(selectedClipId);
        } else if (onClipDelete) {
          onClipDelete(selectedClipId);
        }
      }

      if (event.key === "Home") onTimeChange(0);
      if (event.key === "End") onTimeChange(duration);

      if (event.key === "ArrowLeft" && !event.shiftKey) {
        onTimeChange(Math.max(0, currentTime - 1 / 30));
      }
      if (event.key === "ArrowRight" && !event.shiftKey) {
        onTimeChange(Math.min(duration, currentTime + 1 / 30));
      }

      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        const sortedEdges = [
          ...new Set(
            clips.flatMap((clip) => [
              clip.startTime,
              clip.startTime + clip.duration,
            ]),
          ),
        ].sort((left, right) => left - right);

        if (event.key === "ArrowUp") {
          const previous = sortedEdges
            .filter((time) => time < currentTime - 0.001)
            .pop();
          if (previous !== undefined) onTimeChange(previous);
        } else {
          const next = sortedEdges.find((time) => time > currentTime + 0.001);
          if (next !== undefined) onTimeChange(next);
        }
      }

      if ((event.key === "m" || event.key === "M") && onMarkerAdd) {
        onMarkerAdd({
          id: `marker-${Date.now()}`,
          time: currentTime,
          name: `Marker ${markers.length + 1}`,
          color: "var(--aethel-warning)",
          type: "marker",
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    clips,
    currentTime,
    duration,
    markers.length,
    onClipDelete,
    onMarkerAdd,
    onRippleDelete,
    onTimeChange,
    onToolChange,
    selectedClipId,
  ]);
}

interface VideoTimelineToolbarProps {
  tool: TimelineTool;
  onToolChange?: (tool: TimelineTool) => void;
  snapEnabled: boolean;
  currentTime: number;
  duration: number;
  zoom: number;
}

export function VideoTimelineToolbar({
  tool,
  onToolChange,
  snapEnabled,
  currentTime,
  duration,
  zoom,
}: VideoTimelineToolbarProps) {
  return (
    <div className="flex items-center gap-1 p-2 bg-[var(--aethel-surface-secondary)] border-b border-[var(--aethel-border-primary)]">
      <div className="flex items-center gap-1 pr-2 border-r border-[var(--aethel-border-secondary)]">
        <button
          type="button"
          className="p-1.5 bg-[var(--aethel-surface-quaternary)] rounded text-sm hover:bg-[var(--aethel-surface-quaternary)]"
          title="Go to start (Home)"
          aria-label="Go to start (Home)"
        />
        <button
          type="button"
          className="p-1.5 bg-[var(--aethel-surface-quaternary)] rounded text-sm hover:bg-[var(--aethel-surface-quaternary)]"
          title="Previous frame"
          aria-label="Previous frame"
        />
        <button
          type="button"
          className="p-1.5 bg-[var(--aethel-error)] rounded text-sm hover:brightness-110"
          title="Play/Pause (Space)"
          aria-label="Play or pause (Space)"
        />
        <button
          type="button"
          className="p-1.5 bg-[var(--aethel-surface-quaternary)] rounded text-sm hover:bg-[var(--aethel-surface-quaternary)]"
          title="Next frame"
          aria-label="Next frame"
        />
        <button
          type="button"
          className="p-1.5 bg-[var(--aethel-surface-quaternary)] rounded text-sm hover:bg-[var(--aethel-surface-quaternary)]"
          title="Go to end (End)"
          aria-label="Go to end (End)"
        />
      </div>

      <div className="flex items-center gap-1 px-2 border-r border-[var(--aethel-border-secondary)]">
        <button
          type="button"
          className={`px-2 py-1 rounded text-xs font-medium ${tool === "select" ? "bg-[var(--aethel-primary)]" : "bg-[var(--aethel-surface-quaternary)] hover:bg-[var(--aethel-surface-quaternary)]"}`}
          onClick={() => onToolChange?.("select")}
          title="Selection tool (V)"
          aria-label="Selection tool (V)"
        />
        <button
          type="button"
          className={`px-2 py-1 rounded text-xs font-medium ${tool === "razor" ? "bg-[var(--aethel-primary)]" : "bg-[var(--aethel-surface-quaternary)] hover:bg-[var(--aethel-surface-quaternary)]"}`}
          onClick={() => onToolChange?.("razor")}
          title="Razor tool (C)"
          aria-label="Razor tool (C)"
        />
        <button
          type="button"
          className={`px-2 py-1 rounded text-xs font-medium ${tool === "ripple" ? "bg-[var(--aethel-primary)]" : "bg-[var(--aethel-surface-quaternary)] hover:bg-[var(--aethel-surface-quaternary)]"}`}
          onClick={() => onToolChange?.("ripple")}
          title="Ripple edit (B)"
          aria-label="Ripple edit (B)"
        />
        <button
          type="button"
          className={`px-2 py-1 rounded text-xs font-medium ${tool === "slip" ? "bg-[var(--aethel-primary)]" : "bg-[var(--aethel-surface-quaternary)] hover:bg-[var(--aethel-surface-quaternary)]"}`}
          onClick={() => onToolChange?.("slip")}
          title="Slip tool (Y)"
          aria-label="Slip tool (Y)"
        />
      </div>

      <div className="flex items-center gap-1 px-2 border-r border-[var(--aethel-border-secondary)]">
        <button
          type="button"
          className={`px-2 py-1 rounded text-xs font-medium ${snapEnabled ? "bg-[var(--aethel-success)]" : "bg-[var(--aethel-surface-quaternary)] hover:bg-[var(--aethel-surface-quaternary)]"}`}
          title="Snap (S)"
          aria-label="Snap (S)"
        />
      </div>

      <span className="px-2 text-sm text-[var(--aethel-text-secondary)] font-mono bg-[var(--aethel-surface-primary)] rounded">
        {formatTimecode(currentTime)}
      </span>
      <span className="text-[var(--aethel-text-tertiary)]">/</span>
      <span className="text-sm text-[var(--aethel-text-tertiary)] font-mono">
        {formatTimecode(duration)}
      </span>

      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs text-[var(--aethel-text-tertiary)]">
          Zoom:
        </span>
        <input
          type="range"
          min="10"
          max="200"
          value={zoom}
          className="w-24 accent-[var(--aethel-info)]"
          readOnly
        />
        <span className="text-xs text-[var(--aethel-text-tertiary)] w-8">
          {zoom}%
        </span>
      </div>
    </div>
  );
}

export function VideoTrackHeaders({ tracks }: { tracks: TimelineTrack[] }) {
  return (
    <div className="w-36 flex-shrink-0 bg-[var(--aethel-surface-secondary)]">
      <div className="h-[25px] border-b border-[var(--aethel-border-primary)] flex items-center px-2">
        <span className="text-[10px] text-[var(--aethel-text-tertiary)]">
          TRACKS
        </span>
      </div>
      {tracks.map((track) => (
        <div
          key={track.id}
          className="h-[60px] flex items-center gap-1 px-2 border-b border-[var(--aethel-border-primary)] group"
        >
          <button
            type="button"
            className={`w-5 h-5 rounded text-[10px] ${track.muted ? "bg-[var(--aethel-error)]" : "bg-[var(--aethel-surface-quaternary)] hover:bg-[var(--aethel-surface-quaternary)]"}`}
            title="Mute"
            aria-label="Mute track"
          >
            M
          </button>
          <button
            type="button"
            className={`w-5 h-5 rounded text-[10px] ${track.solo ? "bg-[var(--aethel-warning)]" : "bg-[var(--aethel-surface-quaternary)] hover:bg-[var(--aethel-surface-quaternary)]"}`}
            title="Solo"
            aria-label="Solo"
          >
            S
          </button>
          <button
            type="button"
            className={`w-5 h-5 rounded text-[10px] ${track.locked ? "bg-[var(--aethel-warning)]" : "bg-[var(--aethel-surface-quaternary)] hover:bg-[var(--aethel-surface-quaternary)]"}`}
            title="Lock"
            aria-label="Lock track"
          />
          <span className="text-sm text-[var(--aethel-text-secondary)] truncate flex-1">
            {track.name}
          </span>
        </div>
      ))}
    </div>
  );
}

interface VideoPreviewProps {
  src?: string;
  currentTime: number;
  isPlaying: boolean;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
}

export function VideoPreview({
  src,
  currentTime,
  isPlaying,
  onTimeUpdate,
  onDurationChange,
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      void video.play();
    } else {
      video.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || isPlaying) return;

    video.currentTime = currentTime;
  }, [currentTime, isPlaying]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    onTimeUpdate?.(video.currentTime);
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    onDurationChange?.(video.duration);
  };

  return (
    <div className="relative bg-[var(--aethel-surface-primary)] aspect-video rounded-lg overflow-hidden">
      {src ? (
        <video
          ref={videoRef}
          src={src}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
        />
      ) : (
        <div className="flex items-center justify-center h-full text-[var(--aethel-text-tertiary)]">
          No video selected
        </div>
      )}

      <div className="absolute bottom-2 left-2 bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)] px-2 py-1 rounded text-xs text-[var(--aethel-text-primary)] font-mono">
        {formatTime(currentTime)}
      </div>
    </div>
  );
}
