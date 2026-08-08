'use client'

import { useEffect, useRef } from 'react'
// @aethel-heavy-async-boundary
import { AnimatePresence, motion } from 'framer-motion'
import {
  Copy,
  Crosshair,
  Link,
  Minus,
  MoveDown,
  Trash2,
} from 'lucide-react'

export interface ViewportContextMenuItem {
  id: string
  label: string
  shortcut?: string
  icon?: React.ReactNode
  danger?: boolean
  separator?: boolean
  disabled?: boolean
}

export interface ViewportContextMenuProps {
  x: number
  y: number
  isOpen: boolean
  objectName?: string
  onClose: () => void
  onAction: (id: string) => void
}

const DEFAULT_ITEMS: ViewportContextMenuItem[] = [
  { id: 'focus',      label: 'Focus',                  shortcut: 'F',   icon: <Crosshair className="h-3.5 w-3.5" /> },
  { id: 'duplicate',  label: 'Duplicate',              shortcut: 'Ctrl+D', icon: <Copy className="h-3.5 w-3.5" /> },
  { id: 'drop-floor', label: 'Drop to Floor',          shortcut: 'End', icon: <MoveDown className="h-3.5 w-3.5" /> },
  { id: 'sep1',       label: '',                       separator: true },
  { id: 'add-script', label: 'Add to Visual Scripting', icon: <Link className="h-3.5 w-3.5" /> },
  { id: 'sep2',       label: '',                       separator: true },
  { id: 'delete',     label: 'Delete',                 shortcut: 'Del', icon: <Trash2 className="h-3.5 w-3.5" />, danger: true },
]

export function ViewportContextMenu({
  x,
  y,
  isOpen,
  objectName,
  onClose,
  onAction,
}: ViewportContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          key="viewport-ctx-menu"
          role="menu"
          aria-label="Viewport object context menu"
          initial={{ opacity: 0, scale: 0.96, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -4 }}
          transition={{ duration: 0.12, ease: [0.4, 0, 0.2, 1] }}
          style={{
            position: 'fixed',
            left: x,
            top: y,
            zIndex: 9000,
            // Clamp to viewport
            transform: `translate(${x + 200 > window.innerWidth ? '-100%' : '0'}, ${y + 280 > window.innerHeight ? '-100%' : '0'})`,
          }}
          className="min-w-[192px] overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--aethel-neon-cyan)_18%,transparent)] bg-[rgba(var(--aethel-surface-primary-rgb), 0.92)] shadow-[0_24px_60px_rgba(0,0,0,0.6),0_0_20px_rgba(0,229,255,0.07)] [backdrop-filter:blur(16px)]"
          // Block viewport key events propagating through menu
          onKeyDown={(e: React.KeyboardEvent) => e.stopPropagation()}
        >
          {/* Header */}
          {objectName && (
            <div className="flex items-center gap-2 border-b border-[color-mix(in_srgb,var(--aethel-neon-cyan)_10%,transparent)] px-3 py-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--aethel-neon-cyan)]" aria-hidden />
              <span className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-neon-cyan)]">
                {objectName}
              </span>
            </div>
          )}

          <div className="p-1">
            {DEFAULT_ITEMS.map((item) => {
              if (item.separator) {
                return (
                  <div
                    key={item.id}
                    className="my-1 h-px bg-[color-mix(in_srgb,var(--aethel-border-primary)_45%,transparent)]"
                    role="separator"
                    aria-hidden
                  />
                )
              }
              return (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  aria-label={item.label}
                  onClick={() => { onAction(item.id); onClose() }}
                  className={[
                    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[11px] font-medium transition-colors',
                    item.danger
                      ? 'text-[var(--aethel-error-light)] hover:bg-[color-mix(in_srgb,var(--aethel-error)_14%,transparent)]'
                      : 'text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-neon-cyan)_8%,transparent)] hover:text-[var(--aethel-text-primary)]',
                    item.disabled ? 'pointer-events-none opacity-35' : '',
                  ].join(' ')}
                >
                  {item.icon && (
                    <span className={item.danger ? 'text-[var(--aethel-error-light)]' : 'text-[var(--aethel-text-tertiary)]'}>
                      {item.icon}
                    </span>
                  )}
                  <span className="flex-1">{item.label}</span>
                  {item.shortcut && (
                    <kbd className="ml-2 rounded border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] px-1.5 py-0.5 text-[9px] font-mono text-[var(--aethel-text-tertiary)]">
                      {item.shortcut}
                    </kbd>
                  )}
                </button>
              )
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
