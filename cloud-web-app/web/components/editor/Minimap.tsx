/**
 * Minimap Component
 * Shows miniature view of the entire document
 */

import React, { useRef, useEffect, useState } from 'react';

interface MinimapProps {
  content: string;
  currentLine: number;
  visibleLines: number;
  totalLines: number;
  onScroll: (line: number) => void;
}

export const Minimap: React.FC<MinimapProps> = ({
  content,
  currentLine,
  visibleLines,
  totalLines,
  onScroll,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Render minimap
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const getVar = (name: string, fallback: string) => {
      if (typeof window === 'undefined') return fallback;
      const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return value || fallback;
    };

    const toRgba = (color: string, alpha: number) => {
      const trimmed = color.trim();
      if (trimmed.startsWith('#')) {
        const hex = trimmed.replace('#', '');
        const normalized = hex.length === 3
          ? hex.split('').map((c) => c + c).join('')
          : hex;
        const r = parseInt(normalized.slice(0, 2), 16);
        const g = parseInt(normalized.slice(2, 4), 16);
        const b = parseInt(normalized.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
      if (trimmed.startsWith('rgb')) {
        return trimmed.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
      }
      return `rgba(255, 255, 255, ${alpha})`;
    };

    const width = canvas.width;
    const height = canvas.height;
    const lineHeight = height / totalLines;

    // Clear canvas
    const surface = getVar('--aethel-surface-tertiary', '#1e1e1e');
    const textPrimary = getVar('--aethel-text-primary', '#ffffff');
    const textSecondary = getVar('--aethel-text-secondary', '#d4d4d4');

    ctx.fillStyle = surface;
    ctx.fillRect(0, 0, width, height);

    // Draw content
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      const y = index * lineHeight;
      
      // Draw line background based on content
      if (line.trim()) {
        const intensity = Math.min(line.length / 80, 1);
        ctx.fillStyle = toRgba(textSecondary, intensity * 0.3);
        ctx.fillRect(0, y, width, Math.max(lineHeight, 1));
      }
    });

    // Draw viewport indicator
    const viewportY = currentLine * lineHeight;
    const viewportHeight = visibleLines * lineHeight;
    ctx.strokeStyle = toRgba(textPrimary, 0.3);
    ctx.lineWidth = 1;
    ctx.strokeRect(0, viewportY, width, viewportHeight);
    ctx.fillStyle = toRgba(textPrimary, 0.1);
    ctx.fillRect(0, viewportY, width, viewportHeight);
  }, [content, currentLine, visibleLines, totalLines]);

  // Handle click/drag
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    handleMouseMove(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging && e.buttons !== 1) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const lineHeight = canvas.height / totalLines;
    const clickedLine = Math.floor(y / lineHeight);

    onScroll(Math.max(0, Math.min(clickedLine, totalLines - visibleLines)));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mouseup', handleMouseUp);
      return () => window.removeEventListener('mouseup', handleMouseUp);
    }
  }, [isDragging]);

  return (
    <div className="minimap">
      <canvas
        ref={canvasRef}
        width={100}
        height={600}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
      />

      <style jsx>{`
        .minimap {
          width: 100px;
          height: 100%;
          background: var(--aethel-surface-tertiary);
          border-left: 1px solid var(--aethel-border-primary);
          cursor: pointer;
          user-select: none;
        }

        canvas {
          width: 100%;
          height: 100%;
          display: block;
        }
      `}</style>
    </div>
  );
};
