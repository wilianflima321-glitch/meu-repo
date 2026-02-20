/**
 * VIDEO TIMELINE EDITOR - Aethel Engine
 * 
 * Editor de timeline de vídeo profissional no estilo Adobe Premiere Pro.
 * Permite edição não-linear de vídeo, áudio, efeitos e transições.
 * 
 * FEATURES:
 * - Multi-track timeline
 * - Video/Audio/Effect tracks
 * - Clip trimming and splitting
 * - Transitions library
 * - Keyframe animation
 * - Color grading (Lumetri style)
 * - Audio mixing
 * - Markers and regions
 * - Real-time preview
 * - Export settings
 */

'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  ClipInspector,
  EffectsPanel,
  PlaybackControls,
  TimelineClipComponent,
  TimelineRuler,
  TrackContent,
  TrackHeader,
} from './VideoTimelineEditorPanels';

// ============================================================================
// TYPES
// ============================================================================

export type TrackType = 'video' | 'audio' | 'effect' | 'title' | 'adjustment';
export type ClipType = 'video' | 'audio' | 'image' | 'title' | 'effect' | 'adjustment';

export interface TimelineClip {
  id: string;
  name: string;
  type: ClipType;
  trackId: string;
  startTime: number;       // Start on timeline (seconds)
  duration: number;        // Duration on timeline
  sourceIn: number;        // Source in point
  sourceOut: number;       // Source out point
  sourceDuration: number;  // Original source duration
  sourceUrl: string;
  thumbnail?: string;
  audioLevel: number;      // 0-1
  opacity: number;         // 0-1
  speed: number;           // 1 = normal
  keyframes: ClipKeyframe[];
  effects: ClipEffect[];
  transitions: {
    in?: Transition;
    out?: Transition;
  };
  color: string;           // UI color
  locked: boolean;
  muted: boolean;
}

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  height: number;
  visible: boolean;
  locked: boolean;
  muted: boolean;
  solo: boolean;
  color: string;
  volume: number;         // For audio tracks
  pan: number;            // For audio tracks (-1 to 1)
  clips: string[];        // Clip IDs
}

export interface ClipKeyframe {
  id: string;
  property: string;       // opacity, position.x, scale, etc.
  time: number;           // Relative to clip start
  value: number | number[];
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bezier';
  bezierHandles?: { x1: number; y1: number; x2: number; y2: number };
}

export interface ClipEffect {
  id: string;
  type: string;           // blur, color_correction, etc.
  name: string;
  enabled: boolean;
  parameters: Record<string, unknown>;
  keyframes: ClipKeyframe[];
}

export interface Transition {
  id: string;
  type: string;           // cross_dissolve, dip_to_black, wipe, etc.
  duration: number;
  parameters: Record<string, unknown>;
}

export interface TimelineMarker {
  id: string;
  time: number;
  name: string;
  color: string;
  type: 'marker' | 'chapter' | 'comment';
}

export interface TimelineRegion {
  id: string;
  startTime: number;
  endTime: number;
  name: string;
  color: string;
}

export interface TimelineProject {
  id: string;
  name: string;
  duration: number;
  frameRate: number;
  resolution: { width: number; height: number };
  tracks: Track[];
  clips: Map<string, TimelineClip>;
  markers: TimelineMarker[];
  regions: TimelineRegion[];
  workAreaIn: number;
  workAreaOut: number;
}

// ================================================================
// MAIN VIDEO TIMELINE EDITOR
// ============================================================================

export interface VideoTimelineEditorProps {
  project?: TimelineProject;
  onChange?: (project: TimelineProject) => void;
}

