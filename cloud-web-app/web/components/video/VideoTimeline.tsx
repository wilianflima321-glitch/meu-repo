/**
 * Video Timeline - Timeline PROFISSIONAL de edição de vídeo
 * 
 * Features: Snapping, Markers, Razor Tool, Ripple Edit, Multi-select
 * Usa Canvas para renderizar tracks e clips.
 * Integra com HTMLVideoElement para preview.
 * 
 * Nível: Adobe Premiere Pro / DaVinci Resolve
 */

'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';

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
  peaks?: number[];       // Peaks (0..1) para waveform real em clips de áudio
  color?: string;         // Cor customizada do clip
  locked?: boolean;       // Clip travado
  disabled?: boolean;     // Clip desabilitado (não renderiza)
}

export interface TimelineMarker {
  id: string;
  time: number;
  name: string;
  color: string;
  type: 'marker' | 'chapter' | 'comment';
}

export interface TimelineTrack {
  id: string;
  name: string;
  type: 'video' | 'audio';
  muted: boolean;
  locked: boolean;
  height: number;
  solo?: boolean;
  color?: string;
}

export type TimelineTool = 'select' | 'razor' | 'slip' | 'slide' | 'ripple' | 'roll';

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
  onClipSplit?: (clipId: string, splitTime: number) => void;
  onClipDelete?: (clipId: string) => void;
  onRippleDelete?: (clipId: string) => void;
  selectedClipId?: string | null;
  selectedClipIds?: string[];
  markers?: TimelineMarker[];
  onMarkerAdd?: (marker: TimelineMarker) => void;
  onMarkerRemove?: (markerId: string) => void;
  snapEnabled?: boolean;
  snapThreshold?: number;
  tool?: TimelineTool;
  onToolChange?: (tool: TimelineTool) => void;
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
  onClipSplit,
  onClipDelete,
  onRippleDelete,
  selectedClipId,
  selectedClipIds = [],
  markers = [],
  onMarkerAdd,
  onMarkerRemove,
  snapEnabled = true,
  snapThreshold = 10,
  tool = 'select',
  onToolChange,
}: TimelineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<'playhead' | 'clip' | 'trim-left' | 'trim-right' | 'multi-select' | null>(null);
  const [dragClipId, setDragClipId] = useState<string | null>(null);
  const [scrollX, setScrollX] = useState(0);
  const [multiSelectStart, setMultiSelectStart] = useState<{ x: number; y: number } | null>(null);
  const [multiSelectEnd, setMultiSelectEnd] = useState<{ x: number; y: number } | null>(null);
  const [hoveredClipId, setHoveredClipId] = useState<string | null>(null);
  const [cursorStyle, setCursorStyle] = useState<string>('default');

  const TRACK_HEIGHT = 60;
  const HEADER_HEIGHT = 30;
  const RULER_HEIGHT = 25;

  const canvasWidth = Math.max(duration * zoom + 200, 800);
  const canvasHeight = RULER_HEIGHT + tracks.length * TRACK_HEIGHT + 20;

  // Compute snap points from clips and markers
  const snapPoints = useMemo(() => {
    if (!snapEnabled) return [];
    const points: number[] = [0, duration];
    
    // Clip edges
    for (const clip of clips) {
      points.push(clip.startTime);
      points.push(clip.startTime + clip.duration);
    }
    
    // Markers
    for (const marker of markers) {
      points.push(marker.time);
    }
    
    // Playhead
    points.push(currentTime);
    
    return [...new Set(points)].sort((a, b) => a - b);
  }, [clips, markers, currentTime, duration, snapEnabled]);

  // Snap helper
  const snapToPoint = useCallback((time: number): number => {
    if (!snapEnabled || snapPoints.length === 0) return time;
    
    const pixelThreshold = snapThreshold / zoom;
    let closest = time;
    let minDist = Infinity;
    
    for (const point of snapPoints) {
      const dist = Math.abs(point - time);
      if (dist < minDist && dist < pixelThreshold) {
        minDist = dist;
        closest = point;
      }
    }
    
    return closest;
  }, [snapEnabled, snapPoints, snapThreshold, zoom]);

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

      // Skip disabled clips (render with opacity)
      if (clip.disabled) {
        ctx.globalAlpha = 0.3;
      }

      // Clip background with custom color support
      const isSelected = clip.id === selectedClipId || selectedClipIds.includes(clip.id);
      const isHovered = clip.id === hoveredClipId;
      const baseColor = clip.color || (clip.type === 'video' ? '#3b82f6' : clip.type === 'audio' ? '#22c55e' : '#f59e0b');
      ctx.fillStyle = baseColor;
      
      // Rounded corners
      const radius = 4;
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, radius);
      ctx.fill();

      // Hover highlight
      if (isHovered && !isSelected) {
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Selection border
      if (isSelected) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.lineWidth = 1;
      }

      // Locked indicator
      if (clip.locked) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, radius);
        ctx.fill();
        
        // Lock icon
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🔒', x + width / 2, y + height / 2 + 5);
      }

      // Clip name with better styling
      ctx.fillStyle = '#ffffff';
      ctx.font = '11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      const textX = x + 8;
      const maxTextWidth = width - 16;
      if (maxTextWidth > 30 && !clip.locked) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, width, height);
        ctx.clip();
        
        // Text shadow for readability
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 2;
        ctx.fillText(clip.name, textX, y + 15);
        ctx.shadowBlur = 0;
        
        // Duration indicator
        ctx.font = '9px monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText(formatTimecode(clip.duration), textX, y + height - 6);
        ctx.restore();
      }

      // Trim handles (se selecionado ou hovered)
      if (isSelected || isHovered) {
        // Left handle
        const handleGradient = ctx.createLinearGradient(x, y, x + 8, y);
        handleGradient.addColorStop(0, 'rgba(255,255,255,0.9)');
        handleGradient.addColorStop(1, 'rgba(255,255,255,0.3)');
        ctx.fillStyle = handleGradient;
        ctx.fillRect(x, y, 8, height);
        
        // Right handle
        const handleGradientR = ctx.createLinearGradient(x + width - 8, y, x + width, y);
        handleGradientR.addColorStop(0, 'rgba(255,255,255,0.3)');
        handleGradientR.addColorStop(1, 'rgba(255,255,255,0.9)');
        ctx.fillStyle = handleGradientR;
        ctx.fillRect(x + width - 8, y, 8, height);
      }

      ctx.globalAlpha = 1;

      // Waveform REAL para áudio (quando houver peaks)
      if (clip.type === 'audio' && !clip.locked) {
        const centerY = y + height / 2;
        const maxAmp = height * 0.38;
        const left = x + 10;
        const right = x + width - 10;

        if (clip.peaks && clip.peaks.length > 0 && right - left > 4) {
          // Gradient fill for waveform
          const waveGradient = ctx.createLinearGradient(0, centerY - maxAmp, 0, centerY + maxAmp);
          waveGradient.addColorStop(0, 'rgba(255,255,255,0.45)');
          waveGradient.addColorStop(0.5, 'rgba(255,255,255,0.25)');
          waveGradient.addColorStop(1, 'rgba(255,255,255,0.45)');
          ctx.fillStyle = waveGradient;
          
          ctx.beginPath();
          ctx.moveTo(left, centerY);
          
          // Top half
          for (let px = left; px < right; px += 1) {
            const normX = (px - left) / Math.max(1, right - left);
            const idx = Math.min(clip.peaks.length - 1, Math.floor(normX * clip.peaks.length));
            const peak = Math.max(0, Math.min(1, clip.peaks[idx] ?? 0));
            ctx.lineTo(px, centerY - peak * maxAmp);
          }
          
          // Bottom half (mirror)
          for (let px = right - 1; px >= left; px -= 1) {
            const normX = (px - left) / Math.max(1, right - left);
            const idx = Math.min(clip.peaks.length - 1, Math.floor(normX * clip.peaks.length));
            const peak = Math.max(0, Math.min(1, clip.peaks[idx] ?? 0));
            ctx.lineTo(px, centerY + peak * maxAmp);
          }
          
          ctx.closePath();
          ctx.fill();
        }
      }

      // Video thumbnail indicator (primeira frame)
      if (clip.type === 'video' && width > 60 && !clip.locked) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(x + 4, y + 4, 32, 18);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🎬', x + 20, y + 17);
      }
    });

    // Markers
    for (const marker of markers) {
      const mx = marker.time * zoom;
      
      // Marker line
      ctx.strokeStyle = marker.color || '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 2]);
      ctx.beginPath();
      ctx.moveTo(mx, RULER_HEIGHT);
      ctx.lineTo(mx, canvasHeight);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Marker flag
      ctx.fillStyle = marker.color || '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(mx - 6, 0);
      ctx.lineTo(mx + 6, 0);
      ctx.lineTo(mx + 6, 16);
      ctx.lineTo(mx, 12);
      ctx.lineTo(mx - 6, 16);
      ctx.closePath();
      ctx.fill();
      
      // Marker type icon
      ctx.fillStyle = '#000000';
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'center';
      const icon = marker.type === 'chapter' ? 'C' : marker.type === 'comment' ? '💬' : 'M';
      ctx.fillText(icon, mx, 10);
    }

    // Multi-select rectangle
    if (multiSelectStart && multiSelectEnd) {
      const sx = Math.min(multiSelectStart.x, multiSelectEnd.x);
      const sy = Math.min(multiSelectStart.y, multiSelectEnd.y);
      const sw = Math.abs(multiSelectEnd.x - multiSelectStart.x);
      const sh = Math.abs(multiSelectEnd.y - multiSelectStart.y);
      
      ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
      ctx.fillRect(sx, sy, sw, sh);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, sy, sw, sh);
    }

    // Snap lines (vertical guides when dragging)
    if (isDragging && dragClipId) {
      const draggedClip = clips.find(c => c.id === dragClipId);
      if (draggedClip) {
        for (const snapPoint of snapPoints) {
          const snapX = snapPoint * zoom;
          const clipStart = draggedClip.startTime * zoom;
          const clipEnd = (draggedClip.startTime + draggedClip.duration) * zoom;
          
          if (Math.abs(snapX - clipStart) < snapThreshold || Math.abs(snapX - clipEnd) < snapThreshold) {
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.moveTo(snapX, 0);
            ctx.lineTo(snapX, canvasHeight);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }
    }

    // Playhead
    const playheadX = currentTime * zoom;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, canvasHeight);
    ctx.stroke();

    // Playhead head (triangle)
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(playheadX - 8, 0);
    ctx.lineTo(playheadX + 8, 0);
    ctx.lineTo(playheadX, 12);
    ctx.closePath();
    ctx.fill();

    // Tool indicator
    if (tool !== 'select') {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(canvasWidth - 80, canvasHeight - 24, 75, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      const toolNames: Record<TimelineTool, string> = {
        select: 'Select',
        razor: 'Razor (C)',
        slip: 'Slip (Y)',
        slide: 'Slide (U)',
        ripple: 'Ripple (B)',
        roll: 'Roll (N)',
      };
      ctx.fillText(toolNames[tool], canvasWidth - 10, canvasHeight - 10);
    }

  }, [tracks, clips, duration, currentTime, zoom, canvasWidth, canvasHeight, selectedClipId, selectedClipIds, hoveredClipId, markers, multiSelectStart, multiSelectEnd, isDragging, dragClipId, snapPoints, snapThreshold, tool]);

  // Handle mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollX;
    const y = e.clientY - rect.top;

    // Check if clicking on playhead area (ruler)
    if (y < RULER_HEIGHT) {
      // Double-click adds marker
      if (e.detail === 2 && onMarkerAdd) {
        const time = snapToPoint(Math.max(0, Math.min(duration, x / zoom)));
        onMarkerAdd({
          id: `marker-${Date.now()}`,
          time,
          name: `Marker ${markers.length + 1}`,
          color: '#f59e0b',
          type: 'marker',
        });
        return;
      }
      
      setIsDragging(true);
      setDragType('playhead');
      const time = snapToPoint(Math.max(0, Math.min(duration, x / zoom)));
      onTimeChange(time);
      return;
    }

    // Check if clicking on a clip
    const clickedClip = clips.find(clip => {
      if (clip.locked) return false;
      const clipX = clip.startTime * zoom;
      const clipY = RULER_HEIGHT + clip.trackIndex * TRACK_HEIGHT + 4;
      const clipWidth = clip.duration * zoom;
      const clipHeight = TRACK_HEIGHT - 8;

      return x >= clipX && x <= clipX + clipWidth && y >= clipY && y <= clipY + clipHeight;
    });

    // Razor tool - split clip at click position
    if (tool === 'razor' && clickedClip && onClipSplit) {
      const splitTime = Math.max(0, x / zoom);
      if (splitTime > clickedClip.startTime && splitTime < clickedClip.startTime + clickedClip.duration) {
        onClipSplit(clickedClip.id, splitTime);
      }
      return;
    }

    if (clickedClip) {
      // Multi-select with Shift
      if (e.shiftKey) {
        // Toggle selection
        if (selectedClipIds.includes(clickedClip.id)) {
          // Would need onMultiSelect callback
        }
      }
      
      onClipSelect?.(clickedClip.id);
      
      const clipX = clickedClip.startTime * zoom;
      const clipWidth = clickedClip.duration * zoom;

      // Check trim handles (wider hitbox)
      if (x < clipX + 12) {
        setDragType('trim-left');
        setCursorStyle('ew-resize');
      } else if (x > clipX + clipWidth - 12) {
        setDragType('trim-right');
        setCursorStyle('ew-resize');
      } else {
        setDragType('clip');
        setCursorStyle('grabbing');
      }

      setIsDragging(true);
      setDragClipId(clickedClip.id);
    } else {
      onClipSelect?.(null);
      
      // Start multi-select rectangle
      if (y > RULER_HEIGHT) {
        setMultiSelectStart({ x, y });
        setMultiSelectEnd({ x, y });
        setDragType('multi-select');
        setIsDragging(true);
      }
    }
  }, [clips, duration, zoom, scrollX, onTimeChange, onClipSelect, onClipSplit, onMarkerAdd, tool, selectedClipIds, markers.length, snapToPoint]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollX;
    const y = e.clientY - rect.top;

    // Update hovered clip
    if (!isDragging) {
      const hovered = clips.find(clip => {
        const clipX = clip.startTime * zoom;
        const clipY = RULER_HEIGHT + clip.trackIndex * TRACK_HEIGHT + 4;
        const clipWidth = clip.duration * zoom;
        const clipHeight = TRACK_HEIGHT - 8;
        return x >= clipX && x <= clipX + clipWidth && y >= clipY && y <= clipY + clipHeight;
      });
      setHoveredClipId(hovered?.id ?? null);
      
      // Update cursor based on position
      if (hovered && !hovered.locked) {
        const clipX = hovered.startTime * zoom;
        const clipWidth = hovered.duration * zoom;
        if (x < clipX + 12 || x > clipX + clipWidth - 12) {
          setCursorStyle('ew-resize');
        } else {
          setCursorStyle(tool === 'razor' ? 'crosshair' : 'grab');
        }
      } else {
        setCursorStyle(tool === 'razor' ? 'crosshair' : 'default');
      }
    }

    if (!isDragging) return;

    if (dragType === 'playhead') {
      const time = snapToPoint(Math.max(0, Math.min(duration, x / zoom)));
      onTimeChange(time);
    } else if (dragType === 'multi-select') {
      setMultiSelectEnd({ x, y });
    } else if (dragType === 'clip' && dragClipId && onClipMove) {
      let time = Math.max(0, x / zoom);
      time = snapToPoint(time);
      const trackIndex = Math.max(0, Math.min(tracks.length - 1, 
        Math.floor((y - RULER_HEIGHT) / TRACK_HEIGHT)));
      onClipMove(dragClipId, time, trackIndex);
    } else if ((dragType === 'trim-left' || dragType === 'trim-right') && dragClipId && onClipTrim) {
      const clip = clips.find(c => c.id === dragClipId);
      if (!clip) return;

      const minClipDuration = 0.1;
      let mouseTime = Math.max(0, x / zoom);
      mouseTime = snapToPoint(mouseTime);

      if (dragType === 'trim-left') {
        // Trim esquerdo: move o início na timeline e ajusta inPoint no source
        const maxStart = clip.startTime + Math.max(minClipDuration, clip.duration) - minClipDuration;
        const newStartTime = Math.min(Math.max(0, mouseTime), maxStart);
        const delta = newStartTime - clip.startTime;

        const newInPoint = Math.max(0, clip.inPoint + delta);
        const newOutPoint = Math.max(newInPoint + minClipDuration, clip.outPoint);

        // Atualiza startTime via onClipMove para manter o modelo consistente
        onClipMove?.(dragClipId, newStartTime, clip.trackIndex);
        onClipTrim(dragClipId, newInPoint, newOutPoint);
      } else {
        // Trim direito: mantém startTime e ajusta outPoint/duração
        const minEnd = clip.startTime + minClipDuration;
        const newEndTime = Math.max(mouseTime, minEnd);
        const newDuration = Math.max(minClipDuration, newEndTime - clip.startTime);
        const newOutPoint = Math.max(clip.inPoint + minClipDuration, clip.inPoint + newDuration);
        onClipTrim(dragClipId, clip.inPoint, newOutPoint);
      }
    }
  }, [isDragging, dragType, dragClipId, duration, zoom, scrollX, tracks.length, clips, onTimeChange, onClipMove, onClipTrim, tool, snapToPoint]);

  const handleMouseUp = useCallback(() => {
    // Handle multi-select completion
    if (dragType === 'multi-select' && multiSelectStart && multiSelectEnd) {
      // Find clips within selection rectangle
      // This would need additional callback to set selectedClipIds
    }
    
    setIsDragging(false);
    setDragType(null);
    setDragClipId(null);
    setMultiSelectStart(null);
    setMultiSelectEnd(null);
    setCursorStyle('default');
  }, [dragType, multiSelectStart, multiSelectEnd]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Tool shortcuts
      if (onToolChange) {
        if (e.key === 'v' || e.key === 'V') onToolChange('select');
        if (e.key === 'c' || e.key === 'C') onToolChange('razor');
        if (e.key === 'y' || e.key === 'Y') onToolChange('slip');
        if (e.key === 'u' || e.key === 'U') onToolChange('slide');
        if (e.key === 'b' || e.key === 'B') onToolChange('ripple');
        if (e.key === 'n' || e.key === 'N') onToolChange('roll');
      }
      
      // Delete selected clip
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedClipId) {
        if (e.shiftKey && onRippleDelete) {
          onRippleDelete(selectedClipId);
        } else if (onClipDelete) {
          onClipDelete(selectedClipId);
        }
      }
      
      // Navigation
      if (e.key === 'Home') onTimeChange(0);
      if (e.key === 'End') onTimeChange(duration);
      
      // Frame stepping
      if (e.key === 'ArrowLeft' && !e.shiftKey) {
        onTimeChange(Math.max(0, currentTime - 1/30));
      }
      if (e.key === 'ArrowRight' && !e.shiftKey) {
        onTimeChange(Math.min(duration, currentTime + 1/30));
      }
      
      // Jump to next/prev clip
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const sortedEdges = [...new Set(clips.flatMap(c => [c.startTime, c.startTime + c.duration]))]
          .sort((a, b) => a - b);
        
        if (e.key === 'ArrowUp') {
          // Previous edge
          const prev = sortedEdges.filter(t => t < currentTime - 0.001).pop();
          if (prev !== undefined) onTimeChange(prev);
        } else {
          // Next edge
          const next = sortedEdges.find(t => t > currentTime + 0.001);
          if (next !== undefined) onTimeChange(next);
        }
      }
      
      // Add marker at playhead
      if (e.key === 'm' || e.key === 'M') {
        if (onMarkerAdd) {
          onMarkerAdd({
            id: `marker-${Date.now()}`,
            time: currentTime,
            name: `Marker ${markers.length + 1}`,
            color: '#f59e0b',
            type: 'marker',
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToolChange, selectedClipId, onClipDelete, onRippleDelete, onTimeChange, duration, currentTime, clips, onMarkerAdd, markers.length]);

  return (
    <div className="flex flex-col bg-slate-900 rounded-lg overflow-hidden">
      {/* Professional Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-slate-800 border-b border-slate-700">
        {/* Transport controls */}
        <div className="flex items-center gap-1 pr-2 border-r border-slate-600">
          <button className="p-1.5 bg-slate-700 rounded text-sm hover:bg-slate-600" title="Go to Start (Home)">
            ⏮
          </button>
          <button className="p-1.5 bg-slate-700 rounded text-sm hover:bg-slate-600" title="Previous Frame (←)">
            ◀
          </button>
          <button className="p-1.5 bg-red-600 rounded text-sm hover:bg-red-500" title="Play/Pause (Space)">
            ▶
          </button>
          <button className="p-1.5 bg-slate-700 rounded text-sm hover:bg-slate-600" title="Next Frame (→)">
            ▶
          </button>
          <button className="p-1.5 bg-slate-700 rounded text-sm hover:bg-slate-600" title="Go to End (End)">
            ⏭
          </button>
        </div>
        
        {/* Tool buttons */}
        <div className="flex items-center gap-1 px-2 border-r border-slate-600">
          <button 
            className={`px-2 py-1 rounded text-xs font-medium ${tool === 'select' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}
            onClick={() => onToolChange?.('select')}
            title="Selection Tool (V)"
          >
            ↖
          </button>
          <button 
            className={`px-2 py-1 rounded text-xs font-medium ${tool === 'razor' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}
            onClick={() => onToolChange?.('razor')}
            title="Razor Tool (C)"
          >
            ✂
          </button>
          <button 
            className={`px-2 py-1 rounded text-xs font-medium ${tool === 'ripple' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}
            onClick={() => onToolChange?.('ripple')}
            title="Ripple Edit (B)"
          >
            ⟷
          </button>
          <button 
            className={`px-2 py-1 rounded text-xs font-medium ${tool === 'slip' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}
            onClick={() => onToolChange?.('slip')}
            title="Slip Tool (Y)"
          >
            ⇔
          </button>
        </div>
        
        {/* Snap toggle */}
        <div className="flex items-center gap-1 px-2 border-r border-slate-600">
          <button 
            className={`px-2 py-1 rounded text-xs font-medium ${snapEnabled ? 'bg-green-600' : 'bg-slate-700 hover:bg-slate-600'}`}
            title="Snapping (S)"
          >
            🧲
          </button>
        </div>
        
        {/* Timecode */}
        <span className="px-2 text-sm text-slate-300 font-mono bg-slate-900 rounded">
          {formatTimecode(currentTime)}
        </span>
        <span className="text-slate-500">/</span>
        <span className="text-sm text-slate-400 font-mono">
          {formatTimecode(duration)}
        </span>
        
        {/* Zoom */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-400">Zoom:</span>
          <input
            type="range"
            min="10"
            max="200"
            value={zoom}
            className="w-24 accent-blue-500"
            readOnly
          />
          <span className="text-xs text-slate-400 w-8">{zoom}%</span>
        </div>
      </div>

      {/* Track headers + Timeline */}
      <div className="flex">
        {/* Track Headers */}
        <div className="w-36 flex-shrink-0 bg-slate-800">
          <div className="h-[25px] border-b border-slate-700 flex items-center px-2">
            <span className="text-[10px] text-slate-500">TRACKS</span>
          </div>
          {tracks.map((track) => (
            <div 
              key={track.id}
              className="h-[60px] flex items-center gap-1 px-2 border-b border-slate-700 group"
            >
              <button 
                className={`w-5 h-5 rounded text-[10px] ${track.muted ? 'bg-red-600' : 'bg-slate-600 hover:bg-slate-500'}`}
                title="Mute"
              >
                M
              </button>
              <button 
                className={`w-5 h-5 rounded text-[10px] ${track.solo ? 'bg-yellow-600' : 'bg-slate-600 hover:bg-slate-500'}`}
                title="Solo"
              >
                S
              </button>
              <button 
                className={`w-5 h-5 rounded text-[10px] ${track.locked ? 'bg-orange-600' : 'bg-slate-600 hover:bg-slate-500'}`}
                title="Lock"
              >
                🔒
              </button>
              <span className="text-sm text-slate-300 truncate flex-1">{track.name}</span>
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
            style={{ cursor: cursorStyle }}
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

function formatTimecode(seconds: number, fps: number = 30): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const f = Math.floor((seconds % 1) * fps);
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${f.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${f.toString().padStart(2, '0')}`;
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
