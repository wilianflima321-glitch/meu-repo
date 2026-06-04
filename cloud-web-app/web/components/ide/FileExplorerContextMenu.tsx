'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Codicon, { type CodiconName } from './Codicon'
import type { FileNode } from './FileExplorerPro.types'

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

    const menuItems = [
      ...(isFolder ? [
        { id: 'new-file', label: 'New file', icon: 'new-file' as CodiconName },
        { id: 'new-folder', label: 'New folder', icon: 'new-folder' as CodiconName },
        { id: 'divider-1', divider: true },
      ] : []),
      { id: 'rename', label: 'Rename', icon: 'edit' as CodiconName },
      { id: 'delete', label: 'Delete', icon: 'trash' as CodiconName, danger: true },
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

      {/* Menu */}
      <div
        ref={menuRef}
        role="menu"
        aria-label={`Context actions for ${file.name}`}
        onKeyDown={handleMenuKeyDown}
        className="fixed z-50 min-w-48 py-1 bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded-lg shadow-xl"
        style={{ left: menuPosition.left, top: menuPosition.top }}
      >
        {(() => {
          let actionPointer = -1
          return menuItems.map((item, i) => {
            if (item.divider) {
              return <div key={`divider-${i}`} className="my-1 border-t border-[var(--aethel-border-secondary)]" />
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
                onMouseEnter={() => setActiveIndex(actionIndex)}
                onClick={() => {
                  onAction(item.id!)
                  onClose()
                }}
                className={`
                  w-full flex items-center gap-2 px-3 py-1.5 text-xs
                  ${item.danger ? 'text-[var(--aethel-error)] hover:bg-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)]' : 'text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-quaternary)]'}
                `}
              >
                {item.icon && <Codicon name={item.icon} />}
                <span className="flex-1 text-left">{item.label}</span>
              </button>
            )
          })
        })()}
      </div>
    </>
  )
}

// ============= Main Component =============
