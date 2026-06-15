'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type ReactNode,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

// ============================================================================
// Context Menu — Portal-based, Edge-aware, Glassmorphism (Frente A20/A49)
// ============================================================================

interface ContextMenuState {
  open: boolean;
  position: { x: number; y: number } | null;
  setOpen: (open: boolean) => void;
  setPosition: (pos: { x: number; y: number } | null) => void;
}

const ContextMenuContext = createContext<ContextMenuState | null>(null);

function useContextMenuCtx() {
  const ctx = useContext(ContextMenuContext);
  if (!ctx) {
    throw new Error('ContextMenu components must be used within ContextMenu');
  }
  return ctx;
}

export function ContextMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  const value = useMemo(
    () => ({ open, position, setOpen, setPosition }),
    [open, position]
  );

  return <ContextMenuContext.Provider value={value}>{children}</ContextMenuContext.Provider>;
}

export function ContextMenuTrigger({ children }: { children: ReactNode }) {
  const { setOpen, setPosition } = useContextMenuCtx();

  return (
    <div
      onContextMenu={(event) => {
        event.preventDefault();
        setPosition({ x: event.clientX, y: event.clientY });
        setOpen(true);
      }}
    >
      {children}
    </div>
  );
}

/**
 * Edge-aware positioning: detects viewport boundaries and flips
 * the menu direction to prevent clipping.
 */
function useEdgeAwarePosition(
  position: { x: number; y: number } | null,
  contentRef: React.RefObject<HTMLDivElement | null>
) {
  const [adjustedPos, setAdjustedPos] = useState(position);

  useEffect(() => {
    if (!position || !contentRef.current) {
      setAdjustedPos(position);
      return;
    }

    const rect = contentRef.current.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    let x = position.x;
    let y = position.y;

    // Flip horizontally if menu would overflow right edge
    if (x + rect.width > viewportW - 8) {
      x = Math.max(8, x - rect.width);
    }

    // Flip vertically if menu would overflow bottom edge
    if (y + rect.height > viewportH - 8) {
      y = Math.max(8, y - rect.height);
    }

    setAdjustedPos({ x, y });
  }, [position, contentRef]);

  return adjustedPos;
}

export function ContextMenuContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { open, position, setOpen } = useContextMenuCtx();
  const contentRef = useRef<HTMLDivElement>(null);
  const adjustedPos = useEdgeAwarePosition(position, contentRef);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (contentRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, setOpen]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, setOpen]);

  // Focus first item when opened
  useEffect(() => {
    if (open && contentRef.current) {
      const firstItem = contentRef.current.querySelector('[role="menuitem"]') as HTMLElement;
      firstItem?.focus();
    }
  }, [open]);

  if (!open || !position) return null;

  const displayPos = adjustedPos || position;

  return createPortal(
    <div
      ref={contentRef}
      role="menu"
      aria-orientation="vertical"
      className={cn(
        'fixed z-[9999] min-w-[180px] rounded-lg',
        'border border-[var(--aethel-border-primary)]',
        'bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_92%,transparent)]',
        'backdrop-blur-xl',
        'p-1 shadow-2xl shadow-black/40',
        'animate-in fade-in zoom-in-95 duration-150',
        className
      )}
      style={{ top: displayPos.y, left: displayPos.x }}
    >
      {children}
    </div>,
    document.body
  );
}

export function ContextMenuItem({
  children,
  className,
  disabled = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode; disabled?: boolean }) {
  const { setOpen } = useContextMenuCtx();

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        (event.target as HTMLElement).click();
      }

      // Arrow key navigation
      const parent = (event.target as HTMLElement).parentElement;
      if (!parent) return;
      const items = Array.from(parent.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])')) as HTMLElement[];
      const currentIndex = items.indexOf(event.target as HTMLElement);

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        items[(currentIndex + 1) % items.length]?.focus();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        items[(currentIndex - 1 + items.length) % items.length]?.focus();
      }
    },
    [disabled]
  );

  return (
    <div
      role="menuitem"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      className={cn(
        'flex cursor-pointer select-none items-center gap-2 rounded-md px-3 py-1.5',
        'text-[13px] text-[var(--aethel-text-secondary)]',
        'outline-none transition-colors duration-100',
        disabled
          ? 'opacity-40 cursor-not-allowed'
          : 'hover:bg-[var(--aethel-surface-quaternary)] focus-visible:bg-[var(--aethel-surface-quaternary)]',
        className
      )}
      onKeyDown={handleKeyDown}
      onClick={(e) => {
        if (disabled) return;
        props.onClick?.(e);
        setOpen(false);
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function ContextMenuSeparator({ className }: { className?: string }) {
  return (
    <div
      role="separator"
      className={cn('my-1 h-px bg-[var(--aethel-border-primary)]/30', className)}
    />
  );
}

export function ContextMenuLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'px-3 py-1 text-[11px] font-semibold uppercase tracking-wider',
        'text-[var(--aethel-text-tertiary)]',
        className
      )}
    >
      {children}
    </div>
  );
}

export default ContextMenu;
