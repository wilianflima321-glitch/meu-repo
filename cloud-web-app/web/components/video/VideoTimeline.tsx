/**
 * Video Timeline - Timeline REAL de edição de vídeo
 * 
 * Usa Canvas para renderizar tracks e clips.
 * Integra com HTMLVideoElement para preview.
 */

'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface VideoClip {
  id: string;
  name: string;
  src: string;
  startTime: number;      // Posição na timeline (segundos)
  duration: number;       // Duração do clip (segundos)
  inPoint: number;        // Trim início (segundos no source)
  outPoint: number;       // Trim fim (segundos no source)
  trackIndex: number;
  type: 'video' | 'audio' | 'image';
}

export interface TimelineTrack {
  id: string;
  name: string;
  type: 'video' | 'audio';
  muted: boolean;
  locked: boolean;
  height: number;
}

interface TimelineProps {
  tracks: TimelineTrack[];
  clips: VideoClip[];
  duration: number;       // Duração total da timeline
  currentTime: number;
  zoom: number;           // Pixels por segundo
  onTimeChange: (time: number) => void;
  onClipMove?: (clipId: string, startTime: number, trackIndex: number) => void;
  onClipTrim?: (clipId: string, inPoint: number, outPoint: number) => void;
  onClipSelect?: (clipId: string | null) => void;
  selectedClipId?: string | null;
}

// ============================================================================
// TIMELINE COMPONENT
// ============================================================================

