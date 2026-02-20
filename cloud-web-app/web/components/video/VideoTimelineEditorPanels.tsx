'use client';

import React, { useMemo, useRef } from 'react';
import type {
  ClipEffect,
  TimelineClip,
  TimelineMarker,
  Track,
} from './VideoTimelineEditor';

interface TimelineRulerProps {
  duration: number;
  zoom: number;
  scrollX: number;
  playhead: number;
  frameRate: number;
  workArea: { in: number; out: number };
  markers: TimelineMarker[];
  onSeek: (time: number) => void;
  onMarkerClick: (marker: TimelineMarker) => void;
}

export function TimelineRuler({
  duration,
  zoom,
  scrollX,
  playhead,
  frameRate,
  workArea,
  markers,
  onSeek,
  onMarkerClick,
}: TimelineRulerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * frameRate);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };
  
  const pixelsPerSecond = 100 * zoom;
  const tickInterval = zoom < 0.5 ? 5 : zoom < 1 ? 2 : zoom < 2 ? 1 : 0.5;
  
  const handleClick = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollX;
    const time = x / pixelsPerSecond;
    onSeek(Math.max(0, Math.min(duration, time)));
  };
  
  const visibleStart = scrollX / pixelsPerSecond;
  const visibleEnd = visibleStart + (containerRef.current?.clientWidth ?? 1000) / pixelsPerSecond;
  
  const ticks = useMemo(() => {
    const result: number[] = [];
    const start = Math.floor(visibleStart / tickInterval) * tickInterval;
    
    for (let time = start; time <= Math.min(visibleEnd + tickInterval, duration); time += tickInterval) {
      result.push(time);
    }
    
    return result;
  }, [visibleStart, visibleEnd, tickInterval, duration]);
  
  return (
    <div
      ref={containerRef}
      style={{
        height: '32px',
        background: '#0f172a',
        borderBottom: '1px solid #1e293b',
        position: 'relative',
        cursor: 'pointer',
        overflow: 'hidden',
      }}
      onClick={handleClick}
    >
      {/* Work area */}
      <div
        style={{
          position: 'absolute',
          left: `${(workArea.in * pixelsPerSecond) - scrollX}px`,
          width: `${(workArea.out - workArea.in) * pixelsPerSecond}px`,
          height: '100%',
          background: 'rgba(59, 130, 246, 0.1)',
          borderLeft: '2px solid #3b82f6',
          borderRight: '2px solid #3b82f6',
        }}
      />
      
      {/* Ticks */}
      {ticks.map((time) => (
        <div
          key={time}
          style={{
            position: 'absolute',
            left: `${(time * pixelsPerSecond) - scrollX}px`,
            height: time % 1 === 0 ? '100%' : '50%',
            width: '1px',
            background: time % 5 === 0 ? '#475569' : '#374151',
            bottom: 0,
          }}
        >
          {time % (tickInterval * 2) === 0 && (
            <span style={{
              position: 'absolute',
              top: '4px',
              left: '4px',
              fontSize: '10px',
              color: '#94a3b8',
              whiteSpace: 'nowrap',
            }}>
              {formatTime(time)}
            </span>
          )}
        </div>
      ))}
      
      {/* Markers */}
      {markers.map((marker) => (
        <div
          key={marker.id}
          onClick={(e) => { e.stopPropagation(); onMarkerClick(marker); }}
          style={{
            position: 'absolute',
            left: `${(marker.time * pixelsPerSecond) - scrollX - 6}px`,
            bottom: '4px',
            width: '12px',
            height: '12px',
            background: marker.color,
            borderRadius: '2px',
            cursor: 'pointer',
          }}
          title={marker.name}
        />
      ))}
      
      {/* Playhead */}
      <div
        style={{
          position: 'absolute',
          left: `${(playhead * pixelsPerSecond) - scrollX}px`,
          top: 0,
          bottom: 0,
          width: '2px',
          background: '#ef4444',
          zIndex: 10,
        }}
      >
        <div style={{
          position: 'absolute',
          top: 0,
          left: '-6px',
          width: '14px',
          height: '14px',
          background: '#ef4444',
          clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
        }} />
      </div>
    </div>
  );
}

