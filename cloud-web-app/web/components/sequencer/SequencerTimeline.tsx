"use client";

/**
 * Sequencer Timeline Editor - Cinematic Timeline Editor
 *
 * Premiere/After Effects style interface for cinematic sequence editing.
 * Connects to SequencerRuntime for realtime playback.
 */
import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Film,
  Maximize2,
  Pause,
  Play,
  Plus,
  Scissors,
  Settings,
  SkipBack,
  SkipForward,
  Square,
  Trash2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type {
  SequenceData,
  SequencerTimelineProps,
  TimelineKeyframe,
  TimelineTrack,
  TrackType,
} from "./SequencerTimeline.types";
import {
  colors,
  formatTime,
  pixelsToTime,
  Playhead,
  TimeRuler,
  TrackRow,
} from "./SequencerTimeline.parts";

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const SequencerTimeline: React.FC<SequencerTimelineProps> = ({
  sequence,
  currentTime,
  isPlaying,
  onTimeChange,
  onPlay,
  onPause,
  onStop,
  onKeyframeAdd,
  onKeyframeUpdate,
  onKeyframeDelete,
  onTrackAdd,
  onTrackDelete,
  onSequenceUpdate,
}) => {
  const [pixelsPerSecond, setPixelsPerSecond] = useState(100);
  const [selectedKeyframes, setSelectedKeyframes] = useState<Set<string>>(
    new Set(),
  );
  const tracksRef = useRef<HTMLDivElement>(null);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setPixelsPerSecond((prev) => Math.min(prev * 1.5, 500));
  }, []);

  const handleZoomOut = useCallback(() => {
    setPixelsPerSecond((prev) => Math.max(prev / 1.5, 20));
  }, []);

  // All tracks flat
  const allTracks = useMemo(() => {
    return sequence.groups.flatMap((g) => g.tracks);
  }, [sequence.groups]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        isPlaying ? onPause() : onPlay();
      }
      if (e.key === "Delete" && selectedKeyframes.size > 0) {
        selectedKeyframes.forEach((kfId) => {
          const track = allTracks.find((t) =>
            t.keyframes.some((k) => k.id === kfId),
          );
          if (track) onKeyframeDelete(track.id, kfId);
        });
        setSelectedKeyframes(new Set());
      }
      if (e.key === "Home") {
        onTimeChange(0);
      }
      if (e.key === "End") {
        onTimeChange(sequence.duration);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isPlaying,
    selectedKeyframes,
    allTracks,
    sequence.duration,
    onPlay,
    onPause,
    onTimeChange,
    onKeyframeDelete,
  ]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: colors.bg,
        color: colors.text,
        fontSize: "13px",
      }}
    >
      {/* Transport Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 12px",
          background: colors.surface,
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        {/* Play Controls */}
        <div style={{ display: "flex", gap: "4px" }}>
          <button
            type="button"
            onClick={onStop}
            style={{
              padding: "6px",
              background: colors.surfaceHover,
              border: "none",
              borderRadius: "4px",
              color: colors.text,
              cursor: "pointer",
            }}
          >
            <Square size={14} />
          </button>
          <button
            type="button"
            onClick={() => onTimeChange(Math.max(0, currentTime - 1))}
            style={{
              padding: "6px",
              background: colors.surfaceHover,
              border: "none",
              borderRadius: "4px",
              color: colors.text,
              cursor: "pointer",
            }}
          >
            <SkipBack size={14} />
          </button>
          <button
            type="button"
            onClick={isPlaying ? onPause : onPlay}
            style={{
              padding: "6px 12px",
              background: isPlaying ? colors.warning : colors.primary,
              border: "none",
              borderRadius: "4px",
              color: "var(--aethel-text-primary)",
              cursor: "pointer",
            }}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button
            type="button"
            onClick={() =>
              onTimeChange(Math.min(sequence.duration, currentTime + 1))
            }
            style={{
              padding: "6px",
              background: colors.surfaceHover,
              border: "none",
              borderRadius: "4px",
              color: colors.text,
              cursor: "pointer",
            }}
          >
            <SkipForward size={14} />
          </button>
        </div>

        {/* Time Display */}
        <div
          style={{
            padding: "4px 12px",
            background: colors.bg,
            borderRadius: "4px",
            fontFamily: "monospace",
            fontSize: "12px",
            color: colors.primary,
          }}
        >
          {formatTime(currentTime, sequence.frameRate)}
        </div>

        <span style={{ color: colors.textDim, fontSize: "11px" }}>/</span>

        <div
          style={{
            padding: "4px 8px",
            background: colors.bg,
            borderRadius: "4px",
            fontFamily: "monospace",
            fontSize: "11px",
            color: colors.textMuted,
          }}
        >
          {formatTime(sequence.duration, sequence.frameRate)}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Zoom */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <button
            type="button"
            onClick={handleZoomOut}
            aria-label="Diminuir zoom da timeline"
            style={{
              padding: "4px",
              background: "transparent",
              border: "none",
              color: colors.textMuted,
              cursor: "pointer",
            }}
          >
            <ZoomOut size={14} />
          </button>
          <span
            style={{
              fontSize: "11px",
              color: colors.textDim,
              minWidth: "50px",
              textAlign: "center",
            }}
          >
            {Math.round(pixelsPerSecond)}px/s
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            aria-label="Aumentar zoom da timeline"
            style={{
              padding: "4px",
              background: "transparent",
              border: "none",
              color: colors.textMuted,
              cursor: "pointer",
            }}
          >
            <ZoomIn size={14} />
          </button>
        </div>

        {/* Settings */}
        <button
          type="button"
          style={{
            padding: "6px",
            background: "transparent",
            border: "none",
            color: colors.textMuted,
            cursor: "pointer",
          }}
        >
          <Settings size={14} />
        </button>
      </div>

      {/* Timeline Header */}
      <div style={{ display: "flex" }}>
        {/* Track List Header */}
        <div
          style={{
            width: "240px",
            padding: "8px 12px",
            background: colors.bg,
            borderBottom: `1px solid ${colors.border}`,
            borderRight: `1px solid ${colors.border}`,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Film size={14} color={colors.primary} />
          <span style={{ fontWeight: 600, fontSize: "12px" }}>
            {sequence.name}
          </span>
          <span style={{ fontSize: "10px", color: colors.textDim }}>
            {sequence.frameRate}fps
          </span>
        </div>

        {/* Time Ruler */}
        <div style={{ flex: 1, position: "relative" }}>
          <TimeRuler
            duration={sequence.duration}
            pixelsPerSecond={pixelsPerSecond}
            frameRate={sequence.frameRate}
            currentTime={currentTime}
            onTimeClick={onTimeChange}
          />
        </div>
      </div>

      {/* Tracks Area */}
      <div
        ref={tracksRef}
        className="timeline-tracks"
        style={{
          flex: 1,
          overflow: "auto",
          position: "relative",
        }}
      >
        {/* Groups & Tracks */}
        {sequence.groups.map((group) => (
          <div key={group.id}>
            {/* Group Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "6px 12px",
                background: colors.surfaceActive,
                borderBottom: `1px solid ${colors.border}`,
                cursor: "pointer",
              }}
              onClick={() =>
                onSequenceUpdate({
                  groups: sequence.groups.map((g) =>
                    g.id === group.id ? { ...g, collapsed: !g.collapsed } : g,
                  ),
                })
              }
            >
              {group.collapsed ? (
                <ChevronRight size={14} color={colors.textMuted} />
              ) : (
                <ChevronDown size={14} color={colors.textMuted} />
              )}
              <span
                style={{ marginLeft: "8px", fontWeight: 500, fontSize: "12px" }}
              >
                {group.name}
              </span>
              <span
                style={{
                  marginLeft: "8px",
                  fontSize: "10px",
                  color: colors.textDim,
                }}
              >
                {group.tracks.length} tracks
              </span>
            </div>

            {/* Tracks */}
            {!group.collapsed &&
              group.tracks.map((track) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  pixelsPerSecond={pixelsPerSecond}
                  onKeyframeSelect={(kfId) =>
                    setSelectedKeyframes((prev) => {
                      const next = new Set(prev);
                      if (next.has(kfId)) {
                        next.delete(kfId);
                      } else {
                        next.add(kfId);
                      }
                      return next;
                    })
                  }
                  onKeyframeDrag={(kfId, newTime) =>
                    onKeyframeUpdate(track.id, kfId, { time: newTime })
                  }
                  onToggleLock={() =>
                    onSequenceUpdate({
                      groups: sequence.groups.map((g) => ({
                        ...g,
                        tracks: g.tracks.map((t) =>
                          t.id === track.id ? { ...t, locked: !t.locked } : t,
                        ),
                      })),
                    })
                  }
                  onToggleVisible={() =>
                    onSequenceUpdate({
                      groups: sequence.groups.map((g) => ({
                        ...g,
                        tracks: g.tracks.map((t) =>
                          t.id === track.id
                            ? {
                                ...t,
                                visible: t.visible === false ? true : false,
                              }
                            : t,
                        ),
                      })),
                    })
                  }
                  onToggleMute={() =>
                    onSequenceUpdate({
                      groups: sequence.groups.map((g) => ({
                        ...g,
                        tracks: g.tracks.map((t) =>
                          t.id === track.id ? { ...t, muted: !t.muted } : t,
                        ),
                      })),
                    })
                  }
                  onAddKeyframe={(time) => onKeyframeAdd(track.id, time, 0)}
                />
              ))}
          </div>
        ))}

        {/* Playhead */}
        <Playhead
          time={currentTime}
          pixelsPerSecond={pixelsPerSecond}
          height={100}
          onDrag={onTimeChange}
        />
      </div>

      {/* Status Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 12px",
          background: colors.surface,
          borderTop: `1px solid ${colors.border}`,
          fontSize: "11px",
          color: colors.textMuted,
        }}
      >
        <span>
          {allTracks.length} tracks |{" "}
          {allTracks.reduce((sum, t) => sum + t.keyframes.length, 0)} keyframes
        </span>
        {selectedKeyframes.size > 0 && (
          <span style={{ color: colors.primary }}>
            {selectedKeyframes.size} selected
          </span>
        )}
        <span>
          Duration: {sequence.duration}s |{" "}
          {Math.round(sequence.duration * sequence.frameRate)} frames
        </span>
      </div>
    </div>
  );
};

export { DEMO_SEQUENCE } from "./SequencerTimeline.demo";

export default SequencerTimeline;
