'use client'

import { useState, useCallback } from 'react'
import Codicon from './Codicon'

const SHORTCUT_CATEGORIES = [
  {
    title: 'Geral',
    shortcuts: [
      { keys: ['Ctrl', 'Shift', 'P'], action: 'Abrir paleta de comandos' },
      { keys: ['Ctrl', 'P'], action: 'Abrir rapido (Arquivo)' },
      { keys: ['Ctrl', 'Shift', 'N'], action: 'Nova janela' },
      { keys: ['Ctrl', ','], action: 'Abrir ajustes' },
      { keys: ['Ctrl', 'K', 'Ctrl', 'S'], action: 'Ver atalhos de teclado' },
    ],
  },
  {
    title: 'Editor',
    shortcuts: [
      { keys: ['Ctrl', 'S'], action: 'Save file' },
      { keys: ['Ctrl', 'Z'], action: 'Desfazer' },
      { keys: ['Ctrl', 'Shift', 'Z'], action: 'Refazer' },
      { keys: ['Ctrl', 'D'], action: 'Selecionar proxima ocorrencia' },
      { keys: ['Ctrl', 'Shift', 'K'], action: 'Deletar linha' },
      { keys: ['Alt', 'Up'], action: 'Mover linha para cima' },
      { keys: ['Alt', 'Down'], action: 'Mover linha para baixo' },
      { keys: ['Ctrl', '/'], action: 'Comentar/descomentar linha' },
      { keys: ['Ctrl', 'Shift', 'F'], action: 'Formatar documento' },
    ],
  },
  {
    title: 'AI & Chat',
    shortcuts: [
      { keys: ['Ctrl', 'L'], action: 'Abrir/focar AI Chat' },
      { keys: ['Ctrl', 'I'], action: 'Inline completion' },
      { keys: ['Ctrl', 'Shift', 'I'], action: 'Explicar codigo selecionado' },
      { keys: ['Tab'], action: 'Aceitar sugestao inline' },
      { keys: ['Escape'], action: 'Recusar sugestao inline' },
    ],
  },
  {
    title: 'Navegacao',
    shortcuts: [
      { keys: ['Ctrl', 'G'], action: 'Ir para linha' },
      { keys: ['Ctrl', 'Shift', 'O'], action: 'Ir para simbolo' },
      { keys: ['F12'], action: 'Ir para definicao' },
      { keys: ['Alt', 'F12'], action: 'Pre-visualizar definicao' },
      { keys: ['Ctrl', 'Shift', 'E'], action: 'Focar explorador de arquivos' },
      { keys: ['Ctrl', 'Shift', 'G'], action: 'Focar Git' },
      { keys: ['Ctrl', '`'], action: 'Abrir/fechar terminal' },
    ],
  },
  {
    title: 'Depuracao',
    shortcuts: [
      { keys: ['F5'], action: 'Iniciar/continuar depuracao' },
      { keys: ['F9'], action: 'Alternar breakpoint' },
      { keys: ['F10'], action: 'Passo sobre' },
      { keys: ['F11'], action: 'Entrar' },
      { keys: ['Shift', 'F11'], action: 'Sair' },
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
      aria-label="Atalhos de teclado"
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
            <h2 className="text-lg font-semibold text-[var(--aethel-text-primary)]">Atalhos de Teclado</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] hover:text-[var(--aethel-text-primary)]"
            aria-label="Fechar"
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
              placeholder="Buscar atalho..."
              className="w-full rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] py-2 pl-9 pr-4 text-sm text-[var(--aethel-text-primary)] placeholder:text-[var(--aethel-text-quaternary)] focus:border-[color-mix(in_srgb,var(--aethel-primary)_40%,transparent)] focus:outline-none"
              autoFocus
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {filteredCategories.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--aethel-text-tertiary)]">Nenhum atalho encontrado</p>
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
            <kbd className="rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)] px-1 text-[var(--aethel-text-tertiary)]">S</kbd> para abrir esta lista
          </p>
        </div>
      </div>
    </div>
  )
}

export default KeyboardShortcutsDialog