export function VideoTimelineEditor({ project: initialProject, onChange }: VideoTimelineEditorProps) {
  // Project state
  const [project, setProject] = useState<TimelineProject>(initialProject || {
    id: crypto.randomUUID(),
    name: 'New Project',
    duration: 120,
    frameRate: 30,
    resolution: { width: 1920, height: 1080 },
    tracks: [
      { id: 'v1', name: 'Video 1', type: 'video', height: 60, visible: true, locked: false, muted: false, solo: false, color: '#3b82f6', volume: 1, pan: 0, clips: [] },
      { id: 'v2', name: 'Video 2', type: 'video', height: 60, visible: true, locked: false, muted: false, solo: false, color: '#8b5cf6', volume: 1, pan: 0, clips: [] },
      { id: 'a1', name: 'Audio 1', type: 'audio', height: 50, visible: true, locked: false, muted: false, solo: false, color: '#22c55e', volume: 1, pan: 0, clips: [] },
      { id: 'a2', name: 'Audio 2', type: 'audio', height: 50, visible: true, locked: false, muted: false, solo: false, color: '#10b981', volume: 1, pan: 0, clips: [] },
    ],
    clips: new Map([
      ['clip1', {
        id: 'clip1',
        name: 'Scene 01',
        type: 'video',
        trackId: 'v1',
        startTime: 0,
        duration: 10,
        sourceIn: 0,
        sourceOut: 10,
        sourceDuration: 15,
        sourceUrl: '/media/scene01.mp4',
        audioLevel: 1,
        opacity: 1,
        speed: 1,
        keyframes: [],
        effects: [],
        transitions: {},
        color: '#3b82f6',
        locked: false,
        muted: false,
      }],
      ['clip2', {
        id: 'clip2',
        name: 'Scene 02',
        type: 'video',
        trackId: 'v1',
        startTime: 10,
        duration: 15,
        sourceIn: 0,
        sourceOut: 15,
        sourceDuration: 20,
        sourceUrl: '/media/scene02.mp4',
        audioLevel: 1,
        opacity: 1,
        speed: 1,
        keyframes: [],
        effects: [],
        transitions: {},
        color: '#3b82f6',
        locked: false,
        muted: false,
      }],
      ['clip3', {
        id: 'clip3',
        name: 'Background Music',
        type: 'audio',
        trackId: 'a1',
        startTime: 0,
        duration: 30,
        sourceIn: 0,
        sourceOut: 30,
        sourceDuration: 180,
        sourceUrl: '/media/music.mp3',
        audioLevel: 0.7,
        opacity: 1,
        speed: 1,
        keyframes: [],
        effects: [],
        transitions: {},
        color: '#22c55e',
        locked: false,
        muted: false,
      }],
    ]),
    markers: [],
    regions: [],
    workAreaIn: 0,
    workAreaOut: 120,
  });
  
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  
  // View state
  const [zoom, setZoom] = useState(1);
  const [scrollX, setScrollX] = useState(0);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'inspector' | 'effects'>('inspector');
  
  // Clips array
  const clips = useMemo(() => Array.from(project.clips.values()), [project.clips]);
  const selectedClip = selectedClipId ? project.clips.get(selectedClipId) || null : null;
  
  // Playback loop
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
  
  // Handlers
  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time);
    if (isPlaying) setIsPlaying(false);
  }, [isPlaying]);
  
  const handleClipChange = useCallback((updatedClip: TimelineClip) => {
    setProject((prev) => {
      const newClips = new Map(prev.clips);
      newClips.set(updatedClip.id, updatedClip);
      return { ...prev, clips: newClips };
    });
  }, []);
  
  const handleTrackUpdate = useCallback((trackId: string, updates: Partial<Track>) => {
    setProject((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => t.id === trackId ? { ...t, ...updates } : t),
    }));
  }, []);
  
  const handleAddEffect = useCallback((effectType: string) => {
    if (!selectedClipId) return;
    
    const effect: ClipEffect = {
      id: crypto.randomUUID(),
      type: effectType,
      name: availableEffects.find(e => e.type === effectType)?.name || effectType,
      enabled: true,
      parameters: {},
      keyframes: [],
    };
    
    const clip = project.clips.get(selectedClipId);
    if (clip) {
      handleClipChange({ ...clip, effects: [...clip.effects, effect] });
    }
  }, [selectedClipId, project.clips, handleClipChange]);
  
  // Notify parent
  useEffect(() => {
    onChange?.(project);
  }, [project, onChange]);
  
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#0f172a' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        background: '#0f172a',
        borderBottom: '1px solid #1e293b',
      }}>
        <h2 style={{ color: 'white', fontSize: '16px' }}>🎬 {project.name}</h2>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ color: '#64748b', fontSize: '12px' }}>
            {project.resolution.width}x{project.resolution.height} @ {project.frameRate}fps
          </span>
          
          {/* Zoom controls */}
          <button
            onClick={() => setZoom(z => Math.max(0.1, z / 1.5))}
            style={{
              background: '#1e293b',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            -
          </button>
          <span style={{ color: '#94a3b8', fontSize: '11px', width: '40px', textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(z => Math.min(10, z * 1.5))}
            style={{
              background: '#1e293b',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px',
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
        onStepForward={() => handleSeek(Math.min(project.duration, currentTime + 1 / project.frameRate))}
        onStepBackward={() => handleSeek(Math.max(0, currentTime - 1 / project.frameRate))}
        onGoToStart={() => handleSeek(0)}
        onGoToEnd={() => handleSeek(project.duration)}
      />
      
      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Timeline area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Ruler */}
          <div style={{ display: 'flex' }}>
            <div style={{ width: '200px', background: '#0f172a', borderBottom: '1px solid #1e293b' }} />
            <div style={{ flex: 1, overflow: 'hidden' }}>
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
          <div style={{ flex: 1, overflow: 'auto' }}>
            {project.tracks.map((track) => (
              <div key={track.id} style={{ display: 'flex' }}>
                <TrackHeader
                  track={track}
                  onToggleVisible={() => handleTrackUpdate(track.id, { visible: !track.visible })}
                  onToggleLock={() => handleTrackUpdate(track.id, { locked: !track.locked })}
                  onToggleMute={() => handleTrackUpdate(track.id, { muted: !track.muted })}
                  onToggleSolo={() => handleTrackUpdate(track.id, { solo: !track.solo })}
                  onVolumeChange={(v) => handleTrackUpdate(track.id, { volume: v })}
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
          <div style={{
            height: '12px',
            background: '#0f172a',
            borderTop: '1px solid #1e293b',
            paddingLeft: '200px',
          }}>
            <input
              type="range"
              min={0}
              max={Math.max(0, project.duration * 100 * zoom - 800)}
              value={scrollX}
              onChange={(e) => setScrollX(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </div>
        
        {/* Right panel */}
        <div style={{
          width: '280px',
          background: '#0f172a',
          borderLeft: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Panel tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #1e293b' }}>
            <button
              onClick={() => setActivePanel('inspector')}
              style={{
                flex: 1,
                padding: '10px',
                background: activePanel === 'inspector' ? '#1e293b' : 'transparent',
                border: 'none',
                color: activePanel === 'inspector' ? 'white' : '#64748b',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Inspector
            </button>
            <button
              onClick={() => setActivePanel('effects')}
              style={{
                flex: 1,
                padding: '10px',
                background: activePanel === 'effects' ? '#1e293b' : 'transparent',
                border: 'none',
                color: activePanel === 'effects' ? 'white' : '#64748b',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Effects
            </button>
          </div>
          
          {/* Panel content */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {activePanel === 'inspector' ? (
              <ClipInspector
                clip={selectedClip}
                onUpdate={handleClipChange}
              />
            ) : (
              <EffectsPanel
                clip={selectedClip}
                onAddEffect={handleAddEffect}
                onRemoveEffect={(effectId) => {
                  if (selectedClip) {
                    handleClipChange({
                      ...selectedClip,
                      effects: selectedClip.effects.filter(e => e.id !== effectId),
                    });
                  }
                }}
                onUpdateEffect={(effect) => {
                  if (selectedClip) {
                    handleClipChange({
                      ...selectedClip,
                      effects: selectedClip.effects.map(e => e.id === effect.id ? effect : e),
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
