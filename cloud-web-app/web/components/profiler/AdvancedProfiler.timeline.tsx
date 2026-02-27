'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  TARGET_FRAME_TIME,
  WARNING_FRAME_TIME,
  type ProfilerFrame,
} from './AdvancedProfiler.types';

interface FrameTimelineProps {
  frames: ProfilerFrame[];
  selectedFrame: number | null;
  onSelectFrame: (frameId: number) => void;
  viewRange: { start: number; end: number };
  onViewRangeChange: (range: { start: number; end: number }) => void;
}

export function FrameTimeline({
  frames,
  selectedFrame,
  onSelectFrame,
  viewRange,
  onViewRangeChange,
}: FrameTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);

  const visibleFrames = useMemo(() => {
    return frames.slice(viewRange.start, viewRange.end);
  }, [frames, viewRange]);

  const maxFrameTime = useMemo(() => {
    return Math.max(...visibleFrames.map((f) => f.duration), TARGET_FRAME_TIME * 2);
  }, [visibleFrames]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart(e.clientX);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const delta = (e.clientX - dragStart) / containerRef.current.clientWidth;
      const frameCount = frames.length;
      const viewSize = viewRange.end - viewRange.start;
      const shift = Math.round(delta * viewSize);

      if (shift !== 0) {
        const newStart = Math.max(0, Math.min(frameCount - viewSize, viewRange.start - shift));
        const newEnd = newStart + viewSize;
        onViewRangeChange({ start: newStart, end: newEnd });
        setDragStart(e.clientX);
      }
    },
    [isDragging, dragStart, frames.length, viewRange, onViewRangeChange],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.2 : 0.8;
    const viewSize = viewRange.end - viewRange.start;
    const newSize = Math.max(20, Math.min(frames.length, Math.round(viewSize * zoomFactor)));
    const center = (viewRange.start + viewRange.end) / 2;
    const newStart = Math.max(0, Math.round(center - newSize / 2));
    const newEnd = Math.min(frames.length, newStart + newSize);
    onViewRangeChange({ start: newStart, end: newEnd });
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <h3 style={{ color: 'white', fontSize: '14px', marginBottom: '8px' }}>Frame Timeline</h3>

      <div
        ref={containerRef}
        style={{
          height: '120px',
          background: '#0f172a',
          borderRadius: '8px',
          position: 'relative',
          overflow: 'hidden',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: `${(TARGET_FRAME_TIME / maxFrameTime) * 100}%`,
            height: '1px',
            background: '#22c55e',
            opacity: 0.5,
            zIndex: 1,
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: `${(WARNING_FRAME_TIME / maxFrameTime) * 100}%`,
            height: '1px',
            background: '#f59e0b',
            opacity: 0.5,
            zIndex: 1,
          }}
        />

        <div style={{ display: 'flex', height: '100%', alignItems: 'flex-end', padding: '4px' }}>
          {visibleFrames.map((frame) => {
            const height = (frame.duration / maxFrameTime) * 100;
            const isSelected = frame.frameId === selectedFrame;
            const isSlow = frame.duration > WARNING_FRAME_TIME;
            const isWarning = frame.duration > TARGET_FRAME_TIME && !isSlow;

            return (
              <div
                key={frame.frameId}
                onClick={() => onSelectFrame(frame.frameId)}
                style={{
                  flex: 1,
                  maxWidth: '10px',
                  height: `${Math.min(100, height)}%`,
                  background: isSlow ? '#ef4444' : isWarning ? '#f59e0b' : '#3b82f6',
                  borderRadius: '2px 2px 0 0',
                  cursor: 'pointer',
                  opacity: isSelected ? 1 : 0.7,
                  border: isSelected ? '2px solid white' : 'none',
                  marginRight: '1px',
                  transition: 'opacity 0.1s',
                }}
                title={`Frame ${frame.frameId}: ${frame.duration.toFixed(2)}ms`}
              />
            );
          })}
        </div>

        <div
          style={{
            position: 'absolute',
            right: '8px',
            top: '8px',
            fontSize: '10px',
            color: '#64748b',
          }}
        >
          {(1000 / maxFrameTime).toFixed(0)} FPS
        </div>
      </div>

      <div
        style={{
          height: '8px',
          background: '#1e293b',
          borderRadius: '4px',
          marginTop: '4px',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: `${(viewRange.start / frames.length) * 100}%`,
            width: `${((viewRange.end - viewRange.start) / frames.length) * 100}%`,
            height: '100%',
            background: '#3b82f6',
            borderRadius: '4px',
          }}
        />
      </div>
    </div>
  );
}
