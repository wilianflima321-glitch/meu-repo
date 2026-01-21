'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type HTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

interface ContextMenuState {
  open: boolean;
  position: { x: number; y: number } | null;
  setOpen: (open: boolean) => void;
  setPosition: (pos: { x: number; y: number } | null) => void;
}

const ContextMenuContext = createContext<ContextMenuState | null>(null);

function useContextMenu() {
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
  const { setOpen, setPosition } = useContextMenu();

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

export function ContextMenuContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { open, position, setOpen } = useContextMenu();
  const contentRef = useRef<HTMLDivElement>(null);

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

  if (!open || !position) return null;

  return (
    <div
      ref={contentRef}
      className={cn(
        'fixed z-50 min-w-[180px] rounded-lg border border-slate-700 bg-slate-800 p-1 shadow-xl',
        className
      )}
      style={{ top: position.y, left: position.x }}
    >
      {children}
    </div>
  );
}

export function ContextMenuItem({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      role="menuitem"
      tabIndex={0}
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-slate-700',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function ContextMenuSeparator({ className }: { className?: string }) {
  return <div className={cn('my-1 h-px bg-slate-700', className)} />;
}

export default ContextMenu;
