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
import { DEFAULT_KEYBINDINGS } from './KeybindingsEditor.defaults'


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
      <button type="button" aria-label="Cancel shortcut recording"
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
        logger.error('Failed to parse saved keybindings:', e)
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
    const personalizados = keybindings.filter((kb) => kb.source === 'user')
    localStorage.setItem('keybindings', JSON.stringify(personalizados))

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
              Unsaved changes
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button type="button" aria-label="Import atalhos"
            onClick={handleImport}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-tertiary)] rounded"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button type="button" aria-label="Export atalhos"
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-tertiary)] rounded"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button type="button" aria-label="Restaurar todos os atalhos"
            onClick={resetAll}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-tertiary)] rounded"
          >
            <RotateCcw className="w-4 h-4" />
            Restaurar tudo
          </button>
          {hasChanges && (
            <button type="button" aria-label="Save shortcut changes"
              onClick={handleSave}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[var(--aethel-info)] rounded transition-colors hover:brightness-110"
            >
              <Check className="w-4 h-4" />
              Save
            </button>
          )}
          {onClose && (
            <button type="button" aria-label="Close shortcuts editor"
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
            placeholder="Search atalhos..."
            className="w-full pl-10 pr-4 py-2 bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded text-sm text-[var(--aethel-text-primary)] placeholder:text-[var(--aethel-text-quaternary)] focus:outline-none focus:border-[var(--aethel-primary)]"
          />
        </div>

        <button type="button" aria-label={showOnlyModified ? 'Mostrar todos os atalhos' : 'Mostrar apenas atalhos modified'}
          onClick={() => setShowOnlyModified(!showOnlyModified)}
          className={`flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors ${
            showOnlyModified
              ? 'bg-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] text-[var(--aethel-text-primary)]'
              : 'bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]'
          }`}
        >
          <Filter className="w-4 h-4" />
          Somente modified
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
            <button type="button" aria-label={`${expandedCategories.has(category) ? 'Recolher' : 'Expandir'} categoria ${category}`}
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
            <p className="text-lg">No atalho encontrado</p>
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
              <button type="button" aria-label={`Edit atalho ${keybinding.command}`}
                onClick={onEdit}
                className="p-1 hover:bg-[var(--aethel-surface-tertiary)] rounded"
                title="Edit atalho"
              >
                <Edit3 className="w-3 h-3 text-[var(--aethel-text-tertiary)]" />
              </button>
              {isModified && (
                <button type="button" aria-label={`Restore default shortcut ${keybinding.command}`}
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
    log.info('Execute command:', commandId)
  }, [])

  return { keybindings, getKeybinding, executeCommand }
}

import {createComponentLogger, logger} from '@/lib/observability/logger'

const log = createComponentLogger('KeybindingsEditor')
