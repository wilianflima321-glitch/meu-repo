'use client'

/**
 * Keybindings Editor - Visual Keyboard Shortcut Manager
 * Like VS Code Keyboard Shortcuts (Ctrl+K Ctrl+S)
 *
 * Features:
 * - Visual keybinding list
 * - Search & filter
 * - Record new keybinding
 * - Restaurar padr?o
 * - Conflict detection
 * - Export/Import
 * - INTEGRATED with KeybindingManager for real execution
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import {
  Search,
  Keyboard,
  Edit3,
  RotateCcw,
  Download,
  Upload,
  AlertTriangle,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Filter,
  Trash2,
  Plus,
  Command,
  Loader2,
} from 'lucide-react'
import { getKeybindingManager, Keybinding as ManagerKeybinding } from '@/lib/keybindings/keybinding-manager'
import { useToast } from '@/components/ui/Toast'
import { openConfirmDialog } from '@/lib/ui/non-blocking-dialogs'

// ============= Types =============

export interface Keybinding {
  id: string
  command: string
  label: string
  keybinding: string | null
  defaultKeybinding: string | null
  when?: string
  source: 'default' | 'user' | 'extension'
  category: string
}

interface KeybindingsEditorProps {
  keybindings?: Keybinding[]
  onSave?: (keybindings: Keybinding[]) => void
  onClose?: () => void
}

// ============= Default Keybindings =============

const DEFAULT_KEYBINDINGS: Keybinding[] = [
  // File
  { id: 'file.new', command: 'file.newFile', label: 'New File', keybinding: 'Ctrl+N', defaultKeybinding: 'Ctrl+N', category: 'File', source: 'default' },
  { id: 'file.open', command: 'file.openFile', label: 'Open File', keybinding: 'Ctrl+O', defaultKeybinding: 'Ctrl+O', category: 'File', source: 'default' },
  { id: 'file.save', command: 'file.save', label: 'Save', keybinding: 'Ctrl+S', defaultKeybinding: 'Ctrl+S', category: 'File', source: 'default' },
  { id: 'file.saveAs', command: 'file.saveAs', label: 'Save As', keybinding: 'Ctrl+Shift+S', defaultKeybinding: 'Ctrl+Shift+S', category: 'File', source: 'default' },
  { id: 'file.saveAll', command: 'file.saveAll', label: 'Save All', keybinding: 'Ctrl+K S', defaultKeybinding: 'Ctrl+K S', category: 'File', source: 'default' },
  { id: 'file.close', command: 'file.closeTab', label: 'Close Tab', keybinding: 'Ctrl+W', defaultKeybinding: 'Ctrl+W', category: 'File', source: 'default' },
  { id: 'file.closeAll', command: 'file.closeAllTabs', label: 'Close All Tabs', keybinding: 'Ctrl+K Ctrl+W', defaultKeybinding: 'Ctrl+K Ctrl+W', category: 'File', source: 'default' },

  // Edit
  { id: 'edit.undo', command: 'edit.undo', label: 'Undo', keybinding: 'Ctrl+Z', defaultKeybinding: 'Ctrl+Z', category: 'Edit', source: 'default' },
  { id: 'edit.redo', command: 'edit.redo', label: 'Redo', keybinding: 'Ctrl+Y', defaultKeybinding: 'Ctrl+Y', category: 'Edit', source: 'default' },
  { id: 'edit.cut', command: 'edit.cut', label: 'Cut', keybinding: 'Ctrl+X', defaultKeybinding: 'Ctrl+X', category: 'Edit', source: 'default' },
  { id: 'edit.copy', command: 'edit.copy', label: 'Copy', keybinding: 'Ctrl+C', defaultKeybinding: 'Ctrl+C', category: 'Edit', source: 'default' },
  { id: 'edit.paste', command: 'edit.paste', label: 'Paste', keybinding: 'Ctrl+V', defaultKeybinding: 'Ctrl+V', category: 'Edit', source: 'default' },
  { id: 'edit.selectAll', command: 'edit.selectAll', label: 'Select All', keybinding: 'Ctrl+A', defaultKeybinding: 'Ctrl+A', category: 'Edit', source: 'default' },
  { id: 'edit.find', command: 'edit.find', label: 'Find', keybinding: 'Ctrl+F', defaultKeybinding: 'Ctrl+F', category: 'Edit', source: 'default' },
  { id: 'edit.replace', command: 'edit.replace', label: 'Replace', keybinding: 'Ctrl+H', defaultKeybinding: 'Ctrl+H', category: 'Edit', source: 'default' },
  { id: 'edit.findInFiles', command: 'edit.findInFiles', label: 'Find in Files', keybinding: 'Ctrl+Shift+F', defaultKeybinding: 'Ctrl+Shift+F', category: 'Edit', source: 'default' },
  { id: 'edit.toggleComment', command: 'edit.toggleComment', label: 'Toggle Line Comment', keybinding: 'Ctrl+/', defaultKeybinding: 'Ctrl+/', category: 'Edit', source: 'default' },
  { id: 'edit.blockComment', command: 'edit.blockComment', label: 'Toggle Block Comment', keybinding: 'Ctrl+Shift+/', defaultKeybinding: 'Ctrl+Shift+/', category: 'Edit', source: 'default' },
  { id: 'edit.format', command: 'edit.formatDocument', label: 'Format Document', keybinding: 'Shift+Alt+F', defaultKeybinding: 'Shift+Alt+F', category: 'Edit', source: 'default' },
  { id: 'edit.deleteLine', command: 'edit.deleteLine', label: 'Delete Line', keybinding: 'Ctrl+Shift+K', defaultKeybinding: 'Ctrl+Shift+K', category: 'Edit', source: 'default' },
  { id: 'edit.duplicateLine', command: 'edit.duplicateLine', label: 'Duplicate Line', keybinding: 'Shift+Alt+Down', defaultKeybinding: 'Shift+Alt+Down', category: 'Edit', source: 'default' },
  { id: 'edit.moveLine', command: 'edit.moveLine', label: 'Move Line Up', keybinding: 'Alt+Up', defaultKeybinding: 'Alt+Up', category: 'Edit', source: 'default' },

  // View
  { id: 'view.commandPalette', command: 'view.commandPalette', label: 'Command Palette', keybinding: 'Ctrl+Shift+P', defaultKeybinding: 'Ctrl+Shift+P', category: 'View', source: 'default' },
  { id: 'view.quickOpen', command: 'view.quickOpen', label: 'Quick Open', keybinding: 'Ctrl+P', defaultKeybinding: 'Ctrl+P', category: 'View', source: 'default' },
  { id: 'view.explorer', command: 'view.explorer', label: 'Show Explorer', keybinding: 'Ctrl+Shift+E', defaultKeybinding: 'Ctrl+Shift+E', category: 'View', source: 'default' },
  { id: 'view.search', command: 'view.search', label: 'Show Search', keybinding: 'Ctrl+Shift+F', defaultKeybinding: 'Ctrl+Shift+F', category: 'View', source: 'default' },
  { id: 'view.git', command: 'view.git', label: 'Show Source Control', keybinding: 'Ctrl+Shift+G', defaultKeybinding: 'Ctrl+Shift+G', category: 'View', source: 'default' },
  { id: 'view.debug', command: 'view.debug', label: 'Show Debug', keybinding: 'Ctrl+Shift+D', defaultKeybinding: 'Ctrl+Shift+D', category: 'View', source: 'default' },
  { id: 'view.extensions', command: 'view.extensions', label: 'Show Extensions', keybinding: 'Ctrl+Shift+X', defaultKeybinding: 'Ctrl+Shift+X', category: 'View', source: 'default' },
  { id: 'view.terminal', command: 'view.terminal', label: 'Toggle Terminal', keybinding: 'Ctrl+`', defaultKeybinding: 'Ctrl+`', category: 'View', source: 'default' },
  { id: 'view.problems', command: 'view.problems', label: 'Show Problems', keybinding: 'Ctrl+Shift+M', defaultKeybinding: 'Ctrl+Shift+M', category: 'View', source: 'default' },
  { id: 'view.sidebar', command: 'view.sidebar', label: 'Toggle Sidebar', keybinding: 'Ctrl+B', defaultKeybinding: 'Ctrl+B', category: 'View', source: 'default' },
  { id: 'view.panel', command: 'view.panel', label: 'Toggle Panel', keybinding: 'Ctrl+J', defaultKeybinding: 'Ctrl+J', category: 'View', source: 'default' },
  { id: 'view.fullscreen', command: 'view.fullscreen', label: 'Toggle Full Screen', keybinding: 'F11', defaultKeybinding: 'F11', category: 'View', source: 'default' },
  { id: 'view.zoomIn', command: 'view.zoomIn', label: 'Zoom In', keybinding: 'Ctrl+=', defaultKeybinding: 'Ctrl+=', category: 'View', source: 'default' },
  { id: 'view.zoomOut', command: 'view.zoomOut', label: 'Zoom Out', keybinding: 'Ctrl+-', defaultKeybinding: 'Ctrl+-', category: 'View', source: 'default' },
  { id: 'view.resetZoom', command: 'view.resetZoom', label: 'Reset Zoom', keybinding: 'Ctrl+0', defaultKeybinding: 'Ctrl+0', category: 'View', source: 'default' },

  // Go
  { id: 'go.definition', command: 'go.definition', label: 'Go to Definition', keybinding: 'F12', defaultKeybinding: 'F12', category: 'Go', source: 'default' },
  { id: 'go.declaration', command: 'go.declaration', label: 'Go to Declaration', keybinding: 'Ctrl+F12', defaultKeybinding: 'Ctrl+F12', category: 'Go', source: 'default' },
  { id: 'go.references', command: 'go.references', label: 'Go to References', keybinding: 'Shift+F12', defaultKeybinding: 'Shift+F12', category: 'Go', source: 'default' },
  { id: 'go.line', command: 'go.line', label: 'Go to Line', keybinding: 'Ctrl+G', defaultKeybinding: 'Ctrl+G', category: 'Go', source: 'default' },
  { id: 'go.symbol', command: 'go.symbol', label: 'Go to Symbol', keybinding: 'Ctrl+Shift+O', defaultKeybinding: 'Ctrl+Shift+O', category: 'Go', source: 'default' },
  { id: 'go.back', command: 'go.back', label: 'Go Back', keybinding: 'Alt+Left', defaultKeybinding: 'Alt+Left', category: 'Go', source: 'default' },
  { id: 'go.forward', command: 'go.forward', label: 'Go Forward', keybinding: 'Alt+Right', defaultKeybinding: 'Alt+Right', category: 'Go', source: 'default' },
  { id: 'go.nextError', command: 'go.nextError', label: 'Go to Next Problem', keybinding: 'F8', defaultKeybinding: 'F8', category: 'Go', source: 'default' },
  { id: 'go.prevError', command: 'go.prevError', label: 'Go to Previous Problem', keybinding: 'Shift+F8', defaultKeybinding: 'Shift+F8', category: 'Go', source: 'default' },

  // Debug
  { id: 'debug.start', command: 'debug.start', label: 'Start Debugging', keybinding: 'F5', defaultKeybinding: 'F5', category: 'Debug', source: 'default' },
  { id: 'debug.startWithout', command: 'debug.startWithout', label: 'Start Without Debugging', keybinding: 'Ctrl+F5', defaultKeybinding: 'Ctrl+F5', category: 'Debug', source: 'default' },
  { id: 'debug.stop', command: 'debug.stop', label: 'Stop', keybinding: 'Shift+F5', defaultKeybinding: 'Shift+F5', category: 'Debug', source: 'default' },
  { id: 'debug.restart', command: 'debug.restart', label: 'Restart', keybinding: 'Ctrl+Shift+F5', defaultKeybinding: 'Ctrl+Shift+F5', category: 'Debug', source: 'default' },
  { id: 'debug.breakpoint', command: 'debug.breakpoint', label: 'Toggle Breakpoint', keybinding: 'F9', defaultKeybinding: 'F9', category: 'Debug', source: 'default' },
  { id: 'debug.stepOver', command: 'debug.stepOver', label: 'Step Over', keybinding: 'F10', defaultKeybinding: 'F10', category: 'Debug', source: 'default' },
  { id: 'debug.stepInto', command: 'debug.stepInto', label: 'Step Into', keybinding: 'F11', defaultKeybinding: 'F11', when: 'debuggingActive', category: 'Debug', source: 'default' },
  { id: 'debug.stepOut', command: 'debug.stepOut', label: 'Step Out', keybinding: 'Shift+F11', defaultKeybinding: 'Shift+F11', category: 'Debug', source: 'default' },
  { id: 'debug.continue', command: 'debug.continue', label: 'Continue', keybinding: 'F5', defaultKeybinding: 'F5', when: 'debuggingActive', category: 'Debug', source: 'default' },

  // Terminal
  { id: 'terminal.new', command: 'terminal.new', label: 'New Terminal', keybinding: 'Ctrl+Shift+`', defaultKeybinding: 'Ctrl+Shift+`', category: 'Terminal', source: 'default' },
  { id: 'terminal.split', command: 'terminal.split', label: 'Split Terminal', keybinding: 'Ctrl+Shift+5', defaultKeybinding: 'Ctrl+Shift+5', category: 'Terminal', source: 'default' },
  { id: 'terminal.clear', command: 'terminal.clear', label: 'Clear Terminal', keybinding: null, defaultKeybinding: null, category: 'Terminal', source: 'default' },
  { id: 'terminal.kill', command: 'terminal.kill', label: 'Kill Terminal', keybinding: null, defaultKeybinding: null, category: 'Terminal', source: 'default' },

  // Engine
  { id: 'engine.play', command: 'engine.play', label: 'Play in Editor', keybinding: 'Alt+P', defaultKeybinding: 'Alt+P', category: 'Engine', source: 'default' },
  { id: 'engine.stop', command: 'engine.stop', label: 'Stop Playing', keybinding: 'Escape', defaultKeybinding: 'Escape', when: 'enginePlaying', category: 'Engine', source: 'default' },
  { id: 'engine.pause', command: 'engine.pause', label: 'Pause', keybinding: 'Alt+Pause', defaultKeybinding: 'Alt+Pause', category: 'Engine', source: 'default' },
  { id: 'engine.build', command: 'engine.build', label: 'Build Project', keybinding: 'Ctrl+Shift+B', defaultKeybinding: 'Ctrl+Shift+B', category: 'Engine', source: 'default' },
  { id: 'engine.rebuild', command: 'engine.rebuild', label: 'Rebuild Project', keybinding: 'Ctrl+Shift+Alt+B', defaultKeybinding: 'Ctrl+Shift+Alt+B', category: 'Engine', source: 'default' },

  // AI
  { id: 'ai.chat', command: 'ai.openChat', label: 'Open AI Chat', keybinding: 'Ctrl+Shift+I', defaultKeybinding: 'Ctrl+Shift+I', category: 'AI', source: 'default' },
  { id: 'ai.inlineCompletion', command: 'ai.triggerInline', label: 'Trigger Inline Completion', keybinding: 'Ctrl+Space', defaultKeybinding: 'Ctrl+Space', category: 'AI', source: 'default' },
  { id: 'ai.acceptSuggestion', command: 'ai.acceptSuggestion', label: 'Accept AI Suggestion', keybinding: 'Tab', defaultKeybinding: 'Tab', when: 'aiSuggestionVisible', category: 'AI', source: 'default' },
  { id: 'ai.rejectSuggestion', command: 'ai.rejectSuggestion', label: 'Reject AI Suggestion', keybinding: 'Escape', defaultKeybinding: 'Escape', when: 'aiSuggestionVisible', category: 'AI', source: 'default' },
  { id: 'ai.explainCode', command: 'ai.explainCode', label: 'Explain Code', keybinding: 'Ctrl+Shift+E', defaultKeybinding: 'Ctrl+Shift+E', when: 'editorHasSelection', category: 'AI', source: 'default' },
  { id: 'ai.fixErrors', command: 'ai.fixErrors', label: 'Fix Errors with AI', keybinding: 'Ctrl+.', defaultKeybinding: 'Ctrl+.', when: 'editorHasProblems', category: 'AI', source: 'default' },

  // Preferences
  { id: 'pref.settings', command: 'preferences.settings', label: 'Open Settings', keybinding: 'Ctrl+,', defaultKeybinding: 'Ctrl+,', category: 'Preferences', source: 'default' },
  { id: 'pref.keybindings', command: 'preferences.keybindings', label: 'Keyboard Shortcuts', keybinding: 'Ctrl+K Ctrl+S', defaultKeybinding: 'Ctrl+K Ctrl+S', category: 'Preferences', source: 'default' },
  { id: 'pref.theme', command: 'preferences.colorTheme', label: 'Color Theme', keybinding: 'Ctrl+K Ctrl+T', defaultKeybinding: 'Ctrl+K Ctrl+T', category: 'Preferences', source: 'default' },
]

// ============= Keybinding Recorder =============

interface KeyRecorderProps {
  value: string | null
  onChange: (keybinding: string | null) => void
  onCancel: () => void
}

function KeyRecorder({ value, onChange, onCancel }: KeyRecorderProps) {
  const [recording, setRecording] = useState<string[]>([])
  const [isRecording, setIsRecording] = useState(true)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isRecording) return

      e.preventDefault()
      e.stopPropagation()

      const parts: string[] = []

      if (e.ctrlKey) parts.push('Ctrl')
      if (e.shiftKey) parts.push('Shift')
      if (e.altKey) parts.push('Alt')
      if (e.metaKey) parts.push('Meta')

      // Get the key
      let key = e.key

      // Normalize special keys
      if (key === ' ') key = 'Space'
      if (key === 'Escape') key = 'Escape'
      if (key.length === 1) key = key.toUpperCase()

      // Don't add modifier keys alone
      if (!['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
        parts.push(key)
        setRecording(parts)

        // Auto-confirm after a brief delay
        setTimeout(() => {
          onChange(parts.join('+'))
        }, 300)
      } else {
        setRecording(parts)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isRecording, onChange])

  return (
    <div className="flex items-center gap-2 p-2 bg-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)] rounded border border-[color-mix(in_srgb,var(--aethel-info)_40%,transparent)]">
      <Keyboard className="w-4 h-4 text-[var(--aethel-info-light)]" />
      <span className="text-sm text-[var(--aethel-text-primary)]">
        {recording.length > 0 ? (
          recording.map((key, idx) => (
            <span key={idx}>
              {idx > 0 && '+'}
              <kbd className="px-1.5 py-0.5 bg-[var(--aethel-surface-tertiary)] rounded text-xs">{key}</kbd>
            </span>
          ))
        ) : (
          <span className="text-[var(--aethel-text-tertiary)]">Pressione as teclas...</span>
        )}
      </span>
      <button type="button"
        onClick={onCancel}
        className="ml-auto p-1 hover:bg-[var(--aethel-surface-tertiary)] rounded"
      >
        <X className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
      </button>
    </div>
  )
}

// ============= Main Component =============

export default function KeybindingsEditor({
  keybindings: initialKeybindings,
  onSave,
  onClose,
}: KeybindingsEditorProps) {
  const toast = useToast()
  const [keybindings, setKeybindings] = useState<Keybinding[]>(
    initialKeybindings || DEFAULT_KEYBINDINGS
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showOnlyModified, setShowOnlyModified] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [hasChanges, setHasChanges] = useState(false)

  // Load saved keybindings and register with manager
  useEffect(() => {
    const saved = localStorage.getItem('keybindings')
    let loadedBindings = DEFAULT_KEYBINDINGS

    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        loadedBindings = DEFAULT_KEYBINDINGS.map((def) => {
          const custom = parsed.find((p: Keybinding) => p.id === def.id)
          return custom ? { ...def, ...custom } : def
        })
        setKeybindings(loadedBindings)
      } catch (e) {
        console.error('Failed to parse saved keybindings:', e)
      }
    }

    // Register all keybindings with the KeybindingManager
    const manager = getKeybindingManager()
    loadedBindings.forEach((kb) => {
      if (kb.keybinding) {
        manager.registerKeybinding({
          id: kb.id,
          key: kb.keybinding,
          command: kb.command,
          when: kb.when,
        })
      }
    })
  }, [toast])

  // Detect conflicts
  const conflicts = useMemo(() => {
    const map = new Map<string, Keybinding[]>()

    keybindings.forEach((kb) => {
      if (kb.keybinding) {
        const existing = map.get(kb.keybinding) || []
        existing.push(kb)
        map.set(kb.keybinding, existing)
      }
    })

    const result: Record<string, Keybinding[]> = {}
    map.forEach((kbs, key) => {
      if (kbs.length > 1) {
        result[key] = kbs
      }
    })

    return result
  }, [keybindings])

  // Filter keybindings
  const filteredKeybindings = useMemo(() => {
    let filtered = keybindings

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((kb) =>
        kb.label.toLowerCase().includes(query) ||
        kb.command.toLowerCase().includes(query) ||
        (kb.keybinding && kb.keybinding.toLowerCase().includes(query))
      )
    }

    if (showOnlyModified) {
      filtered = filtered.filter((kb) => kb.keybinding !== kb.defaultKeybinding)
    }

    return filtered
  }, [keybindings, searchQuery, showOnlyModified])

  // Group by category
  const groupedKeybindings = useMemo(() => {
    const groups: Record<string, Keybinding[]> = {}

    filteredKeybindings.forEach((kb) => {
      if (!groups[kb.category]) {
        groups[kb.category] = []
      }
      groups[kb.category].push(kb)
    })

    return groups
  }, [filteredKeybindings])

  // Toggle category
  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }, [])

  // Update keybinding
  const updateKeybinding = useCallback((id: string, newKeybinding: string | null) => {
    setKeybindings((prev) =>
      prev.map((kb) =>
        kb.id === id ? { ...kb, keybinding: newKeybinding, source: 'user' } : kb
      )
    )
    setEditingId(null)
    setHasChanges(true)
  }, [])

  // Reset single keybinding
  const resetKeybinding = useCallback((id: string) => {
    setKeybindings((prev) =>
      prev.map((kb) =>
        kb.id === id ? { ...kb, keybinding: kb.defaultKeybinding, source: 'default' } : kb
      )
    )
    setHasChanges(true)
  }, [])

  // Reset all
  const resetAll = useCallback(async () => {
    const shouldReset = await openConfirmDialog({
      title: 'Reset keybindings',
      message: 'Reset all keybindings to defaults?',
      confirmText: 'Reset',
      cancelText: 'Cancel',
    })
    if (!shouldReset) return
    setKeybindings(DEFAULT_KEYBINDINGS)
    setHasChanges(true)
  }, [])

  // Save and register with manager
  const handleSave = useCallback(() => {
    const personalizado(s) = keybindings.filter((kb) => kb.source === 'user')
    localStorage.setItem('keybindings', JSON.stringify(personalizado(s)))

    // Re-register all keybindings with the manager
    const manager = getKeybindingManager()
    keybindings.forEach((kb) => {
      if (kb.keybinding) {
        manager.registerKeybinding({
          id: kb.id,
          key: kb.keybinding,
          command: kb.command,
          when: kb.when,
        })
      }
    })

    setHasChanges(false)
    onSave?.(keybindings)
  }, [keybindings, onSave])

  // Export
  const handleExport = useCallback(() => {
    const data = JSON.stringify(keybindings, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'keybindings.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [keybindings])

  // Import
  const handleImport = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = () => {
        try {
          const imported = JSON.parse(reader.result as string)
          setKeybindings(imported)
          setHasChanges(true)
        } catch (err) {
          toast.error('Invalid keybindings file')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }, [toast])

  // Get all categories for initial expansion
  useEffect(() => {
    if (searchQuery) {
      setExpandedCategories(new Set(Object.keys(groupedKeybindings)))
    }
  }, [searchQuery, groupedKeybindings])

  return (
    <div className="h-full flex flex-col bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--aethel-border-primary)]">
        <div className="flex items-center gap-3">
          <Keyboard className="w-5 h-5 text-[var(--aethel-info-light)]" />
          <h2 className="text-lg font-semibold">Atalhos de teclado</h2>
          {hasChanges && (
            <span className="px-2 py-0.5 bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] text-[var(--aethel-warning-light)] text-xs rounded">
              Alterações não salvas
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button type="button"
            onClick={handleImport}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-tertiary)] rounded"
          >
            <Upload className="w-4 h-4" />
            Importar
          </button>
          <button type="button"
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-tertiary)] rounded"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button type="button"
            onClick={resetAll}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-tertiary)] rounded"
          >
            <RotateCcw className="w-4 h-4" />
            Restaurar tudo
          </button>
          {hasChanges && (
            <button type="button"
              onClick={handleSave}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[var(--aethel-info)] rounded transition-colors hover:brightness-110"
            >
              <Check className="w-4 h-4" />
              Salvar
            </button>
          )}
          {onClose && (
            <button type="button"
              onClick={onClose}
              className="p-1.5 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-tertiary)] rounded"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--aethel-border-primary)]">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--aethel-text-tertiary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar atalhos..."
            className="w-full pl-10 pr-4 py-2 bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded text-sm text-[var(--aethel-text-primary)] placeholder:text-[var(--aethel-text-quaternary)] focus:outline-none focus:border-[var(--aethel-primary)]"
          />
        </div>

        <button type="button"
          onClick={() => setShowOnlyModified(!showOnlyModified)}
          className={`flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors ${
            showOnlyModified
              ? 'bg-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] text-[var(--aethel-text-primary)]'
              : 'bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]'
          }`}
        >
          <Filter className="w-4 h-4" />
          Somente modificados
        </button>
      </div>

      {/* Conflicts Warning */}
      {Object.keys(conflicts).length > 0 && (
        <div className="px-4 py-2 bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] border-b border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)]">
          <div className="flex items-center gap-2 text-[var(--aethel-warning-light)] text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>
              {Object.keys(conflicts).length} conflito(s) de atalho detectado(s)
            </span>
          </div>
        </div>
      )}

      {/* Keybindings List */}
      <div className="flex-1 overflow-y-auto">
        {/* Table Header */}
        <div className="sticky top-0 grid grid-cols-[1fr_200px_120px_80px] gap-4 px-4 py-2 bg-[var(--aethel-surface-secondary)] border-b border-[var(--aethel-border-primary)] text-xs font-semibold text-[var(--aethel-text-tertiary)] uppercase">
          <div>Comando</div>
          <div>Atalho</div>
          <div>Quando</div>
          <div>Origem</div>
        </div>

        {/* Categories */}
        {Object.entries(groupedKeybindings).map(([category, kbs]) => (
          <div key={category}>
            {/* Category Header */}
            <button type="button"
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center gap-2 px-4 py-2 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] hover:bg-[var(--aethel-surface-secondary)] text-left"
            >
              {expandedCategories.has(category) ? (
                <ChevronDown className="w-4 h-4 text-[var(--aethel-text-quaternary)]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[var(--aethel-text-quaternary)]" />
              )}
              <span className="text-sm font-medium text-[var(--aethel-text-secondary)]">{category}</span>
              <span className="text-xs text-[var(--aethel-text-quaternary)]">({kbs.length})</span>
            </button>

            {/* Keybindings */}
            {expandedCategories.has(category) && (
              <div>
                {kbs.map((kb) => (
                  <KeybindingRow
                    key={kb.id}
                    keybinding={kb}
                    isEditing={editingId === kb.id}
                    hasConflict={kb.keybinding ? !!conflicts[kb.keybinding] : false}
                    onEdit={() => setEditingId(kb.id)}
                    onUpdate={(newBinding) => updateKeybinding(kb.id, newBinding)}
                    onReset={() => resetKeybinding(kb.id)}
                    onCancelEdit={() => setEditingId(null)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Empty State */}
        {filteredKeybindings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--aethel-text-quaternary)]">
            <Keyboard className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg">Nenhum atalho encontrado</p>
            <p className="text-sm">Tente outro termo de busca</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-[var(--aethel-border-primary)] text-xs text-[var(--aethel-text-quaternary)]">
        <span>
          {filteredKeybindings.length} atalho(s) •{' '}
          {keybindings.filter((kb) => kb.source === 'user').length} personalizado(s)
        </span>
      </div>
    </div>
  )
}

// ============= Keybinding Row =============

interface KeybindingRowProps {
  keybinding: Keybinding
  isEditing: boolean
  hasConflict: boolean
  onEdit: () => void
  onUpdate: (keybinding: string | null) => void
  onReset: () => void
  onCancelEdit: () => void
}

function KeybindingRow({
  keybinding,
  isEditing,
  hasConflict,
  onEdit,
  onUpdate,
  onReset,
  onCancelEdit,
}: KeybindingRowProps) {
  const isModified = keybinding.keybinding !== keybinding.defaultKeybinding

  return (
    <div
      className={`grid grid-cols-[1fr_200px_120px_80px] gap-4 px-4 py-2 border-b border-[var(--aethel-border-primary)] hover:bg-[var(--aethel-surface-secondary)]/30 items-center ${
        hasConflict ? 'bg-[color-mix(in_srgb,var(--aethel-warning)_5%,transparent)]' : ''
      }`}
    >
      {/* Command */}
      <div>
        <div className="text-sm text-[var(--aethel-text-primary)]">{keybinding.label}</div>
        <div className="text-xs text-[var(--aethel-text-quaternary)]">{keybinding.command}</div>
      </div>

      {/* Keybinding */}
      <div className="relative">
        {isEditing ? (
          <KeyRecorder
            value={keybinding.keybinding}
            onChange={onUpdate}
            onCancel={onCancelEdit}
          />
        ) : (
          <div className="flex items-center gap-2 group">
            {keybinding.keybinding ? (
              <kbd className={`px-2 py-1 bg-[var(--aethel-surface-tertiary)] rounded text-xs ${
                hasConflict ? 'text-[var(--aethel-warning-light)] border border-[color-mix(in_srgb,var(--aethel-warning)_50%,transparent)]' : 'text-[var(--aethel-text-secondary)]'
              }`}>
                {keybinding.keybinding}
              </kbd>
            ) : (
              <span className="text-sm text-[var(--aethel-text-quaternary)]">-</span>
            )}

            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
              <button type="button"
                onClick={onEdit}
                className="p-1 hover:bg-[var(--aethel-surface-tertiary)] rounded"
                title="Editar atalho"
              >
                <Edit3 className="w-3 h-3 text-[var(--aethel-text-tertiary)]" />
              </button>
              {isModified && (
                <button type="button"
                  onClick={onReset}
                  className="p-1 hover:bg-[var(--aethel-surface-tertiary)] rounded"
                  title="Restaurar padr?o"
                >
                  <RotateCcw className="w-3 h-3 text-[var(--aethel-text-tertiary)]" />
                </button>
              )}
            </div>

            {hasConflict && (
              <span title="Conflito de atalho"><AlertTriangle className="w-4 h-4 text-[var(--aethel-warning-light)]" /></span>
            )}
          </div>
        )}
      </div>

      {/* When */}
      <div>
        {keybinding.when ? (
          <code className="px-2 py-0.5 bg-[var(--aethel-surface-secondary)] rounded text-xs text-[var(--aethel-text-tertiary)]">
            {keybinding.when}
          </code>
        ) : (
          <span className="text-sm text-[var(--aethel-text-quaternary)]">-</span>
        )}
      </div>

      {/* Source */}
      <div>
        <span
          className={`px-2 py-0.5 rounded text-xs ${
            keybinding.source === 'user'
              ? 'bg-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)] text-[var(--aethel-info-light)]'
              : keybinding.source === 'extension'
              ? 'bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]'
              : 'bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-tertiary)]'
          }`}
        >
          {keybinding.source}
        </span>
      </div>
    </div>
  )
}

// ============= Hook for Keyboard Shortcuts =============

export function useKeybindings(customBindings?: Keybinding[]) {
  const [keybindings, setKeybindings] = useState<Keybinding[]>(
    customBindings || DEFAULT_KEYBINDINGS
  )

  useEffect(() => {
    const saved = localStorage.getItem('keybindings')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setKeybindings(
          DEFAULT_KEYBINDINGS.map((def) => {
            const custom = parsed.find((p: Keybinding) => p.id === def.id)
            return custom ? { ...def, ...custom } : def
          })
        )
      } catch (e) {}
    }
  }, [])

  const getKeybinding = useCallback((commandId: string) => {
    return keybindings.find((kb) => kb.command === commandId)?.keybinding
  }, [keybindings])

  const executeCommand = useCallback((commandId: string) => {
    // This would dispatch the command to a command system
    console.log('Execute command:', commandId)
  }, [])

  return { keybindings, getKeybinding, executeCommand }
}

