'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Codicon, { type CodiconName } from './Codicon'
import type { FileNode } from './FileExplorerPro.types'

// ─── Injected once per page load — not per component instance ─────────────────
const CTX_MENU_STYLES = `
  @keyframes aethel-ctx-in {
    from { opacity: 0; transform: scale(0.95) translateY(-4px); }
    to   { opacity: 1; transform: scale(1)   translateY(0); }
  }
  [data-aethel-ctx-menu] {
    animation: aethel-ctx-in 120ms cubic-bezier(0.16, 1, 0.3, 1) both;
    transform-origin: top left;
  }
  [data-aethel-ctx-menu] button kbd {
    display: inline-flex;
    align-items: center;
    padding: 1px 5px;
    border-radius: 4px;
    font-size: 10px;
    font-family: var(--font-mono, ui-monospace, monospace);
    border: 1px solid var(--aethel-border-secondary);
    background: color-mix(in srgb, var(--aethel-surface-primary) 60%, transparent);
    color: var(--aethel-text-quaternary);
    line-height: 1.4;
    pointer-events: none;
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

  // Ensure CSS is in the document exactly once
  useEffect(() => { ensureContextMenuStyles() }, [])

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
    const margin = 8

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

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        onClick={onClose}
      />

      {/* Menu — styles injected once at module load, no per-render <style> tag */}
      <div
        ref={menuRef}
        data-aethel-ctx-menu
        role="menu"
        aria-label={`Context actions for ${file.name}`}
        onKeyDown={handleMenuKeyDown}
        className="fixed z-50 min-w-52 py-1"
        style={{
          left: menuPosition.left,
          top: menuPosition.top,
          background: 'var(--aethel-surface-tertiary)',
          border: '1px solid var(--aethel-border-secondary)',
          borderRadius: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.25)',
        }}
      >
        {(() => {
          let actionPointer = -1
          return menuItems.map((item, i) => {
            if (item.divider) {
              return (
                <div
                  key={`divider-${i}`}
                  className="my-1 border-t"
                  style={{ borderColor: 'var(--aethel-border-secondary)' }}
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
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  fontSize: 12,
                  background: actionIndex === activeIndex
                    ? item.danger
                      ? 'color-mix(in srgb, var(--aethel-error) 18%, transparent)'
                      : 'var(--aethel-interactive-hover)'
                    : 'transparent',
                  color: item.danger
                    ? 'var(--aethel-error)'
                    : 'var(--aethel-text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 80ms ease',
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
}

// ============= Main Component =============
