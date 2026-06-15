'use client';

/**
 * ScrubbableInput — Frente A48 (Padrão Blender/Unreal)
 *
 * A numeric input that supports:
 * - Click-drag scrubbing (Pointer Lock API for infinite drag)
 * - Math expression evaluation (e.g., "10 * 2.5")
 * - Keyboard input with Enter to commit
 * - Step buttons for fine-tuning
 * - Precision control (Shift for fine, Ctrl for coarse)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface ScrubbableInputProps {
  /** Current numeric value */
  value: number;
  /** Called when value changes */
  onChange: (value: number) => void;
  /** Called only on commit (mouseup, blur, enter) — for expensive updates */
  onCommit?: (value: number) => void;
  /** Label shown to the left of the value (e.g., "X", "Y", "Z") */
  label?: string;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Step size for each pixel of drag */
  step?: number;
  /** Number of decimal places */
  precision?: number;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
  /** Class applied to the label/scrub-handle (e.g., axis color) */
  labelClassName?: string;
  /** Unit suffix (e.g., "px", "°", "%") */
  suffix?: string;
  /** Accessible label for the value input */
  ariaLabel?: string;
}

/**
 * Evaluates simple math expressions safely.
 * Supports: +, -, *, /, parentheses, decimals.
 */
function evaluateMathExpression(expr: string): number | null {
  // Only allow safe characters
  const sanitized = expr.replace(/\s/g, '');
  if (!/^[\d+\-*/().]+$/.test(sanitized)) return null;

  try {
    // Using Function constructor for math evaluation (no eval)
    const result = new Function(`return (${sanitized})`)();
    if (typeof result === 'number' && Number.isFinite(result)) {
      return result;
    }
    return null;
  } catch {
    return null;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function ScrubbableInput({
  value,
  onChange,
  onCommit,
  label,
  min = -Infinity,
  max = Infinity,
  step = 0.1,
  precision = 2,
  disabled = false,
  className,
  labelClassName,
  suffix,
  ariaLabel,
}: ScrubbableInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isScrubbing, setIsScrubbing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrubStartValue = useRef(value);
  const labelRef = useRef<HTMLSpanElement>(null);

  // Format display value
  const displayValue = value.toFixed(precision);

  // Handle double-click to enter edit mode
  const handleDoubleClick = useCallback(() => {
    if (disabled) return;
    setIsEditing(true);
    setEditValue(displayValue);
    // Focus will happen via useEffect
  }, [disabled, displayValue]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Commit edit value
  const commitEdit = useCallback(() => {
    if (!isEditing) return;

    const result = evaluateMathExpression(editValue);
    if (result !== null) {
      const clamped = clamp(result, min, max);
      onChange(clamped);
      onCommit?.(clamped);
    }
    setIsEditing(false);
  }, [isEditing, editValue, min, max, onChange, onCommit]);

  // Handle keyboard in edit mode
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitEdit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsEditing(false);
      }
    },
    [commitEdit]
  );

  // ===== Pointer Lock Scrubbing =====
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || isEditing) return;
      if (e.button !== 0) return; // Left click only

      e.preventDefault();
      scrubStartValue.current = value;
      setIsScrubbing(true);

      // Request pointer lock for infinite scrubbing
      const target = e.currentTarget as HTMLElement;
      target.requestPointerLock?.();

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const movementX = moveEvent.movementX || 0;

        // Precision modifiers
        let currentStep = step;
        if (moveEvent.shiftKey) currentStep *= 0.1; // Fine control
        if (moveEvent.ctrlKey) currentStep *= 10; // Coarse control

        scrubStartValue.current += movementX * currentStep;
        const clamped = clamp(scrubStartValue.current, min, max);
        const rounded = Number(clamped.toFixed(precision));
        onChange(rounded);
      };

      const handlePointerUp = () => {
        document.exitPointerLock?.();
        setIsScrubbing(false);
        onCommit?.(clamp(scrubStartValue.current, min, max));
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerUp);
      };

      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);
    },
    [disabled, isEditing, value, step, min, max, precision, onChange, onCommit]
  );

  return (
    <div
      className={cn(
        'inline-flex items-center gap-0',
        'rounded-md border border-[var(--aethel-border-secondary)]',
        'bg-[var(--aethel-surface-secondary)]',
        'h-[24px] text-[11px] font-mono',
        'transition-colors duration-100',
        !disabled && 'hover:border-[var(--aethel-border-primary)]',
        isScrubbing && 'border-[var(--aethel-info)] ring-1 ring-[var(--aethel-info)]/30',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {/* Label (scrub handle) */}
      {label && (
        <span
          ref={labelRef}
          onPointerDown={handlePointerDown}
          className={cn(
            'select-none px-1.5 py-0.5 font-semibold',
            'text-[var(--aethel-text-tertiary)]',
            'border-r border-[var(--aethel-border-secondary)]',
            'bg-[var(--aethel-surface-primary)]',
            'rounded-l-md',
            !disabled && !isEditing && 'cursor-ew-resize hover:text-[var(--aethel-info-light)]',
            labelClassName,
          )}
        >
          {label}
        </span>
      )}

      {/* Value display / Input */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitEdit}
          aria-label={ariaLabel ?? label}
          className={cn(
            'w-full min-w-[48px] px-1.5 py-0.5 bg-transparent',
            'text-[var(--aethel-text-primary)]',
            'outline-none border-none',
            'text-right font-mono text-[11px]',
          )}
        />
      ) : (
        <span
          onDoubleClick={handleDoubleClick}
          onPointerDown={!label ? handlePointerDown : undefined}
          className={cn(
            'flex-1 min-w-[48px] px-1.5 py-0.5',
            'text-[var(--aethel-text-primary)]',
            'text-right select-none',
            !disabled && !label && 'cursor-ew-resize',
          )}
        >
          {displayValue}
          {suffix && (
            <span className="text-[var(--aethel-text-tertiary)] ml-0.5">{suffix}</span>
          )}
        </span>
      )}
    </div>
  );
}

/**
 * Vector3 input (X, Y, Z) — common in 3D engine inspectors
 */
export function Vector3Input({
  value,
  onChange,
  onCommit,
  labels = ['X', 'Y', 'Z'],
  step = 0.01,
  precision = 3,
  suffix,
  ariaLabelPrefix,
  className,
}: {
  value: [number, number, number];
  onChange: (value: [number, number, number]) => void;
  onCommit?: (value: [number, number, number]) => void;
  labels?: [string, string, string];
  step?: number;
  precision?: number;
  suffix?: string;
  ariaLabelPrefix?: string;
  className?: string;
}) {
  // Axis colors follow the Aethel gizmo spec (X red, Y green, Z blue).
  // Use static class strings so Tailwind's JIT can detect them at build time.
  const labelColors = [
    'text-[var(--aethel-error-light)]',
    'text-[var(--aethel-success-light)]',
    'text-[var(--aethel-info-light)]',
  ];

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {[0, 1, 2].map((i) => (
        <ScrubbableInput
          key={labels[i]}
          label={labels[i]}
          value={value[i]}
          onChange={(v) => {
            const next = [...value] as [number, number, number];
            next[i] = v;
            onChange(next);
          }}
          onCommit={(v) => {
            const next = [...value] as [number, number, number];
            next[i] = v;
            onCommit?.(next);
          }}
          step={step}
          precision={precision}
          suffix={suffix}
          ariaLabel={ariaLabelPrefix ? `${ariaLabelPrefix} ${labels[i]}` : labels[i]}
          labelClassName={labelColors[i]}
          className="flex-1"
        />
      ))}
    </div>
  );
}

export default ScrubbableInput;
