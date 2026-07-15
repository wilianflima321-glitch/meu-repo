'use client'

import { useState, useCallback } from 'react'
import Codicon from './Codicon'

const SHORTCUT_CATEGORIES = [
  {
    title: 'General',
    shortcuts: [
      { keys: ['Ctrl', 'Shift', 'P'], action: 'Open command palette' },
      { keys: ['Ctrl', 'P'], action: 'Quick open (File)' },
      { keys: ['Ctrl', 'Shift', 'N'], action: 'New window' },
      { keys: ['Ctrl', ','], action: 'Open settings' },
      { keys: ['Ctrl', 'K', 'Ctrl', 'S'], action: 'View keyboard shortcuts' },
    ],
  },
  {
    title: 'Editor',
    shortcuts: [
      { keys: ['Ctrl', 'S'], action: 'Save file' },
      { keys: ['Ctrl', 'Z'], action: 'Undo' },
      { keys: ['Ctrl', 'Shift', 'Z'], action: 'Redo' },
      { keys: ['Ctrl', 'D'], action: 'Select next occurrence' },
      { keys: ['Ctrl', 'Shift', 'K'], action: 'Delete line' },
      { keys: ['Alt', 'Up'], action: 'Move line up' },
      { keys: ['Alt', 'Down'], action: 'Move line down' },
      { keys: ['Ctrl', '/'], action: 'Toggle line comment' },
      { keys: ['Ctrl', 'Shift', 'F'], action: 'Format document' },
    ],
  },
  {
    title: 'AI & Chat',
    shortcuts: [
      { keys: ['Ctrl', 'L'], action: 'Open/focus AI Chat' },
      { keys: ['Ctrl', 'I'], action: 'Inline completion' },
      { keys: ['Ctrl', 'Shift', 'I'], action: 'Explain selected code' },
      { keys: ['Tab'], action: 'Accept inline suggestion' },
      { keys: ['Escape'], action: 'Reject inline suggestion' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['Ctrl', 'G'], action: 'Go to line' },
      { keys: ['Ctrl', 'Shift', 'O'], action: 'Go to symbol' },
      { keys: ['F12'], action: 'Go to definition' },
      { keys: ['Alt', 'F12'], action: 'Peek definition' },
      { keys: ['Ctrl', 'Shift', 'E'], action: 'Focus file explorer' },
      { keys: ['Ctrl', 'Shift', 'G'], action: 'Focus Git' },
      { keys: ['Ctrl', '`'], action: 'Open/close terminal' },
    ],
  },
  {
    title: 'Debugging',
    shortcuts: [
      { keys: ['F5'],        action: 'Start/continue debugging' },
      { keys: ['F9'],        action: 'Toggle breakpoint' },
      { keys: ['F10'],       action: 'Step over' },
      { keys: ['F11'],       action: 'Step into' },
      { keys: ['Shift', 'F11'], action: 'Step out' },
    ],
  },
  {
    title: 'File Explorer',
    shortcuts: [
      { keys: ['F2'],                action: 'Rename file or folder' },
      { keys: ['Del'],               action: 'Delete file or folder' },
      { keys: ['Ctrl', 'N'],         action: 'New file in current folder' },
      { keys: ['Ctrl', 'Shift', 'N'], action: 'New folder in current folder' },
      { keys: ['↑ / ↓'],            action: 'Navigate items' },
      { keys: ['→'],                 action: 'Expand folder' },
      { keys: ['←'],                 action: 'Collapse folder' },
    ],
  },
  {
    title: '3D Viewport & Outliner',
    shortcuts: [
      { keys: ['G'],               action: 'Grab / Move selected object' },
      { keys: ['R'],               action: 'Rotate selected object' },
      { keys: ['S'],               action: 'Scale selected object' },
      { keys: ['Del'],             action: 'Delete selected object(s)' },
      { keys: ['Ctrl', 'D'],       action: 'Duplicate selected object' },
      { keys: ['Ctrl', 'Z'],       action: 'Undo 3D action' },
      { keys: ['Ctrl', 'A'],       action: 'Select all objects' },
      { keys: ['Alt', 'A'],        action: 'Deselect all' },
      { keys: ['H'],               action: 'Hide selected (Outliner toggle)' },
      { keys: ['F11'],             action: 'Zen Mode (immersive preview)' },
    ],
  },
  {
    title: 'Git & Source Control',
    shortcuts: [
      { keys: ['Ctrl', 'Shift', 'G'], action: 'Focus source control panel' },
      { keys: ['Ctrl', 'Enter'],      action: 'Commit staged changes' },
      { keys: ['Alt', 'C'],           action: 'Toggle changes view' },
    ],
  },
]

interface KeyboardShortcutsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function KeyboardShortcutsDialog({ isOpen, onClose }: KeyboardShortcutsDialogProps) {
  const [search, setSearch] = useState('')

  const filteredCategories = SHORTCUT_CATEGORIES.map((cat) => ({
    ...cat,
    shortcuts: cat.shortcuts.filter(
      (s) =>
        s.action.toLowerCase().includes(search.toLowerCase()) ||
        s.keys.join(' ').toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((cat) => cat.shortcuts.length > 0)

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="relative mx-4 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--aethel-border-secondary)] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)] text-[var(--aethel-info-light)]">
              <Codicon name="keyboard" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--aethel-text-primary)]">Keyboard shortcuts</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] hover:text-[var(--aethel-text-primary)]"
            aria-label="Close"
          >
            <Codicon name="close" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-[var(--aethel-border-secondary)] px-5 py-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--aethel-text-tertiary)]">
              <Codicon name="search" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search shortcuts..."
              className="w-full rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] py-2 pl-9 pr-4 text-sm text-[var(--aethel-text-primary)] placeholder:text-[var(--aethel-text-quaternary)] focus:border-[color-mix(in_srgb,var(--aethel-primary)_40%,transparent)] focus:outline-none"
              autoFocus
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {filteredCategories.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--aethel-text-tertiary)]">No shortcut found</p>
          ) : (
            <div className="space-y-6">
              {filteredCategories.map((cat) => (
                <div key={cat.title}>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">{cat.title}</h3>
                  <div className="space-y-1">
                    {cat.shortcuts.map((s) => (
                      <div
                        key={s.action}
                        className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)]"
                      >
                        <span className="text-sm text-[var(--aethel-text-secondary)]">{s.action}</span>
                        <div className="flex items-center gap-1">
                          {s.keys.map((key, i) => (
                            <span key={`${s.action}-${i}`}>
                              <kbd className="inline-flex min-w-[24px] items-center justify-center rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--aethel-text-tertiary)]">
                                {key}
                              </kbd>
                              {i < s.keys.length - 1 && <span className="mx-0.5 text-[var(--aethel-text-quaternary)]">+</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--aethel-border-secondary)] px-5 py-3">
          <p className="text-xs text-[var(--aethel-text-quaternary)]">
            Pressione <kbd className="rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)] px-1 text-[var(--aethel-text-tertiary)]">Ctrl</kbd> +{' '}
            <kbd className="rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)] px-1 text-[var(--aethel-text-tertiary)]">K</kbd> +{' '}
            <kbd className="rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)] px-1 text-[var(--aethel-text-tertiary)]">Ctrl</kbd> +{' '}
            <kbd className="rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)] px-1 text-[var(--aethel-text-tertiary)]">S</kbd> to open this list
          </p>
        </div>
      </div>
    </div>
  )
}

export default KeyboardShortcutsDialog