// ============================================================================
// TRACK HEADER
// ============================================================================

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
        width: '200px',
        height: `${track.height}px`,
        background: '#0f172a',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        gap: '8px',
      }}
    >
      {/* Track color indicator */}
      <div style={{
        width: '4px',
        height: '60%',
        background: track.color,
        borderRadius: '2px',
      }} />
      
      {/* Track name */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ 
          color: 'white', 
          fontSize: '12px', 
          fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {track.name}
        </div>
        <div style={{ color: '#64748b', fontSize: '10px' }}>
          {track.type.toUpperCase()}
        </div>
      </div>
      
      {/* Track controls */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          onClick={onToggleVisible}
          style={{
            width: '20px',
            height: '20px',
            background: track.visible ? '#374151' : '#1e293b',
            border: 'none',
            borderRadius: '2px',
            color: track.visible ? 'white' : '#64748b',
            cursor: 'pointer',
            fontSize: '10px',
          }}
          title="Visibility"
        >
          👁
        </button>
        
        <button
          onClick={onToggleMute}
          style={{
            width: '20px',
            height: '20px',
            background: track.muted ? '#ef4444' : '#1e293b',
            border: 'none',
            borderRadius: '2px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '10px',
          }}
          title="Mute"
        >
          M
        </button>
        
        {track.type === 'audio' && (
          <button
            onClick={onToggleSolo}
            style={{
              width: '20px',
              height: '20px',
              background: track.solo ? '#f59e0b' : '#1e293b',
              border: 'none',
              borderRadius: '2px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '10px',
            }}
            title="Solo"
          >
            S
          </button>
        )}
        
        <button
          onClick={onToggleLock}
          style={{
            width: '20px',
            height: '20px',
            background: track.locked ? '#3b82f6' : '#1e293b',
            border: 'none',
            borderRadius: '2px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '10px',
          }}
          title="Lock"
        >
          🔒
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// TIMELINE CLIP COMPONENT
// ============================================================================

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

export function TimelineClipComponent({
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
  const [dragType, setDragType] = useState<'move' | 'trim-start' | 'trim-end' | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [originalStart, setOriginalStart] = useState(0);
  const [originalDuration, setOriginalDuration] = useState(0);
  
  const pixelsPerSecond = 100 * zoom;
  const clipLeft = (clip.startTime * pixelsPerSecond) - scrollX;
  const clipWidth = clip.duration * pixelsPerSecond;
  
  const handleMouseDown = (e: React.MouseEvent, type: 'move' | 'trim-start' | 'trim-end') => {
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
      
      if (dragType === 'move') {
        onMove(Math.max(0, originalStart + deltaTime));
      } else if (dragType === 'trim-start') {
        const newIn = Math.max(0, clip.sourceIn + deltaTime);
        if (newIn < clip.sourceOut) {
          onTrimStart(newIn);
        }
      } else if (dragType === 'trim-end') {
        const newDuration = Math.max(0.1, originalDuration + deltaTime);
        onTrimEnd(newDuration);
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      setDragType(null);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragType, dragStartX, originalStart, originalDuration, pixelsPerSecond, clip, onMove, onTrimStart, onTrimEnd]);
  
  return (
    <div
      style={{
        position: 'absolute',
        left: `${clipLeft}px`,
        width: `${clipWidth}px`,
        top: '4px',
        bottom: '4px',
        background: clip.color,
        borderRadius: '4px',
        border: isSelected ? '2px solid white' : '1px solid rgba(255,255,255,0.2)',
        overflow: 'hidden',
        cursor: track.locked ? 'not-allowed' : 'pointer',
        opacity: clip.muted ? 0.5 : 1,
      }}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      {/* Trim handles */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '8px',
          cursor: track.locked ? 'not-allowed' : 'ew-resize',
          background: isSelected ? 'rgba(255,255,255,0.3)' : 'transparent',
        }}
        onMouseDown={(e) => handleMouseDown(e, 'trim-start')}
      />
      
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '8px',
          cursor: track.locked ? 'not-allowed' : 'ew-resize',
          background: isSelected ? 'rgba(255,255,255,0.3)' : 'transparent',
        }}
        onMouseDown={(e) => handleMouseDown(e, 'trim-end')}
      />
      
      {/* Clip content */}
      <div
        style={{
          padding: '4px 12px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          cursor: track.locked ? 'not-allowed' : 'move',
        }}
        onMouseDown={(e) => handleMouseDown(e, 'move')}
      >
        {/* Thumbnail for video clips */}
        {clip.type === 'video' && clip.thumbnail && clipWidth > 60 && (
          <div style={{
            position: 'absolute',
            left: '4px',
            top: '4px',
            bottom: '4px',
            width: '40px',
            background: `url(${clip.thumbnail}) center/cover`,
            borderRadius: '2px',
          }} />
        )}
        
        {/* Clip name */}
        <div style={{
          color: 'white',
          fontSize: '11px',
          fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginLeft: clip.type === 'video' && clip.thumbnail && clipWidth > 60 ? '48px' : 0,
        }}>
          {clip.name}
        </div>
        
        {/* Duration */}
        {clipWidth > 100 && (
          <div style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: '9px',
            marginLeft: clip.type === 'video' && clip.thumbnail && clipWidth > 60 ? '48px' : 0,
          }}>
            {clip.duration.toFixed(2)}s
          </div>
        )}
        
        {/* Waveform for audio */}
        {clip.type === 'audio' && (
          <div style={{
            position: 'absolute',
            left: '8px',
            right: '8px',
            bottom: '4px',
            height: '20px',
            display: 'flex',
            alignItems: 'flex-end',
            gap: '1px',
            opacity: 0.5,
          }}>
            {Array.from({ length: Math.min(50, Math.floor(clipWidth / 4)) }).map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${20 + Math.random() * 80}%`,
                  background: 'white',
                  borderRadius: '1px',
                }}
              />
            ))}
          </div>
        )}
        
        {/* Keyframe indicators */}
        {clip.keyframes.length > 0 && (
          <div style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '2px',
            height: '4px',
            display: 'flex',
          }}>
            {clip.keyframes.map((kf) => (
              <div
                key={kf.id}
                style={{
                  position: 'absolute',
                  left: `${(kf.time / clip.duration) * 100}%`,
                  width: '4px',
                  height: '4px',
                  background: '#f59e0b',
                  borderRadius: '50%',
                  transform: 'translateX(-50%)',
                }}
              />
            ))}
          </div>
        )}
        
        {/* Lock indicator */}
        {clip.locked && (
          <div style={{
            position: 'absolute',
            right: '4px',
            top: '4px',
            fontSize: '10px',
          }}>
            🔒
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// TRACK CONTENT
// ============================================================================

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
        background: track.visible ? '#1e293b' : '#0f172a',
        borderBottom: '1px solid #374151',
        position: 'relative',
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
          onTrimEnd={(newDuration) => onClipChange({ ...clip, duration: newDuration })}
        />
      ))}
    </div>
  );
}

// ============================================================================
// PLAYBACK CONTROLS
// ============================================================================

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
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '8px 16px',
      background: '#0f172a',
      borderBottom: '1px solid #1e293b',
    }}>
      {/* Time display */}
      <div style={{
        fontFamily: 'monospace',
        fontSize: '14px',
        color: 'white',
        background: '#1e293b',
        padding: '4px 8px',
        borderRadius: '4px',
        minWidth: '100px',
        textAlign: 'center',
      }}>
        {formatTime(currentTime)}
      </div>
      
      {/* Transport controls */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          onClick={onGoToStart}
          style={{
            width: '32px',
            height: '32px',
            background: '#1e293b',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
          }}
          title="Go to Start"
        >
          ⏮
        </button>
        
        <button
          onClick={onStepBackward}
          style={{
            width: '32px',
            height: '32px',
            background: '#1e293b',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
          }}
          title="Step Back"
        >
          ⏪
        </button>
        
        <button
          onClick={isPlaying ? onPause : onPlay}
          style={{
            width: '40px',
            height: '32px',
            background: isPlaying ? '#ef4444' : '#22c55e',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
          }}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        
        <button
          onClick={onStepForward}
          style={{
            width: '32px',
            height: '32px',
            background: '#1e293b',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
          }}
          title="Step Forward"
        >
          ⏩
        </button>
        
        <button
          onClick={onGoToEnd}
          style={{
            width: '32px',
            height: '32px',
            background: '#1e293b',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
          }}
          title="Go to End"
        >
          ⏭
        </button>
      </div>
      
      {/* Duration display */}
      <div style={{ color: '#64748b', fontSize: '12px' }}>
        / {formatTime(duration)}
      </div>
    </div>
  );
}

// ============================================================================
// CLIP INSPECTOR
// ============================================================================

interface ClipInspectorProps {
  clip: TimelineClip | null;
  onUpdate: (clip: TimelineClip) => void;
}

export function ClipInspector({ clip, onUpdate }: ClipInspectorProps) {
  if (!clip) {
    return (
      <div style={{
        padding: '16px',
        color: '#64748b',
        textAlign: 'center',
      }}>
        Select a clip to edit its properties
      </div>
    );
  }
  
  return (
    <div style={{ padding: '12px' }}>
      <h3 style={{ color: 'white', fontSize: '14px', marginBottom: '16px' }}>
        Clip Properties
      </h3>
      
      {/* Name */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ color: '#94a3b8', fontSize: '11px', display: 'block', marginBottom: '4px' }}>
          Name
        </label>
        <input
          type="text"
          value={clip.name}
          onChange={(e) => onUpdate({ ...clip, name: e.target.value })}
          style={{
            width: '100%',
            background: '#1e293b',
            border: '1px solid #374151',
            borderRadius: '4px',
            padding: '6px',
            color: 'white',
            fontSize: '12px',
          }}
        />
      </div>
      
      {/* Timing */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ color: '#94a3b8', fontSize: '11px', display: 'block', marginBottom: '4px' }}>
          Start Time
        </label>
        <input
          type="number"
          value={clip.startTime.toFixed(2)}
          onChange={(e) => onUpdate({ ...clip, startTime: parseFloat(e.target.value) })}
          step={0.01}
          style={{
            width: '100%',
            background: '#1e293b',
            border: '1px solid #374151',
            borderRadius: '4px',
            padding: '6px',
            color: 'white',
            fontSize: '12px',
          }}
        />
      </div>
      
      <div style={{ marginBottom: '12px' }}>
        <label style={{ color: '#94a3b8', fontSize: '11px', display: 'block', marginBottom: '4px' }}>
          Duration
        </label>
        <input
          type="number"
          value={clip.duration.toFixed(2)}
          onChange={(e) => onUpdate({ ...clip, duration: parseFloat(e.target.value) })}
          step={0.01}
          style={{
            width: '100%',
            background: '#1e293b',
            border: '1px solid #374151',
            borderRadius: '4px',
            padding: '6px',
            color: 'white',
            fontSize: '12px',
          }}
        />
      </div>
      
      {/* Opacity */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <label style={{ color: '#94a3b8', fontSize: '11px' }}>Opacity</label>
          <span style={{ color: '#64748b', fontSize: '10px' }}>{Math.round(clip.opacity * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={clip.opacity}
          onChange={(e) => onUpdate({ ...clip, opacity: parseFloat(e.target.value) })}
          style={{ width: '100%' }}
        />
      </div>
      
      {/* Speed */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <label style={{ color: '#94a3b8', fontSize: '11px' }}>Speed</label>
          <span style={{ color: '#64748b', fontSize: '10px' }}>{clip.speed}x</span>
        </div>
        <input
          type="range"
          min={0.1}
          max={4}
          step={0.1}
          value={clip.speed}
          onChange={(e) => onUpdate({ ...clip, speed: parseFloat(e.target.value) })}
          style={{ width: '100%' }}
        />
      </div>
      
      {/* Audio level for audio/video clips */}
      {(clip.type === 'audio' || clip.type === 'video') && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <label style={{ color: '#94a3b8', fontSize: '11px' }}>Audio Level</label>
            <span style={{ color: '#64748b', fontSize: '10px' }}>{Math.round(clip.audioLevel * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={clip.audioLevel}
            onChange={(e) => onUpdate({ ...clip, audioLevel: parseFloat(e.target.value) })}
            style={{ width: '100%' }}
          />
        </div>
      )}
      
      {/* Lock/Mute */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <label style={{ color: '#94a3b8', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <input
            type="checkbox"
            checked={clip.locked}
            onChange={(e) => onUpdate({ ...clip, locked: e.target.checked })}
          />
          Locked
        </label>
        
        <label style={{ color: '#94a3b8', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <input
            type="checkbox"
            checked={clip.muted}
            onChange={(e) => onUpdate({ ...clip, muted: e.target.checked })}
          />
          Muted
        </label>
      </div>
    </div>
  );
}

// ============================================================================
// EFFECTS PANEL
// ============================================================================

interface EffectsPanelProps {
  clip: TimelineClip | null;
  onAddEffect: (effectType: string) => void;
  onRemoveEffect: (effectId: string) => void;
  onUpdateEffect: (effect: ClipEffect) => void;
}

const availableEffects = [
  { type: 'blur', name: 'Gaussian Blur', category: 'Blur' },
  { type: 'sharpen', name: 'Sharpen', category: 'Blur' },
  { type: 'brightness_contrast', name: 'Brightness/Contrast', category: 'Color' },
  { type: 'hue_saturation', name: 'Hue/Saturation', category: 'Color' },
  { type: 'color_balance', name: 'Color Balance', category: 'Color' },
  { type: 'lumetri', name: 'Lumetri Color', category: 'Color' },
  { type: 'vignette', name: 'Vignette', category: 'Stylize' },
  { type: 'chromatic_aberration', name: 'Chromatic Aberration', category: 'Stylize' },
  { type: 'film_grain', name: 'Film Grain', category: 'Stylize' },
  { type: 'glow', name: 'Glow', category: 'Stylize' },
];

export function EffectsPanel({ clip, onAddEffect, onRemoveEffect, onUpdateEffect }: EffectsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredEffects = availableEffects.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.category.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <div style={{ padding: '12px' }}>
      <h3 style={{ color: 'white', fontSize: '14px', marginBottom: '12px' }}>Effects</h3>
      
      {/* Search */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search effects..."
        style={{
          width: '100%',
          background: '#1e293b',
          border: '1px solid #374151',
          borderRadius: '4px',
          padding: '8px',
          color: 'white',
          fontSize: '12px',
          marginBottom: '12px',
        }}
      />
      
      {/* Applied effects */}
      {clip && clip.effects.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <h4 style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '8px' }}>
            Applied Effects
          </h4>
          {clip.effects.map((effect) => (
            <div
              key={effect.id}
              style={{
                background: '#1e293b',
                borderRadius: '4px',
                padding: '8px',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={effect.enabled}
                  onChange={(e) => onUpdateEffect({ ...effect, enabled: e.target.checked })}
                />
                <span style={{ color: 'white', fontSize: '12px' }}>{effect.name}</span>
              </div>
              <button
                onClick={() => onRemoveEffect(effect.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Available effects */}
      <h4 style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '8px' }}>
        Available Effects
      </h4>
      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
        {filteredEffects.map((effect) => (
          <button
            key={effect.type}
            onClick={() => clip && onAddEffect(effect.type)}
            disabled={!clip}
            style={{
              width: '100%',
              background: '#1e293b',
              border: 'none',
              borderRadius: '4px',
              padding: '8px',
              marginBottom: '4px',
              color: clip ? 'white' : '#64748b',
              cursor: clip ? 'pointer' : 'not-allowed',
              textAlign: 'left',
              fontSize: '12px',
            }}
          >
            <span>{effect.name}</span>
            <span style={{ color: '#64748b', marginLeft: '8px', fontSize: '10px' }}>
              {effect.category}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN VIDEO TIMELINE EDITOR
// ============================================================================

