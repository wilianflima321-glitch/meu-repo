import React, { useState, useEffect, useRef } from 'react';

interface SplitViewProps {
  direction: 'horizontal' | 'vertical';
  initialSizes?: number[];
  minSize?: number;
  children: React.ReactNode[];
}

export const SplitView: React.FC<SplitViewProps> = ({
  direction,
  initialSizes,
  minSize = 100,
  children
}) => {
  const [sizes, setSizes] = useState<number[]>(
    initialSizes || children.map(() => 100 / children.length)
  );
  const [isDragging, setIsDragging] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || dragIndex === null || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      
      let position: number;
      let totalSize: number;

      if (direction === 'horizontal') {
        position = e.clientX - rect.left;
        totalSize = rect.width;
      } else {
        position = e.clientY - rect.top;
        totalSize = rect.height;
      }

      const newSizes = [...sizes];
      const leftSize = (position / totalSize) * 100;
      const rightSize = 100 - leftSize;

      // Calculate cumulative sizes up to drag index
      const cumulativeBefore = newSizes.slice(0, dragIndex).reduce((a, b) => a + b, 0);
      const cumulativeAfter = newSizes.slice(dragIndex + 2).reduce((a, b) => a + b, 0);

      // Ensure minimum sizes
      const minPercent = (minSize / totalSize) * 100;
      
      if (leftSize - cumulativeBefore >= minPercent && rightSize - cumulativeAfter >= minPercent) {
        newSizes[dragIndex] = leftSize - cumulativeBefore;
        newSizes[dragIndex + 1] = rightSize - cumulativeAfter;
        setSizes(newSizes);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragIndex(null);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragIndex, sizes, direction, minSize]);

  const handleMouseDown = (index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragIndex(index);
  };

  const handleKeyDown = (index: number) => (e: React.KeyboardEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const totalSize = direction === 'horizontal' ? rect.width : rect.height;
    if (!totalSize) return;

    const minPercent = (minSize / totalSize) * 100;
    const stepPercent = Math.max(1, (16 / totalSize) * 100);
    let delta = 0;

    if (direction === 'horizontal') {
      if (e.key === 'ArrowLeft') delta = -stepPercent;
      if (e.key === 'ArrowRight') delta = stepPercent;
    } else {
      if (e.key === 'ArrowUp') delta = -stepPercent;
      if (e.key === 'ArrowDown') delta = stepPercent;
    }

    if (!delta) return;
    e.preventDefault();

    setSizes((prev) => {
      const next = [...prev];
      const left = next[index] + delta;
      const right = next[index + 1] - delta;
      if (left < minPercent || right < minPercent) return prev;
      next[index] = left;
      next[index + 1] = right;
      return next;
    });
  };

  return (
    <div
      ref={containerRef}
      className={`split-view ${direction}`}
    >
      {children.map((child, index) => (
        <React.Fragment key={index}>
          <div
            className="split-pane"
            style={{
              [direction === 'horizontal' ? 'width' : 'height']: `${sizes[index]}%`
            }}
          >
            {child}
          </div>
          {index < children.length - 1 && (
            <div
              className={`split-divider ${direction}`}
              onMouseDown={handleMouseDown(index)}
              role="separator"
              tabIndex={0}
              aria-orientation={direction === 'horizontal' ? 'vertical' : 'horizontal'}
              aria-label="Resize panel"
              onKeyDown={handleKeyDown(index)}
            />
          )}
        </React.Fragment>
      ))}

      <style jsx>{`
        .split-view {
          display: flex;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        .split-view.horizontal {
          flex-direction: row;
        }

        .split-view.vertical {
          flex-direction: column;
        }

        .split-pane {
          overflow: hidden;
          position: relative;
        }

        .split-divider {
          flex-shrink: 0;
          background: var(--vscode-panel-border);
          cursor: col-resize;
          position: relative;
          z-index: 10;
          transition: background 0.15s ease-out;
        }

        .split-divider.horizontal {
          width: 4px;
          cursor: col-resize;
        }

        .split-divider.vertical {
          height: 4px;
          cursor: row-resize;
        }

        .split-divider::after {
          content: '';
          position: absolute;
          inset: -4px;
        }

        .split-divider.vertical::after {
          inset: -4px 0;
        }

        .split-divider.horizontal::after {
          inset: 0 -4px;
        }

        .split-divider:hover {
          background: var(--vscode-focusBorder);
        }

        .split-divider:active {
          background: var(--vscode-focusBorder);
        }

        .split-divider:focus-visible {
          outline: 2px solid var(--vscode-focusBorder);
          outline-offset: -2px;
        }
      `}</style>
    </div>
  );
};
