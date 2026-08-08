'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Codicon, { type CodiconName } from './Codicon'
import type { FileNode } from './FileExplorerPro.types'

// ─── Injected once per page load — not per component instance ─────────────────
const CTX_MENU_STYLES = `
  @keyframes aethel-ctx-in {
    0% { opacity: 0; transform: scale(0.9) translateY(-8px); }
    40% { opacity: 1; transform: scale(1.02) translateY(2px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  [data-aethel-ctx-menu] {
    animation: aethel-ctx-in 250ms cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
    transform-origin: top left;
  }
  [data-aethel-ctx-menu] button kbd {
    display: inline-flex;
    align-items: center;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-family: var(--font-mono, ui-monospace, monospace);
    border: 1px solid color-mix(in srgb, var(--aethel-border-secondary) 50%, transparent);
    background: color-mix(in srgb, var(--aethel-surface-secondary) 40%, transparent);
    color: var(--aethel-text-tertiary);
    line-height: 1.2;
    pointer-events: none;
    box-shadow: 0 1px 2px color-mix(in srgb, var(--aethel-brand-pure-black) 10%, transparent) inset;
  }
`

let _stylesInjected = false
function ensureContextMenuStyles() {
  if (_stylesInjected || typeof document === 'undefined') return
  _stylesInjected = true
  const el = document.createElement('style')
  el.textContent = CTX_MENU_STYLES
  document.head.appendChild(el)
}


// ============= Context Menu =============

interface ContextMenuProps {
  x: number
  y: number
  file: FileNode
  onClose: () => void
  onAction: (action: string) => void
}

export function ContextMenu({ x, y, file, onClose, onAction }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [menuPosition, setMenuPosition] = useState({ left: x, top: y })
  const isFolder = file.type === 'folder'
  const [mounted, setMounted] = useState(false)

  // Ensure CSS is in the document exactly once
  useEffect(() => { ensureContextMenuStyles() }, [])
  
  useEffect(() => { setMounted(true) }, [])

  const menuItems = [
    ...(isFolder ? [
      { id: 'new-file',    label: 'New file',   icon: 'new-file' as CodiconName,  shortcut: 'Ctrl+N' },
      { id: 'new-folder', label: 'New folder',  icon: 'new-folder' as CodiconName, shortcut: 'Ctrl+Shift+N' },
      { id: 'divider-1', divider: true },
    ] : []),
    { id: 'rename', label: 'Rename', icon: 'edit' as CodiconName,  shortcut: 'F2' },
    { id: 'delete', label: 'Delete', icon: 'trash' as CodiconName, shortcut: 'Del', danger: true },
  ]
  const actionableItems = menuItems.filter((item) => !item.divider)

  useEffect(() => {
    const activeButton = menuRef.current?.querySelector<HTMLButtonElement>(`button[data-action-index="${activeIndex}"]`)
    activeButton?.focus()
  }, [activeIndex])

  useEffect(() => {
    const menu = menuRef.current
    if (!menu || typeof window === 'undefined') return
    const width = menu.offsetWidth || 192
    const height = menu.offsetHeight || 120
    const margin = 12

    const maxLeft = Math.max(margin, window.innerWidth - width - margin)
    const maxTop = Math.max(margin, window.innerHeight - height - margin)

    setMenuPosition({
      left: Math.max(margin, Math.min(x, maxLeft)),
      top: Math.max(margin, Math.min(y, maxTop)),
    })
  }, [x, y, menuItems.length])

  const activateActionAtIndex = useCallback((index: number) => {
    const item = actionableItems[index]
    if (!item?.id) return
    onAction(item.id)
    onClose()
  }, [actionableItems, onAction, onClose])

  const handleMenuKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((prev) => (prev + 1) % actionableItems.length)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((prev) => (prev - 1 + actionableItems.length) % actionableItems.length)
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      activateActionAtIndex(activeIndex)
    }
  }, [activateActionAtIndex, actionableItems.length, activeIndex, onClose])

  const menuContent = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998]"
        onClick={onClose}
        onContextMenu={(e) => { e.preventDefault(); onClose(); }}
      />

      {/* Menu — styles injected once at module load */}
      <div
        ref={menuRef}
        data-aethel-ctx-menu
        role="menu"
        aria-label={`Context actions for ${file.name}`}
        onKeyDown={handleMenuKeyDown}
        className="fixed z-[9999] min-w-[220px] py-1.5 backdrop-blur-xl"
        style={{
          left: menuPosition.left,
          top: menuPosition.top,
          background: 'color-mix(in srgb, var(--aethel-surface-tertiary) 85%, transparent)',
          border: '1px solid color-mix(in srgb, var(--aethel-border-primary) 60%, transparent)',
          borderRadius: 12,
          boxShadow: '0 0 0 1px var(--aethel-border-subtle) inset, 0 12px 40px color-mix(in srgb, var(--aethel-brand-pure-black) 55%, transparent), 0 4px 12px color-mix(in srgb, var(--aethel-brand-pure-black) 30%, transparent)',
        }}
      >
        {(() => {
          let actionPointer = -1
          return menuItems.map((item, i) => {
            if (item.divider) {
              return (
                <div
                  key={`divider-${i}`}
                  className="my-1.5 border-t"
                  style={{ borderColor: 'color-mix(in srgb, var(--aethel-border-secondary) 40%, transparent)' }}
                />
              )
            }
            actionPointer += 1
            const actionIndex = actionPointer
            return (
              <button
                type="button"
                key={item.id}
                role="menuitem"
                data-action-index={actionIndex}
                tabIndex={actionIndex === activeIndex ? 0 : -1}
                autoFocus={actionIndex === 0}
                onMouseEnter={() => setActiveIndex(actionIndex)}
                onClick={() => {
                  onAction(item.id!)
                  onClose()
                }}
                style={{
                  width: 'calc(100% - 12px)',
                  margin: '0 6px',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '7px 10px',
                  fontSize: 13,
                  fontWeight: 500,
                  background: actionIndex === activeIndex
                    ? item.danger
                      ? 'color-mix(in srgb, var(--aethel-error) 20%, transparent)'
                      : 'var(--aethel-interactive-hover)'
                    : 'transparent',
                  color: item.danger
                    ? 'var(--aethel-error)'
                    : actionIndex === activeIndex ? 'var(--aethel-text-primary)' : 'var(--aethel-text-secondary)',
                  border: 'none',
                  cursor: 'default',
                  textAlign: 'left',
                  transition: 'all 120ms ease',
                }}
              >
                {item.icon && <Codicon name={item.icon} />}
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.shortcut && <kbd>{item.shortcut}</kbd>}
              </button>
            )
          })
        })()}
      </div>
    </>
  )

  if (!mounted) return null
  return createPortal(menuContent, document.body)
}

// ============= Main Component =============