export function VideoTimeline({
  tracks,
  clips,
  duration,
  currentTime,
  zoom = 50,
  onTimeChange,
  onClipMove,
  onClipTrim,
  onClipSelect,
  selectedClipId,
}: TimelineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<'playhead' | 'clip' | 'trim-left' | 'trim-right' | null>(null);
  const [dragClipId, setDragClipId] = useState<string | null>(null);
  const [scrollX, setScrollX] = useState(0);

  const TRACK_HEIGHT = 60;
  const HEADER_HEIGHT = 30;
  const RULER_HEIGHT = 25;

  const canvasWidth = Math.max(duration * zoom + 200, 800);
  const canvasHeight = RULER_HEIGHT + tracks.length * TRACK_HEIGHT + 20;

  // Renderizar timeline
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Ruler
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvasWidth, RULER_HEIGHT);

    // Time markers
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';

    const secondsPerMarker = zoom > 100 ? 0.5 : zoom > 50 ? 1 : zoom > 25 ? 2 : 5;
    for (let t = 0; t <= duration; t += secondsPerMarker) {
      const x = t * zoom;
      
      // Major tick
      if (t % (secondsPerMarker * 2) === 0) {
        ctx.strokeStyle = '#475569';
        ctx.beginPath();
        ctx.moveTo(x, RULER_HEIGHT - 15);
        ctx.lineTo(x, RULER_HEIGHT);
        ctx.stroke();
        
        ctx.fillText(formatTime(t), x, RULER_HEIGHT - 18);
      } else {
        // Minor tick
        ctx.strokeStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(x, RULER_HEIGHT - 8);
        ctx.lineTo(x, RULER_HEIGHT);
        ctx.stroke();
      }
    }

    // Tracks
    tracks.forEach((track, i) => {
      const y = RULER_HEIGHT + i * TRACK_HEIGHT;
      
      // Track background
      ctx.fillStyle = i % 2 === 0 ? '#1e293b' : '#1a2332';
      ctx.fillRect(0, y, canvasWidth, TRACK_HEIGHT);
      
      // Track separator
      ctx.strokeStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(0, y + TRACK_HEIGHT);
      ctx.lineTo(canvasWidth, y + TRACK_HEIGHT);
      ctx.stroke();
    });

    // Clips
    clips.forEach(clip => {
      const track = tracks[clip.trackIndex];
      if (!track) return;

      const x = clip.startTime * zoom;
      const y = RULER_HEIGHT + clip.trackIndex * TRACK_HEIGHT + 4;
      const width = clip.duration * zoom;
      const height = TRACK_HEIGHT - 8;

      // Clip background
      const isSelected = clip.id === selectedClipId;
      ctx.fillStyle = clip.type === 'video' ? '#3b82f6' : clip.type === 'audio' ? '#22c55e' : '#f59e0b';
      ctx.fillRect(x, y, width, height);

      // Selection border
      if (isSelected) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        ctx.lineWidth = 1;
      }

      // Clip name
      ctx.fillStyle = '#ffffff';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      const textX = x + 5;
      const maxTextWidth = width - 10;
      if (maxTextWidth > 20) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, width, height);
        ctx.clip();
        ctx.fillText(clip.name, textX, y + 15);
        ctx.restore();
      }

      // Trim handles (se selecionado)
      if (isSelected) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, 6, height);
        ctx.fillRect(x + width - 6, y, 6, height);
      }

      // Waveform placeholder para áudio
      if (clip.type === 'audio') {
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        for (let wx = x + 10; wx < x + width - 10; wx += 4) {
          const waveY = y + height / 2 + Math.sin(wx * 0.1) * (height / 4);
          if (wx === x + 10) {
            ctx.moveTo(wx, waveY);
          } else {
            ctx.lineTo(wx, waveY);
          }
        }
        ctx.stroke();
      }
    });

    // Playhead
    const playheadX = currentTime * zoom;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, canvasHeight);
    ctx.stroke();

    // Playhead head
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(playheadX - 8, 0);
    ctx.lineTo(playheadX + 8, 0);
    ctx.lineTo(playheadX, 12);
    ctx.closePath();
    ctx.fill();

  }, [tracks, clips, duration, currentTime, zoom, canvasWidth, canvasHeight, selectedClipId]);

  // Handle mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollX;
    const y = e.clientY - rect.top;

    // Check if clicking on playhead area (ruler)
    if (y < RULER_HEIGHT) {
      setIsDragging(true);
      setDragType('playhead');
      const time = Math.max(0, Math.min(duration, x / zoom));
      onTimeChange(time);
      return;
    }

    // Check if clicking on a clip
    const clickedClip = clips.find(clip => {
      const clipX = clip.startTime * zoom;
      const clipY = RULER_HEIGHT + clip.trackIndex * TRACK_HEIGHT + 4;
      const clipWidth = clip.duration * zoom;
      const clipHeight = TRACK_HEIGHT - 8;

      return x >= clipX && x <= clipX + clipWidth && y >= clipY && y <= clipY + clipHeight;
    });

    if (clickedClip) {
      onClipSelect?.(clickedClip.id);
      
      const clipX = clickedClip.startTime * zoom;
      const clipWidth = clickedClip.duration * zoom;

      // Check trim handles
      if (x < clipX + 10) {
        setDragType('trim-left');
      } else if (x > clipX + clipWidth - 10) {
        setDragType('trim-right');
      } else {
        setDragType('clip');
      }

      setIsDragging(true);
      setDragClipId(clickedClip.id);
    } else {
      onClipSelect?.(null);
    }
  }, [clips, duration, zoom, scrollX, onTimeChange, onClipSelect]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollX;
    const y = e.clientY - rect.top;

    if (dragType === 'playhead') {
      const time = Math.max(0, Math.min(duration, x / zoom));
      onTimeChange(time);
    } else if (dragType === 'clip' && dragClipId && onClipMove) {
      const time = Math.max(0, x / zoom);
      const trackIndex = Math.max(0, Math.min(tracks.length - 1, 
        Math.floor((y - RULER_HEIGHT) / TRACK_HEIGHT)));
      onClipMove(dragClipId, time, trackIndex);
    }
  }, [isDragging, dragType, dragClipId, duration, zoom, scrollX, tracks.length, onTimeChange, onClipMove]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragType(null);
    setDragClipId(null);
  }, []);

  return (
    <div className="flex flex-col bg-slate-900 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-slate-800 border-b border-slate-700">
        <button className="px-3 py-1 bg-slate-700 rounded text-sm hover:bg-slate-600">
          ◀
        </button>
        <button className="px-3 py-1 bg-red-600 rounded text-sm hover:bg-red-500">
          ⏺
        </button>
        <button className="px-3 py-1 bg-slate-700 rounded text-sm hover:bg-slate-600">
          ▶
        </button>
        <span className="ml-4 text-sm text-slate-300 font-mono">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-400">Zoom:</span>
          <input
            type="range"
            min="10"
            max="200"
            value={zoom}
            className="w-24"
            readOnly
          />
        </div>
      </div>

      {/* Track headers + Timeline */}
      <div className="flex">
        {/* Track Headers */}
        <div className="w-32 flex-shrink-0 bg-slate-800">
          <div className="h-[25px] border-b border-slate-700" />
          {tracks.map((track, i) => (
            <div 
              key={track.id}
              className="h-[60px] flex items-center px-2 border-b border-slate-700"
            >
              <span className="text-sm text-slate-300 truncate">{track.name}</span>
            </div>
          ))}
        </div>

        {/* Timeline Canvas */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-x-auto"
        >
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const frames = Math.floor((seconds % 1) * 30);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
}

// ============================================================================
// VIDEO PREVIEW
// ============================================================================

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
      video.play();
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
    <div className="relative bg-black aspect-video rounded-lg overflow-hidden">
      {src ? (
        <video
          ref={videoRef}
          src={src}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
        />
      ) : (
        <div className="flex items-center justify-center h-full text-slate-500">
          Nenhum vídeo selecionado
        </div>
      )}
      
      {/* Overlay info */}
      <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-xs text-white font-mono">
        {formatTime(currentTime)}
      </div>
    </div>
  );
}

export default VideoTimeline;
