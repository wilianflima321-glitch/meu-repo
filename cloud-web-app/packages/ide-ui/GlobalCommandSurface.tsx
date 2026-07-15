'use client'

import { type ReactNode, useEffect, useMemo, useState } from 'react'
import CommandPaletteProvider from './CommandPalette'
import KeyboardShortcutsDialog from './KeyboardShortcutsDialog'
import { NODE_CATALOG } from '@aethel/visual-scripting/visual-node-catalog'
import type { ScriptingNodeItem } from './CommandPalette.parts'

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tagName = target.tagName.toLowerCase()
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable
}

/** Broadcast to whichever Visual Script Editor instance is mounted — see the `aethel.visualScript.insertNode` listener in `VisualScriptEditor.tsx`. */
function insertScriptingNodeIntoActiveGraph(nodeType: string) {
  window.dispatchEvent(new CustomEvent('aethel.visualScript.insertNode', { detail: { nodeType } }))
}

export default function GlobalCommandSurface({ children }: { children: ReactNode }) {
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  // Universal Search (FASE 3.5) — the live scripting node catalog, mapped to
  // the shape CommandPalette needs. Computed once; the catalog is static.
  const scriptingNodes = useMemo<ScriptingNodeItem[]>(
    () => NODE_CATALOG.map((definition) => ({
      type: definition.type,
      label: definition.label,
      category: definition.category,
      description: definition.description,
    })),
    []
  )

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
    <CommandPaletteProvider scriptingNodes={scriptingNodes} onInsertScriptingNode={insertScriptingNodeIntoActiveGraph}>
      {children}
      <KeyboardShortcutsDialog isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </CommandPaletteProvider>
  )
}
