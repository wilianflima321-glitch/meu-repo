'use client'

import { type ReactNode, useEffect, useState } from 'react'
import CommandPaletteProvider from './CommandPalette'
import KeyboardShortcutsDialog from './KeyboardShortcutsDialog'

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tagName = target.tagName.toLowerCase()
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable
}

export default function GlobalCommandSurface({ children }: { children: ReactNode }) {
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return

      const accel = event.ctrlKey || event.metaKey
      if (event.key === '?' && !accel && !event.altKey) {
        event.preventDefault()
        setShortcutsOpen(true)
        return
      }

      if (accel && event.key.toLowerCase() === '/' && !event.shiftKey) {
        event.preventDefault()
        setShortcutsOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <CommandPaletteProvider>
      {children}
      <KeyboardShortcutsDialog isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </CommandPaletteProvider>
  )
}
