/**
 * Sequencer Timeline Editor - Editor de Timeline Cinemático
 * 
 * Interface estilo Premiere/After Effects para edição de sequências cinemáticas.
 * Conecta ao SequencerRuntime para reprodução em tempo real.
 */

'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { formatSequencerTime as formatTime, pixelsToTime, sequencerColors as colors, timeToPixels } from './SequencerTimeline.helpers';
import type { SequenceData, SequencerTimelineProps, TimelineGroup, TimelineKeyframe, TimelineTrack, TrackType } from './SequencerTimeline.types';
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Copy,
  Scissors,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Settings,
  Film,
  Camera,
  Lightbulb,
  Music,
  Box,
  Move,
  RotateCcw,
  Layers,
  Diamond,
  Circle,
} from 'lucide-react';

// ============================================================================
// TRACK ICONS
// ============================================================================

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
// PLAYHEAD COMPONENT
// ============================================================================

const Playhead: React.FC<{
  time: number;
  pixelsPerSecond: number;
  height: number;
  onDrag: (newTime: number) => void;
}> = ({ time, pixelsPerSecond, height, onDrag }) => {
  const x = timeToPixels(time, pixelsPerSecond);
  const isDragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    isDragging.current = true;
    
    const handleMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const rect = (e.target as HTMLElement).closest('.timeline-tracks')?.getBoundingClientRect();
      if (!rect) return;
      const newTime = Math.max(0, pixelsToTime(e.clientX - rect.left, pixelsPerSecond));
      onDrag(newTime);
    };

    const handleUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [pixelsPerSecond, onDrag]);

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: 0,
        bottom: 0,
        width: '2px',
        background: colors.error,
        cursor: 'ew-resize',
        zIndex: 100,
      }}
    >
      {/* Head */}
      <div
        style={{
          position: 'absolute',
          top: '-4px',
          left: '-6px',
          width: '14px',
          height: '14px',
          background: colors.error,
          borderRadius: '2px',
          transform: 'rotate(45deg)',
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
}> = ({ keyframe, trackColor, pixelsPerSecond, onSelect, onDrag }) => {
  const x = timeToPixels(keyframe.time, pixelsPerSecond);
  const isDragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
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
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [keyframe.time, pixelsPerSecond, onSelect, onDrag]);

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left: `${x - 6}px`,
        top: '50%',
        transform: 'translateY(-50%) rotate(45deg)',
        width: '10px',
        height: '10px',
        background: keyframe.selected ? '#fff' : trackColor,
        border: `2px solid ${keyframe.selected ? colors.primary : trackColor}`,
        borderRadius: '2px',
        cursor: 'pointer',
        boxShadow: keyframe.selected ? `0 0 0 2px ${colors.primary}40` : 'none',
      }}
    />
  );
};

// ============================================================================
// TRACK ROW
// ============================================================================

