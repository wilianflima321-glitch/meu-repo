'use client'

import { useState } from 'react'
import { Brain, Trash2, Plus, Edit, Save, X, Layers, Target, Zap } from 'lucide-react'

interface MemoryItem {
  id: string
  scope: 'workspace' | 'project' | 'session'
  key: string
  value: string
  timestamp: number
}

interface MemoryPanelProps {
  memories: MemoryItem[]
  onAdd: (memory: Omit<MemoryItem, 'id' | 'timestamp'>) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, value: string) => void
}

export function MemoryPanel({ memories = [], onAdd, onDelete, onUpdate }: MemoryPanelProps) {
  const [activeScope, setActiveScope] = useState<'workspace' | 'project' | 'session'>('workspace')
  const [isAdding, setIsAdding] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')

  const filteredMemories = memories.filter(m => m.scope === activeScope)

  const handleAdd = () => {
    if (!newKey.trim() || !newValue.trim()) return
    onAdd({
      scope: activeScope,
      key: newKey.trim(),
      value: newValue.trim(),
    })
    setNewKey('')
    setNewValue('')
    setIsAdding(false)
  }

  const handleUpdate = (id: string) => {
    if (!editingValue.trim()) return
    onUpdate(id, editingValue.trim())
    setEditingId(null)
    setEditingValue('')
  }

  const getScopeIcon = (scope: string) => {
    switch (scope) {
      case 'workspace':
        return <Layers className="w-4 h-4" />
      case 'project':
        return <Target className="w-4 h-4" />
      case 'session':
        return <Zap className="w-4 h-4" />
      default:
        return <Brain className="w-4 h-4" />
    }
  }

  const getScopeColor = (scope: string) => {
    switch (scope) {
      case 'workspace':
        return 'text-[var(--aethel-primary-light)]'
      case 'project':
        return 'text-[var(--aethel-info-light)]'
      case 'session':
        return 'text-[var(--aethel-success-light)]'
      default:
        return 'text-[var(--aethel-text-secondary)]'
    }
  }

  return (
    <div className="flex h-full flex-col bg-[var(--aethel-surface-primary)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-[var(--aethel-primary-light)]" />
          <span className="text-sm font-semibold text-[var(--aethel-text-primary)]">Memória</span>
        </div>
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="p-1.5 rounded-lg text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] transition-colors"
          title="Adicionar memória"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Scope Tabs */}
      <div className="flex border-b border-[var(--aethel-border-primary)]">
        {(['workspace', 'project', 'session'] as const).map((scope) => (
          <button
            key={scope}
            type="button"
            onClick={() => setActiveScope(scope)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium transition-colors ${
 activeScope === scope ?
 `text-[var(--aethel-primary-light)] border-b-2 border-[var(--aethel-primary)]`
 : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
 }`}
          >
            {getScopeIcon(scope)}
            <span className="capitalize">{scope}</span>
          </button>
        ))}
      </div>

      {/* Add New Memory */}
      {isAdding && (
        <div className="border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-3">
          <input
            type="text"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="Chave..."
            className="mb-2 w-full rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_60%,transparent)] px-3 py-2 text-xs text-[var(--aethel-text-primary)] outline-none transition focus:border-[color-mix(in_srgb,var(--aethel-info)_60%,transparent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)]"
          />
          <textarea
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="Valor..."
            rows={2}
            className="mb-2 w-full rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_60%,transparent)] px-3 py-2 text-xs text-[var(--aethel-text-primary)] outline-none transition focus:border-[color-mix(in_srgb,var(--aethel-info)_60%,transparent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] resize-none"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false)
                setNewKey('')
                setNewValue('')
              }}
              className="px-3 py-1.5 text-xs text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newKey.trim() || !newValue.trim()}
              className="rounded-lg bg-[var(--aethel-primary)] px-3 py-1.5 text-xs font-medium text-[var(--aethel-text-primary)] transition-colors hover:brightness-110 disabled:opacity-50"
            >
              Adicionar
            </button>
          </div>
        </div>
      )}

      {/* Memory List */}
      <div className="flex-1 overflow-auto p-3">
        {filteredMemories.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[var(--aethel-text-tertiary)] text-xs">
            Nenhuma memória neste escopo
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMemories.map((memory) => (
              <div
                key={memory.id}
                className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-3"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded-lg bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] ${getScopeColor(memory.scope)}`}>
                      {getScopeIcon(memory.scope)}
                    </div>
                    <span className="text-xs font-medium text-[var(--aethel-text-primary)]">{memory.key}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {editingId !== memory.id && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(memory.id)
                          setEditingValue(memory.value)
                        }}
                        className="p-1 rounded text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDelete(memory.id)}
                      className="p-1 rounded text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-error-light)] hover:bg-[color-mix(in_srgb,var(--aethel-error)_15%,transparent)] transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                {editingId === memory.id ? (
                  <>
                    <textarea
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      rows={2}
                      className="mb-2 w-full rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_60%,transparent)] px-2 py-1.5 text-xs text-[var(--aethel-text-primary)] outline-none transition focus:border-[color-mix(in_srgb,var(--aethel-info)_60%,transparent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] resize-none"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null)
                          setEditingValue('')
                        }}
                        className="px-2 py-1 text-[10px] text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] transition-colors"
                      >
                        <X className="w-3 h-3 inline" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdate(memory.id)}
                        className="px-2 py-1 text-[10px] rounded bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)] transition-colors hover:brightness-110"
                      >
                        <Save className="w-3 h-3 inline" />
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-[var(--aethel-text-secondary)] whitespace-pre-wrap">{memory.value}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-4 py-2">
        <div className="flex items-center justify-between text-[10px] text-[var(--aethel-text-tertiary)]">
          <span>{filteredMemories.length} memórias</span>
          <span>Escopo: {activeScope}</span>
        </div>
      </div>
    </div>
  )
}
