'use client';

import React, { useMemo, useRef } from 'react';
import type { TimelineMarker } from './video-timeline-editor.types';

export interface TimelineRulerProps {
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