const TrackRow: React.FC<{
  track: TimelineTrack;
  pixelsPerSecond: number;
  onKeyframeSelect: (keyframeId: string) => void;
  onKeyframeDrag: (keyframeId: string, newTime: number) => void;
  onToggleLock: () => void;
  onToggleVisible: () => void;
  onToggleMute: () => void;
  onAddKeyframe: (time: number) => void;
}> = ({
  track,
  pixelsPerSecond,
  onKeyframeSelect,
  onKeyframeDrag,
  onToggleLock,
  onToggleVisible,
  onToggleMute,
  onAddKeyframe,
}) => {
  const Icon = trackTypeIcons[track.type];
  const trackColor = track.color || colors[track.type] || colors.textMuted;

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (track.locked) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = pixelsToTime(x, pixelsPerSecond);
    onAddKeyframe(time);
  }, [track.locked, pixelsPerSecond, onAddKeyframe]);

  return (
    <div
      style={{
        display: 'flex',
        borderBottom: `1px solid ${colors.border}`,
        background: colors.surface,
        opacity: track.muted ? 0.5 : 1,
      }}
    >
      {/* Track Info */}
      <div
        style={{
          width: '240px',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderRight: `1px solid ${colors.border}`,
          background: colors.bg,
        }}
      >
        <Icon size={14} color={trackColor} />
        <span
          style={{
            flex: 1,
            fontSize: '12px',
            color: colors.text,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {track.name}
        </span>
        <span style={{ fontSize: '10px', color: colors.textDim }}>{track.property}</span>
        
        {/* Controls */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={onToggleLock}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '2px',
              cursor: 'pointer',
              color: track.locked ? colors.warning : colors.textDim,
            }}
          >
            {track.locked ? <Lock size={12} /> : <Unlock size={12} />}
          </button>
          <button
            onClick={onToggleVisible}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '2px',
              cursor: 'pointer',
              color: track.visible === false ? colors.textDim : colors.textMuted,
            }}
          >
            {track.visible === false ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
          <button
            onClick={onToggleMute}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '2px',
              cursor: 'pointer',
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
          height: '32px',
          position: 'relative',
          background: colors.surface,
          cursor: track.locked ? 'not-allowed' : 'crosshair',
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
          />
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// RULER / TIME RULER
// ============================================================================

const TimeRuler: React.FC<{
  duration: number;
  pixelsPerSecond: number;
  frameRate: number;
  currentTime: number;
  onTimeClick: (time: number) => void;
}> = ({ duration, pixelsPerSecond, frameRate, currentTime, onTimeClick }) => {
  const width = timeToPixels(duration, pixelsPerSecond);
  const majorInterval = pixelsPerSecond >= 100 ? 1 : 5; // Segundos entre marcações principais
  const minorInterval = majorInterval / 4;

  const marks: { time: number; major: boolean }[] = [];
  for (let t = 0; t <= duration; t += minorInterval) {
    marks.push({ time: t, major: t % majorInterval === 0 });
  }

  const handleClick = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = Math.max(0, Math.min(duration, pixelsToTime(x, pixelsPerSecond)));
    onTimeClick(time);
  }, [duration, pixelsPerSecond, onTimeClick]);

  return (
    <div
      onClick={handleClick}
      style={{
        height: '28px',
        background: colors.bg,
        borderBottom: `1px solid ${colors.border}`,
        position: 'relative',
        cursor: 'pointer',
        overflow: 'hidden',
      }}
    >
      {marks.map((mark, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${timeToPixels(mark.time, pixelsPerSecond)}px`,
            bottom: 0,
            width: '1px',
            height: mark.major ? '12px' : '6px',
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
              position: 'absolute',
              left: `${timeToPixels(mark.time, pixelsPerSecond)}px`,
              top: '2px',
              fontSize: '9px',
              color: colors.textDim,
              transform: 'translateX(-50%)',
            }}
          >
            {formatTime(mark.time, frameRate)}
          </span>
        ))}
    </div>
  );
};

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
  const [selectedKeyframes, setSelectedKeyframes] = useState<Set<string>>(new Set());
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
      if (e.key === ' ') {
        e.preventDefault();
        isPlaying ? onPause() : onPlay();
      }
      if (e.key === 'Delete' && selectedKeyframes.size > 0) {
        selectedKeyframes.forEach((kfId) => {
          const track = allTracks.find((t) => t.keyframes.some((k) => k.id === kfId));
          if (track) onKeyframeDelete(track.id, kfId);
        });
        setSelectedKeyframes(new Set());
      }
      if (e.key === 'Home') {
        onTimeChange(0);
      }
      if (e.key === 'End') {
        onTimeChange(sequence.duration);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, selectedKeyframes, allTracks, sequence.duration, onPlay, onPause, onTimeChange, onKeyframeDelete]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: colors.bg,
        color: colors.text,
        fontSize: '13px',
      }}
    >
      {/* Transport Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          background: colors.surface,
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        {/* Play Controls */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={onStop}
            style={{
              padding: '6px',
              background: colors.surfaceHover,
              border: 'none',
              borderRadius: '4px',
              color: colors.text,
              cursor: 'pointer',
            }}
          >
            <Square size={14} />
          </button>
          <button
            onClick={() => onTimeChange(Math.max(0, currentTime - 1))}
            style={{
              padding: '6px',
              background: colors.surfaceHover,
              border: 'none',
              borderRadius: '4px',
              color: colors.text,
              cursor: 'pointer',
            }}
          >
            <SkipBack size={14} />
          </button>
          <button
            onClick={isPlaying ? onPause : onPlay}
            style={{
              padding: '6px 12px',
              background: isPlaying ? colors.warning : colors.primary,
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button
            onClick={() => onTimeChange(Math.min(sequence.duration, currentTime + 1))}
            style={{
              padding: '6px',
              background: colors.surfaceHover,
              border: 'none',
              borderRadius: '4px',
              color: colors.text,
              cursor: 'pointer',
            }}
          >
            <SkipForward size={14} />
          </button>
        </div>

        {/* Time Display */}
        <div
          style={{
            padding: '4px 12px',
            background: colors.bg,
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '12px',
            color: colors.primary,
          }}
        >
          {formatTime(currentTime, sequence.frameRate)}
        </div>

        <span style={{ color: colors.textDim, fontSize: '11px' }}>/</span>

        <div
          style={{
            padding: '4px 8px',
            background: colors.bg,
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '11px',
            color: colors.textMuted,
          }}
        >
          {formatTime(sequence.duration, sequence.frameRate)}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Zoom */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={handleZoomOut}
            style={{
              padding: '4px',
              background: 'transparent',
              border: 'none',
              color: colors.textMuted,
              cursor: 'pointer',
            }}
          >
            <ZoomOut size={14} />
          </button>
          <span style={{ fontSize: '11px', color: colors.textDim, minWidth: '50px', textAlign: 'center' }}>
            {Math.round(pixelsPerSecond)}px/s
          </span>
          <button
            onClick={handleZoomIn}
            style={{
              padding: '4px',
              background: 'transparent',
              border: 'none',
              color: colors.textMuted,
              cursor: 'pointer',
            }}
          >
            <ZoomIn size={14} />
          </button>
        </div>

        {/* Settings */}
        <button
          style={{
            padding: '6px',
            background: 'transparent',
            border: 'none',
            color: colors.textMuted,
            cursor: 'pointer',
          }}
        >
          <Settings size={14} />
        </button>
      </div>

      {/* Timeline Header */}
      <div style={{ display: 'flex' }}>
        {/* Track List Header */}
        <div
          style={{
            width: '240px',
            padding: '8px 12px',
            background: colors.bg,
            borderBottom: `1px solid ${colors.border}`,
            borderRight: `1px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Film size={14} color={colors.primary} />
          <span style={{ fontWeight: 600, fontSize: '12px' }}>{sequence.name}</span>
          <span style={{ fontSize: '10px', color: colors.textDim }}>{sequence.frameRate}fps</span>
        </div>

        {/* Time Ruler */}
        <div style={{ flex: 1, position: 'relative' }}>
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
          overflow: 'auto',
          position: 'relative',
        }}
      >
        {/* Groups & Tracks */}
        {sequence.groups.map((group) => (
          <div key={group.id}>
            {/* Group Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '6px 12px',
                background: colors.surfaceActive,
                borderBottom: `1px solid ${colors.border}`,
                cursor: 'pointer',
              }}
              onClick={() =>
                onSequenceUpdate({
                  groups: sequence.groups.map((g) =>
                    g.id === group.id ? { ...g, collapsed: !g.collapsed } : g
                  ),
                })
              }
            >
              {group.collapsed ? (
                <ChevronRight size={14} color={colors.textMuted} />
              ) : (
                <ChevronDown size={14} color={colors.textMuted} />
              )}
              <span style={{ marginLeft: '8px', fontWeight: 500, fontSize: '12px' }}>{group.name}</span>
              <span style={{ marginLeft: '8px', fontSize: '10px', color: colors.textDim }}>
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
                          t.id === track.id ? { ...t, locked: !t.locked } : t
                        ),
                      })),
                    })
                  }
                  onToggleVisible={() =>
                    onSequenceUpdate({
                      groups: sequence.groups.map((g) => ({
                        ...g,
                        tracks: g.tracks.map((t) =>
                          t.id === track.id ? { ...t, visible: t.visible === false ? true : false } : t
                        ),
                      })),
                    })
                  }
                  onToggleMute={() =>
                    onSequenceUpdate({
                      groups: sequence.groups.map((g) => ({
                        ...g,
                        tracks: g.tracks.map((t) =>
                          t.id === track.id ? { ...t, muted: !t.muted } : t
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 12px',
          background: colors.surface,
          borderTop: `1px solid ${colors.border}`,
          fontSize: '11px',
          color: colors.textMuted,
        }}
      >
        <span>
          {allTracks.length} tracks | {allTracks.reduce((sum, t) => sum + t.keyframes.length, 0)} keyframes
        </span>
        {selectedKeyframes.size > 0 && (
          <span style={{ color: colors.primary }}>{selectedKeyframes.size} selected</span>
        )}
        <span>
          Duration: {sequence.duration}s | {Math.round(sequence.duration * sequence.frameRate)} frames
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// DEMO DATA
// ============================================================================

export const DEMO_SEQUENCE: SequenceData = {
  id: 'seq-1',
  name: 'Opening Cinematic',
  duration: 30,
  frameRate: 30,
  groups: [
    {
      id: 'grp-camera',
      name: 'Camera',
      tracks: [
        {
          id: 'trk-cam-pos',
          name: 'Main Camera',
          type: 'camera',
          targetId: 'camera-main',
          property: 'position',
          keyframes: [
            { id: 'kf-1', time: 0, value: [0, 5, 10], easing: 'easeInOut' },
            { id: 'kf-2', time: 5, value: [5, 3, 8], easing: 'easeInOut' },
            { id: 'kf-3', time: 10, value: [0, 2, 5], easing: 'linear' },
          ],
        },
        {
          id: 'trk-cam-fov',
          name: 'Camera FOV',
          type: 'camera',
          targetId: 'camera-main',
          property: 'fov',
          color: '#f97316',
          keyframes: [
            { id: 'kf-fov-1', time: 0, value: 60, easing: 'linear' },
            { id: 'kf-fov-2', time: 8, value: 45, easing: 'easeOut' },
          ],
        },
      ],
    },
    {
      id: 'grp-actors',
      name: 'Actors',
      tracks: [
        {
          id: 'trk-hero-pos',
          name: 'Hero Position',
          type: 'transform',
          targetId: 'actor-hero',
          property: 'position',
          keyframes: [
            { id: 'kf-hero-1', time: 2, value: [0, 0, 0], easing: 'easeIn' },
            { id: 'kf-hero-2', time: 6, value: [3, 0, 2], easing: 'easeOut' },
          ],
        },
      ],
    },
    {
      id: 'grp-lights',
      name: 'Lighting',
      tracks: [
        {
          id: 'trk-sun',
          name: 'Sun Intensity',
          type: 'light',
          targetId: 'light-sun',
          property: 'intensity',
          keyframes: [
            { id: 'kf-sun-1', time: 0, value: 0.2, easing: 'linear' },
            { id: 'kf-sun-2', time: 15, value: 1.0, easing: 'easeIn' },
          ],
        },
      ],
    },
    {
      id: 'grp-audio',
      name: 'Audio',
      tracks: [
        {
          id: 'trk-music',
          name: 'Background Music',
          type: 'audio',
          targetId: 'audio-bgm',
          property: 'volume',
          keyframes: [
            { id: 'kf-music-1', time: 0, value: 0, easing: 'linear' },
            { id: 'kf-music-2', time: 3, value: 1.0, easing: 'easeIn' },
          ],
        },
      ],
    },
  ],
};

export default SequencerTimeline;
