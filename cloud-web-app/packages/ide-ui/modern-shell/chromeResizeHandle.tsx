'use client';

import React from 'react';
import { tokens } from '../../../web/lib/design-tokens';
import { GripVertical } from 'lucide-react';
import { BORDER_PRIMARY, TEXT_TERTIARY } from './chromeStyles';

export interface ResizeHandleProps {
  ariaLabel: string;
  orientation: 'vertical' | 'horizontal';
  onMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void;
  onAdjust: (delta: number) => void;
  valueNow: number;
  valueMin: number;
  valueMax: number;
}

export function ResizeHandle({
  ariaLabel,
  orientation,
  onMouseDown,
  onAdjust,
  valueNow,
  valueMin,
  valueMax,
}: ResizeHandleProps) {
  const isVertical = orientation === 'vertical';

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 5 : 2;

    if (isVertical) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onAdjust(-step);
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        onAdjust(step);
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      onAdjust(-step);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      onAdjust(step);
    }
  };

  return (
    <div
      role="separator"
      aria-label={ariaLabel}
      aria-orientation={orientation}
      aria-valuenow={Math.round(valueNow)}
      aria-valuemin={valueMin}
      aria-valuemax={valueMax}
      tabIndex={0}
      style={{
        width: isVertical ? '10px' : '100%',
        height: isVertical ? '100%' : '10px',
        cursor: isVertical ? 'col-resize' : 'row-resize',
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        position: 'relative',
        outline: 'none',
        transition: `background ${tokens.animation.duration.fast} ${tokens.animation.easing.default}`,
      }}
      onMouseDown={onMouseDown}
      onKeyDown={handleKeyDown}
      onFocus={(event) => {
        event.currentTarget.style.background = BORDER_PRIMARY;
      }}
      onBlur={(event) => {
        event.currentTarget.style.background = 'transparent';
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.background = BORDER_PRIMARY;
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = 'transparent';
      }}
      title={`${ariaLabel} — use ${isVertical ? 'left/right' : 'up/down'} arrow keys to adjust`}
    >
      <div
        style={{
          width: isVertical ? '2px' : '28px',
          height: isVertical ? '28px' : '2px',
          borderRadius: tokens.radius.full,
          background: BORDER_PRIMARY,
          opacity: 0.9,
        }}
      />
      <GripVertical
        size={12}
        color={TEXT_TERTIARY}
        style={{
          position: 'absolute',
          transform: isVertical ? undefined : 'rotate(90deg)',
        }}
      />
    </div>
  );
}
