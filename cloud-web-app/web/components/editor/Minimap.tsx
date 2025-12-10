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

    const width = canvas.width;
    const height = canvas.height;
    const lineHeight = height / totalLines;

    // Clear canvas
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, width, height);

    // Draw content
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      const y = index * lineHeight;
      
      // Draw line background based on content
      if (line.trim()) {
        const intensity = Math.min(line.length / 80, 1);
        ctx.fillStyle = `rgba(212, 212, 212, ${intensity * 0.3})`;
        ctx.fillRect(0, y, width, Math.max(lineHeight, 1));
      }
    });

    // Draw viewport indicator
    const viewportY = currentLine * lineHeight;
    const viewportHeight = visibleLines * lineHeight;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, viewportY, width, viewportHeight);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
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
          background: var(--editor-bg);
          border-left: 1px solid var(--sidebar-border);
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
