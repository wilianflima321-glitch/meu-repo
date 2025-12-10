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
        }

        .split-divider.horizontal {
          width: 4px;
          cursor: col-resize;
        }

        .split-divider.vertical {
          height: 4px;
          cursor: row-resize;
        }

        .split-divider:hover {
          background: var(--vscode-focusBorder);
        }

        .split-divider:active {
          background: var(--vscode-focusBorder);
        }
      `}</style>
    </div>
  );
};
