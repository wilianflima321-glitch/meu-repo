"use client";
import React, { useState, useCallback, useEffect, useMemo } from "react";
import { TimelineRuler } from "./video-timeline-editor-ruler";
import {
  availableEffects,
  ClipInspector,
  EffectsPanel,
} from "./VideoTimelineSidePanels";
import {
  PlaybackControls,
  TrackContent,
  TrackHeader,
} from "./VideoTimelineEditor.parts";
import { createDefaultVideoTimelineProject } from "./VideoTimelineEditor.defaults";
import {
  type ClipEffect,
  type ClipKeyframe,
  type ClipType,
  type TimelineClip,
  type TimelineMarker,
  type TimelineProject,
  type TimelineRegion,
  type Track,
  type TrackType,
  type Transition,
} from "./video-timeline-editor.types";
export type {
  ClipEffect,
  ClipKeyframe,
  ClipType,
  TimelineClip,
  TimelineMarker,
  TimelineProject,
  TimelineRegion,
  Track,
  TrackType,
  Transition,
} from "./video-timeline-editor.types";
export interface VideoTimelineEditorProps {
  project?: TimelineProject;
  onChange?: (project: TimelineProject) => void;
}
export function VideoTimelineEditor({
  project: initialProject,
  onChange,
}: VideoTimelineEditorProps) {
  const [project, setProject] = useState<TimelineProject>(
    () => initialProject || createDefaultVideoTimelineProject(),
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [scrollX, setScrollX] = useState(0);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<"inspector" | "effects">(
    "inspector",
  );
  const clips = useMemo(
    () => Array.from(project.clips.values()),
    [project.clips],
  );
  const selectedClip = selectedClipId
    ? project.clips.get(selectedClipId) || null
    : null;
  useEffect(() => {
    if (!isPlaying) return;
    const startTime = performance.now();
    const startPlayhead = currentTime;
    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      const newTime = startPlayhead + elapsed;
      if (newTime >= project.duration) {
        setIsPlaying(false);
        setCurrentTime(project.duration);
      } else {
        setCurrentTime(newTime);
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [isPlaying, project.duration, currentTime]);
  const handleSeek = useCallback(
    (time: number) => {
      setCurrentTime(time);
      if (isPlaying) setIsPlaying(false);
    },
    [isPlaying],
  );
  const handleClipChange = useCallback((updatedClip: TimelineClip) => {
    setProject((prev) => {
      const newClips = new Map(prev.clips);
      newClips.set(updatedClip.id, updatedClip);
      return { ...prev, clips: newClips };
    });
  }, []);
  const handleTrackUpdate = useCallback(
    (trackId: string, updates: Partial<Track>) => {
      setProject((prev) => ({
        ...prev,
        tracks: prev.tracks.map((t) =>
          t.id === trackId ? { ...t, ...updates } : t,
        ),
      }));
    },
    [],
  );
  const handleAddEffect = useCallback(
    (effectType: string) => {
      if (!selectedClipId) return;
      const effect: ClipEffect = {
        id: crypto.randomUUID(),
        type: effectType,
        name:
          availableEffects.find((e) => e.type === effectType)?.name ||
          effectType,
        enabled: true,
        parameters: {},
        keyframes: [],
      };
      const clip = project.clips.get(selectedClipId);
      if (clip) {
        handleClipChange({ ...clip, effects: [...clip.effects, effect] });
      }
    },
    [selectedClipId, project.clips, handleClipChange],
  );
  useEffect(() => {
    onChange?.(project);
  }, [project, onChange]);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--aethel-surface-primary)",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          background: "var(--aethel-surface-primary)",
          borderBottom: "1px solid var(--aethel-surface-tertiary)",
        }}
      >
        <h2 style={{ color: "var(--aethel-text-primary)", fontSize: "16px" }}>
          {" "}
          {project.name}
        </h2>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span
            style={{ color: "var(--aethel-text-quaternary)", fontSize: "12px" }}
          >
            {project.resolution.width}x{project.resolution.height} @{" "}
            {project.frameRate}fps
          </span>
          {/* Zoom controls */}
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.1, z / 1.5))}
            style={{
              background: "var(--aethel-surface-tertiary)",
              border: "none",
              borderRadius: "4px",
              padding: "4px 8px",
              color: "var(--aethel-text-primary)",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            -
          </button>
          <span
            style={{
              color: "var(--aethel-text-tertiary)",
              fontSize: "11px",
              width: "40px",
              textAlign: "center",
            }}
          >
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(10, z * 1.5))}
            style={{
              background: "var(--aethel-surface-tertiary)",
              border: "none",
              borderRadius: "4px",
              padding: "4px 8px",
              color: "var(--aethel-text-primary)",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            +
          </button>
        </div>
      </div>
      {/* Playback controls */}
      <PlaybackControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={project.duration}
        frameRate={project.frameRate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onSeek={handleSeek}
        onStepForward={() =>
          handleSeek(
            Math.min(project.duration, currentTime + 1 / project.frameRate),
          )
        }
        onStepBackward={() =>
          handleSeek(Math.max(0, currentTime - 1 / project.frameRate))
        }
        onGoToStart={() => handleSeek(0)}
        onGoToEnd={() => handleSeek(project.duration)}
      />
      {/* Main content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Timeline area */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Ruler */}
          <div style={{ display: "flex" }}>
            <div
              style={{
                width: "200px",
                background: "var(--aethel-surface-primary)",
                borderBottom: "1px solid var(--aethel-surface-tertiary)",
              }}
            />
            <div style={{ flex: 1, overflow: "hidden" }}>
              <TimelineRuler
                duration={project.duration}
                zoom={zoom}
                scrollX={scrollX}
                playhead={currentTime}
                frameRate={project.frameRate}
                workArea={{ in: project.workAreaIn, out: project.workAreaOut }}
                markers={project.markers}
                onSeek={handleSeek}
                onMarkerClick={(m) => handleSeek(m.time)}
              />
            </div>
          </div>
          {/* Tracks */}
          <div style={{ flex: 1, overflow: "auto" }}>
            {project.tracks.map((track) => (
              <div key={track.id} style={{ display: "flex" }}>
                <TrackHeader
                  track={track}
                  onToggleVisible={() =>
                    handleTrackUpdate(track.id, { visible: !track.visible })
                  }
                  onToggleLock={() =>
                    handleTrackUpdate(track.id, { locked: !track.locked })
                  }
                  onToggleMute={() =>
                    handleTrackUpdate(track.id, { muted: !track.muted })
                  }
                  onToggleSolo={() =>
                    handleTrackUpdate(track.id, { solo: !track.solo })
                  }
                  onVolumeChange={(v) =>
                    handleTrackUpdate(track.id, { volume: v })
                  }
                />
                <TrackContent
                  track={track}
                  clips={clips}
                  zoom={zoom}
                  scrollX={scrollX}
                  selectedClipId={selectedClipId}
                  onSelectClip={setSelectedClipId}
                  onClipChange={handleClipChange}
                />
              </div>
            ))}
          </div>
          {/* Horizontal scrollbar */}
          <div
            style={{
              height: "12px",
              background: "var(--aethel-surface-primary)",
              borderTop: "1px solid var(--aethel-surface-tertiary)",
              paddingLeft: "200px",
            }}
          >
            <input
              type="range"
              min={0}
              max={Math.max(0, project.duration * 100 * zoom - 800)}
              value={scrollX}
              onChange={(e) => setScrollX(parseFloat(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>
        </div>
        {/* Right panel */}
        <div
          style={{
            width: "280px",
            background: "var(--aethel-surface-primary)",
            borderLeft: "1px solid var(--aethel-surface-tertiary)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Panel tabs */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid var(--aethel-surface-tertiary)",
            }}
          >
            <button
              type="button"
              onClick={() => setActivePanel("inspector")}
              style={{
                flex: 1,
                padding: "10px",
                background:
                  activePanel === "inspector"
                    ? "var(--aethel-surface-tertiary)"
                    : "transparent",
                border: "none",
                color:
                  activePanel === "inspector"
                    ? "var(--aethel-text-primary)"
                    : "var(--aethel-text-quaternary)",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              Inspector
            </button>
            <button
              type="button"
              onClick={() => setActivePanel("effects")}
              style={{
                flex: 1,
                padding: "10px",
                background:
                  activePanel === "effects"
                    ? "var(--aethel-surface-tertiary)"
                    : "transparent",
                border: "none",
                color:
                  activePanel === "effects"
                    ? "var(--aethel-text-primary)"
                    : "var(--aethel-text-quaternary)",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              Effects
            </button>
          </div>
          {/* Panel content */}
          <div style={{ flex: 1, overflow: "auto" }}>
            {activePanel === "inspector" ? (
              <ClipInspector clip={selectedClip} onUpdate={handleClipChange} />
            ) : (
              <EffectsPanel
                clip={selectedClip}
                onAddEffect={handleAddEffect}
                onRemoveEffect={(effectId) => {
                  if (selectedClip) {
                    handleClipChange({
                      ...selectedClip,
                      effects: selectedClip.effects.filter(
                        (e) => e.id !== effectId,
                      ),
                    });
                  }
                }}
                onUpdateEffect={(effect) => {
                  if (selectedClip) {
                    handleClipChange({
                      ...selectedClip,
                      effects: selectedClip.effects.map((e) =>
                        e.id === effect.id ? effect : e,
                      ),
                    });
                  }
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
export default VideoTimelineEditor;
